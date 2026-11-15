// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WORLD_EXPECTED_COMPANY_ID_HEADER, type CompanySummaryDto } from '@warwrit/protocol';
import { PerkSelectionPanel } from './PerkSelectionPanel.js';

const summary: CompanySummaryDto = {
  companyId: 'company-a',
  revision: '17',
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
      perkChoices: [
        {
          perkId: 'blades-25-a',
          skillId: 'blades',
          milestone: 25,
          effect: { attribute: 'accuracy', value: 3 },
        },
        {
          perkId: 'blades-25-b',
          skillId: 'blades',
          milestone: 25,
          effect: { attribute: 'initiative', value: 3 },
        },
      ],
    },
  ],
};

function response(status: number, value: unknown): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => value } as Response;
}

describe('first perk selection', () => {
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

  function mount(company = summary, onRefresh = vi.fn()) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    root.render(<PerkSelectionPanel accountId="owner" company={company} onRefresh={onRefresh} />);
    return onRefresh;
  }

  it('offers the server-supplied choices and sends the explicit selection', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('crypto', Object.assign(Object.create(crypto), { randomUUID: () => 'choose-1' }));
    let body = '';
    let headers: HeadersInit | undefined;
    const onRefresh = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        body = String(init?.body);
        headers = init?.headers;
        const command = JSON.parse(body) as { commandId: string };
        return response(200, { commandId: command.commandId, ok: true, publicRevision: '18' });
      }),
    );
    await act(async () => {
      mount(summary, onRefresh);
    });
    expect(container?.textContent).toContain(
      'Выберите специализацию владения клинком для бойца «Мора».',
    );
    expect(
      [...container!.querySelectorAll('button')].map((button) => button.textContent?.trim()),
    ).toEqual(['Точность +3', 'Инициатива +3']);
    await act(async () => {
      [...container!.querySelectorAll('button')]
        .find((button) => button.textContent?.trim() === 'Точность +3')!
        .click();
      await Promise.resolve();
    });
    expect(JSON.parse(body)).toEqual({
      schemaVersion: 2,
      commandId: 'choose-1',
      expectedPublicRevision: '17',
      type: 'ChoosePerk',
      payload: { characterId: 'mora', perkId: 'blades-25-a', milestone: 25 },
    });
    expect((headers as Record<string, string>)[WORLD_EXPECTED_COMPANY_ID_HEADER]).toBe('company-a');
    expect(onRefresh).toHaveBeenCalled();
  });

  it('persists and retries the exact unknown selection', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'crypto',
      Object.assign(Object.create(crypto), { randomUUID: () => 'choose-lost' }),
    );
    const bodies: string[] = [];
    let calls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const body = String(init?.body);
        expect(
          JSON.parse(sessionStorage.getItem('warwrit:perk-selection:v1:owner:company-a') ?? 'null')
            .body,
        ).toBe(body);
        bodies.push(body);
        calls += 1;
        if (calls === 1) throw new Error('reply lost');
        const command = JSON.parse(body) as { commandId: string };
        return response(200, { commandId: command.commandId, ok: true, publicRevision: '18' });
      }),
    );
    await act(async () => {
      mount();
    });
    await act(async () => {
      [...container!.querySelectorAll('button')][1]!.click();
      await Promise.resolve();
    });
    expect(container?.textContent).toContain('Ответ на выбор неизвестен');
    await act(async () => root?.unmount());
    root = undefined;
    await act(async () => {
      mount();
    });
    await act(async () => {
      [...container!.querySelectorAll('button')]
        .find((button) => button.textContent?.includes('Повторить'))!
        .click();
      await Promise.resolve();
    });
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toBe(bodies[0]);
    expect(sessionStorage.getItem('warwrit:perk-selection:v1:owner:company-a')).toBeNull();
  });

  it('keeps historical summaries without choice fields readable', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const oldSummary: CompanySummaryDto = {
      ...summary,
      characters: summary.characters.map(({ perkChoices: _choices, ...character }) => character),
    };
    await act(async () => {
      mount(oldSummary);
    });
    expect(container?.querySelector('.perk-selection-panel')).toBeNull();
  });
});
