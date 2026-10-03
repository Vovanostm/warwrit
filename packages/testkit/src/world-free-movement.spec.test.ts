import { describe, expect, it } from 'vitest';
import {
  FREE_MOVEMENT_PROFILE,
  SEROE_PORECHYE,
  acceptFreeMovement,
  findFreeMovementPath,
  freeMovementPositionAt,
  freeMovementTimeAtPosition,
  isWalkableHex,
  campaignTick,
  prepareFreeMovementStart,
  prepareFreeMovementStop,
  buildNavigationField,
  findTravelPath,
  compileMovementPlan,
  positionAt,
  CONTINUOUS_WORLD_REGION,
  FREE_MOVEMENT_V2_PROFILE,
  FREE_MOVEMENT_V3_PROFILE,
  readContinuousMovementPlan,
  type NavigationRegion,
} from '@warwrit/game-core';
import { economy } from './company-economy-fixture.js';

describe('authored free world movement', () => {
  it('keeps authored road junctions compatible and derives roads from versioned site edges', () => {
    const field = buildNavigationField(CONTINUOUS_WORLD_REGION);
    expect(field.region.overlayShapes.map((shape) => shape.shapeId).sort()).toEqual(
      SEROE_PORECHYE.edges.map((edge) => edge.edgeId).sort(),
    );
    const overlayAt = (xFp: number, zFp: number) => {
      const column = Math.floor((xFp - field.region.origin.xFp) / field.region.cellSizeFp);
      const row = Math.floor((zFp - field.region.origin.zFp) / field.region.cellSizeFp);
      return field.overlays[row * field.region.columns + column];
    };
    // The curve owns the speed band: its bend is fast, the abandoned straight shortcut is not.
    expect(overlayAt(160, -864)).toBe('paved_road');
    expect(overlayAt(544, -928)).toBeNull();
    const plan = compileMovementPlan({
      field,
      path: [
        { xFp: 160, zFp: -864 },
        { xFp: 160, zFp: -880 },
      ],
      movementEpoch: '1',
      startedAtMs: '0',
      planId: 'curved-road-speed',
    });
    expect(plan.totalDurationUs).toBe('333334');
    expect(plan.speedSpans[0]).toMatchObject({ overlayId: 'paved_road', speedPermille: 2000 });
  });

  it('chooses a faster road detour without smoothing away its advantage, and rejects a slower detour', () => {
    const boundary = [
      { xFp: 0, zFp: 0 },
      { xFp: 1024, zFp: 0 },
      { xFp: 1024, zFp: 448 },
      { xFp: 0, zFp: 448 },
    ];
    const region: NavigationRegion = {
      mapEdition: 'road-detour-v1',
      speedProfileId: FREE_MOVEMENT_V3_PROFILE,
      origin: { xFp: 0, zFp: 0 },
      columns: 16,
      rows: 7,
      cellSizeFp: 64,
      boundary,
      terrainShapes: [
        { shapeId: 'grass', terrainId: 'grassland', paintPriority: 0, polygon: boundary },
      ],
      overlayShapes: [
        {
          shapeId: 'detour',
          overlayId: 'paved_road',
          polygon: [
            { xFp: 0, zFp: 192 },
            { xFp: 1024, zFp: 192 },
            { xFp: 1024, zFp: 320 },
            { xFp: 0, zFp: 320 },
          ],
        },
      ],
      blockingShapes: [],
      dangerAreaShapes: [],
      sites: [],
    };
    const start = { xFp: 96, zFp: 96 },
      goal = { xFp: 928, zFp: 96 };
    const planFor = (
      field: ReturnType<typeof buildNavigationField>,
      path: readonly { xFp: number; zFp: number }[],
    ) =>
      compileMovementPlan({
        field,
        path,
        movementEpoch: '1',
        startedAtMs: '1000',
        planId: 'road-detour',
      });
    const field = buildNavigationField(region);
    const plan = planFor(field, findTravelPath(field, start, goal)!);
    const direct = planFor(field, [start, goal]);
    expect(plan.path.some((point) => BigInt(point.zMicroFp) > BigInt(start.zFp * 65536))).toBe(
      true,
    );
    expect(plan.speedSpans.some((span) => span.overlayId === 'paved_road')).toBe(true);
    expect(BigInt(plan.totalDurationUs)).toBeLessThan(BigInt(direct.totalDurationUs));
    expect(findTravelPath(field, start, goal)).toEqual(findTravelPath(field, start, goal));

    const remoteRoad = buildNavigationField({
      ...region,
      overlayShapes: [
        {
          ...region.overlayShapes[0]!,
          overlayId: 'trail',
          polygon: [
            { xFp: 0, zFp: 320 },
            { xFp: 1024, zFp: 320 },
            { xFp: 1024, zFp: 448 },
            { xFp: 0, zFp: 448 },
          ],
        },
      ],
    });
    expect(findTravelPath(remoteRoad, start, goal)).toEqual([start, goal]);
  });

  it('keeps each accepted speed profile frozen through reload and rejects cross-profile or unknown speeds', () => {
    const boundary = [
      { xFp: 0, zFp: 0 },
      { xFp: 256, zFp: 0 },
      { xFp: 256, zFp: 128 },
      { xFp: 0, zFp: 128 },
    ];
    const base: NavigationRegion = {
      mapEdition: 'profile-reload-v1',
      origin: { xFp: 0, zFp: 0 },
      columns: 4,
      rows: 2,
      cellSizeFp: 64,
      boundary,
      terrainShapes: [
        { shapeId: 'forest', terrainId: 'forest', paintPriority: 0, polygon: boundary },
      ],
      overlayShapes: [],
      blockingShapes: [],
      dangerAreaShapes: [],
      sites: [],
    };
    const makePlan = (region: NavigationRegion) =>
      compileMovementPlan({
        field: buildNavigationField(region),
        path: [
          { xFp: 32, zFp: 32 },
          { xFp: 224, zFp: 32 },
        ],
        movementEpoch: '1',
        startedAtMs: '1000',
        planId: 'profile-reload',
      });
    const oldPlan = makePlan({ ...base, speedProfileId: FREE_MOVEMENT_V2_PROFILE });
    const newPlan = makePlan({ ...base, speedProfileId: FREE_MOVEMENT_V3_PROFILE });
    for (const plan of [oldPlan, newPlan]) {
      const reloaded = readContinuousMovementPlan(JSON.parse(JSON.stringify(plan)));
      expect(reloaded).toEqual(plan);
      expect(positionAt(reloaded, '5000')).toEqual(positionAt(plan, '5000'));
    }
    expect(oldPlan.speedSpans[0]!.speedPermille).not.toBe(newPlan.speedSpans[0]!.speedPermille);
    expect(() =>
      readContinuousMovementPlan({ ...oldPlan, speedProfileId: FREE_MOVEMENT_V3_PROFILE }),
    ).toThrow();
    expect(() => readContinuousMovementPlan({ ...newPlan, speedProfileId: 'unknown' })).toThrow();
    expect(() =>
      readContinuousMovementPlan({
        ...newPlan,
        speedSpans: [{ ...newPlan.speedSpans[0]!, speedPermille: 100000 }],
      }),
    ).toThrow();

    const durationByOverlay = ['paved_road', 'dirt_road', 'trail', null].map((overlayId) =>
      BigInt(
        makePlan({
          ...base,
          speedProfileId: FREE_MOVEMENT_V3_PROFILE,
          overlayShapes:
            overlayId === null
              ? []
              : [
                  {
                    shapeId: 'road',
                    overlayId: overlayId as 'paved_road' | 'dirt_road' | 'trail',
                    polygon: boundary,
                  },
                ],
        }).totalDurationUs,
      ),
    );
    for (let i = 1; i < durationByOverlay.length; i++)
      expect(durationByOverlay[i]!).toBeGreaterThan(durationByOverlay[i - 1]!);

    const junction: NavigationRegion = {
      ...base,
      speedProfileId: FREE_MOVEMENT_V3_PROFILE,
      overlayShapes: ['trail', 'dirt_road', 'paved_road'].map((overlayId) => ({
        shapeId: overlayId,
        overlayId: overlayId as 'trail' | 'dirt_road' | 'paved_road',
        polygon: boundary,
      })),
    };
    const junctionPlan = makePlan(junction);
    expect(junctionPlan.speedSpans[0]).toMatchObject({
      overlayId: 'paved_road',
      speedPermille: 2000,
    });
    expect(makePlan({ ...junction, overlayShapes: [...junction.overlayShapes].reverse() })).toEqual(
      junctionPlan,
    );
    expect(
      makePlan({
        ...junction,
        overlayShapes: [
          ...junction.overlayShapes,
          { shapeId: 'bridge', overlayId: 'bridge', polygon: boundary },
        ],
      }).speedSpans[0],
    ).toMatchObject({ overlayId: 'bridge', speedPermille: 1800 });
  });

  it('traces exact microFp routes, terrain boundaries and forbidden supercover cells', () => {
    const boundary = [
      { xFp: -64, zFp: -64 },
      { xFp: 192, zFp: -64 },
      { xFp: 192, zFp: 128 },
      { xFp: -64, zFp: 128 },
    ];
    const road = [
      { xFp: 64, zFp: -64 },
      { xFp: 128, zFp: -64 },
      { xFp: 128, zFp: 128 },
      { xFp: 64, zFp: 128 },
    ];
    const field = buildNavigationField({
      mapEdition: 'exact-dda-v1',
      origin: { xFp: -64, zFp: -64 },
      columns: 4,
      rows: 3,
      cellSizeFp: 64,
      boundary,
      terrainShapes: [
        { shapeId: 'grass', terrainId: 'grassland', paintPriority: 0, polygon: boundary },
      ],
      overlayShapes: [{ shapeId: 'road', overlayId: 'road', polygon: road }],
      blockingShapes: [],
      dangerAreaShapes: [],
      sites: [],
    });
    const diagonal = findTravelPath(field, { xFp: 32, zFp: 16 }, { xFp: 96, zFp: 48 });
    expect(diagonal).toBeDefined();
    const plan = compileMovementPlan({
      field,
      path: diagonal!,
      movementEpoch: '1',
      startedAtMs: '1000',
      planId: 'exact-road-boundary',
    });
    expect(plan.totalDurationUs).toBe('2683283');
    const fractional = findTravelPath(field, { xFp: 32.5, zFp: 16 }, { xFp: 96, zFp: 48 });
    expect(fractional?.[0]).toEqual({ xFp: 32.5, zFp: 16 });
    expect(
      compileMovementPlan({
        field,
        path: fractional!,
        movementEpoch: '1',
        startedAtMs: '1000',
        planId: 'fractional-origin',
      }).from,
    ).toEqual({ xMicroFp: '2129920', zMicroFp: '1048576' });
    const grassOnly = { ...field, overlays: Object.freeze(Array.from({ length: 12 }, () => null)) };
    const straight = compileMovementPlan({
      field: grassOnly,
      path: [
        { xFp: 32, zFp: 16 },
        { xFp: 96, zFp: 48 },
      ],
      movementEpoch: '1',
      startedAtMs: '1000',
      planId: 'single-straight-span',
    });
    const subdivided = compileMovementPlan({
      field: grassOnly,
      path: [
        { xFp: 32, zFp: 16 },
        { xFp: 48, zFp: 24 },
        { xFp: 96, zFp: 48 },
      ],
      movementEpoch: '1',
      startedAtMs: '1000',
      planId: 'merged-straight-span',
    });
    expect(straight.totalDurationUs).toBe('2981425');
    expect(subdivided.totalDurationUs).toBe(straight.totalDurationUs);

    const boundaryTerrain = buildNavigationField({
      mapEdition: 'cell-boundary-v1',
      origin: { xFp: 0, zFp: 0 },
      columns: 2,
      rows: 2,
      cellSizeFp: 64,
      boundary: [
        { xFp: -64, zFp: -64 },
        { xFp: 192, zFp: -64 },
        { xFp: 192, zFp: 192 },
        { xFp: -64, zFp: 192 },
      ],
      terrainShapes: [
        {
          shapeId: 'grass',
          terrainId: 'grassland',
          paintPriority: 0,
          polygon: [
            { xFp: -64, zFp: -64 },
            { xFp: 192, zFp: -64 },
            { xFp: 192, zFp: 192 },
            { xFp: -64, zFp: 192 },
          ],
        },
      ],
      overlayShapes: [],
      blockingShapes: [],
      dangerAreaShapes: [],
      sites: [],
    });
    const mixedBoundary = {
      ...boundaryTerrain,
      terrainIds: Object.freeze(['grassland', 'marsh', 'grassland', 'marsh'] as const),
      walkable: Object.freeze([true, true, true, true]),
    };
    const alongBoundary = compileMovementPlan({
      field: mixedBoundary,
      path: [
        { xFp: 64, zFp: 32 },
        { xFp: 64, zFp: 96 },
      ],
      movementEpoch: '1',
      startedAtMs: '1000',
      planId: 'row-major-boundary-terrain',
    });
    expect(alongBoundary.totalDurationUs).toBe('2666667');

    const blockedBySliver = buildNavigationField({
      mapEdition: 'clearance-v1',
      origin: { xFp: 0, zFp: 0 },
      columns: 2,
      rows: 1,
      cellSizeFp: 64,
      boundary: [
        { xFp: -64, zFp: -64 },
        { xFp: 192, zFp: -64 },
        { xFp: 192, zFp: 128 },
        { xFp: -64, zFp: 128 },
      ],
      terrainShapes: [
        {
          shapeId: 'grass',
          terrainId: 'grassland',
          paintPriority: 0,
          polygon: [
            { xFp: -64, zFp: -64 },
            { xFp: 192, zFp: -64 },
            { xFp: 192, zFp: 128 },
            { xFp: -64, zFp: 128 },
          ],
        },
      ],
      overlayShapes: [],
      blockingShapes: [
        {
          shapeId: 'sliver',
          polygon: [
            { xFp: 5, zFp: 5 },
            { xFp: 20, zFp: 5 },
            { xFp: 20, zFp: 20 },
            { xFp: 5, zFp: 20 },
          ],
        },
      ],
      dangerAreaShapes: [],
      sites: [],
    });
    expect(
      findTravelPath(blockedBySliver, { xFp: 10, zFp: 10 }, { xFp: 100, zFp: 10 }),
    ).toBeUndefined();

    const cornerField = buildNavigationField({
      mapEdition: 'supercover-v1',
      origin: { xFp: 0, zFp: 0 },
      columns: 2,
      rows: 2,
      cellSizeFp: 64,
      boundary: [
        { xFp: -64, zFp: -64 },
        { xFp: 192, zFp: -64 },
        { xFp: 192, zFp: 192 },
        { xFp: -64, zFp: 192 },
      ],
      terrainShapes: [
        {
          shapeId: 'grass',
          terrainId: 'grassland',
          paintPriority: 0,
          polygon: [
            { xFp: -64, zFp: -64 },
            { xFp: 192, zFp: -64 },
            { xFp: 192, zFp: 192 },
            { xFp: -64, zFp: 192 },
          ],
        },
      ],
      overlayShapes: [],
      blockingShapes: [],
      dangerAreaShapes: [],
      sites: [],
    });
    const cornerBlocked = { ...cornerField, walkable: Object.freeze([true, false, false, true]) };
    expect(
      findTravelPath(cornerBlocked, { xFp: 32, zFp: 32 }, { xFp: 96, zFp: 96 }),
    ).toBeUndefined();
  });

  it('includes the weighted goal connector when comparing candidate paths', () => {
    const boundary = [
      { xFp: -64, zFp: -64 },
      { xFp: 320, zFp: -64 },
      { xFp: 320, zFp: 256 },
      { xFp: -64, zFp: 256 },
    ];
    const base = buildNavigationField({
      mapEdition: 'weighted-goal-v1',
      origin: { xFp: 0, zFp: 0 },
      columns: 4,
      rows: 3,
      cellSizeFp: 64,
      boundary,
      terrainShapes: [
        { shapeId: 'grass', terrainId: 'grassland', paintPriority: 0, polygon: boundary },
      ],
      overlayShapes: [],
      blockingShapes: [],
      dangerAreaShapes: [],
      sites: [],
    });
    const terrains = [
      'marsh',
      'grassland',
      'grassland',
      'marsh',
      'grassland',
      'marsh',
      'grassland',
      'marsh',
      'marsh',
      'grassland',
      'grassland',
      'marsh',
    ] as const;
    const overlays = Array.from({ length: 12 }, (_, index) =>
      [0, 1, 9].includes(index) ? ('road' as const) : null,
    );
    const field = {
      ...base,
      terrainIds: Object.freeze([...terrains]),
      overlays: Object.freeze(overlays),
      walkable: Object.freeze(Array.from({ length: 12 }, () => true)),
    };
    const path = findTravelPath(field, { xFp: 8, zFp: 160 }, { xFp: 247, zFp: 8 });
    expect(path).toBeDefined();
    const candidate = compileMovementPlan({
      field,
      path: [
        { xFp: 8, zFp: 160 },
        { xFp: 32, zFp: 96 },
        { xFp: 96, zFp: 32 },
        { xFp: 247, zFp: 8 },
      ],
      movementEpoch: '1',
      startedAtMs: '1000',
      planId: 'weighted-goal-candidate',
    });
    const plan = compileMovementPlan({
      field,
      path: path!,
      movementEpoch: '1',
      startedAtMs: '1000',
      planId: 'weighted-goal-connector',
    });
    expect(BigInt(plan.totalDurationUs)).toBeLessThanOrEqual(BigInt(candidate.totalDurationUs));
  });

  it('compiles weighted terrain time once and projects the same continuous point at any render time', () => {
    const rect = [
      { xFp: -64, zFp: -64 },
      { xFp: 448, zFp: -64 },
      { xFp: 448, zFp: 128 },
      { xFp: -64, zFp: 128 },
    ];
    const field = buildNavigationField({
      mapEdition: 'test-field-v1',
      origin: { xFp: 0, zFp: 0 },
      columns: 6,
      rows: 1,
      cellSizeFp: 64,
      boundary: rect,
      terrainShapes: [
        { shapeId: 'grass', terrainId: 'grassland', paintPriority: 0, polygon: rect },
      ],
      overlayShapes: [],
      blockingShapes: [],
      dangerAreaShapes: [],
      sites: [],
    });
    const path = findTravelPath(field, { xFp: 32, zFp: 32 }, { xFp: 224, zFp: 32 });
    expect(path).toBeDefined();
    const plan = compileMovementPlan({
      field,
      path: path!,
      movementEpoch: '1',
      startedAtMs: '1000000',
      planId: 'test-plan',
    });
    expect(plan.totalDurationUs).toBe('8000000');
    expect(positionAt(plan, '1004000')).toEqual({
      xMicroFp: String(128 * 65_536),
      zMicroFp: String(32 * 65_536),
    });
    expect(positionAt(plan, '1004000')).toEqual(positionAt(plan, '1004000'));
  });

  it('rounds one straight same-speed span only after boundary crossings are merged', () => {
    const boundary = [
      { xFp: -64, zFp: -64 },
      { xFp: 448, zFp: -64 },
      { xFp: 448, zFp: 320 },
      { xFp: -64, zFp: 320 },
    ];
    const field = buildNavigationField({
      mapEdition: 'straight-boundaries-v1',
      origin: { xFp: 0, zFp: 0 },
      columns: 6,
      rows: 5,
      cellSizeFp: 64,
      boundary,
      terrainShapes: [
        { shapeId: 'grass', terrainId: 'grassland', paintPriority: 0, polygon: boundary },
      ],
      overlayShapes: [],
      blockingShapes: [],
      dangerAreaShapes: [],
      sites: [],
    });
    const path = findTravelPath(field, { xFp: 96, zFp: 80 }, { xFp: 264, zFp: 152 });
    expect(path).toBeDefined();
    const plan = compileMovementPlan({
      field,
      path: path!,
      movementEpoch: '1',
      startedAtMs: '1000',
      planId: 'straight-crossings',
    });
    expect(plan.speedSpans).toHaveLength(1);
    expect(plan.totalDurationUs).toBe('7615774');
  });

  it('finds a deterministic terrain path and derives stop position from trusted time', () => {
    const from = { q: 0, r: 0 };
    const to = { q: 3, r: 1 };
    const first = findFreeMovementPath(SEROE_PORECHYE, from, to);
    expect(first).toBeDefined();
    expect(first).toEqual(findFreeMovementPath(SEROE_PORECHYE, from, to));

    const execution = acceptFreeMovement({
      region: SEROE_PORECHYE,
      partyId: 'party',
      from,
      to,
      routeEpoch: '1',
      atTick: campaignTick('100'),
    });
    const stoppedAt = freeMovementPositionAt(execution, campaignTick('104'));
    expect(stoppedAt).toEqual(execution.path[2]);
    expect(freeMovementTimeAtPosition(execution, stoppedAt)).toBe('104');
    expect(execution.profileId).toBe(FREE_MOVEMENT_PROFILE.profileId);
    expect(execution.arrivesAt).toBe(
      String(100 + (execution.path.length - 1) * FREE_MOVEMENT_PROFILE.ticksPerHex),
    );
  });

  it('rejects bounded but blocked terrain while keeping authored settlement hexes traversable', () => {
    expect(isWalkableHex(SEROE_PORECHYE, { q: 0, r: 0 })).toBe(true);
    expect(isWalkableHex(SEROE_PORECHYE, { q: 5, r: -2 })).toBe(false);
    expect(isWalkableHex(SEROE_PORECHYE, { q: 99, r: 99 })).toBe(false);
    expect(findFreeMovementPath(SEROE_PORECHYE, { q: 0, r: 0 }, { q: 5, r: -2 })).toBeUndefined();
    expect(() =>
      acceptFreeMovement({
        region: SEROE_PORECHYE,
        partyId: 'party',
        from: { q: 0, r: 0 },
        to: { q: 99, r: 99 },
        routeEpoch: '1',
        atTick: campaignTick('100'),
      }),
    ).toThrow('Invalid free movement destination');
  });

  it('moves the party and members together, then settles at the earned terrain position', () => {
    const base = economy([1n], 100n, 100);
    const origin = { kind: 'AT' as const, siteId: 'kamenny-brod', areaId: 'square' };
    const lifecycle = {
      ...base.lifecycle,
      parties: base.lifecycle.parties.map((party) => ({ ...party, location: origin })),
      characters: base.lifecycle.characters.map((character) =>
        character.presence.fieldPartyId === 'party'
          ? { ...character, presence: { ...character.presence, location: origin } }
          : character,
      ),
    };
    const physical = base.physical!;
    const root = {
      lifecycle,
      finance: base.finance,
      physical: {
        ...physical,
        containers: physical.containers.map((container) =>
          container.carrier?.kind === 'PARTY' && container.carrier.id === 'party'
            ? { ...container, location: origin }
            : container,
        ),
      },
    };
    const destination = { q: 2, r: 1 };
    const execution = acceptFreeMovement({
      region: SEROE_PORECHYE,
      partyId: 'party',
      from: { q: 0, r: 0 },
      to: destination,
      routeEpoch: '1',
      atTick: campaignTick('100'),
    });
    const started = prepareFreeMovementStart({
      root,
      region: SEROE_PORECHYE,
      execution,
      segmentId: 'movement-1',
    });
    expect(started.root.lifecycle.parties[0]?.location.kind).toBe('MOVING');
    expect(
      started.root.lifecycle.characters
        .filter((character) => character.presence.fieldPartyId === 'party')
        .every((character) => character.presence.location.kind === 'MOVING'),
    ).toBe(true);

    const stopped = prepareFreeMovementStop({
      root: {
        ...started.root,
        lifecycle: { ...started.root.lifecycle, campaignTick: campaignTick('104') },
        finance: { ...started.root.finance, processedTick: campaignTick('104') },
        physical: { ...started.root.physical, processedTick: campaignTick('104') },
      },
      region: SEROE_PORECHYE,
      execution,
      segmentId: 'movement-1',
      trustedTick: campaignTick('104'),
    });
    expect(stopped.position).toEqual(execution.path[2]);
    expect(stopped.root.lifecycle.parties[0]?.location.kind).toBe('TERRAIN');
    expect(
      stopped.root.lifecycle.characters
        .filter((character) => character.presence.fieldPartyId === 'party')
        .every((character) => character.presence.location.kind === 'TERRAIN'),
    ).toBe(true);
  });
});
