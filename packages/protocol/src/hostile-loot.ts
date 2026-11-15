import { isRecord, isTransportId, isCompanyEntityId } from './value-guards.js';

export interface HostileLootItemDto {
  readonly itemId: string;
  readonly definitionId: string;
  readonly currentCondition: number;
  readonly maximumCondition: number;
}

export interface HostileLootSourceDto {
  readonly hostileId: string;
  readonly terminalSourceId: string;
  readonly terminalRevision: number;
  readonly location: { readonly siteId: string; readonly areaId: string };
  readonly items: readonly HostileLootItemDto[];
}

export interface HostileLootAvailabilityDto {
  readonly schemaVersion: 1;
  readonly publicRevision: string;
  readonly sources: readonly HostileLootSourceDto[];
  readonly targetContainerIds: readonly string[];
}

export interface HostileLootPickupRequestDto {
  readonly schemaVersion: 1;
  readonly commandId: string;
  readonly expectedPublicRevision: string;
  readonly instanceId: string;
  readonly hostileId: string;
  readonly itemId: string;
  readonly toContainerId: string;
}

export interface HostileLootPickupResponseDto {
  readonly schemaVersion: 1;
  readonly commandId: string;
  readonly ok: boolean;
  readonly receiptId?: string;
  readonly publicRevision: string;
  readonly code?:
    | 'INVALID_COMMAND'
    | 'NOT_AUTHORIZED'
    | 'NOT_AVAILABLE'
    | 'STALE_REVISION'
    | 'CAPACITY'
    | 'IDEMPOTENCY_CONFLICT';
}

export function isHostileLootPickupRequestDto(
  value: unknown,
): value is HostileLootPickupRequestDto {
  return (
    isRecord(value) &&
    Object.keys(value).toSorted().join('\0') ===
      [
        'commandId',
        'expectedPublicRevision',
        'hostileId',
        'instanceId',
        'itemId',
        'schemaVersion',
        'toContainerId',
      ]
        .toSorted()
        .join('\0') &&
    value['schemaVersion'] === 1 &&
    isTransportId(value['commandId']) &&
    typeof value['expectedPublicRevision'] === 'string' &&
    /^(0|[1-9][0-9]*)$/.test(value['expectedPublicRevision']) &&
    isCompanyEntityId(value['instanceId']) &&
    isCompanyEntityId(value['hostileId']) &&
    isCompanyEntityId(value['itemId']) &&
    isCompanyEntityId(value['toContainerId'])
  );
}
