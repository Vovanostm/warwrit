// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  CompanyNicknamesDto,
  CompanySummaryDto,
  ResolveCompanyNicknameRequestDto,
} from '@warwrit/protocol';
import { NicknamePanel } from './NicknamePanel.js';

const company: CompanySummaryDto = {
  companyId: 'company-one',
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
const proposal = {
  proposalId: 'proposal-1',
  characterId: 'mora',
  characterName: 'Мора',
  textKey: 'nickname.resilient',
  reasonKey: 'nickname.reason.survived_near_death',
  proposedAt: '12',
};
const nicknames: CompanyNicknamesDto = {
  schemaVersion: 1,
  companyId: company.companyId,
  publicRevision: '7',
  pending: [proposal],
  history: [],
};

function response(status: number, value: unknown): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => value } as Response;
}

describe('nickname decisions', () => {
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
    root.render(<NicknamePanel accountId="owner" company={company} onRefresh={onRefresh} />);
    return onRefresh;
  }

  it('hides a valid empty read and presents distinct explicit choices when a proposal exists', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(200, { ...nicknames, pending: [] })),
    );
    await act(async () => {
      mount();
      await Promise.resolve();
    });
    expect(container?.querySelector('.nickname-panel')).toBeNull();

    await act(async () => root?.unmount());
    root = undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(200, nicknames)),
    );
    await act(async () => {
      mount();
      await Promise.resolve();
    });
    expect(container?.textContent).toContain('Мора: «Живучий»');
    expect(container?.textContent).toContain(
      'После победы у бойца осталось не больше четверти здоровья.',
    );
    expect(
      [...container!.querySelectorAll('button')].map((button) => button.textContent?.trim()),
    ).toEqual(['Принять', 'Отказать']);

    await act(async () => root?.unmount());
    root = undefined;
    const history = [
      {
        proposalId: 'proposal-old',
        characterId: 'mora',
        characterName: 'Мора',
        sourceEventId: 'event-1',
        textKey: 'nickname.resilient',
        reasonKey: 'nickname.reason.survived_near_death',
        proposedAt: '3',
        resolution: 'REJECTED' as const,
        decidedAt: '4',
        acceptedAt: null,
      },
    ];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => response(200, { ...nicknames, pending: [], history })),
    );
    await act(async () => {
      mount();
      await Promise.resolve();
    });
    expect(container?.textContent).toContain('Мора: «Живучий» — предложение отклонено.');
  });

  it('persists and retries the exact unknown decision, then renders server history after reload', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal(
      'crypto',
      Object.assign(Object.create(crypto), { randomUUID: () => 'command-1' }),
    );
    const bodies: string[] = [];
    let posts = 0;
    const onRefresh = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method !== 'POST') return response(200, nicknames);
        const body = String(init.body);
        expect(
          JSON.parse(
            sessionStorage.getItem('warwrit:nickname-resolution:owner:company-one') ?? 'null',
          ).request,
        ).toEqual(JSON.parse(body));
        bodies.push(body);
        posts += 1;
        if (posts === 1) throw new Error('lost response');
        const request = JSON.parse(body) as ResolveCompanyNicknameRequestDto;
        return response(200, { commandId: request.commandId, ok: true, publicRevision: '8' });
      }),
    );
    await act(async () => {
      mount(onRefresh);
      await Promise.resolve();
    });
    const refuse = [...container!.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Отказать',
    )!;
    await act(async () => {
      refuse.click();
      await Promise.resolve();
    });
    expect(container?.textContent).toContain('Ответ о выборе неизвестен');
    expect(JSON.parse(bodies[0]!).accept).toBe(false);

    await act(async () => root?.unmount());
    root = undefined;
    await act(async () => {
      mount(onRefresh);
      await Promise.resolve();
    });
    const retry = [...container!.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Повторить тот же выбор'),
    )!;
    await act(async () => {
      retry.click();
      await Promise.resolve();
    });
    expect(bodies).toHaveLength(2);
    expect(bodies[1]).toBe(bodies[0]);
    expect(sessionStorage.getItem('warwrit:nickname-resolution:owner:company-one')).toBeNull();
    expect(onRefresh).toHaveBeenCalled();
  });
});
