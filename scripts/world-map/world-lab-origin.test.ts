import { expect, it } from 'vitest';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import {
  PAINTED_ATLAS_REGION,
  buildNavigationField,
  compileMovementPlan,
  paintedAtlasPoint,
  prepareContinuousCompanyMovement,
} from '@warwrit/game-core';

const {
  f: { root },
} = createCompanyCombatAggregateFixture();
const field = buildNavigationField(PAINTED_ATLAS_REGION);

it('rejects a retained trip when the company is already stationary', () => {
  const party = root.lifecycle.parties[0]!;
  const plan = compileMovementPlan({
    field,
    path: [paintedAtlasPoint([1731, 1244]), paintedAtlasPoint([1765, 1244])],
    planId: 'retained-atlas-trip',
    movementEpoch: '1',
    startedAtMs: '0',
  });

  expect(() =>
    prepareContinuousCompanyMovement({
      root,
      partyId: party.partyId,
      segmentId: 'stale-stop',
      region: PAINTED_ATLAS_REGION,
      nowMs: '1',
      prior: {
        schemaVersion: 2,
        partyId: party.partyId,
        regionVersion: PAINTED_ATLAS_REGION.mapEdition,
        startedAt: '1000',
        arrivesAt: '1001',
        routeEpoch: '1',
        plan,
        siteId: null,
      },
      next: null,
    }),
  ).toThrow('MOVEMENT_NOT_ALLOWED');
});
