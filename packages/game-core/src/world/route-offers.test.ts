import { expect, it } from 'vitest';

import {
  enumerateSimpleWorldRouteCandidates,
  isDangerousRouteContract,
  SEROE_PORECHYE,
} from './index.js';

it('retains dangerous-route eligibility for both accepted mill-rescue profile versions', () => {
  expect(
    isDangerousRouteContract('ci.m1.voice-under-boards.01', 'ct.m1.voice-under-boards.v1'),
  ).toBe(true);
  expect(
    isDangerousRouteContract('ci.m1.voice-under-boards.01', 'ct.m1.voice-under-boards.v2'),
  ).toBe(true);
  expect(isDangerousRouteContract('ci.m1.voice-under-boards.01', 'ct.m1.cellar-rescue.v1')).toBe(
    false,
  );
});

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
