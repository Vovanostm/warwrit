import { guardCompanyCommand, checkFreshCompanyRevision, companySourceKey } from './guards.js';
import { canonicalJson, snapshotJson } from './input.js';
import { preparePerkSelection } from './perk-selection.js';
import { skillLevels } from './skill-progress.js';
import { canonicalRevision, publicRevision, isEntityId, isExactInteger } from './values.js';
import { prepareOpening } from './opening.js';
import { prepareNicknameCommand } from './nickname.js';
import {
  prepareArrival,
  prepareAssignment,
  prepareJoin,
  prepareRecruit,
  prepareReturn,
} from './membership.js';
import {
  isDesignationCandidate,
  prepareDesignation,
  prepareHeirNotification,
  prepareSuccession,
} from './succession.js';
import {
  commandCapacity,
  effectiveLeaderId,
  evidence,
  event,
  lifecycleId,
  LifecycleViolation,
  person,
  requireLifecycle,
  validateLifecycleGraph,
} from './lifecycle-state.js';
import type { LifecycleError } from './lifecycle-types.js';
import type { CompanyCommand } from './commands.js';
import type {
  LifecycleChange,
  LifecycleCharacter,
  LifecycleContext,
  LifecycleReceipt,
  LifecycleResult,
  LifecycleState,
  CommandOf,
  CompanyObservationEvidence,
} from './lifecycle-types.js';

function observeCompany(
  state: LifecycleState,
  command: CommandOf<'Observe'>,
  context: LifecycleContext,
): LifecycleChange {
  const p = command.payload;
  const fact = evidence(context, p.observationId, 'COMPANY_OBSERVATION');
  requireLifecycle(
    fact.sourceEventId === command.sourceEventId &&
      p.sourceId === fact.sourceEventId &&
      p.observerRef.kind === 'COMPANY' &&
      p.observerRef.id === state.companyId &&
      p.subjectRef.kind === fact.subject.kind &&
      p.subjectRef.id === fact.subject.id &&
      p.factId === fact.id,
    'INVALID_SOURCE',
  );
  const nicknameSources = fact.nicknameSourceEventIds ?? [];
  requireLifecycle(
    new Set(nicknameSources).size === nicknameSources.length && nicknameSources.every(isEntityId),
    'INVALID_SOURCE',
  );
  let knowledge = state.knowledge;
  if (fact.subject.kind === 'CHARACTER') {
    const character = person(state, fact.subject.id);
    const priorSnapshot = knowledge.characters.find(
      (known) => known.identity.characterId === fact.subject.id,
    );
    const nicknameSourceSet = new Set(nicknameSources);
    const activeNickname = (state.nicknameProposals ?? []).find(
      (proposal) => proposal.proposalId === character.nickname?.proposalId,
    );
    const observedNicknameHistory = (state.nicknameProposals ?? [])
      .filter(
        (proposal) =>
          proposal.characterId === fact.subject.id &&
          nicknameSourceSet.has(proposal.sourceEventId) &&
          proposal.resolution === 'ACCEPTED',
      )
      .map((proposal) => ({
        proposalId: proposal.proposalId,
        characterId: proposal.characterId,
        sourceEventId: proposal.sourceEventId,
        cultureId: proposal.cultureId,
        deedKind: proposal.deedKind,
        reasonKey: proposal.reasonKey,
        textKey: proposal.textKey,
        acceptedAt: proposal.resolvedAt!,
      }));
    const observedNickname =
      activeNickname && nicknameSourceSet.has(activeNickname.sourceEventId)
        ? character.nickname
        : priorSnapshot?.nickname;
    const { nickname: _privateNickname, ...characterFields } = character;
    const snapshot = snapshotJson({
      ...characterFields,
      ...(observedNickname ? { nickname: observedNickname } : {}),
      skills: skillLevels(character.skills),
    }) as unknown as LifecycleCharacter;
    requireLifecycle(snapshot, 'INVALID_STATE');
    knowledge = {
      ...knowledge,
      candidateIds: [
        ...knowledge.candidateIds.filter((id) => id !== character.identity.characterId),
        ...(isDesignationCandidate(state, character, context.atTick)
          ? [character.identity.characterId]
          : []),
      ].sort(),
      characters: [
        ...knowledge.characters.filter((p) => p.identity.characterId !== fact.subject.id),
        snapshot,
      ],
      nicknameProposals: [
        ...(knowledge.nicknameProposals ?? []).filter(
          (proposal) =>
            proposal.characterId !== fact.subject.id ||
            !nicknameSourceSet.has(proposal.sourceEventId),
        ),
        ...(state.nicknameProposals ?? [])
          .filter(
            (proposal) =>
              proposal.characterId === fact.subject.id &&
              nicknameSourceSet.has(proposal.sourceEventId) &&
              proposal.resolution === 'PENDING',
          )
          .map(({ resolution: _resolution, resolvedAt: _resolvedAt, ...proposal }) => proposal),
      ],
      nicknameHistory: [
        ...(knowledge.nicknameHistory ?? []).filter(
          (nickname) =>
            !observedNicknameHistory.some(
              (observed) => observed.proposalId === nickname.proposalId,
            ),
        ),
        ...observedNicknameHistory,
      ],
    };
  } else {
    requireLifecycle(fact.subject.id === state.companyId && state.company, 'INVALID_SOURCE');
    knowledge = {
      ...knowledge,
      leaderId: effectiveLeaderId(state),
      designatedHeirId: state.company.designatedHeirId,
      runStatus: state.company.runStatus,
    };
  }
  const observed = event(command.commandId, 'CompanyObserved', context.atTick, [fact.subject.id]);
  requireLifecycle(!knowledge.eventIds.includes(observed.id), 'IDEMPOTENCY_CONFLICT');
  return {
    next: {
      ...state,
      knowledge: {
        ...knowledge,
        revision: publicRevision((BigInt(knowledge.revision) + 1n).toString()),
        eventIds: [...knowledge.eventIds, observed.id],
      },
    },
    events: [observed],
    requirements: [],
  };
}

/** Apply one bounded owner observation boundary for the members of a moved field party. */
export function observePartyMovement(
  state: LifecycleState,
  input: {
    readonly partyId: string;
    readonly characterIds: readonly string[];
    readonly sourceEventId: string;
    readonly atTick: LifecycleContext['atTick'];
  },
): {
  readonly state: LifecycleState;
  readonly events: readonly (LifecycleChange['events'][number] & {
    readonly sourceEventId: string;
  })[];
} {
  requireLifecycle(
    input.characterIds.length > 0 && new Set(input.characterIds).size === input.characterIds.length,
    'INVALID_SOURCE',
  );
  let next = state;
  const events: (LifecycleChange['events'][number] & { readonly sourceEventId: string })[] = [];
  for (const [ordinal, characterId] of input.characterIds.entries()) {
    const character = person(next, characterId);
    requireLifecycle(character.presence.fieldPartyId === input.partyId, 'INVALID_SOURCE');
    const known = next.knowledge.characters.find(
      (entry) => entry.identity.characterId === characterId,
    );
    requireLifecycle(known, 'INCOMPLETE_GRAPH');
    const commandId = lifecycleId<'Command'>(
      'party-movement-observation',
      state.revision,
      String(ordinal),
    );
    const movementEvent = {
      ...event(commandId, 'PartyMovementObserved', input.atTick, [characterId]),
      sourceEventId: input.sourceEventId,
    };
    requireLifecycle(!next.knowledge.eventIds.includes(movementEvent.id), 'IDEMPOTENCY_CONFLICT');
    next = {
      ...next,
      knowledge: {
        ...next.knowledge,
        characters: next.knowledge.characters.map((entry) =>
          entry.identity.characterId === characterId
            ? {
                ...entry,
                presence: {
                  ...entry.presence,
                  fieldPartyId: character.presence.fieldPartyId,
                  location: character.presence.location,
                },
              }
            : entry,
        ),
        eventIds: [...next.knowledge.eventIds, movementEvent.id],
      },
    };
    events.push(movementEvent);
  }
  return {
    state: {
      ...next,
      knowledge: {
        ...next.knowledge,
        revision: publicRevision((BigInt(state.knowledge.revision) + 1n).toString()),
      },
    },
    events,
  };
}

function observeOpeningCompany(
  change: LifecycleChange,
  command: CommandOf<'CreateCompany'>,
  context: LifecycleContext,
): LifecycleChange {
  const started = change.events.find((entry) => entry.type === 'CompanyStarted');
  requireLifecycle(started && change.next.company, 'INVALID_STATE');
  const memberIds = change.next.memberships
    .filter(
      (membership) => membership.companyId === change.next.companyId && membership.endedAt === null,
    )
    .map((membership) => membership.characterId)
    .sort();
  const subjects: CompanyObservationEvidence['subject'][] = [
    { kind: 'COMPANY', id: change.next.companyId },
    ...memberIds.map((id) => ({ kind: 'CHARACTER' as const, id })),
  ];

  let next = change.next;
  const events = [...change.events];
  // These IDs live inside this one company root. Company creation happens only
  // once, so a stable subject ordinal keeps them bounded even when command and
  // character IDs are each at the wire limit.
  for (const [ordinal, subject] of subjects.entries()) {
    const fact: CompanyObservationEvidence = {
      id: lifecycleId<'Observation'>('opening-owner-observation', String(ordinal)),
      worldId: context.worldId,
      companyId: context.companyId,
      revision: context.canonicalRevision,
      sourceEventId: started.id,
      atTick: context.atTick,
      kind: 'COMPANY_OBSERVATION',
      subject,
    };
    const observation: CommandOf<'Observe'> = {
      schemaVersion: command.schemaVersion,
      commandId: lifecycleId<'Command'>('opening-owner-observation-command', String(ordinal)),
      worldId: context.worldId,
      companyId: context.companyId,
      actorRef: { kind: 'DOMAIN_RECEIPT', id: fact.id },
      expectedRevision: context.canonicalRevision,
      campaignTick: context.atTick,
      rulesetId: command.rulesetId,
      sourceEventId: started.id,
      type: 'Observe',
      payload: {
        observationId: fact.id,
        observerRef: { kind: 'COMPANY', id: context.companyId },
        subjectRef: { kind: subject.kind, id: subject.id },
        factId: fact.id,
        sourceId: started.id,
      },
    };
    const observed = observeCompany(next, observation, {
      ...context,
      publicRevision: next.knowledge.revision,
      facts: [...context.facts, fact],
    });
    next = observed.next;
    events.push(...observed.events);
  }
  return { ...change, next, events };
}
function plan(
  state: LifecycleState,
  command: CompanyCommand,
  context: LifecycleContext,
): LifecycleChange {
  switch (command.type) {
    case 'CreateCompany':
      return prepareOpening(state, command, context);
    case 'Recruit':
      return prepareRecruit(state, command, context);
    case 'JoinFieldParty':
      return prepareJoin(state, command, context);
    case 'SetAssignment':
      return prepareAssignment(state, command, context);
    case 'Arrive':
      return prepareArrival(state, command, context);
    case 'ReturnToService':
      return prepareReturn(state, command, context);
    case 'DesignateHeir':
      return prepareDesignation(state, command, context);
    case 'ResolveLeadership':
      return prepareSuccession(state, command, context);
    case 'ChoosePerk':
      return prepareOwnerPerkSelection(state, command, context);
    case 'ProposeNickname':
    case 'ResolveNickname':
      return prepareNicknameCommand(state, command, context);
    case 'Observe':
      return context.facts.find((f) => f.id === command.payload.observationId)?.kind ===
        'HEIR_NOTIFICATION'
        ? prepareHeirNotification(state, command, context)
        : observeCompany(state, command, context);
    case 'RenameCompany': {
      requireLifecycle(state.company, 'INVALID_STATE');
      const publicValueChanged =
        state.company.name !== command.payload.name ||
        state.company.bannerId !== command.payload.bannerId;
      return {
        next: {
          ...state,
          company: {
            ...state.company,
            name: command.payload.name,
            bannerId: command.payload.bannerId,
          },
          knowledge: publicValueChanged
            ? {
                ...state.knowledge,
                revision: publicRevision((BigInt(state.knowledge.revision) + 1n).toString()),
              }
            : state.knowledge,
        },
        events: [event(command.commandId, 'CompanyRenamed', context.atTick, [])],
        requirements: [],
      };
    }
    default:
      throw new LifecycleViolation('UNSUPPORTED_ACTION');
  }
}

function prepareOwnerPerkSelection(
  state: LifecycleState,
  command: Extract<CompanyCommand, { readonly type: 'ChoosePerk' }>,
  context: LifecycleContext,
): LifecycleChange {
  const change = preparePerkSelection(state, command, context);
  const selected = change.next.characters.find(
    (character) => character.identity.characterId === command.payload.characterId,
  );
  const known = state.knowledge.characters.find(
    (character) => character.identity.characterId === command.payload.characterId,
  );
  requireLifecycle(selected && known, 'CONTACT_OR_ACCESS_REQUIRED');
  const publicValueChanged = canonicalJson(known.perks) !== canonicalJson(selected.perks);
  return {
    ...change,
    next: {
      ...change.next,
      knowledge: {
        ...change.next.knowledge,
        ...(publicValueChanged
          ? {
              revision: publicRevision((BigInt(change.next.knowledge.revision) + 1n).toString()),
              characters: change.next.knowledge.characters.map((character) =>
                character.identity.characterId === command.payload.characterId
                  ? { ...character, perks: [...selected.perks] }
                  : character,
              ),
            }
          : {}),
      },
    },
  };
}
/** A pure component transition. PREPARED is never permission to commit the whole command. */
export function prepareCompanyLifecycle(
  state: LifecycleState,
  value: unknown,
  context: LifecycleContext,
): LifecycleResult {
  const guarded = guardCompanyCommand(value, context);
  if (!guarded.ok) return { kind: 'REJECTED', state, error: guarded.error };
  const command = guarded.command;
  try {
    requireLifecycle(
      state.companyId === context.companyId && state.worldId === context.worldId,
      'AUTHORIZATION',
    );
    const requestKey = canonicalJson(command);
    const semanticKey = canonicalJson({ type: command.type, payload: command.payload });
    const sourceKey = companySourceKey(command);
    // A command ID conflict takes precedence over a matching earlier source receipt.
    const previous =
      state.applied.find((r) => r.commandId === command.commandId) ??
      (sourceKey === null ? undefined : state.applied.find((r) => r.sourceKey === sourceKey));
    if (previous) {
      requireLifecycle(
        previous.commandId === command.commandId
          ? previous.requestKey === requestKey
          : previous.semanticKey === semanticKey,
        'IDEMPOTENCY_CONFLICT',
      );
      return { kind: 'PREPARED', state, next: state, receipt: previous, replayed: true };
    }
    requireLifecycle(
      isExactInteger(context.atTick) &&
        isExactInteger(state.campaignTick) &&
        command.campaignTick === context.atTick &&
        BigInt(context.atTick) >= BigInt(state.campaignTick),
      'INVALID_TIME',
    );
    requireLifecycle(
      context.canonicalRevision === state.revision &&
        context.publicRevision === state.knowledge.revision &&
        checkFreshCompanyRevision(command, context),
      'STALE_REVISION',
    );
    validateLifecycleGraph(state, context);
    // Terminal gameplay does not suppress the legitimate report of its own outcome.
    requireLifecycle(
      state.company?.runStatus !== 'GAME_OVER' ||
        (command.type === 'Observe' &&
          context.facts.some(
            (fact) =>
              fact.id === command.payload.observationId && fact.kind === 'COMPANY_OBSERVATION',
          )),
      'TERMINAL',
    );
    requireLifecycle(state.company !== null || command.type === 'CreateCompany', 'INVALID_STATE');
    const planned = plan(state, command, context);
    const change =
      command.type === 'CreateCompany' ? observeOpeningCompany(planned, command, context) : planned;
    const receipt: LifecycleReceipt = {
      commandId: command.commandId,
      requestKey,
      sourceKey,
      semanticKey,
      events: change.events,
      requirements: change.requirements,
    };
    const next: LifecycleState = {
      ...change.next,
      campaignTick: context.atTick,
      revision: canonicalRevision((BigInt(state.revision) + 1n).toString()),
      applied: [...state.applied, receipt],
      company: change.next.company
        ? {
            ...change.next.company,
            chronicleIds: [
              ...new Set([...change.next.company.chronicleIds, ...change.events.map((e) => e.id)]),
            ],
          }
        : null,
    };
    validateLifecycleGraph(next, { ...context, canonicalRevision: next.revision });
    return { kind: 'PREPARED', state, next, receipt, replayed: false };
  } catch (error) {
    if (error instanceof LifecycleViolation) return { kind: 'REJECTED', state, error: error.code };
    throw error;
  }
}
/** Only observation snapshots enter this allowlisted view. Private graph changes cannot leak. */
export function projectCompanyLifecycle(state: LifecycleState, observerCompanyId: string) {
  if (observerCompanyId !== state.companyId) return null;
  const knowledge = state.knowledge;
  const leader = knowledge.characters.find((p) => p.identity.characterId === knowledge.leaderId);
  const leadership = leader?.skills['leadership'] ?? 0;
  const capacity = leader ? commandCapacity(leadership) : null;
  return {
    companyId: state.companyId,
    revision: knowledge.revision,
    companyPresentation:
      state.company === null
        ? null
        : { name: state.company.name, bannerId: state.company.bannerId },
    leaderId: knowledge.leaderId,
    designatedHeirId: knowledge.designatedHeirId,
    runStatus: knowledge.runStatus,
    commandCapacity: capacity,
    candidateIds: [...knowledge.candidateIds],
    eventIds: [...knowledge.eventIds],
    nicknameProposals: (knowledge.nicknameProposals ?? []).map((proposal) => ({ ...proposal })),
    nicknameHistory: (knowledge.nicknameHistory ?? []).map((nickname) => ({ ...nickname })),
    characters: [...knowledge.characters]
      .sort((a, b) => (a.identity.characterId < b.identity.characterId ? -1 : 1))
      .map((p) => ({
        characterId: p.identity.characterId,
        name: p.identity.birthName,
        nicknameTextKey: p.nickname?.textKey ?? null,
        perkIds: [...p.perks],
        knownStatus: p.presence.availability,
        location: { ...p.presence.location },
        assignment: p.presence.assignment,
        fieldPartyId: p.presence.fieldPartyId,
        skills: skillLevels(p.skills),
        aptitudeBySkill: { ...p.aptitudeBySkill },
      })),
  };
}
/** Safe error mapping for a later adapter; PREPARED is deliberately not a network result. */
export function projectLifecycleRejection(
  state: LifecycleState,
  error: LifecycleError,
  observerCompanyId: string,
) {
  const code = [
    'INVALID_COMMAND',
    'UNKNOWN_COMMAND',
    'AUTHORIZATION',
    'IDEMPOTENCY_CONFLICT',
    'UNSUPPORTED_ACTION',
  ].includes(error)
    ? error
    : 'CONTACT_OR_ACCESS_REQUIRED';
  return { code, view: projectCompanyLifecycle(state, observerCompanyId) };
}
