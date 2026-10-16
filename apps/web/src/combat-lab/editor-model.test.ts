import { describe, expect, it } from 'vitest';
import type {
  CombatLabBattleConfig,
  CombatLabCatalog,
  CombatLabCustomUnit,
} from '@warwrit/protocol';
import {
  createEmptyTiles,
  paintBattleTile,
  placeBattleUnit,
  validateBattleDraft,
  validateMapDraft,
} from './editor-model.js';

const catalog: CombatLabCatalog = {
  profiles: [
    { id: 'fighter', name: 'Боец', kind: 'human', weaponId: 'sword-shield' },
    { id: 'wolf', name: 'Волк', kind: 'creature', weaponId: 'raider' },
  ],
  defaultBattle: {} as CombatLabBattleConfig,
};

const fixture = (): CombatLabBattleConfig => ({
  version: 1,
  name: 'Проверка',
  seed: 7,
  map: { name: 'Поле', tiles: createEmptyTiles() },
  units: [
    { id: 'human-1', profileId: 'fighter', sideId: 'human', position: { q: 1, r: 1 } },
    { id: 'opponent-1', profileId: 'wolf', sideId: 'opponent', position: { q: 13, r: 8 } },
  ],
});

describe('combat editor model', () => {
  it('accepts a complete map and battle with open retreat edges', () => {
    const draft = fixture();
    expect(validateMapDraft({ version: 1, ...draft.map })).toEqual([]);
    expect(validateBattleDraft(draft, catalog)).toEqual([]);
  });

  it('rejects unknown keys at every imported battle and map boundary', () => {
    const draft = fixture();
    const unknownRoot = { ...draft, debug: true };
    const unknownMap = { ...draft, map: { ...draft.map, debug: true } };
    const unknownTile = {
      ...draft,
      map: {
        ...draft.map,
        tiles: draft.map.tiles.map((tile, index) =>
          index === 0 ? { ...tile, debug: true } : tile,
        ),
      },
    };
    const unknownUnit = {
      ...draft,
      units: draft.units.map((unit, index) => (index === 0 ? { ...unit, debug: true } : unit)),
    };
    const unknownPosition = {
      ...draft,
      units: draft.units.map((unit, index) =>
        index === 0 ? { ...unit, position: { ...unit.position, debug: true } } : unit,
      ),
    };
    expect(validateBattleDraft(unknownRoot, catalog).join(' ')).toContain(
      'version, name, seed, map и units',
    );
    expect(validateBattleDraft(unknownMap, catalog).join(' ')).toContain('name и tiles');
    expect(validateBattleDraft(unknownTile, catalog).join(' ')).toContain(
      'q, r, height, terrain и blocked',
    );
    expect(validateBattleDraft(unknownUnit, catalog).join(' ')).toContain(
      'id, profileId, sideId, position и необязательные skillRanks',
    );
    expect(validateBattleDraft(unknownPosition, catalog).join(' ')).toContain('только q и r');
    expect(validateMapDraft({ version: 1, ...draft.map, debug: true })).toContain(
      'Файл карты должен содержать только version, name и tiles.',
    );
  });

  it('rejects incomplete, duplicate, out-of-bounds, or invalid tiles', () => {
    const draft = fixture();
    const malformed = [
      ...draft.map.tiles.slice(1),
      { ...draft.map.tiles[1], q: 1, r: 0, height: 3 },
    ];
    const errors = validateMapDraft({ version: 1, name: 'Поле', tiles: malformed });
    expect(errors.join(' ')).toContain('указана дважды');
    expect(errors.join(' ')).toContain('Высота');
    expect(
      validateMapDraft({ version: 1, name: 'Поле', tiles: draft.map.tiles.slice(1) }),
    ).toContain('Карта должна содержать ровно 165 клеток.');
  });

  it('rejects unsupported profiles, duplicate unit positions, obstacles, and closed retreat edges', () => {
    const draft = fixture();
    const blockedTiles = paintBattleTile(draft.map.tiles, { q: 1, r: 1 }, { blocked: true });
    const malformed: CombatLabBattleConfig = {
      ...draft,
      map: {
        ...draft.map,
        tiles: blockedTiles.map((tile) =>
          tile.q === 0 || tile.q === 14 ? { ...tile, blocked: true } : tile,
        ),
      },
      units: [
        draft.units[0]!,
        { ...draft.units[1]!, profileId: 'not-in-catalog', position: draft.units[0]!.position },
      ],
    };
    const errors = validateBattleDraft(malformed, catalog).join(' ');
    expect(errors.toLowerCase()).toContain('профиль бойца');
    expect(errors).toContain('занята несколькими бойцами');
    expect(errors).toContain('стоит на препятствии');
    expect(errors).toContain('q=0');
    expect(errors).toContain('q=14');
  });

  it('validates draft structure while server owns connectivity admission', () => {
    const draft = fixture();
    const wall = {
      ...draft,
      map: {
        ...draft.map,
        tiles: draft.map.tiles.map((tile) => ({ ...tile, blocked: tile.q === 7 })),
      },
    };
    expect(validateBattleDraft(wall, catalog)).toEqual([]);
    const gate = {
      ...wall,
      map: {
        ...wall.map,
        tiles: wall.map.tiles.map((tile) =>
          tile.q === 7 && tile.r === 5 ? { ...tile, blocked: false } : tile,
        ),
      },
      units: [
        ...draft.units,
        { id: 'gate', profileId: 'fighter', sideId: 'human' as const, position: { q: 7, r: 5 } },
      ],
    };
    expect(validateBattleDraft(gate, catalog)).toEqual([]);
  });

  it('paints a single tile immutably and places only on a free in-bounds cell', () => {
    const tiles = createEmptyTiles();
    const painted = paintBattleTile(tiles, { q: 4, r: 3 }, { terrain: 'mud', height: 2 });
    expect(tiles[3 * 15 + 4]).toMatchObject({ terrain: 'plain', height: 0 });
    expect(painted[3 * 15 + 4]).toMatchObject({ terrain: 'mud', height: 2 });
    expect(painted.filter((tile) => tile.terrain === 'mud')).toHaveLength(1);

    const oneUnit: CombatLabCustomUnit[] = [
      { id: 'human-1', profileId: 'fighter', sideId: 'human', position: { q: 1, r: 1 } },
    ];
    expect(placeBattleUnit(oneUnit, 'wolf', 'opponent', { q: 8, r: 5 })).toEqual([
      ...oneUnit,
      {
        id: 'opponent-1',
        profileId: 'wolf',
        sideId: 'opponent',
        position: { q: 8, r: 5 },
        skillRanks: {},
      },
    ]);
    expect(placeBattleUnit(oneUnit, 'wolf', 'opponent', { q: 1, r: 1 })).toBeNull();
    expect(placeBattleUnit(oneUnit, 'wolf', 'opponent', { q: 15, r: 5 })).toBeNull();
  });

  it('caps each side at six units', () => {
    let units: CombatLabCustomUnit[] = [];
    for (let index = 0; index < 6; index += 1) {
      const placed = placeBattleUnit(units, 'fighter', 'human', {
        q: index,
        r: Math.floor(index / 3),
      });
      expect(placed).not.toBeNull();
      units = placed ?? units;
    }
    expect(placeBattleUnit(units, 'fighter', 'human', { q: 6, r: 2 })).toBeNull();
  });
});

it('preserves learned ranks across JSON and rejects zero, unknown and fractional imported ranks', () => {
  const draft = fixture();
  const learned = {
    ...draft,
    units: draft.units.map((unit) => ({ ...unit, skillRanks: { 'aimed-shot': 3, rally: 1 } })),
  };
  expect(validateBattleDraft(JSON.parse(JSON.stringify(learned)), catalog)).toEqual([]);
  for (const skillRanks of [{ rally: 0 }, { rally: 1.5 }, { unknown: 1 }]) {
    expect(
      validateBattleDraft(
        { ...draft, units: draft.units.map((unit) => ({ ...unit, skillRanks })) },
        catalog,
      ).join(' '),
    ).toContain('ранги 1–3');
  }
  expect(
    validateBattleDraft(
      { ...draft, units: draft.units.map((unit) => ({ ...unit, skillRanks: {} })) },
      catalog,
    ),
  ).toEqual([]);
});
