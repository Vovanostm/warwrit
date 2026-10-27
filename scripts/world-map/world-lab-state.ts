import { readContinuousMovementPlan } from '@warwrit/game-core';
import type {
  WorldLabObservedGroupDto,
  WorldLabStateDto,
  WorldLabVisitDto,
} from '@warwrit/protocol';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDecimal(value: unknown): value is string {
  return typeof value === 'string' && /^\d{1,20}$/.test(value);
}

function isCoordinate(value: unknown): value is string {
  return typeof value === 'string' && /^-?\d{1,20}$/.test(value);
}

function isPoint(value: unknown): boolean {
  return isRecord(value) && isCoordinate(value['xMicroFp']) && isCoordinate(value['zMicroFp']);
}

function isMovementPlan(value: unknown): boolean {
  try {
    return readContinuousMovementPlan(value).mapEdition === 'porechye-atlas-lab-v1';
  } catch {
    return false;
  }
}

function isMovement(value: unknown): boolean {
  return (
    isRecord(value) &&
    value['schemaVersion'] === 2 &&
    isDecimal(value['publicRevision']) &&
    isDecimal(value['movementEpoch']) &&
    isDecimal(value['serverTimeMs']) &&
    ['STATIONARY_TERRAIN', 'STATIONARY_SITE', 'MOVING'].includes(String(value['mode'])) &&
    isPoint(value['point']) &&
    (value['plan'] === null || isMovementPlan(value['plan']))
  );
}

function isObservedGroup(value: unknown): value is WorldLabObservedGroupDto {
  return (
    isRecord(value) &&
    typeof value['id'] === 'string' &&
    typeof value['name'] === 'string' &&
    ['PLAYER', 'PATROL', 'BANDITS', 'WILDLIFE', 'CREATURE'].includes(String(value['kind'])) &&
    ['MOVING', 'IDLE'].includes(String(value['state'])) &&
    isPoint(value['point']) &&
    isDecimal(value['observedAtMs']) &&
    isDecimal(value['movementEpoch']) &&
    (value['pursuable'] === undefined || typeof value['pursuable'] === 'boolean')
  );
}

function isWorldMetadata(value: unknown): value is Record<string, unknown> {
  return (
    isRecord(value) &&
    value['schemaVersion'] === 1 &&
    typeof value['worldId'] === 'string' &&
    value['mapEdition'] === 'porechye-atlas-lab-v1' &&
    isDecimal(value['sequence']) &&
    isDecimal(value['serverTimeMs']) &&
    typeof value['timeScale'] === 'number' &&
    Number.isFinite(value['timeScale']) &&
    value['timeScale'] > 0 &&
    value['timeScale'] <= 128 &&
    ['DAY', 'NIGHT'].includes(String(value['light'])) &&
    ['company-a', 'company-b'].includes(String(value['slot']))
  );
}

function isOwnCompany(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value['companyId'] === 'string' &&
    typeof value['partyId'] === 'string' &&
    typeof value['name'] === 'string' &&
    isMovement(value['movement'])
  );
}

function isPursuit(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (isRecord(value) &&
      typeof value['orderId'] === 'string' &&
      typeof value['targetId'] === 'string' &&
      typeof value['targetName'] === 'string' &&
      isPoint(value['lastPoint']) &&
      isDecimal(value['movementEpoch']) &&
      ['CHASING', 'LAST_SEEN', 'REACHED', 'BLOCKED'].includes(String(value['status'])))
  );
}

function isWorldProjection(value: Record<string, unknown>): boolean {
  return (
    Array.isArray(value['groups']) &&
    value['groups'].every(isObservedGroup) &&
    isPursuit(value['pursuit']) &&
    (value['nearbySite'] === null ||
      (isRecord(value['nearbySite']) &&
        typeof value['nearbySite']['siteId'] === 'string' &&
        typeof value['nearbySite']['name'] === 'string'))
  );
}

/** Reject malformed or foreign-edition observations before they reach the map. */
export function readWorldLabState(value: unknown): WorldLabStateDto | undefined {
  if (!isWorldMetadata(value) || !isOwnCompany(value['own']) || !isWorldProjection(value))
    return undefined;
  return value as unknown as WorldLabStateDto;
}

/** Validate the server-authorized visit response before rendering its image. */
export function readWorldLabVisit(
  value: unknown,
  expectedSiteId: string,
): WorldLabVisitDto | undefined {
  if (
    !isRecord(value) ||
    value['schemaVersion'] !== 1 ||
    value['siteId'] !== expectedSiteId ||
    typeof value['name'] !== 'string' ||
    typeof value['image'] !== 'string'
  )
    return undefined;
  if (
    !value['image'].startsWith('/assets/art/m1/places/settlements-v2/') ||
    value['image'].includes('..')
  )
    throw new Error('Сервер вернул неверный адрес изображения поселения.');
  return value as unknown as WorldLabVisitDto;
}

/** Same-sequence refreshes are allowed; an older room message never rolls state back. */
export function isWorldLabStateNotOlder(
  next: WorldLabStateDto,
  current: WorldLabStateDto,
): boolean {
  return (
    next.worldId === current.worldId &&
    next.own.companyId === current.own.companyId &&
    BigInt(next.sequence) >= BigInt(current.sequence) &&
    BigInt(next.own.movement.publicRevision) >= BigInt(current.own.movement.publicRevision) &&
    BigInt(next.own.movement.movementEpoch) >= BigInt(current.own.movement.movementEpoch) &&
    BigInt(next.own.movement.serverTimeMs) >= BigInt(current.own.movement.serverTimeMs)
  );
}

/** Projection reads overlap; retain newer observations only for still-visible IDs. */
export function preserveNewerWorldLabGroups(
  next: WorldLabStateDto,
  current: WorldLabStateDto | undefined,
): WorldLabStateDto {
  if (!current) return next;
  const previous = new Map(current.groups.map((group) => [group.id, group]));
  return {
    ...next,
    groups: next.groups.map((group) => {
      const prior = previous.get(group.id);
      return prior &&
        (BigInt(prior.movementEpoch) > BigInt(group.movementEpoch) ||
          (prior.movementEpoch === group.movementEpoch &&
            BigInt(prior.observedAtMs) > BigInt(group.observedAtMs)))
        ? prior
        : group;
    }),
  };
}
