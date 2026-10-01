import { expect, it, vi } from 'vitest';
import { createElement, isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';

import { WorldTravel } from './WorldTravel.js';
import {
  attemptStorageKey,
  classifyWorldTravelPost,
  clearWorldTravelReturnWindow,
  clearWorldTravelScope,
  createWorldTravelPreviewRequest,
  createWorldTravelAttempt,
  executeWorldTravelAttempt,
  onTimeWorldTravelReturnWindow,
  isWorldTravelOperationCurrent,
  isWorldTravelReturnWindowOpen,
  readWorldPartyResponse,
  readWorldTravelPreview,
  readWorldTravelAttempt,
  readWorldTravelResponse,
  returnWindowStorageKey,
  saveWorldTravelAttempt,
  saveWorldTravelReturnWindow,
  WorldTravelRefreshError,
  worldTravelRejectionMessage,
  worldPartyReadHeaders,
  type WorldTravelStorage,
} from './world-travel-attempt.js';

const scope = { accountId: 'account-1', companyId: 'company-1' } as const;

function partyResponse(
  input: {
    readonly worldTick?: string;
    readonly publicRevision?: string;
    readonly location?: string;
    readonly routeEpoch?: string;
    readonly canArrive?: boolean;
    readonly dueTick?: string;
  } = {},
) {
  return {
    schemaVersion: 1,
    worldTick: input.worldTick ?? '1000',
    publicRevision: input.publicRevision ?? '7',
    party: {
      partyId: 'party-1',
      location: input.location ?? 'severny-dvor',
      memberIds: ['leader-1'],
      routeEpoch: input.routeEpoch ?? '0',
    },
    availableDepartures:
      input.canArrive !== undefined
        ? []
        : input.location === 'kamenny-brod'
          ? [
              {
                purpose: 'RETURN' as const,
                edgeIds: ['kamenny-brod-severny-dvor'],
                fromSiteId: 'kamenny-brod',
                toSiteId: 'severny-dvor',
              },
              {
                purpose: 'NEW' as const,
                edgeIds: ['kamenny-brod-bereznyak'],
                fromSiteId: 'kamenny-brod',
                toSiteId: 'bereznyak',
              },
            ]
          : [
              {
                purpose: 'NEW' as const,
                edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
                fromSiteId: input.location ?? 'severny-dvor',
                toSiteId: 'bereznyak',
              },
            ],
    route:
      input.canArrive === undefined
        ? null
        : {
            routeEpoch: input.routeEpoch ?? '1',
            segmentId: 'route-1',
            edgeIds: ['kamenny-brod-severny-dvor'],
            regionVersion: 'region-1',
            profileId: 'safe-alpha-1',
            startedAt: '1000',
            dueTick: input.dueTick ?? '1010',
            remainingTicks: input.canArrive ? '0' : '10',
            canArrive: input.canArrive,
          },
  };
}

function success(commandId: string) {
  return {
    ...partyResponse({ location: 'kamenny-brod', routeEpoch: '1', worldTick: '1010' }),
    commandId,
  };
}

function v2Progress() {
  return {
    schemaVersion: 2,
    worldTick: '1011',
    publicRevision: '8',
    party: {
      partyId: 'party-1',
      location: 'kamenny-brod',
      memberIds: ['leader-1'],
      routeEpoch: '1',
    },
    availableDepartures: [],
    execution: {
      routeExecutionId: 'execution-1',
      purpose: 'NEW',
      regionVersion: 'region-1',
      edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
      phase: 'AT_BOUNDARY',
      nextEdgeIndex: 1,
      currentSiteId: 'kamenny-brod',
      activeSegment: null,
    },
  } as const;
}

function v2FirstHuntOffer() {
  return readWorldPartyResponse({
    schemaVersion: 2,
    worldTick: '900',
    publicRevision: '4',
    party: {
      partyId: 'party-1',
      location: 'tikhaya-gat',
      memberIds: ['leader-1'],
      routeEpoch: '3',
    },
    availableDepartures: [
      {
        purpose: 'NEW',
        edgeIds: ['tikhaya-gat-staraya-melnitsa'],
        fromSiteId: 'tikhaya-gat',
        toSiteId: 'staraya-melnitsa',
      },
    ],
    execution: null,
  })!;
}

function successV2(commandId: string) {
  return { ...v2Progress(), commandId };
}

function arrivalState(input: {
  readonly tick: string;
  readonly canArrive: boolean;
  readonly dueTick?: string;
}) {
  return readWorldPartyResponse(
    partyResponse({
      worldTick: input.tick,
      location: 'severny-dvor',
      routeEpoch: '1',
      canArrive: input.canArrive,
      ...(input.dueTick === undefined ? {} : { dueTick: input.dueTick }),
    }),
  )!;
}

function findButtonWithText(
  node: ReactNode,
  text: string,
):
  | {
      readonly props: {
        readonly disabled?: boolean;
        readonly onClick?: () => void;
      };
    }
  | undefined {
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findButtonWithText(child, text);
      if (match) return match;
    }
    return undefined;
  }
  if (!isValidElement(node)) return undefined;
  const props = node.props as { readonly children?: ReactNode } & {
    readonly disabled?: boolean;
    readonly onClick?: () => void;
  };
  if (node.type === 'button' && renderText(props.children).includes(text)) return { props };
  return findButtonWithText(props.children, text);
}

function renderText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(renderText).join('');
  if (!isValidElement(node)) return '';
  return renderText((node.props as { readonly children?: ReactNode }).children);
}

it('offers an accessible refresh until the server reports canArrive', () => {
  const props = {
    current: arrivalState({ tick: '1009', canArrive: false }),
    returnWindowOpen: false,
    busy: false,
    pendingAttempt: false,
    onTravel: vi.fn(),
    onRetry: vi.fn(),
    onRefresh: vi.fn(),
  };
  const waiting = renderToStaticMarkup(createElement(WorldTravel, props));
  expect(waiting).toContain('aria-label="Путешествие компании"');
  expect(waiting).toContain('Проверить готовность к прибытию');
  expect(waiting).toContain(
    '<button class="primary-action button-action" type="button" disabled="">Подтвердить прибытие',
  );

  const ready = renderToStaticMarkup(
    createElement(WorldTravel, {
      ...props,
      current: arrivalState({ tick: '1010', canArrive: true }),
    }),
  );
  expect(ready).toContain(
    '<button class="primary-action button-action" type="button">Подтвердить прибытие',
  );
  expect(ready).not.toContain('Проверить готовность к прибытию');
});

it('uses the exact server-offered multi-edge itinerary for the player choice', () => {
  const current = readWorldPartyResponse(partyResponse());
  expect(current?.schemaVersion).toBe(1);
  if (!current || current.schemaVersion !== 1) throw new Error('Expected an idle V1 world');
  const offered = current.availableDepartures.find(
    (departure) => departure.toSiteId === 'bereznyak' && departure.edgeIds.length === 2,
  );
  expect(offered).toEqual({
    purpose: 'NEW',
    edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
    fromSiteId: 'severny-dvor',
    toSiteId: 'bereznyak',
  });
  if (!offered) throw new Error('Expected the server-offered multi-edge itinerary');

  const attempt = createWorldTravelAttempt({
    scope,
    current,
    commandId: 'offered-route',
    action: { kind: 'DEPART', departure: offered },
  });
  expect(JSON.parse(attempt.body)).toMatchObject({
    schemaVersion: 2,
    purpose: 'NEW',
    edgeIds: offered.edgeIds,
  });
  expect(() =>
    createWorldTravelAttempt({
      scope,
      current,
      commandId: 'invented-route',
      action: {
        kind: 'DEPART',
        departure: { ...offered, edgeIds: [...offered.edgeIds].reverse() },
      },
    }),
  ).toThrow('Departure is not offered by the current world state');

  const markup = renderToStaticMarkup(
    createElement(WorldTravel, {
      current,
      returnWindowOpen: false,
      busy: false,
      pendingAttempt: false,
      onTravel: vi.fn(),
      onRetry: vi.fn(),
      onRefresh: vi.fn(),
    }),
  );
  expect(markup).toContain('Отправиться в Березняк');
  expect(markup).toContain('2 перехода');
});

it('previews and offers an authorized V2 dangerous route as a V2 departure', async () => {
  const current = v2FirstHuntOffer();
  expect(current.schemaVersion).toBe(2);
  if (current.schemaVersion !== 2) throw new Error('Expected a V2 world offer');
  const departure = current.availableDepartures[0]!;
  const onTravel = vi.fn();
  const props = {
    current,
    returnWindowOpen: false,
    busy: false,
    pendingAttempt: false,
    onTravel,
    onRetry: vi.fn(),
    onRefresh: vi.fn(),
  };
  const button = findButtonWithText(WorldTravel(props), 'Отправиться в Старая мельница');
  expect(button).toBeDefined();
  expect(button?.props.disabled).toBe(false);
  const confirm = vi.fn(() => true);
  const alert = vi.fn();
  const fetch = vi.fn(async (_url: string, init: RequestInit) => ({
    ok: true,
    json: async () => ({
      schemaVersion: 1,
      publicRevision: '4',
      routeEpoch: '3',
      atTick: '900',
      purpose: 'NEW',
      edgeIds: departure.edgeIds,
      knownShortage: true,
      assumptions: ['SERVER_CLOCK', 'CURRENT_COMPANY_OWNED_PARTY_STOCK'],
      requiredStockUnits: '2',
      availableStockUnits: '1',
    }),
    request: init,
  }));
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('window', { confirm, alert });
  try {
    await button?.props.onClick?.();
    expect(fetch).toHaveBeenCalledWith(
      '/api/world/travel/preview',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          schemaVersion: 1,
          purpose: 'NEW',
          edgeIds: departure.edgeIds,
        }),
      }),
    );
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Известная нехватка'));
    expect(onTravel).toHaveBeenCalledWith({ kind: 'DEPART', departure });
  } finally {
    vi.unstubAllGlobals();
  }

  const attempt = createWorldTravelAttempt({
    scope,
    current,
    commandId: 'first-hunt-departure',
    action: { kind: 'DEPART', departure },
  });
  expect(attempt.request).toEqual({
    schemaVersion: 2,
    commandId: 'first-hunt-departure',
    expectedPublicRevision: '4',
    expectedRouteEpoch: '3',
    purpose: 'NEW',
    edgeIds: departure.edgeIds,
  });
  expect(JSON.parse(attempt.body)).toEqual(attempt.request);

  const storage = new MemoryStorage();
  saveWorldTravelAttempt(storage, attempt);
  const restored = readWorldTravelAttempt(storage, scope);
  expect(restored.kind).toBe('FOUND');
  if (restored.kind !== 'FOUND') throw new Error('Expected the V2 attempt to be retained');
  const postedBodies: string[] = [];
  const execute = () =>
    executeWorldTravelAttempt({
      attempt: restored.attempt,
      signal: new AbortController().signal,
      isCurrent: () => true,
      transport: {
        post: async (body) => {
          postedBodies.push(body);
          if (postedBodies.length === 1) throw new Error('connection lost');
          return { status: 200, body: successV2(attempt.request.commandId) };
        },
        refresh: async () => readWorldPartyResponse(v2Progress())!,
      },
    });
  expect((await execute()).kind).toBe('UNKNOWN');
  expect(await execute()).toMatchObject({
    kind: 'ACCEPTED',
    receipt: { schemaVersion: 2, commandId: 'first-hunt-departure' },
  });
  expect(postedBodies).toEqual([attempt.body, attempt.body]);

  expect(() =>
    createWorldTravelAttempt({
      scope,
      current: readWorldPartyResponse(v2Progress())!,
      commandId: 'blocked-during-transit',
      action: { kind: 'DEPART', departure },
    }),
  ).toThrow('Departure is not offered by the current world state');
});

it('shows and selects an authoritative RETURN offer without the legacy V1 return window', async () => {
  const current = readWorldPartyResponse(partyResponse({ location: 'kamenny-brod' }));
  expect(current?.schemaVersion).toBe(1);
  if (!current || current.schemaVersion !== 1) throw new Error('Expected an idle V1 world');
  const departure = current.availableDepartures.find((offer) => offer.purpose === 'RETURN');
  expect(departure).toEqual({
    purpose: 'RETURN',
    edgeIds: ['kamenny-brod-severny-dvor'],
    fromSiteId: 'kamenny-brod',
    toSiteId: 'severny-dvor',
  });
  if (!departure) throw new Error('Expected the server-offered RETURN route');
  const onTravel = vi.fn();
  const button = findButtonWithText(
    WorldTravel({
      current,
      returnWindowOpen: false,
      busy: false,
      pendingAttempt: false,
      onTravel,
      onRetry: vi.fn(),
      onRefresh: vi.fn(),
    }),
    'Вернуться в Северный Двор',
  );
  expect(button).toBeDefined();
  expect(button?.props.disabled).toBe(false);
  const confirm = vi.fn(() => true);
  const alert = vi.fn();
  const fetch = vi.fn(async (_url: string, init: RequestInit) => ({
    ok: true,
    json: async () => ({
      schemaVersion: 1,
      publicRevision: '7',
      routeEpoch: '0',
      atTick: '1000',
      purpose: 'RETURN',
      edgeIds: departure.edgeIds,
      knownShortage: false,
      assumptions: [
        'SERVER_CLOCK',
        'CURRENT_COMPANY_OWNED_PARTY_STOCK',
        'EXACT_FRACTIONAL_FOOD_CARRY',
      ],
      requiredStockUnits: '2',
      availableStockUnits: '4',
    }),
    request: init,
  }));
  vi.stubGlobal('fetch', fetch);
  vi.stubGlobal('window', { confirm, alert });
  try {
    await button?.props.onClick?.();
    expect(fetch).toHaveBeenCalledWith(
      '/api/world/travel/preview',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          schemaVersion: 1,
          purpose: 'RETURN',
          edgeIds: departure.edgeIds,
        }),
      }),
    );
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Требуется: 2'));
    expect(confirm).toHaveBeenCalledWith(expect.stringContaining('Доступно: 4'));
    expect(onTravel).toHaveBeenCalledWith({ kind: 'DEPART', departure });
  } finally {
    vi.unstubAllGlobals();
  }
  expect(
    createWorldTravelAttempt({
      scope,
      current,
      commandId: 'authoritative-return',
      action: { kind: 'DEPART', departure },
    }).request.schemaVersion,
  ).toBe(2);
});

it('builds and validates exact supply preview responses', () => {
  const departure = {
    purpose: 'NEW' as const,
    edgeIds: ['tikhaya-gat-staraya-melnitsa'],
    fromSiteId: 'tikhaya-gat',
    toSiteId: 'staraya-melnitsa',
  };
  expect(createWorldTravelPreviewRequest(departure)).toEqual({
    schemaVersion: 1,
    purpose: 'NEW',
    edgeIds: ['tikhaya-gat-staraya-melnitsa'],
  });
  const response = {
    schemaVersion: 1,
    publicRevision: '7',
    routeEpoch: '3',
    atTick: '240',
    purpose: 'NEW',
    edgeIds: departure.edgeIds,
    knownShortage: true,
    assumptions: ['SERVER_CLOCK', 'EXACT_FRACTIONAL_FOOD_CARRY'],
    requiredStockUnits: '2',
    availableStockUnits: '1',
  } as const;
  expect(readWorldTravelPreview(response)).toEqual(response);
  expect(readWorldTravelPreview({ ...response, extra: true })).toBeUndefined();
  expect(readWorldTravelPreview({ ...response, requiredStockUnits: '-1' })).toBeUndefined();
});

it('rejects a world refresh after the shared session cookie switches from A to B', async () => {
  const current = readWorldPartyResponse(partyResponse())!;
  const attempt = createWorldTravelAttempt({
    scope,
    current,
    commandId: 'company-a-attempt',
    action: { kind: 'DEPART', departure: current.availableDepartures![0]! },
  });
  const switchedCookieCompanyId = 'company-b';
  const headers = worldPartyReadHeaders(scope);
  expect(headers).toEqual({ [WORLD_EXPECTED_COMPANY_ID_HEADER]: 'company-1' });

  const result = await executeWorldTravelAttempt({
    attempt,
    signal: new AbortController().signal,
    isCurrent: () => true,
    transport: {
      post: async () => ({ status: 200, body: success(attempt.request.commandId) }),
      refresh: async () => {
        if (headers[WORLD_EXPECTED_COMPANY_ID_HEADER] !== switchedCookieCompanyId)
          throw new WorldTravelRefreshError('FORBIDDEN');
        return readWorldPartyResponse(partyResponse({ location: 'kamenny-brod' }))!;
      },
    },
  });

  expect(result).toEqual({ kind: 'FORBIDDEN' });
});

it('parses public V2 itinerary progress and renders it read-only with explicit refresh', () => {
  const response = {
    schemaVersion: 2,
    worldTick: '1011',
    publicRevision: '8',
    party: {
      partyId: 'party-1',
      location: 'kamenny-brod',
      memberIds: ['leader-1'],
      routeEpoch: '1',
    },
    availableDepartures: [],
    execution: {
      routeExecutionId: 'execution-1',
      purpose: 'NEW',
      regionVersion: 'region-1',
      edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
      phase: 'AT_BOUNDARY',
      nextEdgeIndex: 1,
      currentSiteId: 'kamenny-brod',
      activeSegment: null,
    },
  } as const;
  const current = readWorldPartyResponse(response);
  expect(current).toEqual(response);
  expect(readWorldPartyResponse({ ...response, acceptedByAccountId: 'private-account' })).toBe(
    undefined,
  );
  expect(
    readWorldPartyResponse({
      ...response,
      party: { ...response.party, acceptedByAccountId: 'private-account' },
    }),
  ).toBeUndefined();
  expect(readWorldPartyResponse({ ...response, schemaVersion: 3 })).toBeUndefined();
  expect(
    readWorldPartyResponse({
      ...response,
      execution: { ...response.execution, phase: 'COMPLETE', activeSegment: null },
    }),
  ).toBeUndefined();
  if (!current || current.schemaVersion !== 2) throw new Error('Expected V2 itinerary');
  expect(() =>
    createWorldTravelAttempt({
      scope,
      current,
      commandId: 'command-v2',
      action: { kind: 'ARRIVE' },
    }),
  ).toThrow('Arrival requires a V1 party route');

  const markup = renderToStaticMarkup(
    createElement(WorldTravel, {
      current,
      returnWindowOpen: false,
      busy: false,
      pendingAttempt: false,
      onTravel: vi.fn(),
      onRetry: vi.fn(),
      onRefresh: vi.fn(),
    }),
  );
  expect(markup).toContain('завершено 1');
  expect(markup).toContain('следующий переход выполняется сервером');
  expect(markup).toContain('Обновить состояние маршрута');
  expect(markup).not.toContain('Отправиться к Каменному Броду');
  expect(markup).not.toContain('Подтвердить прибытие');

  const idleAfterCompletion = readWorldPartyResponse(
    partyResponse({ location: 'bereznyak', routeEpoch: '1', worldTick: '1200' }),
  );
  expect(idleAfterCompletion?.schemaVersion).toBe(1);
  expect(idleAfterCompletion?.availableDepartures).toHaveLength(1);
  if (!idleAfterCompletion || idleAfterCompletion.schemaVersion !== 1)
    throw new Error('Expected the idle V1 projection after V2 completion');
  const nextAttempt = createWorldTravelAttempt({
    scope,
    current: idleAfterCompletion,
    commandId: 'after-completion',
    action: { kind: 'DEPART', departure: idleAfterCompletion.availableDepartures![0]! },
  });
  expect(nextAttempt.request.schemaVersion).toBe(2);
});

function rejection(commandId: string | null, code: string, schemaVersion: 1 | 2 = 1) {
  return {
    schemaVersion,
    commandId,
    ok: false,
    publicRevision: '8',
    code,
  };
}

class MemoryStorage implements WorldTravelStorage {
  readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

it('keeps the scoped POST body immutable and retries it exactly after an unknown outcome', async () => {
  const storage = new MemoryStorage();
  const current = readWorldPartyResponse(partyResponse());
  expect(current).toBeDefined();
  const edgeIds = ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'];
  const attempt = createWorldTravelAttempt({
    scope,
    current: current!,
    commandId: 'command-1',
    action: {
      kind: 'DEPART',
      departure: {
        purpose: 'NEW',
        edgeIds,
        fromSiteId: 'severny-dvor',
        toSiteId: 'bereznyak',
      },
    },
  });
  const originalBody = attempt.body;
  edgeIds.push('tampered');
  expect(Object.isFrozen(attempt)).toBe(true);
  expect(attempt.body).toBe(originalBody);
  expect(JSON.parse(originalBody)).toMatchObject({
    schemaVersion: 2,
    purpose: 'NEW',
    edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
  });
  saveWorldTravelAttempt(storage, attempt);
  const restored = readWorldTravelAttempt(storage, scope);
  expect(restored).toMatchObject({
    kind: 'FOUND',
    attempt: { body: originalBody },
  });
  if (restored.kind !== 'FOUND') throw new Error('Expected a restored attempt');
  expect(readWorldTravelAttempt(storage, { ...scope, accountId: 'account-2' }).kind).toBe('EMPTY');
  expect(readWorldTravelAttempt(storage, { ...scope, companyId: 'company-2' }).kind).toBe('EMPTY');
  expect([...storage.values.keys()]).toEqual([attemptStorageKey(scope)]);
  const otherAccountScope = { accountId: 'account-2', companyId: 'company-2' };
  expect(readWorldTravelAttempt(storage, otherAccountScope).kind).toBe('EMPTY');
  storage.setItem(
    attemptStorageKey(otherAccountScope),
    JSON.stringify({ version: 1, body: originalBody }),
  );
  expect(readWorldTravelAttempt(storage, otherAccountScope).kind).toBe('INVALID');
  expect(storage.getItem(attemptStorageKey(otherAccountScope))).toBeNull();

  const posts: Array<{ readonly body: string; readonly headers: Record<string, string> }> = [];
  const refreshed = readWorldPartyResponse(v2Progress());
  const execute = () =>
    executeWorldTravelAttempt({
      attempt: restored.attempt,
      signal: new AbortController().signal,
      isCurrent: () => true,
      transport: {
        post: vi.fn(async (body, _signal, persistedAttempt) => {
          posts.push({
            body,
            headers: {
              [WORLD_EXPECTED_COMPANY_ID_HEADER]: persistedAttempt.scope.companyId,
            },
          });
          if (posts.length === 1) throw new Error('connection lost');
          return { status: 200, body: successV2('command-1') };
        }),
        refresh: vi.fn(async () => refreshed!),
      },
    });
  expect((await execute()).kind).toBe('UNKNOWN');
  const retry = await execute();
  expect(posts).toEqual([
    {
      body: originalBody,
      headers: { [WORLD_EXPECTED_COMPANY_ID_HEADER]: scope.companyId },
    },
    {
      body: originalBody,
      headers: { [WORLD_EXPECTED_COMPANY_ID_HEADER]: scope.companyId },
    },
  ]);
  expect(retry).toMatchObject({
    kind: 'ACCEPTED',
    receipt: { schemaVersion: 2, commandId: 'command-1' },
    current: { schemaVersion: 2, worldTick: '1011', party: { location: 'kamenny-brod' } },
  });
  const completed = await executeWorldTravelAttempt({
    attempt: restored.attempt,
    signal: new AbortController().signal,
    isCurrent: () => true,
    transport: {
      post: async () => ({ status: 200, body: successV2('command-1') }),
      refresh: async () =>
        readWorldPartyResponse(partyResponse({ location: 'bereznyak', worldTick: '1012' }))!,
    },
  });
  expect(completed).toMatchObject({
    kind: 'ACCEPTED',
    current: { schemaVersion: 1, route: null, party: { location: 'bereznyak' } },
  });
  const otherScope = { accountId: 'account-2', companyId: 'company-2' };
  saveWorldTravelAttempt(storage, { ...attempt, scope: otherScope });
  clearWorldTravelScope(storage, scope);
  expect(readWorldTravelAttempt(storage, scope).kind).toBe('EMPTY');
  expect(readWorldTravelAttempt(storage, otherScope).kind).toBe('FOUND');
});

it('restores a valid persisted V1 departure attempt without changing its original body', () => {
  const storage = new MemoryStorage();
  const oldRequest = {
    schemaVersion: 1,
    commandId: 'legacy-departure',
    expectedPublicRevision: '7',
    expectedRouteEpoch: '0',
    action: { kind: 'DEPART', edgeIds: ['kamenny-brod-severny-dvor'] },
  } as const;
  const body = JSON.stringify(oldRequest);
  storage.setItem(
    attemptStorageKey(scope),
    JSON.stringify({ version: 1, accountId: scope.accountId, companyId: scope.companyId, body }),
  );

  const restored = readWorldTravelAttempt(storage, scope);
  expect(restored).toMatchObject({
    kind: 'FOUND',
    attempt: { body, request: { schemaVersion: 1, commandId: 'legacy-departure' } },
  });
});

it('rejects malformed command IDs in retained V2 attempts and matching receipts', () => {
  const storage = new MemoryStorage();
  for (const commandId of ['', 'command-1 ']) {
    const body = JSON.stringify({
      schemaVersion: 2,
      commandId,
      expectedPublicRevision: '7',
      expectedRouteEpoch: '0',
      purpose: 'NEW',
      edgeIds: ['kamenny-brod-severny-dvor'],
    });
    storage.setItem(
      attemptStorageKey(scope),
      JSON.stringify({ version: 1, accountId: scope.accountId, companyId: scope.companyId, body }),
    );

    expect(readWorldTravelAttempt(storage, scope).kind).toBe('INVALID');
    expect(storage.getItem(attemptStorageKey(scope))).toBeNull();
    expect(readWorldTravelResponse(successV2(commandId), commandId)).toBeUndefined();
    expect(classifyWorldTravelPost(200, successV2(commandId), commandId)).toEqual({
      kind: 'UNKNOWN',
    });
  }
});

it('retains an unresolved attempt across authorization changes and restores it only to its owner', async () => {
  const storage = new MemoryStorage();
  const current = readWorldPartyResponse(partyResponse())!;
  const attempt = createWorldTravelAttempt({
    scope,
    current,
    commandId: 'command-account-a',
    action: {
      kind: 'DEPART',
      departure: {
        purpose: 'NEW',
        edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
        fromSiteId: 'severny-dvor',
        toSiteId: 'bereznyak',
      },
    },
  });
  saveWorldTravelAttempt(storage, attempt);
  const storageKey = attemptStorageKey(scope);
  const originalEnvelope = storage.getItem(storageKey);
  expect(originalEnvelope).not.toBeNull();

  const posts: Array<{
    body: string;
    headers: Record<string, string>;
    commandId: string;
  }> = [];
  const forbidden = await executeWorldTravelAttempt({
    attempt,
    signal: new AbortController().signal,
    isCurrent: () => true,
    transport: {
      post: async (body, _signal, persistedAttempt) => {
        posts.push({
          body,
          headers: {
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: persistedAttempt.scope.companyId,
          },
          commandId: persistedAttempt.request.commandId,
        });
        return {
          status: 403,
          body: rejection(persistedAttempt.request.commandId, 'NOT_AUTHORIZED'),
        };
      },
      refresh: vi.fn(async () => current),
    },
  });
  expect(forbidden.kind).toBe('FORBIDDEN');

  const otherAccountScope = { accountId: 'account-b', companyId: 'company-b' };
  clearWorldTravelReturnWindow(storage, scope);
  expect(storage.getItem(storageKey)).toBe(originalEnvelope);
  expect(readWorldTravelAttempt(storage, otherAccountScope).kind).toBe('EMPTY');
  expect(posts).toHaveLength(1);

  const restored = readWorldTravelAttempt(storage, scope);
  expect(restored.kind).toBe('FOUND');
  if (restored.kind !== 'FOUND') throw new Error('Expected account A attempt to be restored');
  expect(restored.attempt.body).toBe(attempt.body);
  expect(restored.attempt.scope).toEqual(scope);
  expect(restored.attempt.request.commandId).toBe('command-account-a');

  const retry = await executeWorldTravelAttempt({
    attempt: restored.attempt,
    signal: new AbortController().signal,
    isCurrent: () => true,
    transport: {
      post: async (body, _signal, persistedAttempt) => {
        posts.push({
          body,
          headers: {
            [WORLD_EXPECTED_COMPANY_ID_HEADER]: persistedAttempt.scope.companyId,
          },
          commandId: persistedAttempt.request.commandId,
        });
        return {
          status: 200,
          body: success(persistedAttempt.request.commandId),
        };
      },
      refresh: async () => readWorldPartyResponse(success('command-account-a'))!,
    },
  });
  expect(retry.kind).toBe('ACCEPTED');
  expect(posts).toEqual([
    {
      body: attempt.body,
      headers: { [WORLD_EXPECTED_COMPANY_ID_HEADER]: scope.companyId },
      commandId: 'command-account-a',
    },
    {
      body: attempt.body,
      headers: { [WORLD_EXPECTED_COMPANY_ID_HEADER]: scope.companyId },
      commandId: 'command-account-a',
    },
  ]);

  let currentScope: typeof scope | typeof otherAccountScope = scope;
  let currentGeneration = 1;
  let finishPost: ((response: { status: number; body: unknown }) => void) | undefined;
  const signal = new AbortController().signal;
  const lateResult = executeWorldTravelAttempt({
    attempt: restored.attempt,
    signal,
    isCurrent: () =>
      isWorldTravelOperationCurrent({
        operationGeneration: 1,
        currentGeneration,
        operationScope: scope,
        currentScope,
        signal,
      }),
    transport: {
      post: () =>
        new Promise((resolve) => {
          finishPost = resolve;
        }),
      refresh: vi.fn(async () => current),
    },
  });
  let visibleAccount = 'account-b';
  currentScope = otherAccountScope;
  currentGeneration = 2;
  finishPost?.({
    status: 403,
    body: rejection('command-account-a', 'NOT_AUTHORIZED'),
  });
  expect(await lateResult).toEqual({ kind: 'CANCELLED' });
  if (
    isWorldTravelOperationCurrent({
      operationGeneration: 1,
      currentGeneration,
      operationScope: scope,
      currentScope,
      signal,
    })
  )
    visibleAccount = 'account-a';
  expect(visibleAccount).toBe('account-b');
});

it('fails closed for malformed, unauthorized, early-arrival, stale and unsupported replies', () => {
  expect(classifyWorldTravelPost(401, null, 'command-1')).toEqual({ kind: 'UNAUTHENTICATED' });
  expect(classifyWorldTravelPost(500, null, 'command-1')).toEqual({ kind: 'UNKNOWN' });
  expect(classifyWorldTravelPost(200, { ...success('other-command') }, 'command-1')).toEqual({
    kind: 'UNKNOWN',
  });
  expect(classifyWorldTravelPost(200, successV2('command-1'), 'command-1')).toMatchObject({
    kind: 'ACCEPTED',
    response: { schemaVersion: 2, commandId: 'command-1' },
  });
  expect(classifyWorldTravelPost(200, successV2('other-command'), 'command-1')).toEqual({
    kind: 'UNKNOWN',
  });
  expect(
    classifyWorldTravelPost(200, { ...successV2('command-1'), commandId: 7 }, 'command-1'),
  ).toEqual({ kind: 'UNKNOWN' });
  expect(
    classifyWorldTravelPost(
      200,
      { ...successV2('command-1'), acceptedByAccountId: 'private-account' },
      'command-1',
    ),
  ).toEqual({ kind: 'UNKNOWN' });
  expect(
    classifyWorldTravelPost(403, rejection('command-1', 'NOT_AUTHORIZED'), 'command-1'),
  ).toEqual({ kind: 'FORBIDDEN' });
  expect(
    classifyWorldTravelPost(409, rejection('command-1', 'STALE_ROUTE_EPOCH'), 'command-1'),
  ).toMatchObject({ kind: 'REJECTED', rejection: { code: 'STALE_ROUTE_EPOCH' } });
  expect(
    classifyWorldTravelPost(409, rejection('command-1', 'INVALID_ARRIVAL'), 'command-1'),
  ).toMatchObject({ kind: 'REJECTED', rejection: { code: 'INVALID_ARRIVAL' } });
  expect(
    classifyWorldTravelPost(409, rejection('command-1', 'UNSUPPORTED_ACTION'), 'command-1'),
  ).toMatchObject({ kind: 'REJECTED', rejection: { code: 'UNSUPPORTED_ACTION' } });
  expect(
    classifyWorldTravelPost(409, rejection('command-1', 'INVALID_ROUTE', 2), 'command-1'),
  ).toMatchObject({
    kind: 'REJECTED',
    rejection: { schemaVersion: 2, code: 'INVALID_ROUTE' },
  });
  expect(worldTravelRejectionMessage('INVALID_ROUTE')).toBe(
    'Сервер отклонил этот переход. Проверьте обновлённое место партии.',
  );
  expect(
    classifyWorldTravelPost(
      409,
      { ...rejection('command-1', 'INVALID_ROUTE'), publicRevision: 'bad' },
      'command-1',
    ),
  ).toEqual({ kind: 'UNKNOWN' });
});

it('opens RETURN only for the same server tick and retained route epoch, and ignores late operations', () => {
  const storage = new MemoryStorage();
  const legacyKey = 'warwrit:world-travel:v1:account-1:company-1:return';
  storage.setItem(
    legacyKey,
    JSON.stringify({
      version: 1,
      accountId: scope.accountId,
      companyId: scope.companyId,
      arrivalTick: '1010',
      routeEpoch: '1',
    }),
  );
  expect(
    isWorldTravelReturnWindowOpen(
      storage,
      scope,
      readWorldPartyResponse(
        partyResponse({ worldTick: '1010', location: 'kamenny-brod', routeEpoch: '1' }),
      )!,
    ),
  ).toBe(false);
  expect(storage.getItem(legacyKey)).toBeNull();

  saveWorldTravelReturnWindow(storage, { scope, arrivalTick: '1010', routeEpoch: '1' });
  expect(
    isWorldTravelReturnWindowOpen(
      storage,
      scope,
      readWorldPartyResponse(
        partyResponse({
          worldTick: '1010',
          location: 'kamenny-brod',
          routeEpoch: '1',
        }),
      )!,
    ),
  ).toBe(true);
  expect(
    isWorldTravelReturnWindowOpen(
      storage,
      scope,
      readWorldPartyResponse(
        partyResponse({
          worldTick: '1011',
          location: 'kamenny-brod',
          routeEpoch: '1',
        }),
      )!,
    ),
  ).toBe(false);
  saveWorldTravelReturnWindow(storage, { scope, arrivalTick: '1010', routeEpoch: '1' });
  expect(
    isWorldTravelReturnWindowOpen(
      storage,
      scope,
      readWorldPartyResponse(
        partyResponse({
          worldTick: '1010',
          location: 'kamenny-brod',
          routeEpoch: '2',
        }),
      )!,
    ),
  ).toBe(false);

  const controller = new AbortController();
  controller.abort();
  expect(
    isWorldTravelOperationCurrent({
      operationGeneration: 2,
      currentGeneration: 2,
      operationScope: scope,
      currentScope: scope,
      signal: controller.signal,
    }),
  ).toBe(false);
});

it('uses refreshed server canArrive and opens RETURN only from proven on-time accepted arrivals', async () => {
  const storage = new MemoryStorage();
  const notReady = arrivalState({ tick: '1009', canArrive: false });
  const ready = readWorldPartyResponse(
    partyResponse({
      worldTick: '1010',
      location: 'severny-dvor',
      routeEpoch: '1',
      canArrive: true,
    }),
  )!;
  expect(notReady.schemaVersion === 1 && notReady.route?.canArrive).toBe(false);
  expect(ready.schemaVersion === 1 && ready.route?.canArrive).toBe(true);

  const onTimeAttempt = createWorldTravelAttempt({
    scope,
    current: ready,
    commandId: 'arrive-on-time',
    action: { kind: 'ARRIVE' },
  });
  expect(onTimeAttempt.arrivalProof).toMatchObject({ arrivalTick: '1010', dueTick: '1010' });
  saveWorldTravelAttempt(storage, onTimeAttempt);
  const recoveredAttempt = readWorldTravelAttempt(storage, scope);
  expect(recoveredAttempt.kind).toBe('FOUND');
  if (recoveredAttempt.kind !== 'FOUND') throw new Error('Expected a saved attempt');
  expect(recoveredAttempt.attempt.body).toBe(onTimeAttempt.body);
  expect(recoveredAttempt.attempt.arrivalProof).toEqual(onTimeAttempt.arrivalProof);

  const acceptedCurrent = readWorldPartyResponse(
    partyResponse({ worldTick: '1010', location: 'kamenny-brod', routeEpoch: '1' }),
  )!;
  let sends = 0;
  const execute = () =>
    executeWorldTravelAttempt({
      attempt: recoveredAttempt.attempt,
      signal: new AbortController().signal,
      isCurrent: () => true,
      transport: {
        post: async () => {
          sends += 1;
          if (sends === 1) throw new Error('unknown command outcome');
          return { status: 200, body: success('arrive-on-time') };
        },
        refresh: async () => acceptedCurrent,
      },
    });
  expect((await execute()).kind).toBe('UNKNOWN');
  expect(storage.getItem(returnWindowStorageKey(scope))).toBeNull();
  const retried = await execute();
  expect(retried.kind).toBe('ACCEPTED');
  if (retried.kind !== 'ACCEPTED') throw new Error('Expected accepted arrival');
  expect(
    onTimeWorldTravelReturnWindow(recoveredAttempt.attempt, retried.receipt, retried.current),
  ).toEqual({ scope, arrivalTick: '1010', routeEpoch: '1' });

  const lateAttempt = createWorldTravelAttempt({
    scope,
    current: arrivalState({ tick: '1011', canArrive: true }),
    commandId: 'arrive-late',
    action: { kind: 'ARRIVE' },
  });
  expect(lateAttempt.arrivalProof).toBeUndefined();
  const lateCurrent = readWorldPartyResponse(
    partyResponse({ worldTick: '1011', location: 'kamenny-brod', routeEpoch: '1' }),
  )!;
  const lateReceipt = readWorldTravelResponse(success('arrive-late'), 'arrive-late')!;
  expect(onTimeWorldTravelReturnWindow(lateAttempt, lateReceipt, lateCurrent)).toBeUndefined();

  const unprovedAttempt = createWorldTravelAttempt({
    scope,
    current: arrivalState({ tick: '1010', canArrive: false }),
    commandId: 'arrive-unknown',
    action: { kind: 'ARRIVE' },
  });
  saveWorldTravelAttempt(storage, unprovedAttempt);
  const restoredUnproved = readWorldTravelAttempt(storage, scope);
  expect(restoredUnproved.kind).toBe('FOUND');
  if (restoredUnproved.kind !== 'FOUND') throw new Error('Expected the unresolved request');
  expect(restoredUnproved.attempt.arrivalProof).toBeUndefined();
  expect(
    onTimeWorldTravelReturnWindow(
      restoredUnproved.attempt,
      readWorldTravelResponse(success('arrive-unknown'), 'arrive-unknown')!,
      acceptedCurrent,
    ),
  ).toBeUndefined();

  const laterCurrent = readWorldPartyResponse(
    partyResponse({ worldTick: '1011', location: 'kamenny-brod', routeEpoch: '1' }),
  )!;
  expect(
    onTimeWorldTravelReturnWindow(recoveredAttempt.attempt, retried.receipt, laterCurrent),
  ).toBeUndefined();
});

it('does not refresh or publish a response that finishes after logout invalidates its generation', async () => {
  const current = readWorldPartyResponse(partyResponse())!;
  const attempt = createWorldTravelAttempt({
    scope,
    current,
    commandId: 'command-late',
    action: { kind: 'ARRIVE' },
  });
  let generation = 1;
  let resolvePost: (value: { readonly status: number; readonly body: unknown }) => void = () => {};
  const refresh = vi.fn(async () => current);
  const execution = executeWorldTravelAttempt({
    attempt,
    signal: new AbortController().signal,
    isCurrent: () => generation === 1,
    transport: {
      post: () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
      refresh,
    },
  });
  generation = 2;
  resolvePost({ status: 200, body: success('command-late') });
  await expect(execution).resolves.toEqual({ kind: 'CANCELLED' });
  expect(refresh).not.toHaveBeenCalled();
});

it('aborts an in-flight travel write on logout without treating it as a rejection', async () => {
  const current = readWorldPartyResponse(partyResponse())!;
  const attempt = createWorldTravelAttempt({
    scope,
    current,
    commandId: 'command-aborted-on-logout',
    action: { kind: 'DEPART', departure: current.availableDepartures![0]! },
  });
  const controller = new AbortController();
  let resolvePost: (value: { readonly status: number; readonly body: unknown }) => void = () => {};
  const refresh = vi.fn(async () => current);
  const execution = executeWorldTravelAttempt({
    attempt,
    signal: controller.signal,
    isCurrent: () => true,
    transport: {
      post: () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
      refresh,
    },
  });

  controller.abort();
  resolvePost({ status: 409, body: rejection(attempt.request.commandId, 'INVALID_ROUTE', 2) });
  await expect(execution).resolves.toEqual({ kind: 'CANCELLED' });
  expect(refresh).not.toHaveBeenCalled();
});

it('clears the scoped retry after the authoritative refresh discovers an expired session', async () => {
  const current = readWorldPartyResponse(partyResponse())!;
  const attempt = createWorldTravelAttempt({
    scope,
    current,
    commandId: 'command-auth',
    action: { kind: 'ARRIVE' },
  });
  await expect(
    executeWorldTravelAttempt({
      attempt,
      signal: new AbortController().signal,
      isCurrent: () => true,
      transport: {
        post: async () => ({ status: 200, body: success('command-auth') }),
        refresh: async () => {
          throw new WorldTravelRefreshError('UNAUTHENTICATED');
        },
      },
    }),
  ).resolves.toEqual({ kind: 'UNAUTHENTICATED' });
});
