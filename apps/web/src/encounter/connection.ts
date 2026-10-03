import { Callbacks, Client, CloseCode, type Room, type SeatReservation } from '@colyseus/sdk';
import type {
  EncounterControlGrantDto,
  EncounterCommandDto,
  EncounterCommandResponse,
  EncounterPublicProjectionDto,
  EncounterRoomTicketDto,
} from '@warwrit/protocol';

import {
  readEncounterControlGrant,
  readEncounterProjection,
  readRoomProjection,
  readEncounterCommandResponse,
} from '../renderer/projection.js';

const apiBaseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '/api';
const realtimeBaseUrl = import.meta.env['VITE_REALTIME_BASE_URL'];

export type EncounterConnectionStatus =
  | 'discovering'
  | 'no-active'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'lost-access'
  | 'failed';

export interface EncounterScope {
  readonly accountId: string;
  readonly companyId: string;
}

export interface EncounterStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface EncounterConnectionObserver {
  readonly onStatus: (status: EncounterConnectionStatus) => void;
  readonly onProjection: (projection: EncounterPublicProjectionDto | undefined) => void;
  readonly onControlGrant: (grant: EncounterControlGrantDto | undefined) => void;
  readonly onCommandSender?: (sender: EncounterCommandSender | undefined) => void;
  readonly onUnauthorized: () => void;
  readonly onError: (message: string) => void;
}

export type EncounterCommandSender = (
  command: EncounterCommandDto,
) => Promise<EncounterCommandResponse>;

export interface EncounterConnectionHandle {
  readonly encounterId: string | null;
  close(): void;
}

export interface EncounterConnectionOptions {
  readonly scope: EncounterScope;
  readonly signal: AbortSignal;
  readonly observer: EncounterConnectionObserver;
  readonly fetcher?: typeof fetch;
  readonly storage?: EncounterStorage;
  readonly createClient?: (baseUrl: string) => EncounterClient;
  readonly apiUrl?: string;
  readonly realtimeUrl?: string;
}

export interface EncounterClient {
  reconnect(token: string): Promise<EncounterRoom>;
  consumeSeatReservation(ticket: SeatReservation): Promise<EncounterRoom>;
}

/** Owns both pending cancellation and the eventual live connection handle. */
export function startEncounterConnection(
  options: Omit<EncounterConnectionOptions, 'signal'>,
): () => void {
  const controller = new AbortController();
  let disposed = false;
  let connection: EncounterConnectionHandle | undefined;
  void connectEncounter({ ...options, signal: controller.signal }).then((resolved) => {
    if (disposed) resolved.close();
    else connection = resolved;
  });
  return () => {
    if (disposed) return;
    disposed = true;
    controller.abort();
    connection?.close();
    connection = undefined;
  };
}

export interface EncounterRoom {
  readonly state: unknown;
  readonly reconnectionToken: string;
  readonly onDrop: Room['onDrop'];
  readonly onReconnect: Room['onReconnect'];
  readonly onLeave: Room['onLeave'];
  readonly onStateChange: Room['onStateChange'];
  request<T>(type: string, payload?: unknown, options?: { readonly timeout?: number }): Promise<T>;
  onMessage(type: string, callback: (message: unknown) => void): () => void;
  send(type: string, payload?: unknown): void;
  leave(consented?: boolean): Promise<number>;
}

interface ActiveEncounterResponse {
  readonly version: 1;
  readonly encounterId: string | null;
}

export function encounterReconnectionStorageKey(
  scope: EncounterScope,
  encounterId: string,
): string {
  return `warwrit:encounter-room:v1:${encodeURIComponent(scope.accountId)}:${encodeURIComponent(scope.companyId)}:${encodeURIComponent(encounterId)}`;
}

function readActiveEncounter(value: unknown): ActiveEncounterResponse | undefined {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    !('version' in value) ||
    value.version !== 1 ||
    Object.keys(value).length !== 2 ||
    !('encounterId' in value) ||
    !(
      value.encounterId === null ||
      (typeof value.encounterId === 'string' && value.encounterId.length > 0)
    )
  )
    return undefined;
  return { version: 1, encounterId: value.encounterId };
}

function readRoomTicket(value: unknown): EncounterRoomTicketDto | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined;
  const ticket = value as Record<string, unknown>;
  const allowedKeys = [
    'name',
    'sessionId',
    'roomId',
    'processId',
    'publicAddress',
    'reconnectionToken',
    'devMode',
  ];
  if (
    Object.keys(ticket).some((key) => !allowedKeys.includes(key)) ||
    typeof ticket['name'] !== 'string' ||
    ticket['name'] !== 'encounter' ||
    typeof ticket['sessionId'] !== 'string' ||
    typeof ticket['roomId'] !== 'string' ||
    ('processId' in ticket && typeof ticket['processId'] !== 'string') ||
    ('publicAddress' in ticket && typeof ticket['publicAddress'] !== 'string') ||
    ('reconnectionToken' in ticket && typeof ticket['reconnectionToken'] !== 'string') ||
    ('devMode' in ticket && typeof ticket['devMode'] !== 'boolean')
  )
    return undefined;
  return {
    name: ticket['name'],
    sessionId: ticket['sessionId'],
    roomId: ticket['roomId'],
    ...(typeof ticket['processId'] === 'string' ? { processId: ticket['processId'] } : {}),
    ...(typeof ticket['publicAddress'] === 'string'
      ? { publicAddress: ticket['publicAddress'] }
      : {}),
    ...(typeof ticket['reconnectionToken'] === 'string'
      ? { reconnectionToken: ticket['reconnectionToken'] }
      : {}),
    ...(typeof ticket['devMode'] === 'boolean' ? { devMode: ticket['devMode'] } : {}),
  };
}

function browserStorage(): EncounterStorage | undefined {
  try {
    return typeof window === 'undefined' ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

function makeClient(baseUrl: string): EncounterClient {
  return new Client(baseUrl) as unknown as EncounterClient;
}

function endpointFor(ticket: EncounterRoomTicketDto, baseUrl: string): string {
  if (!ticket.publicAddress) return baseUrl;
  const secure = baseUrl.startsWith('https://') || baseUrl.startsWith('wss://');
  return `${secure ? 'https' : 'http'}://${ticket.publicAddress}`;
}

async function readResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function authorizationStatus(status: number): 'unauthorized' | 'lost-access' | undefined {
  if (status === 401) return 'unauthorized';
  if (status === 403 || status === 404) return 'lost-access';
  return undefined;
}

/** Restore the active encounter from authenticated server state and attach one Colyseus room. */
export async function connectEncounter(
  options: EncounterConnectionOptions,
): Promise<EncounterConnectionHandle> {
  const {
    scope,
    signal,
    observer,
    fetcher = fetch,
    apiUrl = apiBaseUrl,
    realtimeUrl = realtimeBaseUrl ??
      (typeof window === 'undefined'
        ? ''
        : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/colyseus`),
    createClient = makeClient,
  } = options;
  let room: EncounterRoom | undefined;
  let latestProjection: EncounterPublicProjectionDto | undefined;
  let grantRequestRevision = 0;
  let closed = false;
  let lostAccess = false;
  let tokenKey: string | undefined;
  const storage = options.storage ?? browserStorage();
  const unbind: (() => void)[] = [];
  let commandSender: EncounterCommandSender | undefined;

  const clearGrant = () => observer.onControlGrant(undefined);
  const clearCommandSender = () => {
    commandSender = undefined;
    observer.onCommandSender?.(undefined);
  };
  const close = () => {
    if (closed) return;
    closed = true;
    signal.removeEventListener('abort', close);
    grantRequestRevision += 1;
    for (const unbindCallback of unbind.splice(0)) unbindCallback();
    if (room) {
      room.onDrop.remove(onDrop);
      room.onReconnect.remove(onReconnect);
      room.onLeave.remove(onLeave);
      room.onStateChange.remove(onStateChange);
      void room.leave(true).catch(() => undefined);
      room = undefined;
    }
    if (storage && tokenKey) {
      try {
        storage.removeItem(tokenKey);
      } catch {
        // A local token is disposable and never replaces server authorization.
      }
    }
    clearGrant();
    clearCommandSender();
  };
  const terminate = (status: 'lost-access' | 'failed', message: string) => {
    if (closed) return;
    lostAccess = status === 'lost-access';
    close();
    latestProjection = undefined;
    observer.onProjection(undefined);
    observer.onStatus(status);
    observer.onError(message);
  };

  const onDrop = () => {
    if (closed) return;
    grantRequestRevision += 1;
    clearGrant();
    clearCommandSender();
    observer.onStatus('reconnecting');
  };
  const onReconnect = () => {
    if (closed || !room) return;
    persistToken();
    observer.onStatus('connected');
    syncRoomProjection();
    void requestControlGrant();
  };
  const onLeave = (code: number, reason?: string) => {
    if (closed) return;
    terminate(
      lostAccess || code === CloseCode.CONSENTED ? 'lost-access' : 'failed',
      reason ?? 'Связь с боем завершилась. Проверьте доступ и повторите подключение.',
    );
  };
  const onStateChange = () => syncRoomProjection();

  const persistToken = () => {
    if (!storage || !tokenKey || !room) return;
    try {
      storage.setItem(tokenKey, room.reconnectionToken);
    } catch {
      // A page reload can use a fresh authenticated seat reservation instead.
    }
  };

  const fetchProjection = async (encounterId: string): Promise<EncounterPublicProjectionDto> => {
    const response = await fetcher(
      `${apiUrl}/encounters/${encodeURIComponent(encounterId)}/projection`,
      {
        credentials: 'same-origin',
        cache: 'no-store',
        signal,
      },
    );
    const auth = authorizationStatus(response.status);
    if (auth === 'unauthorized') {
      observer.onUnauthorized();
      throw new Error('Сеанс завершился. Войдите снова, чтобы открыть бой.');
    }
    if (auth === 'lost-access') {
      lostAccess = true;
      observer.onStatus('lost-access');
      throw new Error('Доступ к активному бою больше не подтверждается.');
    }
    if (!response.ok) throw new Error('Не удалось получить общую сводку боя.');
    const projection = readEncounterProjection(await readResponse(response), encounterId);
    if (!projection) throw new Error('Сервер вернул неполную сводку боя.');
    return projection;
  };

  const requestControlGrant = async () => {
    if (closed || !room || !latestProjection) return;
    const requestedRevision = latestProjection.revision;
    const requestId = ++grantRequestRevision;
    clearGrant();
    try {
      const response = await room.request<unknown>(
        'get-control-grant',
        { version: 1 },
        { timeout: 5000 },
      );
      if (closed || requestId !== grantRequestRevision || !latestProjection) return;
      const grant = readEncounterControlGrant(response, latestProjection.encounterId);
      if (grant?.revision === requestedRevision && grant.revision === latestProjection.revision) {
        observer.onControlGrant(grant);
        commandSender = (command) => sendEncounterCommand(room!, command);
        observer.onCommandSender?.(commandSender);
        observer.onStatus('connected');
        return;
      }
      if (requestedRevision !== latestProjection.revision) void requestControlGrant();
    } catch {
      if (closed || requestId !== grantRequestRevision) return;
      clearGrant();
      try {
        const response = await fetcher(
          `${apiUrl}/encounters/${encodeURIComponent(latestProjection.encounterId)}/projection`,
          { credentials: 'same-origin', cache: 'no-store', signal },
        );
        const auth = authorizationStatus(response.status);
        if (auth === 'unauthorized') {
          observer.onUnauthorized();
          terminate('lost-access', 'Сеанс завершился. Войдите снова, чтобы открыть бой.');
          return;
        }
        if (auth === 'lost-access') {
          terminate('lost-access', 'Доступ к активному бою больше не подтверждается.');
          return;
        }
      } catch {
        if (signal.aborted || closed) return;
      }
      if (!closed) {
        observer.onStatus('connected');
        observer.onError('Бой доступен только для чтения: полномочия управления не получены.');
      }
    }
  };

  const publishProjection = (projection: EncounterPublicProjectionDto) => {
    latestProjection = projection;
    observer.onProjection(projection);
    observer.onStatus('connected');
    clearGrant();
    void requestControlGrant();
  };

  const syncRoomProjection = () => {
    if (closed || !room) return;
    const expectedId = latestProjection?.encounterId;
    if (!expectedId) return;
    const roomProjection = readRoomProjection(room.state, expectedId);
    const projection =
      roomProjection && latestProjection?.map
        ? Object.freeze({ ...roomProjection, map: latestProjection.map })
        : roomProjection;
    if (!projection || projection.revision < (latestProjection?.revision ?? 0)) return;
    if (projection.revision === latestProjection?.revision) {
      // Same revision may still carry a complete snapshot after reconnect.
      observer.onProjection(projection);
      return;
    }
    publishProjection(projection);
  };

  signal.addEventListener('abort', close, { once: true });
  try {
    observer.onStatus('discovering');
    const activeResponse = await fetcher(`${apiUrl}/encounters/active`, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal,
    });
    const activeAuth = authorizationStatus(activeResponse.status);
    if (activeAuth === 'unauthorized') {
      observer.onUnauthorized();
      return { encounterId: null, close };
    }
    if (!activeResponse.ok) {
      if (activeAuth === 'lost-access') {
        lostAccess = true;
        observer.onStatus('lost-access');
      }
      throw new Error('Не удалось восстановить активный бой компании.');
    }
    const active = readActiveEncounter(await readResponse(activeResponse));
    if (!active) throw new Error('Сервер вернул неполные сведения об активном бое.');
    if (signal.aborted || closed) return { encounterId: active.encounterId, close };
    if (active.encounterId === null) {
      observer.onStatus('no-active');
      return { encounterId: null, close };
    }

    tokenKey = encounterReconnectionStorageKey(scope, active.encounterId);
    const initialProjection = await fetchProjection(active.encounterId);
    if (signal.aborted || closed) return { encounterId: active.encounterId, close };
    latestProjection = initialProjection;
    observer.onProjection(initialProjection);
    observer.onStatus('connecting');
    clearCommandSender();

    const client = createClient(realtimeUrl);
    let reconnectToken: string | null = null;
    try {
      reconnectToken = storage?.getItem(tokenKey) ?? null;
    } catch {
      reconnectToken = null;
    }
    if (reconnectToken) {
      try {
        room = await client.reconnect(reconnectToken);
      } catch {
        try {
          storage?.removeItem(tokenKey);
        } catch {
          // Continue with a fresh authenticated seat reservation.
        }
      }
    }
    if (!room) {
      const ticketResponse = await fetcher(
        `${apiUrl}/encounters/${encodeURIComponent(active.encounterId)}/room-ticket`,
        {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ version: 1 }),
          signal,
        },
      );
      const ticketAuth = authorizationStatus(ticketResponse.status);
      if (ticketAuth === 'unauthorized') {
        observer.onUnauthorized();
        terminate('failed', 'Сеанс завершился. Войдите снова, чтобы открыть бой.');
        return { encounterId: active.encounterId, close };
      }
      if (ticketAuth === 'lost-access') {
        terminate('lost-access', 'Доступ к активному бою больше не подтверждается.');
        return { encounterId: active.encounterId, close };
      }
      if (!ticketResponse.ok) throw new Error('Не удалось получить безопасный пропуск в бой.');
      const ticket = readRoomTicket(await readResponse(ticketResponse));
      if (!ticket) throw new Error('Сервер вернул неполный пропуск в бой.');
      room = await createClient(endpointFor(ticket, realtimeUrl)).consumeSeatReservation(
        ticket as unknown as SeatReservation,
      );
    }
    if (signal.aborted || closed) {
      await room.leave(true).catch(() => undefined);
      room = undefined;
      return { encounterId: active.encounterId, close };
    }

    persistToken();
    const callbacks = Callbacks.get(room as unknown as Room);
    if (!callbacks) throw new Error('Сервер комнаты не отправил схему общего состояния.');
    unbind.push(
      callbacks.listen('revision', () => queueMicrotask(syncRoomProjection)),
      callbacks.onAdd('units', () => queueMicrotask(syncRoomProjection)),
      callbacks.onRemove('units', () => queueMicrotask(syncRoomProjection)),
      callbacks.onChange('units', () => queueMicrotask(syncRoomProjection)),
    );
    room.onStateChange(syncRoomProjection);
    room.onDrop(onDrop);
    room.onReconnect(onReconnect);
    room.onLeave(onLeave);
    syncRoomProjection();
    if (!latestProjection || latestProjection.revision === initialProjection.revision)
      void requestControlGrant();
    return { encounterId: active.encounterId, close };
  } catch (error) {
    if (!signal.aborted && !closed) {
      terminate(
        lostAccess ? 'lost-access' : 'failed',
        error instanceof Error ? error.message : 'Не удалось подключиться к бою.',
      );
    }
    close();
    return { encounterId: latestProjection?.encounterId ?? null, close };
  }
}

function sendEncounterCommand(
  room: EncounterRoom,
  command: EncounterCommandDto,
): Promise<EncounterCommandResponse> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (result?: EncounterCommandResponse, error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      unbind();
      if (error) reject(error);
      else resolve(result!);
    };
    const unbind = room.onMessage('command-result', (value) => {
      if (
        typeof value !== 'object' ||
        value === null ||
        !('commandId' in value) ||
        value.commandId !== command.commandId
      )
        return;
      const response = readEncounterCommandResponse(value, command);
      if (!response) {
        finish(undefined, new Error('Бой вернул ответ, не совпадающий с отправленной командой.'));
        return;
      }
      finish(response);
    });
    const timeout = setTimeout(
      () => finish(undefined, new Error('Ответ боя не получен. Повторите тот же запрос.')),
      5000,
    );
    try {
      room.send('command', command);
    } catch (error) {
      finish(
        undefined,
        error instanceof Error ? error : new Error('Не удалось отправить команду.'),
      );
    }
  });
}
