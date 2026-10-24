import { expect, it, vi } from 'vitest';
import type {
  CombatLabAction,
  CombatLabView,
  CombatLabSkill,
  CombatLabSkillId,
  CombatLabBattleConfig,
  CombatLabCatalog,
} from '@warwrit/protocol';
import {
  createCombatLabActionCallbacks,
  createCombatLabReadCallbacks,
  createCombatLabSessionCallbacks,
  type PendingAction,
  admitCombatLabAction,
  markCombatLabActionUncertain,
  settleCombatLabActionReply,
  type CombatLabActionPorts,
  commonCombatLabReason,
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
import type { ActiveSession } from './session-transport.js';
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

it('sends no manual command while autoplay, pending, deleting, lost, opponent or terminal', () => {
  const ready = { autoplay: false, pending: false, deleting: false, sessionLost: false };
  const human = playableView();
  const opponent = {
    ...human,
    activation: { ...human.activation!, actorId: 'enemy' },
  };
  const terminal = { ...human, status: 'resolved' as const };
  const blocked = [
    [human, { ...ready, autoplay: true }],
    [human, { ...ready, pending: true }],
    [human, { ...ready, deleting: true }],
    [human, { ...ready, sessionLost: true }],
    [opponent, ready],
    [terminal, ready],
  ] as const;
  for (const [current, flags] of blocked) expect(canIssueManualCommand(current, flags)).toBe(false);
  const effects = fieldEffects();
  for (const [current, flags] of blocked) {
    if (canIssueManualCommand(current, flags))
      executeFieldCommand(current, { type: 'attack', targetId: 'enemy' }, null, effects);
  }
  expect(effects.act).not.toHaveBeenCalled();
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

const submittedAction: CombatLabAction = {
  version: 1,
  sessionId: 'session',
  battleId: 'battle',
  requestId: 'original-request',
  expectedViewRevision: 1,
  activationId: 'activation',
  actorId: 'actor',
  intent: { type: 'wait' },
};

function actionPorts() {
  return {
    sessionRef: { current: { id: 'session', capability: 'capability', view: playableView() } },
    pendingRef: { current: null },
    deletingRef: { current: false },
    generation: { current: 1 },
    setPending: vi.fn(),
    setNotice: vi.fn(),
    stopAutoplay: vi.fn(),
    setSelectedSkillId: vi.fn(),
  } satisfies CombatLabActionPorts;
}

it('reserves an action synchronously and blocks competing new orders or a different retry body', () => {
  const ports = actionPorts();
  const body = JSON.stringify(submittedAction);
  const admitted = admitCombatLabAction(ports, body, 'Wait', false)!;
  const competing = [
    admitCombatLabAction(ports, body, 'Another order', false),
    admitCombatLabAction(ports, `${body} `, 'Different bytes', true),
  ];
  expect({
    admitted,
    pending: ports.pendingRef.current,
    effects: ports.setPending.mock.calls,
    notice: ports.setNotice.mock.calls,
    competing,
  }).toEqual({
    admitted: {
      current: ports.sessionRef.current,
      flight: { body, description: 'Wait', uncertain: false },
    },
    pending: { body, description: 'Wait', uncertain: false },
    effects: [[{ body, description: 'Wait', uncertain: false }]],
    notice: [['']],
    competing: [null, null],
  });
});

it.each(['missing session', 'deleting', 'terminal', 'opponent'])(
  'refuses a new action while %s without changing pending or notice',
  (reason) => {
    const ports: CombatLabActionPorts = actionPorts();
    if (reason === 'missing session') ports.sessionRef.current = null;
    if (reason === 'deleting') ports.deletingRef.current = true;
    if (reason === 'terminal')
      ports.sessionRef.current = {
        ...ports.sessionRef.current!,
        view: { ...playableView(), status: 'resolved' },
      };
    if (reason === 'opponent')
      ports.sessionRef.current = {
        ...ports.sessionRef.current!,
        view: { ...playableView(), activation: null },
      };
    expect({
      result: admitCombatLabAction(ports, JSON.stringify(submittedAction), 'Wait', false),
      pending: ports.pendingRef.current,
      pendingCalls: vi.mocked(ports.setPending).mock.calls,
      noticeCalls: vi.mocked(ports.setNotice).mock.calls,
    }).toEqual({
      result: null,
      pending: null,
      pendingCalls: [],
      noticeCalls: [],
    });
  },
);

it.each([
  'Ответ неизвестен. Повтор отправит то же действие с тем же идентификатором.',
  'Сервер не подтвердил результат. Повтор отправит то же действие с тем же ID.',
  'Ответ на действие не подтвержден. Повтор отправит то же действие с тем же ID.',
  'Доставка неизвестна. Повторить можно только то же действие с тем же ID.',
])('retains exact pending bytes and selection on uncertainty: %s', (notice) => {
  const ports = actionPorts();
  const body = JSON.stringify(submittedAction, null, 2);
  const { flight } = admitCombatLabAction(ports, body, 'Original order', false)!;
  markCombatLabActionUncertain(ports, flight, notice);
  expect({
    pending: ports.pendingRef.current,
    state: ports.setPending.mock.lastCall,
    notice: ports.setNotice.mock.lastCall,
    stops: ports.stopAutoplay.mock.calls.length,
    selection: ports.setSelectedSkillId.mock.calls,
  }).toEqual({
    pending: { body, description: 'Original order', uncertain: true },
    state: [{ body, description: 'Original order', uncertain: true }],
    notice: [notice],
    stops: 1,
    selection: [],
  });
});

it.each(['active', 'resolved'] as const)(
  'retries the original body after the view becomes %s',
  (status) => {
    const ports: CombatLabActionPorts = actionPorts();
    const body = JSON.stringify(submittedAction, null, 2);
    const { flight } = admitCombatLabAction(ports, body, 'Original order', false)!;
    markCombatLabActionUncertain(ports, flight, 'Delivery unknown');
    ports.sessionRef.current = { ...ports.sessionRef.current!, view: { ...view(8), status } };
    const retry = admitCombatLabAction(ports, flight.body, flight.description, true)!;
    expect({
      body: retry.flight.body,
      requestId: JSON.parse(retry.flight.body).requestId,
      capability: retry.current.capability,
      pending: ports.pendingRef.current,
    }).toEqual({
      body,
      requestId: 'original-request',
      capability: 'capability',
      pending: { body, description: 'Original order', uncertain: false },
    });
  },
);

it.each([
  [{ status: 'accepted' }, 1, 1, [[null]], ''],
  [{ status: 'accepted' }, 2, 0, [[null]], ''],
  [
    { status: 'rejected', code: 'INVALID_ACTION' },
    2,
    1,
    [],
    'Такое действие сейчас недоступно. Состояние боя обновлено.',
  ],
] as const)(
  'settles %j using the current revision %s after deferred refresh',
  async (outcome, revision, stops, selection, notice) => {
    const ports = actionPorts();
    admitCombatLabAction(ports, JSON.stringify(submittedAction), 'Wait', false);
    let finishRefresh!: () => void;
    const refresh = new Promise<void>((resolve) => {
      finishRefresh = resolve;
    });
    const reply = handleCombatLabActionReply(
      200,
      {
        ...submittedAction,
        ...outcome,
        viewRevision: 2,
      },
      submittedAction,
      () => refresh,
    );
    ports.sessionRef.current = {
      ...ports.sessionRef.current,
      view: { ...playableView(), viewRevision: revision },
    };
    finishRefresh();
    const settled = await reply;
    if (settled.status === 'uncertain') throw new Error('Expected a verified acknowledgement');
    settleCombatLabActionReply(ports, settled, submittedAction, 1);
    expect({
      pending: ports.pendingRef.current,
      state: ports.setPending.mock.lastCall,
      notice: ports.setNotice.mock.lastCall,
      stops: ports.stopAutoplay.mock.calls.length,
      selection: ports.setSelectedSkillId.mock.calls,
    }).toEqual({
      pending: null,
      state: [null],
      notice: [notice],
      stops,
      selection,
    });
  },
);

it('does not clear a replacement generation pending action', () => {
  const ports = actionPorts();
  const { flight } = admitCombatLabAction(ports, JSON.stringify(submittedAction), 'Wait', false)!;
  ports.generation.current = 2;
  settleCombatLabActionReply(ports, { status: 'accepted' }, submittedAction, 1);
  expect({ pending: ports.pendingRef.current, writes: ports.setPending.mock.calls }).toEqual({
    pending: flight,
    writes: [[flight]],
  });
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function transportPorts() {
  return {
    ...actionPorts(),
    deletingRef: { current: false as boolean },
    sessionRef: { current: actionPorts().sessionRef.current as ActiveSession | null },
    pendingRef: { current: null as PendingAction | null },
    sessionAbort: { current: new AbortController() as AbortController | null },
    sessionLostRef: { current: false },
    autoplayRef: { current: false },
    selectedSkillRef: { current: null as CombatLabSkillId | null },
    setSessionLost: vi.fn(),
    refreshLatest: vi.fn(async (_session: ActiveSession, _generation: number) => {}),
  };
}

function acceptedReply(ports: ReturnType<typeof transportPorts>) {
  return { ...JSON.parse(ports.pendingRef.current!.body), status: 'accepted', viewRevision: 2 };
}

it('constructs requests from replaced current refs and synchronously reserves one flight', async () => {
  const ports = transportPorts();
  const callbacks = createCombatLabActionCallbacks('/private', ports);
  const post = deferred<Response>();
  const fetch = vi.fn(() => post.promise);
  vi.stubGlobal('fetch', fetch);
  try {
    ports.sessionRef.current = {
      id: 'new-session',
      capability: 'new-capability',
      view: {
        ...playableView(),
        sessionId: 'new-session',
        battleId: 'new-battle',
        viewRevision: 9,
        activation: {
          id: 'new-activation',
          actorId: 'actor',
          actionPoints: { current: 4, maximum: 4 },
        },
      },
    };
    ports.sessionAbort.current = new AbortController();
    ports.autoplayRef.current = true;
    callbacks.act({ type: 'wait' }, 'blocked manual');
    ports.autoplayRef.current = false;
    ports.selectedSkillRef.current = 'aimed-shot';
    callbacks.act({ type: 'wait' }, 'blocked skill');
    expect({ requests: fetch.mock.calls, pending: ports.pendingRef.current }).toEqual({
      requests: [],
      pending: null,
    });
    ports.selectedSkillRef.current = null;
    const completion = callbacks.act({ type: 'wait' }, 'current order');
    callbacks.act({ type: 'autoplay' }, 'competing autoplay');
    callbacks.retryAction();
    const action = JSON.parse(ports.pendingRef.current!.body) as CombatLabAction;
    expect(fetch.mock.calls).toEqual([
      [
        '/private/dev/combat-lab/new-session/actions',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-combat-lab-capability': 'new-capability',
          },
          body: JSON.stringify({
            version: 1,
            sessionId: 'new-session',
            battleId: 'new-battle',
            requestId: action.requestId,
            expectedViewRevision: 9,
            activationId: 'new-activation',
            actorId: 'actor',
            intent: { type: 'wait' },
          }),
          signal: ports.sessionAbort.current.signal,
        },
      ],
    ]);
    expect(action.requestId).toMatch(/^[0-9a-f-]{36}$/u);
    post.resolve(Response.json(acceptedReply(ports)));
    await completion;
  } finally {
    vi.unstubAllGlobals();
  }
});

it.each(['missing', 'deleting', 'terminal', 'no activation'])(
  'blocks %s current state without a request or mutation',
  (state) => {
    const ports = transportPorts();
    const callbacks = createCombatLabActionCallbacks('/private', ports);
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    try {
      if (state === 'missing') ports.sessionRef.current = null;
      if (state === 'deleting') ports.deletingRef.current = true;
      if (state === 'terminal')
        ports.sessionRef.current = {
          ...ports.sessionRef.current!,
          view: { ...playableView(), status: 'resolved' },
        };
      if (state === 'no activation')
        ports.sessionRef.current = {
          ...ports.sessionRef.current!,
          view: { ...playableView(), activation: null },
        };
      callbacks.act({ type: 'wait' }, 'blocked');
      callbacks.retryAction();
      expect({
        fetch: fetch.mock.calls,
        pending: ports.setPending.mock.calls,
        notice: ports.setNotice.mock.calls,
      }).toEqual({ fetch: [], pending: [], notice: [] });
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it.each(['missing controller', 'network', '503', 'unreadable', 'malformed', 'foreign'])(
  'retains uncertainty for %s and retries exact bytes after terminal projection',
  async (failure) => {
    const ports = transportPorts();
    const callbacks = createCombatLabActionCallbacks('/private', ports);
    const post = deferred<Response>();
    const fetch = vi.fn(() => post.promise);
    vi.stubGlobal('fetch', fetch);
    try {
      if (failure === 'missing controller') ports.sessionAbort.current = null;
      ports.refreshLatest.mockRejectedValue(new Error('Read failed'));
      const completion = callbacks.act({ type: 'wait' }, 'original description');
      const original = ports.pendingRef.current!;
      if (failure === 'network') post.reject(new Error('Offline'));
      else if (failure === 'unreadable') post.resolve(new Response('{'));
      else if (failure === 'foreign')
        post.resolve(Response.json({ ...acceptedReply(ports), requestId: 'foreign' }));
      else post.resolve(Response.json({}, { status: failure === '503' ? 503 : 200 }));
      await completion;
      expect({
        pending: ports.pendingRef.current,
        state: ports.setPending.mock.lastCall,
        stops: ports.stopAutoplay.mock.calls.length,
        selection: ports.setSelectedSkillId.mock.calls,
      }).toEqual({
        pending: { ...original, uncertain: true },
        state: [{ ...original, uncertain: true }],
        stops: 1,
        selection: [],
      });
      ports.sessionRef.current = {
        ...ports.sessionRef.current!,
        view: { ...view(20), status: 'resolved' },
      };
      ports.sessionAbort.current = new AbortController();
      const retry = deferred<Response>();
      fetch.mockReturnValue(retry.promise);
      const before = fetch.mock.calls.length;
      const retried = callbacks.retryAction();
      callbacks.retryAction();
      callbacks.act({ type: 'autoplay' }, 'competing');
      expect({
        calls: fetch.mock.calls.length,
        request: fetch.mock.calls.at(-1),
        pending: ports.pendingRef.current,
      }).toEqual({
        calls: before + 1,
        request: [
          '/private/dev/combat-lab/session/actions',
          {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-combat-lab-capability': 'capability',
            },
            body: original.body,
            signal: ports.sessionAbort.current.signal,
          },
        ],
        pending: { ...original, uncertain: false },
      });
      retry.resolve(Response.json(acceptedReply(ports)));
      await retried;
      expect(ports.pendingRef.current).toBeNull();
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it.each([
  ['accepted', 1, 1, [[null]], ''],
  ['accepted', 2, 0, [[null]], ''],
  ['rejected', 2, 1, [], 'Такое действие сейчас недоступно. Состояние боя обновлено.'],
] as const)(
  'settles %s using revision %s read after real deferred refresh',
  async (status, revision, stops, selection, notice) => {
    const ports = transportPorts();
    const refresh = deferred<void>();
    ports.refreshLatest.mockReturnValue(refresh.promise);
    const callbacks = createCombatLabActionCallbacks('/private', ports);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json({ ...acceptedReply(ports), status, code: 'INVALID_ACTION' })),
    );
    try {
      const completion = callbacks.act({ type: 'wait' }, 'wait');
      await vi.waitFor(() => expect(ports.refreshLatest).toHaveBeenCalledOnce());
      ports.sessionRef.current = {
        ...ports.sessionRef.current!,
        view: { ...playableView(), viewRevision: revision },
      };
      refresh.resolve();
      await completion;
      expect({
        pending: ports.pendingRef.current,
        state: ports.setPending.mock.lastCall,
        notice: ports.setNotice.mock.lastCall,
        stops: ports.stopAutoplay.mock.calls.length,
        selection: ports.setSelectedSkillId.mock.calls,
      }).toEqual({ pending: null, state: [null], notice: [notice], stops, selection });
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it.each(['fetch', 'json 503', 'json 404', 'refresh', 'failed refresh', 'network catch'])(
  'discards late %s effects after generation replacement or abort',
  async (boundary) => {
    for (const invalidate of ['replacement', 'abort']) {
      const ports = transportPorts();
      const post = deferred<Response>();
      const json = deferred<unknown>();
      const refresh = deferred<void>();
      const response = new Response(null, { status: boundary === 'json 503' ? 503 : 404 });
      const readJson = vi.spyOn(response, 'json').mockReturnValue(json.promise);
      ports.refreshLatest.mockReturnValue(refresh.promise);
      const fetch = vi.fn(() => post.promise);
      vi.stubGlobal('fetch', fetch);
      try {
        const completion = createCombatLabActionCallbacks('/private', ports).act(
          { type: 'wait' },
          'old',
        );
        const reply = acceptedReply(ports);
        if (boundary.startsWith('json')) {
          post.resolve(response);
          await vi.waitFor(() => expect(readJson).toHaveBeenCalledOnce());
        }
        if (boundary.includes('refresh')) {
          post.resolve(Response.json(reply));
          await vi.waitFor(() => expect(ports.refreshLatest).toHaveBeenCalledOnce());
        }
        if (invalidate === 'replacement') ports.generation.current += 1;
        else ports.sessionAbort.current!.abort();
        const sentinel = { body: 'replacement', description: 'new order', uncertain: false };
        const session = { id: 'replacement', capability: 'new', view: view(30) };
        ports.sessionRef.current = session;
        ports.pendingRef.current = sentinel;
        vi.clearAllMocks();
        if (boundary === 'network catch') post.reject(new Error('Late network error'));
        else post.resolve(Response.json(reply));
        json.resolve(reply);
        if (boundary === 'failed refresh') refresh.reject(new Error('Late refresh failure'));
        else refresh.resolve();
        await completion;
        expect({
          pending: ports.pendingRef.current,
          session: ports.sessionRef.current,
          lost: ports.sessionLostRef.current,
          writes: [
            ports.setPending,
            ports.setNotice,
            ports.setSelectedSkillId,
            ports.stopAutoplay,
            ports.setSessionLost,
          ].map((effect) => effect.mock.calls),
          fetch: fetch.mock.calls,
          refresh: ports.refreshLatest.mock.calls,
        }).toEqual({
          pending: sentinel,
          session,
          lost: false,
          writes: [[], [], [], [], []],
          fetch: [],
          refresh: [],
        });
      } finally {
        vi.unstubAllGlobals();
      }
    }
  },
);

function readPorts() {
  const ports = {
    ...transportPorts(),
    latestRead: { current: null as Promise<void> | null },
    notice: 'Unrelated action refusal',
    getNotice: () => ports.notice,
    setNotice: vi.fn((value: string | ((current: string) => string)) => {
      ports.notice = typeof value === 'string' ? value : value(ports.notice);
    }),
    installSession: vi.fn((session: ActiveSession | null) => {
      ports.sessionRef.current = session;
    }),
    setDeleting: vi.fn(),
  };
  return { ...ports, ...createCombatLabSessionCallbacks('/private', ports) };
}

it.each(['success', 'failure'])(
  'shares a read promise and preserves a replacement on old %s',
  async (outcome) => {
    const ports = readPorts();
    const response = deferred<Response>();
    const fetch = vi.fn(() => response.promise);
    vi.stubGlobal('fetch', fetch);
    try {
      const { refreshLatest } = createCombatLabReadCallbacks('/private', ports);
      const current = ports.sessionRef.current!;
      const first = refreshLatest(current, 1);
      expect(refreshLatest(current, 1)).toBe(first);
      expect(fetch.mock.calls).toEqual([
        [
          '/private/dev/combat-lab/session',
          {
            headers: { 'x-combat-lab-capability': 'capability' },
            signal: ports.sessionAbort.current!.signal,
          },
        ],
      ]);
      const replacement = Promise.resolve();
      ports.latestRead.current = replacement;
      if (outcome === 'success') response.resolve(Response.json(view(2)));
      else response.reject(new Error('offline'));
      await first;
      expect(ports.latestRead.current).toBe(replacement);
      ports.latestRead.current = null;
      await refreshLatest(current, 1);
      expect({ read: ports.latestRead.current, calls: fetch.mock.calls.length }).toEqual({
        read: null,
        calls: 2,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it.each([
  ['valid', view(2), 200, 'Unrelated action refusal', 2, false],
  ['older', view(0), 200, 'Unrelated action refusal', 1, false],
  [
    'foreign battle',
    { ...view(2), battleId: 'foreign' },
    200,
    'Unrelated action refusal',
    1,
    false,
  ],
  [
    'foreign session',
    { ...view(2), sessionId: 'foreign' },
    200,
    'Сервер вернул некорректное состояние боя.',
    1,
    false,
  ],
  ['malformed', {}, 200, 'Сервер вернул некорректное состояние боя.', 1, false],
  ['lost', {}, 404, 'Бой больше недоступен. Начните заново или вернитесь к редактору.', 1, true],
])(
  'handles %s reads through the real session projection callback',
  async (_name, body, status, notice, revision, lost) => {
    const ports = readPorts();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Response.json(body, { status })),
    );
    try {
      await createCombatLabReadCallbacks('/private', ports).refreshLatest(
        ports.sessionRef.current!,
        1,
      );
      expect({
        notice: ports.getNotice(),
        revision: ports.sessionRef.current!.view.viewRevision,
        lost: ports.sessionLostRef.current,
      }).toEqual({
        notice,
        revision,
        lost,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it.each(['fetch', 'valid JSON', 'invalid JSON', 'error JSON', 'network'])(
  'ignores stale %s completion after generation changes',
  async (boundary) => {
    const ports = readPorts();
    const response = deferred<Response>();
    const body = deferred<unknown>();
    const reply = new Response(null, { status: boundary === 'error JSON' ? 503 : 200 });
    vi.spyOn(reply, 'json').mockReturnValue(body.promise);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => response.promise),
    );
    try {
      const pending = createCombatLabReadCallbacks('/private', ports).refreshLatest(
        ports.sessionRef.current!,
        1,
      );
      if (boundary.includes('JSON')) {
        response.resolve(reply);
        await Promise.resolve();
      }
      ports.generation.current++;
      if (boundary === 'network') response.reject(new Error('offline'));
      else if (boundary === 'fetch') response.resolve(Response.json({}, { status: 404 }));
      else body.resolve(boundary === 'valid JSON' ? view(2) : { code: 'NOT_FOUND' });
      await pending;
      expect({
        notices: ports.setNotice.mock.calls,
        installs: ports.installSession.mock.calls,
        lost: ports.setSessionLost.mock.calls,
        read: ports.latestRead.current,
      }).toEqual({ notices: [], installs: [], lost: [], read: null });
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it.each([
  ['Сервер временно недоступен. Повторное чтение продолжится автоматически.', ''],
  ['Ответ получен. Запрашиваю актуальное состояние…', ''],
  ['Unrelated action refusal', 'Unrelated action refusal'],
])('clears only transient read feedback: %s', async (notice, expected) => {
  const ports = readPorts();
  ports.setNotice(notice);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json(view(2))),
  );
  try {
    await createCombatLabReadCallbacks('/private', ports).refreshLatest(
      ports.sessionRef.current!,
      1,
    );
    expect(ports.getNotice()).toBe(expected);
  } finally {
    vi.unstubAllGlobals();
  }
});

it.each([
  [503, { code: 'NOT_FOUND' }, 'Бой больше недоступен. Начните заново или вернитесь к редактору.'],
  [418, {}, 'Запрос завершился с кодом 418.'],
  [503, undefined, 'Запрос завершился с кодом 503.'],
  [200, undefined, 'Сервер временно недоступен. Повторное чтение продолжится автоматически.'],
])(
  'handles status %s and unreadable JSON without losing the poll loop',
  async (status, body, notice) => {
    const ports = readPorts();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        body === undefined ? new Response('invalid', { status }) : Response.json(body, { status }),
      ),
    );
    try {
      const callbacks = createCombatLabReadCallbacks('/private', ports);
      const scheduleNext = vi.fn();
      await callbacks.poll(
        ports.sessionRef.current!,
        1,
        ports.sessionAbort.current!,
        () => false,
        scheduleNext,
      );
      expect({
        notice: ports.getNotice(),
        continues: scheduleNext.mock.calls.length > 0,
        read: ports.latestRead.current,
      }).toEqual({
        notice,
        continues: true,
        read: null,
      });
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it.each(['missing', 'aborted'])('does not fetch with a %s session controller', async (state) => {
  const ports = readPorts();
  if (state === 'missing') ports.sessionAbort.current = null;
  else ports.sessionAbort.current!.abort();
  const fetch = vi.fn();
  vi.stubGlobal('fetch', fetch);
  try {
    await createCombatLabReadCallbacks('/private', ports).refreshLatest(
      ports.sessionRef.current!,
      1,
    );
    expect({ calls: fetch.mock.calls, read: ports.latestRead.current }).toEqual({
      calls: [],
      read: null,
    });
  } finally {
    vi.unstubAllGlobals();
  }
});

it.each(['pending', 'uncertain', 'deleting', 'lost', 'stopped', 'aborted'])(
  'reads current %s admission and can resume eligible polling',
  async (state) => {
    const ports = readPorts();
    const current = ports.sessionRef.current!;
    const controller = ports.sessionAbort.current!;
    const fetch = vi.fn(async () => Response.json(view(2)));
    vi.stubGlobal('fetch', fetch);
    try {
      const callbacks = createCombatLabReadCallbacks('/private', ports);
      if (state === 'pending' || state === 'uncertain')
        ports.pendingRef.current = {
          body: '{}',
          description: 'wait',
          uncertain: state === 'uncertain',
        };
      if (state === 'deleting') ports.deletingRef.current = true;
      if (state === 'lost') ports.sessionLostRef.current = true;
      if (state === 'aborted') controller.abort();
      const scheduleNext = vi.fn();
      await callbacks.poll(current, 1, controller, () => state === 'stopped', scheduleNext);
      const continues = scheduleNext.mock.calls.length > 0;
      expect({ calls: fetch.mock.calls.length, continues }).toEqual({
        calls: 0,
        continues: ['pending', 'uncertain', 'deleting'].includes(state),
      });
      if (continues) {
        ports.pendingRef.current = null;
        ports.deletingRef.current = false;
        await callbacks.poll(current, 1, controller, () => false, scheduleNext);
        expect(fetch).toHaveBeenCalledOnce();
      }
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it.each(['terminal', 'lost', 'replaced', 'removed', 'stopped', 'aborted'])(
  'rechecks %s after a deferred poll settles',
  async (state) => {
    const ports = readPorts();
    const current = ports.sessionRef.current!;
    const controller = ports.sessionAbort.current!;
    const response = deferred<Response>();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => response.promise),
    );
    let stopped = false;
    try {
      const scheduleNext = vi.fn();
      const pending = createCombatLabReadCallbacks('/private', ports).poll(
        current,
        1,
        controller,
        () => stopped,
        scheduleNext,
      );
      if (state === 'terminal')
        ports.sessionRef.current = { ...current, view: { ...current.view, status: 'resolved' } };
      if (state === 'lost') ports.sessionLostRef.current = true;
      if (state === 'replaced') ports.sessionRef.current = { ...current, id: 'replacement' };
      if (state === 'removed') ports.sessionRef.current = null;
      if (state === 'stopped') stopped = true;
      if (state === 'aborted') controller.abort();
      response.resolve(Response.json(view(0)));
      await pending;
      expect(scheduleNext).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  },
);

it('reschedules a paused poll synchronously so cleanup cannot precede timeout installation', async () => {
  const ports = readPorts();
  ports.pendingRef.current = { body: '{}', description: 'wait', uncertain: true };
  const scheduleNext = vi.fn();
  const iteration = createCombatLabReadCallbacks('/private', ports).poll(
    ports.sessionRef.current!,
    1,
    ports.sessionAbort.current!,
    () => false,
    scheduleNext,
  );
  expect(scheduleNext).toHaveBeenCalledOnce();
  await iteration;
});
