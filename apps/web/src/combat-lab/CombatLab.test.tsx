import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import type { CombatLabCatalog } from '@warwrit/protocol';
import { CombatLabEditor } from './CombatLab.js';
import { BattleEditor } from './BattleEditor.js';
import { createEmptyTiles } from './editor-model.js';

const catalog: CombatLabCatalog = {
  profiles: [
    { id: 'sword', name: 'Мечник', kind: 'human', weaponId: 'sword-shield' },
    { id: 'wolf', name: 'Волк', kind: 'creature', weaponId: 'raider' },
  ],
  defaultBattle: {
    version: 1,
    name: 'Бой',
    seed: 1,
    map: { name: 'Поле', tiles: createEmptyTiles() },
    units: [
      {
        id: 'human',
        profileId: 'sword',
        sideId: 'human',
        position: { q: 2, r: 2 },
        skillRanks: {},
      },
      {
        id: 'wolf',
        profileId: 'wolf',
        sideId: 'opponent',
        position: { q: 12, r: 2 },
        skillRanks: {},
      },
    ],
  },
};

function editor(patch: Partial<Parameters<typeof CombatLabEditor>[0]> = {}) {
  return CombatLabEditor({
    catalog,
    draft: catalog.defaultBattle,
    loading: false,
    starting: false,
    unresolved: false,
    notice: '',
    onChange: vi.fn(),
    onStart: vi.fn(),
    ...patch,
  });
}

type ControlProps = { children?: ReactNode; disabled?: boolean; onClick?: () => void };

function elements(node: ReactNode): ReactElement<ControlProps>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<ControlProps>(child)) return [];
    // BattleEditor owns hooks; inspect its boundary without inventing a lifecycle runner.
    if (child.type === BattleEditor) return [child];
    if (typeof child.type === 'function') {
      return elements((child.type as (props: ControlProps) => ReactNode)(child.props));
    }
    return [child, ...elements(child.props.children)];
  });
}

function buttons(tree: ReactNode) {
  return elements(tree).filter((element) => element.type === 'button');
}

it.each([
  [{ catalog: null, draft: null, loading: true }, 'Загружаются бойцы и карты…', true],
  [{ catalog: null, draft: null }, 'Редактор боя недоступен.', true],
  [{ catalog: null, draft: null, notice: 'Ошибка загрузки' }, '', true],
  [{ draft: null }, '', false],
])('preserves catalog states and absent draft controls (%j)', (patch, message, resetDisabled) => {
  const tree = editor(patch);
  const html = renderToStaticMarkup(tree);
  if (message) expect(html).toContain(message);
  else expect(html).not.toContain('Редактор боя недоступен.');
  expect(html).not.toContain('Название боя');
  expect(buttons(tree).map(({ props }) => props.disabled)).toEqual([true, resetDisabled]);
});

it('renders the valid draft and forwards edits, start and exact catalog reset', () => {
  const onChange = vi.fn();
  const onStart = vi.fn();
  const tree = editor({ onChange, onStart });
  const html = renderToStaticMarkup(tree);
  expect(html).toContain('Название боя');
  expect(html).toContain('Мельничная тварь предупреждает о тяжёлом ударе.');
  expect(html).not.toContain('battle-editor-errors');
  expect(buttons(tree).map(({ props }) => props.disabled)).toEqual([false, false]);
  const battleEditor = elements(tree).find((element) => element.type === BattleEditor)!;
  const next = { ...catalog.defaultBattle, seed: 20261009 };
  (battleEditor.props as Parameters<typeof BattleEditor>[0]).onChange(next);
  buttons(tree)[0]!.props.onClick!();
  buttons(tree)[1]!.props.onClick!();
  expect(onStart).toHaveBeenCalledExactlyOnceWith();
  expect(onChange.mock.calls).toEqual([[next], [catalog.defaultBattle]]);
});

it('keeps invalid draft feedback and blocks only start', () => {
  const tree = editor({ draft: { ...catalog.defaultBattle, name: '' } });
  expect(renderToStaticMarkup(tree)).toContain('Укажите название боя длиной до 80 символов.');
  expect(buttons(tree).map(({ props }) => props.disabled)).toEqual([true, false]);
});

it.each([
  [{ starting: true }, 'Начинаем бой…'],
  [{ unresolved: true, notice: 'Результат создания боя не подтверждён' }, 'Начать бой'],
])('disables edits, start and reset independently during %j', (patch, label) => {
  const tree = editor(patch);
  const html = renderToStaticMarkup(tree);
  expect(buttons(tree).map(({ props }) => props.disabled)).toEqual([true, true]);
  expect(elements(tree).find((element) => element.type === BattleEditor)!.props.disabled).toBe(
    true,
  );
  expect(html).toContain(label);
  if ('notice' in patch) expect(html).toContain(`<p role="alert">${patch.notice}</p>`);
  else expect(html).not.toContain('role="alert"');
});

it('blocks start while loading even with a retained catalog and draft', () => {
  expect(buttons(editor({ loading: true })).map(({ props }) => props.disabled)).toEqual([
    true,
    false,
  ]);
});
