import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRequire } from 'node:module';
import { afterEach, expect, it, vi } from 'vitest';
import type { CompanySummaryDto } from '@warwrit/protocol';
import { useItemTransfer } from './use-item-transfer.js';
import { ItemTransferPanel } from './ItemTransferPanel.js';

const { JSDOM } = createRequire(import.meta.url)('jsdom') as {
  JSDOM: new (
    html: string,
    options: { url: string },
  ) => { window: Window & { close(): void; MouseEvent: typeof MouseEvent; Event: typeof Event } };
};
let dom: InstanceType<typeof JSDOM> | undefined, root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  dom?.window.close();
  dom = undefined;
  for (const key of [
    'window',
    'document',
    'navigator',
    'sessionStorage',
    'IS_REACT_ACT_ENVIRONMENT',
  ])
    Reflect.deleteProperty(globalThis, key);
  vi.unstubAllGlobals();
});
const company = { companyId: 'company', revision: '7', runStatus: 'ACTIVE' } as CompanySummaryDto;
function View(props: { revision?: string; accountId?: string } = {}) {
  const state = useItemTransfer(
    props.accountId ?? 'account',
    { ...company, revision: props.revision ?? company.revision },
    () => {},
  );
  return (
    <button
      data-pending={state.pending?.commandId ?? ''}
      data-reading={state.reading?.revision ?? ''}
      data-items={
        state.reading?.holdings.transfer?.items.map((item) => item.itemId).join(',') ?? ''
      }
      data-message={state.message ?? ''}
      data-busy={String(state.busy)}
      onClick={() =>
        void state.transfer({
          itemId: 'sword',
          quantity: 1,
          fromContainerId: 'pack',
          toContainerId: 'supply',
        })
      }
    >
      Transfer
    </button>
  );
}
const response = (value: unknown, status = 200) =>
  ({ ok: status < 400, status, json: async () => value }) as Response;
async function setupDom() {
  dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: dom.window },
    document: { configurable: true, value: dom.window.document },
    navigator: { configurable: true, value: dom.window.navigator },
    sessionStorage: { configurable: true, value: dom.window.sessionStorage },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });
  const host = dom.window.document.getElementById('root')!;
  const { createRoot } = await import('react-dom/client');
  root = createRoot(host);
  return host;
}
const panelCompany = {
  ...company,
  characters: [
    {
      characterId: 'leader',
      name: 'Яромир',
      nicknameTextKey: null,
      perkIds: [],
      knownStatus: 'AVAILABLE',
    },
  ],
} as CompanySummaryDto;
it('lets the player choose and retry the exact transfer after loss and reload, then shows success and refusal', async () => {
  const host = await setupDom();
  const bodies: string[] = [];
  const holdings = {
    items: [{ itemId: 'rations', definitionId: 'ration' }],
    transfer: {
      items: [{ itemId: 'rations', containerId: 'supply', quantity: 6 }],
      containers: [
        { containerId: 'supply', kind: 'PARTY_SUPPLY', carrierCharacterId: null },
        { containerId: 'pack', kind: 'CHARACTER_PACK', carrierCharacterId: 'leader' },
        { containerId: 'chest', kind: 'STATIC', carrierCharacterId: null },
      ],
    },
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/auth/session')) return response({ accountId: 'account' });
      if (String(url).endsWith('/company')) return response({ company: panelCompany, holdings });
      const body = String(init?.body);
      bodies.push(body);
      if (bodies.length === 1) throw new Error('response lost');
      const commandId = JSON.parse(body).commandId;
      if (bodies.length === 2)
        return response({ commandId: 'another-command', ok: true, publicRevision: '8' });
      if (bodies.length === 4)
        return response({ commandId, ok: false, publicRevision: '8', code: 'CAPACITY' }, 409);
      return response({ commandId, ok: true, publicRevision: '8' });
    }),
  );
  const render = () =>
    root!.render(
      <ItemTransferPanel accountId="account" company={panelCompany} onRefresh={() => {}} />,
    );
  const click = async (label: string) => {
    const button = [...host.querySelectorAll('button')].find(
      (entry) => entry.textContent?.trim() === label,
    )!;
    await act(async () =>
      button.dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true })),
    );
  };
  const change = async (label: string, value: string) => {
    const control = host.querySelector<HTMLInputElement | HTMLSelectElement>(
      `[aria-label="${label}"]`,
    )!;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(control), 'value')!.set!;
    await act(async () => {
      setter.call(control, value);
      control.dispatchEvent(
        new dom!.window.Event(control.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }),
      );
    });
  };
  await act(async () => render());
  expect(host.textContent).toContain('Перемещение между сумками');
  expect(host.querySelector<HTMLButtonElement>('.item-transfer-fields .action')!.disabled).toBe(
    true,
  );
  await change('Вещь для передачи', 'rations');
  await change('Количество для передачи', '2');
  await change('Контейнер назначения', 'pack');
  await click('Передать');
  expect(JSON.parse(bodies[0]!).payload).toEqual({
    itemId: 'rations',
    quantity: 2,
    fromContainerId: 'supply',
    toContainerId: 'pack',
  });
  expect(host.textContent).toContain('ещё не подтверждена');
  const stored = sessionStorage.getItem('warwrit:item-transfer:account:company');
  act(() => root!.unmount());
  root = (await import('react-dom/client')).createRoot(host);
  await act(async () => render());
  expect(host.textContent).toContain('Передача 2');
  expect(host.textContent).toContain('Сумка: Яромир');
  await click('Повторить эту же передачу');
  expect(sessionStorage.getItem('warwrit:item-transfer:account:company')).toBe(stored);
  expect(host.textContent).toContain('ещё не подтверждена');
  await click('Повторить эту же передачу');
  expect(bodies.slice(0, 3)).toEqual([bodies[0], bodies[0], bodies[0]]);
  expect(sessionStorage.getItem('warwrit:item-transfer:account:company')).toBeNull();
  expect(host.textContent).toContain('Вещи переданы.');
  expect(host.querySelector('[aria-label="Вещь для передачи"]')).not.toBeNull();
  await change('Вещь для передачи', 'rations');
  await change('Контейнер назначения', 'pack');
  await click('Передать');
  expect(host.textContent).toContain('не хватает места');
  expect(host.textContent).not.toContain('ещё не подтверждена');
  expect(sessionStorage.getItem('warwrit:item-transfer:account:company')).toBeNull();
});
it('refreshes a changed company revision without replacing pending intent or clearing its message', async () => {
  const host = await setupDom();
  const bodies: string[] = [];
  let currentRevision = '7';
  let finishRead: (() => void) | undefined;
  let finishPost: (() => void) | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/auth/session')) return response({ accountId: 'account' });
      if (String(url).endsWith('/company')) {
        if (currentRevision === '8')
          await new Promise<void>((resolve) => {
            finishRead = resolve;
          });
        return response({
          company: { ...company, revision: currentRevision },
          holdings: {
            items: [],
            transfer: {
              containers: [],
              items: [{ itemId: `ration-${currentRevision}`, containerId: 'supply', quantity: 1 }],
            },
          },
        });
      }
      const body = String(init?.body);
      bodies.push(body);
      if (bodies.length === 1) throw new Error('response lost');
      await new Promise<void>((resolve) => {
        finishPost = resolve;
      });
      return response({ commandId: JSON.parse(body).commandId, ok: true, publicRevision: '9' });
    }),
  );
  await act(async () => root!.render(<View />));
  const button = () => host.querySelector('button')!;
  await act(async () =>
    button().dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true })),
  );
  const original = sessionStorage.getItem('warwrit:item-transfer:account:company');
  const originalMessage = button().dataset['message'];
  currentRevision = '8';
  await act(async () => root!.render(<View revision="8" />));
  expect(button().dataset['reading']).toBe('');
  expect(button().dataset['items']).toBe('');
  expect(button().dataset['message']).toBe(originalMessage);
  expect(sessionStorage.getItem('warwrit:item-transfer:account:company')).toBe(original);
  await act(async () => finishRead!());
  expect(button().dataset['reading']).toBe('8');
  expect(button().dataset['items']).toBe('ration-8');
  expect(button().dataset['pending']).toBe(JSON.parse(bodies[0]!).commandId);
  currentRevision = '9';
  await act(async () =>
    button().dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true })),
  );
  expect(bodies[1]).toBe(bodies[0]);
  expect(button().dataset['busy']).toBe('true');
  await act(async () => root!.render(<View revision="9" />));
  expect(button().dataset['busy']).toBe('true');
  await act(async () =>
    button().dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true })),
  );
  expect(bodies).toHaveLength(2);
  await act(async () => finishPost!());
  const terminalMessage = button().dataset['message'];
  expect(terminalMessage).toContain('Вещи переданы');
  currentRevision = '10';
  await act(async () => root!.render(<View revision="10" />));
  expect(button().dataset['reading']).toBe('10');
  expect(button().dataset['message']).toBe(terminalMessage);
  await act(async () => root!.render(<View revision="10" accountId="other-account" />));
  expect(button().dataset['message']).not.toBe(terminalMessage);
});
it('ignores an older read failure after a successful transfer refreshed the latest holdings', async () => {
  const host = await setupDom();
  let reads = 0;
  let failOlderRead: ((error: Error) => void) | undefined;
  let finishPost: (() => void) | undefined;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).endsWith('/auth/session')) return response({ accountId: 'account' });
      if (String(url).endsWith('/company')) {
        reads++;
        if (reads === 2)
          await new Promise<void>((_resolve, reject) => {
            failOlderRead = reject;
          });
        const revision = reads === 1 ? '7' : '9';
        return response({
          company: { ...company, revision },
          holdings: {
            items: [],
            transfer: {
              containers: [],
              items: [{ itemId: `ration-${revision}`, containerId: 'supply', quantity: 1 }],
            },
          },
        });
      }
      const request = JSON.parse(String(init?.body));
      await new Promise<void>((resolve) => {
        finishPost = resolve;
      });
      return response({ commandId: request.commandId, ok: true, publicRevision: '9' });
    }),
  );
  await act(async () => root!.render(<View />));
  const button = () => host.querySelector('button')!;
  await act(async () =>
    button().dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true })),
  );
  await act(async () => root!.render(<View revision="8" />));
  expect(button().dataset['busy']).toBe('true');
  await act(async () => finishPost!());
  const latest = { ...button().dataset };
  expect(latest['message']).toContain('Вещи переданы');
  expect(latest['reading']).toBe('9');
  expect(latest['items']).toBe('ration-9');
  expect(latest['pending']).toBe('');
  expect(latest['busy']).toBe('false');
  await act(async () => failOlderRead!(new Error('old read failed')));
  expect({ ...button().dataset }).toEqual(latest);
  expect(sessionStorage.getItem('warwrit:item-transfer:account:company')).toBeNull();
});
