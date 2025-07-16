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