import { describe, expect, it } from 'vitest';

import { lookupForLocale } from './index.js';

describe('localized source fallback', () => {
  it('uses approved Russian quest text when an English translation is absent', () => {
    expect(lookupForLocale('en', 'contract.ci.m1.light-sack.01.title')).toBe(
      'Мешок легче накладной',
    );
  });

  it('keeps existing English text unchanged', () => {
    expect(lookupForLocale('en', 'contract.ci.m1.road-tracks.01.title')).toBe('Tracks on the Road');
  });
});
