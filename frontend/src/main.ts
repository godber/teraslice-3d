import { GraphRenderer } from './graph/GraphRenderer.js';
import { GraphFilters } from './graph/GraphFilters.js';
import { GuiControls } from './controls/GuiControls.js';
import { SearchBar } from './controls/SearchBar.js';
import { JobsTable } from './controls/JobsTable.js';
import { loadGraphData, fetchVersion } from './utils/api.js';
import { AutoRefresh } from './utils/autoRefresh.js';
import './style.css';

async function displayVersion(): Promise<void> {
  const versionInfo = document.getElementById('version-info');
  if (versionInfo) {
    try {
      const version = await fetchVersion();
      versionInfo.textContent = `Version: ${version}`;
    } catch (error) {
      console.error('Failed to fetch version:', error);
      versionInfo.textContent = 'Version: unknown';
    }
  }
}

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
    const reconciledData = graphRenderer.updateData(newData);
    graphFilters.setOriginalData(reconciledData);
    // Re-apply the active filter to the refreshed data so the graph and
    // jobs table stay in sync with the current search term.
    graphFilters.filterGraphData(graphFilters.getFilterState().searchTerm);
  });

  // Initialize GUI controls with auto-refresh
  new GuiControls(graphRenderer, graphFilters, autoRefresh);

  // Bottom search bar + jobs table drawer
  const jobsTable = new JobsTable(graphFilters);
  new SearchBar(graphFilters, jobsTable);
  
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
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
  displayVersion();
});