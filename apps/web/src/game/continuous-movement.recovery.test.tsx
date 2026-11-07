// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import { useContinuousMovement } from './continuous-movement.js';

const scope = { accountId: 'owner', companyId: 'company' };
const projection = {
  schemaVersion: 2,
  result: 'ACCEPTED',
  publicRevision: '1',
  movementEpoch: '1',
  serverTimeMs: '1000',
  point: { xMicroFp: '0', zMicroFp: '0' },
  mode: 'STATIONARY_SITE',
  plan: null,
};
let root: Root | undefined;
let controls: ReturnType<typeof useContinuousMovement>;
function Harness() {
  controls = useContinuousMovement(scope, () => {});
  return null;
}
async function mount() {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  root = createRoot(document.createElement('div'));
  await act(async () => root!.render(createElement(Harness)));
}
const reply = (status = 200) => new Response(JSON.stringify(projection), { status });
afterEach(async () => {
  if (root) await act(async () => root!.unmount());
  root = undefined;
  localStorage.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it('retains exact movement intent when cleanup fails, then replays it', async () => {
  const bodies: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url, init: RequestInit) => {
      if (init.method === 'POST') {
        bodies.push(init.body);
        return new Response(
          JSON.stringify({ ...projection, commandId: JSON.parse(String(init.body)).commandId }),
        );
      }
      return reply();
    }),
  );
  await mount();
  const removal = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
    throw new Error('storage denied');
  });
  await act(async () => controls.send({ kind: 'STOP' }));
  expect(controls.unknown).toBe(true);
  expect(localStorage.getItem('warwrit.continuous.owner.company')).not.toBeNull();
  removal.mockRestore();
  await act(async () => controls.retry());
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toBe(bodies[0]);
  expect(controls.unknown).toBe(false);
  expect(localStorage.getItem('warwrit.continuous.owner.company')).toBeNull();
});

it('does not acknowledge a success-shaped HTTP failure or release its saved intent', async () => {
  const bodies: unknown[] = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url, init: RequestInit) => {
      if (init.method === 'POST') {
        bodies.push(init.body);
        return new Response(
          JSON.stringify({ ...projection, commandId: JSON.parse(String(init.body)).commandId }),
          { status: 500 },
        );
      }
      return reply();
    }),
  );
  await mount();
  await act(async () => controls.send({ kind: 'STOP' }));
  expect(controls.unknown).toBe(true);
  await act(async () => controls.retry());
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toBe(bodies[0]);
  expect(localStorage.getItem('warwrit.continuous.owner.company')).not.toBeNull();
});

it.each([
  [403, 'NOT_AUTHORIZED', true],
  [409, 'STALE_REVISION', false],
  [200, 'ACCEPTED', false],
] as const)(
  'keeps pending on status%s / %s with unsafe identity',
  async (status, code, matching) => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init: RequestInit) => {
        if (init.method !== 'POST') return reply();
        const commandId = matching ? JSON.parse(String(init.body)).commandId : 'different-command';
        return new Response(
          JSON.stringify(
            status === 200
              ? { ...projection, commandId }
              : {
                  schemaVersion: 2,
                  result: 'REJECTED',
                  commandId,
                  code,
                },
          ),
          { status },
        );
      }),
    );
    await mount();
    await act(async () => controls.send({ kind: 'STOP' }));
    expect(controls.unknown).toBe(true);
    expect(localStorage.getItem('warwrit.continuous.owner.company')).not.toBeNull();
  },
);

it('releases a matching terminal path refusal and permits subsequent reads', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url, init: RequestInit) => {
      if (init.method !== 'POST') return reply();
      return new Response(
        JSON.stringify({
          schemaVersion: 2,
          result: 'REJECTED',
          commandId: JSON.parse(String(init.body)).commandId,
          code: 'NO_PATH',
        }),
        { status: 422 },
      );
    }),
  );
  await mount();
  await act(async () => controls.send({ kind: 'STOP' }));
  expect(controls.unknown).toBe(false);
  expect(localStorage.getItem('warwrit.continuous.owner.company')).toBeNull();
});
