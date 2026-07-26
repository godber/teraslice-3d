# TODO: Fix 3D Volumetric Display Bounds & Dynamic Scaling

This TODO document outlines the architectural plan for decoupling the 3D layout simulation from the physical visionOS volumetric window display bounds, ensuring any pipeline graph (from 5 to 500+ nodes) centers and fits perfectly within the 1m × 1m × 1m volumetric window space ($[-0.5\text{m}, +0.5\text{m}]$). Specifications are aligned with the existing Three.js web application ([frontend/src/graph/GraphRenderer.ts](file:///Users/godber/ClaudeWorkspace/teraslice-3d/frontend/src/graph/GraphRenderer.ts)).

---

## 🎯 Architecture Goals
1. **Decouple Physics Simulation from Physical Units**: Revert `ForceSimulation3D` to operate in unitless, scale-agnostic topological simulation space ($\mathbb{R}^3$).
2. **Dynamic Volumetric Projection in RealityKit**: Perform global bounding box calculation, centering translation, and uniform scale projection inside `PipelineGraphEntity` / `PipelineVolumeView`.
3. **Adaptive Geometry & Worker-Based Sizing**: Scale node sphere radii and pipe mesh radii proportionally to fit graph density without visual overlap, incorporating worker-count scaling matching the web frontend.
4. **Smooth Topology Reconciliation**: Preserve node coordinates and zero momentum when updating graph topology on auto-refresh to prevent layout shift.

---

## 📋 Implementation Plan

### Phase 1: Revert `ForceSimulation3D` to Unitless Abstract Physics
- [x] **1.1. Remove Physical Volume Bounding Clamping**
  - Remove `boundsHalfWidth` clamping from `ForceSimulation3D.tick()` in [ForceSimulation3D.swift](file:///Users/godber/ClaudeWorkspace/teraslice-3d/Teraslice3D-visionOS/Sources/Services/ForceSimulation3D.swift).
  - Allow node positions to settle naturally based purely on topological forces.
- [x] **1.2. Reset Abstract Physics Parameters**
  - Reset Coulomb repulsion, Hooke link attraction, spring length, and centering gravity parameters to unitless simulation values (e.g. ideal link length $\approx 1.5$, repulsion strength $\approx 50.0$, spring strength $\approx 0.1$).
- [x] **1.3. Position-Preserving Reconciliation on Data Updates**
  - Implement topology reconciliation in `ForceSimulation3D` (matching web frontend `reconcileGraphData` in `GraphRenderer.ts`): preserve existing node positions $(x, y, z)$ and reset node velocities $(\mathbf{v} = \mathbf{0})$ when new graph data is loaded to prevent position resetting or velocity spikes.

---

### Phase 2: Volumetric Spatial Projection in `PipelineGraphEntity`
- [x] **2.1. Compute Full Bounding Box**
  - In `PipelineGraphEntity.updateGraph(_:)` and `stepSimulation()` in [PipelineGraphEntity.swift](file:///Users/godber/ClaudeWorkspace/teraslice-3d/Teraslice3D-visionOS/Sources/RealityKit/PipelineGraphEntity.swift), calculate the 3D bounding box across all simulation node coordinates $\mathbf{p}_i$:
    $$\mathbf{min} = (\min_i x_i, \min_i y_i, \min_i z_i), \quad \mathbf{max} = (\max_i x_i, \max_i y_i, \max_i z_i)$$
- [x] **2.2. Calculate Centering Translation Vector ($\mathbf{C}$)**
  - Compute the geometric centroid of the calculated layout:
    $$\mathbf{C} = \frac{\mathbf{min} + \mathbf{max}}{2}$$
- [x] **2.3. Compute Uniform Volumetric Scale Factor ($S$)**
  - Calculate maximum dimension extent:
    $$\text{maxExtent} = \max(\mathbf{max}_x - \mathbf{min}_x, \; \mathbf{max}_y - \mathbf{min}_y, \; \mathbf{max}_z - \mathbf{min}_z)$$
  - Calculate scale factor to target a safe display volume span $V_{\text{target}} \approx 0.70\text{m}$ inside the 1m³ volume window:
    $$S = \frac{V_{\text{target}}}{\max(\text{maxExtent}, 0.001)}$$
- [x] **2.4. Apply Spatial Transform to RealityKit Entities**
  - Position node entities and link pipe entities inside RealityKit using projected physical coordinates:
    $$\mathbf{p}_{\text{rendered}, i} = (\mathbf{p}_i - \mathbf{C}) \cdot S$$
  - Ensure `stepSimulation()` applies $(\mathbf{p}_i - \mathbf{C}) \cdot S$ frame-by-frame during ticks so continuous convergence remains visually centered and bounded inside $V_{\text{target}}$.

---

### Phase 3: Adaptive Geometry Scaling & Visual Verification
- [x] **3.1. Worker-Based Pipe Sizing & Adaptive Node Sizing**
  - **Worker Scaling Parity**: Implement worker-count pipe thickness scaling matching web frontend (`((workers - 1) / (200 - 1)) * (20 - 1) + 1`), scaled by volume factor $S$:
    $$R_{\text{pipe}} = \text{clamp}\left(R_{\text{base\_pipe}} \cdot \text{workerScale} \cdot S, \; 0.002\text{m}, \; 0.015\text{m}\right)$$
  - **Node Scaling**: Adjust `NodeEntity` sphere radii based on node density $N$ and spatial scale factor $S$:
    $$R_{\text{node}} = \text{clamp}\left(R_{\text{base\_node}} \cdot S \cdot \frac{1}{\sqrt{\max(N/10, 1)}}, \; 0.008\text{m}, \; 0.035\text{m}\right)$$
- [x] **3.2. Verification across Small vs. Large Graphs**
  - Verify layout centering and volume bounds fitting with small mock graphs (5-10 nodes).
  - Verify layout stability and scale fitting with larger multi-connector pipeline topologies (50-500+ nodes).
- [x] **3.3. Unit Test Verification**
  - Update `Teraslice3DTests` suite ([Teraslice3DTests.swift](file:///Users/godber/ClaudeWorkspace/teraslice-3d/Teraslice3D-visionOS/Tests/Teraslice3DTests/Teraslice3DTests.swift)) to verify bounding box centroid centering, uniform volumetric scale projection within $V_{\text{target}} \le 0.70\text{m}$, and worker/density-based geometry scaling.
