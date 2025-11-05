/**
 * WebXR Type Definitions for Teraslice 3D
 *
 * Custom type definitions for WebXR features, gestures, and spatial computing.
 */

import * as THREE from 'three';

/**
 * Hand side identifier
 */
export type HandSide = 'left' | 'right';

/**
 * Manipulation mode for graph volume
 */
export type ManipulationMode = 'idle' | 'translate' | 'scale' | 'rotate';

/**
 * Pinch state for a hand
 */
export interface PinchState {
  isPinching: boolean;
  pinchStartTime: number | null;
  pinchPosition: THREE.Vector3 | null;
}

/**
 * Hand tracking state
 */
export interface HandState {
  hand: XRHand | null;
  inputSource: XRInputSource | null;
  joints: Map<XRHandJoint, THREE.Vector3>;
  pinchState: PinchState;
  direction: THREE.Vector3;
  isTracking: boolean;
}

/**
 * Gesture start state for manipulation
 */
export interface GestureStartState {
  handPositions: Map<HandSide, THREE.Vector3>;
  containerPosition: THREE.Vector3;
  containerRotation: THREE.Euler;
  containerScale: number;
  handSeparation?: number;
}

/**
 * XR session configuration
 */
export interface XRSessionConfig {
  mode: 'immersive-vr' | 'immersive-ar';
  requiredFeatures: string[];
  optionalFeatures: string[];
}

/**
 * XR support capabilities
 */
export interface XRSupportCapabilities {
  webxrSupported: boolean;
  handTrackingSupported: boolean;
  spatialComputingSupported: boolean;
  errorMessage?: string;
}

/**
 * Gesture threshold configuration
 */
export interface GestureThresholds {
  pinchDistance: number;      // Distance threshold for pinch detection (meters)
  pinchDebounce: number;       // Time to debounce pinch transitions (ms)
  minScale: number;            // Minimum scale factor
  maxScale: number;            // Maximum scale factor
  raycastDistance: number;     // Max distance for hand raycasting (meters)
}

/**
 * Default gesture thresholds
 */
export const DEFAULT_GESTURE_THRESHOLDS: GestureThresholds = {
  pinchDistance: 0.03,         // 3cm
  pinchDebounce: 100,          // 100ms
  minScale: 0.1,               // 10% of original
  maxScale: 10.0,              // 1000% of original
  raycastDistance: 10.0,       // 10 meters
};

/**
 * Graph positioning configuration
 */
export interface GraphPositionConfig {
  distanceFromUser: number;    // Distance in front of user (meters)
  heightOffset: number;        // Height offset from eye level (meters)
  initialScale: number;        // Initial scale factor
  targetVolumeSize: number;    // Target size for bounding volume (meters)
}

/**
 * Default graph positioning
 */
export const DEFAULT_GRAPH_POSITION: GraphPositionConfig = {
  distanceFromUser: 1.75,      // 1.75 meters in front
  heightOffset: 0.0,           // Eye level
  initialScale: 1.0,           // No initial scaling
  targetVolumeSize: 1.0,       // 1 meter cube
};

/**
 * Clicked URL information for queuing
 */
export interface QueuedURL {
  url: string;
  timestamp: number;
  nodeId?: string;
  linkId?: string;
}

/**
 * XR event callbacks
 */
export interface XREventCallbacks {
  onSessionStart?: () => void;
  onSessionEnd?: () => void;
  onPinchStart?: (hand: HandSide) => void;
  onPinchEnd?: (hand: HandSide) => void;
  onObjectSelected?: (object: THREE.Object3D) => void;
  onURLClicked?: (url: string) => void;
}

/**
 * Visual feedback configuration
 */
export interface VisualFeedbackConfig {
  showHandModels: boolean;
  showRaycast: boolean;
  highlightOnHover: boolean;
  highlightColor: THREE.Color;
  pinchIndicatorColor: THREE.Color;
}

/**
 * Default visual feedback configuration
 */
export const DEFAULT_VISUAL_FEEDBACK: VisualFeedbackConfig = {
  showHandModels: false,        // Optional ghost hands for debugging
  showRaycast: false,           // Optional ray visualization
  highlightOnHover: true,       // Highlight objects when pointing
  highlightColor: new THREE.Color(0x00ff00),
  pinchIndicatorColor: new THREE.Color(0xff0000),
};

/**
 * Extended XRFrame with hand tracking
 * (TypeScript doesn't have built-in XRHand types)
 */
declare global {
  interface XRFrame {
    getJointPose?: (joint: XRJointSpace, baseSpace: XRReferenceSpace) => XRJointPose | undefined;
  }

  interface XRInputSource {
    hand?: XRHand;
  }

  interface XRHand extends Iterable<[XRHandJoint, XRJointSpace]> {
    readonly size: number;
    get(joint: XRHandJoint): XRJointSpace | undefined;
  }

  interface XRJointSpace extends XRSpace {
    readonly jointName: XRHandJoint;
  }

  interface XRJointPose extends XRPose {
    readonly radius?: number;
  }

  type XRHandJoint =
    | 'wrist'
    | 'thumb-metacarpal' | 'thumb-phalanx-proximal' | 'thumb-phalanx-distal' | 'thumb-tip'
    | 'index-finger-metacarpal' | 'index-finger-phalanx-proximal' | 'index-finger-phalanx-intermediate' | 'index-finger-phalanx-distal' | 'index-finger-tip'
    | 'middle-finger-metacarpal' | 'middle-finger-phalanx-proximal' | 'middle-finger-phalanx-intermediate' | 'middle-finger-phalanx-distal' | 'middle-finger-tip'
    | 'ring-finger-metacarpal' | 'ring-finger-phalanx-proximal' | 'ring-finger-phalanx-intermediate' | 'ring-finger-phalanx-distal' | 'ring-finger-tip'
    | 'pinky-finger-metacarpal' | 'pinky-finger-phalanx-proximal' | 'pinky-finger-phalanx-intermediate' | 'pinky-finger-phalanx-distal' | 'pinky-finger-tip';
}

export {};
