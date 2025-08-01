import { GUI } from 'lil-gui';
import { colors } from '../graph/GraphColors.js';
import { GraphRenderer } from '../graph/GraphRenderer.js';
import { GraphFilters } from '../graph/GraphFilters.js';
import { AutoRefresh } from '../utils/autoRefresh.js';

export class GuiControls {
  private graphRenderer: GraphRenderer;
  private graphFilters: GraphFilters;
  private autoRefresh: AutoRefresh;
  private gui: GUI | null;
  private connectionStatus: 'unknown' | 'connected' | 'error';
  private lastUpdateTime: Date | null;
  private statusController: any;
  private lastUpdateController: any;
  private refreshState: any;

  constructor(graphRenderer: GraphRenderer, graphFilters: GraphFilters, autoRefresh: AutoRefresh) {
    this.graphRenderer = graphRenderer;
    this.graphFilters = graphFilters;
    this.autoRefresh = autoRefresh;
    this.gui = null;
    this.connectionStatus = 'unknown';
    this.lastUpdateTime = null;
    this.init();
  }

  private init(): void {
    this.gui = new GUI({title: "Teraslice 3D Graph Controls"});
    this.setupFilterControls();
    this.setupColorControls();
    this.setupHighlightControls();
    this.setupAutoRefreshControls();

    // Setup auto-refresh status monitoring
    if (this.autoRefresh) {
      this.autoRefresh.onStatusChange((status, lastUpdateTime) => {
        this.connectionStatus = status as 'unknown' | 'connected' | 'error';
        this.lastUpdateTime = lastUpdateTime;
        this.updateConnectionStatus();
      });
    }
  }

  private setupColorControls(): void {
    const colorFolder = this.gui!.addFolder('Colors');

    // Node colors
    const nodeFolder = colorFolder.addFolder('Nodes');
    nodeFolder.addColor(colors, 'kafkaIncoming')
      .name('Kafka Incoming')
      .onChange(() => this.graphRenderer.updateNodeColors());

    nodeFolder.addColor(colors, 'kafkaOther')
      .name('Kafka Other')
      .onChange(() => this.graphRenderer.updateNodeColors());

    nodeFolder.addColor(colors, 'elasticsearch')
      .name('Elasticsearch')
      .onChange(() => this.graphRenderer.updateNodeColors());

    // Link colors
    const linkFolder = colorFolder.addFolder('Links');
    linkFolder.addColor(colors, 'linkRunning')
      .name('Running')
      .onChange(() => this.graphRenderer.updateLinkColors());

    linkFolder.addColor(colors, 'linkStarting')
      .name('Starting')
      .onChange(() => this.graphRenderer.updateLinkColors());

    linkFolder.addColor(colors, 'linkStopped')
      .name('Stopped')
      .onChange(() => this.graphRenderer.updateLinkColors());

    linkFolder.addColor(colors, 'linkStopping')
      .name('Stopping')
      .onChange(() => this.graphRenderer.updateLinkColors());

    linkFolder.addColor(colors, 'linkFailing')
      .name('Failing')
      .onChange(() => this.graphRenderer.updateLinkColors());

    linkFolder.addColor(colors, 'linkDefault')
      .name('Default')
      .onChange(() => this.graphRenderer.updateLinkColors());

    // Background color
    colorFolder.addColor(colors, 'background')
      .name('Background')
      .onChange(() => this.graphRenderer.updateBackgroundColor());

    colorFolder.close();
  }

  private setupFilterControls(): void {
    const filterFolder = this.gui!.addFolder('Filtering');
    const filterState = this.graphFilters.getFilterState();

    // Add filter mode selection
    filterFolder.add(filterState, 'filterMode', ['Remove', 'Highlight'])
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

  private setupHighlightControls(): void {
    const highlightFolder = this.gui!.addFolder('Highlight Settings');

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

  private setupAutoRefreshControls(): void {
    const refreshFolder = this.gui!.addFolder('Auto Refresh');

    if (!this.autoRefresh) {
      refreshFolder.add({}, 'disabled').name('Auto-refresh not available');
      return;
    }

    const refreshState = {
      enabled: this.autoRefresh.getStatus().enabled,
      interval: this.autoRefresh.getStatus().interval / 1000, // Convert to seconds
      status: 'unknown',
      lastUpdate: 'Never'
    };

    // Enable/disable toggle
    refreshFolder.add(refreshState, 'enabled')
      .name('Enable Auto-refresh')
      .onChange(value => {
        if (value) {
          this.autoRefresh.start();
        } else {
          this.autoRefresh.stop();
        }
      });

    // Interval control
    refreshFolder.add(refreshState, 'interval', 10, 300, 10)
      .name('Interval (seconds)')
      .onChange(value => {
        this.autoRefresh.setInterval(value * 1000);
      });

    // Status display
    this.statusController = refreshFolder.add(refreshState, 'status')
      .name('Connection Status')
      .listen();

    this.lastUpdateController = refreshFolder.add(refreshState, 'lastUpdate')
      .name('Last Update')
      .listen();

    // Manual refresh button
    refreshFolder.add({
      refresh: () => {
        this.autoRefresh.refresh();
      }
    }, 'refresh').name('Refresh Now');

    // Clear cache button
    refreshFolder.add({
      clearCache: async () => {
        await this.clearCache();
      }
    }, 'clearCache').name('Clear Cache');

    // Store reference for updates
    this.refreshState = refreshState;

    refreshFolder.close();
  }

  private updateConnectionStatus(): void {
    if (!this.refreshState) return;

    this.refreshState.status = this.connectionStatus;
    this.refreshState.lastUpdate = this.lastUpdateTime
      ? this.lastUpdateTime.toLocaleTimeString()
      : 'Never';

    // Update GUI display
    if (this.statusController) {
      this.statusController.updateDisplay();
    }
    if (this.lastUpdateController) {
      this.lastUpdateController.updateDisplay();
    }
  }

  private async clearCache(): Promise<void> {
    try {
      const response = await fetch('/api/cache/clear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to clear cache: ${response.status}`);
      }

      const result = await response.json();
      console.log('Cache cleared:', result.message);
      
      // Optionally trigger a refresh after clearing cache
      if (this.autoRefresh) {
        await this.autoRefresh.refresh();
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      // Could add user notification here
    }
  }

  private updateAllHighlightControls(settings: any): void {
    // Update the renderer
    this.graphRenderer.updateOutlineSettings(settings);

    // Update all GUI controllers to reflect the new values
    this.gui!.controllersRecursive().forEach(controller => {
      if (controller.property === 'edgeStrength' ||
          controller.property === 'edgeGlow' ||
          controller.property === 'edgeThickness') {
        controller.updateDisplay();
      }
    });
  }

  public destroy(): void {
    if (this.gui) {
      this.gui.destroy();
    }
  }
}
