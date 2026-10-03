import { randomInt, randomUUID } from 'node:crypto';

import {
  COMPANY_CATALOGUE,
  birthTick,
  campaignTick,
  canonicalRevision,
  createCombatEncounterApplication,
  createCompanyEconomyState,
  createCompanyLearningState,
  createCompanyPhysicalState,
  createSocialState,
  entityId,
  moneyQ,
  publicRevision,
} from '@warwrit/game-core';
import type {
  CampaignTick,
  CompanyCombatAggregateState,
  LifecycleCharacter,
  OpeningEvidence,
} from '@warwrit/game-core';
import { MAIN_WORLD_ID } from '@warwrit/protocol';

const startTick = campaignTick('0');
const location = { kind: 'AT' as const, siteId: 'severny-dvor', areaId: 'severny-dvor-yard' };
const contactId = 'local-village-steward';
const providerId = 'village-provisioner';
const openingCandidates = [
  { templateId: 'front', name: 'Rell', sex: 'male' },
  { templateId: 'reach', name: 'Mora', sex: 'female' },
  { templateId: 'support', name: 'Kest', sex: 'male' },
] as const;

export interface IssuedOpeningOption {
  readonly evidence: OpeningEvidence;
  readonly expiresAt: Date;
}

export function issueOpeningOption(
  now = new Date(),
  worldId: string = MAIN_WORLD_ID,
  atTick: CampaignTick = startTick,
): IssuedOpeningOption {
  const id = randomUUID();
  const companyId = randomUUID();
  const evidence: OpeningEvidence = {
    id,
    companyId,
    worldId,
    revision: canonicalRevision('0'),
    sourceEventId: randomUUID(),
    atTick,
    kind: 'OPENING',
    profileId: 'm1-company-start',
    originId: 'broken-company',
    familyStoryId: 'no-present-kin',
    cultureId: 'north',
    location,
    birthplaceIds: ['kamenny-brod', 'bereznyak', 'tikhaya-gat', 'severny-dvor'],
    leaderId: randomUUID(),
    partyId: randomUUID(),
    seed: randomInt(1, 2_147_483_647),
    candidates: openingCandidates.map((candidate) => ({
      ...candidate,
      characterId: randomUUID(),
    })),
    relatives: [],
    contactId,
    providerId,
  };
  return { evidence, expiresAt: new Date(now.getTime() + 15 * 60 * 1000) };
}

export function openingOptionView(evidence: OpeningEvidence) {
  const speciesId = COMPANY_CATALOGUE.species.find((entry) => entry.enabled)?.id;
  if (speciesId === undefined) throw new Error('Opening species catalogue is unavailable');
  return {
    schemaVersion: 1 as const,
    opening: {
      candidateSetId: evidence.id,
      companyId: evidence.companyId,
      origin: { id: evidence.originId, label: 'Разорившаяся дружина' },
      culture: { id: evidence.cultureId, label: 'Северная культура' },
      homeland: { id: evidence.location.siteId, label: 'Северный Двор' },
      familyStory: { id: evidence.familyStoryId, label: 'Без близких рядом' },
      bannerId: evidence.originId,
      selection: { minCount: 1 as const, maxCount: 2 as const },
      availability: { allCanonicalPlayerChoicesOpen: false as const },
      leaderDefaults: {
        sex: 'male',
        birthCultureId: evidence.cultureId,
        birthplaceId: evidence.location.siteId,
        originId: evidence.originId,
        speciesId,
        bornAt: '-10000000',
      },
      candidates: evidence.candidates.map((candidate) => ({
        characterId: candidate.characterId,
        name: candidate.name,
        sex: candidate.sex,
        templateId: candidate.templateId,
      })),
    },
  };
}

function worldCharacter(
  characterId: string,
  birthName: string,
  siteId = location.siteId,
  areaId = location.areaId,
): LifecycleCharacter {
  const home = { kind: 'AT' as const, siteId, areaId };
  return {
    identity: {
      characterId: entityId<'Character'>(characterId),
      birthName,
      sex: 'male',
      birthCultureId: entityId('north'),
      birthplaceId: entityId(siteId),
      originId: entityId('broken-company'),
      speciesId: entityId('human'),
      bornAt: birthTick('-10000000'),
    },
    presence: {
      characterId: entityId<'Character'>(characterId),
      location: home,
      availability: 'AVAILABLE',
      assignment: 'NONE',
      fieldPartyId: null,
      encounterBindingId: null,
    },
    skills: {},
    aptitudeBySkill: {},
    perks: [],
    conditionIds: [],
  };
}

export function createOpeningAggregate(
  evidence: OpeningEvidence,
  selectedCandidateIds: readonly string[],
): CompanyCombatAggregateState {
  const lifecycle = {
    schemaVersion: 1 as const,
    worldId: entityId<'World'>(evidence.worldId),
    companyId: entityId<'Company'>(evidence.companyId),
    campaignTick: evidence.atTick,
    revision: canonicalRevision('0'),
    company: null,
    characters: [
      worldCharacter(evidence.contactId, 'Сельский староста'),
      worldCharacter(evidence.providerId, 'Сельский поставщик', 'bereznyak', 'bereznyak-green'),
    ],
    memberships: [],
    kinship: [],
    parties: [],
    bypasses: [],
    applied: [],
    knowledge: {
      revision: publicRevision('0'),
      leaderId: null,
      designatedHeirId: null,
      runStatus: 'UNKNOWN' as const,
      characters: [],
      candidateIds: [],
      eventIds: [],
    },
  };
  const purseWalletId = `${evidence.id}:company-purse`;
  const signingWallets = [evidence.leaderId, ...selectedCandidateIds].map((characterId) => ({
    walletId: `${evidence.id}:wallet:${characterId}`,
    owner: { kind: 'CHARACTER' as const, id: characterId },
    location: evidence.location,
    cashQ: moneyQ('0'),
  }));
  const economy = createCompanyEconomyState(
    lifecycle,
    [
      {
        walletId: purseWalletId,
        owner: { kind: 'COMPANY', id: evidence.companyId },
        location: evidence.location,
        cashQ: moneyQ('0'),
      },
      ...signingWallets,
    ],
    [{ poolId: 'local', walletId: purseWalletId }],
  );
  return {
    economy: { ...economy, physical: createCompanyPhysicalState(lifecycle) },
    learning: createCompanyLearningState(),
    social: createSocialState(),
    encounter: createCombatEncounterApplication(),
  };
}
