// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, expect, it, vi } from 'vitest';
import type { FirstHuntReadResponseDto } from '@warwrit/protocol';

import { FirstHunt } from './FirstHunt.js';

let root: ReturnType<typeof createRoot> | undefined;
afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  window.sessionStorage.clear();
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
});

it.each([false, true])(
  'refreshes the company after confirmed payment, lost reply = %s',
  async (loseReply) => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    let paid = false;
    const bodies: string[] = [];
    const view = (): FirstHuntReadResponseDto => ({
      schemaVersion: 1,
      publicRevision: paid ? '4' : '3',
      contract: {
        instanceId: 'ci.m1.wolf-trail.01',
        definitionEdition: 'ct.m1.wolf-trail.v1',
        termsDigest: 'a'.repeat(64),
        terms: {
          profileId: 'ct.m1.wolf-trail.v1',
          issuerId: 'caller',
          issuerLocation: { siteId: 'bereznyak', areaId: 'bereznyak-green' },
          objectiveLocation: { siteId: 'bereznyak', areaId: 'bereznyak-green' },
          rewardQ: '80000000',
          claimPolicy: 'UNIQUE_CURRENT_BEARER',
          maximumHelpers: 1,
        },
        yourRole: 'OWNER',
        knownState: paid ? 'SETTLED' : 'PROOF_HELD',
        yourJoinIntent: true,
        helperSlot: 'AVAILABLE',
        encounterId: 'saved-battle',
        terminal: { effects: 'APPLIED', hostileRetreated: false },
        pickupTargets: [],
        yourProof: {
          itemId: 'proof',
          containerId: 'carried',
          redemption: paid ? 'REDEEMED' : 'UNREDEEMED',
        },
      },
    });
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        if (init?.method !== 'POST') return new Response(JSON.stringify(view()));
        bodies.push(String(init.body));
        const command = JSON.parse(String(init.body)) as { commandId: string; type: string };
        expect(command.type).toBe('PRESENT');
        paid = true;
        if (loseReply && bodies.length === 1) throw new TypeError('lost response');
        return new Response(
          JSON.stringify({
            schemaVersion: 1,
            commandId: command.commandId,
            ok: true,
            receiptId: 'paid-once',
            publicRevision: '4',
          }),
        );
      }),
    );
    const host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    const onRewardPaid = vi.fn();
    await act(async () =>
      root!.render(
        <FirstHunt
          scope={{ accountId: 'owner', companyId: 'company', instanceId: 'ci.m1.wolf-trail.01' }}
          location="bereznyak"
          visit={{ siteId: 'bereznyak', building: 'elder' }}
          canVisit
          onVisitIssuer={() => {}}
          onJournal={() => {}}
          onUnauthorized={() => {}}
          onRewardPaid={onRewardPaid}
        />,
      ),
    );
    const click = async (label: string) => {
      const button = [...host.querySelectorAll('button')].find(
        (node) => node.textContent === label,
      );
      expect(button).toBeDefined();
      await act(async () => button!.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    };
    await click('Предъявить трофей заказчику');
    if (loseReply) {
      expect(onRewardPaid).not.toHaveBeenCalled();
      await click('Повторить сохранённый запрос');
      expect(bodies[1]).toBe(bodies[0]);
    }
    expect(onRewardPaid).toHaveBeenCalledOnce();
    expect(host.textContent).toContain('Награда получена. Трофей остаётся у отряда.');
    expect(host.textContent).not.toContain('REDEEMED');
  },
);
