// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { ReturnReport } from './ReturnReport.js';

vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);

const scopeA = { accountId: 'account-a', companyId: 'company-a' };
const companyCharacters = [{ characterId: 'fighter-a', name: 'Мора' }];
const report = (reportId = 'report-a') => ({
  schemaVersion: 1,
  reportId,
  fromTick: '1000',
  toTick: '3000',
  elapsedCampaignTicks: '2000',
  elapsedDays: '2',
  rationsConsumed: '5',
  includesLateFoodSettlement: true,
  earliestFoodFromTick: '500',
  wages: { accruedQ: '2500000', paidQ: '1000000', currentOwedQ: '500000' },
  debt: { currentQ: '700000' },
  events: [
    { type: 'NicknameAccepted', atTick: '1500', subjectIds: ['fighter-a'] },
    { type: 'FutureEvent', atTick: '2000', subjectIds: ['private-character-id'] },
  ],
  canonicalLedger: { secret: 'do-not-render' },
});

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function mount(scope = scopeA) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  return act(async () =>
    root?.render(<ReturnReport scope={scope} companyCharacters={companyCharacters} />),
  );
}

function button(name: string) {
  const match = [...container!.querySelectorAll('button')].find(
    (entry) => entry.textContent?.trim() === name,
  );
  if (!match) throw new Error(`Missing button: ${name}`);
  return match;
}

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
  vi.unstubAllGlobals();
});

it('shows no report when the server returns null and never acknowledges on read', async () => {
  const calls: string[] = [];
  vi.stubGlobal('fetch', async (input: string) => {
    calls.push(input);
    return Response.json({ report: null });
  });

  await mount();

  expect(container?.querySelector('[role="dialog"]')).toBeNull();
  expect(calls).toEqual(['/api/company/return-report']);
});

it('accepts canonical large amounts and a report with more than two hundred events', async () => {
  const value = report();
  value.wages.accruedQ = '9'.repeat(100);
  value.events = Array.from({ length: 201 }, () => ({
    type: 'NicknameAccepted',
    atTick: '1500',
    subjectIds: ['fighter-a'],
  }));
  vi.stubGlobal('fetch', async () => Response.json({ report: value }));
  await mount();
  expect(container?.querySelectorAll('.return-report-events li')).toHaveLength(201);
  expect(container?.textContent).not.toContain('Не удалось получить сводку');
  expect(button('Закрыть сводку')).toBeDefined();
});

it('keeps malformed untrusted amounts out of money formatting', async () => {
  vi.stubGlobal('fetch', async () =>
    Response.json({ report: { ...report(), wages: { ...report().wages, accruedQ: 'NaN' } } }),
  );

  await mount();

  expect(container?.textContent).toContain('Не удалось получить сводку');
  expect(container?.textContent).not.toContain('NaN');
  expect(container?.textContent).toContain('Повторить запрос');
});

it.each([
  {
    outcome: 'PROKOP_HANDED_OVER',
    text: 'Мешок отдали Евсею. Прокоп под замком, шалаши убраны.',
  },
  {
    outcome: 'PROOF_DESTROYED_OLD_FORD_REVEALED',
    text: 'Мешок бросили в реку. Шалаши остались, а Прокоп рассказал о старом броде у ив.',
  },
])('shows the saved $outcome outcome in the return report', async ({ outcome, text }) => {
  vi.stubGlobal('fetch', async () =>
    Response.json({
      report: {
        ...report(),
        contractOutcomes: [
          {
            instanceId: 'ci.m1.empty-watch-record.01',
            outcome,
            atTick: '2000',
          },
        ],
      },
    }),
  );
  await mount();
  expect(container?.textContent).toContain(text);
});

it('retries a failed read and does not acknowledge the empty result', async () => {
  const calls: string[] = [];
  vi.stubGlobal('fetch', async (input: string) => {
    calls.push(input);
    if (calls.length === 1) throw new Error('offline');
    return Response.json({ report: null });
  });

  await mount();
  await act(async () => button('Повторить запрос').click());

  expect(calls).toEqual(['/api/company/return-report', '/api/company/return-report']);
  expect(container?.querySelector('[role="dialog"]')).toBeNull();
  expect(calls.every((url) => !url.endsWith('/ack'))).toBe(true);
});

it('shows only granted report facts, then acknowledges on explicit close', async () => {
  const requests: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    requests.push({ url: input, ...(init ? { init } : {}) });
    return input.endsWith('/ack')
      ? Response.json({ ok: true, duplicate: true })
      : Response.json({ report: report() });
  });

  await mount();

  expect(container?.textContent).toContain('Пока вас не было');
  expect(container?.textContent).toContain('Учтён расход пайков5 пайков');
  expect(container?.textContent).toContain('2,5 кр.');
  expect(container?.textContent).toContain('1 кр.');
  expect(container?.textContent).toContain('Сейчас не выплачено жалованья0,5 кр.');
  expect(container?.textContent).toContain('Прочие долги компании0,7 кр.');
  expect(container?.textContent).toContain('В сумму вошёл расход пайков из более раннего периода');
  expect(container?.textContent).toContain('Мора · Прозвище принято.');
  expect(container?.textContent).toContain('Произошло событие в компании.');
  expect(container?.textContent).not.toContain('private-character-id');
  expect(container?.textContent).not.toContain('do-not-render');
  expect(requests.filter(({ url }) => url.endsWith('/ack'))).toHaveLength(0);

  await act(async () => button('Закрыть сводку').click());
  const ack = requests.find(({ url }) => url.endsWith('/ack'));
  expect(ack?.init?.method).toBe('POST');
  expect(JSON.parse(String(ack?.init?.body))).toEqual({ schemaVersion: 1, reportId: 'report-a' });
  expect(container?.querySelector('[role="dialog"]')).toBeNull();
});

it('retains the report after an acknowledgement failure and retries the same ID', async () => {
  const bodies: string[] = [];
  let acknowledgements = 0;
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    if (!input.endsWith('/ack')) return Response.json({ report: report('same-report') });
    bodies.push(String(init?.body));
    acknowledgements += 1;
    if (acknowledgements === 1) throw new Error('offline');
    return Response.json({ ok: true, duplicate: true });
  });

  await mount();
  await act(async () => button('Закрыть сводку').click());
  expect(container?.textContent).toContain('Не удалось закрыть сводку');
  expect(container?.querySelector('[role="dialog"]')).not.toBeNull();

  await act(async () => button('Повторить закрытие').click());
  expect(bodies).toHaveLength(2);
  expect(bodies[0]).toBe(bodies[1]);
  expect(JSON.parse(bodies[1]!)).toEqual({ schemaVersion: 1, reportId: 'same-report' });
  expect(container?.querySelector('[role="dialog"]')).toBeNull();
});

it('lets the player continue after a read error without acknowledging unread facts', async () => {
  const calls: string[] = [];
  vi.stubGlobal('fetch', async (input: string) => {
    calls.push(input);
    throw new Error('offline');
  });

  await mount();

  expect(container?.textContent).toContain('Не удалось получить сводку');
  expect(container?.textContent).toContain('Повторить запрос');
  await act(async () => button('Продолжить без сводки').click());
  expect(container?.querySelector('[role="dialog"]')).toBeNull();
  expect(calls.every((url) => !url.endsWith('/ack'))).toBe(true);
});

it('aborts and ignores an older company read when the scope changes', async () => {
  let releaseA: ((response: Response) => void) | undefined;
  const signals: AbortSignal[] = [];
  vi.stubGlobal('fetch', (input: string, init?: RequestInit) => {
    signals.push(init?.signal as AbortSignal);
    if (input.includes('/ack'))
      return Promise.resolve(Response.json({ ok: true, duplicate: false }));
    if (input.includes('company-a'))
      return new Promise<Response>((resolve) => {
        releaseA = resolve;
      });
    return Promise.resolve(
      Response.json({ report: { ...report('company-b-report'), elapsedDays: '77' } }),
    );
  });

  await mount();
  await act(async () => {
    root?.render(
      <ReturnReport
        scope={{ accountId: 'account-b', companyId: 'company-b' }}
        companyCharacters={[]}
      />,
    );
  });
  expect(container?.textContent).toContain('Прошло дней77');
  expect(signals[0]?.aborted).toBe(true);

  await act(async () =>
    releaseA?.(
      Response.json({ report: { ...report('stale-company-a-report'), elapsedDays: '11' } }),
    ),
  );
  expect(container?.textContent).toContain('Прошло дней77');
  expect(container?.textContent).not.toContain('Прошло дней11');
});
