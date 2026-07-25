import { GraphData, GraphNode, GraphLink, FilterState } from '../types/graph.js';
import { GraphRenderer } from './GraphRenderer.js';
import * as THREE from 'three';

type FilterChangeCallback = () => void;

interface FilterResult {
  /** IDs of every node included by the filter. */
  nodeIds: Set<string>;
  /** Nodes included by the filter. */
  nodes: GraphNode[];
  /** Links (jobs) included by the filter. */
  links: GraphLink[];
}

function endpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === 'object' ? endpoint.id : endpoint;
}

export class GraphFilters {
  private originalData: GraphData | null;
  private graph: any; // ForceGraph3D instance
  private graphRenderer: GraphRenderer | null;
  private filterState: FilterState;
  private changeCallbacks: FilterChangeCallback[];

  constructor() {
    this.originalData = null;
    this.graph = null;
    this.graphRenderer = null;
    this.filterState = {
      searchTerm: '',
      filterMode: 'Highlight'
    };
    this.changeCallbacks = [];
  }

  public setOriginalData(data: GraphData): void {
    this.originalData = data;
  }

  /**
   * Register a callback invoked whenever the filter result changes
   * (search term, mode change, refreshed data). Used to keep secondary
   * representations (e.g. the jobs table) in sync.
   */
  public onFilterChange(callback: FilterChangeCallback): void {
    this.changeCallbacks.push(callback);
  }

  private notifyFilterChange(): void {
    this.changeCallbacks.forEach(cb => cb());
  }

  /**
   * Compute the set of nodes and links matched by a search term. This is the
   * single source of truth shared by Highlight mode, Remove mode, and the
   * jobs table, so all three always agree on what "matches".
   *
   * The match is intentionally broad. A node is included when its id contains
   * the search term. A link (job) is included when its name contains the term,
   * which also pulls in its source/target nodes. Finally, any link whose
   * endpoints are both already included is added too, so bridging links and
   * links discovered via a node-id match are part of the result.
   *
   * An empty term matches everything.
   */
  public computeFilter(searchTerm: string = this.filterState.searchTerm): FilterResult {
    if (!this.originalData) {
      return { nodeIds: new Set(), nodes: [], links: [] };
    }

    if (!searchTerm) {
      return {
        nodeIds: new Set(this.originalData.nodes.map(n => n.id)),
        nodes: this.originalData.nodes,
        links: this.originalData.links
      };
    }

    const searchLower = searchTerm.toLowerCase();

    // Nodes whose id matches the search term.
    const nodeIds = new Set(
      this.originalData.nodes
        .filter(node => node.id.toLowerCase().includes(searchLower))
        .map(node => node.id)
    );

    // Links whose name matches the search term, plus the nodes they connect.
    this.originalData.links.forEach(link => {
      if (link.name.toLowerCase().includes(searchLower)) {
        nodeIds.add(endpointId(link.source));
        nodeIds.add(endpointId(link.target));
      }
    });

    const nodes = this.originalData.nodes.filter(node => nodeIds.has(node.id));

    // Every link between two included nodes. This covers name matches (their
    // endpoints were added above) as well as bridging links between nodes that
    // were pulled in by other matches.
    const links = this.originalData.links.filter(link =>
      nodeIds.has(endpointId(link.source)) && nodeIds.has(endpointId(link.target))
    );

    return { nodeIds, nodes, links };
  }

  /**
   * Return the links (jobs) matched by the given search term. Backed by
   * computeFilter() so the jobs table matches the graph exactly.
   */
  public getFilteredLinks(searchTerm: string = this.filterState.searchTerm): GraphLink[] {
    return this.computeFilter(searchTerm).links;
  }

  /**
   * Return the nodes (connectors) matched by the given search term. Backed by
   * computeFilter() so the connectors table matches the graph exactly.
   */
  public getFilteredNodes(searchTerm: string = this.filterState.searchTerm): GraphNode[] {
    return this.computeFilter(searchTerm).nodes;
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
      this.notifyFilterChange();
      return;
    }

    if (this.filterState.filterMode === 'Remove') {
      this.applyRemoveMode(searchTerm);
    } else if (this.filterState.filterMode === 'Highlight') {
      this.applyHighlightMode(searchTerm);
    }

    this.notifyFilterChange();
  }

  private applyRemoveMode(searchTerm: string): void {
    const { nodes, links } = this.computeFilter(searchTerm);

    this.graph.graphData({ nodes, links });

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

    const { nodeIds } = this.computeFilter(searchTerm);

    // Find the actual 3D objects in the scene to highlight. A node is
    // highlighted when it is in the filter result; a link is highlighted when
    // both of its endpoints are, which mirrors computeFilter()'s link rule.
    const objectsToHighlight: THREE.Object3D[] = [];
    const scene = this.graph.scene();

    scene.traverse((child: any) => {
      if (child.isMesh) {
        if (child.__graphObjType === 'node' && child.__data && nodeIds.has(child.__data.id)) {
          objectsToHighlight.push(child);
        } else if (child.__graphObjType === 'link' && child.__data) {
          const linkData = child.__data;
          if (linkData.source && linkData.target &&
              nodeIds.has(endpointId(linkData.source)) &&
              nodeIds.has(endpointId(linkData.target))) {
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
