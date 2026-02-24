#pragma once

#include <stdbool.h>
#include <netinet/in.h>
#include "constants.h"

typedef struct {
    char name[NODE_NAME_MAX_LEN];
    int rtable_indices[MAX_LINKS]; // 为每个链路存储唯一的路由表索引
    bool if_init;
    bool used;
    int link_count;
    char uplink_ifname[IFNAME_MAX_LEN];
} gnode_t;

typedef struct {
    char name[NODE_NAME_MAX_LEN];
    char ifname_parent[IFNAME_MAX_LEN];
    char ifname_child[IFNAME_MAX_LEN];
    struct in_addr gw;
    gnode_t *gnode;
    gnode_t *gnode_child;
    bool if_gw;
    bool disable;
    int vid;
} node_config_t;

typedef struct {
    gnode_t nodes[MAX_NODES];
    int current_rtable_idx;
    int count;
} node_registry_t;

void node_registry_init(node_registry_t *reg);
gnode_t *node_registry_get_by_name(node_registry_t *reg, const char *name);
gnode_t *node_registry_alloc_by_name(node_registry_t *reg, const char *name);
