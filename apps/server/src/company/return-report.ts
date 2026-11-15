import { randomUUID } from 'node:crypto';
import { sql, type Kysely, type Transaction } from 'kysely';
import {
  COMPANY_RULES,
  isEntityId,
  ordinaryContractProfile,
  readOrdinaryContractState,
} from '@warwrit/game-core';
import type { CompanyCombatAggregateState, OrdinaryContractState } from '@warwrit/game-core';
import type {
  CompanyReturnReportAcknowledgeRequestDto,
  CompanyReturnReportAcknowledgeResponseDto,
  CompanyReturnReportDto,
  CompanyReturnReportEventDto,
  CompanyReturnReportEventType,
  CompanyReturnReportReadResponseDto,
} from '@warwrit/protocol';
import {
  COMPANY_RETURN_REPORT_EVENT_TYPES,
  WORLD_EXPECTED_COMPANY_ID_HEADER,
} from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import type { DatabaseSchema } from '../db/database.js';
import { lockIdentityAccount, resolveSessionAccount } from '../auth/session.js';
import { findOwnedCompanyId, lockCompanyAggregate } from './repository.js';
import { observeLocalCompanyConditions } from './observation.js';
import { projectPayroll } from './payroll-view.js';

interface FoodBaseline {
  readonly sourceId: string;
  readonly membershipId: string;
  readonly unitsConsumed: string;
  readonly channel: 'STOCK' | 'PROVIDER';
}

interface AuditRow {
  readonly sequence: string;
  readonly event: unknown;
}

interface ReturnReportCursor {
  readonly world_id: string;
  readonly company_id: string;
  readonly acknowledged_tick: string;
  readonly acknowledged_event_sequence: string;
  readonly acknowledged_movement_count: string;
  readonly acknowledged_food: unknown;
  readonly acknowledged_contract_outcomes: unknown;
  readonly acknowledged_owed_q: string;
  readonly acknowledged_debt_q: string;
  readonly last_acknowledged_report_id: string | null;
  readonly offered_report_id: string | null;
  readonly offered_tick: string | null;
  readonly offered_event_sequence: string | null;
  readonly offered_movement_count: string | null;
  readonly offered_food: unknown | null;
  readonly offered_contract_outcomes: unknown;
  readonly offered_owed_q: string | null;
  readonly offered_debt_q: string | null;
  readonly offered_report: unknown | null;
}

const allowedEventTypes = new Set<string>(COMPANY_RETURN_REPORT_EVENT_TYPES);

function isReportableAuditLifecycleEvent(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const type = (value as Record<string, unknown>)['type'];
  return typeof type === 'string' && allowedEventTypes.has(type);
}

interface FoodDelta {
  readonly unitsConsumed: bigint;
  readonly includesLateSettlement: boolean;
  readonly earliestFromTick?: string;
}

export function settledReturnReportTick(state: CompanyCombatAggregateState): string | undefined {
  const physical = state.economy.physical;
  if (!physical) return undefined;
  return [
    state.economy.lifecycle.campaignTick,
    state.economy.finance.processedTick,
    physical.processedTick,
  ]
    .map(String)
    .reduce((minimum, tick) => (BigInt(tick) < BigInt(minimum) ? tick : minimum));
}

function contractOutcomeIdentity(sourceEventId: string): string {
  return `ci.m1.empty-watch-record.01:${sourceEventId}`;
}

function foodSnapshot(state: CompanyCombatAggregateState, throughTick: string): FoodBaseline[] {
  return (state.economy.physical?.food ?? [])
    .filter((entry) => BigInt(entry.toTick) <= BigInt(throughTick))
    .map((entry) => ({
      sourceId: entry.sourceId,
      membershipId: entry.membershipId,
      unitsConsumed: entry.unitsConsumed,
      channel: entry.channel,
    }));
}

function parseFoodBaseline(value: unknown): FoodBaseline[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const food: FoodBaseline[] = [];
  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') return undefined;
    const candidate = entry as Record<string, unknown>;
    if (
      typeof candidate['sourceId'] !== 'string' ||
      typeof candidate['membershipId'] !== 'string' ||
      typeof candidate['unitsConsumed'] !== 'string' ||
      !/^(0|[1-9][0-9]*)$/.test(candidate['unitsConsumed']) ||
      (candidate['channel'] !== 'STOCK' && candidate['channel'] !== 'PROVIDER')
    )
      return undefined;
    food.push(candidate as unknown as FoodBaseline);
  }
  return food;
}

function parseContractOutcomeIds(value: unknown): Set<string> | undefined {
  if (!Array.isArray(value)) return undefined;
  const identities = new Set<string>();
  for (const entry of value) {
    if (entry === null || typeof entry !== 'object') return undefined;
    const candidate = entry as Record<string, unknown>;
    const sourceEventId = candidate['sourceEventId'];
    if (
      candidate['instanceId'] !== 'ci.m1.empty-watch-record.01' ||
      typeof sourceEventId !== 'string' ||
      sourceEventId.length === 0
    )
      return undefined;
    identities.add(contractOutcomeIdentity(sourceEventId));
  }
  return identities;
}

function serializeContractOutcomeIds(identities: ReadonlySet<string>): string {
  return JSON.stringify(
    [...identities].flatMap((identity) => {
      const prefix = 'ci.m1.empty-watch-record.01:';
      return identity.startsWith(prefix) && identity.length > prefix.length
        ? [
            {
              instanceId: 'ci.m1.empty-watch-record.01' as const,
              sourceEventId: identity.slice(prefix.length),
            },
          ]
        : [];
    }),
  );
}

export function consumedReturnReportRations(
  state: CompanyCombatAggregateState,
  beforeValue: unknown,
  fromTick: string,
  throughTick: string,
): FoodDelta | undefined {
  const before = parseFoodBaseline(beforeValue);
  if (!before) return undefined;
  const prior = new Map(before.map((entry) => [`${entry.sourceId}:${entry.membershipId}`, entry]));
  let result = 0n;
  let earliestFromTick: string | undefined;
  let includesLateSettlement = false;
  for (const entry of state.economy.physical?.food ?? []) {
    if (BigInt(entry.toTick) > BigInt(throughTick) || entry.channel !== 'STOCK') continue;
    const old = prior.get(`${entry.sourceId}:${entry.membershipId}`);
    const delta = BigInt(entry.unitsConsumed) - BigInt(old?.unitsConsumed ?? '0');
    if (delta < 0n) return undefined;
    result += delta;
    if (delta > 0n) {
      const start = String(entry.fromTick);
      if (earliestFromTick === undefined || BigInt(start) < BigInt(earliestFromTick))
        earliestFromTick = start;
      if (BigInt(start) < BigInt(fromTick)) includesLateSettlement = true;
    }
  }
  return {
    unitsConsumed: result,
    includesLateSettlement,
    ...(earliestFromTick === undefined ? {} : { earliestFromTick }),
  };
}

export function settledMovementCount(
  state: CompanyCombatAggregateState,
  throughTick: string,
): number | undefined {
  const movements = state.economy.finance.movements;
  let count = 0;
  let passedHorizon = false;
  for (const movement of movements) {
    if (BigInt(movement.atTick) <= BigInt(throughTick)) {
      if (passedHorizon) return undefined;
      count += 1;
    } else {
      passedHorizon = true;
    }
  }
  return count;
}

export function accruedReturnReportWagesQ(
  state: CompanyCombatAggregateState,
  fromTick: string,
  toTick: string,
): bigint {
  let total = 0n;
  for (const claim of state.economy.finance.claims) {
    for (const period of claim.earned) {
      if (period.maintenanceId !== null) continue;
      const from =
        BigInt(period.fromTick) > BigInt(fromTick) ? BigInt(period.fromTick) : BigInt(fromTick);
      const to = BigInt(period.toTick) < BigInt(toTick) ? BigInt(period.toTick) : BigInt(toTick);
      if (to > from) total += (to - from) * BigInt(period.dailyWageMilli);
    }
  }
  return total;
}

function currentDebtQ(state: CompanyCombatAggregateState): bigint {
  return state.economy.finance.obligations.reduce(
    (sum, obligation) => sum + BigInt(obligation.amountQ),
    0n,
  );
}

export function returnReportElapsedDays(ticks: bigint): string {
  const perDay = BigInt(COMPANY_RULES.ticksPerDay);
  const whole = ticks / perDay;
  const remainder = (ticks % perDay)
    .toString()
    .padStart(String(COMPANY_RULES.ticksPerDay).length - 1, '0');
  return remainder.replace(/0+$/, '') ? `${whole}.${remainder.replace(/0+$/, '')}` : String(whole);
}

export function projectReturnReportEvent(
  value: unknown,
  throughTick: string,
  knownEventIds: ReadonlySet<string>,
  knownCharacterIds: ReadonlySet<string>,
): CompanyReturnReportEventDto | undefined {
  if (value === null || typeof value !== 'object') return undefined;
  const event = value as { id?: unknown; type?: unknown; atTick?: unknown; subjectIds?: unknown };
  if (
    typeof event.id !== 'string' ||
    !knownEventIds.has(event.id) ||
    typeof event.type !== 'string' ||
    !allowedEventTypes.has(event.type) ||
    typeof event.atTick !== 'string' ||
    !/^(0|[1-9][0-9]*)$/.test(event.atTick) ||
    BigInt(event.atTick) > BigInt(throughTick) ||
    !Array.isArray(event.subjectIds) ||
    !event.subjectIds.every(
      (id) => typeof id === 'string' && isEntityId(id) && knownCharacterIds.has(id),
    )
  )
    return undefined;
  return {
    type: event.type as CompanyReturnReportEventType,
    atTick: event.atTick,
    subjectIds: event.subjectIds as string[],
  };
}

function currentOwedQ(state: CompanyCombatAggregateState): string | undefined {
  return projectPayroll(state.economy, state.economy.lifecycle.companyId)?.owedQ;
}

function safeMovementCount(value: string): number | undefined {
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : undefined;
}

export function hasReturnReportFacts(input: {
  readonly elapsedTicks: bigint;
  readonly rationsConsumed: bigint;
  readonly paidQ: bigint;
  readonly accruedQ: bigint;
  readonly oldOwedQ: bigint;
  readonly owedQ: bigint;
  readonly oldDebtQ: bigint;
  readonly debtQ: bigint;
  readonly eventCount: number;
  readonly contractOutcomeCount?: number;
}): boolean {
  return (
    input.rationsConsumed > 0n ||
    input.paidQ > 0n ||
    input.accruedQ > 0n ||
    input.owedQ !== input.oldOwedQ ||
    input.debtQ !== input.oldDebtQ ||
    input.eventCount > 0 ||
    (input.contractOutcomeCount ?? 0) > 0
  );
}

export function projectEmptyWatchReturnOutcome(
  state: OrdinaryContractState | undefined,
  companyId: string,
  fromTick: string,
  throughTick: string,
  acknowledgedOutcomeIds: ReadonlySet<string> = new Set(),
): NonNullable<CompanyReturnReportDto['contractOutcomes']> {
  if (!state?.outcome || BigInt(state.outcome.atTick) < BigInt(fromTick)) return [];
  if (BigInt(state.outcome.atTick) > BigInt(throughTick)) return [];
  const terminal = state.facts.find(
    (fact) =>
      fact.companyId === companyId &&
      fact.sourceEventId === state.outcome!.sourceEventId &&
      fact.atTick === state.outcome!.atTick &&
      (fact.slotId === 'empty-watch-sack-handed-over' ||
        fact.slotId === 'empty-watch-proof-destroyed'),
  );
  if (!terminal) return [];
  if (acknowledgedOutcomeIds.has(contractOutcomeIdentity(terminal.sourceEventId))) return [];
  return [
    {
      instanceId: 'ci.m1.empty-watch-record.01',
      outcome:
        terminal.slotId === 'empty-watch-sack-handed-over'
          ? 'PROKOP_HANDED_OVER'
          : 'PROOF_DESTROYED_OLD_FORD_REVEALED',
      atTick: terminal.atTick,
    },
  ];
}

async function emptyWatchContractState(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
): Promise<OrdinaryContractState | undefined> {
  const profile = ordinaryContractProfile('ci.m1.empty-watch-record.01');
  if (!profile) return undefined;
  const row = await transaction
    .selectFrom('ordinary_contracts')
    .select(['profile_id', 'state'])
    .where('world_id', '=', worldId)
    .where('instance_id', '=', profile.instanceId)
    .executeTakeFirst();
  if (!row || row.profile_id !== profile.definitionId) return undefined;
  return readOrdinaryContractState(profile, row.state, row.profile_id);
}

function companyEmptyWatchOutcomeIdentity(
  state: OrdinaryContractState | undefined,
  companyId: string,
  throughTick: string,
): string | undefined {
  if (
    !state?.outcome ||
    state.outcome.companyId !== companyId ||
    BigInt(state.outcome.atTick) > BigInt(throughTick)
  )
    return undefined;
  const terminal = state.facts.find(
    (fact) =>
      fact.companyId === companyId &&
      fact.sourceEventId === state.outcome!.sourceEventId &&
      fact.atTick === state.outcome!.atTick &&
      (fact.slotId === 'empty-watch-sack-handed-over' ||
        fact.slotId === 'empty-watch-proof-destroyed'),
  );
  return terminal ? contractOutcomeIdentity(terminal.sourceEventId) : undefined;
}

export function classifyReturnReportAcknowledgement(
  cursor: Pick<ReturnReportCursor, 'last_acknowledged_report_id' | 'offered_report_id'> | undefined,
  reportId: string,
): 'DUPLICATE' | 'CURRENT' | 'STALE' {
  if (cursor?.last_acknowledged_report_id === reportId) return 'DUPLICATE';
  return cursor?.offered_report_id === reportId ? 'CURRENT' : 'STALE';
}

function parseAckRequest(value: unknown): CompanyReturnReportAcknowledgeRequestDto | undefined {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const body = value as Record<string, unknown>;
  if (
    Object.keys(body).sort().join(',') !== 'reportId,schemaVersion' ||
    body['schemaVersion'] !== 1 ||
    typeof body['reportId'] !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body['reportId'])
  )
    return undefined;
  return body as unknown as CompanyReturnReportAcknowledgeRequestDto;
}

async function auditRows(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  afterSequence: string,
): Promise<AuditRow[] | undefined> {
  if (!/^(0|[1-9][0-9]*)$/.test(afterSequence)) return undefined;
  const rows = await transaction
    .selectFrom('company_audit_events')
    .select([sql<string>`sequence::text`.as('sequence'), 'event'])
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .where(sql<boolean>`sequence > ${afterSequence}::bigint`)
    .orderBy('sequence', 'asc')
    .execute();
  if (rows.some((row) => !/^(0|[1-9][0-9]*)$/.test(row.sequence))) return undefined;
  return rows;
}

async function getReturnReport(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  state: CompanyCombatAggregateState,
): Promise<CompanyReturnReportReadResponseDto> {
  const throughTick = settledReturnReportTick(state);
  const owedQ = currentOwedQ(state);
  const movementCount =
    throughTick === undefined ? undefined : settledMovementCount(state, throughTick);
  if (throughTick === undefined || owedQ === undefined || movementCount === undefined)
    return { report: null };
  const debtQ = currentDebtQ(state).toString();

  let cursor = await transaction
    .selectFrom('company_return_report_cursors')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .forUpdate()
    .executeTakeFirst();
  if (!cursor) {
    const initialRows = await auditRows(transaction, worldId, companyId, '0');
    if (!initialRows) return { report: null };
    let latestSequence = 0n;
    for (const row of initialRows) {
      if (!isReportableAuditLifecycleEvent(row.event)) {
        latestSequence = BigInt(row.sequence);
        continue;
      }
      const atTick = row.event['atTick'];
      if (typeof atTick !== 'string' || !/^(0|[1-9][0-9]*)$/.test(atTick)) return { report: null };
      if (BigInt(atTick) > BigInt(throughTick)) break;
      latestSequence = BigInt(row.sequence);
    }
    const initialContractOutcome = companyEmptyWatchOutcomeIdentity(
      await emptyWatchContractState(transaction, worldId),
      companyId,
      throughTick,
    );
    const initialOutcomeIds = new Set(
      initialContractOutcome === undefined ? [] : [initialContractOutcome],
    );
    await transaction
      .insertInto('company_return_report_cursors')
      .values({
        world_id: worldId,
        company_id: companyId,
        acknowledged_tick: throughTick,
        acknowledged_event_sequence: latestSequence.toString(),
        acknowledged_movement_count: String(movementCount),
        acknowledged_food: JSON.stringify(foodSnapshot(state, throughTick)),
        acknowledged_contract_outcomes: serializeContractOutcomeIds(initialOutcomeIds),
        acknowledged_owed_q: owedQ,
        acknowledged_debt_q: debtQ,
        last_acknowledged_report_id: null,
        offered_report_id: null,
        offered_tick: null,
        offered_event_sequence: null,
        offered_movement_count: null,
        offered_food: null,
        offered_contract_outcomes: JSON.stringify([]),
        offered_owed_q: null,
        offered_debt_q: null,
        offered_report: null,
      })
      .execute();
    return { report: null };
  }
  cursor = await transaction
    .selectFrom('company_return_report_cursors')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .forUpdate()
    .executeTakeFirstOrThrow();
  if (cursor.offered_report !== null) {
    return { report: cursor.offered_report as CompanyReturnReportDto };
  }

  const fromTick = cursor.acknowledged_tick;
  if (BigInt(throughTick) < BigInt(fromTick)) return { report: null };
  const acknowledgedContractOutcomeIds = parseContractOutcomeIds(
    cursor.acknowledged_contract_outcomes,
  );
  if (!acknowledgedContractOutcomeIds) return { report: null };
  const acknowledgedMovementCount = safeMovementCount(cursor.acknowledged_movement_count);
  const consumed = consumedReturnReportRations(
    state,
    cursor.acknowledged_food,
    cursor.acknowledged_tick,
    throughTick,
  );
  const oldDebtQ = BigInt(cursor.acknowledged_debt_q);
  const oldOwedQ = BigInt(cursor.acknowledged_owed_q);
  if (acknowledgedMovementCount === undefined || consumed === undefined) return { report: null };
  const paidMovements = state.economy.finance.movements.slice(
    acknowledgedMovementCount,
    movementCount,
  );
  const paidQ = paidMovements
    .filter(
      (movement) => movement.purpose === 'WAGE' && BigInt(movement.atTick) <= BigInt(throughTick),
    )
    .reduce((sum, movement) => sum + BigInt(movement.amountQ), 0n);
  const accruedQ = accruedReturnReportWagesQ(state, fromTick, throughTick);
  const rows = await auditRows(transaction, worldId, companyId, cursor.acknowledged_event_sequence);
  if (!rows) return { report: null };
  let eventSequence = BigInt(cursor.acknowledged_event_sequence);
  const events: CompanyReturnReportEventDto[] = [];
  const knownEventIds = new Set(state.economy.lifecycle.knowledge.eventIds);
  const knownCharacterIds = new Set(
    state.economy.lifecycle.knowledge.characters.map((character) => character.identity.characterId),
  );
  for (const row of rows) {
    if (!isReportableAuditLifecycleEvent(row.event)) {
      eventSequence = BigInt(row.sequence);
      continue;
    }
    const rawAtTick = row.event['atTick'];
    if (typeof rawAtTick !== 'string' || !/^(0|[1-9][0-9]*)$/.test(rawAtTick))
      return { report: null };
    if (BigInt(rawAtTick) > BigInt(throughTick)) break;
    eventSequence = BigInt(row.sequence);
    const event = projectReturnReportEvent(
      row.event,
      throughTick,
      knownEventIds,
      knownCharacterIds,
    );
    if (!event) continue;
    events.push(event);
  }
  const emptyWatchState = await emptyWatchContractState(transaction, worldId);
  const contractOutcomes = projectEmptyWatchReturnOutcome(
    emptyWatchState,
    companyId,
    fromTick,
    throughTick,
    acknowledgedContractOutcomeIds,
  );
  const elapsedTicks = BigInt(throughTick) - BigInt(fromTick);
  if (
    !hasReturnReportFacts({
      elapsedTicks,
      rationsConsumed: consumed.unitsConsumed,
      paidQ,
      accruedQ,
      oldOwedQ,
      owedQ: BigInt(owedQ),
      oldDebtQ,
      debtQ: BigInt(debtQ),
      eventCount: events.length,
      contractOutcomeCount: contractOutcomes.length,
    })
  )
    return { report: null };

  const report: CompanyReturnReportDto = {
    schemaVersion: 1,
    reportId: randomUUID(),
    fromTick,
    toTick: throughTick,
    elapsedCampaignTicks: elapsedTicks.toString(),
    elapsedDays: returnReportElapsedDays(elapsedTicks),
    rationsConsumed: consumed.unitsConsumed.toString(),
    includesLateFoodSettlement: consumed.includesLateSettlement,
    ...(consumed.earliestFromTick === undefined
      ? {}
      : { earliestFoodFromTick: consumed.earliestFromTick }),
    wages: { accruedQ: accruedQ.toString(), paidQ: paidQ.toString(), currentOwedQ: owedQ },
    debt: { currentQ: debtQ },
    events,
    ...(contractOutcomes.length > 0 ? { contractOutcomes } : {}),
  };
  const offeredContractOutcomeIds = new Set(acknowledgedContractOutcomeIds);
  if (contractOutcomes.length > 0) {
    const identity = companyEmptyWatchOutcomeIdentity(emptyWatchState, companyId, throughTick);
    if (identity !== undefined) offeredContractOutcomeIds.add(identity);
  }
  await transaction
    .updateTable('company_return_report_cursors')
    .set({
      updated_at: sql<Date>`now()`,
      offered_report_id: report.reportId,
      offered_tick: throughTick,
      offered_event_sequence: eventSequence.toString(),
      offered_movement_count: String(movementCount),
      offered_food: JSON.stringify(foodSnapshot(state, throughTick)),
      offered_contract_outcomes: serializeContractOutcomeIds(offeredContractOutcomeIds),
      offered_owed_q: owedQ,
      offered_debt_q: debtQ,
      offered_report: report,
    })
    .where('world_id', '=', worldId)
    .where('company_id', '=', companyId)
    .executeTakeFirstOrThrow();
  return { report };
}

export function registerCompanyReturnReportRoutes(
  app: FastifyInstance,
  options: { readonly database: Kysely<DatabaseSchema>; readonly worldId: string },
): void {
  app.get('/company/return-report', async (request, reply) => {
    const accountId = await resolveSessionAccount(request, options.database);
    if (accountId === undefined) return reply.code(401).send({ error: 'authentication required' });
    return options.database.transaction().execute(async (transaction) => {
      if (!(await lockIdentityAccount(transaction, accountId)))
        return reply.code(401).send({ error: 'authentication required' });
      const companyId = await findOwnedCompanyId(transaction, options.worldId, accountId);
      if (companyId === undefined) return reply.code(403).send({ error: 'company required' });
      const expectedCompanyId = request.headers[WORLD_EXPECTED_COMPANY_ID_HEADER];
      if (expectedCompanyId !== undefined && expectedCompanyId !== companyId)
        return reply.code(409).send({ error: 'company scope changed' });
      const loaded = await lockCompanyAggregate(transaction, options.worldId, companyId);
      if (loaded === undefined) throw new Error('Owned company snapshot is unavailable');
      const observed = await observeLocalCompanyConditions(transaction, loaded, new Date());
      return getReturnReport(transaction, options.worldId, companyId, observed);
    });
  });

  app.post('/company/return-report/ack', async (request, reply) => {
    const input = parseAckRequest(request.body);
    if (!input) return reply.code(400).send({ error: 'invalid report acknowledgement' });
    const accountId = await resolveSessionAccount(request, options.database);
    if (accountId === undefined) return reply.code(401).send({ error: 'authentication required' });
    return options.database.transaction().execute(async (transaction) => {
      if (!(await lockIdentityAccount(transaction, accountId)))
        return reply.code(401).send({ error: 'authentication required' });
      const companyId = await findOwnedCompanyId(transaction, options.worldId, accountId);
      if (companyId === undefined) return reply.code(403).send({ error: 'company required' });
      const expectedCompanyId = request.headers[WORLD_EXPECTED_COMPANY_ID_HEADER];
      if (expectedCompanyId !== undefined && expectedCompanyId !== companyId)
        return reply.code(409).send({ error: 'company scope changed' });
      if (!(await lockCompanyAggregate(transaction, options.worldId, companyId)))
        throw new Error('Owned company snapshot is unavailable');
      const cursor = await transaction
        .selectFrom('company_return_report_cursors')
        .selectAll()
        .where('world_id', '=', options.worldId)
        .where('company_id', '=', companyId)
        .forUpdate()
        .executeTakeFirst();
      const acknowledgement = classifyReturnReportAcknowledgement(cursor, input.reportId);
      if (acknowledgement === 'DUPLICATE') {
        return { ok: true, duplicate: true } satisfies CompanyReturnReportAcknowledgeResponseDto;
      }
      const offeredContractOutcomeIds = parseContractOutcomeIds(cursor?.offered_contract_outcomes);
      if (
        acknowledgement !== 'CURRENT' ||
        !cursor ||
        cursor.offered_tick === null ||
        cursor.offered_event_sequence === null ||
        cursor.offered_movement_count === null ||
        cursor.offered_food === null ||
        !offeredContractOutcomeIds ||
        cursor.offered_owed_q === null ||
        cursor.offered_debt_q === null
      )
        return reply.code(409).send({ error: 'report is not awaiting acknowledgement' });
      await transaction
        .updateTable('company_return_report_cursors')
        .set({
          updated_at: sql<Date>`now()`,
          acknowledged_tick: cursor.offered_tick,
          acknowledged_event_sequence: cursor.offered_event_sequence,
          acknowledged_movement_count: cursor.offered_movement_count,
          acknowledged_food: JSON.stringify(cursor.offered_food),
          acknowledged_contract_outcomes: serializeContractOutcomeIds(offeredContractOutcomeIds),
          acknowledged_owed_q: cursor.offered_owed_q,
          acknowledged_debt_q: cursor.offered_debt_q,
          last_acknowledged_report_id: input.reportId,
          offered_report_id: null,
          offered_tick: null,
          offered_event_sequence: null,
          offered_movement_count: null,
          offered_food: null,
          offered_contract_outcomes: JSON.stringify([]),
          offered_owed_q: null,
          offered_debt_q: null,
          offered_report: null,
        })
        .where('world_id', '=', options.worldId)
        .where('company_id', '=', companyId)
        .executeTakeFirstOrThrow();
      return { ok: true, duplicate: false } satisfies CompanyReturnReportAcknowledgeResponseDto;
    });
  });
}
