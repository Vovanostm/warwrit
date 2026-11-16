import { projectCompanyEconomy } from '@warwrit/game-core';
import type { CompanyEconomyState } from '@warwrit/game-core';
import type { CompanyHoldingsDto } from '@warwrit/protocol';

type CompanyPayrollDto = NonNullable<CompanyHoldingsDto['payroll']>;

type ProjectedEconomy = NonNullable<ReturnType<typeof projectCompanyEconomy>>;
type ProjectedClaim = ProjectedEconomy['finance']['claims'][number];
type PayrollService = CompanyPayrollDto['services'][number];

function mapPayrollClaim(
  claim: ProjectedClaim,
  services: ReadonlyMap<string, PayrollService>,
  poolIds: ReadonlySet<string>,
): CompanyPayrollDto['claims'][number] | null {
  const service = services.get(claim.membershipId);
  if (!service || !poolIds.has(service.poolId)) return null;
  return {
    claimId: claim.claimId,
    membershipId: claim.membershipId,
    poolId: service.poolId,
    payee: claim.payee,
    dueAt: String(claim.dueAt),
    estimatedQ: String(claim.estimatedQ),
    cashPaidQ: String(claim.cashPaidQ),
    currentMaintenanceQ: String(claim.currentMaintenanceQ),
    pendingQ: String(claim.pendingQ),
    unsecuredQ: String(claim.unsecuredQ),
  };
}

function summarizePayroll(claims: CompanyPayrollDto['claims'], atTick: string) {
  return claims.reduce(
    (totals, claim) => {
      const unpaidQ = BigInt(claim.pendingQ) + BigInt(claim.unsecuredQ);
      const isDue = BigInt(claim.dueAt) <= BigInt(atTick);
      return {
        owedQ: totals.owedQ + unpaidQ,
        dueQ: totals.dueQ + (isDue ? unpaidQ : 0n),
        payableQ: totals.payableQ + BigInt(claim.unsecuredQ),
        duePayableQ: totals.duePayableQ + (isDue ? BigInt(claim.unsecuredQ) : 0n),
      };
    },
    { owedQ: 0n, dueQ: 0n, payableQ: 0n, duePayableQ: 0n },
  );
}

/** Maps only the allowlisted observation; raw accounts, claims and private finance never escape. */
export function projectPayroll(
  state: CompanyEconomyState,
  companyId: string,
): CompanyPayrollDto | null {
  const view = projectCompanyEconomy(state, companyId);
  if (!view) return null;

  const pools: CompanyPayrollDto['pools'] = view.finance.wallets.map((pool) => ({
    poolId: pool.poolId,
    walletId: pool.walletId,
    location: pool.location,
    cashQ: String(pool.cashQ),
    reservedQ: String(pool.reservedQ),
    spendableQ: String(pool.spendableQ),
  }));
  const poolIds = new Set(pools.map((pool) => pool.poolId));
  const services: CompanyPayrollDto['services'] = view.finance.services
    .filter((service) => poolIds.has(service.poolId))
    .map((service) => ({
      membershipId: service.membershipId,
      poolId: service.poolId,
      currentAgreedRateMilli: String(service.currentAgreedRateMilli),
      materialSupportOnly: service.materialSupportOnly,
    }));
  const serviceByMembership = new Map(services.map((service) => [service.membershipId, service]));
  const claims: CompanyPayrollDto['claims'] = view.finance.claims
    .map((claim) => mapPayrollClaim(claim, serviceByMembership, poolIds))
    .filter((claim) => claim !== null);
  const atTick = String(view.finance.atTick);
  const totals = summarizePayroll(claims, atTick);

  return {
    atTick,
    publicRevision: String(view.revision),
    pools,
    services,
    claims,
    owedQ: String(totals.owedQ),
    dueQ: String(totals.dueQ),
    payableQ: String(totals.payableQ),
    duePayableQ: String(totals.duePayableQ),
  };
}
