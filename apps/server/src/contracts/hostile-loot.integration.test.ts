import { createHash, randomUUID } from 'node:crypto';

import * as combat from '@warwrit/game-core';
import type { ItemInstance, PhysicalContainer } from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { isHostileLootPickupRequestDto, WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { afterAll, describe, expect, it } from 'vitest';
import type { Kysely } from 'kysely';

import { createDatabase, type DatabaseSchema } from '../db/database.js';
import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { registerHostileLootRoutes } from './hostile-loot-routes.js';
import {
  ensureFirstHuntGenesis,
  readHuntWorldState,
  updateHuntWorldRow,
} from './first-hunt-runtime.js';
import {
  initializeHostileGearForNewV6Admission,
  recordHostileGearTerminal,
} from './first-hunt-gear.js';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
type TestDatabase = Kysely<DatabaseSchema>;
const database: TestDatabase | undefined =
  connectionString === undefined ? undefined : createDatabase(connectionString);
const apps: ReturnType<typeof buildApp>[] = [];

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await database?.destroy();
});

describe('hostile loot routes (isolated PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'serves eligible gear and transfers each item once with competing claims, retries, and rollback on rejection',
    async () => {
      if (!database) throw new Error('isolated hostile-loot database missing');
      const worldId = 'world';
      const encounterId = randomUUID();
      const terminalSourceId = `encounter:${encounterId}:terminal`;
      const profile = combat.HUNT_PROFILES[0]!;
      const location = { kind: 'AT' as const, ...profile.objectiveLocation };
      const actors = [createActor(worldId, location), createActor(worldId, location)] as const;
      const [first, second] = actors;

      for (const actor of actors) await seedActor(database, actor, worldId);
      await database
        .insertInto('world_campaign_clocks')
        .values({
          world_id: worldId,
          epoch_ms: String(Date.now()),
          starting_tick: first.state.economy.lifecycle.campaignTick,
        })
        .execute();
      await ensureFirstHuntGenesis(database, worldId);

      const rawWorld = await database
        .selectFrom('world_first_hunt_state')
        .selectAll()
        .where('world_id', '=', worldId)
        .executeTakeFirstOrThrow();
      const genesis = readHuntWorldState(worldId, profile, rawWorld);
      const initialized = initializeHostileGearForNewV6Admission({
        world: genesis,
        encounterId,
        rulesetId: combat.M1_DOMAIN_BRIDGE_V6_RULESET_ID,
        location,
      });
      const dead = recordHostileGearTerminal({
        worldId,
        profile,
        hostile: {
          ...initialized[0]!,
          currentPools: { ...initialized[0]!.currentPools, health: 0 },
        },
        terminalSourceId,
        terminalRevision: 8,
      });
      const hostiles = initialized.map((hostile) =>
        hostile.entityId === dead.entityId ? dead : hostile,
      );
      await database.transaction().execute(async (transaction) => {
        await transaction
          .insertInto('encounters')
          .values({
            id: encounterId,
            world_id: worldId,
            schema_version: 2,
            setup: {},
            state: {},
            revision: 8,
            status: 'resolved',
            activation_id: null,
            activation_epoch: 0,
            deadline_at: new Date(),
          })
          .execute();
        await transaction
          .insertInto('encounter_commands')
          .values({
            encounter_id: encounterId,
            revision: 8,
            command_id: `hostile-loot-terminal-${worldId}`,
            account_id: null,
            source_kind: 'system_ai',
            body_digest: Buffer.alloc(32),
            command: {},
          })
          .execute();
        await transaction
          .insertInto('encounter_admissions')
          .values({
            encounter_id: encounterId,
            world_id: worldId,
            instance_id: profile.instanceId,
            binding_version: 2,
            binding: {
              worldId,
              version: 's02-encounter-binding-2',
              participants: [{ companyId: first.companyId }, { companyId: second.companyId }],
            },
            terminal_revision: 8,
            effects_source_id: `first-hunt-terminal:${encounterId}:8`,
            effects_applied_at: new Date(),
          })
          .execute();
        await updateHuntWorldRow(transaction, genesis, {
          revision: '1',
          hostiles,
        });
      });

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
      const app = buildApp({ identity: { config: config.identity!, database } });
      registerHostileLootRoutes(app, { database, worldId });
      apps.push(app);

      const wrongQuote = await app.inject({
        method: 'GET',
        url: `/company/hostile-loot/${profile.instanceId}`,
        headers: {
          cookie: `warwrit_session=${first.sessionToken}`,
          [WORLD_EXPECTED_COMPANY_ID_HEADER]: second.companyId,
        },
      });
      expect(wrongQuote.statusCode).toBe(403);
      expect(Object.keys(wrongQuote.json())).toEqual(['error']);
      const available = await getAvailability(app, profile.instanceId, first);
      expect(available.sources).toHaveLength(1);
      expect(available.sources[0]?.items).toHaveLength(2);
      expect(available.targetContainerIds).toContain('fixture-supply');
      const [loot, nextLoot] = available.sources[0]!.items;
      const requestFor = (
        actor: Actor,
        itemId: string,
        commandId: string,
        revision = actor.state.economy.lifecycle.knowledge.revision,
      ) => ({
        schemaVersion: 1,
        commandId,
        expectedPublicRevision: revision,
        instanceId: profile.instanceId,
        hostileId: available.sources[0]!.hostileId,
        itemId,
        toContainerId: 'fixture-supply',
      });

      const wrongCompany = await pickup(
        app,
        first,
        second.companyId,
        requestFor(first, loot!.itemId, 'wrong-company'),
      );
      expect(wrongCompany).toMatchObject({ ok: false, code: 'NOT_AUTHORIZED' });

      const beforeRemote = await snapshot(database, worldId, first.companyId);
      await moveSupply(database, worldId, first.companyId, {
        kind: 'AT',
        siteId: 'distant',
        areaId: 'distant',
      });
      const remote = await pickup(
        app,
        first,
        first.companyId,
        requestFor(first, loot!.itemId, 'remote'),
      );
      expect(remote).toMatchObject({ ok: false, code: 'NOT_AVAILABLE' });
      await moveSupply(database, worldId, first.companyId, location);
      expect(await snapshot(database, worldId, first.companyId)).toEqual(beforeRemote);

      const beforeCapacity = await snapshot(database, worldId, first.companyId);
      const originalCapacityG = beforeCapacity.company.state.economy.physical!.containers.find(
        (container: PhysicalContainer) => container.containerId === 'fixture-supply',
      )!.capacityG;
      const usedCapacityG =
        originalCapacityG -
        combat.availableContainerG(
          beforeCapacity.company.state.economy.physical!,
          'fixture-supply',
        );
      await setSupplyCapacity(database, worldId, first.companyId, 0);
      const capacityLimited = await snapshot(database, worldId, first.companyId);
      expect(
        combat.availableContainerG(
          capacityLimited.company.state.economy.physical!,
          'fixture-supply',
        ),
      ).toBe(0);
      const noCapacity = await pickup(
        app,
        first,
        first.companyId,
        requestFor(first, loot!.itemId, 'no-capacity'),
      );
      expect(noCapacity).toMatchObject({ ok: false, code: 'CAPACITY' });
      await setSupplyCapacity(
        database,
        worldId,
        first.companyId,
        originalCapacityG - usedCapacityG,
      );
      expect(await snapshot(database, worldId, first.companyId)).toEqual(beforeCapacity);

      const beforeRace = await snapshot(database, worldId, first.companyId);
      const race = await Promise.all([
        pickup(app, first, first.companyId, requestFor(first, loot!.itemId, 'claim-first')),
        pickup(app, second, second.companyId, requestFor(second, loot!.itemId, 'claim-second')),
      ]);
      expect(race.filter((result) => result.ok)).toHaveLength(1);
      expect(race.filter((result) => result.code === 'NOT_AVAILABLE')).toHaveLength(1);
      const winnerIndex = race[0]!.ok ? 0 : 1;
      const winner = actors[winnerIndex]!;
      const accepted = race[winnerIndex]!;
      expect(accepted).toMatchObject({
        ok: true,
        receiptId: expect.any(String),
        publicRevision: '1',
      });

      const picked = await snapshot(database, worldId, winner.companyId);
      const pickedItem = picked.company.state.economy.physical!.items.find(
        (entry: ItemInstance) => entry.itemId === loot!.itemId,
      );
      expect(pickedItem).toMatchObject({
        itemId: loot!.itemId,
        definitionId: loot!.definitionId,
        owner: { kind: 'COMPANY', id: winner.companyId },
        containerId: 'fixture-supply',
      });
      expect(picked.worldHostile.gear!.claimedItemIds).toContain(loot!.itemId);
      expect(picked.receipts).toHaveLength(1);
      expect(
        picked.company.state.economy.physical!.items.filter(
          (entry: ItemInstance) => entry.itemId === loot!.itemId,
        ),
      ).toHaveLength(1);
      expect(
        beforeRace.company.state.economy.physical!.items.some(
          (entry: ItemInstance) => entry.itemId === loot!.itemId,
        ),
      ).toBe(false);

      const secondPickup = await pickup(
        app,
        winner,
        winner.companyId,
        requestFor(
          winner,
          nextLoot!.itemId,
          'claim-next',
          combat.publicRevision(accepted.publicRevision!),
        ),
      );
      expect(secondPickup).toMatchObject({ ok: true, publicRevision: '2' });
      const retry = await pickup(
        app,
        winner,
        winner.companyId,
        requestFor(winner, loot!.itemId, 'claim-first'),
      );
      expect(retry).toEqual(accepted);
      const conflict = await pickup(app, winner, winner.companyId, {
        ...requestFor(winner, nextLoot!.itemId, 'claim-first'),
        itemId: nextLoot!.itemId,
      });
      expect(conflict).toMatchObject({ ok: false, code: 'IDEMPOTENCY_CONFLICT' });
    },
  );
});

interface Actor {
  readonly accountId: string;
  readonly companyId: string;
  readonly sessionToken: string;
  readonly state: ReturnType<typeof combat.readCompanyCombatAggregateState>;
}

function createActor(
  worldId: string,
  location: { readonly kind: 'AT'; readonly siteId: string; readonly areaId: string },
): Actor {
  const accountId = randomUUID();
  const companyId = randomUUID();
  const sessionToken = randomUUID();
  const base = createCompanyCombatAggregateFixture().state;
  const lifecycle = base.economy.lifecycle;
  const partyId = lifecycle.parties[0]!.partyId;
  const replacements = new Map<string, string>([
    [lifecycle.worldId, worldId],
    [lifecycle.companyId, companyId],
    [partyId, randomUUID()],
    ...lifecycle.characters.map(
      (character) => [String(character.identity.characterId), randomUUID()] as const,
    ),
    ...(base.economy.physical?.items ?? []).map((item) => [item.itemId, randomUUID()] as const),
  ]);
  const remapped = JSON.parse(
    JSON.stringify(base, (_key, value: unknown) =>
      typeof value === 'string' ? (replacements.get(value) ?? value) : value,
    ),
  ) as typeof base;
  const physical = remapped.economy.physical!;
  const move = (container: (typeof physical.containers)[number]) => ({ ...container, location });
  const state = combat.readCompanyCombatAggregateState({
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
        knowledge: {
          ...remapped.economy.lifecycle.knowledge,
          characters: remapped.economy.lifecycle.knowledge.characters.map((character) =>
            character.presence.fieldPartyId === null
              ? character
              : { ...character, presence: { ...character.presence, location } },
          ),
        },
      },
      physical: {
        ...physical,
        containers: physical.containers.map(move),
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: physical.knowledge.containerSnapshots.map(move),
        },
      },
    },
  });
  return { accountId, companyId, sessionToken, state };
}

async function seedActor(database: TestDatabase, actor: Actor, worldId: string): Promise<void> {
  const lifecycle = actor.state.economy.lifecycle;
  await database
    .insertInto('identity_accounts')
    .values({
      id: actor.accountId,
      issuer: `hostile-loot-${actor.accountId}`,
      subject: actor.accountId,
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
      state: actor.state,
    })
    .execute();
  await database
    .insertInto('company_account_owners')
    .values({ world_id: worldId, company_id: actor.companyId, account_id: actor.accountId })
    .execute();
}

async function getAvailability(app: ReturnType<typeof buildApp>, instanceId: string, actor: Actor) {
  const response = await app.inject({
    method: 'GET',
    url: `/company/hostile-loot/${instanceId}`,
    headers: {
      cookie: `warwrit_session=${actor.sessionToken}`,
      [WORLD_EXPECTED_COMPANY_ID_HEADER]: actor.companyId,
    },
  });
  expect(response.statusCode).toBe(200);
  return response.json() as {
    sources: Array<{ hostileId: string; items: Array<{ itemId: string; definitionId: string }> }>;
    targetContainerIds: string[];
  };
}

async function pickup(
  app: ReturnType<typeof buildApp>,
  actor: Actor,
  expectedCompanyId: string,
  body: Record<string, unknown>,
) {
  expect(isHostileLootPickupRequestDto(body), JSON.stringify(body)).toBe(true);
  const response = await app.inject({
    method: 'POST',
    url: `/company/hostile-loot/${String(body['instanceId'])}/pickup`,
    headers: {
      cookie: `warwrit_session=${actor.sessionToken}`,
      origin: 'http://127.0.0.1:3108',
      [WORLD_EXPECTED_COMPANY_ID_HEADER]: expectedCompanyId,
    },
    payload: body,
  });
  return response.json() as {
    ok: boolean;
    code?: string;
    receiptId?: string;
    publicRevision?: string;
  };
}

async function moveSupply(
  database: TestDatabase,
  worldId: string,
  companyId: string,
  location: { readonly kind: 'AT'; readonly siteId: string; readonly areaId: string },
): Promise<void> {
  const row = await database
    .selectFrom('company_snapshots')
    .select('state')
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirstOrThrow();
  const state = row.state as ReturnType<typeof combat.readCompanyCombatAggregateState>;
  const physical = state.economy.physical!;
  const move = (container: (typeof physical.containers)[number]) => ({ ...container, location });
  const next = combat.readCompanyCombatAggregateState({
    ...state,
    economy: {
      ...state.economy,
      physical: {
        ...physical,
        containers: physical.containers.map(move),
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: physical.knowledge.containerSnapshots.map(move),
        },
      },
    },
  });
  await database
    .updateTable('company_snapshots')
    .set({ state: next })
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .execute();
}

async function setSupplyCapacity(
  database: TestDatabase,
  worldId: string,
  companyId: string,
  freeCapacityG?: number,
): Promise<void> {
  const row = await database
    .selectFrom('company_snapshots')
    .select('state')
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirstOrThrow();
  const state = row.state as ReturnType<typeof combat.readCompanyCombatAggregateState>;
  const physical = state.economy.physical!;
  const container = physical.containers.find(
    (entry: PhysicalContainer) => entry.containerId === 'fixture-supply',
  )!;
  const usedG = physical.items
    .filter(
      (item: ItemInstance) => item.containerId === container.containerId && item.tombstone === null,
    )
    .reduce((sum, item) => {
      const definition = combat.COMPANY_CATALOGUE.items.find(
        (entry) => entry.id === item.definitionId,
      );
      return sum + (definition?.weightG ?? 0) * item.quantity;
    }, 0);
  const capacityG = usedG + (freeCapacityG ?? 0);
  const replace = (entry: PhysicalContainer) =>
    entry.containerId === container.containerId ? { ...entry, capacityG } : entry;
  const next = combat.readCompanyCombatAggregateState({
    ...state,
    economy: {
      ...state.economy,
      physical: {
        ...physical,
        containers: physical.containers.map(replace),
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: physical.knowledge.containerSnapshots.map(replace),
        },
      },
    },
  });
  await database
    .updateTable('company_snapshots')
    .set({ state: next })
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .execute();
}

async function snapshot(database: TestDatabase, worldId: string, companyId: string) {
  const companyRow = await database
    .selectFrom('company_snapshots')
    .select(['canonical_revision', 'public_revision', 'state'])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirstOrThrow();
  const worldRow = await database
    .selectFrom('world_first_hunt_state')
    .selectAll()
    .where('world_id', '=', worldId)
    .executeTakeFirstOrThrow();
  const receipts = await database
    .selectFrom('company_receipts')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .execute();
  const world = readHuntWorldState(worldId, combat.HUNT_PROFILES[0]!, worldRow);
  return {
    company: { ...companyRow, state: combat.readCompanyCombatAggregateState(companyRow.state) },
    worldHostile: world.hostiles.find((hostile) => hostile.gear?.terminalSourceId !== undefined)!,
    receipts,
  };
}
