import { id, plainObject, snapshotJson, text } from '../company/input.js';
import type { JsonValue } from '../company/input.js';
import { campaignTick, isExactInteger } from '../company/values.js';
import type { CampaignTick } from '../company/values.js';
import { SEROE_PORECHYE, WORLD_REGION_VERSION } from './region.js';
import type { WorldTerrain } from './region.js';

export const WORLD_KNOWLEDGE_VERSION = 'w01-world-knowledge-1' as const;

export interface ExploredTerrainEvidence {
  readonly areaId: string;
  readonly terrain: WorldTerrain;
  readonly sourceEventId: string;
  readonly learnedAt: CampaignTick;
}

export interface LiveEntityObservation {
  readonly entityId: string;
  readonly kind: string;
  readonly siteId: string;
  readonly areaId: string;
  readonly sourceEventId: string;
  readonly observedAt: CampaignTick;
}

export interface LastSeenEvidence {
  readonly entityId: string;
  readonly kind: string;
  readonly areaId: string;
  readonly sourceEventId: string;
  readonly lastSeenAt: CampaignTick;
  readonly learnedAt: CampaignTick;
  /** Opaque source-provided confidence label; K01 assigns no scale or decay. */
  readonly confidence: string;
  /** Exclusive source-provided expiry; no duration is inferred by this module. */
  readonly expiresAt: CampaignTick;
}

export interface RumourEvidence {
  readonly rumourId: string;
  readonly areaId: string;
  readonly sourceEventId: string;
  readonly learnedAt: CampaignTick;
  /** Opaque source-provided confidence label; K01 assigns no scale or decay. */
  readonly confidence: string;
  /** Exclusive source-provided expiry; no duration is inferred by this module. */
  readonly expiresAt: CampaignTick;
}

export interface MapProvenanceEvidence {
  readonly mapId: string;
  readonly sourceEventId: string;
  readonly learnedAt: CampaignTick;
  readonly areaIds: readonly string[];
}

export interface WorldKnowledge {
  readonly version: typeof WORLD_KNOWLEDGE_VERSION;
  readonly regionVersion: typeof WORLD_REGION_VERSION;
  readonly regionId: string;
  readonly exploredTerrain: readonly ExploredTerrainEvidence[];
  readonly liveEntities: readonly LiveEntityObservation[];
  readonly lastSeen: readonly LastSeenEvidence[];
  readonly rumours: readonly RumourEvidence[];
  readonly mapProvenance: readonly MapProvenanceEvidence[];
}

export interface PublicWorldKnowledge {
  readonly regionId: string;
  readonly atTick: CampaignTick;
  readonly exploredTerrain: readonly ExploredTerrainEvidence[];
  readonly liveEntities: readonly LiveEntityObservation[];
  readonly lastSeen: readonly LastSeenEvidence[];
  readonly rumours: readonly RumourEvidence[];
  readonly mapProvenance: readonly MapProvenanceEvidence[];
}

type JsonRecord = Readonly<Record<string, JsonValue>>;

function record(value: JsonValue, keys: readonly string[]): JsonRecord {
  if (!plainObject(value) || Object.keys(value).some((key) => !keys.includes(key)))
    throw new RangeError('Invalid world knowledge record');
  return value as JsonRecord;
}

function stringField(value: JsonRecord, key: string, input: typeof id | typeof text): string {
  const field = value[key];
  if (!input.read(field)) throw new RangeError(`Invalid world knowledge ${key}`);
  return field;
}

function tickField(value: JsonRecord, key: string): CampaignTick {
  const field = value[key];
  if (!isExactInteger(field)) throw new RangeError(`Invalid world knowledge ${key}`);
  return campaignTick(field);
}

function areaById(areaId: string) {
  for (const site of SEROE_PORECHYE.sites) {
    const area = site.areas.find((entry) => entry.areaId === areaId);
    if (area) return { site, area };
  }
  throw new RangeError('Unknown authored world area');
}

function unique<T>(items: readonly T[], keyOf: (item: T) => string): void {
  if (new Set(items.map(keyOf)).size !== items.length)
    throw new RangeError('Duplicate world knowledge evidence');
}

function compareCodePoints(left: string, right: string): number {
  const leftPoints = Array.from(left, (character) => character.codePointAt(0)!);
  const rightPoints = Array.from(right, (character) => character.codePointAt(0)!);
  const sharedLength = Math.min(leftPoints.length, rightPoints.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const difference = leftPoints[index]! - rightPoints[index]!;
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

/** Validate and detach finite, server-sourced evidence. This is not an authorization check. */
export function readWorldKnowledge(value: unknown): WorldKnowledge {
  const snapshot = snapshotJson(value);
  if (snapshot === undefined || !plainObject(snapshot))
    throw new RangeError('Invalid world knowledge');
  const source = record(snapshot, [
    'version',
    'regionVersion',
    'regionId',
    'exploredTerrain',
    'liveEntities',
    'lastSeen',
    'rumours',
    'mapProvenance',
  ]);
  if (
    source['version'] !== WORLD_KNOWLEDGE_VERSION ||
    source['regionVersion'] !== WORLD_REGION_VERSION ||
    source['regionId'] !== SEROE_PORECHYE.regionId
  )
    throw new RangeError('World knowledge is for another region edition');

  function entries<T>(key: string, parse: (candidate: JsonValue) => T): readonly T[] {
    const raw = source[key];
    if (!Array.isArray(raw)) throw new RangeError(`Invalid world knowledge ${key}`);
    return raw.map(parse);
  }

  const exploredTerrain = entries('exploredTerrain', (candidate) => {
    const item = record(candidate, ['areaId', 'terrain', 'sourceEventId', 'learnedAt']);
    const areaId = stringField(item, 'areaId', id);
    const { area } = areaById(areaId);
    const terrainValue = stringField(item, 'terrain', id);
    const sourceEventId = stringField(item, 'sourceEventId', id);
    const learnedAt = tickField(item, 'learnedAt');
    if (terrainValue !== area.terrain)
      throw new RangeError('Explored terrain conflicts with region');
    const terrain = area.terrain;
    return Object.freeze({ areaId, terrain, sourceEventId, learnedAt });
  });

  const liveEntities = entries('liveEntities', (candidate) => {
    const item = record(candidate, [
      'entityId',
      'kind',
      'siteId',
      'areaId',
      'sourceEventId',
      'observedAt',
    ]);
    const entityId = stringField(item, 'entityId', id);
    const kind = stringField(item, 'kind', id);
    const siteId = stringField(item, 'siteId', id);
    const areaId = stringField(item, 'areaId', id);
    const { site } = areaById(areaId);
    const sourceEventId = stringField(item, 'sourceEventId', id);
    const observedAt = tickField(item, 'observedAt');
    if (site.siteId !== siteId) throw new RangeError('Live observation area is not at site');
    return Object.freeze({ entityId, kind, siteId, areaId, sourceEventId, observedAt });
  });

  const lastSeen = entries('lastSeen', (candidate) => {
    const item = record(candidate, [
      'entityId',
      'kind',
      'areaId',
      'sourceEventId',
      'lastSeenAt',
      'learnedAt',
      'confidence',
      'expiresAt',
    ]);
    const entityId = stringField(item, 'entityId', id);
    const kind = stringField(item, 'kind', id);
    const areaId = stringField(item, 'areaId', id);
    areaById(areaId);
    const sourceEventId = stringField(item, 'sourceEventId', id);
    const lastSeenAt = tickField(item, 'lastSeenAt');
    const learnedAt = tickField(item, 'learnedAt');
    const confidence = stringField(item, 'confidence', text);
    const expiresAt = tickField(item, 'expiresAt');
    if (BigInt(lastSeenAt) > BigInt(learnedAt) || BigInt(expiresAt) <= BigInt(learnedAt))
      throw new RangeError('Invalid last-seen evidence time');
    return Object.freeze({
      entityId,
      kind,
      areaId,
      sourceEventId,
      lastSeenAt,
      learnedAt,
      confidence,
      expiresAt,
    });
  });

  const rumours = entries('rumours', (candidate) => {
    const item = record(candidate, [
      'rumourId',
      'areaId',
      'sourceEventId',
      'learnedAt',
      'confidence',
      'expiresAt',
    ]);
    const rumourId = stringField(item, 'rumourId', id);
    const areaId = stringField(item, 'areaId', id);
    areaById(areaId);
    const sourceEventId = stringField(item, 'sourceEventId', id);
    const learnedAt = tickField(item, 'learnedAt');
    const confidence = stringField(item, 'confidence', text);
    const expiresAt = tickField(item, 'expiresAt');
    if (BigInt(expiresAt) <= BigInt(learnedAt)) throw new RangeError('Invalid rumour expiry');
    return Object.freeze({ rumourId, areaId, sourceEventId, learnedAt, confidence, expiresAt });
  });

  const mapProvenance = entries('mapProvenance', (candidate) => {
    const item = record(candidate, ['mapId', 'sourceEventId', 'learnedAt', 'areaIds']);
    const mapId = stringField(item, 'mapId', id);
    const sourceEventId = stringField(item, 'sourceEventId', id);
    const learnedAt = tickField(item, 'learnedAt');
    const rawAreaIds = item['areaIds'];
    if (!Array.isArray(rawAreaIds) || rawAreaIds.length === 0)
      throw new RangeError('Invalid map provenance areas');
    const areaIds = rawAreaIds.map((areaId) => {
      if (!id.read(areaId)) throw new RangeError('Invalid map provenance area');
      areaById(areaId);
      return areaId;
    });
    unique(areaIds, (areaId) => areaId);
    return Object.freeze({ mapId, sourceEventId, learnedAt, areaIds: Object.freeze(areaIds) });
  });

  unique(exploredTerrain, (item) => item.areaId);
  unique(liveEntities, (item) => item.entityId);
  unique(lastSeen, (item) => item.entityId);
  unique(rumours, (item) => item.rumourId);
  unique(mapProvenance, (item) => item.mapId);

  return Object.freeze({
    version: WORLD_KNOWLEDGE_VERSION,
    regionVersion: WORLD_REGION_VERSION,
    regionId: SEROE_PORECHYE.regionId,
    exploredTerrain: Object.freeze(exploredTerrain),
    liveEntities: Object.freeze(liveEntities),
    lastSeen: Object.freeze(lastSeen),
    rumours: Object.freeze(rumours),
    mapProvenance: Object.freeze(mapProvenance),
  });
}

/** Project only explicit observer evidence; stale live sightings never become current positions. */
export function projectWorldKnowledge(
  input: unknown,
  atTickInput: CampaignTick,
): PublicWorldKnowledge {
  if (!isExactInteger(atTickInput)) throw new RangeError('Invalid knowledge projection tick');
  const atTick = campaignTick(atTickInput);
  const knowledge = readWorldKnowledge(input);
  const afterNow = (learnedAt: CampaignTick) => {
    if (BigInt(learnedAt) > BigInt(atTick)) throw new RangeError('Knowledge is from the future');
  };
  for (const item of knowledge.exploredTerrain) afterNow(item.learnedAt);
  for (const item of knowledge.liveEntities) afterNow(item.observedAt);
  for (const item of knowledge.lastSeen) afterNow(item.learnedAt);
  for (const item of knowledge.rumours) afterNow(item.learnedAt);
  for (const map of knowledge.mapProvenance) afterNow(map.learnedAt);
  const sortBy = <T>(items: readonly T[], key: (item: T) => string) =>
    Object.freeze([...items].sort((left, right) => compareCodePoints(key(left), key(right))));
  return Object.freeze({
    regionId: knowledge.regionId,
    atTick,
    exploredTerrain: sortBy(knowledge.exploredTerrain, (item) => item.areaId),
    liveEntities: sortBy(
      knowledge.liveEntities.filter((item) => item.observedAt === atTick),
      (item) => item.entityId,
    ),
    lastSeen: sortBy(
      knowledge.lastSeen.filter((item) => BigInt(atTick) < BigInt(item.expiresAt)),
      (item) => item.entityId,
    ),
    rumours: sortBy(
      knowledge.rumours.filter((item) => BigInt(atTick) < BigInt(item.expiresAt)),
      (item) => item.rumourId,
    ),
    mapProvenance: sortBy(knowledge.mapProvenance, (item) => item.mapId),
  });
}
