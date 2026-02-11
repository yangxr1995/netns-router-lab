# rlab - 网络命名空间路由器实验工具

根据 JSON 格式配置文件，自动创建网络命名空间（net namespace）、veth 设备对、网桥（bridge）和 VLAN，模拟路由器、交换机网络环境，方便研究学习和测试应用程序。

## 功能特性

- **网络拓扑模拟**：创建多层网络拓扑，支持路由器、交换机、终端设备
- **VLAN 支持**：基于网桥的 VLAN 隔离和过滤
- **多 WAN 支持**：支持多链路聚合和策略路由
- **流量控制**：集成 TC 流量控制，支持延迟、丢包、带宽限制、抖动模拟
- **自动 IP 分配**：自动为设备分配 IP 地址
- **网络命名空间隔离**：每个节点运行在独立的命名空间中

## 快速开始

### 编译

```bash
make
```

### 运行示例

```bash
# 基础网络拓扑
sudo ./rlab test/cfg.json

# VLAN 网络拓扑
sudo ./rlab test/cfg-vlan.json

# 多 WAN 网络拓扑
sudo ./rlab test/cfg-mux.json

# 清理所有创建的网络资源
sudo ./rlab-clear.sh
```

## JSON 配置说明

### 基础结构

```json
{
    "nodes": [
        {
            "name": "internet",
            "nodes": [
                {
                    "name": "router1",
                    "br": true,
                    "nodes": [
                        {"name": "pc1-1"}
                    ]
                }
            ]
        }
    ]
}
```

### 配置字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 节点名称（必填） |
| `br` | bool | 启用网桥模式（交换机功能） |
| `vlan` | bool | 启用 VLAN 过滤（需配合 br: true） |
| `vid` | int | VLAN ID（子节点使用） |
| `lan` | string | 指定 LAN 网段，如 "192.168.3.1" |
| `ifname_parent` | string | 父节点接口重命名 |
| `ifname` | string | 当前节点接口重命名 |
| `forward` | bool | 启用 IP 转发（默认 true） |
| `gid` | int | 全局节点 ID（用于多 WAN 共享节点） |
| `gw` | bool | 作为网关（多 WAN 场景使用） |
| `disable` | bool | 禁用该节点 |
| `exec` | array | 节点创建后执行的命令数组 |
| `nodes` | array | 子节点数组 |

### 配置示例

#### 1. 基础路由器 + 交换机

```json
{
    "nodes": [{
        "name": "internet",
        "nodes": [{
            "name": "router1",
            "br": true,
            "nodes": [{"name": "pc1"}]
        }]
    }]
}
```

#### 2. VLAN 隔离网络

```json
{
    "nodes": [{
        "name": "internet",
        "nodes": [{
            "name": "router1",
            "br": true,
            "vlan": true,
            "nodes": [
                {"name": "pc1", "vid": 10},
                {"name": "pc2", "vid": 10},
                {"name": "pc3", "vid": 20}
            ]
        }]
    }]
}
```

#### 3. 多 WAN 配置

```json
{
    "nodes": [{
        "name": "internet",
        "nodes": [
            {
                "name": "router1",
                "br": true,
                "lan": "192.168.3.1",
                "nodes": [{
                    "name": "pc",
                    "gid": 1,
                    "forward": false
                }]
            },
            {
                "name": "router2",
                "br": true,
                "lan": "192.168.4.1",
                "nodes": [{
                    "gid": 1,
                    "gw": true
                }]
            }
        ]
    }]
}
```

#### 4. 带流量控制的网络

```json
{
    "nodes": [{
        "name": "internet",
        "nodes": [{
            "name": "router1",
            "br": true,
            "exec": [
                "tc-quick.sh --direction down --delay 20ms --bandwidth 10Mbit --loss 1%",
                "tc-quick.sh --direction up --delay 20ms --bandwidth 10Mbit --loss 1%"
            ],
            "nodes": [{"name": "pc1"}]
        }]
    }]
}
```

## 辅助脚本

### tc-quick.sh - 流量控制配置

```bash
# 设置 100ms 延迟，10% 丢包，限制 10Mbit 带宽
sudo ./tc-quick.sh --delay 100ms --loss 10% --bandwidth 10Mbit

# 设置网络抖动
sudo ./tc-quick.sh --delay 50ms --jitter 10ms --jitter-correlation 50%

# 重置配置
sudo ./tc-quick.sh --reset
```

### rlab-clear.sh - 清理脚本

```bash
# 删除所有 rlab 创建的网络命名空间和接口
sudo ./rlab-clear.sh
```

## 网络拓扑说明

- **网段分配**：默认使用 172.168.9.0/24 网段，每个子网使用 /24
- **IP 分配**：父节点使用 .1，子节点依次递增
- **命名空间**：以 `rlab-<name>` 格式命名
- **接口命名**：以 `rlab-<name>` 格式命名

## 依赖

- Linux 内核支持 network namespace
- `ip` 工具（iproute2）
- `brctl` 工具（bridge-utils）
- `tc` 工具（用于流量控制）
- `iptables`（用于 NAT）

## 许可证

MIT License

