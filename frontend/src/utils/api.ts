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

export async function fetchVersion(): Promise<string> {
  try {
    const response = await fetch('/api/version');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.version;
  } catch (error) {
    console.error('Failed to fetch version:', error);
    throw error;
  }
}
