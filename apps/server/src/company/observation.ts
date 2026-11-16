import { randomUUID } from 'node:crypto';
import {
  COMPANY_COMMAND_SCHEMA_VERSION,
  COMPANY_RULESET_ID,
  PHYSICAL_POLICY_VERSION,
  campaignTick,
  canonicalJson,
  companySourceKey,
  observationQualificationRequirements,
  parseCompanyCommand,
  prepareCompanyEconomy,
  prepareCompanyLifecycle,
} from '@warwrit/game-core';
import type {
  CompanyCombatAggregateState,
  CompanyPhysicalState,
  EconomyContext,
} from '@warwrit/game-core';
import type { Transaction } from 'kysely';
import type { DatabaseSchema } from '../db/database.js';
import { readWorldClock } from '../world/clock.js';
import { updateCompanyAggregateWithReceipt } from './repository.js';
import { prepareStationaryFoodFacts } from './travel-food.js';

function bodyChanged(physical: CompanyPhysicalState, characterId: string): boolean {
  return (
    canonicalJson(physical.conditions.filter((entry) => entry.characterId === characterId)) !==
      canonicalJson(
        physical.knowledge.conditionSnapshots.filter((entry) => entry.characterId === characterId),
      ) ||
    canonicalJson(physical.vitals.filter((entry) => entry.characterId === characterId)) !==
      canonicalJson(
        physical.knowledge.vitalSnapshots.filter((entry) => entry.characterId === characterId),
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
  const changed = local.some(({ identity }) => bodyChanged(physical, identity.characterId));
  const recovering = local.find(({ presence }) => presence.assignment === 'RECOVERY');
  if (local.length === 0) return state;
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
  if (!changed && !recoveryDue && !payrollDue) return state;

  const prepared = prepareLocalBodyObservations(
    state,
    local.map((person) => person.identity.characterId),
    clock.tick,
    recoveryDue ? recovering.identity.characterId : undefined,
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

function prepareLocalBodyObservations(
  state: CompanyCombatAggregateState,
  contactIds: readonly string[],
  tick: string,
  recoverySubjectId: string | undefined,
) {
  // Prepare every observation before writing any, so an unavailable prerequisite
  // preserves all prior knowledge. Food and recovery use the actual current tick.
  let next = state;
  const writes = [];
  for (let observedCount = 0; observedCount < contactIds.length; observedCount += 1) {
    // The first observation settles elapsed time for everyone. Each local payee
    // still needs their own observation to disclose newly earned wages. Recheck
    // changed bodies too, preserving the same read's recovery and wound updates.
    const subject =
      contactIds.find(
        (characterId) =>
          bodyChanged(next.economy.physical!, characterId) ||
          payrollObservationDue(next, characterId, tick),
      ) ?? (observedCount === 0 ? recoverySubjectId : undefined);
    if (!subject) break;
    const draft = prepareObservationDraft(next, subject, contactIds, tick);
    if (!draft) return undefined;
    next = draft.next;
    writes.push(draft);
  }
  return { next, writes };
}
