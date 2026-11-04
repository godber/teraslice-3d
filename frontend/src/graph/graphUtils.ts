import { GraphNode } from '../types/graph.js';

/**
 * Resolve a link endpoint to its node id.
 *
 * Links arrive from the API with `source`/`target` as id strings, but
 * 3d-force-graph replaces them with the resolved GraphNode objects once the
 * data is loaded. Callers that only need the id should go through here rather
 * than open-coding the check.
 */
export function endpointId(endpoint: string | GraphNode): string {
  return typeof endpoint === 'object' ? endpoint.id : endpoint;
}
