import type {
  WorldFreeMovementPreviewResponseDto,
  WorldFreeMovementRequestDto,
  WorldFreeMovementResponseDto,
} from '@warwrit/protocol';
import { worldPartyReadHeaders } from './world-travel-attempt.js';
export { worldPartyReadHeaders };

export interface FreeMovementStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface FreeMovementScope {
  readonly accountId: string;
  readonly companyId: string;
}

export type FreeMovementAction =
  | {
      readonly kind: 'START' | 'REROUTE';
      readonly destination: { readonly q: number; readonly r: number };
    }
  | { readonly kind: 'STOP' };

export interface FreeMovementAttempt {
  readonly scope: FreeMovementScope;
  readonly request: WorldFreeMovementRequestDto;
}

export type FreeMovementPostResult =
  | { readonly kind: 'ACCEPTED'; readonly response: WorldFreeMovementResponseDto }
  | { readonly kind: 'REJECTED'; readonly code: string }
  | { readonly kind: 'UNKNOWN' };

export function createFreeMovementAttempt(input: {
  readonly scope: FreeMovementScope;
  readonly current: WorldFreeMovementResponseDto;
  readonly commandId: string;
  readonly action: FreeMovementAction;
}): FreeMovementAttempt {
  const party = input.current.party;
  if (!party || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(input.commandId))
    throw new Error('Состояние партии изменилось. Обновите карту.');
  if (input.action.kind === 'STOP' && input.current.movement?.status !== 'MOVING')
    throw new Error('Отряд уже не движется. Обновите карту.');
  if (input.action.kind === 'REROUTE' && input.current.movement?.status !== 'MOVING')
    throw new Error('Нет активного пути для перенаправления. Обновите карту.');
  if (input.action.kind === 'START' && input.current.movement?.status === 'MOVING')
    throw new Error('Для нового направления используйте перенаправление.');
  return Object.freeze({
    scope: Object.freeze({ ...input.scope }),
    request: Object.freeze({
      schemaVersion: 1,
      commandId: input.commandId,
      expectedPublicRevision: input.current.publicRevision,
      expectedRouteEpoch: party.routeEpoch,
      action:
        input.action.kind === 'STOP'
          ? Object.freeze({ kind: 'STOP' as const })
          : Object.freeze({
              kind: input.action.kind,
              destination: Object.freeze({ ...input.action.destination }),
            }),
    }),
  });
}

function freeMovementAttemptKey(scope: FreeMovementScope): string {
  return `warwrit:free-movement:v1:${scope.accountId}:${scope.companyId}`;
}

export function readFreeMovementAttempt(
  storage: FreeMovementStorage,
  scope: FreeMovementScope,
): FreeMovementAttempt | undefined {
  try {
    const raw = storage.getItem(freeMovementAttemptKey(scope));
    if (!raw) return undefined;
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || !isRecord(value['scope']) || !isRecord(value['request']))
      return undefined;
    const request = value['request'];
    if (
      value['scope']['accountId'] !== scope.accountId ||
      value['scope']['companyId'] !== scope.companyId ||
      request['schemaVersion'] !== 1 ||
      typeof request['commandId'] !== 'string' ||
      typeof request['expectedPublicRevision'] !== 'string' ||
      typeof request['expectedRouteEpoch'] !== 'string' ||
      !isRecord(request['action'])
    )
      return undefined;
    const action = request['action'];
    const validAction =
      action['kind'] === 'STOP'
        ? Object.keys(action).length === 1
        : ['START', 'REROUTE'].includes(String(action['kind'])) && isHex(action['destination']);
    if (!validAction) return undefined;
    return Object.freeze({
      scope: Object.freeze({ accountId: scope.accountId, companyId: scope.companyId }),
      request: Object.freeze(request as unknown as WorldFreeMovementRequestDto),
    });
  } catch {
    return undefined;
  }
}

export function saveFreeMovementAttempt(
  storage: FreeMovementStorage,
  attempt: FreeMovementAttempt,
): void {
  storage.setItem(freeMovementAttemptKey(attempt.scope), JSON.stringify(attempt));
}

export function clearFreeMovementAttempt(
  storage: FreeMovementStorage,
  scope: FreeMovementScope,
): void {
  storage.removeItem(freeMovementAttemptKey(scope));
}

export function readFreeMovementPreview(
  value: unknown,
): WorldFreeMovementPreviewResponseDto | undefined {
  if (
    !isRecord(value) ||
    value['schemaVersion'] !== 1 ||
    typeof value['worldTick'] !== 'string' ||
    typeof value['publicRevision'] !== 'string' ||
    typeof value['routeEpoch'] !== 'string' ||
    typeof value['regionVersion'] !== 'string' ||
    typeof value['profileId'] !== 'string' ||
    !Number.isSafeInteger(value['ticksPerHex']) ||
    Number(value['ticksPerHex']) < 1 ||
    !isHex(value['from']) ||
    !isHex(value['to']) ||
    !Array.isArray(value['path']) ||
    !value['path'].every(isHex) ||
    typeof value['arrivesAt'] !== 'string' ||
    typeof value['requiredStockUnits'] !== 'string' ||
    typeof value['availableStockUnits'] !== 'string' ||
    typeof value['knownShortage'] !== 'boolean'
  )
    return undefined;
  return value as unknown as WorldFreeMovementPreviewResponseDto;
}

export function readFreeMovementResponse(value: unknown): WorldFreeMovementResponseDto | undefined {
  if (
    !isRecord(value) ||
    value['schemaVersion'] !== 1 ||
    typeof value['worldTick'] !== 'string' ||
    typeof value['publicRevision'] !== 'string' ||
    !(value['party'] === null || isRecord(value['party'])) ||
    !(value['movement'] === null || isRecord(value['movement']))
  )
    return undefined;
  if (isRecord(value['party'])) {
    const party = value['party'];
    if (
      typeof party['partyId'] !== 'string' ||
      typeof party['routeEpoch'] !== 'string' ||
      !isRecord(party['position']) ||
      !Number.isSafeInteger(party['position']['q']) ||
      !Number.isSafeInteger(party['position']['r']) ||
      !['SITE', 'TERRAIN'].includes(String(party['position']['kind']))
    )
      return undefined;
  }
  if (isRecord(value['movement'])) {
    const movement = value['movement'];
    if (
      typeof movement['segmentId'] !== 'string' ||
      typeof movement['routeEpoch'] !== 'string' ||
      typeof movement['regionVersion'] !== 'string' ||
      typeof movement['profileId'] !== 'string' ||
      !Number.isSafeInteger(movement['ticksPerHex']) ||
      Number(movement['ticksPerHex']) < 1 ||
      typeof movement['startedAt'] !== 'string' ||
      typeof movement['arrivesAt'] !== 'string' ||
      !isHex(movement['from']) ||
      !isHex(movement['to']) ||
      !isHex(movement['position']) ||
      !Array.isArray(movement['path']) ||
      !movement['path'].every(isHex) ||
      !['MOVING', 'STOPPED', 'ARRIVED'].includes(String(movement['status']))
    )
      return undefined;
  }
  return value as unknown as WorldFreeMovementResponseDto;
}

export function classifyFreeMovementPost(
  status: number,
  value: unknown,
  commandId: string,
): FreeMovementPostResult {
  if (!isRecord(value) || value['schemaVersion'] !== 1 || value['commandId'] !== commandId)
    return { kind: 'UNKNOWN' };
  if (status >= 200 && status < 300 && isFreeMovementResponse(value))
    return { kind: 'ACCEPTED', response: value as unknown as WorldFreeMovementResponseDto };
  if (status >= 400 && status < 500 && value['ok'] === false && typeof value['code'] === 'string')
    return { kind: 'REJECTED', code: value['code'] };
  return { kind: 'UNKNOWN' };
}

function isFreeMovementResponse(value: Record<string, unknown>): boolean {
  return (
    typeof value['worldTick'] === 'string' &&
    typeof value['publicRevision'] === 'string' &&
    (value['party'] === null || isRecord(value['party'])) &&
    (value['movement'] === null || isRecord(value['movement']))
  );
}

function isHex(value: unknown): value is { readonly q: number; readonly r: number } {
  return isRecord(value) && Number.isSafeInteger(value['q']) && Number.isSafeInteger(value['r']);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
