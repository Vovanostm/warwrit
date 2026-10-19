import { afterEach, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import * as combat from '@warwrit/game-core';
import { prepareTransition, type CombatLabSession } from './routes.js';
import { createCustomBattleFixture, defaultSpriteBattle } from './custom-battle.js';
import { createCombatLabPresentation } from './presentation.js';
import { exportCombatLabReplay, projectCombatLabReplay } from './replay.js';

const settings = { host: '127.0.0.1', port: 3000, origin: 'http://127.0.0.1:5173' };
const headers = { host: '127.0.0.1:3000', origin: settings.origin };
const create = { version: 1, requestId: 'create-1', scenarioId: 'm0-3v3-v1' };
const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

function lab() {
  const app = buildApp({ logger: false, combatLab: settings });
  apps.push(app);
  return app;
}

describe('disposable combat lab session', () => {
  it('creates only explicitly, protects read/delete, and never advances on GET', async () => {
    const app = lab();
    const started = await app.inject({
      method: 'POST',
      url: '/dev/combat-lab',
      headers,
      payload: create,
    });
    expect(started.statusCode).toBe(201);
    const view = started.json();
    const capability = started.headers['x-combat-lab-capability'];
    expect(capability).toMatch(/^[a-f0-9]{64}$/u);
    expect(view).toMatchObject({ version: 1, scenarioId: 'm0-3v3-v1', viewRevision: 0 });
    expect(JSON.stringify(view)).not.toContain(capability);
    const url = `/dev/combat-lab/${view.sessionId}`;
    const privateHeaders = { ...headers, 'x-combat-lab-capability': capability as string };
    const first = await app.inject({ method: 'GET', url, headers: privateHeaders });
    const second = await app.inject({ method: 'GET', url, headers: privateHeaders });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual(view);
    expect(second.json()).toEqual(view);
    const replay = await app.inject({
      method: 'GET',
      url: `${url}/replay`,
      headers: privateHeaders,
    });
    expect(replay.statusCode).toBe(200);
    expect(replay.json()).not.toHaveProperty('labPresentation');
    expect(projectCombatLabReplay(replay.json()).units).toEqual(view.units);
    expect(JSON.stringify(replay.json())).not.toContain(capability);
    expect((await app.inject({ method: 'GET', url: `${url}/replay`, headers })).statusCode).toBe(
      404,
    );
    expect(
      (
        await app.inject({
          method: 'GET',
          url: `${url}/replay`,
          headers: {
            ...privateHeaders,
            origin: 'http://foreign.test',
          },
        })
      ).statusCode,
    ).toBe(403);
    expect((await app.inject({ method: 'GET', url, headers })).statusCode).toBe(404);
    expect(
      (
        await app.inject({
          method: 'GET',
          url,
          headers: { ...headers, 'x-combat-lab-capability': '0'.repeat(64) },
        })
      ).statusCode,
    ).toBe(404);
    expect(
      (
        await app.inject({
          method: 'DELETE',
          url,
          headers: privateHeaders,
          payload: { padding: 'x'.repeat(4096) },
        })
      ).statusCode,
    ).toBe(413);
    expect(
      (await app.inject({ method: 'DELETE', url, headers: privateHeaders, payload: {} }))
        .statusCode,
    ).toBe(400);
    expect((await app.inject({ method: 'DELETE', url, headers: privateHeaders })).statusCode).toBe(
      204,
    );
    expect((await app.inject({ method: 'GET', url, headers: privateHeaders })).statusCode).toBe(
      404,
    );
  });

  it('rejects foreign origins, malformed and oversized bodies, and full capacity', async () => {
    const app = lab();
    const post = (payload: object, requestHeaders = headers) =>
      app.inject({ method: 'POST', url: '/dev/combat-lab', headers: requestHeaders, payload });
    expect((await post(create, { ...headers, origin: 'http://evil.test' })).statusCode).toBe(403);
    expect((await post(create, { ...headers, host: 'evil.test:3000' })).statusCode).toBe(403);
    expect((await post({ ...create, controlledSideId: 'opponent' })).statusCode).toBe(400);
    expect((await post({ ...create, requestId: 'x'.repeat(129) })).statusCode).toBe(400);
    expect((await post({ ...create, padding: 'x'.repeat(4096) })).statusCode).toBe(413);
    for (let index = 0; index < 8; index += 1) {
      expect((await post({ ...create, requestId: `create-${index}` })).statusCode).toBe(201);
    }
    expect((await post({ ...create, requestId: 'ninth' })).statusCode).toBe(409);
  });

  it('keeps disabled routes absent and rejects production activation', async () => {
    const app = buildApp({ logger: false });
    apps.push(app);
    expect(
      (await app.inject({ method: 'POST', url: '/dev/combat-lab', headers, payload: create }))
        .statusCode,
    ).toBe(404);
    const previous = process.env['NODE_ENV'];
    process.env['NODE_ENV'] = 'production';
    try {
      expect(() => buildApp({ logger: false, combatLab: settings })).toThrow('production');
    } finally {
      if (previous === undefined) delete process.env['NODE_ENV'];
      else process.env['NODE_ENV'] = previous;
    }
  });
});

it('accounts for metadata bytes and preserves the exact replay limit across accepted commands', () => {
  const battle = defaultSpriteBattle();
  const fixture = createCustomBattleFixture('names-bytes', battle);
  const started = fixture.start();
  const source = {
    originalSetup: fixture.originalSetup(),
    commands: [],
    presentation: createCombatLabPresentation(battle, fixture.controlledSideId),
  };
  const initialBytes = Buffer.byteLength(JSON.stringify(exportCombatLabReplay(source)));
  const session: CombatLabSession = {
    ...source,
    capability: Buffer.alloc(32),
    controlledSideId: fixture.controlledSideId,
    state: started.state,
    journal: started.events,
    replayBytes: initialBytes,
    decisions: new Map(),
  };
  expect(initialBytes).toBeGreaterThan(
    Buffer.byteLength(
      JSON.stringify(exportCombatLabReplay({ originalSetup: source.originalSetup, commands: [] })),
    ),
  );
  const first = prepareTransition(session, combat.chooseTacticalCombatCommand(session.state));
  expect('code' in first).toBe(false);
  if ('code' in first) throw new Error('Expected accepted transition');
  expect(first.session.replayBytes).toBe(
    Buffer.byteLength(JSON.stringify(exportCombatLabReplay(first.session))),
  );
  const command = combat.chooseTacticalCombatCommand(first.session.state);
  const bytes = Buffer.byteLength(JSON.stringify(command)) + 1;
  const atLimit = { ...first.session, replayBytes: 2 * 1024 * 1024 - bytes };
  const accepted = prepareTransition(atLimit, command);
  expect('code' in accepted).toBe(false);
  if ('code' in accepted) throw new Error('Expected accepted boundary');
  expect(accepted.session.replayBytes).toBe(2 * 1024 * 1024);
  const before = JSON.stringify(atLimit);
  expect(prepareTransition({ ...atLimit, replayBytes: atLimit.replayBytes + 1 }, command)).toEqual({
    code: 'LIMIT_REACHED',
  });
  expect(JSON.stringify(atLimit)).toBe(before);
});
