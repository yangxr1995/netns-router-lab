#include <assert.h>
#include <stdlib.h>
#include <string.h>
#include "json_utils.h"

#define type_member jkey.type
#define str_member  vstr.str

char *json_get_string_value(json_object *jroot, const char *key) {
    json_object *jobj = json_get_object_item(jroot, key, NULL);
    if (!jobj) {
        return NULL;
    }

    assert(jobj->type_member == JSON_STRING);

    if (jobj->value.str_member) {
        return strdup(jobj->value.str_member);
    }
    return NULL;
}

int json_get_int_from_object(json_object *jroot, const char *key) {
    json_object *jobj = json_get_object_item(jroot, key, NULL);
    if (!jobj) {
        return -1;
    }
    return json_get_int_value(jobj);
}

bool json_get_bool_from_object(json_object *jroot, const char *key) {
    json_object *jobj = json_get_object_item(jroot, key, NULL);
    if (!jobj) {
        return false;
    }
    return json_get_bool_value(jobj);
}

bool json_has_key(json_object *jroot, const char *key) {
    return json_get_object_item(jroot, key, NULL) != NULL;
}
