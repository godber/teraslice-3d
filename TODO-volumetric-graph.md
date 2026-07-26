# TODO: 3D Volumetric Node Graph Display

This TODO document focuses exclusively on getting the **3D Volumetric Container (`PipelineVolumeView`)** to correctly render and animate dynamic node graphs using **RealityKit** and **`ForceSimulation3D`** in visionOS.

---

## 🎯 Primary Goal
Transition from the current hardcoded 2-node mock display in `PipelineVolumeView.swift` to full, dynamic rendering of pipeline graphs (`AppState.graphData`), positioned by `ForceSimulation3D` within the bounded 1m × 1m × 1m volumetric window space ($[-0.4\text{m}, +0.4\text{m}]$).

---

## 📋 Focused Task List

### Phase 1: Scene Graph & State Integration
- [x] **1.1. Replace Mock Setup with `PipelineGraphEntity` in `RealityView`**
  - Update `PipelineVolumeView.swift` to instantiate and embed `PipelineGraphEntity` as the root entity in `RealityView { content in ... }`.
  - Remove hardcoded static Phase 2 test nodes (`node1`, `node2`) and single link pipe.
- [x] **1.2. Wire Data Flow from `AppState`**
  - Trigger `graphEntity.updateGraph(appState.graphData)` on view load and whenever `appState.graphData` changes.
  - Ensure previous RealityKit child entities (`NodeEntity`, `LinkEntity`) are cleanly cleared before rebuilding the scene graph.

---

### Phase 2: Dynamic 3D Node Entity Rendering & Material Mapping
- [ ] **2.1. Dynamic Sphere Instantiation**
  - Generate a `NodeEntity` (sphere mesh) for every node in `graphData.nodes`.
  - Apply radius differentiation ($0.06\text{m}$ for incoming connector topics, $0.04\text{m}$ for internal/outgoing connectors).
- [ ] **2.2. Connector Type Color & Material Mapping**
  - Apply `SimpleMaterial` colors to nodes based on `connectorType`:
    - `kafkaIncoming` / `kafkaOther` (incoming): Yellow (`systemYellow`)
    - `kafkaOther` (internal/outgoing): Blue (`systemBlue`)
    - `elasticsearch`: Green (`systemGreen`)
    - `dataGenerator`: Purple (`systemPurple`)
    - `noop` / `unknown`: Gray (`systemGray`)

---

### Phase 3: Dynamic 3D Link Entity (Pipe Mesh) Geometry & Alignment
- [ ] **3.1. Pipe Mesh Cylinder Generation**
  - Compute distance $L = \|\text{targetPos} - \text{sourcePos}\|$ and midpoint $\mathbf{p}_{\text{mid}} = \frac{\text{sourcePos} + \text{targetPos}}{2}$.
  - Generate dynamic cylinder mesh `MeshResource.generateCylinder(height: L, radius: r)`.
  - Scale pipe radius $r$ based on worker count ($1\text{--}200$ workers $\to 0.005\text{m}\text{--}0.025\text{m}$).
- [ ] **3.2. Vector Orientation & Quaternion Alignment**
  - Orient cylinder default Y-axis vector $(0, 1, 0)$ along the normalized direction vector $\hat{\mathbf{d}} = \frac{\text{targetPos} - \text{sourcePos}}{\|\text{targetPos} - \text{sourcePos}\|}$.
  - Handle parallel/antiparallel vector edge cases cleanly to prevent NaN quaternions or mesh flipping.
- [ ] **3.3. Job Status Color Mapping**
  - Apply status colors to `LinkEntity` materials based on `link.status`:
    - `running`: Green (`systemGreen`)
    - `starting`: Blue (`systemBlue`)
    - `stopped` / `stopping`: Orange (`systemOrange`)
    - `failing` / `failed`: Red (`systemRed`)
    - `completed`: Purple (`systemPurple`)
- [ ] **3.4. Transform Update Method**
  - Implement `linkEntity.updateTransform(sourcePos:targetPos:)` to update position and quaternion orientation during layout ticks without recreating mesh resources.

---

### Phase 4: 3D Force-Directed Simulation Loop & Volume Bounding
- [ ] **4.1. Simulation Engine Integration**
  - Wire `ForceSimulation3D` to calculate 3D spatial coordinates for all nodes in `graphData`.
  - Execute initial warm-up layout ticks ($120$ iterations) upon loading graph data.
- [ ] **4.2. Continuous Animation Ticks**
  - Subscribe to frame updates (`SceneEvents.Update` or continuous tick loop) to update node positions and link transforms smoothly in real time.
- [ ] **4.3. Spatial Volume Clamping**
  - Enforce spatial bounding box constraints in `ForceSimulation3D`:
    $$x, y, z \in [-0.4\text{m}, +0.4\text{m}]$$
  - Verify that node spheres and link pipes remain strictly within the 1m³ spatial volume container without clipping.

---

### Phase 5: Visual Verification & Graph Topology Edge Cases
- [ ] **5.1. Visual Inspection in visionOS Simulator**
  - Verify that multi-node pipeline graphs render accurately with distinct 3D spatial positions.
  - Verify connecting pipe cylinders accurately connect source node centers to target node centers.
- [ ] **5.2. Edge Case Topology Handling**
  - Verify layout rendering with disconnected subgraphs / isolated nodes.
  - Verify stability with sparse single-job pipelines vs dense multi-connector pipelines.

---

## 🛠 Core Volumetric Components Reference

- [PipelineVolumeView.swift](file:///Users/godber/ClaudeWorkspace/teraslice-3d/Teraslice3D-visionOS/Sources/Views/PipelineVolumeView.swift) - Main spatial `RealityView` container window
- [PipelineGraphEntity.swift](file:///Users/godber/ClaudeWorkspace/teraslice-3d/Teraslice3D-visionOS/Sources/RealityKit/PipelineGraphEntity.swift) - Root scene graph managing node and link entities
- [NodeEntity.swift](file:///Users/godber/ClaudeWorkspace/teraslice-3d/Teraslice3D-visionOS/Sources/RealityKit/NodeEntity.swift) - RealityKit sphere entity representation for graph nodes
- [LinkEntity.swift](file:///Users/godber/ClaudeWorkspace/teraslice-3d/Teraslice3D-visionOS/Sources/RealityKit/LinkEntity.swift) - RealityKit cylinder pipe mesh representation for graph links
- [ForceSimulation3D.swift](file:///Users/godber/ClaudeWorkspace/teraslice-3d/Teraslice3D-visionOS/Sources/Services/ForceSimulation3D.swift) - Pure Swift 3D layout simulation engine
