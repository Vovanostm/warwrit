import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  PROGRESSION_RULES,
  admitPractice,
  canonicalJson,
  executeCompanyCommand,
  prepareCompanyEconomy,
} from '@warwrit/game-core';
import type { PracticeEvidence } from '@warwrit/game-core';
import { command, context, economy } from './company-economy-fixture.js';

const interaction = {
  sourceEventId: 'source-practice',
  attackerId: 'worker-0',
  defenderId: 'threat',
  atTick: '995',
  origin: 'EXTERNAL' as const,
};
const attack = { kind: 'weapon-attack' as const, interaction, weaponProfile: 'bow' };
const guard = {
  kind: 'guard-interaction' as const,
  interaction: { ...interaction, attackerId: 'threat', defenderId: 'worker-0' },
};
const care = {
  kind: 'care-provided' as const,
  providerId: 'worker-0',
  patientId: 'worker-1',
  conditionId: 'wound',
  conditionDefinitionId: 'severe-stable-wound',
  careId: 'wound-care',
  appliedCareReceiptId: 'source-practice',
};
const cycle = {
  kind: 'command-cycle' as const,
  commanderId: 'worker-0',
  cycleId: 'source-practice',
  subordinateIds: ['leader', 'worker-1'],
  interactions: ['leader', 'worker-1'].map((id) => ({
    ...interaction,
    sourceEventId: id,
    attackerId: id,
  })),
};
/** Explicit resolved adapter facts; B04/G09 producers are not running in these examples. */
function fixture(proof: PracticeEvidence['proof'] = attack, skillId = 'archery') {
  const state = economy([1n, 1n]);
  const payload = {
    receiptId: 'receipt',
    characterId: 'worker-0',
    skillId,
    methodId: proof.kind,
    challengeLevel: 0,
    outcome: 'MEANINGFUL_FAILURE' as const,
    effortTicks: '1',
  };
  const cmd = command(state, 'CreditPractice', payload, 'practice', 'DOMAIN_RECEIPT');
  const fact: PracticeEvidence = {
    worldId: state.lifecycle.worldId,
    companyId: state.lifecycle.companyId,
    sourceEventId: cmd.sourceEventId,
    rulesVersion: PROGRESSION_RULES.version,
    catalogueVersion: COMPANY_CATALOGUE.version,
    payload,
    startedAt: '990',
    completedAt: '995',
    levelAtStart: 0,
    aptitudeAtStartBps: 8001,
    proof,
  };
  return { state, cmd, fact, ctx: { ...context(state, cmd), practiceFacts: [fact] } };
}

describe('A03.1 — finite trusted EVENT admission, not root activation', () => {
  it.each([
    ['archery', attack],
    ['defense', guard],
    ['medicine', care],
    ['leadership', cycle],
  ] as const)('admits relevant %s work from frozen inputs', (skill, proof) => {
    const { state, cmd, fact, ctx } = fixture(proof, skill);
    const before = canonicalJson(state);
    const result = admitPractice(cmd, ctx);
    const xp = COMPANY_CATALOGUE.methods.find((m) => m.id === proof.kind)!.xp!;
    expect(result.baseMilliXp).toBe((BigInt(xp) * 1000n).toString());
    expect(result.coefficients).toEqual({
      aptitudeBps: 8001,
      challengeBps: PROGRESSION_RULES.challenge.baseBps,
      outcomeBps: PROGRESSION_RULES.outcomeBps.meaningfulFailure,
    });
    const source = JSON.parse(JSON.stringify(result.source)) as PracticeEvidence;
    expect(source).toEqual(fact);
    Object.assign(fact, { levelAtStart: 100 });
    expect(result.source).toEqual(source);
    expect(canonicalJson(state)).toBe(before);
    expect(prepareCompanyEconomy(state, cmd, ctx)).toMatchObject({ kind: 'REJECTED', state });
    expect(executeCompanyCommand(cmd, ctx)).toMatchObject({ error: 'UNSUPPORTED_ACTION' });
  });

  it('rejects malformed evidence and mismatched request authority', () => {
    const { state, cmd, fact, ctx } = fixture();
    const invalid = [
      [],
      [fact, fact],
      [{ ...fact, worldId: 'foreign' }],
      [{ ...fact, companyId: 'foreign' }],
      [{ ...fact, sourceEventId: 'foreign' }],
      [{ ...fact, rulesVersion: 'future' }],
      [{ ...fact, startedAt: '996' }],
      [{ ...fact, completedAt: '1001' }],
      [{ ...fact, aptitudeAtStartBps: -0 }],
      [{ ...fact, levelAtStart: 101 }],
      [{ ...fact, completedAt: undefined }],
      [{ ...fact, arbitraryXp: '9999999' }],
    ];
    for (const practiceFacts of invalid) {
      const supplied = { ...ctx, practiceFacts: practiceFacts as PracticeEvidence[] };
      expect(() => admitPractice(cmd, supplied)).toThrow();
    }
    for (const patch of [
      { receiptId: 'other' },
      { characterId: 'worker-1' },
      { skillId: 'defense' },
      { methodId: 'guard-interaction' },
      { outcome: 'SUCCESS' },
      { challengeLevel: 1 },
      { effortTicks: '2' },
    ]) {
      const changed = { ...cmd, payload: { ...fact.payload, ...patch } };
      const supplied = { ...ctx, ...context(state, changed) };
      expect(() => admitPractice(changed, supplied)).toThrow();
    }
    const { internalGrant: _grant, ...noGrant } = ctx;
    expect(() => admitPractice(cmd, noGrant)).toThrow();
    const unauthorized = { ...ctx, principal: { kind: 'PLAYER' as const, id: 'principal' } };
    expect(() => admitPractice(cmd, unauthorized)).toThrow();
  });

  it('requires actual method-specific relevance, not payment, empty guard or roster size', () => {
    for (const [skill, proof] of [
      ['archery', { ...attack, weaponProfile: 'spear' }],
      ['archery', { ...attack, interaction: { ...interaction, attackerId: 'other' } }],
      ['archery', { ...attack, interaction: { ...interaction, defenderId: 'worker-0' } }],
      ['defense', { ...guard, interaction: { ...interaction } }],
      ['archery', guard],
      ['medicine', { ...care, providerId: 'payer' }],
      ['medicine', { ...care, conditionDefinitionId: 'minor-field-wound' }],
      ['medicine', { ...care, careId: 'exceptional-care' }],
      ['leadership', { ...cycle, interactions: [cycle.interactions[0]!] }],
      ['leadership', { ...cycle, interactions: [cycle.interactions[0]!, cycle.interactions[0]!] }],
    ] as const) {
      const { cmd, ctx } = fixture(proof, skill);
      expect(() => admitPractice(cmd, ctx)).toThrow();
    }
    for (const patch of [
      { origin: 'MANUFACTURED' },
      { atTick: '989' },
      { sourceEventId: 'foreign' },
    ]) {
      const { cmd, fact, ctx } = fixture();
      const proof = { ...attack, interaction: { ...interaction, ...patch } };
      const supplied = { ...ctx, practiceFacts: [{ ...fact, proof } as PracticeEvidence] };
      expect(() => admitPractice(cmd, supplied)).toThrow();
    }
  });

  it('rejects study shortcuts and treats event effort as evidence, not an XP multiplier', () => {
    const { state, cmd, fact, ctx } = fixture();
    for (const methodId of ['funded-practice', 'book-study', 'brew-test-only']) {
      const changed = { ...cmd, payload: { ...fact.payload, methodId } };
      expect(() => admitPractice(changed, { ...ctx, ...context(state, changed) })).toThrow();
    }
    for (const effortTicks of ['0', '2', '5']) {
      const payload = { ...fact.payload, effortTicks, outcome: 'SUCCESS' as const };
      const changed = { ...cmd, payload };
      const supplied = { ...context(state, changed), practiceFacts: [{ ...fact, payload }] };
      const result = admitPractice(changed, supplied);
      expect(result.baseMilliXp).toBe(admitPractice(cmd, ctx).baseMilliXp);
      expect(result.coefficients.outcomeBps).toBe(PROGRESSION_RULES.outcomeBps.success);
    }
    const payload = { ...fact.payload, effortTicks: '6' };
    const changed = { ...cmd, payload };
    const supplied = { ...context(state, changed), practiceFacts: [{ ...fact, payload }] };
    expect(() => admitPractice(changed, supplied)).toThrow();
  });
});
