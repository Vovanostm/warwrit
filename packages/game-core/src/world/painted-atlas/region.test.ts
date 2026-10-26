import { expect, it } from 'vitest';

import {
  buildNavigationField,
  findTravelPath,
  isContinuousPointWalkable,
} from '../continuous-movement.js';
import { continuousLocationPoint } from '../continuous-company.js';
import { CONTINUOUS_WORLD_REGION, isContinuousRegionVersion } from '../continuous-region.js';
import {
  PAINTED_ATLAS_REGION,
  PAINTED_ATLAS_SITES,
  paintedAtlasNearbySite,
  paintedAtlasPixel,
  paintedAtlasPoint,
} from './region.js';

// Match the server's one immutable compiled field per edition.
const field = buildNavigationField(PAINTED_ATLAS_REGION);

it('uses the rendered atlas frame and resolves its authored settlement zone', () => {
  const bereznyak = PAINTED_ATLAS_SITES.find((site) => site.siteId === 'bereznyak')!;
  const entrance = paintedAtlasPoint([1536 + 195, 1024 + 220]);

  expect(paintedAtlasPoint(paintedAtlasPixel(bereznyak.anchorFp))).toEqual(bereznyak.anchorFp);
  expect(paintedAtlasNearbySite(field, entrance)?.siteId).toBe('bereznyak');
  expect(
    paintedAtlasNearbySite(field, paintedAtlasPoint([1536 + 500, 1024 + 500])),
  ).toBeUndefined();
});

it('routes over the authored atlas bridges while keeping river water impassable', () => {
  const from = paintedAtlasPoint([450, 330]);
  const to = paintedAtlasPoint([4222, 2398]);
  const river = paintedAtlasPoint([600, 1604]);

  expect(isContinuousPointWalkable(field, river)).toBe(false);
  expect(findTravelPath(field, from, to)).toBeDefined();
});

it('maps company positions to the selected edition without crossing atlas frames', () => {
  const bereznyak = PAINTED_ATLAS_SITES.find((site) => site.siteId === 'bereznyak')!;
  const location = { kind: 'AT' as const, siteId: bereznyak.siteId, areaId: bereznyak.areaId };
  const expected = {
    xMicroFp: String(bereznyak.anchorFp.xFp * 65_536),
    zMicroFp: String(bereznyak.anchorFp.zFp * 65_536),
  };

  expect(continuousLocationPoint(location, PAINTED_ATLAS_REGION)).toEqual(expected);
  expect(isContinuousRegionVersion(PAINTED_ATLAS_REGION.mapEdition)).toBe(true);
  const insideBereznyakZone = paintedAtlasPoint([1536 + 200, 1024 + 220]);
  expect(
    continuousLocationPoint(
      {
        kind: 'TERRAIN',
        regionVersion: PAINTED_ATLAS_REGION.mapEdition,
        q: String(insideBereznyakZone.xFp * 65_536),
        r: String(insideBereznyakZone.zFp * 65_536),
      },
      PAINTED_ATLAS_REGION,
    ),
  ).toEqual({
    xMicroFp: String(insideBereznyakZone.xFp * 65_536),
    zMicroFp: String(insideBereznyakZone.zFp * 65_536),
  });
  expect(
    continuousLocationPoint(
      { kind: 'TERRAIN', regionVersion: PAINTED_ATLAS_REGION.mapEdition, q: '100', r: '200' },
      CONTINUOUS_WORLD_REGION,
    ),
  ).toBeUndefined();
  expect(
    continuousLocationPoint(
      { kind: 'TERRAIN', regionVersion: 'seroe-porechye-continuous-v4', q: '100', r: '200' },
      CONTINUOUS_WORLD_REGION,
    ),
  ).toEqual({ xMicroFp: '100', zMicroFp: '200' });
});
