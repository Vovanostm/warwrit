import { CloseCode, Room, type AuthContext, type Client } from '@colyseus/core';
import type {
  EncounterCommandResponse,
  EncounterControlGrantDto,
  EncounterPublicProjectionDto,
} from '@warwrit/protocol';
import {
  isEncounterCommandDto,
  isEncounterControlGrantRequestDto,
  isEncounterId,
} from '@warwrit/protocol';
import type { Kysely } from 'kysely';

import {
  isSessionTokenActive,
  resolveSessionPrincipalFromCookieHeader,
  type ActiveSessionPrincipal,
} from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import { readEncounterAccess } from './access.js';
import { executeEncounterCommand } from './executor.js';
import {
  EncounterRoomState,
  EncounterMapHexStateSchema,
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
    'control-grant':
      EncounterControlGrantDto | { readonly code: 'INVALID_REQUEST' | 'UNAUTHORIZED' };
  };
}>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

async function authenticateEncounterRoom(
  database: Kysely<DatabaseSchema>,
  fixtureAdmission: boolean,
  options: unknown,
  context: AuthContext,
): Promise<EncounterRoomAuth | false> {
  if (!isRecord(options) || !isEncounterId(options['encounterId'])) return false;
  const principal = await resolveSessionPrincipalFromCookieHeader(
    context.headers.get('cookie') ?? undefined,
    database,
  );
  if (principal === undefined) return false;
  const access = await readEncounterAccess(
    database,
    principal.accountId,
    options['encounterId'],
    fixtureAdmission,
  );
  return access === undefined ? false : { ...principal, encounterId: options['encounterId'] };
}

export class EncounterRoom extends Room<{
  state: EncounterRoomStateType;
  client: EncounterRoomClient;
}> {
  override state = new EncounterRoomState();
  override maxClients = 8;

  private encounterId: string | undefined;
  private shuttingDown = false;

  constructor(
    private readonly database: Kysely<DatabaseSchema>,
    private readonly fixtureAdmission = false,
  ) {
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
    if (!(await this.refreshClientProjection(client))) client.leave(CloseCode.CONSENTED);
  }

  override messages = {
    'get-control-grant': async (
      client: EncounterRoomClient,
      payload: unknown,
      ctx: {
        reject(reason: unknown): never;
      },
    ): Promise<EncounterControlGrantDto | void> => {
      if (!isEncounterControlGrantRequestDto(payload)) {
        return ctx.reject({ code: 'INVALID_REQUEST' });
      }
      const principal = client.auth;
      if (
        principal === undefined ||
        !(await this.isAuthorized(principal)) ||
        this.encounterId === undefined
      )
        return ctx.reject({ code: 'UNAUTHORIZED' });
      const access = await readEncounterAccess(
        this.database,
        principal.accountId,
        this.encounterId,
        this.fixtureAdmission,
      );
      if (access === undefined) return ctx.reject({ code: 'UNAUTHORIZED' });
      return access.controlGrant;
    },
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
      principal.encounterId !== this.encounterId ||
      !(await isSessionTokenActive(this.database, principal))
    ) {
      client.send('command-result', {
        version: 1,
        commandId: payload.commandId,
        status: 'rejected',
        code: payload.encounterId === this.encounterId ? 'UNAUTHORIZED' : 'NOT_FOUND',
      });
      return;
    }

    const access = await readEncounterAccess(
      this.database,
      principal.accountId,
      principal.encounterId,
      this.fixtureAdmission,
    );
    const response = await executeEncounterCommand(
      this.database,
      principal.accountId,
      payload,
      access !== undefined,
    );
    client.send('command-result', response);
    if (response.status === 'accepted') await this.refreshRoomProjection();
  }

  private async isAuthorized(principal: EncounterRoomAuth): Promise<boolean> {
    return (
      principal.encounterId === this.encounterId &&
      (await isSessionTokenActive(this.database, principal)) &&
      (await readEncounterAccess(
        this.database,
        principal.accountId,
        principal.encounterId,
        this.fixtureAdmission,
      )) !== undefined
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
    const access = await readEncounterAccess(
      this.database,
      principal.accountId,
      principal.encounterId,
      this.fixtureAdmission,
    );
    if (access === undefined || !(await isSessionTokenActive(this.database, principal))) {
      return false;
    }
    this.applyProjection(access.projection);
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
    this.state.map.hexes.clear();
    this.state.map.blocked.clear();
    for (const hex of projection.map?.hexes ?? []) {
      this.state.map.hexes.push(new EncounterMapHexStateSchema({ q: hex.q, r: hex.r }));
    }
    for (const hex of projection.map?.blocked ?? []) {
      this.state.map.blocked.push(new EncounterMapHexStateSchema({ q: hex.q, r: hex.r }));
    }
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
  fixtureAdmission = false,
): new () => EncounterRoom {
  return class PersistentEncounterRoom extends EncounterRoom {
    static override onAuth(_token: string, options: unknown, context: AuthContext) {
      return authenticateEncounterRoom(database, fixtureAdmission, options, context);
    }

    constructor() {
      super(database, fixtureAdmission);
    }
  };
}
