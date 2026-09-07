import { COMPANY_CATALOGUE, COMPANY_RULES, catalogueHas } from './definitions.js';
import { canonicalJson } from './input.js';
import { ASSIGNMENTS, AVAILABILITIES } from './model.js';
import { entityId, isEntityId, isExactInteger } from './values.js';
import type { CampaignTick } from './values.js';
import type {
  LifecycleState,
  LifecycleCharacter,
  LifecycleContext,
  LifecycleEvidence,
  LifecycleError,
  LifecycleEvent,
} from './lifecycle-types.js';

export class LifecycleViolation extends Error {
  constructor(readonly code: LifecycleError) {
    super(code);
  }
}
export function requireLifecycle(condition: unknown, code: LifecycleError): asserts condition {
  if (!condition) throw new LifecycleViolation(code);
}
export function lifecycleId<K extends string>(...parts: string[]) {
  const value = JSON.stringify(parts);
  requireLifecycle(isEntityId(value), 'INVALID_SOURCE');
  return entityId<K>(value);
}
export function person(state: LifecycleState, id: string): LifecycleCharacter {
  const result = state.characters.find((p) => p.identity.characterId === id);
  requireLifecycle(result, 'INCOMPLETE_GRAPH');
  return result;
}
export function activeMembership(state: LifecycleState, id: string) {
  return state.memberships.find((m) => m.characterId === id && m.endedAt === null);
}
export function companyMember(state: LifecycleState, id: string): boolean {
  return activeMembership(state, id)?.companyId === state.companyId;
}
export function effectiveLeaderId(state: LifecycleState) {
  requireLifecycle(state.company, 'INVALID_STATE');
  return state.company.actingLeaderId ?? state.company.currentLeaderId;
}
export function isAdult(character: LifecycleCharacter, tick: CampaignTick): boolean {
  const species = COMPANY_CATALOGUE.species.find(
    (s) => s.id === character.identity.speciesId && s.enabled,
  );
  requireLifecycle(species && isExactInteger(character.identity.bornAt, true), 'INVALID_STATE');
  return (
    BigInt(tick) - BigInt(character.identity.bornAt) >=
    BigInt(species.adultAtDays) * BigInt(COMPANY_RULES.ticksPerDay)
  );
}
export function canLead(character: LifecycleCharacter): boolean {
  return (
    character.presence.availability === 'AVAILABLE' &&
    !character.presence.encounterBindingId &&
    character.conditionIds.every((id) => {
      const condition = COMPANY_CATALOGUE.conditions.find((c) => c.id === id);
      requireLifecycle(condition, 'INVALID_STATE');
      return !condition.deniedCapabilities.includes('lead');
    })
  );
}
export function commandCapacity(leadership: number): number {
  return COMPANY_RULES.leadershipBands.reduce(
    (cap, band) => (leadership >= band.level ? band.capacity : cap),
    0,
  );
}
export function sameLocation(
  a: LifecycleCharacter['presence']['location'],
  b: LifecycleCharacter['presence']['location'],
): boolean {
  return canonicalJson(a) === canonicalJson(b);
}
export function replacePerson(
  state: LifecycleState,
  character: LifecycleCharacter,
): LifecycleState {
  return {
    ...state,
    characters: state.characters.map((p) =>
      p.identity.characterId === character.identity.characterId ? character : p,
    ),
  };
}
export function contact(context: LifecycleContext, id: string): void {
  requireLifecycle(context.contactIds.includes(id), 'CONTACT_OR_ACCESS_REQUIRED');
}
export function evidence<K extends LifecycleEvidence['kind']>(
  context: LifecycleContext,
  id: string,
  kind: K,
): Extract<LifecycleEvidence, { kind: K }> {
  const matches = context.facts.filter((f) => f.id === id);
  requireLifecycle(matches.length === 1, 'INVALID_SOURCE');
  const fact = matches[0]!;
  requireLifecycle(
    fact.kind === kind &&
      fact.companyId === context.companyId &&
      fact.worldId === context.worldId &&
      fact.revision === context.canonicalRevision &&
      fact.atTick === context.atTick,
    'INVALID_SOURCE',
  );
  return fact as Extract<LifecycleEvidence, { kind: K }>;
}
export function event(
  commandId: string,
  type: string,
  tick: CampaignTick,
  subjectIds: readonly string[],
): LifecycleEvent {
  return { id: lifecycleId(commandId, type), type, atTick: tick, subjectIds };
}
/** Validate loaded graph invariants; absence must never be treated as proof of extinction. */
export function validateLifecycleGraph(state: LifecycleState, context: LifecycleContext): void {
  requireLifecycle(context.completeGraph, 'INCOMPLETE_GRAPH');
  requireLifecycle(
    state.schemaVersion === 1 &&
      state.worldId === context.worldId &&
      state.companyId === context.companyId,
    'INVALID_STATE',
  );
  requireLifecycle(
    isExactInteger(state.campaignTick) &&
      isExactInteger(state.revision) &&
      isExactInteger(state.knowledge.revision),
    'INVALID_STATE',
  );
  for (const [items, ids] of [
    [state.characters, state.characters.map((p) => p.identity.characterId)],
    [state.memberships, state.memberships.map((m) => m.membershipId)],
    [state.parties, state.parties.map((p) => p.partyId)],
    [state.bypasses, state.bypasses.map((b) => b.crisisId)],
    [state.applied, state.applied.map((r) => r.commandId)],
  ] as const)
    requireLifecycle(new Set(ids).size === items.length, 'INVALID_STATE');
  const active = state.memberships.filter((m) => m.endedAt === null);
  requireLifecycle(
    new Set(active.map((m) => m.characterId)).size === active.length,
    'INVALID_STATE',
  );
  for (const member of state.memberships) {
    person(state, member.characterId);
    requireLifecycle(
      isExactInteger(member.startedAt) &&
        BigInt(member.startedAt) <= BigInt(context.atTick) &&
        (member.endedAt === null ||
          (isExactInteger(member.endedAt) &&
            BigInt(member.endedAt) >= BigInt(member.startedAt) &&
            BigInt(member.endedAt) <= BigInt(context.atTick))),
      'INVALID_STATE',
    );
  }
  for (const character of state.characters) {
    requireLifecycle(
      character.identity.characterId === character.presence.characterId &&
        isExactInteger(character.identity.bornAt, true),
      'INVALID_STATE',
    );
    requireLifecycle(
      catalogueHas(COMPANY_CATALOGUE, 'species', character.identity.speciesId),
      'INVALID_STATE',
    );
    for (const id of character.conditionIds)
      requireLifecycle(catalogueHas(COMPANY_CATALOGUE, 'conditions', id), 'INVALID_STATE');
    for (const [id, value] of Object.entries(character.skills))
      requireLifecycle(
        catalogueHas(COMPANY_CATALOGUE, 'skills', id) &&
          Number.isSafeInteger(value) &&
          value >= 0 &&
          value <= COMPANY_RULES.maxSkillLevel,
        'INVALID_STATE',
      );
    requireLifecycle(BigInt(character.identity.bornAt) <= BigInt(context.atTick), 'INVALID_STATE');
    for (const [skillId, aptitude] of Object.entries(character.aptitudeBySkill))
      requireLifecycle(
        catalogueHas(COMPANY_CATALOGUE, 'skills', skillId) &&
          Number.isSafeInteger(aptitude) &&
          aptitude > 0,
        'INVALID_STATE',
      );
    const presence = character.presence;
    requireLifecycle(
      AVAILABILITIES.includes(presence.availability) && ASSIGNMENTS.includes(presence.assignment),
      'INVALID_STATE',
    );
    const location = presence.location;
    requireLifecycle(
      location.kind === 'AT'
        ? isEntityId(location.siteId) && isEntityId(location.areaId)
        : location.kind === 'TRANSIT' &&
            isEntityId(location.segmentId) &&
            isEntityId(location.from) &&
            isEntityId(location.to) &&
            isExactInteger(location.startedAt) &&
            isExactInteger(location.arrivalNotBefore) &&
            BigInt(location.arrivalNotBefore) >= BigInt(location.startedAt) &&
            BigInt(location.startedAt) <= BigInt(context.atTick),
      'INVALID_STATE',
    );
    requireLifecycle(
      (presence.availability === 'IN_ENCOUNTER') === (presence.encounterBindingId !== null),
      'INVALID_STATE',
    );
    if (['DEAD', 'CAPTIVE', 'OUT_OF_CONTACT'].includes(presence.availability))
      requireLifecycle(
        presence.fieldPartyId === null && presence.assignment === 'NONE',
        'INVALID_STATE',
      );
    if (presence.fieldPartyId) {
      const party = state.parties.find((p) => p.partyId === presence.fieldPartyId);
      requireLifecycle(party, 'INCOMPLETE_GRAPH');
      requireLifecycle(
        companyMember(state, character.identity.characterId) &&
          sameLocation(party.location, presence.location) &&
          ['FIELD', 'RECOVERY'].includes(presence.assignment),
        'INVALID_STATE',
      );
    }
    requireLifecycle(
      presence.assignment !== 'FIELD' || presence.fieldPartyId !== null,
      'INVALID_STATE',
    );
  }
  for (const party of state.parties)
    requireLifecycle(
      state.characters.filter((p) => p.presence.fieldPartyId === party.partyId).length <=
        COMPANY_RULES.partyHardMax,
      'INVALID_STATE',
    );
  for (const edge of state.kinship) {
    person(state, edge.from);
    person(state, edge.to);
    requireLifecycle(edge.kind === 'SIBLING' && edge.from !== edge.to, 'INVALID_STATE');
  }
  if (state.company) {
    requireLifecycle(
      state.company.companyId === state.companyId && state.company.worldId === state.worldId,
      'INVALID_STATE',
    );
    for (const id of [
      state.company.founderId,
      state.company.currentLeaderId,
      state.company.actingLeaderId,
      state.company.designatedHeirId,
      state.company.regencyHeirId,
      ...state.company.householdIds,
    ])
      if (id) person(state, id);
  }
}
