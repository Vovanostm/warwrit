import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, expect, it, vi } from 'vitest';
import type { CombatLabBattleConfig, CombatLabCatalog, CombatLabView } from '@warwrit/protocol';
import { CombatLab, CombatLabEditor } from './CombatLab.js';
import { BattleEditor } from './BattleEditor.js';
import { createEmptyTiles } from './editor-model.js';
import { createCombatLabSessionCallbacks, type CombatLabSessionPorts } from './controller.js';
import { restartSessionBattle } from './session-lifecycle.js';

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
  expect(html).not.toContain('Бой готов к запуску.');
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
  expect(html).toContain('Бой готов к запуску.');
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
  expect(renderToStaticMarkup(tree)).not.toContain('Бой готов к запуску.');
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
  expect(html).not.toContain('Бой готов к запуску.');
  if ('notice' in patch) expect(html).toContain(`<p role="alert">${patch.notice}</p>`);
  else expect(html).not.toContain('role="alert"');
});

it('blocks start while loading even with a retained catalog and draft', () => {
  expect(renderToStaticMarkup(editor({ loading: true }))).not.toContain('Бой готов к запуску.');
  expect(buttons(editor({ loading: true })).map(({ props }) => props.disabled)).toEqual([
    true,
    false,
  ]);
});

// Server rendering checks initial composition only; mounted effects are browser proof.
it('starts with the editor loading and no selected battle or autoplay controls', () => {
  const html = renderToStaticMarkup(<CombatLab />);
  expect(html).toContain('Загружаются бойцы и карты…');
  expect(html).toContain('Лаборатория боя');
  expect(html).not.toContain('combat-lab-page--fighting');
  expect(html).not.toContain('Меню боя');
  expect(html).not.toContain('Начать автобой');
});

const view = (viewRevision: number): CombatLabView => ({
  version: 1,
  sessionId: 'session',
  battleId: 'battle',
  scenarioId: 'm0-3v3-v1',
  controlledSideId: 'human',
  viewRevision,
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
});

const battleDraft = (): CombatLabBattleConfig => ({
  version: 1,
  name: 'Battle',
  seed: 1,
  map: { name: 'Map', tiles: createEmptyTiles() },
  units: [],
});
function lifecycleCatalog(): CombatLabCatalog {
  const battle: CombatLabBattleConfig = {
    ...battleDraft(),
    units: [
      { id: 'human', profileId: 'fighter', sideId: 'human', position: { q: 1, r: 1 } },
      { id: 'enemy', profileId: 'fighter', sideId: 'opponent', position: { q: 13, r: 8 } },
    ],
  };
  return {
    defaultBattle: battle,
    profiles: [{ id: 'fighter', name: 'Боец', kind: 'human', weaponId: 'sword-shield' }],
  };
}

afterEach(() => vi.unstubAllGlobals());

function sessionCallbacks() {
  const events: string[] = [];
  const ports: CombatLabSessionPorts = {
    generation: { current: 7 },
    sessionRef: { current: { id: 'session', capability: 'secret', view: view(9) } },
    sessionAbort: { current: new AbortController() },
    pendingRef: { current: null },
    deletingRef: { current: false },
    sessionLostRef: { current: false },
    installSession: vi.fn((next) => {
      events.push('install');
      ports.sessionRef.current = next;
    }),
    stopAutoplay: vi.fn(() => events.push('stop')),
    setDeleting: vi.fn((value) => {
      if (!value) expect(ports.deletingRef.current).toBe(false);
      events.push(`deleting:${value}`);
    }),
    setSessionLost: vi.fn((value) => {
      expect(ports.sessionLostRef.current).toBe(value);
      events.push(`lost:${value}`);
    }),
    setPending: vi.fn((value) => {
      expect(ports.pendingRef.current).toBe(value);
      events.push('pending:null');
    }),
    setNotice: vi.fn((text) => events.push(text)),
  };
  const fetch = vi.fn<typeof globalThis.fetch>();
  vi.stubGlobal('fetch', fetch);
  return { ports, events, fetch, ...createCombatLabSessionCallbacks('/private', ports) };
}

it('applies only newer same-session views using current generation and session refs', () => {
  const { ports, applyLatest } = sessionCallbacks();
  const original = ports.sessionRef.current!;
  const incoming = view(10);
  const before = JSON.stringify([original, incoming]);
  applyLatest(incoming, 6);
  ports.sessionRef.current = null;
  applyLatest(incoming, 7);
  ports.sessionRef.current = { ...original, id: 'foreign' };
  applyLatest(incoming, 7);
  ports.sessionRef.current = original;
  applyLatest({ ...incoming, sessionId: 'foreign' }, 7);
  applyLatest({ ...incoming, battleId: 'foreign' }, 7);
  applyLatest(view(9), 7);
  applyLatest(view(8), 7);
  expect(ports.installSession).not.toHaveBeenCalled();
  applyLatest(incoming, 7);
  expect(ports.installSession).toHaveBeenCalledExactlyOnceWith({ ...original, view: incoming });
  expect(JSON.stringify([original, incoming])).toBe(before);
  expect(ports.sessionRef.current?.view).toBe(incoming);
  ports.generation.current += 1; // replacement/unmount invalidates a late read
  applyLatest(view(11), 7);
  expect(ports.installSession).toHaveBeenCalledTimes(1);
  const replacement = {
    id: 'replacement',
    capability: 'new-secret',
    view: { ...view(1), sessionId: 'replacement' },
  };
  ports.sessionRef.current = replacement;
  const next = { ...view(2), sessionId: 'replacement' };
  applyLatest(next, 8);
  expect(ports.installSession).toHaveBeenLastCalledWith({ ...replacement, view: next });
});

it('stops autoplay before every null, pending or deleting end guard', async () => {
  const { ports, events, fetch, endBattle } = sessionCallbacks();
  const current = ports.sessionRef.current;
  ports.sessionRef.current = null;
  expect(await endBattle()).toBe(true);
  ports.sessionRef.current = current;
  ports.pendingRef.current = {};
  expect(await endBattle()).toBe(false);
  ports.pendingRef.current = null;
  ports.deletingRef.current = true;
  expect(await endBattle()).toBe(false);
  expect(events).toEqual(['stop', 'stop', 'stop']);
  expect(fetch).not.toHaveBeenCalled();
});

it.each([200, 404])(
  'ends terminal/lost sessions after confirmed HTTP %s with ordered current-ref cleanup',
  async (status) => {
    const { ports, events, fetch, endBattle } = sessionCallbacks();
    ports.sessionRef.current = {
      ...ports.sessionRef.current!,
      view: { ...view(9), status: 'resolved' },
    };
    ports.sessionLostRef.current = true;
    const captured = ports.sessionAbort.current!;
    let finish!: (response: Response) => void;
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const ending = endBattle();
    expect(ports.deletingRef.current).toBe(true);
    expect(await endBattle()).toBe(false);
    expect(fetch).toHaveBeenCalledExactlyOnceWith('/private/dev/combat-lab/session', {
      method: 'DELETE',
      headers: { 'x-combat-lab-capability': 'secret' },
      signal: captured.signal,
    });
    expect(ports.installSession).not.toHaveBeenCalled();
    expect(ports.generation.current).toBe(7);
    expect(ports.sessionLostRef.current).toBe(true);
    expect(events).toEqual(['stop', 'deleting:true', 'stop']);
    const currentController = new AbortController();
    currentController.signal.addEventListener('abort', () => {
      expect(ports.generation.current).toBe(8);
      expect(ports.sessionRef.current).not.toBeNull();
      events.push('abort');
    });
    ports.sessionAbort.current = currentController;
    ports.pendingRef.current = {}; // cleanup uses current refs after the held response
    finish(new Response(null, { status }));
    expect(await ending).toBe(true);
    expect(captured.signal.aborted).toBe(false);
    expect(currentController.signal.aborted).toBe(true);
    expect(ports.sessionRef.current).toBeNull();
    expect(events).toEqual([
      'stop',
      'deleting:true',
      'stop',
      'abort',
      'install',
      'lost:false',
      'pending:null',
      status === 404
        ? 'Бой больше недоступен. Начните заново или вернитесь к редактору.'
        : 'Диагностическая сессия завершена.',
      'deleting:false',
    ]);
  },
);

it.each([false, true])(
  'preserves optional DELETE signal and same-controller cleanup (controller=%s)',
  async (present) => {
    const { ports, fetch, endBattle } = sessionCallbacks();
    const controller = present ? ports.sessionAbort.current : null;
    ports.sessionAbort.current = controller;
    fetch.mockResolvedValueOnce(new Response(null, { status: 204 }));
    expect(await endBattle()).toBe(true);
    const options = fetch.mock.calls[0]![1]!;
    expect(Object.hasOwn(options, 'signal')).toBe(present);
    if (controller) {
      expect(options.signal).toBe(controller.signal);
      expect(controller.signal.aborted).toBe(true);
    }
  },
);

it.each([
  [
    'valid error',
    () => Promise.resolve(Response.json({ code: 'INVALID_REQUEST' }, { status: 400 })),
    'Бой не принял это действие.',
  ],
  [
    'invalid error JSON',
    () => Promise.resolve(new Response('invalid', { status: 503 })),
    'Запрос завершился с кодом 503.',
  ],
  [
    'network rejection',
    () => Promise.reject(new Error('offline')),
    'Удаление не подтверждено. Сессия остаётся на сервере, пока он работает.',
  ],
  [
    'aborted rejection',
    () => Promise.reject(new DOMException('aborted', 'AbortError')),
    'Удаление не подтверждено. Сессия остаётся на сервере, пока он работает.',
  ],
] as const)(
  'retains the session and current state on %s, then clears deletion admission',
  async (_label, reply, notice) => {
    const { ports, events, fetch, endBattle } = sessionCallbacks();
    const original = ports.sessionRef.current;
    ports.sessionLostRef.current = true;
    fetch.mockImplementationOnce(() => {
      ports.pendingRef.current = {};
      return reply();
    });
    if (_label === 'aborted rejection') ports.sessionAbort.current!.abort();
    expect(await endBattle()).toBe(false);
    expect(ports.sessionRef.current).toBe(original);
    expect(ports.generation.current).toBe(7);
    expect(ports.sessionLostRef.current).toBe(true);
    expect(ports.pendingRef.current).toEqual({});
    expect(ports.installSession).not.toHaveBeenCalled();
    expect(ports.setSessionLost).not.toHaveBeenCalled();
    expect(ports.setPending).not.toHaveBeenCalled();
    expect(events).toEqual(['stop', 'deleting:true', notice, 'deleting:false']);
  },
);

it.each([200, 404])(
  'restarts through real endBattle only after confirmed removal (%s)',
  async (status) => {
    const { ports, fetch, endBattle } = sessionCallbacks();
    const catalog = lifecycleCatalog();
    const current = {
      ...ports.sessionRef.current!,
      view: { ...view(9), battle: catalog.defaultBattle },
    };
    ports.sessionRef.current = current;
    const start = vi.fn(async () => {
      expect(ports.sessionRef.current).toBeNull();
      expect(ports.deletingRef.current).toBe(false);
      expect(ports.generation.current).toBe(8);
    });
    const notice = vi.fn();
    await restartSessionBattle(current, null, false, endBattle, start, notice);
    await restartSessionBattle(current, catalog, true, endBattle, start, notice);
    await restartSessionBattle(null, catalog, false, endBattle, start, notice);
    await restartSessionBattle(
      { ...current, view: { ...current.view, battle: battleDraft() } },
      catalog,
      false,
      endBattle,
      start,
      notice,
    );
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRejectedValueOnce(new Error('offline'));
    await restartSessionBattle(current, catalog, false, endBattle, start, notice);
    expect(start).not.toHaveBeenCalled();
    let finish!: (response: Response) => void;
    fetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const restart = restartSessionBattle(current, catalog, false, endBattle, start, notice);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(start).not.toHaveBeenCalled();
    expect(ports.sessionRef.current).toBe(current);
    finish(new Response(null, { status }));
    await restart;
    expect(start).toHaveBeenCalledExactlyOnceWith(catalog.defaultBattle);
  },
);
