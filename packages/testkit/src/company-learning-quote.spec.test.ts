import { describe, expect, it } from 'vitest';
import {
  canonicalJson,
  prepareCompanyEconomy,
  quoteLearningTask,
} from '@warwrit/game-core';
import type {
  CommandOf,
  CompanyEconomyState,
  LearningCourseEvidence,
  LearningQuoteContext,
  SelfStudyEvidence,
} from '@warwrit/game-core';
import {
  access,
  command,
  context,
  economy,
  place,
  scope,
  tick,
  cash,
} from './company-economy-fixture.js';
import { addItem, item } from './company-physical-fixture.js';

function learner(state: CompanyEconomyState) {
  return state.lifecycle.characters.find((entry) => entry.identity.characterId === 'worker-0')!;
}
function withPerks(state: CompanyEconomyState, perks: readonly string[], scholarship = 0) {
  const target = learner(state);
  Object.assign(target, {
    perks: [...perks],
    skills: { ...target.skills, ...(scholarship ? { scholarship } : {}) },
  });
  return state;
}
function withResource(state: CompanyEconomyState, id: string, definitionId: string) {
  return addItem(
    state,
    item(id, definitionId, { kind: 'COMPANY', id: state.lifecycle.companyId }, 'fixture-supply'),
  );
}
function start(
  state: CompanyEconomyState,
  methodId: string,
  goal: CommandOf<'StartLearning'>['payload']['goal'],
  resourceIds: readonly string[],
  maxBudgetQ: string,
): CommandOf<'StartLearning'> {
  return command(state, 'StartLearning', {
    characterId: 'worker-0',
    methodId,
    goal,
    resourceIds,
    budgetPoolId: 'local',
    maxBudgetQ,
  }) as CommandOf<'StartLearning'>;
}
function course(
  state: CompanyEconomyState,
  resourceIds: readonly string[],
): LearningCourseEvidence {
  return {
    ...scope(state, 'course-quote'),
    kind: 'COURSE',
    sourceVersion: 'course-v1',
    expiresAt: tick(BigInt(state.finance.processedTick) + 500n),
    learnerId: 'worker-0',
    location: place,
    resourceIds,
    methodId: 'funded-practice',
    skillId: 'medicine',
    providerId: 'provider',
    mentorId: 'provider',
    poolId: 'local',
    providerWalletId: 'wallet-provider',
    moneyAccessEvidenceId: 'money-access',
    costQPerDay: cash(5_000_000),
    maxTicks: '5000',
  };
}
function quoteContext(
  state: CompanyEconomyState,
  cmd: CommandOf<'StartLearning'>,
  source: LearningCourseEvidence | SelfStudyEvidence,
  includeMoneyAccess = true,
): LearningQuoteContext {
  return {
    ...context(state, cmd, includeMoneyAccess ? [access(state)] : []),
    learningFacts: [source],
  };
}

describe('C03 — bounded real learning quote', () => {
  it('bounds a funded course by real budget and freezes the B02 coefficient snapshot', () => {
    let state = withPerks(economy([1n], 20_000_000n), ['leadership-25-b', 'scholarship-60-b'], 60);
    state = withResource(state, 'course-kit', 'study-book-medicine');
    const cmd = start(
      state,
      'funded-practice',
      { skillId: 'medicine', targetLevel: 25, maxTicks: '9000' },
      ['course-kit'],
      '7000000',
    );
    const before = canonicalJson(state);
    const quote = quoteLearningTask(
      state as Required<CompanyEconomyState>,
      cmd,
      quoteContext(state, cmd, course(state, ['course-kit'])),
    );
    expect(quote).toMatchObject({
      maxTicks: '1750',
      mentorId: 'provider',
      funding: {
        poolId: 'local',
        walletId: 'purse',
        maxBudgetQ: '7000000',
        authorizedBudgetQ: '7000000',
        baseCostQPerDay: '5000000',
        effectiveCostQPerDay: { numerator: '40000000000', denominator: '10000' },
      },
      coefficients: {
        task: {
          trainingCostBps: { numerator: '8000', denominator: '1' },
          trainingDurationBps: { numerator: '9000', denominator: '1' },
        },
        contributingPerkIds: ['leadership-25-b', 'scholarship-60-b'],
      },
    });
    expect(canonicalJson(state)).toBe(before);
    Object.assign(learner(state), { perks: [] });
    expect(quote.coefficients.task.trainingCostBps).toEqual({ numerator: '8000', denominator: '1' });
  });

  it('treats maxBudget as a cap over existing spendable cash, never as another wallet', () => {
    let state = economy([1n], 6_000_000n);
    state = withResource(state, 'course-kit', 'study-book-medicine');
    const cmd = start(
      state,
      'funded-practice',
      { skillId: 'medicine', maxTicks: '5000' },
      ['course-kit'],
      '50000000',
    );
    const quote = quoteLearningTask(
      state as Required<CompanyEconomyState>,
      cmd,
      quoteContext(state, cmd, course(state, ['course-kit'])),
    );
    expect(quote.funding).toMatchObject({ maxBudgetQ: '50000000', authorizedBudgetQ: '6000000' });
    expect(quote.maxTicks).toBe('1200');
    expect(state.finance.wallets.find((entry) => entry.walletId === 'purse')!.cashQ).toBe('6000000');
  });

  it('fails closed without local money access or while F1 already covers the learner', () => {
    let state = withResource(economy([1n], 10_000_000n), 'course-kit', 'study-book-medicine');
    const cmd = start(
      state,
      'funded-practice',
      { skillId: 'medicine', maxTicks: '1000' },
      ['course-kit'],
      '5000000',
    );
    expect(() =>
      quoteLearningTask(
        state as Required<CompanyEconomyState>,
        cmd,
        quoteContext(state, cmd, course(state, ['course-kit']), false),
      ),
    ).toThrow('CONTACT_OR_ACCESS_REQUIRED');
    state = {
      ...state,
      finance: {
        ...state.finance,
        maintenance: [
          {
            agreementId: 'f1',
            kind: 'FIELD_CAMP',
            partyId: 'party',
            location: place,
            beneficiaryIds: ['worker-0'],
            beneficiaryEnds: [],
            startedAt: tick(0),
            endedAt: null,
            knownEndedAt: null,
            sourceId: 'f1-source',
            providerId: null,
            termsVersion: null,
          },
        ],
      },
    };
    expect(() =>
      quoteLearningTask(
        state as Required<CompanyEconomyState>,
        cmd,
        quoteContext(state, cmd, course(state, ['course-kit'])),
      ),
    ).toThrow('INCOMPATIBLE_ACTIVITY');
  });

  it('quotes finite self-study without inventing a mentor or funding and leaves StartLearning disabled', () => {
    let state = withPerks(economy([1n], 1n), ['scholarship-25-a'], 25);
    state = withResource(state, 'medicine-book', 'study-book-medicine');
    const cmd = start(
      state,
      'book-study',
      { workId: 'wound-care-basics', sectionId: 'wound-care-basics-1', maxTicks: '1000' },
      ['medicine-book'],
      '0',
    );
    const source: SelfStudyEvidence = {
      ...scope(state, 'self-study-source'),
      kind: 'SELF_STUDY',
      sourceVersion: 'self-study-v1',
      expiresAt: tick(BigInt(state.finance.processedTick) + 500n),
      learnerId: 'worker-0',
      location: place,
      resourceIds: ['medicine-book'],
      methodId: 'book-study',
      workId: 'wound-care-basics',
      sectionId: 'wound-care-basics-1',
    };
    const ctx = quoteContext(state, cmd, source, false);
    const quote = quoteLearningTask(state as Required<CompanyEconomyState>, cmd, ctx);
    expect(quote).toMatchObject({
      maxTicks: '900',
      mentorId: null,
      funding: null,
      content: {
        workId: 'wound-care-basics',
        sectionId: 'wound-care-basics-1',
        completionTicks: '900',
      },
      coefficients: { task: { studyDurationBps: { numerator: '9000', denominator: '1' } } },
    });
    expect(prepareCompanyEconomy(state, cmd, ctx)).toMatchObject({
      kind: 'REJECTED',
      error: 'UNSUPPORTED_ACTION',
    });
  });
});
