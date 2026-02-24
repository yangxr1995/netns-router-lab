#include <stdio.h>
#include <stdlib.h>
#include <stdarg.h>
#include <string.h>
#include "cmd_exec.h"

void cmd_exec(const char *fmt, ...) {
    char cmd[CMD_BUF_SIZE];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(cmd, sizeof(cmd), fmt, ap);
    va_end(ap);

    printf("%s\n", cmd);
    system(cmd);
}

void cmd_exec_in_netns(const char *netns_name, const char *fmt, ...) {
    char tmp[CMD_TMP_BUF_SIZE];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(tmp, sizeof(tmp), fmt, ap);
    va_end(ap);

    char cmd[CMD_BUF_SIZE] = {0};
    if (netns_name) {
        snprintf(cmd, sizeof(cmd), "ip netns exec " NS_PREFIX "%s %s", netns_name, tmp);
    } else {
        strncpy(cmd, tmp, sizeof(cmd) - 1);
    }

    printf("%s\n", cmd);
    system(cmd);
}

void cmd_exec_in_netns_raw(const char *netns_name, const char *cmd_str) {
    char cmd[CMD_BUF_SIZE] = {0};
    if (netns_name) {
        snprintf(cmd, sizeof(cmd), "ip netns exec " NS_PREFIX "%s %s", netns_name, cmd_str);
    } else {
        strncpy(cmd, cmd_str, sizeof(cmd) - 1);
    }

    printf("%s\n", cmd);
    system(cmd);
}

int cmd_exec_in_netns_output(const char *netns_name, const char *fmt, char *output, size_t output_size, ...) {
    char tmp[CMD_TMP_BUF_SIZE];
    va_list ap;
    va_start(ap, output_size);
    vsnprintf(tmp, sizeof(tmp), fmt, ap);
    va_end(ap);

    char cmd[CMD_BUF_SIZE] = {0};
    if (netns_name) {
        snprintf(cmd, sizeof(cmd), "ip netns exec " NS_PREFIX "%s %s", netns_name, tmp);
    } else {
        strncpy(cmd, tmp, sizeof(cmd) - 1);
    }

    FILE *fp = popen(cmd, "r");
    if (fp == NULL) {
        return -1;
    }

    size_t read_bytes = fread(output, 1, output_size - 1, fp);
    output[read_bytes] = '\0';
    int status = pclose(fp);

    return WIFEXITED(status) ? WEXITSTATUS(status) : -1;
}