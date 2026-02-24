import { useState, useRef, useCallback, useEffect } from 'react';
import cytoscape from 'cytoscape';
import type { NodeType, NodeData, RLabConfig } from '@/types';
import { exampleConfigs } from '@/data/examples';
import { useHistory } from '@/hooks/useHistory';
import { toast } from 'sonner';

import TopBar from '@/components/TopBar';
import Toolbar from '@/components/Toolbar';
import NetworkGraph from '@/components/NetworkGraph';
import PropertiesPanel from '@/components/PropertiesPanel';
import StatusBar from '@/components/StatusBar';
import ImportDialog from '@/components/ImportDialog';
import ValidationDialog from '@/components/ValidationDialog';

import { 
  exportToJson, 
  importFromJson, 
  validateTopology,
  getNextAvailableNumber
} from '@/utils/graphUtils';

interface ValidationResult {
  type: 'error' | 'warning' | 'info';
  message: string;
}

function App() {
  const cyRef = useRef<cytoscape.Core | null>(null);
  
  // State
  const [selectedNode, setSelectedNode] = useState<cytoscape.NodeSingular | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<cytoscape.EdgeSingular | null>(null);
  const [gridAlign, setGridAlign] = useState(false);
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isValid, setIsValid] = useState(false);
  // Force re-render for undo/redo buttons
  const [, forceUpdate] = useState({});

  // History for undo/redo
  const { 
    pushState, 
    undo, 
    redo,
    canUndo,
    canRedo,
  } = useHistory({ maxSize: 50 });

  // Save current state to history (user action)
  const saveState = useCallback(() => {
    if (!cyRef.current) return;
    
    const nodes = cyRef.current.nodes().map(n => ({
      data: { ...n.data() },
      position: { ...n.position() }
    }));
    const edges = cyRef.current.edges().map(e => ({
      data: { ...e.data() }
    }));
    
    pushState({ nodes, edges });
    forceUpdate({}); // Update undo/redo button states
  }, [pushState]);

  // Update counts only (no history save)
  const updateCounts = useCallback(() => {
    if (!cyRef.current) return;
    setNodeCount(cyRef.current.nodes().length);
    setEdgeCount(cyRef.current.edges().length);
    setZoomLevel(cyRef.current.zoom());
  }, []);

  // Add node - directly implemented here
  const handleAddNode = useCallback((type: NodeType) => {
    if (!cyRef.current) return;
    
    const cy = cyRef.current;
    
    // Check if internet node already exists
    if (type === 'internet') {
      const existingInternet = cy.nodes().filter(n => n.data('type') === 'internet');
      if (existingInternet.length > 0) {
        toast.info('Internet 节点已存在');
        existingInternet[0].select();
        return;
      }
    }
    
    const count = getNextAvailableNumber(cy, type);
    const id = `${type}_${Date.now()}_${count}`;
    
    let name: string;
    if (type === 'internet') {
      name = 'internet';
    } else {
      name = `${type}${count}`;
    }

    const nodeData: NodeData = {
      id,
      type,
      label: name,
      name,
      br: type === 'router' || type === 'switch',
      vlan: false,
      vid: 0,
      lan: '',
      ifname: '',
      ifname_parent: '',
      forward: type !== 'pc',
      gw: false,
      disable: false,
      exec: []
    };

    cy.add({
      group: 'nodes',
      data: nodeData,
      position: { 
        x: 200 + Math.random() * 100, 
        y: 200 + Math.random() * 100 
      }
    });

    updateCounts();
    saveState();
    toast.success(`已添加 ${type} 节点`);
  }, [saveState, updateCounts]);

  // Update node property
  const handleNodeUpdate = useCallback((node: cytoscape.NodeSingular, key: string, value: any) => {
    node.data(key, value);
    updateCounts();
    saveState();
  }, [saveState, updateCounts]);

  // Delete node
  const handleNodeDelete = useCallback((node: cytoscape.NodeSingular) => {
    if (!cyRef.current) return;
    
    const nodeName = node.data('name');
    
    // Remove connected edges first
    node.connectedEdges().remove();
    
    // Remove node
    node.remove();
    setSelectedNode(null);
    
    updateCounts();
    saveState();
    toast.success(`已删除节点 "${nodeName}"`);
  }, [saveState, updateCounts]);

  // Delete edge
  const handleEdgeDelete = useCallback((edge: cytoscape.EdgeSingular) => {
    if (!cyRef.current) return;
    
    const sourceName = cyRef.current.getElementById(edge.data('source')).data('name');
    const targetName = cyRef.current.getElementById(edge.data('target')).data('name');
    
    edge.remove();
    setSelectedEdge(null);
    
    updateCounts();
    saveState();
    toast.success(`已删除连接: ${sourceName} → ${targetName}`);
  }, [saveState, updateCounts]);

  // Export JSON
  const handleExport = useCallback(() => {
    if (!cyRef.current) return;
    
    const json = exportToJson(cyRef.current);
    if (!json) {
      toast.error('导出失败: 没有找到有效的拓扑结构');
      return;
    }

    const dataStr = JSON.stringify(json, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rlab-config.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('配置文件已下载');
  }, []);

  // Import JSON
  const handleImport = useCallback((jsonText: string) => {
    if (!cyRef.current) return;
    
    try {
      const json = JSON.parse(jsonText) as RLabConfig;
      importFromJson(cyRef.current, json);
      updateCounts();
      saveState();
      toast.success('拓扑配置已加载');
    } catch (err) {
      toast.error('导入失败: ' + (err as Error).message);
    }
  }, [saveState, updateCounts]);

  // Clear all
  const handleClear = useCallback(() => {
    if (!cyRef.current) return;
    
    if (confirm('确定要清空所有节点和连接吗？')) {
      cyRef.current.elements().remove();
      setSelectedNode(null);
      setSelectedEdge(null);
      
      // Re-add internet node
      handleAddNode('internet');
      
      toast.success('画布已重置');
    }
  }, [handleAddNode]);

  // Load example
  const handleLoadExample = useCallback((index: number) => {
    if (!cyRef.current) return;
    
    const example = exampleConfigs[index];
    if (example) {
      importFromJson(cyRef.current, example.data);
      updateCounts();
      saveState();
      toast.success(`已加载示例: ${example.name}`);
    }
  }, [saveState, updateCounts]);

  // Undo
  const handleUndo = useCallback(() => {
    const state = undo();
    if (state && cyRef.current) {
      cyRef.current.elements().remove();
      cyRef.current.add(state.nodes);
      cyRef.current.add(state.edges);
      updateCounts();
      forceUpdate({});
      toast.info('已撤销');
    }
  }, [undo, updateCounts]);

  // Redo
  const handleRedo = useCallback(() => {
    const state = redo();
    if (state && cyRef.current) {
      cyRef.current.elements().remove();
      cyRef.current.add(state.nodes);
      cyRef.current.add(state.edges);
      updateCounts();
      forceUpdate({});
      toast.info('已重做');
    }
  }, [redo, updateCounts]);

  // Auto layout
  const handleAutoLayout = useCallback(() => {
    if (!cyRef.current) return;
    
    const layout = cyRef.current.layout({
      name: 'breadthfirst',
      directed: true,
      padding: 50,
      spacingFactor: 1.2,
      animate: true,
      animationDuration: 500
    });
    
    layout.run();
    updateCounts();
    saveState();
    toast.success('节点已自动排列');
  }, [saveState, updateCounts]);

  // Validate topology
  const handleValidate = useCallback(() => {
    if (!cyRef.current) return;
    
    const results = validateTopology(cyRef.current);
    setValidationResults(results);
    setIsValid(results.filter(r => r.type === 'error').length === 0);
    setValidationDialogOpen(true);
  }, []);

  // Setup cy event handlers
  useEffect(() => {
    if (!cyRef.current) return;
    
    const cy = cyRef.current;
    
    // Edge selection
    const handleEdgeSelect = (evt: cytoscape.EventObject) => {
      setSelectedEdge(evt.target as cytoscape.EdgeSingular);
    };
    
    const handleEdgeUnselect = () => {
      setSelectedEdge(null);
    };
    
    cy.on('select', 'edge', handleEdgeSelect);
    cy.on('unselect', 'edge', handleEdgeUnselect);
    
    return () => {
      cy.off('select', 'edge', handleEdgeSelect);
      cy.off('unselect', 'edge', handleEdgeUnselect);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z: Undo
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      
      // Ctrl+R: Redo
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        handleRedo();
      }
      
      // Ctrl+S: Export
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        handleExport();
      }
      
      // Ctrl+X: Delete selected node or edge
      if (e.ctrlKey && e.key === 'x') {
        e.preventDefault();
        if (selectedNode) {
          handleNodeDelete(selectedNode);
        } else if (selectedEdge) {
          handleEdgeDelete(selectedEdge);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleExport, handleNodeDelete, handleEdgeDelete, selectedNode, selectedEdge]);

  // Initial state save after mount
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (cyRef.current) {
        updateCounts();
        saveState();
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [saveState, updateCounts]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <TopBar
        canUndo={canUndo()}
        canRedo={canRedo()}
        gridAlign={gridAlign}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onToggleGrid={() => setGridAlign(!gridAlign)}
        onAutoLayout={handleAutoLayout}
        onValidate={handleValidate}
        validationStatus={isValid ? 'valid' : validationResults.length > 0 ? 'invalid' : 'none'}
        validationMessage={isValid ? '拓扑有效' : '拓扑有问题'}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-60 border-r border-border bg-card flex flex-col">
          <Toolbar
            onAddNode={handleAddNode}
            onExport={handleExport}
            onImport={() => setImportDialogOpen(true)}
            onClear={handleClear}
            onLoadExample={handleLoadExample}
            nodeCount={nodeCount}
            edgeCount={edgeCount}
          />
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <NetworkGraph
            onNodeSelect={setSelectedNode}
            cyRef={cyRef}
            gridAlign={gridAlign}
          />
        </div>

        {/* Right Properties Panel */}
        <div className="w-80 border-l border-border bg-card">
          <PropertiesPanel
            selectedNode={selectedNode}
            onNodeUpdate={handleNodeUpdate}
            onNodeDelete={handleNodeDelete}
          />
        </div>
      </div>

      {/* Status Bar */}
      <StatusBar
        nodeCount={nodeCount}
        edgeCount={edgeCount}
        selectedNode={selectedNode?.data('name') || null}
        selectedEdge={selectedEdge}
        zoomLevel={zoomLevel}
      />

      {/* Dialogs */}
      <ImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onImport={handleImport}
      />

      <ValidationDialog
        open={validationDialogOpen}
        onOpenChange={setValidationDialogOpen}
        results={validationResults}
        isValid={isValid}
      />
    </div>
  );
}

export default App;
