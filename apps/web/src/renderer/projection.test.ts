import { describe, expect, it } from 'vitest';

import {
  diffRenderUnits,
  neutralUnitLabel,
  readEncounterControlGrant,
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
    expect(neutralUnitLabel(projection!.units[0]!)).toBe('Участник стороны unfamiliar-side');
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
