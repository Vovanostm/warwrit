import type { BattleState } from '../combat/types.js';
import { canonicalCombatState } from '../combat/replay.js';
import { canonicalJson, id } from './input.js';
import { EconomyViolation, recordSource, validateEconomy } from './economy-state.js';
import { combatReceiptEventIds, validateCombatReceiptJournal } from './combat-receipts.js';
import {
  prepareCompanyEconomy,
  prepareCompanyEconomyWithLearning,
  prepareCompanyEconomyWithLearningAndSocial,
  taskParticipants,
} from './economy.js';
import type { CompanyEconomyWithLearningState } from './economy.js';
import type { EconomyContext } from './economy-types.js';
import type { FinanceEvidence } from './economy-types.js';
import type { EncounterPositionEvidence, FrozenEncounterBinding } from './encounter-binding.js';
import { prepareEncounterBinding } from './encounter-binding.js';
import { isDepartureExecutable } from './economy-departure.js';
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
import type { PhysicalEvidence } from './physical-types.js';
import { deriveCombatReceiptDomainCommands } from './combat-consequences.js';
import { applyCombatInitialReceipt, applyCombatPhysicalReceipt } from './combat-physical.js';
import { persistentMoraleAfterCombat } from './combat-morale.js';
import { COMPANY_CATALOGUE } from './definitions.js';
import type { SocialState } from './social.js';
import type { FinancialSocialInput, FinancialSocialKnowledge } from './social-finance.js';
import type { FarewellNotice } from './farewell-social.js';
import {
  canLead,
  effectiveLeaderId,
  replacePerson,
  validateLifecycleGraph,
} from './lifecycle-state.js';
import {
  PhysicalViolation,
  recordPhysicalSource,
  requirePhysical,
  validatePhysicalState,
} from './physical-state.js';
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
  readonly captureOutcomeId?: string;
  readonly seizedItems?: CommandOf<'Capture'>['payload']['seizedItems'];
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
  readonly finalizeEvidenceKey: string;
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

function validateRetainedCombatDeath(
  root: MaterializedCompanyState,
  journal: CombatReceiptJournal,
  applications: readonly CombatReceiptApplication[],
  unitId: string,
  characterId: string,
  terminalTick: CampaignTick,
): { readonly sourceEventId: string; readonly causeId: string } {
  const occurrences = journal.receipts.flatMap((receipt, receiptIndex) =>
    receipt.transition.events.flatMap((event, eventIndex) =>
      event.type === 'unit.died' && event.unitId === unitId
        ? [{ receiptIndex, sourceEventId: receipt.sourceEventIds[eventIndex]! }]
        : [],
    ),
  );
  requirePhysical(occurrences.length === 1, 'INVALID_SOURCE');
  const occurrence = occurrences[0]!;
  const application = applications[occurrence.receiptIndex]!;
  const deathOutcomes = (application.context.physicalFacts ?? []).filter(
    (fact): fact is Extract<PhysicalEvidence, { kind: 'DEATH_OUTCOME' }> =>
      fact.kind === 'DEATH_OUTCOME' &&
      fact.characterId === characterId &&
      fact.sourceEventId === occurrence.sourceEventId,
  );
  const financialDeaths = application.context.financeFacts.filter(
    (fact): fact is Extract<FinanceEvidence, { kind: 'FINANCIAL_DEATH' }> =>
      fact.kind === 'FINANCIAL_DEATH' &&
      fact.characterId === characterId &&
      fact.sourceEventId === occurrence.sourceEventId,
  );
  requirePhysical(deathOutcomes.length === 1 && financialDeaths.length === 1, 'INVALID_SOURCE');
  const death = deathOutcomes[0]!;
  const financialDeath = financialDeaths[0]!;
  requirePhysical(
    death.actualDeathTick === application.time.atTick &&
      BigInt(death.actualDeathTick) <= BigInt(terminalTick) &&
      death.causeId === financialDeath.causeId &&
      death.id === financialDeath.custodyOutcomeId &&
      financialDeath.actualDeathTick === death.actualDeathTick,
    'INVALID_SOURCE',
  );
  requirePhysical(
    recordPhysicalSource(root.physical, death).replayed &&
      recordSource(root.finance, financialDeath).replayed,
    'INVALID_SOURCE',
  );
  const corpse = root.physical.containers.find(
    (container) => container.containerId === death.corpseContainerId,
  );
  requirePhysical(
    corpse?.kind === 'CORPSE' &&
      corpse.custodian.kind === 'WORLD' &&
      corpse.custodian.id === root.lifecycle.worldId &&
      canonicalJson(corpse.location) === canonicalJson(death.location),
    'INVALID_SOURCE',
  );
  const carriedContainerIds = new Set(
    root.physical.containers
      .filter(
        (container) =>
          container.carrier?.kind === 'CHARACTER' && container.carrier.id === characterId,
      )
      .map((container) => container.containerId),
  );
  requirePhysical(
    !root.physical.items.some(
      (item) => item.containerId !== null && carriedContainerIds.has(item.containerId),
    ) &&
      root.physical.items
        .filter((item) => item.containerId === corpse.containerId)
        .every((item) => item.equipped === null),
    'INVALID_SOURCE',
  );
  const membershipIds: ReadonlySet<string> = new Set(
    root.lifecycle.memberships
      .filter((membership) => membership.characterId === characterId)
      .map((membership) => membership.membershipId),
  );
  const deathAccounts = root.finance.accounts.filter((account) =>
    membershipIds.has(account.membershipId),
  );
  requirePhysical(
    membershipIds.size > 0 &&
      deathAccounts.length === membershipIds.size &&
      deathAccounts.every(
        (account) =>
          account.death?.sourceId === death.sourceEventId &&
          account.death.atTick === death.actualDeathTick,
      ) &&
      root.finance.claims
        .filter((claim) => membershipIds.has(claim.membershipId))
        .every((claim) =>
          claim.earned.every((period) => BigInt(period.toTick) <= BigInt(death.actualDeathTick)),
        ),
    'INVALID_SOURCE',
  );
  return { sourceEventId: death.sourceEventId, causeId: death.causeId };
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
  readonly captureLearning?: Readonly<Record<string, CombatLearningBoundary>>;
  readonly leadership?: {
    readonly command: unknown;
    readonly context: CombatOwnerContext;
  };
  readonly departures?: readonly {
    readonly command: unknown;
    readonly context: CombatOwnerContext;
    readonly learning: CombatLearningBoundary;
    readonly financialSocialInputs: readonly FinancialSocialInput[];
    readonly knowledge: readonly FinancialSocialKnowledge[];
    readonly notices: readonly FarewellNotice[];
  }[];
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
    const journal = validateCombatReceiptJournal(input.journal);
    requirePhysical(input.applications.length === journal.receipts.length, 'INVALID_SOURCE');
    let priorTick: CampaignTick | null = null;
    for (let index = 0; index < journal.receipts.length; index += 1) {
      const receipt = journal.receipts[index]!;
      const application = input.applications[index]!;
      validateTimeEvidence(application.time, receipt, journal.binding, index, priorTick);
      priorTick = application.time.atTick;
    }
    const receiptEvidence = journal.receipts.map(canonicalJson);
    const applicationEvidence = input.applications.map(applicationEvidenceDigest);
    const frame = (values: readonly string[]) =>
      `${values.length}|${values.map((value) => `${value.length}:${value}`).join('')}`;
    const finalizeEvidenceKey = `${canonicalJson({
      journal: {
        companyId: journal.companyId,
        proposedLastAppliedRevision: journal.proposedLastAppliedRevision,
      },
      terminal: {
        ...input.terminal,
        finalStateCanonical: '',
        dispositions: input.terminal.dispositions.map(({ missingEntryId, ...entry }) =>
          missingEntryId === undefined ? entry : { ...entry, missingEntryId },
        ),
      },
      context: semanticContext(input.context),
      missingLearning: input.missingLearning ?? null,
      captureLearning: input.captureLearning ?? null,
      leadership: input.leadership
        ? {
            command: input.leadership.command,
            context: semanticContext(input.leadership.context),
          }
        : null,
      departures: (input.departures ?? []).map((departure) => ({
        command: departure.command,
        context: semanticContext(departure.context),
        learning: departure.learning,
        financialSocialInputs: departure.financialSocialInputs,
        knowledge: departure.knowledge,
        notices: departure.notices,
      })),
    })}\nB${frame([canonicalJson(journal.binding)])}\nR${frame(receiptEvidence)}\nA${frame(applicationEvidence)}\nT${input.terminal.finalStateCanonical.length}:${input.terminal.finalStateCanonical}`;
    const prior = state.encounter.completed.find(
      (entry) => entry.bindingId === request.payload.bindingId,
    );
    if (prior) {
      requirePhysical(
        prior.finalStateDigest === request.payload.finalStateDigest &&
          prior.outcomeDigest === request.payload.outcomeReceiptId &&
          prior.commandDigest === commandDigest &&
          prior.finalizeEvidenceKey === finalizeEvidenceKey,
        'IDEMPOTENCY_CONFLICT',
      );
      return { kind: 'PREPARED', state, next: state, terminal: prior, replayed: true };
    }
    const active = state.encounter.active;
    requirePhysical(
      active && active.binding.bindingId === request.payload.bindingId,
      'INVALID_SOURCE',
    );
    const final = journal.receipts.at(-1)?.transition.state;
    requirePhysical(
      final &&
        journal.companyId === materialized(state).lifecycle.companyId &&
        canonicalJson(active.binding) === active.bindingDigest &&
        journal.binding.bindingId === active.binding.bindingId &&
        canonicalJson(journal.binding) === active.bindingDigest &&
        final.status === 'resolved' &&
        journal.receipts.at(-1)!.request.payload.receiptId === request.payload.terminalReceiptId &&
        active.lastAppliedRevision === final.revision &&
        active.appliedReceipts.at(-1)?.revision === final.revision &&
        active.appliedReceipts.length === journal.receipts.length &&
        active.lastAppliedTick === input.applications.at(-1)?.time.atTick &&
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
    for (let index = 0; index < journal.receipts.length; index += 1) {
      const receipt = journal.receipts[index]!;
      const applied = active.appliedReceipts[index]!;
      requirePhysical(
        applied.revision === receipt.transition.state.revision &&
          applied.receiptDigest === canonicalJson(receipt) &&
          applied.evidenceDigest === applicationEvidenceDigest(input.applications[index]!) &&
          canonicalJson(applied.sourceEventIds) ===
            canonicalJson(
              combatReceiptEventIds(receipt.request.payload.receiptId, receipt.transition.events),
            ),
        'IDEMPOTENCY_CONFLICT',
      );
    }
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
    const verifiedDeaths = new Map<
      string,
      { readonly sourceEventId: string; readonly causeId: string }
    >();
    const verifiedCaptures = new Map<string, string>();
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
      if (evidence.status === 'CAPTIVE') {
        requirePhysical(
          unit.health > 0 &&
            character.presence.availability === 'IN_ENCOUNTER' &&
            !journal.receipts.some((receipt) =>
              receipt.transition.events.some(
                (event) => event.type === 'unit.died' && event.unitId === participant.unitId,
              ),
            ) &&
            evidence.captureOutcomeId &&
            id.read(evidence.captureOutcomeId) &&
            Array.isArray(evidence.seizedItems),
          'INVALID_SOURCE',
        );
        const captureFact = input.context.physicalFacts?.find(
          (fact) => fact.kind === 'CAPTURE_OUTCOME' && fact.id === evidence.captureOutcomeId,
        );
        requirePhysical(
          captureFact?.kind === 'CAPTURE_OUTCOME' &&
            captureFact.sourceEventId === input.terminal.sourceEventId &&
            captureFact.characterId === characterId &&
            captureFact.atTick === input.terminal.atTick &&
            canonicalJson(captureFact.location) === canonicalJson(evidence.location),
          'INVALID_SOURCE',
        );
        for (const seized of evidence.seizedItems) {
          const seizureFact = input.context.physicalFacts?.find(
            (fact) => fact.kind === 'SEIZURE' && fact.id === seized.authorizationId,
          );
          requirePhysical(
            seizureFact?.kind === 'SEIZURE' &&
              seizureFact.sourceEventId === input.terminal.sourceEventId &&
              seizureFact.characterId === characterId &&
              seizureFact.itemId === seized.itemId &&
              seizureFact.toContainerId === seized.toContainerId &&
              seizureFact.atTick === input.terminal.atTick &&
              canonicalJson(seizureFact.captor) === canonicalJson(captureFact.captor),
            'INVALID_SOURCE',
          );
        }
        const learning = input.captureLearning?.[participant.unitId];
        requirePhysical(learning, 'INVALID_SOURCE');
        const captureCommand: CommandOf<'Capture'> = {
          schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
          commandId: evidence.captureOutcomeId,
          worldId: root.lifecycle.worldId,
          companyId: root.lifecycle.companyId,
          actorRef: { kind: 'OUTCOME_RECEIPT', id: evidence.captureOutcomeId },
          expectedRevision: root.lifecycle.revision,
          campaignTick: input.terminal.atTick,
          rulesetId: COMPANY_RULESET_ID,
          sourceEventId: input.terminal.sourceEventId,
          type: 'Capture',
          payload: {
            receiptId: evidence.captureOutcomeId,
            characterId,
            captorRef: captureFact.captor,
            locationRef: captureFact.location,
            seizedItems: evidence.seizedItems,
          },
        };
        const captured = applyLearningCommand(
          next,
          captureCommand,
          input.context,
          learning,
          input.terminal.atTick,
          input.context.canonicalRevision,
        );
        requirePhysical(captured.requirements.length === 0, 'INCOMPATIBLE_ACTIVITY');
        next = captured.next;
        root = materialized(next);
        const custody = root.physical.custody.find((entry) => entry.characterId === characterId);
        requirePhysical(
          root.lifecycle.characters.find((entry) => entry.identity.characterId === characterId)
            ?.presence.availability === 'CAPTIVE' &&
            custody?.sourceId === input.terminal.sourceEventId &&
            canonicalJson(custody.custodian) === canonicalJson(captureFact.captor) &&
            canonicalJson(custody.location) === canonicalJson(captureFact.location),
          'INVALID_SOURCE',
        );
        verifiedCaptures.set(characterId, input.terminal.sourceEventId);
      } else if (evidence.status === 'DEAD') {
        requirePhysical(
          unit.health === 0 && character.presence.availability === 'DEAD',
          'INVALID_SOURCE',
        );
        verifiedDeaths.set(
          characterId,
          validateRetainedCombatDeath(
            root,
            journal,
            input.applications,
            participant.unitId,
            characterId,
            input.terminal.atTick,
          ),
        );
      } else if (evidence.status === 'MISSING') {
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
      next = withMaterialized(next, root);
    }
    const effectiveLeader = effectiveLeaderId(root.lifecycle);
    const leader = root.lifecycle.characters.find(
      (character) => character.identity.characterId === effectiveLeader,
    );
    requirePhysical(leader, 'INVALID_STATE');
    if (!canLead(leader)) {
      const leadership = input.leadership;
      requirePhysical(leadership, 'INVALID_SOURCE');
      validateAggregateContext(next, leadership.context, input.terminal.atTick);
      const guardedLeadership = guardCompanyCommand(leadership.command, leadership.context);
      requirePhysical(
        guardedLeadership.ok && guardedLeadership.command.type === 'ResolveLeadership',
        'INVALID_SOURCE',
      );
      const leadershipCommand = guardedLeadership.command;
      const crisisFacts = leadership.context.facts.filter(
        (fact) => fact.id === leadershipCommand.payload.crisisId,
      );
      requirePhysical(
        crisisFacts.length === 1 && crisisFacts[0]!.kind === 'CRISIS',
        'INVALID_SOURCE',
      );
      const crisis = crisisFacts[0]!;
      const died = leader.presence.availability === 'DEAD';
      const expectedReason = died ? 'LEADER_DIED' : 'LEADER_UNAVAILABLE';
      let causeSourceEventId: string | undefined;
      if (died) causeSourceEventId = verifiedDeaths.get(effectiveLeader)?.sourceEventId;
      else if (leader.presence.availability === 'CAPTIVE') {
        causeSourceEventId = verifiedCaptures.get(effectiveLeader);
      } else if (leader.presence.availability === 'OUT_OF_CONTACT') {
        const missingFacts = (input.context.physicalFacts ?? []).filter(
          (fact) =>
            fact.kind === 'MISSING_ENTRY' &&
            fact.characterId === effectiveLeader &&
            fact.sourceEventId === input.terminal.sourceEventId,
        );
        requirePhysical(missingFacts.length === 1, 'INVALID_SOURCE');
        causeSourceEventId = missingFacts[0]!.sourceEventId;
      } else {
        const unavailableConditions = root.physical.conditions.filter((condition) => {
          const definition = COMPANY_CATALOGUE.conditions.find(
            (entry) => entry.id === condition.definitionId,
          );
          return (
            condition.characterId === effectiveLeader &&
            condition.resolvedAt === null &&
            definition?.deniedCapabilities.includes('lead')
          );
        });
        const matchingSources = input.applications.flatMap((application) =>
          (application.context.physicalFacts ?? []).filter(
            (fact) =>
              fact.kind === 'CONDITION_SOURCE' &&
              fact.sourceEventId === crisis.sourceEventId &&
              fact.characterId === effectiveLeader &&
              unavailableConditions.some(
                (condition) =>
                  condition.sourceEventId === fact.sourceEventId &&
                  condition.causeId === fact.causeId &&
                  condition.definitionId === fact.definitionId,
              ),
          ),
        );
        requirePhysical(
          matchingSources.length === 1 &&
            recordPhysicalSource(root.physical, matchingSources[0]!).replayed,
          'INVALID_SOURCE',
        );
        causeSourceEventId = matchingSources[0]!.sourceEventId;
      }
      requirePhysical(
        causeSourceEventId !== undefined &&
          crisis.leaderId === effectiveLeader &&
          crisis.reason === expectedReason &&
          crisis.sourceEventId === causeSourceEventId,
        'INVALID_SOURCE',
      );
      const preparedLeadership = prepareCompanyEconomy(
        materialized(next),
        leadershipCommand,
        leadership.context,
      );
      if (preparedLeadership.kind === 'REJECTED')
        throw new CombatAggregateViolation(preparedLeadership.error);
      requirePhysical(
        !preparedLeadership.replayed && preparedLeadership.receipt.requirements.length === 0,
        'INCOMPATIBLE_ACTIVITY',
      );
      next = { ...next, economy: preparedLeadership.next };
      root = materialized(next);
    } else {
      requirePhysical(input.leadership === undefined, 'INVALID_SOURCE');
    }
    const departures = input.departures ?? [];
    const suppliedByMembership = new Map<string, CommandOf<'ExecuteDeparture'>>();
    for (const departure of departures) {
      const guarded = guardCompanyCommand(departure.command, departure.context);
      requirePhysical(guarded.ok && guarded.command.type === 'ExecuteDeparture', 'INVALID_SOURCE');
      const { membershipId, intentId } = guarded.command.payload;
      requirePhysical(
        materialized(next).finance.departures.some(
          (intent) =>
            intent.intentId === intentId &&
            intent.membershipId === membershipId &&
            intent.cancelledAt === null,
        ),
        'INVALID_SOURCE',
      );
      requirePhysical(!suppliedByMembership.has(membershipId), 'INVALID_SOURCE');
      suppliedByMembership.set(membershipId, guarded.command);
    }
    const eligibleMembershipIds = [
      ...new Set(
        materialized(next)
          .finance.departures.filter((intent) => intent.cancelledAt === null)
          .map((intent) => intent.membershipId),
      ),
    ].filter((membershipId) => {
      const supplied = suppliedByMembership.get(membershipId);
      return isDepartureExecutable(
        materialized(next),
        membershipId,
        supplied?.payload.careHandoverId,
      );
    });
    requirePhysical(
      eligibleMembershipIds.length === suppliedByMembership.size &&
        eligibleMembershipIds.every((membershipId) => suppliedByMembership.has(membershipId)),
      'INCOMPATIBLE_ACTIVITY',
    );
    for (const departure of departures) {
      validateAggregateContext(next, departure.context, input.terminal.atTick);
      const guardedDeparture = guardCompanyCommand(departure.command, departure.context);
      requirePhysical(
        guardedDeparture.ok && guardedDeparture.command.type === 'ExecuteDeparture',
        'INVALID_SOURCE',
      );
      const preparedDeparture = prepareCompanyEconomyWithLearningAndSocial(
        { economy: materialized(next), learning: next.learning },
        next.social,
        guardedDeparture.command,
        departure.context,
        departure.financialSocialInputs,
        departure.knowledge,
        departure.notices,
        {
          intervals: departure.learning.intervals,
          ...(departure.learning.manifest ? { manifest: departure.learning.manifest } : {}),
          ...(departure.learning.manifests ? { manifests: departure.learning.manifests } : {}),
          effectId: `${guardedDeparture.command.commandId}-terminal-departure`,
        },
      );
      if (preparedDeparture.kind === 'REJECTED')
        throw new CombatAggregateViolation(preparedDeparture.error);
      requirePhysical(!preparedDeparture.replayed, 'IDEMPOTENCY_CONFLICT');
      requirePhysical(preparedDeparture.requirements.length === 0, 'INCOMPATIBLE_ACTIVITY');
      next = {
        ...next,
        economy: preparedDeparture.next.economy,
        learning: preparedDeparture.next.learning,
        social: preparedDeparture.next.social,
      };
      root = materialized(next);
    }
    const remainingExecutable = root.finance.departures.some(
      (intent) => intent.cancelledAt === null && isDepartureExecutable(root, intent.membershipId),
    );
    requirePhysical(!remainingExecutable, 'INCOMPATIBLE_ACTIVITY');
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
      finalizeEvidenceKey,
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
