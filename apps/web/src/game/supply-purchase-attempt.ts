import type { OrdinaryPlayerCompanyCommandV2Dto } from '@warwrit/protocol';

type Purchase = Extract<OrdinaryPlayerCompanyCommandV2Dto, { type: 'BuySupplies' }>;
const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const revision = (value: unknown): value is string =>
  typeof value === 'string' && /^(0|[1-9][0-9]{0,127})$/u.test(value);
const id = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128;

/** Restore only a complete exact request; damaged storage cannot become a retry. */
export function readSupplyPurchaseAttempt(stored: string | null): Purchase | undefined {
  if (stored === null) return undefined;
  try {
    const value: unknown = JSON.parse(stored);
    if (
      !record(value) ||
      value['type'] !== 'BuySupplies' ||
      value['schemaVersion'] !== 2 ||
      !id(value['commandId']) ||
      !revision(value['expectedPublicRevision']) ||
      !record(value['payload'])
    )
      return undefined;
    const payload = value['payload'];
    if (
      !id(payload['siteId']) ||
      !revision(payload['shopRevision']) ||
      typeof payload['quantity'] !== 'number' ||
      !Number.isInteger(payload['quantity']) ||
      payload['quantity'] < 1 ||
      payload['quantity'] > 100
    )
      return undefined;
    return value as Purchase;
  } catch {
    return undefined;
  }
}
