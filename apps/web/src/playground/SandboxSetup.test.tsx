import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type {
  CombatLabBattleConfigV2,
  PlaygroundBootstrap,
  PlaygroundScenario,
} from '@warwrit/protocol';
import { createEmptyTiles } from '../combat-lab/editor-model.js';
import { isEditableScenario, MultisideBattleEditor } from './SandboxSetup.js';

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
