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
./rlab <config.json>
```

## Testing

This project uses JSON configuration files for testing network topologies:

```bash
# Test configurations are in test/ directory
./rlab test/cfg.json
./rlab test/cfg-vlan.json
./rlab test/cfg-mux.json

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

Example:
```c
inline static char *
json_get_string(json_object *jroot, char *key)
{
    // implementation
}
```

### Shell Scripts

- Use `set -e` for error exit
- Use uppercase for environment variables/constants
- Include helpful comments in Chinese
- Support `--help` flag

## Error Handling

- Check NULL pointers before dereferencing
- Use `assert()` for debug-time invariants
- Return error codes (-1 for failure, 0 for success)
- Print descriptive error messages

## Dependencies

- Standard C library
- Linux network tools: `ip`, `brctl`, `tc`, `iptables`
- No external C libraries (embeds JSON parser)

## Git Workflow

```bash
# Commit message style
feat: add VLAN filtering support
fix: correct memory leak in json parser
refactor: simplify netns initialization
```

## Key Files

- `main.c` - Main application logic
- `json.c/h` - Embedded JSON parser (LJSON)
- `jnum.c/h` - Number parsing utilities
- `tc-quick.sh` - Traffic control wrapper script
- `rlab-clear.sh` - Cleanup script
