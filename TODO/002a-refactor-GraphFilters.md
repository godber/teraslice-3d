# TODO: Refactor `GraphFilters` — Extract a `GraphView` Interface

Carved out of [002-add-mermaid-view.md](./002-add-mermaid-view.md) ("The One
Real Refactor" / Phase 1).

**Status: ✅ COMPLETE.** Implemented on branch `refactor-GraphFilters`. All
acceptance criteria met, typecheck + build + tests green, manual smoke test
passed. See [Implementation Notes](#-implementation-notes) at the bottom for
what landed differently from this plan.

This refactor stands on its own. It is worth doing whether or not we ever ship
a 2D view: it removes Three.js from the filter layer, gives the filter logic a
testable seam, and consolidates two overlapping wiring methods into one.

---

## 🎯 Goal

`GraphFilters` currently owns two things that do not belong together:

1. **Filter semantics** — `computeFilter()`, the documented single source of
   truth shared by the 3D graph, the jobs table, and the connectors table.
2. **3D rendering mechanics** — holding a `ForceGraph3D` instance, reading and
   writing `graph.graphData()`, and walking the Three.js scene graph to find
   meshes to outline.

Split them. After the refactor `GraphFilters` talks to a narrow `GraphView`
interface and imports nothing from `three` or `3d-force-graph`.

---

## 📍 Current Coupling — Exactly Where It Lives

All in [frontend/src/graph/GraphFilters.ts](../frontend/src/graph/GraphFilters.ts):

| Line(s) | Coupling |
| --- | --- |
| 3 | `import * as THREE from 'three'` |
| 2 | `import { GraphRenderer }` — concrete class, not an interface |
| 22–23, 126–132 | Two parallel handles: `graph` (`ForceGraph3D`) *and* `graphRenderer`, set by two separate methods |
| 147, 153–155 | `filterGraphData()` reads `this.graph.graphData()` and decides whether to reset it |
| 176 | `applyRemoveMode()` writes `this.graph.graphData({nodes, links})` |
| 186–189 | `applyHighlightMode()` repeats the same read/compare/reset dance |
| 201–220 | `applyHighlightMode()` traverses `this.graph.scene()`, tests `child.isMesh` / `child.__graphObjType` / `child.__data`, and hands `THREE.Object3D[]` to `graphRenderer.highlightObjects()` |

The scene traversal at 201–220 is the important one. It re-derives, in
Three.js terms, a rule `computeFilter()` already expresses in data terms ("a
link is included when both endpoints are"). That duplicated rule is the actual
smell — a second view would have to duplicate it a third time.

**Callers today** ([frontend/src/main.ts](../frontend/src/main.ts):36–37) are
the only place `setGraph()` / `setGraphRenderer()` are used. `SearchBar`,
`JobsTable`, and `GuiControls` touch only filter-level API
(`filterGraphData`, `setFilterMode`, `getFilteredLinks`, `getFilteredNodes`,
`onFilterChange`, `clearFilters`, `getFilterState`) and need no changes.

---

## 🧩 Proposed Interface

New file: `frontend/src/graph/GraphView.ts`

```ts
import { GraphData } from '../types/graph.js';

/**
 * The contract a renderer must satisfy to be driven by GraphFilters and
 * main.ts. Deliberately expressed in graph-data terms (ids, nodes, links) —
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
```

### Why `highlight(nodeIds)` and not `highlightObjects(THREE.Object3D[])`

This is the crux of the refactor. `GraphFilters` says *what* is interesting;
the view decides *how* to make it look interesting. The 3D view keeps its
scene traversal and `OutlinePass`; a future 2D view adds a CSS class or a
Cytoscape class. The "both endpoints included" link rule lives in exactly one
place — inside the implementation, derived from the node-id set it was given.

### Why `setVisibleData()` absorbs the reset-avoidance check

The `currentData.nodes?.length !== originalData.nodes?.length` comparisons at
lines 153–155 and 186–189 exist to avoid calling `graphData()` needlessly,
because that restarts the force simulation and visibly jolts the layout. That
is a 3D-renderer concern and the filter layer should not know about it.

Move it into `GraphRenderer.setVisibleData()` and make the check **reference
identity** rather than counts:

```ts
if (data.nodes === this.visibleNodes && data.links === this.visibleLinks) return;
```

This is strictly safer than the count comparison. `computeFilter()` returns
the original arrays by reference for an empty search term and freshly built
arrays from `.filter()` otherwise, so identity distinguishes "nothing changed"
from "different subset, same size" — which counts alone cannot. Track the refs
in `loadData()`, `updateData()`, and `setVisibleData()`.

---

## 🔨 Change List

### 1. `frontend/src/graph/GraphView.ts` — new

The interface above. No implementation, no runtime cost.

### 2. `frontend/src/graph/GraphRenderer.ts`

- Declare `export class GraphRenderer implements GraphView`.
- Add `setVisibleData(data)` — the identity check plus `this.graph.graphData(data)`.
- Add `highlight(nodeIds: ReadonlySet<string>)` — move the scene traversal
  from `GraphFilters.applyHighlightMode()` (lines 201–220) here verbatim,
  ending in the existing `this.highlightObjects(objectsToHighlight)`.
  The `endpointId()` helper moves too, or is exported from a shared module
  since both files need it (see step 5).
- Add a private `visibleNodes` / `visibleLinks` pair, updated by `loadData()`,
  `updateData()`, and `setVisibleData()`.
- Narrow `highlightObjects()` to `private` — after this change `GraphFilters`
  is no longer a caller, and nothing else in the codebase is.
- Leave everything else alone. `getOutlinePass()`, `updateOutlineSettings()`,
  `reheat()`, `setDirectionalParticles()`, `updateBackgroundColor()`, and
  `getGraph()` stay public for `GuiControls`; they are 3D-specific and stay
  off the `GraphView` interface.

### 3. `frontend/src/graph/GraphFilters.ts`

- Delete the `three` and `GraphRenderer` imports. (`noUnusedLocals` is on in
  `tsconfig.json`, so a stale import fails the typecheck — good.)
- Replace the `graph` and `graphRenderer` fields with one `view: GraphView | null`.
- Replace `setGraph()` and `setGraphRenderer()` with `setView(view: GraphView)`.
- `setFilterMode()` → `this.view?.clearHighlights()`.
- `filterGraphData('')` → `this.view.setVisibleData(this.originalData)` then
  `this.view.clearHighlights()`.
- `applyRemoveMode()` → `computeFilter()`, then
  `this.view.setVisibleData({nodes, links})` and `this.view.clearHighlights()`.
- `applyHighlightMode()` → `this.view.setVisibleData(this.originalData!)` then
  `this.view.highlight(this.computeFilter(searchTerm).nodeIds)`. The method
  shrinks from ~35 lines to ~5.
- `computeFilter()`, `getFilteredLinks()`, `getFilteredNodes()`,
  `onFilterChange()`, `notifyFilterChange()`, `clearFilters()`, and the
  `notifyFilterChange()` call ordering are **unchanged**. That is the whole
  point — the filter semantics are not being touched.

### 4. `frontend/src/main.ts`

- `graphFilters.setGraph(graphRenderer.getGraph()); graphFilters.setGraphRenderer(graphRenderer);`
  collapses to `graphFilters.setView(graphRenderer);`.
- Optionally type the local as `const view: GraphView = graphRenderer` and use
  it in the `AutoRefresh` callback, so the refresh path is view-agnostic too.
  `GuiControls` still needs the concrete `GraphRenderer` — that is fine and
  expected until a view toggle exists.

### 5. Shared `endpointId()`

`endpointId()` (`GraphFilters.ts`:16–18) is needed by both files after the
move. Either export it from `frontend/src/types/graph.ts` (it is a pure
accessor over `GraphLink`'s `string | GraphNode` endpoints) or put it in a
small `frontend/src/graph/graphUtils.ts`. `GraphRenderer` already open-codes
the same `typeof x === 'object' ? x.id : x` pattern in five places
(`reconcileGraphData`, `hasTopologyChanged`, `updatePropertiesInPlace`), so
exporting it and using it there is a cheap, in-scope tidy-up.

---

## ✅ Acceptance Criteria

- [x] `GraphFilters.ts` imports nothing from `three` or `3d-force-graph`.
- [x] `GraphFilters` references no `ForceGraph3D` API (`graphData()`, `scene()`).
- [x] `GraphRenderer implements GraphView` compiles under `strict`.
- [x] Behaviour is byte-for-byte equivalent to today for: empty search,
      Highlight mode, Remove mode, mode switching mid-search, Clear, and
      auto-refresh with an active search term.
- [x] No changes required in `SearchBar.ts` or `JobsTable.ts`. **`GuiControls.ts`
      did change** — see Implementation Notes.

---

## 🧪 Verification

Vitest was added as part of this change (see Implementation Notes), so
verification is now tests + typecheck + build:

```bash
cd frontend && npm test && npm run build && cd -
```

`npm run build` is now `npm run typecheck && vite build`, so it typechecks —
`npm run typecheck` runs that step alone.

Manual smoke test against a live backend, exercising each acceptance-criteria
path above. Pay particular attention to two regressions this refactor could
plausibly introduce:

1. **Layout jolt on every keystroke** — means the `setVisibleData()` identity
   check is not matching when it should.
2. **Stale highlights after switching Highlight → Remove → Highlight** — means
   a `clearHighlights()` call was dropped in the move.

Both were checked manually and both are clean. Both also have unit coverage at
the filter seam (the tests assert `originalData` is passed *by reference* so
the identity check can fire, and assert `clearHighlights()` across the
Highlight → Remove → Highlight sequence). What the tests cannot reach is
`GraphRenderer` itself — `setVisibleData()`'s identity check against the real
`graphData()` and the scene traversal in `highlight()` both need WebGL, so the
manual pass remains the only coverage there.

---

## 📏 Scope

**In:** `GraphView.ts` (new), `GraphRenderer.ts`, `GraphFilters.ts`,
`main.ts`, and optionally a shared `endpointId()`.

**Out:** any 2D renderer, any view toggle, `GuiControls` genericization,
backend node-ordering stabilization (that is Phase 0 in
[002](./002-add-mermaid-view.md) and independent of this work), and any change
to filter semantics.

Estimate: small/medium. Mostly moving code, one method with real thought in it
(`setVisibleData`).

---

## 📝 Implementation Notes

What landed, and where it diverged from the plan above.

### As planned

- `frontend/src/graph/GraphView.ts` — the interface, verbatim.
- `frontend/src/graph/graphUtils.ts` — shared `endpointId()`. Chose a new
  module over `types/graph.ts`, which is types-only and shouldn't carry runtime
  code. Also did the suggested tidy-up: the five open-coded
  `typeof x === 'object' ? x.id : x` copies in `GraphRenderer` now go through
  it, behind a module-level `linkKey()` helper shared by `reconcileGraphData()`,
  `hasTopologyChanged()`, and `updatePropertiesInPlace()`.
- `GraphFilters` — one `view: GraphView | null`, `setView()`, no `three` or
  `3d-force-graph` reference of any kind. `applyHighlightMode()` went from 35
  lines to 3. `computeFilter()` and the `notifyFilterChange()` ordering are
  untouched.
- `GraphRenderer` — `implements GraphView`, gained `setVisibleData()` and
  `highlight(nodeIds)`, `highlightObjects()` narrowed to `private`. The
  reference-identity check is centralized in a private `trackVisible()` called
  from `loadData()`, `updateData()` (all four return paths), and
  `setVisibleData()`.
- `main.ts` — collapsed to `graphFilters.setView(view)`, and the `AutoRefresh`
  callback goes through a `const view: GraphView = graphRenderer` local as the
  plan suggested.

### Divergences

**1. `tsc --noEmit` was already failing on `main` — 8 pre-existing errors.**
The plan assumed it was clean. Gating `build` on it meant fixing them first:

- 7 in `GraphRenderer.init()`. Root cause is upstream: `3d-force-graph`'s
  `ForceGraph3DInstance` is a *circular* type alias
  (`type X<N,L> = Generic<X<N,L>, N, L>`), so the fluent chain loses its type
  after the first accessor call and `.nodeRelSize` fails to resolve. Fixed by
  typing the constructor result as `any` — consistent with the existing
  `private graph: any` field — and annotating the six callback params. No
  runtime change. Worth revisiting if upstream fixes the type.
- 1 in `GuiControls.ts`: the `graphFilters` field was assigned in the
  constructor and never read — fully dead. Removed the field *and* the
  constructor param, so `main.ts` now calls
  `new GuiControls(graphRenderer, autoRefresh)`. This is why the
  "no changes in `GuiControls.ts`" criterion above is qualified. Unrelated to
  the refactor itself; it was just the last thing standing between the repo and
  a clean typecheck.

**2. `GraphRenderer.getGraph()` now has zero callers.** The plan said to keep it
public for `GuiControls`, but `GuiControls` never used it — `main.ts` was the
only caller and that line is gone. Left in place rather than widen the diff;
a candidate for deletion whenever `GraphRenderer` is next touched.

**3. Vitest was added, and the "optional" test work was done up front.** 23
tests across `GraphFilters.test.ts` (21) and `graphUtils.test.ts` (2), covering
every case the plan listed plus: no-data, no-match, endpoints already resolved
to `GraphNode` objects by 3d-force-graph, the empty-term reference-identity
contract that `setVisibleData()` depends on, and the two named regression paths
driven through a `FakeGraphView`.

**4. Frontend scripts.** `typecheck` / `test` / `test:watch` added;
`build` is now `npm run typecheck && vite build`. This also means the Docker
frontend stage typechecks — `npm ci` installs devDependencies, so `tsc` is
present. `CLAUDE.md` was updated to match.
