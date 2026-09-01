import { describe, expect, it } from 'vitest';

import { loadServerConfig } from './config.js';

describe('server configuration', () => {
  it('loads deterministic defaults', () => {
    expect(loadServerConfig({})).toEqual({
      host: '0.0.0.0',
      port: 3000,
    });
  });

  it('rejects invalid ports instead of partially parsing or silently recovering', () => {
    for (const port of ['70000', '3000junk', '3.5', '-1', '']) {
      expect(() => loadServerConfig({ PORT: port })).toThrow(
        'PORT must be a valid TCP port',
      );
    }
  });
});
