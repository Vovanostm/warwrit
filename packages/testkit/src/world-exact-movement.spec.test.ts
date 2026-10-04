import { describe, expect, it } from 'vitest';
import {
  buildNavigationField,
  compileMovementPlan,
  continuousSurfaceAt,
  isContinuousPointWalkable,
  findTravelPath,
  positionAt,
  readContinuousMovementPlan,
  FREE_MOVEMENT_V3_PROFILE,
  CONTINUOUS_WORLD_REGION,
  type NavigationRegion,
  type PointFp,
} from '@warwrit/game-core';

const rect = (x1: number, z1: number, x2: number, z2: number) => [
  { xFp: x1, zFp: z1 },
  { xFp: x2, zFp: z1 },
  { xFp: x2, zFp: z2 },
  { xFp: x1, zFp: z2 },
];
const boundary = rect(-64, -64, 192, 192);
const region: NavigationRegion = {
  mapEdition: 'exact-fixture-v1',
  navigationVersion: 'polygon-v1',
  speedProfileId: FREE_MOVEMENT_V3_PROFILE,
  origin: { xFp: -64, zFp: -64 },
  columns: 4,
  rows: 4,
  cellSizeFp: 64,
  boundary,
  terrainShapes: [
    { shapeId: 'grass', terrainId: 'grassland', paintPriority: 0, polygon: boundary },
  ],
  overlayShapes: [{ shapeId: 'strip', overlayId: 'dirt_road', polygon: rect(20, 0, 44, 64) }],
  blockingShapes: [],
  dangerAreaShapes: [],
  sites: [],
};
const compile = (source: NavigationRegion, path: readonly PointFp[]) =>
  compileMovementPlan({
    field: buildNavigationField(source),
    path,
    movementEpoch: '1',
    startedAtMs: '1000',
    planId: 'exact-fixture',
  });

describe('polygon-owned movement', () => {
  it('prices a narrow road only within its physical banks, not the containing bucket', () => {
    expect(
      compile(region, [
        { xFp: 10, zFp: 8 },
        { xFp: 10, zFp: 56 },
      ]).totalDurationUs,
    ).toBe('2000000');
    expect(
      compile(region, [
        { xFp: 32, zFp: 8 },
        { xFp: 32, zFp: 56 },
      ]).totalDurationUs,
    ).toBe('1111112');
    const crossing = compile(region, [
      { xFp: 8, zFp: 32 },
      { xFp: 56, zFp: 32 },
    ]);
    expect(crossing.totalDurationUs).toBe('1555556');
    expect(
      crossing.speedSpans.map((s) => [s.overlayId, s.geometry?.fromT, s.geometry?.toT]),
    ).toEqual([
      [null, { numerator: '0', denominator: '1' }, { numerator: '1', denominator: '4' }],
      ['dirt_road', { numerator: '1', denominator: '4' }, { numerator: '3', denominator: '4' }],
      [null, { numerator: '3', denominator: '4' }, { numerator: '1', denominator: '1' }],
    ]);
    const field = buildNavigationField(region);
    expect(continuousSurfaceAt(field, { xFp: 19, zFp: 32 }).overlayId).toBeNull();
    expect(continuousSurfaceAt(field, { xFp: 20, zFp: 32 }).overlayId).toBe('dirt_road');
    expect(
      compile(region, [
        { xFp: 20, zFp: 8 },
        { xFp: 20, zFp: 56 },
      ]).totalDurationUs,
    ).toBe('1111112');
  });

  it('preserves nonrepresentable rational crossings through reload and rejects corrupt events', () => {
    const diagonal = {
      ...region,
      overlayShapes: [
        {
          shapeId: 'slanted',
          overlayId: 'dirt_road' as const,
          polygon: [
            { xFp: 20, zFp: 0 },
            { xFp: 44, zFp: 0 },
            { xFp: 45, zFp: 64 },
            { xFp: 21, zFp: 64 },
          ],
        },
      ],
    };
    const plan = compile(diagonal, [
      { xFp: 8, zFp: 10 },
      { xFp: 56, zFp: 41 },
    ]);
    // x=20+z/64: t=778/3041; intersection x is not an integer microFp.
    expect(plan.speedSpans[0]?.geometry?.toT).toEqual({ numerator: '778', denominator: '3041' });
    const reloaded = readContinuousMovementPlan(JSON.parse(JSON.stringify(plan)));
    expect(reloaded).toEqual(plan);
    for (const time of ['1000', '1450', '2000', '2400'])
      expect(positionAt(reloaded, time)).toEqual(positionAt(plan, time));
    const bad = JSON.parse(JSON.stringify(plan));
    bad.speedSpans[0].geometry.toT = { numerator: '1556', denominator: '6082' };
    expect(() => readContinuousMovementPlan(bad)).toThrow();
    bad.speedSpans[0].geometry.toT = { numerator: '778', denominator: '3041' };
    bad.speedSpans[1].geometry.segmentIndex = 1;
    expect(() => readContinuousMovementPlan(bad)).toThrow();
    const legacyRegion = { ...region };
    delete legacyRegion.navigationVersion;
    const old = compile(legacyRegion, [
      { xFp: 8, zFp: 32 },
      { xFp: 56, zFp: 32 },
    ]);
    expect(readContinuousMovementPlan(JSON.parse(JSON.stringify(old)))).toEqual(old);
    expect(() => readContinuousMovementPlan({ ...old, navigationVersion: 'polygon-v1' })).toThrow();
  });

  it('rejects clearance contact and impassable vertex contact but permits an exact thin bridge', () => {
    const blocker = { shapeId: 'block', polygon: rect(64, 0, 80, 64) };
    expect(() =>
      compile({ ...region, blockingShapes: [blocker] }, [
        { xFp: 40, zFp: 8 },
        { xFp: 40, zFp: 56 },
      ]),
    ).toThrow('NO_PATH');
    const cliff = {
      shapeId: 'cliff',
      terrainId: 'cliff' as const,
      paintPriority: 10,
      polygon: [
        { xFp: 32, zFp: 32 },
        { xFp: 40, zFp: 48 },
        { xFp: 24, zFp: 48 },
      ],
    };
    expect(() =>
      compile({ ...region, terrainShapes: [...region.terrainShapes, cliff] }, [
        { xFp: 8, zFp: 32 },
        { xFp: 56, zFp: 32 },
      ]),
    ).toThrow('NO_PATH');
    const water = {
      shapeId: 'water',
      terrainId: 'deep_water' as const,
      paintPriority: 10,
      polygon: rect(0, 0, 64, 64),
    };
    const bridge = {
      shapeId: 'bridge',
      overlayId: 'bridge' as const,
      polygon: rect(8, 0, 24, 64),
      stations: [
        { xFp: 16, zFp: 0 },
        { xFp: 16, zFp: 64 },
      ],
    };
    const source = {
      ...region,
      terrainShapes: [...region.terrainShapes, water],
      overlayShapes: [bridge],
    };
    const field = buildNavigationField(source);
    expect(isContinuousPointWalkable(field, { xFp: 16, zFp: 32 })).toBe(true);
    expect(findTravelPath(field, { xFp: 16, zFp: -8 }, { xFp: 16, zFp: 72 })).toBeDefined();
    expect(
      compile(source, [
        { xFp: 16, zFp: -8 },
        { xFp: 16, zFp: 72 },
      ]).speedSpans.map((s) => s.overlayId),
    ).toEqual([null, 'bridge', null]);
  });

  it('chooses a genuinely faster detour and keeps free field shortcuts when the road loses', () => {
    const bounds = rect(-64, -64, 1088, 512);
    const source: NavigationRegion = {
      ...region,
      origin: { xFp: -64, zFp: -64 },
      columns: 18,
      rows: 9,
      boundary: bounds,
      terrainShapes: [
        { shapeId: 'grass', terrainId: 'grassland', paintPriority: 0, polygon: bounds },
      ],
      overlayShapes: [
        {
          shapeId: 'detour',
          overlayId: 'paved_road',
          polygon: rect(0, 176, 1024, 224),
          stations: [
            { xFp: 0, zFp: 200 },
            { xFp: 256, zFp: 200 },
            { xFp: 512, zFp: 200 },
            { xFp: 768, zFp: 200 },
            { xFp: 1024, zFp: 200 },
          ],
        },
      ],
    };
    const start = { xFp: 96, zFp: 96 },
      goal = { xFp: 928, zFp: 96 };
    const path = findTravelPath(buildNavigationField(source), start, goal)!;
    expect(BigInt(compile(source, path).totalDurationUs)).toBeLessThan(
      BigInt(compile(source, [start, goal]).totalDurationUs),
    );
    expect(compile(source, path).speedSpans.some((s) => s.overlayId === 'paved_road')).toBe(true);
    const slower = {
      ...source,
      overlayShapes: [
        {
          ...source.overlayShapes[0]!,
          overlayId: 'trail' as const,
          polygon: rect(0, 400, 1024, 448),
          stations: [
            { xFp: 0, zFp: 424 },
            { xFp: 1024, zFp: 424 },
          ],
        },
      ],
    };
    expect(findTravelPath(buildNavigationField(slower), start, goal)).toEqual([start, goal]);
  });

  it('retains a sliver and danger contact when neither the cell centre nor corners cover them', () => {
    const source = {
      ...region,
      overlayShapes: [
        { shapeId: 'thin', overlayId: 'dirt_road' as const, polygon: rect(8, 8, 12, 24) },
      ],
      dangerAreaShapes: [{ areaId: 'small-danger', polygon: rect(8, 8, 12, 24) }],
    };
    const plan = compile(source, [
      { xFp: 0, zFp: 16 },
      { xFp: 48, zFp: 16 },
    ]);
    expect(plan.speedSpans.map((s) => s.overlayId)).toEqual([null, 'dirt_road', null]);
    expect(plan.speedSpans[1]?.from).toEqual({
      xMicroFp: String(8 * 65536),
      zMicroFp: String(16 * 65536),
    });
    expect(plan.speedSpans[1]?.to).toEqual({
      xMicroFp: String(12 * 65536),
      zMicroFp: String(16 * 65536),
    });
    expect(plan.dangerAreaIds).toEqual(['small-danger']);
    const point = { xFp: 32, zFp: 32 };
    const blocked = buildNavigationField({
      ...region,
      blockingShapes: [{ shapeId: 'near-edge', polygon: rect(64, 0, 80, 64) }],
    });
    expect(blocked.walkable[5]).toBe(true);
    expect(isContinuousPointWalkable(blocked, point)).toBe(true);
  });

  it('keeps the previously reproduced phantom-bonus point outside every current road', () => {
    expect(
      continuousSurfaceAt(buildNavigationField(CONTINUOUS_WORLD_REGION), {
        xFp: Math.round(554.88 * 65536) / 65536,
        zFp: Math.round(-85.12 * 65536) / 65536,
      }).overlayId,
    ).toBeNull();
  });
});
