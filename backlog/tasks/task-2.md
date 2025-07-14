# Task 2: Enhance filtering with outline highlighting

**Status**: Pending  
**Branch**: backlog-task2-outline-filter-enhancement

## Problem Statement
Current filtering completely removes non-matching nodes and links from the graph, which:
- Breaks visual context of the complete pipeline structure
- Causes jarring layout changes during filtering
- Makes it difficult to understand the full data flow

## Proposed Solution
Add Three.js OutlinePass post-processing as an **alternative** filtering mode alongside the existing hide/show behavior:
- **Remove mode** (existing): Completely hides non-matching nodes/links
- **Highlight mode** (new): Outlines matching nodes while keeping all nodes visible
- User selects filtering mode via dropdown in lil-gui controls
- Both modes preserve their respective advantages for different use cases

## Technical Implementation Plan

### Phase 1: Three.js Post-Processing Setup
- Import Three.js post-processing modules:
  - `EffectComposer` from 'three/addons/postprocessing/EffectComposer.js'
  - `RenderPass` from 'three/addons/postprocessing/RenderPass.js'  
  - `OutlinePass` from 'three/addons/postprocessing/OutlinePass.js'
- Use 3D Force Graph's `postProcessingComposer()` method to integrate OutlinePass
- Access internal Three.js objects via `Graph.scene()`, `Graph.camera()`, `Graph.renderer()`

### Phase 2: Filter Mode Selection
- Add dropdown control to lil-gui filtering section for mode selection:
  - "Remove" (default): Current hide/show behavior
  - "Highlight": New outline-based highlighting
- Modify `filterGraphData()` function to branch based on selected mode
- Preserve existing filtering logic for "Remove" mode

### Phase 3: Highlight Mode Implementation
- Create new filtering function for highlight mode
- Identify matching vs non-matching nodes based on search criteria
- Update `OutlinePass.selectedObjects` array with matching nodes
- Keep original graph data intact when in highlight mode

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
- [ ] Filter controls work for both node and link filtering in both modes
- [ ] Clear visual distinction between highlighted and normal nodes in highlight mode

## Technical Dependencies
- Three.js post-processing modules (already available in 3D Force Graph)
- 3D Force Graph library v1.77.0+ (already integrated)
- Compatible with existing lil-gui filtering controls

## Estimated Effort
Medium complexity - leverages existing Three.js infrastructure, main work is integrating post-processing pipeline and modifying filter logic.