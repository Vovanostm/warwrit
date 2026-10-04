import { expect, it } from 'vitest';
import { readSupplyPurchaseAttempt } from './supply-purchase-attempt.js';

it('ignores damaged stored purchases and retains a complete uncertain request unchanged', () => {
  expect(readSupplyPurchaseAttempt('{')).toBeUndefined();
  expect(readSupplyPurchaseAttempt('{"type":"BuySupplies","schemaVersion":2}')).toBeUndefined();
  const request = {
    schemaVersion: 2,
    type: 'BuySupplies',
    commandId: 'same-uncertain-command',
    expectedPublicRevision: '12',
    payload: { siteId: 'kamenny-brod', shopRevision: '3', quantity: 10 },
  };
  expect(readSupplyPurchaseAttempt(JSON.stringify(request))).toEqual(request);
  expect(
    readSupplyPurchaseAttempt(
      JSON.stringify({ ...request, payload: { ...request.payload, quantity: 0 } }),
    ),
  ).toBeUndefined();
});
