import { describe, expect, it } from 'vitest';
import { isCompanyEntityId } from './value-guards.js';

describe('company entity wire IDs', () => {
  it('accepts retained JSON item IDs and the full Unicode identifier range', () => {
    expect(isCompanyEntityId('["opening","боец","sword"]')).toBe(true);
    expect(isCompanyEntityId('я'.repeat(256))).toBe(true);
    expect(isCompanyEntityId('🛡'.repeat(256))).toBe(true);
  });

  it('rejects empty, oversized, padded and control-character IDs', () => {
    for (const value of ['', '🛡'.repeat(257), ' padded', 'padded ', 'two\nlines', 7]) {
      expect(isCompanyEntityId(value)).toBe(false);
    }
  });
});
