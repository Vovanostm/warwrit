import { checkFreshCompanyRevision, companySourceKey, guardCompanyCommand } from './guards.js';
import { canonicalJson } from './input.js';
import { LifecycleViolation } from './lifecycle-state.js';
import { prepareCompanyLifecycle, projectCompanyLifecycle } from './lifecycle.js';
import { campaignTick, canonicalRevision, isExactInteger, publicRevision } from './values.js';
import { accrueFinance } from './economy-accrual.js';
import { advanceEconomy } from './economy-advance.js';
import {
  grantFarewell,
  prepareDepartureSettlement,
  requestDeparture,
  updateArrears,
} from './economy-departure.js';
import { observeFinance } from './economy-knowledge.js';
import { closeMaintenanceForLifecycle, settleLifecycleRequirements } from './economy-lifecycle.js';
import {
  acceptSafeService,
  amendSafeService,
  beginFieldCamp,
  endMaintenance,
} from './economy-maintenance.js';
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
import type { LifecycleReceipt } from './lifecycle-types.js';
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
    requireEconomy(
      state.lifecycle.company?.runStatus !== 'GAME_OVER' ||
        ['Observe', 'RecordDeath', 'AdvanceCampaign', 'PayClaims', 'TransferFunds'].includes(
          command.type,
        ),
      'TERMINAL',
    );
    if (
      ['GrantFarewell', 'RequestDeparture', 'AcceptSafeService', 'AmendSafeService'].includes(
        command.type,
      )
    )
      requireEconomy(context.atTick === state.finance.processedTick, 'STALE_REVISION');
    const target =
      command.type === 'AdvanceCampaign' ? campaignTick(command.payload.toTick) : context.atTick;
    const closed =
      command.type === 'AdvanceCampaign'
        ? advanceEconomy(state, command, context)
        : accrueFinance(state.finance, state.lifecycle, target);
    const atTarget = { ...state, finance: closed.finance };
    let lifecycle = state.lifecycle;
    let lifecycleReceipt: LifecycleReceipt | null = null;
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
      case 'RequestDeparture':
        change = requestDeparture(atTarget, command, context);
        break;
      case 'ExecuteDeparture':
        change = prepareDepartureSettlement(atTarget, command, context);
        break;
      case 'GrantFarewell':
        change = grantFarewell(atTarget, command, context);
        break;
      case 'BeginFieldCamp':
        change = beginFieldCamp(atTarget, command, context);
        break;
      case 'AcceptSafeService':
        change = acceptSafeService(atTarget, command, context);
        break;
      case 'AmendSafeService':
        change = amendSafeService(atTarget, command, context);
        break;
      case 'EndMaintenance':
        change = endMaintenance(atTarget, command, context);
        break;
      default: {
        const prepared = prepareCompanyLifecycle(state.lifecycle, command, context);
        if (prepared.kind === 'REJECTED') throw new EconomyViolation(prepared.error);
        // A lifecycle receipt without its finance receipt indicates a forbidden partial write.
        requireEconomy(!prepared.replayed, 'INVALID_STATE');
        lifecycle = prepared.next;
        lifecycleReceipt = prepared.receipt;
        change = settleLifecycleRequirements(
          closed.finance,
          state.lifecycle,
          lifecycle,
          prepared.receipt,
          context,
        );
        change = {
          ...change,
          finance: closeMaintenanceForLifecycle(
            change.finance,
            state.lifecycle,
            lifecycle,
            context.atTick,
          ),
        };
        if (command.type === 'Observe') {
          const observed = observeFinance(change.finance, lifecycle, command, context);
          change = {
            finance: observed.finance,
            requirements: [...change.requirements, ...observed.requirements],
            allocations: observed.allocations,
          };
        }
        for (const bypass of lifecycle.bypasses) {
          const intent = bypass.notification?.departureIntent;
          if (intent && !change.finance.departures.some((d) => d.intentId === intent.id))
            change = {
              ...change,
              finance: {
                ...change.finance,
                departures: [
                  ...change.finance.departures,
                  {
                    intentId: intent.id,
                    membershipId: intent.membershipId,
                    reason: 'CANONICAL_EVENT',
                    causeId: bypass.eventId,
                    requestedAt: bypass.notification!.learnedAt,
                    cancelledAt: null,
                  },
                ],
              },
            };
        }
      }
    }
    const warned = updateArrears(change.finance, lifecycle, {
      ...context,
      atTick: target,
      financeFacts: command.type === 'AdvanceCampaign' ? [] : context.financeFacts,
    });
    const receipt: EconomyReceipt = {
      commandId: command.commandId,
      requestKey,
      semanticKey,
      sourceKey,
      lifecycleReceipt,
      events: lifecycleReceipt?.events ?? [],
      requirements: [...closed.requirements, ...change.requirements, ...warned.requirements],
      allocations: [...closed.allocations, ...change.allocations],
    };
    let next: CompanyEconomyState = {
      lifecycle: {
        ...lifecycle,
        campaignTick: target,
        revision: canonicalRevision((BigInt(state.lifecycle.revision) + 1n).toString()),
      },
      finance: { ...warned.finance, applied: [...warned.finance.applied, receipt] },
    };
    if (
      canonicalJson(projectCompanyEconomy(next, context.companyId)) !==
      canonicalJson(projectCompanyEconomy(state, context.companyId))
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
