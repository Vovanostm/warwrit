// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { OrdinaryContractBoardDto, OrdinaryContractCommandDto } from '@warwrit/protocol';
import { ContractBoard } from './ContractBoard.js';
import { ordinaryContractAttemptStorageKey } from './ordinary-contract-attempt-storage.js';

const scope = { accountId: 'account-a', companyId: 'company-a' };
const commandId = '11111111-1111-4111-8111-111111111111';
const board: OrdinaryContractBoardDto = {
  schemaVersion: 1,
  contracts: [
    {
      instanceId: 'ci.m1.road-tracks.01',
      template: 'INVESTIGATE',
      issuerRoleId: 'village-provisioner',
      issuerLocation: { siteId: 'bereznyak', areaId: 'bereznyak-green' },
      rewardQ: '40000000',
      revision: '1',
      yourRole: 'OWNER',
      helperSlot: 'AVAILABLE',
      state: 'ACTIVE',
      completedByYou: false,
      canAccept: false,
      canHelp: false,
      yourCustody: [],
      steps: [
        {
          stepId: 'inspect-bank',
          action: 'INSPECT',
          location: { siteId: 'bereznyak', areaId: 'bereznyak-green' },
          doneByYou: false,
          blocker: null,
          completes: false,
        },
      ],
    },
  ],
};

function jsonResponse(status: number, value: unknown): Response {
  return { status, ok: status >= 200 && status < 300, json: async () => value } as Response;
}

function renderBoard(root: Root, attemptScope = scope) {
  root.render(
    createElement(ContractBoard, {
      scope: attemptScope,
      siteId: 'bereznyak',
      refreshKey: 0,
      visit: null,
      canVisit: true,
      onVisitIssuer: () => undefined,
      onJournal: () => undefined,
      onUnauthorized: () => undefined,
      onRewardPaid: () => undefined,
    }),
  );
}

describe('ordinary contract command recovery', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = undefined;
    container?.remove();
    container = undefined;
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it('writes before send, keeps a lost committed response across reload, then clears the matching receipt', async () => {
    let storedBodyAtPost: string | null = null;
    let firstBody: string | undefined;
    let postCount = 0;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'POST') return jsonResponse(200, board);
      postCount += 1;
      const body = String(init.body);
      if (postCount === 1) {
        firstBody = body;
        storedBodyAtPost = sessionStorage.getItem(ordinaryContractAttemptStorageKey(scope));
        throw new Error('response lost after server commit');
      }
      expect(body).toBe(firstBody);
      const command = JSON.parse(body) as OrdinaryContractCommandDto;
      return jsonResponse(200, {
        schemaVersion: 1,
        commandId: command.commandId,
        ok: true,
        revision: '2',
        rewardQ: null,
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('crypto', { ...crypto, randomUUID: () => commandId });

    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      renderBoard(root!);
      await Promise.resolve();
    });
    const action = container.querySelector<HTMLButtonElement>('.gear-action');
    expect(action).not.toBeNull();
    await act(async () => {
      action!.click();
      await Promise.resolve();
    });
    expect(storedBodyAtPost).not.toBeNull();
    expect(firstBody).toBe(JSON.parse(storedBodyAtPost!).body);
    expect(container.textContent).toContain('результат неизвестен');

    await act(async () => root!.unmount());
    root = createRoot(container);
    await act(async () => {
      renderBoard(root!);
      await Promise.resolve();
    });
    expect(container.textContent).toContain('Повтор');
    const retry = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Повторить'),
    );
    expect(retry).toBeDefined();
    await act(async () => {
      retry!.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(postCount).toBe(2);
    expect(sessionStorage.getItem(ordinaryContractAttemptStorageKey(scope))).toBeNull();
  });

  it('does not let a late response from an unmounted scope clear its pending attempt', async () => {
    let resolvePost: ((response: Response) => void) | undefined;
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method !== 'POST') return jsonResponse(200, board);
      return await new Promise<Response>((resolve) => {
        resolvePost = resolve;
      });
    });
    vi.stubGlobal('fetch', fetchMock);
    vi.stubGlobal('crypto', { ...crypto, randomUUID: () => commandId });
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      renderBoard(root!);
      await Promise.resolve();
    });
    await act(async () => {
      container!.querySelector<HTMLButtonElement>('.gear-action')!.click();
      await Promise.resolve();
    });
    const key = ordinaryContractAttemptStorageKey(scope);
    const beforeLateResponse = sessionStorage.getItem(key);
    expect(beforeLateResponse).not.toBeNull();
    await act(async () => root!.unmount());
    root = undefined;
    const saved = JSON.parse(beforeLateResponse!) as { body: string };
    const command = JSON.parse(saved.body) as OrdinaryContractCommandDto;
    await act(async () => {
      resolvePost!(
        jsonResponse(200, {
          schemaVersion: 1,
          commandId: command.commandId,
          ok: true,
          revision: '2',
          rewardQ: null,
        }),
      );
      await Promise.resolve();
    });
    expect(sessionStorage.getItem(key)).toBe(beforeLateResponse);
  });
});
