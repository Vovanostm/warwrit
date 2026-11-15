/** Owner-private sale quote for one company-owned physical item at Kamenny Brod. */
export interface EquipmentMarketItemDto {
  readonly itemId: string;
  readonly definitionId: string;
  readonly priceQ: string;
  readonly currentCondition: number;
  readonly maximumCondition: number;
  readonly equipped: boolean;
  readonly canSell: boolean;
  readonly refusal: 'INSUFFICIENT_FUNDS' | null;
}

export interface EquipmentMarketDto {
  readonly siteId: string;
  readonly revision: string;
  readonly merchantCashQ: string;
  readonly items: readonly EquipmentMarketItemDto[];
}

/** The server supplies account, company, world, actor, time and canonical revision. */
export interface EquipmentSaleRequestDto {
  readonly schemaVersion: 1;
  readonly commandId: string;
  readonly expectedRevision: string;
  readonly itemId: string;
  readonly shopRevision: string;
}

export type EquipmentSaleResponseDto =
  | { readonly commandId: string; readonly ok: true; readonly publicRevision: string }
  | {
      readonly commandId: string;
      readonly ok: false;
      readonly publicRevision: string;
      readonly code:
        | 'INVALID_COMMAND'
        | 'NOT_AUTHORIZED'
        | 'CONTACT_OR_ACCESS_REQUIRED'
        | 'UNSUPPORTED_ACTION'
        | 'IDEMPOTENCY_CONFLICT'
        | 'STALE_REVISION'
        | 'INSUFFICIENT_FUNDS'
        | 'INSUFFICIENT_ITEMS'
        | 'CAPACITY'
        | 'UNSALEABLE_ITEM';
    };
