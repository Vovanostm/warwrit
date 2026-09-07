import { createRandomState, drawRandomInt } from '../combat/random.js';
import { COMPANY_CATALOGUE, COMPANY_RULES } from './definitions.js';
import { entityId, birthTick, moneyQ } from './values.js';
import {
  evidence,
  event,
  isAdult,
  lifecycleId,
  person,
  requireLifecycle,
} from './lifecycle-state.js';
import type { CharacterIdentity, Membership } from './model.js';
import type {
  CommandOf,
  LifecycleChange,
  LifecycleCharacter,
  LifecycleContext,
  LifecycleState,
  OpeningAssets,
} from './lifecycle-types.js';

export function prepareOpening(
  state: LifecycleState,
  command: CommandOf<'CreateCompany'>,
  context: LifecycleContext,
): LifecycleChange {
  requireLifecycle(state.company === null, 'INVALID_STATE');
  const input = command.payload;
  const source = evidence(context, input.candidateSetId, 'OPENING');
  const profile = COMPANY_CATALOGUE.openingProfiles.find((p) => p.id === source.profileId);
  const origin = COMPANY_CATALOGUE.origins.find((o) => o.id === input.originId);
  const family = COMPANY_CATALOGUE.familyStories.find((f) => f.id === input.familyStoryId);
  requireLifecycle(profile && origin && family, 'INVALID_SOURCE');
  requireLifecycle(
    source.originId === input.originId &&
      source.familyStoryId === input.familyStoryId &&
      source.cultureId === input.cultureId &&
      source.location.siteId === input.homelandId &&
      source.birthplaceIds.includes(input.leaderInput.birthplaceId),
    'INVALID_SOURCE',
  );
  person(state, source.contactId);
  person(state, source.providerId);
  requireLifecycle(
    Number.isSafeInteger(source.seed) &&
      source.candidates.length === 3 &&
      source.relatives.length === family.relativeCount,
    'INVALID_SOURCE',
  );
  const newIds = [
    source.leaderId,
    ...source.candidates.map((c) => c.characterId),
    ...source.relatives.map((r) => r.characterId),
  ];
  requireLifecycle(
    new Set(newIds).size === newIds.length &&
      newIds.every((id) => !state.characters.some((p) => p.identity.characterId === id)),
    'IDEMPOTENCY_CONFLICT',
  );
  requireLifecycle(
    input.selectedCandidateIds.every((id) => source.candidates.some((c) => c.characterId === id)),
    'INVALID_ARGUMENT',
  );
  requireLifecycle(
    new Set(source.candidates.map((c) => c.templateId)).size === 3,
    'INVALID_SOURCE',
  );
  requireLifecycle(!state.parties.some((p) => p.partyId === source.partyId), 'INVALID_STATE');
  const partyId = entityId<'FieldParty'>(source.partyId);
  const leaderId = entityId<'Character'>(source.leaderId);
  const identities: LifecycleCharacter[] = [];
  const memberships: Membership[] = [];
  const items: OpeningAssets['items'][number][] = [];
  const signings: OpeningAssets['signingCharges'][number][] = [];
  const q = (crowns: number) =>
    moneyQ((BigInt(crowns) * BigInt(COMPANY_RULES.moneyQPerCrown)).toString());
  const addGear = (holderId: string, gear: readonly string[]) => {
    for (const definitionId of gear)
      items.push({
        id: lifecycleId(source.id, holderId, definitionId),
        definitionId,
        quantity: 1,
        holderId,
        ownerCompanyId: state.companyId,
      });
  };
  const addPerson = (
    identity: CharacterIdentity,
    skills: Readonly<Record<string, number>>,
    basis: Membership['basis'] | null,
  ) => {
    identities.push({
      identity,
      skills,
      aptitudeBySkill: Object.fromEntries(
        COMPANY_CATALOGUE.skills
          .filter((s) => s.enabled)
          .map((s) => [s.id, profile.defaultAptitudeBps]),
      ),
      perks: [],
      conditionIds: [],
      presence: {
        characterId: identity.characterId,
        location: source.location,
        availability: 'AVAILABLE',
        assignment: basis ? 'FIELD' : 'NONE',
        fieldPartyId: basis ? partyId : null,
        encounterBindingId: null,
      },
    });
    if (basis)
      memberships.push({
        membershipId: lifecycleId(source.id, identity.characterId, 'membership'),
        characterId: identity.characterId,
        companyId: state.companyId,
        basis,
        startedAt: context.atTick,
        endedAt: null,
        wageScheduleId:
          basis === 'PAID' ? lifecycleId(source.id, identity.characterId, 'wage') : null,
      });
  };
  const leaderIdentity: CharacterIdentity = {
    ...input.leaderInput,
    characterId: leaderId,
    birthCultureId: entityId(input.cultureId),
    birthplaceId: entityId(input.leaderInput.birthplaceId),
    originId: entityId(input.originId),
    speciesId: entityId(input.leaderInput.speciesId),
    bornAt: birthTick(input.leaderInput.bornAt),
  };
  const skills = Object.fromEntries(
    COMPANY_CATALOGUE.skills.filter((s) => s.enabled).map((s) => [s.id, profile.leaderBaseLevel]),
  );
  skills[origin.skillId] = (skills[origin.skillId] ?? 0) + origin.skillBonus;
  addPerson(leaderIdentity, skills, 'FOUNDER');
  requireLifecycle(isAdult(identities[0]!, context.atTick), 'INVALID_ARGUMENT');
  addGear(leaderId, profile.leaderGearIds);
  let random = createRandomState(source.seed);
  const draw = (min: number, max: number) => {
    const result = drawRandomInt(random, min, max);
    random = result.state;
    return result.value;
  };
  for (const candidate of [...source.candidates].sort((a, b) =>
    a.templateId < b.templateId ? -1 : 1,
  )) {
    const template = COMPANY_CATALOGUE.candidateTemplates.find(
      (t) => t.id === candidate.templateId,
    );
    requireLifecycle(template, 'INVALID_SOURCE');
    const ageDays = draw(profile.candidateAgeMinDays, profile.candidateAgeMaxDays);
    const candidateSkills = Object.fromEntries(
      template.skills.map((s) => [
        s.skillId,
        Math.max(1, s.level + draw(-profile.variation, profile.variation)),
      ]),
    );
    const id = entityId<'Character'>(candidate.characterId);
    const selected = input.selectedCandidateIds.includes(id);
    addPerson(
      {
        ...leaderIdentity,
        characterId: id,
        birthName: candidate.name,
        sex: candidate.sex,
        birthplaceId: entityId(source.location.siteId),
        bornAt: birthTick(
          (BigInt(context.atTick) - BigInt(ageDays) * BigInt(COMPANY_RULES.ticksPerDay)).toString(),
        ),
      },
      candidateSkills,
      selected ? 'PAID' : null,
    );
    if (selected) {
      addGear(id, template.gearIds);
      signings.push({ characterId: id, amountQ: q(profile.signingCrowns) });
    }
  }
  for (const relative of source.relatives) {
    requireLifecycle(family.ageDays !== undefined, 'INVALID_SOURCE');
    addPerson(
      {
        ...leaderIdentity,
        characterId: entityId(relative.characterId),
        birthName: relative.name,
        sex: relative.sex,
        birthplaceId: entityId(source.location.siteId),
        bornAt: birthTick(
          (
            BigInt(context.atTick) -
            BigInt(family.ageDays) * BigInt(COMPANY_RULES.ticksPerDay)
          ).toString(),
        ),
      },
      {},
      null,
    );
  }
  for (const item of profile.sharedItems)
    items.push({
      ...item,
      id: lifecycleId(source.id, 'shared', item.definitionId),
      holderId: source.partyId,
      ownerCompanyId: state.companyId,
    });
  const started = event(command.commandId, 'CompanyStarted', context.atTick, [leaderId]);
  const assets: OpeningAssets = {
    cashQ: q(origin.cashCrowns),
    serviceTerms: memberships
      .filter((m) => m.basis === 'PAID')
      .map((m) => ({ membershipId: m.membershipId, dailyWageMilli: profile.dailyWageMilli })),
    signingCharges: signings,
    items,
    debt: origin.debtCrowns
      ? { recipientId: source.providerId, amountQ: q(origin.debtCrowns) }
      : null,
    contactReaction: {
      contactId: source.contactId,
      respect: origin.contactRespect,
      rivalry: origin.contactRivalry,
    },
    hookId: origin.hookId,
  };
  return {
    next: {
      ...state,
      company: {
        companyId: state.companyId,
        worldId: state.worldId,
        founderId: leaderId,
        currentLeaderId: leaderId,
        actingLeaderId: null,
        designatedHeirId: null,
        regencyHeirId: null,
        householdIds: source.relatives.map((r) => entityId<'Character'>(r.characterId)),
        name: input.name,
        bannerId: input.bannerId,
        homeLocationId: entityId(input.homelandId),
        runStatus: 'ACTIVE',
        chronicleIds: [started.id],
      },
      characters: [...state.characters, ...identities],
      memberships: [...state.memberships, ...memberships],
      parties: [...state.parties, { partyId, location: source.location }],
      kinship: [
        ...state.kinship,
        ...source.relatives.map((r) => ({
          from: leaderId,
          to: entityId<'Character'>(r.characterId),
          kind: 'SIBLING' as const,
        })),
      ],
    },
    events: [started],
    requirements: [{ kind: 'OPENING_ASSETS', assets }],
  };
}
