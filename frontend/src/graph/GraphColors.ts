import { GraphNode, GraphLink } from '../types/graph.js';

export const colors = {
  kafkaIncoming: '#ffe066',  // bright golden amber
  kafkaOther: '#38bdf8',     // bright sky blue
  elasticsearch: '#34d399',  // bright mint green
  file: '#fb923c',           // bright coral orange
  s3: '#22d3ee',             // bright cyan
  dataGenerator: '#e0a5ff',  // bright neon purple
  noop: '#cbd5e1',           // bright light slate gray
  stdout: '#e2e8f0',         // bright ice silver
  other: '#f8fafc',          // bright white-silver
  background: '#0a0e17',     // deep dark navy black
  linkRunning: '#34d399',    // vivid mint green
  linkStarting: '#6ee7b7',   // bright mint
  linkStopped: '#fde047',    // bright yellow
  linkStopping: '#fdba74',   // luminous orange
  linkFailing: '#ff6b6b',    // glowing red
  linkDefault: '#94a3b8'     // bright slate gray
};

export function getNodeColor(node: GraphNode): string {
  if (node.connector_type) {
    switch (node.connector_type) {
      case 'KAFKA':
        return node.id.includes('incoming') ? colors.kafkaIncoming : colors.kafkaOther;
      case 'ES':
        return colors.elasticsearch;
      case 'FILE':
        return colors.file;
      case 'S3':
        return colors.s3;
      case 'DATA_GENERATOR':
        return colors.dataGenerator;
      case 'NOOP':
        return colors.noop;
      case 'STDOUT':
        return colors.stdout;
      case 'OTHER':
        return colors.other;
    }
  }

  const lowerId = node.id.toLowerCase();
  if (lowerId.startsWith('kafka') || lowerId.includes(':topic')) {
    return lowerId.includes('incoming') ? colors.kafkaIncoming : colors.kafkaOther;
  }
  if (lowerId.startsWith('es') || lowerId.includes('elastic')) {
    return colors.elasticsearch;
  }
  if (lowerId.includes('file') || lowerId.startsWith('file:')) {
    return colors.file;
  }
  if (lowerId.includes('s3') || lowerId.startsWith('s3:')) {
    return colors.s3;
  }
  if (lowerId === 'data_generator') {
    return colors.dataGenerator;
  }
  if (lowerId === 'noop') {
    return colors.noop;
  }
  if (lowerId === 'stdout') {
    return colors.stdout;
  }

  return colors.other;
}

export function getNodeType(node: GraphNode): string {
  if (node.connector_type) {
    switch (node.connector_type) {
      case 'KAFKA':
        return node.id.includes('incoming') ? 'Kafka (incoming)' : 'Kafka';
      case 'ES':
        return 'Elasticsearch';
      case 'FILE':
        return 'File Storage';
      case 'S3':
        return 'S3 Bucket';
      case 'DATA_GENERATOR':
        return 'Data Generator';
      case 'NOOP':
        return 'No-Op Sink';
      case 'STDOUT':
        return 'STDOUT Sink';
      case 'OTHER':
        return 'Other';
    }
  }

  const lowerId = node.id.toLowerCase();
  if (lowerId.startsWith('kafka') || lowerId.includes(':topic')) {
    return lowerId.includes('incoming') ? 'Kafka (incoming)' : 'Kafka';
  }
  if (lowerId.startsWith('es') || lowerId.includes('elastic')) {
    return 'Elasticsearch';
  }
  if (lowerId.includes('file') || lowerId.startsWith('file:')) {
    return 'File Storage';
  }
  if (lowerId.includes('s3') || lowerId.startsWith('s3:')) {
    return 'S3 Bucket';
  }
  if (lowerId === 'data_generator') {
    return 'Data Generator';
  }
  if (lowerId === 'noop') {
    return 'No-Op Sink';
  }
  if (lowerId === 'stdout') {
    return 'STDOUT Sink';
  }

  return 'Other';
}

export function getLinkColor(link: GraphLink): string {
  if (link.status == 'running') return colors.linkRunning;
  else if (link.status == 'starting') return colors.linkStarting;
  else if (link.status == 'stopped') return colors.linkStopped;
  else if (link.status == 'stopping') return colors.linkStopping;
  else if (link.status == 'failing') return colors.linkFailing;
  return colors.linkDefault; // default fallback
}