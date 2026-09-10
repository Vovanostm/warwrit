import { describe, expect, it } from 'vitest';
import {
  COMPANY_CATALOGUE,
  PROGRESSION_RULES,
  canonicalJson,
  creditProgression,
  initialSkillProgress,
  prepareCompanyEconomy,
  projectCompanyEconomy,
  readSkillProgress,
} from '@warwrit/game-core';
import type {
  CompanyEconomyState,
  PracticeEvidence,
  SkillProgress,
} from '@warwrit/game-core';
import { command, context, economy, prepared } from './company-economy-fixture.js';

type ExactEntry = readonly [characterId: string, skillId: string];

function exact(state: CompanyEconomyState, entries: readonly ExactEntry[]) {
  for (const [characterId, skillId] of entries) {
    const character = state.lifecycle.characters.find(
      (entry) => entry.identity.characterId === characterId,
    )!;
    Object.assign(character, {
      skills: {
        ...character.skills,
        [skillId]: initialSkillProgress(0, `fixture:${characterId}:${skillId}`),
      },
      aptitudeBySkill: { ...character.aptitudeBySkill, [skillId]: 10000 },
    });
  }
  return state;
}

function skill(state: CompanyEconomyState, characterId: string, skillId: string): SkillProgress {
  return state.lifecycle.characters.find((c) => c.identity.characterId === characterId)!.skills[
    skillId
  ]!;
}

function practice(
  state: CompanyEconomyState,
  characterId = 'worker-0',
  skillId = 'archery',
  methodId: 'weapon-attack' | 'guard-interaction' = 'weapon-attack',
  id = `practice-${characterId}-${skillId}-${state.lifecycle.revision}`,
  sourceEventId?: string,
  levelAtStart = 0,
) {
  const payload = {
    receiptId: `transport-${id}`,
    characterId,
    skillId,
    methodId,
    challengeLevel: 0,
    outcome: 'SUCCESS' as const,
    effortTicks: '1',
  };
  const base = command(state, 'CreditPractice', payload, id, 'DOMAIN_RECEIPT');
  const source = sourceEventId ?? base.sourceEventId;
  const cmd = { ...base, sourceEventId: source };
  const interaction = {
    sourceEventId: source,
    attackerId: methodId === 'weapon-attack' ? characterId : 'threat',
    defenderId: methodId === 'weapon-attack' ? 'threat' : characterId,
    atTick: '995',
    origin: 'EXTERNAL' as const,
  };
  const fact: PracticeEvidence = {
    worldId: state.lifecycle.worldId,
    companyId: state.lifecycle.companyId,
    sourceEventId: source,
    rulesVersion: PROGRESSION_RULES.version,
    catalogueVersion: COMPANY_CATALOGUE.version,
    payload,
    startedAt: '990',
    completedAt: '995',
    levelAtStart,
    aptitudeAtStartBps: 8001,
    proof:
      methodId === 'weapon-attack'
        ? { kind: methodId, interaction, weaponProfile: 'bow' }
        : { kind: methodId, interaction },
  };
  return { cmd, fact, ctx: { ...context(state, cmd), practiceFacts: [fact] } };
}

function rejectUnchanged(
  state: CompanyEconomyState,
  cmd: unknown,
  ctx: Parameters<typeof prepareCompanyEconomy>[2],
  error: string,
) {
  const before = canonicalJson(state);
  expect(prepareCompanyEconomy(state, cmd, ctx)).toMatchObject({
    kind: 'REJECTED',
    state,
    error,
  });
  expect(canonicalJson(state)).toBe(before);
}

describe('A03.2 — exact practice credit through the root preparer', () => {
  it('credits historical work, retains its source and replays after reload', () => {
    const state = exact(economy([1n, 1n]), [['worker-0', 'archery']]);
    Object.assign(state.lifecycle.company!, { runStatus: 'GAME_OVER' });
    const before = readSkillProgress(skill(state, 'worker-0', 'archery'));
    if (typeof before === 'number') throw new Error('fixture must be exact');
    const beforeKnowledge = canonicalJson(state.lifecycle.knowledge);
    const { cmd, fact, ctx } = practice(state);
    const result = prepared(prepareCompanyEconomy(state, cmd, ctx));
    const after = readSkillProgress(skill(result.next, 'worker-0', 'archery'));
    if (typeof after === 'number') throw new Error('credit lost exact state');
    const method = COMPANY_CATALOGUE.methods.find((entry) => entry.id === 'weapon-attack')!;
    expect(after.amount).toEqual(
      creditProgression(before.amount, String(BigInt(method.xp!) * 1000n), {
        aptitudeBps: 8001,
        challengeBps: PROGRESSION_RULES.challenge.baseBps,
        outcomeBps: PROGRESSION_RULES.outcomeBps.success,
      }),
    );
    expect(after.binding).toEqual(before.binding);
    expect(canonicalJson(result.next.lifecycle.knowledge)).toBe(beforeKnowledge);
    expect(result.next.finance.sourceEffects.at(-1)?.requestKey).toBe(canonicalJson(fact));

    const reloaded = JSON.parse(JSON.stringify(result.next)) as CompanyEconomyState;
    const retryBase = command(
      reloaded,
      'CreditPractice',
      { ...cmd.payload, receiptId: 'transport-retry' },
      'practice-retry',
      'DOMAIN_RECEIPT',
    );
    const retry = {
      ...retryBase,
      sourceEventId: cmd.sourceEventId,
      expectedRevision: cmd.expectedRevision,
    };
    const replay = prepared(
      prepareCompanyEconomy(reloaded, retry, context(reloaded, retry)),
    );
    expect(replay.replayed).toBe(true);
    expect(replay.receipt.commandId).toBe(cmd.commandId);
    expect(canonicalJson(replay.next)).toBe(canonicalJson(reloaded));
  });

  it('orders command conflicts before source replay and ignores only receiptId', () => {
    const state = exact(economy([1n, 1n]), [['worker-0', 'archery']]);
    const first = practice(state);
    const credited = prepared(prepareCompanyEconomy(state, first.cmd, first.ctx)).next;
    expect(
      prepared(prepareCompanyEconomy(credited, first.cmd, context(credited, first.cmd))).replayed,
    ).toBe(true);

    const changedSameId = {
      ...first.cmd,
      payload: { ...first.cmd.payload, outcome: 'MEANINGFUL_FAILURE' as const },
    };
    rejectUnchanged(
      credited,
      changedSameId,
      context(credited, changedSameId),
      'IDEMPOTENCY_CONFLICT',
    );

    const retryBase = command(
      credited,
      'CreditPractice',
      { ...first.cmd.payload, receiptId: 'different-transport' },
      'new-command-same-work',
      'DOMAIN_RECEIPT',
    );
    const sameWork = {
      ...retryBase,
      sourceEventId: first.cmd.sourceEventId,
      expectedRevision: first.cmd.expectedRevision,
    };
    expect(
      prepared(prepareCompanyEconomy(credited, sameWork, context(credited, sameWork))).replayed,
    ).toBe(true);
    const changedCause = {
      ...sameWork,
      commandId: 'new-command-conflict',
      payload: { ...sameWork.payload, challengeLevel: 1 },
    };
    rejectUnchanged(
      credited,
      changedCause,
      context(credited, changedCause),
      'IDEMPOTENCY_CONFLICT',
    );
  });

  it('keeps source fan-out by person and skill and credits distinct episodes', () => {
    let state = exact(economy([1n, 1n]), [
      ['worker-0', 'archery'],
      ['worker-0', 'defense'],
      ['worker-1', 'defense'],
    ]);
    const shared = 'source-shared-episode';
    for (const args of [
      ['worker-0', 'archery', 'weapon-attack', 'fanout-attack'],
      ['worker-0', 'defense', 'guard-interaction', 'fanout-defense'],
      ['worker-1', 'defense', 'guard-interaction', 'fanout-person'],
    ] as const) {
      const input = practice(state, ...args, shared);
      state = prepared(prepareCompanyEconomy(state, input.cmd, input.ctx)).next;
    }
    expect(
      new Set(state.finance.applied.slice(-3).map((receipt) => receipt.sourceKey)).size,
    ).toBe(3);

    const before = readSkillProgress(skill(state, 'worker-0', 'archery'));
    if (typeof before === 'number') throw new Error('fixture lost exact state');
    const distinct = practice(
      state,
      'worker-0',
      'archery',
      'weapon-attack',
      'distinct-attack',
      'source-distinct-episode',
      1,
    );
    const next = prepared(prepareCompanyEconomy(state, distinct.cmd, distinct.ctx)).next;
    const after = readSkillProgress(skill(next, 'worker-0', 'archery'));
    if (typeof after === 'number') throw new Error('credit lost exact state');
    expect(BigInt(after.amount.milliXp)).toBeGreaterThan(BigInt(before.amount.milliXp));
  });

  it('rejects inexact accumulators or missing evidence without partial effects', () => {
    const base = economy([1n, 1n]);
    const owned = exact(economy([1n, 1n]), [['worker-0', 'archery']]);
    const legacy = exact(economy([1n, 1n]), [['worker-0', 'archery']]);
    Object.assign(legacy.lifecycle.characters[1]!, {
      skills: { ...legacy.lifecycle.characters[1]!.skills, archery: 0 },
    });
    for (const state of [legacy, base]) {
      const input = practice(state);
      rejectUnchanged(state, input.cmd, input.ctx, 'INVALID_STATE');
    }
    const noEvidence = practice(owned);
    rejectUnchanged(owned, noEvidence.cmd, context(owned, noEvidence.cmd), 'INVALID_SOURCE');
  });

  it('keeps private credit equivalent for the next player request and wages', () => {
    const control = exact(economy([1n, 1n]), [['worker-0', 'archery']]);
    const input = practice(control);
    const credited = prepared(prepareCompanyEconomy(control, input.cmd, input.ctx)).next;
    expect(projectCompanyEconomy(credited, control.lifecycle.companyId)).toEqual(
      projectCompanyEconomy(control, control.lifecycle.companyId),
    );
    expect(credited.finance.accounts).toEqual(control.finance.accounts);

    const payload = {
      companyId: control.lifecycle.companyId,
      name: 'Company II',
      bannerId: 'banner',
    };
    const left = command(credited, 'RenameCompany', payload, 'after-private-credit');
    const right = command(control, 'RenameCompany', payload, 'after-private-credit');
    expect(left.expectedRevision).toBe(right.expectedRevision);
    const leftResult = prepared(prepareCompanyEconomy(credited, left, context(credited, left)));
    const rightResult = prepared(prepareCompanyEconomy(control, right, context(control, right)));
    expect(projectCompanyEconomy(leftResult.next, control.lifecycle.companyId)).toEqual(
      projectCompanyEconomy(rightResult.next, control.lifecycle.companyId),
    );
  });
});
