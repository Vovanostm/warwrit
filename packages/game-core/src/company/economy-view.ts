import { projectCompanyLifecycle } from './lifecycle.js';
import { wageAt } from './economy-accrual.js';
import {
  accountFor,
  committedQ,
  q,
  reportedOwedQ,
  reservedQ,
  spendableQ,
} from './economy-state.js';
import type { CompanyEconomyState, EconomyError } from './economy-types.js';

/** Allowlist only. Private earned intervals, outcome IDs and unclaimed estate facts stay internal. */
export function projectCompanyEconomy(state: CompanyEconomyState, observerCompanyId: string) {
  const lifecycle = projectCompanyLifecycle(state.lifecycle, observerCompanyId);
  if (!lifecycle) return null;
  const f = state.finance;
  return {
    ...lifecycle,
    finance: {
      atTick: f.processedTick,
      wallets: f.pools
        .map((p) => {
          const w = f.wallets.find((w) => w.walletId === p.walletId)!;
          return {
            poolId: p.poolId,
            walletId: w.walletId,
            location: { ...w.location },
            cashQ: w.cashQ,
            reservedQ: q(reservedQ(f, w.walletId)),
            spendableQ: q(spendableQ(f, w.walletId)),
          };
        })
        .sort((a, b) => (a.poolId < b.poolId ? -1 : 1)),
      services: f.accounts
        .filter((a) => a.known)
        .map((a) => ({
          membershipId: a.membershipId,
          poolId: a.poolId,
          currentAgreedRateMilli: wageAt(a, f.processedTick).dailyWageMilli,
          materialSupportOnly: a.schedule === null,
          tariff: a.schedule?.rates.map((r) => ({ ...r })) ?? [],
          notices:
            a.schedule?.notices.map((n) => ({
              version: n.version,
              notifiedAt: n.notifiedAt,
              effectiveAt: n.effectiveAt,
              dailyWageMilli: n.dailyWageMilli,
            })) ?? [],
        })),
      claims: f.claims
        .filter((c) => accountFor(f, c.membershipId).known && BigInt(c.reportedQ) > 0n)
        .map((c) => {
          const a = accountFor(f, c.membershipId);
          return {
            claimId: c.claimId,
            membershipId: c.membershipId,
            payee: { ...(a.knownDeath ? a.death!.recipient : a.recipient) },
            dueAt: c.dueAt,
            estimatedQ: c.reportedQ,
            cashPaidQ: c.paidQ,
            currentMaintenanceQ: c.reportedCoveredQ,
            pendingQ: q(committedQ(f, c.claimId)),
            unsecuredQ: q(reportedOwedQ(f, c)),
          };
        })
        .sort((a, b) => (a.claimId < b.claimId ? -1 : 1)),
      arrears: f.arrears.map((a) => ({
        episodeId: a.episodeId,
        membershipId: a.membershipId,
        firstDueAt: a.firstDueAt,
        complaintAt: a.complaintAt,
        warning: a.warning ? { atTick: a.warning.atTick, deadline: a.warning.deadline } : null,
        resolvedAt: a.resolvedAt,
      })),
      departures: f.departures.map((d) => ({ ...d })),
      maintenance: f.maintenance.map((m) => ({
        agreementId: m.agreementId,
        kind: m.kind,
        partyId: m.partyId,
        beneficiaryIds: [...m.beneficiaryIds],
        beneficiaryEnds: m.beneficiaryEnds
          .filter((d) => d.knownAtTick !== null)
          .map((d) => ({ characterId: d.characterId, atTick: d.knownAtTick })),
        startedAt: m.startedAt,
        endedAt: m.knownEndedAt,
        termsVersion: m.termsVersion,
      })),
    },
  };
}
export function projectEconomyRejection(
  state: CompanyEconomyState,
  error: EconomyError,
  observerCompanyId: string,
) {
  const code = [
    'INVALID_COMMAND',
    'UNKNOWN_COMMAND',
    'INVALID_ARGUMENT',
    'AUTHORIZATION',
    'IDEMPOTENCY_CONFLICT',
    'UNSUPPORTED_ACTION',
    'INSUFFICIENT_FUNDS',
  ].includes(error)
    ? error
    : 'CONTACT_OR_ACCESS_REQUIRED';
  return { code, view: projectCompanyEconomy(state, observerCompanyId) };
}
