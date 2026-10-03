import type {
  WorldAvailableDepartureDto,
  WorldPartyReadResponseDto,
  WorldPartyReadResponseV1Dto,
  WorldPartyReadResponseV2Dto,
  WorldTravelRejectionDto,
  WorldTravelRequestDto,
  WorldTravelResponseDto,
  WorldTravelPreviewRequestDto,
  WorldTravelPreviewResponseDto,
  WorldTravelV2RequestDto,
  WorldTravelV2ResponseDto,
} from '@warwrit/protocol';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';

export interface WorldTravelScope {
  readonly accountId: string;
  readonly companyId: string;
}

export interface WorldTravelAttempt {
  readonly scope: WorldTravelScope;
  readonly request: WorldTravelRequestDto | WorldTravelV2RequestDto;
  /** The exact bytes submitted on every retry. */
  readonly body: string;
  readonly arrivalProof?: WorldTravelArrivalProof;
}

export interface WorldTravelArrivalProof {
  readonly commandId: string;
  readonly expectedPublicRevision: string;
  readonly expectedRouteEpoch: string;
  readonly arrivalTick: string;
  readonly dueTick: string;
}

export interface WorldTravelStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function worldPartyReadHeaders(scope: WorldTravelScope): Readonly<Record<string, string>> {
  return Object.freeze({ [WORLD_EXPECTED_COMPANY_ID_HEADER]: scope.companyId });
}

export interface WorldTravelReturnWindow {
  readonly scope: WorldTravelScope;
  readonly arrivalTick: string;
  readonly routeEpoch: string;
}

export type WorldTravelAction =
  | {
      readonly kind: 'DEPART';
      readonly departure: WorldAvailableDepartureDto;
    }
  | { readonly kind: 'ARRIVE' };

export function createWorldTravelPreviewRequest(
  departure: WorldAvailableDepartureDto,
): WorldTravelPreviewRequestDto {
  return {
    schemaVersion: 1,
    purpose: departure.purpose,
    edgeIds: [...departure.edgeIds],
  };
}

export function readWorldTravelPreview(value: unknown): WorldTravelPreviewResponseDto | undefined {
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'schemaVersion',
      'publicRevision',
      'routeEpoch',
      'atTick',
      'purpose',
      'edgeIds',
      'knownShortage',
      'assumptions',
      'requiredStockUnits',
      'availableStockUnits',
    ]) ||
    value['schemaVersion'] !== 1 ||
    !isIntegerString(value['publicRevision']) ||
    !isIntegerString(value['routeEpoch']) ||
    !isIntegerString(value['atTick']) ||
    (value['purpose'] !== 'NEW' && value['purpose'] !== 'RETURN') ||
    !isStringArray(value['edgeIds']) ||
    value['edgeIds'].length === 0 ||
    value['edgeIds'].length > 16 ||
    typeof value['knownShortage'] !== 'boolean' ||
    !isStringArray(value['assumptions']) ||
    !isIntegerString(value['requiredStockUnits']) ||
    !isIntegerString(value['availableStockUnits'])
  )
    return undefined;
  return {
    schemaVersion: 1,
    publicRevision: value['publicRevision'],
    routeEpoch: value['routeEpoch'],
    atTick: value['atTick'],
    purpose: value['purpose'],
    edgeIds: [...value['edgeIds']],
    knownShortage: value['knownShortage'],
    assumptions: [...value['assumptions']],
    requiredStockUnits: value['requiredStockUnits'],
    availableStockUnits: value['availableStockUnits'],
  };
}

export type WorldTravelAttemptRead =
  | { readonly kind: 'EMPTY' }
  | { readonly kind: 'FOUND'; readonly attempt: WorldTravelAttempt }
  | { readonly kind: 'INVALID' }
  | { readonly kind: 'UNAVAILABLE' };

export type WorldTravelPostResult =
  | {
      readonly kind: 'ACCEPTED';
      readonly response: WorldTravelResponseDto | WorldTravelV2ResponseDto;
    }
  | { readonly kind: 'REJECTED'; readonly rejection: WorldTravelRejectionDto }
  | { readonly kind: 'UNAUTHENTICATED' }
  | { readonly kind: 'FORBIDDEN' }
  | { readonly kind: 'UNKNOWN' };

export type WorldTravelExecution =
  | {
      readonly kind: 'ACCEPTED';
      readonly receipt: WorldTravelResponseDto | WorldTravelV2ResponseDto;
      readonly current: WorldPartyReadResponseDto;
    }
  | {
      readonly kind: 'ACCEPTED_UNREFRESHED';
      readonly receipt: WorldTravelResponseDto | WorldTravelV2ResponseDto;
    }
  | {
      readonly kind: 'REJECTED';
      readonly rejection: WorldTravelRejectionDto;
      readonly current: WorldPartyReadResponseDto;
    }
  | { readonly kind: 'REJECTED_UNREFRESHED'; readonly rejection: WorldTravelRejectionDto }
  | { readonly kind: 'UNAUTHENTICATED' }
  | { readonly kind: 'FORBIDDEN' }
  | { readonly kind: 'UNKNOWN' }
  | { readonly kind: 'CANCELLED' };

export interface WorldTravelTransport {
  post(
    body: string,
    signal: AbortSignal,
    persistedAttempt: WorldTravelAttempt,
  ): Promise<{ readonly status: number; readonly body: unknown }>;
  refresh(signal: AbortSignal): Promise<WorldPartyReadResponseDto>;
}

export class WorldTravelRefreshError extends Error {
  constructor(readonly kind: 'UNAUTHENTICATED' | 'FORBIDDEN') {
    super(kind);
  }
}

export function createWorldTravelAttempt(input: {
  readonly scope: WorldTravelScope;
  readonly current: WorldPartyReadResponseDto;
  readonly commandId: string;
  readonly action: WorldTravelAction;
}): WorldTravelAttempt {
  if (!input.current.party) throw new TypeError('A party is required for world travel');
  if (input.action.kind === 'DEPART') {
    const offered = input.current.availableDepartures ?? [];
    const departure = input.action.departure;
    const canLeave =
      input.current.schemaVersion === 1
        ? input.current.route === null
        : input.current.execution === null || input.current.execution.phase === 'COMPLETE';
    if (
      !canLeave ||
      !offered.some(
        (candidate) =>
          candidate.purpose === departure.purpose &&
          candidate.fromSiteId === departure.fromSiteId &&
          candidate.toSiteId === departure.toSiteId &&
          JSON.stringify(candidate.edgeIds) === JSON.stringify(departure.edgeIds),
      )
    )
      throw new TypeError('Departure is not offered by the current world state');
  } else if (input.current.schemaVersion !== 1) {
    throw new TypeError('Arrival requires a V1 party route');
  }
  const request: WorldTravelRequestDto | WorldTravelV2RequestDto =
    input.action.kind === 'ARRIVE'
      ? {
          schemaVersion: 1,
          commandId: input.commandId,
          expectedPublicRevision: input.current.publicRevision,
          expectedRouteEpoch: input.current.party.routeEpoch,
          action: { kind: 'ARRIVE' },
        }
      : {
          schemaVersion: 2,
          commandId: input.commandId,
          expectedPublicRevision: input.current.publicRevision,
          expectedRouteEpoch: input.current.party.routeEpoch,
          purpose: input.action.departure.purpose,
          edgeIds: [...input.action.departure.edgeIds],
        };
  const body = JSON.stringify(request);
  const route = input.current.schemaVersion === 1 ? input.current.route : null;
  const party = input.current.party;
  const arrivalProof =
    request.schemaVersion === 1 &&
    input.action.kind === 'ARRIVE' &&
    route?.canArrive === true &&
    route.routeEpoch === party.routeEpoch &&
    input.current.worldTick === route.dueTick
      ? {
          commandId: request.commandId,
          expectedPublicRevision: request.expectedPublicRevision,
          expectedRouteEpoch: request.expectedRouteEpoch,
          arrivalTick: input.current.worldTick,
          dueTick: route.dueTick,
        }
      : undefined;
  return freezeAttempt(input.scope, request, body, arrivalProof);
}

export function attemptStorageKey(scope: WorldTravelScope): string {
  return `warwrit:world-travel:v1:${encodeURIComponent(scope.accountId)}:${encodeURIComponent(scope.companyId)}:attempt`;
}

export function returnWindowStorageKey(scope: WorldTravelScope): string {
  return `warwrit:world-travel:v2:${encodeURIComponent(scope.accountId)}:${encodeURIComponent(scope.companyId)}:return`;
}

export function readWorldTravelAttempt(
  storage: WorldTravelStorage,
  scope: WorldTravelScope,
): WorldTravelAttemptRead {
  let stored: string | null;
  try {
    stored = storage.getItem(attemptStorageKey(scope));
  } catch {
    return { kind: 'UNAVAILABLE' };
  }
  if (stored === null) return { kind: 'EMPTY' };
  try {
    const envelope: unknown = JSON.parse(stored);
    if (!isRecord(envelope) || envelope['version'] !== 1) throw new TypeError();
    if (envelope['accountId'] !== scope.accountId || envelope['companyId'] !== scope.companyId)
      throw new TypeError();
    if (typeof envelope['body'] !== 'string') throw new TypeError();
    const requestValue: unknown = JSON.parse(envelope['body']);
    if (!isTravelRequest(requestValue) || JSON.stringify(requestValue) !== envelope['body'])
      throw new TypeError();
    return {
      kind: 'FOUND',
      attempt: freezeAttempt(
        scope,
        requestValue,
        envelope['body'],
        readArrivalProof(envelope['arrivalProof'], requestValue),
      ),
    };
  } catch {
    try {
      storage.removeItem(attemptStorageKey(scope));
    } catch {
      return { kind: 'UNAVAILABLE' };
    }
    return { kind: 'INVALID' };
  }
}

export function saveWorldTravelAttempt(
  storage: WorldTravelStorage,
  attempt: WorldTravelAttempt,
): void {
  storage.setItem(
    attemptStorageKey(attempt.scope),
    JSON.stringify({
      version: 1,
      accountId: attempt.scope.accountId,
      companyId: attempt.scope.companyId,
      body: attempt.body,
      ...(attempt.arrivalProof === undefined ? {} : { arrivalProof: attempt.arrivalProof }),
    }),
  );
}

export function clearWorldTravelAttempt(
  storage: WorldTravelStorage,
  scope: WorldTravelScope,
): void {
  storage.removeItem(attemptStorageKey(scope));
}

function readWorldTravelReturnWindow(
  storage: WorldTravelStorage,
  scope: WorldTravelScope,
): WorldTravelReturnWindow | undefined {
  try {
    storage.removeItem(legacyReturnWindowStorageKey(scope));
    const stored = storage.getItem(returnWindowStorageKey(scope));
    if (stored === null) return undefined;
    const value: unknown = JSON.parse(stored);
    if (
      !isRecord(value) ||
      value['version'] !== 2 ||
      value['accountId'] !== scope.accountId ||
      value['companyId'] !== scope.companyId ||
      !isIntegerString(value['arrivalTick']) ||
      !isIntegerString(value['routeEpoch'])
    ) {
      storage.removeItem(returnWindowStorageKey(scope));
      storage.removeItem(legacyReturnWindowStorageKey(scope));
      return undefined;
    }
    return {
      scope: freezeScope(scope),
      arrivalTick: value['arrivalTick'],
      routeEpoch: value['routeEpoch'],
    };
  } catch {
    return undefined;
  }
}

export function isWorldTravelReturnWindowOpen(
  storage: WorldTravelStorage,
  scope: WorldTravelScope,
  current: WorldPartyReadResponseDto,
): boolean {
  const window = readWorldTravelReturnWindow(storage, scope);
  if (current.schemaVersion !== 1) return false;
  const party = current.party;
  const open =
    window !== undefined &&
    party?.location === 'kamenny-brod' &&
    current.route === null &&
    window.arrivalTick === current.worldTick &&
    window.routeEpoch === party.routeEpoch;
  if (window !== undefined && !open) clearWorldTravelReturnWindow(storage, scope);
  return open;
}

export function onTimeWorldTravelReturnWindow(
  attempt: WorldTravelAttempt,
  receipt: WorldTravelResponseDto | WorldTravelV2ResponseDto,
  current: WorldPartyReadResponseDto,
): WorldTravelReturnWindow | undefined {
  const proof = attempt.arrivalProof;
  const isEligible =
    attempt.request.schemaVersion === 1 &&
    receipt.schemaVersion === 1 &&
    attempt.request.action.kind === 'ARRIVE' &&
    proof !== undefined &&
    proof.commandId === attempt.request.commandId &&
    proof.expectedPublicRevision === attempt.request.expectedPublicRevision &&
    proof.expectedRouteEpoch === attempt.request.expectedRouteEpoch &&
    proof.arrivalTick === proof.dueTick &&
    receipt.commandId === proof.commandId &&
    receipt.worldTick === proof.arrivalTick &&
    receipt.party?.location === 'kamenny-brod' &&
    receipt.party.routeEpoch === proof.expectedRouteEpoch &&
    receipt.route === null &&
    current.schemaVersion === 1 &&
    current.worldTick === proof.arrivalTick &&
    current.party?.location === 'kamenny-brod' &&
    current.party.routeEpoch === proof.expectedRouteEpoch &&
    current.route === null;
  return isEligible && proof !== undefined
    ? {
        scope: attempt.scope,
        arrivalTick: proof.arrivalTick,
        routeEpoch: proof.expectedRouteEpoch,
      }
    : undefined;
}

export function saveWorldTravelReturnWindow(
  storage: WorldTravelStorage,
  window: WorldTravelReturnWindow,
): void {
  storage.setItem(
    returnWindowStorageKey(window.scope),
    JSON.stringify({
      version: 2,
      accountId: window.scope.accountId,
      companyId: window.scope.companyId,
      arrivalTick: window.arrivalTick,
      routeEpoch: window.routeEpoch,
    }),
  );
}

export function clearWorldTravelReturnWindow(
  storage: WorldTravelStorage,
  scope: WorldTravelScope,
): void {
  storage.removeItem(returnWindowStorageKey(scope));
  storage.removeItem(legacyReturnWindowStorageKey(scope));
}

export function clearWorldTravelScope(storage: WorldTravelStorage, scope: WorldTravelScope): void {
  clearWorldTravelAttempt(storage, scope);
  clearWorldTravelReturnWindow(storage, scope);
}

export function readWorldPartyResponse(value: unknown): WorldPartyReadResponseDto | undefined {
  if (!isRecord(value)) return undefined;
  if (value['schemaVersion'] === 2) return readWorldPartyV2Response(value);
  if (value['schemaVersion'] !== 1) return undefined;
  const worldTick = value['worldTick'];
  const publicRevision = value['publicRevision'];
  const availableDepartures = readAvailableDepartures(value['availableDepartures']);
  if (availableDepartures === undefined) return undefined;
  if (!isIntegerString(worldTick) || !isIntegerString(publicRevision)) return undefined;
  const party = readParty(value['party']);
  const route = readRoute(value['route']);
  if (party === undefined || route === undefined) return undefined;
  if (party === null && route !== null) return undefined;
  if (party && route && party.routeEpoch !== route.routeEpoch) return undefined;
  return { schemaVersion: 1, worldTick, publicRevision, party, route, availableDepartures };
}

export function readWorldTravelResponse(
  value: unknown,
  commandId: string,
): WorldTravelResponseDto | WorldTravelV2ResponseDto | undefined {
  if (
    !isRecord(value) ||
    typeof value['commandId'] !== 'string' ||
    value['commandId'] !== commandId
  )
    return undefined;
  if (value['schemaVersion'] === 2) {
    if (!isWorldTravelCommandId(commandId)) return undefined;
    const { commandId: receiptCommandId, ...response } = value;
    const party = readWorldPartyResponse(response);
    if (!party || party.schemaVersion !== 2) return undefined;
    return { ...party, commandId: receiptCommandId };
  }
  const party = readWorldPartyResponse(value);
  if (!party) return undefined;
  if (value['schemaVersion'] !== 1) return undefined;
  return { ...party, commandId };
}

export function classifyWorldTravelPost(
  status: number,
  body: unknown,
  commandId: string,
): WorldTravelPostResult {
  if (status === 401) return { kind: 'UNAUTHENTICATED' };
  if (status >= 500) return { kind: 'UNKNOWN' };
  if (status === 200) {
    const response = readWorldTravelResponse(body, commandId);
    return response ? { kind: 'ACCEPTED', response } : { kind: 'UNKNOWN' };
  }
  const rejection = readWorldTravelRejection(body, commandId);
  if (!rejection) return { kind: 'UNKNOWN' };
  if (status === 403 && rejection.code === 'NOT_AUTHORIZED') return { kind: 'FORBIDDEN' };
  if ((status === 400 && rejection.code === 'INVALID_COMMAND') || status === 409)
    return { kind: 'REJECTED', rejection };
  return { kind: 'UNKNOWN' };
}

export async function executeWorldTravelAttempt(input: {
  readonly attempt: WorldTravelAttempt;
  readonly transport: WorldTravelTransport;
  readonly signal: AbortSignal;
  readonly isCurrent: () => boolean;
}): Promise<WorldTravelExecution> {
  const current = () => !input.signal.aborted && input.isCurrent();
  let posted: { readonly status: number; readonly body: unknown };
  try {
    posted = await input.transport.post(input.attempt.body, input.signal, input.attempt);
  } catch {
    return current() ? { kind: 'UNKNOWN' } : { kind: 'CANCELLED' };
  }
  if (!current()) return { kind: 'CANCELLED' };
  const result = classifyWorldTravelPost(
    posted.status,
    posted.body,
    input.attempt.request.commandId,
  );
  if (result.kind === 'UNAUTHENTICATED' || result.kind === 'FORBIDDEN' || result.kind === 'UNKNOWN')
    return current() ? result : { kind: 'CANCELLED' };

  try {
    const refreshed = await input.transport.refresh(input.signal);
    if (!current()) return { kind: 'CANCELLED' };
    return result.kind === 'ACCEPTED'
      ? { kind: 'ACCEPTED', receipt: result.response, current: refreshed }
      : { kind: 'REJECTED', rejection: result.rejection, current: refreshed };
  } catch (error) {
    if (!current()) return { kind: 'CANCELLED' };
    if (error instanceof WorldTravelRefreshError) return { kind: error.kind };
    return result.kind === 'ACCEPTED'
      ? { kind: 'ACCEPTED_UNREFRESHED', receipt: result.response }
      : { kind: 'REJECTED_UNREFRESHED', rejection: result.rejection };
  }
}

export function isWorldTravelOperationCurrent(input: {
  readonly operationGeneration: number;
  readonly currentGeneration: number;
  readonly operationScope: WorldTravelScope;
  readonly currentScope: WorldTravelScope;
  readonly signal: AbortSignal;
}): boolean {
  return (
    !input.signal.aborted &&
    input.operationGeneration === input.currentGeneration &&
    input.operationScope.accountId === input.currentScope.accountId &&
    input.operationScope.companyId === input.currentScope.companyId
  );
}

export function worldTravelRejectionMessage(code: WorldTravelRejectionDto['code']): string {
  switch (code) {
    case 'STALE_REVISION':
    case 'STALE_ROUTE_EPOCH':
      return 'Состояние мира изменилось. Текущие данные обновлены; выберите действие заново.';
    case 'INVALID_ARRIVAL':
      return 'Сервер пока не разрешает подтвердить прибытие.';
    case 'INVALID_ROUTE':
      return 'Сервер отклонил этот переход. Проверьте обновлённое место партии.';
    case 'INSUFFICIENT_ITEMS':
      return 'Для этого пути не хватает нужных припасов.';
    case 'INSUFFICIENT_STAMINA':
      return 'Партия пока не готова к этому пути.';
    case 'UNSUPPORTED_ACTION':
      return 'Сервер пока не поддерживает это действие или отложенный уход.';
    case 'NOT_AUTHORIZED':
      return 'У этой учётной записи нет доступа к партии.';
    case 'INVALID_COMMAND':
      return 'Сервер не принял запрос. Обновите состояние перед новым действием.';
  }
}

function readWorldTravelRejection(
  value: unknown,
  commandId: string,
): WorldTravelRejectionDto | undefined {
  if (
    !isRecord(value) ||
    (value['schemaVersion'] !== 1 && value['schemaVersion'] !== 2) ||
    value['commandId'] !== commandId ||
    value['ok'] !== false ||
    !isIntegerString(value['publicRevision']) ||
    !isTravelRejectionCode(value['code'])
  )
    return undefined;
  return value as unknown as WorldTravelRejectionDto;
}

function readWorldPartyV2Response(
  value: Record<string, unknown>,
): WorldPartyReadResponseV2Dto | undefined {
  if (
    (!hasExactKeys(value, ['schemaVersion', 'worldTick', 'publicRevision', 'party', 'execution']) &&
      !hasExactKeys(value, [
        'schemaVersion',
        'worldTick',
        'publicRevision',
        'party',
        'availableDepartures',
        'execution',
      ])) ||
    !isIntegerString(value['worldTick']) ||
    !isIntegerString(value['publicRevision'])
  )
    return undefined;
  const partyValue = value['party'];
  if (
    !isRecord(partyValue) ||
    !hasExactKeys(partyValue, ['partyId', 'location', 'memberIds', 'routeEpoch'])
  )
    return undefined;
  const party = readParty(value['party']);
  const availableDepartures = readAvailableDepartures(value['availableDepartures']);
  const execution = readExecution(value['execution']);
  if (
    party === undefined ||
    party === null ||
    availableDepartures === undefined ||
    execution === undefined
  )
    return undefined;
  if (execution !== null) {
    const completed = execution.phase === 'COMPLETE';
    if (
      (completed &&
        (execution.nextEdgeIndex !== execution.edgeIds.length ||
          execution.activeSegment !== null)) ||
      (!completed && execution.nextEdgeIndex >= execution.edgeIds.length) ||
      (execution.phase === 'IN_TRANSIT' && execution.activeSegment === null) ||
      (execution.phase === 'AT_BOUNDARY' && execution.activeSegment !== null)
    )
      return undefined;
  }
  return {
    schemaVersion: 2,
    worldTick: value['worldTick'],
    publicRevision: value['publicRevision'],
    party,
    availableDepartures,
    execution,
  };
}

function readAvailableDepartures(value: unknown): WorldAvailableDepartureDto[] | undefined {
  if (value === undefined) return [];
  if (!Array.isArray(value)) return undefined;
  const departures: WorldAvailableDepartureDto[] = [];
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, ['purpose', 'edgeIds', 'fromSiteId', 'toSiteId']) ||
      (candidate['purpose'] !== 'NEW' && candidate['purpose'] !== 'RETURN') ||
      !isStringArray(candidate['edgeIds']) ||
      candidate['edgeIds'].length === 0 ||
      candidate['edgeIds'].length > 16 ||
      typeof candidate['fromSiteId'] !== 'string' ||
      typeof candidate['toSiteId'] !== 'string'
    )
      return undefined;
    departures.push({
      purpose: candidate['purpose'],
      edgeIds: [...candidate['edgeIds']],
      fromSiteId: candidate['fromSiteId'],
      toSiteId: candidate['toSiteId'],
    });
  }
  return departures;
}

function readParty(value: unknown): WorldPartyReadResponseV1Dto['party'] | undefined {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    typeof value['partyId'] !== 'string' ||
    typeof value['location'] !== 'string' ||
    !isStringArray(value['memberIds']) ||
    !isIntegerString(value['routeEpoch']) ||
    (value['movementVersion'] !== undefined &&
      value['movementVersion'] !== 1 &&
      value['movementVersion'] !== 2)
  )
    return undefined;
  return {
    partyId: value['partyId'],
    ...(value['movementVersion'] === 1 || value['movementVersion'] === 2
      ? { movementVersion: value['movementVersion'] }
      : {}),
    location: value['location'],
    memberIds: [...value['memberIds']],
    routeEpoch: value['routeEpoch'],
  };
}

function readRoute(value: unknown): WorldPartyReadResponseV1Dto['route'] | undefined {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !isIntegerString(value['routeEpoch']) ||
    typeof value['segmentId'] !== 'string' ||
    !isStringArray(value['edgeIds']) ||
    value['edgeIds'].length === 0 ||
    typeof value['regionVersion'] !== 'string' ||
    typeof value['profileId'] !== 'string' ||
    !isIntegerString(value['startedAt']) ||
    !isIntegerString(value['dueTick']) ||
    !isIntegerString(value['remainingTicks']) ||
    typeof value['canArrive'] !== 'boolean'
  )
    return undefined;
  return {
    routeEpoch: value['routeEpoch'],
    segmentId: value['segmentId'],
    edgeIds: [...value['edgeIds']],
    regionVersion: value['regionVersion'],
    profileId: value['profileId'],
    startedAt: value['startedAt'],
    dueTick: value['dueTick'],
    remainingTicks: value['remainingTicks'],
    canArrive: value['canArrive'],
  };
}

function readExecution(value: unknown): WorldPartyReadResponseV2Dto['execution'] | undefined {
  if (value === null) return null;
  if (
    !isRecord(value) ||
    !hasExactKeys(value, [
      'routeExecutionId',
      'purpose',
      'regionVersion',
      'edgeIds',
      'phase',
      'nextEdgeIndex',
      'currentSiteId',
      'activeSegment',
    ]) ||
    typeof value['routeExecutionId'] !== 'string' ||
    (value['purpose'] !== 'NEW' && value['purpose'] !== 'RETURN') ||
    typeof value['regionVersion'] !== 'string' ||
    !isStringArray(value['edgeIds']) ||
    value['edgeIds'].length === 0 ||
    !['IN_TRANSIT', 'AT_BOUNDARY', 'COMPLETE'].includes(String(value['phase'])) ||
    !Number.isSafeInteger(value['nextEdgeIndex']) ||
    (value['nextEdgeIndex'] as number) < 0 ||
    typeof value['currentSiteId'] !== 'string'
  )
    return undefined;
  const segment = value['activeSegment'];
  if (
    segment !== null &&
    (!isRecord(segment) ||
      !hasExactKeys(segment, ['segmentId', 'dueTick']) ||
      typeof segment['segmentId'] !== 'string' ||
      !isIntegerString(segment['dueTick']))
  )
    return undefined;
  return {
    routeExecutionId: value['routeExecutionId'],
    purpose: value['purpose'],
    regionVersion: value['regionVersion'],
    edgeIds: [...value['edgeIds']],
    phase: value['phase'] as 'IN_TRANSIT' | 'AT_BOUNDARY' | 'COMPLETE',
    nextEdgeIndex: value['nextEdgeIndex'] as number,
    currentSiteId: value['currentSiteId'],
    activeSegment:
      segment === null
        ? null
        : { segmentId: segment['segmentId'] as string, dueTick: segment['dueTick'] as string },
  };
}

function hasExactKeys(value: object, keys: readonly string[]): boolean {
  return JSON.stringify(Object.keys(value).toSorted()) === JSON.stringify([...keys].toSorted());
}

function isTravelRequest(value: unknown): value is WorldTravelRequestDto | WorldTravelV2RequestDto {
  if (
    isRecord(value) &&
    value['schemaVersion'] === 2 &&
    hasExactKeys(value, [
      'schemaVersion',
      'commandId',
      'expectedPublicRevision',
      'expectedRouteEpoch',
      'purpose',
      'edgeIds',
    ]) &&
    isWorldTravelCommandId(value['commandId']) &&
    isIntegerString(value['expectedPublicRevision']) &&
    isIntegerString(value['expectedRouteEpoch']) &&
    (value['purpose'] === 'NEW' || value['purpose'] === 'RETURN') &&
    isStringArray(value['edgeIds']) &&
    value['edgeIds'].length > 0 &&
    value['edgeIds'].length <= 16
  )
    return true;
  if (
    !isRecord(value) ||
    value['schemaVersion'] !== 1 ||
    typeof value['commandId'] !== 'string' ||
    !isIntegerString(value['expectedPublicRevision']) ||
    !isIntegerString(value['expectedRouteEpoch']) ||
    !isRecord(value['action'])
  )
    return false;
  const action = value['action'];
  if (action['kind'] === 'ARRIVE') return Object.keys(action).length === 1;
  return (
    action['kind'] === 'DEPART' &&
    (hasExactKeys(action, ['kind', 'edgeIds']) ||
      (hasExactKeys(action, ['kind', 'purpose', 'edgeIds']) &&
        (action['purpose'] === 'NEW' || action['purpose'] === 'RETURN'))) &&
    isStringArray(action['edgeIds']) &&
    action['edgeIds'].length > 0
  );
}

function isTravelRejectionCode(value: unknown): value is WorldTravelRejectionDto['code'] {
  return (
    value === 'INVALID_COMMAND' ||
    value === 'NOT_AUTHORIZED' ||
    value === 'STALE_REVISION' ||
    value === 'STALE_ROUTE_EPOCH' ||
    value === 'INVALID_ROUTE' ||
    value === 'INVALID_ARRIVAL' ||
    value === 'INSUFFICIENT_ITEMS' ||
    value === 'INSUFFICIENT_STAMINA' ||
    value === 'UNSUPPORTED_ACTION'
  );
}

function isIntegerString(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isWorldTravelCommandId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const characters = [...value];
  return (
    characters.length > 0 &&
    characters.length <= 256 &&
    !/^\s/u.test(value) &&
    !characters.some((character) => {
      const codePoint = character.codePointAt(0)!;
      return codePoint <= 0x1f || codePoint === 0x7f;
    }) &&
    /\S/u.test(characters[characters.length - 1]!)
  );
}

function freezeScope(scope: WorldTravelScope): WorldTravelScope {
  return Object.freeze({ accountId: scope.accountId, companyId: scope.companyId });
}

function legacyReturnWindowStorageKey(scope: WorldTravelScope): string {
  return `warwrit:world-travel:v1:${encodeURIComponent(scope.accountId)}:${encodeURIComponent(scope.companyId)}:return`;
}

function freezeAttempt(
  scope: WorldTravelScope,
  request: WorldTravelRequestDto | WorldTravelV2RequestDto,
  body: string,
  arrivalProof?: WorldTravelArrivalProof,
): WorldTravelAttempt {
  if (request.schemaVersion === 2) {
    const frozenRequest: WorldTravelV2RequestDto = Object.freeze({
      ...request,
      edgeIds: Object.freeze([...request.edgeIds]),
    });
    return Object.freeze({
      scope: freezeScope(scope),
      request: frozenRequest,
      body,
    });
  }
  const frozenAction =
    request.action.kind === 'ARRIVE'
      ? Object.freeze({ kind: 'ARRIVE' as const })
      : Object.freeze({
          kind: 'DEPART' as const,
          ...(request.action.purpose === undefined ? {} : { purpose: request.action.purpose }),
          edgeIds: Object.freeze([...request.action.edgeIds]),
        });
  const frozenRequest: WorldTravelRequestDto = Object.freeze({
    schemaVersion: 1,
    commandId: request.commandId,
    expectedPublicRevision: request.expectedPublicRevision,
    expectedRouteEpoch: request.expectedRouteEpoch,
    action: frozenAction,
  });
  return Object.freeze({
    scope: freezeScope(scope),
    request: frozenRequest,
    body,
    ...(arrivalProof === undefined ? {} : { arrivalProof: Object.freeze({ ...arrivalProof }) }),
  });
}

function readArrivalProof(
  value: unknown,
  request: WorldTravelRequestDto | WorldTravelV2RequestDto,
): WorldTravelArrivalProof | undefined {
  if (
    request.schemaVersion !== 1 ||
    request.action.kind !== 'ARRIVE' ||
    !isRecord(value) ||
    value['commandId'] !== request.commandId ||
    value['expectedPublicRevision'] !== request.expectedPublicRevision ||
    value['expectedRouteEpoch'] !== request.expectedRouteEpoch ||
    !isIntegerString(value['arrivalTick']) ||
    !isIntegerString(value['dueTick']) ||
    value['arrivalTick'] !== value['dueTick']
  )
    return undefined;
  return {
    commandId: value['commandId'],
    expectedPublicRevision: value['expectedPublicRevision'],
    expectedRouteEpoch: value['expectedRouteEpoch'],
    arrivalTick: value['arrivalTick'],
    dueTick: value['dueTick'],
  };
}
