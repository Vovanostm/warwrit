// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { StoryCommandRequestDto, StoryReadResponseDto } from '@warwrit/protocol';
import { StoryPanel } from './StoryPanel.js';

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

const commandId = '11111111-1111-4111-8111-111111111111';
const read = {
  schemaVersion: 1,
  missionId: 'sm.m1.cache-disclosure.01',
  definitionVersion: 1,
  availability: 'OFFERED',
  sceneId: 'S00',
  worldRevision: '2',
  companyRevision: '4',
  visibleLineIds: ['title', 'brief', '01', '02-others', 'accept', 'later', 'reward'],
  availableChoices: ['accept', 'defer'],
  journal: [],
  metActors: [],
  publicOutcome: null,
} satisfies StoryReadResponseDto;

let root: ReturnType<typeof createRoot> | undefined;
let host: HTMLDivElement | undefined;
afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = undefined;
  host = undefined;
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function mount(onRefreshCompany = vi.fn()) {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <StoryPanel
        scope={{ accountId: 'account-a', companyId: 'company-a' }}
        onRefreshCompany={onRefreshCompany}
        onClose={() => {}}
      />,
    );
    await Promise.resolve();
  });
  return { onRefreshCompany };
}

async function reloadPanel() {
  act(() => root?.unmount());
  root = createRoot(host!);
  await act(async () => {
    root!.render(
      <StoryPanel
        scope={{ accountId: 'account-a', companyId: 'company-a' }}
        onRefreshCompany={() => {}}
        onClose={() => {}}
      />,
    );
    await Promise.resolve();
  });
}

it('renders only server-visible lines and stores the exact command before posting', async () => {
  const posted: RequestInit[] = [];
  const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'POST') posted.push(init);
    return new Response(JSON.stringify(read), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('crypto', { randomUUID: () => commandId });
  await mount();
  expect(host!.textContent).toContain('Парень вернулся. Теперь бы узнать, кто Обуху место назвал.');
  expect(host!.textContent).not.toContain('Я, Сенька, Улита Ткачиха. Больше никто.');
  await act(async () => {
    host!.querySelector<HTMLButtonElement>('.story-choices button')!.click();
    await Promise.resolve();
  });
  const request = JSON.parse(posted[0]!.body as string) as StoryCommandRequestDto;
  expect(request.command).toEqual({ type: 'ACCEPT' });
  const stored = JSON.parse(
    sessionStorage.getItem('warwrit:story-attempt:v1:account-a:company-a')!,
  );
  expect(stored.body).toBe(JSON.stringify(request));
});

it("asks who is groaning before referring to Ulita's son", async () => {
  const ulita = {
    ...read,
    sceneId: 'S03',
    visibleLineIds: ['01', 'enter', '02', '02-sound'],
    availableChoices: ['ask-son'],
  };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(ulita))));
  await mount();
  expect(host!.textContent).toContain('За дверью стонут.');
  expect(host!.querySelector('.story-choices button')!.textContent).toBe('Кто у тебя стонет?');
  expect(host!.textContent).not.toContain('Когда он вернулся?');
  expect(host!.textContent).not.toContain('Сын. Петрусь.');
});

it('names every accusation and the proven confirmation from the active scene', async () => {
  const accusation = {
    ...read,
    sceneId: 'S07',
    visibleLineIds: ['01', 'proof', 'senka', 'kondrat', 'wait'],
    availableChoices: ['accuse-ulita', 'accuse-senka', 'accuse-kondrat', 'wait'],
  };
  const confirmation = {
    ...accusation,
    visibleLineIds: ['warn-proof', 'commit-proof', 'back'],
    availableChoices: ['confirm', 'back'],
  };
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(new Response(JSON.stringify(accusation)))
    .mockResolvedValueOnce(new Response(JSON.stringify(confirmation)));
  vi.stubGlobal('fetch', fetchMock);
  await mount();
  const labels = [...host!.querySelectorAll('.story-choices button')].map(
    (button) => button.textContent,
  );
  expect(labels).toEqual([
    'Улита. Рассказать о мешке и сделке.',
    'Сенька назвал Обуху тайник.',
    'Кондрат, ты сам назвал Обуху тайник.',
    'Ещё расспросим.',
  ]);
  await reloadPanel();
  expect(host!.querySelector('.story-choices button')!.textContent).toBe('Рассказать Кондрату.');
});

it('keeps an unknown response pending and retries the same body', async () => {
  const wrong = new Response(
    JSON.stringify({ schemaVersion: 1, commandId: 'different', ok: true }),
    { status: 200 },
  );
  const accepted = new Response(
    JSON.stringify({
      schemaVersion: 1,
      commandId,
      ok: true,
      story: { ...read, sceneId: 'S01', availableChoices: [] },
      rewardPaidQ: null,
    }),
    { status: 200 },
  );
  const fetchMock = vi
    .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
    .mockResolvedValueOnce(new Response(JSON.stringify(read), { status: 200 }))
    .mockResolvedValueOnce(wrong)
    .mockResolvedValueOnce(new Response(JSON.stringify(read), { status: 200 }))
    .mockResolvedValueOnce(accepted);
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('crypto', { randomUUID: () => commandId });
  await mount();
  await act(async () => {
    host!.querySelector<HTMLButtonElement>('.story-choices button')!.click();
    await Promise.resolve();
  });
  const savedBody = JSON.parse(
    sessionStorage.getItem('warwrit:story-attempt:v1:account-a:company-a')!,
  ).body;
  expect(host!.textContent).toContain('Ответ сервера неизвестен');
  expect(host!.querySelector<HTMLButtonElement>('.story-choices button')!.disabled).toBe(true);
  await reloadPanel();
  await act(async () => {
    host!.querySelector<HTMLButtonElement>('.story-retry')!.click();
    await Promise.resolve();
  });
  expect(fetchMock.mock.calls[1]![1]!.body).toBe(savedBody);
  expect(fetchMock.mock.calls[3]![1]!.body).toBe(savedBody);
  expect(sessionStorage.getItem('warwrit:story-attempt:v1:account-a:company-a')).toBeNull();
});

it('keeps the offer actionable after an insufficient-funds rejection', async () => {
  const rejected = new Response(
    JSON.stringify({
      schemaVersion: 1,
      commandId,
      ok: false,
      code: 'INSUFFICIENT_FUNDS',
      story: null,
    }),
    { status: 409 },
  );
  const fetchMock = vi
    .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
    .mockResolvedValueOnce(new Response(JSON.stringify(read), { status: 200 }))
    .mockResolvedValueOnce(rejected)
    .mockResolvedValueOnce(new Response(JSON.stringify(read), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('crypto', { randomUUID: () => commandId });
  await mount();
  await act(async () => {
    host!.querySelector<HTMLButtonElement>('.story-choices button')!.click();
    await Promise.resolve();
  });
  expect(host!.textContent).toContain(
    'У Кондрата сейчас не хватает денег для выплаты. Дело остаётся открытым.',
  );
  expect(host!.querySelector<HTMLButtonElement>('.story-choices button')!.disabled).toBe(false);
  expect(sessionStorage.getItem('warwrit:story-attempt:v1:account-a:company-a')).toBeNull();
});

it('refreshes the actionable projection after a stale revision', async () => {
  const current = {
    ...read,
    sceneId: 'S01',
    worldRevision: '3',
    companyRevision: '5',
    visibleLineIds: ['sacks'],
    availableChoices: ['ask-sacks'],
  };
  const rejected = new Response(
    JSON.stringify({
      schemaVersion: 1,
      commandId,
      ok: false,
      code: 'STALE_REVISION',
      story: current,
    }),
    { status: 409 },
  );
  const fetchMock = vi
    .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
    .mockResolvedValueOnce(new Response(JSON.stringify(read), { status: 200 }))
    .mockResolvedValueOnce(rejected);
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('crypto', { randomUUID: () => commandId });
  await mount();
  await act(async () => {
    host!.querySelector<HTMLButtonElement>('.story-choices button')!.click();
    await Promise.resolve();
  });
  expect(host!.textContent).toContain('Состояние истории изменилось');
  expect(host!.textContent).toContain('Что Улита чинила?');
  expect(host!.querySelector('.story-choices')?.textContent).toContain('Что Улита чинила?');
});

it('shows the accusation warning before sending the explicit confirmation', async () => {
  const pending = {
    ...read,
    sceneId: 'S07',
    visibleLineIds: ['warn-senka', 'commit', 'back'],
    availableChoices: ['confirm', 'back'],
  };
  const ending = {
    ...pending,
    availability: 'CLOSED',
    sceneId: 'E02',
    visibleLineIds: ['01', '02', 'journal-E02-without-F11'],
    availableChoices: [],
  };
  const fetchMock = vi
    .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
    .mockResolvedValueOnce(new Response(JSON.stringify(pending), { status: 200 }))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({ schemaVersion: 1, commandId, ok: true, story: ending, rewardPaidQ: null }),
        { status: 200 },
      ),
    );
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('crypto', { randomUUID: () => commandId });
  await mount();
  expect(host!.querySelector('[role="alert"]')?.textContent).toContain(
    'Ответ закроет дело для всех компаний. Обвинение Сеньки не доказано',
  );
  await act(async () => {
    host!.querySelector<HTMLButtonElement>('.story-choices button')!.click();
    await Promise.resolve();
  });
  const body = JSON.parse(fetchMock.mock.calls[1]![1]!.body as string) as StoryCommandRequestDto;
  expect(body.command).toEqual({ type: 'CONFIRM' });
});

it('refreshes company holdings only after the server confirms the paid outcome', async () => {
  const ending = {
    ...read,
    availability: 'CLOSED',
    sceneId: 'E01',
    visibleLineIds: ['01', 'ask', '02'],
    availableChoices: [],
  };
  const fetchMock = vi
    .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
    .mockResolvedValueOnce(new Response(JSON.stringify(read), { status: 200 }))
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          schemaVersion: 1,
          commandId,
          ok: true,
          story: ending,
          rewardPaidQ: '40000000',
        }),
        { status: 200 },
      ),
    );
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('crypto', { randomUUID: () => commandId });
  const { onRefreshCompany } = await mount();
  await act(async () => {
    host!.querySelector<HTMLButtonElement>('.story-choices button')!.click();
    await Promise.resolve();
  });
  expect(onRefreshCompany).toHaveBeenCalledTimes(1);
  expect(host!.textContent).toContain('Получено: 40 кр.');
});
