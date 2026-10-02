import { createHash } from 'node:crypto';

import * as combat from '@warwrit/game-core';
import type {
  CombatOwnerContext,
  CombatReceiptApplication,
  CombatReceiptJournal,
  CombatPracticeStartSnapshot,
  CombatCommand,
  CompanyCombatAggregateState,
  MaterializedCompanyState,
} from '@warwrit/game-core';
import type {
  FirstHuntTerminalEvidence,
  FirstHuntTerminalEvidenceResidual,
} from '../contracts/terminal-evidence-types.js';
import { prepareEncounterFoodFacts, travelAdvanceSourceEventId } from '../company/travel-food.js';

export interface TerminalCommandRow {
  readonly revision: number;
  readonly campaign_tick: string | null;
  readonly command: CombatCommand;
}

function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function materialized(state: CompanyCombatAggregateState): MaterializedCompanyState {
  if (!state.economy.physical) throw new TypeError('FIRST HUNT company lacks physical state');
  return {
    lifecycle: state.economy.lifecycle,
    finance: state.economy.finance,
    physical: state.economy.physical,
  };
}

function ownerContext(
  state: CompanyCombatAggregateState,
  atTick: string,
  physicalFacts: readonly combat.PhysicalEvidence[] = [],
  financeFacts: readonly combat.FinanceEvidence[] = [],
): CombatOwnerContext {
  const lifecycle = state.economy.lifecycle;
  return {
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    principal: { kind: 'SYSTEM', id: 'encounter-runtime' },
    publicRevision: lifecycle.knowledge.revision,
    canonicalRevision: lifecycle.revision,
    atTick: combat.campaignTick(atTick),
    completeGraph: true,
    contactIds: [],
    facts: [],
    financeFacts,
    physicalFacts,
    practiceFacts: [],
    learningFacts: [],
  };
}

function receiptRequest(
  root: CompanyCombatAggregateState,
  binding: combat.FrozenEncounterBinding,
  transition: combat.CombatTransition,
): CombatReceiptJournal['receipts'][number]['request'] {
  const revision = transition.state.revision;
  const receiptId = `${binding.setup.battleId}:${revision}`;
  const value = {
    schemaVersion: combat.COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: receiptId,
    sourceEventId: receiptId,
    worldId: root.economy.lifecycle.worldId,
    companyId: root.economy.lifecycle.companyId,
    actorRef: { kind: 'COMBAT_RECEIPT' as const, id: receiptId },
    expectedRevision: root.economy.lifecycle.revision,
    campaignTick: root.economy.lifecycle.campaignTick,
    rulesetId: combat.COMPANY_RULESET_ID,
    type: 'ConsumeCombatReceipt' as const,
    payload: {
      bindingId: binding.bindingId,
      receiptId,
      revision: String(revision),
      orderedEvents: transition.events,
    },
  };
  const parsed = combat.parseCompanyCommand(value);
  if (!parsed.ok || parsed.command.type !== 'ConsumeCombatReceipt')
    throw new TypeError('Could not construct durable combat receipt request');
  return parsed.command;
}

function appendReceipt(
  journal: CombatReceiptJournal,
  root: CompanyCombatAggregateState,
  transition: combat.CombatTransition,
  kernelCommand: CombatCommand | null,
): CombatReceiptJournal {
  const request = receiptRequest(root, journal.binding, transition);
  const grant = {
    commandId: request.commandId,
    sourceEventId: request.sourceEventId!,
    canonicalRequest: combat.canonicalJson(request),
  };
  const context = {
    ...ownerContext(root, root.economy.lifecycle.campaignTick),
    principal: request.actorRef,
    internalGrant: grant,
    binding: journal.binding,
    kernelCommand,
    transition,
  };
  return combat.prepareCombatReceipt(journal, request, context).journal;
}

function startSnapshotsForReceipt(
  state: CompanyCombatAggregateState,
  journal: CombatReceiptJournal,
  profile: combat.CombatPracticeProfile,
  receiptIndex: number,
): readonly CombatPracticeStartSnapshot[] {
  const receipt = journal.receipts[receiptIndex];
  if (!receipt) throw new TypeError('Combat receipt is missing');
  const lifecycle = state.economy.lifecycle;
  const snapshots: CombatPracticeStartSnapshot[] = [];
  for (const start of profile.actionStarts.filter(
    (entry) => entry.startReceiptOrdinal === receiptIndex,
  )) {
    const participant = journal.binding.participants.find((entry) => entry.unitId === start.unitId);
    const character = lifecycle.characters.find(
      (entry) => entry.identity.characterId === participant?.projection.characterId,
    );
    const command = receipt.kernelCommand;
    const skillId =
      command?.type === 'attack'
        ? participant?.projection.weapon.skillId
        : command?.type === 'defend'
          ? 'defense'
          : undefined;
    const aptitudeAtStartBps = skillId ? character?.aptitudeBySkill[skillId] : undefined;
    if (
      !participant ||
      !character ||
      !skillId ||
      !Number.isSafeInteger(aptitudeAtStartBps) ||
      aptitudeAtStartBps! <= 0
    )
      throw new TypeError(
        'Combat practice action start is not bound to a capable company character',
      );
    snapshots.push({
      sourceId: start.activationId,
      startReceiptOrdinal: receiptIndex,
      characterId: participant.projection.characterId,
      skillId,
      levelAtStart: combat.skillLevel(character.skills[skillId] ?? 0),
      aptitudeAtStartBps: aptitudeAtStartBps!,
    });
  }

  const leaderId = lifecycle.company?.actingLeaderId ?? lifecycle.company?.currentLeaderId;
  const leader = lifecycle.characters.find((entry) => entry.identity.characterId === leaderId);
  const leadershipAptitude = leader?.aptitudeBySkill['leadership'];
  if (leader && Number.isSafeInteger(leadershipAptitude) && leadershipAptitude! > 0)
    snapshots.push({
      sourceId: receipt.request.payload.receiptId,
      startReceiptOrdinal: receiptIndex,
      characterId: leader.identity.characterId,
      skillId: 'leadership',
      levelAtStart: combat.skillLevel(leader.skills['leadership'] ?? 0),
      aptitudeAtStartBps: leadershipAptitude!,
    });
  return snapshots;
}

function notReady(...residuals: FirstHuntTerminalEvidenceResidual[]): FirstHuntTerminalEvidence {
  return { status: 'NOT_READY', residuals: Object.freeze([...new Set(residuals)]) };
}

/** Prepare company effects exclusively from the locked root and replay-verified durable rows. */
export function prepareFirstHuntTerminalEvidence(input: {
  readonly worldId: string;
  readonly encounterId: string;
  readonly terminalRevision: number;
  readonly companyId: string;
  readonly previous: CompanyCombatAggregateState;
  readonly contractProfileId: string;
  readonly contractTermsDigest: string;
  readonly stored: {
    readonly state: combat.BattleState;
    readonly revision: number;
    readonly status: 'active' | 'resolved';
  };
  readonly commandRows: readonly TerminalCommandRow[];
  /** The owner's recorded successor choice when the leader died and someone can continue. */
  readonly leadershipChoice?: {
    readonly accountId: string;
    readonly commandId: string;
    readonly candidateId: string;
    readonly mode: 'PERMANENT' | 'ACTING' | 'REGENCY';
  };
}): FirstHuntTerminalEvidence {
  const previous = combat.readCompanyCombatAggregateState(input.previous);
  const active = previous.encounter.active;
  if (
    !active ||
    active.binding.worldId !== input.worldId ||
    active.binding.setup.battleId !== input.encounterId ||
    previous.economy.lifecycle.companyId !== input.companyId
  )
    return notReady('COMPANY_BINDING_MISMATCH');
  if (
    input.stored.status !== 'resolved' ||
    input.stored.revision !== input.terminalRevision ||
    input.stored.state.revision !== input.terminalRevision ||
    input.commandRows.length !== input.terminalRevision - active.binding.initial.state.revision
  )
    return notReady('ENCOUNTER_REPLAY_INVALID');
  if (
    input.contractProfileId !== combat.FIRST_HUNT_PROFILE_ID ||
    !/^[0-9a-f]{64}$/u.test(input.contractTermsDigest)
  )
    return notReady('PROFILE_INVALID');
  if (previous.learning.tasks.tasks.some((task) => !task.stop && !task.terminal))
    return notReady('LEARNING_EVIDENCE_MISSING');

  let journal = combat.createCombatReceiptJournal(active.binding, input.companyId);
  journal = appendReceipt(journal, previous, active.binding.initial, null);
  const receiptTicks = [active.binding.atTick];
  let priorTick = active.binding.atTick;
  let kernelState = active.binding.initial.state;
  for (const row of input.commandRows) {
    if (
      row.revision !== kernelState.revision + 1 ||
      typeof row.campaign_tick !== 'string' ||
      !/^(0|[1-9][0-9]*)$/u.test(row.campaign_tick) ||
      BigInt(row.campaign_tick) < BigInt(priorTick)
    )
      return notReady('RECEIPT_TIME_EVIDENCE_MISSING');
    const result = combat.applyCombatCommand(kernelState, row.command);
    if (!result.ok) return notReady('ENCOUNTER_REPLAY_INVALID');
    const transition = { state: result.state, events: result.events };
    journal = appendReceipt(journal, previous, transition, row.command);
    kernelState = transition.state;
    priorTick = combat.campaignTick(row.campaign_tick);
    receiptTicks.push(priorTick);
  }
  if (
    kernelState.status !== 'resolved' ||
    combat.canonicalStateJson(kernelState) !== combat.canonicalStateJson(input.stored.state)
  )
    return notReady('ENCOUNTER_REPLAY_INVALID');

  const profileResult = combat.deriveCombatPracticeProfile({
    root: materialized(previous),
    journal,
    receiptTicks,
    profileId: combat.FIRST_HUNT_PRACTICE_PROFILE_ID,
    challengeLevel: 3,
  });
  if (profileResult.status !== 'READY') return notReady('PRACTICE_PROFILE_INVALID');
  const practiceProfile = profileResult.profile;
  const profileDigest = combat.canonicalJson({
    version: practiceProfile.version,
    profileId: practiceProfile.profileId,
    bindingId: practiceProfile.bindingId,
    challengeLevel: practiceProfile.challengeLevel,
  });
  if (active.practiceProfileDigest !== null && active.practiceProfileDigest !== profileDigest)
    return notReady('PRACTICE_PROFILE_INVALID');

  const applications: CombatReceiptApplication[] = [];
  let consumed: ReturnType<typeof combat.prepareConsumeCombatAggregate> | undefined;
  for (let index = 0; index < journal.receipts.length; index += 1) {
    const receipt = journal.receipts[index]!;
    const atTick = receiptTicks[index]!;
    const prefix = {
      ...journal,
      receipts: journal.receipts.slice(0, index + 1),
      proposedLastAppliedRevision: receipt.transition.state.revision,
    };
    const stateBefore =
      index === 0 ? previous : consumed?.kind === 'PREPARED' ? consumed.next : undefined;
    if (!stateBefore) return notReady('PHYSICAL_CONSEQUENCE_EVIDENCE_MISSING');
    const stateRoot = materialized(stateBefore);
    const sources =
      index === 0
        ? {
            physicalFacts: [] as readonly combat.PhysicalEvidence[],
            financeFacts: [] as readonly combat.FinanceEvidence[],
          }
        : combat.deriveCombatReceiptDomainEvidence(materialized(previous), journal, index, {
            worldId: input.worldId,
            companyId: input.companyId,
            canonicalRevision: previous.economy.lifecycle.revision,
            atTick: combat.campaignTick(atTick),
          });
    const context = ownerContext(previous, atTick, sources.physicalFacts, sources.financeFacts);
    const savedStarts = [
      ...(stateBefore.encounter.active?.practiceStartSnapshots ?? []),
      ...startSnapshotsForReceipt(stateBefore, journal, practiceProfile, index),
    ];
    let advance: CombatReceiptApplication['advance'];
    if (BigInt(atTick) > BigInt(stateBefore.economy.lifecycle.campaignTick)) {
      const commandId = combat.entityId(
        `encounter-advance-${input.encounterId}-${receipt.transition.state.revision}`,
      );
      const sourceEventId = travelAdvanceSourceEventId(input.worldId, input.companyId, commandId);
      const food = prepareEncounterFoodFacts(stateBefore, atTick, commandId);
      if (food.kind !== 'PREPARED') return notReady('PHYSICAL_CONSEQUENCE_EVIDENCE_MISSING');
      const command = combat.parseCompanyCommand({
        schemaVersion: combat.COMPANY_COMMAND_SCHEMA_VERSION,
        commandId,
        sourceEventId,
        worldId: input.worldId,
        companyId: input.companyId,
        actorRef: { kind: 'SYSTEM', id: 'world-travel' },
        expectedRevision: stateRoot.lifecycle.revision,
        campaignTick: atTick,
        rulesetId: combat.COMPANY_RULESET_ID,
        type: 'AdvanceCampaign',
        payload: { toTick: atTick, authoritativeInputs: [] },
      });
      if (!command.ok || command.command.type !== 'AdvanceCampaign')
        return notReady('RECEIPT_TIME_EVIDENCE_MISSING');
      const advanceContext = ownerContext(stateBefore, atTick, food.facts);
      advance = {
        command: command.command,
        context: {
          ...advanceContext,
          principal: command.command.actorRef,
          internalGrant: {
            commandId: command.command.commandId,
            sourceEventId: command.command.sourceEventId!,
            canonicalRequest: combat.canonicalJson(command.command),
          },
        },
        learning: { intervals: [] },
      };
    }
    let practiceCredits = [] as ReturnType<typeof combat.prepareCombatPracticeCredits>;
    if (index > 0) {
      try {
        practiceCredits = combat.prepareCombatPracticeCredits({
          root: materialized(previous),
          journal,
          receiptIndex: index,
          profile: practiceProfile,
          receiptTicks,
          savedStarts,
          context: ownerContext(previous, atTick),
        });
      } catch {
        return notReady('PRACTICE_CREDIT_EVIDENCE_MISSING');
      }
    }
    applications.push({
      time: {
        version: combat.COMBAT_RECEIPT_TIME_VERSION,
        id: `encounter-time-${input.encounterId}-${receipt.transition.state.revision}`,
        sourceEventId: receipt.request.sourceEventId!,
        battleId: input.encounterId,
        receiptId: receipt.request.payload.receiptId,
        revision: receipt.transition.state.revision,
        atTick: combat.campaignTick(atTick),
      },
      context,
      learning: { intervals: [] },
      ...(advance === undefined ? {} : { advance }),
      practiceCredits,
    });
    consumed = combat.prepareConsumeCombatAggregate(stateBefore, {
      journal: prefix,
      applications: applications.slice(),
      practiceProfile,
    });
    if (consumed.kind === 'REJECTED') return notReady('PHYSICAL_CONSEQUENCE_EVIDENCE_MISSING');
  }
  if (consumed?.kind !== 'PREPARED' || consumed.replayed)
    return notReady('PHYSICAL_CONSEQUENCE_EVIDENCE_MISSING');

  const activeLeaderId =
    previous.economy.lifecycle.company?.actingLeaderId ??
    previous.economy.lifecycle.company?.currentLeaderId;
  const leaderUnit = active.binding.participants.find(
    (entry) =>
      entry.companyId === input.companyId && entry.projection.characterId === activeLeaderId,
  );
  const leaderDied =
    leaderUnit !== undefined &&
    kernelState.units.find((unit) => unit.id === leaderUnit.unitId)?.health === 0;

  const terminalSourceEventId = `encounter:${input.encounterId}:terminal`;
  const dispositions = active.binding.participants
    .filter((entry) => entry.companyId === input.companyId)
    .map((participant) => {
      const unit = kernelState.units.find((entry) => entry.id === participant.unitId);
      if (!unit) throw new TypeError('Bound company combat unit is missing from terminal state');
      const deathEvents = journal.receipts.flatMap((entry) =>
        entry.transition.events.flatMap((event, ordinal) =>
          event.type === 'unit.died' && event.unitId === participant.unitId
            ? [entry.sourceEventIds[ordinal]!]
            : [],
        ),
      );
      if ((unit.health === 0) !== (deathEvents.length === 1))
        throw new TypeError('Terminal health is not supported by one durable death event');
      return {
        id: `encounter-disposition-${input.encounterId}-${participant.unitId}`,
        sourceEventId: terminalSourceEventId,
        unitId: participant.unitId,
        characterId: participant.projection.characterId,
        status: unit.health === 0 ? ('DEAD' as const) : ('PRESENT' as const),
        location: active.binding.location,
      };
    });
  const finalStateCanonical = combat.canonicalCombatState(kernelState);
  const atTick = applications.at(-1)!.time.atTick;
  const stateDigest = sha256(finalStateCanonical);
  const finalStateDigest = sha256(
    combat.canonicalJson({
      bindingId: active.binding.bindingId,
      battleId: input.encounterId,
      revision: input.terminalRevision,
      stateDigest,
    }),
  );
  const outcomeDigest = sha256(
    combat.canonicalJson({
      sourceEventId: terminalSourceEventId,
      bindingId: active.binding.bindingId,
      revision: input.terminalRevision,
      atTick,
      dispositions,
    }),
  );
  const finalizeCommandId = combat.entityId(`encounter-finalize-${input.encounterId}`);
  const finalizeValue = {
    schemaVersion: combat.COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: finalizeCommandId,
    sourceEventId: terminalSourceEventId,
    worldId: input.worldId,
    companyId: input.companyId,
    actorRef: { kind: 'COMBAT_RECEIPT' as const, id: terminalSourceEventId },
    expectedRevision: consumed.next.economy.lifecycle.revision,
    campaignTick: atTick,
    rulesetId: combat.COMPANY_RULESET_ID,
    type: 'FinalizeEncounter' as const,
    payload: {
      bindingId: active.binding.bindingId,
      terminalReceiptId: journal.receipts.at(-1)!.request.payload.receiptId,
      finalStateDigest,
      outcomeReceiptId: outcomeDigest,
    },
  };
  const finalizeParsed = combat.parseCompanyCommand(finalizeValue);
  if (!finalizeParsed.ok || finalizeParsed.command.type !== 'FinalizeEncounter')
    return notReady('TERMINAL_DISPOSITION_EVIDENCE_MISSING');
  const finalizeContextBase = ownerContext(consumed.next, atTick);
  const finalizeContext: CombatOwnerContext = {
    ...finalizeContextBase,
    principal: finalizeParsed.command.actorRef,
    internalGrant: {
      commandId: finalizeParsed.command.commandId,
      sourceEventId: finalizeParsed.command.sourceEventId!,
      canonicalRequest: combat.canonicalJson(finalizeParsed.command),
    },
    facts: [],
    physicalFacts: [],
    financeFacts: [],
    learningFacts: [],
    practiceFacts: [],
  };
  const terminal = {
    version: 's02-combat-terminal-outcome-1' as const,
    id: finalStateDigest,
    sourceEventId: terminalSourceEventId,
    bindingId: active.binding.bindingId,
    battleId: input.encounterId,
    receiptId: journal.receipts.at(-1)!.request.payload.receiptId,
    revision: input.terminalRevision,
    atTick,
    finalStateCanonical,
    outcomeDigest,
    dispositions,
  };
  const baseFinalize: combat.FinalizeCombatAggregateInput = {
    command: finalizeParsed.command,
    journal,
    applications,
    terminal,
    context: finalizeContext,
  };
  let finalize = baseFinalize;
  let finalized = leaderDied
    ? undefined
    : combat.prepareFinalizeCombatAggregate(consumed.next, baseFinalize);
  if (leaderDied) {
    // The leader's own death fact is the crisis source. With nobody able to continue the
    // system ends the company; otherwise the owner's recorded successor choice decides.
    const leaderDeath = applications
      .flatMap((application) => application.context.physicalFacts ?? [])
      .find((fact) => fact.kind === 'DEATH_OUTCOME' && fact.characterId === activeLeaderId);
    if (leaderDeath === undefined || activeLeaderId === undefined || activeLeaderId === null)
      return notReady('LEADERSHIP_SUCCESSION_EVIDENCE_MISSING');
    const lifecycle = consumed.next.economy.lifecycle;
    const crisis: combat.CrisisEvidence = {
      kind: 'CRISIS',
      id: `encounter-leader-crisis-${input.encounterId}`,
      companyId: input.companyId,
      worldId: input.worldId,
      revision: lifecycle.revision,
      sourceEventId: leaderDeath.sourceEventId,
      atTick,
      leaderId: activeLeaderId,
      reason: 'LEADER_DIED',
    };
    const resolve = (
      actorRef:
        | { readonly kind: 'SYSTEM'; readonly id: string }
        | { readonly kind: 'PLAYER'; readonly id: string },
      commandId: string,
      payload: { readonly candidateId?: string; readonly mode: 'PERMANENT' | 'ACTING' | 'REGENCY' },
    ): combat.FinalizeCombatAggregateInput | undefined => {
      const parsed = combat.parseCompanyCommand({
        schemaVersion: combat.COMPANY_COMMAND_SCHEMA_VERSION,
        commandId,
        sourceEventId: leaderDeath.sourceEventId,
        worldId: input.worldId,
        companyId: input.companyId,
        actorRef,
        // A player command is fresh against the public revision, a system one against canonical.
        expectedRevision:
          actorRef.kind === 'PLAYER' ? lifecycle.knowledge.revision : lifecycle.revision,
        campaignTick: atTick,
        rulesetId: combat.COMPANY_RULESET_ID,
        type: 'ResolveLeadership' as const,
        payload: { companyId: input.companyId, crisisId: crisis.id, ...payload },
      });
      if (!parsed.ok || parsed.command.type !== 'ResolveLeadership') return undefined;
      const base = { ...ownerContext(consumed.next, atTick), facts: [crisis] };
      const context: CombatOwnerContext =
        actorRef.kind === 'PLAYER'
          ? {
              ...base,
              principal: actorRef,
              contactIds: payload.candidateId === undefined ? [] : [payload.candidateId],
            }
          : {
              ...base,
              internalGrant: {
                commandId: parsed.command.commandId,
                sourceEventId: parsed.command.sourceEventId!,
                canonicalRequest: combat.canonicalJson(parsed.command),
              },
            };
      return { ...baseFinalize, leadership: { command: parsed.command, context } };
    };
    const systemEnd = resolve(
      { kind: 'SYSTEM', id: 'encounter-runtime' },
      combat.entityId(`encounter-leadership-${input.encounterId}`),
      { mode: 'ACTING' },
    );
    if (systemEnd === undefined) return notReady('LEADERSHIP_SUCCESSION_EVIDENCE_MISSING');
    finalize = systemEnd;
    finalized = combat.prepareFinalizeCombatAggregate(consumed.next, systemEnd);
    if (finalized.kind === 'REJECTED' && finalized.error === 'CANDIDATE_REQUIRED') {
      const choice = input.leadershipChoice;
      if (choice === undefined) return notReady('LEADERSHIP_CHOICE_REQUIRED');
      const chosen = resolve({ kind: 'PLAYER', id: choice.accountId }, choice.commandId, {
        candidateId: choice.candidateId,
        mode: choice.mode,
      });
      if (chosen === undefined) return notReady('LEADERSHIP_CHOICE_REQUIRED');
      finalize = chosen;
      finalized = combat.prepareFinalizeCombatAggregate(consumed.next, chosen);
      if (finalized.kind === 'REJECTED') return notReady('LEADERSHIP_CHOICE_REJECTED');
    }
  }
  if (finalized === undefined || finalized.kind !== 'PREPARED' || finalized.replayed)
    return notReady('TERMINAL_DISPOSITION_EVIDENCE_MISSING');
  const profileEvidence = {
    version: practiceProfile.version,
    profileId: practiceProfile.profileId,
    challengeLevel: practiceProfile.challengeLevel,
    digest: profileDigest,
  };
  return {
    status: 'READY',
    consume: { journal, applications, practiceProfile },
    finalize,
    bindingId: active.binding.bindingId,
    terminalRevision: input.terminalRevision,
    finalState: finalized.next,
    finalStateDigest,
    outcomeDigest,
    practiceProfile: profileEvidence,
    contractProfileId: input.contractProfileId,
    contractTermsDigest: input.contractTermsDigest,
  };
}
