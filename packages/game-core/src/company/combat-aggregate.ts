import type { BattleState } from '../combat/types.js';
import { canonicalCombatState } from '../combat/replay.js';
import { canonicalJson, id } from './input.js';
import { EconomyViolation, validateEconomy } from './economy-state.js';
import { validateCombatReceiptJournal } from './combat-receipts.js';
import { prepareCompanyEconomyWithLearning, taskParticipants } from './economy.js';
import type { CompanyEconomyWithLearningState } from './economy.js';
import type { EconomyContext } from './economy-types.js';
import type { EncounterPositionEvidence, FrozenEncounterBinding } from './encounter-binding.js';
import { prepareEncounterBinding } from './encounter-binding.js';
import type { CommandOf } from './lifecycle-types.js';
import type { LearningSourceContext } from './learning-source.js';
import type { LearningTimeInterval, TrustedLearningCauseManifest } from './learning-time.js';
import { readLearningTaskState } from './learning-task.js';
import { validateCombatPracticeReceipt } from './combat-practice.js';
import type {
  CombatPracticeProfile,
  CombatPracticeStartSnapshot,
  TrustedCombatPracticeCredit,
} from './combat-practice.js';
import { deriveCombatReceiptDomainCommands } from './combat-consequences.js';
import { applyCombatInitialReceipt, applyCombatPhysicalReceipt } from './combat-physical.js';
import { persistentMoraleAfterCombat } from './combat-morale.js';
import type { SocialState } from './social.js';
import { effectiveLeaderId, replacePerson, validateLifecycleGraph } from './lifecycle-state.js';
import { PhysicalViolation, requirePhysical, validatePhysicalState } from './physical-state.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import type { CompanyCommand } from './commands.js';
import { COMPANY_COMMAND_SCHEMA_VERSION, COMPANY_RULESET_ID } from './model.js';
import type { CombatReceiptJournal } from './combat-receipts.js';
import { guardCompanyCommand } from './guards.js';
import type { PracticeContext } from './practice-admission.js';
import { preparePracticeCredit } from './practice-credit.js';
import { skillLevel } from './skill-progress.js';
import { entityId } from './values.js';
import type { CampaignTick, EntityId } from './values.js';

export const COMBAT_RECEIPT_TIME_VERSION = 's02-combat-receipt-time-1' as const;

export interface CombatReceiptTimeEvidence {
  readonly version: typeof COMBAT_RECEIPT_TIME_VERSION;
  readonly id: string;
  /** Producer identity for this immutable receipt-time anchor. */
  readonly sourceEventId: string;
  readonly battleId: string;
  readonly receiptId: string;
  readonly revision: number;
  readonly atTick: CampaignTick;
}

export interface CombatLearningBoundary {
  readonly intervals: readonly LearningTimeInterval[];
  readonly manifest?: TrustedLearningCauseManifest;
  readonly manifests?: readonly TrustedLearningCauseManifest[];
}

export type CombatOwnerContext = LearningSourceContext &
  PracticeContext & { readonly learningFacts: LearningSourceContext['learningFacts'] };

export interface CombatReceiptApplication {
  readonly time: CombatReceiptTimeEvidence;
  /** Evidence is supplied by the trusted producer, never parsed from the combat command. */
  readonly context: CombatOwnerContext;
  readonly learning: CombatLearningBoundary;
  /** Required when the anchored tick advances campaign time past the current root. */
  readonly advance?: {
    readonly command: CommandOf<'AdvanceCampaign'>;
    readonly context: CombatOwnerContext;
    readonly learning: CombatLearningBoundary;
  };
  /** G09-produced credits for interactions ending in this kernel revision. */
  readonly practiceCredits: readonly TrustedCombatPracticeCredit[];
}

export interface EncounterDispositionEvidence {
  readonly id: string;
  readonly sourceEventId: string;
  readonly unitId: string;
  readonly characterId: string;
  readonly status: 'PRESENT' | 'MISSING' | 'DEAD' | 'CAPTIVE';
  readonly location: MaterializedCompanyState['lifecycle']['characters'][number]['presence']['location'];
  readonly missingEntryId?: string;
}

export interface EncounterTerminalEvidence {
  readonly version: 's02-combat-terminal-outcome-1';
  readonly id: string;
  readonly sourceEventId: string;
  readonly bindingId: string;
  readonly battleId: string;
  readonly receiptId: string;
  readonly revision: number;
  readonly atTick: CampaignTick;
  readonly finalStateCanonical: string;
  readonly outcomeDigest: string;
  readonly dispositions: readonly EncounterDispositionEvidence[];
}

interface AppliedReceipt {
  readonly revision: number;
  readonly receiptDigest: string;
  readonly evidenceDigest: string;
  readonly practiceProfileDigest: string;
  readonly sourceEventIds: readonly string[];
}

interface ParticipantPresenceBeforeBinding {
  readonly characterId: string;
  readonly availability: 'AVAILABLE';
  readonly assignment: 'FIELD' | 'RECOVERY';
  readonly fieldPartyId: EntityId<'FieldParty'>;
}

export interface CompletedCombatEncounter {
  readonly bindingId: string;
  readonly terminalRevision: number;
  readonly terminalSourceEventId: string;
  readonly dispositions: readonly EncounterDispositionEvidence[];
  readonly finalStateDigest: string;
  readonly outcomeDigest: string;
  readonly commandDigest: string;
}

export interface CombatEncounterApplication {
  readonly schemaVersion: 1;
  readonly active: null | {
    readonly binding: FrozenEncounterBinding;
    readonly bindingDigest: string;
    readonly initialRootDigest: string;
    readonly priorPresence: readonly ParticipantPresenceBeforeBinding[];
    /** Null until the authenticated revision-zero receipt is atomically applied. */
    readonly lastAppliedRevision: number | null;
    readonly lastAppliedTick: CampaignTick | null;
    readonly appliedReceipts: readonly AppliedReceipt[];
    readonly appliedPractice: readonly {
      readonly sourceEventId: string;
      readonly commandDigest: string;
    }[];
    readonly practiceStartSnapshots: readonly CombatPracticeStartSnapshot[];
    readonly practiceProfileDigest: string | null;
  };
  readonly completed: readonly CompletedCombatEncounter[];
}

export interface CompanyCombatAggregateState extends CompanyEconomyWithLearningState {
  readonly social: SocialState;
  readonly encounter: CombatEncounterApplication;
}

export type CombatAggregateResult<T> =
  | {
      readonly kind: 'REJECTED';
      readonly state: CompanyCombatAggregateState;
      readonly error: string;
    }
  | ({
      readonly kind: 'PREPARED';
      readonly state: CompanyCombatAggregateState;
      readonly next: CompanyCombatAggregateState;
      readonly replayed: boolean;
    } & T);

export function createCombatEncounterApplication(): CombatEncounterApplication {
  return Object.freeze({ schemaVersion: 1, active: null, completed: Object.freeze([]) });
}

function reject<T>(state: CompanyCombatAggregateState, error: unknown): CombatAggregateResult<T> {
  if (error instanceof EconomyViolation || error instanceof PhysicalViolation)
    return { kind: 'REJECTED', state, error: error.code };
  if (error instanceof CombatAggregateViolation)
    return { kind: 'REJECTED', state, error: error.code };
  if (error instanceof RangeError || error instanceof TypeError)
    return { kind: 'REJECTED', state, error: 'INVALID_SOURCE' };
  throw error;
}

class CombatAggregateViolation extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

function materialized(state: CompanyCombatAggregateState): MaterializedCompanyState {
  const economy = state.economy;
  requirePhysical(economy.physical, 'INVALID_STATE');
  return { lifecycle: economy.lifecycle, finance: economy.finance, physical: economy.physical };
}

function withMaterialized(
  state: CompanyCombatAggregateState,
  root: MaterializedCompanyState,
): CompanyCombatAggregateState {
  return {
    ...state,
    economy: { ...state.economy, ...root },
  };
}

function internalContext<T extends EconomyContext>(
  context: T,
  command: CompanyCommand,
  atTick: CampaignTick,
  evidenceRevision: T['canonicalRevision'] = context.canonicalRevision,
): T {
  return {
    ...context,
    atTick,
    principal: command.actorRef as T['principal'],
    internalGrant: {
      commandId: command.commandId,
      sourceEventId: command.sourceEventId!,
      canonicalRequest: canonicalJson(command),
      evidenceRevision,
    },
  };
}

function currentOwnerContext<T extends CombatOwnerContext>(
  state: CompanyCombatAggregateState,
  context: T,
  atTick: CampaignTick,
): T {
  const lifecycle = materialized(state).lifecycle;
  return {
    ...context,
    canonicalRevision: lifecycle.revision,
    publicRevision: lifecycle.knowledge.revision,
    atTick,
  };
}

function semanticContext(context: CombatOwnerContext) {
  const {
    canonicalRevision: _canonicalRevision,
    publicRevision: _publicRevision,
    ...evidence
  } = context;
  return evidence;
}

function applicationEvidenceDigest(application: CombatReceiptApplication): string {
  return canonicalJson({
    time: application.time,
    context: semanticContext(application.context),
    learning: application.learning,
    advance: application.advance
      ? {
          command: application.advance.command,
          context: semanticContext(application.advance.context),
          learning: application.advance.learning,
        }
      : null,
    practiceCredits: application.practiceCredits.map((credit) => ({
      command: credit.command,
      context: semanticContext(credit.context as CombatOwnerContext),
    })),
  });
}

function practiceProfileSettingsDigest(profile: CombatPracticeProfile): string {
  return canonicalJson({
    version: profile.version,
    profileId: profile.profileId,
    bindingId: profile.bindingId,
    challengeLevel: profile.challengeLevel,
  });
}

function practiceProfileReceiptDigest(
  profile: CombatPracticeProfile,
  receiptIndex: number,
): string {
  return canonicalJson({
    actionStarts: profile.actionStarts.filter(
      (start) => start.startReceiptOrdinal === receiptIndex,
    ),
    leadershipCycles: profile.leadershipCycles.filter(
      (cycle) => cycle.endReceiptOrdinal === receiptIndex,
    ),
  });
}

function boundCompanyRevision(
  binding: FrozenEncounterBinding,
  companyId: string,
): FrozenEncounterBinding['participants'][number]['revision'] {
  const participant = binding.participants.find((entry) => entry.companyId === companyId);
  requirePhysical(participant, 'INVALID_SOURCE');
  return participant.revision;
}

function validateBoundEvidenceContext(
  binding: FrozenEncounterBinding,
  companyId: string,
  context: CombatOwnerContext,
): void {
  requirePhysical(
    context.companyId === companyId &&
      context.worldId === binding.worldId &&
      context.canonicalRevision === boundCompanyRevision(binding, companyId) &&
      context.atTick === binding.atTick,
    'INVALID_SOURCE',
  );
}

function applyLearningCommand(
  state: CompanyCombatAggregateState,
  command: CompanyCommand,
  context: CombatOwnerContext,
  learning: CombatLearningBoundary,
  atTick: CampaignTick,
  evidenceRevision = context.canonicalRevision,
): { readonly next: CompanyCombatAggregateState; readonly requirements: readonly unknown[] } {
  const root = materialized(state);
  const candidateCommand: CompanyCommand =
    command.type === 'ApplyCondition' ||
    command.type === 'RecordDeath' ||
    command.type === 'RecordMissing'
      ? ({ ...command, expectedRevision: root.lifecycle.revision } as
          CommandOf<'ApplyCondition'> | CommandOf<'RecordDeath'> | CommandOf<'RecordMissing'>)
      : command;
  const trusted = internalContext(
    currentOwnerContext(state, context as CombatOwnerContext, atTick),
    candidateCommand,
    atTick,
    evidenceRevision,
  );
  const prepared = prepareCompanyEconomyWithLearning(
    { economy: state.economy, learning: state.learning },
    candidateCommand,
    trusted,
    { ...learning, effectId: command.commandId },
  );
  if (prepared.kind === 'REJECTED') throw new CombatAggregateViolation(prepared.error);
  requirePhysical(!prepared.replayed, 'IDEMPOTENCY_CONFLICT');
  return {
    next: { ...state, economy: prepared.next.economy, learning: prepared.next.learning },
    requirements: prepared.receipt.requirements,
  };
}

function validateTimeEvidence(
  evidence: CombatReceiptTimeEvidence,
  receipt: {
    readonly request: {
      readonly payload: { readonly receiptId: string };
      readonly sourceEventId?: string;
    };
    readonly transition: { readonly state: BattleState };
  },
  binding: FrozenEncounterBinding,
  index: number,
  priorTick: CampaignTick | null,
): void {
  requirePhysical(
    evidence.version === COMBAT_RECEIPT_TIME_VERSION &&
      id.read(evidence.id) &&
      id.read(evidence.sourceEventId) &&
      evidence.battleId === binding.setup.battleId &&
      evidence.receiptId === receipt.request.payload.receiptId &&
      evidence.sourceEventId === receipt.request.sourceEventId &&
      evidence.revision === receipt.transition.state.revision &&
      BigInt(evidence.atTick) >= BigInt(binding.atTick) &&
      (priorTick === null || BigInt(evidence.atTick) >= BigInt(priorTick)) &&
      (index !== 0 || evidence.atTick === binding.atTick),
    'INVALID_SOURCE',
  );
}

function validateAggregateContext(
  state: CompanyCombatAggregateState,
  context: CombatOwnerContext,
  atTick: CampaignTick,
): void {
  const root = materialized(state);
  requirePhysical(
    context.companyId === root.lifecycle.companyId &&
      context.worldId === root.lifecycle.worldId &&
      context.canonicalRevision === root.lifecycle.revision &&
      context.publicRevision === root.lifecycle.knowledge.revision &&
      context.atTick === atTick,
    'INVALID_SOURCE',
  );
  validateEconomy(root, context);
  validatePhysicalState(root);
}

function activeLearningFor(state: CompanyCombatAggregateState, characterIds: ReadonlySet<string>) {
  const root = materialized(state);
  return readLearningTaskState(state.learning.tasks).tasks.some(
    (task) =>
      !task.stop &&
      !task.terminal &&
      BigInt(task.completedTicks) < BigInt(task.start.quote.maxTicks) &&
      taskParticipants(task, undefined, root).some((id) => characterIds.has(id)),
  );
}

export function prepareBeginCombatAggregate(
  state: CompanyCombatAggregateState,
  sources: Parameters<typeof prepareEncounterBinding>[0],
  request: Parameters<typeof prepareEncounterBinding>[1],
  position: EncounterPositionEvidence,
): CombatAggregateResult<{ readonly binding: FrozenEncounterBinding }> {
  try {
    const root = materialized(state);
    requirePhysical(
      state.encounter.schemaVersion === 1 && state.encounter.active === null,
      'INCOMPATIBLE_ACTIVITY',
    );
    const source = sources.find(
      (entry) => entry.root.lifecycle.companyId === root.lifecycle.companyId,
    );
    requirePhysical(source && canonicalJson(source.root) === canonicalJson(root), 'INVALID_SOURCE');
    const binding = prepareEncounterBinding(sources, request, position);
    const participants = binding.participants.filter(
      (entry) => entry.companyId === root.lifecycle.companyId,
    );
    const characterIds = new Set(participants.map((entry) => entry.projection.characterId));
    requirePhysical(!activeLearningFor(state, characterIds), 'INCOMPATIBLE_ACTIVITY');
    const priorPresence = participants.map((participant) => {
      const character = root.lifecycle.characters.find(
        (entry) => entry.identity.characterId === participant.projection.characterId,
      );
      requirePhysical(
        character &&
          character.presence.availability === 'AVAILABLE' &&
          (character.presence.assignment === 'FIELD' ||
            character.presence.assignment === 'RECOVERY') &&
          character.presence.fieldPartyId === participant.partyId &&
          character.presence.encounterBindingId === null,
        'INCOMPATIBLE_ACTIVITY',
      );
      return {
        characterId: participant.projection.characterId,
        availability: character.presence.availability,
        assignment: character.presence.assignment,
        fieldPartyId: character.presence.fieldPartyId!,
      } as const;
    });
    const lifecycle: typeof root.lifecycle = {
      ...root.lifecycle,
      characters: root.lifecycle.characters.map((character) =>
        characterIds.has(character.identity.characterId)
          ? {
              ...character,
              presence: {
                ...character.presence,
                availability: 'IN_ENCOUNTER' as const,
                encounterBindingId: entityId<'EncounterBinding'>(binding.bindingId),
              },
            }
          : character,
      ),
    };
    const nextRoot = { ...root, lifecycle };
    const nextState = withMaterialized(state, nextRoot);
    validateLifecycleGraph(lifecycle, source.context);
    const active = Object.freeze({
      binding,
      bindingDigest: canonicalJson(binding),
      initialRootDigest: canonicalJson(root),
      priorPresence: Object.freeze(priorPresence),
      lastAppliedRevision: null,
      lastAppliedTick: null,
      appliedReceipts: Object.freeze([]),
      appliedPractice: Object.freeze([]),
      practiceStartSnapshots: Object.freeze([]),
      practiceProfileDigest: null,
    });
    return {
      kind: 'PREPARED',
      state,
      next: { ...nextState, encounter: { ...state.encounter, active } },
      binding,
      replayed: false,
    };
  } catch (error) {
    return reject(state, error);
  }
}

export interface ConsumeCombatAggregateInput {
  readonly journal: CombatReceiptJournal;
  readonly applications: readonly CombatReceiptApplication[];
  readonly practiceProfile: CombatPracticeProfile;
}

export function prepareConsumeCombatAggregate(
  state: CompanyCombatAggregateState,
  input: ConsumeCombatAggregateInput,
): CombatAggregateResult<{ readonly appliedRevision: number }> {
  try {
    const active = state.encounter.active;
    requirePhysical(active, 'INVALID_SOURCE');
    requirePhysical(
      canonicalJson(active.binding) === active.bindingDigest &&
        input.journal.companyId === materialized(state).lifecycle.companyId &&
        canonicalJson(input.journal.binding) === active.bindingDigest,
      'INVALID_SOURCE',
    );
    const journal = validateCombatReceiptJournal(input.journal);
    requirePhysical(input.applications.length === journal.receipts.length, 'INVALID_SOURCE');
    requirePhysical(
      input.practiceProfile.bindingId === active.binding.bindingId &&
        input.practiceProfile.version === 's02-combat-practice-profile-2',
      'INVALID_SOURCE',
    );
    const practiceProfileDigest = practiceProfileSettingsDigest(input.practiceProfile);
    requirePhysical(
      active.practiceProfileDigest === null ||
        active.practiceProfileDigest === practiceProfileDigest,
      'IDEMPOTENCY_CONFLICT',
    );
    let priorTick: CampaignTick | null = null;
    for (let index = 0; index < journal.receipts.length; index += 1) {
      const receipt = journal.receipts[index]!;
      const application = input.applications[index]!;
      validateTimeEvidence(application.time, receipt, active.binding, index, priorTick);
      priorTick = application.time.atTick;
      if (index < active.appliedReceipts.length)
        requirePhysical(
          active.appliedReceipts[index]!.revision === receipt.transition.state.revision &&
            active.appliedReceipts[index]!.receiptDigest === canonicalJson(receipt) &&
            active.appliedReceipts[index]!.evidenceDigest ===
              applicationEvidenceDigest(application),
          'IDEMPOTENCY_CONFLICT',
        );
    }
    for (let index = 0; index < active.appliedReceipts.length; index += 1)
      requirePhysical(
        active.appliedReceipts[index]!.practiceProfileDigest ===
          practiceProfileReceiptDigest(input.practiceProfile, index),
        'IDEMPOTENCY_CONFLICT',
      );
    requirePhysical(
      journal.receipts.length >= active.appliedReceipts.length &&
        (active.lastAppliedRevision === null
          ? active.appliedReceipts.length === 0
          : active.appliedReceipts.at(-1)?.revision === active.lastAppliedRevision),
      'INVALID_STATE',
    );
    if (
      active.lastAppliedRevision !== null &&
      journal.receipts.at(-1)!.transition.state.revision <= active.lastAppliedRevision
    ) {
      return {
        kind: 'PREPARED',
        state,
        next: state,
        appliedRevision: active.lastAppliedRevision,
        replayed: true,
      };
    }

    const initialRevision = active.binding.initial.state.revision;
    let next = state;
    const applied = active.appliedReceipts.slice();
    const practice = active.appliedPractice.slice();
    const startSnapshots = active.practiceStartSnapshots.slice();
    let currentTick = active.lastAppliedTick ?? active.binding.atTick;
    const startIndex =
      active.lastAppliedRevision === null ? 0 : active.lastAppliedRevision - initialRevision + 1;
    for (let index = startIndex; index < journal.receipts.length; index += 1) {
      const receipt = journal.receipts[index]!;
      const application = input.applications[index]!;
      const revision = receipt.transition.state.revision;
      validateBoundEvidenceContext(active.binding, journal.companyId, application.context);
      for (const credit of application.practiceCredits)
        validateBoundEvidenceContext(
          active.binding,
          journal.companyId,
          credit.context as CombatOwnerContext,
        );
      if (index === 0) {
        requirePhysical(revision === initialRevision, 'INVALID_SOURCE');
        next = withMaterialized(
          next,
          applyCombatInitialReceipt(materialized(next), active.binding, journal.companyId),
        );
      } else {
        if (BigInt(application.time.atTick) > BigInt(materialized(next).lifecycle.campaignTick)) {
          const advance = application.advance;
          requirePhysical(
            advance &&
              advance.command.type === 'AdvanceCampaign' &&
              advance.command.payload.toTick === application.time.atTick &&
              advance.command.campaignTick === application.time.atTick,
            'INVALID_SOURCE',
          );
          validateAggregateContext(next, advance.context, application.time.atTick);
          const guardedAdvance = guardCompanyCommand(advance.command, advance.context);
          if (!guardedAdvance.ok) throw new CombatAggregateViolation(guardedAdvance.error);
          requirePhysical(guardedAdvance.command.type === 'AdvanceCampaign', 'INVALID_SOURCE');
          const advanced = applyLearningCommand(
            next,
            guardedAdvance.command,
            advance.context,
            advance.learning,
            application.time.atTick,
          );
          requirePhysical(advanced.requirements.length === 0, 'INCOMPATIBLE_ACTIVITY');
          next = advanced.next;
        } else {
          requirePhysical(application.advance === undefined, 'INVALID_SOURCE');
          requirePhysical(
            application.time.atTick === materialized(next).lifecycle.campaignTick,
            'INVALID_TIME',
          );
        }
        validateAggregateContext(
          next,
          currentOwnerContext(next, application.context, application.time.atTick),
          application.time.atTick,
        );
        const beforeRoot = materialized(next);
        for (const start of input.practiceProfile.actionStarts) {
          if (start.startReceiptOrdinal !== index) continue;
          const participant = active.binding.participants.find(
            (entry) => entry.unitId === start.unitId,
          );
          const character =
            participant?.companyId === journal.companyId
              ? beforeRoot.lifecycle.characters.find(
                  (entry) => entry.identity.characterId === participant.projection.characterId,
                )
              : undefined;
          const kernelCommand = receipt.kernelCommand;
          requirePhysical(
            participant &&
              character &&
              kernelCommand?.activationId === start.activationId &&
              kernelCommand.actorId === start.unitId,
            'INVALID_SOURCE',
          );
          const skillId =
            kernelCommand.type === 'attack'
              ? participant.projection.weapon.skillId
              : kernelCommand.type === 'defend'
                ? 'defense'
                : undefined;
          const aptitudeAtStartBps = skillId ? character.aptitudeBySkill[skillId] : undefined;
          requirePhysical(
            skillId &&
              typeof aptitudeAtStartBps === 'number' &&
              Number.isSafeInteger(aptitudeAtStartBps) &&
              aptitudeAtStartBps > 0,
            'INVALID_SOURCE',
          );
          startSnapshots.push({
            sourceId: start.activationId,
            startReceiptOrdinal: start.startReceiptOrdinal,
            characterId: participant.projection.characterId,
            skillId,
            levelAtStart: skillLevel(character.skills[skillId] ?? 0),
            aptitudeAtStartBps,
          });
        }
        const commanderId = effectiveLeaderId(beforeRoot.lifecycle);
        const commander = beforeRoot.lifecycle.characters.find(
          (entry) => entry.identity.characterId === commanderId,
        );
        const leadershipAptitude = commander?.aptitudeBySkill['leadership'];
        if (
          commander &&
          typeof leadershipAptitude === 'number' &&
          Number.isSafeInteger(leadershipAptitude) &&
          leadershipAptitude > 0
        )
          startSnapshots.push({
            sourceId: receipt.request.payload.receiptId,
            startReceiptOrdinal: index,
            characterId: commanderId,
            skillId: 'leadership',
            levelAtStart: skillLevel(commander.skills['leadership'] ?? 0),
            aptitudeAtStartBps: leadershipAptitude,
          });
        const trustedPractice = validateCombatPracticeReceipt(
          beforeRoot,
          journal,
          index,
          input.practiceProfile,
          input.applications.map((entry) => entry.time.atTick),
          startSnapshots,
          application.practiceCredits,
        );
        const prior = journal.receipts[index - 1]!.transition.state;
        const root = applyCombatPhysicalReceipt(
          materialized(next),
          active.binding,
          journal.companyId,
          prior,
          receipt.transition.state,
        );
        next = withMaterialized(next, root);
        const effects = deriveCombatReceiptDomainCommands(journal, index, application.context);
        for (const command of effects) {
          const appliedCommand = applyLearningCommand(
            next,
            command,
            application.context,
            application.learning,
            application.time.atTick,
          );
          requirePhysical(appliedCommand.requirements.length === 0, 'INCOMPATIBLE_ACTIVITY');
          next = appliedCommand.next;
        }
        for (const credit of trustedPractice) {
          const currentRoot = materialized(next);
          const command = {
            ...credit.command,
            expectedRevision: currentRoot.lifecycle.revision,
          } as CommandOf<'CreditPractice'>;
          const practiceContext = internalContext(
            currentOwnerContext(
              next,
              { ...application.context, ...credit.context } as CombatOwnerContext,
              application.time.atTick,
            ),
            command,
            application.time.atTick,
            credit.context.canonicalRevision,
          );
          next = withMaterialized(
            next,
            preparePracticeCredit(materialized(next), command, practiceContext),
          );
          practice.push({
            sourceEventId: command.sourceEventId!,
            commandDigest: canonicalJson({ command, context: semanticContext(practiceContext) }),
          });
        }
      }
      applied.push({
        revision,
        receiptDigest: canonicalJson(receipt),
        evidenceDigest: applicationEvidenceDigest(application),
        practiceProfileDigest: practiceProfileReceiptDigest(input.practiceProfile, index),
        sourceEventIds: receipt.sourceEventIds,
      });
      currentTick = application.time.atTick;
    }
    const finalRevision = journal.receipts.at(-1)!.transition.state.revision;
    const nextActive = {
      ...active,
      lastAppliedRevision: finalRevision,
      lastAppliedTick: currentTick,
      appliedReceipts: Object.freeze(applied),
      appliedPractice: Object.freeze(practice),
      practiceStartSnapshots: Object.freeze(startSnapshots),
      practiceProfileDigest,
    };
    return {
      kind: 'PREPARED',
      state,
      next: { ...next, encounter: { ...next.encounter, active: nextActive } },
      appliedRevision: finalRevision,
      replayed: false,
    };
  } catch (error) {
    return reject(state, error);
  }
}

export interface FinalizeCombatAggregateInput {
  readonly command: unknown;
  readonly journal: CombatReceiptJournal;
  readonly applications: readonly CombatReceiptApplication[];
  readonly terminal: EncounterTerminalEvidence;
  readonly context: CombatOwnerContext;
  readonly missingLearning?: Readonly<Record<string, CombatLearningBoundary>>;
}

export function prepareFinalizeCombatAggregate(
  state: CompanyCombatAggregateState,
  input: FinalizeCombatAggregateInput,
): CombatAggregateResult<{ readonly terminal: CompletedCombatEncounter }> {
  try {
    const command = guardCompanyCommand(input.command, input.context);
    if (!command.ok) throw new CombatAggregateViolation(command.error);
    requirePhysical(command.command.type === 'FinalizeEncounter', 'INVALID_SOURCE');
    const request = command.command;
    const commandDigest = canonicalJson(request);
    const prior = state.encounter.completed.find(
      (entry) => entry.bindingId === request.payload.bindingId,
    );
    if (prior) {
      requirePhysical(
        prior.finalStateDigest === request.payload.finalStateDigest &&
          prior.outcomeDigest === request.payload.outcomeReceiptId &&
          prior.commandDigest === commandDigest &&
          prior.terminalSourceEventId === input.terminal.sourceEventId &&
          canonicalJson(prior.dispositions) === canonicalJson(input.terminal.dispositions) &&
          input.terminal.id === request.payload.finalStateDigest &&
          input.terminal.outcomeDigest === request.payload.outcomeReceiptId,
        'IDEMPOTENCY_CONFLICT',
      );
      return { kind: 'PREPARED', state, next: state, terminal: prior, replayed: true };
    }
    const active = state.encounter.active;
    requirePhysical(
      active && active.binding.bindingId === request.payload.bindingId,
      'INVALID_SOURCE',
    );
    const journal = validateCombatReceiptJournal(input.journal);
    const final = journal.receipts.at(-1)?.transition.state;
    requirePhysical(
      final &&
        final.status === 'resolved' &&
        journal.receipts.at(-1)!.request.payload.receiptId === request.payload.terminalReceiptId &&
        active.lastAppliedRevision === final.revision &&
        active.appliedReceipts.length === journal.receipts.length &&
        input.terminal.version === 's02-combat-terminal-outcome-1' &&
        input.terminal.bindingId === active.binding.bindingId &&
        input.terminal.battleId === active.binding.setup.battleId &&
        input.terminal.receiptId === request.payload.terminalReceiptId &&
        input.terminal.revision === final.revision &&
        input.terminal.atTick === active.lastAppliedTick &&
        input.terminal.id === request.payload.finalStateDigest &&
        input.terminal.outcomeDigest === request.payload.outcomeReceiptId &&
        request.sourceEventId === input.terminal.sourceEventId &&
        input.terminal.finalStateCanonical === canonicalCombatState(final),
      'INVALID_SOURCE',
    );
    validateAggregateContext(state, input.context, input.terminal.atTick);
    const companyParticipants = active.binding.participants.filter(
      (entry) => entry.companyId === state.economy.lifecycle.companyId,
    );
    requirePhysical(
      input.terminal.dispositions.length === companyParticipants.length,
      'INVALID_SOURCE',
    );
    const dispositions = new Map(input.terminal.dispositions.map((entry) => [entry.unitId, entry]));
    requirePhysical(dispositions.size === companyParticipants.length, 'INVALID_SOURCE');
    let next = state;
    let root = materialized(next);
    for (const participant of companyParticipants) {
      const evidence = dispositions.get(participant.unitId);
      const unit = final.units.find((entry) => entry.id === participant.unitId);
      const characterId = participant.projection.characterId;
      const character = root.lifecycle.characters.find(
        (entry) => entry.identity.characterId === characterId,
      );
      requirePhysical(
        evidence &&
          unit &&
          character &&
          evidence.id &&
          id.read(evidence.id) &&
          id.read(evidence.sourceEventId) &&
          evidence.sourceEventId === input.terminal.sourceEventId &&
          evidence.characterId === characterId &&
          evidence.location.kind === 'AT' &&
          canonicalJson(evidence.location) === canonicalJson(active.binding.location),
        'INVALID_SOURCE',
      );
      if (evidence.status === 'CAPTIVE') throw new PhysicalViolation('UNSUPPORTED_ACTION');
      if (evidence.status === 'DEAD')
        requirePhysical(
          unit.health === 0 &&
            character.presence.availability === 'DEAD' &&
            journal.receipts.some((receipt) =>
              receipt.transition.events.some(
                (event) => event.type === 'unit.died' && event.unitId === participant.unitId,
              ),
            ),
          'INVALID_SOURCE',
        );
      else if (evidence.status === 'MISSING') {
        requirePhysical(
          unit.health > 0 &&
            character.presence.availability === 'IN_ENCOUNTER' &&
            !journal.receipts.some((receipt) =>
              receipt.transition.events.some(
                (event) => event.type === 'unit.died' && event.unitId === participant.unitId,
              ),
            ),
          'INVALID_SOURCE',
        );
        requirePhysical(
          evidence.missingEntryId && id.read(evidence.missingEntryId),
          'INVALID_SOURCE',
        );
        const learning = input.missingLearning?.[participant.unitId];
        requirePhysical(learning, 'INVALID_SOURCE');
        const missingEntry = input.context.physicalFacts?.find(
          (fact) => fact.kind === 'MISSING_ENTRY' && fact.id === evidence.missingEntryId,
        );
        requirePhysical(
          missingEntry?.kind === 'MISSING_ENTRY' &&
            missingEntry.sourceEventId === input.terminal.sourceEventId &&
            missingEntry.bindingId === active.binding.bindingId &&
            missingEntry.battleId === active.binding.setup.battleId &&
            missingEntry.terminalReceiptId === input.terminal.receiptId &&
            missingEntry.unitId === participant.unitId &&
            missingEntry.characterId === characterId &&
            canonicalJson(missingEntry.location) === canonicalJson(evidence.location),
          'INVALID_SOURCE',
        );
        const missingCommand: CommandOf<'RecordMissing'> = {
          schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
          commandId: evidence.missingEntryId,
          worldId: root.lifecycle.worldId,
          companyId: root.lifecycle.companyId,
          actorRef: { kind: 'COMBAT_RECEIPT', id: active.binding.bindingId },
          expectedRevision: root.lifecycle.revision,
          campaignTick: input.terminal.atTick,
          rulesetId: COMPANY_RULESET_ID,
          sourceEventId: input.terminal.sourceEventId,
          type: 'RecordMissing',
          payload: {
            receiptId: evidence.missingEntryId,
            bindingId: active.binding.bindingId,
            battleId: active.binding.setup.battleId,
            terminalReceiptId: input.terminal.receiptId,
            unitId: participant.unitId,
            characterId,
          },
        };
        const recorded = applyLearningCommand(
          next,
          missingCommand,
          input.context,
          learning,
          input.terminal.atTick,
          input.context.canonicalRevision,
        );
        requirePhysical(recorded.requirements.length === 0, 'INCOMPATIBLE_ACTIVITY');
        next = recorded.next;
        root = materialized(next);
      } else {
        requirePhysical(
          unit.health > 0 && character.presence.availability === 'IN_ENCOUNTER',
          'INVALID_SOURCE',
        );
        const previous = active.priorPresence.find((entry) => entry.characterId === characterId);
        requirePhysical(previous, 'INVALID_STATE');
        root = {
          ...root,
          lifecycle: replacePerson(root.lifecycle, {
            ...character,
            presence: {
              ...character.presence,
              availability: previous.availability,
              assignment: previous.assignment,
              fieldPartyId: previous.fieldPartyId,
              encounterBindingId: null,
            },
          }),
        };
      }
      const vitals = root.physical.vitals.find((entry) => entry.characterId === characterId);
      requirePhysical(vitals && unit, 'INVALID_STATE');
      const morale = persistentMoraleAfterCombat(participant.projection.morale, unit.morale);
      root = {
        ...root,
        physical: {
          ...root.physical,
          vitals: root.physical.vitals.map((entry) =>
            entry.characterId === characterId ? { ...entry, morale } : entry,
          ),
        },
      };
    }
    validatePhysicalState(root);
    validateLifecycleGraph(root.lifecycle, input.context);
    next = withMaterialized(next, root);
    const terminal = Object.freeze({
      bindingId: active.binding.bindingId,
      terminalRevision: final.revision,
      terminalSourceEventId: input.terminal.sourceEventId,
      dispositions: Object.freeze(
        input.terminal.dispositions.map((entry) =>
          Object.freeze({ ...entry, location: Object.freeze({ ...entry.location }) }),
        ),
      ),
      finalStateDigest: request.payload.finalStateDigest,
      outcomeDigest: request.payload.outcomeReceiptId,
      commandDigest,
    });
    return {
      kind: 'PREPARED',
      state,
      next: {
        ...next,
        encounter: {
          ...next.encounter,
          active: null,
          completed: Object.freeze([...next.encounter.completed, terminal]),
        },
      },
      terminal,
      replayed: false,
    };
  } catch (error) {
    return reject(state, error);
  }
}
