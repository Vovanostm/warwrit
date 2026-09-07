import { COMPANY_CATALOGUE, COMPANY_RULES } from './definitions.js';
import { entityId, isExactInteger } from './values.js';
import {
  activeMembership,
  canLead,
  companyMember,
  commandCapacity,
  contact,
  effectiveLeaderId,
  evidence,
  event,
  lifecycleId,
  person,
  replacePerson,
  requireLifecycle,
  sameLocation,
} from './lifecycle-state.js';
import type {
  CommandOf,
  LifecycleChange,
  LifecycleContext,
  LifecycleState,
} from './lifecycle-types.js';

export function fieldPartyStatus(state: LifecycleState, partyId: string) {
  requireLifecycle(
    state.parties.some((p) => p.partyId === partyId),
    'INCOMPLETE_GRAPH',
  );
  const leader = person(state, effectiveLeaderId(state));
  const leadership = leader.skills['leadership'] ?? 0;
  const capacity = commandCapacity(leadership);
  const members = state.characters.filter((p) => p.presence.fieldPartyId === partyId);
  const excess = Math.max(0, members.length - capacity);
  return {
    memberIds: members.map((p) => p.identity.characterId).sort(),
    capacity,
    overCapacity: excess > 0,
    moraleModifier:
      excess === 0
        ? 0
        : -Math.min(
            COMPANY_RULES.overflowPenalty.maximum,
            excess * COMPANY_RULES.overflowPenalty.perExcess,
          ),
  };
}
function join(
  state: LifecycleState,
  characterId: string,
  partyId: string,
  context: LifecycleContext,
): LifecycleState {
  contact(context, characterId);
  const character = person(state, characterId);
  const party = state.parties.find((p) => p.partyId === partyId);
  requireLifecycle(party && party.location.kind === 'AT', 'CONTACT_OR_ACCESS_REQUIRED');
  const leader = person(state, effectiveLeaderId(state));
  requireLifecycle(
    canLead(leader) &&
      leader.presence.fieldPartyId === partyId &&
      sameLocation(leader.presence.location, party.location),
    'INCOMPATIBLE_ACTIVITY',
  );
  requireLifecycle(
    companyMember(state, characterId) &&
      character.presence.availability === 'AVAILABLE' &&
      !character.presence.encounterBindingId,
    'INCOMPATIBLE_ACTIVITY',
  );
  requireLifecycle(
    !character.presence.fieldPartyId && sameLocation(character.presence.location, party.location),
    'CONTACT_OR_ACCESS_REQUIRED',
  );
  const status = fieldPartyStatus(state, partyId);
  requireLifecycle(
    status.memberIds.length < status.capacity &&
      status.memberIds.length < COMPANY_RULES.partyHardMax,
    'CAPACITY',
  );
  return replacePerson(state, {
    ...character,
    presence: {
      ...character.presence,
      fieldPartyId: entityId(partyId),
      assignment: character.presence.assignment === 'RECOVERY' ? 'RECOVERY' : 'FIELD',
    },
  });
}
export function prepareJoin(
  state: LifecycleState,
  command: CommandOf<'JoinFieldParty'>,
  context: LifecycleContext,
): LifecycleChange {
  const p = command.payload;
  const fact = evidence(context, p.coLocationEvidenceId, 'MEETING');
  requireLifecycle(
    fact.characterId === p.characterId &&
      fact.partyId === p.partyId &&
      sameLocation(fact.location, person(state, p.characterId).presence.location),
    'INVALID_SOURCE',
  );
  return {
    next: join(state, p.characterId, p.partyId, context),
    events: [event(command.commandId, 'JoinedFieldParty', context.atTick, [p.characterId])],
    requirements: [
      {
        kind: 'DUTY_SETTLEMENT',
        characterId: p.characterId,
        atTick: context.atTick,
        fundingPoolId: null,
        handoverToId: null,
      },
    ],
  };
}
export function prepareRecruit(
  state: LifecycleState,
  command: CommandOf<'Recruit'>,
  context: LifecycleContext,
): LifecycleChange {
  const p = command.payload;
  contact(context, p.characterId);
  const character = person(state, p.characterId);
  const offer = evidence(context, p.offerId, 'RECRUIT');
  requireLifecycle(isExactInteger(offer.expiresAt), 'INVALID_SOURCE');
  requireLifecycle(
    offer.characterId === p.characterId &&
      offer.basis === p.basis &&
      offer.offerRevision === p.offerRevision &&
      BigInt(offer.expiresAt) > BigInt(context.atTick),
    'INVALID_SOURCE',
  );
  requireLifecycle(
    isExactInteger(offer.signingQ) && isExactInteger(offer.dailyWageMilli),
    'INVALID_SOURCE',
  );
  if (p.basis === 'FAMILY') requireLifecycle(BigInt(offer.dailyWageMilli) === 0n, 'INVALID_SOURCE');
  if (p.basis === 'FAMILY')
    requireLifecycle(
      state.company?.householdIds.includes(character.identity.characterId) ||
        state.kinship.some(
          (e) =>
            (e.from === p.characterId && companyMember(state, e.to)) ||
            (e.to === p.characterId && companyMember(state, e.from)),
        ),
      'INCOMPATIBLE_ACTIVITY',
    );
  requireLifecycle(
    !activeMembership(state, p.characterId) &&
      character.presence.availability === 'AVAILABLE' &&
      !character.presence.encounterBindingId &&
      !character.presence.fieldPartyId,
    'INCOMPATIBLE_ACTIVITY',
  );
  const membershipId = lifecycleId<'Membership'>(offer.id, p.characterId, 'membership');
  requireLifecycle(
    !state.memberships.some((m) => m.membershipId === membershipId),
    'IDEMPOTENCY_CONFLICT',
  );
  const member = {
    membershipId,
    companyId: state.companyId,
    characterId: character.identity.characterId,
    basis: p.basis,
    startedAt: context.atTick,
    endedAt: null,
    wageScheduleId: p.basis === 'PAID' ? lifecycleId<'WageSchedule'>(membershipId, 'wage') : null,
  };
  return {
    next: { ...state, memberships: [...state.memberships, member] },
    events: [event(command.commandId, 'ServiceStarted', context.atTick, [p.characterId])],
    requirements: [
      {
        kind: 'RECRUIT_SETTLEMENT',
        membershipId,
        poolId: p.poolId,
        signingQ: offer.signingQ,
        dailyWageMilli: offer.dailyWageMilli,
        itemIds: offer.itemIds,
      },
    ],
  };
}
export function prepareArrival(
  state: LifecycleState,
  command: CommandOf<'Arrive'>,
  context: LifecycleContext,
): LifecycleChange {
  const p = command.payload;
  const character = person(state, p.characterId);
  const fact = evidence(context, p.arrivalEvidenceId, 'ARRIVAL');
  const location = character.presence.location;
  requireLifecycle(
    fact.sourceEventId === command.sourceEventId &&
      fact.characterId === p.characterId &&
      fact.segmentId === p.segmentId,
    'INVALID_SOURCE',
  );
  requireLifecycle(
    location.kind === 'TRANSIT' &&
      location.segmentId === p.segmentId &&
      location.from === fact.from &&
      location.to === fact.location.siteId &&
      BigInt(context.atTick) >= BigInt(location.arrivalNotBefore),
    'INVALID_SOURCE',
  );
  requireLifecycle(
    !character.presence.encounterBindingId &&
      character.presence.availability !== 'DEAD' &&
      character.presence.availability !== 'CAPTIVE',
    'INCOMPATIBLE_ACTIVITY',
  );
  // A party route must arrive atomically through its later world producer, not split its members here.
  requireLifecycle(!character.presence.fieldPartyId, 'UNSUPPORTED_ACTION');
  return {
    next: replacePerson(state, {
      ...character,
      presence: { ...character.presence, location: fact.location },
    }),
    events: [event(command.commandId, 'Arrived', context.atTick, [p.characterId])],
    requirements: [],
  };
}
export function prepareAssignment(
  state: LifecycleState,
  command: CommandOf<'SetAssignment'>,
  context: LifecycleContext,
): LifecycleChange {
  const p = command.payload;
  contact(context, p.characterId);
  const character = person(state, p.characterId);
  const fact = evidence(context, p.dutyEvidenceId, 'DUTY');
  requireLifecycle(
    fact.characterId === p.characterId &&
      fact.assignment === p.assignment &&
      fact.location.siteId === p.locationId &&
      fact.fundingPoolId === p.fundingPoolId &&
      sameLocation(character.presence.location, fact.location),
    'INVALID_SOURCE',
  );
  requireLifecycle(
    companyMember(state, p.characterId) &&
      character.presence.availability === 'AVAILABLE' &&
      !character.presence.encounterBindingId,
    'INCOMPATIBLE_ACTIVITY',
  );
  if (p.assignment === 'GARRISON')
    requireLifecycle(
      character.conditionIds.every(
        (id) =>
          !COMPANY_CATALOGUE.conditions
            .find((c) => c.id === id)!
            .deniedCapabilities.includes('localDuty'),
      ),
      'INCOMPATIBLE_ACTIVITY',
    );
  let next: LifecycleState;
  if (p.assignment === 'FIELD' && !character.presence.fieldPartyId) {
    requireLifecycle(fact.partyId, 'INVALID_SOURCE');
    next = join(state, p.characterId, fact.partyId, context);
  } else {
    const detaching =
      character.presence.fieldPartyId !== null &&
      ((p.assignment !== 'RECOVERY' && p.assignment !== 'FIELD') || fact.handoverToId !== null);
    if (detaching) {
      requireLifecycle(
        fact.handoverToId && fact.handoverToId !== p.characterId,
        'CONTACT_OR_ACCESS_REQUIRED',
      );
      const receiver = person(state, fact.handoverToId);
      requireLifecycle(
        receiver.presence.availability === 'AVAILABLE' &&
          sameLocation(receiver.presence.location, fact.location),
        'CONTACT_OR_ACCESS_REQUIRED',
      );
    }
    next = replacePerson(state, {
      ...character,
      presence: {
        ...character.presence,
        assignment: p.assignment,
        fieldPartyId: detaching ? null : character.presence.fieldPartyId,
      },
    });
  }
  return {
    next,
    events: [event(command.commandId, 'AssignmentChanged', context.atTick, [p.characterId])],
    requirements: [
      {
        kind: 'DUTY_SETTLEMENT',
        characterId: p.characterId,
        atTick: context.atTick,
        fundingPoolId: p.fundingPoolId,
        handoverToId: fact.handoverToId,
      },
    ],
  };
}
export function prepareReturn(
  state: LifecycleState,
  command: CommandOf<'ReturnToService'>,
  context: LifecycleContext,
): LifecycleChange {
  const p = command.payload;
  contact(context, p.characterId);
  const character = person(state, p.characterId);
  const arrival = evidence(context, p.arrivalEvidenceId, 'ARRIVAL');
  requireLifecycle(
    arrival.characterId === p.characterId &&
      sameLocation(arrival.location, character.presence.location),
    'INVALID_SOURCE',
  );
  requireLifecycle(
    companyMember(state, p.characterId) &&
      ['AVAILABLE', 'OUT_OF_CONTACT'].includes(character.presence.availability) &&
      !character.presence.encounterBindingId,
    'INCOMPATIBLE_ACTIVITY',
  );
  const returned = {
    ...character,
    presence: { ...character.presence, availability: 'AVAILABLE' as const },
  };
  const returnedState = replacePerson(state, returned);
  let next: LifecycleState;
  if (p.assignment === 'FIELD') {
    const partyId = person(state, effectiveLeaderId(state)).presence.fieldPartyId;
    requireLifecycle(partyId, 'CONTACT_OR_ACCESS_REQUIRED');
    next = join(returnedState, p.characterId, partyId, context);
  } else {
    requireLifecycle(!character.presence.fieldPartyId, 'INCOMPATIBLE_ACTIVITY');
    next = replacePerson(returnedState, {
      ...returned,
      presence: { ...returned.presence, assignment: p.assignment },
    });
  }
  return {
    next,
    events: [event(command.commandId, 'ReturnedToService', context.atTick, [p.characterId])],
    requirements: [
      {
        kind: 'DUTY_SETTLEMENT',
        characterId: p.characterId,
        atTick: context.atTick,
        fundingPoolId: null,
        handoverToId: null,
      },
    ],
  };
}
