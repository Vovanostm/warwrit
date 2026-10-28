import { isOrdinaryContractCommand, type OrdinaryContractCommandDto } from '@warwrit/protocol';
import {
  browserScopedAttemptStorage,
  clearScopedAttemptEnvelope,
  readScopedAttemptEnvelope,
  writeScopedAttemptEnvelope,
  type ScopedAttemptScope,
  type ScopedAttemptStorage,
} from '../scoped-attempt-storage.js';

export type OrdinaryContractAttemptScope = ScopedAttemptScope;
export type OrdinaryContractAttemptStorage = ScopedAttemptStorage;

export interface OrdinaryContractAttempt {
  readonly scope: OrdinaryContractAttemptScope;
  readonly command: OrdinaryContractCommandDto;
  readonly body: string;
}

export type OrdinaryContractAttemptRead =
  | { readonly kind: 'EMPTY' }
  | { readonly kind: 'FOUND'; readonly attempt: OrdinaryContractAttempt }
  | { readonly kind: 'UNAVAILABLE' }
  | { readonly kind: 'INVALID' };

export function ordinaryContractAttemptStorageKey(scope: OrdinaryContractAttemptScope): string {
  return `warwrit:ordinary-contract:v1:${encodeURIComponent(scope.accountId)}:${encodeURIComponent(scope.companyId)}`;
}

export function readOrdinaryContractAttempt(
  storage: OrdinaryContractAttemptStorage,
  scope: OrdinaryContractAttemptScope,
): OrdinaryContractAttemptRead {
  const envelope = readScopedAttemptEnvelope(
    storage,
    ordinaryContractAttemptStorageKey(scope),
    scope,
  );
  if (envelope.kind !== 'FOUND') return envelope;
  try {
    const parsed: unknown = JSON.parse(envelope.body);
    if (!isOrdinaryContractCommand(parsed) || JSON.stringify(parsed) !== envelope.body)
      return { kind: 'INVALID' };
    return {
      kind: 'FOUND',
      attempt: Object.freeze({
        scope: Object.freeze({ accountId: scope.accountId, companyId: scope.companyId }),
        command: Object.freeze(parsed),
        body: envelope.body,
      }),
    };
  } catch {
    return { kind: 'INVALID' };
  }
}

export function writeOrdinaryContractAttempt(
  storage: OrdinaryContractAttemptStorage,
  scope: OrdinaryContractAttemptScope,
  command: OrdinaryContractCommandDto,
): OrdinaryContractAttempt {
  if (!isOrdinaryContractCommand(command)) throw new TypeError('Invalid ordinary contract command');
  const body = JSON.stringify(command);
  const attempt = Object.freeze({
    scope: Object.freeze({ accountId: scope.accountId, companyId: scope.companyId }),
    command: Object.freeze({ ...command }),
    body,
  });
  writeScopedAttemptEnvelope(storage, ordinaryContractAttemptStorageKey(scope), scope, body);
  return attempt;
}

export function clearOrdinaryContractAttempt(
  storage: OrdinaryContractAttemptStorage,
  attempt: OrdinaryContractAttempt,
): boolean {
  return clearScopedAttemptEnvelope(
    storage,
    ordinaryContractAttemptStorageKey(attempt.scope),
    attempt.scope,
    attempt.body,
  );
}

export function browserOrdinaryContractAttemptStorage():
  OrdinaryContractAttemptStorage | undefined {
  return browserScopedAttemptStorage();
}
