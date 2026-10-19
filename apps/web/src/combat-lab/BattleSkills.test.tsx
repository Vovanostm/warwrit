import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { CombatLabSkill, CombatLabView } from '@warwrit/protocol';
import { BattleSkills } from './BattleSkills.js';

const skills: CombatLabSkill[] = (
  [
    ['shield-brace', 'Упор щитом'],
    ['armor-pressure', 'Удар по броне'],
    ['reach-thrust', 'Дальний укол'],
    ['aimed-shot', 'Прицельный выстрел'],
    ['rally', 'Собраться'],
  ] as const
).map(([skillId, name]) => ({
  skillId,
  name,
  rank: 1,
  target: 'enemy',
  minimumRange: 1,
  maximumRange: 4,
  actionPointCost: 2,
  staminaCost: 8,
  duration: 'instant',
  description: `Описание ${name}`,
  equipmentAvailable: true,
}));
const view: CombatLabView = {
  version: 1,
  sessionId: 's',
  battleId: 'b',
  scenarioId: 'sprite-6v6-v1',
  controlledSideId: 'human',
  viewRevision: 1,
  status: 'active',
  round: 1,
  map: { hexes: [], blocked: [] },
  sides: [],
  units: [],
  initiativeOrder: [],
  turnIndex: 0,
  activation: null,
  events: [],
  omittedEventPrefix: 0,
  outcome: null,
  skills,
};
const render = (observation = view) =>
  renderToStaticMarkup(
    <BattleSkills
      view={observation}
      selectedSkillId="aimed-shot"
      onSelectSkill={() => {}}
      skillDisabledReason=""
    />,
  );

it('retains full accessible names, rank, cost and description including overflow', () => {
  const html = render();
  for (const skill of skills) {
    expect(html).toContain(`aria-label="${skill.name} · ранг 1"`);
    expect(html).toContain(skill.description);
    expect(html).toContain(`aria-describedby="skill-${skill.skillId}"`);
  }
  expect(html).toContain('2 ОД · 8 сил');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('hidden=""');
});

it('marks equipment, resource and target refusals without removing keyboard focus or their reasons', () => {
  const observation = {
    ...view,
    skills: skills.map((skill, index) => ({ ...skill, equipmentAvailable: index !== 0 })),
    skillPreview: [
      {
        ...skills[1]!,
        rulesetId: 'sprite-prototype-v3' as const,
        revision: 1,
        activationId: null,
        actorId: 'actor',
        targetId: 'enemy',
        legal: false,
        reason: 'INSUFFICIENT_ACTION_POINTS' as const,
      },
    ],
  };
  const html = render(observation);
  expect(html.match(/class="battle-unavailable-mark" aria-hidden="true"/g)).toHaveLength(5);
  expect(html.match(/data-unavailable="true"/g)).toHaveLength(5);
  expect(html).not.toMatch(/\sdisabled="/);
  expect(html).toContain('Текущее снаряжение не подходит');
  expect(html).toContain('Нет подходящей цели');
});

it('preserves older projections without skills', () => {
  const older = { ...view };
  delete (older as { skills?: readonly CombatLabSkill[] }).skills;
  expect(render(older)).toContain('Нет изученных приёмов');
});
