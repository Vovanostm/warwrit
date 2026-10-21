import { afterEach, expect, it, vi } from 'vitest';
import type {
  CombatLabAction,
  CombatLabView,
  CombatLabSkill,
  CombatLabBattleConfig,
  CombatLabCatalog,
} from '@warwrit/protocol';
import {
  commonCombatLabReason,
  createCombatLabSessionCallbacks,
  type CombatLabSessionPorts,
  handleCombatLabActionReply,
  latestCombatLabView,
} from './controller.js';
import { executeFieldCommand, canIssueManualCommand } from './field-command.js';
import { commandSelection, commandReasons } from './command-availability.js';
import { isCombatLabView } from './view-validation.js';
import {
  readSessionView,
  startSessionAttempt,
  admittedBattleDraft,
  readSavedSession,
} from './session-transport.js';
import { createEmptyTiles } from './editor-model.js';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommandDesk } from './CommandDesk.js';

import { handleCombatLabKey, selectCombatSkill } from './command-input.js';
import { autoplayContinuation, runAutoplayStep } from './autoplay.js';
import {
  loadCombatLabCatalog,
  restoreBattleSession,
  applyRestoredSession,
  restartSessionBattle,
  downloadSessionReplay,
} from './session-lifecycle.js';

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

it('keeps older or foreign views from replacing the latest projection', () => {
  const latest = view(9);
  const before = JSON.stringify(latest);

  expect(latestCombatLabView(latest, view(4))).toBe(latest);
  expect(latestCombatLabView(latest, { ...view(10), sessionId: 'replacement-session' })).toBe(
    latest,
  );
  expect(latestCombatLabView(latest, { ...view(10), battleId: 'replacement-battle' })).toBe(latest);
  expect(JSON.stringify(latest)).toBe(before);
});

it.each([
  ['unreadable JSON', null],
  ['bare rejection code', { code: 'INVALID_ACTION' }],
  [
    'wrong request ID',
    {
      version: 1,
      sessionId: 'session',
      battleId: 'battle',
      requestId: 'other-request',
      status: 'accepted',
      viewRevision: 10,
    },
  ],
])(
  'keeps a %s action reply uncertain when the latest-view read fails',
  async (_description, reply) => {
    const action: CombatLabAction = {
      version: 1,
      sessionId: 'session',
      battleId: 'battle',
      requestId: 'request-1',
      expectedViewRevision: 9,
      activationId: 'activation',
      actorId: 'unit',
      intent: { type: 'wait' },
    };
    const refreshLatest = vi.fn(async () => {
      throw new Error('latest-view GET failed');
    });

    await expect(handleCombatLabActionReply(200, reply, action, refreshLatest)).resolves.toEqual({
      status: 'uncertain',
    });
    expect(refreshLatest).toHaveBeenCalledOnce();
  },
);

it('admits field commands from active-actor previews and confirms dangerous movement before selection or dispatch', () => {
  const current = playableView();
  const effects = fieldEffects();
  executeFieldCommand(current, { type: 'move', to: { q: 4, r: 0 } }, null, effects);
  expect(effects.act).not.toHaveBeenCalled();
  executeFieldCommand(current, { type: 'move', to: { q: 1, r: 0 } }, null, effects);
  expect(effects.confirm).toHaveBeenCalledWith(
    'Боец погибнет на пути и не достигнет клетки. Продолжить?',
  );
  expect(effects.selectMovement).not.toHaveBeenCalled();
  expect(effects.act).not.toHaveBeenCalled();
  effects.confirm.mockReturnValue(true);
  executeFieldCommand(current, { type: 'move', to: { q: 1, r: 0 } }, null, effects);
  expect(effects.act).toHaveBeenCalledWith({ type: 'move', to: { q: 1, r: 0 } }, 'Перемещение');
  executeFieldCommand(current, { type: 'attack', targetId: 'enemy' }, null, effects);
  expect(effects.selectTarget).toHaveBeenCalledWith('enemy');
  expect(effects.act).toHaveBeenLastCalledWith({ type: 'attack', targetId: 'enemy' }, 'Атака');
  executeFieldCommand(current, { type: 'attack', targetId: 'unknown' }, null, effects);
  expect(effects.act).toHaveBeenCalledTimes(2);
  executeFieldCommand(current, { type: 'wait' }, 'aimed-shot', effects);
  expect(effects.notice).toHaveBeenCalledWith('Нет допустимой цели.');
  expect(effects.act).toHaveBeenCalledTimes(2);
});

it('keeps manual admission and command reasons tied to actor state rather than inspected units', () => {
  const current = playableView();
  const ready = { autoplay: false, pending: false, deleting: false, sessionLost: false };
  expect(canIssueManualCommand(current, ready)).toBe(true);
  for (const flag of Object.keys(ready))
    expect(canIssueManualCommand(current, { ...ready, [flag]: true })).toBe(false);
  expect(canIssueManualCommand({ ...current, status: 'resolved' }, ready)).toBe(false);
  expect(canIssueManualCommand({ ...current, activation: null }, ready)).toBe(false);
  const selection = commandSelection(current, 'enemy', { q: 1, r: 0 });
  expect(selection.activeActor?.id).toBe('actor');
  expect(selection.selectedTarget?.id).toBe('enemy');
  expect(commandReasons(selection, current, { q: 1, r: 0 }, '').attackReason).toBe('');
  const blocked = { ...current, attackPreview: [], movementPreview: [], availableActions: [] };
  const unavailable = commandReasons(
    commandSelection(blocked, 'enemy', { q: 2, r: 0 }),
    blocked,
    { q: 2, r: 0 },
    '',
  );
  expect(unavailable).toMatchObject({
    attackReason: 'Недостаточно ОД',
    moveReason: 'Недостаточно ОД',
    defendReason: 'Недостаточно ОД',
    waitReason: 'Ход недоступен',
    retreatReason: 'Нужен край отхода',
  });
  expect(commandReasons(selection, current, null, 'Ожидается ответ').moveReason).toBe(
    'Ожидается ответ',
  );
});

it('rejects malformed or foreign transport views while retaining valid scenario boundaries', async () => {
  const current = view(1);
  expect(isCombatLabView(current)).toBe(true);
  expect(isCombatLabView(null)).toBe(false);
  expect(isCombatLabView({ ...current, map: null })).toBe(false);
  expect(isCombatLabView({ ...current, scenarioId: 'unknown' })).toBe(false);
  const sprite = {
    ...current,
    scenarioId: 'sprite-6v6-v1',
    battle: battleDraft(),
    map: { hexes: [], blocked: [], tiles: createEmptyTiles() },
  };
  expect(isCombatLabView(sprite)).toBe(true);
  expect(isCombatLabView({ ...sprite, movementPreview: {} })).toBe(false);
  expect(isCombatLabView({ ...sprite, map: { ...sprite.map, tiles: [] } })).toBe(false);
  await expect(readSessionView(Response.json(current), 'foreign')).rejects.toThrow('invalid view');
  await expect(readSessionView(Response.json(current), 'session')).resolves.toEqual(current);
});

it('keeps create ambiguity closed, ignores cancelled or stale responses, and never retries creation', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  try {
    const attempt = { isCurrent: () => true, created: vi.fn(), failed: vi.fn(), finished: vi.fn() };
    fetch.mockResolvedValueOnce(
      Response.json(view(0), { status: 201, headers: { 'x-combat-lab-capability': 'capability' } }),
    );
    await startSessionAttempt('/api', battleDraft(), new AbortController().signal, attempt);
    expect(attempt.created).toHaveBeenCalledWith({
      id: 'session',
      capability: 'capability',
      view: view(0),
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockRejectedValueOnce(new Error('lost create'));
    await startSessionAttempt('/api', battleDraft(), new AbortController().signal, attempt);
    expect(attempt.failed).toHaveBeenLastCalledWith(
      true,
      expect.stringContaining('Ответ о создании потерян'),
    );
    fetch.mockResolvedValueOnce(
      Response.json({ code: 'INVALID_REQUEST', message: 'Проверьте карту' }, { status: 400 }),
    );
    await startSessionAttempt('/api', battleDraft(), new AbortController().signal, attempt);
    expect(attempt.failed).toHaveBeenLastCalledWith(false, 'Проверьте карту');
    fetch.mockResolvedValueOnce(Response.json({}, { status: 503 }));
    await startSessionAttempt('/api', battleDraft(), new AbortController().signal, attempt);
    expect(attempt.failed).toHaveBeenLastCalledWith(
      true,
      expect.stringContaining('Ответ о создании не получен'),
    );
    fetch.mockResolvedValueOnce(Response.json(view(0), { status: 201 }));
    await startSessionAttempt('/api', battleDraft(), new AbortController().signal, attempt);
    expect(attempt.failed).toHaveBeenLastCalledWith(
      true,
      expect.stringContaining('не подтверждён'),
    );
    fetch.mockResolvedValueOnce(
      Response.json(view(0), { headers: { 'x-combat-lab-capability': 'capability' } }),
    );
    await startSessionAttempt('/api', battleDraft(), new AbortController().signal, {
      ...attempt,
      isCurrent: () => false,
    });
    fetch.mockResolvedValueOnce(Response.json({ code: 'LIMIT_REACHED' }, { status: 409 }));
    await startSessionAttempt('/api', battleDraft(), new AbortController().signal, attempt);
    expect(attempt.failed).toHaveBeenLastCalledWith(false, 'Сейчас запущено слишком много боёв.');
    const aborted = new AbortController();
    aborted.abort();
    fetch.mockRejectedValueOnce(new Error('aborted'));
    await startSessionAttempt('/api', battleDraft(), aborted.signal, attempt);
    expect(attempt.created).toHaveBeenCalledTimes(1);
    expect(attempt.failed).toHaveBeenCalledTimes(5);
    expect(attempt.finished).toHaveBeenCalledTimes(8);
    expect(fetch).toHaveBeenCalledTimes(8);
  } finally {
    vi.unstubAllGlobals();
  }
});

const battleDraft = (): CombatLabBattleConfig => ({
  version: 1,
  name: 'Battle',
  seed: 1,
  map: { name: 'Map', tiles: createEmptyTiles() },
  units: [],
});
const playableView = (): CombatLabView => ({
  ...view(1),
  activation: { id: 'activation', actorId: 'actor', actionPoints: { current: 0, maximum: 4 } },
  units: ['actor', 'enemy'].map((id) => ({
    id,
    name: id,
    sideId: id === 'actor' ? 'human' : 'opponent',
    weaponId: 'bow',
    position: { q: 0, r: 0 },
    status: 'active',
    guarding: false,
    initiative: 1,
    wounds: [],
    pools: {
      health: { current: 10, maximum: 10 },
      armor: { current: 0, maximum: 0 },
      stamina: { current: 0, maximum: 10 },
      morale: { current: 50, maximum: 50 },
    },
  })),
  attackPreview: [{ targetId: 'enemy', hitChance: 50, actionPointCost: 2, staminaCost: 2 }],
  movementPreview: [
    { to: { q: 1, r: 0 }, path: [], actionPointCost: 1, staminaCost: 1, fireDamage: 10 },
  ],
  ruleHints: {
    hit: {
      shakenMoraleThreshold: 20,
      shakenPenalty: 10,
      lowStaminaThresholdPercent: 25,
      lowStaminaPenalty: 10,
    },
    weapons: [{ id: 'bow', actionPointCost: 2, staminaCost: 2 }],
    defend: { actionPointCost: 2, staminaCost: 2 },
    recovery: { staminaPerActivation: 10 },
  },
});
const fieldEffects = () => ({
  notice: vi.fn(),
  confirm: vi.fn(() => false),
  selectMovement: vi.fn(),
  selectTarget: vi.fn(),
  act: vi.fn(),
});

it('renders current command feedback and keeps menu or aimed-skill shortcuts disabled without altering inspection', () => {
  const current = playableView();
  const hotkeyActions = { current: {} as Record<string, { reason: string; run: () => unknown }> };
  const act = vi.fn();
  const actOnField = vi.fn();
  const props = {
    view: current,
    selectedUnitId: 'enemy',
    selectedHex: { q: 1, r: 0 },
    commonReason: '',
    selectedSkillId: null,
    menuOpen: false,
    hotkeyActions,
    act,
    actOnField,
    autoplay: false,
    pending: null,
    retryAction: vi.fn(),
    notice: '',
  };
  const html = renderToStaticMarkup(createElement(CommandDesk, props));
  expect(html).toContain('aria-label="Атаковать" aria-disabled="false"');
  expect(html).toContain('Боец погибнет на пути');
  hotkeyActions.current['1']!.run();
  expect(actOnField).toHaveBeenCalledWith({ type: 'attack', targetId: 'enemy' });
  hotkeyActions.current['3']!.run();
  expect(act).toHaveBeenCalledWith({ type: 'defend' }, 'Защита');
  const aimed = renderToStaticMarkup(
    createElement(CommandDesk, {
      ...props,
      selectedSkillId: 'aimed-shot',
      menuOpen: true,
      autoplay: true,
      pending: { uncertain: true, description: 'Приказ' },
      notice: 'Связь потеряна',
    }),
  );
  expect(aimed).toContain('Выбран приём · Esc — отменить');
  expect(aimed).toContain('Повторить тот же запрос');
  expect(aimed).toContain('Связь потеряна');
  expect(hotkeyActions.current['1']!.reason).toBe('Меню открыто');
  const empty = renderToStaticMarkup(
    createElement(CommandDesk, {
      ...props,
      view: view(1),
      selectedHex: null,
      selectedUnitId: null,
    }),
  );
  expect(empty).toContain('Выберите противника');
  expect(empty).toContain('Цена не опубликована');
});

it('restores only persisted session credentials and admits valid drafts only when creation is idle', () => {
  const storage = {
    getItem: vi.fn<() => string | null>(() => null),
    removeItem: vi.fn(),
  } as unknown as Storage;
  expect(readSavedSession(storage, 'session')).toBeNull();
  vi.mocked(storage.getItem).mockReturnValueOnce(
    JSON.stringify({ id: 'session', capability: 'capability' }),
  );
  expect(readSavedSession(storage, 'session')).toEqual({ id: 'session', capability: 'capability' });
  vi.mocked(storage.getItem).mockReturnValueOnce(JSON.stringify({ id: 'session' }));
  expect(readSavedSession(storage, 'session')).toBeNull();
  expect(storage.removeItem).toHaveBeenCalledWith('session');
  const battle: CombatLabBattleConfig = {
    ...battleDraft(),
    units: [
      { id: 'human', profileId: 'fighter', sideId: 'human', position: { q: 1, r: 1 } },
      { id: 'enemy', profileId: 'fighter', sideId: 'opponent', position: { q: 13, r: 8 } },
    ],
  };
  const catalog: CombatLabCatalog = {
    defaultBattle: battle,
    profiles: [{ id: 'fighter', name: 'Боец', kind: 'human', weaponId: 'sword-shield' }],
  };
  expect(admittedBattleDraft(battle, catalog, false)).toBe(battle);
  expect(admittedBattleDraft(battle, catalog, true)).toBeNull();
  expect(admittedBattleDraft(null, catalog, false)).toBeNull();
  expect(admittedBattleDraft(battle, null, false)).toBeNull();
  expect(admittedBattleDraft(battleDraft(), catalog, false)).toBeNull();
});

it('uses skill previews for the active actor and keeps target skill orders separate from inspection', () => {
  const aimed: CombatLabSkill = {
    skillId: 'aimed-shot',
    name: 'Прицельный выстрел',
    rank: 1,
    target: 'enemy',
    minimumRange: 1,
    maximumRange: 5,
    actionPointCost: 2,
    staminaCost: 4,
    duration: 'instant',
    description: 'Выстрел',
    equipmentAvailable: true,
  };
  const brace: CombatLabSkill = {
    ...aimed,
    skillId: 'shield-brace',
    name: 'Упор щитом',
    target: 'self',
  };
  const current: CombatLabView = {
    ...playableView(),
    skills: [aimed, brace],
    skillPreview: [
      {
        ...aimed,
        rulesetId: 'sprite-prototype-v3',
        revision: 1,
        activationId: 'activation',
        actorId: 'actor',
        targetId: 'enemy',
        legal: true,
      },
      {
        ...brace,
        rulesetId: 'sprite-prototype-v3',
        revision: 1,
        activationId: 'activation',
        actorId: 'actor',
        targetId: 'actor',
        legal: true,
      },
    ],
  };
  const effects = fieldEffects();
  executeFieldCommand(current, { type: 'attack', targetId: 'enemy' }, 'aimed-shot', effects);
  expect(effects.act).toHaveBeenLastCalledWith(
    { type: 'use-skill', skillId: 'aimed-shot', targetId: 'enemy' },
    'Прицельный выстрел',
  );
  expect(effects.selectTarget).not.toHaveBeenCalled();
  executeFieldCommand(current, { type: 'use-skill', skillId: 'shield-brace' }, null, effects);
  expect(effects.act).toHaveBeenLastCalledWith(
    { type: 'use-skill', skillId: 'shield-brace' },
    'Упор щитом',
  );
  executeFieldCommand(
    {
      ...current,
      skillPreview: (current.skillPreview ?? []).map((preview) => ({
        ...preview,
        legal: false,
        reason: 'OUT_OF_RANGE',
      })),
    },
    { type: 'attack', targetId: 'enemy' },
    'aimed-shot',
    effects,
  );
  expect(effects.notice).toHaveBeenLastCalledWith('Цель вне дальности приёма.');
  expect(effects.act).toHaveBeenCalledTimes(2);
});

it('keeps board hotkeys out of interactive focus and preserves global Escape cancellation', () => {
  const attack = vi.fn();
  const wait = vi.fn();
  const cancel = vi.fn();
  const actions = {
    '1': { reason: '', run: attack },
    '4': { reason: '', run: wait },
    '3': { reason: 'Ожидается ответ', run: attack },
  };
  const event = {
    key: '1',
    repeat: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    preventDefault: vi.fn(),
  };
  const board = { closest: (selector: string) => selector === '.battle-view' };
  const input = { closest: () => true };
  const outside = { closest: () => null };
  for (const target of [input, outside, null]) handleCombatLabKey(event, target, actions, cancel);
  for (const flag of ['repeat', 'altKey', 'ctrlKey', 'metaKey', 'shiftKey'])
    handleCombatLabKey({ ...event, [flag]: true }, board, actions, cancel);
  handleCombatLabKey({ ...event, key: '3' }, board, actions, cancel);
  handleCombatLabKey({ ...event, key: '9' }, board, actions, cancel);
  expect(attack).not.toHaveBeenCalled();
  expect(event.preventDefault).not.toHaveBeenCalled();
  handleCombatLabKey(event, board, actions, cancel);
  handleCombatLabKey({ ...event, key: ' ' }, board, actions, cancel);
  expect(attack).toHaveBeenCalledOnce();
  expect(wait).toHaveBeenCalledOnce();
  expect(event.preventDefault).toHaveBeenCalledTimes(2);
  handleCombatLabKey({ ...event, key: 'Escape' }, input, actions, cancel);
  expect(cancel).toHaveBeenCalledOnce();
});

it('interprets technique selection independently from immediate self-target orders', () => {
  const skill: CombatLabSkill = {
    skillId: 'aimed-shot',
    name: 'Выстрел',
    rank: 1,
    target: 'enemy',
    minimumRange: 1,
    maximumRange: 5,
    actionPointCost: 2,
    staminaCost: 4,
    duration: 'instant',
    description: 'Выстрел',
    equipmentAvailable: true,
  };
  const current = {
    ...playableView(),
    skills: [skill, { ...skill, skillId: 'shield-brace' as const, target: 'self' as const }],
  };
  const effects = { act: vi.fn(), select: vi.fn() };
  selectCombatSkill(current, 'rally', null, '', effects);
  selectCombatSkill(current, 'aimed-shot', null, 'Ожидается ответ', effects);
  expect(effects.select).not.toHaveBeenCalled();
  selectCombatSkill(current, 'aimed-shot', null, '', effects);
  expect(effects.select).toHaveBeenLastCalledWith('aimed-shot');
  selectCombatSkill(current, 'aimed-shot', 'aimed-shot', '', effects);
  expect(effects.select).toHaveBeenLastCalledWith(null);
  selectCombatSkill(current, 'shield-brace', null, '', effects);
  expect(effects.act).toHaveBeenCalledWith({ type: 'use-skill', skillId: 'shield-brace' });
});

it('pauses autoplay while a lawful action is pending and stops it on uncertain, lost or terminal sessions', () => {
  const state = {
    enabled: true,
    view: playableView(),
    sessionLost: false,
    deleting: false,
    pending: null,
  };
  expect(autoplayContinuation(state)).toBe('ready');
  expect(autoplayContinuation({ ...state, enabled: false })).toBe('disabled');
  for (const changed of [
    { view: null },
    { view: { ...state.view, status: 'resolved' as const } },
    { sessionLost: true },
    { deleting: true },
    { pending: { uncertain: true } },
  ])
    expect(autoplayContinuation({ ...state, ...changed })).toBe('stopped');
  expect(autoplayContinuation({ ...state, pending: { uncertain: false } })).toBe('paused');
  const opponent = { ...state.view, controlledSideId: 'other-side' };
  expect(autoplayContinuation({ ...state, view: opponent })).toBe('paused');
  const act = vi.fn();
  const ready = { pending: false, deleting: false, sessionLost: false };
  for (const flag of Object.keys(ready))
    runAutoplayStep(state.view, { ...ready, [flag]: true }, act);
  runAutoplayStep(null, ready, act);
  runAutoplayStep(opponent, ready, act);
  expect(act).not.toHaveBeenCalled();
  runAutoplayStep(state.view, ready, act);
  expect(act).toHaveBeenCalledWith({ type: 'autoplay' }, 'Шаг автобоя');
});

it('loads only a catalogue response with profiles and a battle without owning unrelated notices', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  try {
    const catalog = lifecycleCatalog();
    fetch.mockResolvedValueOnce(Response.json(catalog));
    await expect(loadCombatLabCatalog('/api', new AbortController().signal)).resolves.toEqual(
      catalog,
    );
    fetch.mockResolvedValueOnce(Response.json({ profiles: [], defaultBattle: null }));
    await expect(loadCombatLabCatalog('/api', new AbortController().signal)).rejects.toThrow(
      'invalid catalog',
    );
    fetch.mockResolvedValueOnce(Response.json({}, { status: 503 }));
    await expect(loadCombatLabCatalog('/api', new AbortController().signal)).rejects.toThrow(
      'catalog unavailable',
    );
  } finally {
    vi.unstubAllGlobals();
  }
});

it('restores saved sessions by reading only, retains credentials on failures and ignores stale completion', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const saved = JSON.stringify({ id: 'session', capability: 'capability' });
  const storage = {
    getItem: vi.fn<() => string | null>(() => saved),
    removeItem: vi.fn(),
  } as unknown as Storage;
  const signal = new AbortController().signal;
  const effects = { install: vi.fn(), draft: vi.fn(), selectUnit: vi.fn(), notice: vi.fn() };
  try {
    const current = { ...playableView(), battle: lifecycleCatalog().defaultBattle };
    fetch.mockResolvedValueOnce(Response.json(current));
    const restored = await restoreBattleSession(
      '/api',
      () => storage,
      'saved-session',
      signal,
      () => true,
    );
    applyRestoredSession(restored, effects);
    expect(effects.install).toHaveBeenCalledWith({
      id: 'session',
      capability: 'capability',
      view: current,
    });
    expect(effects.selectUnit).toHaveBeenCalledWith('actor');
    expect(effects.draft).toHaveBeenCalledWith(current.battle);
    fetch.mockRejectedValueOnce(new Error('offline'));
    applyRestoredSession(
      await restoreBattleSession(
        '/api',
        () => storage,
        'saved-session',
        signal,
        () => true,
      ),
      effects,
    );
    expect(effects.notice).toHaveBeenLastCalledWith(
      expect.stringContaining('Не удалось восстановить бой'),
    );
    expect(storage.removeItem).not.toHaveBeenCalled();
    fetch.mockResolvedValueOnce(Response.json(current));
    expect(
      await restoreBattleSession(
        '/api',
        () => storage,
        'saved-session',
        signal,
        () => false,
      ),
    ).toEqual({ status: 'stale' });
    fetch.mockResolvedValueOnce(Response.json({}, { status: 404 }));
    applyRestoredSession(
      await restoreBattleSession(
        '/api',
        () => storage,
        'saved-session',
        signal,
        () => true,
      ),
      effects,
    );
    expect(storage.removeItem).toHaveBeenCalledWith('saved-session');
    expect(effects.notice).toHaveBeenLastCalledWith(
      'Сохранённая сессия недоступна. Создайте новый бой.',
    );
    vi.mocked(storage.getItem).mockReturnValueOnce(null);
    expect(
      await restoreBattleSession(
        '/api',
        () => storage,
        'saved-session',
        signal,
        () => true,
      ),
    ).toEqual({ status: 'absent' });
    applyRestoredSession({ status: 'absent' }, effects);
    expect(effects.install).toHaveBeenCalledOnce();
    expect(fetch.mock.calls.every(([, options]) => options.method === undefined)).toBe(true);
  } finally {
    vi.unstubAllGlobals();
  }
});

it('downloads an authenticated replay without changing a session and reports unavailable or unreadable responses', async () => {
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  const current = {
    id: 'session',
    capability: 'capability',
    view: { ...view(1), battle: lifecycleCatalog().defaultBattle },
  };
  const save = vi.fn();
  const notice = vi.fn();
  try {
    await downloadSessionReplay('/api', null, false, save, notice);
    await downloadSessionReplay('/api', current, true, save, notice);
    expect(fetch).not.toHaveBeenCalled();
    const replay = { schemaVersion: 1, commands: [] };
    fetch.mockResolvedValueOnce(Response.json(replay));
    await downloadSessionReplay('/api', current, false, save, notice);
    expect(save).toHaveBeenCalledWith(replay, 'Battle.json');
    expect(fetch).toHaveBeenLastCalledWith('/api/dev/combat-lab/session/replay', {
      headers: { 'x-combat-lab-capability': 'capability' },
    });
    fetch.mockResolvedValueOnce(Response.json({}, { status: 404 }));
    await downloadSessionReplay('/api', current, false, save, notice);
    expect(notice).toHaveBeenLastCalledWith(
      'Бой больше недоступен. Начните заново или вернитесь к редактору.',
    );
    fetch.mockResolvedValueOnce(new Response('unreadable'));
    await downloadSessionReplay('/api', current, false, save, notice);
    expect(notice).toHaveBeenLastCalledWith('Повтор боя скачать не удалось.');
    expect(save).toHaveBeenCalledOnce();
  } finally {
    vi.unstubAllGlobals();
  }
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

it('keeps a browser-denied storage getter from crashing battle restoration', async () => {
  const result = await restoreBattleSession(
    '/api',
    () => {
      throw new DOMException('Storage access denied', 'SecurityError');
    },
    'saved-session',
    new AbortController().signal,
    () => true,
  );
  expect(result).toEqual({
    status: 'failed',
    notice: 'Не удалось восстановить бой. Обновите страницу для повторного чтения.',
  });
});

it('rejects malformed initiative forecasts before admitting a session response', async () => {
  const current = view(1);
  expect(isCombatLabView({ ...current, nextRoundInitiative: { round: 2, unitIds: [] } })).toBe(
    true,
  );
  for (const forecast of [
    null,
    { round: 2 },
    { round: 3, unitIds: [] },
    { round: 2, unitIds: ['unknown'] },
  ]) {
    await expect(
      readSessionView(Response.json({ ...current, nextRoundInitiative: forecast }), 'session'),
    ).rejects.toThrow('invalid view');
  }
});

it.each([
  [{ sessionLost: true }, 'Бой недоступен'],
  [{ sessionLost: false }, 'Автобой включён — остановите для ручного приказа'],
  [{ sessionLost: false, autoplay: false }, 'Завершаем бой'],
  [{ sessionLost: false, autoplay: false, deleting: false }, 'Результат не подтверждён'],
  [
    { sessionLost: false, autoplay: false, deleting: false, pending: { uncertain: false } },
    'Ожидается ответ',
  ],
  [{ sessionLost: false, autoplay: false, deleting: false, pending: null }, 'Бой завершён'],
])(
  'preserves the highest priority common reason with lower reasons present (%j)',
  (patch, expected) => {
    expect(
      commonCombatLabReason({
        autoplay: true,
        deleting: true,
        pending: { uncertain: true },
        resolved: true,
        controlling: false,
        ...patch,
      }),
    ).toBe(expected);
  },
);

it.each([
  [false, 'Ход противника'],
  [true, ''],
])(
  'keeps no-view/uncontrollable and all-clear common feedback (controlling=%s)',
  (controlling, expected) => {
    expect(
      commonCombatLabReason({
        sessionLost: false,
        autoplay: false,
        deleting: false,
        pending: null,
        resolved: false,
        controlling,
      }),
    ).toBe(expected);
  },
);

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
