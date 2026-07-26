# visionOS Native App Specification (SwiftUI + RealityKit)

This specification outlines the architecture, feature requirements, and implementation plan for building a native **visionOS** application for **teraslice-3d** using SwiftUI and RealityKit.

---

## 1. Overview & Architecture

The visionOS native application will visualize Teraslice pipeline graph data directly within spatial computing environments. It communicates with the existing FastAPI backend (`/api/pipeline_graph`, `/api/jobs`, `/api/cache/clear`, `/api/version`) and renders interactive 3D spatial volumes and immersive spaces.

### Technical Stack
- **Target Platform**: visionOS 2.0+
- **UI Framework**: SwiftUI (Spatial Windows, Ornaments, Inspectors)
- **3D Engine**: RealityKit (ModelEntity, MeshResource, Custom Shaders, Emissive Materials)
- **Physics / Layout**: Swift-based 3D Force Layout simulation operating in abstract topological space ($\mathbb{R}^3$), dynamically projected onto volumetric window space ($V_{\text{target}} \approx 0.70\text{m}$).
- **Network Layer**: `URLSession` async/await client consuming the FastAPI backend

### Spatial Presentation Modes
1. **Volumetric Window (`Volume`)**: A bounded 3D spatial box (e.g., 1m × 1m × 1m) that can be placed on a desk or table, allowing users to rotate and inspect pipeline topologies.
2. **Immersive Space (`ImmersiveSpace`)**: An unbounded room-scale presentation allowing users to walk inside full data pipelines.
3. **Control Window (`WindowGroup`)**: Floating spatial 2D panel containing search, controls, status drawer, and inspector tables.

---

## 2. Feature Parity Matrix (Web Frontend → visionOS Native)

| Feature Category | Current Web App (`frontend/src`) | visionOS Native Implementation |
| :--- | :--- | :--- |
| **3D Rendering** | Three.js / `3d-force-graph` with sphere nodes & tube links | **RealityKit `ModelEntity`**: Spheres for nodes, cylinders/pipe meshes for job links. Dynamic thickness based on worker counts (`((workers - 1) / (200 - 1)) * (20 - 1) + 1`) and spatial scale $S$. |
| **Physics Simulation** | `d3-force-3d` unitless simulation with position-preserving reconciliation (`reconcileGraphData`) | **Pure Swift `ForceSimulation3D`**: Scale-agnostic unitless topology layout engine, position reconciliation on auto-refresh, decoupled from physical volume bounds. |
| **Node Coloring** | Color schemes for Kafka Incoming, Kafka Other, Elasticsearch | **RealityKit Materials**: Custom `SimpleMaterial` or `PhysicallyBasedMaterial` mapped to connector types. |
| **Link Status Colors** | Running, Starting, Stopped, Stopping, Failing, Default colors | Dynamic emissive materials driven by job status. |
| **Highlighting** | Three.js `OutlinePass` with customizable strength/glow/thickness | **RealityKit HoverEffect & Custom Shaders**: Spatial glow outline or emissive highlight on matched graph elements. |
| **Node Popovers** | HTML popover showing node ID, type, connected jobs, status summary | **SwiftUI Spatial Attachments (`ViewAttachmentEntity`)**: Hovering/gazing at nodes attaches floating 3D glassmorphic cards. |
| **Edge/Job Popovers**| HTML popover with job details, worker count, Teraslice/Grafana links | **SwiftUI Attachment Cards**: Includes direct links to open Grafana or Teraslice Web UIs in visionOS Safari. |
| **Search & Filtering**| Search bar with "Remove" non-matching or "Highlight" mode | **SwiftUI Search Field & Ornament**: Real-time node/link filtering; dims or removes unmatched entities in RealityKit space. |
| **Jobs & Connectors Inspector**| Bottom drawer with searchable, sortable tables for jobs & connectors | **SwiftUI Inspector Panel**: Floating list view. Selecting a row animates spatial focus / camera directly onto the entity. |
| **Auto-Refresh** | Polling timer (10s–300s) with live update check & status badge | **Swift `Task` / Timer Publisher**: Auto-updates RealityKit entity positions/materials with connection status indicator in UI ornament, preserving node positions. |
| **Cache Control** | Button calling `/api/cache/clear` | Action item in settings ornament triggering background cache flush. |
| **Custom Controls** | `lil-gui` panel for colors, outline parameters, and presets | **SwiftUI Controls Ornament**: Settings view with sliders, color pickers, and highlight preset buttons (Subtle, Normal, Intense). |

---

## 3. Spatial Computing UX Enhancements

- **Direct Spatial Interaction**:
  - **Gaze + Pinch**: Target nodes or links to open detail cards or highlight connected sub-pipelines.
  - **Direct Manipulation**: Grab and rotate the 3D volume using standard visionOS gesture controllers (`DragGesture`, `RotateGesture3D`).
- **Spatial Audio**:
  - Optional ambient spatial audio emitters attached to failing pipeline links to locate failing jobs directionally in room space.
- **Window Attachments & Ornaments**:
  - Control bar attached as a bottom ornament to the main 3D Volume for seamless spatial control.

---

## 4. Proposed Application Structure

```
Teraslice3D-visionOS/
├── App/
│   ├── Teraslice3DApp.swift         # Main App definition (WindowGroup, Volume, ImmersiveSpace)
│   └── AppState.swift              # Central Observable State
├── Models/
│   ├── GraphData.swift             # PipelineGraph, Node, Link JSON models
│   └── JobDetails.swift            # Teraslice Job specifications
├── Services/
│   ├── TerasliceAPIClient.swift    # FastAPI REST client async interface
│   └── ForceSimulation3D.swift     # Unitless 3D layout simulation engine
├── RealityKit/
│   ├── PipelineGraphEntity.swift   # Spatial volume projection & RealityKit scene graph manager
│   ├── NodeEntity.swift            # 3D Node Mesh & Material wrapper
│   └── LinkEntity.swift            # 3D Pipe Mesh & Emissive Material wrapper
└── Views/
    ├── PipelineVolumeView.swift    # RealityView 3D container
    ├── ControlOrnamentView.swift   # Search & Quick Actions ornament
    ├── JobsInspectorView.swift     # Detailed SwiftUI Jobs & Connectors list
    ├── SettingsView.swift          # Color & Highlight adjustments
    └── PopoverAttachmentView.swift # 3D View Attachment cards
```

---

## 5. Implementation Roadmap & Execution Status

Below is the chunked execution roadmap for building **Teraslice3D-visionOS**. Progress will be tracked directly in this section.

### 🔄 Implementation Progress Tracker
- [x] **Chunk 1: Project Setup, Data Models, Scrubbed Mock Engine & Network API Client** *(Verified & Working)*
- [ ] **Chunk 2: Unitless 3D Force-Directed Layout Engine & Position Reconciliation** *(Decoupling physical bounds clamping & adding reconciliation)*
- [ ] **Chunk 3: RealityKit Renderer, Dynamic Spatial Projection & Volumetric Container** *(Implementing bounding box centering & uniform scaling in PipelineGraphEntity)*
- [ ] **Chunk 4: Spatial UX, Ornaments, Popover Attachments & Inspector Drawer**

---

### **Chunk 1: Project Setup, Data Models, Scrubbed Mock Engine & API Client**
- **Status**: ✅ Verified & Working
- **Goal**: Establish visionOS project structure in `Teraslice3D-visionOS/` with Swift `@Observable` models, scrubbed offline mock data engine, `URLSession` async REST client, server settings, and jobs inspector.
- **Tasks & Deliverables**:
  1. [x] **Xcode Project Structure**: Set up native visionOS App project (`Teraslice3D.xcodeproj`) targeting visionOS 2.0+.
  2. [x] **Codable Data Models (`Models/`)**: Implement `GraphData.swift`, `JobDetails.swift`, `ServerConfig.swift`, and `ServerVersion.swift`.
  3. [x] **Scrubbed Mock Data Provider (`Models/MockGraphProvider.swift`)**: Offline dataset captured from live backend for testing.
  4. [x] **REST API Client (`Services/TerasliceAPIClient.swift`)**: `URLSession` async/await layer targeting `/api/pipeline_graph`, `/api/jobs`, `/api/cache/clear`, `/api/version` with local backend ATS support.
  5. [x] **Central App State (`App/AppState.swift`)**: `@Observable` manager for active server configuration, graph data, search/filter state, and auto-refresh task.

### **Chunk 2: Unitless 3D Force Simulation & Layout Engine**
- **Status**: 🔄 Updating for Unitless Physics & Position Reconciliation
- **Goal**: Build pure Swift scale-agnostic 3D force-directed layout engine and unit test suite.
- **Tasks & Deliverables**:
  1. [x] **3D Force Engine (`Services/ForceSimulation3D.swift`)**: Coulomb node repulsion, Hooke link attraction, velocity damping, and centering gravity.
  2. [ ] **Decouple Physical Volume Bounds**: Remove physical clamping from `tick()` and adjust parameters for scale-agnostic topological simulation space ($\mathbb{R}^3$).
  3. [ ] **Position-Preserving Reconciliation**: Preserve node coordinates and zero momentum on graph updates matching `reconcileGraphData`.
  4. [x] **Unit Tests (`Tests/`)**: Unit test suite verifying simulation setup, tick convergence, and topological stability.

### **Chunk 3: RealityKit Renderer, Volumetric Projection & Container**
- **Status**: 🔄 In Progress
- **Goal**: Render interactive 3D nodes and links inside visionOS RealityKit scene with dynamic bounding box spatial projection ($V_{\text{target}} \approx 0.70\text{m}$) inside a volumetric window.
- **Tasks & Deliverables**:
  1. [x] **Volumetric Container (`Views/PipelineVolumeView.swift`)**: Bounded spatial `Volume` verified working with baseline 3D green sphere.
  2. [ ] **Dynamic Spatial Projection (`RealityKit/PipelineGraphEntity.swift`)**: Bounding box centroid translation $\mathbf{C} = (\mathbf{min}+\mathbf{max})/2$ and uniform scaling $S = 0.70 / \text{maxExtent}$ applied to node/link transforms.
  3. [ ] **Node Entities (`RealityKit/NodeEntity.swift`)**: Sphere entities with color-coded materials and adaptive density scaling $R_{\text{node}} = R_{\text{base}} \cdot S / \sqrt{N/10}$.
  4. [ ] **Link Entities (`RealityKit/LinkEntity.swift`)**: Dynamic pipe meshes with worker count thickness scaling ($1 \dots 20$) multiplied by volume scale factor $S$.

### **Chunk 4: Spatial UX, Ornaments, Attachments & Inspector**
- **Status**: ⏳ Pending (Queued Backlog)
- **Goal**: Add floating glassmorphic ornaments, 3D spatial attachments, jobs inspector drawer, settings, and cache controls.
- **Tasks & Deliverables**:
  1. [x] **Control Ornament (`Views/ControlOrnamentView.swift`)**: Bottom ornament attached to volumetric window with search bar, filter toggle, refresh trigger, server selector, and settings sheet.
  2. [ ] **Jobs Inspector Drawer (`Views/JobsInspectorView.swift`)**: Searchable, sortable list view / spatial attachment displaying live backend jobs.
  3. [x] **Settings & Cache Control (`Views/SettingsView.swift`)**: Server CRUD and `/api/cache/clear` trigger.
  4. [ ] **Spatial 3D Attachments (`Views/PopoverAttachmentView.swift`)**: 3D info cards on gaze/pinch with action links for Safari.

---

## 6. Session Handover & Current Working Baseline

### 📌 Current Verified Working Baseline
- **Xcode Project**: `Teraslice3D-visionOS/Teraslice3D.xcodeproj` (visionOS 2.0+ App target with Bundle ID `com.teraslice.Teraslice3D` and App Transport Security enabled for `http://127.0.0.1:8000`).
- **Live Data & Backend**: Connected to FastAPI backend on `http://127.0.0.1:8000` (or fallback `MockGraphProvider`).
- **UI & Inspector**: Volumetric window opens with bottom ornament containing search bar, refresh trigger, server picker, settings sheet, and Jobs Inspector sheet (`JobsInspectorView.swift`).
- **3D RealityKit Baseline**: `PipelineVolumeView.swift` currently renders a baseline 3D sphere at `(0, 0, 0)` in `RealityView`, verified working in visionOS Simulator.

### 🎯 Immediate Execution Plan (Detailed in [TODO/avp-fix-volume-display.md](file:///Users/godber/ClaudeWorkspace/teraslice-3d/TODO/avp-fix-volume-display.md))
1. **Revert Physics Clamping & Reset Unitless Parameters** in `ForceSimulation3D.swift`.
2. **Implement Bounding Box Spatial Projection** $(\mathbf{p}_i - \mathbf{C}) \cdot S$ in `PipelineGraphEntity.swift`.
3. **Implement Worker & Density Adaptive Sizing** in `NodeEntity.swift` and `LinkEntity.swift`.
