// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  WORLD_EXPECTED_COMPANY_ID_HEADER,
  type CompanyRetrainingResponseDto,
  type CompanySummaryDto,
} from '@warwrit/protocol';
import { RetrainingPanel } from './RetrainingPanel.js';

const company: CompanySummaryDto = {
  companyId: 'company-one',
  revision: '5',
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
const offer: CompanyRetrainingResponseDto = {
  publicRevision: '5',
  retraining: {
    courseId: 'retraining.kamenny-brod.blades-25',
    providerId: 'npc.city-watch-contact.kamenny-brod.01',
    skillId: 'blades',
    durationTicks: '3000',
    costQPerDay: '5000000',
    status: 'AVAILABLE',
    learners: [
      { characterId: 'mora', masteredPerkId: 'blades-25-a', replacementPerkId: 'blades-25-b' },
    ],
  },
};

function response(status: number, value: unknown): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => value } as Response;
}

describe('guard retraining panel', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;
  afterEach(async () => {
    if (root) await act(async () => root?.unmount());
    root = undefined;
    container?.remove();
    container = undefined;
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  function mount(onRefresh = vi.fn()) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    root.render(
      <RetrainingPanel
        accountId="owner"
        company={company}
        ticksPerDay={1000}
        onRefresh={onRefresh}
      />,
    );
    return onRefresh;
  }

  it('uses the server offer and sends the chosen replacement explicitly', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'crypto',
      Object.assign(Object.create(crypto), { randomUUID: () => 'command-1' }),
    );
    let body = '';
    let headers: HeadersInit | undefined;
    const onRefresh = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method !== 'POST') return response(200, offer);
        body = String(init.body);
        headers = init.headers;
        const command = JSON.parse(body) as { commandId: string };
        return response(200, { commandId: command.commandId, ok: true, publicRevision: '6' });
      }),
    );
    await act(async () => {
      mount(onRefresh);
      await Promise.resolve();
    });
    expect(container?.textContent).toContain('3 дня');
    expect(container?.textContent).toContain('5 кр. в день');
    expect(container?.textContent).toContain('точность +3 → инициатива +3');
    await act(async () => {
      [...container!.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Начать переобучение')!
        .click();
      await Promise.resolve();
    });
    expect(JSON.parse(body)).toMatchObject({
      schemaVersion: 2,
      commandId: 'command-1',
      expectedPublicRevision: '5',
      type: 'StartRetraining',
      payload: {
        courseId: 'retraining.kamenny-brod.blades-25',
        characterId: 'mora',
        oldPerkId: 'blades-25-a',
        newPerkId: 'blades-25-b',
      },
    });
    expect((headers as Record<string, string>)[WORLD_EXPECTED_COMPANY_ID_HEADER]).toBe(
      company.companyId,
    );
    expect(onRefresh).toHaveBeenCalled();
    expect(container?.textContent).toContain('До конца курса действует прежний приём.');
  });

  it('stores a lost request before sending and retries the exact body after remount', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'crypto',
      Object.assign(Object.create(crypto), { randomUUID: () => 'command-lost' }),
    );
    const bodies: string[] = [];
    let posts = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method !== 'POST') return response(200, offer);
        const body = String(init.body);
        expect(
          JSON.parse(sessionStorage.getItem('warwrit:retraining:v1:owner:company-one') ?? 'null')
            .body,
        ).toBe(body);
        bodies.push(body);
        posts += 1;
        if (posts === 1) throw new Error('lost reply');
        const command = JSON.parse(body) as { commandId: string };
        return response(200, { commandId: command.commandId, ok: true, publicRevision: '6' });
      }),
    );
    await act(async () => {
      mount();
      await Promise.resolve();
    });
    await act(async () => {
      [...container!.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Начать переобучение')!
        .click();
      await Promise.resolve();
    });
    expect(container?.textContent).toContain('Ответ неизвестен');
    await act(async () => root?.unmount());
    root = undefined;
    await act(async () => {
      mount();
      await Promise.resolve();
    });
    const retry = [...container!.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Повторить тот же приказ'),
    )!;
    await act(async () => {
      retry.click();
      await Promise.resolve();
    });
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toBe(bodies[0]);
    expect(sessionStorage.getItem('warwrit:retraining:v1:owner:company-one')).toBeNull();
  });
});
