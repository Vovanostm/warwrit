import {
  PAINTED_ATLAS_REGION,
  PAINTED_ATLAS_SHEET,
  PAINTED_ATLAS_SITES,
  mergeExploredBits,
  sightHasCell,
  worldSightCells,
  worldSightIndex,
  type PointFp,
} from '@warwrit/game-core';
import type {
  WorldFreeMovementV2ResponseDto,
  WorldFreeMovementTargetDto,
  WorldLabCartographyDto,
  WorldLabKnownSiteDto,
} from '@warwrit/protocol';
import type { Transaction } from 'kysely';
import type { DatabaseSchema } from '../db/database.js';
import type { WorldClockReading } from '../world/clock.js';
import type { WorldLabFixture } from './model.js';
import {
  ensureCompanyCartography,
  registerCartographyMap,
  grantCompanyMap,
  readCompanyCartography,
  readCompanyMapGrants,
  type CartographyMapManifest,
} from './cartography-store.js';
import {
  cartographyIdentity,
  knownSiteSnapshot,
  sightField,
  worldSightConditionsAt,
} from './cartography-field.js';
import { persistWorldLabExploration } from './cartography-progress.js';

const WORLD_LAB_TILE_SIZE = 384;

function distanceToSegment(p: PointFp, a: PointFp, b: PointFp): number {
  const dx = b.xFp - a.xFp,
    dz = b.zFp - a.zFp;
  const t = Math.max(
    0,
    Math.min(1, ((p.xFp - a.xFp) * dx + (p.zFp - a.zFp) * dz) / (dx * dx + dz * dz || 1)),
  );
  return Math.hypot(p.xFp - a.xFp - t * dx, p.zFp - a.zFp - t * dz);
}

function homeChart(): CartographyMapManifest {
  const coverageSnapshot = new Uint8Array(Math.ceil((sightField.columns * sightField.rows) / 8));
  // Authored road strips, not a pathfinder query into unexplored geography.
  const roads = PAINTED_ATLAS_REGION.overlayShapes.filter((shape) =>
    /^center-(?:trunk-north|north-villages)-/u.test(shape.shapeId),
  );
  const homes = PAINTED_ATLAS_SITES.filter((site) =>
    ['bereznyak', 'kamenny-brod'].includes(site.siteId),
  );
  for (let index = 0; index < sightField.columns * sightField.rows; index++) {
    const point = {
      xFp: sightField.origin.xFp + ((index % sightField.columns) + 0.5) * sightField.cellSizeFp,
      zFp:
        sightField.origin.zFp +
        (Math.floor(index / sightField.columns) + 0.5) * sightField.cellSizeFp,
    };
    const known =
      homes.some(
        (site) => Math.hypot(point.xFp - site.anchorFp.xFp, point.zFp - site.anchorFp.zFp) <= 280,
      ) ||
      roads.some((road) =>
        road.stations
          ?.slice(1)
          .some((b, i) => distanceToSegment(point, road.stations![i]!, b) <= 96),
      );
    if (known) coverageSnapshot[index >>> 3]! |= 1 << (index & 7);
  }
  return {
    mapId: 'lab.porechye.home-chart',
    edition: '1',
    regionId: cartographyIdentity('', '').regionId,
    gridEdition: cartographyIdentity('', '').gridEdition,
    columns: sightField.columns,
    rows: sightField.rows,
    originXQ: String(sightField.origin.xFp * 65_536),
    originZQ: String(sightField.origin.zFp * 65_536),
    cellSizeFp: String(sightField.cellSizeFp),
    coverageSnapshot,
    siteSnapshot: PAINTED_ATLAS_SITES.filter((site) =>
      ['bereznyak', 'severny-dvor', 'kamenny-brod', 'tikhaya-gat'].includes(site.siteId),
    ).map(knownSiteSnapshot),
  };
}
const HOME_CHART = homeChart();

async function ensureWorldLabCartography(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  fixture: Pick<WorldLabFixture, 'companyId' | 'partyId'>,
  atMs: string,
) {
  await ensureCompanyCartography(transaction, cartographyIdentity(worldId, fixture.companyId));
  const grants = await readCompanyMapGrants(transaction, worldId, fixture.companyId);
  if (!grants.some((grant) => grant.sourceRef === 'lab.home-region')) {
    await registerCartographyMap(transaction, HOME_CHART);
    await grantCompanyMap(transaction, {
      worldId,
      companyId: fixture.companyId,
      sourceRef: 'lab.home-region',
      mapId: HOME_CHART.mapId,
      edition: HOME_CHART.edition,
      sourceKind: 'HOME',
      receiptId: null,
      grantedAt: new Date(Number(atMs)),
    });
  }
}

function knownSite(
  snapshot: Readonly<Record<string, unknown>>,
  source: 'CHART' | 'OBSERVED',
  visited: boolean,
): WorldLabKnownSiteDto {
  const point = snapshot['point'] as WorldLabKnownSiteDto['point'] | undefined;
  if (
    typeof snapshot['siteId'] !== 'string' ||
    typeof snapshot['name'] !== 'string' ||
    typeof snapshot['icon'] !== 'string' ||
    !point ||
    !/^-?\d+$/u.test(point.xMicroFp) ||
    !/^-?\d+$/u.test(point.zMicroFp)
  )
    throw new TypeError('Invalid stored map site');
  return {
    siteId: snapshot['siteId'],
    name: snapshot['name'],
    icon: snapshot['icon'],
    point: { ...point },
    source,
    visited,
  };
}

export async function readWorldLabCartography(
  transaction: Transaction<DatabaseSchema>,
  worldId: string,
  fixture: Pick<WorldLabFixture, 'companyId' | 'partyId'>,
  movement: WorldFreeMovementV2ResponseDto,
  clock: WorldClockReading,
): Promise<WorldLabCartographyDto> {
  await ensureWorldLabCartography(transaction, worldId, fixture, movement.serverTimeMs);
  await persistWorldLabExploration(transaction, fixture, worldId, movement, {
    ...clock,
    nowMs: movement.serverTimeMs,
  });
  const identity = cartographyIdentity(worldId, fixture.companyId);
  const stored = await readCompanyCartography(transaction, identity);
  let charted: Uint8Array = new Uint8Array(stored.exploredBits.length);
  const sites = new Map<string, WorldLabKnownSiteDto>();
  for (const grant of await readCompanyMapGrants(transaction, worldId, fixture.companyId)) {
    if (grant.regionId !== identity.regionId || grant.gridEdition !== identity.gridEdition)
      continue;
    if (grant.columns !== sightField.columns || grant.rows !== sightField.rows)
      throw new TypeError('Map grid mismatch');
    charted = mergeExploredBits(charted, grant.coverageSnapshot);
    for (const snapshot of grant.siteSnapshot) {
      const site = knownSite(snapshot, 'CHART', false);
      sites.set(site.siteId, {
        ...site,
        questMarker:
          grant.sourceKind === 'QUEST_MARKER' || sites.get(site.siteId)?.questMarker === true,
      });
    }
  }
  for (const observation of stored.places) {
    const site = knownSite(
      observation.knownSnapshot,
      'OBSERVED',
      observation.firstVisitedAt !== null,
    );
    sites.set(site.siteId, { ...site, questMarker: sites.get(site.siteId)?.questMarker === true });
  }
  const conditions = worldSightConditionsAt(clock.epochMs, movement.serverTimeMs);
  const visible = worldSightCells(
    sightField,
    {
      xFp: Number(movement.point.xMicroFp) / 65_536,
      zFp: Number(movement.point.zMicroFp) / 65_536,
    },
    conditions,
  );
  return {
    schemaVersion: 1,
    revision: stored.revision,
    regionId: identity.regionId,
    gridEdition: identity.gridEdition,
    weather: conditions.weather.toUpperCase() as WorldLabCartographyDto['weather'],
    sheet: {
      width: PAINTED_ATLAS_SHEET.width,
      height: PAINTED_ATLAS_SHEET.height,
      fpPerPixel: PAINTED_ATLAS_SHEET.fpPerPixel,
    },
    grid: {
      columns: sightField.columns,
      rows: sightField.rows,
      cellSizeFp: sightField.cellSizeFp,
      origin: { ...sightField.origin },
    },
    charted: Buffer.from(charted).toString('base64'),
    explored: stored.exploredBits.toString('base64'),
    visible: Buffer.from(visible).toString('base64'),
    sites: [...sites.values()].sort((a, b) =>
      a.siteId < b.siteId ? -1 : a.siteId > b.siteId ? 1 : 0,
    ),
    imageTileSize: WORLD_LAB_TILE_SIZE,
  };
}

function cartographyKnowsPoint(cartography: WorldLabCartographyDto, point: PointFp): boolean {
  const index = worldSightIndex(sightField, point);
  return (
    sightHasCell(Buffer.from(cartography.charted, 'base64'), index) ||
    sightHasCell(Buffer.from(cartography.explored, 'base64'), index)
  );
}

export function cartographyKnowsTarget(
  cartography: WorldLabCartographyDto,
  target: WorldFreeMovementTargetDto,
): boolean {
  return target.kind === 'SITE'
    ? cartography.sites.some((site) => site.siteId === target.siteId)
    : cartographyKnowsPoint(cartography, target);
}

function firstGridCrossing(position: number, delta: number, cell: number): number {
  if (delta === 0) return Infinity;
  const boundary = delta > 0 ? cell + 1 : cell;
  return (boundary - position) / delta;
}

/** Supercover traversal cannot skip a short diagonal excursion into an unknown cell. */
export function cartographyKnowsSegment(
  cartography: WorldLabCartographyDto,
  from: WorldFreeMovementV2ResponseDto['point'],
  to: WorldFreeMovementV2ResponseDto['point'],
): boolean {
  const { grid } = cartography;
  const charted = Buffer.from(cartography.charted, 'base64'),
    explored = Buffer.from(cartography.explored, 'base64');
  const known = (column: number, row: number) =>
    column >= 0 &&
    row >= 0 &&
    column < grid.columns &&
    row < grid.rows &&
    (sightHasCell(charted, row * grid.columns + column) ||
      sightHasCell(explored, row * grid.columns + column));
  const x = (Number(from.xMicroFp) / 65_536 - grid.origin.xFp) / grid.cellSizeFp;
  const z = (Number(from.zMicroFp) / 65_536 - grid.origin.zFp) / grid.cellSizeFp;
  const endX = (Number(to.xMicroFp) / 65_536 - grid.origin.xFp) / grid.cellSizeFp;
  const endZ = (Number(to.zMicroFp) / 65_536 - grid.origin.zFp) / grid.cellSizeFp;
  let column = Math.floor(x),
    row = Math.floor(z);
  const endColumn = Math.floor(endX),
    endRow = Math.floor(endZ);
  if (!known(column, row) || !known(endColumn, endRow)) return false;
  const dx = endX - x,
    dz = endZ - z,
    sx = Math.sign(dx),
    sz = Math.sign(dz);
  const stepX = 1 / Math.abs(dx),
    stepZ = 1 / Math.abs(dz);
  let nextX = firstGridCrossing(x, dx, column);
  let nextZ = firstGridCrossing(z, dz, row);
  const arrived = () => column === endColumn && row === endRow;
  for (let count = 0; !arrived(); count++) {
    if (count > grid.columns + grid.rows) return false;
    if (Math.abs(nextX - nextZ) < 1e-10) {
      if (!known(column + sx, row) || !known(column, row + sz)) return false;
      column += sx;
      row += sz;
      nextX += stepX;
      nextZ += stepZ;
    } else if (nextX < nextZ) {
      column += sx;
      nextX += stepX;
    } else {
      row += sz;
      nextZ += stepZ;
    }
    if (!known(column, row)) return false;
  }
  return true;
}
