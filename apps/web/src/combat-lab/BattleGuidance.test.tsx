import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { BattlePresentationView } from './battle-presentation.js';
import { BattleGuidance } from './BattleGuidance.js';

it('describes movement and weapon zones without a combined-zone legend item', () => {
  const html = renderToStaticMarkup(
    <BattleGuidance
      view={{ status: 'active', skills: [] } as unknown as BattlePresentationView}
      status="Ожидание"
      reachUnit={undefined}
      reach={undefined}
      reachNote=""
      selectedSkillId={null}
    />,
  );

  expect(html).toContain('data-zone="move"');
  expect(html).toContain('data-zone="weapon"');
  expect(html).not.toContain('data-zone="both"');
  expect(html).not.toContain('Обе зоны');
});
