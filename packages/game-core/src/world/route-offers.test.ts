import { expect, it } from 'vitest';

import { enumerateSimpleWorldRouteCandidates, SEROE_PORECHYE } from './index.js';

it('enumerates an authored multi-edge itinerary in traversal order without repeating sites', () => {
  const candidates = enumerateSimpleWorldRouteCandidates(SEROE_PORECHYE, 'severny-dvor');

  expect(candidates).toContainEqual({
    edgeIds: ['kamenny-brod-severny-dvor', 'kamenny-brod-bereznyak'],
    toSiteId: 'bereznyak',
  });
  expect(
    candidates.every((candidate) => candidate.edgeIds.length <= SEROE_PORECHYE.sites.length - 1),
  ).toBe(true);
  expect(enumerateSimpleWorldRouteCandidates(SEROE_PORECHYE, 'unknown-site')).toEqual([]);
});
