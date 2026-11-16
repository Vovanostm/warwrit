// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EncounterLeadershipDto } from '@warwrit/protocol';

import { LeadershipChoice } from './LeadershipChoice.js';

const encounterId = 'encounter-a';
const required: EncounterLeadershipDto = {
  version: 1,
  encounterId,
  required: true,
  candidates: [{ characterId: 'candidate-a', name: 'Ирина' }],
  modes: ['PERMANENT'],
  chosen: null,
};

function response(value: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => value,
  } as Response;
}

describe('LeadershipChoice polling', () => {
  let root: Root | undefined;
  let container: HTMLDivElement | undefined;

  async function mount() {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root!.render(createElement(LeadershipChoice, { encounterId }));
      await Promise.resolve();
    });
  }

  async function rerender(nextEncounterId: string) {
    await act(async () => {
      root!.render(createElement(LeadershipChoice, { encounterId: nextEncounterId }));
      await Promise.resolve();
    });
  }

  async function tick() {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
  }

  afterEach(() => {
    if (root) act(() => root?.unmount());
    root = undefined;
    container?.remove();
    container = undefined;
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('clears a stale choice and stops polling after the encounter returns 404', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<(...args: Parameters<typeof fetch>) => Promise<Response>>()
      .mockResolvedValueOnce(response(required))
      .mockResolvedValue(response(undefined, 404));
    vi.stubGlobal('fetch', fetchMock);
    await mount();
    expect(container?.textContent).toContain('Глава компании погиб');

    await tick();
    expect(container?.textContent).toBe('');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await tick();
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('starts polling for a new encounter after the previous one returned 404', async () => {
    vi.useFakeTimers();
    const next = {
      ...required,
      encounterId: 'encounter-b',
      candidates: [{ characterId: 'candidate-b', name: 'Борис' }],
    };
    const fetchMock = vi
      .fn<(...args: Parameters<typeof fetch>) => Promise<Response>>()
      .mockResolvedValueOnce(response(undefined, 404))
      .mockResolvedValue(response(next));
    vi.stubGlobal('fetch', fetchMock);
    await mount();
    expect(container?.textContent).toBe('');
    await rerender('encounter-b');
    expect(container?.textContent).toContain('Борис');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('ignores a late response from the previous encounter', async () => {
    vi.useFakeTimers();
    let resolveOld!: (value: Response) => void;
    const oldResponse = new Promise<Response>((resolve) => {
      resolveOld = resolve;
    });
    const next = {
      ...required,
      encounterId: 'encounter-b',
      candidates: [{ characterId: 'candidate-b', name: 'Борис' }],
    };
    const fetchMock = vi
      .fn<(...args: Parameters<typeof fetch>) => Promise<Response>>()
      .mockReturnValueOnce(oldResponse)
      .mockResolvedValue(response(next));
    vi.stubGlobal('fetch', fetchMock);
    await mount();
    await rerender('encounter-b');
    expect(container?.textContent).toContain('Борис');
    await act(async () => {
      resolveOld(response(required));
      await Promise.resolve();
    });
    expect(container?.textContent).toContain('Борис');
    expect(container?.textContent).not.toContain('Ирина');
  });

  it('stops polling when the server says leadership is no longer required', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<(...args: Parameters<typeof fetch>) => Promise<Response>>()
      .mockResolvedValue(response({ ...required, required: false }));
    vi.stubGlobal('fetch', fetchMock);
    await mount();
    expect(container?.textContent).toBe('');
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps polling while required and reflects the server chosen candidate', async () => {
    vi.useFakeTimers();
    const chosen = {
      ...required,
      chosen: { candidateId: 'candidate-a', mode: 'PERMANENT' as const },
    };
    const fetchMock = vi
      .fn<(...args: Parameters<typeof fetch>) => Promise<Response>>()
      .mockResolvedValueOnce(response(required))
      .mockResolvedValue(response(chosen));
    vi.stubGlobal('fetch', fetchMock);
    await mount();
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(container?.textContent).toContain('Ирина · выбран');
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('retries transient HTTP and network errors', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<(...args: Parameters<typeof fetch>) => Promise<Response>>()
      .mockResolvedValueOnce(response(required))
      .mockResolvedValueOnce(response(undefined, 503))
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValue(response({ ...required, required: false }));
    vi.stubGlobal('fetch', fetchMock);
    await mount();
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(container?.textContent).toBe('');
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('clears its polling interval when the chooser unmounts', async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn<(...args: Parameters<typeof fetch>) => Promise<Response>>()
      .mockResolvedValue(response(required));
    vi.stubGlobal('fetch', fetchMock);
    await mount();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    act(() => root?.unmount());
    root = undefined;
    await tick();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
