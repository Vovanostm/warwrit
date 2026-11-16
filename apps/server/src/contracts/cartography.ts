import {
  canonicalJson,
  HUNT_PROFILES,
  PAINTED_ATLAS_REGION,
  PAINTED_ATLAS_SITES,
  type HuntProfile,
} from '@warwrit/game-core';
import type { Transaction } from 'kysely';
import type { DatabaseSchema } from '../db/database.js';
import { PAINTED_GAME_WORLD_ID } from '../world/map-context.js';
import {
  cartographyIdentity,
  knownSiteSnapshot,
  sightField,
} from '../world-lab/cartography-field.js';
import {
  grantCompanyMap,
  readCompanyMapGrants,
  registerCartographyMap,
} from '../world-lab/cartography-store.js';
import { huntTerms } from './first-hunt-runtime.js';

/** The accepting company learns the destination, with no terrain or current sight grant. */
export async function grantHuntObjective(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  profile: HuntProfile,
  grantedAt: Date,
): Promise<void> {
  if (worldId !== PAINTED_GAME_WORLD_ID) return;
  const site = PAINTED_ATLAS_SITES.find(
    (entry) => entry.siteId === profile.objectiveLocation.siteId,
  );
  if (!site) throw new TypeError('Hunt objective is missing from the painted atlas');
  const identity = cartographyIdentity(worldId, companyId);
  const mapId = `hunt.objective.${profile.profileId}`;
  const edition = `${PAINTED_ATLAS_REGION.mapEdition}.marker-v1`;
  await registerCartographyMap(transaction, {
    mapId,
    edition,
    regionId: identity.regionId,
    gridEdition: identity.gridEdition,
    columns: sightField.columns,
    rows: sightField.rows,
    originXQ: String(sightField.origin.xFp * 65_536),
    originZQ: String(sightField.origin.zFp * 65_536),
    cellSizeFp: String(sightField.cellSizeFp),
    coverageSnapshot: new Uint8Array(Math.ceil((sightField.columns * sightField.rows) / 8)),
    siteSnapshot: [knownSiteSnapshot(site)],
  });
  await grantCompanyMap(transaction, {
    worldId,
    companyId,
    sourceRef: `hunt.objective:${profile.instanceId}`,
    mapId,
    edition,
    sourceKind: 'QUEST_MARKER',
    receiptId: null,
    grantedAt,
  });
}

/** Existing saves acquire the same knowledge from their accepted, server-owned terms. */
export async function grantAcceptedHuntObjectives(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string,
  grantedAt: Date,
): Promise<void> {
  const contracts = await transaction
    .selectFrom('contract_instances')
    .select(['instance_id', 'profile_id', 'terms'])
    .where('world_id', '=', worldId)
    .where((expression) =>
      expression.or([
        expression('owner_company_id', '=', companyId),
        expression('helper_company_id', '=', companyId),
      ]),
    )
    .execute();
  const grants = await readCompanyMapGrants(transaction, worldId, companyId);
  for (const contract of contracts) {
    if (grants.some((grant) => grant.sourceRef === `hunt.objective:${contract.instance_id}`))
      continue;
    const profile = HUNT_PROFILES.find(
      (entry) =>
        entry.instanceId === contract.instance_id && entry.profileId === contract.profile_id,
    );
    if (profile && canonicalJson(contract.terms) === canonicalJson(huntTerms(profile)))
      await grantHuntObjective(transaction, worldId, companyId, profile, grantedAt);
  }
}
