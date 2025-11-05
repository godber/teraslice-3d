/**
 * XRHandTracking - Hand Tracking and Gesture Recognition
 *
 * Handles hand tracking including:
 * - Tracking both hands and their joint positions
 * - Detecting pinch gestures (thumb + index finger proximity)
 * - Calculating hand positions and directions
 * - Raycasting from hands for object selection
 * - Visual feedback for hand tracking
 */

import * as THREE from 'three';
import type {
  HandSide,
  HandState,
  PinchState,
  GestureThresholds,
  VisualFeedbackConfig,
  XREventCallbacks,
} from '../types/xr';
import { DEFAULT_GESTURE_THRESHOLDS, DEFAULT_VISUAL_FEEDBACK } from '../types/xr';

export class XRHandTracking {
  private leftHand: HandState;
  private rightHand: HandState;
  private thresholds: GestureThresholds;
  private visualConfig: VisualFeedbackConfig;
  private callbacks: XREventCallbacks;

  // Visual feedback objects
  private handVisuals: Map<HandSide, THREE.Group>;
  private raycastLines: Map<HandSide, THREE.Line>;

  // Raycaster for hand pointing
  private raycaster: THREE.Raycaster;

  // Last hovered objects for highlight management
  private lastHovered: Map<HandSide, THREE.Object3D | null>;

  constructor(
    callbacks: XREventCallbacks = {},
    thresholds: Partial<GestureThresholds> = {},
    visualConfig: Partial<VisualFeedbackConfig> = {}
  ) {
    this.callbacks = callbacks;
    this.thresholds = { ...DEFAULT_GESTURE_THRESHOLDS, ...thresholds };
    this.visualConfig = { ...DEFAULT_VISUAL_FEEDBACK, ...visualConfig };

    // Initialize hand states
    this.leftHand = this.createEmptyHandState();
    this.rightHand = this.createEmptyHandState();

    this.handVisuals = new Map();
    this.raycastLines = new Map();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.thresholds.raycastDistance;
    this.lastHovered = new Map();
  }

  /**
   * Setup hand tracking for both hands
   */
  setupHands(session: XRSession, scene: THREE.Scene): void {
    console.log('Setting up hand tracking');

    // Initialize visual feedback if enabled
    if (this.visualConfig.showHandModels) {
      this.initializeHandVisuals(scene);
    }

    if (this.visualConfig.showRaycast) {
      this.initializeRaycastVisuals(scene);
    }

    // Listen for input source changes to detect hands
    session.addEventListener('inputsourceschange', (event) => {
      // Process added input sources
      for (const source of event.added) {
        if (source.hand) {
          const handedness = source.handedness as HandSide;
          if (handedness === 'left' || handedness === 'right') {
            console.log(`Hand detected: ${handedness}`);
            const handState = handedness === 'left' ? this.leftHand : this.rightHand;
            handState.hand = source.hand;
            handState.inputSource = source;
            handState.isTracking = true;
          }
        }
      }

      // Process removed input sources
      for (const source of event.removed) {
        if (source.hand) {
          const handedness = source.handedness as HandSide;
          if (handedness === 'left' || handedness === 'right') {
            console.log(`Hand lost: ${handedness}`);
            const handState = handedness === 'left' ? this.leftHand : this.rightHand;
            handState.isTracking = false;
          }
        }
      }
    });

    // Check for existing input sources
    if (session.inputSources) {
      for (const source of session.inputSources) {
        if (source.hand) {
          const handedness = source.handedness as HandSide;
          if (handedness === 'left' || handedness === 'right') {
            const handState = handedness === 'left' ? this.leftHand : this.rightHand;
            handState.hand = source.hand;
            handState.inputSource = source;
            handState.isTracking = true;
            console.log(`Initial hand found: ${handedness}`);
          }
        }
      }
    }
  }

  /**
   * Update hand tracking state each frame
   */
  update(frame: XRFrame, referenceSpace: XRReferenceSpace): void {
    // Update both hands
    this.updateHand('left', this.leftHand, frame, referenceSpace);
    this.updateHand('right', this.rightHand, frame, referenceSpace);

    // Update visual feedback
    if (this.visualConfig.showHandModels) {
      this.updateHandVisuals();
    }
  }

  /**
   * Update a single hand's tracking state
   */
  private updateHand(
    side: HandSide,
    handState: HandState,
    frame: XRFrame,
    referenceSpace: XRReferenceSpace
  ): void {
    if (!handState.isTracking || !handState.hand) {
      return;
    }

    // Update joint positions
    const wristJoint = handState.hand.get('wrist');
    const thumbTip = handState.hand.get('thumb-tip');
    const indexTip = handState.hand.get('index-finger-tip');

    if (wristJoint && thumbTip && indexTip) {
      // Get joint poses
      const wristPose = frame.getJointPose?.(wristJoint, referenceSpace);
      const thumbPose = frame.getJointPose?.(thumbTip, referenceSpace);
      const indexPose = frame.getJointPose?.(indexTip, referenceSpace);

      if (wristPose && thumbPose && indexPose) {
        // Update joint positions
        const wristPos = new THREE.Vector3(
          wristPose.transform.position.x,
          wristPose.transform.position.y,
          wristPose.transform.position.z
        );
        const thumbPos = new THREE.Vector3(
          thumbPose.transform.position.x,
          thumbPose.transform.position.y,
          thumbPose.transform.position.z
        );
        const indexPos = new THREE.Vector3(
          indexPose.transform.position.x,
          indexPose.transform.position.y,
          indexPose.transform.position.z
        );

        handState.joints.set('wrist', wristPos);
        handState.joints.set('thumb-tip', thumbPos);
        handState.joints.set('index-finger-tip', indexPos);

        // Calculate hand direction (from wrist to index finger)
        handState.direction = indexPos.clone().sub(wristPos).normalize();

        // Update pinch state
        this.updatePinchState(side, handState, thumbPos, indexPos);
      }
    }
  }

  /**
   * Update pinch gesture detection
   */
  private updatePinchState(
    side: HandSide,
    handState: HandState,
    thumbPos: THREE.Vector3,
    indexPos: THREE.Vector3
  ): void {
    const distance = thumbPos.distanceTo(indexPos);
    const isPinching = distance < this.thresholds.pinchDistance;
    const wasPinching = handState.pinchState.isPinching;

    // Check for pinch start
    if (isPinching && !wasPinching) {
      const now = performance.now();

      // Apply debounce
      if (
        handState.pinchState.pinchStartTime === null ||
        now - handState.pinchState.pinchStartTime > this.thresholds.pinchDebounce
      ) {
        handState.pinchState.isPinching = true;
        handState.pinchState.pinchStartTime = now;
        handState.pinchState.pinchPosition = thumbPos.clone().add(indexPos).multiplyScalar(0.5);

        console.log(`Pinch started: ${side}`);

        // Trigger callback
        if (this.callbacks.onPinchStart) {
          this.callbacks.onPinchStart(side);
        }
      }
    }
    // Check for pinch end
    else if (!isPinching && wasPinching) {
      const now = performance.now();
      const pinchDuration = handState.pinchState.pinchStartTime
        ? now - handState.pinchState.pinchStartTime
        : 0;

      // Only register pinch end if it was held long enough
      if (pinchDuration > this.thresholds.pinchDebounce) {
        handState.pinchState.isPinching = false;
        handState.pinchState.pinchPosition = null;

        console.log(`Pinch ended: ${side}`);

        // Trigger callback
        if (this.callbacks.onPinchEnd) {
          this.callbacks.onPinchEnd(side);
        }
      }
    }
  }

  /**
   * Check if a specific hand is pinching
   */
  isPinching(hand: HandSide): boolean {
    const handState = hand === 'left' ? this.leftHand : this.rightHand;
    return handState.pinchState.isPinching;
  }

  /**
   * Get current hand position (wrist position)
   */
  getHandPosition(hand: HandSide): THREE.Vector3 | null {
    const handState = hand === 'left' ? this.leftHand : this.rightHand;
    if (!handState.isTracking) return null;

    return handState.joints.get('wrist') || null;
  }

  /**
   * Get pinch position (midpoint between thumb and index finger)
   */
  getPinchPosition(hand: HandSide): THREE.Vector3 | null {
    const handState = hand === 'left' ? this.leftHand : this.rightHand;
    return handState.pinchState.pinchPosition;
  }

  /**
   * Get hand direction vector (for pointing/raycasting)
   */
  getHandDirection(hand: HandSide): THREE.Vector3 | null {
    const handState = hand === 'left' ? this.leftHand : this.rightHand;
    if (!handState.isTracking) return null;

    return handState.direction.clone();
  }

  /**
   * Get distance between both hands
   */
  getHandSeparation(): number | null {
    const leftPos = this.getHandPosition('left');
    const rightPos = this.getHandPosition('right');

    if (!leftPos || !rightPos) return null;

    return leftPos.distanceTo(rightPos);
  }

  /**
   * Check if both hands are being tracked
   */
  areBothHandsTracked(): boolean {
    return this.leftHand.isTracking && this.rightHand.isTracking;
  }

  /**
   * Raycast from hand to find intersections with scene objects
   */
  raycastFromHand(hand: HandSide, scene: THREE.Scene): THREE.Intersection[] {
    const handPos = this.getHandPosition(hand);
    const handDir = this.getHandDirection(hand);

    if (!handPos || !handDir) return [];

    // Setup raycaster
    this.raycaster.set(handPos, handDir);

    // Raycast against scene objects
    const intersects = this.raycaster.intersectObjects(scene.children, true);

    // Update visual feedback for raycast
    if (this.visualConfig.showRaycast) {
      this.updateRaycastLine(hand, handPos, handDir);
    }

    // Update hover highlighting
    if (this.visualConfig.highlightOnHover) {
      this.updateHoverHighlight(hand, intersects);
    }

    return intersects;
  }

  /**
   * Get the closest object being pointed at by a hand
   */
  getPointedObject(hand: HandSide, scene: THREE.Scene): THREE.Object3D | null {
    const intersects = this.raycastFromHand(hand, scene);
    return intersects.length > 0 ? intersects[0].object : null;
  }

  /**
   * Check if either hand is tracking
   */
  isAnyHandTracked(): boolean {
    return this.leftHand.isTracking || this.rightHand.isTracking;
  }

  /**
   * Get hand state for debugging
   */
  getHandState(hand: HandSide): HandState {
    return hand === 'left' ? this.leftHand : this.rightHand;
  }

  /**
   * Update callbacks
   */
  setCallbacks(callbacks: XREventCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Create empty hand state
   */
  private createEmptyHandState(): HandState {
    return {
      hand: null,
      inputSource: null,
      joints: new Map(),
      pinchState: {
        isPinching: false,
        pinchStartTime: null,
        pinchPosition: null,
      },
      direction: new THREE.Vector3(0, 0, -1),
      isTracking: false,
    };
  }

  /**
   * Initialize visual feedback for hands (ghost hands)
   */
  private initializeHandVisuals(scene: THREE.Scene): void {
    // Create simple sphere representations for both hands
    const handGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    const leftHandMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ff00,
      transparent: true,
      opacity: 0.5
    });
    const rightHandMaterial = new THREE.MeshBasicMaterial({
      color: 0x0000ff,
      transparent: true,
      opacity: 0.5
    });

    const leftHandGroup = new THREE.Group();
    const leftHandMesh = new THREE.Mesh(handGeometry, leftHandMaterial);
    leftHandGroup.add(leftHandMesh);
    leftHandGroup.visible = false;

    const rightHandGroup = new THREE.Group();
    const rightHandMesh = new THREE.Mesh(handGeometry, rightHandMaterial);
    rightHandGroup.add(rightHandMesh);
    rightHandGroup.visible = false;

    scene.add(leftHandGroup);
    scene.add(rightHandGroup);

    this.handVisuals.set('left', leftHandGroup);
    this.handVisuals.set('right', rightHandGroup);
  }

  /**
   * Initialize raycast line visuals
   */
  private initializeRaycastVisuals(scene: THREE.Scene): void {
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3
    });

    for (const hand of ['left', 'right'] as HandSide[]) {
      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0, -1),
      ]);
      const line = new THREE.Line(lineGeometry, lineMaterial);
      line.visible = false;
      scene.add(line);
      this.raycastLines.set(hand, line);
    }
  }

  /**
   * Update visual feedback for hands
   */
  private updateHandVisuals(): void {
    for (const hand of ['left', 'right'] as HandSide[]) {
      const handState = hand === 'left' ? this.leftHand : this.rightHand;
      const visual = this.handVisuals.get(hand);

      if (!visual) continue;

      if (handState.isTracking) {
        const wristPos = handState.joints.get('wrist');
        if (wristPos) {
          visual.position.copy(wristPos);
          visual.visible = true;

          // Change color based on pinch state
          const mesh = visual.children[0] as THREE.Mesh;
          const material = mesh.material as THREE.MeshBasicMaterial;
          material.color.copy(
            handState.pinchState.isPinching
              ? this.visualConfig.pinchIndicatorColor
              : (hand === 'left' ? new THREE.Color(0x00ff00) : new THREE.Color(0x0000ff))
          );
        }
      } else {
        visual.visible = false;
      }
    }
  }

  /**
   * Update raycast line visual
   */
  private updateRaycastLine(hand: HandSide, origin: THREE.Vector3, direction: THREE.Vector3): void {
    const line = this.raycastLines.get(hand);
    if (!line) return;

    const endPoint = origin.clone().add(direction.multiplyScalar(2.0));
    const positions = [origin.x, origin.y, origin.z, endPoint.x, endPoint.y, endPoint.z];

    line.geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    line.visible = true;
  }

  /**
   * Update hover highlighting
   */
  private updateHoverHighlight(hand: HandSide, intersects: THREE.Intersection[]): void {
    const lastHoveredObj = this.lastHovered.get(hand);

    // Remove highlight from previously hovered object
    if (lastHoveredObj && lastHoveredObj.userData.originalColor) {
      const mesh = lastHoveredObj as THREE.Mesh;
      if (mesh.material && 'color' in mesh.material) {
        (mesh.material as any).color.copy(lastHoveredObj.userData.originalColor);
      }
    }

    // Highlight new object
    if (intersects.length > 0) {
      const obj = intersects[0].object;
      const mesh = obj as THREE.Mesh;

      if (mesh.material && 'color' in mesh.material) {
        // Store original color if not already stored
        if (!obj.userData.originalColor) {
          obj.userData.originalColor = (mesh.material as any).color.clone();
        }

        // Apply highlight
        (mesh.material as any).color.copy(this.visualConfig.highlightColor);
      }

      this.lastHovered.set(hand, obj);
    } else {
      this.lastHovered.set(hand, null);
    }
  }

  /**
   * Cleanup and remove visual feedback
   */
  cleanup(scene: THREE.Scene): void {
    // Remove hand visuals
    for (const visual of this.handVisuals.values()) {
      scene.remove(visual);
      visual.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => mat.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }

    // Remove raycast lines
    for (const line of this.raycastLines.values()) {
      scene.remove(line);
      line.geometry.dispose();
      if (Array.isArray(line.material)) {
        line.material.forEach(mat => mat.dispose());
      } else {
        line.material.dispose();
      }
    }

    this.handVisuals.clear();
    this.raycastLines.clear();
  }
}
