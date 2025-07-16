export class GraphFilters {
  constructor() {
    this.originalData = null;
    this.graph = null;
    this.filterState = { 
      searchTerm: ''
    };
  }

  setOriginalData(data) {
    this.originalData = data;
  }

  setGraph(graph) {
    this.graph = graph;
  }

  getFilterState() {
    return this.filterState;
  }

  filterGraphData(searchTerm = '') {
    if (!this.originalData || !this.graph) return;
    
    this.filterState.searchTerm = searchTerm;
    
    if (!searchTerm) {
      this.graph.graphData(this.originalData);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    
    // Find nodes that match the search term
    const matchingNodes = this.originalData.nodes.filter(node =>
      node.id.toLowerCase().includes(searchLower)
    );

    // Find links that match the search term
    const matchingLinks = this.originalData.links.filter(link =>
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
    const filteredNodes = this.originalData.nodes.filter(node => nodeIds.has(node.id));

    // Get all links between the filtered nodes
    const filteredLinks = this.originalData.links.filter(link => {
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    this.graph.graphData({ nodes: filteredNodes, links: filteredLinks });
  }

  clearFilters() {
    this.filterState.searchTerm = '';
    this.filterGraphData('');
  }
}