// @vitest-environment jsdom
import { act, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { CombatLabView, EncounterCommandDto, PlaygroundInspection } from '@warwrit/protocol';
import { SandboxCombat, sandboxPendingKey } from './SandboxCombat.js';

vi.mock('../combat-lab/BattleView.js', () => ({
  BattleView: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
const view: CombatLabView = {
  version: 1,
  sessionId: '11111111-1111-4111-8111-111111111111',
  battleId: '11111111-1111-4111-8111-111111111111',
  scenarioId: 'sprite-6v6-v1',
  rulesetId: 'm1-domain-bridge-v5',
  controlledSideId: 'human',
  viewRevision: 0,
  status: 'active',
  round: 1,
  map: { hexes: [], blocked: [] },
  sides: [],
  units: [],
  initiativeOrder: [],
  turnIndex: 0,
  activation: { id: 'activation', actorId: 'actor', actionPoints: { current: 4, maximum: 4 } },
  events: [],
  omittedEventPrefix: 0,
  outcome: null,
};
const inspection = {
  sandbox: { id: 'sandbox' },
  encounterId: view.battleId,
  view,
  audit: [],
} as unknown as PlaygroundInspection;
const roots: ReturnType<typeof createRoot>[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await act(() => root.unmount());
  document.body.replaceChildren();
  sessionStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function mount() {
  const node = document.createElement('div');
  document.body.append(node);
  const root = createRoot(node);
  roots.push(root);
  const changed = vi.fn();
  await act(() =>
    root.render(
      <SandboxCombat
        api="/api/dev/playground/api"
        accountId="owner"
        inspection={inspection}
        onInspection={changed}
        onPending={() => {}}
      />,
    ),
  );
  return { root, changed, node };
}
async function click(node: HTMLElement, text: string) {
  const button = [...node.querySelectorAll('button')].find((item) =>
    item.textContent?.includes(text),
  );
  expect(button).toBeDefined();
  await act(async () => button!.click());
}
it.each(['lost response', '401', '403', 'malformed success', 'failed cleanup'])(
  'retains and restores exact intent after %s; blocks new commands until authoritative retry',
  async (failure) => {
    const requests: string[] = [];
    let first = true;
    let remove: ReturnType<typeof vi.spyOn> | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, options?: RequestInit) => {
        if (options?.method !== 'POST')
          return new Response(
            JSON.stringify({ ...inspection, view: { ...view, viewRevision: 1 } }),
          );
        const body = String(options.body);
        requests.push(body);
        const dto = JSON.parse(body) as EncounterCommandDto;
        if (first) {
          first = false;
          if (failure === 'lost response') throw new Error('dropped after commit');
          if (failure === '401' || failure === '403')
            return new Response('{}', { status: Number(failure) });
          if (failure === 'malformed success') return new Response('{}');
          if (failure === 'failed cleanup')
            remove = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
              throw new Error('storage unavailable');
            });
        }
        return new Response(
          JSON.stringify({
            version: 1,
            encounterId: dto.encounterId,
            commandId: dto.commandId,
            receiptId: `${dto.encounterId}:1`,
            status: 'accepted',
            revision: 1,
          }),
        );
      }),
    );
    const initial = await mount();
    await click(initial.node, 'Step');
    expect(requests).toHaveLength(1);
    const saved = sessionStorage.getItem(sandboxPendingKey);
    expect(saved).not.toBeNull();
    expect(initial.node.textContent).toContain('Ответ не подтверждён');
    await click(initial.node, 'Step');
    expect(requests).toHaveLength(1);
    await act(() => initial.root.unmount());
    roots.splice(roots.indexOf(initial.root), 1);
    remove?.mockRestore();
    const reopened = await mount();
    expect(reopened.node.textContent).toContain('Ответ не подтверждён');
    await click(reopened.node, 'Повторить тот же боевой запрос');
    expect(requests).toEqual([requests[0], requests[0]]);
    expect(sessionStorage.getItem(sandboxPendingKey)).toBeNull();
    expect(reopened.changed).toHaveBeenCalledWith(
      expect.objectContaining({ view: expect.objectContaining({ viewRevision: 1 }) }),
    );
  },
);
