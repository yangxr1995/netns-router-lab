import { Separator } from '@/components/ui/separator';
import { 
  Circle, 
  Link2, 
  MousePointer2,
  Move,
  ZoomIn
} from 'lucide-react';

interface StatusBarProps {
  nodeCount: number;
  edgeCount: number;
  selectedNode: string | null;
  selectedEdge: cytoscape.EdgeSingular | null;
  zoomLevel: number;
}

export default function StatusBar({
  nodeCount,
  edgeCount,
  selectedNode,
  selectedEdge,
  zoomLevel
}: StatusBarProps) {
  // Get connection info if edge is selected
  let connectionInfo = null;
  if (selectedEdge) {
    const sourceId = selectedEdge.data('source');
    const targetId = selectedEdge.data('target');
    const cy = selectedEdge.cy();
    const sourceName = cy?.getElementById(sourceId).data('name') || '?';
    const targetName = cy?.getElementById(targetId).data('name') || '?';
    connectionInfo = `${sourceName} → ${targetName}`;
  }

  return (
    <div className="h-7 px-4 flex items-center justify-between border-t border-border bg-card text-[11px] text-muted-foreground">
      {/* Left: Stats */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Circle className="h-3 w-3" />
          <span>{nodeCount} 节点</span>
        </div>
        
        <Separator orientation="vertical" className="h-3" />
        
        <div className="flex items-center gap-1">
          <Link2 className="h-3 w-3" />
          <span>{edgeCount} 连接</span>
        </div>
        
        {selectedNode && (
          <>
            <Separator orientation="vertical" className="h-3" />
            <div className="flex items-center gap-1">
              <MousePointer2 className="h-3 w-3" />
              <span className="text-foreground">节点: {selectedNode}</span>
            </div>
          </>
        )}
        
        {connectionInfo && (
          <>
            <Separator orientation="vertical" className="h-3" />
            <div className="flex items-center gap-1">
              <Link2 className="h-3 w-3 text-amber-400" />
              <span className="text-foreground">连接: {connectionInfo}</span>
            </div>
          </>
        )}
      </div>

      {/* Right: Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Move className="h-3 w-3" />
          <span>拖拽移动</span>
        </div>
        
        <Separator orientation="vertical" className="h-3" />
        
        <div className="flex items-center gap-1">
          <ZoomIn className="h-3 w-3" />
          <span>{Math.round(zoomLevel * 100)}%</span>
        </div>
      </div>
    </div>
  );
}
