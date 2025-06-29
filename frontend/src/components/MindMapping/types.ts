export interface MindMapNode {
  id: string;
  content: string;
  position: { x: number; y: number };
  color: string;
  size: 'small' | 'medium' | 'large';
  parentId?: string | null;
  children?: string[];
  metadata?: {
    created: Date;
    modified: Date;
    tags?: string[];
    notes?: string;
  };
}

export interface MindMapConnection {
  id: string;
  from: string;
  to: string;
  type: 'solid' | 'dashed' | 'dotted';
  color: string;
  thickness?: number;
  label?: string;
}

export interface MindMapState {
  nodes: MindMapNode[];
  connections: MindMapConnection[];
  selectedNode: MindMapNode | null;
  history: Array<{
    nodes: MindMapNode[];
    connections: MindMapConnection[];
  }>;
  historyIndex: number;
}

export interface MindMapTheme {
  name: 'dark' | 'light' | 'colorful';
  background: string;
  nodeBackground: string;
  nodeBorder: string;
  nodeText: string;
  connectionColor: string;
  selectedColor: string;
} 