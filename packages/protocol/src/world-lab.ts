import type { EncounterRoomTicketDto } from './encounter.js';
import type { WorldFreeMovementV2ResponseDto, WorldPointMicroFpDto } from './world.js';

/** Local, isolated mechanics world; never production account selection. */
export type WorldLabSlot = 'company-a' | 'company-b';
export type WorldLabGroupKind = 'PLAYER' | 'PATROL' | 'BANDITS' | 'WILDLIFE' | 'CREATURE';
export interface WorldLabObservedGroupDto {
  readonly id: string;
  readonly kind: WorldLabGroupKind;
  readonly name: string;
  readonly point: WorldPointMicroFpDto;
  readonly state: 'MOVING' | 'IDLE';
  readonly observedAtMs: string;
  readonly movementEpoch: string;
  readonly pursuable?: boolean;
}
export const WORLD_LAB_PURSUIT_ORDER_HEADER = 'x-warwrit-pursuit-order';
/** A conditional order token, never authentication or company ownership. */
export const worldLabPursuitToken = (orderId?: string | null): string =>
  orderId ? `pursuit:${orderId}` : 'none';

export interface WorldLabPursuitDto {
  readonly orderId: string;
  readonly targetId: string;
  readonly targetName: string;
  readonly lastPoint: WorldPointMicroFpDto;
  readonly status: 'CHASING' | 'LAST_SEEN' | 'REACHED' | 'BLOCKED';
  readonly movementEpoch: string;
}

export interface WorldLabPursuitRequestDto {
  readonly schemaVersion: 1;
  readonly commandId: string;
  readonly expectedPublicRevision: string;
  readonly expectedMovementEpoch: string;
  readonly targetGroupId: string;
}

export interface WorldLabStateDto {
  readonly schemaVersion: 1;
  readonly worldId: string;
  readonly mapEdition: string;
  readonly sequence: string;
  readonly serverTimeMs: string;
  readonly light: 'DAY' | 'NIGHT';
  /** Shared server clock rate in this isolated mechanics laboratory. */
  readonly timeScale: number;
  readonly slot: WorldLabSlot;
  readonly own: {
    readonly companyId: string;
    readonly partyId: string;
    readonly name: string;
    readonly movement: WorldFreeMovementV2ResponseDto;
  };
  /** Only currently observed groups; no private plans or AI goals. */
  readonly groups: readonly WorldLabObservedGroupDto[];
  /** Own accepted pursuit only; never another company's target. */
  readonly pursuit?: WorldLabPursuitDto | null;
  readonly nearbySite: { readonly siteId: string; readonly name: string } | null;
}
export interface WorldLabSessionDto {
  readonly schemaVersion: 1;
  readonly slot: WorldLabSlot;
  readonly companyId: string;
  readonly name: string;
}
export type WorldLabRoomTicketDto = EncounterRoomTicketDto;

/** Server-authorized read-only settlement scene, not a trade/service receipt. */
export interface WorldLabVisitDto {
  readonly schemaVersion: 1;
  readonly siteId: string;
  readonly name: string;
  readonly image: string;
}
