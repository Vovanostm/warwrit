import { createHash } from 'node:crypto';
import { canonicalJson, createRandomState } from '@warwrit/game-core';
import type { FirstHuntTermsDto } from '@warwrit/protocol';
import type { Kysely, Transaction } from 'kysely';

import {
  FIRST_HUNT_ENCOUNTER_LOCATION,
  FIRST_HUNT_GENESIS_WALLET_Q,
  FIRST_HUNT_HOSTILE_GENESIS,
  FIRST_HUNT_INSTANCE_ID,
  FIRST_HUNT_ISSUER_ID,
  FIRST_HUNT_ISSUER_LOCATION,
  FIRST_HUNT_PROFILE_ID,
  FIRST_HUNT_REWARD_Q,
  FIRST_HUNT_WALLET_ID,
} from '@warwrit/game-core';
import type { DatabaseSchema } from '../db/database.js';

const GENESIS_SOURCE_ID = 'first-hunt-world-genesis-v1';

export const FIRST_HUNT_TERMS: FirstHuntTermsDto = Object.freeze({
  profileId: FIRST_HUNT_PROFILE_ID,
  issuerId: FIRST_HUNT_ISSUER_ID,
  issuerLocation: FIRST_HUNT_ISSUER_LOCATION,
  objectiveLocation: FIRST_HUNT_ENCOUNTER_LOCATION,
  rewardQ: FIRST_HUNT_REWARD_Q,
  claimPolicy: 'UNIQUE_CURRENT_BEARER',
  maximumHelpers: 1,
});

export interface FirstHuntWorldState {
  readonly worldId: string;
  readonly profileId: string;
  readonly revision: string;
  readonly seed: number;
  readonly issuerId: string;
  readonly issuerAreaId: string;
  readonly walletId: string;
  readonly walletQ: string;
  readonly hostiles: readonly FirstHuntHostileState[];
}

export interface FirstHuntHostileState {
  readonly entityId: string;
  readonly weaponItemId: string;
  readonly weaponId: string;
  readonly armorItemId: string;
  readonly position: { readonly q: number; readonly r: number };
  readonly attributes: Readonly<Record<string, number>>;
  readonly initialPools: Readonly<Record<string, number>>;
  readonly currentPools: Readonly<Record<string, number>>;
  readonly armorCondition: number;
  readonly weaponCondition: number;
  readonly doctrine: 'aggressive';
}

interface HostilePoolMaximums {
  readonly health: number;
  readonly armor: number;
  readonly stamina: number;
  readonly morale: number;
}

export function firstHuntSeed(worldId: string): number {
  const digest = createHash('sha256')
    .update(
      JSON.stringify([
        'warwrit:first-hunt:seed:v1',
        worldId,
        FIRST_HUNT_PROFILE_ID,
        FIRST_HUNT_INSTANCE_ID,
      ]),
      'utf8',
    )
    .digest();
  return createRandomState(digest.readUInt32BE(0)).value;
}

export async function ensureFirstHuntGenesis(
  database: Kysely<DatabaseSchema>,
  worldId: string,
): Promise<void> {
  await database.transaction().execute(async (transaction) => {
    await ensureFirstHuntGenesisInTransaction(transaction, worldId);
  });
}

export async function ensureFirstHuntGenesisInTransaction(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
): Promise<FirstHuntWorldState> {
  const hostileGenesis = FIRST_HUNT_HOSTILE_GENESIS.map((hostile) => ({
    ...hostile,
    currentPools: hostile.initialPools,
  }));
  await transaction
    .insertInto('world_first_hunt_state')
    .values({
      world_id: worldId,
      schema_version: 1,
      profile_id: FIRST_HUNT_PROFILE_ID,
      genesis_source_id: GENESIS_SOURCE_ID,
      revision: '0',
      seed: String(firstHuntSeed(worldId)),
      issuer_id: FIRST_HUNT_ISSUER_ID,
      issuer_area_id: FIRST_HUNT_ISSUER_LOCATION.areaId,
      wallet_id: FIRST_HUNT_WALLET_ID,
      wallet_q: FIRST_HUNT_GENESIS_WALLET_Q,
      hostiles: canonicalJson(hostileGenesis),
    })
    .onConflict((conflict) => conflict.column('world_id').doNothing())
    .execute();

  const world = await transaction
    .selectFrom('world_first_hunt_state')
    .selectAll()
    .where('world_id', '=', worldId)
    .forUpdate()
    .executeTakeFirst();
  if (!world) throw new TypeError('FIRST HUNT world genesis is unavailable');
  readFirstHuntWorldState(worldId, world);

  const termsDigest = createHash('sha256').update(canonicalJson(FIRST_HUNT_TERMS)).digest();
  await transaction
    .insertInto('contract_instances')
    .values({
      world_id: worldId,
      instance_id: FIRST_HUNT_INSTANCE_ID,
      profile_id: FIRST_HUNT_PROFILE_ID,
      terms: FIRST_HUNT_TERMS,
      terms_digest: termsDigest,
      revision: '0',
      owner_company_id: null,
      helper_company_id: null,
      owner_join: null,
      helper_join: null,
    })
    .onConflict((conflict) => conflict.columns(['world_id', 'instance_id']).doNothing())
    .execute();

  const contract = await transaction
    .selectFrom('contract_instances')
    .select(['profile_id', 'terms', 'terms_digest'])
    .where('world_id', '=', worldId)
    .where('instance_id', '=', FIRST_HUNT_INSTANCE_ID)
    .forUpdate()
    .executeTakeFirst();
  if (
    !contract ||
    contract.profile_id !== FIRST_HUNT_PROFILE_ID ||
    canonicalJson(contract.terms) !== canonicalJson(FIRST_HUNT_TERMS) ||
    !contract.terms_digest.equals(termsDigest)
  )
    throw new TypeError('FIRST HUNT immutable contract terms do not match the runtime profile');

  return readFirstHuntWorldState(worldId, world);
}

export function readFirstHuntWorldState(worldId: string, value: unknown): FirstHuntWorldState {
  if (!isRecord(value)) throw new TypeError('FIRST HUNT world state is invalid');
  const hostiles = readHostiles(value['hostiles']);
  const seed = Number(value['seed']);
  if (
    value['world_id'] !== worldId ||
    value['schema_version'] !== 1 ||
    value['profile_id'] !== FIRST_HUNT_PROFILE_ID ||
    value['genesis_source_id'] !== GENESIS_SOURCE_ID ||
    !isDecimal(value['revision']) ||
    !Number.isSafeInteger(seed) ||
    seed < 1 ||
    seed > 0xffff_ffff ||
    value['issuer_id'] !== FIRST_HUNT_ISSUER_ID ||
    value['issuer_area_id'] !== FIRST_HUNT_ISSUER_LOCATION.areaId ||
    value['wallet_id'] !== FIRST_HUNT_WALLET_ID ||
    !isDecimal(value['wallet_q'])
  )
    throw new TypeError('FIRST HUNT world state is outside the accepted runtime profile');
  return {
    worldId,
    profileId: FIRST_HUNT_PROFILE_ID,
    revision: value['revision'],
    seed,
    issuerId: FIRST_HUNT_ISSUER_ID,
    issuerAreaId: FIRST_HUNT_ISSUER_LOCATION.areaId,
    walletId: FIRST_HUNT_WALLET_ID,
    walletQ: value['wallet_q'],
    hostiles,
  };
}

export function readHostiles(value: unknown): readonly FirstHuntHostileState[] {
  if (!Array.isArray(value) || value.length !== FIRST_HUNT_HOSTILE_GENESIS.length)
    throw new TypeError('FIRST HUNT hostile state is invalid');
  const byId = new Map<string, FirstHuntHostileState>();
  for (const hostile of value) {
    if (!isRecord(hostile)) throw new TypeError('FIRST HUNT hostile state is invalid');
    const entityId = hostile['entityId'];
    if (typeof entityId !== 'string') throw new TypeError('FIRST HUNT hostile state is invalid');
    const genesis = FIRST_HUNT_HOSTILE_GENESIS.find((entry) => entry.entityId === entityId);
    if (
      !genesis ||
      byId.has(entityId) ||
      canonicalJson({
        entityId,
        weaponItemId: hostile['weaponItemId'],
        weaponId: hostile['weaponId'],
        armorItemId: hostile['armorItemId'],
        position: hostile['position'],
        attributes: hostile['attributes'],
        initialPools: hostile['initialPools'],
        armorCondition: hostile['armorCondition'],
        weaponCondition: hostile['weaponCondition'],
        doctrine: hostile['doctrine'],
      }) !==
        canonicalJson({
          entityId: genesis.entityId,
          weaponItemId: genesis.weaponItemId,
          weaponId: genesis.weaponId,
          armorItemId: genesis.armorItemId,
          position: genesis.position,
          attributes: genesis.attributes,
          initialPools: genesis.initialPools,
          armorCondition: genesis.armorCondition,
          weaponCondition: genesis.weaponCondition,
          doctrine: genesis.doctrine,
        }) ||
      !isPool(hostile['currentPools'], genesis.attributes)
    )
      throw new TypeError('FIRST HUNT hostile state does not match its retained genesis');
    byId.set(entityId, hostile as unknown as FirstHuntHostileState);
  }
  return FIRST_HUNT_HOSTILE_GENESIS.map((entry) => byId.get(entry.entityId)!);
}

function isPool(value: unknown, maximums: HostilePoolMaximums): boolean {
  if (!isRecord(value)) return false;
  const keys = ['armor', 'health', 'morale', 'stamina'] as const;
  return (
    Object.keys(value).toSorted().join('\0') === keys.toSorted().join('\0') &&
    keys.every(
      (key) =>
        typeof value[key] === 'number' &&
        Number.isSafeInteger(value[key]) &&
        Number(value[key]) >= 0 &&
        Number(value[key]) <= maximums[key]!,
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isDecimal(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value);
}
