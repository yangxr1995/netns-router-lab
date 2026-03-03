import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Router, 
  Network, 
  Monitor, 
  Download, 
  Upload, 
  Trash2,
  HelpCircle,
  FileCode,
  ChevronDown
} from 'lucide-react';
import type { NodeType } from '@/types';
import { exampleConfigs } from '@/data/examples';

interface ToolbarProps {
  onAddNode: (type: NodeType) => void;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
  onLoadExample: (index: number) => void;
  nodeCount: number;
  edgeCount: number;
}

const nodeTypes: { type: NodeType; label: string; icon: React.ElementType; color: string }[] = [
  { type: 'router', label: '路由器', icon: Router, color: 'text-red-400' },
  { type: 'switch', label: '交换机', icon: Network, color: 'text-blue-400' },
  { type: 'pc', label: '终端设备', icon: Monitor, color: 'text-green-400' },
];

export default function Toolbar({
  onAddNode,
  onExport,
  onImport,
  onClear,
  onLoadExample,
  nodeCount,
  edgeCount
}: ToolbarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-full flex flex-col toolbar-animate">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Network className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-sm">RLab 编辑器</h1>
              <p className="text-[10px] text-muted-foreground">网络拓扑配置</p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-6">
            {/* Add Nodes Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  添加节点
                </h3>
                <Badge variant="secondary" className="text-[10px]">
                  {nodeCount} 节点
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {nodeTypes.map(({ type, label, icon: Icon, color }) => (
                  <Tooltip key={type}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        className="tool-btn h-auto py-3 flex flex-col items-center gap-2 border-border/50 hover:bg-secondary/50"
                        onClick={() => onAddNode(type)}
                      >
                        <Icon className={`h-5 w-5 ${color}`} />
                        <span className="text-xs">{label}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>添加{label}节点</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </div>

            <Separator />

            {/* Connection Hint */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                连接节点
              </h3>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <p className="text-[11px] text-amber-400">
                  按住 <kbd className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">Ctrl</kbd> 点击源节点，再点击目标节点
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">当前连接数</span>
                <Badge variant="secondary" className="text-[10px]">
                  {edgeCount}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Actions Section */}
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                操作
              </h3>
              
              <div className="space-y-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full tool-btn justify-start"
                      onClick={onExport}
                    >
                      <Download className="h-4 w-4 mr-2 text-blue-400" />
                      导出配置
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>导出为 JSON 文件</p>
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full tool-btn justify-start"
                      onClick={onImport}
                    >
                      <Upload className="h-4 w-4 mr-2 text-green-400" />
                      导入配置
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>从 JSON 文件导入</p>
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full tool-btn justify-start"
                    >
                      <FileCode className="h-4 w-4 mr-2 text-purple-400" />
                      示例配置
                      <ChevronDown className="h-3 w-3 ml-auto" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>选择示例配置</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {exampleConfigs.map((config, idx) => (
                      <DropdownMenuItem
                        key={idx}
                        onClick={() => onLoadExample(idx)}
                      >
                        <div className="flex flex-col">
                          <span className="text-sm">{config.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {config.description}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full tool-btn justify-start hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      onClick={onClear}
                    >
                      <Trash2 className="h-4 w-4 mr-2 text-red-400" />
                      清空画布
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>删除所有节点和连接</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Help Section */}
        <div className="p-3 border-t border-border bg-card/50 shrink-0">
          <div className="space-y-1.5 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-3 w-3" />
              <span className="font-medium">快捷键</span>
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              <span className="truncate"><kbd className="px-1 rounded bg-secondary text-[9px]">Ctrl+X</kbd> 删除节点/连接</span>
              <span className="truncate"><kbd className="px-1 rounded bg-secondary text-[9px]">Ctrl+Z</kbd> 撤销</span>
              <span className="truncate"><kbd className="px-1 rounded bg-secondary text-[9px]">Ctrl+R</kbd> 重做</span>
              <span className="truncate"><kbd className="px-1 rounded bg-secondary text-[9px]">Ctrl+S</kbd> 导出</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
