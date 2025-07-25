import { GraphNode, GraphLink } from '../types/graph.js';

export const colors = {
  kafkaIncoming: '#ffff00',  // yellow
  kafkaOther: '#0000ff',     // blue
  elasticsearch: '#00ff00'   // green
};

export function getNodeColor(node: GraphNode): string {
  if (node.id.startsWith("kafka")) {
    if (node.id.includes("incoming")) {
      return colors.kafkaIncoming;
    }
    return colors.kafkaOther;
  } else {
    return colors.elasticsearch;
  }
}

export function getLinkColor(link: GraphLink): string {
  if (link.status == 'running') return 'green';
  else if (link.status == 'starting') return 'palegreen';
  else if (link.status == 'stopped') return 'yellow';
  else if (link.status == 'stopping') return 'orange';
  else if (link.status == 'failing') return 'red';
  return 'gray'; // default fallback
}