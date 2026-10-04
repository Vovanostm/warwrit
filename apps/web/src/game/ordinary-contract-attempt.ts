import type {
  OrdinaryContractCommandDto,
  OrdinaryContractCommandResponseDto,
} from '@warwrit/protocol';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return (
    Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key))
  );
}

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
