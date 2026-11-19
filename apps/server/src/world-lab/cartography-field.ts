import {
  PAINTED_ATLAS_REGION,
  buildNavigationField,
  createWorldSightField,
  type PaintedAtlasSite,
  type WorldSightConditions,
} from '@warwrit/game-core';

export const navigationField = buildNavigationField(PAINTED_ATLAS_REGION);
export const sightField = createWorldSightField(navigationField);
const LAB_REGION_ID = 'seroe-porechye';
const LAB_GRID_EDITION = `${PAINTED_ATLAS_REGION.mapEdition}.sight-v1`;

export function cartographyIdentity(worldId: string, companyId: string) {
  return {
    worldId,
    companyId,
    regionId: LAB_REGION_ID,
    gridEdition: LAB_GRID_EDITION,
    columns: sightField.columns,
    rows: sightField.rows,
  };
}

// Immutable, provisional lab weather. The browser cannot select past or current conditions.
export function worldSightConditionsAt(epochMs: string, atMs: string): WorldSightConditions {
  const offset = BigInt(atMs) - BigInt(epochMs);
  if (offset < 0n) throw new RangeError('Sight predates world genesis');
  return {
    time: offset % 900_000n < 600_000n ? 'day' : 'night',
    weather: ['clear', 'rain', 'fog'][
      Number((offset / 900_000n) % 3n)
    ] as WorldSightConditions['weather'],
  };
}

/** Exact phase changes; callers bound stationary history to one full weather cycle. */
export function worldSightConditionBoundaries(
  epochMs: string,
  fromMs: string,
  toMs: string,
): readonly string[] {
  const epoch = BigInt(epochMs),
    from = BigInt(fromMs),
    to = BigInt(toMs);
  if (from < epoch || to < from || to - from > 86_400_000n)
    throw new RangeError('Unbounded sight interval');
  const times: string[] = [];
  for (let cycle = (from - epoch) / 900_000n; epoch + cycle * 900_000n <= to; cycle++) {
    for (const offset of [0n, 600_000n]) {
      const at = epoch + cycle * 900_000n + offset;
      if (at > from && at <= to) times.push(at.toString());
    }
  }
  return times;
}

const siteIcons = [
  'village',
  'barn',
  'town',
  'village',
  'mill',
  'bridge',
  'ruins',
  'patrol',
  'burial',
  'water',
  'camp',
  'camp',
  'watchtower',
  'barn',
  'house',
  'livestock',
  'marsh',
  'bridge',
  'wood',
  'quarry',
  'boat',
  'marsh',
  'house',
  'wood',
  'pottery',
  'wood',
  'wildlife',
  'quarry',
  'house',
  'livestock',
  'wagon',
  'watchtower',
  'water',
  'forge',
] as const;
const namedIcons: Readonly<Record<string, string>> = {
  bereznyak: 'village',
  'severny-dvor': 'barn',
  'kamenny-brod': 'town',
  'tikhaya-gat': 'village',
  'staraya-melnitsa': 'mill',
};

export function knownSiteSnapshot(site: PaintedAtlasSite): Readonly<Record<string, unknown>> {
  const numericId = Number(site.siteId.replace('porechye-atlas-site-', ''));
  const icon = namedIcons[site.siteId] ?? siteIcons[numericId - 1];
  if (!icon) throw new TypeError('Missing server site symbol');
  return {
    siteId: site.siteId,
    name: site.name,
    icon,
    point: {
      xMicroFp: String(site.anchorFp.xFp * 65_536),
      zMicroFp: String(site.anchorFp.zFp * 65_536),
    },
  };
}
