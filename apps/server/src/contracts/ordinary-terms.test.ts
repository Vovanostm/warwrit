import { describe, expect, it } from 'vitest';

import {
  ordinaryContractGenesis,
  ordinaryContractProfile,
  ordinaryContractProfileVersion,
  prepareOrdinaryContractCommand,
  readOrdinaryContractState,
} from '@warwrit/game-core';

import { contractView, lightSackScenarioProfileId } from './ordinary.js';

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
  it('assigns a stable per-world truth profile and supports both scenarios', () => {
    expect(lightSackScenarioProfileId('world-0')).toBe('ct.m1.light-sack.measure-error.v1');
    expect(lightSackScenarioProfileId('world-1')).toBe('ct.m1.light-sack.damp-rye.v1');
    expect(lightSackScenarioProfileId('world-1')).toBe(lightSackScenarioProfileId('world-1'));
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
});
