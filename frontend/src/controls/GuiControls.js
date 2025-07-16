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
}
