#include <string.h>
#include "types.h"

void node_registry_init(node_registry_t *reg) {
    memset(reg, 0, sizeof(*reg));
    reg->current_rtable_idx = INITIAL_RTABLE_IDX;
}

gnode_t *node_registry_get(node_registry_t *reg, int gid) {
    if (gid < 0 || gid >= MAX_NODES) {
        return NULL;
    }
    return &reg->nodes[gid];
}

gnode_t *node_registry_alloc(node_registry_t *reg, int gid) {
    gnode_t *node = node_registry_get(reg, gid);
    if (node && !node->if_init) {
        node->rtable_idx = reg->current_rtable_idx++;
    }
    return node;
}
