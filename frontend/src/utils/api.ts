import { GraphData } from '../types/graph.js';

export async function loadGraphData(): Promise<GraphData> {
  try {
    const response = await fetch('/api/pipeline_graph');
    return await response.json();
  } catch (error) {
    console.error('Error loading graph data:', error);
    throw error;
  }
}
