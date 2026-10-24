// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import type {
  CombatLabAcknowledgement,
  CombatLabAction,
  CombatLabCatalog,
  CombatLabView,
} from '@warwrit/protocol';
import { CombatLab } from './CombatLab.js';
import { createEmptyTiles } from './editor-model.js';

// jsdom has no WebGL; keep the real menu, CommandDesk and all action callbacks.
vi.mock('./BattleView.js', () => ({
  BattleView: ({ menu, children }: { menu: ReactNode; children: ReactNode }) => (
    <div>
      {menu}
      {children}
    </div>
  ),
}));

const storageKey = 'warwrit.combat-lab.session.v1';
const sessionUrl = '/api/dev/combat-lab/mounted-session';
const capability = 'mounted-fixture-capability';
const catalog: CombatLabCatalog = {
  profiles: [],
  defaultBattle: {
    version: 1,
    name: 'Mounted adapter fixture',
    seed: 1,
    map: { name: 'Fixture', tiles: createEmptyTiles() },
    units: [],
  },
};

function sessionView(): CombatLabView {
  return {
    version: 1,
    sessionId: 'mounted-session',
    battleId: 'mounted-battle',
    scenarioId: 'm0-3v3-v1',
    controlledSideId: 'human',
    viewRevision: 7,
    status: 'active',
    round: 1,
    map: { hexes: [{ q: 0, r: 0 }], blocked: [] },
    sides: [],
    units: [
      {
        id: 'actor',
        name: 'Actor',
        sideId: 'human',
        weaponId: 'sword-shield',
        position: { q: 0, r: 0 },
        status: 'active',
        guarding: false,
        initiative: 1,
        wounds: [],
        pools: {
          health: { current: 10, maximum: 10 },
          armor: { current: 0, maximum: 0 },
          stamina: { current: 10, maximum: 10 },
          morale: { current: 50, maximum: 50 },
        },
      },
    ],
    initiativeOrder: ['actor'],
    turnIndex: 0,
    activation: { id: 'activation-7', actorId: 'actor', actionPoints: { current: 4, maximum: 4 } },
    availableActions: ['wait'],
    events: [],
    omittedEventPrefix: 0,
    outcome: null,
  };
}

function deferredResponse(signal: AbortSignal) {
  let resolve!: (response: Response) => void;
  let reject!: (error: Error) => void;
  let pending = true;
  const promise = new Promise<Response>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  const detach = () => {
    pending = false;
    signal.removeEventListener('abort', abort);
  };
  const abort = () => {
    detach();
    reject(new DOMException('Fixture request aborted', 'AbortError'));
  };
  signal.addEventListener('abort', abort, { once: true });
  return {
    promise,
    get pending() {
      return pending;
    },
    resolve(body: CombatLabAcknowledgement | CombatLabView) {
      detach();
      resolve(Response.json(body));
    },
    cancel() {
      if (pending) abort();
    },
  };
}

function transportFixture(initial: CombatLabView) {
  const requests: { url: string; init: RequestInit; signal: AbortSignal }[] = [];
  const deferred: ReturnType<typeof deferredResponse>[] = [];
  const unexpected: string[] = [];
  const expected = [
    `GET /api/dev/combat-lab/catalog`,
    `GET ${sessionUrl}`,
    `POST ${sessionUrl}/actions`,
    `GET ${sessionUrl}`,
  ];
  const fetch = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${String(input)}`;
    const signal = init.signal;
    if (key !== expected[requests.length] || !signal || signal.aborted) {
      unexpected.push(key);
      return Promise.reject(new Error(`Unexpected fixture request: ${key}`));
    }
    requests.push({ url: String(input), init, signal });
    if (requests.length === 1) return Promise.resolve(Response.json(catalog));
    if (requests.length === 2) return Promise.resolve(Response.json(initial));
    const response = deferredResponse(signal);
    deferred.push(response);
    return response.promise;
  });
  return { fetch, requests, deferred, unexpected };
}

function waitButton(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector('button[aria-label="Завершить ход"]');
  if (!(button instanceof HTMLButtonElement)) throw new Error('Wait command is not mounted');
  return button;
}

function pendingFeedback(container: HTMLElement) {
  return container.querySelector('.battle-pending-status')?.textContent ?? null;
}

it('submits one real wait command and keeps it pending through acknowledgement and refresh', async () => {
  const initial = sessionView();
  const transport = transportFixture(initial);
  const savedStorage = sessionStorage.getItem(storageKey);
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] });
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('fetch', transport.fetch);
  sessionStorage.setItem(storageKey, JSON.stringify({ id: initial.sessionId, capability }));
  try {
    // Deliver jsdom's zero-delay storage event before mounting; never advance the poll clock.
    vi.advanceTimersByTime(0);
    await act(async () => {
      root.render(<CombatLab />);
    });
    expect(waitButton(container).getAttribute('aria-disabled')).toBe('false');
    expect(new Headers(transport.requests[1]!.init.headers).get('x-combat-lab-capability')).toBe(
      capability,
    );
    await act(async () => {
      waitButton(container).click();
    });

    const post = transport.requests[2]!;
    const action: CombatLabAction = JSON.parse(String(post.init.body));
    expect({
      url: post.url,
      method: post.init.method,
      headers: Object.fromEntries(new Headers(post.init.headers)),
      aborted: post.signal.aborted,
      action,
    }).toEqual({
      url: `${sessionUrl}/actions`,
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-combat-lab-capability': capability },
      aborted: false,
      action: {
        version: 1,
        sessionId: 'mounted-session',
        battleId: 'mounted-battle',
        requestId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
        ),
        expectedViewRevision: 7,
        activationId: 'activation-7',
        actorId: 'actor',
        intent: { type: 'wait' },
      },
    });
    await act(async () => {
      waitButton(container).click();
    });
    expect({
      calls: transport.fetch.mock.calls.length,
      disabled: waitButton(container).getAttribute('aria-disabled'),
      feedback: pendingFeedback(container),
    }).toEqual({
      calls: 3,
      disabled: 'true',
      feedback: 'Ожидается ответ: Завершение хода.',
    });

    await act(async () => {
      transport.deferred[0]!.resolve({
        version: 1,
        sessionId: 'mounted-session',
        battleId: 'mounted-battle',
        requestId: action.requestId,
        status: 'accepted',
        viewRevision: 8,
      });
    });
    expect({
      calls: transport.fetch.mock.calls.length,
      capability: new Headers(transport.requests[3]!.init.headers).get('x-combat-lab-capability'),
      sameSignal: transport.requests[3]!.signal === post.signal,
      pending: transport.deferred[1]!.pending,
      feedback: pendingFeedback(container),
    }).toEqual({
      calls: 4,
      capability,
      sameSignal: true,
      pending: true,
      feedback: 'Ожидается ответ: Завершение хода.',
    });
    await act(async () => {
      transport.deferred[1]!.resolve({ ...initial, viewRevision: 8, availableActions: ['defend'] });
    });
    expect({
      feedback: pendingFeedback(container),
      waitDisabled: waitButton(container).getAttribute('aria-disabled'),
      defendDisabled: container
        .querySelector('button[aria-label="Защищаться"]')
        ?.getAttribute('aria-disabled'),
      calls: transport.fetch.mock.calls.length,
    }).toEqual({
      feedback: null,
      waitDisabled: 'true',
      defendDisabled: 'false',
      calls: 4,
    });
  } finally {
    try {
      await act(async () => {
        root.unmount();
        for (const request of transport.deferred) request.cancel();
        await Promise.allSettled(transport.deferred.map((request) => request.promise));
      });
      expect({
        aborted: transport.requests.map(({ signal }) => signal.aborted),
        pending: transport.deferred.filter((request) => request.pending).length,
        timers: vi.getTimerCount(),
        unexpected: transport.unexpected,
        dom: container.childElementCount,
      }).toEqual({
        aborted: transport.requests.map(() => true),
        pending: 0,
        timers: 0,
        unexpected: [],
        dom: 0,
      });
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
      if (savedStorage === null) sessionStorage.removeItem(storageKey);
      else sessionStorage.setItem(storageKey, savedStorage);
      container.remove();
    }
  }
});
