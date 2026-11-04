import { expect, it } from 'vitest';
import type { WorldFreeMovementV2ResponseDto } from '@warwrit/protocol';
import {
  continuousMovementFrameAt,
  continuousMovementPositionAt,
} from './continuous-movement-display.js';

const from = { xMicroFp: '0', zMicroFp: '0' };
const boundary = { xMicroFp: '49152', zMicroFp: '32768' };
const goal = { xMicroFp: '98305', zMicroFp: '65537' };

function movement(planVersion: 2 | 3): WorldFreeMovementV2ResponseDto {
  return {
    schemaVersion: 2,
    result: 'ACCEPTED',
    publicRevision: '3',
    movementEpoch: '2',
    serverTimeMs: '1000',
    worldTick: '1',
    mode: 'MOVING',
    point: from,
    plan: {
      planVersion,
      ...(planVersion === 3 ? { navigationVersion: 'polygon-v1' as const } : {}),
      planId: 'display-route',
      mapEdition: 'display-map',
      speedProfileId: 'display-profile',
      movementEpoch: '2',
      from,
      goal,
      startedAtMs: '1000',
      totalDurationUs: '1000000',
      arrivesAtMs: '2000',
      path: [from, goal],
      dangerAreaIds: [],
      speedSpans: [
        {
          from,
          to: boundary,
          terrainId: 'grassland',
          overlayId: null,
          speedPermille: 1000,
          startOffsetUs: '0',
          endOffsetUs: '500000',
          ...(planVersion === 3
            ? {
                geometry: {
                  segmentIndex: 0,
                  fromT: { numerator: '0', denominator: '1' },
                  toT: { numerator: '1', denominator: '2' },
                },
              }
            : {}),
        },
        {
          from: boundary,
          to: goal,
          terrainId: 'forest',
          overlayId: null,
          speedPermille: 500,
          startOffsetUs: '500000',
          endOffsetUs: '1000000',
          ...(planVersion === 3
            ? {
                geometry: {
                  segmentIndex: 0,
                  fromT: { numerator: '1', denominator: '2' },
                  toT: { numerator: '1', denominator: '1' },
                },
              }
            : {}),
        },
      ],
    },
  };
}

it('keeps V2/V3 display positions and route-span boundaries in the same frame', () => {
  expect(continuousMovementFrameAt(null, 1500)).toBeNull();
  expect(continuousMovementPositionAt(null, 1500)).toBeNull();
  const stationary = { ...movement(2), mode: 'STATIONARY_TERRAIN' as const, plan: null };
  expect(continuousMovementFrameAt(stationary, 1500)).toEqual({ point: from, spanIndex: -1 });
  expect(continuousMovementPositionAt(stationary, 1500)).toEqual(from);

  // V3 keeps exact fractions of path segments instead of interpolating the
  // rounded speed-span boundary; the odd coordinates make that difference visible.
  const cases = [
    { at: 900, span: 0, v2: from, v3: from },
    {
      at: 1250,
      span: 0,
      v2: { xMicroFp: '24576', zMicroFp: '16384' },
      v3: { xMicroFp: '24576.25', zMicroFp: '16384.25' },
    },
    {
      at: 1500,
      span: 1,
      v2: boundary,
      v3: { xMicroFp: '49152.5', zMicroFp: '32768.5' },
    },
    {
      at: 1750,
      span: 1,
      v2: { xMicroFp: '73728.5', zMicroFp: '49152.5' },
      v3: { xMicroFp: '73728.75', zMicroFp: '49152.75' },
    },
    { at: 2000, span: 2, v2: goal, v3: goal },
    { at: 2500, span: 2, v2: goal, v3: goal },
  ];
  for (const row of cases) {
    for (const version of [2, 3] as const) {
      const current = movement(version);
      const point = version === 2 ? row.v2 : row.v3;
      expect(continuousMovementFrameAt(current, row.at)).toEqual({ point, spanIndex: row.span });
      expect(continuousMovementPositionAt(current, row.at)).toEqual(point);
    }
  }
});
