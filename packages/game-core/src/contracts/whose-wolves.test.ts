import { describe, expect, it } from 'vitest';
import {
  WHOSE_WOLVES_ISSUER_ID,
  emptyWhoseWolvesQuestState,
  exposeWhoseWolvesTruth,
  matureWhoseWolvesRaid,
  readWhoseWolvesQuestState,
  recordWhoseWolvesFinding,
  refuseNextWhoseWolvesIssuerOffer,
  settleWhoseWolvesKill,
  whoseWolvesFindingsFor,
  whoseWolvesGuideEntitlement,
  whoseWolvesOfferWasRefused,
} from './whose-wolves.js';

describe('whose-wolves quest state', () => {
  it('persists only the canonical finding fields', () => {
    const finding = {
      companyId: 'company-a',
      findingId: 'bones-and-fish-guts' as const,
      sourceEventId: 'a-bones',
      atTick: '100',
      displayText: 'adapter-only data',
    };

    const recorded = recordWhoseWolvesFinding(emptyWhoseWolvesQuestState(), finding)!;

    expect(recorded.companies[0]?.findings).toEqual([
      { findingId: 'bones-and-fish-guts', sourceEventId: 'a-bones', atTick: '100' },
    ]);
    expect(readWhoseWolvesQuestState(JSON.parse(JSON.stringify(recorded)))).toEqual(recorded);
  });

  it('keeps findings company-private and requires both findings before sparing and exposing Efim', () => {
    const initial = emptyWhoseWolvesQuestState();
    expect(
      recordWhoseWolvesFinding(initial, {
        companyId: 'company-a',
        findingId: 'efim-feeds-the-pack',
        sourceEventId: 'a-efim',
        atTick: '500',
      }),
    ).toBeUndefined();
    const bones = recordWhoseWolvesFinding(initial, {
      companyId: 'company-a',
      findingId: 'bones-and-fish-guts',
      sourceEventId: 'a-bones',
      atTick: '100',
    })!;
    const efim = recordWhoseWolvesFinding(bones, {
      companyId: 'company-a',
      findingId: 'efim-feeds-the-pack',
      sourceEventId: 'a-efim',
      atTick: '500',
    })!;
    const outcome = exposeWhoseWolvesTruth(efim, {
      companyId: 'company-a',
      sourceEventId: 'a-expose',
      atTick: '700',
    })!;

    expect(whoseWolvesFindingsFor(outcome, 'company-a')).toHaveLength(2);
    expect(whoseWolvesFindingsFor(outcome, 'company-b')).toEqual([]);
    expect(outcome.outcome).toMatchObject({ kind: 'PACK_SPARED_AND_EXPOSED', atTick: '700' });
    expect(
      exposeWhoseWolvesTruth(outcome, {
        companyId: 'company-a',
        sourceEventId: 'again',
        atTick: '701',
      }),
    ).toBeUndefined();
    expect(readWhoseWolvesQuestState(JSON.parse(JSON.stringify(outcome)))).toEqual(outcome);
  });

  it('matures the raid exactly seven campaign days after a kill', () => {
    const killed = settleWhoseWolvesKill(emptyWhoseWolvesQuestState(), {
      companyId: 'company-a',
      sourceEventId: 'wolf-pelt-source',
      atTick: '1000',
    })!;
    expect(killed.outcome).toMatchObject({ kind: 'PACK_KILLED', raidDueTick: '8000' });
    expect(matureWhoseWolvesRaid(killed, '7999')).toBeUndefined();
    const raid = matureWhoseWolvesRaid(killed, '8000')!;
    expect(raid.outcome).toMatchObject({ raidAtTick: '8000' });
    expect(matureWhoseWolvesRaid(raid, '9000')).toBeUndefined();
  });

  it('binds the issuer refusal once to the next offer for its company only', () => {
    const state = exposeWhoseWolvesTruth(
      recordWhoseWolvesFinding(
        recordWhoseWolvesFinding(emptyWhoseWolvesQuestState(), {
          companyId: 'company-a',
          findingId: 'bones-and-fish-guts',
          sourceEventId: 'a-bones',
          atTick: '100',
        })!,
        {
          companyId: 'company-a',
          findingId: 'efim-feeds-the-pack',
          sourceEventId: 'a-efim',
          atTick: '200',
        },
      )!,
      { companyId: 'company-a', sourceEventId: 'a-expose', atTick: '300' },
    )!;
    expect(
      refuseNextWhoseWolvesIssuerOffer(state, {
        companyId: 'company-a',
        instanceId: 'ci.m1.future-kondrat-offer.01',
        issuerId: WHOSE_WOLVES_ISSUER_ID,
      }),
    ).toMatchObject({
      companies: [
        { refusalPending: false, deniedOfferInstanceId: 'ci.m1.future-kondrat-offer.01' },
      ],
    });
    const declined = refuseNextWhoseWolvesIssuerOffer(state, {
      companyId: 'company-a',
      instanceId: 'ci.m1.future-kondrat-offer.01',
      issuerId: WHOSE_WOLVES_ISSUER_ID,
    })!;
    expect(whoseWolvesOfferWasRefused(declined, 'company-a', 'ci.m1.future-kondrat-offer.01')).toBe(
      true,
    );
    expect(whoseWolvesOfferWasRefused(declined, 'company-b', 'ci.m1.future-kondrat-offer.01')).toBe(
      false,
    );
    expect(
      refuseNextWhoseWolvesIssuerOffer(declined, {
        companyId: 'company-a',
        instanceId: 'ci.m1.another-kondrat-offer.01',
        issuerId: WHOSE_WOLVES_ISSUER_ID,
      }),
    ).toBeUndefined();
  });

  it('grants only the informed company a 25% guide reduction on the shown route', () => {
    const state = exposeWhoseWolvesTruth(
      recordWhoseWolvesFinding(
        recordWhoseWolvesFinding(emptyWhoseWolvesQuestState(), {
          companyId: 'company-a',
          findingId: 'bones-and-fish-guts',
          sourceEventId: 'a-bones',
          atTick: '100',
        })!,
        {
          companyId: 'company-a',
          findingId: 'efim-feeds-the-pack',
          sourceEventId: 'a-efim',
          atTick: '200',
        },
      )!,
      { companyId: 'company-a', sourceEventId: 'a-expose', atTick: '300' },
    )!;

    expect(whoseWolvesGuideEntitlement(state, 'company-a', 'tikhaya-gat', 'severny-dvor')).toEqual({
      sourceEventId: 'a-expose',
      originSiteId: 'tikhaya-gat',
      destinationSiteId: 'severny-dvor',
      timeMultiplier: { numerator: 3, denominator: 4 },
    });
    expect(
      whoseWolvesGuideEntitlement(state, 'company-b', 'tikhaya-gat', 'severny-dvor'),
    ).toBeUndefined();
    expect(
      whoseWolvesGuideEntitlement(state, 'company-a', 'severny-dvor', 'tikhaya-gat'),
    ).toBeUndefined();
    expect(
      whoseWolvesGuideEntitlement(state, 'company-a', 'tikhaya-gat', 'stone-ford'),
    ).toBeUndefined();
  });
});
