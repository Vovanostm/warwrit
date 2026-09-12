import { describe, expect, it } from 'vitest';
import { prepareCompanyEconomy, quoteLearningTask } from '@warwrit/game-core';
import type {
  CommandOf,
  CompanyEconomyState,
  LearningQuoteContext,
  LearningSourceEvidence,
} from '@warwrit/game-core';
import {
  access,
  cash,
  command,
  context,
  economy,
  place,
  scope,
  tick,
} from './company-economy-fixture.js';
import { addItem, item } from './company-physical-fixture.js';

function learner(state: CompanyEconomyState) {
  return state.lifecycle.characters.find((entry) => entry.identity.characterId === 'worker-0')!;
}
function resource(state: CompanyEconomyState, id: string) {
  return addItem(
    state,
    item(
      id,
      'study-book-medicine',
      { kind: 'COMPANY', id: state.lifecycle.companyId },
      'fixture-supply',
    ),
  );
}
function start(
  state: CompanyEconomyState,
  methodId: string,
  goal: CommandOf<'StartLearning'>['payload']['goal'],
  resourceIds: readonly string[],
  maxBudgetQ: string,
) {
  return command(state, 'StartLearning', {
    characterId: 'worker-0',
    methodId,
    goal,
    resourceIds,
    budgetPoolId: 'local',
    maxBudgetQ,
  }) as CommandOf<'StartLearning'>;
}
function course(state: CompanyEconomyState): LearningSourceEvidence {
  return {
    ...scope(state, 'course-quote'),
    kind: 'COURSE',
    sourceVersion: 'course-v1',
    expiresAt: tick(BigInt(state.finance.processedTick) + 500n),
    learnerId: 'worker-0',
    location: place,
    resourceIds: ['course-kit'],
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
  source: LearningSourceEvidence,
  money = true,
): LearningQuoteContext {
  return { ...context(state, cmd, money ? [access(state)] : []), learningFacts: [source] };
}

describe('C03 — bounded real learning quote', () => {
  it('bounds by real spendable funds and freezes the B02 coefficient snapshot', () => {
    const state = resource(economy([1n], 7_000_000n), 'course-kit');
    Object.assign(learner(state), {
      perks: ['leadership-25-b', 'scholarship-60-b'],
      skills: { ...learner(state).skills, scholarship: 60 },
    });
    const cmd = start(
      state,
      'funded-practice',
      { skillId: 'medicine', targetLevel: 25, maxTicks: '9000' },
      ['course-kit'],
      '50000000',
    );
    const quote = quoteLearningTask(
      state as Required<CompanyEconomyState>,
      cmd,
      quoteContext(state, cmd, course(state)),
    );
    expect(quote).toMatchObject({
      maxTicks: '1750',
      mentorId: 'provider',
      funding: {
        walletId: 'purse',
        authorizedBudgetQ: '7000000',
        costQPerDay: { numerator: '40000000000', denominator: '10000' },
      },
      coefficients: {
        task: {
          trainingCostBps: { numerator: '8000', denominator: '1' },
          trainingDurationBps: { numerator: '9000', denominator: '1' },
        },
      },
    });
    Object.assign(learner(state), { perks: [] });
    expect(quote.coefficients.task.trainingCostBps.numerator).toBe('8000');
  });

  it('rejects missing local funding access and F1 overlap', () => {
    let state = resource(economy([1n], 10_000_000n), 'course-kit');
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
        quoteContext(state, cmd, course(state), false),
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
        quoteContext(state, cmd, course(state)),
      ),
    ).toThrow('INCOMPATIBLE_ACTIVITY');
  });

  it('bounds self-study without invented mentor/funding and keeps StartLearning disabled', () => {
    const state = resource(economy([1n], 1n), 'medicine-book');
    Object.assign(learner(state), {
      perks: ['scholarship-25-a'],
      skills: { ...learner(state).skills, scholarship: 25 },
    });
    const cmd = start(
      state,
      'book-study',
      { workId: 'wound-care-basics', sectionId: 'wound-care-basics-1', maxTicks: '1000' },
      ['medicine-book'],
      '0',
    );
    const source: LearningSourceEvidence = {
      ...scope(state, 'self-study'),
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
    expect(quoteLearningTask(state as Required<CompanyEconomyState>, cmd, ctx)).toMatchObject({
      maxTicks: '900',
      mentorId: null,
      funding: null,
    });
    expect(prepareCompanyEconomy(state, cmd, ctx)).toMatchObject({
      kind: 'REJECTED',
      error: 'UNSUPPORTED_ACTION',
    });
  });
});
