import { describe, expect, it } from 'vitest';
import { admitLearningSource, canonicalJson } from '@warwrit/game-core';
import type {
  CommandOf,
  CompanyEconomyState,
  LearningSourceContext,
  LearningSourceEvidence,
  MaterializedCompanyState,
} from '@warwrit/game-core';
import { command, context, economy, place, scope, tick } from './company-economy-fixture.js';
import { addItem, item } from './company-physical-fixture.js';

type Root = CompanyEconomyState & MaterializedCompanyState;

function resource(state: CompanyEconomyState, id = 'course-kit'): Root {
  return addItem(
    state,
    item(
      id,
      'study-book-medicine',
      { kind: 'COMPANY', id: state.lifecycle.companyId },
      'fixture-supply',
    ),
  ) as Root;
}

function start(state: Root, resourceIds = ['course-kit']) {
  return command(state, 'StartLearning', {
    characterId: 'worker-0',
    methodId: 'funded-practice',
    goal: { skillId: 'medicine', maxTicks: '1000' },
    resourceIds,
    budgetPoolId: 'local',
    maxBudgetQ: '5000000',
  }) as CommandOf<'StartLearning'>;
}

function source(state: Root): LearningSourceEvidence {
  return {
    ...scope(state, 'course-source'),
    kind: 'COURSE',
    sourceVersion: 'course-v1',
    expiresAt: tick(BigInt(state.finance.processedTick) + 500n),
    learnerId: 'worker-0',
    location: place,
    resourceIds: ['course-kit'],
    methodId: 'funded-practice',
  };
}

function sourceContext(
  state: Root,
  cmd: CommandOf<'StartLearning'>,
  facts: readonly LearningSourceEvidence[],
): LearningSourceContext {
  return { ...context(state, cmd), learningFacts: facts };
}

function fieldCamp(state: Root): Root {
  return {
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
}

describe('C03a — trusted learning-source admission', () => {
  it('admits one trusted local source from actual resources without mutating root state', () => {
    const state = resource(economy([1n], 10_000_000n));
    const cmd = start(state);
    const fact = source(state);
    const before = canonicalJson(state);

    expect(admitLearningSource(state, cmd, sourceContext(state, cmd, [fact]))).toEqual(fact);
    expect(canonicalJson(state)).toBe(before);
  });

  it('rejects ambiguous, stale or scope-mismatched source evidence', () => {
    const state = resource(economy([1n], 10_000_000n));
    const cmd = start(state);
    const fact = source(state);
    const invalid = [
      { ...fact, revision: '999' },
      { ...fact, expiresAt: state.finance.processedTick },
      { ...fact, learnerId: 'leader' },
      { ...fact, resourceIds: ['other'] },
    ] satisfies LearningSourceEvidence[];

    for (const candidate of invalid)
      expect(() => admitLearningSource(state, cmd, sourceContext(state, cmd, [candidate]))).toThrow(
        'INVALID_SOURCE',
      );
    expect(() => admitLearningSource(state, cmd, sourceContext(state, cmd, [fact, fact]))).toThrow(
      'INVALID_SOURCE',
    );
  });

  it('rejects F1 overlap and resources that are not actual, usable and local', () => {
    const state = resource(economy([1n], 10_000_000n));
    const cmd = start(state);
    const covered = fieldCamp(state);
    expect(() =>
      admitLearningSource(covered, cmd, sourceContext(covered, cmd, [source(covered)])),
    ).toThrow('INCOMPATIBLE_ACTIVITY');

    const remote: Root = {
      ...state,
      physical: {
        ...state.physical,
        containers: state.physical.containers.map((entry) =>
          entry.containerId === 'fixture-supply'
            ? { ...entry, location: { kind: 'AT', siteId: place.siteId, areaId: 'archive' } }
            : entry,
        ),
      },
    };
    expect(() =>
      admitLearningSource(remote, cmd, sourceContext(remote, cmd, [source(remote)])),
    ).toThrow('CONTACT_OR_ACCESS_REQUIRED');

    const missing = resource(economy([1n], 10_000_000n), 'other');
    const missingCommand = start(missing);
    expect(() =>
      admitLearningSource(
        missing,
        missingCommand,
        sourceContext(missing, missingCommand, [source(missing)]),
      ),
    ).toThrow('CONTACT_OR_ACCESS_REQUIRED');
  });
});
