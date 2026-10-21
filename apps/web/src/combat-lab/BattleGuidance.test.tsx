import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { BattlePresentationView } from './battle-presentation.js';
import { BattleGuidance } from './BattleGuidance.js';

const movement = {
  to: { q: 1, r: 0 },
  path: [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
  ],
  actionPointCost: 1,
  staminaCost: 1,
};

function renderGuidance(movementPreview: readonly object[]) {
  return renderToStaticMarkup(
    <BattleGuidance
      view={{ status: 'active', skills: [], movementPreview } as unknown as BattlePresentationView}
      status="Ожидание"
      reachUnit={undefined}
      reach={undefined}
      reachNote=""
      selectedSkillId={null}
    />,
  );
}

it('shows both movement bands only when both server categories are present', () => {
  const html = renderGuidance([
    { ...movement, attackAffordableAfter: true },
    { ...movement, to: { q: 2, r: 0 }, attackAffordableAfter: false },
  ]);

  expect(html).toContain('data-zone="move-attack"');
  expect(html).toContain('Дойти и атаковать');
  expect(html).toContain('data-zone="move-only"');
  expect(html).toContain('Только движение');
  expect(html).toContain('data-zone="weapon"');
  expect(html).not.toContain('data-zone="both"');
});

it('shows only the movement category present in a complete server projection', () => {
  const moveAttack = renderGuidance([{ ...movement, attackAffordableAfter: true }]);
  expect(moveAttack).toContain('data-zone="move-attack"');
  expect(moveAttack).not.toContain('data-zone="move-only"');
  expect(moveAttack).not.toContain('data-zone="move"');

  const movementOnly = renderGuidance([{ ...movement, attackAffordableAfter: false }]);
  expect(movementOnly).toContain('data-zone="move-only"');
  expect(movementOnly).not.toContain('data-zone="move-attack"');
});

it('uses one generic movement legend entry for legacy or mixed projection rows', () => {
  const legacy = renderGuidance([movement]);
  expect(legacy).toContain('data-zone="move"');
  expect(legacy).toContain('Движение');
  expect(legacy).not.toContain('data-zone="move-attack"');
  expect(legacy).not.toContain('data-zone="move-only"');

  const mixed = renderGuidance([
    { ...movement, attackAffordableAfter: true },
    { ...movement, to: { q: 2, r: 0 } },
  ]);
  expect(mixed).toContain('data-zone="move"');
  expect(mixed).not.toContain('data-zone="move-attack"');
  expect(mixed).not.toContain('data-zone="move-only"');
  expect(renderGuidance([])).not.toContain('data-zone="move"');
});
