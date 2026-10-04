import type {
  CompanyHoldingsDto,
  OrdinaryPlayerCompanyCommandV2Dto,
  SupplyShopDto,
} from '@warwrit/protocol';
import { WORLD_EXPECTED_COMPANY_ID_HEADER } from '@warwrit/protocol';
import { formatCrowns } from './format.js';

export type SupplyPurchaseAttempt = Extract<
  OrdinaryPlayerCompanyCommandV2Dto,
  { type: 'BuySupplies' }
>;
export type SupplyPurchaseResult =
  { readonly ok: true } | { readonly ok: false; readonly code: string };

/** A receipt must identify this exact request before its uncertain slot can be cleared. */
export function readSupplyPurchaseResult(value: unknown, commandId: string): SupplyPurchaseResult {
  if (!value || typeof value !== 'object')
    throw new Error('Результат неизвестен. Повторите эту же покупку.');
  if (!('commandId' in value) || value.commandId !== commandId)
    throw new Error('Результат неизвестен. Повторите эту же покупку.');
  if (!('publicRevision' in value) || !isPublicRevision(value.publicRevision))
    throw new Error('Результат неизвестен. Повторите эту же покупку.');
  if ('ok' in value && value.ok === true) return { ok: true };
  if ('ok' in value && value.ok === false && 'code' in value && typeof value.code === 'string')
    return { ok: false, code: value.code };
  throw new Error('Результат неизвестен. Повторите эту же покупку.');
}

function isPublicRevision(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value);
}

export async function sendSupplyPurchase(
  apiBaseUrl: string,
  companyId: string,
  attempt: SupplyPurchaseAttempt,
): Promise<SupplyPurchaseResult> {
  const response = await fetch(`${apiBaseUrl}/company/commands`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json', [WORLD_EXPECTED_COMPANY_ID_HEADER]: companyId },
    body: JSON.stringify(attempt),
  });
  if (response.status >= 500)
    throw new Error('Нет ответа. Повторите эту же покупку — второй раз золото не спишется.');
  return readSupplyPurchaseResult(await response.json(), attempt.commandId);
}

/** Quote and controls fail closed while local funds or stock are unknown. */
export function supplyPurchaseQuote(
  shop: SupplyShopDto | undefined,
  holdings: CompanyHoldingsDto | undefined,
  quantity: number,
  pending: SupplyPurchaseAttempt | undefined,
  busy: boolean,
  active: boolean,
) {
  const { valid, costQ, affordable, days } = supplyQuantityQuote(shop, holdings, quantity);
  const canPurchase =
    Boolean(pending) || Boolean(active && shop && valid && quantity <= shop.rations && affordable);
  let buttonText = `Купить ${valid ? quantity : ''} рационов · ${formatCrowns(costQ)} кр.`;
  if (pending) buttonText = 'Повторить эту же покупку';
  if (!active && !pending) buttonText = 'Компания завершила свой путь';
  if (busy) buttonText = 'Покупаем…';
  return {
    costQ,
    affordable,
    days,
    weight: valid ? quantity / 2 : 0,
    canPurchase,
    disabled: busy || !canPurchase,
    inputDisabled: busy || Boolean(pending) || !active,
    hideTotals: Boolean(pending),
    buttonText,
  };
}
export type SupplyQuote = ReturnType<typeof supplyPurchaseQuote>;

function supplyQuantityQuote(
  shop: SupplyShopDto | undefined,
  holdings: CompanyHoldingsDto | undefined,
  quantity: number,
) {
  const valid = Number.isInteger(quantity) && quantity >= 1 && quantity <= 100;
  const costQ = shop && valid ? (BigInt(shop.rationPriceQ) * BigInt(quantity)).toString() : '0';
  const affordable =
    shop?.availableCashQ !== undefined && BigInt(shop.availableCashQ) >= BigInt(costQ);
  const people = holdings?.supplies?.people ?? 0;
  const days = valid && people > 0 ? quantity / people : 0;
  return { valid, costQ, affordable, days };
}
