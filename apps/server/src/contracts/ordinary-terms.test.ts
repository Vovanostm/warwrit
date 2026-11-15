import { describe, expect, it } from 'vitest';

import {
  ordinaryContractGenesis,
  ordinaryContractProfile,
  ordinaryContractProfileVersion,
  ordinaryContractTerms,
  prepareOrdinaryContractCommand,
  readOrdinaryContractState,
} from '@warwrit/game-core';

import { contractView } from './ordinary.js';

const profile = ordinaryContractProfile('ci.m1.lost-scout.01')!;
const issuer = { siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' };
const bank = { siteId: 'tikhaya-gat', areaId: 'tikhaya-gat-bank' };
const gates = {
  DAYLIGHT: true,
  RAIDERS_DEFEATED: false,
  BEAST_DEFEATED: false,
  HERBALIST_PRESENT: true,
  HERBALIST_EXILED: false,
};

function acceptedState() {
  const result = prepareOrdinaryContractCommand(
    profile,
    ordinaryContractGenesis(profile),
    { type: 'ACCEPT' },
    {
      companyId: 'company-a',
      standingAt: issuer,
      atTick: '10',
      expectedRevision: '0',
      sourceEventId: 'accept-1',
      gates,
      battleStarted: false,
    },
  );
  if (result.kind !== 'PREPARED') throw new Error('expected accepted state');
  return result.next;
}

describe('ordinary accepted term projection', () => {
  it('keeps both light-sack scenarios indistinguishable before their clues', () => {
    const stepProjections = [
      'ct.m1.light-sack.measure-error.v1',
      'ct.m1.light-sack.damp-rye.v1',
    ].map((definitionId) => {
      const scenario = ordinaryContractProfileVersion('ci.m1.light-sack.01', definitionId)!;
      const genesis = ordinaryContractGenesis(scenario);
      const accepted = prepareOrdinaryContractCommand(
        scenario,
        genesis,
        { type: 'ACCEPT' },
        {
          companyId: 'company-a',
          standingAt: issuer,
          atTick: '10',
          expectedRevision: genesis.revision,
          sourceEventId: `accept-${definitionId}`,
          gates,
        },
      );
      if (accepted.kind !== 'PREPARED') throw new Error('expected accepted light-sack terms');

      const view = contractView(
        scenario,
        accepted.next,
        'company-a',
        { siteId: 'severny-dvor', areaId: 'severny-dvor-yard' },
        gates,
        false,
      );
      expect(view.steps.every((step) => step.findingTextKey === undefined)).toBe(true);
      return view.steps;
    });

    expect(stepProjections[0]).toEqual(stepProjections[1]);
  });

  it('hides the light-sack truth until the participant records its clue', () => {
    const profile = ordinaryContractProfileVersion(
      'ci.m1.light-sack.01',
      'ct.m1.light-sack.damp-rye.v1',
    )!;
    const farm = { siteId: 'severny-dvor', areaId: 'severny-dvor-yard' };
    const genesis = ordinaryContractGenesis(profile);
    const offered = contractView(profile, genesis, undefined, null, gates, false);
    expect(offered.steps.every((step) => step.findingTextKey === undefined)).toBe(true);

    const accepted = prepareOrdinaryContractCommand(
      profile,
      genesis,
      { type: 'ACCEPT' },
      {
        companyId: 'company-a',
        standingAt: issuer,
        atTick: '10',
        expectedRevision: genesis.revision,
        sourceEventId: 'accept-light-sack',
        gates,
      },
    );
    if (accepted.kind !== 'PREPARED') throw new Error('expected accepted light-sack terms');
    const beforeClue = contractView(profile, accepted.next, 'company-a', farm, gates, false);
    expect(beforeClue.steps.every((step) => step.findingTextKey === undefined)).toBe(true);

    const clue = prepareOrdinaryContractCommand(
      profile,
      accepted.next,
      { type: 'STEP', stepId: 'inspect-granary' },
      {
        companyId: 'company-a',
        standingAt: farm,
        atTick: '11',
        expectedRevision: accepted.next.revision,
        sourceEventId: 'inspect-light-sack-granary',
        gates,
      },
    );
    if (clue.kind !== 'PREPARED') throw new Error('expected the granary clue');
    const afterClue = contractView(profile, clue.next, 'company-a', farm, gates, false);
    expect(afterClue.steps.find((step) => step.stepId === 'inspect-granary')).toMatchObject({
      doneByYou: true,
      findingTextKey: 'contract.ci.m1.light-sack.01.result.light-sack.dry-grain-clue',
    });
    const stranger = contractView(profile, clue.next, 'company-b', farm, gates, false);
    expect(stranger.steps.every((step) => step.findingTextKey === undefined)).toBe(true);
  });

  it('shows two-receipts findings only to the company that recorded them', () => {
    const receipts = ordinaryContractProfile('ci.m1.two-receipts.01')!;
    const genesis = ordinaryContractGenesis(receipts);
    const bereznyak = { siteId: 'bereznyak', areaId: 'bereznyak-green' };
    const accepted = prepareOrdinaryContractCommand(
      receipts,
      genesis,
      { type: 'ACCEPT' },
      {
        companyId: 'company-a',
        standingAt: bereznyak,
        atTick: '10',
        expectedRevision: genesis.revision,
        sourceEventId: 'accept-two-receipts',
        gates,
      },
    );
    if (accepted.kind !== 'PREPARED') throw new Error('expected accepted receipt inquiry');
    const beforeClue = contractView(receipts, accepted.next, 'company-a', bereznyak, gates, false);
    expect(beforeClue.steps.every((step) => step.findingTextKey === undefined)).toBe(true);

    const clue = prepareOrdinaryContractCommand(
      receipts,
      accepted.next,
      { type: 'STEP', stepId: 'inspect-receipt' },
      {
        companyId: 'company-a',
        standingAt: bereznyak,
        atTick: '11',
        expectedRevision: accepted.next.revision,
        sourceEventId: 'inspect-two-receipts',
        gates,
      },
    );
    if (clue.kind !== 'PREPARED') throw new Error('expected receipt clue');
    expect(
      contractView(receipts, clue.next, 'company-a', bereznyak, gates, false).steps.find(
        (step) => step.stepId === 'inspect-receipt',
      ),
    ).toMatchObject({
      doneByYou: true,
      findingTextKey: 'contract.ci.m1.two-receipts.01.result.two-receipts.smudged-seal',
    });
    expect(
      contractView(receipts, clue.next, 'company-b', bereznyak, gates, false).steps.every(
        (step) => step.findingTextKey === undefined,
      ),
    ).toBe(true);
  });

  it('publishes the resolved empty-watch camp state without publishing its private evidence', () => {
    const emptyWatch = ordinaryContractProfile('ci.m1.empty-watch-record.01')!;
    const genesis = ordinaryContractGenesis(emptyWatch);
    expect(contractView(emptyWatch, genesis, 'company-b', issuer, gates, false)).not.toHaveProperty(
      'publicConsequences',
    );

    const projectOutcome = (
      slotId: string,
      viewer = 'company-b',
      currentTick = '20',
      fordRevealed = false,
    ) => {
      const sourceEventId = `empty-watch:${slotId}`;
      const state = readOrdinaryContractState(emptyWatch, {
        ...genesis,
        revision: '8',
        ownerCompanyId: 'company-a',
        acceptedTerms: ordinaryContractTerms(emptyWatch),
        facts: [
          {
            slotId,
            companyId: 'company-a',
            sourceEventId,
            atTick: '20',
          },
          ...(fordRevealed
            ? [
                {
                  slotId: 'empty-watch-old-ford-revealed',
                  companyId: 'company-a',
                  sourceEventId: 'ford-read',
                  atTick: currentTick,
                },
              ]
            : []),
        ],
        outcome: {
          kind: 'SUCCESS',
          companyId: 'company-a',
          sourceEventId,
          atTick: '20',
        },
      });
      return contractView(emptyWatch, state, viewer, issuer, gates, false, currentTick);
    };

    const handedOverEarly = projectOutcome('empty-watch-sack-handed-over', 'company-a', '2019');
    expect(handedOverEarly.publicConsequences).toEqual({
      kind: 'EMPTY_WATCH_RECORD',
      refugeeCamp: 'PRESENT',
      watchman: 'IN_CUSTODY',
    });
    expect(projectOutcome('empty-watch-sack-handed-over', 'company-a', '2020')).toMatchObject({
      completedByYou: true,
      terminalPayout: 'PAID',
      publicConsequences: {
        kind: 'EMPTY_WATCH_RECORD',
        refugeeCamp: 'REMOVED',
        watchman: 'IN_CUSTODY',
      },
    });
    const spared = projectOutcome('empty-watch-proof-destroyed');
    expect(spared.publicConsequences).toEqual({
      kind: 'EMPTY_WATCH_RECORD',
      refugeeCamp: 'PRESENT',
      watchman: 'ON_DUTY',
    });
    expect(spared.steps.every((step) => step.findingTextKey === undefined)).toBe(true);
    expect(spared.steps.some((step) => step.stepId === 'ask-prokop-about-old-ford')).toBe(false);
    expect(spared).toMatchObject({ completedByYou: false, terminalPayout: 'NO_PAYOUT' });
    expect(projectOutcome('empty-watch-proof-destroyed', 'company-a')).toMatchObject({
      completedByYou: false,
      terminalPayout: 'NO_PAYOUT',
    });
    const revealed = projectOutcome('empty-watch-proof-destroyed', 'company-a', '3020', true);
    expect(revealed.steps).toContainEqual(
      expect.objectContaining({
        stepId: 'ask-prokop-about-old-ford',
        doneByYou: true,
        findingTextKey:
          'contract.ci.m1.empty-watch-record.01.result.empty-watch-record.old-ford-revealed',
      }),
    );
    expect(
      projectOutcome('empty-watch-proof-destroyed', 'company-b', '3020', true).steps.some(
        (step) => step.stepId === 'ask-prokop-about-old-ford',
      ),
    ).toBe(false);
  });

  it('projects the saved terms after an offer is changed and reloads an old v1 save', () => {
    const accepted = acceptedState();
    const oldSave = structuredClone(accepted) as unknown as Record<string, unknown>;
    delete oldSave['acceptedTerms'];
    delete oldSave['lastWithdrawal'];
    const editedProfile = {
      ...profile,
      definitionId: 'ct.m1.lost-scout.v2',
      rewardQ: '99000000',
      steps: profile.steps.map((step) =>
        step.stepId === 'deliver' ? { ...step, place: bank } : step,
      ),
    };
    const reloaded = readOrdinaryContractState(editedProfile, oldSave, profile.definitionId);
    const view = contractView(editedProfile, reloaded, 'company-a', issuer, gates, false);
    expect(view.rewardQ).toBe(profile.rewardQ);
    expect(view.steps.find((step) => step.stepId === 'deliver')?.location).toEqual(
      profile.steps.find((step) => step.stepId === 'deliver')?.place,
    );
    expect(view.canWithdraw).toBe(true);
  });

  it('enables withdrawal only for an active participant before battle and without custody', () => {
    const state = acceptedState();
    const beforeBattle = contractView(profile, state, 'company-a', issuer, gates, false);
    const duringBattle = contractView(profile, state, 'company-a', issuer, gates, true);
    const stranger = contractView(profile, state, 'company-b', issuer, gates, false);
    expect(beforeBattle.canWithdraw).toBe(true);
    expect(duringBattle.canWithdraw).toBe(false);
    expect(stranger.canWithdraw).toBe(false);
    const held = readOrdinaryContractState(profile, {
      ...state,
      custody: [{ personId: 'person.lost-scout.01', companyId: 'company-a' }],
    });
    expect(contractView(profile, held, 'company-a', issuer, gates, false).canWithdraw).toBe(false);
  });

  it('keeps an accepted roadside rescue open but redirects terminal delivery after exile', () => {
    const roadside = ordinaryContractProfile('ci.m1.man-by-road.01')!;
    const bereznyak = { siteId: 'bereznyak', areaId: 'bereznyak-green' };
    const present = { ...gates, HERBALIST_PRESENT: true, HERBALIST_EXILED: false };
    const exiled = { ...gates, HERBALIST_PRESENT: false, HERBALIST_EXILED: true };
    const genesis = ordinaryContractGenesis(roadside);
    expect(contractView(roadside, genesis, 'company-a', bereznyak, exiled, false).canAccept).toBe(
      false,
    );

    const accepted = prepareOrdinaryContractCommand(
      roadside,
      genesis,
      { type: 'ACCEPT' },
      {
        companyId: 'company-a',
        standingAt: bereznyak,
        atTick: '10',
        expectedRevision: genesis.revision,
        sourceEventId: 'accept-roadside-rescue',
        gates: present,
      },
    );
    if (accepted.kind !== 'PREPARED') throw new Error('expected accepted roadside rescue');
    const rescued = readOrdinaryContractState(roadside, {
      ...accepted.next,
      facts: [
        {
          slotId: 'man-by-road-sidor-found',
          companyId: 'company-a',
          sourceEventId: 'find-sidor',
          atTick: '11',
        },
        {
          slotId: 'man-by-road-walking',
          companyId: 'company-a',
          sourceEventId: 'take-sidor',
          atTick: '12',
        },
        {
          slotId: 'man-by-road-rest-complete',
          companyId: 'company-a',
          sourceEventId: 'rest-sidor',
          atTick: '320',
        },
      ],
      custody: [{ personId: 'person.sidor', companyId: 'company-a', travelMode: 'ON_FOOT' }],
    });
    const activeAfterExile = contractView(roadside, rescued, 'company-a', bereznyak, exiled, false);
    expect(activeAfterExile.state).toBe('ACTIVE');
    expect(activeAfterExile.steps.find((step) => step.stepId === 'arrive-on-foot')?.blocker).toBe(
      'CONDITION_NOT_MET',
    );
    expect(
      activeAfterExile.steps.find((step) => step.stepId === 'deliver-on-foot-after-exile')
        ?.blocker,
    ).toBeNull();
  });
});
