import { createHash } from 'node:crypto';
import { sql, type Transaction } from 'kysely';
import {
  COMPANY_CATALOGUE,
  COMPANY_RULES,
  PHYSICAL_RULES,
  birthTick,
  entityId,
  initialSkillProgress,
  moneyQ,
  skillLevel,
} from '@warwrit/game-core';
import type {
  CompanyCombatAggregateState,
  LifecycleCharacter,
  PhysicalVitals,
  Wallet,
} from '@warwrit/game-core';
import type { DatabaseSchema } from '../db/database.js';

const RECRUIT_POOL_VERSION = 'local-recruit-pool-1';
export const RECRUIT_SIGNING_Q = moneyQ((50n * BigInt(COMPANY_RULES.moneyQPerCrown)).toString());
export const RECRUIT_DAILY_WAGE_MILLI = '10000';

export function recruitWageRates() {
  return COMPANY_RULES.economy.qualificationBands.map((band) => ({
    minimumLevel: band.level,
    dailyWageMilli: (
      (BigInt(RECRUIT_DAILY_WAGE_MILLI) * BigInt(band.multiplierBps)) /
      10_000n
    ).toString(),
  }));
}

const profiles = [
  {
    key: 'kamenny-brod-physician',
    siteId: 'kamenny-brod',
    areaId: 'kamenny-brod-market',
    name: 'Ратко',
    sex: 'male',
    templateId: 'support',
  },
  {
    key: 'bereznyak-guard',
    siteId: 'bereznyak',
    areaId: 'bereznyak-green',
    name: 'Релл',
    sex: 'male',
    templateId: 'front',
  },
  {
    key: 'tikhaya-gat-spearman',
    siteId: 'tikhaya-gat',
    areaId: 'tikhaya-gat-bank',
    name: 'Мора',
    sex: 'female',
    templateId: 'reach',
  },
] as const;

export interface StoredRecruitOffer {
  readonly world_id: string;
  readonly offer_id: string;
  readonly offer_revision: string;
  readonly site_id: string;
  readonly area_id: string;
  readonly character_id: string;
  readonly candidate: unknown;
  readonly vitals: unknown;
  readonly wallet: unknown;
  readonly consumed_company_id: string | null;
  readonly consumed_command_id: string | null;
  readonly consumed_at: Date | null;
}

function stableId(worldId: string, key: string): string {
  const hex = createHash('sha256')
    .update(`${RECRUIT_POOL_VERSION}:${worldId}:${key}`)
    .digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function offerGenesis(worldId: string, profile: (typeof profiles)[number]) {
  const characterId = stableId(worldId, `character:${profile.key}`);
  const offerId = stableId(worldId, `offer:${profile.key}`);
  const genesisId = stableId(worldId, `genesis:${profile.key}`);
  const template = COMPANY_CATALOGUE.candidateTemplates.find(
    (entry) => entry.id === profile.templateId,
  );
  const speciesId = COMPANY_CATALOGUE.species.find((entry) => entry.enabled)?.id;
  if (!template || !speciesId) throw new Error('Recruit genesis definitions are unavailable');
  const location = {
    kind: 'AT' as const,
    siteId: profile.siteId,
    areaId: profile.areaId,
  };
  const candidate: LifecycleCharacter = {
    identity: {
      characterId: entityId<'Character'>(characterId),
      birthName: profile.name,
      sex: profile.sex,
      birthCultureId: entityId('north'),
      birthplaceId: entityId(profile.siteId),
      originId: entityId('broken-company'),
      speciesId: entityId(speciesId),
      bornAt: birthTick('-10000000'),
    },
    presence: {
      characterId: entityId<'Character'>(characterId),
      location,
      availability: 'AVAILABLE',
      assignment: 'NONE',
      fieldPartyId: null,
      encounterBindingId: null,
    },
    skills: Object.fromEntries(
      template.skills.map((entry) => [entry.skillId, initialSkillProgress(entry.level, genesisId)]),
    ),
    aptitudeBySkill: Object.fromEntries(
      COMPANY_CATALOGUE.skills.filter((entry) => entry.enabled).map((entry) => [entry.id, 10000]),
    ),
    perks: [],
    conditionIds: [],
  };
  const vitals: PhysicalVitals = {
    characterId: entityId<'Character'>(characterId),
    sourceId: genesisId,
    maximumHealth: PHYSICAL_RULES.baseHealth,
    currentHealth: PHYSICAL_RULES.baseHealth,
    healthCarry: '0',
    maximumStamina: PHYSICAL_RULES.baseStamina,
    currentStamina: PHYSICAL_RULES.baseStamina,
    staminaCarry: '0',
    morale: PHYSICAL_RULES.openingMorale,
  };
  const wallet: Wallet = {
    walletId: stableId(worldId, `wallet:${profile.key}`),
    owner: { kind: 'CHARACTER', id: characterId },
    location,
    cashQ: moneyQ('0'),
  };
  return { offerId, characterId, genesisId, candidate, vitals, wallet, location };
}

export function localCompanyContacts(
  state: CompanyCombatAggregateState,
  companyId: string,
  location:
    { readonly kind: string; readonly siteId?: string; readonly areaId?: string } | undefined,
): string[] {
  if (location?.kind !== 'AT') return [];
  const lifecycle = state.economy.lifecycle;
  return lifecycle.characters
    .filter(
      (character) =>
        lifecycle.memberships.some(
          (membership) =>
            membership.companyId === companyId &&
            membership.characterId === character.identity.characterId &&
            membership.endedAt === null,
        ) &&
        character.presence.availability === 'AVAILABLE' &&
        character.presence.encounterBindingId === null &&
        character.presence.location.kind === 'AT' &&
        character.presence.location.siteId === location.siteId &&
        character.presence.location.areaId === location.areaId,
    )
    .map((character) => character.identity.characterId);
}

function isOfferHireRequest(requestKey: string, offerId: string): boolean {
  try {
    const request = JSON.parse(requestKey) as {
      readonly type?: unknown;
      readonly payload?: { readonly offerId?: unknown };
    } | null;
    return request?.type === 'Recruit' && request.payload?.offerId === offerId;
  } catch {
    return false;
  }
}

/** Idempotently materialize the finite world-owned pool, without touching a company root. */
export async function ensureWorldRecruitPool(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
): Promise<void> {
  for (const profile of profiles) {
    const genesis = offerGenesis(worldId, profile);
    const existing = await transaction
      .selectFrom('world_recruit_offers')
      .select('offer_id')
      .where('world_id', '=', worldId)
      .where('offer_id', '=', genesis.offerId)
      .executeTakeFirst();
    if (existing) continue;
    // Offer rows may be lost by migration rollback. Immutable accepted receipts
    // survive that rollback, including after a recruit leaves or dies.
    const possibleHires = await transaction
      .selectFrom('company_receipts')
      .select(['company_id', 'command_id', 'created_at', 'request_key'])
      .where('world_id', '=', worldId)
      .where('request_key', 'like', `%${genesis.offerId}%`)
      .where(sql<string>`response ->> 'ok'`, '=', 'true')
      .execute();
    const priorHires = possibleHires.filter((receipt) =>
      isOfferHireRequest(receipt.request_key, genesis.offerId),
    );
    if (priorHires.length > 1) throw new Error('Recruit offer has multiple accepted hires');
    const priorHire = priorHires[0];
    await transaction
      .insertInto('world_recruit_offers')
      .values({
        world_id: worldId,
        offer_id: genesis.offerId,
        offer_revision: '1',
        site_id: profile.siteId,
        area_id: profile.areaId,
        character_id: genesis.characterId,
        candidate: genesis.candidate,
        vitals: genesis.vitals,
        wallet: genesis.wallet,
        consumed_company_id: priorHire?.company_id ?? null,
        consumed_command_id: priorHire?.command_id ?? null,
        consumed_at: priorHire?.created_at ?? null,
      })
      .onConflict((conflict) => conflict.columns(['world_id', 'offer_id']).doNothing())
      .execute();
  }
}

export async function lockRecruitOffer(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  offerId: string,
): Promise<StoredRecruitOffer | undefined> {
  return transaction
    .selectFrom('world_recruit_offers')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('offer_id', '=', offerId)
    .forUpdate()
    .executeTakeFirst();
}

export async function readSiteRecruitOffers(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  siteId: string,
  areaId: string,
): Promise<readonly RecruitOfferView[]> {
  await ensureWorldRecruitPool(transaction, worldId);
  const rows = await transaction
    .selectFrom('world_recruit_offers')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('site_id', '=', siteId)
    .where('area_id', '=', areaId)
    .where('consumed_at', 'is', null)
    .orderBy('offer_id')
    .execute();
  return rows.map(projectRecruitOffer);
}

export interface RecruitOfferView {
  readonly offerId: string;
  readonly offerRevision: string;
  readonly characterId: string;
  readonly name: string;
  readonly skills: readonly { readonly skillId: string; readonly level: number }[];
  readonly aptitudes: readonly { readonly skillId: string; readonly valueBps: number }[];
  readonly health: { readonly current: number; readonly maximum: number };
  readonly stamina: { readonly current: number; readonly maximum: number };
  readonly conditions: readonly string[];
  readonly signingQ: string;
  readonly dailyWageMilli: string;
  readonly physician: boolean;
}

function projectRecruitOffer(row: StoredRecruitOffer): RecruitOfferView {
  const candidate = row.candidate as LifecycleCharacter;
  const vitals = row.vitals as PhysicalVitals;
  if (
    candidate.identity.characterId !== row.character_id ||
    vitals.characterId !== row.character_id ||
    vitals.maximumHealth <= 0 ||
    vitals.maximumStamina <= 0
  )
    throw new TypeError('Stored recruit genesis does not match its offer');
  const skills = Object.entries(candidate.skills)
    .map(([skillId, progress]) => ({ skillId, level: skillLevel(progress) }))
    .sort((a, b) => a.skillId.localeCompare(b.skillId));
  const aptitudes = Object.entries(candidate.aptitudeBySkill)
    .map(([skillId, valueBps]) => ({ skillId, valueBps }))
    .sort((a, b) => a.skillId.localeCompare(b.skillId));
  return {
    offerId: row.offer_id,
    offerRevision: row.offer_revision,
    characterId: row.character_id,
    name: candidate.identity.birthName,
    skills,
    aptitudes,
    health: { current: vitals.currentHealth, maximum: vitals.maximumHealth },
    stamina: { current: vitals.currentStamina, maximum: vitals.maximumStamina },
    conditions: [...candidate.conditionIds],
    signingQ: RECRUIT_SIGNING_Q,
    dailyWageMilli: RECRUIT_DAILY_WAGE_MILLI,
    physician: (candidate.skills['medicine'] ? skillLevel(candidate.skills['medicine']) : 0) > 0,
  };
}

/** Insert the world-owned genesis facts into a draft only inside the atomic hire transaction. */
export function attachRecruitGenesis(
  state: CompanyCombatAggregateState,
  row: StoredRecruitOffer,
): CompanyCombatAggregateState | undefined {
  const { lifecycle, finance, physical } = state.economy;
  if (
    lifecycle.worldId !== row.world_id ||
    row.consumed_at !== null ||
    lifecycle.characters.some((entry) => entry.identity.characterId === row.character_id) ||
    finance.wallets.some((entry) => entry.walletId === (row.wallet as Wallet).walletId) ||
    !physical
  )
    return undefined;
  const candidate = structuredClone(row.candidate as LifecycleCharacter);
  const vitals = structuredClone(row.vitals as PhysicalVitals);
  const wallet = structuredClone(row.wallet as Wallet);
  if (
    candidate.identity.characterId !== row.character_id ||
    candidate.presence.location.kind !== 'AT' ||
    candidate.presence.location.siteId !== row.site_id ||
    candidate.presence.location.areaId !== row.area_id ||
    vitals.characterId !== row.character_id ||
    wallet.owner.kind !== 'CHARACTER' ||
    wallet.owner.id !== row.character_id
  )
    return undefined;
  return {
    ...state,
    economy: {
      ...state.economy,
      lifecycle: { ...lifecycle, characters: [...lifecycle.characters, candidate] },
      finance: { ...finance, wallets: [...finance.wallets, wallet] },
      physical: { ...physical, vitals: [...physical.vitals, vitals] },
    },
  };
}
