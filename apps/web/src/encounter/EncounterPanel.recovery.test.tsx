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
  BattleView: ({ children }: { children?: ReactNode }) => children ?? null,
}));

import { EncounterPanel } from '../EncounterPanel.js';
import { encounterCommandAttemptStorageKey } from './command-attempt-storage.js';

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

    await connectCurrentPanel(
      sender,
      {
        ...projection,
        units: [{ ...projection.units[0]!, q: -3, r: 0 }],
      },
      {
        ...tacticalGrant,
        actorActions: {
          ...tacticalGrant.actorActions,
          permittedIntents: ['wait'],
        },
      },
    );
    expect(retreat().disabled).toBe(true);
    await connectCurrentPanel(sender, projection, grant);
    expect(retreat().disabled).toBe(true);
  });
});
