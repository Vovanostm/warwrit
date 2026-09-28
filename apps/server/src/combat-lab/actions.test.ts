import * as combat from '@warwrit/game-core';
import { afterEach, assert, describe, expect, it } from 'vitest';

import { buildApp } from '../app.js';
import { decideAction, prepareTransition, type CombatLabSession } from './routes.js';
import { createCombatLabFixture } from './scenario.js';

const settings = { host: '127.0.0.1', port: 3000, origin: 'http://127.0.0.1:5173' };
const headers = { host: '127.0.0.1:3000', origin: settings.origin };
const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

async function start() {
  const app = buildApp({ logger: false, combatLab: settings });
  apps.push(app);
  const created = await app.inject({
    method: 'POST',
    url: '/dev/combat-lab',
    headers,
    payload: { version: 1, requestId: 'create', scenarioId: 'm0-3v3-v1' },
  });
  expect(created.statusCode).toBe(201);
  const view = created.json();
  const privateHeaders = {
    ...headers,
    'x-combat-lab-capability': created.headers['x-combat-lab-capability'] as string,
  };
  const url = `/dev/combat-lab/${view.sessionId}`;
  const read = async () =>
    (await app.inject({ method: 'GET', url, headers: privateHeaders })).json();
  const send = (payload: object, requestHeaders: Record<string, string> = privateHeaders) =>
    app.inject({ method: 'POST', url: `${url}/actions`, headers: requestHeaders, payload });
  const action = (current: typeof view, requestId: string, intent: object) => ({
    version: 1,
    sessionId: view.sessionId,
    battleId: view.battleId,
    requestId,
    expectedViewRevision: current.viewRevision,
    activationId: current.activation.id,
    actorId: current.activation.actorId,
    intent,
  });
  return { app, view, privateHeaders, url, read, send, action };
}

describe('combat lab command path', () => {
  it('keeps the accepted replay and complete journal identical to the deterministic kernel', () => {
    const fixture = createCombatLabFixture('replay-proof');
    const started = fixture.start();
    const session: CombatLabSession = {
      capability: Buffer.alloc(32),
      originalSetup: fixture.originalSetup(),
      controlledSideId: fixture.controlledSideId,
      state: started.state,
      journal: started.events,
      commands: [],
      replayBytes: 0,
      decisions: new Map(),
    };
    assert(started.state.activation);
    const initialState = combat.canonicalCombatState(session.state);
    const action = {
      version: 1,
      sessionId: 'replay-proof',
      battleId: 'replay-proof',
      requestId: 'proof',
      expectedViewRevision: 0,
      activationId: started.state.activation.id,
      actorId: started.state.activation.unitId,
      intent: { type: 'wait' },
    } as const;
    const accepted = decideAction(session, action);
    expect(accepted.acknowledgement).toMatchObject({ status: 'accepted', viewRevision: 1 });
    expect(combat.canonicalCombatState(session.state)).toBe(initialState);
    let next = accepted.session;
    const trustedWait = (current: CombatLabSession) => {
      assert(current.state.activation);
      const prepared = prepareTransition(current, {
        type: 'wait',
        commandId: combat.commandId(`trusted:${current.state.revision}`),
        activationId: current.state.activation.id,
        actorId: current.state.activation.unitId,
      });
      assert('session' in prepared);
      return prepared.session;
    };
    next = trustedWait(next);
    assert(next.state.activation);
    next = decideAction(next, {
      ...action,
      requestId: 'human-spear',
      expectedViewRevision: next.state.revision,
      activationId: next.state.activation.id,
      actorId: next.state.activation.unitId,
    }).session;
    next = trustedWait(next);
    assert(next.state.activation);
    const attack = decideAction(next, {
      ...action,
      requestId: 'human-bow',
      expectedViewRevision: next.state.revision,
      activationId: next.state.activation.id,
      actorId: next.state.activation.unitId,
      intent: { type: 'attack', targetId: 'opponent-bow' },
    });
    expect(attack.acknowledgement.status).toBe('accepted');
    next = attack.session;
    while (next.state.status === 'active') {
      const prepared = prepareTransition(next, combat.chooseAiCommand(next.state));
      assert('session' in prepared);
      next = prepared.session;
    }
    const retry = decideAction(next, action);
    expect(retry.acknowledgement).toEqual(accepted.acknowledgement);
    const replay = {
      schemaVersion: 1,
      setup: next.originalSetup,
      commands: next.commands,
    } as const;
    expect(combat.verifyCombatReplay(replay, next.state).matches).toBe(true);
    expect(combat.replayCombat(replay).events).toEqual(next.journal);
  });

  it('commits separate actions in one activation, retains original decisions and hides them by scope', async () => {
    const lab = await start();
    const move = lab.action(lab.view, 'move-1', { type: 'move', to: { q: -1, r: 0 } });
    const [first, duplicate] = await Promise.all([lab.send(move), lab.send(move)]);
    expect(duplicate.json()).toEqual(first.json());
    expect(first.json()).toMatchObject({ status: 'accepted', viewRevision: 1 });
    const moved = await lab.read();
    expect(moved.units[0].position).toEqual({ q: -1, r: 0 });
    const invalid = lab.action(moved, 'blocked', { type: 'move', to: { q: 0, r: 0 } });
    const rejected = await lab.send(invalid);
    expect(rejected.json().code).toBe('INVALID_ACTION');
    const wait = lab.action(moved, 'wait-1', { type: 'wait' });
    const concurrent = await Promise.all([
      lab.send(wait),
      lab.send({ ...wait, requestId: 'other' }),
    ]);
    expect(concurrent.map((response) => response.json().status).sort()).toEqual([
      'accepted',
      'rejected',
    ]);
    expect(concurrent.find((response) => response.json().status === 'rejected')?.json().code).toBe(
      'STALE_VIEW',
    );
    const second = await lab.read();
    expect(second.viewRevision).toBe(2);
    expect((await lab.send(invalid)).json()).toEqual(rejected.json());
    expect((await lab.send(move)).json()).toEqual(first.json());
    expect((await lab.send({ ...move, intent: { type: 'wait' } })).json()).toMatchObject({
      status: 'rejected',
      code: 'REQUEST_CONFLICT',
    });
    expect((await lab.send(move, headers)).statusCode).toBe(404);
    expect((await lab.send({ ...move, battleId: 'foreign' })).statusCode).toBe(404);
    const opponent = lab.action(second, 'enemy-1', { type: 'wait' });
    expect((await lab.send(opponent)).json()).toMatchObject({
      status: 'rejected',
      code: 'UNAUTHORIZED',
    });
  });
});
