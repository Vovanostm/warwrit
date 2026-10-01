import { readRelationObservation } from './social.js';
import { COMPANY_RULES } from './definitions.js';
import { canonicalJson, plainObject, snapshotJson } from './input.js';
import {
  activeMembership,
  lifecycleId,
  person,
  sameLocation,
  validateLifecycleGraph,
} from './lifecycle-state.js';
import { isExactInteger, isEntityId, moneyQ, campaignTick } from './values.js';
import type { CampaignTick, MoneyQ } from './values.js';
import type { LifecycleState } from './lifecycle-types.js';
import { exactFraction, exactFractionInput } from './exact-fraction.js';
import type {
  CompanyEconomyState,
  CompanyFinance,
  EconomyContext,
  EconomyError,
  FinanceEvidence,
  FundingPool,
  LocalMoneyAccess,
  ServiceAccount,
  WageClaim,
  Wallet,
} from './economy-types.js';
import { ECONOMY_POLICY_VERSION, ECONOMY_SCHEMA_VERSION } from './economy-types.js';
import { isLifecycleReceiptShape } from './lifecycle-state.js';
import { farewellOutcomeInput } from './farewell-types.js';
import { companyLocationShape, hasExactStoredFields as shape } from './stored-shape.js';

export class EconomyViolation extends Error {
  constructor(readonly code: EconomyError) {
    super(code);
  }
}
export function requireEconomy(condition: unknown, code: EconomyError): asserts condition {
  if (!condition) throw new EconomyViolation(code);
}
export const q = (value: bigint): MoneyQ => moneyQ(value.toString());
export const t = (value: bigint): CampaignTick => campaignTick(value.toString());
export const day = BigInt(COMPANY_RULES.ticksPerDay);
export const min = (a: bigint, b: bigint): bigint => (a < b ? a : b);
export function own<T>(value: T): T {
  const result = snapshotJson(value);
  requireEconomy(result !== undefined, 'INVALID_SOURCE');
  return result as unknown as T;
}
export function financeFact<K extends FinanceEvidence['kind']>(
  context: EconomyContext,
  kind: K,
  id?: string,
): Extract<FinanceEvidence, { kind: K }> {
  const found = context.financeFacts.filter(
    (f) => f.kind === kind && (id === undefined || f.id === id),
  );
  requireEconomy(found.length === 1, 'INVALID_SOURCE');
  const fact = found[0]!;
  validateFinanceFact(fact, context);
  return fact as Extract<FinanceEvidence, { kind: K }>;
}
export function validateFinanceFact(fact: FinanceEvidence, context: EconomyContext): void {
  requireEconomy(
    isEntityId(fact.id) &&
      isEntityId(fact.sourceEventId) &&
      isExactInteger(fact.atTick) &&
      isExactInteger(fact.revision) &&
      fact.worldId === context.worldId &&
      fact.companyId === context.companyId &&
      (fact.revision === context.canonicalRevision ||
        (context.internalGrant?.evidenceRevision === fact.revision &&
          context.internalGrant.sourceEventId === fact.sourceEventId)) &&
      fact.atTick === context.atTick,
    'INVALID_SOURCE',
  );
}
export function accountFor(finance: CompanyFinance, membershipId: string): ServiceAccount {
  const account = finance.accounts.find((a) => a.membershipId === membershipId);
  requireEconomy(account, 'INVALID_STATE');
  return account;
}
export function walletFor(finance: CompanyFinance, walletId: string): Wallet {
  const wallet = finance.wallets.find((w) => w.walletId === walletId);
  requireEconomy(wallet, 'INVALID_SOURCE');
  return wallet;
}
export function poolWallet(finance: CompanyFinance, poolId: string): Wallet {
  const pool = finance.pools.find((p) => p.poolId === poolId);
  requireEconomy(pool, 'INVALID_SOURCE');
  return walletFor(finance, pool.walletId);
}
export function reservedQ(finance: CompanyFinance, walletId: string): bigint {
  const wageHolds = finance.reservations
    .filter((r) => r.walletId === walletId)
    .reduce((sum, r) => sum + BigInt(r.amountQ), 0n);
  const groups = new Map<string, { numerator: bigint; denominator: bigint }>();
  for (const obligation of finance.learningObligations ?? []) {
    if (obligation.payerWalletId !== walletId) continue;
    const key = canonicalJson([
      obligation.companyId,
      obligation.worldId,
      obligation.poolId,
      obligation.payerWalletId,
      obligation.recipientWalletId,
      obligation.recipient,
    ]);
    const accrued = obligation.accruedQ;
    const discharged = obligation.dischargedQ;
    const numerator =
      BigInt(accrued.numerator) * BigInt(discharged.denominator) -
      BigInt(discharged.numerator) * BigInt(accrued.denominator);
    const denominator = BigInt(accrued.denominator) * BigInt(discharged.denominator);
    requireEconomy(numerator >= 0n, 'INVALID_STATE');
    const previous = groups.get(key) ?? { numerator: 0n, denominator: 1n };
    const next = exactFraction(
      previous.numerator * denominator + numerator * previous.denominator,
      previous.denominator * denominator,
    );
    groups.set(key, { numerator: BigInt(next.numerator), denominator: BigInt(next.denominator) });
  }
  const learningHolds = [...groups.values()].reduce(
    (sum, value) => sum + (value.numerator + value.denominator - 1n) / value.denominator,
    0n,
  );
  return wageHolds + learningHolds;
}
export function spendableQ(finance: CompanyFinance, walletId: string): bigint {
  return BigInt(walletFor(finance, walletId).cashQ) - reservedQ(finance, walletId);
}
export function claimEarnedQ(claim: WageClaim): bigint {
  return claim.earned.reduce(
    (sum, p) => sum + (BigInt(p.toTick) - BigInt(p.fromTick)) * BigInt(p.dailyWageMilli),
    0n,
  );
}
export function claimCoveredQ(claim: WageClaim): bigint {
  return claim.earned
    .filter((p) => p.maintenanceId !== null)
    .reduce(
      (sum, p) => sum + (BigInt(p.toTick) - BigInt(p.fromTick)) * BigInt(p.dailyWageMilli),
      0n,
    );
}
export function actualOwedQ(claim: WageClaim): bigint {
  return claimEarnedQ(claim) - claimCoveredQ(claim) - BigInt(claim.paidQ);
}
export function committedQ(finance: CompanyFinance, claimId: string): bigint {
  return finance.reservations
    .filter((r) => r.claimId === claimId)
    .reduce((sum, r) => sum + BigInt(r.amountQ), 0n);
}
export function reportedOwedQ(finance: CompanyFinance, claim: WageClaim): bigint {
  return (
    BigInt(claim.reportedQ) -
    BigInt(claim.reportedCoveredQ) -
    BigInt(claim.paidQ) -
    committedQ(finance, claim.claimId)
  );
}
/** Earned liabilities belong to the same persistent person across successive service periods. */
export function claimsForCharacter(
  finance: CompanyFinance,
  lifecycle: LifecycleState,
  characterId: string,
): readonly WageClaim[] {
  const memberships = new Set<string>(
    lifecycle.memberships.filter((m) => m.characterId === characterId).map((m) => m.membershipId),
  );
  return finance.claims.filter((c) => memberships.has(c.membershipId));
}
export function oldestClaimFirst(a: WageClaim, b: WageClaim): number {
  if (a.dueAt !== b.dueAt) return BigInt(a.dueAt) < BigInt(b.dueAt) ? -1 : 1;
  return a.claimId === b.claimId ? 0 : a.claimId < b.claimId ? -1 : 1;
}
export function replaceAccount(finance: CompanyFinance, account: ServiceAccount): CompanyFinance {
  return {
    ...finance,
    accounts: finance.accounts.map((a) => (a.membershipId === account.membershipId ? account : a)),
  };
}
export function closeEpochs(
  finance: CompanyFinance,
  tick: CampaignTick,
  poolId: string,
  dueAt: CampaignTick,
): CompanyFinance {
  return {
    ...finance,
    epochs: finance.epochs.map((e) =>
      e.closedAt === null && e.poolId === poolId && e.dueAt === dueAt
        ? { ...e, closedAt: tick }
        : e,
    ),
  };
}
/** Existing persisted cash is explicit input; this constructor does not issue any funds. */
export function createCompanyEconomyState(
  lifecycle: LifecycleState,
  wallets: readonly Wallet[],
  pools: readonly FundingPool[],
): CompanyEconomyState {
  return {
    lifecycle,
    finance: {
      schemaVersion: ECONOMY_SCHEMA_VERSION,
      policyVersion: ECONOMY_POLICY_VERSION,
      processedTick: lifecycle.campaignTick,
      wallets: wallets.map((w) => own(w)),
      pools: pools.map((p) => own(p)),
      accounts: [],
      claims: [],
      reservations: [],
      epochs: [],
      arrears: [],
      departures: [],
      maintenance: [],
      maintenanceReceipts: [],
      food: [],
      obligations: [],
      movements: [],
      farewells: [],
      sourceEffects: [],
      applied: [],
    },
  };
}
export function validateEconomy(state: CompanyEconomyState, context: EconomyContext): void {
  validateLifecycleGraph(state.lifecycle, context);
  const f = state.finance;
  requireEconomy(
    f.schemaVersion === ECONOMY_SCHEMA_VERSION &&
      f.policyVersion === ECONOMY_POLICY_VERSION &&
      f.processedTick === state.lifecycle.campaignTick,
    'INVALID_STATE',
  );
  for (const ids of [
    f.wallets.map((w) => w.walletId),
    f.pools.map((p) => p.poolId),
    f.pools.map((p) => p.walletId),
    f.accounts.map((a) => a.membershipId),
    f.claims.map((c) => c.claimId),
    f.reservations.map((r) => r.reservationId),
    f.epochs.map((e) => e.epochId),
    f.applied.map((r) => r.commandId),
    f.sourceEffects.map((r) => r.key),
    f.maintenance.map((m) => m.agreementId),
    f.departures.map((d) => d.intentId),
    (f.learningObligations ?? []).map((o) => o.taskId),
    (f.learningEffects ?? []).map((e) => e.key),
  ])
    requireEconomy(new Set(ids).size === ids.length, 'INVALID_STATE');
  for (const obligation of f.learningObligations ?? []) {
    requireEconomy(
      isEntityId(obligation.taskId) &&
        isEntityId(obligation.sourceId) &&
        isEntityId(obligation.sourceVersion) &&
        obligation.companyId === state.lifecycle.companyId &&
        obligation.worldId === state.lifecycle.worldId &&
        obligation.start.taskId === obligation.taskId &&
        obligation.start.quote.sourceId === obligation.sourceId &&
        obligation.start.quote.sourceVersion === obligation.sourceVersion &&
        obligation.start.quote.funding !== null &&
        obligation.start.quote.funding.poolId === obligation.poolId &&
        obligation.start.quote.funding.walletId === obligation.payerWalletId &&
        obligation.start.quote.funding.providerWalletId === obligation.recipientWalletId &&
        obligation.start.quote.funding.authorizedBudgetQ === obligation.authorizedBudgetQ &&
        isExactInteger(obligation.authorizedBudgetQ) &&
        isExactInteger(obligation.fundedTicks) &&
        isExactInteger(obligation.acceptedTicks) &&
        BigInt(obligation.fundedTicks) <= BigInt(obligation.start.quote.maxTicks) &&
        BigInt(obligation.acceptedTicks) <= BigInt(obligation.fundedTicks) &&
        exactFractionInput.read(obligation.accruedQ) &&
        exactFractionInput.read(obligation.dischargedQ),
      'INVALID_STATE',
    );
    requireEconomy(
      obligation.start.inputs?.kind === 'COURSE' && obligation.start.quote.funding !== null,
      'INVALID_STATE',
    );
    const expectedAccrual = exactFraction(
      BigInt(obligation.start.quote.funding.costQPerDay.numerator) *
        BigInt(obligation.acceptedTicks),
      BigInt(obligation.start.quote.funding.costQPerDay.denominator) *
        BigInt(obligation.start.inputs.ticksPerDay),
    );
    requireEconomy(
      canonicalJson(expectedAccrual) === canonicalJson(obligation.accruedQ),
      'INVALID_STATE',
    );
    const outstanding =
      BigInt(obligation.accruedQ.numerator) * BigInt(obligation.dischargedQ.denominator) -
      BigInt(obligation.dischargedQ.numerator) * BigInt(obligation.accruedQ.denominator);
    requireEconomy(outstanding >= 0n, 'INVALID_STATE');
    requireEconomy(
      poolWallet(f, obligation.poolId).walletId === obligation.payerWalletId &&
        walletFor(f, obligation.recipientWalletId).owner.kind === obligation.recipient.kind &&
        walletFor(f, obligation.recipientWalletId).owner.id === obligation.recipient.id,
      'INVALID_STATE',
    );
  }
  for (const effect of f.learningEffects ?? [])
    requireEconomy(
      effect.key.length > 0 &&
        effect.requestKey.length > 0 &&
        effect.sourceRequestKey.length > 0 &&
        isEntityId(effect.companyId) &&
        isEntityId(effect.worldId) &&
        isEntityId(effect.taskId) &&
        isEntityId(effect.commandId) &&
        (effect.sourceEventId === null || isEntityId(effect.sourceEventId)) &&
        isEntityId(effect.effectId) &&
        effect.companyId === state.lifecycle.companyId &&
        effect.worldId === state.lifecycle.worldId &&
        isExactInteger(effect.transferQ) &&
        isExactInteger(effect.fundedTicks) &&
        isExactInteger(effect.acceptedTicks) &&
        BigInt(effect.fundedTicks) <= BigInt(effect.acceptedTicks),
      'INVALID_STATE',
    );
  for (const w of f.wallets) {
    requireEconomy(isExactInteger(w.cashQ) && w.location.kind === 'AT', 'INVALID_STATE');
    requireEconomy(reservedQ(f, w.walletId) <= BigInt(w.cashQ), 'INVALID_STATE');
  }
  for (const p of f.pools) {
    const w = walletFor(f, p.walletId);
    requireEconomy(
      w.owner.kind === 'COMPANY' && w.owner.id === state.lifecycle.companyId,
      'INVALID_STATE',
    );
  }
  requireEconomy(
    f.accounts.length === state.lifecycle.memberships.length &&
      state.lifecycle.memberships.every((m) =>
        f.accounts.some((a) => a.membershipId === m.membershipId),
      ),
    'INVALID_STATE',
  );
  for (const a of f.accounts) {
    const m = state.lifecycle.memberships.find((m) => m.membershipId === a.membershipId);
    requireEconomy(m && m.companyId === state.lifecycle.companyId, 'INVALID_STATE');
    poolWallet(f, a.poolId);
    requireEconomy((m.basis === 'PAID') === (a.schedule !== null), 'INVALID_STATE');
    if (a.schedule) {
      requireEconomy(
        a.schedule.scheduleId === m.wageScheduleId &&
          isExactInteger(a.schedule.agreedDailyWageMilli),
        'INVALID_STATE',
      );
      for (const n of a.schedule.notices)
        requireEconomy(
          isExactInteger(n.dailyWageMilli) && BigInt(n.notifiedAt) < BigInt(n.effectiveAt),
          'INVALID_STATE',
        );
    }
  }
  for (const c of f.claims) {
    accountFor(f, c.membershipId);
    poolWallet(f, c.poolId);
    requireEconomy(
      [
        c.paidQ,
        c.reportedQ,
        c.reportedCoveredQ,
        c.dailyWageMilli,
        c.fromTick,
        c.toTick,
        c.dueAt,
      ].every((v) => isExactInteger(v)) && BigInt(c.fromTick) <= BigInt(c.toTick),
      'INVALID_STATE',
    );
    requireEconomy(actualOwedQ(c) >= 0n && reportedOwedQ(f, c) >= 0n, 'INVALID_STATE');
    let end = BigInt(c.fromTick);
    for (const p of c.earned) {
      requireEconomy(
        isExactInteger(p.fromTick) &&
          isExactInteger(p.toTick) &&
          isExactInteger(p.dailyWageMilli) &&
          BigInt(p.fromTick) >= end &&
          BigInt(p.toTick) >= BigInt(p.fromTick) &&
          BigInt(p.toTick) <= BigInt(c.toTick),
        'INVALID_STATE',
      );
      end = BigInt(p.toTick);
    }
  }
  for (const r of f.reservations)
    requireEconomy(
      isExactInteger(r.amountQ) &&
        BigInt(r.amountQ) > 0n &&
        f.claims.some((c) => c.claimId === r.claimId) &&
        f.wallets.some((w) => w.walletId === r.walletId) &&
        r.walletId ===
          poolWallet(f, f.claims.find((c) => c.claimId === r.claimId)!.poolId).walletId,
      'INVALID_STATE',
    );
  for (const e of f.epochs) {
    requireEconomy(
      isExactInteger(e.cumulativeQ) &&
        e.weights.every((w) => isExactInteger(w.amountQ) && BigInt(w.amountQ) > 0n),
      'INVALID_STATE',
    );
    requireEconomy(
      BigInt(e.cumulativeQ) <= e.weights.reduce((s, w) => s + BigInt(w.amountQ), 0n),
      'INVALID_STATE',
    );
  }
  for (const { warning } of f.arrears)
    if (warning) {
      const { friend, respect, rivalry } = warning.relation ?? {};
      requireEconomy([friend, respect, rivalry].every(readRelationObservation), 'INVALID_STATE');
    }
  for (const food of f.food) {
    accountFor(f, food.membershipId);
    let until = 0n;
    for (const interval of food.intervals) {
      requireEconomy(
        isExactInteger(interval.fromTick) &&
          isExactInteger(interval.toTick) &&
          BigInt(interval.fromTick) >= until &&
          BigInt(interval.toTick) > BigInt(interval.fromTick) &&
          BigInt(interval.toTick) <= BigInt(f.processedTick),
        'INVALID_STATE',
      );
      if (interval.agreementId !== null)
        requireEconomy(
          f.maintenance.some((m) => m.agreementId === interval.agreementId),
          'INVALID_STATE',
        );
      until = BigInt(interval.toTick);
    }
  }
}

/** Retained finance field-set guard; semantic invariants remain in validateEconomy. */
export function isCompanyFinanceShape(value: unknown): value is CompanyFinance {
  return (
    financeRootShape(value) &&
    financeWalletsAccountsAndClaimsShape(value) &&
    financePoolsReservationsAndEpochsShape(value) &&
    financeMaintenanceAndFoodShape(value) &&
    financeArrearsAndDeparturesShape(value) &&
    financeMovementsObligationsAndFarewellsShape(value) &&
    financeReceiptsAndSourceEffectsShape(value) &&
    financeOptionalLearningShape(value)
  );
}

function financeRootShape(value: unknown): value is Record<string, unknown> {
  return (
    shape(
      value,
      [
        'schemaVersion',
        'policyVersion',
        'processedTick',
        'wallets',
        'pools',
        'accounts',
        'claims',
        'reservations',
        'epochs',
        'arrears',
        'departures',
        'maintenance',
        'maintenanceReceipts',
        'food',
        'obligations',
        'movements',
        'farewells',
        'sourceEffects',
        'applied',
      ],
      ['learningObligations', 'learningEffects'],
    ) &&
    value['schemaVersion'] === ECONOMY_SCHEMA_VERSION &&
    value['policyVersion'] === ECONOMY_POLICY_VERSION &&
    isExactInteger(value['processedTick']) &&
    financeCollectionFieldsShape(value)
  );
}

function financeCollectionFieldsShape(value: Record<string, unknown>): boolean {
  const entries: readonly {
    field: string;
    required: readonly string[];
    optional?: readonly string[];
  }[] = [
    { field: 'wallets', required: ['walletId', 'owner', 'location', 'cashQ'] },
    { field: 'pools', required: ['poolId', 'walletId'] },
    {
      field: 'accounts',
      required: [
        'membershipId',
        'poolId',
        'recipient',
        'schedule',
        'known',
        'confirmedAt',
        'knownPaused',
        'knownDeath',
        'death',
      ],
      optional: ['actualPaused'],
    },
    {
      field: 'claims',
      required: [
        'claimId',
        'membershipId',
        'poolId',
        'rateVersion',
        'dueAt',
        'fromTick',
        'toTick',
        'dailyWageMilli',
        'maintenanceId',
        'earned',
        'paidQ',
        'reportedQ',
        'reportedCoveredQ',
      ],
    },
    {
      field: 'reservations',
      required: ['reservationId', 'walletId', 'claimId', 'amountQ', 'purpose'],
    },
    {
      field: 'epochs',
      required: ['epochId', 'poolId', 'dueAt', 'weights', 'cumulativeQ', 'closedAt'],
    },
    {
      field: 'arrears',
      required: ['episodeId', 'membershipId', 'firstDueAt', 'complaintAt', 'warning', 'resolvedAt'],
    },
    {
      field: 'departures',
      required: ['intentId', 'membershipId', 'reason', 'causeId', 'requestedAt', 'cancelledAt'],
    },
    {
      field: 'maintenance',
      required: [
        'agreementId',
        'kind',
        'partyId',
        'location',
        'beneficiaryIds',
        'beneficiaryEnds',
        'startedAt',
        'endedAt',
        'knownEndedAt',
        'sourceId',
        'providerId',
        'termsVersion',
      ],
    },
    {
      field: 'maintenanceReceipts',
      required: ['agreementId', 'beneficiaryId', 'fromTick', 'toTick', 'fulfillment'],
    },
    { field: 'food', required: ['membershipId', 'intervals'] },
    {
      field: 'obligations',
      required: ['obligationId', 'recipient', 'amountQ', 'sourceId', 'dueAt'],
    },
    { field: 'movements', required: ['movementId', 'from', 'to', 'amountQ', 'purpose', 'atTick'] },
    { field: 'farewells', required: ['membershipId', 'amountQ', 'atTick', 'commandId'] },
    { field: 'sourceEffects', required: ['key', 'requestKey'] },
    {
      field: 'applied',
      required: [
        'commandId',
        'requestKey',
        'semanticKey',
        'sourceKey',
        'lifecycleReceipt',
        'events',
        'requirements',
        'allocations',
      ],
      optional: ['farewellOutcome'],
    },
  ];
  for (const { field, required, optional = [] } of entries) {
    const values = value[field];
    if (!Array.isArray(values) || !values.every((entry) => shape(entry, required, optional)))
      return false;
  }
  return true;
}

function financeWalletsAccountsAndClaimsShape(finance: Record<string, unknown>): boolean {
  return (
    financeWalletsShape(finance) && financeAccountsShape(finance) && financeWageClaimsShape(finance)
  );
}

function financeWalletsShape(finance: Record<string, unknown>): boolean {
  const wallets = finance['wallets'] as readonly Record<string, unknown>[];
  for (const wallet of wallets)
    if (!shape(wallet['owner'], ['kind', 'id']) || !locationObjectShape(wallet['location']))
      return false;
  for (const wallet of wallets) {
    if (
      !ownerShape(wallet['owner']) ||
      !locationValueShape(wallet['location']) ||
      !isExactInteger(wallet['cashQ'])
    )
      return false;
  }
  return true;
}

function financeAccountsShape(finance: Record<string, unknown>): boolean {
  for (const account of finance['accounts'] as readonly Record<string, unknown>[]) {
    if (
      !isEntityId(account['membershipId']) ||
      !isEntityId(account['poolId']) ||
      typeof account['known'] !== 'boolean' ||
      typeof account['knownPaused'] !== 'boolean' ||
      typeof account['knownDeath'] !== 'boolean' ||
      (Object.hasOwn(account, 'actualPaused') && typeof account['actualPaused'] !== 'boolean') ||
      !isExactInteger(account['confirmedAt']) ||
      !shape(account['recipient'], ['kind', 'id']) ||
      !['CHARACTER', 'COMPANY', 'ESTATE', 'WORLD'].includes(
        account['recipient']['kind'] as string,
      ) ||
      !isEntityId(account['recipient']['id']) ||
      (account['schedule'] !== null && !wageScheduleShape(account['schedule'])) ||
      (account['death'] !== null &&
        (!shape(account['death'], ['sourceId', 'atTick', 'recipient']) ||
          !isEntityId(account['death']['sourceId']) ||
          !isExactInteger(account['death']['atTick']) ||
          !ownerShape(account['death']['recipient'])))
    )
      return false;
  }
  return true;
}

function financeWageClaimsShape(finance: Record<string, unknown>): boolean {
  for (const claim of finance['claims'] as readonly Record<string, unknown>[])
    if (
      !['claimId', 'membershipId', 'poolId', 'rateVersion'].every((key) =>
        isEntityId(claim[key]),
      ) ||
      ![
        'dueAt',
        'fromTick',
        'toTick',
        'dailyWageMilli',
        'paidQ',
        'reportedQ',
        'reportedCoveredQ',
      ].every((key) => isExactInteger(claim[key])) ||
      !(claim['maintenanceId'] === null || isEntityId(claim['maintenanceId'])) ||
      !Array.isArray(claim['earned']) ||
      !claim['earned'].every(
        (entry: unknown) =>
          shape(entry, ['fromTick', 'toTick', 'dailyWageMilli', 'maintenanceId']) &&
          ['fromTick', 'toTick', 'dailyWageMilli'].every((key) => isExactInteger(entry[key])) &&
          (entry['maintenanceId'] === null || isEntityId(entry['maintenanceId'])),
      )
    )
      return false;
  return true;
}

function financePoolsReservationsAndEpochsShape(finance: Record<string, unknown>): boolean {
  return financePoolsAndReservationsShape(finance) && financeEpochsShape(finance);
}

function financePoolsAndReservationsShape(finance: Record<string, unknown>): boolean {
  for (const pool of finance['pools'] as readonly Record<string, unknown>[])
    if (!isEntityId(pool['poolId']) || !isEntityId(pool['walletId'])) return false;
  for (const reservation of finance['reservations'] as readonly Record<string, unknown>[])
    if (
      !['reservationId', 'walletId', 'claimId'].every((key) => isEntityId(reservation[key])) ||
      !isExactInteger(reservation['amountQ']) ||
      !['PENDING_CONFIRMATION', 'PRE_ENTRY'].includes(reservation['purpose'] as string)
    )
      return false;
  return true;
}

function financeEpochsShape(finance: Record<string, unknown>): boolean {
  for (const epoch of finance['epochs'] as readonly Record<string, unknown>[])
    if (
      !isEntityId(epoch['epochId']) ||
      !isEntityId(epoch['poolId']) ||
      !isExactInteger(epoch['dueAt']) ||
      !(epoch['closedAt'] === null || isExactInteger(epoch['closedAt'])) ||
      !Array.isArray(epoch['weights']) ||
      !epoch['weights'].every(
        (entry: unknown) =>
          shape(entry, ['claimId', 'amountQ']) &&
          isEntityId(entry['claimId']) &&
          isExactInteger(entry['amountQ']),
      )
    )
      return false;
  return true;
}

function financeMaintenanceAndFoodShape(finance: Record<string, unknown>): boolean {
  return (
    financeMaintenanceAgreementsShape(finance) &&
    financeMaintenanceReceiptsShape(finance) &&
    financeFoodShape(finance)
  );
}

function financeMaintenanceAgreementsShape(finance: Record<string, unknown>): boolean {
  for (const agreement of finance['maintenance'] as readonly Record<string, unknown>[])
    if (
      !isEntityId(agreement['agreementId']) ||
      !['FIELD_CAMP', 'SAFE_SERVICE'].includes(agreement['kind'] as string) ||
      !isEntityId(agreement['partyId']) ||
      !isExactInteger(agreement['startedAt']) ||
      !(agreement['endedAt'] === null || isExactInteger(agreement['endedAt'])) ||
      !(agreement['knownEndedAt'] === null || isExactInteger(agreement['knownEndedAt'])) ||
      !isEntityId(agreement['sourceId']) ||
      !(agreement['providerId'] === null || isEntityId(agreement['providerId'])) ||
      !(agreement['termsVersion'] === null || isEntityId(agreement['termsVersion'])) ||
      !locationValueShape(agreement['location']) ||
      !Array.isArray(agreement['beneficiaryIds']) ||
      !agreement['beneficiaryIds'].every(isEntityId) ||
      !Array.isArray(agreement['beneficiaryEnds']) ||
      !agreement['beneficiaryEnds'].every(
        (entry: unknown) =>
          shape(entry, ['characterId', 'atTick', 'knownAtTick']) &&
          isEntityId(entry['characterId']) &&
          isExactInteger(entry['atTick']) &&
          (entry['knownAtTick'] === null || isExactInteger(entry['knownAtTick'])),
      )
    )
      return false;
  return true;
}

function financeMaintenanceReceiptsShape(finance: Record<string, unknown>): boolean {
  for (const receipt of finance['maintenanceReceipts'] as readonly Record<string, unknown>[])
    if (
      !isEntityId(receipt['agreementId']) ||
      !isEntityId(receipt['beneficiaryId']) ||
      !isExactInteger(receipt['fromTick']) ||
      !isExactInteger(receipt['toTick']) ||
      !['CURRENT_FOOD', 'CURRENT_FOOD_LODGING_WAGE'].includes(receipt['fulfillment'] as string)
    )
      return false;
  return true;
}

function financeFoodShape(finance: Record<string, unknown>): boolean {
  for (const account of finance['food'] as readonly Record<string, unknown>[])
    if (
      !Array.isArray(account['intervals']) ||
      !account['intervals'].every(
        (entry: unknown) =>
          shape(entry, ['fromTick', 'toTick', 'agreementId']) &&
          isExactInteger(entry['fromTick']) &&
          isExactInteger(entry['toTick']) &&
          (entry['agreementId'] === null || isEntityId(entry['agreementId'])),
      )
    )
      return false;
  return true;
}

function financeArrearsAndDeparturesShape(finance: Record<string, unknown>): boolean {
  return financeArrearsShape(finance) && financeDeparturesShape(finance);
}

function financeArrearsShape(finance: Record<string, unknown>): boolean {
  for (const arrears of finance['arrears'] as readonly Record<string, unknown>[]) {
    if (
      !isEntityId(arrears['episodeId']) ||
      !isEntityId(arrears['membershipId']) ||
      !isExactInteger(arrears['firstDueAt']) ||
      !(arrears['complaintAt'] === null || isExactInteger(arrears['complaintAt'])) ||
      !(arrears['resolvedAt'] === null || isExactInteger(arrears['resolvedAt']))
    )
      return false;
    const warning = arrears['warning'];
    if (
      warning !== null &&
      (!shape(warning, ['atTick', 'deadline', 'leaderId', 'relation', 'sourceId']) ||
        !isExactInteger(warning['atTick']) ||
        !isExactInteger(warning['deadline']) ||
        !isEntityId(warning['leaderId']) ||
        !isEntityId(warning['sourceId']) ||
        !relationShape(warning['relation']))
    )
      return false;
  }
  return true;
}

function financeDeparturesShape(finance: Record<string, unknown>): boolean {
  for (const departure of finance['departures'] as readonly Record<string, unknown>[])
    if (
      !isEntityId(departure['intentId']) ||
      !isEntityId(departure['membershipId']) ||
      !['DISMISSED', 'WAGE_BREACH', 'CANONICAL_EVENT'].includes(departure['reason'] as string) ||
      !isEntityId(departure['causeId']) ||
      !isExactInteger(departure['requestedAt']) ||
      !(departure['cancelledAt'] === null || isExactInteger(departure['cancelledAt']))
    )
      return false;
  return true;
}

function financeMovementsObligationsAndFarewellsShape(finance: Record<string, unknown>): boolean {
  return (
    financeObligationsShape(finance) &&
    financeMovementsShape(finance) &&
    financeFarewellsShape(finance)
  );
}

function financeObligationsShape(finance: Record<string, unknown>): boolean {
  for (const obligation of finance['obligations'] as readonly Record<string, unknown>[])
    if (
      !ownerShape(obligation['recipient']) ||
      !isExactInteger(obligation['amountQ']) ||
      obligation['dueAt'] !== null
    )
      return false;
  return true;
}

function financeMovementsShape(finance: Record<string, unknown>): boolean {
  for (const movement of finance['movements'] as readonly Record<string, unknown>[])
    if (
      !isExactInteger(movement['amountQ']) ||
      !isExactInteger(movement['atTick']) ||
      !isEntityId(movement['movementId']) ||
      !isEntityId(movement['from']) ||
      !isEntityId(movement['to']) ||
      ![
        'ORIGIN_ENDOWMENT',
        'SIGNING',
        'WAGE',
        'TRANSFER',
        'FAREWELL',
        'CARE',
        'CARE_HANDOVER',
        'FOOD',
        'REPAIR',
        'PRESENTATION',
        'LEARNING',
      ].includes(movement['purpose'] as string)
    )
      return false;
  return true;
}

function financeFarewellsShape(finance: Record<string, unknown>): boolean {
  for (const farewell of finance['farewells'] as readonly Record<string, unknown>[])
    if (
      !isEntityId(farewell['membershipId']) ||
      !isExactInteger(farewell['amountQ']) ||
      !isExactInteger(farewell['atTick']) ||
      !isEntityId(farewell['commandId'])
    )
      return false;
  return true;
}

function financeReceiptsAndSourceEffectsShape(finance: Record<string, unknown>): boolean {
  return financeSourceEffectsShape(finance) && financeAppliedReceiptsShape(finance);
}

function financeSourceEffectsShape(finance: Record<string, unknown>): boolean {
  for (const effect of finance['sourceEffects'] as readonly Record<string, unknown>[])
    if (
      !isEntityId(effect['key']) ||
      typeof effect['requestKey'] !== 'string' ||
      effect['requestKey'].length === 0
    )
      return false;
  return true;
}

function financeAppliedReceiptsShape(finance: Record<string, unknown>): boolean {
  for (const receipt of finance['applied'] as readonly Record<string, unknown>[]) {
    if (
      (receipt['lifecycleReceipt'] !== null &&
        !isLifecycleReceiptShape(receipt['lifecycleReceipt'])) ||
      !eventListShape(receipt['events']) ||
      !Array.isArray(receipt['requirements']) ||
      !receipt['requirements'].every(economyRequirementShape) ||
      !allocationListShape(receipt['allocations']) ||
      (Object.hasOwn(receipt, 'farewellOutcome') &&
        !farewellOutcomeInput.read(receipt['farewellOutcome']))
    )
      return false;
    if (
      !isEntityId(receipt['commandId']) ||
      typeof receipt['requestKey'] !== 'string' ||
      typeof receipt['semanticKey'] !== 'string' ||
      (receipt['sourceKey'] !== null && typeof receipt['sourceKey'] !== 'string') ||
      !Array.isArray(receipt['events']) ||
      !receipt['events'].every((entry: unknown) =>
        shape(entry, ['id', 'type', 'atTick', 'subjectIds']),
      ) ||
      !Array.isArray(receipt['requirements']) ||
      !Array.isArray(receipt['allocations']) ||
      !receipt['allocations'].every((entry: unknown) =>
        shape(entry, ['claimId', 'amountQ', 'channel']),
      )
    )
      return false;
  }
  return true;
}

function financeOptionalLearningShape(finance: Record<string, unknown>): boolean {
  if (
    Object.hasOwn(finance, 'learningObligations') &&
    (!Array.isArray(finance['learningObligations']) ||
      !finance['learningObligations'].every(
        (entry: unknown) =>
          shape(entry, [
            'taskId',
            'sourceId',
            'sourceVersion',
            'companyId',
            'worldId',
            'start',
            'poolId',
            'payerWalletId',
            'recipientWalletId',
            'recipient',
            'authorizedBudgetQ',
            'fundedTicks',
            'acceptedTicks',
            'accruedQ',
            'dischargedQ',
            'terminal',
          ]) &&
          shape(entry['accruedQ'], ['numerator', 'denominator']) &&
          shape(entry['dischargedQ'], ['numerator', 'denominator']) &&
          learningStartShape(entry['start']),
      ))
  )
    return false;
  if (
    Object.hasOwn(finance, 'learningEffects') &&
    (!Array.isArray(finance['learningEffects']) ||
      !finance['learningEffects'].every((entry: unknown) =>
        shape(entry, [
          'key',
          'requestKey',
          'sourceRequestKey',
          'companyId',
          'worldId',
          'taskId',
          'commandId',
          'sourceEventId',
          'effectId',
          'transferQ',
          'fundedTicks',
          'acceptedTicks',
        ]),
      ))
  )
    return false;
  return true;
}

function locationObjectShape(value: unknown): boolean {
  if (!plainObject(value)) return false;
  return value['kind'] === 'AT'
    ? shape(value, ['kind', 'siteId', 'areaId'])
    : shape(value, ['kind', 'segmentId', 'from', 'to', 'startedAt', 'arrivalNotBefore']);
}
const locationValueShape = companyLocationShape;
function ownerShape(value: unknown): boolean {
  return (
    shape(value, ['kind', 'id']) &&
    ['CHARACTER', 'COMPANY', 'ESTATE', 'WORLD'].includes(value['kind'] as string) &&
    isEntityId(value['id'])
  );
}
function relationShape(value: unknown): boolean {
  return (
    shape(value, ['friend', 'respect', 'rivalry']) &&
    ['friend', 'respect', 'rivalry'].every((axis) => readRelationObservation(value[axis]))
  );
}
function wageScheduleShape(value: unknown): boolean {
  return (
    shape(value, ['scheduleId', 'agreedAt', 'agreedDailyWageMilli', 'rates', 'notices']) &&
    isEntityId(value['scheduleId']) &&
    isExactInteger(value['agreedAt']) &&
    isExactInteger(value['agreedDailyWageMilli']) &&
    Array.isArray(value['rates']) &&
    value['rates'].every(
      (entry: unknown) =>
        shape(entry, ['minimumLevel', 'dailyWageMilli']) &&
        Number.isSafeInteger(entry['minimumLevel']) &&
        isExactInteger(entry['dailyWageMilli']),
    ) &&
    Array.isArray(value['notices']) &&
    value['notices'].every(
      (entry: unknown) =>
        shape(entry, [
          'sourceId',
          'version',
          'notifiedAt',
          'effectiveAt',
          'lifetimeLevel',
          'dailyWageMilli',
        ]) &&
        [entry['sourceId'], entry['version']].every(isEntityId) &&
        isExactInteger(entry['notifiedAt']) &&
        isExactInteger(entry['effectiveAt']) &&
        Number.isSafeInteger(entry['lifetimeLevel']) &&
        isExactInteger(entry['dailyWageMilli']),
    )
  );
}
function learningStartShape(value: unknown): boolean {
  if (!shape(value, ['taskId', 'quote'], ['inputs'])) return false;
  const quote = value['quote'];
  if (
    !shape(quote, ['sourceId', 'sourceVersion', 'maxTicks', 'funding']) ||
    !isEntityId(quote['sourceId']) ||
    !isEntityId(quote['sourceVersion']) ||
    !isExactInteger(quote['maxTicks'])
  )
    return false;
  const funding = quote['funding'];
  if (
    funding !== null &&
    (!shape(funding, [
      'poolId',
      'walletId',
      'providerWalletId',
      'authorizedBudgetQ',
      'costQPerDay',
    ]) ||
      !['poolId', 'walletId', 'providerWalletId'].every((key) => isEntityId(funding[key])) ||
      !isExactInteger(funding['authorizedBudgetQ']) ||
      !shape(funding['costQPerDay'], ['numerator', 'denominator']))
  )
    return false;
  const inputs = value['inputs'];
  return (
    inputs === undefined ||
    (shape(inputs, ['kind']) &&
      (inputs['kind'] === 'BOOK' ||
        (inputs['kind'] === 'COURSE' &&
          shape(inputs, ['kind', 'ticksPerDay']) &&
          isExactInteger(inputs['ticksPerDay']))))
  );
}
function economyRequirementShape(value: unknown): boolean {
  if (!plainObject(value)) return false;
  switch (value['kind']) {
    case 'OPENING_NONFINANCIAL':
      return (
        shape(value, ['kind', 'items', 'contactReaction', 'hookId']) &&
        Array.isArray(value['items']) &&
        value['items'].every(
          (item: unknown) =>
            shape(item, ['id', 'definitionId', 'quantity', 'holderId', 'ownerCompanyId']) &&
            ['id', 'definitionId', 'holderId', 'ownerCompanyId'].every((key) =>
              isEntityId(item[key]),
            ) &&
            Number.isSafeInteger(item['quantity']),
        ) &&
        shape(value['contactReaction'], ['contactId', 'respect', 'rivalry']) &&
        isEntityId(value['contactReaction']['contactId']) &&
        Number.isSafeInteger(value['contactReaction']['respect']) &&
        Number.isSafeInteger(value['contactReaction']['rivalry']) &&
        isEntityId(value['hookId'])
      );
    case 'RECRUIT_ITEMS':
      return (
        shape(value, ['kind', 'membershipId', 'itemIds']) &&
        isEntityId(value['membershipId']) &&
        Array.isArray(value['itemIds']) &&
        value['itemIds'].every(isEntityId)
      );
    case 'CARE_HANDOVER':
      return (
        shape(value, ['kind', 'characterId', 'receiverId', 'atTick']) &&
        isEntityId(value['characterId']) &&
        isEntityId(value['receiverId']) &&
        isExactInteger(value['atTick'])
      );
    case 'FOOD_CONSUMPTION':
      return (
        shape(value, ['kind', 'membershipId', 'fromTick', 'toTick', 'tickUnits']) &&
        isEntityId(value['membershipId']) &&
        isExactInteger(value['fromTick']) &&
        isExactInteger(value['toTick']) &&
        isExactInteger(value['tickUnits'])
      );
    case 'PHYSICAL_DEPARTURE':
      return (
        shape(value, [
          'kind',
          'membershipId',
          'intentId',
          'atTick',
          'returnContainerId',
          'careHandoverId',
        ]) &&
        ['membershipId', 'intentId', 'returnContainerId'].every((key) => isEntityId(value[key])) &&
        isExactInteger(value['atTick']) &&
        (value['careHandoverId'] === null || isEntityId(value['careHandoverId']))
      );
    case 'OUTCOME_APPLICATION':
      return (
        shape(value, [
          'kind',
          'characterId',
          'actualDeathTick',
          'sourceEventId',
          'custodyOutcomeId',
        ]) &&
        ['characterId', 'sourceEventId', 'custodyOutcomeId'].every((key) =>
          isEntityId(value[key]),
        ) &&
        isExactInteger(value['actualDeathTick'])
      );
    case 'INFORMED_SOCIAL_CONTRIBUTION':
      return (
        shape(value, ['kind', 'sourceId', 'characterId', 'cause'], ['communicationSourceId']) &&
        isEntityId(value['sourceId']) &&
        isEntityId(value['characterId']) &&
        ['WAGE_COMPLAINT', 'FINAL_WARNING', 'FAREWELL'].includes(value['cause'] as string) &&
        (!Object.hasOwn(value, 'communicationSourceId') ||
          isEntityId(value['communicationSourceId']))
      );
    default:
      return false;
  }
}
function eventListShape(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (entry: unknown) =>
        shape(entry, ['id', 'type', 'atTick', 'subjectIds']) &&
        isEntityId(entry['id']) &&
        isEntityId(entry['type']) &&
        isExactInteger(entry['atTick']) &&
        Array.isArray(entry['subjectIds']) &&
        entry['subjectIds'].every(isEntityId),
    )
  );
}
function allocationListShape(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      (entry: unknown) =>
        shape(entry, ['claimId', 'amountQ', 'channel']) &&
        isEntityId(entry['claimId']) &&
        isExactInteger(entry['amountQ']) &&
        ['CASH', 'PENDING_CONFIRMATION'].includes(entry['channel'] as string),
    )
  );
}
/** Missing access means no automatic settlement; a supplied invalid capability still fails closed. */
export function findPoolAccess(
  state: CompanyEconomyState,
  poolId: string,
  context: EconomyContext,
  evidenceId?: string,
): LocalMoneyAccess | undefined {
  const matches = context.financeFacts.filter(
    (f): f is LocalMoneyAccess =>
      f.kind === 'LOCAL_MONEY_ACCESS' &&
      (evidenceId === undefined ? f.poolIds.includes(poolId) : f.id === evidenceId),
  );
  requireEconomy(matches.length <= 1, 'INVALID_SOURCE');
  const access = matches[0];
  if (!access) return undefined;
  validateFinanceFact(access, context);
  const operator = person(state.lifecycle, access.operatorId);
  const wallet = poolWallet(state.finance, poolId);
  requireEconomy(
    activeMembership(state.lifecycle, access.operatorId)?.companyId === state.lifecycle.companyId &&
      context.contactIds.includes(access.operatorId) &&
      operator.presence.availability === 'AVAILABLE' &&
      operator.presence.encounterBindingId === null &&
      access.poolIds.includes(poolId) &&
      sameLocation(operator.presence.location, access.location) &&
      sameLocation(wallet.location, access.location),
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  return access;
}
/** Explicit financial commands require access; observation never requires access to every old purse. */
export function requirePoolAccess(
  state: CompanyEconomyState,
  poolId: string,
  context: EconomyContext,
  evidenceId?: string,
): LocalMoneyAccess {
  const access = findPoolAccess(state, poolId, context, evidenceId);
  requireEconomy(access, 'CONTACT_OR_ACCESS_REQUIRED');
  return access;
}
export function financeEffectKey(fact: FinanceEvidence): string {
  const subject =
    'membershipId' in fact
      ? fact.membershipId
      : 'characterId' in fact
        ? fact.characterId
        : 'agreementId' in fact
          ? fact.agreementId
          : 'partyId' in fact
            ? fact.partyId
            : null;
  return canonicalJson([fact.kind, fact.sourceEventId, subject]);
}
export function recordSource(
  finance: CompanyFinance,
  fact: FinanceEvidence,
): { finance: CompanyFinance; replayed: boolean } {
  const key = financeEffectKey(fact);
  // Adapter revision is an admission token, not part of the enduring causal identity.
  const { revision: _revision, id: _id, ...body } = fact;
  const requestKey = canonicalJson(body);
  const prior = finance.sourceEffects.find((e) => e.key === key);
  if (prior) {
    requireEconomy(prior.requestKey === requestKey, 'IDEMPOTENCY_CONFLICT');
    return { finance, replayed: true };
  }
  return {
    finance: { ...finance, sourceEffects: [...finance.sourceEffects, { key, requestKey }] },
    replayed: false,
  };
}
export const economyId = lifecycleId;
