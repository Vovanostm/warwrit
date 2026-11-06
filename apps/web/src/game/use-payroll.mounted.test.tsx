import { act } from 'react';
import { createRequire } from 'node:module';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { CompanyHoldingsDto, CompanySummaryDto } from '@warwrit/protocol';
import { PayrollPanel } from './PayrollPanel.js';
import { usePayroll } from './use-payroll.js';

interface TestDom {
  readonly window: Window & { close(): void; MouseEvent: typeof MouseEvent };
}
const { JSDOM } = createRequire(import.meta.url)('jsdom') as {
  readonly JSDOM: new (html: string, options: { readonly url: string }) => TestDom;
};

const company = (id: string, revision = '7'): CompanySummaryDto => ({
  companyId: id,
  revision,
  companyPresentation: { name: 'Company', bannerId: 'banner' },
  leaderId: null,
  runStatus: 'ACTIVE',
  characters: [
    {
      characterId: 'worker-a',
      name: 'Rell',
      nicknameTextKey: null,
      perkIds: [],
      knownStatus: 'AVAILABLE',
    },
  ],
});
const readback = (
  accountId: string,
  companyId: string,
  revision = '7',
  dueQ = '19',
  spendableQ = '19',
) => ({
  schemaVersion: 1,
  company: company(companyId, revision),
  holdings: {
    cashQ: '19',
    wallets: [],
    items: [],
    people: [],
    fieldCamp: false,
    wagesOwedQ: dueQ,
    wagesDueQ: dueQ,
    payroll: {
      atTick: '1',
      publicRevision: revision,
      pools: [
        {
          poolId: 'local',
          walletId: 'purse',
          cashQ: spendableQ,
          reservedQ: '0',
          spendableQ,
          location: { kind: 'AT', siteId: 'village', areaId: 'square' },
        },
      ],
      services: [],
      claims: [],
      owedQ: dueQ,
      dueQ,
      payableQ: '19',
      duePayableQ: dueQ,
    },
  },
});
const response = (body: unknown, status = 200) =>
  ({ ok: status === 200, status, json: async () => body }) as Response;
function View(props: {
  accountId: string;
  companyId: string;
  revision?: string;
  holdings?: CompanyHoldingsDto;
}) {
  const state = usePayroll(
    props.accountId,
    company(props.companyId, props.revision),
    props.holdings,
    () => {},
  );
  return (
    <main
      data-pending={state.pending?.commandId ?? ''}
      data-due={state.payroll?.duePayableQ ?? ''}
      data-spendable={state.payroll?.pools[0]?.spendableQ ?? ''}
      data-message={state.message ?? ''}
      data-busy={state.busy}
    >
      <button onClick={() => void state.pay({ poolId: 'local', amountQ: '19', mode: 'DEFAULT' })}>
        Pay
      </button>
    </main>
  );
}

let dom: TestDom | undefined;
let root: ReturnType<typeof createRoot> | undefined;
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
  vi.restoreAllMocks();
});

async function mount(
  accountId: string,
  companyId: string,
  storedAttempt?: string,
  mode: 'hook' | 'panel' = 'hook',
  ticksPerDay = 1000,
) {
  dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/' });
  if (storedAttempt !== undefined)
    dom.window.sessionStorage.setItem(
      `warwrit:payroll-attempt:${accountId}:${companyId}`,
      storedAttempt,
    );
  Object.defineProperties(globalThis, {
    window: { configurable: true, value: dom.window },
    document: { configurable: true, value: dom.window.document },
    navigator: { configurable: true, value: dom.window.navigator },
    sessionStorage: { configurable: true, value: dom.window.sessionStorage },
    IS_REACT_ACT_ENVIRONMENT: { configurable: true, value: true },
  });
  const host = dom.window.document.getElementById('root')!;
  root = createRoot(host);
  await act(async () =>
    root!.render(
      mode === 'panel' ? (
        <PayrollPanel
          accountId={accountId}
          company={company(companyId)}
          holdings={undefined}
          ticksPerDay={ticksPerDay}
          onRefresh={() => {}}
        />
      ) : (
        <View accountId={accountId} companyId={companyId} />
      ),
    ),
  );
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  return host;
}

it('retains the stored command across a lost response and reload, then replays its exact body', async () => {
  let posts = 0;
  const bodies: string[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/session')) return response({ accountId: 'account-a' });
      if (url.endsWith('/company')) return response(readback('account-a', 'company-a'));
      if (url.endsWith('/company/commands')) {
        posts++;
        bodies.push(String(init?.body));
        expect(
          sessionStorage.getItem('warwrit:payroll-attempt:account-a:company-a'),
        ).not.toBeNull();
        if (posts === 1) throw new Error('response lost');
        const request = JSON.parse(bodies.at(-1)!) as { commandId: string };
        return response({ commandId: request.commandId, ok: true, publicRevision: '8' });
      }
      throw new Error(`unexpected ${url}`);
    }),
  );
  let host = await mount('account-a', 'company-a');
  await act(async () =>
    host
      .querySelector('button')!
      .dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true })),
  );
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  const request = JSON.parse(bodies[0]!) as { commandId: string };
  expect(host.querySelector('main')?.getAttribute('data-pending')).toBe(request.commandId);
  expect(host.querySelector('main')?.getAttribute('data-message')).toContain(
    'Ответ на выплату 0,000019 кр. · по очереди неясен.',
  );
  const retainedAttempt = sessionStorage.getItem('warwrit:payroll-attempt:account-a:company-a')!;
  act(() => root?.unmount());
  root = undefined;
  host = await mount('account-a', 'company-a', retainedAttempt);
  await act(async () =>
    host
      .querySelector('button')!
      .dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true })),
  );
  expect(posts).toBe(2);
  expect(bodies[1]).toBe(bodies[0]);
  expect(sessionStorage.getItem('warwrit:payroll-attempt:account-a:company-a')).toBeNull();
});

it('shows the restored targeted payee, amount, and campaign deadline through confirmation', async () => {
  const initial = readback('account-a', 'company-a');
  const book = {
    ...initial,
    holdings: {
      ...initial.holdings,
      payroll: {
        ...initial.holdings.payroll,
        claims: [
          {
            claimId: 'claim-a',
            membershipId: 'worker-a',
            poolId: 'local',
            payee: { kind: 'CHARACTER' as const, id: 'worker-a' },
            dueAt: '1000',
            estimatedQ: '9170000',
            cashPaidQ: '0',
            currentMaintenanceQ: '0',
            pendingQ: '0',
            unsecuredQ: '9170000',
          },
        ],
      },
    },
  };
  const request = {
    schemaVersion: 2,
    commandId: 'targeted-retry',
    expectedPublicRevision: '7',
    type: 'PayClaims',
    payload: {
      poolId: 'local',
      amountQ: '9170000',
      claimIds: [],
      mode: 'TARGETED',
      payeeId: 'worker-a',
    },
  };
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, _init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/session')) return response({ accountId: 'account-a' });
      if (url.endsWith('/company')) return response(book);
      if (url.endsWith('/company/commands'))
        return response({ commandId: request.commandId, ok: true, publicRevision: '8' });
      throw new Error(`unexpected ${url}`);
    }),
  );
  const host = await mount(
    'account-a',
    'company-a',
    JSON.stringify({ accountId: 'account-a', companyId: 'company-a', request }),
    'panel',
    1000,
  );

  expect(host.textContent).toContain('9,17 кр. · выбранному получателю Rell');
  expect(host.textContent).toContain('срок: День 2 · такт 0');

  await act(async () => {
    host
      .querySelector('button.action')!
      .dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(host.textContent).toContain(
    'Выплата записана: 9,17 кр. · выбранному получателю Rell. Книга компании обновлена.',
  );
  expect(sessionStorage.getItem('warwrit:payroll-attempt:account-a:company-a')).toBeNull();
});

it('shows an unavailable initial book and retries its readback from the panel', async () => {
  let reads = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/session')) return response({ accountId: 'account-a' });
      if (url.endsWith('/company')) {
        reads++;
        return reads === 1
          ? response({ message: 'unavailable' }, 503)
          : response(readback('account-a', 'company-a'));
      }
      throw new Error(`unexpected ${url}`);
    }),
  );
  const host = await mount('account-a', 'company-a', undefined, 'panel');
  expect(host.textContent).toContain('Жалованье не обновлено. Обновите отряд и попробуйте снова.');
  expect(host.textContent).toContain('Обновить книгу');

  await act(async () => {
    host
      .querySelector('button')!
      .dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(reads).toBe(2);
  expect(host.textContent).toContain('19');
  expect(host.textContent).not.toContain('Загружаем книгу жалованья');
});

it('keeps a confirmed payment terminal when its following book readback fails', async () => {
  const initial = readback('account-a', 'company-a');
  const dueBook = {
    ...initial,
    holdings: {
      ...initial.holdings,
      payroll: {
        ...initial.holdings.payroll,
        claims: [
          {
            claimId: 'claim-a',
            membershipId: 'worker-a',
            poolId: 'local',
            payee: { kind: 'CHARACTER' as const, id: 'worker-a' },
            dueAt: '1',
            estimatedQ: '19',
            cashPaidQ: '0',
            currentMaintenanceQ: '0',
            pendingQ: '0',
            unsecuredQ: '19',
          },
        ],
      },
    },
  };
  let companyReads = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/session')) return response({ accountId: 'account-a' });
      if (url.endsWith('/company')) {
        companyReads++;
        return companyReads === 1 ? response(dueBook) : response({ message: 'unavailable' }, 503);
      }
      if (url.endsWith('/company/commands')) {
        const request = JSON.parse(String(init?.body)) as { commandId: string };
        return response({ commandId: request.commandId, ok: true, publicRevision: '8' });
      }
      throw new Error(`unexpected ${url}`);
    }),
  );
  const host = await mount('account-a', 'company-a', undefined, 'panel');

  await act(async () => {
    const button = [...host.querySelectorAll('button')].find((item) =>
      item.textContent?.includes('Выплатить по очереди'),
    )!;
    button.dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(host.textContent).toContain(
    'Выплата записана: 0,000019 кр. · по очереди, но книгу компании не удалось обновить.',
  );
  expect(host.textContent).not.toContain('Повторите эту же выплату');
  expect(host.textContent).toContain('Обновить книгу');
  expect(host.textContent).not.toContain('Выплата 19 кр. ещё не подтверждена.');
  expect(sessionStorage.getItem('warwrit:payroll-attempt:account-a:company-a')).toBeNull();
});

it('shows the authoritative insufficient-funds rejection after refreshing payroll', async () => {
  let companyReads = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/session')) return response({ accountId: 'account-a' });
      if (url.endsWith('/company')) {
        companyReads++;
        return response(readback('account-a', 'company-a', companyReads === 1 ? '7' : '8'));
      }
      if (url.endsWith('/company/commands')) {
        const request = JSON.parse(String(init?.body)) as { commandId: string };
        return response(
          {
            commandId: request.commandId,
            ok: false,
            code: 'INSUFFICIENT_FUNDS',
            publicRevision: '7',
          },
          409,
        );
      }
      throw new Error(`unexpected ${url}`);
    }),
  );
  const host = await mount('account-a', 'company-a');

  await act(async () => {
    host
      .querySelector('button')!
      .dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expect(host.querySelector('main')?.getAttribute('data-message')).toContain(
    'В этом кошельке не хватает свободного золота. Выплата не прошла.',
  );
  expect(host.querySelector('main')?.getAttribute('data-message')).toContain(
    'Выплата: 0,000019 кр. · по очереди.',
  );
  expect(host.querySelector('main')?.getAttribute('data-pending')).toBe('');
  expect(host.querySelector('main')?.getAttribute('data-busy')).toBe('false');

  await act(async () =>
    root!.render(<View accountId="account-a" companyId="company-a" revision="8" />),
  );
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

  expect(companyReads).toBe(3);
  expect(host.querySelector('main')?.getAttribute('data-message')).toContain(
    'В этом кошельке не хватает свободного золота. Выплата не прошла.',
  );
  expect(host.querySelector('main')?.getAttribute('data-pending')).toBe('');
  expect(host.querySelector('main')?.getAttribute('data-busy')).toBe('false');
});

it('keeps the prior account request isolated from a late result after scope change', async () => {
  let finish: ((value: Response) => void) | undefined;
  let posts = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/session')) return response({ accountId: 'account-a' });
      if (url.endsWith('/company')) return response(readback('account-a', 'company-a'));
      if (url.endsWith('/company/commands')) {
        posts++;
        return await new Promise<Response>((resolve) => {
          finish = resolve;
        });
      }
      throw new Error(`unexpected ${url}`);
    }),
  );
  const host = await mount('account-a', 'company-a');
  await act(async () => {
    const button = host.querySelector('button')!;
    button.dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true }));
    button.dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true }));
  });
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  expect(posts).toBe(1);
  const pending = sessionStorage.getItem('warwrit:payroll-attempt:account-a:company-a');
  await act(async () => root!.render(<View accountId="account-b" companyId="company-b" />));
  finish?.(response({ commandId: 'late', ok: true, publicRevision: '8' }));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  expect(sessionStorage.getItem('warwrit:payroll-attempt:account-a:company-a')).toBe(pending);
});

it('refreshes same-company payroll on revision change without replacing a pending request', async () => {
  let latest = readback('account-a', 'company-a');
  let reads = 0;
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/auth/session')) return response({ accountId: 'account-a' });
      if (url.endsWith('/company')) {
        reads++;
        return response(latest);
      }
      throw new Error(`unexpected ${url}`);
    }),
  );
  const pending = {
    accountId: 'account-a',
    companyId: 'company-a',
    request: {
      schemaVersion: 2,
      commandId: 'pending-payroll-request',
      expectedPublicRevision: '7',
      type: 'PayClaims',
      payload: { poolId: 'local', amountQ: '19', claimIds: [], mode: 'DEFAULT' },
    },
  };
  const host = await mount('account-a', 'company-a', JSON.stringify(pending));
  expect(host.querySelector('main')?.getAttribute('data-due')).toBe('19');

  latest = readback('account-a', 'company-a', '8', '6', '3');
  await act(async () =>
    root!.render(
      <View
        accountId="account-a"
        companyId="company-a"
        revision="8"
        holdings={latest.holdings as CompanyHoldingsDto}
      />,
    ),
  );
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  expect(reads).toBe(2);
  expect(host.querySelector('main')?.getAttribute('data-due')).toBe('6');
  expect(host.querySelector('main')?.getAttribute('data-spendable')).toBe('3');
  expect(host.querySelector('main')?.getAttribute('data-pending')).toBe('pending-payroll-request');
});

it('ignores a successful payment readback that completes after a company scope switch', async () => {
  let accountId = 'account-a';
  let companyReads = 0;
  let finishOldReadback: ((value: Response) => void) | undefined;
  let signalOldReadback: (() => void) | undefined;
  const oldReadbackStarted = new Promise<void>((resolve) => {
    signalOldReadback = resolve;
  });
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/auth/session')) return response({ accountId });
      if (url.endsWith('/company/commands')) {
        const request = JSON.parse(String(init?.body)) as { commandId: string };
        return response({ commandId: request.commandId, ok: true, publicRevision: '8' });
      }
      if (url.endsWith('/company') && accountId === 'account-a') {
        companyReads++;
        if (companyReads === 2) {
          signalOldReadback?.();
          return await new Promise<Response>((resolve) => {
            finishOldReadback = resolve;
          });
        }
        return response(readback('account-a', 'company-a'));
      }
      if (url.endsWith('/company'))
        return response(readback('account-b', 'company-b', '3', '5', '2'));
      throw new Error(`unexpected ${url}`);
    }),
  );
  const host = await mount('account-a', 'company-a');
  await act(async () => {
    host
      .querySelector('button')!
      .dispatchEvent(new dom!.window.MouseEvent('click', { bubbles: true }));
    await oldReadbackStarted;
  });

  accountId = 'account-b';
  await act(async () =>
    root!.render(<View accountId="account-b" companyId="company-b" revision="3" />),
  );
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  finishOldReadback?.(response(readback('account-a', 'company-a', '8', '1', '0')));
  await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

  expect(host.querySelector('main')?.getAttribute('data-due')).toBe('5');
  expect(host.querySelector('main')?.getAttribute('data-spendable')).toBe('2');
  expect(host.querySelector('main')?.getAttribute('data-message')).toBe('');
  expect(host.querySelector('main')?.getAttribute('data-busy')).toBe('false');
});
