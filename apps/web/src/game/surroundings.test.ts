import { describe, expect, it } from 'vitest';
import type { WorldSurroundingsDto } from '@warwrit/protocol';
import { estimatedLight, type SurroundingsReading } from './surroundings.js';

function reading(phase: 'DAY' | 'NIGHT', msIntoPhase: string): SurroundingsReading {
  return {
    receivedAt: 100,
    dto: {
      schemaVersion: 1,
      serverTimeMs: '0',
      campaign: { tick: '0', msPerTick: '1000', ticksPerDay: '86400' },
      light: { phase, msIntoPhase, phaseMs: phase === 'DAY' ? '600000' : '300000' },
      map: { regionVersion: '1', regionName: 'test', sites: [], edges: [] },
      observerSiteId: null,
      observedCompanies: [],
      observedHostiles: [],
    } as WorldSurroundingsDto,
  };
}

describe('estimatedLight', () => {
  it('advances through complete day and night cycles with exact phase boundaries', () => {
    expect(estimatedLight(reading('DAY', '0'), 100)).toEqual({ phase: 'DAY', msLeft: 600_000 });
    expect(estimatedLight(reading('DAY', '0'), 100 + 600_000)).toEqual({
      phase: 'NIGHT',
      msLeft: 300_000,
    });
    expect(estimatedLight(reading('DAY', '0'), 100 + 900_000)).toEqual({
      phase: 'DAY',
      msLeft: 600_000,
    });
    expect(estimatedLight(reading('DAY', '0'), 100 + 1_800_000)).toEqual({
      phase: 'DAY',
      msLeft: 600_000,
    });
    expect(estimatedLight(reading('DAY', '590000'), 100 + 15_000)).toEqual({
      phase: 'NIGHT',
      msLeft: 295_000,
    });
    expect(estimatedLight(reading('NIGHT', '0'), 100 + 300_000)).toEqual({
      phase: 'DAY',
      msLeft: 600_000,
    });
    expect(estimatedLight(reading('NIGHT', '0'), 100 + 900_000)).toEqual({
      phase: 'NIGHT',
      msLeft: 300_000,
    });
  });
});
