import { describe, expect, it, vi } from 'vitest';
import type * as ColyseusSdk from '@colyseus/sdk';

const callbackMocks = vi.hoisted(() => ({ unbinds: [] as Array<() => void> }));

vi.mock('@colyseus/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof ColyseusSdk>();
  const cleanup = () => {
    const unbind = vi.fn();
    callbackMocks.unbinds.push(unbind);
    return unbind;
  };
  return {
    ...actual,
    Callbacks: {
      get: () => ({
        listen: cleanup,
        onAdd: cleanup,
        onRemove: cleanup,
        onChange: cleanup,
      }),
    },
  };
});

import { CloseCode } from '@colyseus/sdk';
import {
  connectEncounter,
  encounterReconnectionStorageKey,
  startEncounterConnection,
  type EncounterClient,
  type EncounterConnectionObserver,
  type EncounterRoom,
  type EncounterStorage,
} from './connection.js';

function observer(): EncounterConnectionObserver & {
  readonly statuses: string[];
  readonly errors: string[];
} {
  const statuses: string[] = [];
  const errors: string[] = [];
  const unauthorized = vi.fn();
  return {
    statuses,
    errors,
    onStatus: (status) => statuses.push(status),
    onProjection: vi.fn(),
    onControlGrant: vi.fn(),
    onUnauthorized: unauthorized,
    onError: (message) => errors.push(message),
  };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

type RoomListener = (...args: unknown[]) => void;

function roomEvent() {
  const listeners = new Set<RoomListener>();
  const handler = vi.fn((listener: RoomListener) => listeners.add(listener));
  const remove = vi.fn((listener: RoomListener) => listeners.delete(listener));
  return Object.assign(handler, {
    remove,
    emit(...args: unknown[]) {
      for (const listener of [...listeners]) listener(...args);
    },
  });
}

function makeRoom(
  request: () => Promise<unknown> = async () => ({
    version: 1,
    encounterId: 'encounter-a',
    revision: 1,
    controllableUnitIds: ['unit-a'],
  }),
) {
  const onDrop = roomEvent();
  const onReconnect = roomEvent();
  const onLeave = roomEvent();
  const onStateChange = roomEvent();
  const room = {
    state: {
      version: 1,
      encounterId: 'encounter-a',
      revision: 1,
      status: 'active',
      round: 1,
      activationId: '',
      actorUnitId: '',
      deadlineAt: '',
      units: new Map([
        ['unit-a', { id: 'unit-a', sideId: 'side-a', q: 0, r: 0, health: 10, status: 'active' }],
      ]),
    },
    reconnectionToken: 'room-a:token-a',
    onDrop,
    onReconnect,
    onLeave,
    onStateChange,
    request: vi.fn(request),
    leave: vi.fn(async () => 0),
  } as unknown as EncounterRoom;
  return { room, onDrop, onReconnect, onLeave, onStateChange };
}

function makeStorage(): EncounterStorage & { readonly values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key),
  };
}

const publicProjection = {
  version: 1,
  encounterId: 'encounter-a',
  revision: 1,
  status: 'active',
  round: 1,
  activationId: null,
  actorUnitId: null,
  deadlineAt: null,
  units: [{ id: 'unit-a', sideId: 'side-a', q: 0, r: 0, health: 10, status: 'active' }],
};

function encounterFetcher(fallbackStatus?: number) {
  let projectionRequests = 0;
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/encounters/active'))
      return jsonResponse({ version: 1, encounterId: 'encounter-a' });
    if (url.endsWith('/encounters/encounter-a/projection')) {
      projectionRequests += 1;
      if (fallbackStatus && projectionRequests > 1)
        return new Response(null, { status: fallbackStatus });
      return jsonResponse(publicProjection);
    }
    if (url.endsWith('/encounters/encounter-a/room-ticket'))
      return jsonResponse({ name: 'encounter', sessionId: 'session-a', roomId: 'room-a' });
    throw new Error(`Unexpected request ${url}`);
  });
}

async function flushConnectionTasks(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('authenticated encounter re-entry', () => {
  it('shows no active encounter without opening a room', async () => {
    const clientFactory = vi.fn();
    const observed = observer();
    const connection = await connectEncounter({
      scope: { accountId: 'account-a', companyId: 'company-a' },
      signal: new AbortController().signal,
      observer: observed,
      apiUrl: '/api',
      realtimeUrl: 'ws://localhost:5173/colyseus',
      fetcher: async (input) => {
        expect(String(input)).toBe('/api/encounters/active');
        return jsonResponse({ version: 1, encounterId: null });
      },
      createClient: clientFactory,
    });

    expect(connection.encounterId).toBeNull();
    expect(observed.statuses).toEqual(['discovering', 'no-active']);
    expect(clientFactory).not.toHaveBeenCalled();
    connection.close();
  });

  it('does not connect anonymously and requests session restoration', async () => {
    const clientFactory = vi.fn();
    const observed = observer();
    const connection = await connectEncounter({
      scope: { accountId: 'account-a', companyId: 'company-a' },
      signal: new AbortController().signal,
      observer: observed,
      fetcher: async () => new Response(null, { status: 401 }),
      createClient: clientFactory,
    });

    expect(connection.encounterId).toBeNull();
    expect(observed.onUnauthorized).toHaveBeenCalledOnce();
    expect(clientFactory).not.toHaveBeenCalled();
  });

  it('fails closed when a foreign encounter is no longer accessible', async () => {
    const observed = observer();
    const clientFactory = vi.fn();
    let projectionRead = false;
    const connection = await connectEncounter({
      scope: { accountId: 'account-a', companyId: 'company-a' },
      signal: new AbortController().signal,
      observer: observed,
      apiUrl: '/api',
      realtimeUrl: 'ws://localhost:5173/colyseus',
      fetcher: async (input) => {
        const url = String(input);
        if (url === '/api/encounters/active')
          return jsonResponse({ version: 1, encounterId: 'encounter-a' });
        if (url === '/api/encounters/encounter-a/projection') {
          projectionRead = true;
          return new Response(null, { status: 404 });
        }
        throw new Error(`Unexpected request ${url}`);
      },
      createClient: clientFactory,
    });

    expect(projectionRead).toBe(true);
    expect(observed.statuses).toContain('lost-access');
    expect(observed.statuses.at(-1)).toBe('lost-access');
    expect(observed.errors).toContain('Доступ к активному бою больше не подтверждается.');
    expect(clientFactory).not.toHaveBeenCalled();
    connection.close();
  });

  it('closes a connected room, listeners, grant and reconnect token on normal disposal', async () => {
    callbackMocks.unbinds.length = 0;
    const observed = observer();
    const storage = makeStorage();
    const { room, onDrop, onReconnect, onLeave, onStateChange } = makeRoom();
    const client: EncounterClient = {
      reconnect: vi.fn(async () => room),
      consumeSeatReservation: vi.fn(async () => room),
    };
    const scope = { accountId: 'account-a', companyId: 'company-a' };
    const tokenKey = encounterReconnectionStorageKey(scope, 'encounter-a');
    const dispose = startEncounterConnection({
      scope,
      observer: observed,
      apiUrl: '/api',
      realtimeUrl: 'ws://localhost:5173/colyseus',
      fetcher: encounterFetcher(),
      storage,
      createClient: () => client,
    });
    await flushConnectionTasks();

    expect(storage.values.get(tokenKey)).toBe('room-a:token-a');
    expect(room.request).toHaveBeenCalledWith(
      'get-control-grant',
      { version: 1 },
      { timeout: 5000 },
    );
    dispose();
    dispose();

    expect(room.leave).toHaveBeenCalledTimes(1);
    expect(onDrop.remove).toHaveBeenCalledTimes(1);
    expect(onReconnect.remove).toHaveBeenCalledTimes(1);
    expect(onLeave.remove).toHaveBeenCalledTimes(1);
    expect(onStateChange.remove).toHaveBeenCalledTimes(1);
    expect(callbackMocks.unbinds).toHaveLength(4);
    for (const unbind of callbackMocks.unbinds) expect(unbind).toHaveBeenCalledOnce();
    expect(storage.values.has(tokenKey)).toBe(false);
    expect(observed.onControlGrant).toHaveBeenLastCalledWith(undefined);
  });

  it('closes a seat reservation that resolves just after in-flight disposal', async () => {
    const observed = observer();
    const storage = makeStorage();
    const { room } = makeRoom();
    let resolveRoom!: (room: EncounterRoom) => void;
    const client: EncounterClient = {
      reconnect: vi.fn(async () => room),
      consumeSeatReservation: vi.fn(
        () => new Promise<EncounterRoom>((resolve) => (resolveRoom = resolve)),
      ),
    };
    const dispose = startEncounterConnection({
      scope: { accountId: 'account-a', companyId: 'company-a' },
      observer: observed,
      apiUrl: '/api',
      realtimeUrl: 'ws://localhost:5173/colyseus',
      fetcher: encounterFetcher(),
      storage,
      createClient: () => client,
    });
    await vi.waitFor(() => expect(client.consumeSeatReservation).toHaveBeenCalledOnce());

    dispose();
    resolveRoom(room);
    await flushConnectionTasks();

    expect(room.leave).toHaveBeenCalledTimes(1);
    expect(storage.values.size).toBe(0);
    expect(observed.onControlGrant).toHaveBeenCalledOnce();
    expect(observed.onControlGrant).toHaveBeenLastCalledWith(undefined);
  });

  it.each([403, 404])(
    'removes a stale projection and room after grant fallback %i',
    async (status) => {
      const observed = observer();
      const storage = makeStorage();
      const { room } = makeRoom(() => Promise.reject(new Error('grant unavailable')));
      const client: EncounterClient = {
        reconnect: vi.fn(async () => room),
        consumeSeatReservation: vi.fn(async () => room),
      };
      const scope = { accountId: 'account-a', companyId: 'company-a' };
      const tokenKey = encounterReconnectionStorageKey(scope, 'encounter-a');
      startEncounterConnection({
        scope,
        observer: observed,
        apiUrl: '/api',
        realtimeUrl: 'ws://localhost:5173/colyseus',
        fetcher: encounterFetcher(status),
        storage,
        createClient: () => client,
      });
      await vi.waitFor(() => expect(observed.statuses.at(-1)).toBe('lost-access'));

      expect(observed.onProjection).toHaveBeenLastCalledWith(undefined);
      expect(room.leave).toHaveBeenCalledOnce();
      expect(storage.values.has(tokenKey)).toBe(false);
    },
  );

  it('treats the server consented leave as revocation but a drop as reconnecting', async () => {
    const observed = observer();
    const storage = makeStorage();
    const { room, onDrop, onLeave } = makeRoom();
    const client: EncounterClient = {
      reconnect: vi.fn(async () => room),
      consumeSeatReservation: vi.fn(async () => room),
    };
    const scope = { accountId: 'account-a', companyId: 'company-a' };
    const tokenKey = encounterReconnectionStorageKey(scope, 'encounter-a');
    startEncounterConnection({
      scope,
      observer: observed,
      apiUrl: '/api',
      realtimeUrl: 'ws://localhost:5173/colyseus',
      fetcher: encounterFetcher(),
      storage,
      createClient: () => client,
    });
    await vi.waitFor(() => expect(room.request).toHaveBeenCalledOnce());

    onDrop.emit();
    expect(observed.statuses.at(-1)).toBe('reconnecting');
    expect(observed.onProjection).not.toHaveBeenLastCalledWith(undefined);
    expect(room.leave).not.toHaveBeenCalled();

    onLeave.emit(CloseCode.CONSENTED, 'Access revoked');
    expect(observed.statuses.at(-1)).toBe('lost-access');
    expect(observed.onProjection).toHaveBeenLastCalledWith(undefined);
    expect(room.leave).toHaveBeenCalledOnce();
    expect(storage.values.has(tokenKey)).toBe(false);
  });
});
