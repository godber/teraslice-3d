import { describe, it, expect } from 'vitest';
import { endpointId } from './graphUtils.js';

describe('endpointId', () => {
  it('returns a string endpoint unchanged', () => {
    expect(endpointId('kafka:topicA')).toBe('kafka:topicA');
  });

  it('reads the id off a resolved node object', () => {
    expect(endpointId({ id: 'kafka:topicA', connector_type: 'KAFKA' })).toBe('kafka:topicA');
  });
});
