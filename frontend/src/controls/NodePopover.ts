import { GraphNode, GraphLink } from '../types/graph.js';
import { getNodeColor, getNodeType } from '../graph/GraphColors.js';

export class NodePopover {
  private container: HTMLDivElement;
  private hideTimeout: number | null = null;
  private isMouseOverPopover = false;
  private mouseX = 0;
  private mouseY = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'node-popover';

    // Allow user to interact with popover content (e.g. clicking job links)
    this.container.addEventListener('mouseenter', () => {
      this.isMouseOverPopover = true;
      this.cancelHide();
    });

    this.container.addEventListener('mouseleave', () => {
      this.isMouseOverPopover = false;
      this.scheduleHide(150);
    });

    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    document.body.appendChild(this.container);
  }

  public show(node: GraphNode, allLinks: GraphLink[] = []): void {
    this.cancelHide();
    this.render(node, allLinks);
    this.positionPopover();
    this.container.classList.add('node-popover--visible');
  }

  public hide(delay = 250): void {
    this.scheduleHide(delay);
  }

  private scheduleHide(delay: number): void {
    this.cancelHide();
    this.hideTimeout = window.setTimeout(() => {
      if (!this.isMouseOverPopover) {
        this.container.classList.remove('node-popover--visible');
      }
    }, delay);
  }

  private cancelHide(): void {
    if (this.hideTimeout !== null) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  private linkEndpointId(endpoint: GraphLink['source']): string {
    return typeof endpoint === 'object' ? endpoint.id : endpoint;
  }

  private render(node: GraphNode, allLinks: GraphLink[]): void {
    const nodeColor = getNodeColor(node);
    const nodeType = getNodeType(node);

    // Find links connected to this node
    const connectedLinks = allLinks.filter(l => {
      const src = this.linkEndpointId(l.source);
      const tgt = this.linkEndpointId(l.target);
      return src === node.id || tgt === node.id;
    });

    const incomingJobs = connectedLinks.filter(l => this.linkEndpointId(l.target) === node.id);
    const outgoingJobs = connectedLinks.filter(l => this.linkEndpointId(l.source) === node.id);
    const totalWorkers = connectedLinks.reduce((sum, l) => sum + (l.workers || 0), 0);

    let jobsListHtml = '';
    if (connectedLinks.length > 0) {
      const displayJobs = connectedLinks.slice(0, 3);
      const extraCount = connectedLinks.length - displayJobs.length;

      jobsListHtml = `
        <div class="node-popover__jobs-header">Connected Jobs (${connectedLinks.length})</div>
        <div class="node-popover__jobs-list">
          ${displayJobs.map(j => `
            <div class="node-popover__job-item">
              <span class="node-popover__job-name" title="${escapeHtml(j.name)}">${escapeHtml(j.name)}</span>
              <a href="${escapeHtml(j.url)}" target="_blank" rel="noopener noreferrer" class="node-popover__job-link" title="Open Teraslice Job (${escapeHtml(j.url)})">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
              </a>
            </div>
          `).join('')}
          ${extraCount > 0 ? `<div class="node-popover__jobs-more">+${extraCount} more job${extraCount === 1 ? '' : 's'}</div>` : ''}
        </div>
      `;
    } else {
      jobsListHtml = `<div class="node-popover__empty-jobs">No active jobs connected</div>`;
    }

    this.container.innerHTML = `
      <div class="node-popover__header">
        <div class="node-popover__title">${escapeHtml(node.id)}</div>
      </div>

      <div class="node-popover__meta">
        <div class="node-popover__badge">
          <span class="node-popover__type-dot" style="background-color: ${nodeColor}"></span>
          <span>${escapeHtml(nodeType)}</span>
        </div>
        <div class="node-popover__badge">
          <span>⚡ ${totalWorkers} ${totalWorkers === 1 ? 'worker' : 'workers'}</span>
        </div>
      </div>

      <div class="node-popover__stats">
        <div class="node-popover__stat-item">
          <span class="node-popover__stat-val">${outgoingJobs.length}</span>
          <span class="node-popover__stat-lbl">Reader Jobs</span>
        </div>
        <div class="node-popover__stat-item">
          <span class="node-popover__stat-val">${incomingJobs.length}</span>
          <span class="node-popover__stat-lbl">Writer Jobs</span>
        </div>
      </div>

      ${jobsListHtml}
    `;
  }

  private positionPopover(): void {
    const popoverWidth = 280;
    const popoverHeight = 220;
    const padding = 12;

    let left = this.mouseX + padding;
    let top = this.mouseY + padding;

    if (left + popoverWidth > window.innerWidth - padding) {
      left = this.mouseX - popoverWidth - padding;
    }

    if (top + popoverHeight > window.innerHeight - padding) {
      top = this.mouseY - popoverHeight - padding;
    }

    left = Math.max(padding, left);
    top = Math.max(padding, top);

    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
