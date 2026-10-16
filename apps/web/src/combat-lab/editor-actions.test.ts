import { expect, it } from 'vitest';
import type { CombatLabBattleConfig, CombatLabCatalog } from '@warwrit/protocol';
import {
  applyEditorBrush,
  canDragPaint,
  editorCellCoordinates,
  parseSavedDrafts,
  prepareBattleImport,
  readEditorImportFile,
  validSavedDrafts,
} from './editor-actions.js';
import { createEmptyTiles } from './editor-model.js';

const battle = (): CombatLabBattleConfig => ({
  version: 1,
  name: 'Бой',
  seed: 1,
  map: { name: 'Поле', tiles: createEmptyTiles() },
  units: [
    {
      id: 'human-1',
      profileId: 'fighter',
      sideId: 'human',
      position: { q: 1, r: 1 },
      skillRanks: { 'shield-brace': 3 },
    },
    {
      id: 'opponent-1',
      profileId: 'fighter',
      sideId: 'opponent',
      position: { q: 13, r: 8 },
      skillRanks: {},
    },
  ],
});
const catalog: CombatLabCatalog = {
  profiles: [{ id: 'fighter', name: 'Боец', kind: 'human', weaponId: 'sword-shield' }],
  defaultBattle: battle(),
};

it('admits complete imports while map rejection preserves current battle and learned ranks', () => {
  const current = battle();
  const before = structuredClone(current);
  const blocked = current.map.tiles.map((tile) => ({
    ...tile,
    blocked: tile.q === 1 && tile.r === 1,
  }));
  const rejected = prepareBattleImport(
    { version: 1, name: 'Преграда', tiles: blocked },
    'map',
    current,
    catalog,
  );
  expect(rejected.status).toBe('rejected');
  expect(current).toEqual(before);
  const imported = prepareBattleImport(
    { version: 1, ...current.map, name: 'Другой ландшафт' },
    'map',
    current,
    catalog,
  );
  expect(imported.status).toBe('accepted');
  if (imported.status === 'accepted') {
    expect(imported.battle.units).toBe(current.units);
    expect(imported.battle.units[0]?.skillRanks).toEqual({ 'shield-brace': 3 });
    expect(imported.battle.map.name).toBe('Другой ландшафт');
  }
  expect(prepareBattleImport(current, 'battle', current, catalog)).toMatchObject({
    status: 'accepted',
    battle: current,
  });
  expect(prepareBattleImport({}, 'battle', current, catalog).status).toBe('rejected');
  expect(
    prepareBattleImport({ version: 1, name: 'Неполная', tiles: [] }, 'map', current, catalog)
      .status,
  ).toBe('rejected');
});

it('paints immutable drafts and never blocks or replaces an occupied cell', () => {
  const current = battle();
  expect(
    applyEditorBrush(current, { q: 1, r: 1 }, 'blocked', 'fighter', 'human')!.patch,
  ).toBeUndefined();
  expect(
    applyEditorBrush(current, { q: 1, r: 1 }, 'place', 'fighter', 'human')!.patch,
  ).toBeUndefined();
  const painted = applyEditorBrush(current, { q: 2, r: 2 }, 'blocked', 'fighter', 'human')!.patch!
    .map!;
  expect(painted.tiles.find(({ q, r }) => q === 2 && r === 2)?.blocked).toBe(true);
  expect(current.map.tiles.find(({ q, r }) => q === 2 && r === 2)?.blocked).toBe(false);
  const obstacle = { ...current, map: painted };
  expect(
    applyEditorBrush(obstacle, { q: 2, r: 2 }, 'place', 'fighter', 'human')!.patch,
  ).toBeUndefined();
  const cleared = applyEditorBrush(obstacle, { q: 2, r: 2 }, 'clear-blocked', 'fighter', 'human')!
    .patch!.map!;
  expect(cleared.tiles.find(({ q, r }) => q === 2 && r === 2)?.blocked).toBe(false);
  const placed = applyEditorBrush(current, { q: 2, r: 2 }, 'place', 'fighter', 'human')!.patch!
    .units!;
  expect(placed.at(-1)).toMatchObject({ id: 'human-2', skillRanks: {} });
  expect(
    applyEditorBrush(
      current,
      { q: 2, r: 2 },
      'height-2',
      'fighter',
      'human',
    )!.patch!.map!.tiles.find(({ q, r }) => q === 2 && r === 2)?.height,
  ).toBe(2);
  expect(
    applyEditorBrush(current, { q: 2, r: 2 }, 'fire', 'fighter', 'human')!.patch!.map!.tiles.find(
      ({ q, r }) => q === 2 && r === 2,
    )?.terrain,
  ).toBe('fire');
  expect(applyEditorBrush(current, { q: 99, r: 99 }, 'place', 'fighter', 'human')).toBeNull();
});

it('reads local JSON defensively and filters damaged drafts before offering them for launch', () => {
  expect(parseSavedDrafts(null)).toEqual({});
  expect(parseSavedDrafts('null')).toEqual({});
  expect(parseSavedDrafts('[]')).toEqual({});
  expect(() => parseSavedDrafts('{')).toThrow();
  const saved = parseSavedDrafts(JSON.stringify({ valid: battle(), damaged: { version: 99 } }));
  expect(Object.keys(validSavedDrafts(saved, catalog))).toEqual(['valid']);
});

it('requires cell attributes and only paints an enabled primary-button drag outside placement mode', () => {
  expect(editorCellCoordinates(null, '1')).toBeNull();
  expect(editorCellCoordinates('1', null)).toBeNull();
  expect(editorCellCoordinates('1.5', '1')).toBeNull();
  expect(editorCellCoordinates('x', '1')).toBeNull();
  expect(editorCellCoordinates('2', '3')).toEqual({ q: 2, r: 3 });
  expect(canDragPaint(1, 'mud', false)).toBe(true);
  expect(canDragPaint(0, 'mud', false)).toBe(false);
  expect(canDragPaint(1, 'place', false)).toBe(false);
  expect(canDragPaint(1, 'mud', true)).toBe(false);
});

it('clears file selection before asynchronous JSON reading, including malformed and absent files', async () => {
  const input = { files: [new File(['{"version":1}'], 'battle.json')], value: 'battle.json' };
  await expect(readEditorImportFile(input)).resolves.toEqual({ version: 1 });
  expect(input.value).toBe('');
  const broken = { files: [new File(['{'], 'broken.json')], value: 'broken.json' };
  await expect(readEditorImportFile(broken)).rejects.toThrow();
  expect(broken.value).toBe('');
  const absent = { files: null, value: 'cancelled' };
  await expect(readEditorImportFile(absent)).resolves.toBeUndefined();
  expect(absent.value).toBe('');
});
