import { readPaintedCartography } from './cartography.js';
import { PAINTED_GAME_WORLD_ID } from './map-context.js';
import {
  compareNavigationOverlays,
  CONTINUOUS_WORLD_REGION,
  FREE_MOVEMENT_V2_PROFILE,
} from '@warwrit/game-core';
import { HUNT_PROFILES, projectCompanyLifecycle, SEROE_PORECHYE } from '@warwrit/game-core';
import type { WorldSurroundingsDto } from '@warwrit/protocol';
import type { FastifyInstance } from 'fastify';
import type { Kysely, Transaction } from 'kysely';

import { resolveSessionAccount } from '../auth/session.js';
import type { DatabaseSchema } from '../db/database.js';
import { findOwnedCompanyId, loadCompanyAggregate } from '../company/repository.js';
import { readHuntWorldState, selectHuntWorldRow } from '../contracts/first-hunt-runtime.js';
import { readWorldClock, readWorldLight, type WorldClockReading } from './clock.js';

const MS_PER_TICK = '21600';
const PUBLIC_CONTINUOUS_MAP = {
  ...CONTINUOUS_WORLD_REGION,
  navigationOverlayOrder: [
    ...new Set(CONTINUOUS_WORLD_REGION.overlayShapes.map((shape) => shape.overlayId)),
  ].toSorted((a, b) =>
    compareNavigationOverlays(
      a,
      b,
      CONTINUOUS_WORLD_REGION.speedProfileId ?? FREE_MOVEMENT_V2_PROFILE,
    ),
  ),
};
const PUBLIC_MAP: WorldSurroundingsDto['map'] = {
  regionVersion: SEROE_PORECHYE.version,
  regionName: SEROE_PORECHYE.name,
  sites: SEROE_PORECHYE.sites.map((site) => ({
    siteId: site.siteId,
    name: site.name,
    kind: site.kind,
    q: site.coordinate.q,
    r: site.coordinate.r,
    danger: site.areas.some((area) => area.danger === 'DANGEROUS') ? 'DANGEROUS' : 'SAFE',
  })),
  edges: SEROE_PORECHYE.edges.map((edge) => ({
    edgeId: edge.edgeId,
    fromSiteId: edge.fromSiteId,
    toSiteId: edge.toSiteId,
    travelTicks: edge.provisionalTravelTicks,
    danger: edge.danger,
  })),
  walkBounds: SEROE_PORECHYE.walkBounds,
  terrainRows: SEROE_PORECHYE.terrainRows,
  blockedHexes: SEROE_PORECHYE.blockedHexes,
};
const TICKS_PER_DAY = '1000';

/**
 * Observer-lawful surroundings: a stationary party sees other companies whose
 * stationary parties stand at the same site at the same moment. Travelling
 * parties see none; no last-known or hidden position is ever disclosed.
 */
export function registerWorldSurroundingsRoute(
  app: FastifyInstance,
  options: { readonly database: Kysely<DatabaseSchema>; readonly worldId: string },
): void {
  const { database, worldId } = options;
  app.get('/world/surroundings', async (request, reply) => {
    const accountId = await resolveSessionAccount(request, database);
    if (accountId === undefined) return reply.code(401).send({ error: 'authentication required' });
    const body = await database.transaction().execute(async (transaction) => {
      const clock = await readWorldClock(transaction, worldId);
      const companyId = await findOwnedCompanyId(transaction, worldId, accountId);
      if (worldId === PAINTED_GAME_WORLD_ID && companyId === undefined) return null;
      const observerSiteId =
        companyId === undefined
          ? null
          : stationarySite(await loadCompanyAggregate(transaction, worldId, companyId));
      const observedCompanies = await readObservedCompanies(
        transaction,
        worldId,
        companyId,
        observerSiteId,
      );
      const observedHostiles = await readObservedHostiles(
        transaction,
        worldId,
        observerSiteId,
        clock,
      );
      const painted =
        worldId === PAINTED_GAME_WORLD_ID && companyId !== undefined
          ? await readPaintedCartography(transaction, worldId, accountId, companyId)
          : undefined;
      const response: WorldSurroundingsDto = {
        schemaVersion: 1,
        serverTimeMs: clock.nowMs,
        campaign: { tick: clock.tick, msPerTick: MS_PER_TICK, ticksPerDay: TICKS_PER_DAY },
        light: readWorldLight(clock),
        map: painted
          ? {
              regionVersion: painted.cartography.mapEdition,
              regionName: SEROE_PORECHYE.name,
              sites: PUBLIC_MAP.sites.filter((site) =>
                painted.cartography.sites.some((known) => known.siteId === site.siteId),
              ),
              edges: [],
              cartography: painted.cartography,
            }
          : { ...PUBLIC_MAP, continuous: PUBLIC_CONTINUOUS_MAP },
        observerSiteId,
        observedCompanies,
        observedHostiles,
      };
      return response;
    });
    if (body === null) return reply.code(403).send({ error: 'company required' });
    reply.header('cache-control', 'no-store');
    return body;
  });
}

async function readObservedCompanies(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  companyId: string | undefined,
  observerSiteId: string | null,
) {
  const observedCompanies: {
    readonly companyName: string;
    readonly siteId: string;
    readonly memberCount: number;
  }[] = [];
  if (observerSiteId !== null) {
    const others = await transaction
      .selectFrom('company_snapshots')
      .select('company_id')
      .where('world_id', '=', worldId)
      .where('company_id', '!=', companyId ?? '')
      .orderBy('company_id')
      .execute();
    for (const { company_id: otherId } of others) {
      const state = await loadCompanyAggregate(transaction, worldId, otherId);
      if (state === undefined) continue;
      const party = state.economy.lifecycle.parties.find(
        (entry) => entry.location.kind === 'AT' && entry.location.siteId === observerSiteId,
      );
      if (party === undefined) continue;
      const view = projectCompanyLifecycle(state.economy.lifecycle, otherId);
      observedCompanies.push({
        companyName: view?.companyPresentation?.name ?? 'Неизвестная компания',
        siteId: observerSiteId,
        memberCount: state.economy.lifecycle.characters.filter(
          (character) => character.presence.fieldPartyId === party.partyId,
        ).length,
      });
    }
  }
  return observedCompanies;
}

async function readObservedHostiles(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  observerSiteId: string | null,
  clock: WorldClockReading,
) {
  const observedHostiles: WorldSurroundingsDto['observedHostiles'][number][] = [];
  const night = readWorldLight(clock).phase === 'NIGHT';
  for (const hunt of HUNT_PROFILES) {
    // A night threat is seen only by a party standing there at night.
    if (hunt.objectiveLocation.siteId !== observerSiteId || (hunt.nightOnly && !night)) continue;
    const row = await selectHuntWorldRow(transaction, worldId, hunt, false);
    if (!row) continue;
    for (const hostile of readHuntWorldState(worldId, hunt, row).hostiles) {
      const health = hostile.currentPools['health'] ?? 0;
      if (health <= 0) continue;
      observedHostiles.push({
        entityId: hostile.entityId,
        siteId: observerSiteId,
        weaponItemId: hostile.weaponItemId,
        wounded: health < (hostile.initialPools['health'] ?? health),
      });
    }
  }
  return observedHostiles;
}

function stationarySite(state: Awaited<ReturnType<typeof loadCompanyAggregate>>): string | null {
  const parties = state?.economy.lifecycle.parties ?? [];
  if (parties.length !== 1) return null;
  const location = parties[0]?.location;
  return location?.kind === 'AT' ? location.siteId : null;
}
