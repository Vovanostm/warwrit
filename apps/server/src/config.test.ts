import { describe, expect, it } from 'vitest';

import { loadServerConfig } from './config.js';

describe('server configuration', () => {
  it('loads deterministic defaults', () => {
    expect(loadServerConfig({})).toEqual({
      host: '0.0.0.0',
      port: 3000,
    });
  });

  it('rejects an invalid port instead of silently recovering', () => {
    expect(() => loadServerConfig({ PORT: '70000' })).toThrow('PORT must be a valid TCP port');
  });
});
