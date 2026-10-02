export const WORLD_EXPECTED_COMPANY_ID_HEADER = 'x-warwrit-expected-company-id' as const;

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

/**
 * What the signed-in company can lawfully see right now: both world clocks and
 * other companies directly observed at the same site. Nothing here comes from
 * hidden state of parties the observer cannot see.
 */
export interface WorldSurroundingsDto {
  readonly schemaVersion: 1;
  readonly serverTimeMs: string;
  readonly campaign: {
    readonly tick: string;
    readonly msPerTick: string;
    readonly ticksPerDay: string;
  };
  readonly light: {
    readonly phase: 'DAY' | 'NIGHT';
    readonly msIntoPhase: string;
    readonly phaseMs: string;
  };
  /** Public authored region map (sites, roads, danger); no entity positions. */
  readonly map: {
    readonly regionVersion: string;
    readonly regionName: string;
    readonly sites: readonly {
      readonly siteId: string;
      readonly name: string;
      readonly kind: 'CITY' | 'VILLAGE' | 'LANDMARK';
      readonly q: number;
      readonly r: number;
      readonly danger: 'SAFE' | 'DANGEROUS';
    }[];
    readonly edges: readonly {
      readonly edgeId: string;
      readonly fromSiteId: string;
      readonly toSiteId: string;
      readonly travelTicks: number;
      readonly danger: 'SAFE' | 'DANGEROUS';
    }[];
  };
  /** Site of the observer's stationary party, or null while travelling or without a party. */
  readonly observerSiteId: string | null;
  readonly observedCompanies: readonly {
    readonly companyName: string;
    readonly siteId: string;
    readonly memberCount: number;
  }[];
  /** Hostile world entities standing at the observer's site, as seen now. */
  readonly observedHostiles: readonly {
    readonly entityId: string;
    readonly siteId: string;
    readonly weaponItemId: string;
    readonly wounded: boolean;
  }[];
}
