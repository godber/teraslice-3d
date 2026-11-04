import { GraphData } from '../types/graph.js';

/**
 * The contract a renderer must satisfy to be driven by GraphFilters and
 * main.ts. Deliberately expressed in graph-data terms (ids, nodes, links) --
 * no Three.js, no ForceGraph3D, no DOM.
 */
export interface GraphView {
  /** Initial render of the full dataset. */
  loadData(data: GraphData): void;

  /**
   * Apply refreshed data. Returns the data the view now holds, which may be
   * a reconciled object graph rather than `newData` itself (the 3D view
   * reuses existing node objects to preserve positions).
   */
  updateData(newData: GraphData): GraphData;

  /**
   * Set which subset of the data is rendered. Implementations should skip
   * the work when handed the same data they are already showing.
   */
  setVisibleData(data: GraphData): void;

  /**
   * Highlight the given nodes, plus every link whose source *and* target are
   * both in the set. Replaces any previous highlight.
   */
  highlight(nodeIds: ReadonlySet<string>): void;

  /** Remove all highlights. */
  clearHighlights(): void;
}
