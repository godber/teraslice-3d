import { GraphRenderer } from './graph/GraphRenderer.js';
import { GraphFilters } from './graph/GraphFilters.js';
import { GuiControls } from './controls/GuiControls.js';
import { loadGraphData } from './utils/api.js';
import { AutoRefresh } from './utils/autoRefresh.js';
import { XRManager } from './xr/XRManager.js';
import { XRHandTracking } from './xr/XRHandTracking.js';
import { ObjectManipulation } from './xr/ObjectManipulation.js';
import type { QueuedURL } from './types/xr.js';
import './style.css';

async function initializeApp(): Promise<void> {
  const elem = document.getElementById('3d-graph');

  if (!elem) {
    console.error('Could not find element with ID "3d-graph"');
    return;
  }

  // Initialize core components
  const graphRenderer = new GraphRenderer(elem);
  const graphFilters = new GraphFilters();

  // Connect filters to graph
  graphFilters.setGraph(graphRenderer.getGraph());
  graphFilters.setGraphRenderer(graphRenderer);

  // Initialize auto-refresh
  const autoRefresh = new AutoRefresh((newData) => {
    graphFilters.setOriginalData(newData);
    graphRenderer.updateData(newData);
  });

  // Initialize GUI controls with auto-refresh
  new GuiControls(graphRenderer, graphFilters, autoRefresh);

  // Load and display graph data
  try {
    const data = await loadGraphData();
    graphFilters.setOriginalData(data);
    graphRenderer.loadData(data);
  } catch (error) {
    console.error('Failed to initialize app:', error);
  }

  // Initialize WebXR support
  await initializeXR(graphRenderer);
}

/**
 * Initialize WebXR support for spatial computing
 */
async function initializeXR(graphRenderer: GraphRenderer): Promise<void> {
  // Get UI elements
  const enterButton = document.getElementById('enter-spatial-button');
  const exitButton = document.getElementById('exit-spatial-button');
  const notSupportedMsg = document.getElementById('spatial-not-supported');
  const statusDiv = document.getElementById('xr-status');
  const statusText = document.getElementById('xr-status-text');

  if (!enterButton || !exitButton || !notSupportedMsg || !statusDiv || !statusText) {
    console.warn('XR UI elements not found in DOM');
    return;
  }

  // Check for WebXR support
  const capabilities = await XRManager.isSupported();

  if (!capabilities.spatialComputingSupported) {
    // Show not supported message
    notSupportedMsg.classList.remove('hidden');
    console.log('WebXR not supported:', capabilities.errorMessage);
    return;
  }

  // Show enter spatial button
  enterButton.classList.remove('hidden');
  console.log('WebXR with hand tracking is supported!');

  // XR state
  let xrManager: XRManager | null = null;
  let handTracking: XRHandTracking | null = null;
  let objectManipulation: ObjectManipulation | null = null;
  let queuedURLs: QueuedURL[] = [];

  /**
   * Enter spatial computing mode
   */
  async function enterSpatialMode(): Promise<void> {
    try {
      statusText.textContent = 'Starting spatial session...';
      statusDiv.classList.remove('hidden');

      // Create XR manager
      xrManager = new XRManager({
        onSessionStart: () => {
          console.log('Spatial session started');
          statusText.textContent = 'Spatial mode active';
        },
        onSessionEnd: () => {
          console.log('Spatial session ended');
          exitSpatialMode();
        },
      });

      // Start spatial session
      const session = await xrManager.startSpatialSession();

      // Enable XR on renderer
      const renderer = graphRenderer.getRenderer();
      if (!renderer) {
        throw new Error('Renderer not available');
      }
      xrManager.enableXR(renderer);
      xrManager.setXRSessionOnRenderer(session);

      // Get scene for hand tracking
      const scene = graphRenderer.getScene();
      if (!scene) {
        throw new Error('Scene not available');
      }

      // Initialize hand tracking
      handTracking = new XRHandTracking({
        onPinchStart: (hand) => {
          console.log(`Pinch started: ${hand}`);
        },
        onPinchEnd: (hand) => {
          console.log(`Pinch ended: ${hand}`);

          // Check if user clicked on a link
          if (scene) {
            const pointedObject = handTracking?.getPointedObject(hand, scene);
            if (pointedObject && pointedObject.userData.url) {
              const url = pointedObject.userData.url;
              queuedURLs.push({
                url,
                timestamp: Date.now(),
                nodeId: pointedObject.userData.nodeId,
                linkId: pointedObject.userData.linkId,
              });
              console.log('URL queued:', url);
              statusText.textContent = `Queued ${queuedURLs.length} URL(s)`;
            }
          }
        },
      });

      handTracking.setupHands(session, scene);

      // Get or create graph container
      const container = graphRenderer.getGraphContainer();
      if (!container) {
        throw new Error('Graph container not available');
      }

      // Initialize object manipulation
      objectManipulation = new ObjectManipulation(container);

      // Position graph at comfortable viewing distance
      const camera = graphRenderer.getCamera();
      if (camera) {
        objectManipulation.resetGraphPosition(camera.position);
      }

      // Disable orbit controls (incompatible with XR)
      graphRenderer.disableOrbitControls();

      // Update UI
      enterButton.classList.add('hidden');
      exitButton.classList.remove('hidden');

      // Start XR render loop
      const referenceSpace = xrManager.getReferenceSpace();
      if (!referenceSpace) {
        throw new Error('Reference space not available');
      }

      // Setup animation loop
      renderer.setAnimationLoop((time, frame) => {
        if (frame && handTracking && objectManipulation && referenceSpace) {
          // Update hand tracking
          handTracking.update(frame, referenceSpace);

          // Update object manipulation based on hand gestures
          objectManipulation.update(handTracking);
        }

        // Renderer handles rendering automatically in XR mode
      });

      console.log('Spatial mode initialized successfully');
    } catch (error) {
      console.error('Failed to enter spatial mode:', error);
      statusText.textContent = `Error: ${error}`;
      setTimeout(() => statusDiv.classList.add('hidden'), 3000);

      // Cleanup on error
      if (xrManager) {
        await xrManager.endSpatialSession();
      }
    }
  }

  /**
   * Exit spatial computing mode
   */
  async function exitSpatialMode(): Promise<void> {
    try {
      // End XR session
      if (xrManager) {
        await xrManager.endSpatialSession();
      }

      // Cleanup hand tracking
      if (handTracking) {
        const scene = graphRenderer.getScene();
        if (scene) {
          handTracking.cleanup(scene);
        }
      }

      // Re-enable orbit controls
      graphRenderer.enableOrbitControls();

      // Stop XR animation loop and return to normal rendering
      const renderer = graphRenderer.getRenderer();
      if (renderer) {
        renderer.setAnimationLoop(null);
      }

      // Update UI
      enterButton.classList.remove('hidden');
      exitButton.classList.add('hidden');
      statusDiv.classList.add('hidden');

      // Handle queued URLs
      if (queuedURLs.length > 0) {
        const shouldOpen = confirm(
          `Open ${queuedURLs.length} queued URL(s) in new tabs?`
        );

        if (shouldOpen) {
          queuedURLs.forEach(({ url }) => {
            window.open(url, '_blank');
          });
        }

        queuedURLs = [];
      }

      // Reset state
      xrManager = null;
      handTracking = null;
      objectManipulation = null;

      console.log('Exited spatial mode');
    } catch (error) {
      console.error('Error exiting spatial mode:', error);
    }
  }

  // Wire up button event handlers
  enterButton.addEventListener('click', enterSpatialMode);
  exitButton.addEventListener('click', () => {
    if (xrManager) {
      xrManager.endSpatialSession(); // This will trigger onSessionEnd callback
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);