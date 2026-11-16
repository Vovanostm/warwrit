import { randomUUID } from 'node:crypto';
import {
  PHYSICAL_POLICY_VERSION,
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  campaignTick,
  canonicalJson,
  companySourceKey,
  observationQualificationRequirements,
  parseCompanyCommand,
  prepareCompanyEconomy,
  prepareCompanyLifecycle,
  skillLevels,
  readCompanyCombatAggregateState,
} from '@warwrit/game-core';
import type {
  BattleState,
  CompanyCommand,
  CompanyCombatAggregateState,
  EconomyContext,
  LifecycleEvent,
} from '@warwrit/game-core';
import type { Transaction } from 'kysely';
import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock } from '../world/clock.js';
import { updateCompanyAggregateWithReceipt } from './repository.js';
import { prepareStationaryFoodFacts } from './travel-food.js';
import { proposeResilientNicknames } from './nicknames.js';

interface PreparedTerminalNicknameObservation {
  readonly previous: CompanyCombatAggregateState;
  readonly next: CompanyCombatAggregateState;
  readonly command: CompanyCommand;
  readonly events: readonly LifecycleEvent[];
}

/** Persist terminal deed proposals, then disclose only sources witnessed by a living bound company participant. */
export async function applyTerminalResilientNicknameEffects(input: {
  readonly transaction: Transaction<DatabaseSchema>;
  readonly before: CompanyCombatAggregateState;
  readonly after: CompanyCombatAggregateState;
  readonly finalState: BattleState;
  readonly atTick: string;
  readonly witnessCharacterIds: readonly string[];
}): Promise<CompanyCombatAggregateState> {
  const proposed = proposeResilientNicknames(input);
  for (const transition of proposed.transitions) {
    await persistInternalLifecycleTransition(input.transaction, {
      previous: transition.previous,
      next: transition.next,
      command: transition.command,
      events: transition.events,
    });
  }

  const witnesses = new Set(input.witnessCharacterIds);
  let next = proposed.state;
  for (const sourceEventId of proposed.sourceEventIds) {
    const proposal = next.economy.lifecycle.nicknameProposals?.find(
      (entry) => entry.sourceEventId === sourceEventId,
    );
    if (!proposal || !witnesses.has(proposal.characterId)) continue;
    const observed = prepareTerminalNicknameObservation(
      next,
      proposal.characterId,
      sourceEventId,
      [...witnesses],
      input.atTick,
    );
    if (!observed) throw new Error('Verified nickname deed could not be observed by its witness');
    await persistInternalLifecycleTransition(input.transaction, observed);
    next = observed.next;
  }
  return next;
}

export function prepareTerminalNicknameObservation(
  state: CompanyCombatAggregateState,
  characterId: string,
  deedSourceEventId: string,
  witnessCharacterIds: readonly string[],
  tick: string,
): PreparedTerminalNicknameObservation | undefined {
  const lifecycle = state.economy.lifecycle;
  const deed = lifecycle.nicknameProposals?.find(
    (proposal) =>
      proposal.sourceEventId === deedSourceEventId &&
      proposal.characterId === characterId &&
      proposal.resolution === 'PENDING',
  );
  if (!deed || !witnessCharacterIds.includes(characterId)) return undefined;
  const commandId = randomUUID();
  const principal = { kind: 'DOMAIN_RECEIPT' as const, id: 'terminal-nickname-observation' };
  const subjectRef = { kind: 'CHARACTER' as const, id: characterId };
  const observerRef = { kind: 'COMPANY' as const, id: lifecycle.companyId };
  const commandValue = {
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    rulesetId: COMPANY_RULESET_ID,
    commandId,
    sourceEventId: commandId,
    type: 'Observe',
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    campaignTick: tick,
    expectedRevision: lifecycle.revision,
    actorRef: principal,
    payload: {
      observationId: commandId,
      factId: commandId,
      sourceId: commandId,
      subjectRef,
      observerRef,
    },
  };
  const parsed = parseCompanyCommand(commandValue);
  if (!parsed.ok || parsed.command.type !== 'Observe')
    throw new Error('Invalid terminal nickname observation command');
  const scope = {
    id: commandId,
    sourceEventId: commandId,
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    revision: lifecycle.revision,
    atTick: campaignTick(tick),
  };
  const context: EconomyContext = {
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    principal,
    publicRevision: lifecycle.knowledge.revision,
    canonicalRevision: lifecycle.revision,
    atTick: scope.atTick,
    completeGraph: true,
    contactIds: witnessCharacterIds,
    facts: [
      {
        ...scope,
        kind: 'COMPANY_OBSERVATION',
        subject: subjectRef,
        nicknameSourceEventIds: [deedSourceEventId],
      },
    ],
    financeFacts: [],
    physicalFacts: [],
    internalGrant: {
      commandId,
      sourceEventId: commandId,
      canonicalRequest: canonicalJson(parsed.command),
    },
  };
  const prepared = prepareCompanyLifecycle(lifecycle, parsed.command, context);
  if (prepared.kind !== 'PREPARED') return undefined;
  const next = readCompanyCombatAggregateState({
    ...state,
    economy: { ...state.economy, lifecycle: prepared.next },
  });
  return {
    previous: state,
    next,
    command: parsed.command,
    events: prepared.receipt.events,
  };
}

async function persistInternalLifecycleTransition(
  transaction: Transaction<DatabaseSchema>,
  input: PreparedTerminalNicknameObservation,
) {
  const lifecycle = input.next.economy.lifecycle;
  await updateCompanyAggregateWithReceipt(
    transaction,
    input.previous.economy.lifecycle.revision,
    lifecycle.revision,
    input.next,
    {
      command: input.command,
      receipt: {
        receiptId: randomUUID(),
        commandId: input.command.commandId,
        sourceKey: companySourceKey(input.command),
        requestKey: canonicalJson(input.command),
        response: {
          commandId: input.command.commandId,
          ok: true,
          publicRevision: lifecycle.knowledge.revision,
        },
        resultingRevision: lifecycle.revision,
      },
      auditEvents: input.events.map((event) => ({
        eventId: event.id,
        revision: lifecycle.revision,
        event,
      })),
    },
  );
}

function characterChanged(state: CompanyCombatAggregateState, characterId: string): boolean {
  const { lifecycle, physical } = state.economy;
  if (!physical) return false;
  const character = lifecycle.characters.find(
    (entry) => entry.identity.characterId === characterId,
  );
  const known = lifecycle.knowledge.characters.find(
    (entry) => entry.identity.characterId === characterId,
  );
  return (
    canonicalJson(physical.conditions.filter((entry) => entry.characterId === characterId)) !==
      canonicalJson(
        physical.knowledge.conditionSnapshots.filter((entry) => entry.characterId === characterId),
      ) ||
    canonicalJson(physical.vitals.filter((entry) => entry.characterId === characterId)) !==
      canonicalJson(
        physical.knowledge.vitalSnapshots.filter((entry) => entry.characterId === characterId),
      ) ||
    Boolean(
      character &&
      known &&
      (canonicalJson(skillLevels(character.skills)) !== canonicalJson(skillLevels(known.skills)) ||
        canonicalJson(character.perks) !== canonicalJson(known.perks)),
    )
  );
}

function payrollObservationDue(
  state: CompanyCombatAggregateState,
  characterId: string,
  tick: string,
): boolean {
  const { lifecycle, finance } = state.economy;
  return finance.accounts.some(
    (account) =>
      account.schedule !== null &&
      !account.knownDeath &&
      BigInt(account.confirmedAt) < BigInt(tick) &&
      lifecycle.memberships.some(
        (member) =>
          member.membershipId === account.membershipId && member.characterId === characterId,
      ),
  );
}

function deathObservationDue(state: CompanyCombatAggregateState, characterId: string): boolean {
  const { lifecycle, finance } = state.economy;
  const person = lifecycle.characters.find((entry) => entry.identity.characterId === characterId);
  if (person?.presence.availability !== 'DEAD') return false;
  const known = lifecycle.knowledge.characters.find(
    (entry) => entry.identity.characterId === characterId,
  );
  if (known?.presence.availability !== 'DEAD') return true;
  const membershipIds = new Set<string>(
    lifecycle.memberships
      .filter(
        (entry) => entry.companyId === lifecycle.companyId && entry.characterId === characterId,
      )
      .map((entry) => entry.membershipId),
  );
  return finance.accounts.some(
    (account) => membershipIds.has(account.membershipId) && (!account.known || !account.knownDeath),
  );
}

function locallyObservableDeadMembers(
  state: CompanyCombatAggregateState,
  place: { readonly kind: 'AT'; readonly siteId: string; readonly areaId: string },
): readonly string[] {
  const { lifecycle, finance, physical } = state.economy;
  if (!physical) return [];
  const companyMemberships = lifecycle.memberships.filter(
    (entry) => entry.companyId === lifecycle.companyId,
  );
  const atPlace = (location: {
    readonly kind: string;
    readonly siteId?: string;
    readonly areaId?: string;
  }) =>
    location.kind === 'AT' && location.siteId === place.siteId && location.areaId === place.areaId;
  const corpseIsHere = physical.containers.some(
    (container) =>
      container.kind === 'CORPSE' &&
      container.custodian.kind === 'WORLD' &&
      container.custodian.id === lifecycle.worldId &&
      atPlace(container.location),
  );
  if (!corpseIsHere) return [];

  return lifecycle.characters
    .filter((person) => {
      const characterId = person.identity.characterId;
      if (person.presence.availability !== 'DEAD' || !atPlace(person.presence.location))
        return false;
      const memberships = companyMemberships.filter((entry) => entry.characterId === characterId);
      if (memberships.length === 0) return false;
      return finance.accounts.some((account) => {
        const death = account.death;
        if (
          !memberships.some((membership) => membership.membershipId === account.membershipId) ||
          !death
        )
          return false;
        return (
          finance.sourceEffects.some(
            (effect) =>
              effect.key === canonicalJson(['FINANCIAL_DEATH', death.sourceId, characterId]),
          ) &&
          physical.sourceEffects.some(
            (effect) =>
              effect.key ===
              canonicalJson(['DEATH_OUTCOME', death.sourceId, ['character', characterId]]),
          )
        );
      });
    })
    .map((person) => person.identity.characterId)
    .sort();
}

function prepareObservationDraft(
  state: CompanyCombatAggregateState,
  characterId: string,
  contactIds: readonly string[],
  tick: string,
) {
  const root = state.economy;
  const { lifecycle } = root;
  const id = randomUUID();
  const food = prepareStationaryFoodFacts(state, tick, id);
  if (food.kind !== 'PREPARED') return undefined;
  const principal = { kind: 'DOMAIN_RECEIPT' as const, id: 'local-company-observation' };
  const subjectRef = { kind: 'CHARACTER' as const, id: characterId };
  const parsed = parseCompanyCommand({
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    rulesetId: COMPANY_RULESET_ID,
    commandId: id,
    sourceEventId: id,
    type: 'Observe',
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    campaignTick: tick,
    expectedRevision: root.lifecycle.revision,
    actorRef: principal,
    payload: {
      observationId: id,
      factId: id,
      sourceId: id,
      subjectRef,
      observerRef: { kind: 'COMPANY', id: lifecycle.companyId },
    },
  });
  if (!parsed.ok || parsed.command.type !== 'Observe') throw new Error('Invalid local observation');
  const scope = {
    id,
    sourceEventId: id,
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    revision: root.lifecycle.revision,
    atTick: campaignTick(tick),
  };
  const context: EconomyContext = {
    worldId: lifecycle.worldId,
    companyId: lifecycle.companyId,
    principal,
    atTick: scope.atTick,
    canonicalRevision: root.lifecycle.revision,
    publicRevision: root.lifecycle.knowledge.revision,
    completeGraph: true,
    contactIds,
    facts: [{ ...scope, kind: 'COMPANY_OBSERVATION', subject: subjectRef }],
    financeFacts: [],
    physicalFacts: [
      ...food.facts,
      {
        ...scope,
        kind: 'PHYSICAL_OBSERVATION',
        version: PHYSICAL_POLICY_VERSION,
        ordinal: 0,
        observerCompanyId: lifecycle.companyId,
        subject: subjectRef,
        itemIds: [],
        containerIds: [],
      },
    ],
    internalGrant: {
      commandId: id,
      sourceEventId: id,
      canonicalRequest: canonicalJson(parsed.command),
    },
  };
  const observed = prepareCompanyLifecycle(root.lifecycle, parsed.command, context);
  if (observed.kind !== 'PREPARED') return undefined;
  const qualification = observationQualificationRequirements(
    root.finance,
    root.lifecycle,
    observed.next,
    characterId,
  );
  const prepared = prepareCompanyEconomy(root, parsed.command, {
    ...context,
    financeFacts: qualification.map((notice) => ({
      ...scope,
      ...notice,
      id: randomUUID(),
      kind: 'QUALIFICATION_NOTICE' as const,
      noticeVersion: id,
    })),
  });
  if (prepared.kind !== 'PREPARED' || prepared.replayed || prepared.receipt.requirements.length > 0)
    return undefined;
  const previousRevision = root.lifecycle.revision;
  const next = { ...state, economy: prepared.next };
  return { previousRevision, next, command: parsed.command, receipt: prepared.receipt };
}

/** Persist the company's lawful in-person readback of one newly hired local person. */
export async function observeLocalRecruit(
  transaction: Transaction<DatabaseSchema>,
  state: CompanyCombatAggregateState,
  characterId: string,
  tick: string,
): Promise<CompanyCombatAggregateState | undefined> {
  const { lifecycle } = state.economy;
  const candidate = lifecycle.characters.find(
    (entry) => entry.identity.characterId === characterId,
  );
  const party = lifecycle.parties.length === 1 ? lifecycle.parties[0] : undefined;
  const candidateId = candidate?.identity.characterId;
  const candidateLocation = candidate?.presence.location;
  const partyLocation = party?.location;
  const membership = lifecycle.memberships.find(
    (entry) =>
      entry.characterId === candidateId &&
      entry.companyId === lifecycle.companyId &&
      entry.endedAt === null,
  );
  if (
    !candidate ||
    !membership ||
    !party ||
    party.location.kind !== 'AT' ||
    candidateLocation?.kind !== 'AT' ||
    partyLocation?.kind !== 'AT' ||
    candidateLocation.siteId !== partyLocation.siteId ||
    candidateLocation.areaId !== partyLocation.areaId
  )
    return undefined;
  const contactIds = lifecycle.characters
    .filter(
      (person) =>
        lifecycle.memberships.some(
          (entry) =>
            entry.characterId === person.identity.characterId &&
            entry.companyId === lifecycle.companyId &&
            entry.endedAt === null,
        ) &&
        person.presence.availability === 'AVAILABLE' &&
        person.presence.location.kind === 'AT' &&
        person.presence.location.siteId === partyLocation.siteId &&
        person.presence.location.areaId === partyLocation.areaId,
    )
    .map((person) => person.identity.characterId);
  if (!candidateId || !contactIds.includes(candidateId)) return undefined;
  const draft = prepareObservationDraft(state, candidateId, contactIds, tick);
  if (!draft) return undefined;
  const revision = draft.next.economy.lifecycle.revision;
  await updateCompanyAggregateWithReceipt(
    transaction,
    draft.previousRevision,
    revision,
    draft.next,
    {
      command: draft.command,
      receipt: {
        receiptId: randomUUID(),
        commandId: draft.command.commandId,
        sourceKey: companySourceKey(draft.command),
        requestKey: canonicalJson(draft.command),
        response: { ok: true, publicRevision: draft.next.economy.lifecycle.knowledge.revision },
        resultingRevision: revision,
      },
      auditEvents: draft.receipt.events.map((event) => ({ eventId: event.id, revision, event })),
    },
  );
  return draft.next;
}

/** Called only after ownership validation and the account/company locks, before private projection. */
export async function observeLocalCompanyConditions(
  transaction: Transaction<DatabaseSchema>,
  state: CompanyCombatAggregateState,
  now: Date,
): Promise<CompanyCombatAggregateState> {
  const { lifecycle, physical } = state.economy;
  const party = lifecycle.parties.length === 1 ? lifecycle.parties[0] : undefined;
  if (!physical || state.encounter.active || party?.location.kind !== 'AT') return state;
  const place = party.location;
  const members = new Set<string>(
    lifecycle.memberships
      .filter((member) => member.companyId === lifecycle.companyId && member.endedAt === null)
      .map((member) => member.characterId),
  );
  const local = lifecycle.characters.filter(
    ({ identity, presence }) =>
      members.has(identity.characterId) &&
      presence.fieldPartyId === party.partyId &&
      presence.availability === 'AVAILABLE' &&
      presence.encounterBindingId === null &&
      presence.location.kind === 'AT' &&
      presence.location.siteId === place.siteId &&
      presence.location.areaId === place.areaId,
  );
  const deadAtPlace = locallyObservableDeadMembers(state, place);
  const observationSubjects = [
    ...local.map((person) => person.identity.characterId),
    ...deadAtPlace,
  ];
  const changed = local.some(({ identity }) => characterChanged(state, identity.characterId));
  const recovering = local.find(({ presence }) => presence.assignment === 'RECOVERY');
  if (observationSubjects.length === 0) return state;
  const clock = await readWorldClock(transaction, lifecycle.worldId, now, true);
  if (
    BigInt(clock.tick) < BigInt(lifecycle.campaignTick) ||
    (BigInt(clock.tick) > BigInt(lifecycle.campaignTick) &&
      state.learning.tasks.tasks.some((task) => !task.stop && !task.terminal))
  )
    return state;
  const recoveryDue = recovering && BigInt(clock.tick) > BigInt(physical.processedTick);
  const payrollDue = local.some(({ identity }) =>
    payrollObservationDue(state, identity.characterId, clock.tick),
  );
  const deathDue = deadAtPlace.some((characterId) => deathObservationDue(state, characterId));
  if (!changed && !recoveryDue && !payrollDue && !deathDue) return state;

  const prepared = prepareLocalCharacterObservations(
    state,
    local.map((person) => person.identity.characterId),
    clock.tick,
    recoveryDue ? recovering.identity.characterId : undefined,
    observationSubjects,
  );
  if (!prepared) return state;
  for (const write of prepared.writes) {
    const revision = write.next.economy.lifecycle.revision;
    await updateCompanyAggregateWithReceipt(
      transaction,
      write.previousRevision,
      revision,
      write.next,
      {
        command: write.command,
        receipt: {
          receiptId: randomUUID(),
          commandId: write.command.commandId,
          sourceKey: companySourceKey(write.command),
          requestKey: canonicalJson(write.command),
          response: { ok: true, publicRevision: write.next.economy.lifecycle.knowledge.revision },
          resultingRevision: revision,
        },
        auditEvents: write.receipt.events.map((event) => ({ eventId: event.id, revision, event })),
      },
    );
  }
  return prepared.next;
}

function prepareLocalCharacterObservations(
  state: CompanyCombatAggregateState,
  contactIds: readonly string[],
  tick: string,
  recoverySubjectId: string | undefined,
  observationSubjects: readonly string[] = contactIds,
) {
  // Prepare every observation before writing any, so an unavailable prerequisite
  // preserves all prior knowledge. Food and recovery use the actual current tick.
  let next = state;
  const writes = [];
  for (let observedCount = 0; observedCount < observationSubjects.length; observedCount += 1) {
    // The first observation settles elapsed time for everyone. Each local payee
    // still needs their own observation to disclose newly earned wages. Recheck
    // changed characters too, preserving the same read's recovery and skill updates.
    const subject =
      observationSubjects.find(
        (characterId) =>
          characterChanged(next, characterId) ||
          payrollObservationDue(next, characterId, tick) ||
          deathObservationDue(next, characterId),
      ) ?? (observedCount === 0 ? recoverySubjectId : undefined);
    if (!subject) break;
    const draft = prepareObservationDraft(next, subject, contactIds, tick);
    if (!draft) return undefined;
    next = draft.next;
    writes.push(draft);
  }
  return { next, writes };
}
