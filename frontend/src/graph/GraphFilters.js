export class GraphFilters {
  constructor() {
    this.originalData = null;
    this.graph = null;
    this.filterState = { 
      nodeSearchTerm: '',
      linkSearchTerm: ''
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

  filterGraphData(nodeSearchTerm = '', linkSearchTerm = '') {
    if (!this.originalData || !this.graph) return;
    
    this.filterState.nodeSearchTerm = nodeSearchTerm;
    this.filterState.linkSearchTerm = linkSearchTerm;
    
    if (!nodeSearchTerm && !linkSearchTerm) {
      this.graph.graphData(this.originalData);
      return;
    }

    // Filter nodes if node search term is provided
    let filteredNodes = this.originalData.nodes;
    if (nodeSearchTerm) {
      filteredNodes = this.originalData.nodes.filter(node =>
        node.id.toLowerCase().includes(nodeSearchTerm.toLowerCase())
      );
    }

    // Filter links based on link search term and remaining nodes
    let filteredLinks = this.originalData.links;
    
    // First filter by link search term if provided
    if (linkSearchTerm) {
      filteredLinks = this.originalData.links.filter(link =>
        link.name.toLowerCase().includes(linkSearchTerm.toLowerCase())
      );
    }

    // Then ensure we only keep links between remaining nodes
    const nodeIds = new Set(filteredNodes.map(n => n.id));
    filteredLinks = filteredLinks.filter(link => {
      // Handle both string IDs and object references
      const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
      const targetId = typeof link.target === 'object' ? link.target.id : link.target;
      return nodeIds.has(sourceId) && nodeIds.has(targetId);
    });

    // If we're filtering by links, we also need to include nodes that are connected by the filtered links
    if (linkSearchTerm && !nodeSearchTerm) {
      const linkedNodeIds = new Set();
      filteredLinks.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        linkedNodeIds.add(sourceId);
        linkedNodeIds.add(targetId);
      });
      filteredNodes = this.originalData.nodes.filter(node => linkedNodeIds.has(node.id));
    }

    this.graph.graphData({ nodes: filteredNodes, links: filteredLinks });
  }

  clearFilters() {
    this.filterState.nodeSearchTerm = '';
    this.filterState.linkSearchTerm = '';
    this.filterGraphData('', '');
  }
}