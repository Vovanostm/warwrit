import { isEncounterCommandDto, type EncounterCommandDto } from '@warwrit/protocol';
import {
  browserScopedAttemptStorage,
  clearScopedAttemptEnvelope,
  readScopedAttemptEnvelope,
  writeScopedAttemptEnvelope,
  type ScopedAttemptStorage,
} from '../scoped-attempt-storage.js';
import type { EncounterScope } from './connection.js';

export type EncounterCommandAttemptStorage = ScopedAttemptStorage;

export function browserEncounterCommandAttemptStorage():
  EncounterCommandAttemptStorage | undefined {
  return browserScopedAttemptStorage();
}

export interface EncounterCommandAttempt {
  readonly scope: EncounterScope;
  readonly encounterId: string;
  readonly command: EncounterCommandDto;
  readonly body: string;
}

export type EncounterCommandAttemptRead =
  | { readonly kind: 'EMPTY' }
  | { readonly kind: 'FOUND'; readonly attempt: EncounterCommandAttempt }
  | { readonly kind: 'UNAVAILABLE' }
  | { readonly kind: 'INVALID' };

export function encounterCommandAttemptStorageKey(
  scope: EncounterScope,
  encounterId: string,
): string {
  return `warwrit:encounter-command:v1:${encodeURIComponent(scope.accountId)}:${encodeURIComponent(scope.companyId)}:${encodeURIComponent(encounterId)}`;
}

export function readEncounterCommandAttempt(
  storage: EncounterCommandAttemptStorage,
  scope: EncounterScope,
  encounterId: string,
): EncounterCommandAttemptRead {
  const envelope = readScopedAttemptEnvelope(
    storage,
    encounterCommandAttemptStorageKey(scope, encounterId),
    scope,
    { key: 'encounterId', value: encounterId },
  );
  if (envelope.kind !== 'FOUND') return envelope;
  try {
    const command: unknown = JSON.parse(envelope.body);
    if (
      !isEncounterCommandDto(command) ||
      command.encounterId !== encounterId ||
      JSON.stringify(command) !== envelope.body
    )
      return { kind: 'INVALID' };
    return {
      kind: 'FOUND',
      attempt: Object.freeze({
        scope: Object.freeze({ accountId: scope.accountId, companyId: scope.companyId }),
        encounterId,
        command: Object.freeze(command),
        body: envelope.body,
      }),
    };
  } catch {
    return { kind: 'INVALID' };
  }
}

export function writeEncounterCommandAttempt(
  storage: EncounterCommandAttemptStorage,
  scope: EncounterScope,
  command: EncounterCommandDto,
): EncounterCommandAttempt {
  if (!isEncounterCommandDto(command)) throw new TypeError('Invalid encounter command');
  const body = JSON.stringify(command);
  const attempt = Object.freeze({
    scope: Object.freeze({ accountId: scope.accountId, companyId: scope.companyId }),
    encounterId: command.encounterId,
    command: Object.freeze({ ...command }),
    body,
  });
  writeScopedAttemptEnvelope(
    storage,
    encounterCommandAttemptStorageKey(scope, command.encounterId),
    scope,
    body,
    { key: 'encounterId', value: command.encounterId },
  );
  return attempt;
}

export function clearEncounterCommandAttempt(
  storage: EncounterCommandAttemptStorage,
  attempt: EncounterCommandAttempt,
): boolean {
  return clearScopedAttemptEnvelope(
    storage,
    encounterCommandAttemptStorageKey(attempt.scope, attempt.encounterId),
    attempt.scope,
    attempt.body,
    { key: 'encounterId', value: attempt.encounterId },
  );
}
