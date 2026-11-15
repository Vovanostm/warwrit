// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { EquipmentTrader } from './EquipmentTrader.js';

const scopeA = { accountId: 'account-a', companyId: 'company-a' };

function market(overrides: Record<string, unknown> = {}) {
  return {
    publicRevision: '18',
    siteId: 'kamenny-brod',
    revision: '5',
    merchantCashQ: '5000000',
    items: [
      {
        itemId: 'loot-sword-1',
        definitionId: 'sword',
        priceQ: '2000000',
        currentCondition: 2,
        maximumCondition: 3,
        equipped: true,
        interruptsLearning: true,
        canSell: true,
        refusal: null,
      },
    ],
    ...overrides,
  };
}

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function mount(scope = scopeA, onRefreshCompany = vi.fn()) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  return act(async () =>
    root?.render(<EquipmentTrader scope={scope} onRefreshCompany={onRefreshCompany} />),
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
  vi.unstubAllGlobals();
});

it('shows the Kamenny Brod quote and sends the exact sale using its revisions', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  const refreshCompany = vi.fn();
  let quotes = 0;
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    calls.push({ url: input, ...(init ? { init } : {}) });
    if (input.endsWith('/sell'))
      return Response.json({
        commandId: JSON.parse(String(init?.body)).commandId,
        ok: true,
        publicRevision: '19',
      });
    quotes += 1;
    return Response.json({
      ...market(),
      ...(quotes > 1 ? { items: [] } : {}),
    });
  });

  await mount(scopeA, refreshCompany);

  expect(container?.textContent).toContain('У торговца: 5 кр.');
  expect(container?.textContent).toContain('Меч');
  expect(container?.textContent).toContain('2/3');
  expect(container?.textContent).toContain('Надето');
  expect(container?.textContent).toContain('Продажа прервёт обучение.');
  expect(calls[0]?.url).toBe('/api/company/equipment-market/kamenny-brod');
  expect(calls[0]?.init?.credentials).toBe('same-origin');
  expect(
    (calls[0]?.init?.headers as Record<string, string>)[WORLD_EXPECTED_COMPANY_ID_HEADER],
  ).toBe('company-a');
  expect(calls.filter(({ url }) => url.endsWith('/sell'))).toHaveLength(0);

  await act(async () => button('Продать').click());

  const sale = calls.find(({ url }) => url.endsWith('/sell'))!;
  const request = JSON.parse(String(sale.init?.body));
  expect(sale.url).toBe('/api/company/equipment-market/kamenny-brod/sell');
  expect(sale.init?.method).toBe('POST');
  expect(sale.init?.credentials).toBe('same-origin');
  expect((sale.init?.headers as Record<string, string>)[WORLD_EXPECTED_COMPANY_ID_HEADER]).toBe(
    'company-a',
  );
  expect(request).toMatchObject({
    schemaVersion: 1,
    expectedRevision: '18',
    itemId: 'loot-sword-1',
    shopRevision: '5',
  });
  expect(request.commandId).toEqual(expect.any(String));
  expect(refreshCompany).toHaveBeenCalledTimes(1);
  expect(calls.filter(({ url }) => url.endsWith('/equipment-market/kamenny-brod'))).toHaveLength(2);
});

it('explains insufficient merchant funds without offering the sale', async () => {
  vi.stubGlobal('fetch', async () =>
    Response.json(
      market({
        merchantCashQ: '1000000',
        items: [
          {
            ...market().items[0],
            priceQ: '2000000',
            canSell: false,
            refusal: 'INSUFFICIENT_FUNDS',
            interruptsLearning: false,
          },
        ],
      }),
    ),
  );

  await mount();

  expect(container?.textContent).toContain('У торговца сейчас недостаточно денег на этот предмет.');
  expect(container?.textContent).not.toContain('Продажа прервёт обучение.');
  expect(button('Продать').disabled).toBe(true);
});

it('retains and retries the same request when the reply is lost and quotes are unavailable', async () => {
  const bodies: string[] = [];
  let failFirstQuote = false;
  let saleCount = 0;
  const refreshCompany = vi.fn();
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    if (input.endsWith('/sell')) {
      bodies.push(String(init?.body));
      saleCount += 1;
      if (saleCount === 1) throw new Error('lost response');
      return Response.json({
        commandId: JSON.parse(String(init?.body)).commandId,
        ok: true,
        publicRevision: '19',
      });
    }
    if (failFirstQuote) throw new Error('offline');
    return Response.json(market());
  });

  await mount(scopeA, refreshCompany);
  await act(async () => button('Продать').click());
  const firstBody = bodies[0]!;
  expect(container?.textContent).toContain('Ответ о продаже не пришёл. Повторите эту же продажу.');
  expect(window.sessionStorage.length).toBe(1);

  await unmount();
  failFirstQuote = true;
  await mount(scopeA, refreshCompany);

  expect(container?.textContent).toContain('Не удалось получить цены торговца. Повторите запрос.');
  expect(button('Повторить ту же продажу').disabled).toBe(false);
  await act(async () => button('Повторить ту же продажу').click());

  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toBe(firstBody);
  expect(JSON.parse(bodies[1]!).commandId).toEqual(expect.any(String));
  expect(window.sessionStorage.length).toBe(0);
  expect(refreshCompany).toHaveBeenCalledTimes(1);
});

it('rejects malformed market amounts without formatting them', async () => {
  vi.stubGlobal('fetch', async () =>
    Response.json({ ...market(), merchantCashQ: '9'.repeat(129) }),
  );

  await mount();

  expect(container?.textContent).toContain('Сервер вернул неполные сведения о торговце.');
  expect(container?.textContent).not.toContain('9'.repeat(129));
});

it('cancels an old company quote and ignores its late reply after scope changes', async () => {
  let releaseOld: ((response: Response) => void) | undefined;
  const signals: AbortSignal[] = [];
  vi.stubGlobal('fetch', (input: string, init?: RequestInit) => {
    signals.push(init?.signal as AbortSignal);
    if (input.includes('/sell'))
      return Promise.resolve(Response.json({ commandId: 'none', ok: false, publicRevision: '0' }));
    const companyId = (init?.headers as Record<string, string>)[WORLD_EXPECTED_COMPANY_ID_HEADER];
    if (companyId === 'company-a') {
      return new Promise<Response>((resolve) => {
        releaseOld = resolve;
      });
    }
    return Promise.resolve(
      Response.json(
        market({
          merchantCashQ: '3000000',
          items: [{ ...market().items[0], itemId: 'new-company-item', priceQ: '1000000' }],
        }),
      ),
    );
  });

  await mount();
  await act(async () =>
    root?.render(
      <EquipmentTrader
        scope={{ accountId: 'account-b', companyId: 'company-b' }}
        onRefreshCompany={vi.fn()}
      />,
    ),
  );
  expect(signals[0]?.aborted).toBe(true);
  expect(container?.textContent).toContain('1 кр.');
  expect(container?.textContent).not.toContain('5 кр.');

  await act(async () => releaseOld?.(Response.json(market({ merchantCashQ: '99000000' }))));
  expect(container?.textContent).toContain('3 кр.');
  expect(container?.textContent).not.toContain('99 кр.');
});
