export interface GraphNode {
  id: string;
  x?: number;
  y?: number;
  z?: number;
}

export interface GraphLink {
  id?: string;
  source: string | GraphNode;
  target: string | GraphNode;
  name: string;
  workers: number;
  status: 'running' | 'starting' | 'stopped' | 'stopping' | 'failing';
  url: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface AutoRefreshOptions {
  interval?: number;
  enabled?: boolean;
}

export interface AutoRefreshStatus {
  enabled: boolean;
  interval: number;
  connectionStatus: 'unknown' | 'connected' | 'error';
  lastUpdateTime: Date | null;
  isRunning: boolean;
}

export interface FilterState {
  searchTerm: string;
  filterMode: 'Remove' | 'Highlight';
}

export interface OutlineSettings {
  edgeStrength?: number;
  edgeGlow?: number;
  edgeThickness?: number;
  visibleEdgeColor?: number;
}

export type StatusCallback = (status: string, lastUpdateTime: Date | null) => void;
export type RefreshCallback = (data: GraphData) => void;