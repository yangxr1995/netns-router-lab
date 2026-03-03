import type cytoscape from 'cytoscape';
import type { RLabConfig, RLabNode, NodeType, NodeData } from '@/types';

interface ValidationResult {
  type: 'error' | 'warning' | 'info';
  message: string;
}

/**
 * Determine node type from RLab node data
 * Fixed: Properly handle router vs switch detection
 */
export function determineNodeType(nodeData: RLabNode): NodeType {
  // First check for explicit type field
  if (nodeData.type === 'switch') {
    return 'switch';
  }
  

  
  // Router: has br=true AND (has VLAN OR has child nodes)
  // Switch: has br=true AND no VLAN AND no child nodes (pure bridge)
  if (nodeData.br) {
    if (nodeData.vlan || (nodeData.nodes && nodeData.nodes.length > 0)) {
      return 'router';
    }
    // Pure bridge without VLAN and without children = switch
    return 'switch';
  }
  
  return 'pc';
}

/**
 * Build RLab JSON tree from graph
 */
export function buildTreeJson(
  _cy: cytoscape.Core,
  nodes: cytoscape.NodeDefinition[],
  edges: cytoscape.EdgeDefinition[],
  rootId: string
): RLabNode | null {
  const root = nodes.find(n => n.data.id === rootId);
  if (!root) return null;

  const data = root.data as NodeData;
  const result: RLabNode = { name: data.name };

  // Add type for switch nodes
  if (data.type === 'switch') {
    result.type = 'switch';
  }

  // Add properties if they differ from defaults

  // Add properties if they differ from defaults
  if (data.br) result.br = true;
  if (data.vlan) result.vlan = true;
  if (data.vid && data.vid > 0) result.vid = data.vid;
  if (data.lan) result.lan = data.lan;
  if (data.ifname) result.ifname = data.ifname;
  if (data.ifname_parent) result.ifname_parent = data.ifname_parent;
  if (data.forward === false) result.forward = false;
  if (data.gw) result.gw = true;
  if (data.disable) result.disable = true;
  
  // Fixed: Include exec commands
  if (data.exec && data.exec.length > 0) {
    result.exec = data.exec.filter(cmd => cmd.trim() !== '');
  }

  // Find children
  const children = edges
    .filter(e => e.data.source === rootId)
    .map(e => buildTreeJson(_cy, nodes, edges, e.data.target))
    .filter((n): n is RLabNode => n !== null);

  if (children.length > 0) {
    result.nodes = children;
  }

  return result;
}

/**
 * Export graph to RLab JSON format
 */
export function exportToJson(cy: cytoscape.Core): RLabConfig | null {
  const nodes = cy.nodes().map(n => ({ data: n.data() }));
  const edges = cy.edges().map(e => ({ data: e.data() }));

  // Find root nodes (nodes with no incoming edges)
  const roots = nodes.filter(n => {
    return !edges.some(e => e.data.target === n.data.id);
  });

  if (roots.length === 0) {
    return null;
  }

  const topology: RLabConfig = {
    nodes: roots
      .map(r => buildTreeJson(cy, nodes, edges, r.data.id))
      .filter((n): n is RLabNode => n !== null)
  };

  return topology;
}

/**
 * Import RLab JSON to graph
 */
export function importFromJson(cy: cytoscape.Core, json: RLabConfig): void {
  if (!json.nodes || json.nodes.length === 0) {
    throw new Error('无效的 rlab JSON 文件: 缺少 nodes');
  }

  cy.elements().remove();
  let nodeCounter = 0;

  function addTreeNode(
    nodeData: RLabNode,
    parentId: string | null,
    level: number,
    index: number,
    siblingCount: number
  ): string {
    const id = `${nodeData.name}_${Date.now()}_${++nodeCounter}`;
    const type = determineNodeType(nodeData);

    // Calculate position
    const baseX = 300 + level * 250;
    const baseY = 300 + (index - (siblingCount - 1) / 2) * 120;

    const nodeDef: cytoscape.NodeDefinition = {
      group: 'nodes',
      data: {
        id,
        type,
        label: nodeData.name,
        name: nodeData.name,
        br: nodeData.br || false,
        vlan: nodeData.vlan || false,
        vid: nodeData.vid || 0,
        lan: nodeData.lan || '',
        ifname: nodeData.ifname || '',
        ifname_parent: nodeData.ifname_parent || '',
        forward: nodeData.forward !== false,
        gw: nodeData.gw || false,
        disable: nodeData.disable || false,
        // Fixed: Include exec commands
        exec: nodeData.exec || []
      },
      position: { x: baseX, y: baseY }
    };

    cy.add(nodeDef);

    if (parentId) {
      cy.add({
        group: 'edges',
        data: { source: parentId, target: id }
      });
    }

    // Recursively add children
    if (nodeData.nodes && nodeData.nodes.length > 0) {
      nodeData.nodes.forEach((child, idx) => {
        addTreeNode(child, id, level + 1, idx, nodeData.nodes!.length);
      });
    }

    return id;
  }

  // Add all root nodes
  json.nodes.forEach((root, idx) => {
    addTreeNode(root, null, 0, idx, json.nodes.length);
  });

  // Fit view
  cy.fit(cy.elements(), 50);
}

/**
 * Validate topology and return issues
 */
export function validateTopology(cy: cytoscape.Core): ValidationResult[] {
  const results: ValidationResult[] = [];
  const nodes = cy.nodes();
  const edges = cy.edges();



  // Check for orphaned nodes
  // Check for orphaned nodes
  const orphanedNodes = nodes.filter(n => {
    const hasIncoming = edges.some(e => e.data('target') === n.id());
    const hasOutgoing = edges.some(e => e.data('source') === n.id());
    return !hasIncoming && !hasOutgoing;
  });
  
  if (orphanedNodes.length > 0) {
    results.push({
      type: 'warning',
      message: `有 ${orphanedNodes.length} 个孤立节点未连接到网络`
    });
  }

  // Check for circular references
  function hasCycle(nodeId: string, parentIds: Set<string>): boolean {
    if (parentIds.has(nodeId)) {
      return true;
    }
    
    const newParents = new Set(parentIds);
    newParents.add(nodeId);
    
    const children = edges
      .filter(e => e.data('source') === nodeId)
      .map(e => e.data('target'));
    
    for (const childId of children) {
      if (hasCycle(childId, newParents)) {
        return true;
      }
    }
    
    return false;
  }
  
  nodes.forEach(n => {
    if (hasCycle(n.id(), new Set())) {
      results.push({
        type: 'error',
        message: `检测到循环引用，节点 "${n.data('name')}" 存在循环连接`
      });
    }
  });

  // Check VLAN configuration
  nodes.filter(n => n.data('vlan')).forEach(n => {
    const children = edges.filter(e => e.data('source') === n.id());
    const childrenWithVid = children.filter(e => {
      const child = cy.getElementById(e.data('target'));
      return child.data('vid') && child.data('vid') > 0;
    });
    
    if (children.length > 0 && childrenWithVid.length === 0) {
      results.push({
        type: 'warning',
        message: `节点 "${n.data('name')}" 启用了 VLAN 但没有子节点配置 VID`
      });
    }
  });

  // Check for duplicate names
  const nameCount = new Map<string, number>();
  nodes.forEach(n => {
    const name = n.data('name');
    nameCount.set(name, (nameCount.get(name) || 0) + 1);
  });
  
  nameCount.forEach((count, name) => {
    if (count > 1) {
      results.push({
        type: 'info',
        message: `节点名称 "${name}" 被使用了 ${count} 次`
      });
    }
  });

  // Check for self-loops
  edges.filter(e => e.data('source') === e.data('target')).forEach(() => {
    results.push({
      type: 'error',
      message: `检测到自连接: 节点不能连接到自己`
    });
  });

  // Success message if no issues
  if (results.length === 0) {
    results.push({
      type: 'info',
      message: '拓扑配置完整，没有发现任何问题'
    });
  }

  return results;
}

/**
 * Get next available number for node naming
 */
export function getNextAvailableNumber(
  cy: cytoscape.Core,
  type: NodeType
): number {
  const nodes = cy.nodes().filter(n => n.data('type') === type);
  const usedNumbers = nodes
    .map(n => {
      const name = n.data('name') || '';

      const match = name.match(/\d+$/);
      return match ? parseInt(match[0]) : 0;
    })
    .sort((a, b) => a - b);

  let nextNum = 1;
  for (const num of usedNumbers) {
    if (num === nextNum) {
      nextNum++;
    } else if (num > nextNum) {
      break;
    }
  }
  return nextNum;
}
