// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { CoursePanel } from './CoursePanel.js';

const accountId = 'account-a';
const company = {
  companyId: 'company-a',
  revision: '18',
  companyPresentation: { name: 'Серая дорога', bannerId: 'banner' },
  leaderId: 'character-one',
  runStatus: 'ACTIVE' as const,
  characters: [
    {
      characterId: 'character-one',
      name: 'Ольга',
      nicknameTextKey: null,
      perkIds: [],
      knownStatus: 'AVAILABLE' as const,
    },
    {
      characterId: 'character-two',
      name: 'Борис',
      nicknameTextKey: null,
      perkIds: [],
      knownStatus: 'AVAILABLE' as const,
    },
  ],
};
const holdings = {
  cashQ: '20000000',
  wallets: [],
  items: [
    {
      itemId: 'blade-one',
      definitionId: 'sword',
      quantity: 1,
      currentCondition: 2,
      maximumCondition: 3,
      carrierCharacterId: null,
      equippedBy: null,
      slot: 'MAIN_HAND' as const,
    },
    {
      itemId: '["legacy-opening","character-two","spear"]',
      definitionId: 'spear',
      quantity: 1,
      currentCondition: 1,
      maximumCondition: 2,
      carrierCharacterId: null,
      equippedBy: null,
      slot: 'MAIN_HAND' as const,
    },
  ],
  people: [],
  fieldCamp: false,
  wagesOwedQ: '0',
  wagesDueQ: '0',
};

function offer(overrides: Record<string, unknown> = {}) {
  return {
    course: {
      courseId: 'course.kamenny-brod-guard.blades',
      providerId: 'gordey-lapa',
      skillId: 'blades',
      durationTicks: '3000',
      costQPerDay: '5000000',
      status: 'AVAILABLE',
      learners: [
        { characterId: 'character-one', currentLevel: 0, resourceIds: ['blade-one'] },
        {
          characterId: 'character-two',
          currentLevel: 1,
          resourceIds: ['["legacy-opening","character-two","spear"]'],
        },
      ],
      ...overrides,
    },
  };
}

let root: Root | undefined;
let container: HTMLDivElement | undefined;
const refresh = vi.fn();

function mount() {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  return act(async () =>
    root?.render(
      <CoursePanel
        accountId={accountId}
        company={company}
        holdings={holdings}
        onRefresh={refresh}
      />,
    ),
  );
}

function button(name: string) {
  const match = [...container!.querySelectorAll('button')].find(
    (entry) => entry.textContent?.trim() === name,
  );
  if (!match) throw new Error(`Missing button: ${name}`);
  return match;
}

async function unmount() {
  if (root) await act(async () => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
}

afterEach(async () => {
  await unmount();
  window.sessionStorage.clear();
  refresh.mockReset();
  vi.unstubAllGlobals();
});

it('shows course terms, starts with a selected offered learner and resource, then displays progress and stop', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  let courseReads = 0;
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    calls.push({ url: input, ...(init ? { init } : {}) });
    if (input.endsWith('/company/commands')) {
      const request = JSON.parse(String(init?.body));
      return Response.json({ commandId: request.commandId, ok: true, publicRevision: '19' });
    }
    courseReads += 1;
    return Response.json(
      courseReads === 1
        ? offer()
        : offer({
            status: 'IN_PROGRESS',
            learners: [],
            progress: {
              taskId: 'task-course-1',
              learnerId: 'character-two',
              acceptedTicks: '1000',
              remainingTicks: '2000',
              chargedQ: '5000000',
            },
          }),
    );
  });

  await mount();

  expect(container?.textContent).toContain('3 игровых дня × 5 кр. в день · максимум 15 кр.');
  expect(container?.textContent).toContain('Плата начисляется только за прошедшее время.');
  const quote = calls.find(({ url }) => url.endsWith('/company/courses/kamenny-brod'))!;
  expect(quote.init?.credentials).toBe('same-origin');
  expect((quote.init?.headers as Record<string, string>)[WORLD_EXPECTED_COMPANY_ID_HEADER]).toBe(
    'company-a',
  );
  const select = container!.querySelector('select')!;
  await act(async () => {
    select.value = 'character-two';
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
  expect(container?.textContent).toContain('Копьё · в обозе');
  const checkbox = container!.querySelector('input[type="checkbox"]') as HTMLInputElement;
  expect(checkbox.checked).toBe(true);

  await act(async () => button('Начать обучение').click());

  const command = calls.find(({ url }) => url.endsWith('/company/commands'))!;
  const request = JSON.parse(String(command.init?.body));
  expect(command.url).toBe('/api/company/commands');
  expect(command.init?.credentials).toBe('same-origin');
  expect((command.init?.headers as Record<string, string>)[WORLD_EXPECTED_COMPANY_ID_HEADER]).toBe(
    'company-a',
  );
  expect(request).toMatchObject({
    schemaVersion: 2,
    expectedPublicRevision: '18',
    type: 'StartLearning',
    payload: {
      courseId: 'course.kamenny-brod-guard.blades',
      characterId: 'character-two',
      resourceIds: ['["legacy-opening","character-two","spear"]'],
    },
  });
  expect(refresh).toHaveBeenCalledTimes(2);
  expect(container?.textContent).toContain('Ученик: Борис');
  expect(container?.textContent).toContain('пройдено 1 из 3 игровых дней');
  expect(container?.textContent).toContain('уже списано 5 кр.');
  expect(button('Остановить обучение').disabled).toBe(false);

  await act(async () => button('Остановить обучение').click());
  const commands = calls.filter(({ url }) => url.endsWith('/company/commands'));
  const stopRequest = JSON.parse(String(commands[1]?.init?.body));
  expect(stopRequest).toMatchObject({
    type: 'StopLearning',
    expectedPublicRevision: '18',
    payload: { taskId: 'task-course-1' },
  });
  expect(stopRequest.commandId).not.toBe(request.commandId);
  expect(refresh).toHaveBeenCalledTimes(3);
});

it('keeps and retries the exact pending command after an unknown server outcome and remount', async () => {
  const bodies: string[] = [];
  let commands = 0;
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    if (input.endsWith('/company/commands')) {
      bodies.push(String(init?.body));
      commands += 1;
      if (commands === 1) return Response.json({ error: 'temporary failure' }, { status: 500 });
      const request = JSON.parse(String(init?.body));
      return Response.json({ commandId: request.commandId, ok: true, publicRevision: '19' });
    }
    return Response.json(offer());
  });

  await mount();
  await act(async () => button('Начать обучение').click());
  const firstBody = bodies[0]!;
  expect(container?.textContent).toContain('Ответ на приказ неизвестен. Повторите тот же приказ');
  expect(window.sessionStorage.length).toBe(1);

  await unmount();
  await mount();

  expect(button('Повторить тот же приказ').disabled).toBe(false);
  await act(async () => button('Повторить тот же приказ').click());

  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toBe(firstBody);
  expect(window.sessionStorage.length).toBe(0);
  expect(refresh).toHaveBeenCalledTimes(3);
});

it('clears a matching structured rejection and displays the unavailable explanation', async () => {
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    if (input.endsWith('/company/commands')) {
      const request = JSON.parse(String(init?.body));
      return Response.json(
        {
          commandId: request.commandId,
          ok: false,
          publicRevision: '19',
          code: 'STALE_REVISION',
        },
        { status: 409 },
      );
    }
    return Response.json(offer());
  });

  await mount();
  await act(async () => button('Начать обучение').click());

  expect(container?.textContent).toContain('Состояние отряда изменилось. Выберите действие снова.');
  expect(container?.textContent).not.toContain('Повторить тот же приказ');
  expect(window.sessionStorage.length).toBe(0);
  expect(refresh).toHaveBeenCalledTimes(2);
});

it('explains a server-reported missing practice resource and offers no start action', async () => {
  vi.stubGlobal('fetch', async () =>
    Response.json(offer({ status: 'UNAVAILABLE', learners: [], unavailableReason: 'NO_RESOURCE' })),
  );

  await mount();

  expect(container?.textContent).toContain('В отряде нет подходящих предметов для занятий.');
  expect(container?.querySelector('button')).toBeNull();
});
