import { describe, expect, it } from 'vitest';

import { envelope, MAIN_WORLD_ID, PROTOCOL_VERSION } from './index.js';

describe('protocol foundation', () => {
  it('wraps data with the current protocol version', () => {
    expect(envelope({ accepted: true })).toEqual({
      data: { accepted: true },
      protocolVersion: PROTOCOL_VERSION,
    });
  });

  it('reserves a stable world identifier from the first schema version', () => {
    expect(MAIN_WORLD_ID).toBe('main');
  });
});
