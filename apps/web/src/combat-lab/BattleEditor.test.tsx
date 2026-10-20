import { renderToStaticMarkup } from 'react-dom/server';
import { Children, isValidElement } from 'react';
import type * as React from 'react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import type { CombatLabBattleConfig, CombatLabCatalog } from '@warwrit/protocol';
import { BattleEditor } from './BattleEditor.js';
import type { BattleEditorProps } from './BattleEditor.js';
import { createEmptyTiles } from './editor-model.js';

// Exercise the component's rendered controls and callbacks in the existing Node runner.
// Keep state across explicit renders; browser lifecycle/layout remains the played gate.
const hooks = vi.hoisted(() => ({ active: false, states: [] as unknown[], cursor: 0 }));
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof React>();
  return {
    ...actual,
    useState(initial: unknown) {
      if (!hooks.active) return actual.useState(initial);
      const index = hooks.cursor++;
      if (!(index in hooks.states)) hooks.states[index] = initial;
      return [
        hooks.states[index],
        (next: unknown) => {
          hooks.states[index] =
            typeof next === 'function'
              ? (next as (current: unknown) => unknown)(hooks.states[index])
              : next;
        },
      ];
    },
    useEffect(...args: Parameters<typeof actual.useEffect>) {
      if (!hooks.active) actual.useEffect(...args);
    },
    useRef(initial: unknown) {
      return hooks.active ? { current: initial } : actual.useRef(initial);
    },
  };
});

afterEach(() => {
  hooks.active = false;
  hooks.states = [];
  vi.unstubAllGlobals();
});

type ControlProps = {
  children?: ReactNode;
  disabled?: boolean;
  value?: string;
  onClick?: () => void;
  onChange?: (event: { target: { value: string } }) => void;
};

function controls(node: ReactNode): ReactElement<ControlProps>[] {
  return Children.toArray(node).flatMap((child) => {
    if (!isValidElement<ControlProps>(child)) return [];
    if (typeof child.type === 'function') {
      return controls((child.type as (props: ControlProps) => ReactNode)(child.props));
    }
    return [child, ...controls(child.props.children)];
  });
}

function control(node: ReactNode, tag: string, text = ''): ReactElement<ControlProps> {
  const found = controls(node).find(
    (element) => element.type === tag && renderToStaticMarkup(element).includes(text),
  );
  expect(found, `${tag}: ${text}`).toBeDefined();
  return found!;
}

function editor(catalog: CombatLabCatalog) {
  hooks.active = true;
  let value = structuredClone(catalog.defaultBattle);
  const onChange = vi.fn((next: CombatLabBattleConfig) => {
    value = next;
  });
  return {
    onChange,
    get value() {
      return value;
    },
    render(patch: Partial<BattleEditorProps> = {}) {
      hooks.cursor = 0;
      return BattleEditor({ catalog, value, onChange, ...patch });
    },
  };
}

function editorCatalog(): CombatLabCatalog {
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
  return {
    profiles: [
      { id: 'sword', name: 'Мечник', kind: 'human', weaponId: 'sword-shield' },
      { id: 'wolf', name: 'Волк', kind: 'creature', weaponId: 'raider' },
    ],
    defaultBattle: battle,
    presets: [
      { id: 'default', battle },
      {
        id: 'human-duel',
        battle: {
          ...structuredClone(battle),
          name: 'Учебный поединок',
          seed: 42,
          units: battle.units.map((unit) => ({ ...unit, profileId: 'sword' })),
        },
      },
    ],
  };
}

it('keeps editor cells keyboard-addressable and identifies occupied and blocked cells', () => {
  const catalog = editorCatalog();
  const battle = catalog.defaultBattle;
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

it('loads the exact catalog preset only on explicit load, detaches edits and keeps mill reset', () => {
  const catalog = editorCatalog();
  const original = structuredClone(catalog);
  const source = catalog.presets!.find(({ id }) => id === 'human-duel')!.battle;
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const test = editor(catalog);
  let tree = test.render();
  expect(test.value).toEqual(catalog.defaultBattle);
  expect(control(tree, 'button', 'Загрузить сценарий').props.disabled).toBe(true);
  control(tree, 'select', 'Выберите сценарий').props.onChange!({
    target: { value: 'human-duel' },
  });
  tree = test.render();
  expect(test.onChange).not.toHaveBeenCalled();
  expect(control(tree, 'button', 'Загрузить сценарий').props.disabled).toBe(false);
  control(tree, 'button', 'Загрузить сценарий').props.onClick!();
  expect(test.value).toEqual(source);
  expect(
    test.value.units.every(
      ({ profileId }) => catalog.profiles.find(({ id }) => id === profileId)?.kind === 'human',
    ),
  ).toBe(true);
  expect(test.value.map.tiles[0]).not.toBe(source.map.tiles[0]);
  expect(test.value.units[0]!.position).not.toBe(source.units[0]!.position);
  expect(test.value.units[0]!.skillRanks).not.toBe(source.units[0]!.skillRanks);
  tree = test.render();
  expect(renderToStaticMarkup(tree)).toContain('загружен в черновик');
  const name = control(control(tree, 'label', 'Название боя'), 'input');
  name.props.onChange!({ target: { value: 'Мой бой' } });
  tree = test.render();
  control(tree, 'button', 'aria-label="Убрать Мечник"').props.onClick!();
  expect(test.value.name).toBe('Мой бой');
  expect(test.value.units).toHaveLength(1);
  tree = test.render();
  expect(control(tree, 'select', 'Выберите сценарий').props.value).toBe('human-duel');
  control(tree, 'button', 'Загрузить сценарий').props.onClick!();
  expect(test.value).toEqual(source);
  expect(catalog).toEqual(original);
  tree = test.render();
  control(tree, 'button', 'Сбросить на сценарий мельницы').props.onClick!();
  expect(test.value).toEqual(catalog.defaultBattle);
  expect(test.value).not.toBe(catalog.defaultBattle);
  expect(control(test.render(), 'select', 'Выберите сценарий').props.value).toBe('');
  expect(fetch).not.toHaveBeenCalled();
});

it.each([undefined, []])(
  'keeps the legacy draft and reset usable without presets (%s)',
  (presets) => {
    const { presets: _presets, ...catalog } = editorCatalog();
    const test = editor(presets === undefined ? catalog : { ...catalog, presets });
    const tree = test.render();
    expect(renderToStaticMarkup(tree)).not.toContain('Сценарий для загрузки');
    control(control(tree, 'label', 'Название боя'), 'input').props.onChange!({
      target: { value: 'Правка' },
    });
    control(test.render(), 'button', 'Сбросить на сценарий мельницы').props.onClick!();
    expect(test.value).toEqual(catalog.defaultBattle);
  },
);

it('rejects invalid or unavailable presets and prevents replacement while disabled', () => {
  const catalog = editorCatalog();
  const test = editor(catalog);
  control(test.render(), 'select', 'Выберите сценарий').props.onChange!({
    target: { value: 'human-duel' },
  });
  const disabled = test.render({ disabled: true });
  expect(control(disabled, 'select', 'Выберите сценарий').props.disabled).toBe(true);
  expect(control(disabled, 'button', 'Загрузить сценарий').props.disabled).toBe(true);
  control(disabled, 'button', 'Загрузить сценарий').props.onClick!();
  expect(test.onChange).not.toHaveBeenCalled();
  const invalid = {
    ...catalog,
    presets: [{ id: 'human-duel', battle: { ...catalog.presets![1]!.battle, units: [] } }],
  };
  control(test.render({ catalog: invalid }), 'button', 'Загрузить сценарий').props.onClick!();
  expect(test.onChange).not.toHaveBeenCalled();
  expect(renderToStaticMarkup(test.render({ catalog: invalid }))).toContain('Черновик не заменён');
  const unavailable = test.render({ catalog: { ...catalog, presets: [catalog.presets![0]!] } });
  expect(control(unavailable, 'button', 'Загрузить сценарий').props.disabled).toBe(true);
  control(unavailable, 'button', 'Загрузить сценарий').props.onClick!();
  expect(test.onChange).not.toHaveBeenCalled();
  expect(test.value).toEqual(catalog.defaultBattle);
});
