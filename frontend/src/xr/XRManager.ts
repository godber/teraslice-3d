/**
 * XRManager - WebXR Session Management
 *
 * Handles WebXR session lifecycle including:
 * - Detecting WebXR and hand tracking support
 * - Starting and ending spatial computing sessions
 * - Configuring Three.js renderer for XR
 * - Managing session events and state
 */

import * as THREE from 'three';
import type {
  XRSessionConfig,
  XRSupportCapabilities,
  XREventCallbacks,
} from '../types/xr';

export class XRManager {
  private session: XRSession | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private referenceSpace: XRReferenceSpace | null = null;
  private callbacks: XREventCallbacks;
  private isSessionActive = false;

  // Default session configuration for Vision Pro spatial computing
  private readonly defaultSessionConfig: XRSessionConfig = {
    mode: 'immersive-ar', // AR mode with passthrough for spatial computing
    requiredFeatures: ['hand-tracking'],
    optionalFeatures: ['local', 'local-floor', 'bounded-floor', 'unbounded'],
  };

  constructor(callbacks: XREventCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Check if WebXR with hand tracking is supported by the browser
   */
  static async isSupported(): Promise<XRSupportCapabilities> {
    // Check if navigator.xr exists
    if (!navigator.xr) {
      return {
        webxrSupported: false,
        handTrackingSupported: false,
        spatialComputingSupported: false,
        errorMessage: 'WebXR is not supported in this browser',
      };
    }

    try {
      // Check for immersive-ar support (primary for Vision Pro)
      const arSupported = await navigator.xr.isSessionSupported('immersive-ar');

      // Check for immersive-vr as fallback
      const vrSupported = await navigator.xr.isSessionSupported('immersive-vr');

      if (!arSupported && !vrSupported) {
        return {
          webxrSupported: true,
          handTrackingSupported: false,
          spatialComputingSupported: false,
          errorMessage: 'Immersive sessions are not supported on this device',
        };
      }

      // We can't directly test for hand tracking support without starting a session,
      // so we'll assume it's available if immersive mode is supported
      // The actual check happens when we try to start the session
      return {
        webxrSupported: true,
        handTrackingSupported: true, // Tentative, will be confirmed on session start
        spatialComputingSupported: arSupported || vrSupported,
      };
    } catch (error) {
      console.error('Error checking WebXR support:', error);
      return {
        webxrSupported: true,
        handTrackingSupported: false,
        spatialComputingSupported: false,
        errorMessage: `Error checking WebXR support: ${error}`,
      };
    }
  }

  /**
   * Check if spatial computing mode is available
   * (Alias for isSupported for semantic clarity)
   */
  async checkSpatialSupport(): Promise<boolean> {
    const capabilities = await XRManager.isSupported();
    return capabilities.spatialComputingSupported;
  }

  /**
   * Start a spatial computing session with hand tracking
   */
  async startSpatialSession(customConfig?: Partial<XRSessionConfig>): Promise<XRSession> {
    if (this.isSessionActive && this.session) {
      console.warn('XR session already active');
      return this.session;
    }

    if (!navigator.xr) {
      throw new Error('WebXR is not supported');
    }

    // Merge custom config with defaults
    const config: XRSessionConfig = {
      ...this.defaultSessionConfig,
      ...customConfig,
    };

    try {
      // Request XR session with hand tracking
      const sessionInit: XRSessionInit = {
        requiredFeatures: config.requiredFeatures,
        optionalFeatures: config.optionalFeatures,
      };

      this.session = await navigator.xr.requestSession(config.mode, sessionInit);
      this.isSessionActive = true;

      // Setup session event handlers
      this.setupSessionHandlers();

      // Setup reference space (prefer unbounded for Vision Pro spatial computing)
      try {
        this.referenceSpace = await this.session.requestReferenceSpace('unbounded');
      } catch {
        // Fall back to local if unbounded is not available
        try {
          this.referenceSpace = await this.session.requestReferenceSpace('local');
        } catch {
          // Last resort: viewer reference space
          this.referenceSpace = await this.session.requestReferenceSpace('viewer');
        }
      }

      console.log('XR session started with reference space:', this.referenceSpace?.type);

      // Trigger callback
      if (this.callbacks.onSessionStart) {
        this.callbacks.onSessionStart();
      }

      return this.session;
    } catch (error) {
      this.isSessionActive = false;
      this.session = null;

      if (error instanceof Error && error.name === 'NotSupportedError') {
        throw new Error('Hand tracking is not supported on this device');
      }

      throw error;
    }
  }

  /**
   * End the current spatial session
   */
  async endSpatialSession(): Promise<void> {
    if (!this.session) {
      console.warn('No active XR session to end');
      return;
    }

    try {
      await this.session.end();
    } catch (error) {
      console.error('Error ending XR session:', error);
    }

    // Cleanup happens in the session end handler
  }

  /**
   * Enable XR on the Three.js renderer
   */
  enableXR(renderer: THREE.WebGLRenderer): void {
    this.renderer = renderer;

    // Enable XR on renderer
    renderer.xr.enabled = true;

    // Set reference space type preference
    renderer.xr.setReferenceSpaceType('unbounded');

    console.log('XR enabled on Three.js renderer');
  }

  /**
   * Get the current XR session
   */
  getSession(): XRSession | null {
    return this.session;
  }

  /**
   * Get the current reference space
   */
  getReferenceSpace(): XRReferenceSpace | null {
    return this.referenceSpace;
  }

  /**
   * Check if a session is currently active
   */
  isActive(): boolean {
    return this.isSessionActive;
  }

  /**
   * Set the XR session on the renderer (must be called before animation loop)
   */
  setXRSessionOnRenderer(session: XRSession): void {
    if (!this.renderer) {
      throw new Error('Renderer not set. Call enableXR() first.');
    }

    // The session is automatically managed by Three.js when using renderer.xr.setSession
    this.renderer.xr.setSession(session);
  }

  /**
   * Update callbacks
   */
  setCallbacks(callbacks: XREventCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Setup event handlers for XR session
   */
  private setupSessionHandlers(): void {
    if (!this.session) return;

    // Handle session end
    this.session.addEventListener('end', () => {
      console.log('XR session ended');
      this.handleSessionEnd();
    });

    // Handle visibility change
    this.session.addEventListener('visibilitychange', () => {
      if (this.session) {
        console.log('XR session visibility changed:', this.session.visibilityState);
      }
    });

    // Handle input source changes (when hands are detected/lost)
    this.session.addEventListener('inputsourceschange', (event) => {
      console.log('Input sources changed:', {
        added: event.added.length,
        removed: event.removed.length,
      });
    });
  }

  /**
   * Handle session end cleanup
   */
  private handleSessionEnd(): void {
    this.isSessionActive = false;
    this.session = null;
    this.referenceSpace = null;

    // Disable XR on renderer
    if (this.renderer) {
      this.renderer.xr.setSession(null);
    }

    // Trigger callback
    if (this.callbacks.onSessionEnd) {
      this.callbacks.onSessionEnd();
    }
  }

  /**
   * Request animation frame for XR session
   * (Wrapper for session.requestAnimationFrame)
   */
  requestAnimationFrame(callback: XRFrameRequestCallback): number | null {
    if (!this.session) {
      console.warn('Cannot request animation frame: no active session');
      return null;
    }

    return this.session.requestAnimationFrame(callback);
  }

  /**
   * Get frame rate information (if available)
   */
  getFrameRate(): number | null {
    if (!this.session) return null;

    // Note: XRSession.frameRate is experimental and may not be available
    return (this.session as any).frameRate || null;
  }
}
