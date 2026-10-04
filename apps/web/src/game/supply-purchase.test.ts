import { expect, it } from 'vitest';
import { readSupplyPurchaseResult, supplyPurchaseQuote } from './supply-purchase.js';

it('keeps an uncertain request until the server identifies its definitive receipt', () => {
  expect(
    readSupplyPurchaseResult({ commandId: 'order', ok: true, publicRevision: '2' }, 'order'),
  ).toEqual({ ok: true });
  expect(
    readSupplyPurchaseResult(
      { commandId: 'order', ok: false, code: 'CAPACITY', publicRevision: '1' },
      'order',
    ),
  ).toEqual({ ok: false, code: 'CAPACITY' });
  for (const body of [
    null,
    {},
    { commandId: 'other', ok: true },
    { commandId: 'order' },
    { commandId: 'order', ok: false },
    { commandId: 'order', ok: true },
    { commandId: 'order', ok: false, code: 'CAPACITY' },
    { commandId: 'order', ok: true, publicRevision: 'invalid' },
  ]) {
    expect(() => readSupplyPurchaseResult(body, 'order')).toThrow('Результат неизвестен');
  }
});

it('quotes only shop-accessible money and validates quantity while allowing an exact pending retry', () => {
  const shop = {
    siteId: 'kamenny-brod',
    revision: '0',
    rations: 300,
    rationPriceQ: '4000000',
    availableCashQ: '800000000',
  };
  expect(supplyPurchaseQuote(shop, undefined, 10, undefined, false, false)).toMatchObject({
    canPurchase: false,
    disabled: true,
    inputDisabled: true,
    buttonText: 'Компания завершила свой путь',
  });
  expect(supplyPurchaseQuote(shop, undefined, 10, undefined, false, true)).toMatchObject({
    costQ: '40000000',
    affordable: true,
    canPurchase: true,
    disabled: false,
    weight: 5,
  });
  expect(
    supplyPurchaseQuote({ ...shop, availableCashQ: '0' }, undefined, 1, undefined, false, true)
      .canPurchase,
  ).toBe(false);
  expect(
    supplyPurchaseQuote(
      {
        siteId: shop.siteId,
        revision: shop.revision,
        rations: shop.rations,
        rationPriceQ: shop.rationPriceQ,
      },
      undefined,
      1,
      undefined,
      false,
      true,
    ).canPurchase,
  ).toBe(false);
  for (const quantity of [0, 101, 1.5, NaN])
    expect(supplyPurchaseQuote(shop, undefined, quantity, undefined, false, true).canPurchase).toBe(
      false,
    );
  expect(
    supplyPurchaseQuote({ ...shop, rations: 9 }, undefined, 10, undefined, false, true).canPurchase,
  ).toBe(false);
  const pending = {
    schemaVersion: 2 as const,
    commandId: 'pending',
    type: 'BuySupplies' as const,
    expectedPublicRevision: '1',
    payload: { siteId: 'kamenny-brod', shopRevision: '0', quantity: 10 },
  };
  expect(supplyPurchaseQuote(undefined, undefined, 10, pending, false, true)).toMatchObject({
    canPurchase: true,
    inputDisabled: true,
    hideTotals: true,
    buttonText: 'Повторить эту же покупку',
  });
  expect(supplyPurchaseQuote(shop, undefined, 10, pending, false, false).canPurchase).toBe(true);
  expect(supplyPurchaseQuote(shop, undefined, 10, undefined, true, true)).toMatchObject({
    disabled: true,
    buttonText: 'Покупаем…',
  });
});
