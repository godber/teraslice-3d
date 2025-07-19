import { GraphData, FilterState } from '../types/graph.js';
import { GraphRenderer } from './GraphRenderer.js';
import * as THREE from 'three';

export class GraphFilters {
  private originalData: GraphData | null;
  private graph: any; // ForceGraph3D instance
  private graphRenderer: GraphRenderer | null;
  private filterState: FilterState;

  constructor() {
    this.originalData = null;
    this.graph = null;
    this.graphRenderer = null;
    this.filterState = {
      searchTerm: '',
      filterMode: 'Highlight'
    };
  }

  public setOriginalData(data: GraphData): void {
    this.originalData = data;
  }

  public setGraph(graph: any): void {
    this.graph = graph;
  }

  public setGraphRenderer(graphRenderer: GraphRenderer): void {
    this.graphRenderer = graphRenderer;
  }

  public setFilterMode(mode: 'Remove' | 'Highlight'): void {
    this.filterState.filterMode = mode;
    // Clear any existing highlights when switching modes
    if (this.graphRenderer) {
      this.graphRenderer.clearHighlights();
    }
  }

  public getFilterState(): FilterState {
    return this.filterState;
  }

  public filterGraphData(searchTerm: string = ''): void {
    if (!this.originalData || !this.graph) return;

    this.filterState.searchTerm = searchTerm;

    if (!searchTerm) {
      // Clear all filters
      this.graph.graphData(this.originalData);
      if (this.graphRenderer) {
        this.graphRenderer.clearHighlights();
      }
      return;
    }

    if (this.filterState.filterMode === 'Remove') {
      this.applyRemoveMode(searchTerm);
    } else if (this.filterState.filterMode === 'Highlight') {
      this.applyHighlightMode(searchTerm);
    }
  }

  private applyRemoveMode(searchTerm: string): void {
    const searchLower = searchTerm.toLowerCase();

    // Find nodes that match the search term
    const matchingNodes = this.originalData!.nodes.filter(node =>
      node.id.toLowerCase().includes(searchLower)
    );

    // Find links that match the search term
    const matchingLinks = this.originalData!.links.filter(link =>
      link.name.toLowerCase().includes(searchLower)
    );

    // Collect all nodes that should be included (matching nodes + nodes connected by matching links)
    const nodeIds = new Set(matchingNodes.map(n => n.id));

    // Add nodes connected by matching links
    matchingLinks.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      nodeIds.add(sourceId);
      nodeIds.add(targetId);
    });

    // Get all nodes to display
    const filteredNodes = this.originalData!.nodes.filter(node => nodeIds.has(node.id));

    // Get all links between the filtered nodes
    const filteredLinks = this.originalData!.links.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    this.graph.graphData({ nodes: filteredNodes, links: filteredLinks });

    // Clear any highlights in remove mode
    if (this.graphRenderer) {
      this.graphRenderer.clearHighlights();
    }
  }

  private applyHighlightMode(searchTerm: string): void {
    // Keep all original data visible
    this.graph.graphData(this.originalData!);

    if (!this.graphRenderer) {
      console.warn('GraphRenderer not available for highlight mode');
      return;
    }

    const searchLower = searchTerm.toLowerCase();

    // Find nodes that match the search term
    const matchingNodes = this.originalData!.nodes.filter(node =>
      node.id.toLowerCase().includes(searchLower)
    );

    // Find links that match the search term
    const matchingLinks = this.originalData!.links.filter(link =>
      link.name.toLowerCase().includes(searchLower)
    );

    // Collect all nodes that should be highlighted (matching nodes + nodes connected by matching links)
    const nodeIds = new Set(matchingNodes.map(n => n.id));

    // Add nodes connected by matching links
    matchingLinks.forEach(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      nodeIds.add(sourceId);
      nodeIds.add(targetId);
    });

    // Find the actual 3D objects in the scene to highlight
    const objectsToHighlight: THREE.Object3D[] = [];
    const scene = this.graph.scene();

    // Collect matching link IDs for highlighting
    const linkIds = new Set(matchingLinks.map(l => l.id || `${l.source}-${l.target}`));

    scene.traverse((child: any) => {
      if (child.isMesh) {
        // Highlight matching nodes
        if (child.__graphObjType === 'node' && child.__data && nodeIds.has(child.__data.id)) {
          objectsToHighlight.push(child);
        }
        // Highlight matching links
        else if (child.__graphObjType === 'link' && child.__data) {
          const linkData = child.__data;
          const linkId = linkData.id || `${linkData.source.id || linkData.source}-${linkData.target.id || linkData.target}`;

          // Check if this link should be highlighted (either directly matching or connecting highlighted nodes)
          if (linkIds.has(linkId) ||
              (linkData.source && linkData.target &&
               nodeIds.has(linkData.source.id || linkData.source) &&
               nodeIds.has(linkData.target.id || linkData.target))) {
            objectsToHighlight.push(child);
          }
        }
      }
    });

    console.log(`Highlighting ${objectsToHighlight.length} objects (nodes and links)`);
    this.graphRenderer.highlightObjects(objectsToHighlight);
  }

  public clearFilters(): void {
    this.filterState.searchTerm = '';
    this.filterGraphData('');
  }
}
