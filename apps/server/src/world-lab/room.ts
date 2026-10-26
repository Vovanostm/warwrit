import { schema, type SchemaType } from '@colyseus/schema';
import { CloseCode, Room, type AuthContext, type Client } from '@colyseus/core';
import type { WorldLabStateDto } from '@warwrit/protocol';
import { sql, type Kysely } from 'kysely';

import {
  isSessionTokenActive,
  resolveSessionPrincipalFromCookieHeader,
  type ActiveSessionPrincipal,
} from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import { readWorldLabState } from './state.js';
import { WORLD_LAB_SESSION_COOKIE, type WorldLabFixture } from './model.js';

const RoomState = schema({}, 'WorldLabRoomState');
type RoomState = SchemaType<typeof RoomState>;

interface WorldLabRoomAuth extends ActiveSessionPrincipal {
  readonly fixture: WorldLabFixture;
}

type WorldLabRoomClient = Client<{
  state: RoomState;
  auth: WorldLabRoomAuth;
  messages: { world: WorldLabStateDto };
}>;

class WorldLabRoom extends Room<{
  state: RoomState;
  client: WorldLabRoomClient;
}> {
  override state = new RoomState();
  override maxClients = 8;
  private worldId: string | undefined;
  private publishing = false;
  private publishTimer: { clear(): void } | undefined;

  constructor(
    private readonly database: Kysely<DatabaseSchema>,
    private readonly fixtures: readonly WorldLabFixture[],
    private readonly now: () => Date,
    private readonly timeScale: number,
    private readonly onError: (error: unknown) => void,
  ) {
    super();
  }

  override onCreate(options: unknown): void {
    if (!isRecord(options) || typeof options['worldId'] !== 'string')
      throw new Error('World lab world is required');
    this.worldId = options['worldId'];
    this.publishTimer = this.clock.setInterval(() => void this.publishAll(), 200);
  }

  override async onJoin(client: WorldLabRoomClient): Promise<void> {
    if (!(await this.publishClient(client))) client.leave(CloseCode.CONSENTED);
  }

  override onDrop(client: WorldLabRoomClient, code: CloseCode): void {
    if (code !== CloseCode.CONSENTED && code !== CloseCode.SERVER_SHUTDOWN)
      void this.allowReconnection(client, 30).catch(() => undefined);
  }

  override async onReconnect(client: WorldLabRoomClient): Promise<void> {
    const auth = client.auth;
    if (
      auth === undefined ||
      !(await isSessionTokenActive(this.database, auth)) ||
      !(await this.isFixtureAccount(auth.accountId, auth.fixture)) ||
      !(await this.publishClient(client))
    )
      client.leave(CloseCode.CONSENTED);
  }

  override onDispose(): void {
    this.publishTimer?.clear();
  }

  private async publishAll(): Promise<void> {
    if (this.publishing || this.worldId === undefined) return;
    this.publishing = true;
    try {
      for (const client of this.clients) {
        if (!(await this.publishClient(client))) client.leave(CloseCode.CONSENTED);
      }
    } catch (error) {
      this.onError(error);
    } finally {
      this.publishing = false;
    }
  }

  private async publishClient(client: WorldLabRoomClient): Promise<boolean> {
    const auth = client.auth;
    if (
      this.worldId === undefined ||
      auth === undefined ||
      !(await isSessionTokenActive(this.database, auth)) ||
      !(await this.isFixtureAccount(auth.accountId, auth.fixture))
    )
      return false;
    const state = await readWorldLabState(
      this.database,
      this.worldId,
      this.fixtures,
      auth.accountId,
      this.now,
      this.timeScale,
    );
    if (!state) return false;
    client.send('world', state);
    return true;
  }

  private async isFixtureAccount(accountId: string, fixture: WorldLabFixture): Promise<boolean> {
    const stored = this.fixtures.find((entry) => entry.slot === fixture.slot);
    if (
      stored?.accountId !== accountId ||
      stored.companyId !== fixture.companyId ||
      stored.partyId !== fixture.partyId
    )
      return false;
    if (this.worldId === undefined) return false;
    const active = await sql<{
      readonly account_id: string;
      readonly company_id: string;
      readonly party_id: string;
    }>`
      select account_id, company_id, party_id
        from world_lab_slots
       where world_id = ${this.worldId} and slot = ${fixture.slot}
    `.execute(this.database);
    const row = active.rows[0];
    return (
      row?.account_id === accountId &&
      row.company_id === fixture.companyId &&
      row.party_id === fixture.partyId
    );
  }
}

export function createWorldLabRoomClass(
  database: Kysely<DatabaseSchema>,
  worldId: string,
  fixtures: readonly WorldLabFixture[],
  publicOrigin: string,
  now: () => Date = () => new Date(),
  timeScale = 1,
  onError: (error: unknown) => void = () => undefined,
): new () => WorldLabRoom {
  return class PersistentWorldLabRoom extends WorldLabRoom {
    static override async onAuth(
      _token: string,
      options: unknown,
      context: AuthContext,
    ): Promise<WorldLabRoomAuth | false> {
      if (
        !isRecord(options) ||
        options['worldId'] !== worldId ||
        context.headers.get('origin') !== publicOrigin
      )
        return false;
      const principal = await resolveSessionPrincipalFromCookieHeader(
        context.headers.get('cookie') ?? undefined,
        database,
        WORLD_LAB_SESSION_COOKIE,
      );
      const fixture = fixtures.find((entry) => entry.accountId === principal?.accountId);
      if (principal === undefined || fixture === undefined) return false;
      const active = await sql<{ readonly slot: WorldLabFixture['slot'] }>`
        select slot from world_lab_slots
         where world_id = ${worldId} and account_id = ${principal.accountId}
      `.execute(database);
      return active.rows[0]?.slot === fixture.slot ? { ...principal, fixture } : false;
    }

    constructor() {
      super(database, fixtures, now, timeScale, onError);
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
