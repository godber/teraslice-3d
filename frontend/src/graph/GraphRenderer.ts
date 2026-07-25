import ForceGraph3D from '3d-force-graph';
import { getNodeColor, getLinkColor, colors } from './GraphColors.js';
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js';
import * as THREE from 'three';
import { GraphData, OutlineSettings } from '../types/graph.js';
import { EdgePopover } from '../controls/EdgePopover.js';
import { NodePopover } from '../controls/NodePopover.js';

export class GraphRenderer {
  private element: HTMLElement;
  private graph: any; // ForceGraph3D instance
  private outlinePass: OutlinePass | null;
  private edgePopover: EdgePopover;
  private nodePopover: NodePopover;
  private showParticles: boolean = false;

  constructor(element: HTMLElement) {
    this.element = element;
    this.graph = null;
    this.outlinePass = null;
    this.edgePopover = new EdgePopover();
    this.nodePopover = new NodePopover();
    this.init();
    this.setupVisibilityListener();
  }

  private init(): void {
    this.graph = new ForceGraph3D(this.element)
      .nodeColor(getNodeColor)
      .nodeRelSize(6)
      .nodeOpacity(0.95)
      .linkWidth(link => {
        // scaled = ((original - min) / (max - min)) * (newMax - newMin) + newMin
        const newSize = ((link.workers - 1) / (200 - 1)) * (20 - 1) + 1;
        return newSize;
      })
      .linkColor(getLinkColor)
      .linkOpacity(0.75)
      .linkDirectionalParticles(0)
      .linkDirectionalParticleWidth(2.5)
      .linkDirectionalParticleSpeed(link => link.status === 'running' ? 0.005 : 0.002)
      .onLinkHover(link => {
        if (link) {
          this.edgePopover.show(link);
        } else {
          this.edgePopover.hide(250);
        }
      })
      .onLinkClick(link => {
        if (link) {
          this.edgePopover.show(link);
        }
      })
      .onNodeHover(node => {
        if (node) {
          const links = this.graph.graphData()?.links || [];
          this.nodePopover.show(node, links);
        } else {
          this.nodePopover.hide(250);
        }
      })
      .onNodeClick(node => {
        if (node) {
          const links = this.graph.graphData()?.links || [];
          this.nodePopover.show(node, links);
        }
      });

    // Setup outline pass after graph initialization
    setTimeout(() => {
      this.setupOutlinePass();
      this.updateBackgroundColor();
    }, 100);
  }

  private setupVisibilityListener(): void {
    document.addEventListener('visibilitychange', () => {
      if (!this.graph) return;

      if (document.hidden) {
        // Pause 3D animation loop when tab is hidden to save CPU/GPU resources
        this.graph.pauseAnimation();
      } else {
        // Resume 3D animation loop when returning to tab
        this.graph.resumeAnimation();
      }
    });
  }

  public reheat(): void {
    if (this.graph) {
      this.graph.d3ReheatSimulation();
    }
  }

  public getGraph(): any {
    return this.graph;
  }

  public updateNodeColors(): void {
    this.graph.nodeColor(getNodeColor);
  }

  public updateLinkColors(): void {
    this.graph.linkColor(getLinkColor);
  }

  public setDirectionalParticles(enabled: boolean): void {
    this.showParticles = enabled;
    if (this.graph) {
      this.graph.linkDirectionalParticles(enabled ? 2 : 0);
    }
  }

  public getDirectionalParticles(): boolean {
    return this.showParticles;
  }

  public updateBackgroundColor(): void {
    const renderer = this.graph.renderer();
    if (renderer) {
      renderer.setClearColor(colors.background);
    }
  }

  public loadData(data: GraphData): void {
    this.graph.graphData(data);
  }

  private copyLinkProperties(existingLink: any, newLink: any): void {
    // Preserve existingLink.source and existingLink.target (which 3d-force-graph resolved to Node objects)
    const savedSource = existingLink.source;
    const savedTarget = existingLink.target;
    Object.assign(existingLink, newLink);
    existingLink.source = savedSource;
    existingLink.target = savedTarget;
  }

  /**
   * Reconcile new graph data against existing graph data to preserve 3D positions
   * (x, y, z, vx, vy, vz) and object references. This prevents the graph from collapsing
   * or resetting node positions on auto-refresh updates.
   */
  public reconcileGraphData(currentData: GraphData | null, newData: GraphData): GraphData {
    if (!currentData || !currentData.nodes || currentData.nodes.length === 0) {
      return newData;
    }

    const existingNodeMap = new Map<string, any>();
    currentData.nodes.forEach((node: any) => {
      if (node && node.id !== undefined) {
        existingNodeMap.set(String(node.id), node);
      }
    });

    const reconciledNodes = newData.nodes.map((newNode: any) => {
      const existingNode = existingNodeMap.get(String(newNode.id));
      if (existingNode) {
        Object.assign(existingNode, newNode);
        return existingNode;
      }
      return newNode;
    });

    const existingLinkMap = new Map<string, any>();
    currentData.links.forEach((link: any) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source;
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target;
      const key = `${srcId}_${tgtId}_${link.job_id || ''}`;
      existingLinkMap.set(key, link);
    });

    const reconciledLinks = newData.links.map((newLink: any) => {
      const srcId = typeof newLink.source === 'object' ? newLink.source.id : newLink.source;
      const tgtId = typeof newLink.target === 'object' ? newLink.target.id : newLink.target;
      const key = `${srcId}_${tgtId}_${newLink.job_id || ''}`;
      const existingLink = existingLinkMap.get(key);

      if (existingLink) {
        this.copyLinkProperties(existingLink, newLink);
        return existingLink;
      }
      return newLink;
    });

    return {
      nodes: reconciledNodes,
      links: reconciledLinks
    };
  }

  private hasTopologyChanged(currentData: GraphData | null, newData: GraphData): boolean {
    if (!currentData || !newData) return true;
    if (!currentData.nodes || !currentData.links) return true;

    if (currentData.nodes.length !== newData.nodes.length) return true;
    if (currentData.links.length !== newData.links.length) return true;

    const currentNodeIds = new Set(currentData.nodes.map((n: any) => n.id));
    for (const n of newData.nodes) {
      if (!currentNodeIds.has(n.id)) return true;
    }

    const getLinkKey = (l: any) => {
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const tgt = typeof l.target === 'object' ? l.target.id : l.target;
      return `${src}_${tgt}_${l.job_id || ''}`;
    };

    const currentLinkKeys = new Set(currentData.links.map(getLinkKey));
    for (const l of newData.links) {
      if (!currentLinkKeys.has(getLinkKey(l))) return true;
    }

    return false;
  }

  private updatePropertiesInPlace(currentData: GraphData, newData: GraphData): void {
    const nodeMap = new Map<string, any>();
    currentData.nodes.forEach((n: any) => nodeMap.set(String(n.id), n));
    newData.nodes.forEach((newNode: any) => {
      const existing = nodeMap.get(String(newNode.id));
      if (existing) {
        Object.assign(existing, newNode);
      }
    });

    const getLinkKey = (l: any) => {
      const src = typeof l.source === 'object' ? l.source.id : l.source;
      const tgt = typeof l.target === 'object' ? l.target.id : l.target;
      return `${src}_${tgt}_${l.job_id || ''}`;
    };

    const linkMap = new Map<string, any>();
    currentData.links.forEach((l: any) => linkMap.set(getLinkKey(l), l));
    newData.links.forEach((newLink: any) => {
      const existing = linkMap.get(getLinkKey(newLink));
      if (existing) {
        this.copyLinkProperties(existing, newLink);
      }
    });
  }

  /**
   * Update the graph data with new data using position-preserving reconciliation.
   * Prevents graph expansion/creep by updating properties in-place when topology is unchanged.
   * @param {GraphData} newData - The new graph data to update.
   * @returns {GraphData} - The reconciled graph data.
   */
  public updateData(newData: GraphData): GraphData {
    const currentData = this.graph.graphData();
    if (!currentData || !currentData.nodes || currentData.nodes.length === 0) {
      this.graph.graphData(newData);
      return newData;
    }

    if (!this.hasDataChanged(currentData, newData)) {
      return currentData;
    }

    if (!this.hasTopologyChanged(currentData, newData)) {
      // Topology is identical (only properties like status/workers changed):
      // Update properties in-place without calling graphData() to prevent force expansion creep.
      this.updatePropertiesInPlace(currentData, newData);
      this.graph.refresh();
      console.log('Graph data properties updated in-place (no layout shift)');
      return currentData;
    } else {
      // Topology changed (added/removed nodes or links): Reconcile and update graphData
      const reconciled = this.reconcileGraphData(currentData, newData);
      // Reset velocity on existing nodes so leftover momentum doesn't cause drift
      reconciled.nodes.forEach((n: any) => {
        n.vx = 0;
        n.vy = 0;
        n.vz = 0;
      });
      this.graph.graphData(reconciled);
      console.log('Graph topology updated with position reconciliation');
      return reconciled;
    }
  }

  /**
   * Check if the graph data has changed by comparing current and new data.
   * @param {*} currentData - The current graph data.
   * @param {*} newData - The new graph data to compare against.
   * @returns {boolean} - True if the data has changed, false otherwise.
   */
  private hasDataChanged(currentData: GraphData | null, newData: GraphData): boolean {
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
  private setupOutlinePass(): void {
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
        this.outlinePass!.setSize(newSize.x, newSize.y);
      };
      window.addEventListener('resize', handleResize);

      console.log('OutlinePass setup complete');
    } catch (error) {
      console.error('Failed to setup OutlinePass:', error);
    }
  }

  public highlightObjects(objects: THREE.Object3D[]): void {
    if (!this.outlinePass) {
      console.warn('OutlinePass not initialized');
      return;
    }

    this.outlinePass.selectedObjects = objects || [];
  }

  public clearHighlights(): void {
    this.highlightObjects([]);
  }

  public getOutlinePass(): OutlinePass | null {
    return this.outlinePass;
  }

  public updateOutlineSettings(settings: OutlineSettings): void {
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
