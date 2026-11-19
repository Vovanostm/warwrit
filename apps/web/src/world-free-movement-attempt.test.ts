import { describe, expect, it } from 'vitest';
import { readContinuousMovement } from './game/continuous-movement.js';
import {
  classifyFreeMovementPost,
  createFreeMovementAttempt,
  readFreeMovementAttempt,
  saveFreeMovementAttempt,
  type FreeMovementStorage,
} from './world-free-movement-attempt.js';

class MemoryStorage implements FreeMovementStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}

const current = {
  schemaVersion: 1 as const,
  worldTick: '20',
  publicRevision: '7',
  party: { partyId: 'party', routeEpoch: '3', position: { kind: 'TERRAIN' as const, q: 0, r: 0 } },
  movement: null,
};

describe('free movement command attempts', () => {
  it('accepts a painted-atlas polygon V3 movement response without relaxing shape checks', () => {
    const from = { xMicroFp: '0', zMicroFp: '0' };
    const goal = { xMicroFp: '65536', zMicroFp: '65536' };
    const response = {
      schemaVersion: 2,
      result: 'ACCEPTED',
      publicRevision: '8',
      movementEpoch: '4',
      serverTimeMs: '1000',
      worldTick: '20',
      mode: 'MOVING',
      point: from,
      plan: {
        planVersion: 3,
        navigationVersion: 'polygon-v1',
        planId: 'painted-plan-1',
        mapEdition: 'porechye-atlas-lab-v1',
        speedProfileId: 'company-road-v1',
        movementEpoch: '4',
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
            to: goal,
            terrainId: 'grassland',
            overlayId: null,
            speedPermille: 1000,
            startOffsetUs: '0',
            endOffsetUs: '1000000',
            geometry: {
              segmentIndex: 0,
              fromT: { numerator: '0', denominator: '1' },
              toT: { numerator: '1', denominator: '1' },
            },
          },
        ],
      },
    } as const;

    expect(readContinuousMovement(response)).toEqual(response);
    expect(
      readContinuousMovement({
        ...response,
        plan: {
          ...response.plan,
          speedSpans: [
            {
              ...response.plan.speedSpans[0],
              geometry: {
                ...response.plan.speedSpans[0].geometry,
                toT: { numerator: '0', denominator: '1' },
              },
            },
          ],
        },
      }),
    ).toBeUndefined();
    expect(
      readContinuousMovement({
        ...response,
        plan: { ...response.plan, planVersion: 2, navigationVersion: undefined },
      }),
    ).toBeUndefined();
  });

  it('persists the same revision-bound body for a safe exact retry and isolates company scope', () => {
    const scope = { accountId: 'account-a', companyId: 'company-a' };
    const attempt = createFreeMovementAttempt({
      scope,
      current,
      commandId: 'movement-1',
      action: { kind: 'START', destination: { q: 2, r: 1 } },
    });
    const storage = new MemoryStorage();
    saveFreeMovementAttempt(storage, attempt);

    expect(readFreeMovementAttempt(storage, scope)).toEqual(attempt);
    expect(
      readFreeMovementAttempt(storage, { accountId: 'account-b', companyId: 'company-a' }),
    ).toBeUndefined();
  });

  it('accepts only a response bound to the exact command id', () => {
    const accepted = {
      schemaVersion: 1,
      commandId: 'movement-1',
      worldTick: '20',
      publicRevision: '8',
      party: current.party,
      movement: null,
    };
    expect(classifyFreeMovementPost(200, accepted, 'movement-1').kind).toBe('ACCEPTED');
    expect(classifyFreeMovementPost(200, accepted, 'movement-2')).toEqual({ kind: 'UNKNOWN' });
  });
});
