import { COMPANY_CATALOGUE, COMPANY_RULES, catalogueHas } from './definitions.js';
import type { CompanyCatalogue } from './definitions.js';
import { canonicalJson, plainObject } from './input.js';
import { ASSIGNMENTS, AVAILABILITIES } from './model.js';
import { isSkillProgress, skillLevel } from './skill-progress.js';
import type { SkillProgress } from './skill-progress.js';
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
import {
  companyLocationShape as locationShape,
  hasExactStoredFields as record,
} from './stored-shape.js';

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
type Capability = CompanyCatalogue['conditions'][number]['deniedCapabilities'][number];
export type CapabilitySubject = Pick<LifecycleCharacter, 'conditionIds'> & {
  readonly presence: {
    readonly availability: LifecycleCharacter['presence']['availability'];
    readonly encounterBindingId: string | null;
  };
};
/** Presence alone is not ability: injuries constrain the actual task, not the duty label. */
export function canPerform(character: CapabilitySubject, capability: Capability): boolean {
  return (
    character.presence.availability === 'AVAILABLE' &&
    !character.presence.encounterBindingId &&
    character.conditionIds.every((id) => {
      const condition = COMPANY_CATALOGUE.conditions.find((c) => c.id === id);
      requireLifecycle(condition, 'INVALID_STATE');
      return !condition.deniedCapabilities.includes(capability);
    })
  );
}
export function canLead(character: LifecycleCharacter): boolean {
  return canPerform(character, 'lead');
}
export function commandCapacity(leadership: SkillProgress): number {
  const level = skillLevel(leadership);
  return COMPANY_RULES.leadershipBands.reduce(
    (cap, band) => (level >= band.level ? band.capacity : cap),
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
  const nicknameProposals = state.nicknameProposals ?? [];
  requireLifecycle(
    new Set(nicknameProposals.map((proposal) => proposal.proposalId)).size ===
      nicknameProposals.length &&
      new Set(
        nicknameProposals.map((proposal) =>
          canonicalJson([proposal.characterId, proposal.sourceEventId]),
        ),
      ).size === nicknameProposals.length,
    'INVALID_STATE',
  );
  for (const proposal of nicknameProposals) {
    requireLifecycle(
      isEntityId(proposal.proposalId) &&
        isEntityId(proposal.characterId) &&
        isEntityId(proposal.sourceEventId) &&
        isEntityId(proposal.cultureId) &&
        isEntityId(proposal.deedKind) &&
        isEntityId(proposal.reasonKey) &&
        isEntityId(proposal.textKey) &&
        isExactInteger(proposal.proposedAt) &&
        BigInt(proposal.proposedAt) <= BigInt(context.atTick) &&
        ((proposal.resolution === 'PENDING' && proposal.resolvedAt === null) ||
          ((proposal.resolution === 'ACCEPTED' || proposal.resolution === 'REJECTED') &&
            proposal.resolvedAt !== null &&
            isExactInteger(proposal.resolvedAt) &&
            BigInt(proposal.resolvedAt) >= BigInt(proposal.proposedAt) &&
            BigInt(proposal.resolvedAt) <= BigInt(context.atTick))),
      'INVALID_STATE',
    );
    person(state, proposal.characterId);
  }
  for (const character of state.characters) {
    if (!character.nickname) continue;
    const active = nicknameProposals.find(
      (proposal) => proposal.proposalId === character.nickname?.proposalId,
    );
    requireLifecycle(
      active?.resolution === 'ACCEPTED' &&
        active.characterId === character.identity.characterId &&
        active.textKey === character.nickname.textKey,
      'INVALID_STATE',
    );
  }
  const knownNicknameProposals = state.knowledge.nicknameProposals ?? [];
  requireLifecycle(
    new Set(knownNicknameProposals.map((proposal) => proposal.proposalId)).size ===
      knownNicknameProposals.length,
    'INVALID_STATE',
  );
  for (const known of knownNicknameProposals) {
    const actual = nicknameProposals.find((proposal) => proposal.proposalId === known.proposalId);
    requireLifecycle(
      actual !== undefined &&
        canonicalJson({
          proposalId: actual.proposalId,
          characterId: actual.characterId,
          sourceEventId: actual.sourceEventId,
          cultureId: actual.cultureId,
          deedKind: actual.deedKind,
          reasonKey: actual.reasonKey,
          textKey: actual.textKey,
          proposedAt: actual.proposedAt,
        }) === canonicalJson(known),
      'INVALID_STATE',
    );
  }
  const knownNicknameHistory = state.knowledge.nicknameHistory ?? [];
  requireLifecycle(
    new Set(knownNicknameHistory.map((nickname) => nickname.proposalId)).size ===
      knownNicknameHistory.length,
    'INVALID_STATE',
  );
  for (const known of knownNicknameHistory) {
    const actual = nicknameProposals.find((proposal) => proposal.proposalId === known.proposalId);
    requireLifecycle(
      actual?.resolution === 'ACCEPTED' &&
        actual.resolvedAt === known.acceptedAt &&
        actual.characterId === known.characterId &&
        actual.sourceEventId === known.sourceEventId &&
        actual.cultureId === known.cultureId &&
        actual.deedKind === known.deedKind &&
        actual.reasonKey === known.reasonKey &&
        actual.textKey === known.textKey,
      'INVALID_STATE',
    );
  }
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
  for (const character of [...state.characters, ...state.knowledge.characters]) {
    for (const [id, value] of Object.entries(character.skills))
      requireLifecycle(
        catalogueHas(COMPANY_CATALOGUE, 'skills', id) && isSkillProgress(value),
        'INVALID_STATE',
      );
    const selected = character.perks.map((perkId) =>
      COMPANY_CATALOGUE.perks.find((perk) => perk.id === perkId),
    );
    requireLifecycle(
      selected.every((perk) => perk !== undefined) &&
        new Set(character.perks).size === character.perks.length &&
        new Set(selected.map((perk) => `${perk!.skillId}:${perk!.milestone}`)).size ===
          selected.length,
      'INVALID_STATE',
    );
    for (const perk of selected) {
      const mastery = character.skills[perk!.skillId];
      requireLifecycle(
        mastery !== undefined && skillLevel(mastery) >= perk!.milestone,
        'INVALID_STATE',
      );
    }
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

/** Complete structural boundary for retained lifecycle data before semantic validation. */
export function isLifecycleStateShape(value: unknown): value is LifecycleState {
  if (
    !record(
      value,
      [
        'schemaVersion',
        'worldId',
        'companyId',
        'revision',
        'campaignTick',
        'company',
        'characters',
        'memberships',
        'kinship',
        'parties',
        'bypasses',
        'knowledge',
        'applied',
      ],
      ['nicknameProposals'],
    )
  )
    return false;
  if (
    value['schemaVersion'] !== 1 ||
    !isEntityId(value['worldId']) ||
    !isEntityId(value['companyId']) ||
    !isExactInteger(value['revision']) ||
    !isExactInteger(value['campaignTick']) ||
    !(value['company'] === null || lifecycleCompanyShape(value['company'])) ||
    !list(value['characters'], lifecycleCharacterShape) ||
    !list(value['memberships'], membershipShape) ||
    !list(
      value['kinship'],
      (entry) =>
        record(entry, ['from', 'to', 'kind']) &&
        isEntityId(entry['from']) &&
        isEntityId(entry['to']) &&
        entry['kind'] === 'SIBLING',
    ) ||
    !list(
      value['parties'],
      (entry) =>
        record(entry, ['partyId', 'location']) &&
        isEntityId(entry['partyId']) &&
        locationShape(entry['location']),
    ) ||
    !list(value['bypasses'], bypassShape) ||
    !lifecycleKnowledgeShape(value['knowledge']) ||
    !list(value['applied'], isLifecycleReceiptShape) ||
    (Object.hasOwn(value, 'nicknameProposals') &&
      !list(value['nicknameProposals'], lifecycleNicknameShape))
  )
    return false;
  return true;
}

function list(value: unknown, item: (value: unknown) => boolean): value is readonly unknown[] {
  return Array.isArray(value) && value.every(item);
}
function nullableId(value: unknown): boolean {
  return value === null || isEntityId(value);
}
function lifecycleCharacterShape(value: unknown): boolean {
  if (
    !record(
      value,
      ['identity', 'presence', 'skills', 'aptitudeBySkill', 'perks', 'conditionIds'],
      ['nickname', 'presentation'],
    ) ||
    !lifecycleIdentityShape(value['identity']) ||
    !lifecyclePresenceShape(value['presence']) ||
    !lifecyclePresentationShape(value)
  )
    return false;
  const skills = value['skills'];
  const aptitude = value['aptitudeBySkill'];
  return (
    plainObject(skills) &&
    Object.values(skills).every((entry) => isSkillProgress(entry)) &&
    plainObject(aptitude) &&
    Object.values(aptitude).every(
      (entry) => Number.isSafeInteger(entry) && (entry as number) >= 0,
    ) &&
    list(value['perks'], isEntityId) &&
    list(value['conditionIds'], isEntityId)
  );
}

function lifecycleIdentityShape(value: unknown): boolean {
  return (
    record(value, [
      'characterId',
      'birthName',
      'sex',
      'birthCultureId',
      'birthplaceId',
      'originId',
      'speciesId',
      'bornAt',
    ]) &&
    isEntityId(value['characterId']) &&
    text(value['birthName']) &&
    text(value['sex']) &&
    [value['birthCultureId'], value['birthplaceId'], value['originId'], value['speciesId']].every(
      isEntityId,
    ) &&
    isExactInteger(value['bornAt'], true)
  );
}

function lifecyclePresenceShape(value: unknown): boolean {
  return (
    record(value, [
      'characterId',
      'assignment',
      'availability',
      'location',
      'fieldPartyId',
      'encounterBindingId',
    ]) &&
    isEntityId(value['characterId']) &&
    ASSIGNMENTS.includes(value['assignment'] as never) &&
    AVAILABILITIES.includes(value['availability'] as never) &&
    locationShape(value['location']) &&
    nullableId(value['fieldPartyId']) &&
    nullableId(value['encounterBindingId'])
  );
}

function lifecyclePresentationShape(value: Record<string, unknown>): boolean {
  if (
    (Object.hasOwn(value, 'nickname') && !record(value['nickname'], ['proposalId', 'textKey'])) ||
    (Object.hasOwn(value, 'nickname') &&
      (!isEntityId((value['nickname'] as Record<string, unknown>)['proposalId']) ||
        !isEntityId((value['nickname'] as Record<string, unknown>)['textKey'])))
  )
    return false;
  return (
    !Object.hasOwn(value, 'presentation') ||
    (record(value['presentation'], ['schemaVersion', 'hairStyleId']) &&
      value['presentation']['schemaVersion'] === 1 &&
      isEntityId(value['presentation']['hairStyleId']))
  );
}
function lifecycleCompanyShape(value: unknown): boolean {
  return (
    record(value, [
      'companyId',
      'worldId',
      'homeLocationId',
      'currentLeaderId',
      'actingLeaderId',
      'designatedHeirId',
      'founderId',
      'name',
      'bannerId',
      'householdIds',
      'regencyHeirId',
      'runStatus',
      'chronicleIds',
    ]) &&
    [
      value['companyId'],
      value['worldId'],
      value['homeLocationId'],
      value['currentLeaderId'],
      value['founderId'],
    ].every(isEntityId) &&
    nullableId(value['actingLeaderId']) &&
    nullableId(value['designatedHeirId']) &&
    nullableId(value['regencyHeirId']) &&
    text(value['name']) &&
    isEntityId(value['bannerId']) &&
    list(value['householdIds'], isEntityId) &&
    (value['runStatus'] === 'ACTIVE' || value['runStatus'] === 'GAME_OVER') &&
    list(value['chronicleIds'], isEntityId)
  );
}
function membershipShape(value: unknown): boolean {
  return (
    record(value, [
      'membershipId',
      'companyId',
      'characterId',
      'basis',
      'startedAt',
      'endedAt',
      'wageScheduleId',
    ]) &&
    [value['membershipId'], value['companyId'], value['characterId']].every(isEntityId) &&
    ['PAID', 'FAMILY', 'FOUNDER'].includes(value['basis'] as string) &&
    isExactInteger(value['startedAt']) &&
    (value['endedAt'] === null || isExactInteger(value['endedAt'])) &&
    nullableId(value['wageScheduleId'])
  );
}
function lifecycleKnowledgeShape(value: unknown): boolean {
  return (
    record(
      value,
      [
        'revision',
        'leaderId',
        'designatedHeirId',
        'runStatus',
        'characters',
        'candidateIds',
        'eventIds',
      ],
      ['nicknameProposals', 'nicknameHistory'],
    ) &&
    isExactInteger(value['revision']) &&
    nullableId(value['leaderId']) &&
    nullableId(value['designatedHeirId']) &&
    ['ACTIVE', 'GAME_OVER', 'UNKNOWN'].includes(value['runStatus'] as string) &&
    list(value['characters'], lifecycleCharacterShape) &&
    list(value['candidateIds'], isEntityId) &&
    list(value['eventIds'], isEntityId) &&
    (!Object.hasOwn(value, 'nicknameProposals') ||
      list(value['nicknameProposals'], lifecycleNicknameViewShape)) &&
    (!Object.hasOwn(value, 'nicknameHistory') ||
      list(value['nicknameHistory'], lifecycleNicknameHistoryShape))
  );
}
function lifecycleNicknameShape(value: unknown): boolean {
  return (
    record(value, [
      'proposalId',
      'characterId',
      'sourceEventId',
      'cultureId',
      'deedKind',
      'reasonKey',
      'textKey',
      'proposedAt',
      'resolution',
      'resolvedAt',
    ]) &&
    [
      'proposalId',
      'characterId',
      'sourceEventId',
      'cultureId',
      'deedKind',
      'reasonKey',
      'textKey',
    ].every((key) => isEntityId(value[key])) &&
    isExactInteger(value['proposedAt']) &&
    ['PENDING', 'ACCEPTED', 'REJECTED'].includes(value['resolution'] as string) &&
    (value['resolvedAt'] === null || isExactInteger(value['resolvedAt']))
  );
}
function lifecycleNicknameViewShape(value: unknown): boolean {
  return (
    record(value, [
      'proposalId',
      'characterId',
      'sourceEventId',
      'cultureId',
      'deedKind',
      'reasonKey',
      'textKey',
      'proposedAt',
    ]) &&
    [
      'proposalId',
      'characterId',
      'sourceEventId',
      'cultureId',
      'deedKind',
      'reasonKey',
      'textKey',
    ].every((key) => isEntityId(value[key])) &&
    isExactInteger(value['proposedAt'])
  );
}
function lifecycleNicknameHistoryShape(value: unknown): boolean {
  return (
    record(value, [
      'proposalId',
      'characterId',
      'sourceEventId',
      'cultureId',
      'deedKind',
      'reasonKey',
      'textKey',
      'acceptedAt',
    ]) &&
    [
      'proposalId',
      'characterId',
      'sourceEventId',
      'cultureId',
      'deedKind',
      'reasonKey',
      'textKey',
    ].every((key) => isEntityId(value[key])) &&
    isExactInteger(value['acceptedAt'])
  );
}
function bypassShape(value: unknown): boolean {
  if (!record(value, ['crisisId', 'eventId', 'heirId', 'leaderId', 'happenedAt', 'notification']))
    return false;
  if (
    ![value['crisisId'], value['eventId'], value['heirId'], value['leaderId']].every(isEntityId) ||
    !isExactInteger(value['happenedAt'])
  )
    return false;
  const note = value['notification'];
  return (
    note === null ||
    (record(note, ['learnedAt', 'respect', 'rivalry', 'contribution', 'departureIntent']) &&
      isExactInteger(note['learnedAt']) &&
      Number.isSafeInteger(note['respect']) &&
      Number.isSafeInteger(note['rivalry']) &&
      record(note['contribution'], ['respect', 'rivalry']) &&
      Number.isSafeInteger(note['contribution']['respect']) &&
      Number.isSafeInteger(note['contribution']['rivalry']) &&
      (note['departureIntent'] === null ||
        (record(note['departureIntent'], ['id', 'membershipId', 'reason']) &&
          isEntityId(note['departureIntent']['id']) &&
          isEntityId(note['departureIntent']['membershipId']) &&
          note['departureIntent']['reason'] === 'CANONICAL_EVENT')))
  );
}
export function isLifecycleReceiptShape(value: unknown): boolean {
  return (
    record(value, [
      'commandId',
      'requestKey',
      'sourceKey',
      'semanticKey',
      'events',
      'requirements',
    ]) &&
    isEntityId(value['commandId']) &&
    text(value['requestKey']) &&
    (value['sourceKey'] === null || text(value['sourceKey'])) &&
    text(value['semanticKey']) &&
    list(
      value['events'],
      (event) =>
        record(event, ['id', 'type', 'atTick', 'subjectIds']) &&
        isEntityId(event['id']) &&
        isEntityId(event['type']) &&
        isExactInteger(event['atTick']) &&
        list(event['subjectIds'], isEntityId),
    ) &&
    list(value['requirements'], isLifecycleRequirementShape)
  );
}
function isLifecycleRequirementShape(value: unknown): boolean {
  if (!plainObject(value)) return false;
  switch (value['kind']) {
    case 'OPENING_ASSETS': {
      return record(value, ['kind', 'assets']) && openingAssetsShape(value['assets']);
    }
    case 'RECRUIT_SETTLEMENT':
      return (
        record(value, [
          'kind',
          'membershipId',
          'poolId',
          'signingQ',
          'dailyWageMilli',
          'itemIds',
        ]) &&
        isEntityId(value['membershipId']) &&
        isEntityId(value['poolId']) &&
        isExactInteger(value['signingQ']) &&
        isExactInteger(value['dailyWageMilli']) &&
        list(value['itemIds'], isEntityId)
      );
    case 'DUTY_SETTLEMENT':
      return (
        record(value, ['kind', 'characterId', 'atTick', 'fundingPoolId', 'handoverToId']) &&
        isEntityId(value['characterId']) &&
        isExactInteger(value['atTick']) &&
        nullableId(value['fundingPoolId']) &&
        nullableId(value['handoverToId'])
      );
    case 'LEADERSHIP_SETTLEMENT':
      return (
        record(value, ['kind', 'previousId', 'nextId', 'atTick', 'permanent']) &&
        isEntityId(value['previousId']) &&
        nullableId(value['nextId']) &&
        isExactInteger(value['atTick']) &&
        typeof value['permanent'] === 'boolean'
      );
    default:
      return false;
  }
}

function openingAssetsShape(assets: unknown): boolean {
  return (
    record(assets, [
      'cashQ',
      'serviceTerms',
      'signingCharges',
      'items',
      'debt',
      'contactReaction',
      'hookId',
    ]) &&
    isExactInteger(assets['cashQ']) &&
    list(
      assets['serviceTerms'],
      (entry) =>
        record(entry, ['membershipId', 'dailyWageMilli']) &&
        isEntityId(entry['membershipId']) &&
        isExactInteger(entry['dailyWageMilli']),
    ) &&
    list(
      assets['signingCharges'],
      (entry) =>
        record(entry, ['characterId', 'amountQ']) &&
        isEntityId(entry['characterId']) &&
        isExactInteger(entry['amountQ']),
    ) &&
    list(
      assets['items'],
      (entry) =>
        record(entry, ['id', 'definitionId', 'quantity', 'holderId', 'ownerCompanyId']) &&
        [entry['id'], entry['definitionId'], entry['holderId'], entry['ownerCompanyId']].every(
          isEntityId,
        ) &&
        Number.isSafeInteger(entry['quantity']),
    ) &&
    (assets['debt'] === null ||
      (record(assets['debt'], ['recipientId', 'amountQ']) &&
        isEntityId(assets['debt']['recipientId']) &&
        isExactInteger(assets['debt']['amountQ']))) &&
    record(assets['contactReaction'], ['contactId', 'respect', 'rivalry']) &&
    isEntityId(assets['contactReaction']['contactId']) &&
    Number.isSafeInteger(assets['contactReaction']['respect']) &&
    Number.isSafeInteger(assets['contactReaction']['rivalry']) &&
    isEntityId(assets['hookId'])
  );
}
function text(value: unknown): boolean {
  return typeof value === 'string' && value.length <= 4096;
}
