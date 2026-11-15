import { describe, expect, it } from 'vitest';

import {
  ordinaryContractGenesis,
  ordinaryContractProfile,
  prepareOrdinaryContractCommand,
  readOrdinaryContractState,
  type ContractPlace,
  type OrdinaryContractState,
} from './ordinary.js';

const profile = ordinaryContractProfile('ci.m1.lost-scout.01')!;
const CITY: ContractPlace = { siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' };
const BANK: ContractPlace = { siteId: 'tikhaya-gat', areaId: 'tikhaya-gat-bank' };
const gates = { DAYLIGHT: true, RAIDERS_DEFEATED: false, BEAST_DEFEATED: false };

function act(
  state: OrdinaryContractState,
  companyId: string,
  standingAt: ContractPlace | null,
  command: Parameters<typeof prepareOrdinaryContractCommand>[2],
) {
  return prepareOrdinaryContractCommand(profile, state, command, {
    companyId,
    standingAt,
    atTick: '10',
    expectedRevision: state.revision,
    sourceEventId: `source-${state.revision}`,
    gates,
    battleStarted: false,
  });
}

function prepared(result: ReturnType<typeof act>) {
  if (result.kind !== 'PREPARED') throw new Error(`expected PREPARED, got ${result.code}`);
  return result;
}

describe('ordinary contract transitions', () => {
  it('pays the delivering company exactly once and only for a person it holds', () => {
    let state = prepared(
      act(ordinaryContractGenesis(profile), 'owner', CITY, { type: 'ACCEPT' }),
    ).next;
    state = prepared(act(state, 'helper', CITY, { type: 'HELP' })).next;

    // The helper cannot deliver a scout the owner found.
    const found = prepared(act(state, 'owner', BANK, { type: 'STEP', stepId: 'search' }));
    expect(found.payout).toBeNull();
    state = found.next;
    expect(act(state, 'helper', CITY, { type: 'STEP', stepId: 'deliver' })).toEqual({
      kind: 'REJECTED',
      code: 'MISSING_EVIDENCE',
    });
    expect(act(state, 'owner', BANK, { type: 'STEP', stepId: 'deliver' })).toEqual({
      kind: 'REJECTED',
      code: 'WRONG_PLACE',
    });

    const delivered = prepared(act(state, 'owner', CITY, { type: 'STEP', stepId: 'deliver' }));
    expect(delivered.payout).toEqual({ companyId: 'owner', rewardQ: profile.rewardQ });
    expect(delivered.next.custody).toEqual([]);
    expect(act(delivered.next, 'owner', CITY, { type: 'STEP', stepId: 'deliver' })).toEqual({
      kind: 'REJECTED',
      code: 'NOT_AVAILABLE',
    });
  });

  it('rejects strangers, stale revisions and offers taken away from the issuer', () => {
    const genesis = ordinaryContractGenesis(profile);
    expect(act(genesis, 'owner', BANK, { type: 'ACCEPT' })).toEqual({
      kind: 'REJECTED',
      code: 'WRONG_PLACE',
    });
    const accepted = prepared(act(genesis, 'owner', CITY, { type: 'ACCEPT' })).next;
    expect(act(accepted, 'stranger', BANK, { type: 'STEP', stepId: 'search' })).toEqual({
      kind: 'REJECTED',
      code: 'NOT_A_PARTICIPANT',
    });
    expect(
      prepareOrdinaryContractCommand(
        profile,
        accepted,
        { type: 'STEP', stepId: 'search' },
        {
          companyId: 'owner',
          standingAt: BANK,
          atTick: '10',
          expectedRevision: genesis.revision,
          sourceEventId: 'late',
          gates,
        },
      ),
    ).toEqual({ kind: 'REJECTED', code: 'STALE_REVISION' });
  });

  it('keeps accepted v1 terms when the current offer is edited and hydrates old accepted saves', () => {
    const accepted = prepared(
      act(ordinaryContractGenesis(profile), 'owner', CITY, { type: 'ACCEPT' }),
    ).next;
    const changedOffer = {
      ...profile,
      definitionId: 'ct.m1.lost-scout.v2',
      rewardQ: '99000000',
      steps: profile.steps.map((step) =>
        step.stepId === 'deliver' ? { ...step, place: BANK } : step,
      ),
    };
    const reloaded = readOrdinaryContractState(
      changedOffer,
      JSON.parse(JSON.stringify(accepted)) as OrdinaryContractState,
    );
    expect(reloaded.acceptedTerms?.rewardQ).toBe(profile.rewardQ);
    const payout = act(reloaded, 'owner', BANK, { type: 'STEP', stepId: 'search' });
    expect(payout.kind).toBe('PREPARED');
    if (payout.kind !== 'PREPARED') throw new Error('expected the accepted step');
    const completed = act(payout.next, 'owner', CITY, { type: 'STEP', stepId: 'deliver' });
    expect(completed.kind).toBe('PREPARED');
    if (completed.kind !== 'PREPARED') throw new Error('expected the accepted payout');
    expect(completed.payout).toEqual({ companyId: 'owner', rewardQ: profile.rewardQ });

    const legacy = JSON.parse(JSON.stringify(accepted)) as Record<string, unknown>;
    delete legacy['acceptedTerms'];
    delete legacy['lastWithdrawal'];
    expect(
      readOrdinaryContractState(changedOffer, legacy, profile.definitionId).acceptedTerms
        ?.profileId,
    ).toBe(profile.definitionId);
  });

  it('withdraws either participant before the associated battle and saves the outcome', () => {
    let state = prepared(
      act(ordinaryContractGenesis(profile), 'owner', CITY, { type: 'ACCEPT' }),
    ).next;
    state = prepared(act(state, 'helper', CITY, { type: 'HELP' })).next;
    const foreign = act(state, 'stranger', CITY, { type: 'WITHDRAW' });
    expect(foreign).toEqual({ kind: 'REJECTED', code: 'NOT_A_PARTICIPANT' });
    const helperLeave = act(state, 'helper', CITY, { type: 'WITHDRAW' });
    expect(helperLeave.kind).toBe('PREPARED');
    if (helperLeave.kind !== 'PREPARED') throw new Error('expected helper withdrawal');
    expect(helperLeave.next.ownerCompanyId).toBe('owner');
    expect(helperLeave.next.helperCompanyId).toBeNull();
    expect(helperLeave.next.acceptedTerms).toEqual(state.acceptedTerms);
    expect(helperLeave.next.lastWithdrawal).toMatchObject({ companyId: 'helper' });

    const ownerLeave = act(helperLeave.next, 'owner', CITY, { type: 'WITHDRAW' });
    expect(ownerLeave.kind).toBe('PREPARED');
    if (ownerLeave.kind !== 'PREPARED') throw new Error('expected owner withdrawal');
    expect(ownerLeave.payout).toBeNull();
    expect(ownerLeave.next.ownerCompanyId).toBeNull();
    expect(ownerLeave.next.helperCompanyId).toBeNull();
    expect(ownerLeave.next.acceptedTerms).toBeNull();
    expect(readOrdinaryContractState(profile, JSON.parse(JSON.stringify(ownerLeave.next)))).toEqual(
      ownerLeave.next,
    );
    expect(act(ownerLeave.next, 'owner', CITY, { type: 'WITHDRAW' })).toEqual({
      kind: 'REJECTED',
      code: 'NOT_A_PARTICIPANT',
    });
  });

  it('rejects withdrawal after a linked battle starts or the company takes custody', () => {
    let state = prepared(
      act(ordinaryContractGenesis(profile), 'owner', CITY, { type: 'ACCEPT' }),
    ).next;
    expect(
      prepareOrdinaryContractCommand(
        profile,
        state,
        { type: 'WITHDRAW' },
        {
          companyId: 'owner',
          standingAt: CITY,
          atTick: '10',
          expectedRevision: state.revision,
          sourceEventId: 'battle-started',
          gates,
          battleStarted: true,
        },
      ),
    ).toEqual({ kind: 'REJECTED', code: 'NOT_AVAILABLE' });

    const lostScout = ordinaryContractProfile('ci.m1.lost-scout.01')!;
    state = prepared(
      act(ordinaryContractGenesis(lostScout), 'owner', CITY, { type: 'ACCEPT' }),
    ).next;
    state = prepared(act(state, 'owner', BANK, { type: 'STEP', stepId: 'search' })).next;
    expect(act(state, 'owner', CITY, { type: 'WITHDRAW' })).toEqual({
      kind: 'REJECTED',
      code: 'NOT_AVAILABLE',
    });
  });
});
