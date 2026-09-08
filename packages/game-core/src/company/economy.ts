import { checkFreshCompanyRevision, companySourceKey, guardCompanyCommand } from './guards.js';
import { canonicalJson } from './input.js';
import { LifecycleViolation } from './lifecycle-state.js';
import { projectCompanyLifecycle } from './lifecycle.js';
import { campaignTick, canonicalRevision, isExactInteger, publicRevision } from './values.js';
import { accrueFinance } from './economy-accrual.js';
import { payClaims, transferFunds } from './economy-payments.js';
import {
  accountFor,
  committedQ,
  EconomyViolation,
  q,
  reportedOwedQ,
  requireEconomy,
  reservedQ,
  spendableQ,
  validateEconomy,
} from './economy-state.js';
import type {
  CompanyEconomyState,
  EconomyContext,
  EconomyError,
  EconomyReceipt,
  EconomyResult,
  FinanceChange,
} from './economy-types.js';

/** A single lifecycle+ledger draft. There is deliberately no aggregate Accepted/commit API. */
export function prepareCompanyEconomy(
  state: CompanyEconomyState,
  value: unknown,
  context: EconomyContext,
): EconomyResult {
  const guarded = guardCompanyCommand(value, context);
  if (!guarded.ok) return { kind: 'REJECTED', state, error: guarded.error };
  const command = guarded.command;
  try {
    requireEconomy(
      state.lifecycle.companyId === context.companyId &&
        state.lifecycle.worldId === context.worldId,
      'AUTHORIZATION',
    );
    const requestKey = canonicalJson(command);
    const semanticKey = canonicalJson({ type: command.type, payload: command.payload });
    const sourceKey = companySourceKey(command);
    const previous =
      state.finance.applied.find((r) => r.commandId === command.commandId) ??
      (sourceKey === null
        ? undefined
        : state.finance.applied.find((r) => r.sourceKey === sourceKey));
    if (previous) {
      requireEconomy(
        previous.commandId === command.commandId
          ? previous.requestKey === requestKey
          : previous.semanticKey === semanticKey,
        'IDEMPOTENCY_CONFLICT',
      );
      return { kind: 'PREPARED', state, next: state, receipt: previous, replayed: true };
    }
    requireEconomy(
      context.canonicalRevision === state.lifecycle.revision &&
        context.publicRevision === state.lifecycle.knowledge.revision &&
        checkFreshCompanyRevision(command, context),
      'STALE_REVISION',
    );
    requireEconomy(
      isExactInteger(context.atTick) &&
        command.campaignTick === context.atTick &&
        BigInt(context.atTick) >= BigInt(state.finance.processedTick),
      'INVALID_TIME',
    );
    validateEconomy(state, context);
    const target =
      command.type === 'AdvanceCampaign' ? campaignTick(command.payload.toTick) : context.atTick;
    if (command.type === 'AdvanceCampaign')
      requireEconomy(command.payload.authoritativeInputs.length === 0, 'UNSUPPORTED_ACTION');
    const closed = accrueFinance(state.finance, state.lifecycle, target);
    const atTarget = { ...state, finance: closed.finance };
    let change: FinanceChange;
    switch (command.type) {
      case 'PayClaims':
        change = payClaims(atTarget, command, context);
        break;
      case 'TransferFunds':
        change = transferFunds(atTarget, command, context);
        break;
      case 'AdvanceCampaign':
        change = { finance: closed.finance, requirements: [], allocations: [] };
        break;
      default:
        throw new EconomyViolation('UNSUPPORTED_ACTION');
    }
    const receipt: EconomyReceipt = {
      commandId: command.commandId,
      requestKey,
      semanticKey,
      sourceKey,
      lifecycleReceipt: null,
      events: [],
      requirements: [...closed.requirements, ...change.requirements],
      allocations: change.allocations,
    };
    let next: CompanyEconomyState = {
      lifecycle: {
        ...state.lifecycle,
        campaignTick: target,
        revision: canonicalRevision((BigInt(state.lifecycle.revision) + 1n).toString()),
      },
      finance: { ...change.finance, applied: [...change.finance.applied, receipt] },
    };
    if (
      JSON.stringify(projectCompanyEconomy(next, context.companyId)) !==
      JSON.stringify(projectCompanyEconomy(state, context.companyId))
    )
      next = {
        ...next,
        lifecycle: {
          ...next.lifecycle,
          knowledge: {
            ...next.lifecycle.knowledge,
            revision: publicRevision((BigInt(state.lifecycle.knowledge.revision) + 1n).toString()),
          },
        },
      };
    validateEconomy(next, {
      ...context,
      atTick: target,
      canonicalRevision: next.lifecycle.revision,
      publicRevision: next.lifecycle.knowledge.revision,
    });
    return { kind: 'PREPARED', state, next, receipt, replayed: false };
  } catch (error) {
    if (error instanceof EconomyViolation || error instanceof LifecycleViolation)
      return { kind: 'REJECTED', state, error: error.code };
    if (error instanceof RangeError) return { kind: 'REJECTED', state, error: 'INVALID_STATE' };
    throw error;
  }
}
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
        ...a,
        warning: a.warning ? { ...a.warning, relation: { ...a.warning.relation } } : null,
      })),
      departures: f.departures.map((d) => ({ ...d })),
      maintenance: f.maintenance.map((m) => ({
        agreementId: m.agreementId,
        kind: m.kind,
        partyId: m.partyId,
        beneficiaryIds: [...m.beneficiaryIds],
        startedAt: m.startedAt,
        endedAt: m.endedAt,
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
