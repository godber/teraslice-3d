import { GraphFilters } from '../graph/GraphFilters.js';
import { GraphLink } from '../types/graph.js';
import { getLinkColor, getNodeColor, getNodeType } from '../graph/GraphColors.js';

type Tab = 'jobs' | 'connectors';

/**
 * Bottom drawer presenting the currently filtered graph in two tabs:
 *  - Jobs: graph links (a job → destination edge), clickable to open the
 *    Teraslice job page.
 *  - Connectors: graph nodes (Kafka topics / Elasticsearch indices).
 * Both tabs stay in sync with the search bar via GraphFilters.onFilterChange().
 */
export class JobsTable {
  private graphFilters: GraphFilters;
  private drawer!: HTMLDivElement;
  private jobsBody!: HTMLTableSectionElement;
  private connectorsBody!: HTMLTableSectionElement;
  private jobsTable!: HTMLTableElement;
  private connectorsTable!: HTMLTableElement;
  private jobsTab!: HTMLButtonElement;
  private connectorsTab!: HTMLButtonElement;
  private jobsCount!: HTMLSpanElement;
  private connectorsCount!: HTMLSpanElement;
  private activeTab: Tab = 'jobs';
  private open = false;

  constructor(graphFilters: GraphFilters) {
    this.graphFilters = graphFilters;
    this.render();
    // Refresh whenever the filter result changes (search, mode, refresh).
    this.graphFilters.onFilterChange(() => {
      if (this.open) this.update();
    });
    // Dismiss the drawer with the Escape key.
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.open) {
        this.hide();
      }
    });
  }

  private render(): void {
    this.drawer = document.createElement('div');
    this.drawer.className = 'jobs-table-drawer';

    // Header with tabs and close button
    const header = document.createElement('div');
    header.className = 'jobs-table-drawer__header';

    const tabs = document.createElement('div');
    tabs.className = 'jobs-table-drawer__tabs';

    this.jobsCount = document.createElement('span');
    this.jobsCount.className = 'jobs-table-drawer__count';
    this.jobsTab = this.createTab('Jobs', this.jobsCount, 'jobs');

    this.connectorsCount = document.createElement('span');
    this.connectorsCount.className = 'jobs-table-drawer__count';
    this.connectorsTab = this.createTab('Connectors', this.connectorsCount, 'connectors');

    tabs.appendChild(this.jobsTab);
    tabs.appendChild(this.connectorsTab);

    const closeButton = document.createElement('button');
    closeButton.className = 'jobs-table-drawer__close';
    closeButton.textContent = '✕';
    closeButton.title = 'Close';
    closeButton.addEventListener('click', () => this.hide());

    header.appendChild(tabs);
    header.appendChild(closeButton);

    // Scrollable area holding both tables (only the active one is shown).
    const scroll = document.createElement('div');
    scroll.className = 'jobs-table-drawer__scroll';

    this.jobsTable = this.createTable(['Name', 'Links', 'Status', 'Workers', 'Source', 'Target']);
    this.jobsBody = this.jobsTable.querySelector('tbody')!;

    this.connectorsTable = this.createTable(['Name', 'Type', 'Jobs']);
    this.connectorsBody = this.connectorsTable.querySelector('tbody')!;

    scroll.appendChild(this.jobsTable);
    scroll.appendChild(this.connectorsTable);

    this.drawer.appendChild(header);
    this.drawer.appendChild(scroll);

    document.body.appendChild(this.drawer);
    this.updateTabSelection();
  }

  private createTab(label: string, count: HTMLSpanElement, tab: Tab): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'jobs-table-drawer__tab';
    button.textContent = label + ' ';
    button.appendChild(count);
    button.addEventListener('click', () => {
      this.activeTab = tab;
      this.updateTabSelection();
    });
    return button;
  }

  private createTable(columns: string[]): HTMLTableElement {
    const table = document.createElement('table');
    table.className = 'jobs-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    for (const col of columns) {
      const th = document.createElement('th');
      th.textContent = col;
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);

    const tbody = document.createElement('tbody');
    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
  }

  private linkEndpointId(endpoint: GraphLink['source']): string {
    return typeof endpoint === 'object' ? endpoint.id : endpoint;
  }

  private updateTabSelection(): void {
    const jobsActive = this.activeTab === 'jobs';
    this.jobsTab.classList.toggle('jobs-table-drawer__tab--active', jobsActive);
    this.connectorsTab.classList.toggle('jobs-table-drawer__tab--active', !jobsActive);
    // Both tables share a grid cell so the drawer height stays at the taller
    // table's size; the inactive one is hidden but still reserves its space.
    this.jobsTable.classList.toggle('jobs-table--hidden', !jobsActive);
    this.connectorsTable.classList.toggle('jobs-table--hidden', jobsActive);
  }

  private emptyRow(body: HTMLTableSectionElement, colSpan: number, message: string): void {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.className = 'jobs-table__empty';
    cell.colSpan = colSpan;
    cell.textContent = message;
    row.appendChild(cell);
    body.appendChild(row);
  }

  private update(): void {
    const links = this.graphFilters.getFilteredLinks();
    const nodes = this.graphFilters.getFilteredNodes();

    this.jobsCount.textContent = `(${links.length})`;
    this.connectorsCount.textContent = `(${nodes.length})`;

    // Jobs tab
    this.jobsBody.innerHTML = '';
    if (links.length === 0) {
      this.emptyRow(this.jobsBody, 6, 'No matching jobs');
    } else {
      for (const link of links) {
        const row = document.createElement('tr');
        row.className = 'jobs-table__row';
        row.title = `Open ${link.url}`;
        row.addEventListener('click', () => {
          window.open(link.url, '_blank', 'noopener');
        });

        const nameCell = document.createElement('td');
        nameCell.textContent = link.name;

        const linksCell = document.createElement('td');
        const linksContainer = document.createElement('div');
        linksContainer.className = 'jobs-table__links-cell';

        const tsAnchor = document.createElement('a');
        tsAnchor.className = 'jobs-table__link-btn jobs-table__link-btn--teraslice';
        tsAnchor.href = link.url;
        tsAnchor.target = '_blank';
        tsAnchor.rel = 'noopener noreferrer';
        tsAnchor.title = `Open Teraslice Job (${link.url})`;
        tsAnchor.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>`;
        tsAnchor.addEventListener('click', (e) => {
          e.stopPropagation();
        });
        linksContainer.appendChild(tsAnchor);

        if (link.grafana_url) {
          const gfAnchor = document.createElement('a');
          gfAnchor.className = 'jobs-table__link-btn jobs-table__link-btn--grafana';
          gfAnchor.href = link.grafana_url;
          gfAnchor.target = '_blank';
          gfAnchor.rel = 'noopener noreferrer';
          gfAnchor.title = `Open Grafana Dashboard (${link.grafana_url})`;
          gfAnchor.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/><path d="M14 13v4"/></svg>`;
          gfAnchor.addEventListener('click', (e) => {
            e.stopPropagation();
          });
          linksContainer.appendChild(gfAnchor);
        }

        linksCell.appendChild(linksContainer);

        const statusCell = document.createElement('td');
        const dot = document.createElement('span');
        dot.className = 'jobs-table__status-dot';
        dot.style.backgroundColor = getLinkColor(link);
        statusCell.appendChild(dot);
        statusCell.appendChild(document.createTextNode(link.status));

        const workersCell = document.createElement('td');
        workersCell.textContent = String(link.workers);

        const sourceCell = document.createElement('td');
        sourceCell.textContent = this.linkEndpointId(link.source);

        const targetCell = document.createElement('td');
        targetCell.textContent = this.linkEndpointId(link.target);

        row.appendChild(nameCell);
        row.appendChild(linksCell);
        row.appendChild(statusCell);
        row.appendChild(workersCell);
        row.appendChild(sourceCell);
        row.appendChild(targetCell);
        this.jobsBody.appendChild(row);
      }
    }

    // Connectors tab — count how many filtered jobs touch each connector.
    const jobCountById = new Map<string, number>();
    for (const link of links) {
      const source = this.linkEndpointId(link.source);
      const target = this.linkEndpointId(link.target);
      jobCountById.set(source, (jobCountById.get(source) ?? 0) + 1);
      jobCountById.set(target, (jobCountById.get(target) ?? 0) + 1);
    }

    this.connectorsBody.innerHTML = '';
    if (nodes.length === 0) {
      this.emptyRow(this.connectorsBody, 3, 'No matching connectors');
    } else {
      for (const node of nodes) {
        const row = document.createElement('tr');

        const nameCell = document.createElement('td');
        const dot = document.createElement('span');
        dot.className = 'jobs-table__status-dot';
        dot.style.backgroundColor = getNodeColor(node);
        nameCell.appendChild(dot);
        nameCell.appendChild(document.createTextNode(node.id));

        const typeCell = document.createElement('td');
        typeCell.textContent = getNodeType(node);

        const jobsCell = document.createElement('td');
        jobsCell.textContent = String(jobCountById.get(node.id) ?? 0);

        row.appendChild(nameCell);
        row.appendChild(typeCell);
        row.appendChild(jobsCell);
        this.connectorsBody.appendChild(row);
      }
    }
  }

  public toggle(): void {
    this.open ? this.hide() : this.show();
  }

  public show(): void {
    this.open = true;
    this.update();
    this.drawer.classList.add('jobs-table-drawer--open');
  }

  public hide(): void {
    this.open = false;
    this.drawer.classList.remove('jobs-table-drawer--open');
  }
}
