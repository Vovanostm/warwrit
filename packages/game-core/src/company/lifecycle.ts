import { guardCompanyCommand, checkFreshCompanyRevision } from './guards.js';
import { canonicalJson, snapshotJson } from './input.js';
import { canonicalRevision, publicRevision, isExactInteger } from './values.js';
import { prepareOpening } from './opening.js';
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
  let knowledge = state.knowledge;
  if (fact.subject.kind === 'CHARACTER') {
    const character = person(state, fact.subject.id);
    const snapshot = snapshotJson(character) as unknown as LifecycleCharacter;
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
    case 'Observe':
      return context.facts.find((f) => f.id === command.payload.observationId)?.kind ===
        'HEIR_NOTIFICATION'
        ? prepareHeirNotification(state, command, context)
        : observeCompany(state, command, context);
    case 'RenameCompany': {
      requireLifecycle(state.company, 'INVALID_STATE');
      return {
        next: {
          ...state,
          company: {
            ...state.company,
            name: command.payload.name,
            bannerId: command.payload.bannerId,
          },
        },
        events: [event(command.commandId, 'CompanyRenamed', context.atTick, [])],
        requirements: [],
      };
    }
    default:
      throw new LifecycleViolation('UNSUPPORTED_ACTION');
  }
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
    const sourceKey =
      command.type === 'ResolveLeadership'
        ? canonicalJson(['crisis', command.payload.crisisId])
        : command.actorRef.kind !== 'PLAYER'
          ? canonicalJson([command.type, command.sourceEventId])
          : null;
    const previous = state.applied.find(
      (r) => r.commandId === command.commandId || (sourceKey !== null && r.sourceKey === sourceKey),
    );
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
    requireLifecycle(state.company?.runStatus !== 'GAME_OVER', 'TERMINAL');
    requireLifecycle(state.company !== null || command.type === 'CreateCompany', 'INVALID_STATE');
    const change = plan(state, command, context);
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
    leaderId: knowledge.leaderId,
    designatedHeirId: knowledge.designatedHeirId,
    runStatus: knowledge.runStatus,
    commandCapacity: capacity,
    candidateIds: [...knowledge.candidateIds],
    eventIds: [...knowledge.eventIds],
    characters: [...knowledge.characters]
      .sort((a, b) => (a.identity.characterId < b.identity.characterId ? -1 : 1))
      .map((p) => ({
        characterId: p.identity.characterId,
        name: p.identity.birthName,
        knownStatus: p.presence.availability,
        location: p.presence.location,
        assignment: p.presence.assignment,
        fieldPartyId: p.presence.fieldPartyId,
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
