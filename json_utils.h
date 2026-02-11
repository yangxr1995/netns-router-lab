#pragma once

#include <stdbool.h>
#include "json.h"

char *json_get_string_value(json_object *jroot, const char *key);
int json_get_int_from_object(json_object *jroot, const char *key);
bool json_get_bool_from_object(json_object *jroot, const char *key);
bool json_has_key(json_object *jroot, const char *key);
