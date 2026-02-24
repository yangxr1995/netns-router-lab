import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Undo2,
  Redo2,
  Grid3X3,
  GitBranch,
  CheckCircle2,
  AlertCircle,
  Save
} from 'lucide-react';

interface TopBarProps {
  canUndo: boolean;
  canRedo: boolean;
  gridAlign: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onToggleGrid: () => void;
  onAutoLayout: () => void;
  onValidate: () => void;
  validationStatus: 'valid' | 'invalid' | 'none';
  validationMessage: string;
}

export default function TopBar({
  canUndo,
  canRedo,
  gridAlign,
  onUndo,
  onRedo,
  onToggleGrid,
  onAutoLayout,
  onValidate,
  validationStatus,
  validationMessage
}: TopBarProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-12 px-4 flex items-center justify-between border-b border-border bg-card">
        {/* Left: Title */}
        <div className="flex items-center gap-4">
          <h1 className="font-semibold text-sm">RLab 网络拓扑编辑器</h1>
          
          <Separator orientation="vertical" className="h-5" />
          
          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  <Undo2 className={`h-4 w-4 ${canUndo ? '' : 'opacity-50'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>撤销 (Ctrl+Z)</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onRedo}
                  disabled={!canRedo}
                >
                  <Redo2 className={`h-4 w-4 ${canRedo ? '' : 'opacity-50'}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>重做 (Ctrl+Y)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-4">
          {/* Grid Align Toggle */}
          <div className="flex items-center gap-2">
            <Switch
              id="grid-align"
              checked={gridAlign}
              onCheckedChange={onToggleGrid}
            />
            <Label htmlFor="grid-align" className="text-xs cursor-pointer flex items-center gap-1">
              <Grid3X3 className="h-3 w-3" />
              网格对齐
            </Label>
          </div>

          <Separator orientation="vertical" className="h-5" />

          {/* Auto Layout */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={onAutoLayout}
              >
                <GitBranch className="h-3 w-3 mr-1" />
                自动布局
              </Button>
            </TooltipTrigger>
            <TooltipContent>自动排列节点位置</TooltipContent>
          </Tooltip>

          {/* Validate */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={onValidate}
              >
                {validationStatus === 'valid' ? (
                  <CheckCircle2 className="h-3 w-3 mr-1 text-green-400" />
                ) : validationStatus === 'invalid' ? (
                  <AlertCircle className="h-3 w-3 mr-1 text-red-400" />
                ) : (
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                )}
                验证拓扑
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {validationMessage || '检查拓扑配置'}
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="h-5" />

          {/* Save hint */}
          <Badge variant="outline" className="text-[10px] font-normal">
            <Save className="h-3 w-3 mr-1" />
            Ctrl+S 导出
          </Badge>
        </div>
      </div>
    </TooltipProvider>
  );
}
