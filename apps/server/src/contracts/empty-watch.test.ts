import {
  ordinaryContractGenesis,
  ordinaryContractProfile,
  ordinaryContractTerms,
  readOrdinaryContractState,
} from '@warwrit/game-core';
import { describe, expect, it } from 'vitest';

import { canObserveEmptyWatchFordAt, emptyWatchCampRemovedAt } from './empty-watch.js';

describe('empty-watch delayed facts', () => {
  const profile = ordinaryContractProfile('ci.m1.empty-watch-record.01')!;

  const handedOver = () =>
    readOrdinaryContractState(profile, {
      ...ordinaryContractGenesis(profile),
      revision: '8',
      ownerCompanyId: 'company-a',
      acceptedTerms: ordinaryContractTerms(profile),
      facts: [
        {
          slotId: 'empty-watch-sack-handed-over',
          companyId: 'company-a',
          sourceEventId: 'handed-over',
          atTick: '1000',
        },
      ],
      outcome: {
        kind: 'SUCCESS',
        companyId: 'company-a',
        sourceEventId: 'handed-over',
        atTick: '1000',
      },
    });

  it('matures the handed-over camp after two thousand campaign ticks', () => {
    expect(emptyWatchCampRemovedAt(handedOver())).toBe(3000n);
  });

  it('requires the owner company at Kamenny Brod and the disclosed delay for Prokop’s follow-up', () => {
    const proofDestroyed = readOrdinaryContractState(profile, {
      ...ordinaryContractGenesis(profile),
      revision: '8',
      ownerCompanyId: 'company-a',
      acceptedTerms: ordinaryContractTerms(profile),
      facts: [
        {
          slotId: 'empty-watch-proof-destroyed',
          companyId: 'company-a',
          sourceEventId: 'proof-destroyed',
          atTick: '1000',
        },
      ],
      outcome: {
        kind: 'SUCCESS',
        companyId: 'company-a',
        sourceEventId: 'proof-destroyed',
        atTick: '1000',
      },
    });
    const local = { siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' };
    expect(canObserveEmptyWatchFordAt(proofDestroyed, 'company-a', local, '3999')).toBe(false);
    expect(canObserveEmptyWatchFordAt(proofDestroyed, 'company-a', local, '4000')).toBe(true);
    expect(canObserveEmptyWatchFordAt(proofDestroyed, 'company-b', local, '4000')).toBe(false);
    expect(
      canObserveEmptyWatchFordAt(
        proofDestroyed,
        'company-a',
        { ...local, siteId: 'bereznyak' },
        '4000',
      ),
    ).toBe(false);
  });
});
