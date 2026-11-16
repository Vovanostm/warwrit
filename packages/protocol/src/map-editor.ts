import type { CombatLabBattleConfig, CombatLabCatalog, CombatLabView } from './combat-lab.js';

// Versioned transport snapshot. Domain navigation remains owned by game-core.
export type MapTerrainId =
  'grassland' | 'forest' | 'hills' | 'marsh' | 'riverbank' | 'rock' | 'deep_water' | 'cliff';
export type MapOverlayId = 'road' | 'trail' | 'dirt_road' | 'paved_road' | 'bridge' | 'ford' | null;
export interface MapPoint {
  readonly xFp: number;
  readonly zFp: number;
}
export type MapSpeedProfileId =
  'free-terrain-continuous-v2' | 'free-terrain-continuous-v3' | 'free-atlas-walk-v1';
export interface MapRegion {
  readonly mapEdition: string;
  readonly navigationVersion?: 'polygon-v1';
  /** Omitted only by retained V2 navigation fixtures. Accepted schedules never use this default. */
  readonly speedProfileId?: MapSpeedProfileId;
  /** Scene units per canonical fp are scaled together for geography and movement. */
  readonly worldScale?: number;
  readonly origin: MapPoint;
  readonly columns: number;
  readonly rows: number;
  readonly cellSizeFp: number;
  readonly boundary: readonly MapPoint[];
  readonly terrainShapes: readonly {
    readonly shapeId: string;
    readonly terrainId: MapTerrainId;
    readonly paintPriority: number;
    readonly polygon: readonly MapPoint[];
  }[];
  readonly overlayShapes: readonly {
    readonly shapeId: string;
    readonly overlayId: Exclude<MapOverlayId, null>;
    readonly polygon: readonly MapPoint[];
    readonly stations?: readonly MapPoint[];
  }[];
  readonly blockingShapes: readonly {
    readonly shapeId: string;
    readonly polygon: readonly MapPoint[];
  }[];
  readonly dangerAreaShapes: readonly {
    readonly areaId: string;
    readonly polygon: readonly MapPoint[];
  }[];
  readonly sites: readonly {
    readonly siteId: string;
    readonly anchorFp: MapPoint;
    readonly areaId: string;
  }[];
}

export const MAP_CONTENT_REVISION = 'map-v1:atlas-v6:sprite-prototype-v4' as const;
export interface MapContentBase {
  readonly schemaVersion: 1;
  readonly contentRevision: string;
  readonly name: string;
}
export interface WorldMapContent extends MapContentBase {
  readonly kind: 'world';
  readonly atlas: 'atlas-v6';
  readonly region: MapRegion;
}
export interface BattleMapContent extends MapContentBase {
  readonly kind: 'battle';
  readonly battle: CombatLabBattleConfig;
  readonly deployment: readonly {
    readonly sideId: 'human' | 'opponent';
    readonly hexes: readonly { readonly q: number; readonly r: number }[];
  }[];
}
export type MapContent = WorldMapContent | BattleMapContent;
export interface MapIssue {
  readonly objectId: string;
  readonly code: string;
  readonly message: string;
  readonly point?: MapPoint;
  readonly hex?: { readonly q: number; readonly r: number };
}
export interface MapDocument {
  readonly id: string;
  readonly revision: number;
  readonly status: 'Draft' | 'Validated' | 'Exported' | 'Published';
  readonly content: MapContent;
  readonly issues: readonly MapIssue[];
}
export interface MapArtifact {
  readonly format: 'warwrit-map';
  readonly artifactVersion: 1;
  readonly source: { readonly documentId: string; readonly revision: number };
  readonly compatibility: 'explicit-world-revision-review-required';
  readonly content: MapContent;
}
export interface MapEditorBootstrap {
  readonly accountId: string;
  readonly templates: readonly MapContent[];
  readonly documents: readonly MapDocument[];
  readonly catalog: CombatLabCatalog;
}
export interface MapEditorCommand {
  readonly commandId: string;
  readonly operation: 'create' | 'save' | 'clone' | 'validate' | 'export' | 'delete';
  readonly documentId?: string;
  readonly expectedRevision?: number;
  readonly content?: MapContent;
}
export interface MapEditorResult {
  readonly commandId: string;
  readonly document: MapDocument;
  readonly artifact?: MapArtifact;
}
export interface MapPreview {
  readonly revision: number;
  readonly issues: readonly MapIssue[];
  readonly view?: CombatLabView;
  readonly nodes?: readonly MapPoint[];
  readonly edges?: readonly (readonly [MapPoint, MapPoint])[];
  readonly route?: readonly MapPoint[];
  readonly durationUs?: string;
}

/** Separate content-delivery request. Cannot select or mutate an existing world. */
export interface MapDeliveryCommand {
  readonly commandId: string;
  readonly operation: 'publish';
  readonly documentId: string;
  readonly expectedRevision: number;
  readonly compatibility: 'new-worlds-only';
  readonly acknowledgement: 'PUBLISH_VERSIONED_CONTENT';
}
