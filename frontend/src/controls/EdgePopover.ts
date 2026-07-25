import { GraphLink } from '../types/graph.js';
import { getLinkColor } from '../graph/GraphColors.js';

export class EdgePopover {
  private container: HTMLDivElement;
  private hideTimeout: number | null = null;
  private isMouseOverPopover = false;
  private mouseX = 0;
  private mouseY = 0;

  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'edge-popover';

    // Enable interaction inside the popover without hiding it
    this.container.addEventListener('mouseenter', () => {
      this.isMouseOverPopover = true;
      this.cancelHide();
    });

    this.container.addEventListener('mouseleave', () => {
      this.isMouseOverPopover = false;
      this.scheduleHide(150);
    });

    // Track mouse position globally for precise positioning
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    document.body.appendChild(this.container);
  }

  public show(link: GraphLink): void {
    this.cancelHide();
    this.render(link);
    this.positionPopover();
    this.container.classList.add('edge-popover--visible');
  }

  public hide(delay = 250): void {
    this.scheduleHide(delay);
  }

  private scheduleHide(delay: number): void {
    this.cancelHide();
    this.hideTimeout = window.setTimeout(() => {
      if (!this.isMouseOverPopover) {
        this.container.classList.remove('edge-popover--visible');
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

  private render(link: GraphLink): void {
    const statusColor = getLinkColor(link);
    const sourceId = this.linkEndpointId(link.source);
    const targetId = this.linkEndpointId(link.target);

    this.container.innerHTML = `
      <div class="edge-popover__header">
        <div class="edge-popover__title">${escapeHtml(link.name)}</div>
        ${link.job_id ? `<div class="edge-popover__subtitle">ID: ${escapeHtml(link.job_id)}</div>` : ''}
      </div>

      <div class="edge-popover__meta">
        <div class="edge-popover__badge">
          <span class="edge-popover__status-dot" style="background-color: ${statusColor}"></span>
          <span>${escapeHtml(link.status)}</span>
        </div>
        <div class="edge-popover__badge">
          <span>⚡ ${link.workers} ${link.workers === 1 ? 'worker' : 'workers'}</span>
        </div>
      </div>

      <div class="edge-popover__flow">
        <span class="edge-popover__flow-node" title="${escapeHtml(sourceId)}">${escapeHtml(sourceId)}</span>
        <span class="edge-popover__flow-arrow">➔</span>
        <span class="edge-popover__flow-node" title="${escapeHtml(targetId)}">${escapeHtml(targetId)}</span>
      </div>

      <div class="edge-popover__actions">
        <a class="edge-popover__btn edge-popover__btn--teraslice" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
          Teraslice ↗
        </a>
        ${link.grafana_url ? `
          <a class="edge-popover__btn edge-popover__btn--grafana" href="${escapeHtml(link.grafana_url)}" target="_blank" rel="noopener noreferrer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/><path d="M14 13v4"/></svg>
            Grafana ↗
          </a>
        ` : ''}
      </div>
    `;
  }

  private positionPopover(): void {
    const popoverWidth = 280;
    const popoverHeight = 180;
    const padding = 12;

    let left = this.mouseX + padding;
    let top = this.mouseY + padding;

    // Flip horizontally if overflow on right edge
    if (left + popoverWidth > window.innerWidth - padding) {
      left = this.mouseX - popoverWidth - padding;
    }

    // Flip vertically if overflow on bottom edge
    if (top + popoverHeight > window.innerHeight - padding) {
      top = this.mouseY - popoverHeight - padding;
    }

    // Ensure non-negative coordinates
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
