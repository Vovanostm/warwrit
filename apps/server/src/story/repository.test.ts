import { describe, expect, it } from 'vitest';

import {
  legacyDeliveryHasGuaranteedNightEnd,
  resolveStoryDeliveryTimeMs,
} from './repository.js';

describe('resolveStoryDeliveryTimeMs', () => {
  it('keeps new delivery time stable after later QA campaign advances', () => {
    expect(resolveStoryDeliveryTimeMs(1_700_000_000_000, '1700000123456', '2160000'))
      .toBe('1700000123456');
  });

  it('uses legacy receipt time only when no QA offset needs reconstruction', () => {
    expect(resolveStoryDeliveryTimeMs(1_700_000_000_000, null, '0')).toBe('1700000000000');
    expect(resolveStoryDeliveryTimeMs(1_700_000_000_000, null, '2160000')).toBeUndefined();
  });

  it('enables ambiguous legacy deliveries only after a full light cycle in real time', () => {
    expect(legacyDeliveryHasGuaranteedNightEnd(1_700_000_000_000, '1700000899999')).toBe(false);
    expect(legacyDeliveryHasGuaranteedNightEnd(1_700_000_000_000, '1700000900000')).toBe(true);
  });
});
