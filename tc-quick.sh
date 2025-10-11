#!/bin/bash

set -e  # 启用错误退出

# 默认参数值
DEFAULT_DELAY="10ms"
DEFAULT_LOSS="0%"
DEFAULT_BANDWIDTH=""  # 默认不限制带宽

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo "  网络模拟参数配置工具"
    echo "选项:"
    echo "  --reset                  恢复默认网络配置（删除所有qdisc规则）"
    echo "  --delay <时延>           设置基础网络时延（默认: $DEFAULT_DELAY），例如 100ms"
    echo "  --loss <丢包率>          设置数据包丢包率（默认: $DEFAULT_LOSS），例如 10%"
    echo "  --bandwidth <带宽>       设置最大带宽（可选），例如 100Mbit 或 500Kbit"
    echo "  --qlen <数量>            设置链路缓冲队列中最大排队数量（可选）"
    echo "  --direction <up/down>    设置目标流量为上行流量还是下行流量(可选)"
    echo "                               选择上行流量时，目标接口为网关"
    echo "                               选择上行流量时，目标接口为br0"
    echo "  --dev <接口名称>         设置tc指令的目标设备(可选)"
    echo "                               会覆盖--direction的效果，"
    echo "                               以兼容--direction自动推导的接口不适用的场景"
    echo "  --help                   显示此帮助信息"
}

# 初始化参数
delay=$DEFAULT_DELAY
loss=$DEFAULT_LOSS
bandwidth=$DEFAULT_BANDWIDTH
qlen=""
reset_flag=0

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case "$1" in
        --reset)
            reset_flag=1
            shift
            ;;
        --delay)
            delay="$2"
            shift 2
            ;;
        --loss)
            loss="$2"
            shift 2
            ;;
        --bandwidth)
            bandwidth="$2"
            shift 2
            ;;
        --qlen)
            qlen="$2"
            shift 2
            ;;
        --direction)
            direction="$2"
            shift 2
            ;;
        --dev)
            targetDev="$2"
            shift 2
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo "错误: 未知参数 $1"
            show_help
            exit 1
            ;;
    esac
done

# 自动检测网络接口
get_default_interface() {
    ip route | grep default | awk '{print $5}' | head -n1
}

if [[ -z "${targetDev}" ]]; then

    if [[ "${direction}" == "up" ]]; then

        INTERFACE=$(get_default_interface)
        if [[ -z "$INTERFACE" ]]; then
            echo "错误: 无法检测到默认网络接口"
            exit 1
        fi

    elif [[ "${direction}" == "down" ]]; then
        INTERFACE="br0"
    else
        echo "错误: direction 值非法:${direction}"
        show_help
        exit 1
    fi

else
    INTERFACE="${targetDev}"
fi

# 验证参数函数
validate_params() {
    # 验证时延参数
    if [[ "$delay" != "$DEFAULT_DELAY" ]] && ! echo "$delay" | grep -qE '^[0-9]+(ms|s|us)$'; then
        echo "错误: 时延参数格式不正确。例如: 100ms, 1s, 500us"
        exit 1
    fi
    
    # 验证丢包率参数
    if [[ "$loss" != "$DEFAULT_LOSS" ]] && ! echo "$loss" | grep -qE '^[0-9]+(\.?[0-9]+)?%$'; then
        echo "错误: 丢包率参数格式不正确。例如: 10%, 0.5%"
        exit 1
    fi
    
    # 验证带宽参数
    if [[ -n "$bandwidth" ]] && ! echo "$bandwidth" | grep -qE '^[0-9]+(Kbit|Mbit|Gbit|bps|Kbps|Mbps|Gbps)$'; then
        echo "错误: 带宽参数格式不正确。例如: 100Mbit, 500Kbit, 1Gbit"
        exit 1
    fi
    
    # 验证qlen参数
    if [[ -n "$qlen" ]] && ! echo "$qlen" | grep -qE '^[0-9]+$'; then
        echo "错误: qlen参数必须是正整数"
        exit 1
    fi
}

# 检查是否有root权限
check_root() {
    if [[ $EUID -ne 0 ]]; then
        echo "错误: 此脚本需要root权限运行"
        echo "请使用 sudo $0 或以root用户运行"
        exit 1
    fi
}

# 检查内核模块和qdisc支持
check_kernel_support() {
    echo "检查内核模块支持..."
    
    # 检查基本的tc命令
    if ! command -v tc >/dev/null 2>&1; then
        echo "错误: tc命令未找到，请安装iproute2包"
        exit 1
    fi
    
    # 检查qdisc功能支持（通过实际测试而不是模块加载）
    echo "检查qdisc功能支持..."
    
    # 检查是否支持netem（测试在lo接口上）
    if ! tc qdisc add dev lo root netem delay 1ms 2>/dev/null; then
        echo "错误: 系统不支持netem qdisc，请检查内核配置"
        echo "提示: 内核需要启用 CONFIG_NET_SCH_NETEM"
        tc qdisc del dev lo root 2>/dev/null || true
        exit 1
    fi
    tc qdisc del dev lo root 2>/dev/null || true
    echo "  ✓ netem qdisc 支持正常"
    
    # 检查HTB支持
    if tc qdisc add dev lo root htb 2>/dev/null; then
        tc qdisc del dev lo root 2>/dev/null || true
        echo "  ✓ htb qdisc 支持正常"
    else
        echo "  ! htb qdisc 不可用，将使用备用方案"
    fi
    
    # 检查TBF支持
    if tc qdisc add dev lo root tbf rate 1mbit burst 1500 limit 3000 2>/dev/null; then
        tc qdisc del dev lo root 2>/dev/null || true
        echo "  ✓ tbf qdisc 支持正常"
    else
        echo "  ! tbf qdisc 不可用"
    fi
    
    echo "内核功能检查完成"
}

# 恢复默认配置
if [[ $reset_flag -eq 1 ]]; then
    check_root
    echo "恢复默认网络配置..."
    echo "当前网络接口: $INTERFACE"
    tc qdisc del dev $INTERFACE root 2>/dev/null || true
    echo "已删除所有qdisc规则"
    exit 0
fi

# 验证参数
validate_params
check_root
check_kernel_support

echo "当前网络接口: $INTERFACE"
echo "配置参数: 时延=$delay, 丢包率=$loss, 带宽=$bandwidth, 队列长度=$qlen"

# 清除现有规则
echo "清除现有qdisc规则..."
tc qdisc del dev $INTERFACE root 2>/dev/null || true

# 构建netem参数
netem_args=""
if [[ "$delay" != "$DEFAULT_DELAY" ]] || [[ "$loss" != "$DEFAULT_LOSS" ]]; then
    if [[ "$delay" != "$DEFAULT_DELAY" ]]; then
        netem_args="delay ${delay}"
    fi
    if [[ "$loss" != "$DEFAULT_LOSS" ]]; then
        if [[ -n "$netem_args" ]]; then
            netem_args="${netem_args} loss ${loss}"
        else
            netem_args="loss ${loss}"
        fi
    fi
fi

# 如果没有任何netem参数，使用默认值
if [[ -z "$netem_args" ]]; then
    netem_args="delay ${DEFAULT_DELAY} loss ${DEFAULT_LOSS}"
fi

# 检查HTB支持并提供备用方案
check_htb_support() {
    local test_dev="$1"
    echo "检查HTB qdisc支持..."
    
    # 先清理可能的残留配置
    tc qdisc del dev $test_dev root 2>/dev/null || true
    
    # 尝试创建HTB qdisc
    if tc qdisc add dev $test_dev root handle 1: htb default 30 2>/dev/null; then
        tc qdisc del dev $test_dev root 2>/dev/null || true
        echo "HTB qdisc支持正常"
        return 0
    else
        echo "警告: HTB qdisc不可用，将使用备用方案"
        return 1
    fi
}

do_cmd() {
    echo "执行: $*"
    if ! "$@"; then
        echo "错误: 命令执行失败: $*"
        return 1
    fi
}

# 设置队列长度
# 使用 pfifo qdisc 实现队列长度控制
tc_set_qlen() {
    local interface="$1"
    local queue_len="$2"
    
    if [[ -n "$queue_len" ]]; then
        echo "设置队列长度为: $queue_len"
        # 使用 pfifo qdisc 实现队列长度控制
        # 先删除可能存在的根 qdisc
        do_cmd tc qdisc del dev $interface root 2>/dev/null || true
        # 添加 pfifo 队列，限制最大包数量
        if ! do_cmd tc qdisc add dev $interface root pfifo limit $queue_len 2>/dev/null; then
            echo "警告: 无法设置 pfifo 队列长度"
            # 如果 pfifo 不可用，尝试使用默认的 pfifo_fast
            do_cmd tc qdisc add dev $interface root pfifo_fast 2>/dev/null || true
        fi
    fi
}

# 应用配置
echo "应用网络配置..."

# 设置队列长度（如果指定）
if [[ -n "$qlen" ]]; then
    tc_set_qlen $INTERFACE $qlen
fi

if [[ -n "$bandwidth" ]]; then
    echo "配置带宽限制: $bandwidth"
    
    # 检查HTB支持
    if check_htb_support $INTERFACE; then
        # 使用HTB + netem的组合方案
        echo "使用HTB + netem组合方案"
        do_cmd tc qdisc add dev $INTERFACE root handle 1: htb default 12
        do_cmd tc class add dev $INTERFACE parent 1: classid 1:1 htb rate $bandwidth
        do_cmd tc class add dev $INTERFACE parent 1:1 classid 1:12 htb rate $bandwidth ceil $bandwidth
        do_cmd tc qdisc add dev $INTERFACE parent 1:12 handle 12: netem $netem_args
        # 添加过滤器将所有流量导向限速类
        do_cmd tc filter add dev $INTERFACE parent 1: protocol all prio 1 u32 match u32 0 0 flowid 1:12
    else
        # 备用方案：使用tbf + netem
        echo "使用TBF + netem备用方案"
        
        # 解析带宽值为比特/秒
        bandwidth_bps=$bandwidth
        if [[ $bandwidth =~ ^([0-9]+)(Gbit|Mbit|Kbit|Gbps|Mbps|Kbps|bps)?$ ]]; then
            number=${BASH_REMATCH[1]}
            unit=${BASH_REMATCH[2]}
            case $unit in
                "Gbit") bandwidth_bps=$((number * 1000000000)) ;;
                "Mbit") bandwidth_bps=$((number * 1000000)) ;;
                "Kbit") bandwidth_bps=$((number * 1000)) ;;
                "Gbps") bandwidth_bps=$((number * 1000000000)) ;;
                "Mbps") bandwidth_bps=$((number * 1000000)) ;;
                "Kbps") bandwidth_bps=$((number * 1000)) ;;
                "bps"|""|"") bandwidth_bps=$number ;;
            esac
        fi
        
        # 计算缓冲区大小（建议为带宽的 1/8 但至少 1500 字节）
        burst_size=$((bandwidth_bps / 8))
        if [[ $burst_size -lt 1500 ]]; then
            burst_size=1500
        fi
        # 限制最大缓冲区大小
        if [[ $burst_size -gt 1000000 ]]; then
            burst_size=1000000
        fi
        
        echo "使用带宽: ${bandwidth_bps} bps, 缓冲区: ${burst_size} bytes"
        
        # 创建TBF qdisc用于带宽限制
        if do_cmd tc qdisc add dev $INTERFACE root handle 1: tbf rate ${bandwidth_bps} burst ${burst_size} limit $((burst_size * 3)); then
            # 在TBF上添加netem用于延迟和丢包
            if [[ -n "$netem_args" ]]; then
                do_cmd tc qdisc add dev $INTERFACE parent 1: handle 10: netem $netem_args
            fi
        else
            echo "警告: TBF qdisc也不可用，将忽略带宽限制只应用netem"
            do_cmd tc qdisc add dev $INTERFACE root netem $netem_args
        fi
    fi
else
    echo "配置网络延迟和丢包"
    do_cmd tc qdisc add dev $INTERFACE root netem $netem_args
fi

echo "网络配置完成！"
echo "当前配置:"
tc qdisc show dev $INTERFACE

# 如果配置了带宽，提供测试建议
# if [[ -n "$bandwidth" ]]; then
#     echo ""
#     echo "带宽限制测试建议:"
#     echo "1. 使用 iperf3 测试:"
#     echo "   服务端: iperf3 -s"
#     echo "   客户端: iperf3 -c <服务器IP> -t 10"
#     echo ""
#     echo "2. 使用 wget 测试下载速度:"
#     echo "   wget -O /dev/null http://speedtest.tele2.net/100MB.zip"
#     echo ""
#     echo "3. 使用 curl 测试:"
#     echo "   curl -o /dev/null -w '%{speed_download}\\n' http://speedtest.tele2.net/10MB.zip"
#     echo ""
#     echo "4. 查看实时流量统计:"
#     echo "   watch -n 1 'tc -s qdisc show dev $INTERFACE'"
# fi

exit 0

