import { describe, expect, it } from 'vitest';
import { deriveCombatPracticeProfile } from '@warwrit/game-core';
import { accept, fixture, nextDefend } from './company-combat-aggregate-fixture.js';

describe('combat practice profile producer', () => {
  it('derives a replay-stable profile from the durable receipt sequence', () => {
    const source = fixture();
    const initial = accept(source, source.journal, source.binding.initial, null);
    const journal = nextDefend(source, initial);
    const receiptTicks = journal.receipts.map(() => source.root.lifecycle.campaignTick);
    const input = {
      root: source.root,
      journal,
      receiptTicks,
      profileId: 'first-hunt-practice-profile-2026-10-01-v1',
      challengeLevel: 3,
    };

    const first = deriveCombatPracticeProfile(input);
    const replay = deriveCombatPracticeProfile(input);

    expect(first.status).toBe('READY');
    expect(replay).toEqual(first);
    if (first.status === 'READY') {
      expect(first.profile.bindingId).toBe(source.binding.bindingId);
      expect(first.profile.actionStarts.every((entry) => entry.startReceiptOrdinal > 0)).toBe(true);
    }
  });

  it('names incomplete receipt-time evidence instead of inventing a tick', () => {
    const source = fixture();
    const journal = accept(source, source.journal, source.binding.initial, null);

    expect(
      deriveCombatPracticeProfile({
        root: source.root,
        journal,
        receiptTicks: [],
        profileId: 'first-hunt-practice-profile-2026-10-01-v1',
        challengeLevel: 3,
      }),
    ).toEqual({ status: 'NOT_READY', residuals: ['RECEIPT_TICK_MISSING'] });
  });
});
