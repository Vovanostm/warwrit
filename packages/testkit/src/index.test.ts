import { describe, expect, it } from 'vitest';

import { createFixedClock, currentTestProtocolVersion } from './index.js';

describe('testkit', () => {
  it('creates an immutable fixed clock view', () => {
    const clock = createFixedClock('2026-09-01T00:00:00.000Z');
    expect(clock.now().toISOString()).toBe('2026-09-01T00:00:00.000Z');
    expect(clock.now()).not.toBe(clock.now());
  });

  it('uses the production protocol contract rather than a duplicated constant', () => {
    expect(currentTestProtocolVersion()).toBe('0.1.0');
  });
});
