import type { EncounterPublicProjectionDto } from '@warwrit/protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../auth/session.js', () => ({
  isSessionTokenActive: vi.fn(),
  resolveSessionPrincipalFromCookieHeader: vi.fn(),
}));
vi.mock('./executor.js', () => ({
  executeEncounterCommand: vi.fn(),
  readEncounterProjection: vi.fn(),
}));

import { isSessionTokenActive } from '../auth/session.js';
import { readEncounterProjection } from './executor.js';
import { EncounterRoom } from './room.js';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

function projection(revision: number, q: number): EncounterPublicProjectionDto {
  return {
    version: 1,
    encounterId: '11111111-1111-4111-8111-111111111111',
    revision,
    status: 'active',
    round: 1,
    activationId: '1:human-shield',
    actorUnitId: 'human-shield',
    deadlineAt: '2026-09-29T00:00:00.000Z',
    controllableUnitIds: ['human-shield'],
    units: [{ id: 'human-shield', sideId: 'human', q, r: 0, health: 10, status: 'active' }],
  };
}

describe('EncounterRoom projection ordering', () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it('keeps the newer room state when an older projection read finishes later', async () => {
    const olderRead = deferred<EncounterPublicProjectionDto | undefined>();
    const newerRead = deferred<EncounterPublicProjectionDto | undefined>();
    vi.mocked(readEncounterProjection)
      .mockReturnValueOnce(olderRead.promise)
      .mockReturnValueOnce(newerRead.promise);
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
    newerRead.resolve(projection(2, 0));
    await newerRefresh;
    olderRead.resolve(projection(1, -1));
    await delayedRefresh;

    expect(room.state.revision).toBe(2);
    expect(room.state.units.get('human-shield')).toMatchObject({ q: 0, r: 0 });
    room.onDispose();
  });
});
