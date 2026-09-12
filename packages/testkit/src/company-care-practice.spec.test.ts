import { describe, expect, it } from 'vitest';
import {
  canonicalJson,
  initialSkillProgress,
  prepareCompanyEconomy,
  readSkillProgress,
} from '@warwrit/game-core';
import type { CompanyEconomyState, PhysicalEvidence } from '@warwrit/game-core';
import {
  command,
  context,
  economy,
  physicalScope,
  place,
  prepared,
} from './company-economy-fixture.js';
import { addItem, condition, item, withCareProvider } from './company-physical-fixture.js';

function memberMedic(state: CompanyEconomyState, characterId = 'leader') {
  const exact = initialSkillProgress(1, `b04-${characterId}-medicine`);
  const patch = (
    characters: CompanyEconomyState['lifecycle']['characters'],
    known: boolean,
  ) =>
    characters.map((character) =>
      character.identity.characterId === characterId
        ? {
            ...character,
            skills: { ...character.skills, medicine: known ? 1 : exact },
            aptitudeBySkill: { ...character.aptitudeBySkill, medicine: 10000 },
          }
        : character,
    );
  return {
    ...state,
    lifecycle: {
      ...state.lifecycle,
      characters: patch(state.lifecycle.characters, false),
      knowledge: {
        ...state.lifecycle.knowledge,
        characters: patch(state.lifecycle.knowledge.characters, true),
      },
    },
  };
}

function injured(
  state: CompanyEconomyState,
  definitionId: 'severe-stable-wound' | 'critical-bleed',
) {
  const stocked = addItem(
    state,
    item('medical-b04', 'medical-unit', { kind: 'COMPANY', id: 'company' }, 'fixture-supply', 2),
  );
  return condition(stocked, 'worker-0', definitionId, `b04-${definitionId}`).next;
}

function activeCondition(state: CompanyEconomyState, definitionId: string) {
  return state.physical!.conditions.find(
    (entry) =>
      entry.characterId === 'worker-0' &&
      entry.definitionId === definitionId &&
      entry.resolvedAt === null,
  )!;
}

function materialCare(
  state: CompanyEconomyState,
  conditionId: string,
  careDefinitionId: 'wound-care' | 'stabilize',
  providerId: string,
  id: string,
  practiceChallengeLevel?: number,
) {
  const cmd = command(state, 'ApplyCare', {
    characterId: 'worker-0',
    conditionId,
    careDefinitionId,
    resourceOrProviderReceiptId: id,
  });
  const fact: PhysicalEvidence = {
    ...physicalScope(state, id),
    kind: 'CARE_FULFILLMENT',
    characterId: 'worker-0',
    conditionId,
    careDefinitionId,
    providerId,
    location: place,
    channel: 'MATERIAL',
    resourceItemId: 'medical-b04',
    resourceContainerId: 'fixture-supply',
    ...(practiceChallengeLevel === undefined ? {} : { practiceChallengeLevel }),
  };
  return {
    cmd,
    fact,
    result: prepareCompanyEconomy(state, cmd, context(state, cmd, [], [], [fact])),
  };
}

function medicine(state: CompanyEconomyState, characterId: string) {
  const stored = state.lifecycle.characters.find(
    (entry) => entry.identity.characterId === characterId,
  )!.skills['medicine'];
  expect(stored).toBeDefined();
  const progress = readSkillProgress(stored);
  if (typeof progress === 'number') throw new Error('fixture medicine must be exact');
  return progress;
}

describe('B04 — care-provided practice from actual performed care', () => {
  it('credits exactly the actual member provider after needed care and replays once', () => {
    const state = injured(memberMedic(economy([1n], 100n, 1000)), 'severe-stable-wound');
    const target = activeCondition(state, 'severe-stable-wound');
    const patientBefore = canonicalJson(
      state.lifecycle.characters.find((entry) => entry.identity.characterId === 'worker-0')!.skills,
    );
    const before = medicine(state, 'leader');
    const preparedCare = materialCare(
      state,
      target.conditionId,
      'wound-care',
      'leader',
      'b04-care-1',
      1,
    );
    const next = prepared(preparedCare.result).next;
    const after = medicine(next, 'leader');

    expect(BigInt(after.amount.milliXp) - BigInt(before.amount.milliXp)).toBe(40000n);
    expect(after.amount.carry).toBe(before.amount.carry);
    expect(
      canonicalJson(
        next.lifecycle.characters.find(
          (entry) => entry.identity.characterId === 'worker-0',
        )!.skills,
      ),
    ).toBe(patientBefore);
    expect(next.finance.sourceEffects).toHaveLength(1);
    expect(next.finance.sourceEffects[0]?.requestKey).toContain('care-provided');
    expect(next.physical!.items.find((entry) => entry.itemId === 'medical-b04')?.quantity).toBe(1);

    const replay = prepareCompanyEconomy(
      next,
      preparedCare.cmd,
      context(next, preparedCare.cmd, [], [], [preparedCare.fact]),
    );
    expect(replay).toMatchObject({ kind: 'PREPARED', replayed: true, state: next, next });
    expect(
      medicine((replay as Extract<typeof replay, { kind: 'PREPARED' }>).next, 'leader'),
    ).toEqual(after);
  });

  it('rolls back performed-care effects when required member practice evidence is incomplete', () => {
    const state = injured(memberMedic(economy([1n], 100n, 1000)), 'severe-stable-wound');
    const target = activeCondition(state, 'severe-stable-wound');
    const before = canonicalJson(state);
    const result = materialCare(
      state,
      target.conditionId,
      'wound-care',
      'leader',
      'b04-missing-challenge',
    ).result;

    expect(result).toMatchObject({ kind: 'REJECTED', state, error: 'INVALID_SOURCE' });
    expect(canonicalJson(state)).toBe(before);
    expect(state.physical!.items.find((entry) => entry.itemId === 'medical-b04')?.quantity).toBe(2);
    expect(state.finance.sourceEffects).toHaveLength(0);
  });

  it('does not invent company progression for an external provider and rejects unneeded repeat care', () => {
    const state = injured(withCareProvider(economy([1n], 100n, 1000)), 'severe-stable-wound');
    const target = activeCondition(state, 'severe-stable-wound');
    const providerBefore = canonicalJson(
      state.lifecycle.characters.find((entry) => entry.identity.characterId === 'provider')!.skills,
    );
    const first = prepared(
      materialCare(state, target.conditionId, 'wound-care', 'provider', 'b04-external').result,
    ).next;

    expect(first.finance.sourceEffects).toHaveLength(0);
    expect(
      canonicalJson(
        first.lifecycle.characters.find((entry) => entry.identity.characterId === 'provider')!
          .skills,
      ),
    ).toBe(providerBefore);

    const repeated = materialCare(
      first,
      target.conditionId,
      'wound-care',
      'provider',
      'b04-unneeded-repeat',
    ).result;
    expect(repeated).toMatchObject({ kind: 'REJECTED', state: first, error: 'INVALID_ARGUMENT' });
    expect(first.finance.sourceEffects).toHaveLength(0);
  });

  it('treats stabilization plus its inherited prerequisite as one member practice episode', () => {
    const state = injured(memberMedic(economy([1n], 100n, 1000)), 'critical-bleed');
    const critical = activeCondition(state, 'critical-bleed');
    const before = medicine(state, 'leader');
    const stabilized = prepared(
      materialCare(state, critical.conditionId, 'stabilize', 'leader', 'b04-stabilize', 1).result,
    ).next;
    const after = medicine(stabilized, 'leader');
    const stable = activeCondition(stabilized, 'severe-stable-wound');

    expect(BigInt(after.amount.milliXp) - BigInt(before.amount.milliXp)).toBe(40000n);
    expect(stabilized.finance.sourceEffects).toHaveLength(1);
    expect(stable.care).toMatchObject({
      careDefinitionId: 'stabilize',
      channel: 'INHERITED_STABILIZATION',
      providerId: 'leader',
    });

    const duplicate = materialCare(
      stabilized,
      stable.conditionId,
      'wound-care',
      'leader',
      'b04-second-prerequisite',
      1,
    ).result;
    expect(duplicate).toMatchObject({
      kind: 'REJECTED',
      state: stabilized,
      error: 'INVALID_ARGUMENT',
    });
    expect(stabilized.finance.sourceEffects).toHaveLength(1);
  });
});
