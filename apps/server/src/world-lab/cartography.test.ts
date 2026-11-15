import { expect, it } from 'vitest';
import { worldSightIndex } from '@warwrit/game-core';
import type { WorldLabCartographyDto } from '@warwrit/protocol';
import {
  campaignObservationDate,
  cartographyKnowsSegment,
  observationDate,
  projectKnownSite,
  siteIsVisible,
} from './cartography.js';
import { sightField } from './cartography-field.js';

it('rejects a diagonal path clipping an unknown cell between sampled endpoints', () => {
  let cartography = {
    grid: { columns: 2, rows: 2, cellSizeFp: 64, origin: { xFp: 0, zFp: 0 } },
    charted: Buffer.from([0b1101]).toString('base64'),
    explored: Buffer.from([0]).toString('base64'),
  } as WorldLabCartographyDto;
  const point = (x: number, z: number) => ({
    xMicroFp: String(Math.round(x * 65536)),
    zMicroFp: String(Math.round(z * 65536)),
  });
  // Both endpoints are known; the segment crosses unknown bottom-right for <1fp.
  expect(cartographyKnowsSegment(cartography, point(60, 60), point(68, 67))).toBe(false);
  cartography = { ...cartography, explored: Buffer.from([2]).toString('base64') };
  expect(cartographyKnowsSegment(cartography, point(60, 60), point(68, 67))).toBe(true);
});

it('dates observed places from their stored simulation time in the authoritative campaign clock', () => {
  const observation = new Date(21_600_000);
  expect(campaignObservationDate(observation, { epochMs: '0', startingTick: '250' })).toEqual({
    campaignDay: '2',
    tick: '250',
  });
  expect(() => campaignObservationDate(new Date(0), { epochMs: '1', startingTick: '0' })).toThrow(
    'Campaign time precedes epoch',
  );
});

it('preserves pre-epoch stored observations as timestamps without exposing snapshot fields', () => {
  const snapshot = {
    siteId: 'legacy-place',
    name: 'Legacy Place',
    icon: 'village',
    point: { xMicroFp: '65536', zMicroFp: '-65536' },
    hiddenOwnerId: 'private-company',
  };
  const lastObservedAt = observationDate(new Date(0), { epochMs: '1', startingTick: '0' });
  const observed = projectKnownSite(snapshot, 'OBSERVED', false, lastObservedAt);

  expect(lastObservedAt).toEqual({
    kind: 'TIMESTAMP',
    timestamp: '1970-01-01T00:00:00.000Z',
  });
  expect(observed.lastObservedAt).toEqual(lastObservedAt);
  expect(observed).not.toHaveProperty('hiddenOwnerId');
});

it('keeps chart grants undated and projects observations without private snapshot fields', () => {
  const snapshot = {
    siteId: 'known-place',
    name: 'Known Place',
    icon: 'village',
    point: { xMicroFp: '65536', zMicroFp: '-65536' },
    hiddenOwnerId: 'private-company',
  };
  const charted = projectKnownSite(snapshot, 'CHART', false);
  const observed = projectKnownSite(snapshot, 'OBSERVED', true, {
    kind: 'CAMPAIGN',
    campaignDay: '3',
    tick: '17',
  });

  expect(charted).toMatchObject({ source: 'CHART', visited: false });
  expect(charted).not.toHaveProperty('lastObservedAt');
  expect(observed).toMatchObject({
    source: 'OBSERVED',
    visited: true,
    lastObservedAt: { kind: 'CAMPAIGN', campaignDay: '3', tick: '17' },
  });
  expect(observed).not.toHaveProperty('hiddenOwnerId');
});

it('marks a known place current only when its cell is in this observer visibility mask', () => {
  const center = {
    xFp: sightField.origin.xFp + sightField.cellSizeFp / 2,
    zFp: sightField.origin.zFp + sightField.cellSizeFp / 2,
  };
  const index = worldSightIndex(sightField, center);
  const site = projectKnownSite(
    {
      siteId: 'known-place',
      name: 'Known Place',
      icon: 'village',
      point: {
        xMicroFp: String(Math.round(center.xFp * 65_536)),
        zMicroFp: String(Math.round(center.zFp * 65_536)),
      },
    },
    'OBSERVED',
    false,
  );
  const visible = new Uint8Array(Math.ceil((sightField.columns * sightField.rows) / 8));
  visible[index >>> 3]! |= 1 << (index & 7);

  expect(siteIsVisible(site, visible)).toBe(true);
  expect(siteIsVisible(site, new Uint8Array(visible.length))).toBe(false);
});
