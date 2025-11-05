# Issue #26: WebXR MVP Implementation Plan

## Overview
Implementing WebXR support for Apple Vision Pro with hand gesture-based object manipulation.

**Strategy**: Implement in 4 phases, review/stage commits after each phase, then submit as single PR with logical commit history.

---

## Phase 1: Foundation - Dependencies + XR Types + XRManager

**Goal**: Set up the basic WebXR infrastructure and session management

### Tasks
- [x] Add WebXR npm dependencies
  - `three-mesh-ui@^7.0.0`
  - `@webxr-input-profiles/motion-controllers@^1.0.0`
- [ ] Create `frontend/src/types/xr.ts` - XR TypeScript type definitions
- [ ] Create `frontend/src/xr/XRManager.ts` - WebXR session management
  - Detect WebXR support with hand tracking
  - Start/end spatial sessions
  - Enable XR on Three.js renderer
  - Handle session events
- [ ] Test build after Phase 1

**Commit Message**: "feat: add WebXR foundation (dependencies, types, session manager)"

---

## Phase 2: Hand Tracking & Gesture Recognition

**Goal**: Implement hand tracking and gesture detection system

### Tasks
- [ ] Create `frontend/src/xr/XRHandTracking.ts` - Hand tracking and gesture recognition
  - Setup hand tracking for both hands
  - Detect pinch gestures
  - Calculate hand positions and directions
  - Raycast from hand for object selection
  - Visual feedback for hands (optional ghost hands)
- [ ] Test build after Phase 2

**Commit Message**: "feat: add hand tracking and gesture recognition system"

---

## Phase 3: Object Manipulation & GraphRenderer Integration

**Goal**: Implement graph volume manipulation and integrate with existing renderer

### Tasks
- [ ] Create `frontend/src/xr/ObjectManipulation.ts` - Graph volume manipulation
  - Single-hand pinch translate
  - Two-hand pinch scale
  - Two-hand pinch rotate
  - Calculate bounding volume
  - Initial graph positioning
- [ ] Modify `frontend/src/graph/GraphRenderer.ts` - Add XR support methods
  - `enableXR()` - Enable WebXR mode on renderer
  - `getGraphContainer()` - Get graph container for manipulation
  - `disableOrbitControls()` / `enableOrbitControls()`
  - `getRenderer()`, `getScene()` accessors
- [ ] Test build after Phase 3

**Commit Message**: "feat: add object manipulation and XR renderer integration"

---

## Phase 4: UI Integration & Main Application

**Goal**: Wire everything together and add user-facing controls

### Tasks
- [ ] Modify `frontend/index.html` - Add "Enter Spatial" button and messaging
- [ ] Modify `frontend/src/main.ts` - Initialize XR system and wire up events
  - Initialize XRManager
  - Check for XR support and show/hide button
  - Handle enter/exit spatial mode
  - Connect hand tracking to object manipulation
  - Handle URL queuing for spatial mode
- [ ] Test build after Phase 4

**Commit Message**: "feat: complete WebXR MVP with UI integration"

---

## Phase 5: Final Testing & Validation

**Goal**: Run all tests, fix any issues, and validate the complete implementation

### Tasks
- [ ] Run frontend build: `cd frontend && npm install && npm run build && cd -`
- [ ] Run backend tests: `cd backend && uv add --group test pytest pytest-asyncio && uv run pytest && cd -`
- [ ] Fix any errors or failures
- [ ] Manual testing checklist:
  - [ ] "Enter Spatial" button appears/disappears based on WebXR support
  - [ ] Graceful fallback messaging
  - [ ] Test with WebXR Emulator extension (if available)
- [ ] Review all code for console.log statements, TODOs, etc.

**Commit Message**: "test: validate WebXR MVP implementation"

---

## Review Process Per Phase

After completing each phase:
1. **Review**: Check code quality, types, error handling
2. **Test Build**: Ensure `npm run build` succeeds
3. **Demo**: Show what's working (if testable)
4. **Stage**: Once approved, prepare for commit (don't commit yet)
5. **Move to Next Phase**

## Final PR Submission

After all phases complete and tested:
1. Create final PR with all commits
2. PR will show logical progression through phases
3. Each commit represents a complete, buildable state

---

## Success Criteria

Per Issue #26:
- [ ] "Enter Spatial" button appears on Vision Pro with hand tracking
- [ ] Can successfully enter spatial mode on Vision Pro
- [ ] Hand tracking initializes for both hands
- [ ] Graph is visible and positioned appropriately (1.5-2m in front, eye level)
- [ ] Pinch gesture detected reliably (< 100ms latency)
- [ ] Single-hand pinch-and-drag translates graph smoothly
- [ ] Two-hand pinch-and-spread scales graph proportionally
- [ ] Two-hand pinch-and-rotate rotates graph naturally
- [ ] Can pinch-select nodes/links with hand gesture
- [ ] Visual feedback (highlight) works when pointing at objects
- [ ] Manipulation feels responsive (no lag or jitter)
- [ ] Can exit spatial mode and return to desktop view
- [ ] No errors in console during spatial session
- [ ] Frame rate maintains 90fps on Vision Pro
- [ ] All disconnected subgraphs move together as one volume

---

## Current Phase: Phase 1
## Next Step: Create frontend/src/types/xr.ts
