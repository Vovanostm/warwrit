import { createHash, randomUUID } from 'node:crypto';
import { createServer } from 'node:net';

import * as combat from '@warwrit/game-core';
import {
  FIRST_HUNT_ALLIED_SLOTS,
  FIRST_HUNT_COMBAT_MAP,
  FIRST_HUNT_HOSTILE_GENESIS,
  FIRST_HUNT_RETREAT_HEXES,
  M1_DOMAIN_BRIDGE_V2_RULESET_ID,
  battleId,
  sideId,
  startBattleV2,
  unitId,
  type BattleSetupV2,
} from '@warwrit/game-core';
import { ensureFirstHuntGenesis } from '../contracts/first-hunt-runtime.js';
import { Client, type SeatReservation } from '@colyseus/sdk';
import type { EncounterCommandResponse } from '@warwrit/protocol';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { sql } from 'kysely';
import { afterAll, describe, expect, it } from 'vitest';

import { createDatabase, createDatabaseReadinessProbe } from '../db/database.js';
import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { loadCompanyAggregate } from '../company/repository.js';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import {
  createFixtureEncounter,
  executeEncounterCommand,
  executeEncounterAiWake,
  executeEncounterTimeout,
  listDueEncounterAiWakes,
  listDueEncounterTimeouts,
  requestEncounterResume,
  verifyEncounterReplay,
} from './executor.js';
import { firstHuntTimeoutCommandId } from './admission.js';
import { startEncounterAiWorker } from './ai-worker.js';
import { EncounterRoomState } from './room-state.js';

const connectionString = process.env['WARWRIT_ENCOUNTER_DATABASE_URL'];
const databases =
  connectionString === undefined
    ? []
    : [createDatabase(connectionString), createDatabase(connectionString)];
const apps: ReturnType<typeof buildApp>[] = [];

interface FirstHuntJoinActor {
  readonly accountId: string;
  readonly companyId: string;
  readonly partyId: string;
  readonly sessionToken: string;
  readonly headers: Record<string, string>;
  readonly initial: ReturnType<typeof combat.readCompanyCombatAggregateState>;
}

function createHumanEncounterSetup(encounterId: string, alliedCount = 1): BattleSetupV2 {
  const allySide = sideId('first-hunt-companies');
  const hostileSide = sideId('first-hunt-hostiles');
  const hostile = FIRST_HUNT_HOSTILE_GENESIS[0];
  if (hostile === undefined) throw new Error('FIRST HUNT hostile profile is unavailable');
  const alliedUnits = FIRST_HUNT_ALLIED_SLOTS.slice(0, alliedCount).map((position, index) => {
    const unit = unitId(`test-company-member-${index + 1}`);
    const initiative = 300 - index;
    return {
      id: unit,
      sideId: allySide,
      position,
      weaponId: 'raider' as const,
      attributes: {
        health: 100,
        armor: 100,
        stamina: 100,
        initiative,
        accuracy: 22,
        defense: 20,
        morale: 100,
      },
      initialPools: { health: 100, armor: 100, stamina: 100, morale: 100 },
    };
  });
  return {
    schemaVersion: combat.COMBAT_V2_SCHEMA_VERSION,
    battleId: battleId(encounterId),
    rulesetId: M1_DOMAIN_BRIDGE_V2_RULESET_ID,
    seed: 17,
    map: FIRST_HUNT_COMBAT_MAP,
    sides: [
      { id: allySide, retreatHexes: FIRST_HUNT_RETREAT_HEXES.allied },
      { id: hostileSide, retreatHexes: FIRST_HUNT_RETREAT_HEXES.hostile },
    ],
    units: [
      ...alliedUnits,
      {
        id: unitId(hostile.entityId),
        sideId: hostileSide,
        position: hostile.position,
        weaponId: hostile.weaponId as BattleSetupV2['units'][number]['weaponId'],
        attributes: { ...hostile.attributes, initiative: 100 },
        initialPools: hostile.initialPools,
      },
    ],
  };
}

function createWorldHostileSetup(encounterId: string): BattleSetupV2 {
  const allySide = sideId('first-hunt-companies');
  const hostileSide = sideId('first-hunt-hostiles');
  const alliedPosition = FIRST_HUNT_ALLIED_SLOTS[0];
  if (alliedPosition === undefined) throw new Error('FIRST HUNT allied slot is unavailable');
  return {
    schemaVersion: combat.COMBAT_V2_SCHEMA_VERSION,
    battleId: battleId(encounterId),
    rulesetId: M1_DOMAIN_BRIDGE_V2_RULESET_ID,
    seed: 17,
    map: FIRST_HUNT_COMBAT_MAP,
    sides: [
      { id: allySide, retreatHexes: FIRST_HUNT_RETREAT_HEXES.allied },
      { id: hostileSide, retreatHexes: FIRST_HUNT_RETREAT_HEXES.hostile },
    ],
    units: [
      {
        id: unitId('test-company-member'),
        sideId: allySide,
        position: alliedPosition,
        weaponId: 'raider' as const,
        attributes: {
          health: 100,
          armor: 100,
          stamina: 100,
          initiative: 1,
          accuracy: 22,
          defense: 20,
          morale: 100,
        },
        initialPools: { health: 100, armor: 100, stamina: 100, morale: 100 },
      },
      ...FIRST_HUNT_HOSTILE_GENESIS.map((hostile) => ({
        id: unitId(hostile.entityId),
        sideId: hostileSide,
        position: hostile.position,
        weaponId: hostile.weaponId as BattleSetupV2['units'][number]['weaponId'],
        attributes: hostile.attributes,
        initialPools: hostile.initialPools,
      })),
    ],
  };
}

function makeFirstHuntJoinActor(worldId: string): FirstHuntJoinActor {
  const accountId = randomUUID();
  const companyId = randomUUID();
  const partyId = randomUUID();
  const sessionToken = randomUUID();
  const base = createCompanyCombatAggregateFixture().state;
  const lifecycle = base.economy.lifecycle;
  const basePartyId = lifecycle.parties[0]?.partyId;
  if (basePartyId === undefined) throw new Error('FIRST HUNT join fixture party is missing');
  const members = lifecycle.characters
    .filter((character) => character.presence.fieldPartyId !== null)
    .map((character) => character.identity.characterId);
  const memberIds = members.map(() => randomUUID());
  const replacements = new Map<string, string>([
    [lifecycle.worldId, worldId],
    [lifecycle.companyId, companyId],
    [basePartyId, partyId],
    ...members.map((id, index) => [id, memberIds[index]!] as const),
  ]);
  const remapped = JSON.parse(
    JSON.stringify(base, (_key, value: unknown) =>
      typeof value === 'string' ? (replacements.get(value) ?? value) : value,
    ),
  ) as typeof base;
  const location = {
    kind: 'AT' as const,
    siteId: 'staraya-melnitsa',
    areaId: 'staraya-melnitsa-yard',
  };
  const physical = remapped.economy.physical;
  if (!physical) throw new Error('FIRST HUNT join fixture physical state is missing');
  const moveContainer = (container: (typeof physical.containers)[number]) => ({
    ...container,
    location,
  });
  const initial = combat.readCompanyCombatAggregateState({
    ...remapped,
    economy: {
      ...remapped.economy,
      lifecycle: {
        ...remapped.economy.lifecycle,
        parties: remapped.economy.lifecycle.parties.map((party) => ({ ...party, location })),
        characters: remapped.economy.lifecycle.characters.map((character) =>
          character.presence.fieldPartyId === null
            ? character
            : { ...character, presence: { ...character.presence, location } },
        ),
      },
      physical: {
        ...physical,
        containers: physical.containers.map(moveContainer),
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: physical.knowledge.containerSnapshots.map(moveContainer),
        },
      },
    },
  });
  return {
    accountId,
    companyId,
    partyId,
    sessionToken,
    initial,
    headers: {
      cookie: `warwrit_session=${sessionToken}`,
      origin: 'http://127.0.0.1:3108',
      [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
    },
  };
}

async function seedFirstHuntJoinScenario(database: (typeof databases)[number]): Promise<{
  readonly worldId: string;
  readonly owner: FirstHuntJoinActor;
  readonly helper: FirstHuntJoinActor;
  readonly app: ReturnType<typeof buildApp>;
}> {
  const worldId = randomUUID();
  const owner = makeFirstHuntJoinActor(worldId);
  const helper = makeFirstHuntJoinActor(worldId);
  for (const [actor, subject] of [
    [owner, 'owner'],
    [helper, 'helper'],
  ] as const) {
    const lifecycle = actor.initial.economy.lifecycle;
    await database
      .insertInto('identity_accounts')
      .values({
        id: actor.accountId,
        issuer: `first-hunt-join-${actor.accountId}`,
        subject,
      })
      .execute();
    await database
      .insertInto('identity_sessions')
      .values({
        token_digest: createHash('sha256').update(actor.sessionToken).digest(),
        account_id: actor.accountId,
        expires_at: new Date(Date.now() + 60 * 60_000),
      })
      .execute();
    await database
      .insertInto('company_snapshots')
      .values({
        world_id: worldId,
        company_id: actor.companyId,
        schema_version: combat.COMPANY_SCHEMA_VERSION,
        ruleset_id: combat.COMPANY_RULESET_ID,
        catalogue_version: combat.COMPANY_CATALOGUE_VERSION,
        command_schema_version: combat.COMPANY_COMMAND_SCHEMA_VERSION,
        public_revision: lifecycle.knowledge.revision,
        canonical_revision: lifecycle.revision,
        state: actor.initial,
      })
      .execute();
    await database
      .insertInto('company_account_owners')
      .values({ world_id: worldId, company_id: actor.companyId, account_id: actor.accountId })
      .execute();
  }
  await database
    .insertInto('world_campaign_clocks')
    .values({
      world_id: worldId,
      epoch_ms: String(Date.now() - 21_600 - 1_000),
      starting_tick: owner.initial.economy.lifecycle.campaignTick,
    })
    .execute();
  await ensureFirstHuntGenesis(database, worldId);
  await database
    .updateTable('contract_instances')
    .set({ owner_company_id: owner.companyId, helper_company_id: helper.companyId, revision: '1' })
    .where('world_id', '=', worldId)
    .where('instance_id', '=', 'ci.m1.raider-standard.01')
    .executeTakeFirstOrThrow();
  const config = loadServerConfig({
    DATABASE_URL: connectionString,
    OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
    OIDC_CLIENT_ID: 'warwrit-local',
    OIDC_CLIENT_SECRET: 'local-only-secret',
    OIDC_REDIRECT_URI: 'http://127.0.0.1:3108/auth/callback',
    PUBLIC_ORIGIN: 'http://127.0.0.1:3108',
    HOST: '127.0.0.1',
    PORT: '3108',
  });
  const app = buildApp({
    identity: { config: config.identity!, database },
    company: { database, worldId },
  });
  apps.push(app);
  return { worldId, owner, helper, app };
}

async function setFirstHuntWorldTick(
  database: (typeof databases)[number],
  worldId: string,
  tick: number,
  startingTick: string,
): Promise<void> {
  const elapsedTicks = tick - Number(startingTick);
  await database
    .updateTable('world_campaign_clocks')
    .set({ epoch_ms: String(Date.now() - elapsedTicks * 21_600 - 1_000) })
    .where('world_id', '=', worldId)
    .executeTakeFirstOrThrow();
}

function relocateFirstHuntJoinCompany(
  state: ReturnType<typeof combat.readCompanyCombatAggregateState>,
  location: { readonly kind: 'AT'; readonly siteId: string; readonly areaId: string },
) {
  const physical = state.economy.physical;
  if (!physical) throw new Error('FIRST HUNT join fixture physical state is missing');
  const moveContainer = (container: (typeof physical.containers)[number]) => ({
    ...container,
    location,
  });
  return combat.readCompanyCombatAggregateState({
    ...state,
    economy: {
      ...state.economy,
      lifecycle: {
        ...state.economy.lifecycle,
        parties: state.economy.lifecycle.parties.map((party) => ({ ...party, location })),
        characters: state.economy.lifecycle.characters.map((character) =>
          character.presence.fieldPartyId === null
            ? character
            : { ...character, presence: { ...character.presence, location } },
        ),
      },
      physical: {
        ...physical,
        containers: physical.containers.map(moveContainer),
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: physical.knowledge.containerSnapshots.map(moveContainer),
        },
      },
    },
  });
}

async function cleanupFirstHuntJoinScenario(
  database: (typeof databases)[number],
  worldId: string,
  actors: readonly FirstHuntJoinActor[],
): Promise<void> {
  const admissions = await database
    .selectFrom('encounter_admissions')
    .select('encounter_id')
    .where('world_id', '=', worldId)
    .execute();
  for (const admission of admissions)
    await removeEncounterFixture(database, admission.encounter_id);
  await database.deleteFrom('contract_instances').where('world_id', '=', worldId).execute();
  await database.deleteFrom('world_first_hunt_state').where('world_id', '=', worldId).execute();
  for (const actor of actors) {
    await database
      .deleteFrom('company_account_owners')
      .where('world_id', '=', worldId)
      .where('company_id', '=', actor.companyId)
      .execute();
    await database
      .deleteFrom('company_receipts')
      .where('world_id', '=', worldId)
      .where('company_id', '=', actor.companyId)
      .execute();
    await database
      .deleteFrom('company_audit_events')
      .where('world_id', '=', worldId)
      .where('company_id', '=', actor.companyId)
      .execute();
    await database
      .deleteFrom('company_snapshots')
      .where('world_id', '=', worldId)
      .where('company_id', '=', actor.companyId)
      .execute();
    await database
      .deleteFrom('identity_sessions')
      .where('account_id', '=', actor.accountId)
      .execute();
    await database.deleteFrom('identity_accounts').where('id', '=', actor.accountId).execute();
  }
  await database.deleteFrom('world_campaign_clocks').where('world_id', '=', worldId).execute();
}

async function seedCompanyEncounter(input: {
  readonly database: (typeof databases)[number];
  readonly accountId: string;
  readonly setup: BattleSetupV2;
  readonly initial: ReturnType<typeof startBattleV2>;
  readonly deadlineAt: Date | null;
  readonly policyMode?: 'HUMAN' | 'AFK';
  readonly aiWakeAt?: Date | null;
}): Promise<string> {
  const { database, accountId, setup, initial, deadlineAt } = input;
  const activation = initial.state.activation;
  if (activation === null) throw new Error('company encounter activation is unavailable');
  const worldId = randomUUID();
  await sql`
    insert into world_campaign_clocks (world_id, epoch_ms, starting_tick)
    values (${worldId}, ${String(Date.now() - 60_000)}, '0')
  `.execute(database);
  await database.transaction().execute(async (transaction) => {
    await sql`
      insert into encounters
        (id, world_id, schema_version, setup, state, revision, status,
         activation_id, activation_epoch, deadline_at, ai_wake_at)
      values
        (${String(setup.battleId)}, ${worldId}, ${setup.schemaVersion},
         ${JSON.stringify(setup)}::json, ${JSON.stringify(initial.state)}::json,
         ${initial.state.revision}, ${initial.state.status}, ${activation.id}, 1,
         ${deadlineAt}, ${input.aiWakeAt ?? null})
    `.execute(transaction);
    const unitIds = setup.units
      .filter((unit) => unit.sideId === setup.sides[0]!.id)
      .map((unit) => String(unit.id));
    await transaction
      .insertInto('encounter_participants')
      .values({
        encounter_id: String(setup.battleId),
        account_id: accountId,
        side_id: setup.sides[0]!.id,
        unit_ids: JSON.stringify(unitIds),
        admission_source: 'company_binding',
      })
      .execute();
    if (input.policyMode === 'AFK') {
      await sql`update encounter_participants set afk = true where encounter_id = ${String(setup.battleId)}
        and account_id = ${accountId}`.execute(transaction);
    }
    const hostileIds = setup.units
      .filter((unit) => unit.sideId === setup.sides[1]!.id)
      .map((unit) => String(unit.id));
    for (const hostileId of hostileIds) {
      await transaction
        .insertInto('encounter_ai_controllers')
        .values({
          encounter_id: String(setup.battleId),
          unit_id: hostileId,
          doctrine: 'aggressive',
          admission_source: 'world_hostile',
        })
        .execute();
    }
    const policyVersion =
      input.policyMode === 'AFK' ? 'first-hunt-afk-v1' : 'first-hunt-human-deadline-v1';
    const timeoutCommandId = firstHuntTimeoutCommandId(
      String(setup.battleId),
      activation.id,
      policyVersion,
    );
    if (unitIds.includes(String(activation.unitId))) {
      if (deadlineAt === null) throw new Error('company activation deadline is unavailable');
      await transaction
        .insertInto('encounter_activation_policies')
        .values({
          encounter_id: String(setup.battleId),
          activation_id: activation.id,
          activation_epoch: 1,
          account_id: accountId,
          unit_id: activation.unitId,
          policy_version: policyVersion,
          mode: input.policyMode ?? 'HUMAN',
          started_at: new Date(deadlineAt.getTime() - 30_000),
          deadline_at: deadlineAt,
          campaign_tick: '0',
          timeout_command_id: timeoutCommandId,
        })
        .execute();
    }
    for (const [ordinal, event] of initial.events.entries()) {
      await transaction
        .insertInto('encounter_events')
        .values({
          encounter_id: String(setup.battleId),
          revision: 0,
          ordinal,
          event_id: `${String(setup.battleId)}:0:${ordinal}`,
          event,
        })
        .execute();
    }
  });
  return worldId;
}

async function removeEncounterFixture(
  database: (typeof databases)[number],
  encounterId: string,
): Promise<void> {
  await database.deleteFrom('world_proof_claims').where('encounter_id', '=', encounterId).execute();
  await database.deleteFrom('encounter_receipts').where('encounter_id', '=', encounterId).execute();
  await database.deleteFrom('encounter_events').where('encounter_id', '=', encounterId).execute();
  await database.deleteFrom('encounter_commands').where('encounter_id', '=', encounterId).execute();
  await database
    .deleteFrom('encounter_activation_policies')
    .where('encounter_id', '=', encounterId)
    .execute();
  await database
    .deleteFrom('encounter_ai_controllers')
    .where('encounter_id', '=', encounterId)
    .execute();
  await database
    .deleteFrom('encounter_participants')
    .where('encounter_id', '=', encounterId)
    .execute();
  await database
    .deleteFrom('encounter_admissions')
    .where('encounter_id', '=', encounterId)
    .execute();
  await database.deleteFrom('encounters').where('id', '=', encounterId).execute();
}

async function reservePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('test listener did not bind a TCP port');
  }
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error === undefined ? resolve() : reject(error)));
  });
  return address.port;
}

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await Promise.all(databases.map((database) => database.destroy()));
});

describe('persistent fixture encounters (PostgreSQL)', () => {
  it.skipIf(connectionString === undefined)(
    'catches both FIRST HUNT companies up and activates one encounter across separate JOIN ticks',
    async () => {
      const database = databases[0];
      if (database === undefined) throw new Error('database missing');
      const scenario = await seedFirstHuntJoinScenario(database);
      const { owner, helper, worldId, app } = scenario;
      const startingTick = owner.initial.economy.lifecycle.campaignTick;
      try {
        const ownerRead = await app.inject({
          method: 'GET',
          url: '/contracts/first-hunt',
          headers: owner.headers,
        });
        expect(ownerRead.statusCode).toBe(200);
        const ownerJoin = {
          schemaVersion: 1,
          commandId: randomUUID(),
          expectedPublicRevision: ownerRead.json().publicRevision,
          type: 'JOIN',
          payload: { instanceId: 'ci.m1.raider-standard.01' },
        } as const;
        const ownerResponse = await app.inject({
          method: 'POST',
          url: '/contracts/commands',
          headers: owner.headers,
          payload: ownerJoin,
        });
        expect(ownerResponse.statusCode).toBe(200);
        expect(ownerResponse.json()).toMatchObject({ ok: true });
        expect(
          await database
            .selectFrom('encounter_admissions')
            .select('encounter_id')
            .where('world_id', '=', worldId)
            .execute(),
        ).toHaveLength(0);

        await setFirstHuntWorldTick(database, worldId, Number(startingTick) + 2, startingTick);
        const helperRead = await app.inject({
          method: 'GET',
          url: '/contracts/first-hunt',
          headers: helper.headers,
        });
        expect(helperRead.statusCode).toBe(200);
        const helperJoin = {
          schemaVersion: 1,
          commandId: randomUUID(),
          expectedPublicRevision: helperRead.json().publicRevision,
          type: 'JOIN',
          payload: { instanceId: 'ci.m1.raider-standard.01' },
        } as const;
        const helperResponse = await app.inject({
          method: 'POST',
          url: '/contracts/commands',
          headers: helper.headers,
          payload: helperJoin,
        });
        expect(helperResponse.statusCode).toBe(200);
        expect(helperResponse.json()).toMatchObject({ ok: true });

        const joinedStates = await database.transaction().execute(async (transaction) => {
          const ownerState = await loadCompanyAggregate(transaction, worldId, owner.companyId);
          const helperState = await loadCompanyAggregate(transaction, worldId, helper.companyId);
          return { ownerState, helperState };
        });
        expect(joinedStates.ownerState?.economy.lifecycle.campaignTick).toBe(
          String(Number(startingTick) + 2),
        );
        expect(joinedStates.ownerState?.economy.finance.processedTick).toBe(
          String(Number(startingTick) + 2),
        );
        expect(joinedStates.ownerState?.economy.physical?.processedTick).toBe(
          String(Number(startingTick) + 2),
        );
        expect(joinedStates.helperState?.economy.lifecycle.campaignTick).toBe(
          String(Number(startingTick) + 2),
        );
        expect(joinedStates.helperState?.economy.finance.processedTick).toBe(
          String(Number(startingTick) + 2),
        );
        expect(joinedStates.helperState?.economy.physical?.processedTick).toBe(
          String(Number(startingTick) + 2),
        );
        expect(joinedStates.ownerState?.encounter.active?.binding.participants).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ companyId: owner.companyId }),
            expect.objectContaining({ companyId: helper.companyId }),
          ]),
        );
        expect(joinedStates.helperState?.encounter.active?.binding.bindingId).toBe(
          joinedStates.ownerState?.encounter.active?.binding.bindingId,
        );
        expect(
          await database
            .selectFrom('encounter_admissions')
            .select('encounter_id')
            .where('world_id', '=', worldId)
            .execute(),
        ).toHaveLength(1);
        expect(
          await database
            .selectFrom('encounters')
            .select('id')
            .where('world_id', '=', worldId)
            .execute(),
        ).toHaveLength(1);

        const replay = await app.inject({
          method: 'POST',
          url: '/contracts/commands',
          headers: helper.headers,
          payload: helperJoin,
        });
        expect(replay.body).toBe(helperResponse.body);
        const conflictingReplay = await app.inject({
          method: 'POST',
          url: '/contracts/commands',
          headers: helper.headers,
          payload: {
            ...helperJoin,
            expectedPublicRevision: String(Number(helperJoin.expectedPublicRevision) + 1),
          },
        });
        expect(conflictingReplay.statusCode).toBe(409);
        expect(conflictingReplay.json()).toMatchObject({ ok: false, code: 'INVALID_COMMAND' });
        expect(
          await database
            .selectFrom('encounter_admissions')
            .select('encounter_id')
            .where('world_id', '=', worldId)
            .execute(),
        ).toHaveLength(1);
      } finally {
        await cleanupFirstHuntJoinScenario(database, worldId, [owner, helper]);
      }
    },
  );

  it.skipIf(connectionString === undefined)(
    'rejects activation when an earlier FIRST HUNT JOIN consent company has left the objective',
    async () => {
      const database = databases[0];
      if (database === undefined) throw new Error('database missing');
      const scenario = await seedFirstHuntJoinScenario(database);
      const { owner, helper, worldId, app } = scenario;
      const startingTick = owner.initial.economy.lifecycle.campaignTick;
      try {
        const ownerRead = await app.inject({
          method: 'GET',
          url: '/contracts/first-hunt',
          headers: owner.headers,
        });
        const ownerJoin = {
          schemaVersion: 1,
          commandId: randomUUID(),
          expectedPublicRevision: ownerRead.json().publicRevision,
          type: 'JOIN',
          payload: { instanceId: 'ci.m1.raider-standard.01' },
        } as const;
        const accepted = await app.inject({
          method: 'POST',
          url: '/contracts/commands',
          headers: owner.headers,
          payload: ownerJoin,
        });
        expect(accepted.statusCode).toBe(200);

        const ownerState = await database
          .transaction()
          .execute((transaction) => loadCompanyAggregate(transaction, worldId, owner.companyId));
        if (!ownerState) throw new Error('FIRST HUNT owner state is missing');
        const movedOwnerState = relocateFirstHuntJoinCompany(ownerState, {
          kind: 'AT',
          siteId: 'kamenny-brod',
          areaId: 'kamenny-brod-market',
        });
        await database
          .updateTable('company_snapshots')
          .set({ state: movedOwnerState })
          .where('world_id', '=', worldId)
          .where('company_id', '=', owner.companyId)
          .executeTakeFirstOrThrow();

        await setFirstHuntWorldTick(database, worldId, Number(startingTick) + 2, startingTick);
        const helperRead = await app.inject({
          method: 'GET',
          url: '/contracts/first-hunt',
          headers: helper.headers,
        });
        const helperJoin = {
          schemaVersion: 1,
          commandId: randomUUID(),
          expectedPublicRevision: helperRead.json().publicRevision,
          type: 'JOIN',
          payload: { instanceId: 'ci.m1.raider-standard.01' },
        } as const;
        const before = await database.transaction().execute(async (transaction) => {
          const contract = await transaction
            .selectFrom('contract_instances')
            .select(['revision', 'owner_join', 'helper_join'])
            .where('world_id', '=', worldId)
            .where('instance_id', '=', 'ci.m1.raider-standard.01')
            .executeTakeFirstOrThrow();
          const ownerRoot = await loadCompanyAggregate(transaction, worldId, owner.companyId);
          const helperRoot = await loadCompanyAggregate(transaction, worldId, helper.companyId);
          const receipts = await transaction
            .selectFrom('company_receipts')
            .select(['company_id', 'command_id', 'receipt_id'])
            .where('world_id', '=', worldId)
            .where('company_id', 'in', [owner.companyId, helper.companyId])
            .execute();
          return { contract, ownerRoot, helperRoot, receipts };
        });
        const rejected = await app.inject({
          method: 'POST',
          url: '/contracts/commands',
          headers: helper.headers,
          payload: helperJoin,
        });
        expect(rejected.statusCode).toBe(409);
        expect(rejected.json()).toMatchObject({ ok: false, code: 'NOT_AVAILABLE' });
        const after = await database.transaction().execute(async (transaction) => {
          const contract = await transaction
            .selectFrom('contract_instances')
            .select(['revision', 'owner_join', 'helper_join'])
            .where('world_id', '=', worldId)
            .where('instance_id', '=', 'ci.m1.raider-standard.01')
            .executeTakeFirstOrThrow();
          const ownerRoot = await loadCompanyAggregate(transaction, worldId, owner.companyId);
          const helperRoot = await loadCompanyAggregate(transaction, worldId, helper.companyId);
          const admissions = await transaction
            .selectFrom('encounter_admissions')
            .select('encounter_id')
            .where('world_id', '=', worldId)
            .execute();
          const receipts = await transaction
            .selectFrom('company_receipts')
            .select(['company_id', 'command_id', 'receipt_id'])
            .where('world_id', '=', worldId)
            .where('company_id', 'in', [owner.companyId, helper.companyId])
            .execute();
          return { contract, ownerRoot, helperRoot, admissions, receipts };
        });
        expect(after).toEqual({ ...before, admissions: [] });
      } finally {
        await cleanupFirstHuntJoinScenario(database, worldId, [owner, helper]);
      }
    },
  );

  it.skipIf(connectionString === undefined)(
    'requires fresh FIRST HUNT JOIN consent after a company revision changes',
    async () => {
      const database = databases[0];
      if (database === undefined) throw new Error('database missing');
      const scenario = await seedFirstHuntJoinScenario(database);
      const { owner, helper, worldId, app } = scenario;
      const startingTick = owner.initial.economy.lifecycle.campaignTick;
      try {
        const ownerRead = await app.inject({
          method: 'GET',
          url: '/contracts/first-hunt',
          headers: owner.headers,
        });
        const ownerJoin = {
          schemaVersion: 1,
          commandId: randomUUID(),
          expectedPublicRevision: ownerRead.json().publicRevision,
          type: 'JOIN',
          payload: { instanceId: 'ci.m1.raider-standard.01' },
        } as const;
        const ownerAccepted = await app.inject({
          method: 'POST',
          url: '/contracts/commands',
          headers: owner.headers,
          payload: ownerJoin,
        });
        expect(ownerAccepted.statusCode).toBe(200);

        const ownerCompany = owner.initial.economy.lifecycle.company;
        if (!ownerCompany) throw new Error('FIRST HUNT owner company is missing');
        const renamed = await app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: owner.headers,
          payload: {
            schemaVersion: 2,
            commandId: randomUUID(),
            expectedPublicRevision: owner.initial.economy.lifecycle.knowledge.revision,
            type: 'RenameCompany',
            payload: {
              name: 'The Revised Company',
              bannerId: ownerCompany.bannerId,
            },
          },
        });
        expect(renamed.statusCode, renamed.body).toBe(200);

        await setFirstHuntWorldTick(database, worldId, Number(startingTick) + 2, startingTick);
        const helperRead = await app.inject({
          method: 'GET',
          url: '/contracts/first-hunt',
          headers: helper.headers,
        });
        const helperJoin = {
          schemaVersion: 1,
          commandId: randomUUID(),
          expectedPublicRevision: helperRead.json().publicRevision,
          type: 'JOIN',
          payload: { instanceId: 'ci.m1.raider-standard.01' },
        } as const;
        const before = await database.transaction().execute(async (transaction) => ({
          contract: await transaction
            .selectFrom('contract_instances')
            .select(['revision', 'owner_join', 'helper_join'])
            .where('world_id', '=', worldId)
            .where('instance_id', '=', 'ci.m1.raider-standard.01')
            .executeTakeFirstOrThrow(),
          ownerRoot: await loadCompanyAggregate(transaction, worldId, owner.companyId),
          helperRoot: await loadCompanyAggregate(transaction, worldId, helper.companyId),
          receipts: await transaction
            .selectFrom('company_receipts')
            .select(['company_id', 'command_id', 'receipt_id'])
            .where('world_id', '=', worldId)
            .where('company_id', 'in', [owner.companyId, helper.companyId])
            .execute(),
        }));
        const rejected = await app.inject({
          method: 'POST',
          url: '/contracts/commands',
          headers: helper.headers,
          payload: helperJoin,
        });
        expect(rejected.statusCode).toBe(409);
        expect(rejected.json()).toMatchObject({ ok: false, code: 'NOT_AVAILABLE' });
        expect(
          await database.transaction().execute(async (transaction) => ({
            contract: await transaction
              .selectFrom('contract_instances')
              .select(['revision', 'owner_join', 'helper_join'])
              .where('world_id', '=', worldId)
              .where('instance_id', '=', 'ci.m1.raider-standard.01')
              .executeTakeFirstOrThrow(),
            ownerRoot: await loadCompanyAggregate(transaction, worldId, owner.companyId),
            helperRoot: await loadCompanyAggregate(transaction, worldId, helper.companyId),
            receipts: await transaction
              .selectFrom('company_receipts')
              .select(['company_id', 'command_id', 'receipt_id'])
              .where('world_id', '=', worldId)
              .where('company_id', 'in', [owner.companyId, helper.companyId])
              .execute(),
            admissions: await transaction
              .selectFrom('encounter_admissions')
              .select('encounter_id')
              .where('world_id', '=', worldId)
              .execute(),
          })),
        ).toEqual({ ...before, admissions: [] });

        const ownerRefresh = await app.inject({
          method: 'GET',
          url: '/contracts/first-hunt',
          headers: owner.headers,
        });
        const ownerRejoin = await app.inject({
          method: 'POST',
          url: '/contracts/commands',
          headers: owner.headers,
          payload: {
            schemaVersion: 1,
            commandId: randomUUID(),
            expectedPublicRevision: ownerRefresh.json().publicRevision,
            type: 'JOIN',
            payload: { instanceId: 'ci.m1.raider-standard.01' },
          },
        });
        expect(ownerRejoin.statusCode, ownerRejoin.body).toBe(200);

        const helperRefresh = await app.inject({
          method: 'GET',
          url: '/contracts/first-hunt',
          headers: helper.headers,
        });
        const helperRejoin = await app.inject({
          method: 'POST',
          url: '/contracts/commands',
          headers: helper.headers,
          payload: {
            ...helperJoin,
            commandId: randomUUID(),
            expectedPublicRevision: helperRefresh.json().publicRevision,
          },
        });
        expect(helperRejoin.statusCode, helperRejoin.body).toBe(200);
        const joinedStates = await database.transaction().execute(async (transaction) => ({
          owner: await loadCompanyAggregate(transaction, worldId, owner.companyId),
          helper: await loadCompanyAggregate(transaction, worldId, helper.companyId),
        }));
        expect(joinedStates.owner?.economy.lifecycle.campaignTick).toBe(
          String(Number(startingTick) + 2),
        );
        expect(joinedStates.helper?.economy.lifecycle.campaignTick).toBe(
          String(Number(startingTick) + 2),
        );
        expect(joinedStates.owner?.encounter.active?.binding.bindingId).toBe(
          joinedStates.helper?.encounter.active?.binding.bindingId,
        );
      } finally {
        await cleanupFirstHuntJoinScenario(database, worldId, [owner, helper]);
      }
    },
  );

  it.skipIf(connectionString === undefined)(
    'serializes a manual command against its due timeout into one accepted transition',
    async () => {
      const database = databases[0];
      if (database === undefined) throw new Error('database missing');
      const accountId = randomUUID();
      const issuer = `encounter-command-timeout-race-${accountId}`;
      const encounterId = randomUUID();
      const setup = createHumanEncounterSetup(encounterId);
      const initial = startBattleV2(setup);
      const activation = initial.state.activation;
      if (activation === null) throw new Error('race fixture activation is unavailable');
      const deadlineAt = new Date(Date.now() + 5_000);
      await database
        .insertInto('identity_accounts')
        .values({ id: accountId, issuer, subject: 'timeout-race-owner' })
        .execute();
      const worldId = await seedCompanyEncounter({
        database,
        accountId,
        setup,
        initial,
        deadlineAt,
      });
      try {
        const dueAt = new Date(deadlineAt.getTime() + 1);
        const due = (await listDueEncounterTimeouts(database, dueAt)).find(
          (candidate) => candidate.encounterId === encounterId,
        );
        if (due === undefined) throw new Error('manual-timeout race was not scheduled');
        const manualCommand = {
          version: 1 as const,
          encounterId,
          commandId: 'manual-command-before-timeout',
          expectedRevision: 0,
          activationId: activation.id,
          actorId: activation.unitId,
          intent: { type: 'wait' as const },
        };
        const [manual, timeout] = await Promise.all([
          executeEncounterCommand(database, accountId, manualCommand, true),
          executeEncounterTimeout(database, due, dueAt),
        ]);
        expect(
          [manual, timeout].filter((response) => response?.status === 'accepted'),
        ).toHaveLength(1);
        const stored = await sql<{
          readonly revision: number;
          readonly command_count: number;
          readonly receipt_count: number;
        }>`
          select revision,
            (select count(*)::int from encounter_commands where encounter_id = e.id) command_count,
            (select count(*)::int from encounter_receipts where encounter_id = e.id) receipt_count
          from encounters e where id = ${encounterId}
        `.execute(database);
        expect(stored.rows).toEqual([{ revision: 1, command_count: 1, receipt_count: 1 }]);
        expect(await verifyEncounterReplay(database, encounterId)).toBe(true);
      } finally {
        await removeEncounterFixture(database, encounterId);
        await database
          .deleteFrom('world_campaign_clocks')
          .where('world_id', '=', worldId)
          .execute();
        await database.deleteFrom('identity_accounts').where('id', '=', accountId).execute();
      }
    },
  );

  it.skipIf(connectionString === undefined)(
    'commits one deterministic V2 timeout, marks AFK and keeps replay valid after reload',
    async () => {
      const database = databases[0];
      if (database === undefined) throw new Error('database missing');
      const accountId = randomUUID();
      const encounterId = randomUUID();
      const issuer = `encounter-timeout-test-${accountId}`;
      const allySide = sideId('first-hunt-companies');
      const hostileSide = sideId('first-hunt-hostiles');
      const hostile = FIRST_HUNT_HOSTILE_GENESIS[0];
      const alliedPosition = FIRST_HUNT_ALLIED_SLOTS[0];
      if (hostile === undefined || alliedPosition === undefined)
        throw new Error('FIRST HUNT profile units are unavailable');
      const setup: BattleSetupV2 = {
        schemaVersion: combat.COMBAT_V2_SCHEMA_VERSION,
        battleId: battleId(encounterId),
        rulesetId: M1_DOMAIN_BRIDGE_V2_RULESET_ID,
        seed: 17,
        map: FIRST_HUNT_COMBAT_MAP,
        sides: [
          { id: allySide, retreatHexes: FIRST_HUNT_RETREAT_HEXES.allied },
          { id: hostileSide, retreatHexes: FIRST_HUNT_RETREAT_HEXES.hostile },
        ],
        units: [
          {
            id: unitId('test-company-member'),
            sideId: allySide,
            position: alliedPosition,
            weaponId: 'raider',
            attributes: {
              health: 60,
              armor: 40,
              stamina: 80,
              initiative: 120,
              accuracy: 22,
              defense: 6,
              morale: 100,
            },
            initialPools: { health: 60, armor: 40, stamina: 80, morale: 100 },
          },
          {
            id: unitId(hostile.entityId),
            sideId: hostileSide,
            position: hostile.position,
            weaponId: hostile.weaponId,
            attributes: hostile.attributes,
            initialPools: hostile.initialPools,
          },
        ],
      };
      const initial = startBattleV2(setup);
      const activation = initial.state.activation;
      if (!activation || activation.unitId !== setup.units[0]!.id)
        throw new Error('V2 timeout fixture must begin on its company participant');
      const now = new Date();
      const deadline = new Date(now.getTime() - 1_000);
      const policyVersion = 'first-hunt-human-deadline-v1';
      const timeoutCommandId = firstHuntTimeoutCommandId(encounterId, activation.id, policyVersion);
      await database
        .insertInto('identity_accounts')
        .values({ id: accountId, issuer, subject: 'timeout-owner' })
        .execute();
      await sql`
        insert into world_campaign_clocks (world_id, epoch_ms, starting_tick)
        values ('main', ${String(now.getTime() - 60_000)}, '0')
        on conflict (world_id) do nothing
      `.execute(database);
      try {
        await database.transaction().execute(async (transaction) => {
          await sql`
            insert into encounters
              (id, world_id, schema_version, setup, state, revision, status,
               activation_id, activation_epoch, deadline_at)
            values
              (${encounterId}, 'main', 2, ${JSON.stringify(setup)}::json,
               ${JSON.stringify(initial.state)}::json, 0, 'active',
               ${activation.id}, 1, ${deadline})
          `.execute(transaction);
          await sql`
            insert into encounter_participants
              (encounter_id, account_id, side_id, unit_ids, admission_source)
            values
              (${encounterId}, ${accountId}, ${allySide},
               ${JSON.stringify([activation.unitId])}::jsonb, 'company_binding')
          `.execute(transaction);
          await sql`
            insert into encounter_ai_controllers
              (encounter_id, unit_id, doctrine, admission_source)
            values (${encounterId}, ${hostile.entityId}, 'aggressive', 'world_hostile')
          `.execute(transaction);
          await transaction
            .insertInto('encounter_activation_policies')
            .values({
              encounter_id: encounterId,
              activation_id: activation.id,
              activation_epoch: 1,
              account_id: accountId,
              unit_id: activation.unitId,
              policy_version: policyVersion,
              mode: 'HUMAN',
              started_at: new Date(deadline.getTime() - 30_000),
              deadline_at: deadline,
              campaign_tick: '0',
              timeout_command_id: timeoutCommandId,
            })
            .execute();
          for (const [ordinal, event] of initial.events.entries()) {
            await sql`
              insert into encounter_events (encounter_id, revision, ordinal, event_id, event)
              values (${encounterId}, 0, ${ordinal}, ${`${encounterId}:0:${ordinal}`},
                ${JSON.stringify(event)}::json)
            `.execute(transaction);
          }
        });

        const restartedDatabase = createDatabase(connectionString!);
        try {
          const due = (await listDueEncounterTimeouts(restartedDatabase, now)).find(
            (candidate) => candidate.encounterId === encounterId,
          );
          expect(due).toMatchObject({ encounterId, revision: 0, activationId: activation.id });
          if (due === undefined)
            throw new Error('persisted timeout was not discovered after reload');
          const raced = await Promise.all([
            executeEncounterTimeout(database, due, now),
            executeEncounterTimeout(restartedDatabase, due, now),
          ]);
          const accepted = raced.filter((response) => response?.status === 'accepted');
          expect(accepted).toHaveLength(1);
          expect(accepted[0]).toMatchObject({
            status: 'accepted',
            commandId: timeoutCommandId,
            revision: 1,
          });
          expect(
            (await listDueEncounterTimeouts(restartedDatabase, now)).some(
              (candidate) => candidate.encounterId === encounterId,
            ),
          ).toBe(false);
          const replayAfterRestart = createDatabase(connectionString!);
          try {
            expect(await verifyEncounterReplay(replayAfterRestart, encounterId)).toBe(true);
          } finally {
            await replayAfterRestart.destroy();
          }
          const persisted = await sql<{
            readonly afk: boolean;
            readonly source_kind: string;
            readonly command_id: string;
            readonly activation_policy_id: string | null;
          }>`
            select participant.afk, command.source_kind, command.command_id,
              command.activation_policy_id
            from encounter_participants as participant
            join encounter_commands as command on command.encounter_id = participant.encounter_id
            where participant.encounter_id = ${encounterId}
          `.execute(restartedDatabase);
          expect(persisted.rows).toEqual([
            {
              afk: true,
              source_kind: 'system_timeout',
              command_id: timeoutCommandId,
              activation_policy_id: activation.id,
            },
          ]);
        } finally {
          await restartedDatabase.destroy();
        }
      } finally {
        await removeEncounterFixture(database, encounterId);
        await database.deleteFrom('identity_accounts').where('id', '=', accountId).execute();
      }
    },
  );

  it.skipIf(connectionString === undefined)(
    'applies an explicit resume request only when the controller receives a later activation',
    async () => {
      const database = databases[0];
      if (database === undefined) throw new Error('database missing');
      const accountId = randomUUID();
      const issuer = `encounter-resume-test-${accountId}`;
      const encounterId = randomUUID();
      const setup = createHumanEncounterSetup(encounterId, 2);
      const initial = startBattleV2(setup);
      const activation = initial.state.activation;
      if (activation === null) throw new Error('resume fixture activation is unavailable');
      const next = combat.applyCombatCommand(initial.state, {
        type: 'wait',
        commandId: combat.commandId('resume-order-check'),
        activationId: activation.id,
        actorId: activation.unitId,
      });
      if (!next.ok || next.state.activation?.unitId !== setup.units[1]?.id)
        throw new Error('resume fixture must activate its second company member next');
      const deadlineAt = new Date(Date.now() + 2_000);
      await database
        .insertInto('identity_accounts')
        .values({ id: accountId, issuer, subject: 'resume-owner' })
        .execute();
      const worldId = await seedCompanyEncounter({
        database,
        accountId,
        setup,
        initial,
        deadlineAt,
        policyMode: 'AFK',
      });
      try {
        const before = await database
          .selectFrom('encounter_activation_policies')
          .select(['mode', 'activation_id'])
          .where('encounter_id', '=', encounterId)
          .executeTakeFirstOrThrow();
        expect(before.mode).toBe('AFK');
        const requested = await requestEncounterResume(database, accountId, encounterId);
        expect(requested).toEqual({ version: 1, encounterId, afterEpoch: 1 });
        const during = await database
          .selectFrom('encounters')
          .select(['activation_id', 'activation_epoch', 'revision'])
          .where('id', '=', encounterId)
          .executeTakeFirstOrThrow();
        const stillCurrent = await database
          .selectFrom('encounter_activation_policies')
          .select('mode')
          .where('encounter_id', '=', encounterId)
          .where('activation_id', '=', activation.id)
          .executeTakeFirstOrThrow();
        expect(during).toEqual({ activation_id: activation.id, activation_epoch: 1, revision: 0 });
        expect(stillCurrent.mode).toBe('AFK');

        const timeoutDueAt = new Date(deadlineAt.getTime() + 1);
        const timeout = await executeEncounterTimeout(
          database,
          {
            encounterId,
            revision: 0,
            activationId: activation.id,
            activationEpoch: 1,
            dueAt: deadlineAt,
          },
          timeoutDueAt,
        );
        expect(timeout).toMatchObject({ status: 'accepted', revision: 1 });
        const resulting = await sql<{
          readonly activation_id: string;
          readonly activation_epoch: number;
          readonly policy_mode: string;
          readonly afk: boolean;
          readonly resume_requested_after_epoch: number | null;
        }>`
          select encounter.activation_id, encounter.activation_epoch, policy.mode as policy_mode,
            participant.afk, participant.resume_requested_after_epoch
          from encounters as encounter
          join encounter_activation_policies as policy
            on policy.encounter_id = encounter.id and policy.activation_id = encounter.activation_id
          join encounter_participants as participant on participant.encounter_id = encounter.id
          where encounter.id = ${encounterId}
        `.execute(database);
        expect(resulting.rows).toEqual([
          {
            activation_id: next.state.activation?.id,
            activation_epoch: 2,
            policy_mode: 'HUMAN',
            afk: false,
            resume_requested_after_epoch: null,
          },
        ]);
      } finally {
        await removeEncounterFixture(database, encounterId);
        await database
          .deleteFrom('world_campaign_clocks')
          .where('world_id', '=', worldId)
          .execute();
        await database.deleteFrom('identity_accounts').where('id', '=', accountId).execute();
      }
    },
  );

  it.skipIf(connectionString === undefined)(
    'executes one scheduled aggressive world-hostile activation and keeps its replay valid',
    async () => {
      const [database, restartedDatabase] = databases;
      if (database === undefined || restartedDatabase === undefined)
        throw new Error('database missing');
      const accountId = randomUUID();
      const issuer = `encounter-hostile-ai-test-${accountId}`;
      const encounterId = randomUUID();
      const setup = createWorldHostileSetup(encounterId);
      const initial = startBattleV2(setup);
      const activation = initial.state.activation;
      if (activation === null || !String(activation.unitId).startsWith('world.raider.'))
        throw new Error('FIRST HUNT fixture must begin on a world-hostile activation');
      const dueAt = new Date(Date.now() - 1_000);
      await database
        .insertInto('identity_accounts')
        .values({ id: accountId, issuer, subject: 'hostile-ai-owner' })
        .execute();
      const worldId = await seedCompanyEncounter({
        database,
        accountId,
        setup,
        initial,
        deadlineAt: null,
        aiWakeAt: dueAt,
      });
      try {
        await ensureFirstHuntGenesis(database, worldId);
        await database
          .insertInto('encounter_admissions')
          .values({
            encounter_id: encounterId,
            world_id: worldId,
            instance_id: 'ci.m1.raider-standard.01',
            binding_version: 2,
            binding: {
              worldId,
              version: 's02-encounter-binding-2',
              participants: [{ companyId: 'admitted-test-company' }],
            },
            terminal_revision: null,
            effects_source_id: null,
            effects_applied_at: null,
          })
          .execute();
        const wake = (await listDueEncounterAiWakes(database, dueAt)).find(
          (candidate) => candidate.encounterId === encounterId,
        );
        expect(wake).toMatchObject({ encounterId, revision: 0, activationId: activation.id });
        if (wake === undefined) throw new Error('scheduled world-hostile wake was not discovered');
        const response = await executeEncounterAiWake(database, wake);
        expect(response).toMatchObject({
          status: 'accepted',
          commandId: expect.any(String),
          revision: 1,
        });
        expect(await executeEncounterAiWake(restartedDatabase, wake)).toBeUndefined();
        const successorWakes = (
          await listDueEncounterAiWakes(restartedDatabase, new Date())
        ).filter((candidate) => candidate.encounterId === encounterId);
        expect(successorWakes).toHaveLength(1);
        expect(successorWakes).not.toContainEqual(wake);
        const successorWake = successorWakes[0];
        expect(successorWake).toMatchObject({
          encounterId,
          revision: 1,
          activationId: wake.activationId,
          activationEpoch: wake.activationEpoch,
        });
        if (successorWake === undefined) throw new Error('successor AI wake was not scheduled');
        expect(successorWake.dueAt.getTime()).toBeGreaterThan(wake.dueAt.getTime());
        const persisted = await sql<{
          readonly source_kind: string;
          readonly doctrine: string;
          readonly count: number;
        }>`
          select command.source_kind, controller.doctrine,
            (select count(*)::int from encounter_commands
             where encounter_id = command.encounter_id and source_kind = 'system_ai') as count
          from encounter_commands as command
          join encounter_ai_controllers as controller
            on controller.encounter_id = command.encounter_id
            and controller.unit_id = command.command #>> '{actorId}'
          where command.encounter_id = ${encounterId} and command.source_kind = 'system_ai'
        `.execute(restartedDatabase);
        expect(persisted.rows).toEqual([
          { source_kind: 'system_ai', doctrine: 'aggressive', count: 1 },
        ]);
        expect(await verifyEncounterReplay(restartedDatabase, encounterId)).toBe(true);
      } finally {
        await removeEncounterFixture(database, encounterId);
        await database.deleteFrom('contract_instances').where('world_id', '=', worldId).execute();
        await database
          .deleteFrom('world_first_hunt_state')
          .where('world_id', '=', worldId)
          .execute();
        await database
          .deleteFrom('world_campaign_clocks')
          .where('world_id', '=', worldId)
          .execute();
        await database.deleteFrom('identity_accounts').where('id', '=', accountId).execute();
      }
    },
  );

  it.skipIf(connectionString === undefined)(
    'replays an accepted command after binding release but rejects fresh actions',
    async () => {
      const database = databases[0];
      if (database === undefined) throw new Error('database missing');
      const accountId = randomUUID();
      const issuer = `encounter-binding-release-${accountId}`;
      const encounterId = randomUUID();
      const setup = createHumanEncounterSetup(encounterId);
      const initial = startBattleV2(setup);
      const activation = initial.state.activation;
      if (activation === null) throw new Error('binding fixture activation is unavailable');
      const deadlineAt = new Date(Date.now() + 30_000);
      await database
        .insertInto('identity_accounts')
        .values({ id: accountId, issuer, subject: 'binding-owner' })
        .execute();
      const worldId = await seedCompanyEncounter({
        database,
        accountId,
        setup,
        initial,
        deadlineAt,
      });
      try {
        const acceptedCommand = {
          version: 1 as const,
          encounterId,
          commandId: 'accepted-before-binding-release',
          expectedRevision: 0,
          activationId: activation.id,
          actorId: activation.unitId,
          intent: { type: 'wait' as const },
        };
        const accepted = await executeEncounterCommand(database, accountId, acceptedCommand, true);
        expect(accepted).toMatchObject({ status: 'accepted', revision: 1 });
        expect(await executeEncounterCommand(database, accountId, acceptedCommand, false)).toEqual(
          accepted,
        );
        const fresh = await executeEncounterCommand(
          database,
          accountId,
          {
            ...acceptedCommand,
            commandId: 'new-action-after-binding-release',
            expectedRevision: 1,
          },
          false,
        );
        expect(fresh).toMatchObject({ status: 'rejected', code: 'UNAUTHORIZED' });
        expect(await verifyEncounterReplay(database, encounterId)).toBe(true);
      } finally {
        await removeEncounterFixture(database, encounterId);
        await database
          .deleteFrom('world_campaign_clocks')
          .where('world_id', '=', worldId)
          .execute();
        await database.deleteFrom('identity_accounts').where('id', '=', accountId).execute();
      }
    },
  );

  it.skipIf(connectionString === undefined)(
    'serializes competing connections, returns historical receipts, rejects atomically and replays after reload',
    async () => {
      const [firstDb, secondDb] = databases;
      if (firstDb === undefined || secondDb === undefined) throw new Error('database missing');
      const accountId = randomUUID();
      const foreignAccountId = randomUUID();
      const sessionToken = randomUUID();
      const sessionDigest = createHash('sha256').update(sessionToken).digest();
      const issuer = `encounter-test-${accountId}`;
      const ownedEncounters: string[] = [];
      await firstDb
        .insertInto('identity_accounts')
        .values([
          { id: accountId, issuer, subject: 'owner' },
          { id: foreignAccountId, issuer, subject: 'foreign' },
        ])
        .execute();
      await firstDb
        .insertInto('identity_sessions')
        .values({
          token_digest: sessionDigest,
          account_id: accountId,
          expires_at: new Date(Date.now() + 60_000),
        })
        .execute();
      await createDatabaseReadinessProbe(firstDb, true, true)();
      const config = loadServerConfig({
        DATABASE_URL: connectionString,
        OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
        OIDC_CLIENT_ID: 'warwrit-local',
        OIDC_CLIENT_SECRET: 'local-only-secret',
        OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
        PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
        HOST: '127.0.0.1',
        PORT: '3107',
        ENCOUNTER_FIXTURES: '1',
      });
      const app = buildApp({
        logger: false,
        identity: { config: config.identity!, database: firstDb },
        encounters: { database: firstDb, fixtureAdmission: true },
      });
      apps.push(app);
      const cookie = `warwrit_session=${sessionToken}`;
      try {
        const createdResponse = await app.inject({
          method: 'POST',
          url: '/encounters/fixtures',
          headers: { cookie, origin: 'http://127.0.0.1:3107' },
          payload: { version: 1 },
        });
        expect(createdResponse.statusCode).toBe(201);
        expect(Object.keys(createdResponse.json()).sort()).toEqual([
          'encounterId',
          'revision',
          'status',
          'version',
        ]);
        expect(
          (
            await app.inject({
              method: 'GET',
              url: '/encounters/not-a-uuid',
              headers: { cookie },
            })
          ).statusCode,
        ).toBe(400);
        expect(
          (
            await app.inject({
              method: 'POST',
              url: '/encounters/commands',
              headers: { cookie, origin: 'http://127.0.0.1:3107' },
              payload: {
                version: 1,
                encounterId: 'not-a-uuid',
                commandId: 'bad-id',
                expectedRevision: 0,
                activationId: '1:human-shield',
                actorId: 'human-shield',
                intent: { type: 'defend' },
              },
            })
          ).statusCode,
        ).toBe(400);
        const fixture = createdResponse.json() as {
          readonly encounterId: string;
          readonly revision: number;
          readonly status: 'active' | 'resolved';
        };
        ownedEncounters.push(fixture.encounterId);
        const publicRead = await app.inject({
          method: 'GET',
          url: `/encounters/${fixture.encounterId}`,
          headers: { cookie },
        });
        expect(publicRead.statusCode).toBe(200);
        expect(publicRead.json()).toEqual({
          version: 1,
          encounterId: fixture.encounterId,
          revision: 0,
          status: 'active',
        });
        const stateRow = await sql<{
          readonly state: {
            readonly revision: number;
            readonly activation: { readonly id: string; readonly unitId: string };
          };
        }>`select state from encounters where id = ${fixture.encounterId}`.execute(firstDb);
        const initial = stateRow.rows[0]?.state;
        if (initial === undefined) throw new Error('fixture state missing');

        const makeCommand = (commandId: string, type: 'defend' | 'wait') => ({
          version: 1 as const,
          encounterId: fixture.encounterId,
          commandId,
          expectedRevision: 0,
          activationId: initial.activation.id,
          actorId: initial.activation.unitId,
          intent: { type },
        });
        const snapshotRows = async (encounterId: string) => {
          const result = await sql<{ readonly snapshot: unknown }>`
            select json_build_object(
              'encounter', row_to_json(e),
              'commands', coalesce((
                select json_agg(row_to_json(c) order by c.revision)
                from encounter_commands c where c.encounter_id = e.id
              ), '[]'::json),
              'events', coalesce((
                select json_agg(row_to_json(v) order by v.revision, v.ordinal)
                from encounter_events v where v.encounter_id = e.id
              ), '[]'::json),
              'receipts', coalesce((
                select json_agg(row_to_json(r) order by r.command_id)
                from encounter_receipts r where r.encounter_id = e.id
              ), '[]'::json)
            ) as snapshot
            from encounters e where e.id = ${encounterId}
          `.execute(firstDb);
          return result.rows[0]?.snapshot;
        };
        const competing = [makeCommand('race-one', 'defend'), makeCommand('race-two', 'wait')];
        const raced = await Promise.all([
          executeEncounterCommand(firstDb, accountId, competing[0]!),
          executeEncounterCommand(secondDb, accountId, competing[1]!),
        ]);
        expect(raced.filter((result) => result.status === 'accepted')).toHaveLength(1);
        expect(
          raced.filter((result) => result.status === 'rejected' && result.code === 'CONFLICT'),
        ).toHaveLength(1);
        const winnerIndex = raced[0]?.status === 'accepted' ? 0 : 1;
        const winningCommand = competing[winnerIndex]!;
        expect(await executeEncounterCommand(secondDb, accountId, winningCommand)).toEqual(
          raced[winnerIndex],
        );
        expect(
          await executeEncounterCommand(secondDb, accountId, {
            ...winningCommand,
            intent: { type: winningCommand.intent.type === 'defend' ? 'wait' : 'defend' },
          }),
        ).toMatchObject({ status: 'rejected', code: 'CONFLICT' });
        expect(
          await executeEncounterCommand(secondDb, foreignAccountId, winningCommand),
        ).toMatchObject({
          status: 'rejected',
          code: 'NOT_FOUND',
        });
        const reloadDb = createDatabase(connectionString!);
        try {
          expect(await verifyEncounterReplay(reloadDb, fixture.encounterId)).toBe(true);
        } finally {
          await reloadDb.destroy();
        }

        const sameIdFixture = await createFixtureEncounter(firstDb, accountId);
        ownedEncounters.push(sameIdFixture.encounterId);
        const sameIdStateResult = await sql<{
          readonly state: {
            readonly activation: { readonly id: string; readonly unitId: string };
          };
        }>`select state from encounters where id = ${sameIdFixture.encounterId}`.execute(firstDb);
        const sameIdState = sameIdStateResult.rows[0]?.state;
        if (sameIdState === undefined) throw new Error('fixture state missing');
        const sameIdCommand = {
          version: 1 as const,
          encounterId: sameIdFixture.encounterId,
          commandId: 'same-id-race',
          expectedRevision: 0,
          activationId: sameIdState.activation.id,
          actorId: sameIdState.activation.unitId,
          intent: { type: 'defend' as const },
        };
        const sameIdRaced = await Promise.all([
          executeEncounterCommand(firstDb, accountId, sameIdCommand),
          executeEncounterCommand(secondDb, accountId, sameIdCommand),
        ]);
        expect(sameIdRaced[0]).toMatchObject({ status: 'accepted' });
        expect(sameIdRaced[1]).toEqual(sameIdRaced[0]);

        const invalidFixture = await createFixtureEncounter(firstDb, accountId);
        ownedEncounters.push(invalidFixture.encounterId);
        const invalidStateResult = await sql<{
          readonly state: {
            readonly activation: { readonly id: string; readonly unitId: string };
          };
        }>`select state from encounters where id = ${invalidFixture.encounterId}`.execute(secondDb);
        const invalidState = invalidStateResult.rows[0]?.state;
        if (invalidState === undefined) throw new Error('fixture state missing');
        const invalid = {
          version: 1 as const,
          encounterId: invalidFixture.encounterId,
          commandId: 'invalid-target',
          expectedRevision: 0,
          activationId: invalidState.activation.id,
          actorId: invalidState.activation.unitId,
          intent: { type: 'attack' as const, targetId: 'missing-unit' },
        };
        const before = await snapshotRows(invalidFixture.encounterId);
        expect(
          await executeEncounterCommand(firstDb, accountId, {
            ...invalid,
            commandId: 'foreign-unit',
            actorId: 'opponent-raider',
          }),
        ).toMatchObject({ status: 'rejected', code: 'UNAUTHORIZED' });
        expect(await snapshotRows(invalidFixture.encounterId)).toEqual(before);
        expect(await executeEncounterCommand(firstDb, accountId, invalid)).toMatchObject({
          status: 'rejected',
          code: 'INVALID_COMMAND',
        });
        expect(await snapshotRows(invalidFixture.encounterId)).toEqual(before);

        for (const [index, malformedGrant] of [
          [0, `prefix-human-shield-suffix`],
          [1, { unexpected: true }],
        ] as const) {
          const malformedGrantFixture = await createFixtureEncounter(firstDb, accountId);
          ownedEncounters.push(malformedGrantFixture.encounterId);
          const malformedGrantStateResult = await sql<{
            readonly state: {
              readonly activation: { readonly id: string; readonly unitId: string };
            };
          }>`select state from encounters where id = ${malformedGrantFixture.encounterId}`.execute(
            firstDb,
          );
          const malformedGrantState = malformedGrantStateResult.rows[0]?.state;
          if (malformedGrantState === undefined) throw new Error('fixture state missing');
          await sql`
            update encounter_participants set unit_ids = ${JSON.stringify(malformedGrant)}::jsonb
            where encounter_id = ${malformedGrantFixture.encounterId} and account_id = ${accountId}
          `.execute(firstDb);
          const malformedGrantBefore = await snapshotRows(malformedGrantFixture.encounterId);
          expect(
            await executeEncounterCommand(firstDb, accountId, {
              version: 1,
              encounterId: malformedGrantFixture.encounterId,
              commandId: `malformed-grant-${index}`,
              expectedRevision: 0,
              activationId: malformedGrantState.activation.id,
              actorId: malformedGrantState.activation.unitId,
              intent: { type: 'defend' },
            }),
          ).toMatchObject({ status: 'rejected', code: 'UNAUTHORIZED' });
          expect(await verifyEncounterReplay(firstDb, malformedGrantFixture.encounterId)).toBe(
            false,
          );
          expect(await snapshotRows(malformedGrantFixture.encounterId)).toEqual(
            malformedGrantBefore,
          );
        }

        const malformedFixture = await createFixtureEncounter(firstDb, accountId);
        ownedEncounters.push(malformedFixture.encounterId);
        await sql`update encounters set state = 'null'::json where id = ${malformedFixture.encounterId}`.execute(
          firstDb,
        );
        await expect(verifyEncounterReplay(secondDb, malformedFixture.encounterId)).resolves.toBe(
          false,
        );

        const malformedUnitsFixture = await createFixtureEncounter(firstDb, accountId);
        ownedEncounters.push(malformedUnitsFixture.encounterId);
        const malformedUnitsResult = await sql<{ readonly state: combat.BattleState }>`
          select state from encounters where id = ${malformedUnitsFixture.encounterId}
        `.execute(firstDb);
        const validStateBeforeCorruption = malformedUnitsResult.rows[0]?.state;
        if (validStateBeforeCorruption === undefined) throw new Error('fixture state missing');
        await sql`
          update encounters
          set state = jsonb_set(state::jsonb, '{units}', '[null]'::jsonb)::json
          where id = ${malformedUnitsFixture.encounterId}
        `.execute(firstDb);
        const malformedUnitsBefore = await snapshotRows(malformedUnitsFixture.encounterId);
        expect(
          await executeEncounterCommand(firstDb, accountId, {
            version: 1,
            encounterId: malformedUnitsFixture.encounterId,
            commandId: 'malformed-state-units',
            expectedRevision: 0,
            activationId: validStateBeforeCorruption.activation?.id ?? 'invalid-activation',
            actorId: validStateBeforeCorruption.activation?.unitId ?? 'invalid-unit',
            intent: { type: 'defend' },
          }),
        ).toMatchObject({ status: 'rejected', code: 'CONFLICT' });
        expect(await verifyEncounterReplay(secondDb, malformedUnitsFixture.encounterId)).toBe(
          false,
        );
        expect(await snapshotRows(malformedUnitsFixture.encounterId)).toEqual(malformedUnitsBefore);

        const terminalFixture = await createFixtureEncounter(firstDb, accountId);
        ownedEncounters.push(terminalFixture.encounterId);
        const setupResult = await sql<{ readonly setup: combat.BattleSetup }>`
          select setup from encounters where id = ${terminalFixture.encounterId}
        `.execute(firstDb);
        const originalSetup = setupResult.rows[0]?.setup;
        if (originalSetup === undefined) throw new Error('fixture setup missing');
        const terminalSetup: combat.BattleSetup = {
          ...originalSetup,
          units: originalSetup.units
            .filter((unit) => unit.sideId === 'human' || unit.id === 'opponent-raider')
            .map((unit) => ({
              ...unit,
              ...(unit.id === 'human-shield'
                ? { position: combat.hex(0, -1), attributes: { ...unit.attributes, accuracy: 100 } }
                : unit.id === 'opponent-raider'
                  ? {
                      position: combat.hex(1, -1),
                      attributes: { ...unit.attributes, health: 1, armor: 0, defense: 0 },
                    }
                  : {}),
            })),
        };
        const terminalStart = combat.startBattle(terminalSetup);
        await sql`
          update encounters set
            setup = ${JSON.stringify(terminalSetup)}::json,
            state = ${JSON.stringify(terminalStart.state)}::json,
            revision = 0, status = 'active',
            activation_id = ${terminalStart.state.activation?.id ?? null},
            activation_epoch = 1
          where id = ${terminalFixture.encounterId}
        `.execute(firstDb);
        await firstDb
          .deleteFrom('encounter_ai_controllers')
          .where('encounter_id', '=', terminalFixture.encounterId)
          .where(
            'unit_id',
            'not in',
            terminalSetup.units.filter((unit) => unit.sideId !== 'human').map((unit) => unit.id),
          )
          .execute();
        await sql`
          update encounter_participants set unit_ids = ${JSON.stringify(
            terminalSetup.units.filter((unit) => unit.sideId === 'human').map((unit) => unit.id),
          )}::jsonb
          where encounter_id = ${terminalFixture.encounterId} and account_id = ${accountId}
        `.execute(firstDb);
        await firstDb
          .deleteFrom('encounter_events')
          .where('encounter_id', '=', terminalFixture.encounterId)
          .execute();
        for (const [ordinal, event] of terminalStart.events.entries()) {
          await sql`
            insert into encounter_events (encounter_id, revision, ordinal, event_id, event)
            values (
              ${terminalFixture.encounterId}, 0, ${ordinal},
              ${`${terminalFixture.encounterId}:0:${ordinal}`}, ${JSON.stringify(event)}::json
            )
          `.execute(firstDb);
        }
        const terminalActivation = terminalStart.state.activation;
        if (terminalActivation === null) throw new Error('terminal fixture has no activation');
        const terminalResponse = await executeEncounterCommand(firstDb, accountId, {
          version: 1,
          encounterId: terminalFixture.encounterId,
          commandId: 'terminal-attack',
          expectedRevision: 0,
          activationId: terminalActivation.id,
          actorId: terminalActivation.unitId,
          intent: { type: 'attack', targetId: 'opponent-raider' },
        });
        expect(terminalResponse).toMatchObject({ status: 'accepted', revision: 1 });
        const terminalReloadDb = createDatabase(connectionString!);
        try {
          expect(await verifyEncounterReplay(terminalReloadDb, terminalFixture.encounterId)).toBe(
            true,
          );
          const terminalMetadata = await sql<{
            readonly revision: number;
            readonly status: string;
            readonly state: combat.BattleState;
          }>`select revision, status, state from encounters where id = ${terminalFixture.encounterId}`.execute(
            terminalReloadDb,
          );
          expect(terminalMetadata.rows[0]).toMatchObject({
            revision: 1,
            status: 'resolved',
            state: { revision: 1, status: 'resolved', activation: null },
          });
        } finally {
          await terminalReloadDb.destroy();
        }
      } finally {
        await firstDb
          .deleteFrom('identity_sessions')
          .where('token_digest', '=', sessionDigest)
          .execute();
        for (const encounterId of ownedEncounters) {
          await firstDb
            .deleteFrom('encounter_receipts')
            .where('encounter_id', '=', encounterId)
            .execute();
          await firstDb
            .deleteFrom('encounter_events')
            .where('encounter_id', '=', encounterId)
            .execute();
          await firstDb
            .deleteFrom('encounter_commands')
            .where('encounter_id', '=', encounterId)
            .execute();
          await firstDb
            .deleteFrom('encounter_ai_controllers')
            .where('encounter_id', '=', encounterId)
            .execute();
          await firstDb
            .deleteFrom('encounter_participants')
            .where('encounter_id', '=', encounterId)
            .execute();
          await firstDb.deleteFrom('encounters').where('id', '=', encounterId).execute();
        }
        await firstDb
          .deleteFrom('identity_accounts')
          .where('id', 'in', [accountId, foreignAccountId])
          .execute();
      }
    },
  );

  it.skipIf(connectionString === undefined)(
    'resumes one persisted AI wake, rejects player control and keeps its receipt replayable',
    async () => {
      const [firstDb, secondDb] = databases;
      if (firstDb === undefined || secondDb === undefined) throw new Error('database missing');
      const accountId = randomUUID();
      const issuer = `encounter-ai-test-${accountId}`;
      const encounterIds: string[] = [];
      await firstDb
        .insertInto('identity_accounts')
        .values({ id: accountId, issuer, subject: 'owner' })
        .execute();
      try {
        const hostileEncounterId = randomUUID();
        encounterIds.push(hostileEncounterId);
        const hexes = combat.createHexagon(2);
        const companySide = combat.sideId('company');
        const hostileSide = combat.sideId('hostile');
        const hostileSetup: combat.BattleSetupV2 = {
          schemaVersion: combat.COMBAT_V2_SCHEMA_VERSION,
          battleId: combat.battleId(hostileEncounterId),
          rulesetId: combat.M1_DOMAIN_BRIDGE_RULESET_ID,
          seed: 23,
          map: { hexes, blocked: [] },
          sides: [
            { id: companySide, retreatHexes: hexes.filter(({ q }) => q === -2) },
            { id: hostileSide, retreatHexes: hexes.filter(({ q }) => q === 2) },
          ],
          units: [
            {
              id: combat.unitId('company-member'),
              sideId: companySide,
              position: { q: -1, r: 0 },
              weaponId: 'sword-shield',
              attributes: {
                health: 80,
                armor: 30,
                stamina: 80,
                initiative: 40,
                accuracy: 20,
                defense: 10,
                morale: 70,
              },
              initialPools: { health: 80, armor: 30, stamina: 80, morale: 70 },
            },
            {
              id: combat.unitId('world-hostile'),
              sideId: hostileSide,
              position: { q: 1, r: 0 },
              weaponId: 'raider',
              attributes: {
                health: 90,
                armor: 35,
                stamina: 90,
                initiative: 100,
                accuracy: 18,
                defense: 8,
                morale: 75,
              },
              initialPools: { health: 90, armor: 0, stamina: 90, morale: 75 },
            },
          ],
        };
        const hostileStart = combat.startBattleV2(hostileSetup);
        const hostileActivation = hostileStart.state.activation;
        expect(hostileActivation?.unitId).toBe(combat.unitId('world-hostile'));
        if (hostileActivation === null) throw new Error('world-hostile activation missing');
        const hostileDueAt = new Date(Date.now() - 1_000);
        await sql`
          insert into encounters
            (id, world_id, schema_version, setup, state, revision, status,
             activation_id, activation_epoch, deadline_at, ai_wake_at)
          values
            (${hostileEncounterId}, 'main', ${combat.COMBAT_V2_SCHEMA_VERSION},
             ${JSON.stringify(hostileSetup)}::json, ${JSON.stringify(hostileStart.state)}::json,
             ${hostileStart.state.revision}, ${hostileStart.state.status},
             ${hostileActivation.id}, 1, null, ${hostileDueAt})
        `.execute(firstDb);
        await sql`
          insert into encounter_participants
            (encounter_id, account_id, side_id, unit_ids, admission_source)
          values
            (${hostileEncounterId}, ${accountId}, ${companySide},
             ${JSON.stringify([combat.unitId('company-member')])}::jsonb, 'company_binding')
        `.execute(firstDb);
        await sql`
          insert into encounter_ai_controllers
            (encounter_id, unit_id, doctrine, admission_source)
          values (${hostileEncounterId}, ${hostileActivation.unitId}, 'aggressive', 'world_hostile')
        `.execute(firstDb);
        for (const [ordinal, event] of hostileStart.events.entries()) {
          await sql`
            insert into encounter_events (encounter_id, revision, ordinal, event_id, event)
            values (
              ${hostileEncounterId}, 0, ${ordinal},
              ${`${hostileEncounterId}:0:${ordinal}`}, ${JSON.stringify(event)}::json
            )
          `.execute(firstDb);
        }
        expect(await verifyEncounterReplay(firstDb, hostileEncounterId)).toBe(true);
        const hostileSnapshot = async () => {
          const result = await sql<{ readonly snapshot: unknown }>`
            select json_build_object(
              'encounter', row_to_json(e),
              'commands', coalesce((
                select json_agg(row_to_json(c) order by c.revision)
                from encounter_commands c where c.encounter_id = e.id
              ), '[]'::json),
              'events', coalesce((
                select json_agg(row_to_json(v) order by v.revision, v.ordinal)
                from encounter_events v where v.encounter_id = e.id
              ), '[]'::json),
              'receipts', coalesce((
                select json_agg(row_to_json(r) order by r.command_id)
                from encounter_receipts r where r.encounter_id = e.id
              ), '[]'::json)
            ) as snapshot
            from encounters e where e.id = ${hostileEncounterId}
          `.execute(firstDb);
          return result.rows[0]?.snapshot;
        };
        const hostileBefore = await hostileSnapshot();
        expect(
          (await listDueEncounterAiWakes(firstDb, hostileDueAt)).some(
            ({ encounterId }) => encounterId === hostileEncounterId,
          ),
        ).toBe(false);
        await expect(
          executeEncounterAiWake(firstDb, {
            encounterId: hostileEncounterId,
            revision: hostileStart.state.revision,
            activationId: hostileActivation.id,
            activationEpoch: 1,
            dueAt: hostileDueAt,
          }),
        ).resolves.toBeUndefined();
        expect(await hostileSnapshot()).toEqual(hostileBefore);

        const fixture = await createFixtureEncounter(firstDb, accountId);
        encounterIds.push(fixture.encounterId);
        let stateResult = await sql<{
          readonly state: combat.BattleState;
        }>`select state, revision from encounters where id = ${fixture.encounterId}`.execute(
          firstDb,
        );
        let state = stateResult.rows[0]?.state;
        if (state === undefined) throw new Error('fixture state missing');

        let commandIndex = 0;
        while (state.activation !== null) {
          const activation = state.activation;
          const actor = state.units.find(({ id }) => id === activation.unitId);
          if (actor === undefined) throw new Error('fixture actor missing');
          if (actor.sideId === 'opponent') break;
          const response = await executeEncounterCommand(firstDb, accountId, {
            version: 1,
            encounterId: fixture.encounterId,
            commandId: `advance-to-ai-${commandIndex++}`,
            expectedRevision: state.revision,
            activationId: state.activation.id,
            actorId: actor.id,
            intent: { type: 'wait' },
          });
          expect(response.status).toBe('accepted');
          stateResult = await sql<{ readonly state: combat.BattleState }>`
            select state from encounters where id = ${fixture.encounterId}
          `.execute(firstDb);
          const updated = stateResult.rows[0]?.state;
          if (updated === undefined) throw new Error('updated fixture state missing');
          state = updated;
        }

        expect(state.activation?.unitId).toMatch(/^opponent-/u);
        const aiActivation = state.activation;
        if (aiActivation === null) throw new Error('fixture AI activation missing');
        const dueAt = new Date(Date.now() + 1_000);
        const availableWakes = (await listDueEncounterAiWakes(firstDb, dueAt)).filter(
          ({ encounterId }) => encounterId === fixture.encounterId,
        );
        expect(availableWakes).toHaveLength(1);
        const wake = availableWakes[0];
        if (wake === undefined) throw new Error('AI wake missing');

        const unauthorized = await executeEncounterCommand(firstDb, accountId, {
          version: 1,
          encounterId: fixture.encounterId,
          commandId: 'attempt-ai-control',
          expectedRevision: state.revision,
          activationId: aiActivation.id,
          actorId: aiActivation.unitId,
          intent: { type: 'wait' },
        });
        expect(unauthorized).toMatchObject({ status: 'rejected', code: 'UNAUTHORIZED' });

        const resumedWakes = (await listDueEncounterAiWakes(secondDb, dueAt)).filter(
          ({ encounterId }) => encounterId === fixture.encounterId,
        );
        expect(resumedWakes).toEqual(availableWakes);
        let aiResponse: EncounterCommandResponse | undefined;
        let aiError: unknown;
        const aiWorker = startEncounterAiWorker(secondDb, {
          onCommitted: (_encounterId, response) => {
            aiResponse = response;
          },
          onError: (error) => {
            aiError = error;
          },
        });
        try {
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(
              () => reject(new Error(`AI worker did not commit a step: ${String(aiError)}`)),
              1_000,
            );
            const check = setInterval(() => {
              if (aiResponse !== undefined) {
                clearTimeout(timeout);
                clearInterval(check);
                resolve();
              }
            }, 10);
          });
        } finally {
          await aiWorker.stop();
        }
        expect(aiResponse).toMatchObject({ status: 'accepted', revision: state.revision + 1 });
        expect(await executeEncounterAiWake(firstDb, wake)).toBeUndefined();

        const commandRows = await sql<{
          readonly source_kind: string;
          readonly account_id: string | null;
          readonly command_id: string;
          readonly command: combat.CombatCommand;
        }>`select source_kind, account_id, command_id, command from encounter_commands
          where encounter_id = ${fixture.encounterId} order by revision desc limit 1`.execute(
          firstDb,
        );
        expect(commandRows.rows[0]).toMatchObject({
          source_kind: 'system_ai',
          account_id: null,
          command_id: aiResponse?.status === 'accepted' ? aiResponse.commandId : undefined,
        });
        expect(await verifyEncounterReplay(secondDb, fixture.encounterId)).toBe(true);
      } finally {
        await firstDb
          .deleteFrom('encounter_receipts')
          .where('encounter_id', 'in', encounterIds)
          .execute();
        await firstDb
          .deleteFrom('encounter_events')
          .where('encounter_id', 'in', encounterIds)
          .execute();
        await firstDb
          .deleteFrom('encounter_commands')
          .where('encounter_id', 'in', encounterIds)
          .execute();
        await firstDb
          .deleteFrom('encounter_ai_controllers')
          .where('encounter_id', 'in', encounterIds)
          .execute();
        await firstDb
          .deleteFrom('encounter_participants')
          .where('encounter_id', 'in', encounterIds)
          .execute();
        await firstDb.deleteFrom('encounters').where('id', 'in', encounterIds).execute();
        await firstDb.deleteFrom('identity_accounts').where('id', '=', accountId).execute();
      }
    },
  );

  it.skipIf(connectionString === undefined)(
    'starts and closes the Colyseus listener with the authenticated Fastify room-ticket flow',
    async () => {
      const [database] = databases;
      if (database === undefined) throw new Error('database missing');
      const accountId = randomUUID();
      const token = randomUUID();
      const tokenDigest = createHash('sha256').update(token).digest();
      const issuer = `encounter-realtime-test-${accountId}`;
      let encounterId: string | undefined;
      let app: ReturnType<typeof buildApp> | undefined;
      let leaveRoom: (() => Promise<void>) | undefined;
      await database
        .insertInto('identity_accounts')
        .values({ id: accountId, issuer, subject: 'owner' })
        .execute();
      await database
        .insertInto('identity_sessions')
        .values({
          token_digest: tokenDigest,
          account_id: accountId,
          expires_at: new Date(Date.now() + 60_000),
        })
        .execute();
      try {
        const roomPort = await reservePort();
        const config = loadServerConfig({
          DATABASE_URL: connectionString,
          OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
          OIDC_CLIENT_ID: 'warwrit-local',
          OIDC_CLIENT_SECRET: 'local-only-secret',
          OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
          PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
          HOST: '127.0.0.1',
          PORT: '3107',
          ENCOUNTER_REALTIME_PORT: String(roomPort),
          ENCOUNTER_FIXTURES: '1',
        });
        app = buildApp({
          logger: false,
          identity: { config: config.identity!, database },
          encounters: { database, fixtureAdmission: true },
          encounterRealtime: { host: config.host, port: roomPort },
        });
        await app.ready();
        const fixture = await createFixtureEncounter(database, accountId);
        encounterId = fixture.encounterId;
        const cookie = `warwrit_session=${token}`;
        const ticketResponse = await app.inject({
          method: 'POST',
          url: `/encounters/${encounterId}/room-ticket`,
          headers: { cookie, origin: 'http://127.0.0.1:3107' },
          payload: { version: 1 },
        });
        expect(ticketResponse.statusCode, ticketResponse.body).toBe(200);
        const ticket = ticketResponse.json() as SeatReservation;
        expect(ticket).toMatchObject({ name: 'encounter' });
        const roomClient = new Client(`http://127.0.0.1:${roomPort}`, { headers: { cookie } });
        const room = await roomClient.consumeSeatReservation(ticket, EncounterRoomState);
        leaveRoom = async () => {
          await room.leave();
        };
        await new Promise<void>((resolve) => room.onStateChange.once(() => resolve()));
        expect(room.state.encounterId).toBe(encounterId);
        const roomProjection = room.state.toJSON() as Record<string, unknown>;
        const allowedPublicRoomFields = new Set([
          'version',
          'encounterId',
          'revision',
          'status',
          'round',
          'activationId',
          'actorUnitId',
          'deadlineAt',
          'map',
          'units',
        ]);
        for (const field of Object.keys(roomProjection))
          expect(allowedPublicRoomFields.has(field)).toBe(true);
        for (const privateField of [
          'setup',
          'seed',
          'sides',
          'controllableUnitIds',
          'selfAfk',
          'resumeRequestedAfterEpoch',
        ])
          expect(roomProjection).not.toHaveProperty(privateField);
        const stateResult = await sql<{
          readonly setup: combat.BattleSetupV2;
          readonly state: combat.BattleState;
        }>`
          select setup, state from encounters where id = ${encounterId}
        `.execute(database);
        const initial = stateResult.rows[0]?.state;
        if (initial?.activation === null || initial?.activation === undefined) {
          throw new Error('fixture activation missing');
        }
        const persistedSetup = stateResult.rows[0]?.setup;
        if (persistedSetup === undefined) throw new Error('fixture setup missing');
        expect(room.state.map.hexes.map(({ q, r }) => ({ q, r }))).toEqual(
          persistedSetup.map.hexes.toSorted(combat.compareHex).map(({ q, r }) => ({ q, r })),
        );
        expect(room.state.map.blocked.map(({ q, r }) => ({ q, r }))).toEqual(
          persistedSetup.map.blocked.toSorted(combat.compareHex).map(({ q, r }) => ({ q, r })),
        );
        expect(room.state.revision).toBe(0);
        expect(room.state.units.get('human-shield')).toMatchObject({ q: -2, r: 0 });
        const revisionUpdated = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('HTTP command did not update the joined room projection')),
            2_000,
          );
          room.onStateChange((state) => {
            if (state.revision === 1) {
              clearTimeout(timeout);
              resolve();
            }
          });
        });
        const commandResponse = await app.inject({
          method: 'POST',
          url: '/encounters/commands',
          headers: { cookie, origin: 'http://127.0.0.1:3107' },
          payload: {
            version: 1,
            encounterId,
            commandId: randomUUID(),
            expectedRevision: 0,
            activationId: initial.activation.id,
            actorId: initial.activation.unitId,
            intent: { type: 'move', to: { q: -1, r: 0 } },
          },
        });
        expect(commandResponse.statusCode, commandResponse.body).toBe(200);
        expect(commandResponse.json()).toMatchObject({ status: 'accepted', revision: 1 });
        await revisionUpdated;
        expect(room.state.revision).toBe(1);
        expect(room.state.units.get('human-shield')).toMatchObject({ q: -1, r: 0 });
        await room.leave();
        leaveRoom = undefined;
      } finally {
        await leaveRoom?.();
        await app?.close();
        if (encounterId !== undefined) {
          await database
            .deleteFrom('encounter_receipts')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_events')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_commands')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_ai_controllers')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_participants')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database.deleteFrom('encounters').where('id', '=', encounterId).execute();
        }
        await database
          .deleteFrom('identity_sessions')
          .where('token_digest', '=', tokenDigest)
          .execute();
        await database.deleteFrom('identity_accounts').where('id', '=', accountId).execute();
      }
    },
  );

  it.skipIf(connectionString === undefined)(
    'returns the committed receipt when the post-commit projection notification fails',
    async () => {
      const [database] = databases;
      if (database === undefined) throw new Error('database missing');
      const accountId = randomUUID();
      const token = randomUUID();
      const tokenDigest = createHash('sha256').update(token).digest();
      const issuer = `encounter-notify-test-${accountId}`;
      let encounterId: string | undefined;
      let app: ReturnType<typeof buildApp> | undefined;
      let notificationObservedRevision: number | undefined;
      try {
        await database
          .insertInto('identity_accounts')
          .values({ id: accountId, issuer, subject: 'owner' })
          .execute();
        await database
          .insertInto('identity_sessions')
          .values({
            token_digest: tokenDigest,
            account_id: accountId,
            expires_at: new Date(Date.now() + 60_000),
          })
          .execute();
        const config = loadServerConfig({
          DATABASE_URL: connectionString,
          OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
          OIDC_CLIENT_ID: 'warwrit-local',
          OIDC_CLIENT_SECRET: 'local-only-secret',
          OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
          PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
          HOST: '127.0.0.1',
          PORT: '3107',
          ENCOUNTER_FIXTURES: '1',
        });
        app = buildApp({
          logger: false,
          identity: { config: config.identity!, database },
          encounters: {
            database,
            fixtureAdmission: true,
            onCommandCommitted: async (committedEncounterId) => {
              const committed = await sql<{ readonly revision: number }>`
                select revision from encounters where id = ${committedEncounterId}
              `.execute(database);
              notificationObservedRevision = committed.rows[0]?.revision;
              throw new Error('test projection notification failure');
            },
          },
        });
        await app.ready();
        const fixture = await createFixtureEncounter(database, accountId);
        encounterId = fixture.encounterId;
        const stateResult = await sql<{ readonly state: combat.BattleState }>`
          select state from encounters where id = ${encounterId}
        `.execute(database);
        const initial = stateResult.rows[0]?.state;
        if (initial?.activation === null || initial?.activation === undefined) {
          throw new Error('fixture activation missing');
        }
        const response = await app.inject({
          method: 'POST',
          url: '/encounters/commands',
          headers: { cookie: `warwrit_session=${token}`, origin: 'http://127.0.0.1:3107' },
          payload: {
            version: 1,
            encounterId,
            commandId: randomUUID(),
            expectedRevision: 0,
            activationId: initial.activation.id,
            actorId: initial.activation.unitId,
            intent: { type: 'move', to: { q: -1, r: 0 } },
          },
        });
        expect(response.statusCode, response.body).toBe(200);
        const receipt = response.json() as EncounterCommandResponse;
        expect(receipt).toMatchObject({ status: 'accepted', revision: 1 });
        expect(notificationObservedRevision).toBe(1);
        const stored = await sql<{
          readonly resulting_revision: number;
          readonly response: EncounterCommandResponse;
        }>`
          select resulting_revision, response from encounter_receipts
          where encounter_id = ${encounterId}
        `.execute(database);
        expect(stored.rows).toEqual([{ resulting_revision: 1, response: receipt }]);
      } finally {
        await app?.close();
        if (encounterId !== undefined) {
          await database
            .deleteFrom('encounter_receipts')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_events')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_commands')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_ai_controllers')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database
            .deleteFrom('encounter_participants')
            .where('encounter_id', '=', encounterId)
            .execute();
          await database.deleteFrom('encounters').where('id', '=', encounterId).execute();
        }
        await database
          .deleteFrom('identity_sessions')
          .where('token_digest', '=', tokenDigest)
          .execute();
        await database.deleteFrom('identity_accounts').where('id', '=', accountId).execute();
      }
    },
  );
});
