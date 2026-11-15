import { describe, expect, it } from 'vitest';

import {
  ordinaryContractGenesis,
  ordinaryCustodyTravelLoads,
  ordinaryContractProfile,
  ordinaryContractProfileVersion,
  prepareOrdinaryContractCommand,
  readOrdinaryContractState,
  type ContractPlace,
  type OrdinaryContractState,
} from './ordinary.js';
import { CONTRACT_M1_CATALOGUE } from './manifest.js';
import { validateContractCatalogue } from './validate.js';
import {
  buildNavigationField,
  continuousSurfaceAt,
  findTravelPath,
} from '../world/continuous-movement.js';
import { PAINTED_ATLAS_REGION, PAINTED_ATLAS_SITES } from '../world/painted-atlas/region.js';

const profile = ordinaryContractProfile('ci.m1.lost-scout.01')!;
const CITY: ContractPlace = { siteId: 'kamenny-brod', areaId: 'kamenny-brod-market' };
const BEREZ: ContractPlace = { siteId: 'bereznyak', areaId: 'bereznyak-green' };
const BANK: ContractPlace = { siteId: 'tikhaya-gat', areaId: 'tikhaya-gat-bank' };
const gates = {
  DAYLIGHT: true,
  RAIDERS_DEFEATED: false,
  BEAST_DEFEATED: false,
  HERBALIST_PRESENT: true,
  HERBALIST_EXILED: false,
};

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
  it('keeps all company custody available to food accounting, including guests without a travel mode', () => {
    const state = {
      ...ordinaryContractGenesis(profile),
      custody: [
        { personId: 'person.guest.01', companyId: 'company-a' },
        { personId: 'person.sidor', companyId: 'company-a', travelMode: 'ON_FOOT' as const },
        { personId: 'person.other-company', companyId: 'company-b' },
      ],
    };
    expect(ordinaryCustodyTravelLoads(state, 'company-a')).toEqual([
      { personId: 'person.guest.01' },
      { personId: 'person.sidor', travelMode: 'ON_FOOT' },
    ]);
  });

  it('places Sidor on the charted Bereznyak road, reachable from Agafya on the retained map', () => {
    const roadside = ordinaryContractProfile('ci.m1.man-by-road.01')!;
    const target = roadside.steps[0]!.terrainTarget!;
    const field = buildNavigationField(PAINTED_ATLAS_REGION);
    const sidor = { xFp: target.xFp, zFp: target.zFp };
    const bereznyak = PAINTED_ATLAS_SITES.find((site) => site.siteId === 'bereznyak')!;
    expect(target.mapEdition).toBe(PAINTED_ATLAS_REGION.mapEdition);
    expect(continuousSurfaceAt(field, sidor).overlayId).toBe('dirt_road');
    expect(findTravelPath(field, bereznyak.anchorFp, sidor)).not.toBeNull();
  });

  it('keeps the roadside rescue choices mutually exclusive and waits for an actual foot-rest interval', () => {
    expect(validateContractCatalogue(CONTRACT_M1_CATALOGUE).valid).toBe(true);
    const roadside = ordinaryContractProfile('ci.m1.man-by-road.01')!;
    const issuer: ContractPlace = { siteId: 'bereznyak', areaId: 'bereznyak-green' };
    const target = roadside.steps[0]!.terrainTarget!;
    const position = {
      mapEdition: target.mapEdition,
      xMicroFp: String(target.xFp * 65536),
      zMicroFp: String(target.zFp * 65536),
    };
    const actRoadside = (
      state: OrdinaryContractState,
      type: 'ACCEPT' | 'STEP',
      stepId: string | null,
      atTick: string,
      standingAt: ContractPlace | null,
      terrainPosition = position,
    ) =>
      prepareOrdinaryContractCommand(
        roadside,
        state,
        type === 'ACCEPT' ? { type } : { type, stepId: stepId! },
        {
          companyId: 'road-company',
          standingAt,
          terrainPosition,
          atTick,
          expectedRevision: state.revision,
          sourceEventId: `road-${state.revision}`,
          gates,
        },
      );
    const take = (
      state: OrdinaryContractState,
      stepId: string,
      atTick: string,
      standingAt: ContractPlace | null,
      terrainPosition = position,
    ) => prepared(actRoadside(state, 'STEP', stepId, atTick, standingAt, terrainPosition)).next;

    let state = prepared(
      actRoadside(ordinaryContractGenesis(roadside), 'ACCEPT', null, '10', issuer),
    ).next;
    expect(
      actRoadside(state, 'STEP', 'find-sidor', '11', null, {
        ...position,
        mapEdition: 'seroe-porechye-continuous-v4',
      }),
    ).toMatchObject({ kind: 'REJECTED', code: 'WRONG_PLACE' });
    state = take(state, 'find-sidor', '11', null);
    state = take(state, 'walk-with-stops', '12', null);
    expect(ordinaryCustodyTravelLoads(state, 'road-company')).toEqual([
      { personId: 'person.sidor', travelMode: 'ON_FOOT' },
    ]);
    expect(actRoadside(state, 'STEP', 'fetch-stretcher', '13', issuer)).toMatchObject({
      kind: 'REJECTED',
      code: 'ALTERNATIVE_CHOSEN',
    });
    state = take(state, 'rest-with-sidor', '20', null);
    expect(actRoadside(state, 'STEP', 'continue-after-rest', '319', null)).toMatchObject({
      kind: 'REJECTED',
      code: 'CONDITION_NOT_MET',
    });
    state = take(state, 'continue-after-rest', '320', null);
    expect(actRoadside(state, 'STEP', 'arrive-on-foot', '320', issuer)).toMatchObject({
      kind: 'PREPARED',
      payout: { companyId: 'road-company', rewardQ: '25000000' },
    });
    const delivered = take(state, 'arrive-on-foot', '320', issuer);
    expect(delivered.custody).toEqual([]);
    expect(delivered.outcome?.kind).toBe('SUCCESS');
  });

  it('preserves accepted Sidor in custody and closes without payment after Agafya is exiled', () => {
    const roadside = ordinaryContractProfile('ci.m1.man-by-road.01')!;
    const issuer: ContractPlace = { siteId: 'bereznyak', areaId: 'bereznyak-green' };
    const target = roadside.steps[0]!.terrainTarget!;
    const position = {
      mapEdition: target.mapEdition,
      xMicroFp: String(target.xFp * 65536),
      zMicroFp: String(target.zFp * 65536),
    };
    const present = { ...gates, HERBALIST_PRESENT: true, HERBALIST_EXILED: false };
    const exiled = { ...gates, HERBALIST_PRESENT: false, HERBALIST_EXILED: true };
    const command = (
      state: OrdinaryContractState,
      type: 'ACCEPT' | 'STEP',
      stepId: string | null,
      atTick: string,
      standingAt: ContractPlace | null,
      worldGates = present,
    ) =>
      prepareOrdinaryContractCommand(
        roadside,
        state,
        type === 'ACCEPT' ? { type } : { type, stepId: stepId! },
        {
          companyId: 'road-company',
          standingAt,
          terrainPosition: position,
          atTick,
          expectedRevision: state.revision,
          sourceEventId: `road-${state.revision}`,
          gates: worldGates,
        },
      );
    const take = (
      state: OrdinaryContractState,
      stepId: string,
      atTick: string,
      standingAt: ContractPlace | null,
    ) => prepared(command(state, 'STEP', stepId, atTick, standingAt)).next;

    let state = prepared(
      command(ordinaryContractGenesis(roadside), 'ACCEPT', null, '10', issuer),
    ).next;
    state = take(state, 'find-sidor', '11', null);
    state = take(state, 'walk-with-stops', '12', null);
    state = take(state, 'rest-with-sidor', '20', null);
    state = take(state, 'continue-after-rest', '320', null);

    expect(command(state, 'STEP', 'arrive-on-foot', '321', issuer, exiled)).toMatchObject({
      kind: 'REJECTED',
      code: 'CONDITION_NOT_MET',
    });
    const delivered = command(
      state,
      'STEP',
      'deliver-on-foot-after-exile',
      '321',
      issuer,
      exiled,
    );
    expect(delivered).toMatchObject({ kind: 'PREPARED', payout: null });
    const completed = prepared(delivered).next;
    expect(completed.custody).toEqual([]);
    expect(completed.outcome?.kind).toBe('SUCCESS');
    expect(completed.facts.some((fact) => fact.slotId === 'man-by-road-exile-delivery')).toBe(true);
  });

  it('fetches the one stretcher at Agafya, takes Sidor into stretcher custody, and pays his finite purse once', () => {
    const roadside = ordinaryContractProfile('ci.m1.man-by-road.01')!;
    const issuer: ContractPlace = { siteId: 'bereznyak', areaId: 'bereznyak-green' };
    const target = roadside.steps[0]!.terrainTarget!;
    const position = {
      mapEdition: target.mapEdition,
      xMicroFp: String(target.xFp * 65536),
      zMicroFp: String(target.zFp * 65536),
    };
    const command = (
      state: OrdinaryContractState,
      companyId: string,
      type: 'ACCEPT' | 'HELP' | 'STEP',
      stepId: string | null,
      atTick: string,
      standingAt: ContractPlace | null,
      terrainPosition = position,
    ) =>
      prepareOrdinaryContractCommand(
        roadside,
        state,
        type === 'STEP' ? { type, stepId: stepId! } : { type },
        {
          companyId,
          standingAt,
          terrainPosition,
          atTick,
          expectedRevision: state.revision,
          sourceEventId: `road-${state.revision}`,
          gates,
        },
      );
    let state = prepared(
      command(ordinaryContractGenesis(roadside), 'road-company', 'ACCEPT', null, '10', issuer),
    ).next;
    expect(command(state, 'helper-company', 'HELP', null, '10', issuer)).toMatchObject({
      kind: 'REJECTED',
      code: 'NOT_AVAILABLE',
    });
    const take = (stepId: string, atTick: string, standingAt: ContractPlace | null) => {
      const result = command(state, 'road-company', 'STEP', stepId, atTick, standingAt);
      if (result.kind !== 'PREPARED') throw new Error(`expected PREPARED, got ${result.code}`);
      state = result.next;
      return result;
    };
    take('find-sidor', '11', null);
    take('fetch-stretcher', '20', issuer);
    expect(command(state, 'road-company', 'STEP', 'walk-with-stops', '21', null)).toMatchObject({
      kind: 'REJECTED',
      code: 'ALTERNATIVE_CHOSEN',
    });
    take('load-sidor-on-stretcher', '30', null);
    expect(ordinaryCustodyTravelLoads(state, 'road-company')).toEqual([
      { personId: 'person.sidor', travelMode: 'STRETCHER' },
    ]);
    expect(command(state, 'road-company', 'STEP', 'load-sidor-on-stretcher', '31', null)).toMatchObject({
      kind: 'REJECTED',
      code: 'ALREADY_DONE',
    });
    const result = take('arrive-on-stretcher', '40', issuer);
    expect(result.payout).toEqual({ companyId: 'road-company', rewardQ: '25000000' });
    expect(result.next.custody).toEqual([]);
  });

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
    expect(destroyed.next.facts.map((fact) => fact.slotId)).not.toContain(
      'empty-watch-old-ford-revealed',
    );
    expect(
      emptyWatch.steps.find((step) => step.stepId === 'ask-prokop-about-old-ford')?.produces,
    ).toContain('empty-watch-old-ford-revealed');
    const reloaded = readOrdinaryContractState(
      emptyWatch,
      JSON.parse(JSON.stringify(destroyed.next)) as OrdinaryContractState,
      emptyWatch.definitionId,
    );
    expect(
      reloaded.acceptedTerms?.steps.find((step) => step.stepId === 'throw-sack-in-river'),
    ).toHaveProperty('payoutPolicy', 'NO_PAYOUT');
  });

  it('preserves the foul-well choice: truth is unpaid, accusation pays without the ravine', () => {
    expect(validateContractCatalogue(CONTRACT_M1_CATALOGUE).valid).toBe(true);
    const profile = ordinaryContractProfile('ci.m1.foul-well.01')!;
    expect(profile.rewardQ).toBe('120000000');
    const finish = (ending: 'tell-nikon-about-ravine' | 'name-aghafya') => {
      let state = prepared(
        prepareOrdinaryContractCommand(
          profile,
          ordinaryContractGenesis(profile),
          { type: 'ACCEPT' },
          {
            companyId: ending,
            standingAt: CITY,
            atTick: '10',
            expectedRevision: '0',
            sourceEventId: `${ending}:accept`,
            gates,
          },
        ),
      ).next;
      for (const stepId of ['inspect-well', 'ask-aghafya']) {
        state = prepared(
          prepareOrdinaryContractCommand(
            profile,
            state,
            { type: 'STEP', stepId },
            {
              companyId: ending,
              standingAt: BEREZ,
              atTick: String(BigInt(state.revision) + 11n),
              expectedRevision: state.revision,
              sourceEventId: `${ending}:${stepId}`,
              gates,
            },
          ),
        ).next;
      }
      if (ending === 'tell-nikon-about-ravine') {
        expect(
          prepareOrdinaryContractCommand(
            profile,
            state,
            { type: 'STEP', stepId: ending },
            {
              companyId: ending,
              standingAt: CITY,
              atTick: '13',
              expectedRevision: state.revision,
              sourceEventId: `${ending}:premature`,
              gates,
            },
          ),
        ).toMatchObject({ kind: 'REJECTED', code: 'MISSING_EVIDENCE' });
        for (const stepId of ['search-ravine', 'ask-frol']) {
          state = prepared(
            prepareOrdinaryContractCommand(
              profile,
              state,
              { type: 'STEP', stepId },
              {
                companyId: ending,
                standingAt: BEREZ,
                atTick: String(BigInt(state.revision) + 11n),
                expectedRevision: state.revision,
                sourceEventId: `${ending}:${stepId}`,
                gates,
              },
            ),
          ).next;
        }
      }
      return prepared(
        prepareOrdinaryContractCommand(
          profile,
          state,
          { type: 'STEP', stepId: ending },
          {
            companyId: ending,
            standingAt: CITY,
            atTick: '20',
            expectedRevision: state.revision,
            sourceEventId: `${ending}:finish`,
            gates,
          },
        ),
      );
    };
    const truth = finish('tell-nikon-about-ravine');
    expect(truth.payout).toBeNull();
    expect(truth.next.facts.map((fact) => fact.slotId)).toContain('foul-well-truth-reported');
    const accusation = finish('name-aghafya');
    expect(accusation.payout).toEqual({ companyId: 'name-aghafya', rewardQ: '120000000' });
    expect(accusation.next.facts.map((fact) => fact.slotId)).toContain('foul-well-aghafya-accused');
    expect(accusation.next.facts.map((fact) => fact.slotId)).not.toContain('foul-well-graves');
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
