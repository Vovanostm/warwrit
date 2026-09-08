import { COMPANY_RULES } from './definitions.js';
import { canonicalJson, snapshotJson } from './input.js';
import {
  activeMembership,
  lifecycleId,
  person,
  sameLocation,
  validateLifecycleGraph,
} from './lifecycle-state.js';
import { isExactInteger, moneyQ, campaignTick } from './values.js';
import type { CampaignTick, MoneyQ } from './values.js';
import type { LifecycleState } from './lifecycle-types.js';
import type {
  CompanyEconomyState,
  CompanyFinance,
  EconomyContext,
  EconomyError,
  FinanceEvidence,
  FundingPool,
  ServiceAccount,
  WageClaim,
  Wallet,
} from './economy-types.js';
import { ECONOMY_POLICY_VERSION, ECONOMY_SCHEMA_VERSION } from './economy-types.js';

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
    fact.worldId === context.worldId &&
      fact.companyId === context.companyId &&
      fact.revision === context.canonicalRevision &&
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
  return finance.reservations
    .filter((r) => r.walletId === walletId)
    .reduce((sum, r) => sum + BigInt(r.amountQ), 0n);
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
export function replaceAccount(finance: CompanyFinance, account: ServiceAccount): CompanyFinance {
  return {
    ...finance,
    accounts: finance.accounts.map((a) => (a.membershipId === account.membershipId ? account : a)),
  };
}
export function closeEpochs(
  finance: CompanyFinance,
  tick: CampaignTick,
  poolId?: string,
): CompanyFinance {
  return {
    ...finance,
    epochs: finance.epochs.map((e) =>
      e.closedAt === null && (poolId === undefined || e.poolId === poolId)
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
      wallets: own(wallets),
      pools: own(pools),
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
  ])
    requireEconomy(new Set(ids).size === ids.length, 'INVALID_STATE');
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
        f.wallets.some((w) => w.walletId === r.walletId),
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
  for (const food of f.food)
    requireEconomy(
      isExactInteger(food.demandedTickUnits) &&
        isExactInteger(food.coveredTickUnits) &&
        BigInt(food.coveredTickUnits) <= BigInt(food.demandedTickUnits),
      'INVALID_STATE',
    );
}
/** Access evidence is an authenticated adapter capability, not a player-controlled location. */
export function requirePoolAccess(
  state: CompanyEconomyState,
  poolId: string,
  context: EconomyContext,
  evidenceId?: string,
) {
  const access = financeFact(context, 'LOCAL_MONEY_ACCESS', evidenceId);
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
