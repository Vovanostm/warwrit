import { expect, it } from 'vitest';
import { itemTransferResult, readItemTransferAttempt } from './item-transfer-attempt.js';

const accepted = { commandId: 'transfer', ok: true, publicRevision: '8' };
const rejected = { commandId: 'transfer', ok: false, publicRevision: '8', code: 'CAPACITY' };
it.each([
  [200, accepted, 'ACCEPTED'],
  [409, rejected, 'CAPACITY'],
  [409, { ...rejected, code: 'STALE_REVISION' }, 'STALE_REVISION'],
  [403, { ...rejected, code: 'NOT_AUTHORIZED' }, 'NOT_AUTHORIZED'],
  [200, { ...accepted, commandId: 'another-command' }, 'UNKNOWN'],
  [200, { ...accepted, publicRevision: '08' }, 'UNKNOWN'],
  [200, { ...accepted, extra: true }, 'UNKNOWN'],
  [200, rejected, 'UNKNOWN'],
  [409, { ...rejected, code: 'UNRECOGNIZED' }, 'UNKNOWN'],
  [409, { ...rejected, code: 'NOT_AUTHORIZED' }, 'UNKNOWN'],
  [403, rejected, 'UNKNOWN'],
  [500, rejected, 'UNKNOWN'],
  [401, undefined, 'UNKNOWN'],
  [200, null, 'UNKNOWN'],
])(
  'classifies response status %s without trusting an unmatched or malformed terminal body',
  (status, body, expected) => {
    expect(itemTransferResult(Number(status), body, 'transfer')).toBe(expected);
  },
);

it('restores only an intact request from the same account and company', () => {
  const request = {
    schemaVersion: 2,
    commandId: 'transfer',
    expectedPublicRevision: '7',
    type: 'TransferItem',
    payload: { itemId: 'ration', quantity: 2, fromContainerId: 'supply', toContainerId: 'pack' },
  };
  const stored = (value: unknown) =>
    JSON.stringify({ accountId: 'account', companyId: 'company', request: value });
  expect(readItemTransferAttempt(stored(request), 'account', 'company')).toEqual(request);
  expect(readItemTransferAttempt(stored(request), 'other-account', 'company')).toBeUndefined();
  expect(readItemTransferAttempt(stored(request), 'account', 'other-company')).toBeUndefined();
  expect(
    readItemTransferAttempt(
      stored({ ...request, payload: { ...request.payload, quantity: 0 } }),
      'account',
      'company',
    ),
  ).toBeUndefined();
  expect(
    readItemTransferAttempt(
      stored({ ...request, payload: { ...request.payload, accessEvidenceId: 'client-authority' } }),
      'account',
      'company',
    ),
  ).toBeUndefined();
  expect(readItemTransferAttempt('{broken', 'account', 'company')).toBeUndefined();
});
