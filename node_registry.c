#include <string.h>
#include "types.h"

void node_registry_init(node_registry_t *reg) {
    memset(reg, 0, sizeof(*reg));
    reg->current_rtable_idx = INITIAL_RTABLE_IDX;
    reg->count = 0;
}

gnode_t *node_registry_get_by_name(node_registry_t *reg, const char *name) {
    if (!name || !name[0]) {
        return NULL;
    }
    for (int i = 0; i < reg->count; i++) {
        if (reg->nodes[i].used && strcmp(reg->nodes[i].name, name) == 0) {
            return &reg->nodes[i];
        }
    }
    return NULL;
}

gnode_t *node_registry_alloc_by_name(node_registry_t *reg, const char *name) {
    if (!name || !name[0]) {
        return NULL;
    }

    gnode_t *existing = node_registry_get_by_name(reg, name);
    if (existing) {
        return existing;
    }

    if (reg->count >= MAX_NODES) {
        return NULL;
    }

    gnode_t *node = &reg->nodes[reg->count++];
    node->used = true;
    node->rtable_idx = reg->current_rtable_idx++;
    node->link_count = 0;
    node->if_init = false;
    strncpy(node->name, name, NODE_NAME_MAX_LEN - 1);
    node->name[NODE_NAME_MAX_LEN - 1] = '\0';

    return node;
}
