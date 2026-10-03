import type { AttackResolvedEvent, CombatEvent } from '../combat/types.js';
import { canonicalJson, id, unsigned } from './input.js';
import { prepareCombatConsequences } from './combat-consequences.js';
import type { PreparedCombatConsequences } from './combat-consequences.js';
import { prepareCombatPhysicalEffects } from './combat-physical.js';
import type { PreparedCombatPhysicalEffects } from './combat-physical.js';
import { validateCombatReceiptJournal } from './combat-receipts.js';
import type { CombatReceiptJournal } from './combat-receipts.js';
import { COMPANY_RULES } from './definitions.js';
import type { EconomyContext } from './economy-types.js';
import type { CommandOf } from './lifecycle-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import { COMPANY_CATALOGUE } from './definitions.js';
import { COMPANY_COMMAND_SCHEMA_VERSION, COMPANY_RULESET_ID } from './model.js';
import { requirePhysical } from './physical-state.js';
import {
  admitPractice,
  type PracticeContext,
  type PracticeEvidence,
} from './practice-admission.js';
import { PROGRESSION_RULES } from './progression.js';
import { preparePracticeCredit } from './practice-credit.js';
import { skillLevel } from './skill-progress.js';
import { activeMembership, effectiveLeaderId } from './lifecycle-state.js';

export const COMBAT_PRACTICE_PROFILE_VERSION = 's02-combat-practice-profile-2' as const;
export const FIRST_HUNT_PRACTICE_PROFILE_ID = 'first-hunt-practice-profile-2026-10-01-v1' as const;

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
}

export type CombatPracticeProfileResidual =
  'INVALID_JOURNAL' | 'PROFILE_INVALID' | 'RECEIPT_TICK_MISSING' | 'COMPANY_NOT_BOUND';

export type CombatPracticeProfileProduction =
  | { readonly status: 'READY'; readonly profile: CombatPracticeProfile }
  | {
      readonly status: 'NOT_READY';
      readonly residuals: readonly CombatPracticeProfileResidual[];
    };

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

export interface CombatPracticeStartSnapshot {
  readonly sourceId: string;
  readonly startReceiptOrdinal: number;
  readonly characterId: string;
  readonly skillId: string;
  readonly levelAtStart: number;
  readonly aptitudeAtStartBps: number;
}

/** A second allied company is a participant, not an opponent for practice credit. */
interface CombatSideBinding {
  readonly participants: readonly { readonly companyId: string; readonly sideId: string }[];
  readonly setup: { readonly units: readonly { readonly id: string; readonly sideId: string }[] };
}

export function isOpposingEncounterSide(
  binding: CombatSideBinding,
  companyId: string,
  unitId: string,
): boolean {
  const own = binding.participants.filter((participant) => participant.companyId === companyId);
  const ownSideIds = new Set(own.map((participant) => participant.sideId));
  const unit = binding.setup.units.find((candidate) => candidate.id === unitId);
  requirePhysical(own.length > 0 && unit, 'INVALID_SOURCE');
  return !ownSideIds.has(unit.sideId);
}

/**
 * Derive action starts and complete leadership cycles from one validated durable journal.
 * Unpaired subordinate actions remain incomplete and earn no leadership credit.
 */
export function deriveCombatPracticeProfile(input: {
  readonly root: MaterializedCompanyState;
  readonly journal: CombatReceiptJournal;
  readonly receiptTicks: readonly string[];
  readonly profileId: string;
  readonly challengeLevel: number;
}): CombatPracticeProfileProduction {
  let journal: CombatReceiptJournal;
  try {
    journal = validateCombatReceiptJournal(input.journal);
  } catch {
    return { status: 'NOT_READY', residuals: Object.freeze(['INVALID_JOURNAL']) };
  }
  if (!journal.binding.participants.some((entry) => entry.companyId === journal.companyId))
    return { status: 'NOT_READY', residuals: Object.freeze(['COMPANY_NOT_BOUND']) };
  if (
    input.root.lifecycle.companyId !== journal.companyId ||
    input.root.lifecycle.worldId !== journal.binding.worldId ||
    input.root.lifecycle.campaignTick !== journal.binding.atTick
  )
    return { status: 'NOT_READY', residuals: Object.freeze(['COMPANY_NOT_BOUND']) };
  if (
    input.receiptTicks.length !== journal.receipts.length ||
    input.receiptTicks.some(
      (tick, index) =>
        !/^(0|[1-9][0-9]*)$/u.test(tick) ||
        (index > 0 && BigInt(tick) < BigInt(input.receiptTicks[index - 1]!)),
    )
  )
    return { status: 'NOT_READY', residuals: Object.freeze(['RECEIPT_TICK_MISSING']) };
  if (
    !id.read(input.profileId) ||
    !Number.isSafeInteger(input.challengeLevel) ||
    input.challengeLevel < 0 ||
    input.challengeLevel > COMPANY_RULES.maxSkillLevel
  )
    return { status: 'NOT_READY', residuals: Object.freeze(['PROFILE_INVALID']) };

  const participants = new Map(journal.binding.participants.map((entry) => [entry.unitId, entry]));
  const actionStarts: CombatPracticeProfile['actionStarts'][number][] = [];
  const qualifyingAttacks: {
    readonly ordinal: number;
    readonly tick: string;
    readonly commandId: string;
    readonly unitId: string;
    readonly characterId: string;
  }[] = [];
  const leaderId = effectiveLeaderId(input.root.lifecycle);

  for (let ordinal = 1; ordinal < journal.receipts.length; ordinal += 1) {
    const receipt = journal.receipts[ordinal]!;
    const command = receipt.kernelCommand;
    if (command === null) continue;
    const participant = participants.get(command.actorId);
    if (participant?.companyId !== journal.companyId) continue;
    if (command.type === 'defend') {
      actionStarts.push({
        activationId: command.activationId,
        unitId: command.actorId,
        startedAt: input.receiptTicks[ordinal]!,
        startReceiptOrdinal: ordinal,
      });
      continue;
    }
    if (command.type !== 'attack') continue;
    const event = receipt.transition.events.find(
      (entry): entry is AttackResolvedEvent => entry.type === 'attack.resolved',
    );
    if (
      event?.attackerId !== command.actorId ||
      event.targetId !== command.targetId ||
      !isOpposingEncounterSide(journal.binding, journal.companyId, event.targetId)
    )
      continue;
    actionStarts.push({
      activationId: command.activationId,
      unitId: command.actorId,
      startedAt: input.receiptTicks[ordinal]!,
      startReceiptOrdinal: ordinal,
    });
    qualifyingAttacks.push({
      ordinal,
      tick: input.receiptTicks[ordinal]!,
      commandId: command.commandId,
      unitId: command.actorId,
      characterId: participant.projection.characterId,
    });
  }

  qualifyingAttacks.sort(
    (left, right) =>
      compareDecimalTicks(left.tick, right.tick) ||
      compareCodeUnits(left.commandId, right.commandId) ||
      compareCodeUnits(left.unitId, right.unitId),
  );
  const leadershipCycles: CombatPracticeProfile['leadershipCycles'][number][] = [];
  let first: (typeof qualifyingAttacks)[number] | undefined;
  let previousCycleEndOrdinal = 0;
  for (const action of qualifyingAttacks) {
    if (action.characterId === leaderId) continue;
    if (action.ordinal <= previousCycleEndOrdinal) continue;
    if (!first) {
      first = action;
      continue;
    }
    if (first.characterId === action.characterId || first.ordinal >= action.ordinal) continue;
    const cycleId = `leadership-cycle-${journal.binding.setup.battleId}-${first.ordinal}-${action.ordinal}`;
    leadershipCycles.push({
      cycleId,
      commanderId: leaderId,
      startedAt: first.tick,
      completedAt: action.tick,
      startReceiptOrdinal: first.ordinal,
      endReceiptOrdinal: action.ordinal,
    });
    previousCycleEndOrdinal = action.ordinal;
    first = undefined;
  }

  return {
    status: 'READY',
    profile: Object.freeze({
      version: COMBAT_PRACTICE_PROFILE_VERSION,
      profileId: input.profileId,
      bindingId: journal.binding.bindingId,
      challengeLevel: input.challengeLevel,
      actionStarts: Object.freeze(actionStarts),
      leadershipCycles: Object.freeze(leadershipCycles),
    }),
  };
}

function compareDecimalTicks(left: string, right: string): number {
  const a = BigInt(left);
  const b = BigInt(right);
  return a < b ? -1 : a > b ? 1 : 0;
}

function compareCodeUnits(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Derive credits for one receipt from the journal already validated at the aggregate boundary.
 * Keep this package-internal: callers must not use it to bypass whole-journal replay validation.
 */
export function deriveCombatPracticeReceipt(
  root: MaterializedCompanyState,
  validatedJournal: CombatReceiptJournal,
  receiptIndex: number,
  profile: CombatPracticeProfile,
  receiptTicks: readonly string[],
  savedStarts: readonly CombatPracticeStartSnapshot[],
  trustedCredits: readonly TrustedCombatPracticeCredit[] | undefined,
  context?: EconomyContext & PracticeContext,
): readonly TrustedCombatPracticeCredit[] {
  requirePhysical(
    receiptIndex > 0 &&
      receiptIndex < validatedJournal.receipts.length &&
      receiptTicks.length === validatedJournal.receipts.length &&
      profile.version === COMBAT_PRACTICE_PROFILE_VERSION &&
      profile.bindingId === validatedJournal.binding.bindingId &&
      id.read(profile.profileId),
    'INVALID_SOURCE',
  );
  const starts = new Map<string, CombatPracticeProfile['actionStarts'][number]>();
  for (const start of profile.actionStarts) {
    if (start.startReceiptOrdinal > receiptIndex) continue;
    requirePhysical(
      !starts.has(start.activationId) &&
        id.read(start.activationId) &&
        id.read(start.unitId) &&
        unsigned.read(start.startedAt) &&
        Number.isSafeInteger(start.startReceiptOrdinal) &&
        start.startReceiptOrdinal > 0 &&
        start.startReceiptOrdinal <= receiptIndex &&
        validatedJournal.receipts[start.startReceiptOrdinal]?.kernelCommand?.activationId ===
          start.activationId &&
        receiptTicks[start.startReceiptOrdinal] === start.startedAt,
      'INVALID_SOURCE',
    );
    starts.set(start.activationId, start);
  }
  const participantByUnit = new Map(
    validatedJournal.binding.participants.map((participant) => [participant.unitId, participant]),
  );
  const interactions: DerivedInteraction[] = [];
  const usedStarts = new Set<string>();
  for (let ordinal = 1; ordinal <= receiptIndex; ordinal += 1) {
    const receipt = validatedJournal.receipts[ordinal]!;
    const kernelCommand = receipt.kernelCommand;
    if (kernelCommand?.type !== 'attack') continue;
    const before = validatedJournal.receipts[ordinal - 1]!.transition.state;
    const event = receipt.transition.events.find(
      (entry): entry is AttackResolvedEvent => entry.type === 'attack.resolved',
    );
    requirePhysical(
      event &&
        event.attackerId === kernelCommand.actorId &&
        event.targetId === kernelCommand.targetId,
      'INVALID_SOURCE',
    );
    const eventIndex = receipt.transition.events.indexOf(event as CombatEvent);
    const sourceEventId = receipt.sourceEventIds[eventIndex];
    requirePhysical(sourceEventId, 'INVALID_SOURCE');
    const attacker = participantByUnit.get(event.attackerId);
    const defender = participantByUnit.get(event.targetId);
    const externalAttacker = isOpposingEncounterSide(
      validatedJournal.binding,
      validatedJournal.companyId,
      event.attackerId,
    );
    const externalDefender = isOpposingEncounterSide(
      validatedJournal.binding,
      validatedJournal.companyId,
      event.targetId,
    );
    if (attacker?.companyId === validatedJournal.companyId && externalDefender) {
      const start = starts.get(kernelCommand.activationId);
      requirePhysical(start?.unitId === kernelCommand.actorId, 'INVALID_SOURCE');
      usedStarts.add(kernelCommand.activationId);
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
        receiptOrdinal: ordinal,
        startReceiptOrdinal: start.startReceiptOrdinal,
      });
    }
    if (
      defender?.companyId === validatedJournal.companyId &&
      externalAttacker &&
      before.units.find((unit) => unit.id === event.targetId)?.guarding
    ) {
      const defend = validatedJournal.receipts
        .slice(1, ordinal)
        .toReversed()
        .find(
          (entry) =>
            entry.kernelCommand?.type === 'defend' &&
            entry.kernelCommand.actorId === event.targetId,
        );
      requirePhysical(defend?.kernelCommand?.type === 'defend', 'INVALID_SOURCE');
      const start = starts.get(defend.kernelCommand.activationId);
      requirePhysical(start?.unitId === event.targetId, 'INVALID_SOURCE');
      usedStarts.add(defend.kernelCommand.activationId);
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
        receiptOrdinal: ordinal,
        startReceiptOrdinal: start.startReceiptOrdinal,
      });
    }
  }
  for (const start of starts.values()) {
    if (usedStarts.has(start.activationId)) continue;
    const command = validatedJournal.receipts[start.startReceiptOrdinal]?.kernelCommand;
    requirePhysical(
      command?.type === 'defend' && command.actorId === start.unitId,
      'INVALID_SOURCE',
    );
  }
  const leaderId = effectiveLeaderId(root.lifecycle);
  const cycles = profile.leadershipCycles.filter(
    (cycle) => cycle.endReceiptOrdinal <= receiptIndex,
  );
  const claimedThreats = new Set<string>();
  for (const [index, cycle] of cycles.entries()) {
    requirePhysical(
      id.read(cycle.cycleId) &&
        cycle.commanderId === leaderId &&
        activeMembership(root.lifecycle, cycle.commanderId) !== undefined &&
        Number.isSafeInteger(cycle.startReceiptOrdinal) &&
        cycle.startReceiptOrdinal > 0 &&
        cycle.endReceiptOrdinal >= cycle.startReceiptOrdinal &&
        cycle.endReceiptOrdinal <= receiptIndex &&
        validatedJournal.receipts[cycle.startReceiptOrdinal]?.kernelCommand &&
        validatedJournal.receipts[cycle.endReceiptOrdinal]?.kernelCommand &&
        receiptTicks[cycle.startReceiptOrdinal] === cycle.startedAt &&
        receiptTicks[cycle.endReceiptOrdinal] === cycle.completedAt &&
        BigInt(cycle.startedAt) >= BigInt(validatedJournal.binding.atTick) &&
        BigInt(cycle.startedAt) <= BigInt(cycle.completedAt) &&
        (!index || cycles[index - 1]!.endReceiptOrdinal < cycle.startReceiptOrdinal),
      'INVALID_SOURCE',
    );
    const threats = interactions.filter(
      (entry) =>
        entry.methodId === 'weapon-attack' &&
        entry.receiptOrdinal >= cycle.startReceiptOrdinal &&
        entry.receiptOrdinal <= cycle.endReceiptOrdinal &&
        entry.characterId !== leaderId &&
        activeMembership(root.lifecycle, entry.characterId) !== undefined,
    );
    const subordinateIds = [...new Set(threats.map((entry) => entry.characterId))].sort();
    requirePhysical(subordinateIds.length >= 2, 'INVALID_SOURCE');
    for (const threat of threats) {
      requirePhysical(!claimedThreats.has(threat.sourceEventId), 'INVALID_SOURCE');
      claimedThreats.add(threat.sourceEventId);
    }
    const first = threats[0]!;
    interactions.push({
      sourceEventId: cycle.cycleId,
      characterId: leaderId,
      skillId: 'leadership',
      methodId: 'command-cycle',
      outcome: 'SUCCESS',
      startedAt: cycle.startedAt,
      attackerId: leaderId,
      defenderId: first.defenderId,
      activationId:
        validatedJournal.receipts[cycle.startReceiptOrdinal]!.kernelCommand!.activationId,
      receiptOrdinal: cycle.endReceiptOrdinal,
      startReceiptOrdinal: cycle.startReceiptOrdinal,
      cycleProof: {
        commanderId: leaderId,
        cycleId: cycle.cycleId,
        subordinateIds,
        interactions: threats.map((entry) => ({
          sourceEventId: entry.sourceEventId,
          attackerId: entry.attackerId,
          defenderId: entry.defenderId,
          atTick: receiptTicks[entry.receiptOrdinal]!,
          origin: 'EXTERNAL' as const,
        })),
      },
    });
  }
  const currentInteractions = interactions.filter((entry) => entry.receiptOrdinal === receiptIndex);
  const credits = new Map<string, TrustedCombatPracticeCredit>();
  const producedCredits =
    trustedCredits ??
    currentInteractions.map((interaction) => {
      requirePhysical(context, 'INVALID_SOURCE');
      const cycle =
        interaction.methodId === 'command-cycle'
          ? profile.leadershipCycles.find(
              (entry) => entry.cycleId === interaction.cycleProof?.cycleId,
            )
          : undefined;
      const snapshot = savedStarts.find(
        (entry) =>
          (cycle === undefined
            ? entry.sourceId === interaction.activationId
            : entry.startReceiptOrdinal === cycle.startReceiptOrdinal) &&
          entry.characterId === interaction.characterId &&
          entry.skillId === interaction.skillId,
      );
      const currentPerson = root.lifecycle.characters.find(
        (entry) => entry.identity.characterId === interaction.characterId,
      );
      const levelAtStart =
        snapshot?.levelAtStart ??
        (interaction.startReceiptOrdinal === receiptIndex && currentPerson
          ? skillLevel(currentPerson.skills[interaction.skillId] ?? 0)
          : undefined);
      const aptitudeAtStartBps =
        snapshot?.aptitudeAtStartBps ??
        (interaction.startReceiptOrdinal === receiptIndex
          ? currentPerson?.aptitudeBySkill[interaction.skillId]
          : undefined);
      const atTick = receiptTicks[receiptIndex]!;
      requirePhysical(
        levelAtStart !== undefined &&
          Number.isSafeInteger(aptitudeAtStartBps) &&
          aptitudeAtStartBps! > 0 &&
          context.companyId === root.lifecycle.companyId &&
          context.worldId === root.lifecycle.worldId &&
          context.canonicalRevision === root.lifecycle.revision &&
          context.atTick === atTick,
        'INVALID_SOURCE',
      );
      const payload = {
        receiptId: `${interaction.sourceEventId}-${profile.profileId}-${interaction.characterId}-${interaction.methodId}`,
        characterId: interaction.characterId,
        skillId: interaction.skillId,
        methodId: interaction.methodId,
        challengeLevel: profile.challengeLevel,
        outcome: interaction.outcome,
        effortTicks: '0',
      } as const;
      const sourceEventId = interaction.sourceEventId;
      const command: CommandOf<'CreditPractice'> = {
        schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
        commandId: `combat-practice-${sourceEventId}-${interaction.characterId}-${interaction.methodId}`,
        worldId: context.worldId,
        companyId: context.companyId,
        actorRef: { kind: 'DOMAIN_RECEIPT', id: sourceEventId },
        expectedRevision: context.canonicalRevision,
        campaignTick: atTick,
        rulesetId: COMPANY_RULESET_ID,
        sourceEventId,
        type: 'CreditPractice',
        payload,
      };
      const proof: PracticeEvidence['proof'] = interaction.cycleProof
        ? { kind: 'command-cycle', ...interaction.cycleProof }
        : interaction.methodId === 'weapon-attack'
          ? {
              kind: 'weapon-attack',
              interaction: {
                sourceEventId,
                attackerId: interaction.attackerId,
                defenderId: interaction.defenderId,
                atTick,
                origin: 'EXTERNAL',
              },
              weaponProfile: interaction.weaponProfile!,
            }
          : {
              kind: 'guard-interaction',
              interaction: {
                sourceEventId,
                attackerId: interaction.attackerId,
                defenderId: interaction.defenderId,
                atTick,
                origin: 'EXTERNAL',
              },
            };
      const fact: PracticeEvidence = {
        worldId: context.worldId,
        companyId: context.companyId,
        sourceEventId,
        rulesVersion: PROGRESSION_RULES.version,
        catalogueVersion: COMPANY_CATALOGUE.version,
        payload,
        startedAt: interaction.startedAt,
        completedAt: atTick,
        levelAtStart,
        aptitudeAtStartBps: aptitudeAtStartBps!,
        proof,
      };
      const trustedContext: EconomyContext & PracticeContext = {
        ...context,
        principal: command.actorRef,
        internalGrant: {
          commandId: command.commandId,
          sourceEventId,
          canonicalRequest: canonicalJson(command),
          evidenceRevision: context.canonicalRevision,
        },
        practiceFacts: [fact],
      };
      admitPractice(command, trustedContext);
      return { command, context: trustedContext };
    });
  for (const credit of producedCredits) {
    const command = credit.command;
    requirePhysical(command.type === 'CreditPractice' && command.sourceEventId, 'INVALID_SOURCE');
    const key = interactionKey({
      sourceEventId: command.sourceEventId,
      characterId: command.payload.characterId,
      skillId: command.payload.skillId,
      methodId: command.payload.methodId as DerivedInteraction['methodId'],
    });
    requirePhysical(!credits.has(key), 'INVALID_SOURCE');
    credits.set(key, credit);
  }
  requirePhysical(credits.size === currentInteractions.length, 'INVALID_SOURCE');
  for (const interaction of currentInteractions) {
    const credit = credits.get(interactionKey(interaction));
    requirePhysical(credit, 'INVALID_SOURCE');
    const { command, context } = credit;
    const fact = context.practiceFacts?.length === 1 ? context.practiceFacts[0] : undefined;
    const cycle =
      interaction.methodId === 'command-cycle'
        ? profile.leadershipCycles.find(
            (entry) => entry.cycleId === interaction.cycleProof?.cycleId,
          )
        : undefined;
    const cycleStartReceipt = cycle && validatedJournal.receipts[cycle.startReceiptOrdinal];
    const startSourceId = interaction.activationId;
    let snapshotStartOrdinal: number | undefined;
    if (interaction.methodId === 'command-cycle') {
      requirePhysical(cycle && cycleStartReceipt, 'INVALID_SOURCE');
      snapshotStartOrdinal = cycle.startReceiptOrdinal;
    }
    const snapshot = savedStarts.find(
      (entry) =>
        (snapshotStartOrdinal === undefined
          ? entry.sourceId === startSourceId
          : entry.startReceiptOrdinal === snapshotStartOrdinal) &&
        entry.characterId === interaction.characterId &&
        entry.skillId === interaction.skillId,
    );
    const currentPerson = root.lifecycle.characters.find(
      (entry) => entry.identity.characterId === interaction.characterId,
    );
    const levelAtStart =
      snapshot?.levelAtStart ??
      (interaction.startReceiptOrdinal === receiptIndex && currentPerson
        ? skillLevel(currentPerson.skills[interaction.skillId] ?? 0)
        : undefined);
    const aptitudeAtStartBps =
      snapshot?.aptitudeAtStartBps ??
      (interaction.startReceiptOrdinal === receiptIndex
        ? currentPerson?.aptitudeBySkill[interaction.skillId]
        : undefined);
    const atTick = receiptTicks[receiptIndex]!;
    const expectedProof = interaction.cycleProof
      ? { kind: 'command-cycle', ...interaction.cycleProof }
      : {
          kind: interaction.methodId,
          interaction: {
            sourceEventId: interaction.sourceEventId,
            attackerId: interaction.attackerId,
            defenderId: interaction.defenderId,
            atTick,
            origin: 'EXTERNAL',
          },
          ...(interaction.methodId === 'weapon-attack'
            ? { weaponProfile: interaction.weaponProfile }
            : {}),
        };
    requirePhysical(
      interaction.startReceiptOrdinal <= interaction.receiptOrdinal &&
        levelAtStart !== undefined &&
        Number.isSafeInteger(aptitudeAtStartBps) &&
        aptitudeAtStartBps! > 0 &&
        context.companyId === root.lifecycle.companyId &&
        context.worldId === root.lifecycle.worldId &&
        context.atTick === atTick &&
        command.payload.receiptId ===
          `${interaction.sourceEventId}-${profile.profileId}-${interaction.characterId}-${interaction.methodId}` &&
        command.payload.challengeLevel === profile.challengeLevel &&
        command.payload.outcome === interaction.outcome &&
        command.payload.effortTicks === '0' &&
        fact?.startedAt === interaction.startedAt &&
        fact.completedAt === atTick &&
        fact.levelAtStart === levelAtStart &&
        fact.aptitudeAtStartBps === aptitudeAtStartBps &&
        canonicalJson(fact.proof) === canonicalJson(expectedProof),
      'INVALID_SOURCE',
    );
  }
  return Object.freeze(currentInteractions.map((entry) => credits.get(interactionKey(entry))!));
}

/** Build the deterministic, source-bound credit envelopes for one verified receipt. */
export function prepareCombatPracticeCredits(input: {
  readonly root: MaterializedCompanyState;
  readonly journal: CombatReceiptJournal;
  readonly receiptIndex: number;
  readonly profile: CombatPracticeProfile;
  readonly receiptTicks: readonly string[];
  readonly savedStarts: readonly CombatPracticeStartSnapshot[];
  readonly context: EconomyContext & PracticeContext;
}): readonly TrustedCombatPracticeCredit[] {
  const journal = validateCombatReceiptJournal(input.journal);
  return deriveCombatPracticeReceipt(
    input.root,
    journal,
    input.receiptIndex,
    input.profile,
    input.receiptTicks,
    input.savedStarts,
    undefined,
    input.context,
  );
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
    const isExternalAttacker = isOpposingEncounterSide(
      journal.binding,
      journal.companyId,
      event.attackerId,
    );
    const isExternalDefender = isOpposingEncounterSide(
      journal.binding,
      journal.companyId,
      event.targetId,
    );
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
  });
}
