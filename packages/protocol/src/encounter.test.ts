import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { ENCOUNTER_PROTOCOL_VERSION, isEncounterCommandDto } from './encounter.js';

// Untrusted HTTP and realtime payloads pass through this guard before any
// command reaches the executor: it must accept every valid shape and nothing else.
const id = fc.string({ minLength: 1, maxLength: 128 });
const intent = fc.oneof(
  fc.record({
    type: fc.constant('move'),
    to: fc.record({ q: fc.integer(), r: fc.integer() }),
  }),
  fc.record({ type: fc.constant('attack'), targetId: id }),
  fc.record({ type: fc.constantFrom('defend', 'wait', 'retreat') }),
);
const command = fc.record({
  version: fc.constant(ENCOUNTER_PROTOCOL_VERSION),
  encounterId: fc.uuid(),
  commandId: id,
  expectedRevision: fc.nat(),
  activationId: id,
  actorId: id,
  intent,
});

const invalidValues: Record<string, readonly unknown[]> = {
  version: [0, 2, '1', undefined],
  encounterId: ['', 'not-a-uuid', '00000000-0000-0000-0000-000000000000', 7],
  commandId: ['', 'x'.repeat(129), 1, null],
  expectedRevision: [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, '1'],
  activationId: ['', 'x'.repeat(129), {}],
  actorId: ['', 'x'.repeat(129), []],
  intent: [null, [], { type: 'teleport' }, { type: 'wait', extra: true }],
};

describe('encounter command guard', () => {
  it('accepts every well-formed command', () => {
    fc.assert(fc.property(command, (value) => isEncounterCommandDto(value)));
  });

  it('rejects any additional top-level or intent field', () => {
    fc.assert(
      fc.property(command, fc.boolean(), (value, inIntent) => {
        const widened = inIntent
          ? { ...value, intent: { ...value.intent, injected: true } }
          : { ...value, injected: true };
        return !isEncounterCommandDto(widened);
      }),
    );
  });

  it.each(Object.entries(invalidValues))('rejects an invalid %s', (field, values) => {
    fc.assert(
      fc.property(command, fc.constantFrom(...values), (value, invalid) => {
        return !isEncounterCommandDto({ ...value, [field]: invalid });
      }),
    );
  });

  it('rejects malformed move coordinates', () => {
    const base = fc.sample(command, { numRuns: 1, seed: 1 })[0];
    for (const to of [{ q: 1 }, { q: 1, r: 0.5 }, { q: 1, r: 2, z: 3 }, [1, 2], null]) {
      expect(isEncounterCommandDto({ ...base, intent: { type: 'move', to } })).toBe(false);
    }
  });

  it('rejects non-object payloads', () => {
    for (const value of [null, undefined, 'command', 42, []]) {
      expect(isEncounterCommandDto(value)).toBe(false);
    }
  });
});
