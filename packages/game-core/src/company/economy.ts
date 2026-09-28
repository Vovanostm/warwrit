import type { FarewellNotice } from './farewell-social.js';
import { prepareFarewellOutcome, readFarewellOutcome } from './farewell-outcome.js';
import {
  bindFinancialSocialConsequences,
  prepareFinancialSocialContext,
  type FinancialSocialContext,
  type FinancialSocialInput,
  type FinancialSocialKnowledge,
} from './social-finance.js';
import { SocialViolation, type SocialState } from './social.js';
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
import {
  PhysicalViolation,
  itemDefinition,
  physicalItem,
  validatePhysicalState,
} from './physical-state.js';
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
import { prepareLearningComposition } from './learning-composition.js';
import type { LearningSourceContext } from './learning-source.js';
import type { LearningTimeInterval, TrustedLearningCauseManifest } from './learning-time.js';
import { hasStudyAccessOwner } from './study-access.js';
import {
  readCompanyLearningState,
  recordLearningDutyChange,
  recordBookTransfer,
  type CompanyLearningState,
} from './learning-state.js';

type PracticeEconomyContext = EconomyContext & Pick<PracticeContext, 'practiceFacts'>;

type CommandDraft = {
  readonly root: MaterializedCompanyState;
  readonly lifecycleReceipt: LifecycleReceipt | null;
  readonly requirements: FinanceChange['requirements'];
  readonly allocations: EconomyReceipt['allocations'];
};

export interface CompanyEconomyWithLearningState {
  readonly economy: CompanyEconomyState;
  readonly learning: CompanyLearningState;
}

export type CompanyEconomyWithLearningResult =
  | {
      readonly kind: 'REJECTED';
      readonly state: CompanyEconomyWithLearningState;
      readonly error: Extract<EconomyResult, { kind: 'REJECTED' }>['error'];
    }
  | {
      readonly kind: 'PREPARED';
      readonly state: CompanyEconomyWithLearningState;
      readonly next: CompanyEconomyWithLearningState;
      readonly receipt: EconomyReceipt;
      readonly replayed: boolean;
    };

interface LearningTransferInput {
  readonly state: CompanyLearningState;
  readonly intervals: readonly LearningTimeInterval[];
  readonly manifest?: TrustedLearningCauseManifest;
  readonly effectId: string;
  readonly learningFacts: LearningSourceContext['learningFacts'];
}

interface EconomyCandidate {
  readonly economy: EconomyResult;
  readonly learning: CompanyLearningState | null;
}

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
function prepareEconomyCandidate(
  state: CompanyEconomyState,
  value: unknown,
  context: PracticeEconomyContext,
  financialSocial?: FinancialSocialContext,
  learningInput?: LearningTransferInput,
): EconomyCandidate {
  const guarded = guardCompanyCommand(value, context);
  if (!guarded.ok)
    return {
      economy: { kind: 'REJECTED', state, error: guarded.error },
      learning: learningInput?.state ?? null,
    };
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
      return {
        economy: { kind: 'PREPARED', state, next: state, receipt: previous, replayed: true },
        learning: learningInput?.state ?? null,
      };
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
    if (financialSocial)
      context = prepareFinancialSocialContext(state, command, context, financialSocial);
    let base = materializeCompanyPhysicalState(state);
    validateEconomy(base, context);
    for (const r of base.finance.applied)
      if (r.farewellOutcome) readFarewellOutcome(base, r.farewellOutcome.membershipId);
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
    let nextLearning = learningInput?.state ?? null;
    let learningBeforeTransfer: CompanyEconomyState | undefined;
    let learningBeforeDutyChange: CompanyEconomyState | undefined;
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
      let timed = advancePhysicalTime(closedPhysical.root, target);
      if (command.type === 'TransferItem' || (learningInput && command.type === 'SetAssignment'))
        timed = { ...timed, lifecycle: { ...timed.lifecycle, campaignTick: target } };
      if (learningInput) {
        requireEconomy(
          command.type === 'AdvanceCampaign' ||
            command.type === 'TransferItem' ||
            command.type === 'SetAssignment',
          'UNSUPPORTED_ACTION',
        );
        const activeTasks = learningInput.state.tasks.tasks.filter(
          (task) => !task.stop && !task.terminal && task.start.inputs !== undefined,
        );
        const tasks =
          command.type === 'AdvanceCampaign'
            ? activeTasks
            : command.type === 'TransferItem'
              ? activeTasks.filter(
                  (task) =>
                    task.start.inputs?.kind === 'BOOK' &&
                    task.start.command.payload.resourceIds.includes(command.payload.itemId) &&
                    hasStudyAccessOwner(learningInput.state.studyAccess.intervals, {
                      intervalId: task.start.studyIntervalId,
                      itemId: command.payload.itemId,
                      characterId: task.start.command.payload.characterId,
                    }),
                )
              : activeTasks.filter(
                  (task) =>
                    task.start.command.payload.characterId === command.payload.characterId &&
                    timed.lifecycle.characters.find(
                      (character) => character.identity.characterId === command.payload.characterId,
                    )?.presence.assignment !== command.payload.assignment,
                );
        if (command.type === 'TransferItem') {
          requireEconomy(tasks.length <= 1, 'INVALID_STATE');
          requireEconomy(
            tasks.length === 0 || learningInput.manifest !== undefined,
            'INVALID_SOURCE',
          );
        } else if (command.type === 'SetAssignment') {
          requireEconomy(tasks.length <= 1, 'INVALID_STATE');
          requireEconomy(
            tasks.length > 0 === (learningInput.manifest !== undefined),
            'INVALID_SOURCE',
          );
        } else requireEconomy(learningInput.manifest === undefined, 'INVALID_SOURCE');
        requireEconomy(
          learningInput.intervals.every((interval) =>
            tasks.some((task) => task.start.taskId === interval.taskId),
          ) &&
            (tasks.length > 0 || learningInput.intervals.length === 0),
          'INVALID_SOURCE',
        );

        for (const task of tasks) {
          const inputs = task.start.inputs!;
          const progress =
            inputs.kind === 'BOOK'
              ? (learningInput.state.studyProgress.find(
                  (entry) =>
                    entry.characterId === task.start.command.payload.characterId &&
                    entry.workId === inputs.workId &&
                    entry.sectionId === inputs.sectionId,
                ) ?? null)
              : null;
          const taskManifest = learningInput.manifest;
          const composed = prepareLearningComposition(
            timed,
            nextLearning!.tasks,
            nextLearning!.studyAccess,
            progress,
            { ...targetContext, learningFacts: learningInput.learningFacts },
            learningInput.intervals.filter((interval) => interval.taskId === task.start.taskId),
            {
              kind: 'ADVANCE',
              taskId: task.start.taskId,
              effectId: `${learningInput.effectId}-${task.start.taskId}`,
              command,
              ...(taskManifest ? { manifest: taskManifest } : {}),
            },
          );
          const studyProgress = composed.studyProgress
            ? [
                ...nextLearning!.studyProgress.filter(
                  (entry) =>
                    entry.characterId !== composed.studyProgress!.characterId ||
                    entry.workId !== composed.studyProgress!.workId ||
                    entry.sectionId !== composed.studyProgress!.sectionId,
                ),
                composed.studyProgress,
              ]
            : nextLearning!.studyProgress;
          nextLearning = readCompanyLearningState({
            ...nextLearning!,
            tasks: composed.tasks,
            studyAccess: composed.studyAccess,
            studyProgress,
          });
          timed = {
            lifecycle: composed.state.lifecycle,
            finance: composed.state.finance,
            physical: composed.state.physical!,
          };
        }
        if (command.type === 'TransferItem') {
          if (tasks.length === 0)
            requireEconomy(
              learningInput.manifest === undefined && learningInput.intervals.length === 0,
              'INVALID_SOURCE',
            );
          if (itemDefinition(physicalItem(timed.physical, command.payload.itemId)).kind === 'book')
            learningBeforeTransfer = timed;
        }
        if (command.type === 'SetAssignment' && tasks.length > 0) {
          requireEconomy(
            learningInput.manifest?.evidenceIds.includes(command.payload.dutyEvidenceId),
            'INVALID_SOURCE',
          );
          learningBeforeDutyChange = timed;
        }
      }
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

    let receipt: EconomyReceipt = {
      commandId: command.commandId,
      requestKey,
      semanticKey,
      sourceKey,
      lifecycleReceipt: draft.lifecycleReceipt,
      events: draft.lifecycleReceipt?.events ?? [],
      requirements: [...residuals, ...warned.requirements],
      allocations: [...closed.allocations, ...draft.allocations],
    };
    if (command.type === 'ExecuteDeparture')
      receipt = {
        ...receipt,
        farewellOutcome: prepareFarewellOutcome(
          lifecycleBeforeCommand,
          {
            ...composed,
            finance: { ...composed.finance, applied: [...composed.finance.applied, receipt] },
          },
          command,
        ),
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
    if (learningBeforeTransfer && nextLearning)
      nextLearning = recordBookTransfer(nextLearning, learningBeforeTransfer, next, command);
    if (learningBeforeDutyChange && nextLearning)
      nextLearning = recordLearningDutyChange(
        nextLearning,
        learningBeforeDutyChange,
        next,
        command,
      );
    return {
      economy: { kind: 'PREPARED', state, next, receipt, replayed: false },
      learning: nextLearning,
    };
  } catch (error) {
    if (
      error instanceof EconomyViolation ||
      error instanceof LifecycleViolation ||
      error instanceof PhysicalViolation
    )
      return {
        economy: { kind: 'REJECTED', state, error: error.code },
        learning: learningInput?.state ?? null,
      };
    if (error instanceof RangeError)
      return {
        economy: { kind: 'REJECTED', state, error: 'INVALID_STATE' },
        learning: learningInput?.state ?? null,
      };
    throw error;
  }
}

export function prepareCompanyEconomy(
  state: CompanyEconomyState,
  value: unknown,
  context: PracticeEconomyContext,
  financialSocial?: FinancialSocialContext,
): EconomyResult {
  return prepareEconomyCandidate(state, value, context, financialSocial).economy;
}

/** One atomic candidate for a real book transfer and its trusted C05 learning prefix. */
export function prepareCompanyEconomyWithLearning(
  stateValue: CompanyEconomyWithLearningState,
  value: unknown,
  context: PracticeEconomyContext & LearningSourceContext,
  interruption: {
    readonly intervals: readonly LearningTimeInterval[];
    readonly manifest?: TrustedLearningCauseManifest;
    readonly effectId: string;
  },
): CompanyEconomyWithLearningResult {
  const learning = readCompanyLearningState(stateValue.learning);
  const prepared = prepareEconomyCandidate(stateValue.economy, value, context, undefined, {
    state: learning,
    intervals: interruption.intervals,
    ...(interruption.manifest ? { manifest: interruption.manifest } : {}),
    effectId: interruption.effectId,
    learningFacts: context.learningFacts,
  });
  if (prepared.economy.kind === 'REJECTED') return { ...prepared.economy, state: stateValue };
  const nextLearning = prepared.economy.replayed ? learning : (prepared.learning ?? learning);
  return {
    ...prepared.economy,
    state: stateValue,
    next: { economy: prepared.economy.next, learning: nextLearning },
  };
}

/** Internal indivisible candidate; the original receipt keeps its historical requirements. */
export function prepareCompanyFinancialSocial(
  state: CompanyEconomyState,
  social: SocialState,
  value: unknown,
  context: PracticeEconomyContext,
  inputs: readonly FinancialSocialInput[] = [],
  knowledge: readonly FinancialSocialKnowledge[] = [],
  notices: readonly FarewellNotice[] = [],
) {
  try {
    const result = prepareCompanyEconomy(state, value, context, { social, inputs });
    if (result.kind === 'REJECTED') return { ...result, social };
    const bound = bindFinancialSocialConsequences(social, result, knowledge, notices);
    return { ...result, social: bound.social, requirements: bound.requirements };
  } catch (error) {
    if (error instanceof EconomyViolation || error instanceof SocialViolation)
      return {
        kind: 'REJECTED' as const,
        state,
        social,
        error: error instanceof EconomyViolation ? error.code : ('INVALID_SOURCE' as const),
      };
    throw error;
  }
}
