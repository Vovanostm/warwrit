import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type {
  CombatLabBattleConfigV2,
  PlaygroundBootstrap,
  PlaygroundScenario,
} from '@warwrit/protocol';
import { createEmptyTiles } from '../combat-lab/editor-model.js';
import {
  isEditableScenario,
  MultisideBattleEditor,
  paintMultisideBattleTile,
  parseRetreatHexes,
} from './SandboxSetup.js';

const battle: CombatLabBattleConfigV2 = {
  version: 2,
  name: 'Три стороны',
  seed: 7,
  map: { name: 'Поле', tiles: createEmptyTiles() },
  sides: [
    { id: 'side-a', retreatHexes: [{ q: 0, r: 0 }] },
    { id: 'side-b', retreatHexes: [{ q: 14, r: 0 }] },
    { id: 'side-c', retreatHexes: [{ q: 0, r: 10 }] },
  ],
  parties: [
    { id: 'party-a', sideId: 'side-a', kind: 'player', controllerId: 'owner-a' },
    { id: 'party-b', sideId: 'side-b', kind: 'npc' },
    { id: 'party-c', sideId: 'side-c', kind: 'npc' },
  ],
  units: [
    {
      id: 'unit-a',
      profileId: 'fighter',
      sideId: 'side-a',
      partyId: 'party-a',
      position: { q: 1, r: 1 },
      skillRanks: {},
    },
    {
      id: 'unit-b',
      profileId: 'fighter',
      sideId: 'side-b',
      partyId: 'party-b',
      position: { q: 2, r: 1 },
      skillRanks: {},
    },
    {
      id: 'unit-c',
      profileId: 'fighter',
      sideId: 'side-c',
      partyId: 'party-c',
      position: { q: 3, r: 1 },
      skillRanks: {},
    },
  ],
};

const scenario: PlaygroundScenario = {
  schemaRevision: 2,
  contentRevision: 'playground-v3:m1-domain-bridge-v6',
  metadata: { name: 'Проверка сторон' },
  mapRef: 'inline',
  controls: { mode: 'manual' },
  rulesetId: 'm1-domain-bridge-v6',
  initial: battle,
  equipment: [],
  resources: [],
};

it('keeps a complete v2 scenario editable and displays all side, party and unit identities', () => {
  const imported = JSON.parse(JSON.stringify(scenario)) as unknown;
  expect(isEditableScenario(imported)).toBe(true);
  if (!isEditableScenario(imported)) throw new Error('fixture rejected');
  expect(imported.initial).toEqual(battle);

  const bootstrap = {
    catalog: { profiles: [{ id: 'fighter', name: 'Боец' }] },
  } as unknown as PlaygroundBootstrap;
  const html = renderToStaticMarkup(
    <MultisideBattleEditor
      catalog={bootstrap.catalog}
      value={battle}
      disabled={false}
      onChange={() => {}}
    />,
  );
  for (const id of [
    'side-a',
    'side-b',
    'side-c',
    'party-a',
    'party-b',
    'party-c',
    'unit-a',
    'unit-b',
    'unit-c',
    'owner-a',
  ]) {
    expect(html).toContain(id);
  }
});

it('rejects malformed v2 retreat/controller fields before mounting the editor', () => {
  const missingRetreats = JSON.parse(JSON.stringify(scenario)) as Record<string, unknown>;
  (missingRetreats['initial'] as Record<string, unknown>)['sides'] = [{ id: 'side-a' }];
  expect(isEditableScenario(missingRetreats)).toBe(false);

  const malformedController = JSON.parse(JSON.stringify(scenario)) as Record<string, unknown>;
  const initial = malformedController['initial'] as Record<string, unknown>;
  (initial['parties'] as Record<string, unknown>[])[0]!['controllerId'] = { id: 'owner' };
  expect(isEditableScenario(malformedController)).toBe(false);
});

it('paints one map tile while preserving all side, party, unit and retreat metadata', () => {
  const painted = paintMultisideBattleTile(battle, { q: 4, r: 4 }, { terrain: 'mud' });
  expect(painted.sides).toEqual(battle.sides);
  expect(painted.parties).toEqual(battle.parties);
  expect(painted.units).toEqual(battle.units);
  expect(painted.map.tiles.find((tile) => tile.q === 4 && tile.r === 4)?.terrain).toBe('mud');
  expect(painted.map.tiles).toHaveLength(165);
});

it('keeps incomplete retreat coordinates invalid until the whole pair is entered', () => {
  expect(parseRetreatHexes('1,')).toBeNull();
  expect(parseRetreatHexes('14,10')).toEqual([{ q: 14, r: 10 }]);
});
