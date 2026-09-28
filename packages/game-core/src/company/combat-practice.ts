import type { AttackResolvedEvent, CombatEvent } from '../combat/types.js';
import { canonicalJson, id, unsigned } from './input.js';
import { prepareCombatConsequences } from './combat-consequences.js';
import type { PreparedCombatConsequences } from './combat-consequences.js';
import { prepareCombatPhysicalEffects } from './combat-physical.js';
import type { PreparedCombatPhysicalEffects } from './combat-physical.js';
import type { CombatReceiptJournal } from './combat-receipts.js';
import { COMPANY_RULES } from './definitions.js';
import type { EconomyContext } from './economy-types.js';
import type { CommandOf } from './lifecycle-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import { requirePhysical } from './physical-state.js';
import { preparePracticeCredit } from './practice-credit.js';
import type { PracticeContext } from './practice-admission.js';
import { skillLevel } from './skill-progress.js';
import { activeMembership, effectiveLeaderId } from './lifecycle-state.js';

export const COMBAT_PRACTICE_PROFILE_VERSION = 's02-combat-practice-profile-2' as const;

/** Adapter-trusted action and completed-cycle boundaries, bound to a frozen encounter. */
export interface CombatPracticeProfile {
  readonly version: typeof COMBAT_PRACTICE_PROFILE_VERSION;
  readonly profileId: string;
  readonly bindingId: string;
  readonly challengeLevel: number;
  readonly actionStarts: readonly {
    readonly activationId: string;
    readonly unitId: string;
    readonly startedAt: string;
    readonly startReceiptOrdinal: number;
  }[];
  readonly leadershipCycles: readonly {
    readonly cycleId: string;
    readonly commanderId: string;
    readonly startedAt: string;
    readonly completedAt: string;
    readonly startReceiptOrdinal: number;
    readonly endReceiptOrdinal: number;
  }[];
}

/** Authority is issued at the authenticated adapter boundary; this composer never mints it. */
export interface TrustedCombatPracticeCredit {
  readonly command: CommandOf<'CreditPractice'>;
  readonly context: EconomyContext & PracticeContext;
}

export interface PreparedCombatPracticeEffects extends PreparedCombatConsequences {
  readonly credits: number;
  /** The runtime boundary producer still has to issue these trusted cycle descriptors. */
  readonly practiceResiduals: readonly ['LEADERSHIP_CYCLE_PRODUCER'];
}

interface DerivedInteraction {
  readonly sourceEventId: string;
  readonly characterId: string;
  readonly skillId: string;
  readonly methodId: 'weapon-attack' | 'guard-interaction' | 'command-cycle';
  readonly outcome: 'SUCCESS' | 'MEANINGFUL_FAILURE';
  readonly startedAt: string;
  readonly attackerId: string;
  readonly defenderId: string;
  readonly weaponProfile?: string;
  readonly activationId: string;
  readonly receiptOrdinal: number;
  readonly startReceiptOrdinal: number;
  readonly cycleProof?: {
    readonly commanderId: string;
    readonly cycleId: string;
    readonly subordinateIds: readonly string[];
    readonly interactions: readonly {
      readonly sourceEventId: string;
      readonly attackerId: string;
      readonly defenderId: string;
      readonly atTick: string;
      readonly origin: 'EXTERNAL';
    }[];
  };
}

function interactionKey(
  entry: Pick<DerivedInteraction, 'sourceEventId' | 'characterId' | 'skillId' | 'methodId'>,
) {
  return canonicalJson([entry.sourceEventId, entry.characterId, entry.skillId, entry.methodId]);
}

function character(root: MaterializedCompanyState, characterId: string) {
  return root.lifecycle.characters.find((entry) => entry.identity.characterId === characterId);
}

/** G09: compose only adapter-issued credits whose proof is present in replayed G06 history. */
export function prepareCombatPracticeEffects(
  initialRoot: MaterializedCompanyState,
  physicalCandidate: PreparedCombatPhysicalEffects,
  g08Candidate: PreparedCombatConsequences,
  journal: CombatReceiptJournal,
  context: EconomyContext,
  profile: CombatPracticeProfile,
  trustedCredits: readonly TrustedCombatPracticeCredit[],
): PreparedCombatPracticeEffects {
  const verifiedPhysical = prepareCombatPhysicalEffects(initialRoot, journal);
  requirePhysical(
    canonicalJson(physicalCandidate) === canonicalJson(verifiedPhysical),
    'INVALID_SOURCE',
  );
  const verified = prepareCombatConsequences(initialRoot, physicalCandidate, journal, context);
  requirePhysical(canonicalJson(g08Candidate) === canonicalJson(verified), 'INVALID_SOURCE');
  requirePhysical(
    context.companyId === initialRoot.lifecycle.companyId &&
      context.worldId === initialRoot.lifecycle.worldId &&
      context.atTick === initialRoot.lifecycle.campaignTick &&
      journal.companyId === initialRoot.lifecycle.companyId &&
      profile.version === COMBAT_PRACTICE_PROFILE_VERSION &&
      id.read(profile.profileId) &&
      profile.bindingId === journal.binding.bindingId &&
      Number.isSafeInteger(profile.challengeLevel) &&
      profile.challengeLevel >= 0 &&
      profile.challengeLevel <= COMPANY_RULES.maxSkillLevel,
    'INVALID_SOURCE',
  );

  const starts = new Map<string, CombatPracticeProfile['actionStarts'][number]>();
  for (const start of profile.actionStarts) {
    requirePhysical(!starts.has(start.activationId), 'INVALID_SOURCE');
    requirePhysical(
      id.read(start.activationId) &&
        id.read(start.unitId) &&
        unsigned.read(start.startedAt) &&
        BigInt(start.startedAt) >= BigInt(journal.binding.atTick) &&
        BigInt(start.startedAt) <= BigInt(context.atTick) &&
        Number.isSafeInteger(start.startReceiptOrdinal) &&
        start.startReceiptOrdinal > 0 &&
        start.startReceiptOrdinal < journal.receipts.length &&
        journal.receipts[start.startReceiptOrdinal]?.kernelCommand?.activationId ===
          start.activationId,
      'INVALID_SOURCE',
    );
    starts.set(start.activationId, start);
  }

  const participantByUnit = new Map(
    journal.binding.participants.map((participant) => [participant.unitId, participant]),
  );
  const interactions: DerivedInteraction[] = [];
  for (let receiptIndex = 1; receiptIndex < journal.receipts.length; receiptIndex += 1) {
    const receipt = journal.receipts[receiptIndex]!;
    const kernelCommand = receipt.kernelCommand;
    if (kernelCommand?.type !== 'attack') continue;
    const before = journal.receipts[receiptIndex - 1]!.transition.state;
    const event = receipt.transition.events.find(
      (entry): entry is AttackResolvedEvent => entry.type === 'attack.resolved',
    );
    requirePhysical(event, 'INVALID_SOURCE');
    const eventIndex = receipt.transition.events.indexOf(event as CombatEvent);
    requirePhysical(
      event.attackerId === kernelCommand.actorId && event.targetId === kernelCommand.targetId,
      'INVALID_SOURCE',
    );
    const sourceEventId = receipt.sourceEventIds[eventIndex];
    requirePhysical(sourceEventId, 'INVALID_SOURCE');
    const attacker = participantByUnit.get(event.attackerId);
    const defender = participantByUnit.get(event.targetId);
    const isExternalAttacker = attacker !== undefined && attacker.companyId !== journal.companyId;
    const isExternalDefender = defender !== undefined && defender.companyId !== journal.companyId;
    if (attacker?.companyId === journal.companyId && isExternalDefender) {
      const start = starts.get(kernelCommand.activationId);
      requirePhysical(start?.unitId === kernelCommand.actorId, 'INVALID_SOURCE');
      requirePhysical(character(initialRoot, attacker.projection.characterId), 'INVALID_SOURCE');
      interactions.push({
        sourceEventId,
        characterId: attacker.projection.characterId,
        skillId: attacker.projection.weapon.skillId,
        methodId: 'weapon-attack',
        outcome: event.hit ? 'SUCCESS' : 'MEANINGFUL_FAILURE',
        startedAt: start.startedAt,
        attackerId: attacker.projection.characterId,
        defenderId: defender?.projection.characterId ?? event.targetId,
        weaponProfile: attacker.projection.weapon.profileId,
        activationId: kernelCommand.activationId,
        receiptOrdinal: receiptIndex,
        startReceiptOrdinal: start.startReceiptOrdinal,
      });
    }
    if (defender?.companyId === journal.companyId && isExternalAttacker) {
      const wasGuarding = before.units.find((unit) => unit.id === event.targetId)?.guarding;
      if (wasGuarding) {
        const defend = journal.receipts
          .slice(1, receiptIndex)
          .toReversed()
          .find(
            (entry) =>
              entry.kernelCommand?.type === 'defend' &&
              entry.kernelCommand.actorId === event.targetId,
          );
        requirePhysical(defend?.kernelCommand?.type === 'defend', 'INVALID_SOURCE');
        const start = starts.get(defend.kernelCommand.activationId);
        requirePhysical(start?.unitId === event.targetId, 'INVALID_SOURCE');
        requirePhysical(character(initialRoot, defender.projection.characterId), 'INVALID_SOURCE');
        interactions.push({
          sourceEventId,
          characterId: defender.projection.characterId,
          skillId: 'defense',
          methodId: 'guard-interaction',
          outcome: 'SUCCESS',
          startedAt: start.startedAt,
          attackerId: attacker?.projection.characterId ?? event.attackerId,
          defenderId: defender.projection.characterId,
          activationId: defend.kernelCommand.activationId,
          receiptOrdinal: receiptIndex,
          startReceiptOrdinal: starts.get(defend.kernelCommand.activationId)!.startReceiptOrdinal,
        });
      }
    }
  }

  const leaderId = effectiveLeaderId(initialRoot.lifecycle);
  const cycles = [...profile.leadershipCycles].sort(
    (left, right) => left.endReceiptOrdinal - right.endReceiptOrdinal,
  );
  const claimedThreats = new Set<string>();
  for (const [index, cycle] of cycles.entries()) {
    const startReceipt = journal.receipts[cycle.startReceiptOrdinal];
    const endReceipt = journal.receipts[cycle.endReceiptOrdinal];
    requirePhysical(
      id.read(cycle.cycleId) &&
        unsigned.read(cycle.startedAt) &&
        unsigned.read(cycle.completedAt) &&
        cycle.commanderId === leaderId &&
        activeMembership(initialRoot.lifecycle, cycle.commanderId) !== undefined &&
        cycle.startReceiptOrdinal > 0 &&
        cycle.endReceiptOrdinal >= cycle.startReceiptOrdinal &&
        cycle.endReceiptOrdinal < journal.receipts.length &&
        startReceipt?.kernelCommand !== null &&
        startReceipt?.kernelCommand !== undefined &&
        endReceipt?.kernelCommand !== null &&
        endReceipt?.kernelCommand !== undefined &&
        BigInt(cycle.startedAt) >= BigInt(journal.binding.atTick) &&
        BigInt(cycle.startedAt) <= BigInt(cycle.completedAt) &&
        BigInt(cycle.completedAt) <= BigInt(context.atTick) &&
        (!index || cycles[index - 1]!.endReceiptOrdinal < cycle.startReceiptOrdinal),
      'INVALID_SOURCE',
    );
    const cycleThreats = interactions.filter(
      (entry) =>
        entry.methodId === 'weapon-attack' &&
        entry.receiptOrdinal >= cycle.startReceiptOrdinal &&
        entry.receiptOrdinal <= cycle.endReceiptOrdinal &&
        entry.characterId !== leaderId &&
        activeMembership(initialRoot.lifecycle, entry.characterId) !== undefined,
    );
    const subordinateIds = [...new Set(cycleThreats.map((entry) => entry.characterId))].sort();
    requirePhysical(subordinateIds.length >= 2, 'INVALID_SOURCE');
    for (const threat of cycleThreats) {
      requirePhysical(!claimedThreats.has(threat.sourceEventId), 'INVALID_SOURCE');
      claimedThreats.add(threat.sourceEventId);
    }
    const interaction = cycleThreats[0]!;
    interactions.push({
      sourceEventId: cycle.cycleId,
      characterId: leaderId,
      skillId: 'leadership',
      methodId: 'command-cycle',
      outcome: 'SUCCESS',
      startedAt: cycle.startedAt,
      attackerId: leaderId,
      defenderId: interaction.defenderId,
      activationId: journal.receipts[cycle.startReceiptOrdinal]!.kernelCommand!.activationId,
      receiptOrdinal: cycle.endReceiptOrdinal,
      startReceiptOrdinal: cycle.startReceiptOrdinal,
      cycleProof: {
        commanderId: leaderId,
        cycleId: cycle.cycleId,
        subordinateIds,
        interactions: cycleThreats.map((threat) => ({
          sourceEventId: threat.sourceEventId,
          attackerId: threat.attackerId,
          defenderId: threat.defenderId,
          atTick: context.atTick,
          origin: 'EXTERNAL' as const,
        })),
      },
    });
  }

  const credits = new Map<string, TrustedCombatPracticeCredit>();
  for (const credit of trustedCredits) {
    const command = credit.command;
    requirePhysical(command.type === 'CreditPractice', 'INVALID_SOURCE');
    const key = interactionKey({
      sourceEventId: command.sourceEventId!,
      characterId: command.payload.characterId,
      skillId: command.payload.skillId,
      methodId: command.payload.methodId as DerivedInteraction['methodId'],
    });
    requirePhysical(!credits.has(key), 'INVALID_SOURCE');
    credits.set(key, credit);
  }
  requirePhysical(credits.size === interactions.length, 'INVALID_SOURCE');

  interactions.sort((left, right) => left.receiptOrdinal - right.receiptOrdinal);
  const creditByOrdinal = new Map<number, DerivedInteraction[]>();
  for (const interaction of interactions) {
    creditByOrdinal.set(interaction.receiptOrdinal, [
      ...(creditByOrdinal.get(interaction.receiptOrdinal) ?? []),
      interaction,
    ]);
  }
  const rootAtStart = new Map<number, MaterializedCompanyState>();
  const usedStarts = new Set<string>();
  let root = verified.root;
  for (let ordinal = 1; ordinal < journal.receipts.length; ordinal += 1) {
    rootAtStart.set(ordinal, root);
    for (const interaction of creditByOrdinal.get(ordinal) ?? []) {
      const credit = credits.get(interactionKey(interaction));
      requirePhysical(credit, 'INVALID_SOURCE');
      const { command, context: trustedContext } = credit;
      const fact =
        trustedContext.practiceFacts?.length === 1 ? trustedContext.practiceFacts[0] : undefined;
      const actionStartRoot = rootAtStart.get(interaction.startReceiptOrdinal);
      const snapshot = actionStartRoot && character(actionStartRoot, interaction.characterId);
      requirePhysical(snapshot, 'INVALID_SOURCE');
      const aptitudeAtStartBps = snapshot.aptitudeBySkill[interaction.skillId];
      const expectedProof = interaction.cycleProof
        ? { kind: 'command-cycle', ...interaction.cycleProof }
        : {
            kind: interaction.methodId,
            interaction: {
              sourceEventId: interaction.sourceEventId,
              attackerId: interaction.attackerId,
              defenderId: interaction.defenderId,
              atTick: context.atTick,
              origin: 'EXTERNAL',
            },
            ...(interaction.methodId === 'weapon-attack'
              ? { weaponProfile: interaction.weaponProfile }
              : {}),
          };
      requirePhysical(
        interaction.startReceiptOrdinal <= interaction.receiptOrdinal &&
          Number.isSafeInteger(aptitudeAtStartBps) &&
          aptitudeAtStartBps! > 0 &&
          trustedContext.companyId === initialRoot.lifecycle.companyId &&
          trustedContext.worldId === initialRoot.lifecycle.worldId &&
          trustedContext.atTick === context.atTick &&
          command.payload.receiptId ===
            `${interaction.sourceEventId}-${profile.profileId}-${interaction.characterId}-${interaction.methodId}` &&
          command.payload.challengeLevel === profile.challengeLevel &&
          command.payload.outcome === interaction.outcome &&
          command.payload.effortTicks === '0' &&
          fact?.startedAt === interaction.startedAt &&
          fact.completedAt === context.atTick &&
          fact.levelAtStart === skillLevel(snapshot.skills[interaction.skillId] ?? 0) &&
          fact.aptitudeAtStartBps === aptitudeAtStartBps &&
          canonicalJson(fact.proof) === canonicalJson(expectedProof),
        'INVALID_SOURCE',
      );
      if (interaction.methodId !== 'command-cycle') usedStarts.add(interaction.activationId);
      root = preparePracticeCredit(root, command, trustedContext);
    }
  }
  requirePhysical(
    usedStarts.size === starts.size &&
      [...starts.keys()].every((activationId) => usedStarts.has(activationId)),
    'INVALID_SOURCE',
  );
  return Object.freeze({
    ...verified,
    root,
    credits: interactions.length,
    practiceResiduals: Object.freeze(['LEADERSHIP_CYCLE_PRODUCER'] as const),
  });
}
