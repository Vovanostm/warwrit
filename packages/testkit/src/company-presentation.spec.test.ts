import { describe, expect, it } from 'vitest';
import { prepareCompanyEconomy } from '@warwrit/game-core';
import type { FinanceEvidence } from '@warwrit/game-core';
import {
  access,
  cash,
  command,
  context,
  economy,
  place,
  prepared,
  scope,
  tick,
} from './company-economy-fixture.js';

function presentationOffer(
  state: ReturnType<typeof economy>,
  cmd: ReturnType<typeof command>,
  overrides: Partial<Extract<FinanceEvidence, { kind: 'PRESENTATION_SERVICE' }>> = {},
): Extract<FinanceEvidence, { kind: 'PRESENTATION_SERVICE' }> {
  return {
    ...scope(state, 'barber-offer'),
    sourceEventId: cmd.sourceEventId!,
    kind: 'PRESENTATION_SERVICE',
    characterId: 'leader',
    providerId: 'provider',
    location: place,
    serviceId: 'BARBER_HAIR',
    serviceVersion: 's02-barber-hair-1',
    allowedHairStyleIds: ['cropped', 'braided'],
    priceQ: cash(7),
    poolId: 'local',
    providerWalletId: 'wallet-provider',
    moneyAccessEvidenceId: 'money-access',
    expiresAt: state.finance.processedTick,
    ...overrides,
  };
}

function change(
  state: ReturnType<typeof economy>,
  patch: Record<string, unknown>,
  id = 'change-hair',
  offerOverrides: Partial<Extract<FinanceEvidence, { kind: 'PRESENTATION_SERVICE' }>> = {},
) {
  const cmd = command(
    state,
    'ChangePresentation',
    { characterId: 'leader', serviceEvidenceId: 'barber-offer', appearancePatch: patch },
    id,
  );
  const offer = presentationOffer(state, cmd, offerOverrides);
  return prepareCompanyEconomy(state, cmd, context(state, cmd, [access(state), offer]));
}

function wallet(state: ReturnType<typeof economy>, id: string) {
  return state.finance.wallets.find((entry) => entry.walletId === id)!.cashQ;
}

describe('WP02 F02 — bounded paid presentation service', () => {
  it('changes only the offered hairstyle and pays the real local provider atomically', () => {
    const state = economy([1n], 100n);
    const before = state.lifecycle.characters.find((c) => c.identity.characterId === 'leader')!;
    const result = prepared(change(state, { hairStyleId: 'cropped' }));
    const after = result.next.lifecycle.characters.find(
      (c) => c.identity.characterId === 'leader',
    )!;
    const known = result.next.lifecycle.knowledge.characters.find(
      (c) => c.identity.characterId === 'leader',
    )!;

    expect(after.identity).toEqual(before.identity);
    expect(after.conditionIds).toEqual(before.conditionIds);
    expect(after.presentation).toEqual({ schemaVersion: 1, hairStyleId: 'cropped' });
    expect(known.presentation).toEqual(after.presentation);
    expect(wallet(result.next as ReturnType<typeof economy>, 'purse')).toBe('93');
    expect(wallet(result.next as ReturnType<typeof economy>, 'wallet-provider')).toBe('7');
    expect(result.next.finance.movements.at(-1)).toMatchObject({
      amountQ: '7',
      purpose: 'PRESENTATION',
    });
    expect(result.next.lifecycle.knowledge.revision).toBe('1');
    expect(result.next.physical).toEqual(state.physical);
  });

  it('rejects identity/scar/arbitrary cosmetic patches without any partial payment or mutation', () => {
    for (const patch of [
      { birthName: 'Someone else' },
      { sex: 'female' },
      { scarHistory: [] },
      { hairColorId: 'black' },
      { hairStyleId: 'cropped', originId: 'other-origin' },
    ]) {
      const state = economy([1n], 100n);
      const result = change(state, patch, `invalid-${Object.keys(patch).join('-')}`);
      expect(result.kind).toBe('REJECTED');
      expect(result.state).toBe(state);
      expect(wallet(state, 'purse')).toBe('100');
      expect(wallet(state, 'wallet-provider')).toBe('0');
    }
  });

  it('fails closed for an unoffered/expired/mismatched service and for insufficient funds', () => {
    const cases: readonly [
      string,
      ReturnType<typeof economy>,
      Record<string, unknown>,
      Partial<Extract<FinanceEvidence, { kind: 'PRESENTATION_SERVICE' }>>,
    ][] = [
      ['unoffered', economy([1n], 100n), { hairStyleId: 'shaved' }, {}],
      [
        'expired',
        economy([1n], 100n),
        { hairStyleId: 'cropped' },
        { expiresAt: tick(999) },
      ],
      [
        'wrong-character',
        economy([1n], 100n),
        { hairStyleId: 'cropped' },
        { characterId: 'worker-0' },
      ],
      ['insufficient', economy([1n], 5n), { hairStyleId: 'cropped' }, {}],
    ];
    for (const [name, state, patch, overrides] of cases) {
      const result = change(state, patch, `invalid-service-${name}`, overrides);
      expect(result.kind).toBe('REJECTED');
      expect(result.state).toBe(state);
      expect(wallet(state, 'wallet-provider')).toBe('0');
      expect(
        state.lifecycle.characters.find((c) => c.identity.characterId === 'leader')?.presentation,
      ).toBeUndefined();
    }
  });

  it('does not charge for a no-op presentation request', () => {
    const first = prepared(change(economy([1n], 100n), { hairStyleId: 'cropped' })).next;
    const result = change(
      first as ReturnType<typeof economy>,
      { hairStyleId: 'cropped' },
      'change-hair-again',
    );
    expect(result.kind).toBe('REJECTED');
    expect(result.state).toBe(first);
    expect(wallet(first as ReturnType<typeof economy>, 'purse')).toBe('93');
    expect(wallet(first as ReturnType<typeof economy>, 'wallet-provider')).toBe('7');
  });
});
