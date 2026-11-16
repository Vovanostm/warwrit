// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { RecruitmentPanel } from './RecruitmentPanel.js';
import { companyRosterAttemptKey, readCompanyRosterAttempt } from './company-roster-attempt.js';

let root: Root | undefined;
let container: HTMLDivElement | undefined;

afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  root = undefined;
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

it('keeps an exact Hire retry after remount when the committed offer has disappeared', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const scope = { accountId: 'account-one', companyId: 'company-one' };
  let offers = [
    {
      offerId: 'offer-one',
      offerRevision: '1',
      characterId: 'ratko',
      name: 'Ратко',
      skills: [{ skillId: 'medicine', level: 5 }],
      aptitudes: [{ skillId: 'medicine', valueBps: 10000 }],
      health: { current: 100, maximum: 100 },
      stamina: { current: 100, maximum: 100 },
      conditions: [],
      signingQ: '50000000',
      dailyWageMilli: '10000',
      physician: true,
    },
  ];
  const postedBodies: string[] = [];
  const onRefresh = vi.fn();
  vi.stubGlobal('fetch', async (input: string, init?: RequestInit) => {
    if (input.includes('/company/recruits/')) return Response.json({ offers });
    if (input !== '/api/company/commands') throw new Error('Unexpected UI request');
    const body = String(init?.body);
    // The durable exact request must exist before transmission, not after failure.
    expect(readCompanyRosterAttempt(window.sessionStorage, scope, 'Recruit')?.body).toBe(body);
    postedBodies.push(body);
    if (postedBodies.length === 1) {
      offers = [];
      throw new Error('Lost reply; commit behavior is proven separately against PostgreSQL');
    }
    const command = JSON.parse(body) as { commandId: string };
    return Response.json({ commandId: command.commandId, ok: true, publicRevision: '8' });
  });
  container = document.createElement('div');
  document.body.append(container);
  const props = {
    apiBaseUrl: '/api',
    ...scope,
    expectedPublicRevision: '7',
    siteId: 'kamenny-brod',
    onRefresh,
    onUnauthorized: vi.fn(),
  };
  root = createRoot(container);
  await act(async () => root?.render(<RecruitmentPanel {...props} />));
  const hire = [...container.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === 'Нанять →',
  );
  expect(hire).toBeDefined();
  await act(async () => hire?.click());
  expect(postedBodies).toHaveLength(1);
  await act(async () => root?.unmount());
  root = createRoot(container);
  // A refreshed company revision must not replace the uncertain request's old revision.
  await act(async () => root?.render(<RecruitmentPanel {...props} expectedPublicRevision="99" />));
  expect(container.textContent).toContain('Свободных наёмников здесь нет.');
  const retry = [...container.querySelectorAll('button')].find(
    (button) => button.textContent?.trim() === 'Повторить тот же найм',
  );
  expect(retry).toBeDefined();
  await act(async () => retry?.click());
  expect(postedBodies).toEqual([postedBodies[0], postedBodies[0]]);
  expect(window.sessionStorage.getItem(companyRosterAttemptKey(scope, 'Recruit'))).toBeNull();
  expect(container.textContent).toContain('Наёмник нанят.');
  expect(onRefresh).toHaveBeenCalledOnce();
});
