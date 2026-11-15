// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { DeceasedPayrollPanel } from './DeceasedPayrollPanel.js';

const accountId = 'account-1';
const company = {
  companyId: 'company-1',
  revision: '21',
  companyPresentation: null,
  leaderId: 'survivor-1',
  runStatus: 'ACTIVE' as const,
  characters: [
    {
      characterId: 'survivor-1',
      name: 'Марта',
      nicknameTextKey: null,
      perkIds: [],
      knownStatus: 'AVAILABLE' as const,
    },
  ],
};

function quote(overrides: Record<string, unknown> = {}) {
  return {
    publicRevision: '22',
    local: true,
    people: [
      { characterId: 'deceased-1', name: 'Степан', amountQ: '3250000' },
      { characterId: 'deceased-2', name: 'Дарья', amountQ: '800000' },
    ],
    ...overrides,
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
      <DeceasedPayrollPanel accountId={accountId} company={company} onRefresh={refresh} />,
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

it('shows exact known debt and requires explicit once-only confirmation before payment', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  let quotes = 0;
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    calls.push({ url: input, ...(init ? { init } : {}) });
    if (input.endsWith('/company/commands')) {
      const request = JSON.parse(String(init?.body));
      return Response.json({ commandId: request.commandId, ok: true, publicRevision: '23' });
    }
    quotes += 1;
    return Response.json(
      quote({
        publicRevision: quotes === 1 ? '22' : '23',
        people: quotes === 1 ? quote().people : [],
      }),
    );
  });

  await mount();

  expect(container?.textContent).toContain('Степан');
  expect(container?.textContent).toContain('3,25 кр.');
  expect(container?.textContent).toContain('один раз передать их родным');
  const get = calls.find(({ url }) => url.endsWith('/company/deceased-wages'))!;
  expect(get.init?.credentials).toBe('same-origin');
  expect((get.init?.headers as Record<string, string>)[WORLD_EXPECTED_COMPANY_ID_HEADER]).toBe(
    'company-1',
  );
  expect(calls.filter(({ url }) => url.endsWith('/company/commands'))).toHaveLength(0);

  await act(async () => button('Выплатить родным').click());
  expect(container?.textContent).toContain('Передать родным 3,25 кр.?');
  await act(async () => button('Подтвердить выплату').click());

  const command = calls.find(({ url }) => url.endsWith('/company/commands'))!;
  const request = JSON.parse(String(command.init?.body));
  expect(command.init?.method).toBe('POST');
  expect(command.init?.credentials).toBe('same-origin');
  expect((command.init?.headers as Record<string, string>)[WORLD_EXPECTED_COMPANY_ID_HEADER]).toBe(
    'company-1',
  );
  expect(request).toMatchObject({
    schemaVersion: 2,
    commandId: expect.any(String),
    expectedPublicRevision: '22',
    type: 'PayDeceasedWages',
    payload: { characterId: 'deceased-1' },
  });
  expect(refresh).toHaveBeenCalledTimes(1);
  expect(container?.textContent).toContain('Выплата родным подтверждена.');
  expect(window.sessionStorage.length).toBe(0);
  expect(calls.filter(({ url }) => url.endsWith('/company/deceased-wages'))).toHaveLength(2);
});

it('preserves and retries the exact command after a 500 response and remount', async () => {
  const bodies: string[] = [];
  let commands = 0;
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    if (input.endsWith('/company/commands')) {
      bodies.push(String(init?.body));
      commands += 1;
      if (commands === 1) return Response.json({ error: 'temporary failure' }, { status: 500 });
      const request = JSON.parse(String(init?.body));
      return Response.json({ commandId: request.commandId, ok: true, publicRevision: '23' });
    }
    return Response.json(quote());
  });

  await mount();
  await act(async () => button('Выплатить родным').click());
  await act(async () => button('Подтвердить выплату').click());
  const firstBody = bodies[0]!;
  expect(window.sessionStorage.length).toBe(1);
  expect(container?.textContent).toContain(
    'Ответ о выплате неизвестен. Повторите ту же выплату, чтобы проверить её результат.',
  );

  await unmount();
  await mount();

  expect(button('Повторить ту же выплату').disabled).toBe(false);
  await act(async () => button('Повторить ту же выплату').click());

  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toBe(firstBody);
  expect(window.sessionStorage.length).toBe(0);
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('clears a matching structured stale rejection and admits a fresh confirmed request', async () => {
  const bodies: string[] = [];
  let quotes = 0;
  let commands = 0;
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    if (input.endsWith('/company/commands')) {
      const body = String(init?.body);
      bodies.push(body);
      commands += 1;
      const request = JSON.parse(body);
      if (commands === 1)
        return Response.json(
          {
            commandId: request.commandId,
            ok: false,
            publicRevision: '23',
            code: 'STALE_REVISION',
          },
          { status: 409 },
        );
      return Response.json({ commandId: request.commandId, ok: true, publicRevision: '24' });
    }
    quotes += 1;
    return Response.json(quote({ publicRevision: quotes === 1 ? '22' : '23' }));
  });

  await mount();
  await act(async () => button('Выплатить родным').click());
  await act(async () => button('Подтвердить выплату').click());

  expect(container?.textContent).toContain(
    'Сведения о долге изменились. Проверьте сумму и подтвердите выплату снова.',
  );
  expect(window.sessionStorage.length).toBe(0);
  expect(quotes).toBe(2);
  await act(async () => button('Выплатить родным').click());
  await act(async () => button('Подтвердить выплату').click());

  expect(bodies).toHaveLength(2);
  expect(JSON.parse(bodies[1]!)).toMatchObject({ expectedPublicRevision: '23' });
  expect(JSON.parse(bodies[1]!).commandId).not.toBe(JSON.parse(bodies[0]!).commandId);
  expect(refresh).toHaveBeenCalledTimes(2);
});

it('shows the locality restriction and disables transfer away from Kamenny Brod', async () => {
  vi.stubGlobal('fetch', async () => Response.json(quote({ local: false })));

  await mount();

  expect(container?.textContent).toContain(
    'Чтобы передать деньги родным, остановитесь в Каменном Броде.',
  );
  expect(button('Выплатить родным').disabled).toBe(true);
});
