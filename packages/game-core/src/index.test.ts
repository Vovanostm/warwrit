import { describe, expect, it } from 'vitest';

import { InvariantViolation, invariant } from './index.js';

describe('game-core engineering primitives', () => {
  it('fails closed when an invariant is false', () => {
    expect(() => invariant(false, 'state must be valid')).toThrow(
      new InvariantViolation('state must be valid'),
    );
  });

  it('allows execution when an invariant is true', () => {
    expect(() => invariant(true, 'unreachable')).not.toThrow();
  });
});
