import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { CombatLabCatalog, CombatLabCustomUnit } from '@warwrit/protocol';
import { changeSkillRank, SkillLoadout } from './SkillLoadout.js';

it('keeps learned ranks when equipment is incompatible and shows authoritative metadata', () => {
  const unit: CombatLabCustomUnit = {
    id: 'fighter',
    profileId: 'sword',
    sideId: 'human',
    position: { q: 1, r: 1 },
    skillRanks: { 'aimed-shot': 3 },
  };
  const catalog: CombatLabCatalog = {
    profiles: [
      {
        id: 'sword',
        name: 'Мечник',
        kind: 'human',
        weaponId: 'sword-shield',
        defaultSkillRanks: { rally: 1 },
      },
    ],
    defaultBattle: {
      version: 1,
      name: 'Бой',
      seed: 1,
      map: { name: 'Поле', tiles: [] },
      units: [unit],
    },
    skills: [
      {
        skillId: 'aimed-shot',
        name: 'Прицельный выстрел',
        target: 'enemy',
        equipment: ['bow'],
        minimumRange: 2,
        maximumRange: 4,
        actionPointCost: 4,
        staminaCost: 24,
        duration: 'instant',
        description: 'Описание из каталога.',
      },
    ],
  };
  const html = renderToStaticMarkup(
    <SkillLoadout unit={unit} catalog={catalog} onChange={() => undefined} />,
  );
  expect(html).toContain('Изученный ранг сохранён');
  expect(html).toContain('Описание из каталога.');
  expect(html).toContain('value="3" selected');
  expect(html).toContain('Без изученных приёмов');
  expect(unit.skillRanks).toEqual({ 'aimed-shot': 3 });
});

it('removes a rank explicitly without changing other learned skills or its source', () => {
  const ranks = { 'aimed-shot': 3, rally: 1 } as const;
  expect(changeSkillRank(ranks, 'aimed-shot', 0)).toEqual({ rally: 1 });
  expect(changeSkillRank({}, 'shield-brace', 2)).toEqual({ 'shield-brace': 2 });
  expect(ranks).toEqual({ 'aimed-shot': 3, rally: 1 });
});
