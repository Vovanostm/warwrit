import type { EncounterPublicProjectionDto } from '@warwrit/protocol';
import { CloseCode } from '@colyseus/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../auth/session.js', () => ({
  isSessionTokenActive: vi.fn(),
  resolveSessionPrincipalFromCookieHeader: vi.fn(),
}));
vi.mock('./access.js', () => ({
  readEncounterAccess: vi.fn(),
}));
vi.mock('./executor.js', () => ({
  executeEncounterCommand: vi.fn(),
}));

import { isSessionTokenActive } from '../auth/session.js';
import { readEncounterAccess } from './access.js';
import { EncounterRoom } from './room.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function projection(
  revision: number,
  q: number,
  maximumHealth: number | undefined,
): EncounterPublicProjectionDto {
  return {
    version: 1,
    encounterId: '11111111-1111-4111-8111-111111111111',
    revision,
    status: 'active',
    round: 1,
    activationId: '1:human-shield',
    actorUnitId: 'human-shield',
    deadlineAt: '2026-09-29T00:00:00.000Z',
    map: {
      hexes: [
        { q: -1, r: 0 },
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
      blocked: [{ q: 0, r: 0 }],
    },
    units: [
      {
        id: 'human-shield',
        sideId: 'human',
        weaponId: 'sword-shield',
        q,
        r: 0,
        health: 20,
        ...(maximumHealth === undefined ? {} : { maximumHealth }),
        status: 'active',
      },
    ],
  };
}

function access(revision: number, q: number) {
  return {
    projection: projection(revision, q, 60),
    controlGrant: {
      version: 1 as const,
      encounterId: '11111111-1111-4111-8111-111111111111',
      revision,
      controllableUnitIds: ['human-shield'],
      selfAfk: true,
      resumeRequestedAfterEpoch: 3,
    },
  };
}

describe('EncounterRoom projection ordering', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('keeps the newer room state when an older projection read finishes later', async () => {
    const olderRead = deferred<EncounterPublicProjectionDto | undefined>();
    const newerRead = deferred<EncounterPublicProjectionDto | undefined>();
    vi.mocked(readEncounterAccess)
      .mockReturnValueOnce(
        olderRead.promise.then(
          (value) => value && { ...access(value.revision, value.units[0]!.q), projection: value },
        ),
      )
      .mockReturnValueOnce(
        newerRead.promise.then(
          (value) => value && { ...access(value.revision, value.units[0]!.q), projection: value },
        ),
      );
    vi.mocked(isSessionTokenActive).mockResolvedValue(true);

    const room = new EncounterRoom({} as never);
    room.onCreate({ encounterId: '11111111-1111-4111-8111-111111111111' });
    room.clients.push({
      auth: {
        accountId: 'owner',
        tokenDigest: 'unused-in-this-test',
        encounterId: '11111111-1111-4111-8111-111111111111',
      },
      leave: vi.fn(),
    } as never);

    const delayedRefresh = room.refreshCommittedProjection();
    const newerRefresh = room.refreshCommittedProjection();
    newerRead.resolve(projection(2, 0, 80));
    await newerRefresh;
    olderRead.resolve(projection(1, -1, 60));
    await delayedRefresh;

    expect(room.state.revision).toBe(2);
    expect(room.state.units.get('human-shield')).toMatchObject({
      q: 0,
      r: 0,
      health: 20,
      maximumHealth: 80,
    });
    room.onDispose();
  });

  it('returns the authenticated client grant without adding it to synchronized state', async () => {
    vi.mocked(readEncounterAccess).mockResolvedValue(access(0, -2));
    vi.mocked(isSessionTokenActive).mockResolvedValue(true);
    const room = new EncounterRoom({} as never);
    const encounterId = '11111111-1111-4111-8111-111111111111';
    const client = {
      auth: { accountId: 'owner', tokenDigest: 'token', encounterId },
      leave: vi.fn(),
    } as never;
    room.onCreate({ encounterId });
    await room.onJoin(client);
    const grant = await room.messages['get-control-grant'](
      client,
      { version: 1 },
      {
        reject: (reason: unknown) => {
          throw new Error(JSON.stringify(reason));
        },
      },
    );

    expect(grant).toEqual(access(0, -2).controlGrant);
    const synchronizedState = JSON.stringify(room.state.toJSON());
    expect(synchronizedState).not.toContain('controllableUnitIds');
    expect(synchronizedState).not.toContain('selfAfk');
    expect(synchronizedState).not.toContain('resumeRequestedAfterEpoch');
    expect(room.state.map.hexes.map(({ q, r }) => [q, r])).toEqual([
      [-1, 0],
      [0, 0],
      [1, 0],
    ]);
    expect(room.state.map.blocked.map(({ q, r }) => [q, r])).toEqual([[0, 0]]);
    expect(readEncounterAccess).toHaveBeenCalledWith(
      expect.anything(),
      'owner',
      encounterId,
      false,
    );
    room.onDispose();
  });

  it('copies the current cap on join, cap-only refresh and reconnect, clearing unknown', async () => {
    vi.mocked(isSessionTokenActive).mockResolvedValue(true);
    const room = new EncounterRoom({} as never);
    const encounterId = '11111111-1111-4111-8111-111111111111';
    const client = {
      auth: { accountId: 'owner', tokenDigest: 'token', encounterId },
      leave: vi.fn(),
    } as never;
    room.onCreate({ encounterId });
    room.clients.push(client);
    vi.mocked(readEncounterAccess).mockResolvedValue(access(0, 0));
    await room.onJoin(client);
    expect(room.state.units.get('human-shield')).toMatchObject({ health: 20, maximumHealth: 60 });
    expect(room.state.units.get('human-shield')?.weaponId).toBe('sword-shield');
    for (const cap of [80, undefined, 60]) {
      vi.mocked(readEncounterAccess).mockResolvedValue({
        ...access(1, 0),
        projection: projection(1, 0, cap),
      });
      await room.refreshCommittedProjection();
      expect(room.state.units.get('human-shield')?.maximumHealth).toBe(cap ?? 0);
    }
    await room.onReconnect(client);
    expect(room.state.units.get('human-shield')).toMatchObject({ health: 20, maximumHealth: 60 });
    expect(client).not.toHaveProperty('controllableUnitIds');
    room.onDispose();
  });

  it('leaves a reconnecting client when access is revoked during the projection refresh', async () => {
    const refreshStarted = deferred<void>();
    const refreshRead = deferred<ReturnType<typeof access> | undefined>();
    vi.mocked(readEncounterAccess)
      .mockResolvedValueOnce(access(0, 0))
      .mockImplementationOnce(() => {
        refreshStarted.resolve();
        return refreshRead.promise;
      });
    vi.mocked(isSessionTokenActive).mockResolvedValue(true);

    const room = new EncounterRoom({} as never);
    const encounterId = '11111111-1111-4111-8111-111111111111';
    const leave = vi.fn();
    const client = {
      auth: { accountId: 'owner', tokenDigest: 'token', encounterId },
      leave,
    } as never;
    room.onCreate({ encounterId });

    const reconnect = room.onReconnect(client);
    await refreshStarted.promise;
    refreshRead.resolve(undefined);
    await reconnect;

    expect(leave).toHaveBeenCalledWith(CloseCode.CONSENTED);
    room.onDispose();
  });
});
