#include <assert.h>
#include <stdarg.h>
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
netns_init(char *parent_name, char *name, struct in_addr gw, int vlan_id)
{
    char nsname[64], ifname[64] ;

    sprintf(nsname, "rlab-%s", name);
    sprintf(ifname, "rlab-%s", name);

    do_system("ip netns add %s", nsname);
    do_system("ip link add %s type veth peer name %s-", nsname, ifname);
    do_system("ip link set %s netns %s", ifname, nsname);
    if (parent_name)
        do_system("ip link set %s- netns rlab-%s", ifname, parent_name);

    do_system("ip netns exec %s ip link set dev lo up", nsname);
    do_system("ip netns exec %s ip link set dev %s up", nsname, ifname);
    do_system_netns(parent_name, "ip link set dev %s- up", ifname);

    if (vlan_id > 0) {

        do_system_netns(parent_name, "ip link add link %s- name %s.%d- type vlan id %d",
                ifname, ifname, vlan_id, vlan_id);
        do_system_netns(parent_name, "ip link set dev %s.%d- up", ifname, vlan_id);

        do_system("ip netns exec %s ip link add link %s name %s.%d type vlan id %d",
                nsname, ifname, ifname, vlan_id, vlan_id);
        do_system("ip netns exec %s ip link set %s.%d up", nsname, ifname, vlan_id);

        do_system("ip netns exec %s ip route add default via %s dev %s.%d onlink",
                nsname, inet_ntoa(gw), ifname, vlan_id);
        do_system("ip netns exec %s iptables -t nat -I POSTROUTING -o %s.%d -j MASQUERADE",
                nsname, ifname, vlan_id);
    }
    else {
        do_system("ip netns exec %s ip route add default via %s dev %s onlink",
                nsname, inet_ntoa(gw), ifname);
        do_system("ip netns exec %s iptables -t nat -I POSTROUTING -o %s -j MASQUERADE",
                nsname, ifname);
    }
}

inline static void
ip_addr_alloc(char *name, struct in_addr net, char *dev, int net_offset, int ip_offset)
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
    char br_on = 0;
    int lan_vlan_id = 0;

    name = json_get_string(jroot, "name");
    br_on = json_get_bool(jroot, "br");

    if ((jnodes = json_get_object_item(jroot, "nodes", NULL)) == NULL)
        return 0;

    int arr_sz, i;
    arr_sz = json_get_array_size(jnodes);

    char *node_name;
    char ifname_child[64], ifname_parent[64];
    int ip_offset = 0;

    if (br_on) {
        do_system_netns(name, "brctl addbr br0");
        ip_addr_alloc(name, net_begin, "br0", net_offset, ++ip_offset);
    }

    for (i = 0; i < arr_sz; ++i) {

        if ((jobj = json_get_array_item(jnodes, i, NULL)) == NULL)
            break;

        if ((node_name = json_get_string(jobj, "name")) == NULL) {
            printf("cfg error : node name is null\n");
            return -1;
        }

        lan_vlan_id = json_get_int(jobj, "vlan");
        printf("lan_vlan_id : %d\n", lan_vlan_id);

        netns_init(name, node_name, alloc_ip(net_begin, net_offset, 1), lan_vlan_id);

        if (lan_vlan_id > 0) {
            sprintf(ifname_parent, "rlab-%s.%d-", node_name, lan_vlan_id);
            sprintf(ifname_child, "rlab-%s.%d", node_name, lan_vlan_id);
        }
        else {
            sprintf(ifname_parent, "rlab-%s-", node_name);
            sprintf(ifname_child, "rlab-%s", node_name);
        }

        if (br_on) {
            do_system_netns(name, "brctl addif br0 %s", ifname_parent);
            ip_addr_alloc(node_name, net_begin, ifname_child, net_offset, ++ip_offset);
            ++(*(pnet_offset));
            _node_create(jobj, net_begin, pnet_offset);
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
    struct in_addr net_begin;
    int net_offset = 0;
    net_begin.s_addr = inet_addr("172.168.9.0");
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

