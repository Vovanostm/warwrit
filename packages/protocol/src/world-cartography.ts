import type { WorldPointMicroFpDto } from './world-point.js';

export type WorldLabObservationDateDto =
  | { readonly kind?: 'CAMPAIGN'; readonly campaignDay: string; readonly tick: string }
  | { readonly kind: 'TIMESTAMP'; readonly timestamp: string };

/** Personal, server-filtered knowledge of the current region; no private world catalogue. */
export interface WorldLabKnownSiteDto {
  readonly siteId: string;
  readonly name: string;
  readonly point: WorldPointMicroFpDto;
  readonly icon: string;
  readonly source: 'CHART' | 'OBSERVED';
  readonly visited: boolean;
  /** Last authorized observation; legacy values before world genesis retain their timestamp. */
  readonly lastObservedAt?: WorldLabObservationDateDto;
  /** Derived from this company's server-issued visibility mask for this snapshot. */
  readonly currentlyVisible?: boolean;
  /** The location was supplied by a quest marker grant; retain its name at overview scale. */
  readonly questMarker?: boolean;
}
export interface WorldLabCartographyDto {
  readonly schemaVersion: 1;
  readonly revision: string;
  readonly regionId: string;
  readonly gridEdition: string;
  readonly weather: 'CLEAR' | 'RAIN' | 'FOG';
  readonly sheet: { readonly width: number; readonly height: number; readonly fpPerPixel: number };
  readonly grid: {
    readonly columns: number;
    readonly rows: number;
    readonly cellSizeFp: number;
    readonly origin: { readonly xFp: number; readonly zFp: number };
  };
  /** Row-major, low-bit-first bitmaps encoded as base64; only own company's knowledge. */
  readonly charted: string;
  readonly explored: string;
  readonly visible: string;
  readonly sites: readonly WorldLabKnownSiteDto[];
  /** Authenticated raster endpoint; each tile is masked before encoding, never client-clipped raw art. */
  readonly imageTileSize: number;
}
