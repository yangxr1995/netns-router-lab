# rlab - 网络命名空间路由器实验工具

C语言实现的网络命名空间路由器实验室工具。根据 JSON 格式配置文件，自动创建网络命名空间（net namespace）、veth 设备对、网桥（bridge）和 VLAN，模拟路由器、交换机网络环境，方便研究学习和测试应用程序。

## 功能特性

- **网络拓扑模拟**：创建多层网络拓扑，支持路由器、交换机、终端设备
- **VLAN 支持**：基于网桥的 VLAN 隔离和过滤
- **多 WAN 支持**：支持多链路聚合和策略路由
- **流量控制**：集成 TC 流量控制，支持延迟、丢包、带宽限制、抖动模拟
- **自动 IP 分配**：自动为设备分配 IP 地址
- **网络命名空间隔离**：每个节点运行在独立的命名空间中
- **零外部依赖**：内置 JSON 解析器，仅依赖标准 C 库和 Linux 网络工具

## 项目结构

```
.
├── main.c              # 主程序逻辑，网络拓扑创建
├── json.c / json.h     # 嵌入式 JSON 解析器（LJSON）
├── jnum.c / jnum.h     # 数字解析工具
├── Makefile            # 构建配置
├── tc-quick.sh         # 流量控制配置脚本
├── tc-reset.sh         # 流量控制重置示例
├── rlab-clear.sh       # 清理所有 rlab 创建的资源
└── web/                # Web 可视化配置器
    ├── index.html      # Cytoscape.js 拓扑编辑器
    └── simple.html     # 简化版编辑器
└── test/               # 测试配置文件
    ├── cfg.json        # 基础网络拓扑
    ├── cfg-vlan.json   # VLAN 网络拓扑
    ├── cfg-mux.json    # 多 WAN 网络拓扑
    └── cfg2.json       # 其他测试配置
```

## 快速开始

### 编译

```bash
# 构建项目
make

# 清理构建产物
make clean
```

### 运行示例

```bash
# 基础网络拓扑（含流量控制）
sudo ./rlab test/cfg.json

# VLAN 网络拓扑（VLAN 10 和 VLAN 20 隔离）
sudo ./rlab test/cfg-vlan.json

# 多 WAN 网络拓扑（策略路由）
sudo ./rlab test/cfg-mux.json

# 清理所有创建的网络资源
sudo ./rlab-clear.sh
```

## Web 可视化配置器

提供基于 Cytoscape.js 的可视化拓扑编辑工具，无需手动编写 JSON。

### 启动方式

```bash
cd web
python3 -m http.server 8080
# 浏览器访问 http://localhost:8080
```

### 功能特性

- **拖拽式拓扑图编辑**：可视化创建节点和连接
- **点击连接**：点击节点建立网络连接
- **属性编辑**：双击节点编辑网桥、VLAN、IP 等属性
- **导入/导出**：支持 rlab JSON 配置文件的导入导出
- **自动布局**：内置多种拓扑布局算法

### 文件说明

| 文件 | 说明 |
|------|------|
| `web/index.html` | 完整版 Cytoscape.js 编辑器 |
| `web/simple.html` | 简化版编辑器 |

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

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | 是 | 节点名称（唯一标识） |
| `br` | bool | 否 | 启用网桥模式（交换机功能） |
| `vlan` | bool | 否 | 启用 VLAN 过滤（需配合 `br: true`） |
| `vid` | int | 否 | VLAN ID（子节点使用，范围 1-4094） |
| `lan` | string | 否 | 指定 LAN 网段，如 `"192.168.3.1"` |
| `ifname_parent` | string | 否 | 父节点接口重命名 |
| `ifname` | string | 否 | 当前节点接口重命名 |
| `forward` | bool | 否 | 启用 IP 转发（默认：true） |
| `gid` | int | 否 | 全局节点 ID（用于多 WAN 共享节点） |
| `gw` | bool | 否 | 作为网关（多 WAN 场景使用） |
| `disable` | bool | 否 | 禁用该节点 |
| `exec` | array | 否 | 节点创建后执行的命令数组 |
| `nodes` | array | 否 | 子节点数组 |

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

同一 VLAN ID 的设备可以互通，不同 VLAN 的设备隔离：

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

使用 `gid` 创建共享节点，实现多链路聚合：

```json
{
    "nodes": [{
        "name": "internet",
        "nodes": [
            {
                "name": "router1",
                "br": true,
                "lan": "192.168.3.1",
                "ifname_parent": "eth0",
                "nodes": [{
                    "name": "pc",
                    "ifname": "eth0",
                    "forward": false,
                    "gid": 1
                }]
            },
            {
                "name": "router2",
                "br": true,
                "lan": "192.168.4.1",
                "ifname_parent": "eth1",
                "nodes": [{
                    "ifname": "eth1",
                    "gid": 1,
                    "gw": true
                }]
            }
        ]
    }]
}
```

#### 4. 带流量控制的网络

在 `exec` 中调用 `tc-quick.sh` 配置流量控制：

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

用于模拟弱网环境（延迟、丢包、带宽限制、抖动）。

```bash
# 设置 100ms 延迟，10% 丢包，限制 10Mbit 带宽
sudo ./tc-quick.sh --delay 100ms --loss 10% --bandwidth 10Mbit

# 设置上行/下行不同参数
sudo ./tc-quick.sh --direction up --delay 20ms --bandwidth 10Mbit
sudo ./tc-quick.sh --direction down --delay 50ms --bandwidth 100Mbit

# 设置网络抖动
sudo ./tc-quick.sh --delay 50ms --jitter 10ms --jitter-correlation 50%

# 设置队列长度
sudo ./tc-quick.sh --qlen 100

# 指定目标接口
sudo ./tc-quick.sh --dev eth0 --delay 100ms

# 重置配置
sudo ./tc-quick.sh --reset
```

**参数说明：**

| 参数 | 说明 | 示例 |
|------|------|------|
| `--delay` | 网络延迟 | `100ms`, `1s` |
| `--loss` | 丢包率 | `10%`, `0.5%` |
| `--bandwidth` | 带宽限制 | `10Mbit`, `1Gbit` |
| `--qlen` | 队列长度 | `100` |
| `--jitter` | 抖动值 | `10ms` |
| `--jitter-correlation` | 抖动相关系数 | `50%` |
| `--jitter-distribution` | 抖动分布类型 | `normal`, `pareto`, `paretonormal` |
| `--direction` | 流量方向 | `up`（上行）, `down`（下行） |
| `--dev` | 目标接口 | `eth0` |
| `--reset` | 重置配置 | - |

### tc-reset.sh - 流量控制重置示例

```bash
# 使用预设参数重置上下行流量控制
./tc-reset.sh
```

### rlab-clear.sh - 清理脚本

```bash
# 删除所有 rlab 创建的网络命名空间和接口
sudo ./rlab-clear.sh
```

## 网络拓扑说明

- **网段分配**：默认使用 `172.168.9.0/24` 网段，每个子网使用 `/24`
- **IP 分配**：父节点使用 `.1`，子节点依次递增（`.2`, `.3`...）
- **命名空间**：以 `rlab-<name>` 格式命名
- **接口命名**：以 `rlab-<name>` 格式命名
- **veth 对**：连接父子节点的虚拟以太网设备对

## 依赖要求

### 必需

- Linux 内核（支持 network namespace）
- GCC 编译器
- `ip` 工具（iproute2 包）
- `make`

### 可选

- `brctl` 工具（bridge-utils 包）- 网桥管理
- `tc` 工具（iproute2 包）- 流量控制
- `iptables`（用于 NAT）

### 安装依赖（Ubuntu/Debian）

```bash
sudo apt-get update
sudo apt-get install -y build-essential iproute2 bridge-utils iptables
```

### 安装依赖（CentOS/RHEL/Fedora）

```bash
sudo yum install -y gcc make iproute bridge-utils iptables
```

## 调试技巧

### 查看网络命名空间

```bash
# 列出所有网络命名空间
ip netns list

# 查看特定命名空间的接口
ip -n rlab-router1 addr

# 在命名空间中执行命令
ip netns exec rlab-router1 ip addr
ip netns exec rlab-router1 ip route
```

### 监控网络流量

```bash
# 在指定命名空间中抓包
sudo ip netns exec rlab-router1 tcpdump -i any

# 查看接口统计
ip -s link show rlab-pc1

# 查看 TC 规则
tc qdisc show dev br0
tc filter show dev br0
```

### 测试连通性

```bash
# 在命名空间中 ping
sudo ip netns exec rlab-pc1 ping 172.168.9.1

# 在命名空间中 traceroute
sudo ip netns exec rlab-pc1 traceroute 8.8.8.8
```

### 排查常见问题

| 问题 | 解决方法 |
|------|----------|
| 无法创建命名空间 | 确保使用 `sudo` 运行 |
| 接口已存在 | 运行 `sudo ./rlab-clear.sh` 清理残留 |
| TC 规则不生效 | 检查内核是否启用 `CONFIG_NET_SCH_NETEM` |
| VLAN 不通 | 确认父节点启用 `br: true` 和 `vlan: true` |

## 故障排除

### 权限问题

```bash
# 确保以 root 权限运行
sudo ./rlab test/cfg.json
```

### 命名空间残留

```bash
# 强制清理所有残留
sudo ./rlab-clear.sh
# 或手动清理
for ns in $(ip netns list | awk '/rlab/{print $1}'); do
    sudo ip netns del $ns
done
```

### 内核模块检查

```bash
# 检查 netem 支持
modprobe sch_netem

# 检查 HTB 支持
modprobe sch_htb
```

## 许可证

MIT License

