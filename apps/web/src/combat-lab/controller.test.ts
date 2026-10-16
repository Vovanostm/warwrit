import { expect, it, vi } from 'vitest';
import type {
  CombatLabAction,
  CombatLabView,
  CombatLabSkill,
  CombatLabBattleConfig,
  CombatLabCatalog,
} from '@warwrit/protocol';
import { handleCombatLabActionReply, latestCombatLabView } from './controller.js';
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
      skillPreview: current.skillPreview?.map((preview) => ({
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
