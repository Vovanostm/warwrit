import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { EncounterCommandDesk } from './EncounterCommandDesk.js';

const base = {
  targetId: 'enemy-1',
  targetLabel: 'Волк',
  destination: { q: 1, r: 0 },
  destinationLabel: 'клетка 1, 0',
  moveAllowed: true,
  attackAllowed: true,
  defendAllowed: true,
  waitAllowed: true,
  retreatAllowed: true,
  autoplayAllowed: true,
  fleeAllowed: false,
  surrenderAllowed: false,
  busy: false,
  onAct: () => {},
};

it('renders shared icon commands with only server-provided attack and movement costs', () => {
  const html = renderToStaticMarkup(
    <EncounterCommandDesk
      {...base}
      attackCost={{ actionPointCost: 2, staminaCost: 3 }}
      moveCost={{ actionPointCost: 1, staminaCost: 2 }}
    />,
  );

  expect(html).toContain('aria-label="Атаковать"');
  expect(html).toContain('aria-label="Переместиться"');
  expect(html).toContain('aria-label="Защищаться"');
  expect(html).toContain('aria-label="Завершить ход"');
  expect(html).toContain('Автобой: одно действие');
  expect(html).toContain('role="group" aria-label="Дополнительные приказы"');
  expect(html).toContain('aria-label="2 ОД · 3 сил"');
  expect(html).toContain('aria-label="1 ОД · 2 сил"');
  expect(html).not.toContain('aria-label="Бежать"');
});

it('shows legacy commands without inventing attack or movement prices', () => {
  const html = renderToStaticMarkup(<EncounterCommandDesk {...base} />);

  expect(html).toContain('aria-label="Атаковать"');
  expect(html).toContain('aria-label="Переместиться"');
  expect(html).not.toContain('battle-action-cost');
  expect(html).toContain('title="клетка 1, 0"');
});

it('disables primary commands when their required target data is absent', () => {
  const html = renderToStaticMarkup(
    <EncounterCommandDesk {...base} targetId="" destination={null} />,
  );
  const attack = html.match(/<button[^>]*aria-label="Атаковать"[^>]*>/)?.[0] ?? '';
  const move = html.match(/<button[^>]*aria-label="Переместиться"[^>]*>/)?.[0] ?? '';

  expect(attack).toContain('aria-disabled="true"');
  expect(attack).toContain('disabled=""');
  expect(move).toContain('aria-disabled="true"');
  expect(move).toContain('disabled=""');
});

it('places state restrictions in the shared full-width feedback row', () => {
  const html = renderToStaticMarkup(
    <EncounterCommandDesk {...base} feedback="Переноска и спасение пока недоступны." />,
  );

  expect(html).toContain(
    '</div><div class="battle-feedback-row" role="status"><p>Переноска и спасение пока недоступны.</p></div>',
  );
});
