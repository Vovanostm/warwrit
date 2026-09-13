import { projectCompanyEconomy } from './economy-view.js';
import {
  checkFreshCompanyRevision,
  companySemanticKey,
  companySourceKey,
  guardCompanyCommand,
} from './guards.js';
import { canonicalJson } from './input.js';
import { LifecycleViolation } from './lifecycle-state.js';
import { prepareCompanyLifecycle } from './lifecycle.js';
import { campaignTick, canonicalRevision, isExactInteger, publicRevision } from './values.js';
import { accrueFinance } from './economy-accrual.js';
import { advanceEconomy } from './economy-advance.js';
import {
  grantFarewell,
  prepareDepartureSettlement,
  requestDeparture,
  updateArrears,
} from './economy-departure.js';
import { observeFinance, recordFinancialDeath } from './economy-knowledge.js';
import { closeMaintenanceForLifecycle, settleLifecycleRequirements } from './economy-lifecycle.js';
import {
  acceptSafeService,
  amendSafeService,
  beginFieldCamp,
  endMaintenance,
} from './economy-maintenance.js';
import { payClaims, transferFunds } from './economy-payments.js';
import { own, EconomyViolation, requireEconomy, validateEconomy } from './economy-state.js';
import { materializeCompanyPhysicalState } from './physical-load.js';
import { PhysicalViolation, validatePhysicalState } from './physical-state.js';
import {
  advancePhysicalTime,
  observePhysical,
  physicalObservableKey,
  preparePhysicalCommand,
  reconcileClosedFoodRequirements,
  settleClosedPhysicalRequirements,
  settlePhysicalRequirements,
} from './physical.js';
import { setActualFinancePaused } from './physical-outcomes.js';
import { preparePracticeCredit } from './practice-credit.js';
import type { PracticeContext } from './practice-admission.js';
import type { CompanyCommand } from './commands.js';
import type { LifecycleReceipt, LifecycleState } from './lifecycle-types.js';
import type {
  CompanyEconomyState,
  EconomyContext,
  EconomyReceipt,
  EconomyResult,
  FinanceChange,
} from './economy-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';

type PracticeEconomyContext = EconomyContext & Pick<PracticeContext, 'practiceFacts'>;

type CommandDraft = {
  readonly root: MaterializedCompanyState;
  readonly lifecycleReceipt: LifecycleReceipt | null;
  readonly requirements: FinanceChange['requirements'];
  readonly allocations: EconomyReceipt['allocations'];
};

function applyCommandAtTarget(
  root: MaterializedCompanyState,
  command: CompanyCommand,
  context: PracticeEconomyContext,
): CommandDraft {
  if (command.type === 'CreditPractice')
    return {
      root: preparePracticeCredit(root, command, context),
      lifecycleReceipt: null,
      requirements: [],
      allocations: [],
    };

  const physical = preparePhysicalCommand(root, command, context);
  if (physical)
    return {
      root: {
        lifecycle: physical.lifecycle,
        finance: physical.finance,
        physical: physical.physical,
      },
      lifecycleReceipt: null,
      requirements: physical.requirements,
      allocations: [],
    };

  let lifecycle = root.lifecycle;
  let lifecycleReceipt: LifecycleReceipt | null = null;
  let change: FinanceChange;
  switch (command.type) {
    case 'RecordDeath':
      change = recordFinancialDeath(root, command, context);
      break;
    case 'PayClaims':
      change = payClaims(root, command, context);
      break;
    case 'TransferFunds':
      change = transferFunds(root, command, context);
      break;
    case 'AdvanceCampaign':
      change = { finance: root.finance, requirements: [], allocations: [] };
      break;
    case 'RequestDeparture':
      change = requestDeparture(root, command, context);
      break;
    case 'ExecuteDeparture':
      change = prepareDepartureSettlement(root, command, context);
      break;
    case 'GrantFarewell':
      change = grantFarewell(root, command, context);
      break;
    case 'BeginFieldCamp':
      change = beginFieldCamp(root, command, context);
      break;
    case 'AcceptSafeService':
      change = acceptSafeService(root, command, context);
      break;
    case 'AmendSafeService':
      change = amendSafeService(root, command, context);
      break;
    case 'EndMaintenance':
      change = endMaintenance(root, command, context);
      break;
    default: {
      const prepared = prepareCompanyLifecycle(root.lifecycle, command, context);
      if (prepared.kind === 'REJECTED') throw new EconomyViolation(prepared.error);
      requireEconomy(!prepared.replayed, 'INVALID_STATE');
      lifecycle = prepared.next;
      lifecycleReceipt = prepared.receipt;
      change = settleLifecycleRequirements(
        root.finance,
        root.lifecycle,
        lifecycle,
        prepared.receipt,
        context,
      );
      if (command.type === 'Observe') {
        const observed = observeFinance(
          change.finance,
          root.lifecycle,
          lifecycle,
          command,
          context,
        );
        change = {
          finance: observed.finance,
          requirements: [...change.requirements, ...observed.requirements],
          allocations: observed.allocations,
        };
      }
      for (const bypass of lifecycle.bypasses) {
        const intent = bypass.notification?.departureIntent;
        if (intent && !change.finance.departures.some((entry) => entry.intentId === intent.id))
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
      if (command.type === 'ReturnToService')
        change = {
          ...change,
          finance: setActualFinancePaused(
            { lifecycle, finance: change.finance, physical: root.physical },
            command.payload.characterId,
            false,
          ),
        };
    }
  }
  return {
    root: { lifecycle, finance: change.finance, physical: root.physical },
    lifecycleReceipt,
    requirements: change.requirements,
    allocations: change.allocations,
  };
}

function publicObservableKey(state: CompanyEconomyState, observerCompanyId: string): string {
  return canonicalJson([
    projectCompanyEconomy(state, observerCompanyId),
    physicalObservableKey(state),
  ]);
}

/** A single lifecycle+finance+physical draft. There is deliberately no child commit API. */
export function prepareCompanyEconomy(
  state: CompanyEconomyState,
  value: unknown,
  context: PracticeEconomyContext,
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
    const semanticKey = companySemanticKey(command);
    const sourceKey = companySourceKey(command);
    const previous =
      state.finance.applied.find((receipt) => receipt.commandId === command.commandId) ??
      (sourceKey === null
        ? undefined
        : state.finance.applied.find((receipt) => receipt.sourceKey === sourceKey));
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
    context = {
      ...context,
      financeFacts: context.financeFacts.map((fact) => own(fact)),
      physicalFacts: (context.physicalFacts ?? []).map((fact) => own(fact)),
      practiceFacts: (context.practiceFacts ?? []).map((fact) => own(fact)),
    };
    let base = materializeCompanyPhysicalState(state);
    validateEconomy(base, context);
    validatePhysicalState(base);
    requireEconomy(
      base.lifecycle.company?.runStatus !== 'GAME_OVER' ||
        command.type === 'CreditPractice' ||
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
      requireEconomy(context.atTick === base.finance.processedTick, 'STALE_REVISION');

    const target =
      command.type === 'AdvanceCampaign' ? campaignTick(command.payload.toTick) : context.atTick;
    const targetContext: PracticeEconomyContext = { ...context, atTick: target };
    const closed =
      command.type === 'AdvanceCampaign'
        ? advanceEconomy(base, command, context)
        : accrueFinance(base.finance, base.lifecycle, target);
    base = { ...base, finance: closed.finance };

    const retroactiveOutcome = command.type === 'RecordDeath' || command.type === 'ResolveMissing';
    let draft: CommandDraft;
    let lifecycleBeforeCommand: LifecycleState;
    let residuals: readonly FinanceChange['requirements'][number][];
    if (retroactiveOutcome) {
      lifecycleBeforeCommand = base.lifecycle;
      draft = applyCommandAtTarget(base, command, targetContext);
      const correctedClosed = reconcileClosedFoodRequirements(draft.root, closed.requirements);
      const lifecycleAtTarget: LifecycleState = {
        ...draft.root.lifecycle,
        campaignTick: target,
      };
      const settled = settlePhysicalRequirements(
        { ...draft.root, lifecycle: lifecycleAtTarget },
        base.lifecycle,
        [...draft.requirements, ...correctedClosed],
        targetContext,
        command.commandId,
        false,
      );
      const recovered = advancePhysicalTime(settled.root, target);
      draft = {
        ...draft,
        root: recovered,
        requirements: [],
        allocations: draft.allocations,
      };
      residuals = settled.residuals;
    } else {
      const closedPhysical = settleClosedPhysicalRequirements(
        base,
        closed.requirements,
        targetContext,
      );
      const timed = advancePhysicalTime(closedPhysical.root, target);
      lifecycleBeforeCommand = timed.lifecycle;
      draft = applyCommandAtTarget(timed, command, targetContext);
      const lifecycleAtTarget: LifecycleState = {
        ...draft.root.lifecycle,
        campaignTick: target,
      };
      const settled = settlePhysicalRequirements(
        { ...draft.root, lifecycle: lifecycleAtTarget },
        timed.lifecycle,
        draft.requirements,
        targetContext,
        command.commandId,
      );
      draft = {
        ...draft,
        root: settled.root,
        requirements: [],
        allocations: draft.allocations,
      };
      residuals = [...closedPhysical.residuals, ...settled.residuals];
    }

    let composed = draft.root;
    if (command.type === 'Observe') composed = observePhysical(composed, command, targetContext);
    composed = {
      ...composed,
      finance: closeMaintenanceForLifecycle(
        composed.finance,
        lifecycleBeforeCommand,
        composed.lifecycle,
        targetContext,
      ),
    };
    const warned = updateArrears(composed.finance, composed.lifecycle, {
      ...targetContext,
      financeFacts: command.type === 'AdvanceCampaign' ? [] : targetContext.financeFacts,
    });
    composed = { ...composed, finance: warned.finance };

    const receipt: EconomyReceipt = {
      commandId: command.commandId,
      requestKey,
      semanticKey,
      sourceKey,
      lifecycleReceipt: draft.lifecycleReceipt,
      events: draft.lifecycleReceipt?.events ?? [],
      requirements: [...residuals, ...warned.requirements],
      allocations: [...closed.allocations, ...draft.allocations],
    };
    let next: CompanyEconomyState = {
      lifecycle: {
        ...composed.lifecycle,
        campaignTick: target,
        revision: canonicalRevision((BigInt(state.lifecycle.revision) + 1n).toString()),
      },
      finance: { ...composed.finance, applied: [...composed.finance.applied, receipt] },
      physical: { ...composed.physical, processedTick: target },
    };
    const beforePublic = publicObservableKey(state, context.companyId);
    const afterPublic = publicObservableKey(next, context.companyId);
    if (beforePublic !== afterPublic)
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
      ...targetContext,
      canonicalRevision: next.lifecycle.revision,
      publicRevision: next.lifecycle.knowledge.revision,
    });
    validatePhysicalState({ lifecycle: next.lifecycle, physical: next.physical! });
    return { kind: 'PREPARED', state, next, receipt, replayed: false };
  } catch (error) {
    if (
      error instanceof EconomyViolation ||
      error instanceof LifecycleViolation ||
      error instanceof PhysicalViolation
    )
      return { kind: 'REJECTED', state, error: error.code };
    if (error instanceof RangeError) return { kind: 'REJECTED', state, error: 'INVALID_STATE' };
    throw error;
  }
}
