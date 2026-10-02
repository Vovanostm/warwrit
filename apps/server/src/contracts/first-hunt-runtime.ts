import { createHash } from 'node:crypto';
import { canonicalJson, createRandomState } from '@warwrit/game-core';
import type { FirstHuntTermsDto } from '@warwrit/protocol';
import type { Kysely, Transaction } from 'kysely';

import {
  FIRST_HUNT_INSTANCE_ID,
  HUNT_PROFILES,
  huntProfile,
  type HuntProfile,
} from '@warwrit/game-core';
import type { DatabaseSchema } from '../db/database.js';

const FIRST_HUNT = huntProfile(FIRST_HUNT_INSTANCE_ID)!;

function genesisSourceId(profile: HuntProfile): string {
  return profile === FIRST_HUNT
    ? 'first-hunt-world-genesis-v1'
    : `hunt-world-genesis-v1:${profile.instanceId}`;
}

/** Immutable offered terms of a hunt; their digest binds every acceptance. */
export function huntTerms(profile: HuntProfile): FirstHuntTermsDto {
  return Object.freeze({
    profileId: profile.profileId,
    issuerId: profile.issuerId,
    issuerLocation: profile.issuerLocation,
    objectiveLocation: profile.objectiveLocation,
    rewardQ: profile.rewardQ,
    claimPolicy: 'UNIQUE_CURRENT_BEARER',
    maximumHelpers: 1,
  });
}

export const FIRST_HUNT_TERMS: FirstHuntTermsDto = huntTerms(FIRST_HUNT);

export interface FirstHuntWorldState {
  readonly worldId: string;
  readonly instanceId: string;
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

export function huntSeed(worldId: string, profile: HuntProfile = FIRST_HUNT): number {
  const digest = createHash('sha256')
    .update(
      JSON.stringify([
        'warwrit:first-hunt:seed:v1',
        worldId,
        profile.profileId,
        profile.instanceId,
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
    for (const profile of HUNT_PROFILES)
      await ensureHuntGenesisInTransaction(transaction, worldId, profile);
  });
}

export function ensureFirstHuntGenesisInTransaction(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
): Promise<FirstHuntWorldState> {
  return ensureHuntGenesisInTransaction(transaction, worldId, FIRST_HUNT);
}

/** Raw world row of a hunt: FIRST HUNT keeps its original table, later hunts their own. */
export async function selectHuntWorldRow(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  profile: HuntProfile,
  lock = true,
): Promise<Record<string, unknown> | undefined> {
  if (profile === FIRST_HUNT) {
    let query = transaction
      .selectFrom('world_first_hunt_state')
      .selectAll()
      .where('world_id', '=', worldId);
    if (lock) query = query.forUpdate();
    return query.executeTakeFirst();
  }
  let query = transaction
    .selectFrom('world_hunt_states')
    .selectAll()
    .where('world_id', '=', worldId)
    .where('instance_id', '=', profile.instanceId);
  if (lock) query = query.forUpdate();
  return query.executeTakeFirst();
}

/** Compare-and-set the hunt's wallet and hostiles at the observed revision. */
export async function updateHuntWorldRow(
  transaction: Transaction<DatabaseSchema>,
  world: FirstHuntWorldState,
  next: {
    readonly revision: string;
    readonly walletQ?: string;
    readonly hostiles?: readonly FirstHuntHostileState[];
  },
): Promise<void> {
  const profile = huntProfile(world.instanceId)!;
  const values = {
    revision: next.revision,
    ...(next.walletQ === undefined ? {} : { wallet_q: next.walletQ }),
    ...(next.hostiles === undefined ? {} : { hostiles: canonicalJson(next.hostiles) }),
  };
  const updated =
    profile === FIRST_HUNT
      ? await transaction
          .updateTable('world_first_hunt_state')
          .set(values)
          .where('world_id', '=', world.worldId)
          .where('revision', '=', world.revision)
          .executeTakeFirst()
      : await transaction
          .updateTable('world_hunt_states')
          .set(values)
          .where('world_id', '=', world.worldId)
          .where('instance_id', '=', profile.instanceId)
          .where('revision', '=', world.revision)
          .executeTakeFirst();
  if (Number(updated.numUpdatedRows) !== 1) throw new Error('Hunt world state CAS failed');
}

export async function ensureHuntGenesisInTransaction(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  profile: HuntProfile,
): Promise<FirstHuntWorldState> {
  // contract_instances rows reference the FIRST HUNT world row, so it always exists first.
  if (profile !== FIRST_HUNT)
    await ensureHuntGenesisInTransaction(transaction, worldId, FIRST_HUNT);
  const terms = huntTerms(profile);
  const hostileGenesis = canonicalJson(
    profile.hostiles.map((hostile) => ({ ...hostile, currentPools: hostile.initialPools })),
  );
  const genesis = {
    world_id: worldId,
    schema_version: 1,
    profile_id: profile.profileId,
    genesis_source_id: genesisSourceId(profile),
    revision: '0',
    seed: String(huntSeed(worldId, profile)),
    issuer_id: profile.issuerId,
    issuer_area_id: profile.issuerLocation.areaId,
    wallet_id: profile.walletId,
    wallet_q: profile.genesisWalletQ,
    hostiles: hostileGenesis,
  };
  if (profile === FIRST_HUNT)
    await transaction
      .insertInto('world_first_hunt_state')
      .values(genesis)
      .onConflict((conflict) => conflict.column('world_id').doNothing())
      .execute();

  const termsDigest = createHash('sha256').update(canonicalJson(terms)).digest();
  await transaction
    .insertInto('contract_instances')
    .values({
      world_id: worldId,
      instance_id: profile.instanceId,
      profile_id: profile.profileId,
      terms,
      terms_digest: termsDigest,
      revision: '0',
      owner_company_id: null,
      helper_company_id: null,
      owner_join: null,
      helper_join: null,
    })
    .onConflict((conflict) => conflict.columns(['world_id', 'instance_id']).doNothing())
    .execute();
  if (profile !== FIRST_HUNT)
    await transaction
      .insertInto('world_hunt_states')
      .values({ ...genesis, instance_id: profile.instanceId })
      .onConflict((conflict) => conflict.columns(['world_id', 'instance_id']).doNothing())
      .execute();

  const world = await selectHuntWorldRow(transaction, worldId, profile);
  if (!world) throw new TypeError(`Hunt world genesis is unavailable for ${profile.instanceId}`);
  const contract = await transaction
    .selectFrom('contract_instances')
    .select(['profile_id', 'terms', 'terms_digest'])
    .where('world_id', '=', worldId)
    .where('instance_id', '=', profile.instanceId)
    .forUpdate()
    .executeTakeFirst();
  if (
    !contract ||
    contract.profile_id !== profile.profileId ||
    canonicalJson(contract.terms) !== canonicalJson(terms) ||
    !contract.terms_digest.equals(termsDigest)
  )
    throw new TypeError('Hunt immutable contract terms do not match the runtime profile');
  return readHuntWorldState(worldId, profile, world);
}

export function readFirstHuntWorldState(worldId: string, value: unknown): FirstHuntWorldState {
  return readHuntWorldState(worldId, FIRST_HUNT, value);
}

export function readHuntWorldState(
  worldId: string,
  profile: HuntProfile,
  value: unknown,
): FirstHuntWorldState {
  if (!isRecord(value)) throw new TypeError('Hunt world state is invalid');
  const hostiles = readHostiles(value['hostiles'], profile);
  const seed = Number(value['seed']);
  if (
    value['world_id'] !== worldId ||
    (profile !== FIRST_HUNT && value['instance_id'] !== profile.instanceId) ||
    value['schema_version'] !== 1 ||
    value['profile_id'] !== profile.profileId ||
    value['genesis_source_id'] !== genesisSourceId(profile) ||
    !isDecimal(value['revision']) ||
    !Number.isSafeInteger(seed) ||
    seed < 1 ||
    seed > 0xffff_ffff ||
    value['issuer_id'] !== profile.issuerId ||
    value['issuer_area_id'] !== profile.issuerLocation.areaId ||
    value['wallet_id'] !== profile.walletId ||
    !isDecimal(value['wallet_q'])
  )
    throw new TypeError('Hunt world state is outside the accepted runtime profile');
  return {
    worldId,
    instanceId: profile.instanceId,
    profileId: profile.profileId,
    revision: value['revision'],
    seed,
    issuerId: profile.issuerId,
    issuerAreaId: profile.issuerLocation.areaId,
    walletId: profile.walletId,
    walletQ: value['wallet_q'],
    hostiles,
  };
}

export function readHostiles(
  value: unknown,
  profile: HuntProfile = FIRST_HUNT,
): readonly FirstHuntHostileState[] {
  if (!Array.isArray(value) || value.length !== profile.hostiles.length)
    throw new TypeError('Hunt hostile state is invalid');
  const byId = new Map<string, FirstHuntHostileState>();
  for (const hostile of value) {
    if (!isRecord(hostile)) throw new TypeError('Hunt hostile state is invalid');
    const entityId = hostile['entityId'];
    if (typeof entityId !== 'string') throw new TypeError('Hunt hostile state is invalid');
    const genesis = profile.hostiles.find((entry) => entry.entityId === entityId);
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
      throw new TypeError('Hunt hostile state does not match its retained genesis');
    byId.set(entityId, hostile as unknown as FirstHuntHostileState);
  }
  return profile.hostiles.map((entry) => byId.get(entry.entityId)!);
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
