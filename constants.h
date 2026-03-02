#pragma once

#define NODE_NAME_MAX_LEN       64
#define IFNAME_MAX_LEN          128
#define CMD_BUF_SIZE            512
#define CMD_TMP_BUF_SIZE        256
#define NSNAME_BUF_SIZE         64

#define MAX_NODES               128
#define MAX_LINKS               16
#define DEFAULT_NET_IP          "172.168.9.0"
#define NETMASK_BITS            24
#define INITIAL_RTABLE_IDX      1234

#define NS_PREFIX               "rlab-"
#define IFACE_PREFIX            "rlab-"
#define DEFAULT_BRIDGE_NAME     "br0"

#define EXIT_SUCCESS_CODE       0
#define EXIT_FAILURE_CODE       (-1)
#define EXIT_CONFIG_ERROR       (-2)

#define JSON_KEY_NAME           "name"
#define JSON_KEY_TYPE           "type"
#define JSON_KEY_NODES          "nodes"
#define JSON_KEY_BR             "br"
#define JSON_KEY_VLAN           "vlan"
#define JSON_KEY_VID            "vid"
#define JSON_KEY_LAN            "lan"
#define JSON_KEY_FORWARD        "forward"
#define JSON_KEY_GW             "gw"
#define JSON_KEY_DISABLE        "disable"
#define JSON_KEY_EXEC           "exec"
#define JSON_KEY_IFNAME         "ifname"
#define JSON_KEY_IFNAME_PARENT  "ifname_parent"

#define ERR_NODE_NAME_NULL      "cfg error: node name is null\n"
#define ERR_VID_REQUIRED        "error: %s vid must set\n"
#define ERR_JSON_PARSE          "json parse failed!\n"
#define ERR_USAGE               "usage: %s cfgfile\n"
