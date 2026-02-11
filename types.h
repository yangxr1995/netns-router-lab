#pragma once

#include <stdbool.h>
#include <netinet/in.h>
#include "constants.h"

typedef struct {
    char name[NODE_NAME_MAX_LEN];
    int rtable_idx;
    bool if_init;
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
} node_registry_t;

void node_registry_init(node_registry_t *reg);
gnode_t *node_registry_get(node_registry_t *reg, int gid);
gnode_t *node_registry_alloc(node_registry_t *reg, int gid);
