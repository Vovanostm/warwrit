import { describe, expect, it } from 'vitest';
import {
  ordinaryContractGenesis,
  ordinaryContractProfile,
  ordinaryContractTerms,
} from '@warwrit/game-core';
import { contractView } from './ordinary.js';
import { foulWellCarePriceQ, foulWellHerbalistRemoved } from './foul-well-state.js';

const truthEnding = {
  companyId: 'truth-company',
  atTick: '1000',
  sourceEventId: 'truth-event',
  slotId: 'foul-well-truth-reported' as const,
};
const accusationEnding = {
  companyId: 'accusation-company',
  atTick: '1000',
  sourceEventId: 'accusation-event',
  slotId: 'foul-well-aghafya-accused' as const,
};

describe('foul well shared consequences', () => {
  it('doubles chapel care only for the company that told the truth', () => {
    expect(foulWellCarePriceQ(truthEnding, 'truth-company')).toBe('10000000');
    expect(foulWellCarePriceQ(truthEnding, 'another-company')).toBe('5000000');
    expect(foulWellCarePriceQ(accusationEnding, 'accusation-company')).toBe('5000000');
    expect(foulWellCarePriceQ(undefined, 'new-company')).toBe('5000000');
  });

  it('removes the herbalist exactly 7000 campaign ticks after the accusation', () => {
    expect(foulWellHerbalistRemoved(accusationEnding, '7999')).toBe(false);
    expect(foulWellHerbalistRemoved(accusationEnding, '8000')).toBe(true);
    expect(foulWellHerbalistRemoved(truthEnding, '9000')).toBe(false);
    expect(foulWellHerbalistRemoved(undefined, '9000')).toBe(false);
  });

  it('shows the doubled chapel price only to the company that told the truth', () => {
    const profile = ordinaryContractProfile('ci.m1.foul-well.01')!;
    const truth = {
      ...ordinaryContractGenesis(profile),
      revision: '1',
      ownerCompanyId: 'truth-company',
      acceptedTerms: ordinaryContractTerms(profile),
      facts: [
        {
          slotId: 'foul-well-truth-reported',
          companyId: 'truth-company',
          sourceEventId: 'truth-event',
          atTick: '1000',
        },
      ],
      outcome: {
        kind: 'SUCCESS' as const,
        companyId: 'truth-company',
        sourceEventId: 'truth-event',
        atTick: '1000',
      },
    };
    const gates = { DAYLIGHT: true, RAIDERS_DEFEATED: false, BEAST_DEFEATED: false };
    const ownerView = contractView(
      profile,
      truth,
      'truth-company',
      null,
      gates,
      false,
      '1000',
      true,
    );
    const otherView = contractView(
      profile,
      truth,
      'other-company',
      null,
      gates,
      false,
      '1000',
      true,
    );

    expect(ownerView.publicConsequences).toMatchObject({
      kind: 'FOUL_WELL',
      chapelCarePriceMultiplier: 2,
    });
    expect(otherView.publicConsequences).toEqual({
      kind: 'FOUL_WELL',
      herbalist: 'IN_VILLAGE',
      herbsAtTrader: 'AVAILABLE',
    });
  });
});
