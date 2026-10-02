import { createHash } from 'node:crypto';
import {
  isDangerousRouteContract,
  TRAVEL_RULES,
  acceptedWorldRegion,
  isEntityId,
  isExactInteger,
} from '@warwrit/game-core';
import type { PartyRouteExecution } from '@warwrit/game-core';

export interface StoredRouteExecutionEnvelope {
  readonly acceptedByAccountId: string;
  readonly execution: PartyRouteExecution;
}

const executionKeys = [
  'companyId',
  'currentSiteId',
  'edgeIds',
  'nextEdgeIndex',
  'partyId',
  'phase',
  'profileId',
  'purpose',
  'regionVersion',
  'routeEpoch',
  'routeExecutionId',
  'schemaVersion',
  'segment',
  'worldId',
].toSorted();

export function storeRouteExecution(
  acceptedByAccountId: string,
  execution: PartyRouteExecution,
): StoredRouteExecutionEnvelope {
  if (!isEntityId(acceptedByAccountId) || !validExecution(execution))
    throw new TypeError('Invalid accepted route execution');
  return { acceptedByAccountId, execution };
}

export function readRouteExecutionEnvelope(value: unknown): StoredRouteExecutionEnvelope {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, ['acceptedByAccountId', 'execution']) ||
    !isEntityId(value['acceptedByAccountId']) ||
    !validExecution(value['execution'])
  )
    throw new TypeError('Stored route execution is invalid');
  return value as unknown as StoredRouteExecutionEnvelope;
}

/** Deterministic, domain-separated SYSTEM command identity for one accepted cursor. */
export function routeContinuationCommandId(execution: PartyRouteExecution): string {
  return derivedRouteCommandId('continue', [
    execution.routeExecutionId,
    String(execution.nextEdgeIndex),
    execution.regionVersion,
    execution.routeEpoch,
  ]);
}

export function routeArrivalCommandId(execution: PartyRouteExecution): string {
  if (!execution.segment) throw new TypeError('Arriving route execution has no segment');
  return derivedRouteCommandId('arrive', [
    execution.routeExecutionId,
    execution.routeEpoch,
    execution.regionVersion,
    String(execution.nextEdgeIndex),
    execution.segment.segmentId,
    execution.segment.dueTick,
  ]);
}

function derivedRouteCommandId(domain: 'arrive' | 'continue', values: readonly string[]): string {
  const hash = createHash('sha256').update(`warwrit:route-${domain}:v2\0`, 'utf8');
  for (const value of values) {
    const bytes = Buffer.from(value, 'utf8');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(bytes.length);
    hash.update(length).update(bytes);
  }
  return `world-travel-${domain}-${hash.digest('hex')}`;
}

function validExecution(value: unknown): value is PartyRouteExecution {
  const hasDangerousAuthorization =
    isRecord(value) && Object.hasOwn(value, 'dangerousAuthorization');
  if (
    !isRecord(value) ||
    !hasExactKeys(
      value,
      hasDangerousAuthorization ? [...executionKeys, 'dangerousAuthorization'] : executionKeys,
    ) ||
    value['schemaVersion'] !== 2 ||
    !isEntityId(value['routeExecutionId']) ||
    !isEntityId(value['worldId']) ||
    !isEntityId(value['companyId']) ||
    !isEntityId(value['partyId']) ||
    !isEntityId(value['regionVersion']) ||
    !isEntityId(value['profileId']) ||
    !isExactInteger(value['routeEpoch']) ||
    (value['purpose'] !== 'NEW' && value['purpose'] !== 'RETURN') ||
    !Array.isArray(value['edgeIds']) ||
    value['edgeIds'].length < 1 ||
    value['edgeIds'].length > 16 ||
    !value['edgeIds'].every(isEntityId) ||
    (value['phase'] !== 'IN_TRANSIT' &&
      value['phase'] !== 'AT_BOUNDARY' &&
      value['phase'] !== 'COMPLETE') ||
    !Number.isSafeInteger(value['nextEdgeIndex']) ||
    (value['nextEdgeIndex'] as number) < 0 ||
    (value['nextEdgeIndex'] as number) > value['edgeIds'].length ||
    !isEntityId(value['currentSiteId']) ||
    (hasDangerousAuthorization &&
      (!validDangerousAuthorization(value['dangerousAuthorization']) ||
        value['profileId'] !== TRAVEL_RULES.profileId ||
        value['edgeIds'].length !== 1 ||
        value['edgeIds'][0] !== 'tikhaya-gat-staraya-melnitsa'))
  )
    return false;
  const segment = value['segment'];
  const region = acceptedWorldRegion(value['regionVersion']);
  if (!region) return false;
  const edges = (value['edgeIds'] as string[]).map((edgeId) =>
    region.edges.filter((edge) => edge.edgeId === edgeId),
  );
  if (edges.some((matches) => matches.length !== 1)) return false;
  const dangerous = edges.some((matches) => matches[0]!.danger !== 'SAFE');
  if (dangerous !== hasDangerousAuthorization) return false;
  if (segment === null)
    return value['phase'] === 'AT_BOUNDARY'
      ? (value['nextEdgeIndex'] as number) < value['edgeIds'].length
      : value['phase'] === 'COMPLETE' && value['nextEdgeIndex'] === value['edgeIds'].length;
  return (
    value['phase'] === 'IN_TRANSIT' &&
    (value['nextEdgeIndex'] as number) < value['edgeIds'].length &&
    isRecord(segment) &&
    hasExactKeys(segment, ['segmentId', 'fromSiteId', 'toSiteId', 'startedAt', 'dueTick']) &&
    isEntityId(segment['segmentId']) &&
    isEntityId(segment['fromSiteId']) &&
    isEntityId(segment['toSiteId']) &&
    isExactInteger(segment['startedAt']) &&
    isExactInteger(segment['dueTick']) &&
    value['currentSiteId'] === segment['fromSiteId']
  );
}

function validDangerousAuthorization(value: unknown): boolean {
  return (
    isRecord(value) &&
    hasExactKeys(value, ['instanceId', 'profileId', 'termsDigest']) &&
    typeof value['instanceId'] === 'string' &&
    typeof value['profileId'] === 'string' &&
    isDangerousRouteContract(value['instanceId'], value['profileId']) &&
    typeof value['termsDigest'] === 'string' &&
    /^[0-9a-f]{64}$/.test(value['termsDigest'])
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).toSorted()) === JSON.stringify(keys.toSorted());
}
