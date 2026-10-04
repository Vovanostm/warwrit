// Shared immutable map contracts; geometry and movement consume these without an import cycle.
export type TerrainId =
  'grassland' | 'forest' | 'hills' | 'marsh' | 'riverbank' | 'rock' | 'deep_water' | 'cliff';
export type OverlayId = 'road' | 'trail' | 'dirt_road' | 'paved_road' | 'bridge' | 'ford' | null;
export interface PointFp {
  readonly xFp: number;
  readonly zFp: number;
}
export interface PointMicroFp {
  readonly xMicroFp: string;
  readonly zMicroFp: string;
}
export interface NavigationRegion {
  readonly mapEdition: string;
  readonly navigationVersion?: 'polygon-v1';
  /** Omitted only by retained V2 navigation fixtures. Accepted schedules never use this default. */
  readonly speedProfileId?: 'free-terrain-continuous-v2' | 'free-terrain-continuous-v3';
  /** Scene units per canonical fp are scaled together for geography and movement. */
  readonly worldScale?: number;
  readonly origin: PointFp;
  readonly columns: number;
  readonly rows: number;
  readonly cellSizeFp: number;
  readonly boundary: readonly PointFp[];
  readonly terrainShapes: readonly {
    readonly shapeId: string;
    readonly terrainId: TerrainId;
    readonly paintPriority: number;
    readonly polygon: readonly PointFp[];
  }[];
  readonly overlayShapes: readonly {
    readonly shapeId: string;
    readonly overlayId: Exclude<OverlayId, null>;
    readonly polygon: readonly PointFp[];
    readonly stations?: readonly PointFp[];
  }[];
  readonly blockingShapes: readonly {
    readonly shapeId: string;
    readonly polygon: readonly PointFp[];
  }[];
  readonly dangerAreaShapes: readonly {
    readonly areaId: string;
    readonly polygon: readonly PointFp[];
  }[];
  readonly sites: readonly {
    readonly siteId: string;
    readonly anchorFp: PointFp;
    readonly areaId: string;
  }[];
}
