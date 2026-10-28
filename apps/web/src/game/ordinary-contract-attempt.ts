import type {
  OrdinaryContractCommandDto,
  OrdinaryContractCommandResponseDto,
} from '@warwrit/protocol';
import { hasExactKeys, isRecord } from '../scoped-attempt-storage.js';
import {
  browserOrdinaryContractAttemptStorage,
  clearOrdinaryContractAttempt,
  readOrdinaryContractAttempt,
  writeOrdinaryContractAttempt,
  type OrdinaryContractAttempt,
  type OrdinaryContractAttemptScope,
  type OrdinaryContractAttemptStorage,
} from './ordinary-contract-attempt-storage.js';

export type OrdinaryContractPostResult =
  | {
      readonly kind: 'ACCEPTED';
      readonly response: Extract<OrdinaryContractCommandResponseDto, { ok: true }>;
    }
  | {
      readonly kind: 'REJECTED';
      readonly response: Extract<OrdinaryContractCommandResponseDto, { ok: false }>;
    }
  | { readonly kind: 'UNAUTHENTICATED' }
  | { readonly kind: 'UNKNOWN' };

const REJECTION_CODES = new Set([
  'NOT_AUTHORIZED',
  'INVALID_COMMAND',
  'STALE_REVISION',
  'NOT_AVAILABLE',
  'NOT_A_PARTICIPANT',
  'WRONG_PLACE',
  'ALREADY_DONE',
  'MISSING_EVIDENCE',
  'CONDITION_NOT_MET',
  'INSUFFICIENT_FUNDS',
]);

function isDecimal(value: unknown): value is string {
  return typeof value === 'string' && /^(0|[1-9][0-9]*)$/u.test(value);
}

/** An unresolved command keeps its original identity and body until a terminal receipt arrives. */
export function selectOrdinaryContractAttempt(
  pending: OrdinaryContractCommandDto | undefined,
  requested: OrdinaryContractCommandDto,
  retry: boolean,
): OrdinaryContractCommandDto | undefined {
  if (pending) return retry ? pending : undefined;
  return retry ? undefined : requested;
}

export function ordinaryContractCommandAvailability(input: {
  readonly scopeKey: string;
  readonly currentScopeKey: string;
  readonly attemptScopeKey: string;
  readonly ready: boolean;
  readonly hasPending: boolean;
  readonly inFlight: boolean;
  readonly retry: boolean;
}): {
  readonly scopeReady: boolean;
  readonly inFlight: boolean;
  readonly canSend: boolean;
  readonly commandsBusy: boolean;
} {
  const scopeReady =
    input.currentScopeKey === input.scopeKey &&
    input.attemptScopeKey === input.scopeKey &&
    input.ready;
  return {
    scopeReady,
    inFlight: input.inFlight,
    canSend: scopeReady && !input.inFlight && (input.hasPending ? input.retry : !input.retry),
    commandsBusy: !scopeReady || input.hasPending || input.inFlight,
  };
}

export type OrdinaryContractAttemptPreparation =
  | { readonly kind: 'NO_COMMAND' }
  | { readonly kind: 'BLOCKED'; readonly message: string }
  | {
      readonly kind: 'READY';
      readonly attempt: OrdinaryContractAttempt;
      readonly storage: OrdinaryContractAttemptStorage;
    };

export function prepareOrdinaryContractAttempt(input: {
  readonly scope: OrdinaryContractAttemptScope;
  readonly pending: OrdinaryContractAttempt | undefined;
  readonly requested: OrdinaryContractCommandDto;
  readonly retry: boolean;
}): OrdinaryContractAttemptPreparation {
  const command = selectOrdinaryContractAttempt(
    input.pending?.command,
    input.requested,
    input.retry,
  );
  if (!command) return { kind: 'NO_COMMAND' };
  const storage = browserOrdinaryContractAttemptStorage();
  if (!storage)
    return {
      kind: 'BLOCKED',
      message: 'Не удалось сохранить запрос. Повторите после восстановления хранилища.',
    };

  if (input.pending) {
    const stored = readOrdinaryContractAttempt(storage, input.scope);
    if (
      JSON.stringify(command) !== input.pending.body ||
      stored.kind !== 'FOUND' ||
      stored.attempt.body !== input.pending.body
    )
      return {
        kind: 'BLOCKED',
        message:
          'Не удалось подтвердить сохранённый запрос. Обновите страницу перед новой командой.',
      };
    return { kind: 'READY', attempt: stored.attempt, storage };
  }

  const current = readOrdinaryContractAttempt(storage, input.scope);
  if (current.kind !== 'EMPTY')
    return {
      kind: 'BLOCKED',
      message: 'Не удалось проверить прежнюю команду. Обновите страницу перед новым запросом.',
    };
  try {
    return {
      kind: 'READY',
      attempt: writeOrdinaryContractAttempt(storage, input.scope, command),
      storage,
    };
  } catch {
    return {
      kind: 'BLOCKED',
      message: 'Не удалось сохранить запрос. Команда не отправлена.',
    };
  }
}

export function settleOrdinaryContractAttempt(
  storage: OrdinaryContractAttemptStorage,
  attempt: OrdinaryContractAttempt,
  result: OrdinaryContractPostResult,
): OrdinaryContractPostResult | { readonly kind: 'RETAINED' } {
  if (result.kind === 'UNAUTHENTICATED' || result.kind === 'UNKNOWN') return result;
  return clearOrdinaryContractAttempt(storage, attempt) ? result : { kind: 'RETAINED' };
}

export async function postOrdinaryContractAttempt(
  attempt: OrdinaryContractAttempt,
): Promise<OrdinaryContractPostResult> {
  const response = await fetch('/api/contracts/ordinary/commands', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: attempt.body,
  });
  const body: unknown = response.status === 401 ? null : await response.json();
  return classifyOrdinaryContractPost(response.status, body, attempt.command.commandId);
}

/** Only the server's complete status/body pair can settle a pending command. */
export function classifyOrdinaryContractPost(
  status: number,
  value: unknown,
  commandId: string,
): OrdinaryContractPostResult {
  if (status === 401) return { kind: 'UNAUTHENTICATED' };
  if (!isRecord(value) || value['schemaVersion'] !== 1 || value['commandId'] !== commandId)
    return { kind: 'UNKNOWN' };

  if (
    status === 200 &&
    hasExactKeys(value, ['schemaVersion', 'commandId', 'ok', 'revision', 'rewardQ']) &&
    value['ok'] === true &&
    isDecimal(value['revision']) &&
    (value['rewardQ'] === null || isDecimal(value['rewardQ']))
  ) {
    return {
      kind: 'ACCEPTED',
      response: value as Extract<OrdinaryContractCommandResponseDto, { ok: true }>,
    };
  }

  if (
    (status === 403 || status === 409) &&
    hasExactKeys(value, ['schemaVersion', 'commandId', 'ok', 'code']) &&
    value['ok'] === false &&
    typeof value['code'] === 'string' &&
    REJECTION_CODES.has(value['code']) &&
    (status === 403 ? value['code'] === 'NOT_AUTHORIZED' : value['code'] !== 'NOT_AUTHORIZED')
  ) {
    return {
      kind: 'REJECTED',
      response: value as Extract<OrdinaryContractCommandResponseDto, { ok: false }>,
    };
  }

  return { kind: 'UNKNOWN' };
}
