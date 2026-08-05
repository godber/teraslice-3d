import { GraphData, GraphNode, GraphLink, FilterState } from '../types/graph.js';
import type { GraphView } from './GraphView.js';
import { endpointId } from './graphUtils.js';

type FilterChangeCallback = () => void;

interface FilterResult {
  /** IDs of every node included by the filter. */
  nodeIds: Set<string>;
  /** Nodes included by the filter. */
  nodes: GraphNode[];
  /** Links (jobs) included by the filter. */
  links: GraphLink[];
}

export class GraphFilters {
  private originalData: GraphData | null;
  private view: GraphView | null;
  private filterState: FilterState;
  private changeCallbacks: FilterChangeCallback[];

  constructor() {
    this.originalData = null;
    this.view = null;
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

  /**
   * Attach the view this filter drives. GraphFilters decides *what* is
   * visible or interesting; the view decides how to render it.
   */
  public setView(view: GraphView): void {
    this.view = view;
  }

  public setFilterMode(mode: 'Remove' | 'Highlight'): void {
    this.filterState.filterMode = mode;
    // Clear any existing highlights when switching modes
    this.view?.clearHighlights();
  }

  public getFilterState(): FilterState {
    return this.filterState;
  }

  public filterGraphData(searchTerm: string = ''): void {
    if (!this.originalData || !this.view) return;

    this.filterState.searchTerm = searchTerm;

    if (!searchTerm) {
      // Clear all filters and restore the full dataset. The view is
      // responsible for skipping the work if it is already showing it.
      this.view.setVisibleData(this.originalData);
      this.view.clearHighlights();
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

    this.view!.setVisibleData({ nodes, links });

    // Clear any highlights in remove mode
    this.view!.clearHighlights();
  }

  private applyHighlightMode(searchTerm: string): void {
    // Keep all original data visible and let the view highlight the subset.
    this.view!.setVisibleData(this.originalData!);
    this.view!.highlight(this.computeFilter(searchTerm).nodeIds);
  }

  public clearFilters(): void {
    this.filterState.searchTerm = '';
    this.filterGraphData('');
  }
}
