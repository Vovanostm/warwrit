import { describe, expect, it } from 'vitest';

import {
  diffRenderUnits,
  readEncounterControlGrant,
  encounterConditionAllows,
  readEncounterProjection,
  readRoomProjection,
  retainedSelection,
  selectableUnitIds,
  toEncounterRenderProjection,
} from './projection.js';

const activeProjection = (revision = 4) => ({
  version: 1,
  encounterId: 'encounter-1',
  revision,
  status: 'active',
  round: 2,
  activationId: null,
  actorUnitId: null,
  deadlineAt: null,
  units: [
    { id: 'unit-a', sideId: 'side-a', q: 0, r: 0, health: 10, status: 'active' },
    { id: 'unit-b', sideId: 'side-b', q: 1, r: 0, health: 8, status: 'active' },
  ],
});

describe('encounter projection boundary', () => {
  it('copies only public facts into detached immutable values', () => {
    const source = activeProjection();
    const projection = readEncounterProjection(source, 'encounter-1');

    expect(projection).toBeDefined();
    expect(projection).not.toBe(source);
    expect(projection?.units).not.toBe(source.units);
    expect(Object.isFrozen(projection)).toBe(true);
    expect(Object.isFrozen(projection?.units)).toBe(true);
    expect(() => {
      source.units[0]!.q = 3;
    }).not.toThrow();
    expect(projection?.units[0]?.q).toBe(0);
    expect(readEncounterProjection({ ...source, characterClass: 'Knight' })).toBeUndefined();
    expect(readEncounterProjection(source, 'another-encounter')).toBeUndefined();
  });

  it('copies the persistent encounter HUD facts without inventing resource caps', () => {
    const source = {
      ...activeProjection(),
      initiativeOrder: ['unit-a', 'unit-b'],
      turnIndex: 1,
      nextRoundInitiative: { round: 3, unitIds: ['unit-b', 'unit-a'] },
      outcome: null,
      map: {
        hexes: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
        ],
        blocked: [],
        tiles: [{ q: 0, r: 0, height: 1, terrain: 'mud' }],
      },
      units: [
        {
          id: 'unit-a',
          sideId: 'side-a',
          q: 0,
          r: 0,
          health: 7,
          status: 'active',
          weaponId: 'fists',
          armor: 3,
          stamina: 5,
          morale: 2,
          guarding: true,
          panicking: false,
          threat: {
            targetId: 'unit-b',
            damage: { minimum: 2, maximum: 4 },
            responseReceived: false,
          },
          weaponReach: { minimumRange: 1, maximumRange: 2, cells: [{ q: 1, r: 0 }] },
        },
        { id: 'unit-b', sideId: 'side-b', q: 1, r: 0, health: 8, status: 'active' },
      ],
    };
    const projection = readEncounterProjection(source)!;

    expect(projection.initiativeOrder).toEqual(['unit-a', 'unit-b']);
    expect(projection.nextRoundInitiative?.unitIds).toEqual(['unit-b', 'unit-a']);
    expect(projection.outcome).toBeNull();
    expect(projection.map?.tiles).toEqual([{ q: 0, r: 0, height: 1, terrain: 'mud' }]);
    expect(projection.units[0]).toMatchObject({
      weaponId: 'fists',
      armor: 3,
      stamina: 5,
      morale: 2,
      guarding: true,
    });
    expect(
      readEncounterProjection({
        ...source,
        units: [{ ...source.units[0], weaponId: 'crossbow' }, source.units[1]],
      }),
    ).toBeUndefined();
    expect(projection.units[0]?.maximumHealth).toBeUndefined();
    expect(projection.units[0]?.threat?.damage).toEqual({ minimum: 2, maximum: 4 });
    expect(Object.isFrozen(projection.units[0]?.weaponReach?.cells)).toBe(true);
    expect(readEncounterProjection({ ...source, turnIndex: 2 })).toBeUndefined();
    expect(
      readEncounterProjection({
        ...source,
        units: [{ ...source.units[0], maximumHealth: 6 }, source.units[1]],
      })?.units[0]?.maximumHealth,
    ).toBeUndefined();
  });

  it('copies reflected Colyseus maps and converts positions without fixture assumptions', () => {
    const reflected = {
      version: 1,
      encounterId: 'encounter-1',
      revision: 4,
      status: 'active',
      round: 2,
      activationId: '',
      actorUnitId: '',
      deadlineAt: '',
      units: new Map([
        [
          'unit-a',
          { id: 'unit-a', sideId: 'unfamiliar-side', q: 2, r: -1, health: 3, status: 'active' },
        ],
      ]),
    };
    const projection = readRoomProjection(reflected, 'encounter-1');
    const renderProjection = projection && toEncounterRenderProjection(projection);

    expect(renderProjection?.units[0]).toMatchObject({
      id: 'unit-a',
      sideId: 'unfamiliar-side',
      worldX: 1.5,
      worldZ: -Math.sqrt(3) / 2,
    });
    expect(renderProjection?.units[0]).not.toHaveProperty('characterClass');
  });

  it('detaches iterable reflected weapon reach cells and preserves their coordinates', () => {
    const cells = new Set([
      { q: 1, r: 0 },
      { q: 0, r: 1 },
    ]);
    const reflected = {
      version: 1,
      encounterId: 'encounter-1',
      revision: 4,
      status: 'active',
      round: 2,
      activationId: '',
      actorUnitId: '',
      deadlineAt: '',
      units: new Map([
        [
          'unit-a',
          {
            id: 'unit-a',
            sideId: 'side-a',
            q: 0,
            r: 0,
            health: 10,
            maximumHealth: 20,
            weaponId: 'fists',
            weaponReachMinimum: 1,
            weaponReachMaximum: 1,
            weaponReachCells: cells,
            status: 'active',
          },
        ],
      ]),
    };

    const projection = readRoomProjection(reflected, 'encounter-1');

    expect(projection?.units[0]).toMatchObject({
      weaponId: 'fists',
      weaponReach: {
        minimumRange: 1,
        maximumRange: 1,
        cells: [
          { q: 1, r: 0 },
          { q: 0, r: 1 },
        ],
      },
    });
    expect(projection?.units[0]?.weaponReach?.cells).not.toBe(cells);
    expect(Object.isFrozen(projection?.units[0]?.weaponReach?.cells)).toBe(true);
  });

  it('normalizes optional caps identically without rejecting combat facts or retaining old caps', () => {
    let previous = toEncounterRenderProjection(readEncounterProjection(activeProjection())!).units;
    for (const cap of [
      60,
      80,
      undefined,
      null,
      0,
      -1,
      1.5,
      NaN,
      Infinity,
      Number.MAX_SAFE_INTEGER + 1,
      '60',
      19,
      60,
    ]) {
      const source = {
        ...activeProjection(),
        units: [
          {
            id: 'unit-a',
            sideId: 'side-a',
            weaponId: 'fists',
            q: 0,
            r: 0,
            health: 20,
            status: 'active',
            ...(cap === undefined ? {} : { maximumHealth: cap }),
          },
        ],
      };
      const http = readEncounterProjection(source)!;
      const room = readRoomProjection(
        { ...source, units: new Map([['unit-a', source.units[0]]]) },
        'encounter-1',
      );
      const expected = cap === 60 || cap === 80 ? cap : undefined;
      expect(http.units[0]?.maximumHealth).toBe(expected);
      expect(http.units[0]?.health).toBe(20);
      expect(http.units[0]?.weaponId).toBe('fists');
      expect(room).toEqual(http);
      const next = toEncounterRenderProjection(http).units;
      expect(diffRenderUnits(previous, next).updated).toEqual(
        previous[0]?.maximumHealth !== expected || previous[0]?.health !== 20 ? next : [],
      );
      expect(Object.isFrozen(next[0])).toBe(true);
      source.units[0]!.health = 1;
      expect(http.units[0]?.health).toBe(20);
      expect(
        readEncounterProjection({ ...source, units: [{ ...source.units[0], attributes: {} }] }),
      ).toBeUndefined();
      previous = next;
    }
  });

  it('reads a reflected room map whose arrays are iterable schema objects', () => {
    // ArraySchema is iterable but not an Array; rejecting it froze every live patch.
    class IterableHexes {
      constructor(private readonly hexes: readonly { q: number; r: number }[]) {}
      *[Symbol.iterator]() {
        yield* this.hexes;
      }
    }
    const projection = readRoomProjection(
      {
        version: 1,
        encounterId: 'encounter-1',
        revision: 7,
        status: 'active',
        round: 1,
        activationId: '',
        actorUnitId: '',
        deadlineAt: '',
        map: {
          hexes: new IterableHexes([
            { q: 0, r: 0 },
            { q: 0, r: 1 },
          ]),
          blocked: new IterableHexes([{ q: 0, r: 1 }]),
        },
        units: new Map([
          ['unit-a', { id: 'unit-a', sideId: 'side-a', q: 0, r: 0, health: 3, status: 'active' }],
        ]),
      },
      'encounter-1',
    );

    expect(projection?.revision).toBe(7);
    expect(projection?.map?.blocked).toEqual([{ q: 0, r: 1 }]);
  });

  it('reports immutable add, remove, and move deltas', () => {
    const before = toEncounterRenderProjection(readEncounterProjection(activeProjection())!).units;
    const afterDto = activeProjection(5);
    afterDto.units = [
      { id: 'unit-a', sideId: 'side-a', q: 2, r: 1, health: 10, status: 'active' },
      { id: 'unit-c', sideId: 'side-b', q: -1, r: 1, health: 7, status: 'active' },
    ];
    const after = toEncounterRenderProjection(readEncounterProjection(afterDto)!).units;
    const delta = diffRenderUnits(before, after);

    expect(delta.added.map((unit) => unit.id)).toEqual(['unit-c']);
    expect(delta.removed).toEqual(['unit-b']);
    expect(delta.moved).toEqual([{ id: 'unit-a', from: { q: 0, r: 0 }, to: { q: 2, r: 1 } }]);
    expect(Object.isFrozen(delta)).toBe(true);
    expect(Object.isFrozen(after[0])).toBe(true);
  });

  it('intersects private controls with current public units and clears stale selection', () => {
    const projection = readEncounterProjection(activeProjection())!;
    const grant = readEncounterControlGrant(
      {
        version: 1,
        encounterId: 'encounter-1',
        revision: 4,
        controllableUnitIds: ['unit-a', 'unit-a', 'unit-gone'],
      },
      'encounter-1',
    );
    const validGrant = readEncounterControlGrant(
      {
        version: 1,
        encounterId: 'encounter-1',
        revision: 4,
        controllableUnitIds: ['unit-a', 'unit-gone'],
      },
      'encounter-1',
    );

    expect(grant).toBeUndefined();
    expect(selectableUnitIds(projection, validGrant)).toEqual(['unit-a']);
    expect(retainedSelection('unit-a', projection, validGrant)).toBe('unit-a');
    expect(retainedSelection('unit-b', projection, validGrant)).toBeNull();
    expect(selectableUnitIds(readEncounterProjection(activeProjection(5))!, validGrant)).toEqual(
      [],
    );
  });
});

it('reads only detached actor-scoped intent hints and rejects foreign or raw capability data', () => {
  const value = {
    version: 1,
    encounterId: 'encounter-1',
    revision: 4,
    controllableUnitIds: ['unit-a'],
    actorActions: {
      activationId: '4:unit-a',
      actorId: 'unit-a',
      permittedIntents: ['attack', 'defend', 'wait'],
    },
  };
  const grant = readEncounterControlGrant(value, 'encounter-1');
  expect(grant?.actorActions?.permittedIntents).toEqual(['attack', 'defend', 'wait']);
  value.actorActions.permittedIntents.push('move');
  expect(grant?.actorActions?.permittedIntents).not.toContain('move');
  expect(
    readEncounterControlGrant(
      { ...value, actorActions: { ...value.actorActions, actorId: 'foreign' } },
      'encounter-1',
    ),
  ).toBeUndefined();
  expect(
    readEncounterControlGrant(
      { ...value, actorActions: { ...value.actorActions, capabilities: { move: false } } },
      'encounter-1',
    ),
  ).toBeUndefined();
});

it('binds condition controls to the actor and activation without making hints authority', () => {
  const grant = {
    version: 1 as const,
    encounterId: 'encounter-1',
    revision: 4,
    controllableUnitIds: ['unit-a'],
    actorActions: { activationId: '4:a', actorId: 'unit-a', permittedIntents: ['wait' as const] },
  };
  expect(encounterConditionAllows(undefined, null, null, 'move')).toBe(true);
  expect(encounterConditionAllows(grant, '4:a', 'unit-a', 'wait')).toBe(true);
  expect(encounterConditionAllows(grant, '4:a', 'unit-a', 'move')).toBe(false);
  expect(encounterConditionAllows(grant, '3:a', 'unit-a', 'wait')).toBe(false);
  expect(encounterConditionAllows(grant, '4:a', 'foreign', 'wait')).toBe(false);
});

it('accepts only account-owned activation previews and detaches their quoted paths', () => {
  const source = {
    version: 1,
    encounterId: 'encounter-1',
    revision: 4,
    controllableUnitIds: ['unit-a'],
    actorActions: {
      activationId: 'turn-a',
      actorId: 'unit-a',
      permittedIntents: ['move', 'wait', 'autoplay'],
    },
    tactical: {
      activationId: 'turn-a',
      actorId: 'unit-a',
      actionPoints: 4,
      stamina: 80,
      moves: [
        {
          to: { q: 1, r: 0 },
          path: [{ q: 1, r: 0 }],
          actionPointCost: 1,
          staminaCost: 4,
          fireDamage: 0,
          reactionCount: 0,
        },
      ],
      attacks: [
        {
          targetId: 'unit-b',
          hitChance: 70,
          actionPointCost: 3,
          staminaCost: 12,
          damage: { health: { minimum: 1, maximum: 6 }, armor: { minimum: 0, maximum: 2 } },
        },
      ],
    },
  };
  const grant = readEncounterControlGrant(source, 'encounter-1');
  expect(grant?.tactical?.moves[0]?.actionPointCost).toBe(1);
  source.tactical.moves[0]!.path[0]!.q = 3;
  expect(grant?.tactical?.moves[0]?.path[0]?.q).toBe(1);
  for (const tactical of [
    { ...source.tactical, actorId: 'foreign-unit' },
    { ...source.tactical, activationId: 'old-turn' },
    { ...source.tactical, seed: 19 },
    { ...source.tactical, moves: [{ ...source.tactical.moves[0], skillRanks: {} }] },
  ])
    expect(readEncounterControlGrant({ ...source, tactical }, 'encounter-1')).toBeUndefined();
});
