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
import { canPerform, LifecycleViolation } from './lifecycle-state.js';
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
import {
  own,
  EconomyViolation,
  requireEconomy,
  validateEconomy,
  walletFor,
} from './economy-state.js';
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
import type {
  DeathOutcomeEvidence,
  MissingEntryEvidence,
  MissingResolutionEvidence,
} from './physical-types.js';
import { prepareLearningComposition } from './learning-composition.js';
import type { LearningSourceContext } from './learning-source.js';
import type {
  LearningCause,
  LearningTimeInterval,
  TrustedLearningCauseManifest,
} from './learning-time.js';
import { safeServiceCoversAt } from './learning-time.js';
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
  readonly manifests?: readonly TrustedLearningCauseManifest[];
  readonly effectId: string;
  readonly learningFacts: LearningSourceContext['learningFacts'];
  readonly taskId?: string;
  readonly study?: {
    readonly intervalId: string;
    readonly itemId: string;
    readonly accessEvidenceId: string;
  };
  readonly accessEvidenceId?: string;
}

interface EconomyCandidate {
  readonly economy: EconomyResult;
  readonly learning: CompanyLearningState | null;
}

function retroactiveOutcomeTick(command: CompanyCommand, context: EconomyContext): string {
  if (command.type === 'RecordDeath') {
    const fact = context.physicalFacts?.find(
      (entry) =>
        entry.kind === 'DEATH_OUTCOME' &&
        entry.id === command.payload.custodyOutcomeId &&
        entry.sourceEventId === command.sourceEventId &&
        entry.characterId === command.payload.characterId &&
        entry.causeId === command.payload.causeId,
    ) as DeathOutcomeEvidence | undefined;
    requireEconomy(
      fact && fact.actualDeathTick === command.payload.actualDeathTick,
      'INVALID_SOURCE',
    );
    return fact.actualDeathTick;
  }
  if (command.type === 'RecordMissing') {
    const fact = context.physicalFacts?.find(
      (entry) =>
        entry.kind === 'MISSING_ENTRY' &&
        entry.id === command.payload.receiptId &&
        entry.sourceEventId === command.sourceEventId &&
        entry.characterId === command.payload.characterId,
    ) as MissingEntryEvidence | undefined;
    requireEconomy(fact, 'INVALID_SOURCE');
    return fact.atTick;
  }
  requireEconomy(command.type === 'ResolveMissing', 'INVALID_ARGUMENT');
  const fact = context.physicalFacts?.find(
    (entry) =>
      entry.kind === 'MISSING_RESOLUTION' &&
      entry.id === command.payload.outcomeReceiptId &&
      entry.sourceEventId === command.sourceEventId &&
      entry.characterId === command.payload.characterId,
  ) as MissingResolutionEvidence | undefined;
  requireEconomy(fact, 'INVALID_SOURCE');
  if (fact.outcome === 'DEAD') {
    requireEconomy(fact.actualDeathTick, 'INVALID_SOURCE');
    return fact.actualDeathTick;
  }
  return fact.atTick;
}

function learningSourceForTask(
  task: CompanyLearningState['tasks']['tasks'][number],
  learningFacts: LearningSourceContext['learningFacts'],
) {
  const matches = learningFacts.filter(
    (source) =>
      source.id === task.start.quote.sourceId &&
      source.sourceVersion === task.start.quote.sourceVersion,
  );
  requireEconomy(matches.length === 1, 'INVALID_SOURCE');
  return matches[0]!;
}

export function taskParticipants(
  task: CompanyLearningState['tasks']['tasks'][number],
  learningFacts: LearningSourceContext['learningFacts'] | undefined,
  root: MaterializedCompanyState,
): readonly string[] {
  const learnerId = task.start.command.payload.characterId;
  const source = learningFacts ? learningSourceForTask(task, learningFacts) : undefined;
  if (source?.kind === 'COURSE')
    return [
      ...new Set(
        [learnerId, source.providerId, source.mentorId].filter((id): id is string => !!id),
      ),
    ];
  const funding = task.start.quote.funding;
  if (!source && funding) {
    const provider = walletFor(root.finance, funding.providerWalletId).owner;
    requireEconomy(provider.kind === 'CHARACTER', 'INVALID_STATE');
    return [
      ...new Set(
        [learnerId, provider.id, task.start.quote.mentorId].filter(
          (id): id is string => id !== null,
        ),
      ),
    ];
  }
  return [learnerId];
}

function taskAvailableAt(
  task: CompanyLearningState['tasks']['tasks'][number],
  root: MaterializedCompanyState,
  learning: CompanyLearningState,
  learningFacts: LearningSourceContext['learningFacts'],
  atTick: string,
): boolean {
  const source = learningSourceForTask(task, learningFacts);
  const learnerId = task.start.command.payload.characterId;
  const learner = root.lifecycle.characters.find(
    (entry) => entry.identity.characterId === learnerId,
  );
  if (!learner) return false;
  const membership = root.lifecycle.memberships.find(
    (entry) =>
      entry.characterId === learnerId &&
      entry.companyId === root.lifecycle.companyId &&
      BigInt(entry.startedAt) <= BigInt(atTick) &&
      (entry.endedAt === null || BigInt(entry.endedAt) > BigInt(atTick)),
  );
  if (
    !membership ||
    learner.presence.availability !== 'AVAILABLE' ||
    learner.presence.encounterBindingId !== null ||
    !canPerform(learner, 'study') ||
    canonicalJson(learner.presence.location) !== canonicalJson(source.location) ||
    safeServiceCoversAt(root.finance.maintenance, learnerId, atTick)
  )
    return false;

  if (source.kind === 'SELF_STUDY') {
    if (task.start.inputs?.kind !== 'BOOK') return false;
    const access = learning.studyAccess.intervals.find(
      (entry) => entry.intervalId === task.start.studyIntervalId,
    );
    if (!access || BigInt(access.fromTick) > BigInt(atTick)) return false;
    const end = access.effectiveToTick ?? access.toTick;
    if (BigInt(end) < BigInt(atTick)) return false;
    const book = root.physical.items.find((entry) => entry.itemId === access.itemId);
    const container = book?.containerId
      ? root.physical.containers.find((entry) => entry.containerId === book.containerId)
      : undefined;
    return (
      book?.tombstone === null &&
      !!container &&
      container.closed === null &&
      canonicalJson(container.location) === canonicalJson(learner.presence.location) &&
      (container.carrier === null ||
        (container.carrier.kind === 'CHARACTER' && container.carrier.id === learnerId) ||
        (container.carrier.kind === 'PARTY' &&
          container.carrier.id === learner.presence.fieldPartyId))
    );
  }

  if (task.start.inputs?.kind !== 'COURSE') return false;
  for (const providerId of new Set([source.providerId, source.mentorId])) {
    if (!providerId) continue;
    const provider = root.lifecycle.characters.find(
      (entry) => entry.identity.characterId === providerId,
    );
    if (
      !provider ||
      provider.presence.availability !== 'AVAILABLE' ||
      provider.presence.encounterBindingId !== null ||
      !canPerform(provider, 'basicWork') ||
      canonicalJson(provider.presence.location) !== canonicalJson(source.location) ||
      provider.presence.assignment === 'REMOTE_TASK'
    )
      return false;
  }
  return true;
}

function affectedLearningTasks(
  command: CompanyCommand,
  root: MaterializedCompanyState,
  proposed: MaterializedCompanyState,
  learning: CompanyLearningState,
  learningFacts: LearningSourceContext['learningFacts'],
) {
  const active = learning.tasks.tasks.filter(
    (task) => !task.stop && !task.terminal && task.start.inputs !== undefined,
  );
  if (command.type === 'AdvanceCampaign') return active;

  if (command.type === 'TransferItem' || command.type === 'ApplyContainerLifecycle') {
    const itemIds = new Set(
      command.type === 'TransferItem'
        ? [command.payload.itemId]
        : root.physical.items
            .filter((item) => item.containerId === command.payload.containerId)
            .map((item) => item.itemId),
    );
    return active.filter(
      (task) =>
        task.start.inputs?.kind === 'BOOK' &&
        task.start.command.payload.resourceIds.some((id) => itemIds.has(id)) &&
        hasStudyAccessOwner(learning.studyAccess.intervals, {
          intervalId: task.start.studyIntervalId,
          itemId: [...itemIds].find((id) => task.start.command.payload.resourceIds.includes(id))!,
          characterId: task.start.command.payload.characterId,
        }) &&
        (command.type === 'TransferItem' ||
          (taskAvailableAt(task, root, learning, learningFacts, command.campaignTick) &&
            !taskAvailableAt(task, proposed, learning, learningFacts, command.campaignTick))),
    );
  }

  const characterIds = new Set<string>();
  switch (command.type) {
    case 'ApplyCondition':
    case 'Arrive':
    case 'SetAssignment':
    case 'Capture':
    case 'ReleaseCaptive':
    case 'TransferCaptive':
    case 'ResolveMissing':
    case 'RecordMissing':
    case 'RecordDeath':
      characterIds.add(command.payload.characterId);
      break;
    case 'ExecuteDeparture': {
      const member = root.lifecycle.memberships.find(
        (entry) => entry.membershipId === command.payload.membershipId && entry.endedAt === null,
      );
      requireEconomy(member, 'INVALID_SOURCE');
      characterIds.add(member.characterId);
      break;
    }
    case 'BeginFieldCamp':
      // A camp does not itself make a learner an F1 beneficiary or alter local duty.
      break;
    case 'AcceptSafeService':
      command.payload.beneficiaryIds.forEach((id) => characterIds.add(id));
      break;
    case 'AmendSafeService': {
      const agreement = root.finance.maintenance.find(
        (entry) => entry.agreementId === command.payload.agreementId,
      );
      requireEconomy(agreement?.kind === 'SAFE_SERVICE', 'INVALID_SOURCE');
      const activeBeneficiaries = agreement.beneficiaryIds.filter(
        (id) => !agreement.beneficiaryEnds.some((end) => end.characterId === id),
      );
      command.payload.beneficiaryIds
        .filter((id) => !activeBeneficiaries.includes(id))
        .forEach((id) => characterIds.add(id));
      break;
    }
    default:
      return [];
  }

  return active.filter((task) => {
    if (!taskParticipants(task, learningFacts, root).some((id) => characterIds.has(id)))
      return false;
    const wasAvailable = taskAvailableAt(task, root, learning, learningFacts, command.campaignTick);
    const isAvailable = taskAvailableAt(
      task,
      proposed,
      learning,
      learningFacts,
      command.campaignTick,
    );
    if (
      [
        'Capture',
        'ReleaseCaptive',
        'TransferCaptive',
        'ResolveMissing',
        'RecordMissing',
        'RecordDeath',
      ].includes(command.type)
    )
      return true;
    return (wasAvailable && !isAvailable) || (command.type === 'Arrive' && !isAvailable);
  });
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
    const retroactiveOutcome =
      command.type === 'RecordDeath' ||
      command.type === 'ResolveMissing' ||
      command.type === 'RecordMissing';
    const factualOutcome =
      retroactiveOutcome && learningInput ? retroactiveOutcomeTick(command, context) : target;
    let nextLearning = learningInput?.state ?? null;
    let learningBeforeTransfer: CompanyEconomyState | undefined;
    let learningBeforeDutyChange: CompanyEconomyState | undefined;
    let learningCommandHandled = false;
    const closed =
      command.type === 'AdvanceCampaign'
        ? advanceEconomy(base, command, context)
        : accrueFinance(base.finance, base.lifecycle, campaignTick(factualOutcome));
    base = { ...base, finance: closed.finance };

    let draft: CommandDraft;
    let lifecycleBeforeCommand: LifecycleState;
    let residuals: readonly FinanceChange['requirements'][number][];
    if (retroactiveOutcome) {
      if (learningInput) {
        const boundary = campaignTick(factualOutcome);
        base = { ...base, lifecycle: { ...base.lifecycle, campaignTick: boundary } };
        const prefixFood = settleClosedPhysicalRequirements(
          base,
          closed.requirements,
          targetContext,
        );
        const atBoundary = {
          ...advancePhysicalTime(prefixFood.root, factualOutcome),
          lifecycle: { ...prefixFood.root.lifecycle, campaignTick: boundary },
        };
        const proposed = applyCommandAtTarget(atBoundary, command, targetContext);
        const outcome = settlePhysicalRequirements(
          { ...proposed.root, lifecycle: { ...proposed.root.lifecycle, campaignTick: boundary } },
          atBoundary.lifecycle,
          proposed.requirements,
          targetContext,
          command.commandId,
        );
        const postOutcomeAccrual = accrueFinance(
          outcome.root.finance,
          outcome.root.lifecycle,
          campaignTick(target),
        );
        const postOutcome = {
          ...outcome.root,
          lifecycle: { ...outcome.root.lifecycle, campaignTick: target },
          finance: postOutcomeAccrual.finance,
        };
        const survivorFood = settleClosedPhysicalRequirements(
          postOutcome,
          postOutcomeAccrual.requirements,
          targetContext,
        );
        const recovered = advancePhysicalTime(survivorFood.root, target);
        const tasks = affectedLearningTasks(
          command,
          atBoundary,
          recovered,
          learningInput.state,
          learningInput.learningFacts,
        );
        const manifests =
          learningInput.manifests ?? (learningInput.manifest ? [learningInput.manifest] : []);
        requireEconomy(
          new Set(manifests.map((entry) => entry.taskId)).size === manifests.length &&
            manifests.length === tasks.length &&
            manifests.every((entry) => tasks.some((task) => task.start.taskId === entry.taskId)),
          'INVALID_SOURCE',
        );
        requireEconomy(
          learningInput.intervals.every((interval) =>
            tasks.some((task) => task.start.taskId === interval.taskId),
          ) &&
            (tasks.length > 0 || learningInput.intervals.length === 0),
          'INVALID_SOURCE',
        );
        lifecycleBeforeCommand = atBoundary.lifecycle;
        base = materializeCompanyPhysicalState(recovered);
        draft = {
          ...proposed,
          root: recovered,
          requirements: [],
        };
        residuals = [...prefixFood.residuals, ...outcome.residuals, ...survivorFood.residuals];
        for (const task of tasks) {
          const inputs = task.start.inputs;
          if (!inputs) throw new RangeError('LEARNING_START_INPUTS_REQUIRED');
          const progress =
            inputs.kind === 'BOOK'
              ? (learningInput.state.studyProgress.find(
                  (entry) =>
                    entry.characterId === task.start.command.payload.characterId &&
                    entry.workId === inputs.workId &&
                    entry.sectionId === inputs.sectionId,
                ) ?? null)
              : null;
          const manifest = manifests.find((entry) => entry.taskId === task.start.taskId)!;
          const composed = prepareLearningComposition(
            base,
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
              manifest,
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
          base = materializeCompanyPhysicalState(composed.state);
          draft = { ...draft, root: base };
        }
      } else {
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
      }
    } else {
      const closedPhysical = settleClosedPhysicalRequirements(
        base,
        closed.requirements,
        targetContext,
      );
      let timed = advancePhysicalTime(closedPhysical.root, target);
      if (
        command.type === 'TransferItem' ||
        (learningInput &&
          ['AdvanceCampaign', 'SetAssignment', 'StartLearning', 'StopLearning'].includes(
            command.type,
          ))
      )
        timed = { ...timed, lifecycle: { ...timed.lifecycle, campaignTick: target } };
      if (learningInput) {
        if (command.type === 'StartLearning') {
          requireEconomy(learningInput.taskId, 'INVALID_ARGUMENT');
          requireEconomy(
            learningInput.intervals.length === 0 &&
              !learningInput.manifest &&
              (learningInput.manifests?.length ?? 0) === 0,
            'INVALID_SOURCE',
          );
          const composed = prepareLearningComposition(
            timed,
            nextLearning!.tasks,
            nextLearning!.studyAccess,
            null,
            { ...targetContext, learningFacts: learningInput.learningFacts },
            [],
            {
              kind: 'START',
              taskId: learningInput.taskId,
              effectId: learningInput.effectId,
              admission: {
                taskId: learningInput.taskId,
                command,
                ...(learningInput.study ? { study: learningInput.study } : {}),
              },
              ...(!learningInput.study && learningInput.accessEvidenceId
                ? { accessEvidenceId: learningInput.accessEvidenceId }
                : {}),
            },
          );
          nextLearning = readCompanyLearningState({
            ...nextLearning!,
            tasks: composed.tasks,
            studyAccess: composed.studyAccess,
          });
          timed = {
            lifecycle: composed.state.lifecycle,
            finance: composed.state.finance,
            physical: composed.state.physical!,
          };
          learningCommandHandled = true;
        } else if (command.type === 'StopLearning') {
          const manifests =
            learningInput.manifests ?? (learningInput.manifest ? [learningInput.manifest] : []);
          const manifest = manifests.find((entry) => entry.taskId === command.payload.taskId);
          requireEconomy(manifest && manifests.length === 1, 'INVALID_SOURCE');
          const task = nextLearning!.tasks.tasks.find(
            (entry) => entry.start.taskId === command.payload.taskId,
          );
          requireEconomy(task, 'INVALID_ARGUMENT');
          const inputs = task.start.inputs;
          if (!inputs) throw new RangeError('LEARNING_START_INPUTS_REQUIRED');
          const progress =
            inputs.kind === 'BOOK'
              ? (nextLearning!.studyProgress.find(
                  (entry) =>
                    entry.characterId === task.start.command.payload.characterId &&
                    entry.workId === inputs.workId &&
                    entry.sectionId === inputs.sectionId,
                ) ?? null)
              : null;
          const composed = prepareLearningComposition(
            timed,
            nextLearning!.tasks,
            nextLearning!.studyAccess,
            progress,
            { ...targetContext, learningFacts: learningInput.learningFacts },
            learningInput.intervals,
            {
              kind: 'STOP',
              taskId: task.start.taskId,
              effectId: learningInput.effectId,
              command,
              intervals: learningInput.intervals,
              manifest,
              ...(inputs.kind === 'COURSE' && learningInput.accessEvidenceId
                ? { accessEvidenceId: learningInput.accessEvidenceId }
                : {}),
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
          learningCommandHandled = true;
        }
      }
      if (learningInput && !learningCommandHandled) {
        const causeCommands = [
          'AdvanceCampaign',
          'TransferItem',
          'SetAssignment',
          'Arrive',
          'ExecuteDeparture',
          'BeginFieldCamp',
          'AcceptSafeService',
          'AmendSafeService',
          'EndMaintenance',
          'ApplyContainerLifecycle',
          'ApplyCondition',
          'Capture',
          'ReleaseCaptive',
          'TransferCaptive',
          'ResolveMissing',
          'RecordMissing',
          'RecordDeath',
        ];
        requireEconomy(causeCommands.includes(command.type), 'UNSUPPORTED_ACTION');
        const proposed = applyCommandAtTarget(timed, command, targetContext);
        const tasks = affectedLearningTasks(
          command,
          timed,
          proposed.root,
          learningInput.state,
          learningInput.learningFacts,
        );
        const manifests =
          learningInput.manifests ?? (learningInput.manifest ? [learningInput.manifest] : []);
        requireEconomy(
          new Set(manifests.map((entry) => entry.taskId)).size === manifests.length &&
            manifests.every((entry) => tasks.some((task) => task.start.taskId === entry.taskId)),
          'INVALID_SOURCE',
        );
        requireEconomy(manifests.length === tasks.length, 'INVALID_SOURCE');
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
          const taskManifest = manifests.find((entry) => entry.taskId === task.start.taskId);
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
              command: command as LearningCause,
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
          if (itemDefinition(physicalItem(timed.physical, command.payload.itemId)).kind === 'book')
            learningBeforeTransfer = timed;
        }
        if (command.type === 'SetAssignment' && tasks.length > 0) {
          requireEconomy(
            manifests.some((entry) => entry.evidenceIds.includes(command.payload.dutyEvidenceId)),
            'INVALID_SOURCE',
          );
          learningBeforeDutyChange = timed;
        }
      }
      lifecycleBeforeCommand = timed.lifecycle;
      draft = learningCommandHandled
        ? { root: timed, lifecycleReceipt: null, requirements: [], allocations: [] }
        : applyCommandAtTarget(timed, command, targetContext);
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
    readonly manifests?: readonly TrustedLearningCauseManifest[];
    readonly effectId: string;
    readonly taskId?: string;
    readonly study?: LearningTransferInput['study'];
    readonly accessEvidenceId?: string;
  },
): CompanyEconomyWithLearningResult {
  const learning = readCompanyLearningState(stateValue.learning);
  const prepared = prepareEconomyCandidate(stateValue.economy, value, context, undefined, {
    state: learning,
    intervals: interruption.intervals,
    ...(interruption.manifest ? { manifest: interruption.manifest } : {}),
    ...(interruption.manifests ? { manifests: interruption.manifests } : {}),
    effectId: interruption.effectId,
    learningFacts: context.learningFacts,
    ...(interruption.taskId ? { taskId: interruption.taskId } : {}),
    ...(interruption.study ? { study: interruption.study } : {}),
    ...(interruption.accessEvidenceId ? { accessEvidenceId: interruption.accessEvidenceId } : {}),
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
