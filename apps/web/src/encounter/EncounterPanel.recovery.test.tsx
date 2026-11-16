// @vitest-environment jsdom
import { act, createElement, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  EncounterCommandDto,
  EncounterCommandResponse,
  EncounterControlGrantDto,
  EncounterPublicProjectionDto,
} from '@warwrit/protocol';

const harness = vi.hoisted(() => ({
  observers: [] as Array<Record<string, (...args: never[]) => void>>,
  battleActs: [] as Array<(intent: unknown) => void>,
  stop: vi.fn(),
}));

vi.mock('./connection.js', () => ({
  startEncounterConnection: ({
    observer,
  }: {
    observer: Record<string, (...args: never[]) => void>;
  }) => {
    harness.observers.push(observer);
    return harness.stop;
  },
}));

vi.mock('../combat-lab/BattleView.js', () => ({
  BattleView: ({ children, onAct }: { children?: ReactNode; onAct?: (intent: never) => void }) => {
    if (onAct) harness.battleActs.push(onAct as (intent: unknown) => void);
    return children ?? null;
  },
}));

import { EncounterPanel } from '../EncounterPanel.js';
import {
  encounterCommandAttemptStorageKey,
  writeEncounterCommandAttempt,
} from './command-attempt-storage.js';

const scope = { accountId: 'account-a', companyId: 'company-a' };
const encounterId = '11111111-1111-4111-8111-111111111111';
const projection: EncounterPublicProjectionDto = {
  version: 1,
  encounterId,
  revision: 4,
  status: 'active',
  round: 2,
  activationId: 'activation-a',
  actorUnitId: 'fighter-a',
  deadlineAt: null,
  units: [
    {
      id: 'fighter-a',
      sideId: 'company-a',
      q: 0,
      r: 0,
      health: 10,
      status: 'active',
    },
  ],
};
const grant: EncounterControlGrantDto = {
  version: 1,
  encounterId,
  revision: 4,
  controllableUnitIds: ['fighter-a'],
};

function response(command: EncounterCommandDto): EncounterCommandResponse {
  return {
    version: 1,
    commandId: command.commandId,
    status: 'accepted',
    encounterId: command.encounterId,
    receiptId: 'receipt-a',
    revision: command.expectedRevision + 1,
  };
}

function mount(root: Root) {
  root.render(
    createElement(EncounterPanel, {
      scope,
      onUnauthorized: () => undefined,
    }),
  );
}

async function connectCurrentPanel(
  sender: (command: EncounterCommandDto) => Promise<EncounterCommandResponse>,
  nextProjection = projection,
  nextGrant: EncounterControlGrantDto = grant,
) {
  const observer = harness.observers.at(-1)!;
  await act(async () => {
    observer['onStatus']!('connected' as never);
    observer['onProjection']!(nextProjection as never);
    observer['onControlGrant']!(nextGrant as never);
    observer['onCommandSender']!(sender as never);
  });
}

describe('EncounterPanel command recovery', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = undefined;
    container?.remove();
    container = undefined;
    sessionStorage.clear();
    harness.observers.length = 0;
    harness.battleActs.length = 0;
    harness.stop.mockClear();
  });

  it('lets a failed battle check rediscover that the company has already left combat', async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () =>
      root!.render(
        createElement(EncounterPanel, {
          scope,
          hideWhenIdle: true,
          onUnauthorized: () => undefined,
        }),
      ),
    );
    await act(async () => harness.observers.at(-1)!['onStatus']!('failed' as never));
    const retry = [...container.querySelectorAll('button')].find(
      (button) => button.textContent === 'Повторить проверку боя',
    );
    expect(retry).toBeDefined();
    await act(async () => retry!.click());
    expect(harness.stop).toHaveBeenCalledTimes(1);
    expect(harness.observers).toHaveLength(2);
    await act(async () => harness.observers.at(-1)!['onStatus']!('no-active' as never));
    expect(container.textContent).toBe('');
  });

  it('retains and restores a pending command when its accepted response arrives after unmount', async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    let resolveFirst: ((value: EncounterCommandResponse) => void) | undefined;
    const firstSender = vi.fn(
      (_command: EncounterCommandDto) =>
        new Promise<EncounterCommandResponse>((resolve) => {
          resolveFirst = resolve;
        }),
    );
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => mount(root!));
    await connectCurrentPanel(firstSender);

    const waitButton = container.querySelector<HTMLButtonElement>('[aria-label="Завершить ход"]');
    expect(waitButton?.disabled).toBe(false);
    await act(async () => waitButton!.click());
    expect(firstSender).toHaveBeenCalledTimes(1);
    const sentCommand = firstSender.mock.calls[0]![0];
    const storageKey = encounterCommandAttemptStorageKey(scope, encounterId);
    const storedBeforeUnmount = sessionStorage.getItem(storageKey);
    expect(storedBeforeUnmount).not.toBeNull();
    expect(container.textContent).not.toContain('полномочие управления устарели');

    await act(async () => root!.unmount());
    root = undefined;
    expect(harness.stop).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveFirst!(response(sentCommand));
      await Promise.resolve();
    });
    expect(sessionStorage.getItem(storageKey)).toBe(storedBeforeUnmount);

    harness.observers.length = 0;
    const retrySender = vi.fn(async (command: EncounterCommandDto) => response(command));
    root = createRoot(container);
    await act(async () => mount(root!));
    await act(async () => {
      const observer = harness.observers.at(-1)!;
      observer['onStatus']!('connected' as never);
      observer['onProjection']!(projection as never);
      observer['onControlGrant']!(grant as never);
    });
    expect(
      [...container.querySelectorAll('button')].find((button) =>
        button.textContent?.includes('Повторить команду'),
      )?.disabled,
    ).toBe(true);
    await connectCurrentPanel(retrySender);
    expect(container.textContent).toContain('Повторить команду');
    expect(container.textContent).not.toContain('полномочие управления устарели');
    const retry = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Повторить команду'),
    );
    expect(retry).toBeDefined();
    await act(async () => {
      retry!.click();
      await Promise.resolve();
    });
    expect(retrySender).toHaveBeenCalledWith(sentCommand);
    expect(sessionStorage.getItem(storageKey)).toBeNull();
  });

  it('requires a current owned retreat cell before sending retreat, independently of capability', async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => mount(root!));
    const sender = vi.fn(async (command: EncounterCommandDto) => response(command));
    const tacticalGrant = {
      ...grant,
      actorActions: {
        activationId: 'activation-a',
        actorId: 'fighter-a',
        permittedIntents: ['move', 'attack', 'defend', 'wait', 'retreat'] as const,
      },
      tactical: {
        activationId: 'activation-a',
        actorId: 'fighter-a',
        actionPoints: 4,
        stamina: 80,
        moves: [],
        attacks: [],
        retreatHexes: [{ q: -3, r: 0 }],
      },
    };
    await connectCurrentPanel(sender, projection, tacticalGrant);
    const retreat = () => container!.querySelector<HTMLButtonElement>('[aria-label="Отступить"]')!;
    expect(retreat().disabled).toBe(true);
    expect(container.textContent).toContain('Клетки отхода вашей стороны');
    expect(container.textContent).toContain('(-3, 0)');
    await act(async () => retreat().click());
    expect(sender).not.toHaveBeenCalled();
    await connectCurrentPanel(sender, projection, {
      ...tacticalGrant,
      tactical: { ...tacticalGrant.tactical, retreatHexes: [{ q: 0, r: 0 }] },
    });
    expect(retreat().disabled).toBe(false);

    await connectCurrentPanel(
      sender,
      {
        ...projection,
        units: [{ ...projection.units[0]!, q: -3, r: 0 }],
      },
      tacticalGrant,
    );
    expect(retreat().disabled).toBe(false);
    await act(async () => retreat().click());
    expect(sender).toHaveBeenCalledTimes(1);
    expect(sender.mock.calls[0]![0].intent).toEqual({ type: 'retreat' });

    const waitingProjection = { ...projection, revision: 5 };
    const waitingGrant = { ...tacticalGrant, revision: 5 };
    await connectCurrentPanel(
      sender,
      {
        ...waitingProjection,
        units: [{ ...projection.units[0]!, q: -3, r: 0 }],
      },
      {
        ...waitingGrant,
        actorActions: {
          ...waitingGrant.actorActions,
          permittedIntents: ['wait'],
        },
      },
    );
    await act(async () => container!.querySelector<HTMLButtonElement>('.encounter-unit')!.click());
    expect(retreat().disabled).toBe(true);
    await connectCurrentPanel(sender, waitingProjection, { ...grant, revision: 5 });
    expect(retreat().disabled).toBe(true);
  });

  it('waits for the accepted projection and its matching grant before fresh commands', async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => mount(root!));
    const sender = vi.fn(async (command: EncounterCommandDto) => response(command));
    await connectCurrentPanel(sender, {
      ...projection,
      deadlineAt: new Date(Date.now() + 60_000).toISOString(),
    });
    expect(container.textContent).toMatch(/Ваш ход · .* · осталось \d+ с/);
    const wait = () => container!.querySelector<HTMLButtonElement>('[aria-label="Завершить ход"]');
    expect(wait()?.disabled).toBe(false);
    const staleAction = harness.battleActs.at(-1)!;
    await act(async () => wait()!.click());
    expect(sender).toHaveBeenCalledTimes(1);
    expect(container.textContent).toContain('Приказ принят. Ждём обновления боя.');
    expect(wait()).toBeNull();
    await act(async () => staleAction({ type: 'wait' } as never));
    expect(sender).toHaveBeenCalledTimes(1);

    const observer = harness.observers.at(-1)!;
    const nextProjection = { ...projection, revision: 5 };
    await act(async () => observer['onProjection']!(nextProjection as never));
    expect(wait()).toBeNull();
    await act(async () => observer['onControlGrant']!({ ...grant, revision: 5 } as never));
    await act(async () => container!.querySelector<HTMLButtonElement>('.encounter-unit')!.click());
    expect(wait()?.disabled).toBe(false);
    await act(async () => wait()!.click());
    expect(sender).toHaveBeenCalledTimes(2);
    expect(sender.mock.calls[1]![0].expectedRevision).toBe(5);
  });

  it('does not wait again when the accepted projection arrives before its response', async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    let resolveCommand: ((value: EncounterCommandResponse) => void) | undefined;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => mount(root!));
    const sender = vi.fn(
      (_command: EncounterCommandDto) =>
        new Promise<EncounterCommandResponse>((resolve) => {
          resolveCommand = resolve;
        }),
    );
    await connectCurrentPanel(sender);
    const wait = () => container!.querySelector<HTMLButtonElement>('[aria-label="Завершить ход"]');
    await act(async () => wait()!.click());
    const observer = harness.observers.at(-1)!;
    await act(async () => {
      observer['onProjection']!({ ...projection, revision: 5 } as never);
      observer['onControlGrant']!({ ...grant, revision: 5 } as never);
    });
    await act(async () => container!.querySelector<HTMLButtonElement>('.encounter-unit')!.click());
    await act(async () => {
      resolveCommand!(response(sender.mock.calls[0]![0]));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.textContent).not.toContain('Ждём обновления боя');
    expect(wait()?.disabled).toBe(false);
  });

  it('clears a historical retry without waiting for a revision already projected', async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const historicalCommand: EncounterCommandDto = {
      version: 1,
      encounterId,
      commandId: 'command-historical',
      expectedRevision: 4,
      activationId: 'activation-a',
      actorId: 'fighter-a',
      intent: { type: 'wait' },
    };
    writeEncounterCommandAttempt(sessionStorage, scope, historicalCommand);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => mount(root!));
    const sender = vi.fn(async (command: EncounterCommandDto) => response(command));
    const observer = harness.observers.at(-1)!;
    await act(async () => {
      observer['onStatus']!('connected' as never);
      observer['onProjection']!({ ...projection, revision: 5 } as never);
      observer['onControlGrant']!({ ...grant, revision: 5 } as never);
      observer['onCommandSender']!(sender as never);
    });
    const retry = [...container.querySelectorAll('button')].find((button) =>
      button.textContent?.includes('Повторить команду'),
    );
    expect(retry).toBeDefined();
    await act(async () => retry!.click());
    expect(sender).toHaveBeenCalledWith(historicalCommand);
    expect(container.textContent).not.toContain('Ждём обновления боя');
    expect(container.querySelector('[aria-label="Завершить ход"]')?.hasAttribute('disabled')).toBe(
      false,
    );
  });
});
