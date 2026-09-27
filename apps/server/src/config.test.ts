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
      expect(() => loadServerConfig({ PORT: port })).toThrow('PORT must be a valid TCP port');
    }
  });

  it('enables the lab only with an explicit local nonproduction configuration', () => {
    expect(loadServerConfig({ HOST: '127.0.0.1', COMBAT_LAB: '1', PORT: '3000' })).toMatchObject({
      combatLabOrigin: 'http://127.0.0.1:5173',
    });
    expect(() => loadServerConfig({ COMBAT_LAB: '1' })).toThrow('loopback');
    expect(() =>
      loadServerConfig({ HOST: '127.0.0.1', COMBAT_LAB: '1', NODE_ENV: 'production' }),
    ).toThrow('loopback');
    expect(() =>
      loadServerConfig({
        HOST: '127.0.0.1',
        COMBAT_LAB: '1',
        COMBAT_LAB_ORIGIN: 'https://example.test',
      }),
    ).toThrow('local HTTP origin');
  });
});
