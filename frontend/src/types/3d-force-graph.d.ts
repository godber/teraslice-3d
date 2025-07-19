declare module '3d-force-graph' {
  import { Object3D, Camera, Scene, WebGLRenderer } from 'three';
  import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';

  export interface ForceGraphNode {
    id: string;
    x?: number;
    y?: number;
    z?: number;
    [key: string]: any;
  }

  export interface ForceGraphLink {
    source: string | ForceGraphNode;
    target: string | ForceGraphNode;
    name: string;
    workers: number;
    status: 'running' | 'starting' | 'stopped' | 'stopping' | 'failing';
    url: string;
    [key: string]: any;
  }

  export interface ForceGraphData {
    nodes: ForceGraphNode[];
    links: ForceGraphLink[];
  }

  export default class ForceGraph3D {
    constructor(element: HTMLElement);
    
    // Configuration methods
    nodeColor(accessor: string | ((node: ForceGraphNode) => string)): this;
    nodeLabel(accessor: string | ((node: ForceGraphNode) => string)): this;
    linkLabel(accessor: string | ((link: ForceGraphLink) => string)): this;
    linkWidth(accessor: string | ((link: ForceGraphLink) => number)): this;
    linkColor(accessor: string | ((link: ForceGraphLink) => string)): this;
    
    // Event handlers
    onLinkClick(callback: (link: ForceGraphLink) => void): this;
    
    // Data methods
    graphData(): ForceGraphData;
    graphData(data: ForceGraphData): this;
    
    // Scene access
    scene(): Scene;
    camera(): Camera;
    renderer(): WebGLRenderer;
    postProcessingComposer(): EffectComposer;
  }
}