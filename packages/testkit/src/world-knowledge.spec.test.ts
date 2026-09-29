import { describe, expect, it } from 'vitest';
import {
  SEROE_PORECHYE,
  campaignTick,
  projectWorldKnowledge,
  readWorldKnowledge,
} from '@warwrit/game-core';
import type { CampaignTick } from '@warwrit/game-core';

const tick = (value: string): CampaignTick => campaignTick(value);

function knowledgeAt(atTick: string) {
  const site = SEROE_PORECHYE.sites.find((entry) => entry.siteId === 'kamenny-brod')!;
  const area = site.areas[0]!;
  return {
    version: 'w01-world-knowledge-1' as const,
    regionVersion: SEROE_PORECHYE.version,
    regionId: SEROE_PORECHYE.regionId,
    exploredTerrain: [
      {
        areaId: area.areaId,
        terrain: area.terrain,
        sourceEventId: 'map-exploration-event',
        learnedAt: tick('1'),
      },
    ],
    liveEntities: [
      {
        entityId: 'observed-guard',
        kind: 'GUARD',
        siteId: site.siteId,
        areaId: area.areaId,
        sourceEventId: 'guard-sighting-event',
        observedAt: tick(atTick),
      },
    ],
    lastSeen: [
      {
        entityId: 'patrol-report',
        kind: 'PATROL',
        areaId: area.areaId,
        sourceEventId: 'patrol-report-event',
        lastSeenAt: tick('2'),
        learnedAt: tick('3'),
        confidence: 'uncertain',
        expiresAt: tick('8'),
      },
    ],
    rumours: [
      {
        rumourId: 'mill-rumour',
        areaId: area.areaId,
        sourceEventId: 'rumour-source-event',
        learnedAt: tick('3'),
        confidence: 'reported',
        expiresAt: tick('8'),
      },
    ],
    mapProvenance: [
      {
        mapId: 'hand-drawn-map',
        sourceEventId: 'map-source-event',
        learnedAt: tick('1'),
        areaIds: [area.areaId],
      },
    ],
  };
}

describe('world knowledge projection', () => {
  it('rejects hidden fields at the knowledge root and inside nested evidence', () => {
    expect(() =>
      readWorldKnowledge({ ...knowledgeAt('5'), hiddenWorldPosition: { siteId: 'bereznyak' } }),
    ).toThrow(RangeError);

    const source = knowledgeAt('5');
    const withHiddenLastSeenPosition = {
      ...source,
      lastSeen: source.lastSeen.map((entry) => ({ ...entry, coordinate: { q: 1, r: 2 } })),
    };
    expect(() => readWorldKnowledge(withHiddenLastSeenPosition)).toThrow(RangeError);

    const projection = projectWorldKnowledge(knowledgeAt('5'), tick('5'));
    expect(projection.liveEntities).toHaveLength(1);
    expect(projection.lastSeen[0]).not.toHaveProperty('siteId');
    expect(projection.lastSeen[0]).not.toHaveProperty('coordinate');
  });

  it('owns evidence and only shows live sightings at their observed tick', () => {
    const source = knowledgeAt('5');
    const retained = readWorldKnowledge(source);
    source.exploredTerrain[0]!.terrain = 'WOODLAND';
    source.lastSeen[0]!.confidence = 'changed-by-adapter';
    expect(retained.exploredTerrain[0]!.terrain).toBe('SETTLEMENT');
    expect(retained.lastSeen[0]!.confidence).toBe('uncertain');
    expect(Object.isFrozen(retained.lastSeen[0])).toBe(true);

    expect(projectWorldKnowledge(retained, tick('5')).liveEntities).toHaveLength(1);
    expect(projectWorldKnowledge(retained, tick('6')).liveEntities).toHaveLength(0);
  });

  it('expires only source-dated history and rejects future or invalid temporal evidence', () => {
    const retained = readWorldKnowledge(knowledgeAt('5'));
    expect(projectWorldKnowledge(retained, tick('7')).rumours).toHaveLength(1);
    expect(projectWorldKnowledge(retained, tick('8')).rumours).toHaveLength(0);
    expect(() => projectWorldKnowledge(retained, tick('2'))).toThrow(RangeError);

    const invalid = knowledgeAt('5');
    invalid.rumours[0]!.expiresAt = tick('3');
    expect(() => readWorldKnowledge(invalid)).toThrow(RangeError);
  });
});
