import { randomUUID } from 'node:crypto';

import {
  COMPANY_CATALOGUE_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  COMPANY_SCHEMA_VERSION,
  campaignTick,
  canonicalJson,
  canonicalRevision,
  parseCompanyCommand,
  preparePartyTravelArrival,
  preparePartyTravelDeparture,
  readCompanyCombatAggregateState,
  SEROE_PORECHYE,
} from '@warwrit/game-core';
import type {
  CompanyCombatAggregateState,
  EconomyContext,
  PracticeContext,
  TrustedTransitSegment,
} from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { afterAll, describe, expect, it } from 'vitest';

import { createDatabase } from '../db/database.js';
import type { DatabaseSchema } from '../db/database.js';
import {
  lookupTrustedCompanyCommandReceipt,
  persistPreparedTrustedCompanyCommand,
  prepareTrustedCompanyCommand,
  stableCompanyRequestKey,
} from './executor.js';
import type { CompanyWorldRequestIdentity, TrustedCompanyTravelEffect } from './executor.js';
import type { Transaction } from 'kysely';

const connectionString = process.env['WARWRIT_COMPANY_DATABASE_URL'];
const database = connectionString === undefined ? undefined : createDatabase(connectionString);

afterAll(async () => {
  await database?.destroy();
});

describe('trusted company command executor (PostgreSQL)', () => {
  it.skipIf(database === undefined)(
    'commits one snapshot, receipt and audit atomically; replays before fresh state and rejects body collisions',
    async () => {
      if (database === undefined) throw new Error('company test database missing');
      const scenario = createScenario();
      await seedScenario(database, scenario);
      try {
        let resultingRevision: string | undefined;
        let preparedEventIds: readonly string[] = [];
        let movementEventIds: readonly string[] = [];
        const result = await database.transaction().execute(async (transaction) => {
          const prepared = await prepare(transaction, scenario, scenario.ownerAccountId);
          expect(prepared.kind).toBe('PREPARED');
          if (prepared.kind !== 'PREPARED') throw new Error('company command was not prepared');
          if (scenario.travelEffect.kind !== 'ARRIVAL') throw new Error('arrival effect missing');
          const composition = composeExpectedArrival(
            prepared.prepared.nextState,
            scenario.travelEffect,
          );
          const finalState = composition.state;
          preparedEventIds = prepared.prepared.events.map((event) => event.eventId);
          movementEventIds = composition.observationEvents.map((event) => event.id);
          resultingRevision = finalState.economy.lifecycle.revision;
          const response = await persistPreparedTrustedCompanyCommand({
            transaction,
            prepared: prepared.prepared,
            finalState,
            travelEffect: scenario.travelEffect,
            additionalAuditEvents: [
              { eventId: `arrival-${scenario.commandId}`, event: { kind: 'RouteArrival' } },
            ],
          });
          return response;
        });

        const stored = await database
          .selectFrom('company_snapshots')
          .select(['canonical_revision', 'state'])
          .where('world_id', '=', scenario.worldId)
          .where('company_id', '=', scenario.companyId)
          .executeTakeFirstOrThrow();
        expect(stored.canonical_revision).toBe(resultingRevision);
        expect(
          await database
            .selectFrom('company_receipts')
            .select('receipt_id')
            .where('world_id', '=', scenario.worldId)
            .where('company_id', '=', scenario.companyId)
            .execute(),
        ).toHaveLength(1);
        expect(
          await database
            .selectFrom('company_audit_events')
            .select('event_id')
            .where('world_id', '=', scenario.worldId)
            .where('company_id', '=', scenario.companyId)
            .orderBy('sequence')
            .execute(),
        ).toEqual(
          [...preparedEventIds, ...movementEventIds, `arrival-${scenario.commandId}`].map(
            (event_id) => ({ event_id }),
          ),
        );

        const arrivedState = readCompanyCombatAggregateState(stored.state);
        const arrivalEffect = scenario.travelEffect;
        if (arrivalEffect.kind !== 'ARRIVAL') throw new Error('arrival effect missing');
        const arrivedParty = arrivedState.economy.lifecycle.parties.find(
          (party) => party.partyId === scenario.transit.partyId,
        );
        if (!arrivedParty) throw new Error('Arrived party missing from persisted state');
        expect(arrivedParty.location).toEqual(arrivalEffect.input.candidate.location);
        const arrivedMembers = arrivedState.economy.lifecycle.characters.filter(
          (character) => character.presence.fieldPartyId === scenario.transit.partyId,
        );
        expect(arrivedMembers.length).toBeGreaterThan(0);
        expect(
          arrivedMembers.every(
            (member) =>
              canonicalJson(member.presence.location) === canonicalJson(arrivedParty.location),
          ),
        ).toBe(true);
        expect(arrivedState.economy.lifecycle.knowledge.eventIds).toEqual(
          expect.arrayContaining([...movementEventIds]),
        );

        const replay = await database.transaction().execute((transaction) =>
          lookupTrustedCompanyCommandReceipt({
            transaction,
            accountId: scenario.ownerAccountId,
            identity: scenario.identity,
          }),
        );
        expect(replay).toEqual({ kind: 'REPLAY', response: result });

        const movedState = readCompanyCombatAggregateState(stored.state);
        const movedRevision = (BigInt(stored.canonical_revision) + 1n).toString();
        const newerState = readCompanyCombatAggregateState({
          ...movedState,
          economy: {
            ...movedState.economy,
            lifecycle: {
              ...movedState.economy.lifecycle,
              revision: canonicalRevision(movedRevision),
            },
          },
        });
        await database
          .updateTable('company_snapshots')
          .set({ canonical_revision: movedRevision, state: newerState })
          .where('world_id', '=', scenario.worldId)
          .where('company_id', '=', scenario.companyId)
          .execute();

        const replayAfterMovement = await database.transaction().execute((transaction) =>
          lookupTrustedCompanyCommandReceipt({
            transaction,
            accountId: scenario.ownerAccountId,
            identity: scenario.identity,
          }),
        );
        expect(replayAfterMovement).toEqual({ kind: 'REPLAY', response: result });

        const collision = await database.transaction().execute((transaction) =>
          lookupTrustedCompanyCommandReceipt({
            transaction,
            accountId: scenario.ownerAccountId,
            identity: {
              ...scenario.identity,
              requestKey: canonicalJson({ ...scenario.requestBody, action: { kind: 'DEPART' } }),
            },
          }),
        );
        expect(collision).toMatchObject({
          kind: 'REJECTED',
          response: { code: 'IDEMPOTENCY_CONFLICT', commandId: scenario.commandId },
        });

        const foreign = await database.transaction().execute((transaction) =>
          lookupTrustedCompanyCommandReceipt({
            transaction,
            accountId: scenario.foreignAccountId,
            identity: scenario.identity,
          }),
        );
        expect(foreign).toMatchObject({
          kind: 'REJECTED',
          response: { code: 'NOT_AUTHORIZED', commandId: scenario.commandId },
        });
      } finally {
        await cleanupScenario(database, scenario);
      }
    },
  );

  it.skipIf(database === undefined)(
    'rejects caller-supplied movement audit events before any write',
    async () => {
      if (database === undefined) throw new Error('company test database missing');
      const scenario = createScenario();
      await seedScenario(database, scenario);
      try {
        await expect(
          database.transaction().execute(async (transaction) => {
            const prepared = await prepare(transaction, scenario, scenario.ownerAccountId);
            if (prepared.kind !== 'PREPARED') throw new Error('company command was not prepared');
            const effect = scenario.travelEffect;
            if (effect.kind !== 'ARRIVAL') throw new Error('arrival effect missing');
            const composition = composeExpectedArrival(prepared.prepared.nextState, effect);
            const movementEvent = composition.observationEvents[0];
            if (!movementEvent) throw new Error('movement observation missing');
            return persistPreparedTrustedCompanyCommand({
              transaction,
              prepared: prepared.prepared,
              finalState: composition.state,
              travelEffect: effect,
              additionalAuditEvents: [{ eventId: movementEvent.id, event: movementEvent }],
            });
          }),
        ).rejects.toThrow('Movement observation audit events are owned by the executor');

        const stored = await database
          .selectFrom('company_snapshots')
          .select(['canonical_revision', 'state'])
          .where('world_id', '=', scenario.worldId)
          .where('company_id', '=', scenario.companyId)
          .executeTakeFirstOrThrow();
        expect(stored.canonical_revision).toBe(scenario.priorState.economy.lifecycle.revision);
        expect(canonicalJson(stored.state)).toBe(canonicalJson(scenario.priorState));
        expect(
          await database
            .selectFrom('company_receipts')
            .select('receipt_id')
            .where('world_id', '=', scenario.worldId)
            .where('company_id', '=', scenario.companyId)
            .execute(),
        ).toHaveLength(0);
        expect(
          await database
            .selectFrom('company_audit_events')
            .select('event_id')
            .where('world_id', '=', scenario.worldId)
            .where('company_id', '=', scenario.companyId)
            .execute(),
        ).toHaveLength(0);
      } finally {
        await cleanupScenario(database, scenario);
      }
    },
  );

  it.skipIf(database === undefined)(
    'rejects a canonical transit-start mismatch before writes',
    async () => {
      if (database === undefined) throw new Error('company test database missing');
      const scenario = createScenario();
      const location = scenario.priorState.economy.lifecycle.parties.find(
        (party) => party.partyId === scenario.transit.partyId,
      )?.location;
      if (location?.kind !== 'TRANSIT') throw new Error('canonical transit location missing');
      const mismatchedScenario = {
        ...scenario,
        priorState: withTransitStartedAt(
          scenario.priorState,
          scenario.transit.segmentId,
          campaignTick((BigInt(location.startedAt) - 1n).toString()),
        ),
      };
      await seedScenario(database, mismatchedScenario);
      try {
        await database.transaction().execute(async (transaction) => {
          const prepared = await prepare(
            transaction,
            mismatchedScenario,
            mismatchedScenario.ownerAccountId,
          );
          expect(prepared).toMatchObject({
            kind: 'REJECTED',
            response: { code: 'UNSUPPORTED_ACTION' },
          });
        });

        const stored = await database
          .selectFrom('company_snapshots')
          .select(['canonical_revision', 'state'])
          .where('world_id', '=', mismatchedScenario.worldId)
          .where('company_id', '=', mismatchedScenario.companyId)
          .executeTakeFirstOrThrow();
        expect(stored.canonical_revision).toBe(
          mismatchedScenario.priorState.economy.lifecycle.revision,
        );
        expect(canonicalJson(stored.state)).toBe(canonicalJson(mismatchedScenario.priorState));
        expect(
          await database
            .selectFrom('company_receipts')
            .select('receipt_id')
            .where('world_id', '=', mismatchedScenario.worldId)
            .where('company_id', '=', mismatchedScenario.companyId)
            .execute(),
        ).toHaveLength(0);
        expect(
          await database
            .selectFrom('company_audit_events')
            .select('event_id')
            .where('world_id', '=', mismatchedScenario.worldId)
            .where('company_id', '=', mismatchedScenario.companyId)
            .execute(),
        ).toHaveLength(0);
        expect(
          await database
            .selectFrom('world_party_routes')
            .select('party_id')
            .where('world_id', '=', mismatchedScenario.worldId)
            .where('company_id', '=', mismatchedScenario.companyId)
            .execute(),
        ).toHaveLength(0);
        expect(
          await database
            .selectFrom('world_route_receipts')
            .select('command_id')
            .where('world_id', '=', mismatchedScenario.worldId)
            .where('company_id', '=', mismatchedScenario.companyId)
            .execute(),
        ).toHaveLength(0);
      } finally {
        await cleanupScenario(database, mismatchedScenario);
      }
    },
  );

  it.skipIf(database === undefined)(
    'commits equal-tick and delayed departures through one atomic company composition',
    async () => {
      if (database === undefined) throw new Error('company test database missing');
      for (const targetTick of ['1000', '1010']) {
        const scenario = createDepartureScenario(randomUUID(), targetTick);
        await seedScenario(database, scenario);
        try {
          let departureComposition: ReturnType<typeof composeExpectedDeparture> | undefined;
          let preparedEventIds: readonly string[] = [];
          await database.transaction().execute(async (transaction) => {
            const prepared = await prepare(transaction, scenario, scenario.ownerAccountId);
            expect(prepared.kind, `${targetTick}: ${JSON.stringify(prepared)}`).toBe('PREPARED');
            if (prepared.kind !== 'PREPARED')
              throw new Error('pre-departure company command was not prepared');
            preparedEventIds = prepared.prepared.events.map((event) => event.eventId);
            const effect = scenario.travelEffect;
            if (effect.kind !== 'DEPARTURE') throw new Error('departure effect missing');
            departureComposition = composeExpectedDeparture(prepared.prepared.nextState, effect);
            const finalState = departureComposition.state;
            await persistPreparedTrustedCompanyCommand({
              transaction,
              prepared: prepared.prepared,
              finalState,
              travelEffect: effect,
            });
            expect(BigInt(finalState.economy.lifecycle.revision)).toBeGreaterThan(
              BigInt(scenario.priorState.economy.lifecycle.revision),
            );
          });

          const stored = await database
            .selectFrom('company_snapshots')
            .select(['canonical_revision', 'state'])
            .where('world_id', '=', scenario.worldId)
            .where('company_id', '=', scenario.companyId)
            .executeTakeFirstOrThrow();
          const storedState = readCompanyCombatAggregateState(stored.state);
          const composition = departureComposition;
          if (!composition) throw new Error('Departure composition missing');
          expect(stored.canonical_revision).toBe(storedState.economy.lifecycle.revision);
          const departedParty = storedState.economy.lifecycle.parties.find(
            (party) => party.partyId === scenario.transit.partyId,
          );
          if (!departedParty) throw new Error('Departed party missing from persisted state');
          expect(departedParty.location).toEqual(
            composition.state.economy.lifecycle.parties.find(
              (party) => party.partyId === scenario.transit.partyId,
            )?.location,
          );
          const departedMembers = storedState.economy.lifecycle.characters.filter(
            (character) => character.presence.fieldPartyId === scenario.transit.partyId,
          );
          expect(departedMembers.length).toBeGreaterThan(0);
          expect(
            departedMembers.every(
              (member) =>
                canonicalJson(member.presence.location) === canonicalJson(departedParty.location),
            ),
          ).toBe(true);
          expect(storedState.economy.lifecycle.knowledge.eventIds).toEqual(
            expect.arrayContaining(composition.observationEvents.map((event) => event.id)),
          );
          expect(
            await database
              .selectFrom('company_receipts')
              .select('receipt_id')
              .where('world_id', '=', scenario.worldId)
              .where('company_id', '=', scenario.companyId)
              .execute(),
          ).toHaveLength(1);
          expect(
            await database
              .selectFrom('company_audit_events')
              .select('event_id')
              .where('world_id', '=', scenario.worldId)
              .where('company_id', '=', scenario.companyId)
              .orderBy('sequence')
              .execute(),
          ).toEqual(
            [...preparedEventIds, ...composition.observationEvents.map((event) => event.id)].map(
              (event_id) => ({ event_id }),
            ),
          );
        } finally {
          await cleanupScenario(database, scenario);
        }
      }
    },
  );

  it.skipIf(database === undefined)('rolls back the root, receipt and audit together', async () => {
    if (database === undefined) throw new Error('company test database missing');
    const scenario = createScenario();
    await seedScenario(database, scenario);
    try {
      await expect(
        database.transaction().execute(async (transaction) => {
          const prepared = await prepare(transaction, scenario, scenario.ownerAccountId);
          if (prepared.kind !== 'PREPARED') throw new Error('company command was not prepared');
          const effect = scenario.travelEffect;
          if (effect.kind !== 'ARRIVAL') throw new Error('arrival effect missing');
          const composition = composeExpectedArrival(prepared.prepared.nextState, effect);
          await persistPreparedTrustedCompanyCommand({
            transaction,
            prepared: prepared.prepared,
            finalState: composition.state,
            travelEffect: effect,
            additionalAuditEvents: [
              { eventId: `rollback-${scenario.commandId}`, event: { kind: 'RouteArrival' } },
            ],
          });
          throw new Error('test rollback before commit');
        }),
      ).rejects.toThrow('test rollback before commit');

      const snapshot = await database
        .selectFrom('company_snapshots')
        .select('canonical_revision')
        .where('world_id', '=', scenario.worldId)
        .where('company_id', '=', scenario.companyId)
        .executeTakeFirstOrThrow();
      expect(snapshot.canonical_revision).toBe(scenario.priorState.economy.lifecycle.revision);
      expect(
        await database
          .selectFrom('company_receipts')
          .select('receipt_id')
          .where('world_id', '=', scenario.worldId)
          .where('company_id', '=', scenario.companyId)
          .execute(),
      ).toHaveLength(0);
      expect(
        await database
          .selectFrom('company_audit_events')
          .select('event_id')
          .where('world_id', '=', scenario.worldId)
          .where('company_id', '=', scenario.companyId)
          .execute(),
      ).toHaveLength(0);
    } finally {
      await cleanupScenario(database, scenario);
    }
  });

  it.skipIf(database === undefined)(
    'allows only one same-public-revision competitor to commit',
    async () => {
      if (database === undefined) throw new Error('company test database missing');
      const scenario = createScenario();
      await seedScenario(database, scenario);
      const competitorIds = [randomUUID(), randomUUID()];
      try {
        const outcomes = await Promise.all(
          competitorIds.map((commandId) => {
            const competitor = createCommandScenario(scenario, commandId);
            return database.transaction().execute(async (transaction) => {
              const prepared = await prepare(transaction, competitor, scenario.ownerAccountId);
              if (prepared.kind !== 'PREPARED') return prepared;
              const effect = competitor.travelEffect;
              if (effect.kind !== 'ARRIVAL') throw new Error('arrival effect missing');
              const composition = composeExpectedArrival(prepared.prepared.nextState, effect);
              await persistPreparedTrustedCompanyCommand({
                transaction,
                prepared: prepared.prepared,
                finalState: composition.state,
                travelEffect: effect,
              });
              return prepared;
            });
          }),
        );

        expect(outcomes.map((outcome) => outcome.kind).toSorted()).toEqual([
          'PREPARED',
          'REJECTED',
        ]);
        expect(outcomes.filter((outcome) => outcome.kind === 'REJECTED')).toMatchObject([
          { kind: 'REJECTED', response: { code: 'STALE_REVISION' } },
        ]);
        expect(
          await database
            .selectFrom('company_receipts')
            .select('receipt_id')
            .where('world_id', '=', scenario.worldId)
            .where('company_id', '=', scenario.companyId)
            .execute(),
        ).toHaveLength(1);
      } finally {
        await cleanupScenario(database, scenario);
      }
    },
  );
});

interface Scenario extends ScenarioBase {
  readonly commandId: string;
  readonly command: unknown;
  readonly context: EconomyContext & Pick<PracticeContext, 'practiceFacts'>;
  readonly identity: CompanyWorldRequestIdentity;
  readonly requestBody: Readonly<Record<string, unknown>>;
  readonly travelEffect: TrustedCompanyTravelEffect;
}

interface ScenarioBase {
  readonly worldId: string;
  readonly companyId: string;
  readonly ownerAccountId: string;
  readonly foreignAccountId: string;
  readonly priorState: CompanyCombatAggregateState;
  readonly atState: CompanyCombatAggregateState;
  readonly transit: TrustedTransitSegment;
  readonly transitSegments: readonly TrustedTransitSegment[];
  readonly travelEffect: TrustedCompanyTravelEffect;
}

function createScenario(): Scenario {
  return createCommandScenario(createTransitState(), randomUUID());
}

function createDepartureScenario(commandId: string, targetTick: string): Scenario {
  const base = createTransitState();
  const departureEffect: TrustedCompanyTravelEffect = {
    kind: 'DEPARTURE',
    input: {
      region: SEROE_PORECHYE,
      partyId: base.transit.partyId,
      intent: { kind: 'ROUTE', purpose: 'NEW', edgeIds: ['kamenny-brod-severny-dvor'] },
      atTick: campaignTick(targetTick),
      expectedRouteEpoch: '0',
      currentRouteEpoch: '0',
      segmentId: randomUUID(),
    },
  };
  return createCommandScenario(
    { ...base, priorState: base.atState, transitSegments: [], travelEffect: departureEffect },
    commandId,
    campaignTick(targetTick),
  );
}

function createTransitState(): ScenarioBase {
  const worldId = randomUUID();
  const companyId = randomUUID();
  const ownerAccountId = randomUUID();
  const foreignAccountId = randomUUID();
  const base = createCompanyCombatAggregateFixture().state;
  const lifecycle = base.economy.lifecycle;
  const partyId = lifecycle.parties[0]?.partyId;
  if (!partyId) throw new Error('Company fixture party missing');
  const memberIds = lifecycle.characters
    .filter((character) => character.presence.fieldPartyId !== null)
    .map((character) => character.identity.characterId);
  const replacements = new Map<string, string>([
    [lifecycle.worldId, worldId],
    [lifecycle.companyId, companyId],
    [partyId, randomUUID()],
    ...memberIds.map((id) => [id, randomUUID()] as const),
  ]);
  const remapped = JSON.parse(
    JSON.stringify(base, (_key, value: unknown) =>
      typeof value === 'string' ? (replacements.get(value) ?? value) : value,
    ),
  ) as CompanyCombatAggregateState;
  const economy = remapped.economy;
  const physical = economy.physical;
  if (!physical) throw new Error('Company fixture physical state missing');
  const remappedPartyId = replacements.get(partyId)!;
  const origin = { kind: 'AT' as const, siteId: 'severny-dvor', areaId: 'severny-dvor-yard' };
  const rationContainers = physical.items
    .filter((item) => item.definitionId === 'ration')
    .map((item) => item.containerId);
  const rationContainerId = rationContainers[0];
  if (
    rationContainerId === undefined ||
    rationContainerId === null ||
    rationContainers.some((containerId) => containerId !== rationContainerId)
  )
    throw new Error('Company fixture ration container missing or inconsistent');
  const moveContainer = (container: (typeof physical.containers)[number]) =>
    container.containerId === rationContainerId
      ? {
          ...container,
          kind: 'PARTY_SUPPLY' as const,
          location: origin,
          carrier: { kind: 'PARTY' as const, id: remappedPartyId },
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
        containers: physical.containers.map(moveContainer),
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: physical.knowledge.containerSnapshots.map(moveContainer),
        },
      },
    },
  });
  const departure = preparePartyTravelDeparture({
    root: {
      lifecycle: initial.economy.lifecycle,
      finance: initial.economy.finance,
      physical: initial.economy.physical!,
    },
    region: SEROE_PORECHYE,
    partyId: remappedPartyId,
    intent: { kind: 'ROUTE', purpose: 'NEW', edgeIds: ['kamenny-brod-severny-dvor'] },
    atTick: initial.economy.lifecycle.campaignTick,
    expectedRouteEpoch: '0',
    currentRouteEpoch: '0',
    segmentId: randomUUID(),
  });
  const priorState = readCompanyCombatAggregateState({
    ...initial,
    economy: {
      ...initial.economy,
      lifecycle: departure.root.lifecycle,
      physical: departure.root.physical,
    },
  });
  const transit = departure.transitSegment;
  const destination = SEROE_PORECHYE.sites.find(
    (site) => site.siteId === departure.route.segment.toSiteId,
  );
  const area = destination?.areas[0];
  if (!area) throw new Error('Travel fixture destination area missing');
  const travelEffect = {
    kind: 'ARRIVAL' as const,
    input: {
      region: SEROE_PORECHYE,
      candidate: {
        worldId: departure.route.worldId,
        partyId: departure.route.partyId,
        segmentId: departure.route.segment.segmentId,
        regionVersion: departure.route.regionVersion,
        routeEpoch: departure.route.routeEpoch,
        cause: 'ROUTE_ARRIVAL' as const,
        location: { kind: 'AT' as const, siteId: destination!.siteId, areaId: area.areaId },
        notBefore: departure.route.segment.arrivalNotBefore,
      },
      acceptedRoute: departure.route,
      currentRouteEpoch: departure.route.routeEpoch,
      trustedNow: departure.route.segment.arrivalNotBefore,
    },
  };
  return {
    worldId,
    companyId,
    ownerAccountId,
    foreignAccountId,
    priorState,
    atState: initial,
    transit,
    transitSegments: [transit],
    travelEffect,
  };
}

function createCommandScenario(
  base: ScenarioBase,
  commandId: string,
  targetTick: TrustedTransitSegment['dueTick'] = base.transit.dueTick,
): Scenario {
  const priorState = base.priorState;
  const lifecycle = priorState.economy.lifecycle;
  const transit = base.transit;
  const sourceEventId = `world-travel-advance-${commandId}`;
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId,
    sourceEventId,
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    actorRef: { kind: 'SYSTEM', id: 'world-travel' },
    expectedRevision: lifecycle.revision,
    campaignTick: targetTick,
    rulesetId: COMPANY_RULESET_ID,
    type: 'AdvanceCampaign',
    payload: { toTick: targetTick, authoritativeInputs: [] },
  });
  if (!parsed.ok) throw new Error('Company travel command did not parse');
  const command = parsed.command;
  const context: EconomyContext & Pick<PracticeContext, 'practiceFacts'> = {
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    principal: { kind: 'SYSTEM', id: 'world-travel' },
    publicRevision: lifecycle.knowledge.revision,
    canonicalRevision: lifecycle.revision,
    atTick: targetTick as typeof transit.dueTick,
    completeGraph: true,
    contactIds: [],
    facts: [],
    financeFacts: [],
    physicalFacts: [],
    practiceFacts: [],
    trustedTransitSegments: base.transitSegments,
    internalGrant: {
      commandId,
      sourceEventId,
      canonicalRequest: canonicalJson(command),
    },
  };
  const requestBody = {
    schemaVersion: 1,
    commandId,
    expectedPublicRevision: lifecycle.knowledge.revision,
    expectedRouteEpoch: base.transitSegments.length === 0 ? '0' : transit.routeEpoch,
    action:
      base.transitSegments.length === 0
        ? { kind: 'DEPART', edgeIds: ['kamenny-brod-severny-dvor'] }
        : { kind: 'ARRIVE' },
  } as const;
  const identity = {
    kind: 'WORLD_REQUEST',
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    commandId,
    requestKey: canonicalJson(requestBody),
  } as const;
  return {
    ...base,
    commandId,
    command,
    context,
    identity,
    requestBody,
  };
}

function composeExpectedArrival(
  nextState: CompanyCombatAggregateState,
  effect: Extract<Scenario['travelEffect'], { readonly kind: 'ARRIVAL' }>,
): {
  readonly state: CompanyCombatAggregateState;
  readonly observationEvents: ReturnType<typeof preparePartyTravelArrival>['observationEvents'];
} {
  const physical = nextState.economy.physical;
  if (!physical) throw new Error('Company travel requires physical state');
  const result = preparePartyTravelArrival({
    root: {
      lifecycle: nextState.economy.lifecycle,
      finance: nextState.economy.finance,
      physical,
    },
    ...effect.input,
  });
  return {
    state: readCompanyCombatAggregateState({
      ...nextState,
      economy: { ...nextState.economy, ...result.root },
    }),
    observationEvents: result.observationEvents,
  };
}

function composeExpectedDeparture(
  nextState: CompanyCombatAggregateState,
  effect: Extract<Scenario['travelEffect'], { readonly kind: 'DEPARTURE' }>,
): {
  readonly state: CompanyCombatAggregateState;
  readonly observationEvents: ReturnType<typeof preparePartyTravelDeparture>['observationEvents'];
} {
  const physical = nextState.economy.physical;
  if (!physical) throw new Error('Company travel requires physical state');
  const result = preparePartyTravelDeparture({
    root: {
      lifecycle: nextState.economy.lifecycle,
      finance: nextState.economy.finance,
      physical,
    },
    ...effect.input,
  });
  return {
    state: readCompanyCombatAggregateState({
      ...nextState,
      economy: { ...nextState.economy, ...result.root },
    }),
    observationEvents: result.observationEvents,
  };
}

function withTransitStartedAt(
  state: CompanyCombatAggregateState,
  segmentId: string,
  startedAt: TrustedTransitSegment['startedAt'],
): CompanyCombatAggregateState {
  const changed = JSON.parse(JSON.stringify(state)) as CompanyCombatAggregateState;
  const location = (value: unknown) => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const record = value as Record<string, unknown>;
    if (record['kind'] === 'TRANSIT' && record['segmentId'] === segmentId)
      record['startedAt'] = startedAt;
  };
  for (const party of changed.economy.lifecycle.parties) location(party.location);
  for (const character of changed.economy.lifecycle.characters)
    location(character.presence.location);
  for (const container of changed.economy.physical!.containers) location(container.location);
  return readCompanyCombatAggregateState(changed);
}

async function seedScenario(database: ReturnType<typeof createDatabase>, scenario: Scenario) {
  const lifecycle = scenario.priorState.economy.lifecycle;
  await database.transaction().execute(async (transaction) => {
    await transaction
      .insertInto('identity_accounts')
      .values([
        {
          id: scenario.ownerAccountId,
          issuer: `executor-${scenario.ownerAccountId}`,
          subject: 'owner',
        },
        {
          id: scenario.foreignAccountId,
          issuer: `executor-${scenario.ownerAccountId}`,
          subject: 'foreign',
        },
      ])
      .execute();
    await transaction
      .insertInto('company_snapshots')
      .values({
        world_id: scenario.worldId,
        company_id: scenario.companyId,
        schema_version: COMPANY_SCHEMA_VERSION,
        ruleset_id: COMPANY_RULESET_ID,
        catalogue_version: COMPANY_CATALOGUE_VERSION,
        command_schema_version: COMPANY_COMMAND_SCHEMA_VERSION,
        public_revision: lifecycle.knowledge.revision,
        canonical_revision: lifecycle.revision,
        state: scenario.priorState,
      })
      .execute();
    await transaction
      .insertInto('company_account_owners')
      .values({
        world_id: scenario.worldId,
        company_id: scenario.companyId,
        account_id: scenario.ownerAccountId,
      })
      .execute();
  });
}

async function cleanupScenario(database: ReturnType<typeof createDatabase>, scenario: Scenario) {
  await database.transaction().execute(async (transaction) => {
    await transaction
      .deleteFrom('company_account_owners')
      .where('world_id', '=', scenario.worldId)
      .where('company_id', '=', scenario.companyId)
      .execute();
    await transaction
      .deleteFrom('company_receipts')
      .where('world_id', '=', scenario.worldId)
      .where('company_id', '=', scenario.companyId)
      .execute();
    await transaction
      .deleteFrom('company_audit_events')
      .where('world_id', '=', scenario.worldId)
      .where('company_id', '=', scenario.companyId)
      .execute();
    await transaction
      .deleteFrom('company_snapshots')
      .where('world_id', '=', scenario.worldId)
      .where('company_id', '=', scenario.companyId)
      .execute();
    await transaction
      .deleteFrom('identity_accounts')
      .where('id', 'in', [scenario.ownerAccountId, scenario.foreignAccountId])
      .execute();
  });
  const [snapshots, owners, receipts, auditEvents, accounts] = await Promise.all([
    database
      .selectFrom('company_snapshots')
      .select('company_id')
      .where('world_id', '=', scenario.worldId)
      .where('company_id', '=', scenario.companyId)
      .execute(),
    database
      .selectFrom('company_account_owners')
      .select('company_id')
      .where('world_id', '=', scenario.worldId)
      .where('company_id', '=', scenario.companyId)
      .execute(),
    database
      .selectFrom('company_receipts')
      .select('receipt_id')
      .where('world_id', '=', scenario.worldId)
      .where('company_id', '=', scenario.companyId)
      .execute(),
    database
      .selectFrom('company_audit_events')
      .select('event_id')
      .where('world_id', '=', scenario.worldId)
      .where('company_id', '=', scenario.companyId)
      .execute(),
    database
      .selectFrom('identity_accounts')
      .select('id')
      .where('id', 'in', [scenario.ownerAccountId, scenario.foreignAccountId])
      .execute(),
  ]);
  expect(snapshots).toHaveLength(0);
  expect(owners).toHaveLength(0);
  expect(receipts).toHaveLength(0);
  expect(auditEvents).toHaveLength(0);
  expect(accounts).toHaveLength(0);
}

async function prepare(
  transaction: Transaction<DatabaseSchema>,
  scenario: Scenario,
  accountId: string,
) {
  return prepareTrustedCompanyCommand({
    transaction,
    accountId,
    lockedPriorState: scenario.priorState,
    command: scenario.command,
    stableRequestKey: stableCompanyRequestKey(scenario.identity),
    expectedPublicRevision: scenario.priorState.economy.lifecycle.knowledge.revision,
    context: scenario.context,
  });
}
