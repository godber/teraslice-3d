import { GraphRenderer } from './graph/GraphRenderer.js';
import { GraphFilters } from './graph/GraphFilters.js';
import { GuiControls } from './controls/GuiControls.js';
import { loadGraphData } from './utils/api.js';
import './style.css';

async function initializeApp() {
  const elem = document.getElementById('3d-graph');
  
  // Initialize core components
  const graphRenderer = new GraphRenderer(elem);
  const graphFilters = new GraphFilters();
  
  // Connect filters to graph
  graphFilters.setGraph(graphRenderer.getGraph());
  graphFilters.setGraphRenderer(graphRenderer);
  
  // Initialize GUI controls
  const guiControls = new GuiControls(graphRenderer, graphFilters);
  
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