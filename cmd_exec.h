#pragma once

#include "constants.h"

void cmd_exec(const char *fmt, ...);
void cmd_exec_in_netns(const char *netns_name, const char *fmt, ...);
void cmd_exec_in_netns_raw(const char *netns_name, const char *cmd);
