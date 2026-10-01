import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { Client } from 'pg';

import {
  COMPANY_CATALOGUE,
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  COMPANY_RULES,
  FIRST_HUNT_INSTANCE_ID,
  FIRST_HUNT_PROFILE_ID,
  WORLD_REGION_VERSION,
  acceptedWorldRegion,
  campaignTick,
  TRAVEL_RULES,
  canonicalRevision,
  createLearningTaskState,
  evaluatePerkEffects,
  parseCompanyCommand,
  readCompanyCombatAggregateState,
  startLearningTask,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState, PartyRouteExecution } from '@warwrit/game-core';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import type {
  CreateCompanyPayloadDto,
  CreateCompanyRequestDto,
  WorldTravelPreviewResponseDto,
  WorldTravelRequestDto,
  WorldTravelV2ResponseDto,
} from '@warwrit/protocol';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { afterAll, describe, expect, it } from 'vitest';
import type { Kysely, Transaction } from 'kysely';

import { buildApp } from '../app.js';
import { loadServerConfig } from '../config.js';
import { createDatabase, type DatabaseSchema } from '../db/database.js';
import { runMigrations } from '../db/migrator.js';
import { loadCompanyAggregate } from '../company/repository.js';
import { prepareTravelFoodFacts } from '../company/travel-food.js';
import { startWorldRouteWorker } from './route-worker.js';
import { processWorldRouteCandidate } from './routes.js';
import { ensureFirstHuntGenesisInTransaction } from '../contracts/first-hunt-runtime.js';
import { readRouteExecutionEnvelope, storeRouteExecution } from './route-execution.js';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);
const apps: ReturnType<typeof buildApp>[] = [];
let failNextApplicationTransactionBeforeCommit = false;
const clockTickMs = 21_600;
const worldTravelDownSql = readFileSync(
  new URL('../../migrations/0008_world_travel.down.sql', import.meta.url),
  'utf8',
);
const worldTravelUpSql = readFileSync(
  new URL('../../migrations/0008_world_travel.up.sql', import.meta.url),
  'utf8',
);

afterAll(async () => {
  await Promise.all(apps.map((app) => app.close()));
  await database?.destroy();
});

describe('stored world route executions', () => {
  const execution = (
    purpose: 'NEW' | 'RETURN',
    edgeIds: readonly string[] = ['tikhaya-gat-staraya-melnitsa'],
  ): PartyRouteExecution => {
    const fromSiteId = purpose === 'NEW' ? 'tikhaya-gat' : 'staraya-melnitsa';
    const toSiteId = purpose === 'NEW' ? 'staraya-melnitsa' : 'tikhaya-gat';
    return {
      schemaVersion: 2,
      routeExecutionId: `route-execution-${purpose.toLowerCase()}-first-hunt`,
      worldId: 'world-first-hunt',
      companyId: 'company-first-hunt',
      partyId: 'party-first-hunt',
      regionVersion: WORLD_REGION_VERSION,
      profileId: TRAVEL_RULES.profileId,
      routeEpoch: '1',
      purpose,
      edgeIds,
      dangerousAuthorization: {
        instanceId: FIRST_HUNT_INSTANCE_ID,
        profileId: FIRST_HUNT_PROFILE_ID,
        termsDigest: 'a'.repeat(64),
      },
      phase: 'IN_TRANSIT',
      nextEdgeIndex: 0,
      currentSiteId: fromSiteId,
      segment: {
        segmentId: `segment-${purpose.toLowerCase()}-first-hunt`,
        fromSiteId,
        toSiteId,
        startedAt: campaignTick('0'),
        dueTick: campaignTick('240'),
      },
    };
  };

  it('round-trips scoped FIRST HUNT new and reverse-return execution authorization', () => {
    for (const purpose of ['NEW', 'RETURN'] as const) {
      const stored = storeRouteExecution('account-first-hunt', execution(purpose));
      expect(readRouteExecutionEnvelope(stored)).toEqual(stored);
    }
  });

  it('keeps the safe stored shape exact and rejects malformed or unknown dangerous authorization', () => {
    const { dangerousAuthorization: _authorization, ...safeFields } = execution('NEW', [
      'kamenny-brod-severny-dvor',
    ]);
    const safe = safeFields as PartyRouteExecution;
    const storedSafe = storeRouteExecution('account-first-hunt', safe);
    expect(readRouteExecutionEnvelope(storedSafe)).toEqual(storedSafe);
    expect(() =>
      readRouteExecutionEnvelope({
        ...storedSafe,
        execution: { ...safe, injected: 'private' },
      }),
    ).toThrow();
    const dangerous = execution('NEW');
    expect(() =>
      storeRouteExecution('account-first-hunt', {
        ...dangerous,
        dangerousAuthorization: {
          ...dangerous.dangerousAuthorization!,
          injected: 'private',
        },
      } as unknown as PartyRouteExecution),
    ).toThrow();
    expect(() =>
      storeRouteExecution('account-first-hunt', {
        ...dangerous,
        dangerousAuthorization: {
          ...dangerous.dangerousAuthorization!,
          profileId: TRAVEL_RULES.profileId,
        },
      } as unknown as PartyRouteExecution),
    ).toThrow();
  });
});

describe('delayed travel food source selection', () => {
  it('uses stocked party rations when an earlier-sorting carried container is empty', () => {
    const initial = createCompanyCombatAggregateFixture().state;
    const root = initial.economy;
    const physical = root.physical;
    if (!physical) throw new Error('Travel fixture physical state missing');
    const party = root.lifecycle.parties[0];
    const ration = physical.items.find((item) => item.definitionId === 'ration');
    const supply = ration
      ? physical.containers.find((container) => container.containerId === ration.containerId)
      : undefined;
    if (!party || !supply || !ration?.containerId)
      throw new Error('Travel fixture party rations missing');
    const location = {
      kind: 'AT' as const,
      siteId: 'severny-dvor',
      areaId: 'severny-dvor-yard',
    };
    const emptyCarriedContainer = {
      ...supply,
      containerId: 'aaa-empty-carried',
      kind: 'CARRIED' as const,
      carrier: {
        kind: 'CHARACTER' as const,
        id: root.lifecycle.characters.find(
          (character) => character.presence.fieldPartyId === party.partyId,
        )!.identity.characterId,
      },
      location,
    };
    const containers = [
      ...physical.containers.map((container) =>
        container.containerId === supply.containerId
          ? {
              ...container,
              kind: 'PARTY_SUPPLY' as const,
              carrier: { kind: 'PARTY' as const, id: party.partyId },
              location,
            }
          : { ...container, location },
      ),
      emptyCarriedContainer,
    ];
    const state = readCompanyCombatAggregateState({
      ...initial,
      economy: {
        ...root,
        lifecycle: {
          ...root.lifecycle,
          parties: root.lifecycle.parties.map((entry) => ({ ...entry, location })),
          characters: root.lifecycle.characters.map((character) =>
            character.presence.fieldPartyId === party.partyId
              ? { ...character, presence: { ...character.presence, location } }
              : character,
          ),
        },
        physical: {
          ...physical,
          containers,
          knowledge: { ...physical.knowledge, containerSnapshots: containers },
        },
      },
    });

    const prepared = prepareTravelFoodFacts(state, '1001', 'travel-food-delayed-departure-test', {
      kind: 'DEPARTURE',
      partyId: party.partyId,
      location,
      settledThroughTick: '1001',
    });
    expect(prepared.kind).toBe('PREPARED');
    if (prepared.kind !== 'PREPARED') return;
    expect(prepared.facts.length).toBeGreaterThan(0);
    expect(prepared.facts.every((fact) => fact.containerId === supply.containerId)).toBe(true);
  });
});

describe('authenticated world travel (PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'offers read-only catch-up departures after real opening and settles once on submit',
    async () => {
      const db = requireDatabase();
      const shell = makeSyntheticCompany(db);
      let cleanupActor = shell;
      const openingHeaders = {
        cookie: `warwrit_session=${shell.sessionToken}`,
        origin: 'http://127.0.0.1:3107',
      };
      try {
        await db
          .insertInto('identity_accounts')
          .values([
            { id: shell.accountId, issuer: `world-travel-${shell.accountId}`, subject: 'owner' },
            {
              id: shell.foreignAccountId,
              issuer: `world-travel-${shell.accountId}`,
              subject: 'foreign',
            },
          ])
          .execute();
        await db
          .insertInto('identity_sessions')
          .values([
            {
              token_digest: createHash('sha256').update(shell.sessionToken).digest(),
              account_id: shell.accountId,
              expires_at: new Date(Date.now() + 60 * 60_000),
            },
            {
              token_digest: createHash('sha256').update(shell.foreignSessionToken).digest(),
              account_id: shell.foreignAccountId,
              expires_at: new Date(Date.now() + 60 * 60_000),
            },
          ])
          .execute();
        await db
          .insertInto('world_campaign_clocks')
          .values({
            world_id: shell.worldId,
            epoch_ms: String(Date.now() - 5_000),
            starting_tick: '0',
          })
          .execute();

        const openingOptions = await shell.app.inject({
          method: 'POST',
          url: '/company/opening-options',
          headers: openingHeaders,
          payload: {},
        });
        expect(openingOptions.statusCode, openingOptions.body).toBe(200);
        const opening = (
          openingOptions.json() as {
            opening: {
              candidateSetId: string;
              companyId: string;
              origin: { id: string };
              culture: { id: string };
              homeland: { id: string };
              familyStory: { id: string };
              bannerId: string;
              leaderDefaults: Omit<CreateCompanyPayloadDto['leaderInput'], 'birthName'>;
              candidates: readonly { characterId: string }[];
            };
          }
        ).opening;
        cleanupActor = {
          ...shell,
          companyId: opening.companyId,
          ownerHeaders: {
            ...shell.ownerHeaders,
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: opening.companyId,
          },
        };
        const payload: CreateCompanyPayloadDto = {
          originId: opening.origin.id,
          cultureId: opening.culture.id,
          homelandId: opening.homeland.id,
          familyStoryId: opening.familyStory.id,
          leaderInput: { birthName: 'Alda', ...opening.leaderDefaults },
          candidateSetId: opening.candidateSetId,
          selectedCandidateIds: [opening.candidates[0]!.characterId],
          name: 'The Gray Company',
          bannerId: opening.bannerId,
        };
        const createRequest: CreateCompanyRequestDto = {
          schemaVersion: 1,
          commandId: randomUUID(),
          type: 'CreateCompany',
          payload,
        };
        const created = await shell.app.inject({
          method: 'POST',
          url: '/company/commands',
          headers: openingHeaders,
          payload: createRequest,
        });
        expect(created.statusCode, created.body).toBe(201);

        const state = await db
          .transaction()
          .execute((transaction) =>
            loadCompanyAggregate(transaction, shell.worldId, opening.companyId),
          );
        if (!state) throw new Error('Opened company root is unavailable');
        const party = state.economy.lifecycle.parties[0];
        if (!party) throw new Error('Opened company party is unavailable');
        const actor: SyntheticCompany = {
          ...shell,
          companyId: opening.companyId,
          partyId: party.partyId,
          memberIds: state.economy.lifecycle.characters
            .filter((character) => character.presence.fieldPartyId === party.partyId)
            .map((character) => character.identity.characterId),
          initial: state,
          ownerHeaders: {
            ...shell.ownerHeaders,
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: opening.companyId,
          },
        };
        cleanupActor = actor;
        const inspectReadOnlyState = async () => ({
          company: await inspectCompany(db, actor),
          worldClock: await clockRowsFor(db, actor),
        });
        expect(state.economy.lifecycle.campaignTick).toBe('0');
        await setWorldClock(db, actor, 5);

        const partyRequest = () =>
          actor.app.inject({
            method: 'GET',
            url: '/world/party',
            headers: actor.ownerHeaders,
          });
        const previewRequest = () =>
          actor.app.inject({
            method: 'POST',
            url: '/world/travel/preview',
            headers: actor.ownerHeaders,
            payload: {
              schemaVersion: 1,
              purpose: 'NEW',
              edgeIds: ['kamenny-brod-severny-dvor'],
            },
          });
        await setWorldClock(db, actor, 100_000);
        const beforeInsufficientCatchUp = await inspectReadOnlyState();
        const insufficientParty = await partyRequest();
        expect(insufficientParty.statusCode).toBe(200);
        expect(insufficientParty.json()).toMatchObject({ availableDepartures: [] });
        const insufficientPreview = await previewRequest();
        expect(insufficientPreview.statusCode).toBe(409);
        expect(await inspectReadOnlyState()).toEqual(beforeInsufficientCatchUp);
        await setWorldClock(db, actor, 5);

        const beforeRead = await inspectReadOnlyState();
        const firstParty = await partyRequest();
        expect(firstParty.statusCode, firstParty.body).toBe(200);
        const firstPartyBody = firstParty.json() as {
          readonly worldTick: string;
          readonly publicRevision: string;
          readonly party: { readonly partyId: string; readonly routeEpoch: string } | null;
          readonly availableDepartures: readonly {
            readonly purpose: string;
            readonly edgeIds: readonly string[];
          }[];
        };
        expect(firstPartyBody.worldTick).toBe('5');
        expect(firstPartyBody.publicRevision).toBe(state.economy.lifecycle.knowledge.revision);
        expect(firstPartyBody.party).toMatchObject({ partyId: party.partyId, routeEpoch: '0' });
        expect(firstPartyBody.availableDepartures).toContainEqual({
          purpose: 'NEW',
          edgeIds: ['kamenny-brod-severny-dvor'],
          fromSiteId: 'severny-dvor',
          toSiteId: 'kamenny-brod',
        });
        const firstPreview = await previewRequest();
        expect(firstPreview.statusCode, firstPreview.body).toBe(200);
        expect(firstPreview.json()).toMatchObject({
          publicRevision: state.economy.lifecycle.knowledge.revision,
          routeEpoch: '0',
          atTick: '5',
          edgeIds: ['kamenny-brod-severny-dvor'],
        });
        const afterRead = await inspectReadOnlyState();
        expect(afterRead).toEqual(beforeRead);
        for (let repeat = 0; repeat < 2; repeat += 1) {
          expect((await partyRequest()).json()).toEqual(firstPartyBody);
          expect((await previewRequest()).json()).toEqual(firstPreview.json());
          expect(await inspectReadOnlyState()).toEqual(beforeRead);
        }

        const foreignHeaders = {
          cookie: `warwrit_session=${shell.foreignSessionToken}`,
          origin: 'http://127.0.0.1:3107',
        };
        const inaccessibleParty = await actor.app.inject({
          method: 'GET',
          url: '/world/party',
          headers: foreignHeaders,
        });
        expect(inaccessibleParty.statusCode).toBe(200);
        expect(inaccessibleParty.json()).toMatchObject({ party: null, availableDepartures: [] });
        const inaccessiblePreview = await actor.app.inject({
          method: 'POST',
          url: '/world/travel/preview',
          headers: foreignHeaders,
          payload: {
            schemaVersion: 1,
            purpose: 'NEW',
            edgeIds: ['kamenny-brod-severny-dvor'],
          },
        });
        expect(inaccessiblePreview.statusCode).toBe(409);
        expect(await inspectReadOnlyState()).toEqual(beforeRead);

        const travel = {
          schemaVersion: 2,
          commandId: randomUUID(),
          expectedPublicRevision: firstPartyBody.publicRevision,
          expectedRouteEpoch: firstPartyBody.party!.routeEpoch,
          purpose: 'NEW',
          edgeIds: ['kamenny-brod-severny-dvor'],
        } as const;
        const submitted = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: travel,
        });
        expect(submitted.statusCode, submitted.body).toBe(200);
        const settled = await inspectReadOnlyState();
        expect(settled.company.state?.economy.lifecycle.campaignTick).toBe('5');
        expect(settled.company.state?.economy.finance.processedTick).toBe('5');
        expect(settled.company.state?.economy.physical?.processedTick).toBe('5');
        expect(settled.company.state?.economy.lifecycle.parties[0]?.location.kind).toBe('TRANSIT');
        expect(settled.company.routes).toHaveLength(1);
        expect(settled.company.receipts).toHaveLength(1);
        expect(settled.company.companyReceipts).toHaveLength(
          beforeRead.company.companyReceipts.length + 1,
        );
        expect(settled.company.events.length).toBeGreaterThan(beforeRead.company.events.length);
        const replay = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: travel,
        });
        expect(replay.statusCode).toBe(200);
        expect(replay.json()).toEqual(submitted.json());
        expect(await inspectReadOnlyState()).toEqual(settled);
      } finally {
        await cleanupSyntheticCompany(db, cleanupActor);
      }
    },
  );

  it.skipIf(database === undefined)(
    'previews exact Old Mill supply, rejects a known shortage unchanged, and permits scoped return travel',
    async () => {
      const db = requireDatabase();
      const actor = makeSyntheticCompany(db);
      try {
        await seedSyntheticCompany(db, actor);
        await db.transaction().execute(async (transaction) => {
          await ensureFirstHuntGenesisInTransaction(transaction, actor.worldId);
          await transaction
            .updateTable('contract_instances')
            .set({ owner_company_id: actor.companyId })
            .where('world_id', '=', actor.worldId)
            .where('instance_id', '=', FIRST_HUNT_INSTANCE_ID)
            .executeTakeFirstOrThrow();
        });

        const origin = { kind: 'AT' as const, siteId: 'tikhaya-gat', areaId: 'tikhaya-gat-bank' };
        const siteArea = (siteId: string) =>
          siteId === 'severny-dvor'
            ? 'severny-dvor-yard'
            : siteId === 'tikhaya-gat'
              ? 'tikhaya-gat-bank'
              : 'staraya-melnitsa-yard';
        const rationContainerId = actor.initial.economy.physical!.items.find(
          (item) => item.definitionId === 'ration',
        )!.containerId!;
        const initialPhysical = actor.initial.economy.physical;
        if (!initialPhysical) throw new Error('World travel fixture physical state missing');
        const rationDefinition = COMPANY_CATALOGUE.items.find((item) => item.id === 'ration');
        const rationContainer = initialPhysical.containers.find(
          (container) => container.containerId === rationContainerId,
        );
        const rationItems = initialPhysical.items.filter(
          (item) =>
            item.containerId === rationContainerId &&
            item.definitionId === 'ration' &&
            item.tombstone === null,
        );
        const carrierId = actor.memberIds[0];
        const carrier = actor.initial.economy.lifecycle.characters.find(
          (character) => character.identity.characterId === carrierId,
        );
        const species = carrier
          ? COMPANY_CATALOGUE.species.find((entry) => entry.id === carrier.identity.speciesId)
          : undefined;
        const body = species
          ? COMPANY_CATALOGUE.bodies.find((entry) => entry.id === species.bodyId)
          : undefined;
        if (
          !rationDefinition ||
          !rationContainer ||
          rationItems.length === 0 ||
          !carrierId ||
          !carrier ||
          !body
        )
          throw new Error('World travel fixture ration carrier capacity is unavailable');
        const itemWeightG = (item: (typeof initialPhysical.items)[number]) => {
          const definition = COMPANY_CATALOGUE.items.find(
            (entry) => entry.id === item.definitionId,
          );
          if (!definition) throw new Error('World travel fixture item definition missing');
          return definition.weightG * item.quantity;
        };
        const existingCarriedContainerIds = new Set(
          initialPhysical.containers
            .filter(
              (container) =>
                container.containerId !== rationContainerId &&
                container.closed === null &&
                container.carrier?.kind === 'CHARACTER' &&
                container.carrier.id === carrierId,
            )
            .map((container) => container.containerId),
        );
        const existingCarriedWeightG = initialPhysical.items
          .filter(
            (item) =>
              item.containerId !== null &&
              existingCarriedContainerIds.has(item.containerId) &&
              item.tombstone === null,
          )
          .reduce((weight, item) => weight + itemWeightG(item), 0);
        const otherRationContainerWeightG = initialPhysical.items
          .filter(
            (item) =>
              item.containerId === rationContainerId &&
              !rationItems.some((ration) => ration.itemId === item.itemId) &&
              item.tombstone === null,
          )
          .reduce((weight, item) => weight + itemWeightG(item), 0);
        const remainingCarrierCapacityG = body.capacityG - existingCarriedWeightG;
        const remainingContainerCapacityG = rationContainer.capacityG - otherRationContainerWeightG;
        const rationStackCapacity = rationItems.length * rationDefinition.stackMax;
        const carriedRationQuantity = Math.min(
          Math.floor(
            Math.min(remainingCarrierCapacityG, remainingContainerCapacityG) /
              rationDefinition.weightG,
          ),
          rationStackCapacity,
        );
        if (carriedRationQuantity < rationItems.length)
          throw new Error('World travel fixture has no lawful carried ration capacity');
        const rationQuantityByItemId = new Map<string, number>();
        let rationsToAssign = carriedRationQuantity;
        for (const [index, item] of rationItems.entries()) {
          const minimumForRemainingStacks = rationItems.length - index - 1;
          const quantity = Math.min(
            rationDefinition.stackMax,
            rationsToAssign - minimumForRemainingStacks,
          );
          if (quantity < 1) throw new Error('World travel fixture ration stack is empty');
          rationQuantityByItemId.set(item.itemId, quantity);
          rationsToAssign -= quantity;
        }
        if (rationsToAssign !== 0) throw new Error('World travel fixture ration capacity mismatch');
        const withLawfulRationQuantity = (items: typeof initialPhysical.items) =>
          items.map((item) => {
            const quantity = rationQuantityByItemId.get(item.itemId);
            return quantity === undefined ? item : { ...item, quantity };
          });
        const atTikhaya = (
          rationSiteId: string,
          carrierKind: 'STATIC' | 'PARTY_SUPPLY' | 'CARRIED' = 'STATIC',
        ) =>
          readCompanyCombatAggregateState({
            ...actor.initial,
            economy: {
              ...actor.initial.economy,
              lifecycle: {
                ...actor.initial.economy.lifecycle,
                parties: actor.initial.economy.lifecycle.parties.map((party) => ({
                  ...party,
                  location: origin,
                })),
                characters: actor.initial.economy.lifecycle.characters.map((character) =>
                  character.presence.fieldPartyId === actor.partyId
                    ? { ...character, presence: { ...character.presence, location: origin } }
                    : character,
                ),
              },
              physical: {
                ...actor.initial.economy.physical!,
                items:
                  carrierKind === 'CARRIED'
                    ? withLawfulRationQuantity(initialPhysical.items)
                    : initialPhysical.items,
                containers: actor.initial.economy.physical!.containers.map((container) => {
                  if (container.containerId !== rationContainerId)
                    return { ...container, location: origin };
                  const location = {
                    kind: 'AT' as const,
                    siteId: rationSiteId,
                    areaId: siteArea(rationSiteId),
                  };
                  if (carrierKind === 'PARTY_SUPPLY')
                    return {
                      ...container,
                      kind: 'PARTY_SUPPLY' as const,
                      carrier: { kind: 'PARTY' as const, id: actor.partyId },
                      location,
                    };
                  if (carrierKind === 'CARRIED')
                    return {
                      ...container,
                      kind: 'CARRIED' as const,
                      carrier: { kind: 'CHARACTER' as const, id: actor.memberIds[0]! },
                      location,
                    };
                  return { ...container, kind: 'STATIC' as const, carrier: null, location };
                }),
                knowledge: {
                  ...actor.initial.economy.physical!.knowledge,
                  itemSnapshots:
                    carrierKind === 'CARRIED'
                      ? withLawfulRationQuantity(initialPhysical.knowledge.itemSnapshots)
                      : initialPhysical.knowledge.itemSnapshots,
                  containerSnapshots:
                    actor.initial.economy.physical!.knowledge.containerSnapshots.map(
                      (container) => {
                        if (container.containerId !== rationContainerId)
                          return { ...container, location: origin };
                        const location = {
                          kind: 'AT' as const,
                          siteId: rationSiteId,
                          areaId: siteArea(rationSiteId),
                        };
                        if (carrierKind === 'PARTY_SUPPLY')
                          return {
                            ...container,
                            kind: 'PARTY_SUPPLY' as const,
                            carrier: { kind: 'PARTY' as const, id: actor.partyId },
                            location,
                          };
                        if (carrierKind === 'CARRIED')
                          return {
                            ...container,
                            kind: 'CARRIED' as const,
                            carrier: { kind: 'CHARACTER' as const, id: actor.memberIds[0]! },
                            location,
                          };
                        return { ...container, kind: 'STATIC' as const, carrier: null, location };
                      },
                    ),
                },
              },
            },
          });
        const updateCompanyState = async (state: CompanyCombatAggregateState) => {
          await db
            .updateTable('company_snapshots')
            .set({ state })
            .where('world_id', '=', actor.worldId)
            .where('company_id', '=', actor.companyId)
            .executeTakeFirstOrThrow();
        };
        await updateCompanyState(atTikhaya('severny-dvor'));

        const previewRequest = {
          schemaVersion: 1,
          purpose: 'NEW',
          edgeIds: ['tikhaya-gat-staraya-melnitsa'],
        } as const;
        const beforePreview = await inspectCompany(db, actor);
        const preview = await actor.app.inject({
          method: 'POST',
          url: '/world/travel/preview',
          headers: actor.ownerHeaders,
          payload: previewRequest,
        });
        expect(preview.statusCode, preview.body).toBe(200);
        const previewBody: unknown = preview.json();
        if (!previewBody || typeof previewBody !== 'object' || !('atTick' in previewBody))
          throw new Error('World travel preview clock missing');
        if (typeof previewBody.atTick !== 'string')
          throw new Error('World travel preview clock is not a decimal string');
        const previewAtTick = previewBody.atTick;
        expect(previewAtTick).toMatch(/^(0|[1-9][0-9]*)$/);
        const previewTick = BigInt(previewAtTick);
        expect(previewTick).toBeGreaterThanOrEqual(
          BigInt(actor.initial.economy.lifecycle.campaignTick),
        );
        const foodStartTick = BigInt(actor.initial.economy.finance.processedTick);
        const foodEndTick = previewTick + 240n;
        const dayTicks = BigInt(COMPANY_RULES.ticksPerDay);
        const foodUnitsPerPersonDay = BigInt(COMPANY_RULES.economy.foodUnitsPerPersonDay);
        const foodDemands = actor.initial.economy.finance.accounts.flatMap((account) => {
          const membership = actor.initial.economy.lifecycle.memberships.find(
            (candidate) => candidate.membershipId === account.membershipId,
          );
          if (!membership) return [];
          const activeFrom =
            BigInt(membership.startedAt) > foodStartTick
              ? BigInt(membership.startedAt)
              : foodStartTick;
          const membershipEnd =
            membership.endedAt === null ? foodEndTick : BigInt(membership.endedAt);
          const activeUntil = membershipEnd < foodEndTick ? membershipEnd : foodEndTick;
          const character = actor.initial.economy.lifecycle.characters.find(
            (candidate) => candidate.identity.characterId === membership.characterId,
          );
          if (
            activeUntil <= activeFrom ||
            !character ||
            ['CAPTIVE', 'OUT_OF_CONTACT'].includes(character.presence.availability)
          )
            return [];
          return [
            {
              activeTicks: activeUntil - activeFrom,
              priorCarry: BigInt(
                initialPhysical.foodCarry.find(
                  (entry) => entry.membershipId === account.membershipId,
                )?.tickUnits ?? '0',
              ),
            },
          ];
        });
        const requiredStockUnits = foodDemands.reduce((total, demand) => {
          const foodUnits = demand.activeTicks * foodUnitsPerPersonDay;
          const stockUnits =
            (demand.priorCarry + foodUnits + dayTicks - 1n) / dayTicks -
            (demand.priorCarry > 0n ? 1n : 0n);
          return total + stockUnits;
        }, 0n);
        expect(previewBody).toEqual({
          schemaVersion: 1,
          publicRevision: actor.initial.economy.lifecycle.knowledge.revision,
          routeEpoch: '0',
          atTick: previewAtTick,
          purpose: 'NEW',
          edgeIds: previewRequest.edgeIds,
          knownShortage: true,
          assumptions: [
            'SERVER_CLOCK',
            'CURRENT_COMPANY_OWNED_PARTY_STOCK',
            'EXACT_FRACTIONAL_FOOD_CARRY',
          ],
          requiredStockUnits: requiredStockUnits.toString(),
          availableStockUnits: '0',
        });
        expect(foodDemands.length).toBeGreaterThan(0);
        expect(requiredStockUnits).toBeGreaterThan(0n);
        expect(await inspectCompany(db, actor)).toEqual(beforePreview);

        const unknownRoute = await actor.app.inject({
          method: 'POST',
          url: '/world/travel/preview',
          headers: actor.ownerHeaders,
          payload: { ...previewRequest, edgeIds: ['unknown-route'] },
        });
        expect(unknownRoute.statusCode).toBe(409);
        expect(unknownRoute.body).not.toContain(actor.accountId);
        expect(unknownRoute.body).not.toContain(actor.companyId);
        const foreignPreview = await actor.app.inject({
          method: 'POST',
          url: '/world/travel/preview',
          headers: actor.foreignHeaders,
          payload: previewRequest,
        });
        expect(foreignPreview.statusCode).toBe(409);
        expect(foreignPreview.body).not.toContain(actor.accountId);
        expect(foreignPreview.body).not.toContain(actor.companyId);
        expect(await inspectCompany(db, actor)).toEqual(beforePreview);

        const departure = {
          schemaVersion: 2,
          commandId: randomUUID(),
          expectedPublicRevision: actor.initial.economy.lifecycle.knowledge.revision,
          expectedRouteEpoch: '0',
          purpose: 'NEW',
          edgeIds: previewRequest.edgeIds,
        } as const;
        const rejected = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: departure,
        });
        expect(rejected.statusCode).toBe(409);
        expect(rejected.json()).toMatchObject({
          schemaVersion: 2,
          commandId: departure.commandId,
          ok: false,
          code: 'INVALID_ROUTE',
        });
        expect(await inspectCompany(db, actor)).toEqual(beforePreview);

        await updateCompanyState(atTikhaya('tikhaya-gat'));
        await setWorldClock(db, actor, 990);
        const beforeStaticDeparture = await inspectCompany(db, actor);
        const staticPreview = await actor.app.inject({
          method: 'POST',
          url: '/world/travel/preview',
          headers: actor.ownerHeaders,
          payload: previewRequest,
        });
        expect(staticPreview.statusCode, staticPreview.body).toBe(200);
        expect(staticPreview.json()).toMatchObject({
          knownShortage: true,
          availableStockUnits: '0',
        });
        const staticOnlyDeparture = { ...departure, commandId: randomUUID() };
        const staticOnlyRejected = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: staticOnlyDeparture,
        });
        expect(staticOnlyRejected.statusCode).toBe(409);
        expect(staticOnlyRejected.json()).toMatchObject({
          commandId: staticOnlyDeparture.commandId,
          ok: false,
          code: 'INVALID_ROUTE',
        });
        expect(await inspectCompany(db, actor)).toEqual(beforeStaticDeparture);

        await updateCompanyState(atTikhaya('tikhaya-gat', 'CARRIED'));
        const beforeCarriedPreview = await inspectCompany(db, actor);
        const beforeCarriedClock = await clockRowsFor(db, actor);
        const beforeCarriedState = beforeCarriedPreview.state;
        const beforeCarriedPhysical = beforeCarriedState?.economy.physical;
        if (!beforeCarriedState || !beforeCarriedPhysical)
          throw new Error('World travel carried-stock fixture is unavailable');
        const initialCarriedStockUnits = physicalOutcome(beforeCarriedState).rationQuantity;
        const routeEdge = acceptedWorldRegion(WORLD_REGION_VERSION)?.edges.find(
          (edge) => edge.edgeId === previewRequest.edgeIds[0],
        );
        if (!routeEdge) throw new Error('World travel fixture route edge is unavailable');
        const routeDurationTicks = BigInt(routeEdge.provisionalTravelTicks);
        const carriedFoodStartTick = BigInt(beforeCarriedState.economy.physical.processedTick);
        expect(carriedFoodStartTick).toBe(foodStartTick);
        const foodRecipients = beforeCarriedState.economy.finance.accounts.flatMap((account) => {
          const membership = beforeCarriedState.economy.lifecycle.memberships.find(
            (candidate) => candidate.membershipId === account.membershipId,
          );
          const character = membership
            ? beforeCarriedState.economy.lifecycle.characters.find(
                (candidate) => candidate.identity.characterId === membership.characterId,
              )
            : undefined;
          if (
            !membership ||
            !character ||
            ['CAPTIVE', 'OUT_OF_CONTACT'].includes(character.presence.availability)
          )
            return [];
          return [
            {
              membership,
              priorCarry: BigInt(
                beforeCarriedPhysical.foodCarry.find(
                  (entry) => entry.membershipId === membership.membershipId,
                )?.tickUnits ?? '0',
              ),
            },
          ];
        });
        expect(foodRecipients).toHaveLength(actor.memberIds.length);
        const activeTicksWithin = (
          membership: (typeof foodRecipients)[number]['membership'],
          fromTick: bigint,
          throughTick: bigint,
        ) => {
          const activeFrom =
            BigInt(membership.startedAt) > fromTick ? BigInt(membership.startedAt) : fromTick;
          const membershipEnd =
            membership.endedAt === null ? throughTick : BigInt(membership.endedAt);
          const activeUntil = membershipEnd < throughTick ? membershipEnd : throughTick;
          return activeUntil > activeFrom ? activeUntil - activeFrom : 0n;
        };
        const foodUse = (activeTicks: bigint, priorCarry: bigint) => {
          const accruedTickUnits = priorCarry + activeTicks * foodUnitsPerPersonDay;
          return {
            stockUnits: (accruedTickUnits + dayTicks - 1n) / dayTicks - (priorCarry > 0n ? 1n : 0n),
            remainingCarry: accruedTickUnits % dayTicks,
          };
        };

        const carriedPreview = await actor.app.inject({
          method: 'POST',
          url: '/world/travel/preview',
          headers: actor.ownerHeaders,
          payload: previewRequest,
        });
        expect(carriedPreview.statusCode, carriedPreview.body).toBe(200);
        const carriedPreviewBody = carriedPreview.json() as WorldTravelPreviewResponseDto;
        const carriedPreviewTick = BigInt(carriedPreviewBody.atTick);
        const catchUpElapsedTicks = carriedPreviewTick - carriedFoodStartTick;
        const dueTick = carriedPreviewTick + routeDurationTicks;
        expect(catchUpElapsedTicks).toBe(990n);
        const prefixFoodUse = foodRecipients.map(({ membership, priorCarry }) => {
          const demand = foodUse(
            activeTicksWithin(membership, carriedFoodStartTick, carriedPreviewTick),
            priorCarry,
          );
          return { membershipId: membership.membershipId, ...demand };
        });
        const requiredPrefixStockUnits = prefixFoodUse.reduce(
          (total, demand) => total + demand.stockUnits,
          0n,
        );
        const availableAfterCatchUp = BigInt(initialCarriedStockUnits) - requiredPrefixStockUnits;
        const routeFoodUse = foodRecipients.map(({ membership }, index) => ({
          membershipId: membership.membershipId,
          ...foodUse(
            activeTicksWithin(membership, carriedPreviewTick, dueTick),
            prefixFoodUse[index]!.remainingCarry,
          ),
        }));
        const requiredRouteStockUnits = routeFoodUse.reduce(
          (total, demand) => total + demand.stockUnits,
          0n,
        );
        const availableAfterArrival = availableAfterCatchUp - requiredRouteStockUnits;
        expect(requiredPrefixStockUnits).toBeGreaterThan(0n);
        expect(requiredRouteStockUnits).toBeGreaterThan(0n);
        expect(availableAfterCatchUp).toBeGreaterThanOrEqual(requiredRouteStockUnits);
        expect(availableAfterArrival).toBeGreaterThanOrEqual(0n);
        expect(carriedPreview.json()).toMatchObject({
          knownShortage: false,
          availableStockUnits: availableAfterCatchUp.toString(),
          requiredStockUnits: requiredRouteStockUnits.toString(),
        });
        for (let repeat = 0; repeat < 2; repeat += 1) {
          const repeatedPreview = await actor.app.inject({
            method: 'POST',
            url: '/world/travel/preview',
            headers: actor.ownerHeaders,
            payload: previewRequest,
          });
          expect(repeatedPreview.statusCode, repeatedPreview.body).toBe(200);
          expect(repeatedPreview.json()).toEqual(carriedPreviewBody);
        }
        expect(await inspectCompany(db, actor)).toEqual(beforeCarriedPreview);
        expect(await clockRowsFor(db, actor)).toEqual(beforeCarriedClock);
        expect(initialCarriedStockUnits).toBe(carriedRationQuantity);

        const acceptedDeparture = { ...departure, commandId: randomUUID() };
        const accepted = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: acceptedDeparture,
        });
        expect(accepted.statusCode, accepted.body).toBe(200);
        const acceptedBody = accepted.json() as WorldTravelV2ResponseDto;
        const outboundDueTick = acceptedBody.execution?.activeSegment?.dueTick;
        if (!outboundDueTick) throw new Error('Accepted outbound route due tick missing');
        expect(outboundDueTick).toMatch(/^(0|[1-9][0-9]*)$/);
        expect(acceptedBody.worldTick).toBe(carriedPreviewBody.atTick);
        expect(BigInt(outboundDueTick) - BigInt(acceptedBody.worldTick)).toBe(routeDurationTicks);
        const replayState = await inspectCompany(db, actor);
        expect(replayState.state?.economy.lifecycle.campaignTick).toBe(carriedPreviewBody.atTick);
        expect(replayState.state?.economy.physical?.processedTick).toBe(carriedPreviewBody.atTick);
        expect(BigInt(physicalOutcome(replayState.state!).rationQuantity)).toBe(
          availableAfterCatchUp,
        );
        for (const expected of prefixFoodUse) {
          expect(
            replayState.state?.economy.physical?.foodCarry.find(
              (entry) => entry.membershipId === expected.membershipId,
            )?.tickUnits,
          ).toBe(expected.remainingCarry.toString());
        }
        const setWorldClockAtDueTick = async (dueTick: string) => {
          const elapsedTicks =
            BigInt(dueTick) - BigInt(actor.initial.economy.lifecycle.campaignTick);
          if (elapsedTicks < 0n || elapsedTicks > BigInt(Number.MAX_SAFE_INTEGER))
            throw new Error('World travel due tick is outside the local clock range');
          await setWorldClock(db, actor, Number(elapsedTicks));
        };
        const replay = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: acceptedDeparture,
        });
        expect(replay.statusCode, replay.body).toBe(200);
        expect(replay.body).toBe(accepted.body);
        expect(await inspectCompany(db, actor)).toEqual(replayState);

        await setWorldClockAtDueTick(outboundDueTick);
        await processWorldRouteCandidate(db, actor.worldId, {
          companyId: actor.companyId,
          partyId: actor.partyId,
          acceptedByAccountId: actor.accountId,
        });
        const outboundArrivalState = await inspectCompany(db, actor);
        expect(outboundArrivalState.routes[0]?.status).toBe('ARRIVED');
        expect(outboundArrivalState.state?.economy.lifecycle.parties[0]?.location).toMatchObject({
          kind: 'AT',
          siteId: 'staraya-melnitsa',
        });
        expect(
          outboundArrivalState.state?.economy.physical?.food.some(
            (entry) => entry.toTick === outboundDueTick,
          ),
        ).toBe(true);
        expect(BigInt(physicalOutcome(outboundArrivalState.state!).rationQuantity)).toBe(
          availableAfterArrival,
        );
        for (const expected of routeFoodUse) {
          expect(
            outboundArrivalState.state?.economy.physical?.foodCarry.find(
              (entry) => entry.membershipId === expected.membershipId,
            )?.tickUnits,
          ).toBe(expected.remainingCarry.toString());
        }
        const millRead = await actor.app.inject({
          method: 'GET',
          url: '/world/party',
          headers: actor.ownerHeaders,
        });
        expect(millRead.statusCode).toBe(200);
        expect(millRead.json().party).toMatchObject({ location: 'staraya-melnitsa' });
        const returnPreview = await actor.app.inject({
          method: 'POST',
          url: '/world/travel/preview',
          headers: actor.ownerHeaders,
          payload: { ...previewRequest, purpose: 'RETURN' },
        });
        expect(returnPreview.statusCode, returnPreview.body).toBe(200);
        expect(returnPreview.json()).toMatchObject({
          purpose: 'RETURN',
          edgeIds: previewRequest.edgeIds,
          routeEpoch: '1',
        });
        const returned = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: {
            schemaVersion: 2,
            commandId: randomUUID(),
            expectedPublicRevision: millRead.json().publicRevision,
            expectedRouteEpoch: millRead.json().party.routeEpoch,
            purpose: 'RETURN',
            edgeIds: previewRequest.edgeIds,
          },
        });
        expect(returned.statusCode, returned.body).toBe(200);
        expect(returned.json()).toMatchObject({
          schemaVersion: 2,
          execution: { purpose: 'RETURN', phase: 'IN_TRANSIT' },
        });
        const returnDueTick = (returned.json() as WorldTravelV2ResponseDto).execution?.activeSegment
          ?.dueTick;
        if (!returnDueTick) throw new Error('Accepted return route due tick missing');
        expect(returnDueTick).toMatch(/^(0|[1-9][0-9]*)$/);
        expect(await inspectCompany(db, actor)).not.toEqual(replayState);
        await setWorldClockAtDueTick(returnDueTick);
        await processWorldRouteCandidate(db, actor.worldId, {
          companyId: actor.companyId,
          partyId: actor.partyId,
          acceptedByAccountId: actor.accountId,
        });
        const returnArrivalState = await inspectCompany(db, actor);
        expect(returnArrivalState.routes[0]?.status).toBe('ARRIVED');
        expect(returnArrivalState.state?.economy.lifecycle.parties[0]?.location).toMatchObject({
          kind: 'AT',
          siteId: 'tikhaya-gat',
        });
        expect(
          returnArrivalState.state?.economy.physical?.food.some(
            (entry) => entry.toTick === returnDueTick,
          ),
        ).toBe(true);
        const returnedRead = await actor.app.inject({
          method: 'GET',
          url: '/world/party',
          headers: actor.ownerHeaders,
        });
        expect(returnedRead.statusCode).toBe(200);
        expect(returnedRead.json().party).toMatchObject({ location: 'tikhaya-gat' });
      } finally {
        await cleanupSyntheticCompany(db, actor);
      }
    },
  );

  it.skipIf(database === undefined)(
    'commits one safe trip atomically, replays receipts, rejects stale/foreign requests, and settles exact due time',
    async () => {
      const db = requireDatabase();
      const actor = makeSyntheticCompany(db);
      try {
        await seedSyntheticCompany(db, actor);

        const anonymous = await actor.app.inject({ method: 'GET', url: '/world/party' });
        expect(anonymous.statusCode).toBe(401);

        const ownerRead = await actor.app.inject({
          method: 'GET',
          url: '/world/party',
          headers: actor.ownerHeaders,
        });
        expect(ownerRead.statusCode).toBe(200);
        expect(ownerRead.json()).toMatchObject({
          schemaVersion: 1,
          publicRevision: actor.initial.economy.lifecycle.knowledge.revision,
          party: {
            partyId: actor.partyId,
            location: 'severny-dvor',
            memberIds: actor.memberIds.toSorted(),
            routeEpoch: '0',
          },
          availableDepartures: expect.arrayContaining([
            {
              purpose: 'NEW',
              edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
              fromSiteId: 'severny-dvor',
              toSiteId: 'bereznyak',
            },
          ]),
          route: null,
        });

        const beforeInvalidReturnPreview = {
          company: await inspectCompany(db, actor),
          worldClock: await clockRowsFor(db, actor),
        };
        const invalidReturnRoute = ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'];
        const invalidReturnPreview = await actor.app.inject({
          method: 'POST',
          url: '/world/travel/preview',
          headers: actor.ownerHeaders,
          payload: { schemaVersion: 1, purpose: 'RETURN', edgeIds: invalidReturnRoute },
        });
        expect(invalidReturnPreview.statusCode).toBe(409);
        const invalidReturnSubmit = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: {
            schemaVersion: 2,
            commandId: randomUUID(),
            expectedPublicRevision: ownerRead.json().publicRevision,
            expectedRouteEpoch: '0',
            purpose: 'RETURN',
            edgeIds: invalidReturnRoute,
          },
        });
        expect(invalidReturnSubmit.statusCode).toBe(409);
        expect(invalidReturnSubmit.json()).toMatchObject({ ok: false, code: 'INVALID_ROUTE' });
        expect({
          company: await inspectCompany(db, actor),
          worldClock: await clockRowsFor(db, actor),
        }).toEqual(beforeInvalidReturnPreview);

        const staleCompanyRead = await actor.app.inject({
          method: 'GET',
          url: '/world/party',
          headers: {
            ...actor.foreignHeaders,
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: actor.companyId,
          },
        });
        expect(staleCompanyRead.statusCode).toBe(403);
        expect(staleCompanyRead.body).not.toContain(actor.accountId);
        expect(staleCompanyRead.body).not.toContain(actor.companyId);
        expect(staleCompanyRead.body).not.toContain(actor.partyId);

        await expectRejectedTravelWithoutMutation(
          db,
          actor,
          {
            ...departureRequest(actor, randomUUID()),
            action: {
              kind: 'DEPART',
              purpose: 'RETURN',
              edgeIds: ['kamenny-brod-severny-dvor'],
            },
          },
          'INVALID_ROUTE',
        );

        const noCompanyContextHeaders = Object.fromEntries(
          Object.entries(actor.foreignHeaders).filter(
            ([header]) => header !== WORLD_EXPECTED_COMPANY_ID_HEADER,
          ),
        );
        const foreignRead = await actor.app.inject({
          method: 'GET',
          url: '/world/party',
          headers: noCompanyContextHeaders,
        });
        expect(foreignRead.statusCode).toBe(200);
        expect(foreignRead.json()).toMatchObject({ party: null, route: null });
        expect(JSON.stringify(foreignRead.json())).not.toContain(actor.companyId);
        expect(JSON.stringify(foreignRead.json())).not.toContain(actor.partyId);

        const rollbackCommandId = randomUUID();
        const rollbackRequest = departureRequest(actor, rollbackCommandId);
        failNextApplicationTransactionBeforeCommit = true;
        const rolledBack = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: rollbackRequest,
        });
        expect(rolledBack.statusCode).toBe(500);
        expect(failNextApplicationTransactionBeforeCommit).toBe(false);
        const afterRollback = await inspectCompany(db, actor);
        expect(afterRollback.state).toEqual(actor.initial);
        expect(afterRollback.routes).toHaveLength(0);
        expect(afterRollback.receipts).toHaveLength(0);
        expect(afterRollback.companyReceipts).toHaveLength(0);
        expect(afterRollback.events).toHaveLength(0);

        const commandIds = [randomUUID(), randomUUID()] as const;
        const competingRequests = commandIds.map((commandId) =>
          actor.app.inject({
            method: 'POST',
            url: '/world/travel',
            headers: actor.ownerHeaders,
            payload: departureRequest(actor, commandId),
          }),
        );
        const competing = await Promise.all(competingRequests);
        const winnerIndex = competing.findIndex((response) => response.statusCode === 200);
        const loserIndex = winnerIndex === 0 ? 1 : 0;
        expect(winnerIndex).not.toBe(-1);
        expect(competing[loserIndex]!.statusCode).toBe(409);
        expect(competing[loserIndex]!.json()).toMatchObject({
          ok: false,
          code: 'STALE_REVISION',
        });

        const winnerRequest = departureRequest(actor, commandIds[winnerIndex]!);
        const departedResponse = competing[winnerIndex]!;
        const departed = departedResponse.json();
        expect(departedResponse.headers['content-type']).toBe('application/json; charset=utf-8');
        expect(departed).toMatchObject({
          commandId: commandIds[winnerIndex],
          party: { location: 'severny-dvor', routeEpoch: '1' },
          route: { edgeIds: ['kamenny-brod-severny-dvor'], dueTick: '1010' },
        });
        const afterDeparture = await inspectCompany(db, actor);
        expect(afterDeparture.routes).toHaveLength(1);
        expect(afterDeparture.routes[0]).toMatchObject({
          route_epoch: '1',
          segment_id: departed.route.segmentId,
          status: 'IN_TRANSIT',
        });
        expect(afterDeparture.receipts.map((receipt) => receipt.command_id)).toEqual([
          commandIds[winnerIndex],
        ]);
        expect(afterDeparture.companyReceipts.map((receipt) => receipt.command_id)).toEqual([
          commandIds[winnerIndex],
        ]);
        expect(
          afterDeparture.events.some((row) => hasEventType(row.event, 'WorldTravelDeparted')),
        ).toBe(true);
        expect(afterDeparture.snapshot?.canonical_revision).toBe(
          afterDeparture.state?.economy.lifecycle.revision,
        );
        expect(afterDeparture.snapshot?.public_revision).toBe(departed.publicRevision);

        const acceptedRouteRow = afterDeparture.routes[0];
        if (!acceptedRouteRow) throw new Error('Committed world route is missing');
        const acceptedRoute = acceptedRouteRow.accepted_route as Record<string, unknown>;
        const unavailableRegionVersion = 'retired-fixture-region';
        await db
          .updateTable('world_party_routes')
          .set({
            region_version: unavailableRegionVersion,
            accepted_route: { ...acceptedRoute, regionVersion: unavailableRegionVersion },
          })
          .where('world_id', '=', actor.worldId)
          .where('company_id', '=', actor.companyId)
          .where('party_id', '=', actor.partyId)
          .executeTakeFirstOrThrow();
        const beforeUnavailableVersion = await inspectCompany(db, actor);
        const unavailableVersion = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: arrivalRequest(actor, departed, randomUUID()),
        });
        expect(unavailableVersion.statusCode).toBe(409);
        expect(unavailableVersion.json()).toMatchObject({ ok: false, code: 'INVALID_ROUTE' });
        const afterUnavailableVersion = await inspectCompany(db, actor);
        expect(afterUnavailableVersion.state).toEqual(beforeUnavailableVersion.state);
        expect(afterUnavailableVersion.snapshot).toEqual(beforeUnavailableVersion.snapshot);
        expect(afterUnavailableVersion.routes).toEqual(beforeUnavailableVersion.routes);
        expect(afterUnavailableVersion.receipts).toEqual(beforeUnavailableVersion.receipts);
        expect(afterUnavailableVersion.events).toEqual(beforeUnavailableVersion.events);
        await db
          .updateTable('world_party_routes')
          .set({
            region_version: acceptedRouteRow.region_version,
            accepted_route: acceptedRoute,
          })
          .where('world_id', '=', actor.worldId)
          .where('company_id', '=', actor.companyId)
          .where('party_id', '=', actor.partyId)
          .executeTakeFirstOrThrow();

        const replay = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: winnerRequest,
        });
        expect(replay.statusCode).toBe(200);
        expect(replay.json()).toEqual(departed);
        expect(replay.body).toBe(departedResponse.body);
        expect(replay.headers['content-type']).toBe(departedResponse.headers['content-type']);

        const changedReplay = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: { ...winnerRequest, action: { kind: 'ARRIVE' } },
        });
        expect(changedReplay.statusCode).toBe(400);
        expect(changedReplay.json()).toMatchObject({
          ok: false,
          code: 'INVALID_COMMAND',
        });

        const foreignReceiptRead = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.foreignHeaders,
          payload: winnerRequest,
        });
        expect(foreignReceiptRead.statusCode).toBe(403);
        expect(foreignReceiptRead.json()).toMatchObject({
          ok: false,
          code: 'NOT_AUTHORIZED',
        });

        const beforeEarlyArrival = await inspectCompany(db, actor);
        const early = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: arrivalRequest(actor, departed, randomUUID()),
        });
        expect(early.statusCode).toBe(409);
        expect(early.json()).toMatchObject({ ok: false, code: 'INVALID_ARRIVAL' });
        const afterEarlyArrival = await inspectCompany(db, actor);
        expect(afterEarlyArrival.state).toEqual(beforeEarlyArrival.state);
        expect(afterEarlyArrival.routes).toEqual(beforeEarlyArrival.routes);
        expect(afterEarlyArrival.receipts).toEqual(beforeEarlyArrival.receipts);
        expect(afterEarlyArrival.events).toEqual(beforeEarlyArrival.events);

        await setWorldClock(db, actor, 10);
        const firstArrivalCommandId = randomUUID();
        const firstArrivalRequest = arrivalRequest(actor, departed, firstArrivalCommandId);
        const arrived = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: firstArrivalRequest,
        });
        const arrivalBody = arrived.json() as { code?: string; ok?: boolean };
        expect(
          arrived.statusCode,
          JSON.stringify({
            statusCode: arrived.statusCode,
            code: arrivalBody.code,
            ok: arrivalBody.ok,
          }),
        ).toBe(200);
        expect(arrived.json()).toMatchObject({
          worldTick: '1010',
          party: { location: 'kamenny-brod', routeEpoch: '1' },
          route: null,
        });
        expect(arrived.headers['content-type']).toBe('application/json; charset=utf-8');
        const afterArrival = await inspectCompany(db, actor);
        expect(afterArrival.state?.economy.lifecycle.campaignTick).toBe('1010');
        expect(afterArrival.state?.economy.finance.processedTick).toBe('1010');
        expect(afterArrival.state?.economy.physical?.processedTick).toBe('1010');
        expect(afterArrival.routes[0]?.status).toBe('ARRIVED');
        expect(afterArrival.receipts).toHaveLength(2);
        expect(afterArrival.companyReceipts).toHaveLength(2);
        expect(
          afterArrival.events.some((row) => hasEventType(row.event, 'WorldTravelArrived')),
        ).toBe(true);

        const reverseDeparture = (purpose?: 'NEW' | 'RETURN') =>
          ({
            schemaVersion: 1,
            commandId: randomUUID(),
            expectedPublicRevision: arrived.json().publicRevision,
            expectedRouteEpoch: '1',
            action: {
              kind: 'DEPART',
              ...(purpose === undefined ? {} : { purpose }),
              edgeIds: ['kamenny-brod-severny-dvor'],
            },
          }) as const;
        await expectRejectedTravelWithoutMutation(db, actor, reverseDeparture(), 'INVALID_ROUTE');
        await expectRejectedTravelWithoutMutation(
          db,
          actor,
          reverseDeparture('NEW'),
          'INVALID_ROUTE',
        );

        const firstLegPhysical = physicalOutcome(afterArrival.state!);
        const returnedCommandId = randomUUID();
        const returned = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: {
            schemaVersion: 1,
            commandId: returnedCommandId,
            expectedPublicRevision: arrived.json().publicRevision,
            expectedRouteEpoch: '1',
            action: {
              kind: 'DEPART',
              purpose: 'RETURN',
              edgeIds: ['kamenny-brod-severny-dvor'],
            },
          },
        });
        expect(returned.statusCode, returned.body).toBe(200);
        expect(returned.json()).toMatchObject({
          worldTick: '1010',
          party: { location: 'kamenny-brod', routeEpoch: '2' },
          route: { routeEpoch: '2', dueTick: '1020' },
        });
        const afterReturnDeparture = await inspectCompany(db, actor);
        expect(afterReturnDeparture.routes[0]).toMatchObject({
          route_epoch: '2',
          status: 'IN_TRANSIT',
        });
        expect(afterReturnDeparture.companyReceipts).toHaveLength(3);

        await setWorldClock(db, actor, 20);
        const returnArrivalCommandId = randomUUID();
        const returnArrived = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: {
            schemaVersion: 1,
            commandId: returnArrivalCommandId,
            expectedPublicRevision: returned.json().publicRevision,
            expectedRouteEpoch: '2',
            action: { kind: 'ARRIVE' },
          },
        });
        expect(returnArrived.statusCode, returnArrived.body).toBe(200);
        expect(returnArrived.json()).toMatchObject({
          worldTick: '1020',
          party: { location: 'severny-dvor', routeEpoch: '2' },
          route: null,
        });
        const afterReturnArrival = await inspectCompany(db, actor);
        expect(afterReturnArrival.state?.economy.lifecycle.campaignTick).toBe('1020');
        expect(afterReturnArrival.state?.economy.finance.processedTick).toBe('1020');
        expect(afterReturnArrival.state?.economy.physical?.processedTick).toBe('1020');
        expect(afterReturnArrival.routes[0]).toMatchObject({
          route_epoch: '2',
          status: 'ARRIVED',
        });
        expect(afterReturnArrival.receipts).toHaveLength(4);
        expect(afterReturnArrival.companyReceipts).toHaveLength(4);
        const finalPhysical = physicalOutcome(afterReturnArrival.state!);
        expect(firstLegPhysical.rationQuantity).toBe(
          physicalOutcome(actor.initial).rationQuantity - actor.memberIds.length,
        );
        expect(finalPhysical.rationQuantity).toBe(firstLegPhysical.rationQuantity);
        const returnedRoute = returned.json().route as {
          readonly startedAt: string;
          readonly dueTick: string;
        };
        expect(finalPhysical.foodIntervals).toEqual(
          expect.arrayContaining([
            [departed.route.startedAt, departed.route.dueTick],
            [returnedRoute.startedAt, returnedRoute.dueTick],
          ]),
        );
        const travelMembershipIds = new Set<string>(
          actor.initial.economy.lifecycle.memberships
            .filter((membership) => actor.memberIds.includes(membership.characterId))
            .map((membership) => membership.membershipId),
        );
        const carriedDemand = (
          (BigInt(departed.route.dueTick) -
            BigInt(departed.route.startedAt) +
            BigInt(returnedRoute.dueTick) -
            BigInt(returnedRoute.startedAt)) *
          BigInt(COMPANY_RULES.economy.foodUnitsPerPersonDay)
        ).toString();
        expect(
          afterReturnArrival.state?.economy.physical?.foodCarry
            .filter((entry) => travelMembershipIds.has(entry.membershipId))
            .map((entry) => entry.tickUnits)
            .toSorted(),
        ).toEqual([...travelMembershipIds].map(() => carriedDemand).toSorted());
        expect(finalPhysical.stamina).toEqual(
          physicalOutcome(actor.initial).stamina.map(
            (stamina) => stamina - TRAVEL_RULES.staminaPerMember * 2,
          ),
        );
        expect(new Set(afterReturnArrival.events.map((row) => row.event_id)).size).toBe(
          afterReturnArrival.events.length,
        );

        const freshRead = await actor.app.inject({
          method: 'GET',
          url: '/world/party',
          headers: actor.ownerHeaders,
        });
        expect(freshRead.json()).toMatchObject({
          party: { location: 'severny-dvor', routeEpoch: '2' },
          route: null,
        });
        const delayedReplay = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: winnerRequest,
        });
        expect(delayedReplay.statusCode).toBe(200);
        expect(delayedReplay.json()).toEqual(departed);
        expect(delayedReplay.body).toBe(departedResponse.body);
        const delayedArrivalReplay = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: firstArrivalRequest,
        });
        expect(delayedArrivalReplay.statusCode).toBe(200);
        expect(delayedArrivalReplay.json()).toEqual(arrived.json());
        expect(delayedArrivalReplay.body).toBe(arrived.body);
        expect(delayedArrivalReplay.headers['content-type']).toBe(arrived.headers['content-type']);

        await db
          .deleteFrom('world_route_receipts')
          .where('world_id', '=', actor.worldId)
          .where('company_id', '=', actor.companyId)
          .where('command_id', '=', commandIds[winnerIndex]!)
          .executeTakeFirstOrThrow();
        const beforeOrphanReplay = await inspectCompany(db, actor);
        const orphanReplay = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: winnerRequest,
        });
        expect(orphanReplay.statusCode).toBe(400);
        expect(orphanReplay.json()).toMatchObject({ ok: false, code: 'INVALID_COMMAND' });
        const afterOrphanReplay = await inspectCompany(db, actor);
        expect(afterOrphanReplay.state).toEqual(beforeOrphanReplay.state);
        expect(afterOrphanReplay.snapshot).toEqual(beforeOrphanReplay.snapshot);
        expect(afterOrphanReplay.routes).toEqual(beforeOrphanReplay.routes);
        expect(afterOrphanReplay.receipts).toEqual(beforeOrphanReplay.receipts);
        expect(afterOrphanReplay.companyReceipts).toEqual(beforeOrphanReplay.companyReceipts);
        expect(afterOrphanReplay.events).toEqual(beforeOrphanReplay.events);
      } finally {
        await cleanupSyntheticCompany(db, actor);
      }
    },
  );

  it.skipIf(database === undefined)(
    'binds each travel request to the company captured by its authenticated client before route receipts or clock reads',
    async () => {
      const db = requireDatabase();
      const actorA = makeSyntheticCompany(db);
      const actorB = makeSyntheticCompany(db);
      try {
        await seedSyntheticCompany(db, actorA);
        await seedSyntheticCompany(db, actorB);

        const beforeA = await inspectCompany(db, actorA);
        const beforeB = await inspectCompany(db, actorB);
        const beforeClockA = await clockRowsFor(db, actorA);
        const beforeClockB = await clockRowsFor(db, actorB);
        expect(beforeA.state?.economy.lifecycle.knowledge.revision).toBe(
          beforeB.state?.economy.lifecycle.knowledge.revision,
        );
        expect(beforeA.state?.economy.lifecycle.parties[0]?.location).toEqual(
          beforeB.state?.economy.lifecycle.parties[0]?.location,
        );

        const missingHeader = {
          cookie: actorA.ownerHeaders.cookie,
          origin: actorA.ownerHeaders.origin,
        };
        const missing = await actorA.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: missingHeader,
          payload: departureRequest(actorA, randomUUID()),
        });
        expect(missing.statusCode).toBe(400);
        expect(missing.json()).toMatchObject({
          ok: false,
          code: 'INVALID_COMMAND',
          publicRevision: '0',
        });
        const malformed = await actorA.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: { ...actorA.ownerHeaders, [WORLD_EXPECTED_COMPANY_ID_HEADER]: '' },
          payload: departureRequest(actorA, randomUUID()),
        });
        expect(malformed.statusCode).toBe(400);
        expect(malformed.json()).toMatchObject({
          ok: false,
          code: 'INVALID_COMMAND',
          publicRevision: '0',
        });
        expect(await clockRowsFor(db, actorA)).toEqual(beforeClockA);

        const foreignDeparture = await actorB.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: {
            ...actorB.ownerHeaders,
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: actorA.companyId,
          },
          payload: departureRequest(actorA, randomUUID()),
        });
        expect(foreignDeparture.statusCode).toBe(403);
        expect(foreignDeparture.json()).toMatchObject({
          ok: false,
          code: 'NOT_AUTHORIZED',
          publicRevision: '0',
        });
        expect(JSON.stringify(foreignDeparture.json())).not.toContain(actorA.companyId);
        expect(JSON.stringify(foreignDeparture.json())).not.toContain(actorB.companyId);
        expect(await clockRowsFor(db, actorB)).toEqual(beforeClockB);
        const unchangedA = await inspectCompany(db, actorA);
        const unchangedB = await inspectCompany(db, actorB);
        expect(unchangedA.state).toEqual(beforeA.state);
        expect(unchangedA.snapshot).toEqual(beforeA.snapshot);
        expect(unchangedA.routes).toEqual(beforeA.routes);
        expect(unchangedA.receipts).toEqual(beforeA.receipts);
        expect(unchangedA.companyReceipts).toEqual(beforeA.companyReceipts);
        expect(unchangedA.events).toEqual(beforeA.events);
        expect(unchangedB.state).toEqual(beforeB.state);
        expect(unchangedB.snapshot).toEqual(beforeB.snapshot);
        expect(unchangedB.routes).toEqual(beforeB.routes);
        expect(unchangedB.receipts).toEqual(beforeB.receipts);
        expect(unchangedB.companyReceipts).toEqual(beforeB.companyReceipts);
        expect(unchangedB.events).toEqual(beforeB.events);

        const departedA = await actorA.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actorA.ownerHeaders,
          payload: departureRequest(actorA, randomUUID()),
        });
        const departedB = await actorB.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actorB.ownerHeaders,
          payload: departureRequest(actorB, randomUUID()),
        });
        expect(departedA.statusCode).toBe(200);
        expect(departedB.statusCode).toBe(200);
        expect(departedA.json().publicRevision).toBe(departedB.json().publicRevision);
        const beforeArrivalA = await inspectCompany(db, actorA);
        const beforeArrivalB = await inspectCompany(db, actorB);
        const beforeArrivalClockA = await clockRowsFor(db, actorA);
        const beforeArrivalClockB = await clockRowsFor(db, actorB);
        const foreignArrival = await actorB.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: {
            ...actorB.ownerHeaders,
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: actorA.companyId,
          },
          payload: arrivalRequest(actorA, departedA.json(), randomUUID()),
        });
        expect(foreignArrival.statusCode).toBe(403);
        expect(foreignArrival.json()).toMatchObject({
          ok: false,
          code: 'NOT_AUTHORIZED',
          publicRevision: '0',
        });
        expect(JSON.stringify(foreignArrival.json())).not.toContain(actorA.companyId);
        expect(JSON.stringify(foreignArrival.json())).not.toContain(actorB.companyId);
        expect(await clockRowsFor(db, actorA)).toEqual(beforeArrivalClockA);
        expect(await clockRowsFor(db, actorB)).toEqual(beforeArrivalClockB);
        const afterArrivalA = await inspectCompany(db, actorA);
        const afterArrivalB = await inspectCompany(db, actorB);
        expect(afterArrivalA.state).toEqual(beforeArrivalA.state);
        expect(afterArrivalA.snapshot).toEqual(beforeArrivalA.snapshot);
        expect(afterArrivalA.routes).toEqual(beforeArrivalA.routes);
        expect(afterArrivalA.receipts).toEqual(beforeArrivalA.receipts);
        expect(afterArrivalA.companyReceipts).toEqual(beforeArrivalA.companyReceipts);
        expect(afterArrivalA.events).toEqual(beforeArrivalA.events);
        expect(afterArrivalB.state).toEqual(beforeArrivalB.state);
        expect(afterArrivalB.snapshot).toEqual(beforeArrivalB.snapshot);
        expect(afterArrivalB.routes).toEqual(beforeArrivalB.routes);
        expect(afterArrivalB.receipts).toEqual(beforeArrivalB.receipts);
        expect(afterArrivalB.companyReceipts).toEqual(beforeArrivalB.companyReceipts);
        expect(afterArrivalB.events).toEqual(beforeArrivalB.events);
      } finally {
        await cleanupSyntheticCompany(db, actorA);
        await cleanupSyntheticCompany(db, actorB);
      }
    },
  );

  it.skipIf(database === undefined)(
    'rejects travel-time advancement while a learning task is active without partial mutation',
    async () => {
      const db = requireDatabase();
      const actor = makeSyntheticCompany(db);
      try {
        await seedSyntheticCompany(db, actor);
        const lifecycle = actor.initial.economy.lifecycle;
        const characterId = actor.memberIds[0];
        if (!characterId) throw new Error('Travel fixture has no party member');
        const command = parseCompanyCommand({
          schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
          commandId: randomUUID(),
          sourceEventId: randomUUID(),
          worldId: actor.worldId,
          companyId: actor.companyId,
          actorRef: { kind: 'PLAYER', id: actor.accountId },
          expectedRevision: lifecycle.knowledge.revision,
          campaignTick: lifecycle.campaignTick,
          rulesetId: COMPANY_RULESET_ID,
          type: 'StartLearning',
          payload: {
            characterId,
            methodId: 'book-study',
            goal: { workId: 'wound-care-basics', maxTicks: '10' },
            resourceIds: ['travel-learning-book'],
            budgetPoolId: 'local',
            maxBudgetQ: '0',
          },
        });
        if (!command.ok || command.command.type !== 'StartLearning')
          throw new Error('Could not construct active learning fixture');
        const learning = startLearningTask(createLearningTaskState(), {
          taskId: randomUUID(),
          command: command.command,
          quote: {
            sourceId: 'travel-learning-source',
            sourceVersion: 'travel-learning-v1',
            maxTicks: '10',
            mentorId: null,
            funding: null,
            coefficients: evaluatePerkEffects(
              {
                lifecycle,
                finance: actor.initial.economy.finance,
                physical: actor.initial.economy.physical!,
              },
              { kind: 'CHARACTER', characterId, task: 'STUDY' },
            ),
          },
        });
        const activeLearningState = readCompanyCombatAggregateState({
          ...actor.initial,
          learning: { ...actor.initial.learning, tasks: learning.state },
        });
        await db
          .updateTable('company_snapshots')
          .set({ state: activeLearningState })
          .where('world_id', '=', actor.worldId)
          .where('company_id', '=', actor.companyId)
          .executeTakeFirstOrThrow();
        for (const elapsedTicks of [0, 1]) {
          await setWorldClock(db, actor, elapsedTicks);
          const before = await inspectCompany(db, actor);
          const beforeClock = await clockRowsFor(db, actor);
          expect(before.state).toEqual(activeLearningState);

          if (elapsedTicks === 1) {
            const party = await actor.app.inject({
              method: 'GET',
              url: '/world/party',
              headers: actor.ownerHeaders,
            });
            expect(party.statusCode).toBe(200);
            expect(party.json()).toMatchObject({ availableDepartures: [] });

            const preview = await actor.app.inject({
              method: 'POST',
              url: '/world/travel/preview',
              headers: actor.ownerHeaders,
              payload: {
                schemaVersion: 1,
                purpose: 'NEW',
                edgeIds: ['kamenny-brod-severny-dvor'],
              },
            });
            expect(preview.statusCode).toBe(409);
          }

          const response = await actor.app.inject({
            method: 'POST',
            url: '/world/travel',
            headers: actor.ownerHeaders,
            payload: departureRequest(actor, randomUUID()),
          });
          expect(response.statusCode).toBe(409);
          expect(response.json()).toMatchObject({ ok: false, code: 'UNSUPPORTED_ACTION' });
          const after = await inspectCompany(db, actor);
          expect(after.state).toEqual(before.state);
          expect(after.snapshot).toEqual(before.snapshot);
          expect(after.routes).toEqual(before.routes);
          expect(after.receipts).toEqual(before.receipts);
          expect(after.events).toEqual(before.events);
          expect(await clockRowsFor(db, actor)).toEqual(beforeClock);
        }
      } finally {
        await cleanupSyntheticCompany(db, actor);
      }
    },
  );

  it.skipIf(database === undefined)(
    'late arrival matches the durable ration and stamina outcome of on-time settlement',
    async () => {
      const db = requireDatabase();
      const actor = makeSyntheticCompany(db);
      const onTimeActor = makeSyntheticCompany(db);
      try {
        await seedSyntheticCompany(db, actor);
        await seedSyntheticCompany(db, onTimeActor);
        const initialPhysical = physicalOutcome(actor.initial);
        const initialPhysicalState = actor.initial.economy.physical;
        if (!initialPhysicalState) throw new Error('Travel fixture physical state missing');
        const departed = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: departureRequest(actor, randomUUID()),
        });
        expect(departed.statusCode, departed.body).toBe(200);
        const onTimeDeparture = await onTimeActor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: onTimeActor.ownerHeaders,
          payload: departureRequest(onTimeActor, randomUUID()),
        });
        expect(onTimeDeparture.statusCode, onTimeDeparture.body).toBe(200);
        await setWorldClock(db, actor, 15);
        await setWorldClock(db, onTimeActor, 10);
        const arrival = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: arrivalRequest(actor, departed.json(), randomUUID()),
        });
        expect(arrival.statusCode, arrival.body).toBe(200);
        const onTimeArrival = await onTimeActor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: onTimeActor.ownerHeaders,
          payload: arrivalRequest(onTimeActor, onTimeDeparture.json(), randomUUID()),
        });
        expect(onTimeArrival.statusCode, onTimeArrival.body).toBe(200);
        expect(arrival.json()).toMatchObject({
          worldTick: '1015',
          party: { location: 'kamenny-brod' },
          route: null,
        });
        const stored = await inspectCompany(db, actor);
        expect(stored.state?.economy.lifecycle.campaignTick).toBe('1010');
        expect(stored.state?.economy.finance.processedTick).toBe('1010');
        expect(stored.state?.economy.physical?.processedTick).toBe('1010');
        expect(
          stored.state?.economy.physical?.food.every((entry) => BigInt(entry.toTick) <= 1010n),
        ).toBe(true);
        const persistedPhysical = stored.state?.economy.physical;
        if (!persistedPhysical) throw new Error('Settled company physical state is missing');
        const departedRoute = departed.json().route as { startedAt: string; dueTick: string };
        const tripTicks = BigInt(departedRoute.dueTick) - BigInt(departedRoute.startedAt);
        expect(tripTicks).toBe(BigInt(TRAVEL_RULES.staminaEveryTicks));

        const partyMemberships = actor.initial.economy.lifecycle.memberships
          .filter((membership) => actor.memberIds.includes(membership.characterId))
          .toSorted((left, right) => left.membershipId.localeCompare(right.membershipId));
        expect(partyMemberships).toHaveLength(actor.memberIds.length);
        const startingVitals = new Map(
          initialPhysicalState.vitals.map((vital) => [vital.characterId, vital.currentStamina]),
        );
        expect(
          persistedPhysical.vitals
            .filter((vital) => actor.memberIds.includes(vital.characterId))
            .map((vital) => ({
              characterId: vital.characterId,
              currentStamina: vital.currentStamina,
            }))
            .toSorted((left, right) => left.characterId.localeCompare(right.characterId)),
        ).toEqual(
          actor.memberIds.toSorted().map((characterId) => ({
            characterId,
            currentStamina: startingVitals.get(characterId)! - TRAVEL_RULES.staminaPerMember,
          })),
        );

        const membershipIds = new Set<string>(
          partyMemberships.map((membership) => membership.membershipId),
        );
        const initialCarry = new Map(
          initialPhysicalState.foodCarry.map((entry) => [entry.membershipId, entry.tickUnits]),
        );
        expect(
          partyMemberships.every(
            (membership) => (initialCarry.get(membership.membershipId) ?? '0') === '0',
          ),
        ).toBe(true);
        const foodDemand = (
          tripTicks * BigInt(COMPANY_RULES.economy.foodUnitsPerPersonDay)
        ).toString();
        expect(
          persistedPhysical.foodCarry
            .filter((entry) => membershipIds.has(entry.membershipId))
            .map(({ membershipId, tickUnits }) => ({ membershipId, tickUnits }))
            .toSorted((left, right) => left.membershipId.localeCompare(right.membershipId)),
        ).toEqual(
          partyMemberships.map(({ membershipId }) => ({ membershipId, tickUnits: foodDemand })),
        );
        expect(
          persistedPhysical.food
            .filter(
              (entry) =>
                membershipIds.has(entry.membershipId) &&
                entry.fromTick === departedRoute.startedAt &&
                entry.toTick === departedRoute.dueTick,
            )
            .map(({ channel, membershipId, unitsConsumed }) => ({
              channel,
              membershipId,
              unitsConsumed,
            }))
            .toSorted((left, right) => left.membershipId.localeCompare(right.membershipId)),
        ).toEqual(
          partyMemberships.map(({ membershipId }) => ({
            channel: 'STOCK',
            membershipId,
            unitsConsumed: '1',
          })),
        );
        const lateOutcome = physicalOutcome(stored.state!);
        expect(lateOutcome.rationQuantity).toBe(
          initialPhysical.rationQuantity - partyMemberships.length,
        );
        const onTimeStored = await inspectCompany(db, onTimeActor);
        if (!onTimeStored.state) throw new Error('On-time company snapshot is missing');
        const onTimeOutcome = physicalOutcome(onTimeStored.state);
        expect(lateOutcome).toEqual(onTimeOutcome);
        expect(lateOutcome.rationQuantity).toBeLessThan(initialPhysical.rationQuantity);
        expect(lateOutcome.stamina).not.toEqual(initialPhysical.stamina);
        expect(lateOutcome).toMatchObject({
          foodIntervals: expect.arrayContaining([['1000', '1010']]),
        });

        const advancedReturn = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: {
            schemaVersion: 1,
            commandId: randomUUID(),
            expectedPublicRevision: arrival.json().publicRevision,
            expectedRouteEpoch: arrival.json().party.routeEpoch,
            action: {
              kind: 'DEPART',
              purpose: 'RETURN',
              edgeIds: ['kamenny-brod-severny-dvor'],
            },
          },
        });
        expect(advancedReturn.statusCode).toBe(200);
        expect(advancedReturn.json()).toMatchObject({
          worldTick: '1015',
          route: { startedAt: '1015', dueTick: '1025' },
        });
        const afterAdvancedReturn = await inspectCompany(db, actor);
        expect(afterAdvancedReturn.state?.economy.lifecycle.campaignTick).toBe('1015');
        expect(afterAdvancedReturn.state?.economy.finance.processedTick).toBe('1015');
        expect(afterAdvancedReturn.state?.economy.physical?.processedTick).toBe('1015');
        expect(afterAdvancedReturn.routes).toHaveLength(1);
        expect(afterAdvancedReturn.receipts).toHaveLength(3);
        expect(afterAdvancedReturn.companyReceipts).toHaveLength(3);
      } finally {
        await Promise.all([
          cleanupSyntheticCompany(db, actor),
          cleanupSyntheticCompany(db, onTimeActor),
        ]);
      }
    },
  );

  it.skipIf(database === undefined)(
    'serializes rollback against route receipts and preserves all campaign clock rows on down/up',
    async () => {
      const db = requireDatabase();
      if (connectionString === undefined) throw new Error('World travel test database missing');
      const actor = makeSyntheticCompany(db);
      const writer = new Client({
        connectionString,
        application_name: 'warwrit-travel-rollback-race-writer',
      });
      const rollback = new Client({
        connectionString,
        application_name: 'warwrit-travel-rollback-race-down',
      });
      let writerInTransaction = false;
      let rollbackAttempt:
        Promise<{ readonly error: { readonly code?: string } | null }> | undefined;
      let restoreMigrationsNeeded = false;
      let fixtureCleaned = false;

      try {
        await seedSyntheticCompany(db, actor);
        await Promise.all([writer.connect(), rollback.connect()]);
        await writer.query('begin');
        writerInTransaction = true;
        const writerPid = Number(
          (await writer.query('select pg_backend_pid() as pid')).rows[0]?.pid,
        );
        const segmentId = randomUUID();
        const commandId = randomUUID();
        await writer.query(
          `insert into public.world_party_routes (
             world_id, company_id, party_id, route_epoch, segment_id,
             profile_id, region_version, status, accepted_route
           ) values ($1, $2, $3, '1', $4, 'safe-travel-alpha-v1', 'fixture', 'IN_TRANSIT', $5::jsonb)`,
          [
            actor.worldId,
            actor.companyId,
            actor.partyId,
            segmentId,
            JSON.stringify({ kind: 'race' }),
          ],
        );
        await writer.query(
          `insert into public.world_route_receipts (
             world_id, company_id, command_id, account_id, request_key, response,
             resulting_public_revision
           ) values ($1, $2, $3, $4, 'race-request', '{"ok":true}'::jsonb, '1')`,
          [actor.worldId, actor.companyId, commandId, actor.accountId],
        );

        rollbackAttempt = rollback.query(worldTravelDownSql).then(
          () => ({ error: null }),
          (error: { readonly code?: string }) => ({ error }),
        );
        let blockedByWriter = false;
        for (let attempt = 0; attempt < 100; attempt += 1) {
          const activity = await writer.query<{
            readonly wait_event_type: string | null;
            readonly blocking_pids: number[];
          }>(
            `select wait_event_type, pg_blocking_pids(pid) as blocking_pids
               from pg_stat_activity
              where application_name = $1`,
            ['warwrit-travel-rollback-race-down'],
          );
          const downSession = activity.rows[0];
          if (
            downSession?.wait_event_type === 'Lock' &&
            downSession.blocking_pids.includes(writerPid)
          ) {
            blockedByWriter = true;
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        expect(blockedByWriter).toBe(true);
        await writer.query('commit');
        writerInTransaction = false;
        const rejectedDown = await rollbackAttempt;
        expect(rejectedDown.error?.code).toBe('55000');
        expect(
          (
            await rollback.query<{
              readonly route_table: string | null;
              readonly receipt_table: string | null;
            }>(
              `select to_regclass('public.world_party_routes')::text as route_table,
                      to_regclass('public.world_route_receipts')::text as receipt_table`,
            )
          ).rows[0],
        ).toEqual({ route_table: 'world_party_routes', receipt_table: 'world_route_receipts' });
        expect(
          (
            await rollback.query(
              `select world_id, company_id, party_id, segment_id
                 from public.world_party_routes
                where world_id = $1 and company_id = $2 and party_id = $3`,
              [actor.worldId, actor.companyId, actor.partyId],
            )
          ).rows,
        ).toEqual([
          {
            world_id: actor.worldId,
            company_id: actor.companyId,
            party_id: actor.partyId,
            segment_id: segmentId,
          },
        ]);
        expect(
          (
            await rollback.query(
              `select world_id, company_id, command_id, account_id
                 from public.world_route_receipts
                where world_id = $1 and company_id = $2 and command_id = $3`,
              [actor.worldId, actor.companyId, commandId],
            )
          ).rows,
        ).toEqual([
          {
            world_id: actor.worldId,
            company_id: actor.companyId,
            command_id: commandId,
            account_id: actor.accountId,
          },
        ]);

        await cleanupSyntheticCompany(db, actor);
        fixtureCleaned = true;
        const emptyTravelTables = await rollback.query<{
          readonly routes: number;
          readonly receipts: number;
        }>(
          `select (select count(*)::int from public.world_party_routes) as routes,
                  (select count(*)::int from public.world_route_receipts) as receipts`,
        );
        expect(emptyTravelTables.rows[0]).toEqual({ routes: 0, receipts: 0 });
        const clocksBefore = await readClockRows(rollback);
        const migrationSuffix = [
          '0008_world_travel',
          '0009_encounter_admission_sources',
          '0010_first_hunt_runtime',
        ] as const;
        const beforeDown = await runMigrations(rollback, 'status');
        expect(beforeDown.applied.slice(-migrationSuffix.length)).toEqual(migrationSuffix);
        for (const migrationName of [...migrationSuffix].reverse()) {
          const down = await runMigrations(rollback, 'down');
          if (down.applied.length > 0) restoreMigrationsNeeded = true;
          expect(down.applied).toEqual([migrationName]);
        }
        const afterDown = await runMigrations(rollback, 'status');
        for (const migrationName of migrationSuffix)
          expect(afterDown.applied).not.toContain(migrationName);
        expect(
          (
            await rollback.query<{ readonly live: string | null; readonly backup: string | null }>(
              `select to_regclass('public.world_campaign_clocks')::text as live,
                      to_regclass('public.world_campaign_clocks_0008_backup')::text as backup`,
            )
          ).rows[0],
        ).toEqual({ live: null, backup: 'world_campaign_clocks_0008_backup' });
        const up = await runMigrations(rollback, 'up');
        expect(up.applied).toEqual(migrationSuffix);
        expect((await runMigrations(rollback, 'status')).applied.slice(-3)).toEqual(
          migrationSuffix,
        );
        restoreMigrationsNeeded = false;
        expect(await readClockRows(rollback)).toBe(clocksBefore);
        expect(
          (
            await rollback.query<{ readonly backup: string | null }>(
              `select to_regclass($1)::text as backup`,
              ['public.world_campaign_clocks_0008_backup'],
            )
          ).rows[0]?.backup,
        ).toBeNull();

        await rollback.query('begin');
        let freshInstallTransaction = true;
        try {
          await rollback.query(
            `lock table public.world_campaign_clocks,
              public.world_party_routes,
              public.world_route_receipts in access exclusive mode`,
          );
          await rollback.query(
            'alter table public.world_campaign_clocks rename to world_campaign_clocks_test_hold',
          );
          await rollback.query('drop table public.world_route_receipts');
          await rollback.query('drop table public.world_party_routes');
          await rollback.query(worldTravelUpSql);
          const freshClock = await rollback.query<{
            readonly world_id: string;
            readonly epoch_ms: string;
            readonly starting_tick: string;
          }>(
            `select world_id, epoch_ms, starting_tick
               from public.world_campaign_clocks
              order by world_id`,
          );
          expect(freshClock.rows).toHaveLength(1);
          expect(freshClock.rows[0]).toMatchObject({ world_id: 'main', starting_tick: '0' });
          expect(freshClock.rows[0]?.epoch_ms).toMatch(/^(0|[1-9][0-9]*)$/);
          await rollback.query('rollback');
          freshInstallTransaction = false;
        } finally {
          if (freshInstallTransaction) await rollback.query('rollback');
        }
        expect(await readClockRows(rollback)).toBe(clocksBefore);
      } finally {
        if (writerInTransaction) await writer.query('rollback');
        if (rollbackAttempt) {
          const result = await rollbackAttempt;
          if (result.error === null) await rollback.query(worldTravelUpSql);
        }
        if (restoreMigrationsNeeded) await runMigrations(rollback, 'up');
        await Promise.allSettled([writer.end(), rollback.end()]);
        if (!fixtureCleaned) await cleanupSyntheticCompany(db, actor);
      }
    },
  );

  it.skipIf(database === undefined)(
    'settles exact stationary food demand before departure and carries its ration remainder through transit',
    async () => {
      const db = requireDatabase();
      const actor = makeSyntheticCompany(db);
      try {
        await seedSyntheticCompany(db, actor);
        await setWorldClock(db, actor, 1);
        const departed = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: departureRequest(actor, randomUUID()),
        });
        expect(departed.statusCode, departed.body).toBe(200);
        expect(departed.json()).toMatchObject({
          worldTick: '1001',
          route: { startedAt: '1001', dueTick: '1011' },
        });

        const departedState = (await inspectCompany(db, actor)).state;
        if (!departedState?.economy.physical) throw new Error('Departure food state is missing');
        const memberships = actor.initial.economy.lifecycle.memberships
          .filter((membership) => actor.memberIds.includes(membership.characterId))
          .toSorted((left, right) => left.membershipId.localeCompare(right.membershipId));
        expect(
          departedState.economy.physical.food
            .filter((entry) => entry.fromTick === '1000' && entry.toTick === '1001')
            .map(({ channel, membershipId, unitsConsumed }) => ({
              channel,
              membershipId,
              unitsConsumed,
            }))
            .toSorted((left, right) => left.membershipId.localeCompare(right.membershipId)),
        ).toEqual(
          memberships.map(({ membershipId }) => ({
            channel: 'STOCK',
            membershipId,
            unitsConsumed: '1',
          })),
        );

        await setWorldClock(db, actor, 11);
        const arrived = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: arrivalRequest(actor, departed.json(), randomUUID()),
        });
        expect(arrived.statusCode, arrived.body).toBe(200);
        const final = await inspectCompany(db, actor);
        const physical = final.state?.economy.physical;
        if (!physical) throw new Error('Arrival food state is missing');
        expect(physical.processedTick).toBe('1011');
        expect(
          physical.food
            .filter((entry) => entry.fromTick === '1001' && entry.toTick === '1011')
            .map(({ channel, membershipId, unitsConsumed }) => ({
              channel,
              membershipId,
              unitsConsumed,
            }))
            .toSorted((left, right) => left.membershipId.localeCompare(right.membershipId)),
        ).toEqual(
          memberships.map(({ membershipId }) => ({
            channel: 'STOCK',
            membershipId,
            unitsConsumed: '0',
          })),
        );
        expect(
          physical.foodCarry
            .filter((entry) =>
              memberships.some((member) => member.membershipId === entry.membershipId),
            )
            .map(({ membershipId, tickUnits }) => ({ membershipId, tickUnits }))
            .toSorted((left, right) => left.membershipId.localeCompare(right.membershipId)),
        ).toEqual(memberships.map(({ membershipId }) => ({ membershipId, tickUnits: '11' })));
        expect(physicalOutcome(final.state!).rationQuantity).toBe(
          physicalOutcome(actor.initial).rationQuantity - memberships.length,
        );
      } finally {
        await cleanupSyntheticCompany(db, actor);
      }
    },
  );

  it.skipIf(database === undefined)(
    'keeps derived travel IDs valid for maximum-length command IDs and preserves receipt conflicts',
    async () => {
      const db = requireDatabase();
      for (const commandIdLength of [165, 256]) {
        const actor = makeSyntheticCompany(db);
        try {
          await seedSyntheticCompany(db, actor);
          await setWorldClock(db, actor, 1);
          const commandId = 'x'.repeat(commandIdLength);
          const request = departureRequest(actor, commandId);
          const accepted = await actor.app.inject({
            method: 'POST',
            url: '/world/travel',
            headers: actor.ownerHeaders,
            payload: request,
          });
          expect(accepted.statusCode, accepted.body).toBe(200);
          expect(accepted.json()).toMatchObject({
            commandId,
            route: { edgeIds: ['kamenny-brod-severny-dvor'] },
          });

          const acceptedState = await inspectCompany(db, actor);
          const replay = await actor.app.inject({
            method: 'POST',
            url: '/world/travel',
            headers: actor.ownerHeaders,
            payload: request,
          });
          expect(replay.statusCode, replay.body).toBe(200);
          expect(replay.body).toBe(accepted.body);

          const changedBody = await actor.app.inject({
            method: 'POST',
            url: '/world/travel',
            headers: actor.ownerHeaders,
            payload: { ...request, expectedPublicRevision: '9999' },
          });
          expect(changedBody.statusCode).toBe(400);
          expect(changedBody.json()).toMatchObject({ ok: false, code: 'INVALID_COMMAND' });
          expect(await inspectCompany(db, actor)).toEqual(acceptedState);
        } finally {
          await cleanupSyntheticCompany(db, actor);
        }
      }
    },
  );

  it.skipIf(database === undefined)(
    'persists a V2 itinerary through offline boundary continuation and completion',
    async () => {
      const db = requireDatabase();
      const actor = makeSyntheticCompany(db);
      try {
        await seedSyntheticCompany(db, actor);
        await setWorldClock(db, actor, 1);
        const request = {
          schemaVersion: 2,
          commandId: randomUUID(),
          expectedPublicRevision: actor.initial.economy.lifecycle.knowledge.revision,
          expectedRouteEpoch: '0',
          purpose: 'NEW',
          edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
        } as const;
        const departed = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: request,
        });
        expect(departed.statusCode, departed.body).toBe(200);
        const departureBody = departed.json();
        expect(departureBody).toMatchObject({
          schemaVersion: 2,
          commandId: request.commandId,
          availableDepartures: [],
          execution: { phase: 'IN_TRANSIT', nextEdgeIndex: 0, edgeIds: request.edgeIds },
        });
        expect(Object.keys(departureBody).toSorted()).toEqual([
          'availableDepartures',
          'commandId',
          'execution',
          'party',
          'publicRevision',
          'schemaVersion',
          'worldTick',
        ]);
        expect(Object.keys(departureBody.execution).toSorted()).toEqual([
          'activeSegment',
          'currentSiteId',
          'edgeIds',
          'nextEdgeIndex',
          'phase',
          'purpose',
          'regionVersion',
          'routeExecutionId',
        ]);
        expect(departed.body).not.toContain(actor.accountId);
        const activeRead = await actor.app.inject({
          method: 'GET',
          url: '/world/party',
          headers: actor.ownerHeaders,
        });
        expect(activeRead.statusCode).toBe(200);
        expect(activeRead.json()).toMatchObject({
          schemaVersion: 2,
          party: { partyId: actor.partyId, location: 'severny-dvor', routeEpoch: '1' },
          availableDepartures: [],
          execution: {
            routeExecutionId: departureBody.execution.routeExecutionId,
            phase: 'IN_TRANSIT',
            nextEdgeIndex: 0,
            activeSegment: { dueTick: '1011' },
          },
        });
        expect(Object.keys(activeRead.json()).toSorted()).toEqual([
          'availableDepartures',
          'execution',
          'party',
          'publicRevision',
          'schemaVersion',
          'worldTick',
        ]);
        expect(Object.keys(activeRead.json().execution).toSorted()).toEqual([
          'activeSegment',
          'currentSiteId',
          'edgeIds',
          'nextEdgeIndex',
          'phase',
          'purpose',
          'regionVersion',
          'routeExecutionId',
        ]);
        expect(activeRead.body).not.toContain(actor.accountId);
        const departedStored = await inspectCompany(db, actor);
        if (!departedStored.state) throw new Error('Departed company state is unavailable');
        const acceptedExecution = departedStored.routes[0]?.accepted_route as {
          execution: {
            routeExecutionId: string;
            routeEpoch: string;
            regionVersion: string;
            nextEdgeIndex: number;
            segment: { segmentId: string; dueTick: string };
          };
        };

        const replay = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: request,
        });
        expect(replay.body).toBe(departed.body);

        const changedPartyState = readCompanyCombatAggregateState({
          ...departedStored.state,
          economy: {
            ...departedStored.state.economy,
            lifecycle: {
              ...departedStored.state.economy.lifecycle,
              parties: [
                ...departedStored.state.economy.lifecycle.parties,
                {
                  partyId: randomUUID(),
                  location: departedStored.state.economy.lifecycle.parties[0]!.location,
                },
              ],
            },
          },
        });
        await db
          .updateTable('company_snapshots')
          .set({ state: changedPartyState })
          .where('world_id', '=', actor.worldId)
          .where('company_id', '=', actor.companyId)
          .executeTakeFirstOrThrow();
        const replayAfterPartyChange = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: request,
        });
        expect(replayAfterPartyChange.body).toBe(departed.body);
        await db
          .updateTable('company_snapshots')
          .set({ state: departedStored.state })
          .where('world_id', '=', actor.worldId)
          .where('company_id', '=', actor.companyId)
          .executeTakeFirstOrThrow();

        const legacyArrival = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: {
            schemaVersion: 1,
            commandId: randomUUID(),
            expectedPublicRevision: departureBody.publicRevision,
            expectedRouteEpoch: departureBody.party.routeEpoch,
            action: { kind: 'ARRIVE' },
          },
        });
        expect(legacyArrival.statusCode).toBe(409);
        expect(legacyArrival.json()).toMatchObject({ ok: false, code: 'INVALID_ROUTE' });

        await setWorldClock(db, actor, 11);
        await processWorldRouteCandidate(db, actor.worldId, {
          companyId: actor.companyId,
          partyId: actor.partyId,
          acceptedByAccountId: actor.accountId,
        });
        const boundaryRead = await actor.app.inject({
          method: 'GET',
          url: '/world/party',
          headers: actor.ownerHeaders,
        });
        expect(boundaryRead.statusCode).toBe(200);
        expect(boundaryRead.json()).toMatchObject({
          schemaVersion: 2,
          execution: {
            phase: 'AT_BOUNDARY',
            nextEdgeIndex: 1,
            currentSiteId: 'kamenny-brod',
            activeSegment: null,
          },
        });
        const boundaryStored = await inspectCompany(db, actor);
        const boundaryRoute = boundaryStored.routes[0];
        if (!boundaryRoute) throw new Error('Settled world route is missing');
        const beforeBoundaryPreview = {
          company: boundaryStored,
          worldClock: await clockRowsFor(db, actor),
        };
        const boundaryDeparture = {
          schemaVersion: 2,
          commandId: randomUUID(),
          expectedPublicRevision: boundaryRead.json().publicRevision,
          expectedRouteEpoch: '1',
          purpose: 'NEW',
          edgeIds: ['kamenny-brod-severny-dvor'],
        } as const;
        const boundarySubmit = await actor.app.inject({
          method: 'POST',
          url: '/world/travel',
          headers: actor.ownerHeaders,
          payload: boundaryDeparture,
        });
        expect(boundarySubmit.statusCode).toBe(409);
        expect(boundarySubmit.json()).toMatchObject({ ok: false, code: 'INVALID_ROUTE' });
        const boundaryPreview = await actor.app.inject({
          method: 'POST',
          url: '/world/travel/preview',
          headers: actor.ownerHeaders,
          payload: {
            schemaVersion: 1,
            purpose: 'NEW',
            edgeIds: boundaryDeparture.edgeIds,
          },
        });
        expect(boundaryPreview.statusCode).toBe(409);
        expect({
          company: await inspectCompany(db, actor),
          worldClock: await clockRowsFor(db, actor),
        }).toEqual(beforeBoundaryPreview);
        const acceptedBoundaryRoute = boundaryRoute.accepted_route as {
          acceptedByAccountId: string;
          execution: Record<string, unknown>;
        };
        const malformedBoundaryRoute = {
          ...acceptedBoundaryRoute,
          execution: { ...acceptedBoundaryRoute.execution, schemaVersion: 3 },
        };
        await db
          .updateTable('world_party_routes')
          .set({ accepted_route: malformedBoundaryRoute })
          .where('world_id', '=', actor.worldId)
          .where('company_id', '=', actor.companyId)
          .where('party_id', '=', actor.partyId)
          .executeTakeFirstOrThrow();
        const malformedStored = await inspectCompany(db, actor);
        const malformedRead = await actor.app.inject({
          method: 'GET',
          url: '/world/party',
          headers: actor.ownerHeaders,
        });
        expect(malformedRead.statusCode).toBe(409);
        expect(malformedRead.json()).toMatchObject({ ok: false, code: 'INVALID_ROUTE' });
        expect(malformedRead.body).not.toContain(actor.accountId);
        expect(malformedRead.body).not.toContain(actor.companyId);

        for (const purpose of ['RETURN', 'NEW'] as const) {
          const rejectedDeparture = await actor.app.inject({
            method: 'POST',
            url: '/world/travel',
            headers: actor.ownerHeaders,
            payload: {
              schemaVersion: 1,
              commandId: randomUUID(),
              expectedPublicRevision: boundaryRead.json().publicRevision,
              expectedRouteEpoch: '1',
              action: { kind: 'DEPART', purpose, edgeIds: ['kamenny-brod-severny-dvor'] },
            },
          });
          expect(rejectedDeparture.statusCode).toBe(409);
          expect(rejectedDeparture.json()).toMatchObject({ ok: false, code: 'INVALID_ROUTE' });
          expect(rejectedDeparture.body).not.toContain(actor.accountId);
          expect(rejectedDeparture.body).not.toContain(actor.companyId);
          const afterRejectedDeparture = await inspectCompany(db, actor);
          expect(afterRejectedDeparture.state).toEqual(malformedStored.state);
          expect(afterRejectedDeparture.snapshot).toEqual(malformedStored.snapshot);
          expect(afterRejectedDeparture.routes).toEqual(malformedStored.routes);
          expect(afterRejectedDeparture.receipts).toEqual(malformedStored.receipts);
          expect(afterRejectedDeparture.companyReceipts).toEqual(malformedStored.companyReceipts);
          expect(afterRejectedDeparture.events).toEqual(malformedStored.events);
        }
        await db
          .updateTable('world_party_routes')
          .set({ accepted_route: acceptedBoundaryRoute })
          .where('world_id', '=', actor.worldId)
          .where('company_id', '=', actor.companyId)
          .where('party_id', '=', actor.partyId)
          .executeTakeFirstOrThrow();

        const firstWorkerErrors: unknown[] = [];
        const competingWorkerErrors: unknown[] = [];
        const stopFirstWorker = startWorldRouteWorker(
          db,
          actor.worldId,
          (error) => firstWorkerErrors.push(error),
          10,
        );
        const stopCompetingWorker = startWorldRouteWorker(
          db,
          actor.worldId,
          (error) => competingWorkerErrors.push(error),
          10,
        );
        try {
          await waitForRouteState(
            db,
            actor,
            (execution) => execution.phase === 'IN_TRANSIT' && execution.nextEdgeIndex === 1,
          );
        } finally {
          await Promise.all([stopFirstWorker(), stopCompetingWorker()]);
        }
        expect(firstWorkerErrors).toEqual([]);
        expect(competingWorkerErrors).toEqual([]);
        const continued = await inspectCompany(db, actor);
        const continuedEnvelope = continued.routes[0]?.accepted_route as {
          execution: { phase: string; nextEdgeIndex: number; segment: { dueTick: string } };
        };
        expect(continuedEnvelope.execution).toMatchObject({
          phase: 'IN_TRANSIT',
          nextEdgeIndex: 1,
          segment: { dueTick: '1019' },
        });
        const continuedRead = await actor.app.inject({
          method: 'GET',
          url: '/world/party',
          headers: actor.ownerHeaders,
        });
        expect(continuedRead.json()).toMatchObject({
          schemaVersion: 2,
          execution: { phase: 'IN_TRANSIT', nextEdgeIndex: 1 },
        });
        const systemRequests = continued.receipts
          .filter((receipt) => receipt.command_id !== request.commandId)
          .map((receipt) => JSON.parse(receipt.request_key) as Record<string, unknown>);
        expect(systemRequests.map((entry) => entry['kind']).toSorted()).toEqual([
          'ROUTE_ARRIVAL',
          'ROUTE_CONTINUATION',
        ]);
        expect(systemRequests.map(({ kind, principal }) => ({ kind, principal }))).toEqual([
          { kind: 'ROUTE_ARRIVAL', principal: { kind: 'SYSTEM', id: 'world-travel' } },
          { kind: 'ROUTE_CONTINUATION', principal: { kind: 'SYSTEM', id: 'world-travel' } },
        ]);
        expect(systemRequests.find((entry) => entry['kind'] === 'ROUTE_ARRIVAL')).toMatchObject({
          routeExecutionId: acceptedExecution.execution.routeExecutionId,
          routeEpoch: acceptedExecution.execution.routeEpoch,
          regionVersion: acceptedExecution.execution.regionVersion,
          nextEdgeIndex: acceptedExecution.execution.nextEdgeIndex,
          segmentId: acceptedExecution.execution.segment.segmentId,
          dueTick: acceptedExecution.execution.segment.dueTick,
        });

        await setWorldClock(db, actor, 111);
        const recoveryWorkerErrors: unknown[] = [];
        const stopRecoveryWorker = startWorldRouteWorker(
          db,
          actor.worldId,
          (error) => recoveryWorkerErrors.push(error),
          10,
        );
        try {
          await waitForRouteState(db, actor, (execution) => execution.phase === 'COMPLETE');
        } finally {
          await stopRecoveryWorker();
        }
        expect(recoveryWorkerErrors).toEqual([]);
        const completed = await inspectCompany(db, actor);
        const completedEnvelope = completed.routes[0]?.accepted_route as {
          execution: { phase: string; nextEdgeIndex: number; currentSiteId: string; segment: null };
        };
        expect(completedEnvelope.execution).toMatchObject({
          phase: 'COMPLETE',
          nextEdgeIndex: 2,
          currentSiteId: 'bereznyak',
          segment: null,
        });
        expect(completed.routes[0]?.status).toBe('ARRIVED');
        expect(completed.state?.economy.lifecycle.parties[0]?.location).toMatchObject({
          kind: 'AT',
          siteId: 'bereznyak',
        });
        expect(completed.receipts).toHaveLength(4);
        expect(completed.receipts.every((receipt) => receipt.account_id === actor.accountId)).toBe(
          true,
        );
        const completedRead = await actor.app.inject({
          method: 'GET',
          url: '/world/party',
          headers: actor.ownerHeaders,
        });
        expect(completedRead.json()).toMatchObject({
          schemaVersion: 1,
          party: { location: 'bereznyak', routeEpoch: '1' },
          availableDepartures: expect.arrayContaining([
            {
              purpose: 'NEW',
              edgeIds: ['kamenny-brod-bereznyak', 'kamenny-brod-tikhaya-gat'],
              fromSiteId: 'bereznyak',
              toSiteId: 'tikhaya-gat',
            },
          ]),
          route: null,
        });
      } finally {
        await cleanupSyntheticCompany(db, actor);
      }
    },
  );

  it.skipIf(database === undefined)(
    'rejects delayed departure for closed rations but ignores an empty carried container',
    async () => {
      const db = requireDatabase();
      for (const mode of ['CLOSED', 'EMPTY_CARRIED'] as const) {
        const actor = makeSyntheticCompany(db);
        try {
          await seedSyntheticCompany(db, actor);
          const physical = actor.initial.economy.physical;
          if (!physical) throw new Error('Travel fixture physical state missing');
          const rationContainer = physical.containers.find((container) =>
            physical.items.some(
              (item) =>
                item.containerId === container.containerId && item.definitionId === 'ration',
            ),
          );
          if (!rationContainer) throw new Error('Travel fixture ration container missing');
          const extraContainer = {
            ...rationContainer,
            containerId: randomUUID(),
            kind: 'CARRIED' as const,
            carrier: { kind: 'CHARACTER' as const, id: actor.memberIds[0]! },
          };
          const updatedContainers =
            mode === 'CLOSED'
              ? physical.containers.map((container) =>
                  container.containerId === rationContainer.containerId
                    ? {
                        ...container,
                        closed: {
                          sourceId: 'travel-food-test',
                          causeId: 'travel-food-test',
                          atTick: '1000' as const,
                        },
                      }
                    : container,
                )
              : [...physical.containers, extraContainer];
          const updatedState = readCompanyCombatAggregateState({
            ...actor.initial,
            economy: {
              ...actor.initial.economy,
              physical: {
                ...physical,
                containers: updatedContainers,
                knowledge: { ...physical.knowledge, containerSnapshots: updatedContainers },
              },
            },
          });
          await db
            .updateTable('company_snapshots')
            .set({ state: updatedState })
            .where('world_id', '=', actor.worldId)
            .where('company_id', '=', actor.companyId)
            .executeTakeFirstOrThrow();
          await setWorldClock(db, actor, 1);
          const before = await inspectCompany(db, actor);
          const response = await actor.app.inject({
            method: 'POST',
            url: '/world/travel',
            headers: actor.ownerHeaders,
            payload: departureRequest(actor, randomUUID()),
          });
          if (mode === 'CLOSED') {
            expect(response.statusCode).toBe(409);
            expect(response.json()).toMatchObject({ ok: false, code: 'INSUFFICIENT_ITEMS' });
            expect(await inspectCompany(db, actor)).toEqual(before);
          } else {
            expect(response.statusCode, response.body).toBe(200);
            expect(response.json()).toMatchObject({
              schemaVersion: 1,
              party: { routeEpoch: '1' },
              route: { routeEpoch: '1' },
            });
            expect(await inspectCompany(db, actor)).not.toEqual(before);
          }
        } finally {
          await cleanupSyntheticCompany(db, actor);
        }
      }
    },
  );
});

interface SyntheticCompany {
  readonly worldId: string;
  readonly companyId: string;
  readonly accountId: string;
  readonly foreignAccountId: string;
  readonly sessionToken: string;
  readonly foreignSessionToken: string;
  readonly partyId: string;
  readonly memberIds: readonly string[];
  readonly initial: CompanyCombatAggregateState;
  readonly ownerHeaders: {
    readonly cookie: string;
    readonly origin: string;
    readonly [WORLD_EXPECTED_COMPANY_ID_HEADER]: string;
  };
  readonly foreignHeaders: {
    readonly cookie: string;
    readonly origin: string;
    readonly [WORLD_EXPECTED_COMPANY_ID_HEADER]: string;
  };
  readonly app: ReturnType<typeof buildApp>;
}

function requireDatabase(): Kysely<DatabaseSchema> {
  if (!database || !connectionString) throw new Error('World travel test database missing');
  return database;
}

async function readClockRows(client: Client): Promise<string> {
  const result = await client.query<{ readonly clock_rows: string }>(
    `select coalesce(
       json_agg(
         json_build_array(
           world_id,
           epoch_ms,
           starting_tick,
           to_char(updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
         ) order by world_id
       ),
       '[]'::json
     )::text as clock_rows
       from public.world_campaign_clocks`,
  );
  const clockRows = result.rows[0]?.clock_rows;
  if (clockRows === undefined) throw new Error('World clock rows are unavailable');
  return clockRows;
}

async function clockRowsFor(db: Kysely<DatabaseSchema>, actor: SyntheticCompany) {
  return db
    .selectFrom('world_campaign_clocks')
    .selectAll()
    .where('world_id', '=', actor.worldId)
    .execute();
}

function makeSyntheticCompany(db: Kysely<DatabaseSchema>): SyntheticCompany {
  const worldId = randomUUID();
  const companyId = randomUUID();
  const accountId = randomUUID();
  const foreignAccountId = randomUUID();
  const sessionToken = randomUUID();
  const foreignSessionToken = randomUUID();
  const partyId = randomUUID();
  const base = createCompanyCombatAggregateFixture().state;
  const baseLifecycle = base.economy.lifecycle;
  const basePartyId = baseLifecycle.parties[0]?.partyId;
  if (basePartyId === undefined) throw new Error('Travel fixture party missing');
  const baseCharacters = baseLifecycle.characters;
  const members = baseCharacters
    .filter((character) => character.presence.fieldPartyId !== null)
    .map((character) => character.identity.characterId);
  const memberIds = members.map(() => randomUUID());
  const replacements = new Map<string, string>([
    [baseLifecycle.worldId, worldId],
    [baseLifecycle.companyId, companyId],
    [basePartyId, partyId],
    ...members.map((id, index) => [id, memberIds[index]!] as const),
  ]);
  const remapped = JSON.parse(
    JSON.stringify(base, (_key, value: unknown) =>
      typeof value === 'string' ? (replacements.get(value) ?? value) : value,
    ),
  ) as CompanyCombatAggregateState;
  const origin = { kind: 'AT' as const, siteId: 'severny-dvor', areaId: 'severny-dvor-yard' };
  const economy = remapped.economy;
  const physical = economy.physical;
  if (!physical) throw new Error('Travel fixture physical state missing');
  const rationItems = physical.items.filter((item) => item.definitionId === 'ration');
  const rationContainerId = rationItems[0]?.containerId;
  if (
    rationContainerId === undefined ||
    rationContainerId === null ||
    rationItems.some((item) => item.containerId !== rationContainerId)
  )
    throw new Error('Travel fixture ration container missing or inconsistent');
  const travelReadyContainer = (container: (typeof physical.containers)[number]) =>
    container.containerId === rationContainerId
      ? {
          ...container,
          kind: 'PARTY_SUPPLY' as const,
          location: origin,
          carrier: { kind: 'PARTY' as const, id: partyId },
        }
      : { ...container, location: origin };
  const initial = readCompanyCombatAggregateState({
    ...remapped,
    economy: {
      ...economy,
      lifecycle: {
        ...economy.lifecycle,
        revision: canonicalRevision('7'),
        parties: economy.lifecycle.parties.map((party) => ({ ...party, location: origin })),
        characters: economy.lifecycle.characters.map((character) =>
          character.presence.fieldPartyId === null
            ? character
            : { ...character, presence: { ...character.presence, location: origin } },
        ),
      },
      physical: {
        ...physical,
        containers: physical.containers.map(travelReadyContainer),
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: physical.knowledge.containerSnapshots.map(travelReadyContainer),
        },
      },
    },
  });
  expect(readCompanyCombatAggregateState(initial)).toEqual(initial);
  const initialPhysical = initial.economy.physical;
  if (!initialPhysical) throw new Error('Travel aggregate physical state missing');
  const equippedItems = initialPhysical.items.filter((item) => item.equipped !== null);
  for (const item of equippedItems) {
    const container = initialPhysical.containers.find(
      (candidate) => candidate.containerId === item.containerId,
    );
    expect(container?.carrier).toEqual({
      kind: 'CHARACTER',
      id: item.equipped!.characterId,
    });
  }
  const appConfig = loadServerConfig({
    DATABASE_URL: connectionString,
    OIDC_ISSUER: 'http://127.0.0.1:5557/dex',
    OIDC_CLIENT_ID: 'warwrit-local',
    OIDC_CLIENT_SECRET: 'local-only-secret',
    OIDC_REDIRECT_URI: 'http://127.0.0.1:3107/auth/callback',
    PUBLIC_ORIGIN: 'http://127.0.0.1:3107',
    HOST: '127.0.0.1',
    PORT: '3107',
  });
  const app = buildApp({
    identity: { config: appConfig.identity!, database: withRollbackInjection(db) },
    company: { database: withRollbackInjection(db), worldId },
  });
  apps.push(app);
  return {
    worldId,
    companyId,
    accountId,
    foreignAccountId,
    sessionToken,
    foreignSessionToken,
    partyId,
    memberIds,
    initial,
    ownerHeaders: {
      cookie: `warwrit_session=${sessionToken}`,
      origin: 'http://127.0.0.1:3107',
      [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
    },
    foreignHeaders: {
      cookie: `warwrit_session=${foreignSessionToken}`,
      origin: 'http://127.0.0.1:3107',
      [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId,
    },
    app,
  };
}

function withRollbackInjection(db: Kysely<DatabaseSchema>): Kysely<DatabaseSchema> {
  return new Proxy(db, {
    get(target, property) {
      if (property === 'transaction') {
        return () => {
          const transaction = target.transaction();
          return {
            execute: <T>(callback: (trx: Transaction<DatabaseSchema>) => Promise<T>) =>
              transaction.execute(async (trx) => {
                const result = await callback(trx);
                if (failNextApplicationTransactionBeforeCommit) {
                  failNextApplicationTransactionBeforeCommit = false;
                  throw new Error('test-only rollback after world travel writes');
                }
                return result;
              }),
          };
        };
      }
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

async function seedSyntheticCompany(
  db: Kysely<DatabaseSchema>,
  actor: SyntheticCompany,
): Promise<void> {
  const lifecycle = actor.initial.economy.lifecycle;
  const snapshot = {
    world_id: actor.worldId,
    company_id: actor.companyId,
    schema_version: COMPANY_SCHEMA_VERSION,
    ruleset_id: COMPANY_RULESET_ID,
    catalogue_version: COMPANY_CATALOGUE_VERSION,
    command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
    public_revision: lifecycle.knowledge.revision,
    canonical_revision: lifecycle.revision,
    state: actor.initial,
  };
  expect(snapshot.world_id).toBe(lifecycle.worldId);
  expect(snapshot.company_id).toBe(lifecycle.companyId);
  expect(snapshot.state.economy.lifecycle.worldId).toBe(snapshot.world_id);
  expect(snapshot.state.economy.lifecycle.companyId).toBe(snapshot.company_id);
  expect(lifecycle.parties.map((party) => party.partyId)).toEqual([actor.partyId]);
  expect(
    lifecycle.characters
      .filter((character) => character.presence.fieldPartyId !== null)
      .every((character) => character.presence.fieldPartyId === actor.partyId),
  ).toBe(true);
  await db
    .insertInto('identity_accounts')
    .values([
      { id: actor.accountId, issuer: `world-travel-${actor.accountId}`, subject: 'owner' },
      {
        id: actor.foreignAccountId,
        issuer: `world-travel-${actor.accountId}`,
        subject: 'foreign',
      },
    ])
    .execute();
  await db
    .insertInto('identity_sessions')
    .values([
      {
        token_digest: createHash('sha256').update(actor.sessionToken).digest(),
        account_id: actor.accountId,
        expires_at: new Date(Date.now() + 60 * 60_000),
      },
      {
        token_digest: createHash('sha256').update(actor.foreignSessionToken).digest(),
        account_id: actor.foreignAccountId,
        expires_at: new Date(Date.now() + 60 * 60_000),
      },
    ])
    .execute();
  await db.insertInto('company_snapshots').values(snapshot).execute();
  await db
    .insertInto('company_account_owners')
    .values({ world_id: actor.worldId, company_id: actor.companyId, account_id: actor.accountId })
    .execute();
  await db
    .insertInto('world_campaign_clocks')
    .values({
      world_id: actor.worldId,
      epoch_ms: String(Date.now() - 5_000),
      starting_tick: lifecycle.campaignTick,
    })
    .execute();
}

function departureRequest(actor: SyntheticCompany, commandId: string) {
  return {
    schemaVersion: 1,
    commandId,
    expectedPublicRevision: actor.initial.economy.lifecycle.knowledge.revision,
    expectedRouteEpoch: '0',
    action: { kind: 'DEPART', edgeIds: ['kamenny-brod-severny-dvor'] },
  } as const;
}

function arrivalRequest(
  actor: SyntheticCompany,
  departed: Record<string, unknown>,
  commandId: string,
) {
  const route = departed['route'] as { routeEpoch: string };
  return {
    schemaVersion: 1,
    commandId,
    expectedPublicRevision: departed['publicRevision'] as string,
    expectedRouteEpoch: route.routeEpoch,
    action: { kind: 'ARRIVE' },
  } as const;
}

async function setWorldClock(
  db: Kysely<DatabaseSchema>,
  actor: SyntheticCompany,
  elapsedTicks: number,
): Promise<void> {
  const elapsedMs = elapsedTicks * clockTickMs + 5_000;
  await db
    .updateTable('world_campaign_clocks')
    .set({ epoch_ms: String(Date.now() - elapsedMs) })
    .where('world_id', '=', actor.worldId)
    .executeTakeFirstOrThrow();
}

async function waitForRouteState(
  db: Kysely<DatabaseSchema>,
  actor: SyntheticCompany,
  matches: (execution: { readonly phase: string; readonly nextEdgeIndex: number }) => boolean,
): Promise<void> {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const route = await db
      .selectFrom('world_party_routes')
      .select('accepted_route')
      .where('world_id', '=', actor.worldId)
      .where('company_id', '=', actor.companyId)
      .where('party_id', '=', actor.partyId)
      .executeTakeFirst();
    const envelope = route?.accepted_route as
      | { readonly execution?: { readonly phase?: string; readonly nextEdgeIndex?: number } }
      | undefined;
    const execution = envelope?.execution;
    if (
      execution &&
      typeof execution.phase === 'string' &&
      typeof execution.nextEdgeIndex === 'number' &&
      matches({ phase: execution.phase, nextEdgeIndex: execution.nextEdgeIndex })
    )
      return;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('World route worker did not reach the expected durable state');
}

async function inspectCompany(db: Kysely<DatabaseSchema>, actor: SyntheticCompany) {
  return db.transaction().execute(async (transaction) => {
    const state = await loadCompanyAggregate(transaction, actor.worldId, actor.companyId);
    const snapshot = await transaction
      .selectFrom('company_snapshots')
      .select(['canonical_revision', 'public_revision'])
      .where('world_id', '=', actor.worldId)
      .where('company_id', '=', actor.companyId)
      .executeTakeFirst();
    const [routes, receipts, companyReceipts, events] = await Promise.all([
      transaction
        .selectFrom('world_party_routes')
        .selectAll()
        .where('world_id', '=', actor.worldId)
        .where('company_id', '=', actor.companyId)
        .execute(),
      transaction
        .selectFrom('world_route_receipts')
        .selectAll()
        .where('world_id', '=', actor.worldId)
        .where('company_id', '=', actor.companyId)
        .execute(),
      transaction
        .selectFrom('company_receipts')
        .selectAll()
        .where('world_id', '=', actor.worldId)
        .where('company_id', '=', actor.companyId)
        .execute(),
      transaction
        .selectFrom('company_audit_events')
        .select(['event_id', 'event'])
        .where('world_id', '=', actor.worldId)
        .where('company_id', '=', actor.companyId)
        .execute(),
    ]);
    return { state, snapshot, routes, receipts, companyReceipts, events };
  });
}

async function expectRejectedTravelWithoutMutation(
  db: Kysely<DatabaseSchema>,
  actor: SyntheticCompany,
  request: WorldTravelRequestDto,
  code: string,
): Promise<void> {
  const before = await inspectCompany(db, actor);
  const response = await actor.app.inject({
    method: 'POST',
    url: '/world/travel',
    headers: actor.ownerHeaders,
    payload: request,
  });
  expect(response.statusCode).toBe(409);
  expect(response.json()).toMatchObject({ ok: false, code });
  expect(await inspectCompany(db, actor)).toEqual(before);
}

function physicalOutcome(state: CompanyCombatAggregateState) {
  const physical = state.economy.physical;
  if (!physical) throw new Error('Travel fixture physical state missing');
  return {
    rationQuantity: physical.items
      .filter((item) => item.definitionId === 'ration')
      .reduce((total, item) => total + item.quantity, 0),
    foodIntervals: physical.food
      .map(({ fromTick, toTick }) => [fromTick, toTick])
      .toSorted((left, right) => `${left[0]}:${left[1]}`.localeCompare(`${right[0]}:${right[1]}`)),
    stamina: physical.vitals.map((vital) => vital.currentStamina).toSorted((a, b) => a - b),
  };
}

function hasEventType(value: unknown, type: string): boolean {
  return value !== null && typeof value === 'object' && 'type' in value && value.type === type;
}

async function cleanupSyntheticCompany(
  db: Kysely<DatabaseSchema>,
  actor: SyntheticCompany,
): Promise<void> {
  await db.transaction().execute(async (transaction) => {
    await transaction
      .deleteFrom('contract_instances')
      .where('world_id', '=', actor.worldId)
      .execute();
    await transaction
      .deleteFrom('world_first_hunt_state')
      .where('world_id', '=', actor.worldId)
      .execute();
    await transaction
      .deleteFrom('world_route_receipts')
      .where('world_id', '=', actor.worldId)
      .where('company_id', '=', actor.companyId)
      .execute();
    await transaction
      .deleteFrom('world_party_routes')
      .where('world_id', '=', actor.worldId)
      .where('company_id', '=', actor.companyId)
      .execute();
    await transaction
      .deleteFrom('company_account_owners')
      .where('world_id', '=', actor.worldId)
      .where('company_id', '=', actor.companyId)
      .where('account_id', '=', actor.accountId)
      .execute();
    await transaction
      .deleteFrom('company_receipts')
      .where('world_id', '=', actor.worldId)
      .where('company_id', '=', actor.companyId)
      .execute();
    await transaction
      .deleteFrom('company_audit_events')
      .where('world_id', '=', actor.worldId)
      .where('company_id', '=', actor.companyId)
      .execute();
    await transaction
      .deleteFrom('company_snapshots')
      .where('world_id', '=', actor.worldId)
      .where('company_id', '=', actor.companyId)
      .execute();
    await transaction
      .deleteFrom('world_campaign_clocks')
      .where('world_id', '=', actor.worldId)
      .execute();
    await transaction
      .deleteFrom('company_opening_options')
      .where('world_id', '=', actor.worldId)
      .where('account_id', 'in', [actor.accountId, actor.foreignAccountId])
      .execute();
    await transaction
      .deleteFrom('identity_sessions')
      .where('account_id', 'in', [actor.accountId, actor.foreignAccountId])
      .execute();
    await transaction
      .deleteFrom('identity_accounts')
      .where('id', 'in', [actor.accountId, actor.foreignAccountId])
      .execute();
  });

  const [accounts, sessions, snapshots, clocks, routes, receipts, events, owners, openingOptions] =
    await Promise.all([
      db
        .selectFrom('identity_accounts')
        .select('id')
        .where('id', 'in', [actor.accountId, actor.foreignAccountId])
        .execute(),
      db
        .selectFrom('identity_sessions')
        .select('account_id')
        .where('account_id', 'in', [actor.accountId, actor.foreignAccountId])
        .execute(),
      db
        .selectFrom('company_snapshots')
        .select('company_id')
        .where('world_id', '=', actor.worldId)
        .where('company_id', '=', actor.companyId)
        .execute(),
      db
        .selectFrom('world_campaign_clocks')
        .select('world_id')
        .where('world_id', '=', actor.worldId)
        .execute(),
      db
        .selectFrom('world_party_routes')
        .select('party_id')
        .where('world_id', '=', actor.worldId)
        .where('company_id', '=', actor.companyId)
        .execute(),
      db
        .selectFrom('world_route_receipts')
        .select('command_id')
        .where('world_id', '=', actor.worldId)
        .where('company_id', '=', actor.companyId)
        .execute(),
      db
        .selectFrom('company_audit_events')
        .select('event_id')
        .where('world_id', '=', actor.worldId)
        .where('company_id', '=', actor.companyId)
        .execute(),
      db
        .selectFrom('company_account_owners')
        .select('account_id')
        .where('world_id', '=', actor.worldId)
        .where('company_id', '=', actor.companyId)
        .execute(),
      db
        .selectFrom('company_opening_options')
        .select('account_id')
        .where('world_id', '=', actor.worldId)
        .where('account_id', 'in', [actor.accountId, actor.foreignAccountId])
        .execute(),
    ]);
  expect({
    accounts,
    sessions,
    snapshots,
    clocks,
    routes,
    receipts,
    events,
    owners,
    openingOptions,
  }).toEqual({
    accounts: [],
    sessions: [],
    snapshots: [],
    clocks: [],
    routes: [],
    receipts: [],
    events: [],
    owners: [],
    openingOptions: [],
  });
}
