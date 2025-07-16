---
id: task-5
title: Enhance filtering with outline highlighting
status: To Do
assignee: []
created_date: '2025-07-16'
labels: []
dependencies: []
---

## Problem Statement

Current filtering completely removes non-matching nodes and links from the graph, which:

- Breaks visual context of the complete pipeline structure
- Causes jarring layout changes during filtering
- Makes it difficult to understand the full data flow

## Current Implementation

The application now uses a **unified search approach** with a single search box that filters both nodes and links simultaneously:

- **Location**: Frontend built with Vite (`frontend/src/`)
- **UI**: Single "Search" input field in lil-gui filtering panel
- **Logic**: Case-insensitive search across node IDs and link names (`GraphFilters.js`)
- **Behavior**: "Remove" mode only - non-matching elements are hidden from view
- **Connectivity**: Preserves links between visible nodes and includes nodes connected to matching links

## Proposed Solution

Add Three.js OutlinePass post-processing as an **alternative** filtering mode alongside the existing hide/show behavior:

- **Remove mode** (existing): Completely hides non-matching nodes/links
- **Highlight mode** (new): Outlines matching nodes while keeping all nodes visible
- User selects filtering mode via dropdown in lil-gui controls
- Both modes preserve their respective advantages for different use cases

## Technical Implementation Plan

### Phase 1: Three.js Post-Processing Setup

- **Renderer Requirement**: OutlinePass requires `THREE.WebGLRenderer` ✅ *Already satisfied by 3D Force Graph library*
- **EffectComposer Integration**: ✅ *3D Force Graph creates EffectComposer by default - reuse existing one*
- Import Three.js post-processing modules:
  - `EffectComposer` from 'three/addons/postprocessing/EffectComposer.js'
  - `RenderPass` from 'three/addons/postprocessing/RenderPass.js'
  - `OutlinePass` from 'three/addons/postprocessing/OutlinePass.js'
  - `OutputPass` from 'three/addons/postprocessing/OutputPass.js' (if needed)
- **Critical**: Use existing composer via `Graph.postProcessingComposer()` instead of creating new one
- Add custom passes to existing composer using `composer.addPass()`
- Access internal Three.js objects via `Graph.scene()`, `Graph.camera()`, `Graph.renderer()`

### Phase 2: Filter Mode Selection

- Add dropdown control to lil-gui filtering section for mode selection:
  - "Remove" (default): Current hide/show behavior  
  - "Highlight": New outline-based highlighting
- Modify `filterGraphData()` function in `frontend/src/graph/GraphFilters.js` to branch based on selected mode
- Update `setupFilterControls()` in `frontend/src/controls/GuiControls.js` to include mode dropdown
- Preserve existing unified search logic for "Remove" mode

### Phase 3: Highlight Mode Implementation

- Create new filtering function for highlight mode in `GraphFilters.js`
- Identify matching vs non-matching nodes based on unified search criteria (node IDs and link names)
- Update `OutlinePass.selectedObjects` array with matching nodes and connected elements
- Keep original graph data intact when in highlight mode (no removal of nodes/links)
- Integrate with existing `GraphRenderer.js` for 3D graph updates

### Phase 4: Outline Configuration

- Configure OutlinePass parameters for optimal visibility:
  - `edgeStrength`: Control outline intensity
  - `edgeGlow`: Add subtle glow effect
  - `edgeThickness`: Set appropriate outline width
  - `visibleEdgeColor`: Bright color for matching nodes (e.g., cyan/magenta)
  - `hiddenEdgeColor`: Same or transparent for consistency

### Phase 5: Enhanced UX Features

- Add outline configuration controls to lil-gui interface
- Allow users to adjust outline appearance in real-time
- Consider different outline colors for node vs link filtering
- Add fade/transparency effects for non-matching elements (optional)

## Acceptance Criteria

- [ ] Dropdown control allows user to select between "Remove" and "Highlight" filter modes
- [ ] "Remove" mode preserves existing hide/show filtering behavior
- [ ] "Highlight" mode keeps all nodes visible with outline highlighting on matches
- [ ] Graph topology and layout remain stable during highlight mode filtering
- [ ] Performance remains acceptable with post-processing enabled
- [ ] Unified search box works for both node and link filtering in both modes
- [ ] Clear visual distinction between highlighted and normal nodes in highlight mode

## Technical Dependencies

- **THREE.WebGLRenderer** (✅ already used by 3D Force Graph library)
- **EffectComposer** (✅ already created by 3D Force Graph - must reuse existing instance)
- Three.js post-processing modules (already available in 3D Force Graph)
- 3D Force Graph library v1.77.0+ (already integrated)
- Compatible with existing lil-gui filtering controls
- Vite build system (already configured in `frontend/`)
- Current modular architecture with `GraphFilters.js`, `GuiControls.js`, and `GraphRenderer.js`

## Implementation Notes (Added 2025-07-16)

✅ **Post-processing Integration Verified**: Successfully implemented OutlinePass test functionality:
- 3D Force Graph v1.77.0 creates its own EffectComposer by default with RenderPass
- **Critical finding**: Must use existing composer via `graph.postProcessingComposer()` instead of creating new one
- Custom passes (OutlinePass, ShaderPass) can be added using `composer.addPass()`
- Test implementation shows sepia effect and outline highlighting working correctly

## Estimated Effort

Medium complexity - leverages existing Three.js infrastructure. Post-processing integration is now proven to work, main remaining work is modifying filter logic and UI controls.
