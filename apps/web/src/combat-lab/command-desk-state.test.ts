import { expect, it } from 'vitest';
import { manualControlReasons } from './command-desk-state.js';

const available = {
  commonReason: '',
  pending: null,
  autoplay: false,
  menuOpen: false,
  selectedSkillId: null,
};

it('keeps selected-skill feedback and menu shortcut refusal ahead of control refusals', () => {
  expect(manualControlReasons(available)).toEqual({ manualReason: '', menuReason: '' });
  expect(
    manualControlReasons({
      ...available,
      selectedSkillId: 'aimed-shot',
      menuOpen: true,
      commonReason: 'Ход противника',
      pending: {},
      autoplay: true,
    }),
  ).toEqual({ manualReason: 'Выбран приём · Esc — отменить', menuReason: 'Меню открыто' });
  expect(manualControlReasons({ ...available, menuOpen: true, pending: {} })).toEqual({
    manualReason: 'Меню открыто',
    menuReason: 'Меню открыто',
  });
});

it('preserves common, pending and autoplay refusal priority', () => {
  expect(
    manualControlReasons({
      ...available,
      commonReason: 'Ход противника',
      pending: {},
      autoplay: true,
    }).manualReason,
  ).toBe('Ход противника');
  expect(manualControlReasons({ ...available, pending: {}, autoplay: true }).manualReason).toBe(
    'Ожидается ответ',
  );
  expect(manualControlReasons({ ...available, autoplay: true }).manualReason).toBe(
    'Автобой включён',
  );
});
