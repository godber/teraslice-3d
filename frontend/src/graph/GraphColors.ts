import { GraphNode, GraphLink } from '../types/graph.js';

export const colors = {
  kafkaIncoming: '#ffff00',  // yellow
  kafkaOther: '#0000ff',     // blue
  elasticsearch: '#00ff00',  // green
  background: '#000000',     // black
  linkRunning: '#00ff00',    // green
  linkStarting: '#98fb98',   // palegreen
  linkStopped: '#ffff00',    // yellow
  linkStopping: '#ffa500',   // orange
  linkFailing: '#ff0000',    // red
  linkDefault: '#808080'     // gray
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
  if (link.status == 'running') return colors.linkRunning;
  else if (link.status == 'starting') return colors.linkStarting;
  else if (link.status == 'stopped') return colors.linkStopped;
  else if (link.status == 'stopping') return colors.linkStopping;
  else if (link.status == 'failing') return colors.linkFailing;
  return colors.linkDefault; // default fallback
}