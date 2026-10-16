import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { CombatLabBattleConfig, CombatLabCatalog } from '@warwrit/protocol';
import { BattleEditor } from './BattleEditor.js';
import { createEmptyTiles } from './editor-model.js';

it('keeps editor cells keyboard-addressable and identifies occupied and blocked cells', () => {
  const battle: CombatLabBattleConfig = {
    version: 1,
    name: 'Бой',
    seed: 1,
    map: {
      name: 'Поле',
      tiles: createEmptyTiles().map((tile) => ({ ...tile, blocked: tile.q === 7 && tile.r === 2 })),
    },
    units: [
      {
        id: 'human',
        profileId: 'sword',
        sideId: 'human',
        position: { q: 2, r: 2 },
        skillRanks: {},
      },
      {
        id: 'opponent',
        profileId: 'wolf',
        sideId: 'opponent',
        position: { q: 12, r: 2 },
        skillRanks: {},
      },
    ],
  };
  const catalog: CombatLabCatalog = {
    profiles: [
      { id: 'sword', name: 'Мечник', kind: 'human', weaponId: 'sword-shield' },
      { id: 'wolf', name: 'Волк', kind: 'creature', weaponId: 'raider' },
    ],
    defaultBattle: battle,
  };
  const html = renderToStaticMarkup(
    <BattleEditor catalog={catalog} value={battle} onChange={() => undefined} />,
  );
  expect(html).toContain('Клетка 2, 2: plain, высота 0, свои: Мечник');
  expect(html).toContain('Клетка 12, 2: plain, высота 0, противник: Волк');
  expect(html).toContain('Клетка 7, 2: plain, высота 0, препятствие');
  expect(html.match(/data-editor-cell="true"/g)).toHaveLength(165);
  expect(html.match(/tabindex="0"/g)).toHaveLength(165);
  const disabled = renderToStaticMarkup(
    <BattleEditor catalog={catalog} value={battle} disabled onChange={() => undefined} />,
  );
  expect(disabled.match(/tabindex="-1"/g)).toHaveLength(165);
});
