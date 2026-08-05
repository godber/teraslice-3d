import { describe, it, expect, beforeEach } from 'vitest';
import { GraphFilters } from './GraphFilters.js';
import type { GraphView } from './GraphView.js';
import { GraphData, GraphLink, GraphNode } from '../types/graph.js';

function node(id: string): GraphNode {
  return { id };
}

function link(source: string, target: string, name: string): GraphLink {
  return {
    source,
    target,
    name,
    workers: 1,
    status: 'running',
    url: `http://teraslice.example.com/jobs/${name}`
  };
}

/**
 * A four-node fixture chosen so the filter cases are distinguishable:
 *
 *   kafka:incoming-topicA --job-alpha--> kafka:topicB --job-beta--> es:index-c
 *   es:orphan  (no links)
 *
 * Searching "topic" matches topicA and topicB by id only, so job-alpha is
 * included purely by the "both endpoints included" bridging rule.
 */
function fixture(): GraphData {
  return {
    nodes: [
      node('kafka:incoming-topicA'),
      node('kafka:topicB'),
      node('es:index-c'),
      node('es:orphan')
    ],
    links: [
      link('kafka:incoming-topicA', 'kafka:topicB', 'job-alpha'),
      link('kafka:topicB', 'es:index-c', 'job-beta')
    ]
  };
}

/** Records what GraphFilters asks of its view, with no renderer involved. */
class FakeGraphView implements GraphView {
  public loadedData: GraphData[] = [];
  public visibleData: GraphData[] = [];
  public highlighted: ReadonlySet<string>[] = [];
  public clearHighlightsCount = 0;
  /** Ordered log of mutating calls, for asserting call sequences. */
  public calls: string[] = [];

  loadData(data: GraphData): void {
    this.loadedData.push(data);
    this.calls.push('loadData');
  }

  updateData(newData: GraphData): GraphData {
    this.calls.push('updateData');
    return newData;
  }

  setVisibleData(data: GraphData): void {
    this.visibleData.push(data);
    this.calls.push('setVisibleData');
  }

  highlight(nodeIds: ReadonlySet<string>): void {
    this.highlighted.push(nodeIds);
    this.calls.push('highlight');
  }

  clearHighlights(): void {
    this.clearHighlightsCount++;
    this.calls.push('clearHighlights');
  }

  get lastVisible(): GraphData {
    return this.visibleData[this.visibleData.length - 1];
  }

  get lastHighlighted(): ReadonlySet<string> {
    return this.highlighted[this.highlighted.length - 1];
  }
}

describe('GraphFilters.computeFilter', () => {
  let data: GraphData;
  let filters: GraphFilters;

  beforeEach(() => {
    data = fixture();
    filters = new GraphFilters();
    filters.setOriginalData(data);
  });

  it('returns an empty result when no data has been set', () => {
    const empty = new GraphFilters();
    const result = empty.computeFilter('anything');

    expect(result.nodeIds.size).toBe(0);
    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it('matches everything for an empty search term', () => {
    const result = filters.computeFilter('');

    expect(result.nodeIds).toEqual(
      new Set(['kafka:incoming-topicA', 'kafka:topicB', 'es:index-c', 'es:orphan'])
    );
    expect(result.nodes).toHaveLength(4);
    expect(result.links).toHaveLength(2);
  });

  it('returns the original arrays by reference for an empty search term', () => {
    // GraphRenderer.setVisibleData() skips a redundant graphData() call by
    // comparing array identity, so this reference-passing is load-bearing:
    // break it and the layout jolts on every keystroke.
    const result = filters.computeFilter('');

    expect(result.nodes).toBe(data.nodes);
    expect(result.links).toBe(data.links);
  });

  it('includes a node whose id matches the term', () => {
    const result = filters.computeFilter('index-c');

    expect(result.nodeIds).toEqual(new Set(['es:index-c']));
    expect(result.nodes).toEqual([node('es:index-c')]);
    // job-beta touches es:index-c but its other endpoint is not included.
    expect(result.links).toEqual([]);
  });

  it('includes a link whose name matches the term, plus both its endpoints', () => {
    const result = filters.computeFilter('job-beta');

    expect(result.nodeIds).toEqual(new Set(['kafka:topicB', 'es:index-c']));
    expect(result.nodes.map(n => n.id)).toEqual(['kafka:topicB', 'es:index-c']);
    expect(result.links.map(l => l.name)).toEqual(['job-beta']);
  });

  it('includes a bridging link when both endpoints matched on their own', () => {
    // "topic" matches only node ids; job-alpha's name does not contain it, but
    // both of its endpoints are included, so the link comes along.
    const result = filters.computeFilter('topic');

    expect(result.nodeIds).toEqual(new Set(['kafka:incoming-topicA', 'kafka:topicB']));
    expect(result.links.map(l => l.name)).toEqual(['job-alpha']);
  });

  it('matches case-insensitively on both node ids and link names', () => {
    expect(filters.computeFilter('INDEX-C')).toEqual(filters.computeFilter('index-c'));
    expect(filters.computeFilter('JOB-ALPHA')).toEqual(filters.computeFilter('job-alpha'));
  });

  it('resolves endpoints that 3d-force-graph has replaced with node objects', () => {
    // Once the graph is live, link.source/target are GraphNode objects rather
    // than id strings. The filter must handle both shapes.
    const resolved: GraphData = {
      nodes: data.nodes,
      links: [{ ...data.links[0], source: data.nodes[0], target: data.nodes[1] }]
    };
    filters.setOriginalData(resolved);

    const result = filters.computeFilter('job-alpha');

    expect(result.nodeIds).toEqual(new Set(['kafka:incoming-topicA', 'kafka:topicB']));
    expect(result.links).toHaveLength(1);
  });

  it('returns no matches for a term that matches nothing', () => {
    const result = filters.computeFilter('no-such-thing');

    expect(result.nodeIds.size).toBe(0);
    expect(result.nodes).toEqual([]);
    expect(result.links).toEqual([]);
  });

  it('defaults to the active search term', () => {
    filters.setView(new FakeGraphView());
    filters.filterGraphData('job-beta');

    expect(filters.computeFilter().links.map(l => l.name)).toEqual(['job-beta']);
    expect(filters.getFilteredLinks().map(l => l.name)).toEqual(['job-beta']);
    expect(filters.getFilteredNodes().map(n => n.id)).toEqual(['kafka:topicB', 'es:index-c']);
  });

  it('backs the jobs and connectors tables with the same result', () => {
    expect(filters.getFilteredLinks('topic')).toEqual(filters.computeFilter('topic').links);
    expect(filters.getFilteredNodes('topic')).toEqual(filters.computeFilter('topic').nodes);
  });
});

describe('GraphFilters view interaction', () => {
  let data: GraphData;
  let filters: GraphFilters;
  let view: FakeGraphView;

  beforeEach(() => {
    data = fixture();
    view = new FakeGraphView();
    filters = new GraphFilters();
    filters.setOriginalData(data);
    filters.setView(view);
  });

  it('does nothing when no view is attached', () => {
    const detached = new GraphFilters();
    detached.setOriginalData(data);

    expect(() => detached.filterGraphData('topic')).not.toThrow();
    expect(() => detached.setFilterMode('Remove')).not.toThrow();
  });

  it('does nothing when no data is set', () => {
    const empty = new GraphFilters();
    empty.setView(view);
    empty.filterGraphData('topic');

    expect(view.calls).toEqual([]);
  });

  it('restores the full dataset by reference for an empty term', () => {
    filters.filterGraphData('');

    expect(view.lastVisible).toBe(data);
    expect(view.clearHighlightsCount).toBe(1);
  });

  it('keeps all data visible and highlights the match in Highlight mode', () => {
    filters.setFilterMode('Highlight');
    view.calls = [];
    view.clearHighlightsCount = 0;

    filters.filterGraphData('topic');

    // Passing originalData by reference is what lets the view skip a
    // needless graphData() reset and avoid a layout jolt.
    expect(view.lastVisible).toBe(data);
    expect(view.lastHighlighted).toEqual(
      new Set(['kafka:incoming-topicA', 'kafka:topicB'])
    );
    expect(view.calls).toEqual(['setVisibleData', 'highlight']);
  });

  it('reduces the visible data and clears highlights in Remove mode', () => {
    filters.setFilterMode('Remove');
    view.calls = [];
    view.clearHighlightsCount = 0;

    filters.filterGraphData('topic');

    expect(view.lastVisible.nodes.map(n => n.id)).toEqual([
      'kafka:incoming-topicA',
      'kafka:topicB'
    ]);
    expect(view.lastVisible.links.map(l => l.name)).toEqual(['job-alpha']);
    expect(view.clearHighlightsCount).toBe(1);
    expect(view.highlighted).toEqual([]);
  });

  it('clears highlights when the mode changes', () => {
    filters.setFilterMode('Remove');

    expect(view.clearHighlightsCount).toBe(1);
  });

  it('leaves no stale highlight across Highlight -> Remove -> Highlight', () => {
    filters.setFilterMode('Highlight');
    filters.filterGraphData('topic');

    // Switching to Remove must drop the outline from the previous highlight,
    // and switching back must re-establish it against the full dataset.
    filters.setFilterMode('Remove');
    filters.filterGraphData('topic');
    const clearsAfterRemove = view.clearHighlightsCount;

    filters.setFilterMode('Highlight');
    filters.filterGraphData('topic');

    expect(clearsAfterRemove).toBeGreaterThan(0);
    expect(view.calls[view.calls.length - 2]).toBe('setVisibleData');
    expect(view.calls[view.calls.length - 1]).toBe('highlight');
    expect(view.lastVisible).toBe(data);
    expect(view.lastHighlighted).toEqual(
      new Set(['kafka:incoming-topicA', 'kafka:topicB'])
    );
  });

  it('notifies subscribers after applying the filter', () => {
    const seen: string[] = [];
    filters.onFilterChange(() => seen.push(filters.getFilterState().searchTerm));

    filters.filterGraphData('topic');
    filters.filterGraphData('');

    expect(seen).toEqual(['topic', '']);
  });

  it('clearFilters resets the term and restores the full dataset', () => {
    filters.filterGraphData('topic');
    view.calls = [];

    filters.clearFilters();

    expect(filters.getFilterState().searchTerm).toBe('');
    expect(view.lastVisible).toBe(data);
    expect(view.calls).toEqual(['setVisibleData', 'clearHighlights']);
  });

  it('re-applies the active term to refreshed data', () => {
    filters.setFilterMode('Highlight');
    filters.filterGraphData('topic');

    // Mirrors the AutoRefresh path in main.ts: new data arrives, the filter is
    // re-applied against it, and the new term-matched set is highlighted.
    const refreshed: GraphData = {
      nodes: [...data.nodes, node('kafka:topicD')],
      links: [...data.links, link('kafka:topicB', 'kafka:topicD', 'job-gamma')]
    };
    filters.setOriginalData(refreshed);
    filters.filterGraphData(filters.getFilterState().searchTerm);

    expect(view.lastVisible).toBe(refreshed);
    expect(view.lastHighlighted).toEqual(
      new Set(['kafka:incoming-topicA', 'kafka:topicB', 'kafka:topicD'])
    );
  });
});
