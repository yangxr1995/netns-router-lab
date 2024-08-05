#include <assert.h>
#include <stdarg.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>


#include "json.h"

#define _fmalloc       malloc
#define _ffree         free
#define _fclose_fp(fp) do {if (fp) fclose(fp); fp = NULL; } while(0)
#define _free_ptr(ptr) do {if (ptr) _ffree(ptr); ptr = NULL; } while(0)

typedef struct cfg_ctx_s cfg_ctx_t;
struct cfg_ctx_s {
    char *type;
    char *lanip;
};


int read_file_to_data(const char *src, char **data, size_t *size)
{
    FILE *rfp = NULL;
    size_t total = 0;

    if (!src || !data)
        return -1;

    if (!size)
        size = &total;
    *data = NULL, *size = 0;

    if ((rfp = fopen(src, "r")) == NULL)
        return -1;
    fseek(rfp, 0, SEEK_END);
    *size = ftell(rfp);
    fseek(rfp, 0, SEEK_SET);
    if (*size == 0)
        goto err;

    if ((*data = _fmalloc(*size + 1)) == NULL)
        goto err;
    if (*size != fread(*data, 1, *size, rfp))
        goto err;

    (*data)[*size] = 0;
    _fclose_fp(rfp);
    return 0;
err:
    _fclose_fp(rfp);
    _free_ptr(*data);
    *size = 0;
    return -1;
}

#define type_member                     jkey.type
#define key_member                      jkey.str
#define str_member                      vstr.str

char *json_get_string(json_object *jroot, char *key)
{
    json_object *jobj;

    if ((jobj = json_get_object_item(jroot, key, NULL)) == NULL)
        return NULL;

    assert(jobj->type_member == JSON_STRING);

    if (jobj->value.str_member)
        return strdup(jobj->value.str_member);
    return NULL;
}

inline static void do_system(char *fmt, ...)
{
    char cmd[256];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(cmd, sizeof(cmd), fmt, ap);
    va_end(ap);

    printf("%s\n", cmd);
    system(cmd);
}

struct in_addr
next_net(struct in_addr net, int mask)
{
    switch (mask) {
        case 24:
            net.s_addr += (1 << 16);
            return net;
        case 32:
            net.s_addr += (1 << 24);
            return net;
        case 16:
            net.s_addr += (1 << 8);
            return net;
        case 8:
            net.s_addr += (1 << 1);
            return net;
        default:
            assert(0 && "unsupport mask");
    }
}

int node_create(json_object *jroot)
{
    struct in_addr addr;

    char *name;
    char *net_base;
    json_object *jnodes, *jobj;

    name = json_get_string(jroot, "name");
    if ((net_base = json_get_string(jroot, "net_base")) == NULL) {
        printf("end : net is null\n");
        return -1;
    }

    int mask;
    char *p;

    if ((p = strchr(net_base, '/')) == NULL) {
        printf("cfg error : net_base : [%s]", net_base);
        return -1;
    }

    *p++ = 0;
    mask = atoi(p);

    struct in_addr net_begin;

    net_begin.s_addr = inet_addr(net_base);

    jnodes = json_get_object_item(jroot, "nodes", NULL);
    if (jnodes == NULL)
        return 0;

    int arr_sz, i;
    arr_sz = json_get_array_size(jnodes);

    char *node_name;

    struct in_addr cur_net = net_begin;

    for (i = 0; i < arr_sz; ++i) {

        jobj = json_get_array_item(jnodes, i, NULL);
        if (jobj == NULL)
            break;

        if ((node_name = json_get_string(jobj, "name")) == NULL) {
            printf("cfg error : node name is null\n");
            return -1;
        }

        char nsname[64], ifname[64];

        sprintf(nsname, "rlab-%s", node_name);
        sprintf(ifname, "rlab-%s", node_name);
        do_system("ip netns add %s", nsname);
        do_system("ip link add %s type veth peer name %s-", nsname, ifname);
        do_system("ip link set %s netns %s", ifname, nsname);
        do_system("ip netns exec %s ip link set dev lo up",
                nsname);

        if (name) {
            sprintf(nsname, "rlab-%s", name);
            do_system("ip link set %s- netns %s", ifname, nsname);
            do_system("ip netns exec %s ip addr add %s/%d dev %s-",
                    nsname, inet_ntoa(cur_net = next_net(cur_net, 32)), mask, ifname);
            do_system("ip netns exec %s ip link set dev %s- up",
                    nsname, ifname);
        }
        else {
            do_system("ip addr add %s/%d dev %s-",
                   inet_ntoa(cur_net =next_net(cur_net, 32)), mask, ifname);
            do_system("ip link set dev %s- up",
                    ifname);
        }

        sprintf(nsname, "rlab-%s", node_name);
        do_system("ip netns exec %s ip addr add %s/%d dev %s",
                nsname, inet_ntoa(cur_net = next_net(cur_net, 32)), mask, ifname);
        do_system("ip netns exec %s ip link set dev %s up",
                nsname, ifname);

        node_create(jobj);

        cur_net = next_net(cur_net, mask);
    }

    return 0;
}


int main(int argc, char *argv[])
{
    char *cfgfile;
    char *file = NULL;
    char *orig_data = NULL;
    char *print_str = NULL;
    size_t orig_size = 0, print_size = 0;
    json_mem_t mem;

    if (argc != 2) {
        printf("usage : %s cfgfile\n", argv[0]);
        return -1;
    }

    cfgfile = strdup(argv[1]);

    pjson_memory_init(&mem);

    json_object *json = NULL;
    json = json_fast_parse_file(cfgfile, &mem);
    if (json == NULL) {
        printf("json parse failed!\n");
        return -1;
    }

    return node_create(json);
}

