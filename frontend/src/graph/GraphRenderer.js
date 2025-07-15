import ForceGraph3D from '3d-force-graph';
import { getNodeColor, getLinkColor } from './GraphColors.js';

export class GraphRenderer {
  constructor(element) {
    this.element = element;
    this.graph = null;
    this.init();
  }

  init() {
    this.graph = new ForceGraph3D(this.element)
      .nodeColor(getNodeColor)
      .nodeLabel(node => `${node.id}`)
      .linkLabel(link => `${link.name} - ${link.workers} workers - ${link.status}`)
      .linkWidth(link => {
        // scaled = ((original - min) / (max - min)) * (newMax - newMin) + newMin
        const newSize = ((link.workers - 1) / (200 - 1)) * (20 - 1) + 1;
        return newSize;
      })
      .linkColor(getLinkColor)
      .onLinkClick(link => window.open(`${link.url}`, '_blank'));
  }

  getGraph() {
    return this.graph;
  }

  updateNodeColors() {
    this.graph.nodeColor(getNodeColor);
  }

  loadData(data) {
    this.graph.graphData(data);
  }
}