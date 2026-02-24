import type { ExampleConfig } from '@/types';

export const exampleConfigs: ExampleConfig[] = [
  {
    name: '基础拓扑',
    description: '简单的路由器+交换机+终端配置',
    data: {
      nodes: [
        {
          name: 'internet',
          nodes: [
            {
              name: 'router',
              br: true,
              nodes: [
                {
                  name: 'pc'
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: 'VLAN隔离',
    description: 'VLAN 10和VLAN 20隔离的网络',
    data: {
      nodes: [
        {
          name: 'internet',
          nodes: [
            {
              name: 'router1',
              br: true,
              vlan: true,
              nodes: [
                {
                  name: 'pc1',
                  vid: 10
                },
                {
                  name: 'pc2',
                  vid: 10
                },
                {
                  name: 'pc3',
                  vid: 20
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: '多WAN配置',
    description: '双路由器多链路聚合',
    data: {
      nodes: [
        {
          name: 'internet',
          nodes: [
            {
              name: 'router1',
              br: true,
              lan: '192.168.3.1',
              ifname_parent: 'eth0',
              nodes: [
                {
                  name: 'pc',
                  ifname: 'eth0',
                  forward: false
                }
              ]
            },
            {
              name: 'router2',
              br: true,
              lan: '192.168.4.1',
              ifname_parent: 'eth1',
              nodes: [
                {
                  name: 'pc',
                  ifname: 'eth1',
                  gw: true
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: '流量控制',
    description: '带TC流量控制配置的网络',
    data: {
      nodes: [
        {
          name: 'internet',
          nodes: [
            {
              name: 'router1',
              br: true,
              exec: [
                'tc-quick.sh --direction down --delay 20ms --bandwidth 10Mbit --loss 1%',
                'tc-quick.sh --direction up --delay 20ms --bandwidth 10Mbit --loss 1%'
              ],
              nodes: [
                {
                  name: 'pc1'
                }
              ]
            }
          ]
        }
      ]
    }
  },
  {
    name: '复杂拓扑',
    description: '多层路由器结构',
    data: {
      nodes: [
        {
          name: 'internet',
          nodes: [
            {
              name: 'router1',
              br: true,
              nodes: [
                {
                  name: 'router2',
                  br: true,
                  nodes: [
                    {
                      name: 'pc1'
                    },
                    {
                      name: 'pc2'
                    }
                  ]
                },
                {
                  name: 'switch1',
                  br: true,
                  vlan: true,
                  nodes: [
                    {
                      name: 'pc3',
                      vid: 10
                    },
                    {
                      name: 'pc4',
                      vid: 20
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  }
];
