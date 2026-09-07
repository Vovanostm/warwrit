import { COMPANY_RULES } from './definitions.js';
import {
  activeMembership,
  canLead,
  companyMember,
  contact,
  effectiveLeaderId,
  evidence,
  event,
  isAdult,
  lifecycleId,
  person,
  requireLifecycle,
} from './lifecycle-state.js';
import type {
  CommandOf,
  LifecycleChange,
  LifecycleCharacter,
  LifecycleContext,
  LifecycleState,
} from './lifecycle-types.js';

function successionCircle(state: LifecycleState): Set<string> {
  requireLifecycle(state.company, 'INVALID_STATE');
  const circle = new Set<string>([state.company.founderId, ...state.company.householdIds]);
  // Kinship is persistent; eligibility is not limited to the current field party.
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of state.kinship) {
      if (circle.has(edge.from) && !circle.has(edge.to)) {
        circle.add(edge.to);
        changed = true;
      }
      if (circle.has(edge.to) && !circle.has(edge.from)) {
        circle.add(edge.from);
        changed = true;
      }
    }
  }
  for (const member of state.memberships)
    if (member.companyId === state.companyId && member.endedAt === null)
      circle.add(member.characterId);
  return circle;
}
function freeForCompany(state: LifecycleState, character: LifecycleCharacter): boolean {
  const membership = activeMembership(state, character.identity.characterId);
  return (
    (!membership || membership.companyId === state.companyId) &&
    character.presence.availability === 'AVAILABLE' &&
    !character.presence.encounterBindingId
  );
}
export function successionOptions(state: LifecycleState, tick: LifecycleContext['atTick']) {
  const circle = successionCircle(state);
  const adults = state.characters.filter(
    (p) =>
      circle.has(p.identity.characterId) &&
      freeForCompany(state, p) &&
      canLead(p) &&
      isAdult(p, tick),
  );
  const heirId = state.company?.regencyHeirId ?? state.company?.designatedHeirId;
  const heir = heirId ? person(state, heirId) : null;
  const minor =
    heir &&
    circle.has(heir.identity.characterId) &&
    freeForCompany(state, heir) &&
    !isAdult(heir, tick)
      ? heir.identity.characterId
      : null;
  const regents = adults.filter((p) => companyMember(state, p.identity.characterId));
  return {
    adultIds: adults.map((p) => p.identity.characterId).sort(),
    minorHeirId: minor,
    regentIds: regents.map((p) => p.identity.characterId).sort(),
    canContinue: adults.length > 0 || (minor !== null && regents.length > 0),
  };
}
export function isDesignationCandidate(
  state: LifecycleState,
  character: LifecycleCharacter,
  tick: LifecycleContext['atTick'],
): boolean {
  return (
    successionCircle(state).has(character.identity.characterId) &&
    freeForCompany(state, character) &&
    (!isAdult(character, tick) || canLead(character))
  );
}
export function prepareDesignation(
  state: LifecycleState,
  command: CommandOf<'DesignateHeir'>,
  context: LifecycleContext,
): LifecycleChange {
  const id = command.payload.characterId;
  contact(context, id);
  const character = person(state, id);
  requireLifecycle(
    state.company && isDesignationCandidate(state, character, context.atTick),
    'INCOMPATIBLE_ACTIVITY',
  );
  return {
    next: {
      ...state,
      company: { ...state.company, designatedHeirId: character.identity.characterId },
    },
    events: [event(command.commandId, 'HeirDesignated', context.atTick, [id])],
    requirements: [],
  };
}
export function prepareSuccession(
  state: LifecycleState,
  command: CommandOf<'ResolveLeadership'>,
  context: LifecycleContext,
): LifecycleChange {
  requireLifecycle(state.company, 'INVALID_STATE');
  const company = state.company;
  const p = command.payload;
  const crisis = evidence(context, p.crisisId, 'CRISIS');
  requireLifecycle(
    crisis.leaderId === company.currentLeaderId || crisis.leaderId === company.actingLeaderId,
    'INVALID_SOURCE',
  );
  if (command.actorRef.kind !== 'PLAYER')
    requireLifecycle(crisis.sourceEventId === command.sourceEventId, 'INVALID_SOURCE');
  const current = person(state, company.currentLeaderId);
  const subject = person(state, crisis.leaderId);
  const replacingRegent =
    company.regencyHeirId !== null && crisis.leaderId === company.actingLeaderId;
  const originalEffective = effectiveLeaderId(state);
  const majority = crisis.reason === 'HEIR_MAJORITY';
  requireLifecycle(
    majority
      ? crisis.leaderId === company.currentLeaderId &&
          company.regencyHeirId === current.identity.characterId &&
          isAdult(current, context.atTick)
      : crisis.reason === 'LEADER_DIED'
        ? subject.presence.availability === 'DEAD'
        : subject.presence.availability !== 'DEAD' &&
          subject.presence.availability !== 'IN_ENCOUNTER' &&
          !canLead(subject),
    'INVALID_SOURCE',
  );
  const options = successionOptions(state, context.atTick);
  if (!options.canContinue) {
    const ended = event(command.commandId, 'CompanyEnded', context.atTick, [
      company.currentLeaderId,
    ]);
    return {
      next: { ...state, company: { ...company, runStatus: 'GAME_OVER' } },
      events: [ended],
      requirements: [
        {
          kind: 'LEADERSHIP_SETTLEMENT',
          previousId: originalEffective,
          nextId: null,
          atTick: context.atTick,
          permanent: true,
        },
      ],
    };
  }
  requireLifecycle(p.candidateId, 'CANDIDATE_REQUIRED');
  if (command.actorRef.kind === 'PLAYER') contact(context, p.candidateId);
  requireLifecycle(
    options.adultIds.includes(p.candidateId as typeof current.identity.characterId),
    'INCOMPATIBLE_ACTIVITY',
  );
  const candidate = person(state, p.candidateId);
  const permanent = ['PERMANENT', 'CONFIRM_ACTING', 'RESTORE_HEIR'].includes(p.mode);
  switch (p.mode) {
    case 'PERMANENT':
      requireLifecycle(
        crisis.reason === 'LEADER_DIED' && crisis.leaderId === company.currentLeaderId,
        'INCOMPATIBLE_ACTIVITY',
      );
      break;
    case 'ACTING':
      requireLifecycle(
        company.regencyHeirId === null &&
          (crisis.reason === 'LEADER_UNAVAILABLE' ||
            (crisis.reason === 'LEADER_DIED' && crisis.leaderId === company.actingLeaderId)),
        'INCOMPATIBLE_ACTIVITY',
      );
      break;
    case 'REGENCY':
      requireLifecycle(
        ((crisis.reason === 'LEADER_DIED' && crisis.leaderId === company.currentLeaderId) ||
          replacingRegent) &&
          options.minorHeirId &&
          options.regentIds.includes(candidate.identity.characterId),
        'INCOMPATIBLE_ACTIVITY',
      );
      break;
    case 'CONFIRM_ACTING':
      requireLifecycle(
        majority && company.actingLeaderId === candidate.identity.characterId,
        'INCOMPATIBLE_ACTIVITY',
      );
      break;
    case 'RESTORE_HEIR':
      requireLifecycle(
        majority && company.regencyHeirId === candidate.identity.characterId,
        'INCOMPATIBLE_ACTIVITY',
      );
      break;
  }
  const nextCompany = permanent
    ? {
        ...company,
        currentLeaderId: candidate.identity.characterId,
        actingLeaderId: null,
        regencyHeirId: null,
      }
    : {
        ...company,
        currentLeaderId: p.mode === 'REGENCY' ? options.minorHeirId! : company.currentLeaderId,
        actingLeaderId: candidate.identity.characterId,
        regencyHeirId: p.mode === 'REGENCY' ? options.minorHeirId! : company.regencyHeirId,
      };
  const events = [
    event(command.commandId, 'LeadershipResolved', context.atTick, [
      candidate.identity.characterId,
    ]),
  ];
  let bypasses = state.bypasses;
  if (
    permanent &&
    company.designatedHeirId &&
    company.designatedHeirId !== candidate.identity.characterId
  ) {
    requireLifecycle(!bypasses.some((b) => b.crisisId === crisis.id), 'IDEMPOTENCY_CONFLICT');
    const bypassed = event(crisis.id, 'HeirBypassed', context.atTick, [
      company.designatedHeirId,
      candidate.identity.characterId,
    ]);
    events.push(bypassed);
    bypasses = [
      ...bypasses,
      {
        crisisId: crisis.id,
        eventId: bypassed.id,
        heirId: company.designatedHeirId,
        leaderId: candidate.identity.characterId,
        happenedAt: context.atTick,
        notification: null,
      },
    ];
  }
  // A household successor is a real person. Joining service is part of this compound transition.
  let memberships = state.memberships;
  if (!companyMember(state, candidate.identity.characterId))
    memberships = [
      ...memberships,
      {
        membershipId: lifecycleId(crisis.id, candidate.identity.characterId, 'membership'),
        companyId: state.companyId,
        characterId: candidate.identity.characterId,
        basis: 'FAMILY',
        startedAt: context.atTick,
        endedAt: null,
        wageScheduleId: null,
      },
    ];
  return {
    next: { ...state, company: nextCompany, memberships, bypasses },
    events,
    requirements: [
      {
        kind: 'LEADERSHIP_SETTLEMENT',
        previousId: originalEffective,
        nextId: candidate.identity.characterId,
        atTick: context.atTick,
        permanent,
      },
    ],
  };
}
export function prepareHeirNotification(
  state: LifecycleState,
  command: CommandOf<'Observe'>,
  context: LifecycleContext,
): LifecycleChange {
  const p = command.payload;
  const fact = evidence(context, p.observationId, 'HEIR_NOTIFICATION');
  const bypass = state.bypasses.find((b) => b.crisisId === fact.crisisId);
  requireLifecycle(
    bypass &&
      fact.heirId === bypass.heirId &&
      fact.leaderId === bypass.leaderId &&
      p.observerRef.kind === 'CHARACTER' &&
      p.observerRef.id === fact.heirId &&
      p.subjectRef.kind === 'CHARACTER' &&
      p.subjectRef.id === fact.leaderId &&
      p.factId === bypass.eventId &&
      p.sourceId === fact.sourceEventId &&
      command.sourceEventId === fact.sourceEventId &&
      BigInt(context.atTick) >= BigInt(bypass.happenedAt),
    'INVALID_SOURCE',
  );
  // A different reporting channel is not a new emotional event.
  if (bypass.notification) return { next: state, events: [], requirements: [] };
  const heir = person(state, bypass.heirId);
  requireLifecycle(heir.presence.availability !== 'DEAD', 'INCOMPATIBLE_ACTIVITY');
  for (const value of [fact.relation.respect, fact.relation.rivalry])
    requireLifecycle(Number.isSafeInteger(value) && value >= 0 && value <= 100, 'INVALID_SOURCE');
  const rule = COMPANY_RULES.heirBypass;
  const respect = Math.max(0, Math.min(100, fact.relation.respect + rule.respectDelta));
  const rivalry = Math.max(0, Math.min(100, fact.relation.rivalry + rule.rivalryDelta));
  const membership = activeMembership(state, bypass.heirId);
  const leaving =
    membership?.companyId === state.companyId &&
    isAdult(heir, context.atTick) &&
    bypass.heirId !== effectiveLeaderId(state) &&
    respect <= rule.respectAtMost &&
    rivalry >= rule.rivalryAtLeast;
  const notification = {
    learnedAt: context.atTick,
    respect,
    rivalry,
    contribution: { respect: rule.respectDelta, rivalry: rule.rivalryDelta },
    departureIntent: leaving
      ? {
          id: lifecycleId(bypass.eventId, 'departure'),
          membershipId: membership!.membershipId,
          reason: 'CANONICAL_EVENT' as const,
        }
      : null,
  };
  return {
    next: {
      ...state,
      bypasses: state.bypasses.map((b) => (b === bypass ? { ...b, notification } : b)),
    },
    events: [event(bypass.eventId, 'HeirNotified', context.atTick, [bypass.heirId])],
    requirements: [],
  };
}
