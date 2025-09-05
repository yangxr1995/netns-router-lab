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

#define type_member                     jkey.type
#define key_member                      jkey.str
#define str_member                      vstr.str

typedef struct {
    char name[64];
    bool if_init;
} gnode_t;

static gnode_t gnodes[128];

inline static char *
json_get_string(json_object *jroot, char *key)
{
    json_object *jobj;

    if ((jobj = json_get_object_item(jroot, key, NULL)) == NULL)
        return NULL;

    assert(jobj->type_member == JSON_STRING);

    if (jobj->value.str_member)
        return strdup(jobj->value.str_member);
    return NULL;
}

inline static struct in_addr
alloc_ip(struct in_addr net_begin, char net_offset, char ip_offset)
{
    net_begin.s_addr += (net_offset << 16);
    net_begin.s_addr += (ip_offset << 24);

    return net_begin;
}

inline static void 
do_system(char *fmt, ...)
{
    char cmd[256];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(cmd, sizeof(cmd), fmt, ap);
    va_end(ap);

    printf("%s\n", cmd);
    system(cmd);
}

inline static void 
do_system_netns(char *name, char *fmt, ...)
{
    char tmp[256];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(tmp, sizeof(tmp), fmt, ap);
    va_end(ap);

    char cmd[512] = {0};
    if (name)
        sprintf(cmd, "ip netns exec rlab-%s ", name);
    strcat(cmd, tmp);

    printf("%s\n", cmd);
    system(cmd);
}

inline static char
json_get_bool(json_object *jroot, char *key)
{
    json_object *jobj;

    if ((jobj = json_get_object_item(jroot, key, NULL)) == NULL)
        return 0;

    return json_get_bool_value(jobj);
}

void
netns_init(char *parent_name, char *name, struct in_addr gw, 
        char *ifname_parent, char *ifname_child, 
        char *ifname_u_parent, char *ifname_u_child, gnode_t *gnode)
{
    char nsname[64];

    sprintf(nsname, "rlab-%s", name);

    do_system("ip link add %s type veth peer name %s", ifname_parent, ifname_child);
    do_system("ip link set %s netns %s", ifname_child, nsname);
    if (parent_name)
        do_system("ip link set %s netns rlab-%s", ifname_parent, parent_name);

    if (ifname_u_child) {
        do_system_netns(name, "ip link set dev %s down", ifname_child);
        do_system_netns(name, "ip link set dev %s name %s", ifname_child, ifname_u_child);
        strcpy(ifname_child, ifname_u_child);
        do_system_netns(name, "ip link set dev %s up", ifname_child);
    }

    if (ifname_u_parent) {
        do_system_netns(parent_name, "ip link set dev %s down", ifname_parent);
        do_system_netns(parent_name, "ip link set dev %s name %s", ifname_parent, ifname_u_parent);
        sprintf(ifname_parent, "%s", ifname_u_parent);
        do_system_netns(parent_name, "ip link set dev %s up", ifname_parent);
    }

    do_system_netns(name, "ip link set dev lo up");
    do_system_netns(name, "ip link set dev %s up", ifname_child);
    do_system_netns(parent_name, "ip link set dev %s up", ifname_parent);

    // TODO: 多wan时需要配置 ip rule
    // ❯ ip rule
    // 0:      from all lookup local
    // 32762:  from all oif eth0 lookup 10
    // 32765:  from 192.168.3.2/24 lookup 10
    // ❯ ip route show table 10
    // default via 192.168.3.1 dev eth0 src 192.168.3.2
    do_system_netns(name, "ip route add default via %s dev %s onlink",
            inet_ntoa(gw), ifname_child);
    do_system_netns(name, "iptables -t nat -I POSTROUTING -o %s -j MASQUERADE",
            ifname_child);
}

inline static void
ip_addr_alloc(char *name, struct in_addr net, char *dev, 
        int net_offset, int ip_offset)
{
    do_system_netns(name, "ip addr add %s/%d dev %s", 
            inet_ntoa(alloc_ip(net, net_offset, ip_offset)), 24, dev);
    do_system_netns(name, "ip link set dev %s up", dev);
}

inline static int
json_get_int(json_object *jroot, char *key)
{
    json_object *jobj;

    if ((jobj = json_get_object_item(jroot, key, NULL)) == NULL)
        return -1;

    return json_get_int_value(jobj);
}

int 
_node_create(json_object *jroot, struct in_addr net_begin, int *pnet_offset)
{
    int net_offset = *pnet_offset;
    char *name;
    json_object *jnodes, *jobj;
    char br_on = 0, vlan_on = 0;
    int vid = 0;
    char *lan_str;
    struct in_addr lan_addr = {0};
    int vxlan_id;

    name = json_get_string(jroot, "name");
    br_on = json_get_bool(jroot, "br");
    vlan_on = json_get_bool(jroot, "vlan");
    vxlan_id = json_get_int(jroot, "vxlan");

    if (br_on) {
        if ((lan_str = json_get_string(jroot, "lan")) != NULL)
            lan_addr.s_addr = inet_addr(lan_str);
        else
            lan_addr.s_addr = 0;
    }

    if ((jnodes = json_get_object_item(jroot, "nodes", NULL)) == NULL)
        return 0;

    int arr_sz, i;
    arr_sz = json_get_array_size(jnodes);

    char *node_name;
    char ifname_child[64], ifname_parent[64];
    int ip_offset = 0;

    if (br_on) {
        do_system_netns(name, "brctl addbr br0");

        if (lan_addr.s_addr)
            ip_addr_alloc(name, lan_addr, "br0", 0, ip_offset++);
        else
            ip_addr_alloc(name, net_begin, "br0", net_offset, ++ip_offset);

        if (vlan_on)
            do_system_netns(name, "ip link set br0 type bridge vlan_filtering 1");
    }

    bool forward = true;
    if (json_get_object_item(jroot, "forward", NULL)) {
        if (!json_get_bool(jroot, "forward"))
            forward = false;
    }

    if (forward && name)
        do_system_netns(name, "sysctl -w net.ipv4.ip_forward=1");

    char *ifname_u;
    int gid;
    gnode_t *gnode = NULL;

    for (i = 0; i < arr_sz; ++i) {

        if ((jobj = json_get_array_item(jnodes, i, NULL)) == NULL)
            break;

        gnode = NULL;
        gid = json_get_int(jobj, "gid");
        if (gid != -1) {
            gnode = gnodes + gid;
        }


        if (gnode) {

            bool if_gw = false;

            if (gnode->if_init) {

                if_gw = json_get_bool(jobj, "gw");
                if (if_gw)
                    do_system_netns(gnode->name, "ip route del default");
                node_name = gnode->name;
            }
            else {
                if ((node_name = json_get_string(jobj, "name")) == NULL) {
                    printf("cfg error : node name is null\n");
                    return -1;
                }
                strcpy(gnode->name, node_name);
                do_system("ip netns add rlab-%s", node_name);
                gnode->if_init = true;
            }
        }
        else {
            if ((node_name = json_get_string(jobj, "name")) == NULL) {
                printf("cfg error : node name is null\n");
                return -1;
            }
            do_system("ip netns add rlab-%s", node_name);
        }

        if (br_on && vlan_on) {
            if ((vid = json_get_int(jobj, "vid")) < 0) {
                printf("error : %s vid must set", node_name);
                exit(-1);
            }
        }

        char *ifname_u_parent;
        ifname_u_parent = json_get_string(jobj, "ifname_parent");
        ifname_u = json_get_string(jobj, "ifname");
        sprintf(ifname_parent, "rlab-%s-", node_name);
        sprintf(ifname_child, "rlab-%s", node_name);

        if (br_on && lan_addr.s_addr)
            netns_init(name, node_name, lan_addr, ifname_parent, ifname_child, 
                    ifname_u_parent, ifname_u, gnode);
        else
            netns_init(name, node_name, alloc_ip(net_begin, net_offset, 1), 
                    ifname_parent, ifname_child, ifname_u_parent, ifname_u, gnode);

        if (br_on) {
            do_system_netns(name, "brctl addif br0 %s", ifname_parent);

            if (lan_addr.s_addr)
                ip_addr_alloc(node_name, lan_addr, ifname_child, 0, ip_offset++);
            else
                ip_addr_alloc(node_name, net_begin, ifname_child, net_offset, ++ip_offset);

            ++(*(pnet_offset));
            _node_create(jobj, net_begin, pnet_offset);

            if (vlan_on) {
                do_system_netns(name, "bridge vlan add dev br0 vid %d untagged self", vid);
                do_system_netns(name, "bridge vlan add dev %s vid %d pvid untagged", ifname_parent, vid);
            }
        }
        else {
            ip_addr_alloc(name, net_begin, ifname_parent, net_offset, 1);
            ip_addr_alloc(node_name, net_begin, ifname_child, net_offset, 2);
            ++(*(pnet_offset));
            _node_create(jobj, net_begin, pnet_offset);
            net_offset = *pnet_offset;
        }

    }

    return 0;
}

inline static int 
node_create(json_object *jroot)
{
    struct in_addr net_begin, gw;
    int net_offset = 0;
    net_begin.s_addr = inet_addr("172.168.9.0");
    gw.s_addr = 0;
    return _node_create(jroot, net_begin, &net_offset);
}

int main(int argc, char *argv[])
{
    char *cfgfile;
    char *file = NULL;
    json_mem_t mem;
    json_object *json = NULL;

    if (argc != 2) {
        printf("usage : %s cfgfile\n", argv[0]);
        return -1;
    }

    cfgfile = strdup(argv[1]);

    pjson_memory_init(&mem);

    if ((json = json_fast_parse_file(cfgfile, &mem)) == NULL) {
        printf("json parse failed!\n");
        return -1;
    }

    return node_create(json);
}

