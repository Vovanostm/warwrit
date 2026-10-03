import { describe, expect, it } from 'vitest';

import { loadServerConfig } from './config.js';

describe('server configuration', () => {
  it('loads deterministic defaults', () => {
    expect(loadServerConfig({})).toEqual({
      host: '0.0.0.0',
      port: 3000,
      encounterRealtimePort: 3110,
    });
  });

  it('validates the dedicated encounter realtime port', () => {
    for (const port of ['70000', '3110junk', '0']) {
      expect(() => loadServerConfig({ ENCOUNTER_REALTIME_PORT: port })).toThrow(
        'ENCOUNTER_REALTIME_PORT must be a valid TCP port',
      );
    }
    expect(loadServerConfig({ ENCOUNTER_REALTIME_PORT: '3111' }).encounterRealtimePort).toBe(3111);
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

  it('accepts only a complete fixed-origin OIDC configuration with database storage', () => {
    const loopbackIdentity = {
      DATABASE_URL: 'postgres://warwrit:warwrit@127.0.0.1:55433/warwrit',
      OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
      OIDC_CLIENT_ID: 'warwrit-local',
      OIDC_CLIENT_SECRET: 'local-only-secret',
      OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
      PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
    };
    expect(
      loadServerConfig({ ...loopbackIdentity, HOST: '127.0.0.1', PORT: '3107' }),
    ).toMatchObject({
      identity: {
        issuer: 'http://127.0.0.1:5557/dex',
        publicOrigin: 'http://127.0.0.1:3107',
        secureCookies: false,
      },
    });
    expect(() => loadServerConfig(loopbackIdentity)).toThrow('matching loopback listener');
    expect(() =>
      loadServerConfig({
        OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
        OIDC_CLIENT_ID: 'warwrit-local',
      }),
    ).toThrow('configuration must be complete');
    expect(() =>
      loadServerConfig({
        DATABASE_URL: 'postgres://warwrit:warwrit@127.0.0.1:55433/warwrit',
        OIDC_ISSUER: 'https://issuer.example.test',
        OIDC_CLIENT_ID: 'warwrit',
        OIDC_CLIENT_SECRET: 'secret',
        OIDC_REDIRECT_URI: 'https://attacker.example.test/auth/callback',
        PUBLIC_ORIGIN: 'https://game.example.test',
      }),
    ).toThrow('fixed callback');
  });

  it('enables fixture encounter admission only with an explicit local flag and identity', () => {
    const identity = {
      DATABASE_URL: 'postgres://warwrit:warwrit-local-only@127.0.0.1:55433/warwrit_encounter_test',
      OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
      OIDC_CLIENT_ID: 'warwrit-local',
      OIDC_CLIENT_SECRET: 'local-only-secret',
      OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
      PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
      HOST: '127.0.0.1',
      ENCOUNTER_FIXTURES: '1',
    };
    expect(loadServerConfig(identity).fixtureEncountersEnabled).toBe(true);
    expect(() =>
      loadServerConfig({ ...identity, PORT: '3107', ENCOUNTER_REALTIME_PORT: '3107' }),
    ).toThrow('loopback HTTP and realtime listeners');
    expect(() => loadServerConfig({ ENCOUNTER_FIXTURES: '1' })).toThrow(
      'loopback HTTP and realtime listeners',
    );
    expect(() => loadServerConfig({ ...identity, NODE_ENV: 'production' })).toThrow(
      'loopback HTTP and realtime listeners',
    );
  });

  it('permits authenticated encounter runtime configuration in production with fixtures disabled', () => {
    const config = loadServerConfig({
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: '3000',
      DATABASE_URL: 'postgres://user:secret@db.example.test/warwrit',
      OIDC_ISSUER: 'https://identity.example.test',
      OIDC_CLIENT_ID: 'warwrit',
      OIDC_CLIENT_SECRET: 'secret',
      OIDC_REDIRECT_URI: 'https://game.example.test/auth/callback',
      PUBLIC_ORIGIN: 'https://game.example.test',
    });

    expect(config.identity).toBeDefined();
    expect(config.fixtureEncountersEnabled).toBeUndefined();
  });
});
