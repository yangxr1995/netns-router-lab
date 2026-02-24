# AGENTS.md - Coding Guidelines for netns-router-lab

## Project Overview

C-based network namespace router lab tool that creates net namespaces, veth pairs, bridges, and VLANs from JSON configuration files to simulate router/switch network environments.

## Build/Lint/Test Commands

### Build

```bash
# Build the project
make

# Clean build artifacts
make clean

# Run the tool
sudo ./rlab <config.json>
```

### Testing

```bash
# Run all test configurations
sudo ./rlab test/cfg.json
sudo ./rlab test/cfg-vlan.json
sudo ./rlab test/cfg-mux.json

# Cleanup network namespaces after testing
sudo ./rlab-clear.sh

# Run a single test configuration
sudo ./rlab test/cfg.json && sudo ./rlab-clear.sh

# Verify test configuration
sudo ./rlab-clear.sh && sudo ./rlab test/cfg-mux.json && \
  echo "=== Route Policy Verification ===" && \
  sudo ip netns exec rlab-pc ip rule && \
  echo "=== Route Table Verification ===" && \
  sudo ip netns exec rlab-pc ip route show table all && \
  sudo ./rlab-clear.sh
```

### Linting & Formatting

This project uses implicit linting through:
- `gcc` with `-Wall -Wextra` flags
- `make` for incremental builds
- Manual verification of coding style guidelines

## Code Style Guidelines

### C Code

#### Naming Conventions
- **Functions/Variables**: snake_case
- **Macros/Constants**: UPPERCASE_WITH_UNDERSCORES
- **Typedefs/Structs/Enums**: snake_case or camelCase (avoid Hungarian notation)
- **Preprocessor**: UPPERCASE (e.g., `#define`, `#ifdef`)

#### Formatting
- **Indentation**: 4 spaces, no tabs
- **Braces**: K&R style (opening brace on same line)
- **Line Length**: < 80 characters where possible
- **Whitespace**: One space around operators, after commas
- **Line Breaks**: Break after semicolons in long statements

#### Headers
- Use `#pragma once` for include guards
- Include system headers first, then project headers
- Sort includes alphabetically

#### Functions
- Use `static` for file-local functions
- Use `inline` for performance-sensitive helpers
- Prefix static functions with module name
- Declare functions at top of file

#### Comments
- **English comments for APIs**
- **Chinese comments acceptable for internal logic**
- Line comments (`//`) for brief explanations
- Block comments (`/* */`) for detailed descriptions
- Document function parameters and return values

#### Error Handling
- Return `-1` for failure, `0` for success
- Print descriptive error messages to `stderr`
- Check NULL pointers before dereferencing
- Cleanup resources on error paths
- Use `assert()` for debug-time invariants

#### Types
- Use `bool` from `<stdbool.h>`
- Use explicit `int32_t`/`uint32_t` when size matters
- Use `size_t` for memory-related variables
- Avoid `void*` where possible

Example:
```c
static inline char*
json_get_string(json_object *jroot, const char *key)
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

#### Naming & Formatting
- **Filenames**: lowercase with hyphens (e.g., `rlab-clear.sh`)
- **Shebang**: `#!/bin/bash` or `#!/bin/sh`
- **Error Handling**: Use `set -e` for automatic error exit
- **Variables**: UPPERCASE for environment/constants, lowercase for local variables
- **Quoting**: Quote variables properly (`"$VAR"`) to handle spaces

#### Structure
- Include helpful comments in Chinese or English
- Support `--help` flag
- Use functions for code reuse
- Validate input parameters

Example:
```bash
#!/bin/bash
set -e

# 清理网络命名空间和虚拟接口
rlab_clear() {
    local ns_prefix="rlab-"
    
    # 删除所有 rlab- 前缀的网络命名空间
    for ns in $(ip netns list | grep "$ns_prefix" | awk '{print $1}'); do
        ip netns delete "$ns" 2>/dev/null || true
    done
    
    # 删除所有 rlab- 前缀的虚拟接口
    for iface in $(ip link show | grep "$ns_prefix" | awk -F: '{print $2}' | xargs); do
        ip link delete "$iface" 2>/dev/null || true
    done
}
```

### Web Frontend (web/)

- Uses Cytoscape.js for network topology visualization
- Pure vanilla JavaScript, single file (`index.html`)
- Serve with: `cd web && python3 -m http.server 8080`
- Features: drag-drop nodes, click-to-connect, property editing, JSON import/export

## Memory Management

- Use `strdup()` for string duplication
- Free allocated memory before program exit
- The embedded JSON parser manages its own memory pools
- Be cautious with `malloc()`/`free()` in multi-threaded contexts

## Dependency Management

- **Standard C Library** - No external C dependencies
- **Embedded Libraries**:
  - JSON parser (LJSON) - internal implementation in `json.c/json.h`
  - Number parser - internal implementation in `jnum.c/jnum.h`

- **External Tools**:
  - Linux network utilities: `ip`, `brctl`, `tc`, `iptables`
  - Required for `root` privileges
  - Pre-installed on most Linux distributions

## Git Workflow

### Commit Messages

Use Conventional Commits format:

```
<type>: <description>

[optional body]

[optional footer(s)]
```

**Type categories**:
- `feat`: New feature or functionality
- `fix`: Bug fix
- `refactor`: Code restructuring without functional change
- `docs`: Documentation updates
- `chore`: Maintenance tasks (build, dependencies, etc.)
- `test`: Test additions/improvements

Examples:
```
feat: add VLAN filtering support
fix: correct memory leak in json parser
refactor: simplify netns initialization
docs: update README with examples
chore: update Makefile flags
```

### Branching Strategy

- **Main Branch**: `master` - production-ready code
- **Feature Branch**: `feature/[description]` - for new functionality
- **Bug Fix Branch**: `fix/[issue-number]` - for issue resolution

## Key Files & Directories

### Core Files
- **`main.c`** - Main application logic, network topology creation
- **`node_registry.c`** - Node registry management
- **`cmd_exec.c`** - Command execution utilities
- **`json_utils.c`** - JSON parsing utilities

### Headers
- **`types.h`** - Data structures and type definitions
- **`constants.h`** - Project-wide constants and macros
- **`json.h`** - JSON parser interface
- **`jnum.h`** - Number parser interface

### Configuration
- **`Makefile`** - Build configuration
- **`README.md`** - Project documentation

### Test Files
- **`test/cfg.json`** - Basic network topology
- **`test/cfg-vlan.json`** - VLAN-enabled configuration
- **`test/cfg-mux.json`** - Multi-WAN configuration

### Scripts
- **`rlab-clear.sh`** - Cleanup all rlab-created resources
- **`tc-quick.sh`** - Traffic control wrapper script
- **`tc-reset.sh`** - Reset traffic control rules

### Web Interface
- **`web/index.html`** - Cytoscape.js topology editor

## Debugging Tips

### Network Namespace Debugging
```bash
# List all network namespaces
ip netns list

# Execute command in namespace
sudo ip netns exec rlab-pc ip addr

# Check interface status
sudo ip netns exec rlab-pc ip link show

# Test connectivity
sudo ip netns exec rlab-pc ping -c 3 192.168.3.1

# Capture traffic
sudo ip netns exec rlab-pc tcpdump -i eth0 -w capture.pcap
```

### Memory Debugging
- Use `valgrind` for memory leak detection
- Enable core dumps: `ulimit -c unlimited`
- Debug with GDB: `gdb ./rlab core`

### Performance Profiling
- Use `strace` to trace system calls
- Use `perf` for performance analysis
- Measure execution time: `time sudo ./rlab test/cfg.json`

## Error Handling Guidelines

### Common Error Patterns
- Check for NULL pointers before dereferencing
- Validate inputs before processing
- Handle system call errors properly
- Cleanup resources on error paths

### Error Messages
- Be descriptive and actionable
- Include relevant context information
- Use English for public APIs, Chinese for internal messages
- Print to `stderr` (not `stdout`)

## Best Practices

### Network Configuration
- Initialize all interfaces before use
- Cleanup resources in reverse order of creation
- Use proper error handling in configuration logic
- Verify network connectivity after setup

### Code Organization
- Separate concerns into logical modules
- Minimize dependencies between modules
- Document complex algorithms
- Keep functions focused and single-purpose

### Testing Strategy
- Test configurations cover various scenarios
- Cleanup resources after each test
- Verify both functionality and performance
- Include integration tests for complex features

## Architecture Overview

The application follows a modular architecture with:

1. **Configuration Parsing Layer**: JSON to internal structures
2. **Node Management Layer**: Node registry and allocation
3. **Network Setup Layer**: Namespace, interface, route creation
4. **Traffic Control Layer**: TC and iptables configuration
5. **Execution Layer**: Command execution in network namespaces

## Security Considerations

- Requires `root` privileges to operate
- Validate all input parameters
- Cleanup network resources properly
- Be cautious with command execution (use safe functions)
