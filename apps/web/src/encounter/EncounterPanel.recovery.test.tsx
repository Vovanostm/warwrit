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
) {
  const observer = harness.observers.at(-1)!;
  await act(async () => {
    observer['onStatus']!('connected' as never);
    observer['onProjection']!(projection as never);
    observer['onControlGrant']!(grant as never);
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
    await connectCurrentPanel(retrySender);
    expect(container.textContent).toContain('Повторить команду');
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
});
