import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, X } from 'lucide-react';
import type { NodeType, NodeData } from '@/types';

interface PropertiesPanelProps {
  selectedNode: cytoscape.NodeSingular | null;
  onNodeUpdate: (node: cytoscape.NodeSingular, key: string, value: any) => void;
  onNodeDelete: (node: cytoscape.NodeSingular) => void;
}

const typeLabels: Record<NodeType, string> = {
  internet: 'Internet',
  router: '路由器',
  switch: '交换机',
  pc: '终端设备'
};

const typeBadges: Record<NodeType, string> = {
  internet: 'badge-internet',
  router: 'badge-router',
  switch: 'badge-switch',
  pc: 'badge-pc'
};

export default function PropertiesPanel({
  selectedNode,
  onNodeUpdate,
  onNodeDelete
}: PropertiesPanelProps) {
  const [newCommand, setNewCommand] = useState('');

  // Get exec commands directly from node data
  const execCommands = selectedNode ? (selectedNode.data('exec') || []) : [];

  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-sm">属性面板</h3>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="empty-state text-center px-6">
            <p className="text-muted-foreground mb-2">选择一个节点编辑属性</p>
            <p className="text-xs text-muted-foreground/60">
              点击画布中的节点查看和编辑属性
            </p>
          </div>
        </div>
      </div>
    );
  }

  const data = selectedNode.data() as NodeData;
  const type = data.type;
  const isInternet = type === 'internet';

  const handleUpdate = (key: string, value: any) => {
    onNodeUpdate(selectedNode, key, value);
  };

  const handleAddExec = () => {
    if (newCommand.trim()) {
      const updated = [...execCommands, newCommand.trim()];
      handleUpdate('exec', updated);
      setNewCommand('');
    }
  };

  const handleRemoveExec = (index: number) => {
    const updated = execCommands.filter((_cmd: string, i: number) => i !== index);
    handleUpdate('exec', updated);
  };

  const handleUpdateExec = (index: number, value: string) => {
    const updated = [...execCommands];
    updated[index] = value;
    handleUpdate('exec', updated);
  };

  return (
    <div className="h-full flex flex-col panel-animate">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">属性面板</h3>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Node Type */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">节点类型</Label>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={`${typeBadges[type]} capitalize`}
              >
                {typeLabels[type]}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Name */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">名称</Label>
            <Input
              value={data.name || ''}
              onChange={(e) => {
                handleUpdate('name', e.target.value);
                handleUpdate('label', e.target.value);
              }}
              disabled={isInternet}
              className="h-8 text-sm"
              placeholder="节点名称"
            />
          </div>

          {!isInternet && (
            <>
              <Separator />

              {/* Bridge */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="br">
                  启用网桥 (br)
                </Label>
                <Checkbox
                  id="br"
                  checked={data.br || false}
                  onCheckedChange={(checked) => handleUpdate('br', checked)}
                />
              </div>

              {/* VLAN */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="vlan">
                  启用 VLAN
                </Label>
                <Checkbox
                  id="vlan"
                  checked={data.vlan || false}
                  onCheckedChange={(checked) => handleUpdate('vlan', checked)}
                />
              </div>

              {/* VLAN ID */}
              {data.vlan && (
                <div className="space-y-2 pl-4 border-l-2 border-border">
                  <Label className="text-xs text-muted-foreground">VLAN ID</Label>
                  <Input
                    type="number"
                    min={1}
                    max={4094}
                    value={data.vid || ''}
                    onChange={(e) => handleUpdate('vid', parseInt(e.target.value) || 0)}
                    className="h-8 text-sm"
                    placeholder="1-4094"
                  />
                </div>
              )}

              <Separator />

              {/* LAN Address */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">LAN 网段</Label>
                <Input
                  value={data.lan || ''}
                  onChange={(e) => handleUpdate('lan', e.target.value)}
                  className="h-8 text-sm"
                  placeholder="例如: 192.168.1.1"
                />
              </div>

              {/* Interface Name */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">接口名称 (ifname)</Label>
                <Input
                  value={data.ifname || ''}
                  onChange={(e) => handleUpdate('ifname', e.target.value)}
                  className="h-8 text-sm"
                  placeholder="例如: eth0"
                />
              </div>

              {/* Parent Interface */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">父接口名称 (ifname_parent)</Label>
                <Input
                  value={data.ifname_parent || ''}
                  onChange={(e) => handleUpdate('ifname_parent', e.target.value)}
                  className="h-8 text-sm"
                  placeholder="例如: eth0"
                />
              </div>

              <Separator />

              {/* Forward */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="forward">
                  IP 转发
                </Label>
                <Checkbox
                  id="forward"
                  checked={data.forward !== false}
                  onCheckedChange={(checked) => handleUpdate('forward', checked)}
                />
              </div>

              {/* Gateway */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="gw">
                  作为网关 (gw)
                </Label>
                <Checkbox
                  id="gw"
                  checked={data.gw || false}
                  onCheckedChange={(checked) => handleUpdate('gw', checked)}
                />
              </div>

              {/* Disable */}
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="disable">
                  禁用节点
                </Label>
                <Checkbox
                  id="disable"
                  checked={data.disable || false}
                  onCheckedChange={(checked) => handleUpdate('disable', checked)}
                />
              </div>

              <Separator />

              {/* Exec Commands */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Exec 命令</Label>
                <p className="text-[10px] text-muted-foreground/60">
                  节点创建后执行的命令
                </p>
                
                <div className="space-y-2">
                  {execCommands.map((cmd: string, idx: number) => (
                    <div key={idx} className="exec-item">
                      <Input
                        value={cmd}
                        onChange={(e) => handleUpdateExec(idx, e.target.value)}
                        className="h-7 text-xs flex-1"
                        placeholder="输入命令..."
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => handleRemoveExec(idx)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  
                  <div className="flex gap-2">
                    <Input
                      value={newCommand}
                      onChange={(e) => setNewCommand(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddExec();
                        }
                      }}
                      className="h-8 text-xs flex-1"
                      placeholder="添加新命令..."
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={handleAddExec}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Delete Button */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => onNodeDelete(selectedNode)}
            disabled={isInternet}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            删除节点
          </Button>
        </div>
      </ScrollArea>
    </div>
  );
}
