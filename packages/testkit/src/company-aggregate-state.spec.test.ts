import { describe, expect, it } from 'vitest';
import { prepareConsumeCombatAggregate, readCompanyCombatAggregateState } from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from './company-combat-aggregate-fixture.js';

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
