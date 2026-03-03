// Node types in the network topology
export type NodeType = 'router' | 'switch' | 'pc';


// Network node properties
export interface NodeProperties {
  name: string;
  br?: boolean;
  vlan?: boolean;
  vid?: number;
  lan?: string;
  ifname?: string;
  ifname_parent?: string;
  forward?: boolean;
  gw?: boolean;
  disable?: boolean;
  exec?: string[];
}

// Node data structure for Cytoscape
export interface NodeData extends NodeProperties {
  id: string;
  type: NodeType;
  label: string;
}

// Edge data structure
export interface EdgeData {
  id: string;
  source: string;
  target: string;
}

// RLab JSON node structure
export interface RLabNode {
  name: string;
  type?: string;  // 节点类型：router, switch
  br?: boolean;
  vlan?: boolean;
  vid?: number;
  lan?: string;
  ifname?: string;
  ifname_parent?: string;
  forward?: boolean;
  gw?: boolean;
  disable?: boolean;
  exec?: string[];
  nodes?: RLabNode[];
}

// RLab JSON root structure
export interface RLabConfig {
  nodes: RLabNode[];
}

// History state for undo/redo
export interface HistoryState {
  nodes: cytoscape.NodeDefinition[];
  edges: cytoscape.EdgeDefinition[];
}

// Example configuration
export interface ExampleConfig {
  name: string;
  description: string;
  data: RLabConfig;
}
