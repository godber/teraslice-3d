import { GraphRenderer } from './graph/GraphRenderer.js';
import { GraphFilters } from './graph/GraphFilters.js';
import { GuiControls } from './controls/GuiControls.js';
import { loadGraphData } from './utils/api.js';
import { AutoRefresh } from './utils/autoRefresh.js';
import './style.css';

async function initializeApp(): Promise<void> {
  const elem = document.getElementById('3d-graph');
  
  if (!elem) {
    console.error('Could not find element with ID "3d-graph"');
    return;
  }
  
  // Initialize core components
  const graphRenderer = new GraphRenderer(elem);
  const graphFilters = new GraphFilters();
  
  // Connect filters to graph
  graphFilters.setGraph(graphRenderer.getGraph());
  graphFilters.setGraphRenderer(graphRenderer);
  
  // Initialize auto-refresh
  const autoRefresh = new AutoRefresh((newData) => {
    graphFilters.setOriginalData(newData);
    graphRenderer.updateData(newData);
  });
  
  // Initialize GUI controls with auto-refresh
  new GuiControls(graphRenderer, graphFilters, autoRefresh);
  
  // Load and display graph data
  try {
    const data = await loadGraphData();
    graphFilters.setOriginalData(data);
    graphRenderer.loadData(data);
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);