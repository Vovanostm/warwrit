import { readDangerousRouteMembership } from '../contracts/repository.js';
import { randomUUID } from 'node:crypto';
import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Kysely, Transaction } from 'kysely';
import {
  acceptedWorldRegion,
  FIRST_HUNT_TRAVEL_SCOPE,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  CONTINUOUS_WORLD_REGION,
  TRAVEL_RULES,
  WORLD_REGION_VERSION,
  buildNavigationField,
  campaignTick,
  campaignTickAt,
  canonicalJson,
  canonicalRevision,
  companySourceKey,
  compileMovementPlan,
  continuousLocationPoint,
  continuousSurfaceAt,
  isContinuousPointWalkable,
  continuousSite,
  isContinuousRegionVersion,
  createCampaignClock,
  findTravelPath,
  parseCompanyCommand,
  positionAt,
  isDangerousRouteContract,
  prepareCompanyEconomy,
  prepareContinuousCompanyMovement,
  prepareFreeMovementStop,
  readContinuousMovementPlan,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type {
  CompanyCombatAggregateState,
  ContinuousCompanyExecution,
  FreeMovementExecution,
  TrustedTransitSegment,
} from '@warwrit/game-core';
import type {
  WorldFreeMovementV2RequestDto,
  WorldFreeMovementV2ResponseDto,
  WorldFreeMovementV2RejectionDto,
} from '@warwrit/protocol';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { resolveSessionAccount } from '../auth/session.js';
import {
  findOwnedCompanyId,
  lockCompanyAggregate,
  readCompanyCommandReceipt,
  updateCompanyAggregateWithReceipt,
} from '../company/repository.js';
import { prepareTravelFoodFacts, travelAdvanceSourceEventId } from '../company/travel-food.js';
import type { TravelFoodRouteBoundary } from '../company/travel-food.js';
import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock, type WorldClockReading } from './clock.js';
import { readPartyRoute, readWorldRouteReceipt, type StoredPartyRoute } from './repository.js';

interface ContinuousMovementOptions {
  readonly database: Kysely<DatabaseSchema>;
  readonly worldId: string;
}
type RejectionCode = WorldFreeMovementV2RejectionDto['code'];
class MovementRejection extends Error {
  constructor(readonly code: RejectionCode) {
    super(code);
  }
}
interface StoredContinuousMovement {
  readonly kind: 'CONTINUOUS_MOVEMENT';
  readonly acceptedByAccountId: string;
  readonly execution: ContinuousCompanyExecution;
  readonly status: 'MOVING' | 'STOPPED' | 'ARRIVED';
  readonly lastBoundaryMs?: string;
}
const field = buildNavigationField(CONTINUOUS_WORLD_REGION);
const object = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const decimal = (v: unknown): v is string => typeof v === 'string' && /^(0|[1-9]\d{0,18})$/.test(v);
const id = (v: unknown): v is string =>
  typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(v);

function parseContinuousMovementRequest(value: unknown): WorldFreeMovementV2RequestDto | undefined {
  if (
    !object(value) ||
    !exact(value, [
      'schemaVersion',
      'commandId',
      'expectedPublicRevision',
      'expectedMovementEpoch',
      'action',
    ]) ||
    value['schemaVersion'] !== 2 ||
    !id(value['commandId']) ||
    !decimal(value['expectedPublicRevision']) ||
    !decimal(value['expectedMovementEpoch']) ||
    !object(value['action'])
  )
    return undefined;
  const a = value['action'];
  if (a['kind'] === 'STOP')
    return exact(a, ['kind']) ? (value as unknown as WorldFreeMovementV2RequestDto) : undefined;
  if (
    a['kind'] !== 'MOVE_TO' ||
    !exact(a, ['kind', 'mapEdition', 'target']) ||
    !id(a['mapEdition']) ||
    !object(a['target'])
  )
    return undefined;
  const t = a['target'];
  const valid =
    t['kind'] === 'SITE'
      ? exact(t, ['kind', 'siteId']) && id(t['siteId'])
      : t['kind'] === 'TERRAIN' &&
        exact(t, ['kind', 'xFp', 'zFp']) &&
        Number.isSafeInteger(t['xFp']) &&
        Number.isSafeInteger(t['zFp']);
  return valid ? (value as unknown as WorldFreeMovementV2RequestDto) : undefined;
}

function readContinuous(row: StoredPartyRoute | undefined): StoredContinuousMovement | undefined {
  if (!row || !object(row.accepted_route) || row.accepted_route['kind'] !== 'CONTINUOUS_MOVEMENT')
    return undefined;
  const s = row.accepted_route as unknown as StoredContinuousMovement;
  if (
    !id(s.acceptedByAccountId) ||
    s.execution?.schemaVersion !== 2 ||
    s.execution.partyId !== row.party_id ||
    s.execution.routeEpoch !== row.route_epoch ||
    (s.execution.plan?.planVersion !== 2 && s.execution.plan?.planVersion !== 3) ||
    s.execution.plan.planId !== row.segment_id ||
    !isContinuousRegionVersion(s.execution.plan.mapEdition) ||
    (s.execution.plan.planVersion === 3) !==
      (s.execution.plan.mapEdition === 'seroe-porechye-continuous-v5') ||
    s.execution.plan.speedProfileId !== row.profile_id ||
    s.execution.regionVersion !== row.region_version ||
    !['MOVING', 'STOPPED', 'ARRIVED'].includes(s.status)
  )
    throw new Error('Invalid saved continuous movement');
  // Projection also validates the frozen time origin; no current map rebake of accepted plans.
  readContinuousMovementPlan(s.execution.plan);
  if (
    !decimal(s.execution.startedAt) ||
    !decimal(s.execution.arrivesAt) ||
    BigInt(s.execution.arrivesAt) < BigInt(s.execution.startedAt) ||
    (s.lastBoundaryMs !== undefined && !decimal(s.lastBoundaryMs)) ||
    (s.execution.plan.movementEpoch !== s.execution.routeEpoch && s.status === 'MOVING') ||
    (row.status === 'IN_TRANSIT') !== (s.status === 'MOVING')
  )
    throw new Error('Invalid saved continuous movement');
  positionAt(s.execution.plan, s.execution.plan.startedAtMs);
  return s;
}
function root(state: CompanyCombatAggregateState) {
  if (!state.economy.physical) throw new MovementRejection('MOVEMENT_NOT_ALLOWED');
  return {
    lifecycle: state.economy.lifecycle,
    finance: state.economy.finance,
    physical: state.economy.physical,
  };
}
function withRoot(state: CompanyCombatAggregateState, next: ReturnType<typeof root>) {
  return readCompanyCombatAggregateState({ ...state, economy: { ...state.economy, ...next } });
}
function applyContinuousMove(
  state: CompanyCombatAggregateState,
  input: Parameters<typeof prepareContinuousCompanyMovement>[0],
  events: Readonly<object>[],
) {
  const prepared = prepareContinuousCompanyMovement(input);
  events.push(...prepared.observationEvents);
  return withRoot(state, prepared.root);
}

function segment(
  state: CompanyCombatAggregateState,
  execution: ContinuousCompanyExecution | FreeMovementExecution,
  segmentId: string,
): TrustedTransitSegment {
  return {
    worldId: state.economy.lifecycle.worldId,
    companyId: state.economy.lifecycle.companyId,
    partyId: execution.partyId,
    segmentId,
    routeEpoch: execution.routeEpoch,
    profileId: TRAVEL_RULES.profileId,
    startedAt: campaignTick(execution.startedAt),
    dueTick: campaignTick(execution.arrivesAt),
  };
}
function commandFor(state: CompanyCombatAggregateState, toTick: string, commandId: string) {
  const l = state.economy.lifecycle;
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId,
    sourceEventId: travelAdvanceSourceEventId(l.worldId, l.companyId, commandId),
    worldId: l.worldId,
    companyId: l.companyId,
    actorRef: { kind: 'SYSTEM', id: 'world-travel' },
    expectedRevision: canonicalRevision(l.revision),
    campaignTick: toTick,
    rulesetId: COMPANY_RULESET_ID,
    type: 'AdvanceCampaign',
    payload: { toTick, authoritativeInputs: [] },
  });
  if (!parsed.ok || parsed.command.type !== 'AdvanceCampaign')
    throw new MovementRejection('MOVEMENT_NOT_ALLOWED');
  return parsed.command;
}
/** Draft only. A late arrival is closed at its deadline before the stationary remainder. */
function advance(
  state: CompanyCombatAggregateState,
  tick: string,
  commandId: string,
  execution?: ContinuousCompanyExecution | FreeMovementExecution,
  segmentId?: string,
  events: Readonly<object>[] = [],
) {
  if (BigInt(tick) < BigInt(state.economy.lifecycle.campaignTick))
    throw new MovementRejection('TRUSTED_TIME_UNAVAILABLE');
  if (tick === state.economy.lifecycle.campaignTick) return state;
  if (state.encounter.active || state.learning.tasks.tasks.some((t) => !t.stop && !t.terminal))
    throw new MovementRejection('MOVEMENT_NOT_ALLOWED');
  const party = state.economy.lifecycle.parties[0];
  if (!party) throw new MovementRejection('MOVEMENT_NOT_ALLOWED');
  const boundary: TravelFoodRouteBoundary =
    execution && segmentId
      ? { kind: 'FREE_MOVEMENT', execution, segmentId, settledThroughTick: tick }
      : {
          kind: 'DEPARTURE',
          partyId: party.partyId,
          location: party.location,
          settledThroughTick: tick,
        };
  const food = prepareTravelFoodFacts(state, tick, commandId, boundary);
  if (food.kind !== 'PREPARED')
    throw new MovementRejection(
      food.reason === 'INSUFFICIENT_ITEMS' ? 'KNOWN_SUPPLY_SHORTAGE' : 'MOVEMENT_NOT_ALLOWED',
    );
  const command = commandFor(state, tick, commandId);
  const l = state.economy.lifecycle;
  const prepared = prepareCompanyEconomy(state.economy, command, {
    worldId: l.worldId,
    companyId: l.companyId,
    principal: { kind: 'SYSTEM', id: 'world-travel' },
    publicRevision: l.knowledge.revision,
    canonicalRevision: l.revision,
    atTick: campaignTick(tick),
    completeGraph: true,
    contactIds: [],
    internalGrant: {
      commandId,
      sourceEventId: command.sourceEventId!,
      canonicalRequest: canonicalJson(command),
    },
    facts: [],
    financeFacts: [],
    physicalFacts: food.facts,
    practiceFacts: [],
    trustedTransitSegments: execution && segmentId ? [segment(state, execution, segmentId)] : [],
  });
  if (prepared.kind !== 'PREPARED' || prepared.replayed || prepared.receipt.requirements.length)
    throw new MovementRejection('MOVEMENT_NOT_ALLOWED');
  events.push(...prepared.receipt.events);
  return readCompanyCombatAggregateState({ ...state, economy: prepared.next });
}
/** Arrival stays committed at its deadline if ordinary stock catch-up cannot yet close the rest. */
function advanceStationaryRemainder(
  state: CompanyCombatAggregateState,
  tick: string,
  commandId: string,
  events: Readonly<object>[],
) {
  try {
    return advance(state, tick, commandId, undefined, undefined, events);
  } catch (error) {
    if (error instanceof MovementRejection && error.code === 'KNOWN_SUPPLY_SHORTAGE') return state;
    throw error;
  }
}

export function prepareDueContinuousMovement(
  state: CompanyCombatAggregateState,
  row: StoredPartyRoute | undefined,
  clock: WorldClockReading,
  commandId: string,
) {
  if (BigInt(clock.tick) < BigInt(state.economy.lifecycle.campaignTick))
    throw new MovementRejection('TRUSTED_TIME_UNAVAILABLE');
  const events: Readonly<object>[] = [];
  const stored = readContinuous(row);
  if (
    stored &&
    BigInt(clock.nowMs) < BigInt(stored.lastBoundaryMs ?? stored.execution.plan.startedAtMs)
  )
    throw new MovementRejection('TRUSTED_TIME_UNAVAILABLE');
  if (
    stored?.status === 'MOVING' &&
    BigInt(clock.nowMs) >= BigInt(stored.execution.plan.arrivesAtMs)
  ) {
    let next = advance(
      state,
      stored.execution.arrivesAt,
      `${commandId}.due`,
      stored.execution,
      row!.segment_id,
      events,
    );
    next = applyContinuousMove(
      next,
      {
        root: root(next),
        partyId: row!.party_id,
        segmentId: row!.segment_id,
        prior: stored.execution,
        next: null,
        nowMs: stored.execution.plan.arrivesAtMs,
      },
      events,
    );
    next = advanceStationaryRemainder(next, clock.tick, `${commandId}.rest`, events);
    return {
      state: next,
      stored: { ...stored, status: 'ARRIVED' as const, lastBoundaryMs: clock.nowMs },
      epoch: (BigInt(row!.route_epoch) + 1n).toString(),
      events,
      changed: true,
    };
  }
  // Retained V1 execution uses its saved tick schedule, never the new terrain profile.
  if (
    row?.status === 'IN_TRANSIT' &&
    object(row.accepted_route) &&
    row.accepted_route['kind'] === 'FREE_MOVEMENT'
  ) {
    const old = row.accepted_route;
    const execution = old['execution'] as FreeMovementExecution;
    if (
      execution?.schemaVersion !== 1 ||
      execution.regionVersion !== WORLD_REGION_VERSION ||
      execution.partyId !== row.party_id ||
      !decimal(execution.arrivesAt)
    )
      throw new MovementRejection('MOVEMENT_NOT_ALLOWED');
    if (BigInt(clock.tick) >= BigInt(execution.arrivesAt)) {
      let next = advance(
        state,
        execution.arrivesAt,
        `${commandId}.due`,
        execution,
        row.segment_id,
        events,
      );
      const legacyRegion = requireLegacyRegion();
      const stopped = prepareFreeMovementStop({
        root: root(next),
        region: legacyRegion,
        execution,
        segmentId: row.segment_id,
        trustedTick: campaignTick(execution.arrivesAt),
      });
      events.push(...stopped.observationEvents);
      next = withRoot(next, stopped.root);
      next = advanceStationaryRemainder(next, clock.tick, `${commandId}.rest`, events);
      return {
        state: next,
        stored: undefined,
        legacy: { ...old, status: 'ARRIVED' },
        epoch: row.route_epoch,
        events,
        changed: true,
      };
    }
    throw new MovementRejection('MOVEMENT_NOT_ALLOWED');
  }
  return { state, stored, epoch: row?.route_epoch ?? '0', events, changed: false };
}
function requireLegacyRegion() {
  const r = acceptedWorldRegion(WORLD_REGION_VERSION);
  if (!r) throw new Error('Legacy region unavailable');
  return r;
}

function responseFor(
  state: CompanyCombatAggregateState,
  stored: StoredContinuousMovement | undefined,
  epoch: string,
  clock: WorldClockReading,
  commandId?: string,
): WorldFreeMovementV2ResponseDto {
  const party = state.economy.lifecycle.parties[0];
  const moving = stored?.status === 'MOVING';
  const point = moving
    ? positionAt(stored.execution.plan, clock.nowMs)
    : party && continuousLocationPoint(party.location);
  if (!point) throw new MovementRejection('MOVEMENT_NOT_ALLOWED');
  return {
    schemaVersion: 2,
    result: 'ACCEPTED',
    ...(commandId ? { commandId } : {}),
    publicRevision: state.economy.lifecycle.knowledge.revision,
    movementEpoch: epoch,
    serverTimeMs: clock.nowMs,
    worldTick: clock.tick,
    mode: moving
      ? 'MOVING'
      : party?.location.kind === 'AT'
        ? 'STATIONARY_SITE'
        : 'STATIONARY_TERRAIN',
    point,
    surface: continuousSurfaceAt(field, {
      xFp: Number(point.xMicroFp) / 65536,
      zFp: Number(point.zMicroFp) / 65536,
    }),
    plan: moving ? stored.execution.plan : null,
  };
}
async function persistCandidate(
  transaction: Transaction<DatabaseSchema>,
  prior: CompanyCombatAggregateState,
  next: CompanyCombatAggregateState,
  accountId: string,
  commandId: string,
  requestKey: string,
  response: WorldFreeMovementV2ResponseDto,
  events: readonly Readonly<object>[] = [],
) {
  const l = prior.economy.lifecycle;
  const command = commandFor(prior, next.economy.lifecycle.campaignTick, commandId);
  await updateCompanyAggregateWithReceipt(
    transaction,
    l.revision,
    next.economy.lifecycle.revision,
    next,
    {
      command,
      receipt: {
        receiptId: randomUUID(),
        commandId,
        sourceKey: companySourceKey(command),
        requestKey: canonicalJson({
          kind: 'WORLD_REQUEST',
          worldId: l.worldId,
          companyId: l.companyId,
          commandId,
          requestKey,
        }),
        response: { commandId, ok: true, publicRevision: response.publicRevision },
        resultingRevision: next.economy.lifecycle.revision,
      },
      auditEvents: [
        ...events.map((event) => ({
          eventId: randomUUID(),
          revision: next.economy.lifecycle.revision,
          event,
        })),
        {
          eventId: randomUUID(),
          revision: next.economy.lifecycle.revision,
          event: {
            kind: 'ContinuousMovementCommitted',
            commandId,
            atTick: next.economy.lifecycle.campaignTick,
            movementEpoch: response.movementEpoch,
            point: response.point,
          },
        },
      ],
    },
  );
  await transaction
    .insertInto('world_route_receipts')
    .values({
      world_id: l.worldId,
      company_id: l.companyId,
      account_id: accountId,
      command_id: commandId,
      request_key: requestKey,
      response: { ...response },
      resulting_public_revision: response.publicRevision,
    })
    .execute();
}
async function storeRoute(
  transaction: Transaction<DatabaseSchema>,
  state: CompanyCombatAggregateState,
  stored: StoredContinuousMovement,
  epoch: string,
) {
  const e = stored.execution,
    l = state.economy.lifecycle;
  await transaction
    .insertInto('world_party_routes')
    .values({
      world_id: l.worldId,
      company_id: l.companyId,
      party_id: e.partyId,
      route_epoch: epoch,
      segment_id: e.plan.planId,
      profile_id: e.plan.speedProfileId,
      region_version: e.regionVersion,
      status: stored.status === 'MOVING' ? 'IN_TRANSIT' : 'ARRIVED',
      accepted_route: { ...stored, execution: { ...e, routeEpoch: epoch } },
    })
    .onConflict((c) =>
      c.columns(['world_id', 'company_id', 'party_id']).doUpdateSet({
        route_epoch: epoch,
        segment_id: e.plan.planId,
        profile_id: e.plan.speedProfileId,
        region_version: e.regionVersion,
        status: stored.status === 'MOVING' ? 'IN_TRANSIT' : 'ARRIVED',
        accepted_route: { ...stored, execution: { ...e, routeEpoch: epoch } },
      }),
    )
    .execute();
}

export async function persistDueContinuousMovementRoute(
  transaction: Transaction<DatabaseSchema>,
  candidate: ReturnType<typeof prepareDueContinuousMovement>,
) {
  if (!candidate.changed) return;
  if (candidate.stored)
    await storeRoute(transaction, candidate.state, candidate.stored, candidate.epoch);
  else if (candidate.legacy) {
    const l = candidate.state.economy.lifecycle;
    await transaction
      .updateTable('world_party_routes')
      .set({ status: 'ARRIVED', route_epoch: candidate.epoch, accepted_route: candidate.legacy })
      .where('world_id', '=', l.worldId)
      .where('company_id', '=', l.companyId)
      .where('party_id', '=', candidate.state.economy.lifecycle.parties[0]!.partyId)
      .execute();
  }
}
/** Caller holds account/root locks and must roll back a rejected enclosing intent. */
export async function settleDueContinuousMovementInTransaction(
  transaction: Transaction<DatabaseSchema>,
  state: CompanyCombatAggregateState,
  accountId: string,
  clock: WorldClockReading,
) {
  const l = state.economy.lifecycle,
    party = l.parties[0];
  if (!party) return state;
  const row = await readPartyRoute(transaction, l.worldId, l.companyId, party.partyId, true);
  const commandId = randomUUID(),
    candidate = prepareDueContinuousMovement(state, row, clock, commandId);
  if (candidate.changed) {
    const response = responseFor(
      candidate.state,
      candidate.stored,
      candidate.epoch,
      clock,
      commandId,
    );
    await persistCandidate(
      transaction,
      state,
      candidate.state,
      accountId,
      commandId,
      canonicalJson({ kind: 'SYSTEM_ARRIVAL', segmentId: row!.segment_id }),
      response,
      candidate.events,
    );
    await persistDueContinuousMovementRoute(transaction, candidate);
  }
  return candidate.state;
}

async function lockOwnedMovementCompany(
  tx: Transaction<DatabaseSchema>,
  worldId: string,
  accountId: string,
) {
  const companyId = await findOwnedCompanyId(tx, worldId, accountId);
  if (!companyId) throw new MovementRejection('NOT_AUTHORIZED');
  const state = await lockCompanyAggregate(tx, worldId, companyId);
  if (!state) throw new MovementRejection('NOT_AUTHORIZED');
  return { companyId, state };
}
export async function handleContinuousMovementRead(
  request: FastifyRequest,
  reply: FastifyReply,
  { database, worldId }: ContinuousMovementOptions,
) {
  const accountId = await resolveSessionAccount(request, database);
  if (!accountId)
    return reply
      .code(401)
      .send({ schemaVersion: 2, result: 'REJECTED', commandId: null, code: 'AUTH_REQUIRED' });
  try {
    const result = await database.transaction().execute(async (tx) => {
      await tx
        .selectFrom('identity_accounts')
        .select('id')
        .where('id', '=', accountId)
        .forUpdate()
        .executeTakeFirst();
      const { companyId, state } = await lockOwnedMovementCompany(tx, worldId, accountId);
      const party = state.economy.lifecycle.parties[0];
      if (!party) throw new MovementRejection('MOVEMENT_NOT_ALLOWED');
      const row = await readPartyRoute(tx, worldId, companyId, party.partyId, true);
      const clock = await readWorldClock(tx, worldId, new Date(), true);
      const commandId = randomUUID(),
        settled = prepareDueContinuousMovement(state, row, clock, commandId);
      const response = responseFor(settled.state, settled.stored, settled.epoch, clock);
      if (settled.changed) {
        await persistCandidate(
          tx,
          state,
          settled.state,
          accountId,
          commandId,
          canonicalJson({ kind: 'SYSTEM_ARRIVAL', segmentId: row!.segment_id }),
          { ...response, commandId },
          settled.events,
        );
        await persistDueContinuousMovementRoute(tx, settled);
      }
      return response;
    });
    return reply.header('Cache-Control', 'no-store').send(result);
  } catch (error) {
    if (error instanceof MovementRejection || error instanceof RangeError) {
      const code =
        error instanceof MovementRejection
          ? error.code
          : error.message === 'TRUSTED_TIME_UNAVAILABLE'
            ? 'TRUSTED_TIME_UNAVAILABLE'
            : 'MOVEMENT_NOT_ALLOWED';
      return reply
        .code(code === 'NOT_AUTHORIZED' ? 403 : code === 'TRUSTED_TIME_UNAVAILABLE' ? 503 : 422)
        .send({ schemaVersion: 2, result: 'REJECTED', commandId: null, code });
    }
    throw error;
  }
}

export async function executeContinuousMovement(
  database: ContinuousMovementOptions['database'],
  worldId: string,
  accountId: string,
  expectedCompanyId: unknown,
  input: WorldFreeMovementV2RequestDto,
) {
  return database.transaction().execute(async (tx) => {
    const account = await tx
      .selectFrom('identity_accounts')
      .select('id')
      .where('id', '=', accountId)
      .forUpdate()
      .executeTakeFirst();
    if (!account) throw new MovementRejection('AUTH_REQUIRED');
    const companyId = await findOwnedCompanyId(tx, worldId, accountId);
    if (!companyId || companyId !== expectedCompanyId)
      throw new MovementRejection('NOT_AUTHORIZED');
    const state = await lockCompanyAggregate(tx, worldId, companyId);
    if (!state) throw new MovementRejection('NOT_AUTHORIZED');
    const key = canonicalJson(input),
      replay = await readWorldRouteReceipt(tx, worldId, companyId, input.commandId);
    if (replay) {
      if (replay.account_id !== accountId) throw new MovementRejection('NOT_AUTHORIZED');
      if (replay.request_key !== key) throw new MovementRejection('COMMAND_ID_CONFLICT');
      return replay.response as WorldFreeMovementV2ResponseDto;
    }
    if (await readCompanyCommandReceipt(tx, worldId, companyId, input.commandId))
      throw new MovementRejection('COMMAND_ID_CONFLICT');
    if (input.expectedPublicRevision !== state.economy.lifecycle.knowledge.revision)
      throw new MovementRejection('STALE_REVISION');
    const party = state.economy.lifecycle.parties[0];
    if (
      !party ||
      state.encounter.active ||
      state.learning.tasks.tasks.some((t) => !t.stop && !t.terminal) ||
      state.economy.finance.maintenance.some((m) => m.kind === 'FIELD_CAMP' && m.endedAt === null)
    )
      throw new MovementRejection('MOVEMENT_NOT_ALLOWED');
    const row = await readPartyRoute(tx, worldId, companyId, party.partyId, true);
    if (input.expectedMovementEpoch !== (row?.route_epoch ?? '0'))
      throw new MovementRejection('STALE_MOVEMENT_EPOCH');
    const clock = await readWorldClock(tx, worldId, new Date(), true),
      settled = prepareDueContinuousMovement(state, row, clock, input.commandId);
    let current = settled.state,
      stored = settled.stored,
      epoch = settled.epoch;
    const events = [...settled.events];
    const prior = stored?.status === 'MOVING' ? stored.execution : null;
    if (input.action.kind === 'STOP' && !prior) {
      const response = responseFor(current, stored, epoch, clock, input.commandId);
      if (settled.changed) {
        await persistCandidate(
          tx,
          state,
          current,
          accountId,
          input.commandId,
          key,
          response,
          events,
        );
        await persistDueContinuousMovementRoute(tx, settled);
        return response;
      }
      await tx
        .insertInto('world_route_receipts')
        .values({
          world_id: worldId,
          company_id: companyId,
          account_id: accountId,
          command_id: input.commandId,
          request_key: key,
          response: { ...response },
          resulting_public_revision: response.publicRevision,
        })
        .execute();
      return response;
    }
    current = advance(
      current,
      clock.tick,
      `${input.commandId}.advance`,
      prior ?? undefined,
      prior?.plan.planId,
      events,
    );
    epoch = (BigInt(epoch) + 1n).toString();
    if (input.action.kind === 'MOVE_TO') {
      if (input.action.mapEdition !== CONTINUOUS_WORLD_REGION.mapEdition)
        throw new MovementRejection('MAP_EDITION_MISMATCH');
      const from = prior
        ? positionAt(prior.plan, clock.nowMs)
        : continuousLocationPoint(current.economy.lifecycle.parties[0]!.location);
      if (!from) throw new MovementRejection('MOVEMENT_NOT_ALLOWED');
      const target = input.action.target,
        site = target.kind === 'SITE' ? continuousSite(target.siteId) : undefined;
      if (target.kind === 'SITE' && !site) throw new MovementRejection('TARGET_BLOCKED');
      const goal =
        site?.anchorFp ??
        (target.kind === 'TERRAIN' ? { xFp: target.xFp, zFp: target.zFp } : undefined);
      if (!goal) throw new MovementRejection('TARGET_BLOCKED');
      if (goal.xFp < -8192 || goal.xFp >= 8192 || goal.zFp < -6144 || goal.zFp >= 6144)
        throw new MovementRejection('OUT_OF_BOUNDS');
      if (
        from.xMicroFp === String(goal.xFp * 65536) &&
        from.zMicroFp === String(goal.zFp * 65536)
      ) {
        if (prior) {
          current = applyContinuousMove(
            current,
            {
              root: root(current),
              partyId: party.partyId,
              segmentId: prior.plan.planId,
              prior,
              next: null,
              nowMs: clock.nowMs,
            },
            events,
          );
          stored = { ...stored!, status: 'STOPPED', lastBoundaryMs: clock.nowMs };
        } else {
          epoch = settled.epoch;
          current = settled.state;
        }
        const response = {
          ...responseFor(current, stored, epoch, clock, input.commandId),
          result: prior ? ('ACCEPTED' as const) : ('ALREADY_AT_TARGET' as const),
        };
        if (prior || settled.changed) {
          await persistCandidate(
            tx,
            state,
            current,
            accountId,
            input.commandId,
            key,
            response,
            events,
          );
          if (stored) await storeRoute(tx, current, stored, epoch);
          else await persistDueContinuousMovementRoute(tx, settled);
        } else
          await tx
            .insertInto('world_route_receipts')
            .values({
              world_id: worldId,
              company_id: companyId,
              account_id: accountId,
              command_id: input.commandId,
              request_key: key,
              response: { ...response },
              resulting_public_revision: response.publicRevision,
            })
            .execute();
        return response;
      }
      if (!isContinuousPointWalkable(field, goal)) throw new MovementRejection('TARGET_BLOCKED');
      const path = findTravelPath(
        field,
        { xFp: Number(from.xMicroFp) / 65536, zFp: Number(from.zMicroFp) / 65536 },
        goal,
      );
      if (!path || path.length < 2) throw new MovementRejection('NO_PATH');
      const plan = compileMovementPlan({
        field,
        path,
        startedAtMs: clock.nowMs,
        movementEpoch: epoch,
        planId: randomUUID(),
      });
      const arrivesAt = campaignTickAt(
        createCampaignClock(clock.epochMs, clock.startingTick),
        plan.arrivesAtMs,
      );
      let dangerAuthorization: ContinuousCompanyExecution['dangerAuthorization'];
      if (plan.dangerAreaIds.length) {
        if (plan.dangerAreaIds.some((area) => area !== 'staraya-melnitsa-yard'))
          throw new MovementRejection('ROUTE_FORBIDDEN');
        const membership = await readDangerousRouteMembership(tx, worldId, companyId);
        const retained = stored?.execution.dangerAuthorization;
        const scopedRetained =
          retained &&
          retained.worldId === worldId &&
          retained.companyId === companyId &&
          retained.partyId === party.partyId &&
          isDangerousRouteContract(retained.instanceId, retained.profileId);
        const location = current.economy.lifecycle.parties[0]!.location;
        const newTrip =
          site?.siteId === FIRST_HUNT_TRAVEL_SCOPE.toSiteId &&
          membership &&
          ((location.kind === 'AT' && location.siteId === FIRST_HUNT_TRAVEL_SCOPE.fromSiteId) ||
            (scopedRetained && retained.purpose === 'NEW'));
        const returnTrip =
          site?.siteId === FIRST_HUNT_TRAVEL_SCOPE.fromSiteId &&
          (scopedRetained ||
            (location.kind === 'AT' &&
              location.siteId === FIRST_HUNT_TRAVEL_SCOPE.toSiteId &&
              membership));
        if (!newTrip && !returnTrip) throw new MovementRejection('ROUTE_FORBIDDEN');
        const grant = membership ?? retained!;
        dangerAuthorization = {
          worldId,
          companyId,
          partyId: party.partyId,
          instanceId: grant.instanceId,
          profileId: grant.profileId,
          termsDigest: grant.termsDigest,
          purpose: newTrip ? 'NEW' : 'RETURN',
        };
      }
      const execution: ContinuousCompanyExecution = {
        schemaVersion: 2,
        partyId: party.partyId,
        regionVersion: plan.mapEdition,
        routeEpoch: epoch,
        startedAt: clock.tick,
        arrivesAt,
        plan,
        siteId: site?.siteId ?? null,
        ...(dangerAuthorization ? { dangerAuthorization } : {}),
      };
      current = applyContinuousMove(
        current,
        {
          root: root(current),
          partyId: party.partyId,
          segmentId: plan.planId,
          prior,
          next: execution,
          nowMs: clock.nowMs,
        },
        events,
      );
      {
        // Forecast the actual accepted schedule; unavailable stock must not strand a saved trip.
        const supply = prepareTravelFoodFacts(current, arrivesAt, `${input.commandId}.supply`, {
          kind: 'FREE_MOVEMENT',
          execution,
          segmentId: plan.planId,
          settledThroughTick: arrivesAt,
        });
        if (supply.kind !== 'PREPARED')
          throw new MovementRejection(
            supply.reason === 'INSUFFICIENT_ITEMS'
              ? 'KNOWN_SUPPLY_SHORTAGE'
              : 'MOVEMENT_NOT_ALLOWED',
          );
      }
      stored = {
        kind: 'CONTINUOUS_MOVEMENT',
        acceptedByAccountId: accountId,
        execution,
        status: 'MOVING',
        lastBoundaryMs: clock.nowMs,
      };
    } else if (prior) {
      current = applyContinuousMove(
        current,
        {
          root: root(current),
          partyId: party.partyId,
          segmentId: prior.plan.planId,
          prior,
          next: null,
          nowMs: clock.nowMs,
        },
        events,
      );
      stored = { ...stored!, status: 'STOPPED', lastBoundaryMs: clock.nowMs };
    }
    const response = responseFor(current, stored, epoch, clock, input.commandId);
    await persistCandidate(tx, state, current, accountId, input.commandId, key, response, events);
    if (stored) await storeRoute(tx, current, stored, epoch);
    return response;
  });
}
export async function handleContinuousMovementPost(
  request: FastifyRequest,
  reply: FastifyReply,
  options: ContinuousMovementOptions,
) {
  const input = parseContinuousMovementRequest(request.body);
  if (!input)
    return reply
      .code(400)
      .send({ schemaVersion: 2, result: 'REJECTED', commandId: null, code: 'INVALID_COMMAND' });
  const accountId = await resolveSessionAccount(request, options.database);
  if (!accountId)
    return reply.code(401).send({
      schemaVersion: 2,
      result: 'REJECTED',
      commandId: input.commandId,
      code: 'AUTH_REQUIRED',
    });
  try {
    return reply
      .header('Cache-Control', 'no-store')
      .send(
        await executeContinuousMovement(
          options.database,
          options.worldId,
          accountId,
          request.headers[WORLD_EXPECTED_COMPANY_ID_HEADER],
          input,
        ),
      );
  } catch (error) {
    if (error instanceof MovementRejection || error instanceof RangeError) {
      const code =
        error instanceof MovementRejection
          ? error.code
          : ['ROUTE_TOO_COMPLEX', 'MOVEMENT_NOT_ALLOWED', 'TRUSTED_TIME_UNAVAILABLE'].includes(
                error.message,
              )
            ? (error.message as RejectionCode)
            : 'NO_PATH';
      return reply
        .code(
          code === 'NOT_AUTHORIZED'
            ? 403
            : code === 'AUTH_REQUIRED'
              ? 401
              : code === 'TRUSTED_TIME_UNAVAILABLE'
                ? 503
                : [
                      'STALE_REVISION',
                      'STALE_MOVEMENT_EPOCH',
                      'COMMAND_ID_CONFLICT',
                      'MAP_EDITION_MISMATCH',
                    ].includes(code)
                  ? 409
                  : 422,
        )
        .send({ schemaVersion: 2, result: 'REJECTED', commandId: input.commandId, code });
    }
    throw error;
  }
}

export async function processContinuousMovementCandidate(
  database: ContinuousMovementOptions['database'],
  worldId: string,
  candidate: { companyId: string; partyId: string; acceptedByAccountId: string },
  now: Date = new Date(),
) {
  return database.transaction().execute(async (tx) => {
    const account = await tx
      .selectFrom('identity_accounts')
      .select('id')
      .where('id', '=', candidate.acceptedByAccountId)
      .forUpdate()
      .executeTakeFirst();
    if (
      !account ||
      (await findOwnedCompanyId(tx, worldId, candidate.acceptedByAccountId)) !== candidate.companyId
    )
      return;
    const state = await lockCompanyAggregate(tx, worldId, candidate.companyId);
    if (!state) return;
    const row = await readPartyRoute(tx, worldId, candidate.companyId, candidate.partyId, true);
    if (
      !row ||
      row.status !== 'IN_TRANSIT' ||
      !object(row.accepted_route) ||
      row.accepted_route['acceptedByAccountId'] !== candidate.acceptedByAccountId ||
      !['FREE_MOVEMENT', 'CONTINUOUS_MOVEMENT'].includes(String(row.accepted_route['kind']))
    )
      return;
    const clock = await readWorldClock(tx, worldId, now, true),
      commandId = randomUUID();
    if (row.accepted_route['kind'] === 'FREE_MOVEMENT') {
      const e = row.accepted_route['execution'] as FreeMovementExecution;
      if (BigInt(clock.tick) < BigInt(e.arrivesAt)) return;
    } else if (BigInt(clock.nowMs) < BigInt(readContinuous(row)!.execution.plan.arrivesAtMs))
      return;
    const settled = prepareDueContinuousMovement(state, row, clock, commandId);
    if (!settled.changed) return;
    const response = responseFor(settled.state, settled.stored, settled.epoch, clock, commandId);
    await persistCandidate(
      tx,
      state,
      settled.state,
      candidate.acceptedByAccountId,
      commandId,
      canonicalJson({ kind: 'SYSTEM_ARRIVAL', segmentId: row.segment_id }),
      response,
      settled.events,
    );
    await persistDueContinuousMovementRoute(tx, settled);
  });
}
