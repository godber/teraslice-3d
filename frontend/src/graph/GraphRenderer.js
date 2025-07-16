import ForceGraph3D from '3d-force-graph';
import { getNodeColor, getLinkColor } from './GraphColors.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import * as THREE from 'three';

export class GraphRenderer {
  constructor(element) {
    this.element = element;
    this.graph = null;
    this.outlinePass = null;
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

    // Setup outline pass after graph initialization
    setTimeout(() => this.setupOutlinePass(), 100);
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

  /**
   * Update the graph data with new data.
   * This method checks if the new data is different from the current data
   * before updating to avoid unnecessary re-renders.
   * @param {Object} newData - The new graph data to update.
   */
  updateData(newData) {
    // Only update if the data has actually changed
    const currentData = this.graph.graphData();
    if (this.hasDataChanged(currentData, newData)) {
      this.graph.graphData(newData);
      console.log('Graph data updated');
    }
  }

  /**
   * Check if the graph data has changed by comparing current and new data.
   * @param {*} currentData - The current graph data.
   * @param {*} newData - The new graph data to compare against.
   * @returns {boolean} - True if the data has changed, false otherwise.
   */
  hasDataChanged(currentData, newData) {
    // Simple comparison of data structure
    if (!currentData || !newData) return true;

    // Compare node and link counts
    if (currentData.nodes?.length !== newData.nodes?.length) return true;
    if (currentData.links?.length !== newData.links?.length) return true;

    // Compare node IDs
    const currentNodeIds = new Set(currentData.nodes?.map(n => n.id) || []);
    const newNodeIds = new Set(newData.nodes?.map(n => n.id) || []);
    if (currentNodeIds.size !== newNodeIds.size) return true;
    for (let id of newNodeIds) {
      if (!currentNodeIds.has(id)) return true;
    }

    // Compare link properties
    const currentLinks = currentData.links || [];
    const newLinks = newData.links || [];
    for (let i = 0; i < newLinks.length; i++) {
      const currentLink = currentLinks[i];
      const newLink = newLinks[i];
      if (!currentLink ||
          currentLink.source !== newLink.source ||
          currentLink.target !== newLink.target ||
          currentLink.status !== newLink.status ||
          currentLink.workers !== newLink.workers) {
        return true;
      }
    }

    return false;
  }

  /**
   * Setup the outline pass for the graph.
   * This method initializes the OutlinePass and adds it to the existing
   * post-processing composer of the 3D Force Graph.
   * It also handles resizing the outline pass when the window is resized.
   */
  setupOutlinePass() {
    try {
      const renderer = this.graph.renderer();
      const scene = this.graph.scene();
      const camera = this.graph.camera();

      if (!renderer || !scene || !camera) {
        console.warn('Graph not fully initialized, retrying outline setup...');
        setTimeout(() => this.setupOutlinePass(), 500);
        return;
      }

      // Get the existing composer from 3D Force Graph
      const composer = this.graph.postProcessingComposer();

      if (!composer) {
        console.error('No postProcessingComposer found from 3D Force Graph');
        return;
      }

      // Get renderer size
      const size = new THREE.Vector2();
      renderer.getSize(size);

      // Create outline pass
      this.outlinePass = new OutlinePass(size, scene, camera);

      // Configure outline appearance
      this.outlinePass.edgeStrength = 3.0;
      this.outlinePass.edgeGlow = 0.7;
      this.outlinePass.edgeThickness = 2.0;
      this.outlinePass.visibleEdgeColor = new THREE.Color(0x00ffff); // Cyan
      this.outlinePass.hiddenEdgeColor = new THREE.Color(0x00ffff);
      this.outlinePass.enabled = true;
      this.outlinePass.renderToScreen = false;

      // Add outline pass to existing composer
      composer.addPass(this.outlinePass);

      // Handle window resize
      const handleResize = () => {
        const newSize = new THREE.Vector2();
        renderer.getSize(newSize);
        this.outlinePass.setSize(newSize.x, newSize.y);
      };
      window.addEventListener('resize', handleResize);

      console.log('OutlinePass setup complete');
    } catch (error) {
      console.error('Failed to setup OutlinePass:', error);
    }
  }

  highlightObjects(objects) {
    if (!this.outlinePass) {
      console.warn('OutlinePass not initialized');
      return;
    }

    this.outlinePass.selectedObjects = objects || [];
  }

  clearHighlights() {
    this.highlightObjects([]);
  }

  getOutlinePass() {
    return this.outlinePass;
  }

  updateOutlineSettings(settings) {
    if (!this.outlinePass) return;

    if (settings.edgeStrength !== undefined) {
      this.outlinePass.edgeStrength = settings.edgeStrength;
    }
    if (settings.edgeGlow !== undefined) {
      this.outlinePass.edgeGlow = settings.edgeGlow;
    }
    if (settings.edgeThickness !== undefined) {
      this.outlinePass.edgeThickness = settings.edgeThickness;
    }
    if (settings.visibleEdgeColor !== undefined) {
      this.outlinePass.visibleEdgeColor.setHex(settings.visibleEdgeColor);
      this.outlinePass.hiddenEdgeColor.setHex(settings.visibleEdgeColor);
    }
  }
}
