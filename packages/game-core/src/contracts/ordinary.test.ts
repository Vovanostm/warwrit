import { describe, expect, it } from 'vitest';

import {
  ordinaryContractGenesis,
  ordinaryContractProfile,
  ordinaryContractProfileVersion,
  prepareOrdinaryContractCommand,
  readOrdinaryContractState,
  type ContractPlace,
  type OrdinaryContractState,
} from './ordinary.js';
import { CONTRACT_M1_CATALOGUE } from './manifest.js';
import { validateContractCatalogue } from './validate.js';

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
  it('binds the stable light-sack instance with both source-backed truth paths', () => {
    expect(validateContractCatalogue(CONTRACT_M1_CATALOGUE).valid).toBe(true);
    const edition = CONTRACT_M1_CATALOGUE.editions[0]!;
    expect(
      edition.initialInstances.find((instance) => instance.instanceId === 'ci.m1.light-sack.01')
        ?.definitionId,
    ).toBe('ct.m1.light-sack.measure-error.v1');
    expect(
      edition.initialInstances.find((instance) => instance.instanceId === 'ci.m1.light-sack.01')
        ?.alternateDefinitionIds,
    ).toEqual(['ct.m1.light-sack.damp-rye.v1']);
    expect(edition.definitions.map((definition) => definition.definitionId)).toContain(
      'ct.m1.light-sack.damp-rye.v1',
    );
  });

  it('keeps the light-sack cause fixed in its profile and pays only for matching clues', () => {
    const measure = ordinaryContractProfileVersion(
      'ci.m1.light-sack.01',
      'ct.m1.light-sack.measure-error.v1',
    )!;
    const damp = ordinaryContractProfileVersion(
      'ci.m1.light-sack.01',
      'ct.m1.light-sack.damp-rye.v1',
    )!;
    const farm: ContractPlace = { siteId: 'severny-dvor', areaId: 'severny-dvor-yard' };
    const apply = (
      activeProfile: typeof measure,
      state: OrdinaryContractState,
      companyId: string,
      standingAt: ContractPlace,
      command: Parameters<typeof prepareOrdinaryContractCommand>[2],
    ) =>
      prepareOrdinaryContractCommand(activeProfile, state, command, {
        companyId,
        standingAt,
        atTick: '10',
        expectedRevision: state.revision,
        sourceEventId: `source-${state.revision}`,
        gates,
      });
    const take = (
      activeProfile: typeof measure,
      state: OrdinaryContractState,
      companyId: string,
      standingAt: ContractPlace,
      command: Parameters<typeof prepareOrdinaryContractCommand>[2],
    ) => {
      const result = apply(activeProfile, state, companyId, standingAt, command);
      if (result.kind !== 'PREPARED') throw new Error(`expected PREPARED, got ${result.code}`);
      return result;
    };

    let measureState = take(measure, ordinaryContractGenesis(measure), 'measure-company', CITY, {
      type: 'ACCEPT',
    }).next;
    measureState = take(measure, measureState, 'measure-company', farm, {
      type: 'STEP',
      stepId: 'inspect-granary',
    }).next;
    expect(measureState.facts.map((fact) => fact.slotId)).toContain('light-sack-measure-clue');
    expect(
      apply(measure, measureState, 'measure-company', CITY, { type: 'STEP', stepId: 'report' }),
    ).toMatchObject({ kind: 'PREPARED', payout: { rewardQ: '25000000' } });

    let dampState = take(damp, ordinaryContractGenesis(damp), 'damp-company', CITY, {
      type: 'ACCEPT',
    }).next;
    dampState = take(damp, dampState, 'damp-company', farm, {
      type: 'STEP',
      stepId: 'inspect-granary',
    }).next;
    expect(dampState.facts.map((fact) => fact.slotId)).toContain('light-sack-dry-grain-clue');
    expect(
      apply(damp, dampState, 'damp-company', CITY, { type: 'STEP', stepId: 'report' }),
    ).toMatchObject({ kind: 'REJECTED', code: 'MISSING_EVIDENCE' });
    dampState = take(damp, dampState, 'damp-company', CITY, {
      type: 'STEP',
      stepId: 'ask-gate',
    }).next;
    expect(dampState.facts.map((fact) => fact.slotId)).toContain('light-sack-wet-sacks-clue');
    const reloaded = readOrdinaryContractState(
      damp,
      JSON.parse(JSON.stringify(dampState)) as OrdinaryContractState,
      damp.definitionId,
    );
    expect(reloaded.acceptedTerms?.profileId).toBe(damp.definitionId);
    expect(
      apply(damp, reloaded, 'damp-company', CITY, { type: 'STEP', stepId: 'report' }),
    ).toMatchObject({ kind: 'PREPARED', payout: { rewardQ: '25000000' } });
  });

  it('seals the tracks truth in the accepted scenario and requires matching report evidence', () => {
    const bereznyak: ContractPlace = { siteId: 'bereznyak', areaId: 'bereznyak-green' };
    const gat: ContractPlace = { siteId: 'tikhaya-gat', areaId: 'tikhaya-gat-bank' };
    for (const [definitionId, freshSlot] of [
      ['ct.m1.tracks-over-tracks.kosars.v1', 'tracks-over-tracks-kosars-fresh-traces'],
      ['ct.m1.tracks-over-tracks.bandits.v1', 'tracks-over-tracks-bandits-fresh-traces'],
    ] as const) {
      const scenario = ordinaryContractProfileVersion('ci.m1.tracks-over-tracks.01', definitionId)!;
      expect(validateContractCatalogue(CONTRACT_M1_CATALOGUE).valid).toBe(true);
      const apply = (
        state: OrdinaryContractState,
        companyId: string,
        standingAt: ContractPlace,
        command: Parameters<typeof prepareOrdinaryContractCommand>[2],
      ) =>
        prepareOrdinaryContractCommand(scenario, state, command, {
          companyId,
          standingAt,
          atTick: '10',
          expectedRevision: state.revision,
          sourceEventId: `tracks-${definitionId}-${state.revision}`,
          gates,
        });
      const take = (
        state: OrdinaryContractState,
        companyId: string,
        standingAt: ContractPlace,
        command: Parameters<typeof prepareOrdinaryContractCommand>[2],
      ) => {
        const result = apply(state, companyId, standingAt, command);
        if (result.kind !== 'PREPARED') throw new Error(`expected PREPARED, got ${result.code}`);
        return result.next;
      };

      const companyId = `tracks-${definitionId}`;
      let state = take(ordinaryContractGenesis(scenario), companyId, CITY, { type: 'ACCEPT' });
      state = take(state, companyId, bereznyak, { type: 'STEP', stepId: 'follow-mowers' });
      expect(state.facts.map((fact) => fact.slotId)).toContain(freshSlot);
      state = take(state, companyId, gat, { type: 'STEP', stepId: 'inspect-old-stand' });
      expect(
        apply(state, companyId, CITY, { type: 'STEP', stepId: 'report-no-findings' }),
      ).toMatchObject({ kind: 'REJECTED', code: 'CONDITION_NOT_MET' });
      const paid = apply(state, companyId, CITY, { type: 'STEP', stepId: 'report-tracks' });
      if (paid.kind !== 'PREPARED') throw new Error(`expected paid report, got ${paid.code}`);
      expect(paid.payout).toEqual({ companyId, rewardQ: '40000000' });
      expect(paid.next.outcome?.kind).toBe('SUCCESS');

      let emptyState = take(ordinaryContractGenesis(scenario), `${companyId}-empty`, CITY, {
        type: 'ACCEPT',
      });
      emptyState = take(emptyState, `${companyId}-empty`, gat, {
        type: 'STEP',
        stepId: 'inspect-old-stand',
      });
      const noFindings = apply(emptyState, `${companyId}-empty`, CITY, {
        type: 'STEP',
        stepId: 'report-no-findings',
      });
      if (noFindings.kind !== 'PREPARED')
        throw new Error(`expected no-findings report, got ${noFindings.code}`);
      expect(noFindings.payout).toBeNull();
      expect(noFindings.next.outcome?.kind).toBe('SUCCESS');
    }
  });

  it('requires the complete receipt chain and saves the chosen report recipient', () => {
    expect(validateContractCatalogue(CONTRACT_M1_CATALOGUE).valid).toBe(true);
    const receipts = ordinaryContractProfile('ci.m1.two-receipts.01')!;
    expect(receipts.walletId).toBe('wallet.tikhon-bortnik.bereznyak.01');
    expect(receipts.genesisWalletQ).toBe('120000000');
    expect(receipts.rewardQ).toBe('60000000');
    const bereznyak: ContractPlace = { siteId: 'bereznyak', areaId: 'bereznyak-green' };
    const city = CITY;
    const take = (
      state: OrdinaryContractState,
      stepId: string,
      companyId = 'receipts-company',
      standingAt: ContractPlace = bereznyak,
    ) => {
      const result = prepareOrdinaryContractCommand(
        receipts,
        state,
        { type: 'STEP', stepId },
        {
          companyId,
          standingAt,
          atTick: '10',
          expectedRevision: state.revision,
          sourceEventId: `receipts-${state.revision}`,
          gates,
        },
      );
      return result;
    };

    let state = prepared(
      prepareOrdinaryContractCommand(
        receipts,
        ordinaryContractGenesis(receipts),
        { type: 'ACCEPT' },
        {
          companyId: 'receipts-company',
          standingAt: bereznyak,
          atTick: '10',
          expectedRevision: '0',
          sourceEventId: 'receipts-accept',
          gates,
        },
      ),
    ).next;
    expect(take(state, 'ask-ledger', 'receipts-company', city)).toMatchObject({
      kind: 'REJECTED',
      code: 'MISSING_EVIDENCE',
    });

    state = prepared(take(state, 'inspect-receipt')).next;
    state = prepared(take(state, 'ask-ledger', 'receipts-company', city)).next;
    expect(take(state, 'report-tikhon')).toMatchObject({
      kind: 'REJECTED',
      code: 'MISSING_EVIDENCE',
    });
    state = prepared(take(state, 'ask-gordey', 'receipts-company', city)).next;
    const completion = prepared(take(state, 'report-tikhon'));
    expect(completion.payout).toEqual({ companyId: 'receipts-company', rewardQ: '60000000' });
    expect(completion.next.outcome?.kind).toBe('SUCCESS');
    expect(completion.next.facts.map((fact) => fact.slotId)).toContain(
      'two-receipts-reported-to-tikhon',
    );
    expect(completion.next.facts.map((fact) => fact.slotId)).not.toContain(
      'two-receipts-reported-to-both',
    );

    let other = prepared(
      prepareOrdinaryContractCommand(
        receipts,
        ordinaryContractGenesis(receipts),
        { type: 'ACCEPT' },
        {
          companyId: 'other-company',
          standingAt: bereznyak,
          atTick: '10',
          expectedRevision: '0',
          sourceEventId: 'other-receipts-accept',
          gates,
        },
      ),
    ).next;
    for (const [stepId, place] of [
      ['inspect-receipt', bereznyak],
      ['ask-ledger', city],
      ['ask-gordey', city],
    ] as const) {
      other = prepared(take(other, stepId, 'other-company', place)).next;
    }
    const shared = prepared(take(other, 'report-both', 'other-company', bereznyak));
    expect(shared.payout).toEqual({ companyId: 'other-company', rewardQ: '60000000' });
    expect(shared.next.facts.map((fact) => fact.slotId)).toContain('two-receipts-reported-to-both');
    expect(shared.next.facts.map((fact) => fact.slotId)).not.toContain(
      'two-receipts-reported-to-tikhon',
    );
    expect(shared.next.facts.every((fact) => fact.companyId === 'other-company')).toBe(true);
  });

  it('settles either empty-watch ending once, paying only when the sack is handed over', () => {
    expect(validateContractCatalogue(CONTRACT_M1_CATALOGUE).valid).toBe(true);
    const emptyWatch = ordinaryContractProfile('ci.m1.empty-watch-record.01')!;
    expect(emptyWatch.rewardQ).toBe('65000000');
    expect(emptyWatch.walletId).toBe('wallet.city-treasury.kamenny-brod.01');

    const finish = (endingStepId: 'hand-sack-to-evsey' | 'throw-sack-in-river') => {
      let state = prepared(
        prepareOrdinaryContractCommand(
          emptyWatch,
          ordinaryContractGenesis(emptyWatch),
          { type: 'ACCEPT' },
          {
            companyId: endingStepId,
            standingAt: CITY,
            atTick: '10',
            expectedRevision: '0',
            sourceEventId: `${endingStepId}:accept`,
            gates,
          },
        ),
      ).next;
      expect(
        prepareOrdinaryContractCommand(
          emptyWatch,
          state,
          { type: 'STEP', stepId: endingStepId },
          {
            companyId: endingStepId,
            standingAt: CITY,
            atTick: '11',
            expectedRevision: state.revision,
            sourceEventId: `${endingStepId}:premature`,
            gates,
          },
        ),
      ).toMatchObject({ kind: 'REJECTED', code: 'MISSING_EVIDENCE' });
      for (const stepId of [
        'read-watch-log',
        'ask-bridge-watchman',
        'find-camp',
        'inspect-sack',
        'ask-prokop',
      ]) {
        state = prepared(
          prepareOrdinaryContractCommand(
            emptyWatch,
            state,
            { type: 'STEP', stepId },
            {
              companyId: endingStepId,
              standingAt: CITY,
              atTick: String(BigInt(state.revision) + 11n),
              expectedRevision: state.revision,
              sourceEventId: `${endingStepId}:${stepId}`,
              gates,
            },
          ),
        ).next;
      }
      return prepared(
        prepareOrdinaryContractCommand(
          emptyWatch,
          state,
          { type: 'STEP', stepId: endingStepId },
          {
            companyId: endingStepId,
            standingAt: CITY,
            atTick: '20',
            expectedRevision: state.revision,
            sourceEventId: `${endingStepId}:finish`,
            gates,
          },
        ),
      );
    };

    const handedOver = finish('hand-sack-to-evsey');
    expect(handedOver.payout).toEqual({
      companyId: 'hand-sack-to-evsey',
      rewardQ: '65000000',
    });
    expect(handedOver.next.outcome?.kind).toBe('SUCCESS');
    expect(handedOver.next.facts.map((fact) => fact.slotId)).toContain(
      'empty-watch-sack-handed-over',
    );
    expect(handedOver.next.facts.map((fact) => fact.slotId)).not.toContain(
      'empty-watch-proof-destroyed',
    );

    const destroyed = finish('throw-sack-in-river');
    expect(destroyed.payout).toBeNull();
    expect(destroyed.next.outcome?.kind).toBe('SUCCESS');
    expect(destroyed.next.facts.map((fact) => fact.slotId)).toContain(
      'empty-watch-proof-destroyed',
    );
    expect(destroyed.next.facts.map((fact) => fact.slotId)).toContain(
      'empty-watch-old-ford-revealed',
    );
    const reloaded = readOrdinaryContractState(
      emptyWatch,
      JSON.parse(JSON.stringify(destroyed.next)) as OrdinaryContractState,
      emptyWatch.definitionId,
    );
    expect(
      reloaded.acceptedTerms?.steps.find((step) => step.stepId === 'throw-sack-in-river'),
    ).toHaveProperty('payoutPolicy', 'NO_PAYOUT');
  });

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
