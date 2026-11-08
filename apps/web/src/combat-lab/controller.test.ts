import { expect, it, vi } from 'vitest';
import type { CombatLabView, CombatLabSkill } from '@warwrit/protocol';
import { executeFieldCommand, canIssueManualCommand } from './field-command.js';
import { commandSelection, commandReasons } from './command-availability.js';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CommandDesk } from './CommandDesk.js';
import { handleCombatLabKey, selectCombatSkill } from './command-input.js';
const fieldEffects = () => ({
  notice: vi.fn(),
  confirm: vi.fn(() => false),
  selectMovement: vi.fn(),
  selectTarget: vi.fn(),
  act: vi.fn(),
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
