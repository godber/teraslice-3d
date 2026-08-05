# TODO: Add an Alternative 2D View (Mermaid.js / Cytoscape.js)

Feasibility assessment for adding a 2D pipeline view alongside the existing
3D force-directed graph.

**Status: Phase 1 done, Phases 0 and 2–5 not started.** The `GraphView`
refactor that this depended on has landed
([002a](./002a-refactor-GraphFilters.md)); no 2D renderer code has been written,
and the Mermaid-vs-Cytoscape decision is still open.

The headline finding is that this is very feasible: the backend needs no changes
at all, and the frontend now has an explicit interface a second view plugs into.
The bulk of the real work is not rendering — it is *reduction*, because some
pipelines run to ~250 edges (jobs) and a 250-edge 2D layout is unreadable
without it.

---

## 🎯 Summary

| Area | Verdict |
| --- | --- |
| Backend / API changes | None required |
| Frontend architecture | Ready — the `GraphView` refactor ([002a](./002a-refactor-GraphFilters.md)) is ✅ **done** |
| Mermaid.js fit | Good for *export/share*, awkward for *interactivity* |
| Cytoscape.js fit | Better for a fully interactive 2D view |
| Scale (250 edges) | Renders, but needs reduction strategies to be useful |

---

## ✅ What Already Works In Our Favor

### The API is view-agnostic

`/api/pipeline_graph` ([backend/app/main.py](../backend/app/main.py), `_process_jobs_to_graph`)
already emits a plain `{nodes, links}` structure:

- Node `id` is `connection:topic|index`, plus a `connector_type`
  (`KAFKA`/`ES`/`FILE`/`S3`/`DATA_GENERATOR`/`NOOP`/`STDOUT`/`OTHER`).
- Each link carries `job_id`, `name`, `url`, `workers`, `status`, and
  optionally `grafana_url`.

That converts to Mermaid `flowchart` text mechanically. **No backend work.**

### The frontend already has a second, non-3D consumer

`GraphFilters.computeFilter()`
([frontend/src/graph/GraphFilters.ts](../frontend/src/graph/GraphFilters.ts))
is explicitly documented as the single source of truth shared by the 3D graph
*and* the jobs table, and it exposes an `onFilterChange()` subscription.
`JobsTable` is already a consumer that has nothing to do with Three.js.

A 2D view is simply a **third consumer of the same pattern**. The precedent
exists; we are not inventing an abstraction.

### Styling maps over cleanly

`GraphColors.ts` gives per-connector-type colors and per-status link colors.
`GraphRenderer` scales link width from worker count
(`((workers - 1) / 199) * 19 + 1`). Both translate directly to Mermaid
`classDef` / `linkStyle` or to Cytoscape style selectors.

---

## ✅ The One Real Refactor — Done

`GraphFilters` used to be only *partly* decoupled from the 3D renderer — it
held the `ForceGraph3D` instance directly and its highlight mode traversed the
Three.js scene. A second view needed it to talk to an interface instead.

**This is complete** — see
[002a-refactor-GraphFilters.md](./002a-refactor-GraphFilters.md). A `GraphView`
interface (`loadData / updateData / setVisibleData / highlight /
clearHighlights`) now lives in `frontend/src/graph/GraphView.ts` and is
implemented by `GraphRenderer`. `GraphFilters` imports nothing from `three` or
`3d-force-graph`.

**What this means for a 2D view:** implement `GraphView` and hand the instance
to `graphFilters.setView()`. The "a link is included when both endpoints are"
rule lives inside each implementation's `highlight()`, derived from the node-id
set it is given — so a 2D view expresses it however it likes (a CSS class, a
Cytoscape class) without re-deriving the filter semantics. Note that
`GuiControls` still takes the concrete `GraphRenderer`, so a view *toggle*
(Phase 2) will need to deal with that.

Two useful side effects for the work below:

- `computeFilter()` now has unit test coverage (Vitest, `npm test` in
  `frontend/`), so the reduction strategies in
  [The 250-Edge Problem](#-the-250-edge-problem) can be built against a
  pinned-down filter contract.
- `npm run build` now typechecks (`tsc --noEmit && vite build`).

---

## ⚠️ Where Mermaid Specifically Fights Us

### Jobs are edges, not nodes — this is the significant mismatch

In our data model every interesting attribute (job name, worker count, status,
Teraslice URL, Grafana URL) lives on the **link**. Mermaid's native `click`
directive applies to **nodes only**.

So `EdgePopover` and click-to-open-Teraslice would require post-processing the
rendered SVG to reattach handlers to edge paths. Mermaid emits per-edge path
elements and recent versions added edge-id syntax, so it is doable — but it is
fiddly and sensitive to Mermaid version changes.

### Smaller Mermaid frictions (all solvable)

- **Node ids.** `kafka_cluster1:topic1` is not a valid Mermaid id. Emit
  synthetic `n0`, `n1`, … ids with quoted labels.
- **Config limits.** At 250 edges we need to raise `maxEdges` and
  `maxTextSize`.
- **No pan/zoom** out of the box — add `svg-pan-zoom` or equivalent.
- **Bundle size** is ~1MB+. Lazy `import()` it so the 3D view is not penalized.
- **Direction.** `LR` is the natural orientation for a source → sink pipeline.

### Mermaid's genuine advantage

The output is **text**. It is copy-pasteable into GitHub, docs, and Slack, and
renders natively in a lot of places. That is real value and it is cheap to
ship.

---

## 🔀 Alternative: Cytoscape.js

If we want a *fully interactive* 2D view, Cytoscape.js with a dagre or ELK
layout is the better technical fit:

- Real edge click/hover handlers — no SVG post-processing.
- Per-edge styling (status color, worker-count width) natively.
- Handles 250 edges comfortably.
- Supports incremental updates, which would mesh with the existing in-place
  refresh logic in `GraphRenderer.updateData()` /
  `updatePropertiesInPlace()`.

Other options considered: `@viz-js/viz` (Graphviz WASM) has excellent DAG
layout quality but the same SVG-post-processing problem as Mermaid;
`elkjs` + custom SVG is more work than it is worth here.

**Recommendation:** do both, if we do more than one — Cytoscape.js as the
interactive 2D view, Mermaid as an "export diagram" feature. They serve
different purposes and the Mermaid text generator is a small, standalone,
easily-tested function either way.

---

## 📉 The 250-Edge Problem

This is where the actual design effort goes. Ranked by value-to-effort:

1. **Connected-component split.** Our pipelines are almost certainly several
   disconnected DAGs. Compute components client-side and render one at a time
   with a picker. Cheapest change, biggest readability win.
2. **Reuse the existing filter.** `computeFilter()` already does reduction.
   The 2D view can default to a filtered subgraph rather than rendering
   everything.
3. **Focus / neighborhood mode.** Pick a node, BFS out 1–3 hops. Especially
   natural for Mermaid, since regenerating the diagram text is cheap.
4. **Group by connection.** Node ids are `connection:name`, so a `subgraph`
   per connection comes essentially free — plus a collapsed mode where each
   connection is a single node with aggregated edge counts.
5. **Collapse `routed_sender` fan-outs.** `JobInfo.process_destination_nodes()`
   ([backend/app/lib/ts.py](../backend/app/lib/ts.py)) emits one destination per
   routing key, so a single job can produce many near-identical edges
   (`index-a`, `index-b`, …). Collapsing these to `index-*  (×N)` could cut
   edge count substantially on the worst pipelines. The `-{suffix}` pattern is
   detectable client-side.
6. **Status filter** (running/failing only) and a **workers threshold**.

---

## 🐛 One Concrete Gotcha To Fix First

`_process_jobs_to_graph()` in [backend/app/main.py](../backend/app/main.py)
returns:

```python
'nodes': list(set(nodes)),
```

Python string hashing is seeded per-process, so **node ordering varies between
server restarts**. That is invisible in a force-directed 3D layout, but Mermaid
output is *text* — the same pipeline would produce differently-ordered diagram
source (and potentially a different dagre layout) across restarts.

Sorting there would make exported diagrams stable and diffable. Worth doing if
we go the Mermaid route.

---

## 📋 Rough Implementation Plan

- [ ] **Phase 0 — Stabilize node ordering.** Sort the deduplicated node list in
      `_process_jobs_to_graph()`. Small, and required for stable Mermaid text
      output. Backend tests already cover this function
      (`backend/tests/unit/test_pipeline_graph_processing.py`).
- [x] **Phase 1 — Extract a `GraphView` interface.** ✅ **Done.** `GraphFilters`
      is decoupled from `ForceGraph3D` and `GraphRenderer` is the first
      implementation. See
      [002a-refactor-GraphFilters.md](./002a-refactor-GraphFilters.md).
- [ ] **Phase 2 — Add a view toggle.** URL hash (`#/2d`) or a `lil-gui`
      control in `GuiControls`. *Small.* Note `GuiControls` takes the concrete
      `GraphRenderer`, so this phase decides how 3D-specific settings behave
      when a non-3D view is active.
- [ ] **Phase 3 — Build the 2D renderer.** Data → diagram, render, pan/zoom,
      rebind click/hover for edges. *Medium.* Decide Mermaid vs Cytoscape
      first (see recommendation above).
- [ ] **Phase 4 — Reduction controls.** Component picker, focus depth,
      connection grouping, fan-out collapsing. *Medium — and this is the bulk
      of the real design work.*
- [ ] **Phase 5 — Optional: Mermaid export.** "Copy diagram source" button,
      independent of whichever library drives the interactive view.

---

## 🚧 Open Questions

- Mermaid or Cytoscape for the interactive 2D view — or Cytoscape for
  interaction plus Mermaid purely as an export format?
- Should the 2D view share the 3D view's search/filter state, or maintain its
  own? (Sharing is the cheaper and more consistent option.)
- Does the 2D view need auto-refresh, or is it a static snapshot? Auto-refresh
  with re-layout on every tick will be visually jarring in 2D in a way it is
  not in 3D.
- What is the actual connected-component count in a real 250-edge deployment?
  That number determines how much reduction work is genuinely needed.

---

## 📚 Key Files

- [backend/app/main.py](../backend/app/main.py) — `_process_jobs_to_graph()`,
  `/api/pipeline_graph`
- [backend/app/lib/ts.py](../backend/app/lib/ts.py) — `JobInfo`, `StorageNode`
- [frontend/src/graph/GraphView.ts](../frontend/src/graph/GraphView.ts) —
  the interface a 2D view must implement
- [frontend/src/graph/GraphFilters.ts](../frontend/src/graph/GraphFilters.ts) —
  `computeFilter()`, the shared filter seam
- [frontend/src/graph/GraphFilters.test.ts](../frontend/src/graph/GraphFilters.test.ts) —
  filter-semantics coverage, incl. a `FakeGraphView` worth copying for a 2D view
- [frontend/src/graph/GraphRenderer.ts](../frontend/src/graph/GraphRenderer.ts) —
  the 3D `GraphView` implementation
- [frontend/src/graph/graphUtils.ts](../frontend/src/graph/graphUtils.ts) —
  `endpointId()`, for resolving `string | GraphNode` link endpoints
- [frontend/src/graph/GraphColors.ts](../frontend/src/graph/GraphColors.ts) —
  palette to reuse in 2D
- [frontend/src/controls/JobsTable.ts](../frontend/src/controls/JobsTable.ts) —
  existing precedent for a non-3D consumer of filter state
- [frontend/src/main.ts](../frontend/src/main.ts) — wiring / view toggle point
