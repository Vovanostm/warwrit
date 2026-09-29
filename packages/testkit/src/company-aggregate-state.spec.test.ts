import { describe, expect, it } from 'vitest';
import {
  createSocialState,
  prepareConsumeCombatAggregate,
  readCompanyCombatAggregateState,
  recordLearnedFact,
} from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from './company-combat-aggregate-fixture.js';
import { createCompanyStorageFixture } from './company-storage-fixture.js';

describe('company aggregate persisted-state reader', () => {
  it('round-trips a consumed active G10 root with its retained receipt evidence', () => {
    const fixture = createCompanyCombatAggregateFixture();
    const consumed = prepareConsumeCombatAggregate(fixture.begun.next, {
      journal: fixture.journal,
      applications: fixture.applications,
      practiceProfile: fixture.practiceProfile,
    });
    if (consumed.kind !== 'PREPARED') throw new Error(consumed.error);

    const read = readCompanyCombatAggregateState(consumed.next);
    expect(read).toEqual(consumed.next);
    expect(read.encounter.active?.appliedReceipts).toHaveLength(fixture.journal.receipts.length);
  });

  it('rejects encounter presence without a valid active participant binding', () => {
    const fixture = createCompanyCombatAggregateFixture(true);
    const root = structuredClone(fixture.begun.next) as unknown as Record<string, unknown>;
    const lifecycle = (root['economy'] as Record<string, unknown>)['lifecycle'] as Record<
      string,
      unknown
    >;
    const provider = (lifecycle['characters'] as Array<Record<string, unknown>>).find(
      (character) =>
        ((character['identity'] as Record<string, unknown>)['characterId'] as string) ===
        'a-provider',
    )!;
    const presence = provider['presence'] as Record<string, unknown>;
    presence['availability'] = 'IN_ENCOUNTER';
    presence['encounterBindingId'] = (activeFrom(root)['binding'] as Record<string, unknown>)[
      'bindingId'
    ];

    expect(() => readCompanyCombatAggregateState(root)).toThrow(TypeError);

    const stale = structuredClone(fixture.begun.next) as unknown as Record<string, unknown>;
    (stale['encounter'] as Record<string, unknown>)['active'] = null;
    expect(() => readCompanyCombatAggregateState(stale)).toThrow(TypeError);
  });

  it('keeps retained learning tasks and learner references inside the company root', () => {
    const source = createCompanyStorageFixture();
    const foreignTask = structuredClone(source) as unknown as Record<string, unknown>;
    const task = (
      ((foreignTask['learning'] as Record<string, unknown>)['tasks'] as Record<string, unknown>)[
        'tasks'
      ] as Array<Record<string, unknown>>
    )[0]!;
    const start = task['start'] as Record<string, unknown>;
    const startCommand = start['command'] as Record<string, unknown>;
    const startPayload = startCommand['payload'] as Record<string, unknown>;
    const quote = start['quote'] as Record<string, unknown>;
    const coefficients = quote['coefficients'] as Record<string, unknown>;
    const stop = task['stop'] as Record<string, unknown>;
    startCommand['companyId'] = 'foreign-company';
    stop['companyId'] = 'foreign-company';
    startPayload['characterId'] = 'foreign-learner';
    coefficients['holderId'] = 'foreign-learner';
    const foreignTaskBefore = JSON.stringify(foreignTask);
    expect(() => readCompanyCombatAggregateState(foreignTask)).toThrow(TypeError);
    expect(JSON.stringify(foreignTask)).toBe(foreignTaskBefore);

    const foreignProgress = structuredClone(source) as unknown as Record<string, unknown>;
    const studyProgress = (foreignProgress['learning'] as Record<string, unknown>)[
      'studyProgress'
    ] as Array<Record<string, unknown>>;
    studyProgress[0]!['characterId'] = 'foreign-learner';
    expect(() => readCompanyCombatAggregateState(foreignProgress)).toThrow(TypeError);
  });

  it('rejects unknown, foreign-version, cross-scope and inconsistent-cursor fields without mutation', () => {
    const fixture = createCompanyCombatAggregateFixture();
    const consumed = prepareConsumeCombatAggregate(fixture.begun.next, {
      journal: fixture.journal,
      applications: fixture.applications,
      practiceProfile: fixture.practiceProfile,
    });
    if (consumed.kind !== 'PREPARED') throw new Error(consumed.error);

    const cases: Array<[string, (root: Record<string, unknown>) => void]> = [
      [
        'unknown root field',
        (root) => {
          root['extra'] = true;
        },
      ],
      [
        'unknown binding field',
        (root) => {
          activeFrom(root)['binding'] = {
            ...(activeFrom(root)['binding'] as Record<string, unknown>),
            unowned: true,
          };
        },
      ],
      [
        'unsupported binding version',
        (root) => {
          (activeFrom(root)['binding'] as Record<string, unknown>)['version'] = 'future-version';
        },
      ],
      [
        'foreign world scope',
        (root) => {
          (activeFrom(root)['binding'] as Record<string, unknown>)['worldId'] = 'foreign-world';
        },
      ],
      [
        'incorrect binding digest',
        (root) => {
          activeFrom(root)['bindingDigest'] = 'nonempty-but-wrong';
        },
      ],
      [
        'noncontiguous earlier receipt revision',
        (root) => {
          const receipts = activeFrom(root)['appliedReceipts'] as Array<Record<string, unknown>>;
          receipts[0]!['revision'] = 40;
        },
      ],
      [
        'participant bound to another encounter',
        (root) => {
          const lifecycle = (root['economy'] as Record<string, unknown>)['lifecycle'] as Record<
            string,
            unknown
          >;
          const characters = lifecycle['characters'] as Array<Record<string, unknown>>;
          const leader = characters.find(
            (character) =>
              ((character['identity'] as Record<string, unknown>)['characterId'] as string) ===
              'a-leader',
          )!;
          (leader['presence'] as Record<string, unknown>)['encounterBindingId'] = 'other-binding';
        },
      ],
      [
        'prior presence without a matching participant',
        (root) => {
          const prior = activeFrom(root)['priorPresence'] as Array<Record<string, unknown>>;
          prior[0]!['characterId'] = 'unbound-character';
        },
      ],
      [
        'mismatched receipt cursor',
        (root) => {
          const active = activeFrom(root);
          active['lastAppliedRevision'] = (active['lastAppliedRevision'] as number) + 1;
        },
      ],
    ];
    for (const [label, mutate] of cases) {
      const root = structuredClone(consumed.next) as unknown as Record<string, unknown>;
      mutate(root);
      const before = JSON.stringify(root);
      expect(() => readCompanyCombatAggregateState(root), label).toThrow(TypeError);
      expect(JSON.stringify(root), label).toBe(before);
    }
  });

  it('round-trips a growing social chronicle built by the public record producer', () => {
    const fixture = createCompanyCombatAggregateFixture();
    let social = createSocialState();
    for (let index = 0; index < 1_001; index += 1) {
      social = recordLearnedFact(social, {
        memoryId: `storage-memory-${index}`,
        personId: 'a-leader',
        factId: `storage-fact-${index}`,
        sourceEventId: `storage-event-${index}`,
        happenedAt: '1000',
        learnedAt: '1000',
        factType: 'ObservedEncounterOutcome',
        channel: 'EXPERIENCE',
        emotionalDelta: { friendship: 0, rivalry: 0, fear: 0, respect: 0 },
        decayTicks: '0',
        salience: 1,
      }).state;
    }
    const root = { ...fixture.begun.next, social };
    const read = readCompanyCombatAggregateState(root);

    expect(read).toEqual(root);
    expect(read.social.chronicle).toHaveLength(1_001);
    expect(read.social.chronicle[0]).not.toBe(root.social.chronicle[0]);
  });

  it('rejects malformed receipt digests in retained active evidence', () => {
    const fixture = createCompanyCombatAggregateFixture();
    const consumed = prepareConsumeCombatAggregate(fixture.begun.next, {
      journal: fixture.journal,
      applications: fixture.applications,
      practiceProfile: fixture.practiceProfile,
    });
    if (consumed.kind !== 'PREPARED') throw new Error(consumed.error);

    const root = structuredClone(consumed.next) as unknown as Record<string, unknown>;
    const encounter = root['encounter'] as Record<string, unknown>;
    const active = encounter['active'] as Record<string, unknown>;
    const receipts = active['appliedReceipts'] as Array<Record<string, unknown>>;
    receipts[0]!['receiptDigest'] = 42;
    const before = JSON.stringify(root);

    expect(() => readCompanyCombatAggregateState(root)).toThrow(TypeError);
    expect(JSON.stringify(root)).toBe(before);
  });
});

function activeFrom(root: Record<string, unknown>): Record<string, unknown> {
  return (root['encounter'] as Record<string, unknown>)['active'] as Record<string, unknown>;
}
