// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { CompanyRecoveryPanel } from './CompanyRecoveryPanel.js';
import { readCompanyRosterAttempt } from './company-roster-attempt.js';
import type { CompanyHoldingsDto, CompanySummaryDto } from '@warwrit/protocol';

let root: Root | undefined;
let container: HTMLDivElement | undefined;
afterEach(async () => {
  if (root) await act(async () => root?.unmount());
  container?.remove();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

it('retains a lost assignment across remount and refuses an opposite order until exact retry', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  const scope = { accountId: 'account-one', companyId: 'company-one' };
  const company: CompanySummaryDto = {
    companyId: scope.companyId,
    revision: '7',
    companyPresentation: null,
    leaderId: 'mora',
    runStatus: 'ACTIVE',
    characters: [
      {
        characterId: 'mora',
        name: 'Мора',
        nicknameTextKey: null,
        perkIds: [],
        knownStatus: 'AVAILABLE',
      },
    ],
  };
  const holdings: CompanyHoldingsDto = {
    cashQ: '0',
    wallets: [],
    items: [],
    fieldCamp: false,
    wagesOwedQ: '0',
    wagesDueQ: '0',
    people: [
      {
        characterId: 'mora',
        fallen: false,
        currentHealth: 17,
        maximumHealth: 100,
        currentStamina: 80,
        maximumStamina: 100,
        conditions: ['severe'],
        recovery: { assignment: 'FIELD', canRest: true, canReturnToField: false },
      },
    ],
  };
  const onRefresh = vi.fn();
  const bodies: string[] = [];
  vi.stubGlobal('fetch', async (_input: string, init?: RequestInit) => {
    const body = String(init?.body);
    expect(readCompanyRosterAttempt(window.sessionStorage, scope, 'SetAssignment')?.body).toBe(
      body,
    );
    bodies.push(body);
    if (bodies.length === 1) throw new Error('lost reply');
    const command = JSON.parse(body) as { commandId: string };
    return Response.json({ commandId: command.commandId, ok: true, publicRevision: '8' });
  });
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () =>
    root?.render(
      <CompanyRecoveryPanel
        accountId={scope.accountId}
        company={company}
        holdings={holdings}
        onRefresh={onRefresh}
      />,
    ),
  );
  const button = (label: string) =>
    [...container!.querySelectorAll('button')].find(
      (entry) => entry.textContent?.trim() === label,
    )!;
  await act(async () => button('Назначить отдых').click());
  expect(bodies).toHaveLength(1);
  await act(async () => root?.unmount());
  root = createRoot(container);
  const recovering: CompanyHoldingsDto = {
    ...holdings,
    people: holdings.people.map((person) => ({
      ...person,
      recovery: { assignment: 'RECOVERY', canRest: false, canReturnToField: true },
    })),
  };
  await act(async () =>
    root?.render(
      <CompanyRecoveryPanel
        accountId={scope.accountId}
        company={{ ...company, revision: '99' }}
        holdings={recovering}
        onRefresh={onRefresh}
      />,
    ),
  );
  expect(button('Вернуть в строй').disabled).toBe(true);
  await act(async () => button('Вернуть в строй').click());
  expect(bodies).toHaveLength(1);
  await act(async () => button('Повторить то же назначение').click());
  expect(bodies).toEqual([bodies[0], bodies[0]]);
  expect(JSON.parse(bodies[0]!)).toMatchObject({
    expectedPublicRevision: '7',
    payload: { characterId: 'mora', assignment: 'RECOVERY' },
  });
  expect(readCompanyRosterAttempt(window.sessionStorage, scope, 'SetAssignment')).toBeUndefined();
  expect(onRefresh).toHaveBeenCalledTimes(1);
  await act(async () => button('Вернуть в строй').click());
  expect(JSON.parse(bodies[2]!)).toMatchObject({
    expectedPublicRevision: '99',
    payload: { assignment: 'FIELD' },
  });
});
