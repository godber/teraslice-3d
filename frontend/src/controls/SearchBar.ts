import { GraphFilters } from '../graph/GraphFilters.js';
import { JobsTable } from './JobsTable.js';

/**
 * Bottom-center search bar. Owns the filtering controls (search input,
 * filter mode, clear) that previously lived in the lil-gui panel, plus a
 * button that toggles the jobs table drawer.
 */
export class SearchBar {
  private graphFilters: GraphFilters;
  private jobsTable: JobsTable;
  private searchInput!: HTMLInputElement;

  constructor(graphFilters: GraphFilters, jobsTable: JobsTable) {
    this.graphFilters = graphFilters;
    this.jobsTable = jobsTable;
    this.render();
  }

  private render(): void {
    const filterState = this.graphFilters.getFilterState();

    const bar = document.createElement('div');
    bar.className = 'search-bar';

    // Search input
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.className = 'search-bar__input';
    this.searchInput.placeholder = 'Search jobs…';
    this.searchInput.value = filterState.searchTerm;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    this.searchInput.addEventListener('input', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this.graphFilters.filterGraphData(this.searchInput.value);
      }, 150);
    });

    // Filter mode select
    const modeSelect = document.createElement('select');
    modeSelect.className = 'search-bar__select';
    modeSelect.title = 'Filter Mode';
    for (const mode of ['Highlight', 'Remove']) {
      const option = document.createElement('option');
      option.value = mode;
      option.textContent = mode;
      option.selected = mode === filterState.filterMode;
      modeSelect.appendChild(option);
    }
    modeSelect.addEventListener('change', () => {
      this.graphFilters.setFilterMode(modeSelect.value as 'Remove' | 'Highlight');
      this.graphFilters.filterGraphData(this.searchInput.value);
    });

    // Clear button
    const clearButton = document.createElement('button');
    clearButton.className = 'search-bar__button';
    clearButton.textContent = 'Clear';
    clearButton.title = 'Clear All Filters';
    clearButton.addEventListener('click', () => {
      this.graphFilters.clearFilters();
      this.searchInput.value = '';
    });

    // Jobs table toggle button
    const tableButton = document.createElement('button');
    tableButton.className = 'search-bar__button';
    tableButton.textContent = 'Jobs Table';
    tableButton.title = 'Show/hide the jobs table';
    tableButton.addEventListener('click', () => {
      this.jobsTable.toggle();
    });

    bar.appendChild(this.searchInput);
    bar.appendChild(modeSelect);
    bar.appendChild(clearButton);
    bar.appendChild(tableButton);

    document.body.appendChild(bar);
  }
}
