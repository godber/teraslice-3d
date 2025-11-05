/**
 * ObjectManipulation - Graph Volume Manipulation
 *
 * Handles manipulation of the entire graph volume using hand gestures:
 * - Single-hand pinch: Translate (move) the graph
 * - Two-hand pinch + spread/contract: Scale (zoom)
 * - Two-hand pinch + rotate: Rotate the graph
 *
 * All disconnected subgraphs are treated as a single volume.
 */

import * as THREE from 'three';
import type { XRHandTracking } from './XRHandTracking';
import type {
  ManipulationMode,
  GestureStartState,
  GestureThresholds,
  GraphPositionConfig,
} from '../types/xr';
import { DEFAULT_GESTURE_THRESHOLDS, DEFAULT_GRAPH_POSITION } from '../types/xr';

export class ObjectManipulation {
  private graphContainer: THREE.Object3D;
  private mode: ManipulationMode = 'idle';
  private gestureStartState: GestureStartState | null = null;
  private thresholds: GestureThresholds;
  private positionConfig: GraphPositionConfig;
  private boundingBox: THREE.Box3 | null = null;

  // Track which hand initiated single-hand manipulation
  private activeHand: 'left' | 'right' | null = null;

  constructor(
    graphContainer: THREE.Object3D,
    thresholds: Partial<GestureThresholds> = {},
    positionConfig: Partial<GraphPositionConfig> = {}
  ) {
    this.graphContainer = graphContainer;
    this.thresholds = { ...DEFAULT_GESTURE_THRESHOLDS, ...thresholds };
    this.positionConfig = { ...DEFAULT_GRAPH_POSITION, ...positionConfig };
  }

  /**
   * Update manipulation state each frame based on hand tracking
   */
  update(handTracking: XRHandTracking): void {
    const leftPinching = handTracking.isPinching('left');
    const rightPinching = handTracking.isPinching('right');

    // Update manipulation mode based on pinch states
    this.updateMode(leftPinching, rightPinching);

    // Perform manipulation based on current mode
    switch (this.mode) {
      case 'translate':
        this.handleTranslate(handTracking);
        break;
      case 'scale':
        this.handleScale(handTracking);
        break;
      case 'rotate':
        this.handleRotate(handTracking);
        break;
      case 'idle':
        // No manipulation
        break;
    }
  }

  /**
   * Determine which manipulation mode to enter based on pinch states
   */
  private updateMode(leftPinching: boolean, rightPinching: boolean): void {
    const bothPinching = leftPinching && rightPinching;
    const onePinching = leftPinching || rightPinching;

    const previousMode = this.mode;

    if (bothPinching) {
      // Two hands pinching - scale and rotate mode
      // We'll determine which operation based on hand movement in the handlers
      if (previousMode === 'idle') {
        this.mode = 'scale';
        this.captureGestureStartState('left', 'right');
      }
    } else if (onePinching && !bothPinching) {
      // Single hand pinching - translate mode
      if (previousMode === 'idle') {
        this.mode = 'translate';
        this.activeHand = leftPinching ? 'left' : 'right';
        this.captureGestureStartState(this.activeHand, null);
      }
    } else {
      // No hands pinching - idle
      if (previousMode !== 'idle') {
        console.log(`Manipulation ended: ${previousMode}`);
        this.mode = 'idle';
        this.gestureStartState = null;
        this.activeHand = null;
      }
    }

    // Log mode changes
    if (previousMode !== this.mode && this.mode !== 'idle') {
      console.log(`Manipulation mode: ${this.mode}`);
    }
  }

  /**
   * Capture the initial state when starting a gesture
   */
  private captureGestureStartState(hand1: 'left' | 'right', hand2: 'left' | 'right' | null): void {
    const handPositions = new Map();

    // Get hand positions (using pinch positions if available, otherwise wrist)
    const handTracking = this.getHandTrackingFromContainer();
    if (handTracking) {
      const hand1Pos = handTracking.getPinchPosition(hand1) || handTracking.getHandPosition(hand1);
      if (hand1Pos) {
        handPositions.set(hand1, hand1Pos.clone());
      }

      if (hand2) {
        const hand2Pos = handTracking.getPinchPosition(hand2) || handTracking.getHandPosition(hand2);
        if (hand2Pos) {
          handPositions.set(hand2, hand2Pos.clone());
        }
      }
    }

    this.gestureStartState = {
      handPositions,
      containerPosition: this.graphContainer.position.clone(),
      containerRotation: this.graphContainer.rotation.clone(),
      containerScale: this.graphContainer.scale.x, // Assuming uniform scale
      handSeparation: hand2 ? this.calculateHandSeparation(handPositions) : undefined,
    };
  }

  /**
   * Calculate distance between two hands
   */
  private calculateHandSeparation(handPositions: Map<string, THREE.Vector3>): number | undefined {
    const positions = Array.from(handPositions.values());
    if (positions.length === 2) {
      return positions[0].distanceTo(positions[1]);
    }
    return undefined;
  }

  /**
   * Handle single-hand translation
   */
  private handleTranslate(handTracking: XRHandTracking): void {
    if (!this.gestureStartState || !this.activeHand) return;

    const currentHandPos = handTracking.getPinchPosition(this.activeHand) ||
                          handTracking.getHandPosition(this.activeHand);
    const startHandPos = this.gestureStartState.handPositions.get(this.activeHand);

    if (!currentHandPos || !startHandPos) return;

    // Calculate delta movement
    const delta = currentHandPos.clone().sub(startHandPos);

    // Apply translation to container
    this.graphContainer.position.copy(
      this.gestureStartState.containerPosition.clone().add(delta)
    );
  }

  /**
   * Handle two-hand scale
   */
  private handleScale(handTracking: XRHandTracking): void {
    if (!this.gestureStartState || this.gestureStartState.handSeparation === undefined) return;

    // Get current hand positions
    const leftPos = handTracking.getPinchPosition('left') || handTracking.getHandPosition('left');
    const rightPos = handTracking.getPinchPosition('right') || handTracking.getHandPosition('right');

    if (!leftPos || !rightPos) return;

    // Calculate current hand separation
    const currentSeparation = leftPos.distanceTo(rightPos);

    // Calculate scale factor
    const scaleFactor = currentSeparation / this.gestureStartState.handSeparation;

    // Apply scale constraints
    const newScale = THREE.MathUtils.clamp(
      this.gestureStartState.containerScale * scaleFactor,
      this.gestureStartState.containerScale * this.thresholds.minScale,
      this.gestureStartState.containerScale * this.thresholds.maxScale
    );

    // Apply uniform scale
    this.graphContainer.scale.setScalar(newScale);

    // Also handle rotation simultaneously (natural two-hand manipulation)
    this.handleRotate(handTracking);
  }

  /**
   * Handle two-hand rotation
   */
  private handleRotate(handTracking: XRHandTracking): void {
    if (!this.gestureStartState) return;

    // Get current hand positions
    const leftPos = handTracking.getPinchPosition('left') || handTracking.getHandPosition('left');
    const rightPos = handTracking.getPinchPosition('right') || handTracking.getHandPosition('right');

    const startLeftPos = this.gestureStartState.handPositions.get('left');
    const startRightPos = this.gestureStartState.handPositions.get('right');

    if (!leftPos || !rightPos || !startLeftPos || !startRightPos) return;

    // Calculate rotation using the vector between hands
    const startVector = startRightPos.clone().sub(startLeftPos).normalize();
    const currentVector = rightPos.clone().sub(leftPos).normalize();

    // Calculate rotation quaternion
    const rotationQuat = new THREE.Quaternion();
    rotationQuat.setFromUnitVectors(startVector, currentVector);

    // Apply rotation to container
    const startQuat = new THREE.Quaternion().setFromEuler(this.gestureStartState.containerRotation);
    const newQuat = rotationQuat.multiply(startQuat);
    this.graphContainer.quaternion.copy(newQuat);
  }

  /**
   * Calculate bounding box of the entire graph
   */
  calculateBoundingVolume(): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromObject(this.graphContainer);
    this.boundingBox = box;
    return box;
  }

  /**
   * Get the center point of the graph
   */
  getGraphCenter(): THREE.Vector3 {
    if (!this.boundingBox) {
      this.calculateBoundingVolume();
    }
    const center = new THREE.Vector3();
    this.boundingBox?.getCenter(center);
    return center;
  }

  /**
   * Get the size of the graph bounding box
   */
  getGraphSize(): THREE.Vector3 {
    if (!this.boundingBox) {
      this.calculateBoundingVolume();
    }
    const size = new THREE.Vector3();
    this.boundingBox?.getSize(size);
    return size;
  }

  /**
   * Position graph at comfortable initial location relative to camera
   */
  resetGraphPosition(cameraPosition: THREE.Vector3, cameraDirection?: THREE.Vector3): void {
    // Calculate bounding volume if not already done
    if (!this.boundingBox) {
      this.calculateBoundingVolume();
    }

    // Get graph size
    const size = this.getGraphSize();
    const maxDimension = Math.max(size.x, size.y, size.z);

    // Calculate scale to fit in target volume
    const targetScale = maxDimension > 0 ? this.positionConfig.targetVolumeSize / maxDimension : 1.0;

    // Apply scale constraints
    const initialScale = THREE.MathUtils.clamp(
      targetScale,
      this.thresholds.minScale,
      this.thresholds.maxScale
    );

    this.graphContainer.scale.setScalar(initialScale);

    // Position in front of camera
    const direction = cameraDirection || new THREE.Vector3(0, 0, -1);
    const offset = direction.clone().multiplyScalar(this.positionConfig.distanceFromUser);

    this.graphContainer.position.copy(
      cameraPosition.clone()
        .add(offset)
        .add(new THREE.Vector3(0, this.positionConfig.heightOffset, 0))
    );

    // Reset rotation
    this.graphContainer.rotation.set(0, 0, 0);

    console.log('Graph positioned:', {
      position: this.graphContainer.position,
      scale: initialScale,
      size: size,
    });
  }

  /**
   * Get current manipulation mode
   */
  getMode(): ManipulationMode {
    return this.mode;
  }

  /**
   * Force mode to idle (useful for resetting state)
   */
  resetMode(): void {
    this.mode = 'idle';
    this.gestureStartState = null;
    this.activeHand = null;
  }

  /**
   * Get the graph container
   */
  getGraphContainer(): THREE.Object3D {
    return this.graphContainer;
  }

  /**
   * Set a new graph container
   */
  setGraphContainer(container: THREE.Object3D): void {
    this.graphContainer = container;
    this.boundingBox = null; // Recalculate on next use
  }

  /**
   * Helper to get hand tracking instance (stored in container userData)
   * This is a temporary workaround - ideally pass handTracking to update()
   */
  private getHandTrackingFromContainer(): XRHandTracking | null {
    // This assumes handTracking is stored in userData by the main app
    return (this.graphContainer.userData.handTracking as XRHandTracking) || null;
  }

  /**
   * Update configuration
   */
  setThresholds(thresholds: Partial<GestureThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Update position configuration
   */
  setPositionConfig(config: Partial<GraphPositionConfig>): void {
    this.positionConfig = { ...this.positionConfig, ...config };
  }

  /**
   * Smoothly animate to a target position (optional comfort feature)
   */
  animateToPosition(
    targetPosition: THREE.Vector3,
    targetScale: number,
    duration: number = 1000
  ): void {
    const startPosition = this.graphContainer.position.clone();
    const startScale = this.graphContainer.scale.x;
    const startTime = performance.now();

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1.0);

      // Ease-out cubic
      const easedProgress = 1 - Math.pow(1 - progress, 3);

      // Interpolate position
      this.graphContainer.position.lerpVectors(startPosition, targetPosition, easedProgress);

      // Interpolate scale
      const newScale = startScale + (targetScale - startScale) * easedProgress;
      this.graphContainer.scale.setScalar(newScale);

      if (progress < 1.0) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }
}
