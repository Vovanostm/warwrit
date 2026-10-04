import { executeOrdinaryPlayerCompanyCommand } from '../company/executor.js';
import { canonicalJson } from '@warwrit/game-core';
import { randomUUID } from 'node:crypto';

import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  FIRST_HUNT_INSTANCE_ID,
  CONTINUOUS_WORLD_REGION,
  readCompanyCombatAggregateState,
  type CompanyCombatAggregateState,
  type LocationRef,
} from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import type { WorldFreeMovementV2RequestDto } from '@warwrit/protocol';
import { afterAll, describe, expect, it, vi } from 'vitest';

import { ensureFirstHuntGenesisInTransaction } from '../contracts/first-hunt-runtime.js';
import { createDatabase } from '../db/database.js';
import {
  executeContinuousMovement,
  processContinuousMovementCandidate,
} from './continuous-movement.js';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
const MAP_EDITION = CONTINUOUS_WORLD_REGION.mapEdition;

afterAll(async () => {
  await database?.destroy();
});

describe('continuous movement executor (PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'starts the new map edition from an exact retained older terrain position',
    async () => {
      const db = requireDatabase();
      const scenario = createScenario(randomUUID(), {
        kind: 'TERRAIN',
        regionVersion: 'seroe-porechye-continuous-v1',
        q: '100663296',
        r: '-174391296',
      });
      await seedScenario(db, [scenario]);
      try {
        const accepted = await executeContinuousMovement(
          db,
          scenario.worldId,
          scenario.accountId,
          scenario.companyId,
          moveRequest(scenario, 'legacy-terrain-resume', { xFp: 1728, zFp: -2600 }),
        );
        expect(accepted.plan!.from).toEqual({ xMicroFp: '100663296', zMicroFp: '-174391296' });
        expect(accepted.plan!.mapEdition).toBe(MAP_EDITION);
        expect(accepted.plan).toMatchObject({ planVersion: 3, navigationVersion: 'polygon-v1' });
        const route = await db
          .selectFrom('world_party_routes')
          .select('accepted_route')
          .where('world_id', '=', scenario.worldId)
          .where('company_id', '=', scenario.companyId)
          .executeTakeFirstOrThrow();
        expect((route.accepted_route as { execution: { plan: unknown } }).execution.plan).toEqual(
          accepted.plan,
        );
        const stored = await readSnapshot(db, scenario);
        expect(stored.economy.lifecycle.parties[0]!.location).toMatchObject({
          kind: 'MOVING',
          regionVersion: MAP_EDITION,
          fromQ: '100663296',
          fromR: '-174391296',
        });
        expect(await routeReceiptCount(db, scenario)).toBe(1);
      } finally {
        await cleanupScenario(db, [scenario]);
      }
    },
  );

  it.skipIf(database === undefined)(
    'replays exact V2 requests before stale checks and isolates receipts from other accounts',
    async () => {
      const db = requireDatabase();
      const [owner, foreign] = createScenarioPair();
      await seedScenario(db, [owner, foreign]);
      try {
        const request = moveRequest(owner, 'movement-replay', { xFp: 1600, zFp: -2661 });
        const accepted = await executeContinuousMovement(
          db,
          owner.worldId,
          owner.accountId,
          owner.companyId,
          request,
        );
        const replay = await executeContinuousMovement(
          db,
          owner.worldId,
          owner.accountId,
          owner.companyId,
          request,
        );
        expect(replay).toEqual(accepted);

        await expect(
          executeContinuousMovement(db, owner.worldId, owner.accountId, owner.companyId, {
            ...request,
            action: {
              kind: 'MOVE_TO',
              mapEdition: MAP_EDITION,
              target: { kind: 'TERRAIN', xFp: 1664, zFp: -2661 },
            },
          }),
        ).rejects.toMatchObject({ code: 'COMMAND_ID_CONFLICT' });

        await expect(
          executeContinuousMovement(
            db,
            foreign.worldId,
            foreign.accountId,
            owner.companyId,
            request,
          ),
        ).rejects.toMatchObject({ code: 'NOT_AUTHORIZED' });

        const ownerState = await readSnapshot(db, owner);
        expect(ownerState.economy.lifecycle.revision).not.toBe(
          owner.state.economy.lifecycle.revision,
        );
        expect(await readSnapshot(db, foreign)).toEqual(foreign.state);
        expect(await routeReceiptCount(db, owner)).toBe(1);
        expect(await routeReceiptCount(db, foreign)).toBe(0);
      } finally {
        await cleanupScenario(db, [owner, foreign]);
      }
    },
  );

  it.skipIf(database === undefined)(
    'rejects an ordinary company-receipt ID collision without disclosing its stored response',
    async () => {
      const db = requireDatabase();
      const scenario = createScenario();
      const commandId = 'existing-company-command';
      await seedScenario(db, [scenario]);
      try {
        await db
          .insertInto('company_receipts')
          .values({
            world_id: scenario.worldId,
            company_id: scenario.companyId,
            receipt_id: randomUUID(),
            command_id: commandId,
            source_key: null,
            request_key: '{}',
            response: { private: 'ordinary receipt' },
            resulting_revision: scenario.state.economy.lifecycle.revision,
          })
          .execute();

        await expect(
          executeContinuousMovement(
            db,
            scenario.worldId,
            scenario.accountId,
            scenario.companyId,
            moveRequest(scenario, commandId, { xFp: 1600, zFp: -2661 }),
          ),
        ).rejects.toMatchObject({ code: 'COMMAND_ID_CONFLICT' });

        expect(await readSnapshot(db, scenario)).toEqual(scenario.state);
        expect(await routeReceiptCount(db, scenario)).toBe(0);
        expect(await routeCount(db, scenario)).toBe(0);
      } finally {
        await cleanupScenario(db, [scenario]);
      }
    },
  );

  it.skipIf(database === undefined)(
    'allows one of concurrent STOP and MOVE_TO requests at the same revision and epoch',
    async () => {
      const db = requireDatabase();
      const scenario = createScenario();
      await seedScenario(db, [scenario]);
      try {
        const started = await executeContinuousMovement(
          db,
          scenario.worldId,
          scenario.accountId,
          scenario.companyId,
          moveRequest(scenario, 'movement-start-cas', { xFp: 1600, zFp: -2661 }),
        );
        const stop: WorldFreeMovementV2RequestDto = {
          schemaVersion: 2,
          commandId: 'movement-stop-cas',
          expectedPublicRevision: started.publicRevision,
          expectedMovementEpoch: started.movementEpoch,
          action: { kind: 'STOP' },
        };
        const reroute: WorldFreeMovementV2RequestDto = {
          schemaVersion: 2,
          commandId: 'movement-reroute-cas',
          expectedPublicRevision: started.publicRevision,
          expectedMovementEpoch: started.movementEpoch,
          action: {
            kind: 'MOVE_TO',
            mapEdition: MAP_EDITION,
            target: { kind: 'TERRAIN', xFp: 1664, zFp: -2661 },
          },
        };
        const results = await Promise.allSettled([
          executeContinuousMovement(
            db,
            scenario.worldId,
            scenario.accountId,
            scenario.companyId,
            stop,
          ),
          executeContinuousMovement(
            db,
            scenario.worldId,
            scenario.accountId,
            scenario.companyId,
            reroute,
          ),
        ]);
        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        const rejection = results.find((result) => result.status === 'rejected');
        expect(rejection).toMatchObject({
          status: 'rejected',
          reason: { code: expect.stringMatching(/^STALE_(REVISION|MOVEMENT_EPOCH)$/) },
        });
        expect(await routeReceiptCount(db, scenario)).toBe(2);
        expect(await routeCount(db, scenario)).toBe(1);
      } finally {
        await cleanupScenario(db, [scenario]);
      }
    },
  );

  it.skipIf(database === undefined)(
    'rejects blocked and dangerous intents without changing the company root or route receipts',
    async () => {
      const db = requireDatabase();
      const scenario = createScenario();
      await seedScenario(db, [scenario]);
      try {
        const before = await readSnapshot(db, scenario);
        const blocked = moveRequest(scenario, 'movement-blocked-target', { xFp: 4608, zFp: 2048 });
        await expect(
          executeContinuousMovement(
            db,
            scenario.worldId,
            scenario.accountId,
            scenario.companyId,
            blocked,
          ),
        ).rejects.toMatchObject({ code: expect.stringMatching(/^(NO_PATH|TARGET_BLOCKED)$/) });

        const dangerous = moveRequest(scenario, 'movement-danger-target', { xFp: 2304, zFp: 1920 });
        await expect(
          executeContinuousMovement(
            db,
            scenario.worldId,
            scenario.accountId,
            scenario.companyId,
            dangerous,
          ),
        ).rejects.toMatchObject({ code: 'ROUTE_FORBIDDEN' });

        expect(await readSnapshot(db, scenario)).toEqual(before);
        expect(await routeReceiptCount(db, scenario)).toBe(0);
        expect(await companyReceiptCount(db, scenario)).toBe(0);
        expect(await routeCount(db, scenario)).toBe(0);
      } finally {
        await cleanupScenario(db, [scenario]);
      }
    },
  );

  it.skipIf(database === undefined)(
    'keeps a contract-authorized mill trip and return scoped to Tikhaya Gat',
    async () => {
      const db = requireDatabase();
      const scenario = createScenario(randomUUID(), {
        kind: 'AT',
        siteId: 'tikhaya-gat',
        areaId: 'tikhaya-gat-bank',
      });
      await seedScenario(db, [scenario]);
      try {
        await db.transaction().execute(async (tx) => {
          await ensureFirstHuntGenesisInTransaction(tx, scenario.worldId);
          await tx
            .updateTable('contract_instances')
            .set({ owner_company_id: scenario.companyId })
            .where('world_id', '=', scenario.worldId)
            .where('instance_id', '=', FIRST_HUNT_INSTANCE_ID)
            .execute();
        });
        const request = {
          ...moveRequest(scenario, 'scoped-mill-trip', { xFp: 0, zFp: 0 }),
          action: {
            kind: 'MOVE_TO' as const,
            mapEdition: MAP_EDITION,
            target: { kind: 'SITE' as const, siteId: 'staraya-melnitsa' },
          },
        };
        const accepted = await executeContinuousMovement(
          db,
          scenario.worldId,
          scenario.accountId,
          scenario.companyId,
          request,
        );
        expect(accepted.plan!.dangerAreaIds).toEqual(['staraya-melnitsa-yard']);
        const partyId = scenario.state.economy.lifecycle.parties[0]!.partyId;
        await processContinuousMovementCandidate(
          db,
          scenario.worldId,
          { companyId: scenario.companyId, partyId, acceptedByAccountId: scenario.accountId },
          new Date(Number(accepted.plan!.arrivesAtMs)),
        );
        const arrived = await readSnapshot(db, scenario);
        expect(arrived.economy.lifecycle.parties[0]!.location).toEqual({
          kind: 'AT',
          siteId: 'staraya-melnitsa',
          areaId: 'staraya-melnitsa-yard',
        });
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(new Date(Number(accepted.plan!.arrivesAtMs) + 1));
        await expect(
          executeContinuousMovement(db, scenario.worldId, scenario.accountId, scenario.companyId, {
            ...request,
            commandId: 'unscoped-mill-return',
            expectedPublicRevision: arrived.economy.lifecycle.knowledge.revision,
            expectedMovementEpoch: String(BigInt(accepted.movementEpoch) + 1n),
            action: {
              kind: 'MOVE_TO',
              mapEdition: MAP_EDITION,
              target: { kind: 'SITE', siteId: 'kamenny-brod' },
            },
          }),
        ).rejects.toMatchObject({ code: 'ROUTE_FORBIDDEN' });
        expect(await readSnapshot(db, scenario)).toEqual(arrived);
        const returned = await executeContinuousMovement(
          db,
          scenario.worldId,
          scenario.accountId,
          scenario.companyId,
          {
            ...request,
            commandId: 'scoped-mill-return',
            expectedPublicRevision: arrived.economy.lifecycle.knowledge.revision,
            expectedMovementEpoch: String(BigInt(accepted.movementEpoch) + 1n),
            action: {
              kind: 'MOVE_TO',
              mapEdition: MAP_EDITION,
              target: { kind: 'SITE', siteId: 'tikhaya-gat' },
            },
          },
        );
        expect(returned.mode).toBe('MOVING');
      } finally {
        vi.useRealTimers();
        await db
          .deleteFrom('contract_instances')
          .where('world_id', '=', scenario.worldId)
          .execute();
        await db
          .deleteFrom('world_first_hunt_state')
          .where('world_id', '=', scenario.worldId)
          .execute();
        await cleanupScenario(db, [scenario]);
      }
    },
  );

  it.skipIf(database === undefined)(
    'returns ALREADY_AT_TARGET without advancing a stationary site epoch',
    async () => {
      const db = requireDatabase();
      const scenario = createScenario();
      await seedScenario(db, [scenario]);
      try {
        const result = await executeContinuousMovement(
          db,
          scenario.worldId,
          scenario.accountId,
          scenario.companyId,
          {
            schemaVersion: 2,
            commandId: 'movement-already-at-site',
            expectedPublicRevision: scenario.state.economy.lifecycle.knowledge.revision,
            expectedMovementEpoch: '0',
            action: {
              kind: 'MOVE_TO',
              mapEdition: MAP_EDITION,
              target: { kind: 'SITE', siteId: 'severny-dvor' },
            },
          },
        );
        expect(result).toMatchObject({
          result: 'ALREADY_AT_TARGET',
          mode: 'STATIONARY_SITE',
          movementEpoch: '0',
          plan: null,
        });
        expect(await readSnapshot(db, scenario)).toEqual(scenario.state);
        expect(await routeReceiptCount(db, scenario)).toBe(1);
        expect(await routeCount(db, scenario)).toBe(0);
      } finally {
        await cleanupScenario(db, [scenario]);
      }
    },
  );

  it.skipIf(database === undefined)(
    'settles a due STOP once and preserves site-anchor presence classification',
    async () => {
      const db = requireDatabase();
      const scenario = createScenario(randomUUID(), {
        kind: 'TERRAIN',
        regionVersion: MAP_EDITION,
        q: String(-64 * 65_536),
        r: '0',
      });
      await seedScenario(db, [scenario]);
      try {
        const started = await executeContinuousMovement(
          db,
          scenario.worldId,
          scenario.accountId,
          scenario.companyId,
          {
            ...moveRequest(scenario, 'movement-due-start', { xFp: 0, zFp: 0 }),
            action: {
              kind: 'MOVE_TO',
              mapEdition: MAP_EDITION,
              target: { kind: 'SITE', siteId: 'kamenny-brod' },
            },
          },
        );
        if (!started.plan) throw new Error('Movement plan missing');
        const delayMs = Math.max(
          0,
          Number(BigInt(started.plan.arrivesAtMs) - BigInt(Date.now())) + 25,
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        const stopped = await executeContinuousMovement(
          db,
          scenario.worldId,
          scenario.accountId,
          scenario.companyId,
          {
            schemaVersion: 2,
            commandId: 'movement-due-stop',
            expectedPublicRevision: started.publicRevision,
            expectedMovementEpoch: started.movementEpoch,
            action: { kind: 'STOP' },
          },
        );
        expect(BigInt(stopped.movementEpoch)).toBe(BigInt(started.movementEpoch) + 1n);
        expect(stopped).toMatchObject({ mode: 'STATIONARY_SITE', plan: null });
        const stored = await readSnapshot(db, scenario);
        expect(stored.economy.lifecycle.parties[0]?.location).toMatchObject({
          kind: 'AT',
          siteId: 'kamenny-brod',
        });
        expect(await routeReceiptCount(db, scenario)).toBe(2);
      } finally {
        await cleanupScenario(db, [scenario]);
      }
    },
  );
  it.skipIf(database === undefined)(
    'settles due terrain arrival with an ordinary command in one CAS, and rejects without partial arrival',
    async () => {
      const db = requireDatabase(),
        scenario = createScenario(randomUUID(), {
          kind: 'TERRAIN',
          regionVersion: MAP_EDITION,
          q: String(64 * 65536),
          r: String(-64 * 65536),
        });
      await seedScenario(db, [scenario]);
      try {
        const started = await executeContinuousMovement(
          db,
          scenario.worldId,
          scenario.accountId,
          scenario.companyId,
          moveRequest(scenario, 'ordinary-due-start', { xFp: 128, zFp: -64 }),
        );
        if (!started.plan) throw new Error('Plan missing');
        const now = new Date(Number(started.plan.arrivesAtMs) + 21600),
          before = await readSnapshot(db, scenario);
        const bad = {
          schemaVersion: 2 as const,
          commandId: 'bad-perk-after-due',
          expectedPublicRevision: started.publicRevision,
          type: 'ChoosePerk' as const,
          payload: {
            characterId: before.economy.lifecycle.characters[0]!.identity.characterId,
            perkId: 'nonexistent-perk',
            milestone: 25 as const,
          },
        };
        const rejected = await db.transaction().execute((transaction) =>
          executeOrdinaryPlayerCompanyCommand({
            transaction,
            accountId: scenario.accountId,
            expectedCompanyId: scenario.companyId,
            worldId: scenario.worldId,
            request: bad,
            requestKey: canonicalJson(bad),
            now,
          }),
        );
        expect(rejected.kind).toBe('REJECTED');
        expect(await readSnapshot(db, scenario)).toEqual(before);
        const rename = {
          schemaVersion: 2 as const,
          commandId: 'rename-after-due',
          expectedPublicRevision: started.publicRevision,
          type: 'RenameCompany' as const,
          payload: {
            name: 'Arrival company',
            bannerId: before.economy.lifecycle.company!.bannerId,
          },
        };
        const accepted = await db.transaction().execute((transaction) =>
          executeOrdinaryPlayerCompanyCommand({
            transaction,
            accountId: scenario.accountId,
            expectedCompanyId: scenario.companyId,
            worldId: scenario.worldId,
            request: rename,
            requestKey: canonicalJson(rename),
            now,
          }),
        );
        expect(accepted.kind).toBe('COMMITTED');
        const after = await readSnapshot(db, scenario);
        expect(after.economy.lifecycle.parties[0]!.location).toEqual({
          kind: 'TERRAIN',
          regionVersion: MAP_EDITION,
          q: String(128 * 65536),
          r: String(-64 * 65536),
        });
        expect(after.economy.lifecycle.company!.name).toBe('Arrival company');
        const route = await db
          .selectFrom('world_party_routes')
          .select(['status', 'route_epoch'])
          .where('world_id', '=', scenario.worldId)
          .where('company_id', '=', scenario.companyId)
          .executeTakeFirstOrThrow();
        expect(route.status).toBe('ARRIVED');
        expect(BigInt(route.route_epoch)).toBe(BigInt(started.movementEpoch) + 1n);
      } finally {
        await cleanupScenario(db, [scenario]);
      }
    },
  );
  it.skipIf(database === undefined)(
    'rejects a safe trip with known insufficient stock before accepting any route',
    async () => {
      const db = requireDatabase(),
        base = createScenario(),
        scenario = {
          ...base,
          state: readCompanyCombatAggregateState({
            ...base.state,
            economy: {
              ...base.state.economy,
              physical: {
                ...base.state.economy.physical!,
                items: base.state.economy.physical!.items.filter(
                  (item) => item.definitionId !== 'ration',
                ),
              },
            },
          }),
        };
      await seedScenario(db, [scenario]);
      try {
        await expect(
          executeContinuousMovement(
            db,
            scenario.worldId,
            scenario.accountId,
            scenario.companyId,
            moveRequest(scenario, 'empty-safe-trip', { xFp: 0, zFp: 0 }),
          ),
        ).rejects.toMatchObject({ code: 'KNOWN_SUPPLY_SHORTAGE' });
        expect(await readSnapshot(db, scenario)).toEqual(scenario.state);
        expect(await routeReceiptCount(db, scenario)).toBe(0);
        expect(await routeCount(db, scenario)).toBe(0);
      } finally {
        await cleanupScenario(db, [scenario]);
      }
    },
  );
  it.skipIf(database === undefined)(
    'a late worker commits arrival once before unfulfillable stationary offline food',
    async () => {
      const db = requireDatabase(),
        scenario = createScenario(randomUUID(), {
          kind: 'TERRAIN',
          regionVersion: MAP_EDITION,
          q: String(-64 * 65536),
          r: '0',
        });
      await seedScenario(db, [scenario]);
      try {
        const start = await executeContinuousMovement(
          db,
          scenario.worldId,
          scenario.accountId,
          scenario.companyId,
          {
            ...moveRequest(scenario, 'late-worker-start', { xFp: 0, zFp: 0 }),
            action: {
              kind: 'MOVE_TO',
              mapEdition: MAP_EDITION,
              target: { kind: 'SITE', siteId: 'kamenny-brod' },
            },
          },
        );
        if (!start.plan) throw new Error('Missing plan');
        const candidate = {
            companyId: scenario.companyId,
            partyId: scenario.state.economy.lifecycle.parties[0]!.partyId,
            acceptedByAccountId: scenario.accountId,
          },
          later = new Date(Number(start.plan.arrivesAtMs) + 100 * 86400000);
        await processContinuousMovementCandidate(db, scenario.worldId, candidate, later);
        const arrived = await readSnapshot(db, scenario);
        expect(arrived.economy.lifecycle.parties[0]!.location).toMatchObject({
          kind: 'AT',
          siteId: 'kamenny-brod',
        });
        const route = await db
          .selectFrom('world_party_routes')
          .select(['route_epoch', 'status'])
          .where('world_id', '=', scenario.worldId)
          .where('company_id', '=', scenario.companyId)
          .executeTakeFirstOrThrow();
        expect(route.status).toBe('ARRIVED');
        expect(BigInt(route.route_epoch)).toBe(BigInt(start.movementEpoch) + 1n);
        await processContinuousMovementCandidate(db, scenario.worldId, candidate, later);
        expect(await readSnapshot(db, scenario)).toEqual(arrived);
        expect(await routeReceiptCount(db, scenario)).toBe(2);
      } finally {
        await cleanupScenario(db, [scenario]);
      }
    },
  );
});

interface Scenario {
  readonly worldId: string;
  readonly companyId: string;
  readonly accountId: string;
  readonly state: CompanyCombatAggregateState;
}

function requireDatabase() {
  if (!database) throw new Error('WARWRIT_COMPANY_DATABASE_URL is required');
  return database;
}

function createScenario(
  worldId = randomUUID(),
  origin: LocationRef = { kind: 'AT', siteId: 'severny-dvor', areaId: 'severny-dvor-yard' },
): Scenario {
  const companyId = randomUUID();
  const accountId = randomUUID();
  const base = createCompanyCombatAggregateFixture().state;
  const lifecycle = base.economy.lifecycle;
  const oldPartyId = lifecycle.parties[0]?.partyId;
  if (!oldPartyId) throw new Error('Fixture party missing');
  const characterIds = lifecycle.characters.map((character) => character.identity.characterId);
  const replacements = new Map<string, string>([
    [lifecycle.worldId, worldId],
    [lifecycle.companyId, companyId],
    [oldPartyId, randomUUID()],
    ...characterIds.map((id) => [id, randomUUID()] as const),
  ]);
  const remapped = JSON.parse(
    JSON.stringify(base, (_key, value: unknown) =>
      typeof value === 'string' ? (replacements.get(value) ?? value) : value,
    ),
  ) as CompanyCombatAggregateState;
  const partyId = replacements.get(oldPartyId)!;
  const physical = remapped.economy.physical;
  if (!physical) throw new Error('Fixture physical state missing');
  const rationContainerIds = physical.items
    .filter((item) => item.definitionId === 'ration')
    .map((item) => item.containerId);
  const rationContainerId = rationContainerIds[0];
  if (!rationContainerId || rationContainerIds.some((id) => id !== rationContainerId))
    throw new Error('Fixture ration container missing or inconsistent');
  const ownContainer = (container: (typeof physical.containers)[number]) =>
    container.containerId === rationContainerId
      ? {
          ...container,
          kind: 'PARTY_SUPPLY' as const,
          location: origin,
          carrier: { kind: 'PARTY' as const, id: partyId },
        }
      : { ...container, location: origin };
  const state = readCompanyCombatAggregateState({
    ...remapped,
    economy: {
      ...remapped.economy,
      lifecycle: {
        ...remapped.economy.lifecycle,
        revision: '7',
        parties: remapped.economy.lifecycle.parties.map((party) => ({
          ...party,
          location: origin,
        })),
        characters: remapped.economy.lifecycle.characters.map((character) =>
          character.presence.fieldPartyId === partyId
            ? { ...character, presence: { ...character.presence, location: origin } }
            : character,
        ),
      },
      physical: {
        ...physical,
        containers: physical.containers.map(ownContainer),
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: physical.knowledge.containerSnapshots.map(ownContainer),
        },
      },
    },
  });
  return { worldId, companyId, accountId, state };
}

function createScenarioPair() {
  const worldId = randomUUID();
  return [createScenario(worldId), createScenario(worldId)] as const;
}

function moveRequest(
  scenario: Scenario,
  commandId: string,
  target: { readonly xFp: number; readonly zFp: number },
): WorldFreeMovementV2RequestDto {
  return {
    schemaVersion: 2,
    commandId,
    expectedPublicRevision: scenario.state.economy.lifecycle.knowledge.revision,
    expectedMovementEpoch: '0',
    action: { kind: 'MOVE_TO', mapEdition: MAP_EDITION, target: { kind: 'TERRAIN', ...target } },
  };
}

async function seedScenario(db: ReturnType<typeof createDatabase>, scenarios: readonly Scenario[]) {
  const now = String(Date.now());
  await db.transaction().execute(async (tx) => {
    await tx
      .insertInto('identity_accounts')
      .values(
        scenarios.map((scenario) => ({
          id: scenario.accountId,
          issuer: `movement-${scenario.accountId}`,
          subject: 'owner',
        })),
      )
      .execute();
    await tx
      .insertInto('company_snapshots')
      .values(
        scenarios.map((scenario) => ({
          world_id: scenario.worldId,
          company_id: scenario.companyId,
          schema_version: COMPANY_SCHEMA_VERSION,
          ruleset_id: COMPANY_RULESET_ID,
          catalogue_version: COMPANY_CATALOGUE_VERSION,
          command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
          public_revision: scenario.state.economy.lifecycle.knowledge.revision,
          canonical_revision: scenario.state.economy.lifecycle.revision,
          state: scenario.state,
        })),
      )
      .execute();
    await tx
      .insertInto('company_account_owners')
      .values(
        scenarios.map((scenario) => ({
          world_id: scenario.worldId,
          company_id: scenario.companyId,
          account_id: scenario.accountId,
        })),
      )
      .execute();
    await tx
      .insertInto('world_campaign_clocks')
      .values({
        world_id: scenarios[0]!.worldId,
        epoch_ms: now,
        starting_tick: scenarios[0]!.state.economy.lifecycle.campaignTick,
      })
      .execute();
  });
}

async function cleanupScenario(
  db: ReturnType<typeof createDatabase>,
  scenarios: readonly Scenario[],
) {
  await db.transaction().execute(async (tx) => {
    for (const table of [
      'world_route_receipts',
      'world_party_routes',
      'company_receipts',
      'company_audit_events',
      'company_account_owners',
      'company_snapshots',
    ] as const)
      await tx
        .deleteFrom(table)
        .where('world_id', '=', scenarios[0]!.worldId)
        .where(
          'company_id',
          'in',
          scenarios.map((scenario) => scenario.companyId),
        )
        .execute();
    await tx
      .deleteFrom('world_campaign_clocks')
      .where('world_id', '=', scenarios[0]!.worldId)
      .execute();
    await tx
      .deleteFrom('identity_accounts')
      .where(
        'id',
        'in',
        scenarios.map((scenario) => scenario.accountId),
      )
      .execute();
  });
}

async function readSnapshot(db: ReturnType<typeof createDatabase>, scenario: Scenario) {
  const row = await db
    .selectFrom('company_snapshots')
    .select('state')
    .where('world_id', '=', scenario.worldId)
    .where('company_id', '=', scenario.companyId)
    .executeTakeFirstOrThrow();
  return readCompanyCombatAggregateState(row.state);
}

async function routeReceiptCount(db: ReturnType<typeof createDatabase>, scenario: Scenario) {
  const rows = await db
    .selectFrom('world_route_receipts')
    .select('command_id')
    .where('world_id', '=', scenario.worldId)
    .where('company_id', '=', scenario.companyId)
    .execute();
  return rows.length;
}

async function routeCount(db: ReturnType<typeof createDatabase>, scenario: Scenario) {
  const rows = await db
    .selectFrom('world_party_routes')
    .select('party_id')
    .where('world_id', '=', scenario.worldId)
    .where('company_id', '=', scenario.companyId)
    .execute();
  return rows.length;
}

async function companyReceiptCount(db: ReturnType<typeof createDatabase>, scenario: Scenario) {
  const rows = await db
    .selectFrom('company_receipts')
    .select('receipt_id')
    .where('world_id', '=', scenario.worldId)
    .where('company_id', '=', scenario.companyId)
    .execute();
  return rows.length;
}
