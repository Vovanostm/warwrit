// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { useCompanyAction } from './use-company-action.js';
import { companyRosterAttemptKey } from './company-roster-attempt.js';

const scope = { accountId: 'owner-a', companyId: 'company-a' };
const request = {
  schemaVersion: 2 as const,
  commandId: 'equip-one',
  expectedPublicRevision: '8',
  type: 'EquipItem' as const,
  payload: { characterId: 'fighter-a', itemId: 'sword-a', slotId: 'MAIN_HAND' as const },
};
let root: Root | undefined;
let controls: ReturnType<typeof useCompanyAction>;
const refresh = vi.fn(async () => {});
function Harness(props: { owner?: typeof scope }) {
  controls = useCompanyAction('/api', props.owner, refresh, () => {});
  return null;
}
async function mount(owner = scope) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  root ??= createRoot(document.createElement('div'));
  await act(async () => root!.render(createElement(Harness, { owner })));
}
function accepted(id = request.commandId) {
  return new Response(JSON.stringify({ commandId: id, ok: true, publicRevision: '9' }), {
    status: 200,
  });
}
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  sessionStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  refresh.mockClear();
});

it.each(['EquipItem', 'BeginFieldCamp', 'EndFieldCamp'] as const)(
  'retains %s after lost reply and reload; retries exact ID/body before refreshing facts',
  async (type) => {
    const action = type === 'EquipItem' ? request : { ...request, type, payload: {} };
    const bodies: unknown[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: RequestInit) => {
        bodies.push(init.body);
        throw new Error('lost after commit');
      }),
    );
    await mount();
    await act(async () => controls.send(action));
    expect(controls.pending).toBe(true);
    expect(refresh).not.toHaveBeenCalled();
    await act(async () => root!.unmount());
    root = undefined;
    await mount();
    expect(controls.pending).toBe(true);
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: RequestInit) => {
        bodies.push(init.body);
        return accepted();
      }),
    );
    // A replacement click resolves the occupied slot, never sends a new command.
    await act(async () => controls.send({ ...request, commandId: 'replacement' }));
    expect(bodies).toEqual([JSON.stringify(action), JSON.stringify(action)]);
    expect(controls.pending).toBe(false);
    expect(refresh).toHaveBeenCalledExactlyOnceWith(scope);
    expect(sessionStorage.getItem(companyRosterAttemptKey(scope, type))).toBeNull();
  },
);

it('keeps a mismatched acknowledgement and a cleanup failure pending', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => accepted('other-command')),
  );
  await mount();
  await act(async () => controls.send(request));
  expect(controls.pending).toBe(true);
  expect(refresh).not.toHaveBeenCalled();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => accepted()),
  );
  vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new Error('storage unavailable');
  });
  await act(async () => controls.retry());
  expect(controls.pending).toBe(true);
  expect(sessionStorage.getItem(companyRosterAttemptKey(scope, 'EquipItem'))).not.toBeNull();
  expect(refresh).not.toHaveBeenCalled();
});

it('never sends with unavailable or damaged storage and isolates account/company changes', async () => {
  const fetcher = vi.fn(async () => accepted());
  vi.stubGlobal('fetch', fetcher);
  sessionStorage.setItem(companyRosterAttemptKey(scope, 'BeginFieldCamp'), 'broken');
  await mount();
  await act(async () => controls.send(request));
  expect(fetcher).not.toHaveBeenCalled();
  expect(controls.pending).toBe(true);
  const other = { accountId: 'owner-b', companyId: 'company-b' };
  await mount(other);
  expect(controls.pending).toBe(false);
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('full');
  });
  await act(async () => controls.send(request));
  expect(fetcher).not.toHaveBeenCalled();
  expect(controls.pending).toBe(true);
});

it('ignores a late success from the previous account and retains its retry', async () => {
  let complete!: (r: Response) => void;
  vi.stubGlobal(
    'fetch',
    vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          complete = resolve;
        }),
    ),
  );
  await mount();
  let sent!: Promise<void>;
  await act(async () => {
    sent = controls.send(request);
  });
  await mount({ accountId: 'owner-b', companyId: 'company-b' });
  await act(async () => {
    complete(accepted());
    await sent;
  });
  expect(controls.pending).toBe(false);
  expect(refresh).not.toHaveBeenCalled();
  expect(sessionStorage.getItem(companyRosterAttemptKey(scope, 'EquipItem'))).not.toBeNull();
});

it('keeps denied access pending and distinguishes a confirmed command from a failed readback', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            commandId: request.commandId,
            ok: false,
            publicRevision: '8',
            code: 'NOT_AUTHORIZED',
          }),
          { status: 403 },
        ),
    ),
  );
  await mount();
  await act(async () => controls.send(request));
  expect(controls.pending).toBe(true);
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => accepted()),
  );
  refresh.mockRejectedValueOnce(new Error('readback offline'));
  await act(async () => controls.retry());
  expect(controls.pending).toBe(false);
  expect(controls.message).toContain('сведения отряда не обновились');
  expect(sessionStorage.getItem(companyRosterAttemptKey(scope, 'EquipItem'))).toBeNull();
});
