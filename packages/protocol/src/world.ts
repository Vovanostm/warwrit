export const WORLD_EXPECTED_COMPANY_ID_HEADER = 'x-warwrit-expected-company-id' as const;

export interface WorldTravelPreviewRequestDto {
  readonly schemaVersion: 1;
  readonly purpose: 'NEW' | 'RETURN';
  readonly edgeIds: readonly string[];
}

export interface WorldTravelPreviewResponseDto {
  readonly schemaVersion: 1;
  readonly publicRevision: string;
  readonly routeEpoch: string;
  readonly atTick: string;
  readonly purpose: 'NEW' | 'RETURN';
  readonly edgeIds: readonly string[];
  readonly knownShortage: boolean;
  readonly assumptions: readonly string[];
  readonly requiredStockUnits: string;
  readonly availableStockUnits: string;
}

export function isWorldTravelPreviewRequest(value: unknown): value is WorldTravelPreviewRequestDto {
  return (
    isRecord(value) &&
    Object.keys(value).toSorted().join('\0') ===
      ['edgeIds', 'purpose', 'schemaVersion'].join('\0') &&
    value['schemaVersion'] === 1 &&
    (value['purpose'] === 'NEW' || value['purpose'] === 'RETURN') &&
    Array.isArray(value['edgeIds']) &&
    value['edgeIds'].length > 0 &&
    value['edgeIds'].length <= 16 &&
    value['edgeIds'].every(isWorldId)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isWorldId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 128;
}

export interface WorldAvailableDepartureDto {
  readonly purpose: 'NEW' | 'RETURN';
  readonly edgeIds: readonly string[];
  readonly fromSiteId: string;
  readonly toSiteId: string;
}

export interface WorldPartyReadResponseV1Dto {
  readonly schemaVersion: 1;
  readonly worldTick: string;
  readonly publicRevision: string;
  readonly party: null | {
    readonly partyId: string;
    /** Last confirmed site; an active route is described separately below. */
    readonly location: string;
    readonly memberIds: readonly string[];
    /** Monotonic epoch retained after arrival, or zero before the first accepted route. */
    readonly routeEpoch: string;
  };
  readonly availableDepartures: readonly WorldAvailableDepartureDto[];
  readonly route: null | {
    readonly routeEpoch: string;
    readonly segmentId: string;
    readonly edgeIds: readonly string[];
    readonly regionVersion: string;
    readonly profileId: string;
    readonly startedAt: string;
    readonly dueTick: string;
    readonly remainingTicks: string;
    readonly canArrive: boolean;
  };
}

/** Public in-progress multi-edge itinerary; trusted execution ownership stays server-side. */
export interface WorldPartyReadResponseV2Dto {
  readonly schemaVersion: 2;
  readonly worldTick: string;
  readonly publicRevision: string;
  readonly party: null | {
    readonly partyId: string;
    readonly location: string;
    readonly memberIds: readonly string[];
    readonly routeEpoch: string;
  };
  readonly availableDepartures: readonly WorldAvailableDepartureDto[];
  readonly execution: null | {
    readonly routeExecutionId: string;
    readonly purpose: 'NEW' | 'RETURN';
    readonly regionVersion: string;
    readonly edgeIds: readonly string[];
    readonly phase: 'IN_TRANSIT' | 'AT_BOUNDARY' | 'COMPLETE';
    readonly nextEdgeIndex: number;
    readonly currentSiteId: string;
    readonly activeSegment: null | { readonly segmentId: string; readonly dueTick: string };
  };
}

export type WorldPartyReadResponseDto = WorldPartyReadResponseV1Dto | WorldPartyReadResponseV2Dto;

export type WorldTravelActionDto =
  | {
      readonly kind: 'DEPART';
      readonly edgeIds: readonly string[];
      /** Omission preserves the original NEW trip semantics. */
      readonly purpose?: 'NEW' | 'RETURN';
    }
  | { readonly kind: 'ARRIVE' };

export interface WorldTravelRequestDto {
  readonly schemaVersion: 1;
  readonly commandId: string;
  readonly expectedPublicRevision: string;
  readonly expectedRouteEpoch: string;
  readonly action: WorldTravelActionDto;
}

/** Accepted V2 itinerary. Position, segment and clock remain server-owned. */
export interface WorldTravelV2RequestDto {
  readonly schemaVersion: 2;
  readonly commandId: string;
  readonly expectedPublicRevision: string;
  readonly expectedRouteEpoch: string;
  readonly purpose: 'NEW' | 'RETURN';
  readonly edgeIds: readonly string[];
}

export interface WorldTravelResponseDto extends WorldPartyReadResponseV1Dto {
  readonly commandId: string;
}

export interface WorldTravelV2ResponseDto extends WorldPartyReadResponseV2Dto {
  readonly commandId: string;
}

interface WorldTravelRejectionFields {
  readonly commandId: string | null;
  readonly ok: false;
  readonly publicRevision: string;
  readonly code:
    | 'INVALID_COMMAND'
    | 'NOT_AUTHORIZED'
    | 'STALE_REVISION'
    | 'STALE_ROUTE_EPOCH'
    | 'INVALID_ROUTE'
    | 'INVALID_ARRIVAL'
    | 'INSUFFICIENT_ITEMS'
    | 'INSUFFICIENT_STAMINA'
    | 'UNSUPPORTED_ACTION';
}

export interface WorldTravelV1RejectionDto extends WorldTravelRejectionFields {
  readonly schemaVersion: 1;
}

export interface WorldTravelV2RejectionDto extends WorldTravelRejectionFields {
  readonly schemaVersion: 2;
}

export type WorldTravelRejectionDto = WorldTravelV1RejectionDto | WorldTravelV2RejectionDto;
