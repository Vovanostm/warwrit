// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { MissionLab } from './MissionLab.js';

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
let root: ReturnType<typeof createRoot> | undefined;
afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.replaceChildren();
});

async function click(text: string) {
  const button = [...document.querySelectorAll('button')].find((item) =>
    item.textContent?.includes(text),
  );
  if (!button || button.disabled) throw new Error(`Unavailable story action: ${text}`);
  await act(async () => button.click());
}

it('the rehearsal shows distinct endings and removes future knowledge when rewound or switched', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<MissionLab />));
  await click('Спасение на гати');
  const firstImage = (
    document.querySelector('.mission-art') as HTMLElement
  )?.style.getPropertyValue('--mission-art');
  await click('Взять канат');
  const nextImage = (document.querySelector('.mission-art') as HTMLElement)?.style.getPropertyValue(
    '--mission-art',
  );
  await click('Находки');
  const found = document.querySelector('.mission-journal li')?.textContent?.includes('Гать держит');
  await click('На шаг назад');
  const rewound = document
    .querySelector('.mission-journal')
    ?.textContent?.includes('Пока только просьба');
  await click('Взять канат');
  await click('По кольям');
  await click('Накрыть утопцев');
  const waterEnding = document.querySelector('article')?.getAttribute('data-scene');
  await click('Попробовать другой путь');
  await click('Взять канат');
  await click('По кольям');
  await click('Встать у помоста');
  const injuryEnding = document.querySelector('article')?.getAttribute('data-scene');
  await click('Сначала');
  await click('Взять канат');
  await click('По кольям');
  await click('Отступить по гати');
  const lateEnding = document.querySelector('article')?.getAttribute('data-scene');
  await click('Три головы под сводом');
  await click('Находки');
  const isolated = document
    .querySelector('.mission-journal')
    ?.textContent?.includes('Пока только просьба');
  await click('С Зоей осмотреть');
  await click('Под прикрытием затвора');
  await click('Удержать мертвецов');
  const fieldEnding = document.querySelector('article')?.getAttribute('data-scene');
  await click('Пока горит их костёр');
  await click('Разобрать следы');
  const guarded = !document.querySelector('.mission-choices')?.textContent?.includes('Тихо убить');
  await click('Подойти к логу');
  await click('Дождаться темноты');
  await click('Тихо убить');
  const forestEnding = document.querySelector('article')?.getAttribute('data-scene');
  await click('Приглушить свет');
  await click('О замысле');
  expect({
    found,
    artChanged: firstImage !== nextImage && nextImage?.includes('causeway.png'),
    rewound,
    isolated,
    guarded,
    endings: [waterEnding, injuryEnding, lateEnding, fieldEnding, forestEnding],
    night: document.querySelector('main')?.classList.contains('mission-lab--night'),
    notes: !!document.querySelector('#mission-author-notes'),
  }).toEqual({
    found: true,
    artChanged: true,
    rewound: true,
    isolated: true,
    guarded: true,
    endings: ['rescued', 'fight', 'retreat', 'sealed', 'night'],
    night: true,
    notes: true,
  });
});

it('the well keeps its discovery out of the opening notes and renders rescue narration as prose', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<MissionLab />));
  await click('Не уходи');
  await click('О замысле');
  const openingNotes = document.querySelector('#mission-author-notes')?.textContent;
  await click('О замысле');
  await click('Подойти к колодцу');
  await click('Взять запасную');
  await click('Убрать топор');
  await click('Послать Прохора за косцами');
  expect({
    earlyAnswer: /переруб|предатель/.test(openingNotes ?? ''),
    heading: document.querySelector('.mission-prose h3')?.textContent,
    narrativeAsSpeaker: !!document.querySelector(
      '[data-text-key="mission.well.wait.l1"] .mission-speaker',
    ),
    rescueNarration: document
      .querySelector('[data-text-key="mission.well.wait.l1"]')
      ?.textContent?.includes('Вы остаётесь у столба'),
  }).toEqual({
    earlyAnswer: false,
    heading: 'За носилками',
    narrativeAsSpeaker: false,
    rescueNarration: true,
  });
});

it('manuscript preparation rewinds with choices and resets when restarting or switching stories', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<MissionLab />));
  await click('Яков, выходи');
  expect(document.querySelector('.mission-art')).toBeNull();
  await click('Оставить одного из ваших людей');
  await click('Подняться за камни');
  const preparedText = document.querySelector('.mission-lines')!.textContent!;
  expect(preparedText).toContain('цепляет когтями левую голень Якова');
  expect(preparedText).toContain('зубы соскальзывают на левое предплечье');
  expect(preparedText).not.toContain('второй закрывает вас щитом');
  await click('На шаг назад');
  await click('На шаг назад');
  await click('Идти всем вместе');
  await click('Спуститься к двери');
  const rewoundText = document.querySelector('.mission-lines')!.textContent!;
  expect(rewoundText).toContain('второй закрывает вас щитом');
  expect(rewoundText).not.toContain('зубы соскальзывают на левое предплечье');
  expect(rewoundText).not.toContain('цепляет когтями левую голень Якова');
  await click('Сначала');
  expect(document.querySelector('article')?.getAttribute('data-scene')).toBe('start');
  await click('Оставить одного из ваших людей');
  await click('Не уходи');
  expect(document.querySelector('.mission-art')).not.toBeNull();
  await click('Яков, выходи');
  await click('Идти всем вместе');
  await click('Спуститься к двери');
  expect(document.querySelector('.mission-lines')!.textContent).not.toContain(
    'зубы соскальзывают на левое предплечье',
  );
});

it('shows unread overflow until scrolled to the end and hides it when the text fits', async () => {
  const container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<MissionLab />));
  const lines = document.querySelector('.mission-lines') as HTMLElement;
  let contentHeight = 600;
  Object.defineProperties(lines, {
    scrollHeight: { get: () => contentHeight },
    clientHeight: { get: () => 200 },
  });
  const scroll = async (top: number) => {
    await act(async () => {
      lines.scrollTop = top;
      lines.dispatchEvent(new Event('scroll'));
    });
  };
  await scroll(0);
  expect(document.querySelector('.mission-text-continuation')?.textContent).toBe(
    'Продолжение ниже ↓',
  );
  await scroll(399.5);
  expect(document.querySelector('.mission-text-continuation')).toBeNull();
  await scroll(0);
  expect(document.querySelector('.mission-text-continuation')).not.toBeNull();
  contentHeight = 150;
  await click('Взять сумку с выкупом');
  expect(document.querySelector('.mission-text-continuation')).toBeNull();
  contentHeight = 600;
  await click('Сначала');
  expect(document.querySelector('.mission-text-continuation')).not.toBeNull();
});
