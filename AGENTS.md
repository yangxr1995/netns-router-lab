# AGENTS.md - Coding Guidelines for netns-router-lab

## Project Overview

C-based network namespace router lab tool that creates net namespaces, veth pairs, bridges, and VLANs from JSON configuration files to simulate router/switch network environments.

## Build Commands

```bash
# Build the project
make

# Clean build artifacts
make clean

# Run the tool
sudo ./rlab <config.json>
```

## Testing

This project uses JSON configuration files for testing network topologies:

```bash
# Test configurations are in test/ directory
sudo ./rlab test/cfg.json
sudo ./rlab test/cfg-vlan.json
sudo ./rlab test/cfg-mux.json

# Cleanup network namespaces after testing
sudo ./rlab-clear.sh
```

## Code Style Guidelines

### C Code

- **Naming**: snake_case for functions/variables, UPPERCASE_WITH_UNDERSCORES for macros
- **Indentation**: 4 spaces, no tabs
- **Braces**: K&R style (opening brace on same line)
- **Headers**: Use `#pragma once` for include guards
- **Functions**: Use `inline static` for internal helpers, prefix static functions with module name
- **Comments**: Chinese comments acceptable for internal logic, English for APIs
- **Error Handling**: Return -1 for failure, 0 for success; print descriptive error messages
- **Types**: Use `bool` from stdbool.h, explicit `int32_t`/`uint32_t` when size matters

Example:
```c
inline static char *
json_get_string(json_object *jroot, char *key)
{
    json_object *jobj;

    if ((jobj = json_get_object_item(jroot, key, NULL)) == NULL)
        return NULL;

    assert(jobj->type_member == JSON_STRING);

    if (jobj->value.str_member)
        return strdup(jobj->value.str_member);
    return NULL;
}
```

### Shell Scripts

- Use `set -e` for error exit
- Use uppercase for environment variables/constants
- Include helpful comments in Chinese
- Support `--help` flag
- Quote variables properly to handle spaces

### Web Frontend (web/)

- Uses Cytoscape.js for network topology visualization
- Pure vanilla JavaScript, single file (`index.html`)
- Serve with: `cd web && python3 -m http.server 8080`
- Features: drag-drop nodes, click-to-connect, property editing, JSON import/export

## Error Handling

- Check NULL pointers before dereferencing
- Use `assert()` for debug-time invariants only
- Return error codes (-1 for failure, 0 for success)
- Print descriptive error messages to stderr
- Cleanup resources on error paths

## Memory Management

- Use `strdup()` for string duplication
- Free allocated memory before program exit
- The embedded JSON parser manages its own memory pools

## Dependencies

- Standard C library
- Linux network tools: `ip`, `brctl`, `tc`, `iptables`
- No external C libraries (embeds JSON parser)
- Web interface requires modern browser with Canvas support

## Git Workflow

```bash
# Commit message style (Conventional Commits)
feat: add VLAN filtering support
fix: correct memory leak in json parser
refactor: simplify netns initialization
docs: update README with examples
chore: update Makefile flags
```

## Key Files

- `main.c` - Main application logic, network topology creation
- `json.c/h` - Embedded JSON parser (LJSON library)
- `jnum.c/h` - Number parsing utilities
- `tc-quick.sh` - Traffic control wrapper script (delay/loss/bandwidth simulation)
- `tc-reset.sh` - Reset traffic control rules
- `rlab-clear.sh` - Cleanup all rlab-created resources
- `web/index.html` - Web topology editor (single file, all-in-one)
- `web/index.html.litegraph.bak` - Backup of old litegraph.js version

## JSON Configuration Schema

Nodes support these fields:
- `name` (string, required): Node identifier
- `br` (bool): Enable bridge mode (switch functionality)
- `vlan` (bool): Enable VLAN filtering (requires br: true)
- `vid` (int): VLAN ID for child nodes
- `lan` (string): LAN subnet, e.g., "192.168.3.1"
- `forward` (bool): Enable IP forwarding (default: true)
- `exec` (array): Commands to run after node creation
- `nodes` (array): Child nodes
- `gid` (int): Global ID for multi-WAN shared nodes

## Debugging Tips

- Run with `sudo` - required for netns and network operations
- Check existing namespaces: `ip netns list`
- View interface stats: `ip -n rlab-<name> addr`
- Monitor traffic: `ip netns exec rlab-<name> tcpdump -i any`
- Web editor: Open browser devtools to debug canvas issues
