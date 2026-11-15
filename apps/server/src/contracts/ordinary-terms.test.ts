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
const gates = { DAYLIGHT: true, RAIDERS_DEFEATED: false, BEAST_DEFEATED: false };

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

    const projectOutcome = (slotId: string, viewer = 'company-b') => {
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
        ],
        outcome: {
          kind: 'SUCCESS',
          companyId: 'company-a',
          sourceEventId,
          atTick: '20',
        },
      });
      return contractView(emptyWatch, state, viewer, issuer, gates, false);
    };

    expect(projectOutcome('empty-watch-sack-handed-over', 'company-a')).toMatchObject({
      completedByYou: true,
      terminalPayout: 'PAID',
    });
    expect(projectOutcome('empty-watch-sack-handed-over').publicConsequences).toEqual({
      kind: 'EMPTY_WATCH_RECORD',
      refugeeCamp: 'REMOVED',
      watchman: 'IN_CUSTODY',
    });
    const spared = projectOutcome('empty-watch-proof-destroyed');
    expect(spared.publicConsequences).toEqual({
      kind: 'EMPTY_WATCH_RECORD',
      refugeeCamp: 'PRESENT',
      watchman: 'ON_DUTY',
    });
    expect(spared.steps.every((step) => step.findingTextKey === undefined)).toBe(true);
    expect(spared).toMatchObject({ completedByYou: false, terminalPayout: 'NO_PAYOUT' });
    expect(projectOutcome('empty-watch-proof-destroyed', 'company-a')).toMatchObject({
      completedByYou: false,
      terminalPayout: 'NO_PAYOUT',
    });
  });

  it('publishes grain loss while keeping Yerema’s sleep fact company-private', () => {
    const draggedSack = ordinaryContractProfile('ci.m1.dragged-sack.01')!;
    const genesis = ordinaryContractGenesis(draggedSack);
    const sourceEventId = 'dragged-sack-short-delivery';
    const state = readOrdinaryContractState(draggedSack, {
      ...genesis,
      revision: '5',
      ownerCompanyId: 'company-a',
      acceptedTerms: ordinaryContractTerms(draggedSack),
      facts: [
        {
          slotId: 'dragged-sack-found',
          companyId: 'company-a',
          sourceEventId: 'dragged-sack-pickup',
          atTick: '12',
        },
        {
          slotId: 'dragged-sack-flour-shared',
          companyId: 'company-a',
          sourceEventId: 'dragged-sack-share',
          atTick: '13',
        },
        {
          slotId: 'dragged-sack-yerema-slept',
          companyId: 'company-a',
          sourceEventId: 'dragged-sack-share',
          atTick: '13',
        },
        {
          slotId: 'dragged-sack-delivered-short',
          companyId: 'company-a',
          sourceEventId,
          atTick: '14',
        },
      ],
      cargoCustody: [
        {
          cargoId: 'dragged-sack.01',
          companyId: null,
          pickupCompanyId: 'company-a',
          pickupSourceEventId: 'dragged-sack-pickup',
          pickupAtTick: '12',
          sourceEventId,
          atTick: '14',
        },
      ],
      outcome: { kind: 'SUCCESS', companyId: 'company-a', sourceEventId, atTick: '14' },
    });

    expect(
      contractView(draggedSack, state, 'company-a', issuer, gates, false).publicConsequences,
    ).toEqual({
      kind: 'DRAGGED_SACK',
      northernDvorGrain: 'SHORT_SACK',
      yourCompanyKnowsYeremaSlept: true,
    });
    expect(
      contractView(draggedSack, state, 'company-b', issuer, gates, false).publicConsequences,
    ).toEqual({
      kind: 'DRAGGED_SACK',
      northernDvorGrain: 'SHORT_SACK',
      yourCompanyKnowsYeremaSlept: false,
    });
  });

  it('projects a withdrawn sack return as terminal without payment', () => {
    const draggedSack = ordinaryContractProfile('ci.m1.dragged-sack.01')!;
    const sourceEventId = 'dragged-sack-after-withdrawal';
    const pickupSourceEventId = 'dragged-sack-original-pickup';
    const state = readOrdinaryContractState(draggedSack, {
      ...ordinaryContractGenesis(draggedSack),
      revision: '5',
      facts: [
        {
          slotId: 'dragged-sack-found',
          companyId: 'company-a',
          sourceEventId: pickupSourceEventId,
          atTick: '12',
        },
        {
          slotId: 'dragged-sack-returned-after-withdrawal',
          companyId: 'company-a',
          sourceEventId,
          atTick: '14',
        },
      ],
      cargoCustody: [
        {
          cargoId: 'dragged-sack.01',
          companyId: null,
          pickupCompanyId: 'company-a',
          pickupSourceEventId,
          pickupAtTick: '12',
          sourceEventId,
          atTick: '14',
        },
      ],
      lastWithdrawal: {
        companyId: 'company-a',
        sourceEventId: 'withdraw-command',
        atTick: '13',
      },
      outcome: { kind: 'SUCCESS', companyId: 'company-a', sourceEventId, atTick: '14' },
    });
    expect(contractView(draggedSack, state, 'company-a', issuer, gates, false)).toMatchObject({
      state: 'COMPLETED',
      completedByYou: false,
      terminalPayout: 'NO_PAYOUT',
      terminalFindingTextKey:
        'contract.ci.m1.dragged-sack.01.result.dragged-sack.returned-after-withdrawal',
      yourCargo: [],
      publicConsequences: {
        kind: 'DRAGGED_SACK',
        northernDvorGrain: 'FULL_SACK',
      },
    });
  });

  it('offers only the former holder a return action at the issuer while the sack is carried', () => {
    const draggedSack = ordinaryContractProfile('ci.m1.dragged-sack.01')!;
    const sackIssuer = { siteId: 'severny-dvor', areaId: 'severny-dvor-yard' };
    const state = readOrdinaryContractState(draggedSack, {
      ...ordinaryContractGenesis(draggedSack),
      revision: '4',
      facts: [
        {
          slotId: 'dragged-sack-found',
          companyId: 'company-a',
          sourceEventId: 'dragged-sack-pickup',
          atTick: '12',
        },
      ],
      cargoCustody: [
        {
          cargoId: 'dragged-sack.01',
          companyId: 'company-a',
          pickupCompanyId: 'company-a',
          pickupSourceEventId: 'dragged-sack-pickup',
          pickupAtTick: '12',
          sourceEventId: 'dragged-sack-pickup',
          atTick: '12',
        },
      ],
      lastWithdrawal: {
        companyId: 'company-a',
        sourceEventId: 'dragged-sack-withdrawal',
        atTick: '13',
      },
    });

    expect(contractView(draggedSack, state, 'company-a', sackIssuer, gates, false)).toMatchObject({
      canAccept: false,
      canWithdraw: false,
      canReturnCargo: true,
    });
    expect(contractView(draggedSack, state, 'company-a', issuer, gates, false)).toMatchObject({
      canReturnCargo: false,
      yourCargo: ['dragged-sack.01'],
    });
    expect(contractView(draggedSack, state, 'company-b', sackIssuer, gates, false)).toMatchObject({
      canReturnCargo: false,
      yourCargo: [],
    });
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

  it('enables pre-battle withdrawal for active participants while preserving held-person custody', () => {
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
    expect(contractView(profile, held, 'company-a', issuer, gates, false).canWithdraw).toBe(true);
  });

  it('projects a held rescue return after withdrawal as the holder’s unpaid issuer action', () => {
    for (const scenario of [
      {
        instanceId: 'ci.m1.cellar-rescue.01',
        pickupStep: 'release',
        pickupAt: { siteId: 'staraya-melnitsa', areaId: 'staraya-melnitsa-yard' },
        personId: 'person.cellar-captive.01',
        gates: { ...gates, RAIDERS_DEFEATED: true },
      },
      {
        instanceId: 'ci.m1.lost-scout.01',
        pickupStep: 'search',
        pickupAt: bank,
        personId: 'person.lost-scout.01',
        gates,
      },
    ] as const) {
      const rescue = ordinaryContractProfile(scenario.instanceId)!;
      const run = (
        state: ReturnType<typeof ordinaryContractGenesis>,
        companyId: string,
        commandId: string,
        standingAt: { readonly siteId: string; readonly areaId: string },
        command: Parameters<typeof prepareOrdinaryContractCommand>[2],
      ) =>
        prepareOrdinaryContractCommand(rescue, state, command, {
          companyId,
          standingAt,
          atTick: '10',
          expectedRevision: state.revision,
          sourceEventId: commandId,
          gates: scenario.gates,
        });
      const issuerLocation = rescue.issuerPlace;
      const accepted = run(
        ordinaryContractGenesis(rescue),
        'person-holder',
        `${rescue.instanceId}:accept`,
        issuerLocation,
        { type: 'ACCEPT' },
      );
      if (accepted.kind !== 'PREPARED') throw new Error('expected accepted rescue');
      const pickup = run(
        accepted.next,
        'person-holder',
        `${rescue.instanceId}:pickup`,
        scenario.pickupAt,
        { type: 'STEP', stepId: scenario.pickupStep },
      );
      if (pickup.kind !== 'PREPARED') throw new Error('expected rescued person');
      const withdrawn = run(
        pickup.next,
        'person-holder',
        `${rescue.instanceId}:withdraw`,
        scenario.pickupAt,
        { type: 'WITHDRAW' },
      );
      if (withdrawn.kind !== 'PREPARED')
        throw new Error(
          `expected withdrawal for ${rescue.instanceId}: ${JSON.stringify(withdrawn)}`,
        );

      const holderView = contractView(
        rescue,
        withdrawn.next,
        'person-holder',
        issuerLocation,
        scenario.gates,
        false,
      );
      expect(holderView).toMatchObject({
        state: 'ACTIVE',
        yourRole: 'NONE',
        yourCustody: [scenario.personId],
        canAccept: false,
        canWithdraw: false,
      });
      expect(holderView.steps.find((step) => step.stepId === 'deliver')).toMatchObject({
        blocker: null,
      });
      const strangerView = contractView(
        rescue,
        withdrawn.next,
        'stranger',
        issuerLocation,
        scenario.gates,
        false,
      );
      expect(strangerView).toMatchObject({
        yourCustody: [],
      });
      expect(strangerView.steps.find((step) => step.stepId === 'deliver')).toMatchObject({
        blocker: 'NOT_A_PARTICIPANT',
      });

      const returned = run(
        withdrawn.next,
        'person-holder',
        `${rescue.instanceId}:return`,
        issuerLocation,
        { type: 'STEP', stepId: 'deliver' },
      );
      if (returned.kind !== 'PREPARED') throw new Error('expected returned person');
      expect(returned.payout).toBeNull();
      expect(
        contractView(rescue, returned.next, 'person-holder', issuerLocation, scenario.gates, false),
      ).toMatchObject({
        state: 'COMPLETED',
        terminalPayout: 'NO_PAYOUT',
        completedByYou: false,
        yourCustody: [],
      });
    }
  });

  it('projects the dragged-sack deadline and expired return action from campaign time', () => {
    const draggedSack = ordinaryContractProfile('ci.m1.dragged-sack.01')!;
    const terms = ordinaryContractTerms(draggedSack, '10');
    const state = readOrdinaryContractState(draggedSack, {
      ...ordinaryContractGenesis(draggedSack),
      revision: '3',
      ownerCompanyId: 'company-a',
      acceptedTerms: terms,
      facts: [
        {
          slotId: 'dragged-sack-found',
          companyId: 'company-a',
          sourceEventId: 'sack-pickup',
          atTick: '20',
        },
      ],
      cargoCustody: [
        {
          cargoId: 'dragged-sack.01',
          companyId: 'company-a',
          pickupCompanyId: 'company-a',
          pickupSourceEventId: 'sack-pickup',
          pickupAtTick: '20',
          sourceEventId: 'sack-pickup',
          atTick: '20',
        },
      ],
    });
    const yard = { siteId: 'severny-dvor', areaId: 'severny-dvor-yard' };
    expect(contractView(draggedSack, state, 'company-a', yard, gates, false, '1009')).toMatchObject(
      {
        state: 'ACTIVE',
        deadlineTicks: '1000',
        canReturnCargo: false,
        yourCargo: ['dragged-sack.01'],
      },
    );
    expect(contractView(draggedSack, state, 'company-a', yard, gates, false, '1010')).toMatchObject(
      {
        state: 'EXPIRED',
        terminalPayout: 'NO_PAYOUT',
        canReturnCargo: true,
        yourCargo: ['dragged-sack.01'],
      },
    );
    expect(contractView(draggedSack, state, 'company-b', yard, gates, false, '1010')).toMatchObject(
      {
        state: 'EXPIRED',
        canReturnCargo: false,
        yourCargo: [],
      },
    );
  });
});
