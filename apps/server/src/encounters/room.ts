import { CloseCode, Room, type AuthContext, type Client } from '@colyseus/core';
import type { EncounterCommandResponse, EncounterPublicProjectionDto } from '@warwrit/protocol';
import { isEncounterCommandDto } from '@warwrit/protocol';
import type { Kysely } from 'kysely';

import {
  isSessionTokenActive,
  resolveSessionPrincipalFromCookieHeader,
  type ActiveSessionPrincipal,
} from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import { executeEncounterCommand, readEncounterProjection } from './executor.js';
import {
  EncounterRoomState,
  EncounterUnitStateSchema,
  type EncounterRoomState as EncounterRoomStateType,
} from './room-state.js';

interface EncounterRoomAuth extends ActiveSessionPrincipal {
  readonly encounterId: string;
}

const roomsByEncounter = new Map<string, Set<EncounterRoom>>();

type EncounterRoomClient = Client<{
  auth: EncounterRoomAuth;
  messages: {
    'command-result': EncounterCommandResponse | { readonly code: 'INVALID_REQUEST' };
  };
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isEncounterId = (value: unknown): value is string =>
  typeof value === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(value);

async function authenticateEncounterRoom(
  database: Kysely<DatabaseSchema>,
  options: unknown,
  context: AuthContext,
): Promise<EncounterRoomAuth | false> {
  if (!isRecord(options) || !isEncounterId(options['encounterId'])) return false;
  const principal = await resolveSessionPrincipalFromCookieHeader(
    context.headers.get('cookie') ?? undefined,
    database,
  );
  if (principal === undefined) return false;
  const projection = await readEncounterProjection(
    database,
    principal.accountId,
    options['encounterId'],
  );
  return projection === undefined ? false : { ...principal, encounterId: options['encounterId'] };
}

export class EncounterRoom extends Room<{
  state: EncounterRoomStateType;
  client: EncounterRoomClient;
}> {
  override state = new EncounterRoomState();
  override maxClients = 8;

  private encounterId: string | undefined;
  private shuttingDown = false;

  constructor(private readonly database: Kysely<DatabaseSchema>) {
    super();
  }

  override onCreate(options: unknown): void {
    if (!isRecord(options) || !isEncounterId(options['encounterId'])) {
      throw new Error('existing encounter required');
    }
    this.encounterId = options['encounterId'];
    const rooms = roomsByEncounter.get(this.encounterId) ?? new Set<EncounterRoom>();
    rooms.add(this);
    roomsByEncounter.set(this.encounterId, rooms);
  }

  override onDispose(): void {
    if (this.encounterId === undefined) return;
    const rooms = roomsByEncounter.get(this.encounterId);
    rooms?.delete(this);
    if (rooms?.size === 0) roomsByEncounter.delete(this.encounterId);
  }

  async refreshCommittedProjection(): Promise<void> {
    await this.refreshRoomProjection();
  }

  override async onJoin(client: EncounterRoomClient): Promise<void> {
    const refreshed = await this.refreshClientProjection(client);
    if (!refreshed) client.leave(CloseCode.CONSENTED);
  }

  override onDrop(client: EncounterRoomClient, code: CloseCode): void {
    if (!this.shuttingDown && code !== CloseCode.CONSENTED) this.allowReconnection(client, 30);
  }

  override onBeforeShutdown(): void {
    this.shuttingDown = true;
    this.disconnect(CloseCode.SERVER_SHUTDOWN);
  }

  override async onReconnect(client: EncounterRoomClient): Promise<void> {
    const principal = client.auth;
    if (principal === undefined || !(await this.isAuthorized(principal))) {
      client.leave(CloseCode.CONSENTED);
      return;
    }
    await this.refreshClientProjection(client);
  }

  override messages = {
    command: async (client: EncounterRoomClient, payload: unknown): Promise<void> => {
      await this.handleCommand(client, payload);
    },
  };

  private async handleCommand(client: EncounterRoomClient, payload: unknown): Promise<void> {
    if (!isEncounterCommandDto(payload)) {
      client.send('command-result', { code: 'INVALID_REQUEST' });
      return;
    }
    const principal = client.auth;
    if (
      principal === undefined ||
      payload.encounterId !== this.encounterId ||
      !(await this.isAuthorized(principal))
    ) {
      client.send('command-result', {
        version: 1,
        commandId: payload.commandId,
        status: 'rejected',
        code: payload.encounterId === this.encounterId ? 'UNAUTHORIZED' : 'NOT_FOUND',
      });
      return;
    }

    const response = await executeEncounterCommand(this.database, principal.accountId, payload);
    client.send('command-result', response);
    if (response.status === 'accepted') await this.refreshRoomProjection();
  }

  private async isAuthorized(principal: EncounterRoomAuth): Promise<boolean> {
    return (
      principal.encounterId === this.encounterId &&
      (await isSessionTokenActive(this.database, principal)) &&
      (await readEncounterProjection(this.database, principal.accountId, principal.encounterId)) !==
        undefined
    );
  }

  private async refreshRoomProjection(): Promise<void> {
    for (const client of this.clients) {
      if (!(await this.refreshClientProjection(client))) client.leave(CloseCode.CONSENTED);
    }
  }

  private async refreshClientProjection(client: EncounterRoomClient): Promise<boolean> {
    const principal = client.auth;
    if (principal === undefined) return false;
    const projection = await readEncounterProjection(
      this.database,
      principal.accountId,
      principal.encounterId,
    );
    if (projection === undefined || !(await isSessionTokenActive(this.database, principal))) {
      return false;
    }
    this.applyProjection(projection);
    return true;
  }

  private applyProjection(projection: EncounterPublicProjectionDto): void {
    if (projection.revision < this.state.revision) return;
    this.state.version = projection.version;
    this.state.encounterId = projection.encounterId;
    this.state.revision = projection.revision;
    this.state.status = projection.status;
    this.state.round = projection.round;
    this.state.activationId = projection.activationId ?? '';
    this.state.actorUnitId = projection.actorUnitId ?? '';
    this.state.deadlineAt = projection.deadlineAt ?? '';
    this.state.units.clear();
    for (const unit of projection.units) {
      this.state.units.set(
        unit.id,
        new EncounterUnitStateSchema({
          id: unit.id,
          sideId: unit.sideId,
          q: unit.q,
          r: unit.r,
          health: unit.health,
          status: unit.status,
        }),
      );
    }
  }
}

export async function refreshEncounterRoomProjections(encounterId: string): Promise<void> {
  for (const room of roomsByEncounter.get(encounterId) ?? []) {
    await room.refreshCommittedProjection();
  }
}

export function createEncounterRoomClass(
  database: Kysely<DatabaseSchema>,
): new () => EncounterRoom {
  return class PersistentEncounterRoom extends EncounterRoom {
    static override onAuth(_token: string, options: unknown, context: AuthContext) {
      return authenticateEncounterRoom(database, options, context);
    }

    constructor() {
      super(database);
    }
  };
}
