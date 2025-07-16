import { GUI } from 'lil-gui';
import { colors } from '../graph/GraphColors.js';

export class GuiControls {
  constructor(graphRenderer, graphFilters) {
    this.graphRenderer = graphRenderer;
    this.graphFilters = graphFilters;
    this.gui = null;
    this.init();
  }

  init() {
    this.gui = new GUI({title: "Teraslice 3D Graph Controls"});
    this.setupFilterControls();
    this.setupColorControls();
    this.setupHighlightControls();
  }

  setupColorControls() {
    const colorFolder = this.gui.addFolder('Node Colors');

    colorFolder.addColor(colors, 'kafkaIncoming')
      .name('Kafka Incoming')
      .onChange(() => this.graphRenderer.updateNodeColors());

    colorFolder.addColor(colors, 'kafkaOther')
      .name('Kafka Other')
      .onChange(() => this.graphRenderer.updateNodeColors());

    colorFolder.addColor(colors, 'elasticsearch')
      .name('Elasticsearch')
      .onChange(() => this.graphRenderer.updateNodeColors());

    colorFolder.close();
  }

  setupFilterControls() {
    const filterFolder = this.gui.addFolder('Filtering');
    const filterState = this.graphFilters.getFilterState();

    // Add filter mode selection
    const modeController = filterFolder.add(filterState, 'filterMode', ['Remove', 'Highlight'])
      .name('Filter Mode')
      .onChange(value => {
        this.graphFilters.setFilterMode(value);
        // Re-apply current filter with new mode
        this.graphFilters.filterGraphData(filterState.searchTerm);
      });

    const searchController = filterFolder.add(filterState, 'searchTerm')
      .name('Search')
      .onChange(value => {
        this.graphFilters.filterGraphData(value);
      });

    filterFolder.add({
      clear: () => {
        this.graphFilters.clearFilters();
        searchController.updateDisplay();
      }
    }, 'clear').name('Clear All Filters');

    filterFolder.open();
  }

  setupHighlightControls() {
    const highlightFolder = this.gui.addFolder('Highlight Settings');
    
    // Create settings object with current OutlinePass values
    const highlightSettings = {
      edgeStrength: 3.0,
      edgeGlow: 0.7,
      edgeThickness: 2.0,
      visibleEdgeColor: 0x00ffff // Cyan
    };

    highlightFolder.add(highlightSettings, 'edgeStrength', 0.0, 10.0, 0.1)
      .name('Edge Strength')
      .onChange(value => {
        this.graphRenderer.updateOutlineSettings({ edgeStrength: value });
      });

    highlightFolder.add(highlightSettings, 'edgeGlow', 0.0, 2.0, 0.1)
      .name('Edge Glow')
      .onChange(value => {
        this.graphRenderer.updateOutlineSettings({ edgeGlow: value });
      });

    highlightFolder.add(highlightSettings, 'edgeThickness', 0.0, 10.0, 0.1)
      .name('Edge Thickness')
      .onChange(value => {
        this.graphRenderer.updateOutlineSettings({ edgeThickness: value });
      });

    highlightFolder.addColor(highlightSettings, 'visibleEdgeColor')
      .name('Highlight Color')
      .onChange(value => {
        this.graphRenderer.updateOutlineSettings({ visibleEdgeColor: value });
      });

    // Add preset buttons for quick settings
    const presets = {
      subtle: () => {
        highlightSettings.edgeStrength = 1.5;
        highlightSettings.edgeGlow = 0.3;
        highlightSettings.edgeThickness = 1.0;
        this.updateAllHighlightControls(highlightSettings);
      },
      normal: () => {
        highlightSettings.edgeStrength = 3.0;
        highlightSettings.edgeGlow = 0.7;
        highlightSettings.edgeThickness = 2.0;
        this.updateAllHighlightControls(highlightSettings);
      },
      intense: () => {
        highlightSettings.edgeStrength = 6.0;
        highlightSettings.edgeGlow = 1.2;
        highlightSettings.edgeThickness = 4.0;
        this.updateAllHighlightControls(highlightSettings);
      }
    };

    const presetFolder = highlightFolder.addFolder('Presets');
    presetFolder.add(presets, 'subtle').name('Subtle');
    presetFolder.add(presets, 'normal').name('Normal');
    presetFolder.add(presets, 'intense').name('Intense');

    highlightFolder.close(); // Start collapsed
  }

  updateAllHighlightControls(settings) {
    // Update the renderer
    this.graphRenderer.updateOutlineSettings(settings);
    
    // Update all GUI controllers to reflect the new values
    this.gui.controllersRecursive().forEach(controller => {
      if (controller.property === 'edgeStrength' || 
          controller.property === 'edgeGlow' || 
          controller.property === 'edgeThickness') {
        controller.updateDisplay();
      }
    });
  }
}
