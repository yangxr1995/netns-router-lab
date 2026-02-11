#include <assert.h>
#include <stdarg.h>
#include <stdint.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>

#include "json.h"
#include "constants.h"
#include "types.h"
#include "cmd_exec.h"
#include "json_utils.h"

#define type_member jkey.type
#define key_member  jkey.str
#define str_member  vstr.str

static node_registry_t g_node_registry;

static inline struct in_addr alloc_ip(struct in_addr net_begin, char net_offset, char ip_offset) {
    net_begin.s_addr += (net_offset << 16);
    net_begin.s_addr += (ip_offset << 24);
    return net_begin;
}

static void netns_init(const char *parent_name, const char *name, struct in_addr gw,
                       const char *ifname_parent, const char *ifname_child,
                       const char *ifname_u_parent, const char *ifname_u_child,
                       gnode_t *gnode, bool if_gw) {
    char nsname[NSNAME_BUF_SIZE];
    snprintf(nsname, sizeof(nsname), NS_PREFIX "%s", name);

    cmd_exec("ip link add %s type veth peer name %s", ifname_parent, ifname_child);
    cmd_exec("ip link set %s netns %s", ifname_child, nsname);
    if (parent_name) {
        cmd_exec("ip link set %s netns " NS_PREFIX "%s", ifname_parent, parent_name);
    }

    const char *child_iface = ifname_u_child ? ifname_u_child : ifname_child;
    const char *parent_iface = ifname_u_parent ? ifname_u_parent : ifname_parent;

    if (ifname_u_child) {
        cmd_exec_in_netns(name, "ip link set dev %s down", ifname_child);
        cmd_exec_in_netns(name, "ip link set dev %s name %s", ifname_child, ifname_u_child);
        cmd_exec_in_netns(name, "ip link set dev %s up", ifname_u_child);
    }

    if (ifname_u_parent && parent_name) {
        cmd_exec_in_netns(parent_name, "ip link set dev %s down", ifname_parent);
        cmd_exec_in_netns(parent_name, "ip link set dev %s name %s", ifname_parent, ifname_u_parent);
        cmd_exec_in_netns(parent_name, "ip link set dev %s up", ifname_u_parent);
    }

    cmd_exec_in_netns(name, "ip link set dev lo up");
    cmd_exec_in_netns(name, "ip link set dev %s up", child_iface);
    if (parent_name) {
        cmd_exec_in_netns(parent_name, "ip link set dev %s up", parent_iface);
    }

    if (gnode && gnode->if_init) {
        char cmd[CMD_TMP_BUF_SIZE];
        snprintf(cmd, sizeof(cmd), "ip route add default via %s dev %s table %d onlink",
                 inet_ntoa(gw), child_iface, gnode->rtable_idx);
        cmd_exec_in_netns_raw(name, cmd);

        snprintf(cmd, sizeof(cmd), "ip rule add oif %s table %d", child_iface, gnode->rtable_idx);
        cmd_exec_in_netns_raw(name, cmd);

        if (if_gw) {
            cmd_exec_in_netns(name, "ip route add default via %s dev %s onlink",
                              inet_ntoa(gw), child_iface);
        }
    } else {
        cmd_exec_in_netns(name, "ip route add default via %s dev %s onlink",
                          inet_ntoa(gw), child_iface);
        cmd_exec_in_netns(name, "iptables -t nat -I POSTROUTING -o %s -j MASQUERADE", child_iface);
    }
}

static void ip_addr_alloc(const char *name, struct in_addr net, const char *dev,
                          int net_offset, int ip_offset, gnode_t *gnode) {
    struct in_addr addr = alloc_ip(net, net_offset, ip_offset);
    cmd_exec_in_netns(name, "ip addr add %s/%d dev %s", inet_ntoa(addr), NETMASK_BITS, dev);
    cmd_exec_in_netns(name, "ip link set dev %s up", dev);

    if (gnode && gnode->if_init) {
        char cmd[CMD_TMP_BUF_SIZE];
        snprintf(cmd, sizeof(cmd), "ip rule add from %s table %d", inet_ntoa(addr), gnode->rtable_idx);
        cmd_exec_in_netns_raw(name, cmd);
    }
}

static void setup_bridge(const char *name, struct in_addr net, struct in_addr lan_addr,
                         int net_offset, bool vlan_on) {
    cmd_exec_in_netns(name, "brctl addbr " DEFAULT_BRIDGE_NAME);

    if (lan_addr.s_addr) {
        ip_addr_alloc(name, lan_addr, DEFAULT_BRIDGE_NAME, 0, 0, NULL);
    } else {
        ip_addr_alloc(name, net, DEFAULT_BRIDGE_NAME, net_offset, 1, NULL);
    }

    if (vlan_on) {
        cmd_exec_in_netns(name, "ip link set " DEFAULT_BRIDGE_NAME " type bridge vlan_filtering 1");
    }
}

static void configure_ip_forward(const char *name, bool forward) {
    if (forward && name) {
        cmd_exec_in_netns(name, "sysctl -w net.ipv4.ip_forward=1");
    }
}

static void configure_vlan(const char *name, const char *ifname_parent, int vid) {
    cmd_exec_in_netns(name, "bridge vlan add dev " DEFAULT_BRIDGE_NAME " vid %d untagged self", vid);
    cmd_exec_in_netns(name, "bridge vlan add dev %s vid %d pvid untagged", ifname_parent, vid);
}

static void execute_commands(const char *name, json_object *exec_arr) {
    if (!exec_arr) {
        return;
    }

    int exec_arr_len = json_get_array_size(exec_arr);
    for (int i = 0; i < exec_arr_len; ++i) {
        json_object *exec = json_get_array_item(exec_arr, i, NULL);
        if (exec && exec->value.str_member) {
            cmd_exec_in_netns_raw(name, exec->value.str_member);
        }
    }
}

static int _node_create(json_object *jroot, struct in_addr net_begin, int *pnet_offset);

static int process_child_node(json_object *jobj, const char *parent_name,
                              struct in_addr net_begin, int *pnet_offset,
                              bool br_on, bool vlan_on, struct in_addr lan_addr,
                              const char *name, int net_offset, int *ip_offset) {
    char *node_name = NULL;
    char ifname_child[IFNAME_MAX_LEN];
    char ifname_parent[IFNAME_MAX_LEN];
    gnode_t *gnode_child = NULL;
    bool if_gw = false;

    int child_gid = json_get_int_from_object(jobj, JSON_KEY_GID);
    if (child_gid >= 0) {
        gnode_child = node_registry_get(&g_node_registry, child_gid);
    }

    if (gnode_child) {
        if (gnode_child->if_init) {
            if_gw = json_get_bool_from_object(jobj, JSON_KEY_GW);
            if (if_gw) {
                cmd_exec_in_netns(gnode_child->name, "ip route del default");
            }
            node_name = strdup(gnode_child->name);
        } else {
            node_name = json_get_string_value(jobj, JSON_KEY_NAME);
            if (!node_name) {
                fprintf(stderr, ERR_NODE_NAME_NULL);
                return EXIT_CONFIG_ERROR;
            }
            strncpy(gnode_child->name, node_name, NODE_NAME_MAX_LEN - 1);
            gnode_child->name[NODE_NAME_MAX_LEN - 1] = '\0';
            cmd_exec("ip netns add " NS_PREFIX "%s", node_name);
            gnode_child->if_init = true;
        }
    } else {
        node_name = json_get_string_value(jobj, JSON_KEY_NAME);
        if (!node_name) {
            fprintf(stderr, ERR_NODE_NAME_NULL);
            return EXIT_CONFIG_ERROR;
        }
        cmd_exec("ip netns add " NS_PREFIX "%s", node_name);
    }

    int vid = 0;
    if (br_on && vlan_on) {
        vid = json_get_int_from_object(jobj, JSON_KEY_VID);
        if (vid < 0) {
            fprintf(stderr, ERR_VID_REQUIRED, node_name);
            exit(EXIT_CONFIG_ERROR);
        }
    }

    char *ifname_u_parent = json_get_string_value(jobj, JSON_KEY_IFNAME_PARENT);
    char *ifname_u = json_get_string_value(jobj, JSON_KEY_IFNAME);

    snprintf(ifname_parent, sizeof(ifname_parent), IFACE_PREFIX "%s-", node_name);
    snprintf(ifname_child, sizeof(ifname_child), IFACE_PREFIX "%s", node_name);

    struct in_addr gw_addr = (br_on && lan_addr.s_addr) ? lan_addr : alloc_ip(net_begin, net_offset, 1);
    netns_init(parent_name, node_name, gw_addr, ifname_parent, ifname_child,
               ifname_u_parent, ifname_u, gnode_child, if_gw);

    if (br_on) {
        cmd_exec_in_netns(name, "brctl addif " DEFAULT_BRIDGE_NAME " %s", ifname_parent);
        if (lan_addr.s_addr) {
            ip_addr_alloc(node_name, lan_addr, ifname_child, 0, (*ip_offset)++, gnode_child);
        } else {
            ip_addr_alloc(node_name, net_begin, ifname_child, net_offset, ++(*ip_offset), gnode_child);
        }
        ++(*pnet_offset);
        _node_create(jobj, net_begin, pnet_offset);

        if (vlan_on) {
            configure_vlan(name, ifname_parent, vid);
        }
    } else {
        ip_addr_alloc(name, net_begin, ifname_parent, net_offset, 1, NULL);
        ip_addr_alloc(node_name, net_begin, ifname_child, net_offset, 2, gnode_child);
        ++(*pnet_offset);
        _node_create(jobj, net_begin, pnet_offset);
        *pnet_offset = net_offset + 1;
    }

    free(ifname_u_parent);
    free(ifname_u);
    free(node_name);

    return EXIT_SUCCESS_CODE;
}

static int _node_create(json_object *jroot, struct in_addr net_begin, int *pnet_offset) {
    int net_offset = *pnet_offset;
    char *name = json_get_string_value(jroot, JSON_KEY_NAME);
    bool br_on = json_get_bool_from_object(jroot, JSON_KEY_BR);
    bool vlan_on = json_get_bool_from_object(jroot, JSON_KEY_VLAN);

    if (json_get_bool_from_object(jroot, JSON_KEY_DISABLE)) {
        free(name);
        return EXIT_SUCCESS_CODE;
    }

    struct in_addr lan_addr = {0};
    if (br_on) {
        char *lan_str = json_get_string_value(jroot, JSON_KEY_LAN);
        if (lan_str) {
            lan_addr.s_addr = inet_addr(lan_str);
            free(lan_str);
        }
    }

    json_object *jnodes = json_get_object_item(jroot, JSON_KEY_NODES, NULL);
    if (!jnodes) {
        free(name);
        return EXIT_SUCCESS_CODE;
    }

    int arr_sz = json_get_array_size(jnodes);
    int ip_offset = 1;

    if (br_on) {
        setup_bridge(name, net_begin, lan_addr, net_offset, vlan_on);
    }

    bool forward = true;
    if (json_has_key(jroot, JSON_KEY_FORWARD)) {
        forward = json_get_bool_from_object(jroot, JSON_KEY_FORWARD);
    }
    configure_ip_forward(name, forward);

    for (int i = 0; i < arr_sz; ++i) {
        json_object *jobj = json_get_array_item(jnodes, i, NULL);
        if (!jobj) {
            break;
        }

        if (json_get_bool_from_object(jobj, JSON_KEY_DISABLE)) {
            continue;
        }

        int ret = process_child_node(jobj, name, net_begin, pnet_offset, br_on, vlan_on,
                                     lan_addr, name, net_offset, &ip_offset);
        if (ret != EXIT_SUCCESS_CODE) {
            free(name);
            return ret;
        }

        if (!br_on) {
            net_offset = *pnet_offset;
        }
    }

    json_object *exec_arr = json_get_object_item(jroot, JSON_KEY_EXEC, NULL);
    execute_commands(name, exec_arr);

    free(name);
    return EXIT_SUCCESS_CODE;
}

static inline int node_create(json_object *jroot) {
    struct in_addr net_begin;
    net_begin.s_addr = inet_addr(DEFAULT_NET_IP);
    int net_offset = 0;
    node_registry_init(&g_node_registry);
    return _node_create(jroot, net_begin, &net_offset);
}

int main(int argc, char *argv[]) {
    if (argc != 2) {
        fprintf(stderr, ERR_USAGE, argv[0]);
        return EXIT_FAILURE_CODE;
    }

    char *cfgfile = strdup(argv[1]);
    json_mem_t mem;
    pjson_memory_init(&mem);

    json_object *json = json_fast_parse_file(cfgfile, &mem);
    free(cfgfile);

    if (!json) {
        fprintf(stderr, ERR_JSON_PARSE);
        return EXIT_FAILURE_CODE;
    }

    return node_create(json);
}
