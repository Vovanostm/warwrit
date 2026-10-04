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
    readonly movementVersion?: 1 | 2;
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
    readonly movementVersion?: 1 | 2;
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

export interface WorldHexDto {
  readonly q: number;
  readonly r: number;
}

export interface WorldFreeMovementRequestDto {
  readonly schemaVersion: 1;
  readonly commandId: string;
  readonly expectedPublicRevision: string;
  readonly expectedRouteEpoch: string;
  readonly action:
    | { readonly kind: 'START' | 'REROUTE'; readonly destination: WorldHexDto }
    | { readonly kind: 'STOP' };
}

export interface WorldFreeMovementPreviewRequestDto {
  readonly schemaVersion: 1;
  readonly expectedPublicRevision: string;
  readonly expectedRouteEpoch: string;
  readonly destination: WorldHexDto;
}

export interface WorldFreeMovementPreviewResponseDto {
  readonly schemaVersion: 1;
  readonly worldTick: string;
  readonly publicRevision: string;
  readonly routeEpoch: string;
  readonly regionVersion: string;
  readonly profileId: string;
  readonly ticksPerHex: number;
  readonly from: WorldHexDto;
  readonly to: WorldHexDto;
  readonly path: readonly WorldHexDto[];
  readonly arrivesAt: string;
  readonly requiredStockUnits: string;
  readonly availableStockUnits: string;
  readonly knownShortage: boolean;
}

export interface WorldFreeMovementResponseDto {
  readonly schemaVersion: 1;
  readonly worldTick: string;
  readonly publicRevision: string;
  readonly party: null | {
    readonly partyId: string;
    readonly routeEpoch: string;
    readonly position: WorldHexDto & {
      readonly kind: 'SITE' | 'TERRAIN';
      readonly siteId?: string;
    };
  };
  readonly movement: null | {
    readonly segmentId: string;
    readonly routeEpoch: string;
    readonly regionVersion: string;
    readonly profileId: string;
    readonly ticksPerHex: number;
    readonly startedAt: string;
    readonly arrivesAt: string;
    readonly from: WorldHexDto;
    readonly to: WorldHexDto;
    readonly path: readonly WorldHexDto[];
    readonly position: WorldHexDto;
    readonly status: 'MOVING' | 'STOPPED' | 'ARRIVED';
  };
  readonly commandId?: string;
}

export interface WorldFreeMovementRejectionDto {
  readonly schemaVersion: 1;
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

export interface WorldPointFpDto {
  readonly xFp: number;
  readonly zFp: number;
}

export interface WorldPointMicroFpDto {
  readonly xMicroFp: string;
  readonly zMicroFp: string;
}

export type WorldFreeMovementTargetDto =
  | { readonly kind: 'TERRAIN'; readonly xFp: number; readonly zFp: number }
  | { readonly kind: 'SITE'; readonly siteId: string };

export interface WorldFreeMovementV2RequestDto {
  readonly schemaVersion: 2;
  readonly commandId: string;
  readonly expectedPublicRevision: string;
  readonly expectedMovementEpoch: string;
  readonly action:
    | {
        readonly kind: 'MOVE_TO';
        readonly mapEdition: string;
        readonly target: WorldFreeMovementTargetDto;
      }
    | { readonly kind: 'STOP' };
}

export interface WorldFreeMovementV2ResponseDto {
  readonly schemaVersion: 2;
  readonly result: 'ACCEPTED' | 'ALREADY_AT_TARGET';
  readonly commandId?: string;
  readonly publicRevision: string;
  readonly movementEpoch: string;
  readonly serverTimeMs: string;
  readonly worldTick: string;
  readonly mode: 'STATIONARY_TERRAIN' | 'STATIONARY_SITE' | 'MOVING';
  readonly point: WorldPointMicroFpDto;
  /** Surface at the server-projected anchor; absent on retained historical receipts. */
  readonly surface?: {
    readonly terrainId: string;
    readonly overlayId: string | null;
    readonly speedPermille: number;
  };
  readonly plan: null | {
    readonly planVersion: 2 | 3;
    readonly navigationVersion?: 'polygon-v1';
    readonly planId: string;
    readonly mapEdition: string;
    readonly speedProfileId: string;
    readonly movementEpoch: string;
    readonly from: WorldPointMicroFpDto;
    readonly goal: WorldPointMicroFpDto;
    readonly startedAtMs: string;
    readonly totalDurationUs: string;
    readonly arrivesAtMs: string;
    readonly path: readonly WorldPointMicroFpDto[];
    readonly dangerAreaIds: readonly string[];
    readonly speedSpans: readonly {
      readonly from: WorldPointMicroFpDto;
      readonly to: WorldPointMicroFpDto;
      readonly terrainId: string;
      readonly overlayId: string | null;
      readonly speedPermille: number;
      readonly startOffsetUs: string;
      readonly endOffsetUs: string;
      readonly geometry?: {
        readonly segmentIndex: number;
        readonly fromT: { readonly numerator: string; readonly denominator: string };
        readonly toT: { readonly numerator: string; readonly denominator: string };
      };
    }[];
  };
}

export interface WorldFreeMovementV2RejectionDto {
  readonly schemaVersion: 2;
  readonly result: 'REJECTED';
  readonly commandId: string | null;
  readonly code:
    | 'INVALID_COMMAND'
    | 'UNSUPPORTED_VERSION'
    | 'AUTH_REQUIRED'
    | 'NOT_AUTHORIZED'
    | 'STALE_REVISION'
    | 'STALE_MOVEMENT_EPOCH'
    | 'COMMAND_ID_CONFLICT'
    | 'MAP_EDITION_MISMATCH'
    | 'TARGET_BLOCKED'
    | 'OUT_OF_BOUNDS'
    | 'NO_PATH'
    | 'ROUTE_TOO_COMPLEX'
    | 'MOVEMENT_NOT_ALLOWED'
    | 'ROUTE_FORBIDDEN'
    | 'KNOWN_SUPPLY_SHORTAGE'
    | 'TRUSTED_TIME_UNAVAILABLE';
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
    readonly continuous?: WorldContinuousMapDto;
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
    readonly walkBounds?: {
      readonly minQ: number;
      readonly maxQ: number;
      readonly minR: number;
      readonly maxR: number;
    };
    readonly terrainRows?: readonly {
      readonly r: number;
      readonly fromQ: number;
      readonly toQ: number;
      readonly terrain: 'WOODLAND' | 'RIVERBANK' | 'OPEN_GROUND';
    }[];
    readonly blockedHexes?: readonly WorldHexDto[];
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

/** Public authored geometry, without live entities or private company state. */
export interface WorldContinuousMapDto {
  readonly mapEdition: string;
  readonly navigationVersion?: 'polygon-v1';
  /** Presentation scale; canonical coordinates and accepted times are unchanged. */
  readonly worldScale?: number;
  readonly origin: WorldPointFpDto;
  readonly columns: number;
  readonly rows: number;
  readonly cellSizeFp: number;
  readonly boundary: readonly WorldPointFpDto[];
  readonly terrainShapes: readonly {
    readonly shapeId: string;
    readonly terrainId: string;
    readonly paintPriority: number;
    readonly polygon: readonly WorldPointFpDto[];
  }[];
  /** Server-derived navigation precedence, highest first; absent on older servers. */
  readonly navigationOverlayOrder?: readonly string[];
  readonly overlayShapes: readonly {
    readonly shapeId: string;
    readonly overlayId: string;
    readonly polygon: readonly WorldPointFpDto[];
    readonly stations?: readonly WorldPointFpDto[];
  }[];
  readonly blockingShapes: readonly {
    readonly shapeId: string;
    readonly polygon: readonly WorldPointFpDto[];
  }[];
  readonly dangerAreaShapes: readonly {
    readonly areaId: string;
    readonly polygon: readonly WorldPointFpDto[];
  }[];
  readonly sites: readonly {
    readonly siteId: string;
    readonly areaId: string;
    readonly anchorFp: WorldPointFpDto;
  }[];
}
