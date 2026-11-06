import type {
  EncounterCommandDto,
  EncounterCommandResponse,
  EncounterControlGrantDto,
  EncounterPublicProjectionDto,
} from '@warwrit/protocol';
import {
  canIssueEncounterIntent,
  encounterConditionAllows,
  readEncounterCommandResponse,
} from '../renderer/projection.js';
import {
  clearEncounterCommandAttempt,
  readEncounterCommandAttempt,
  writeEncounterCommandAttempt,
  type EncounterCommandAttempt,
  type EncounterCommandAttemptStorage,
} from './command-attempt-storage.js';
import { type EncounterCommandSender, type EncounterScope } from './connection.js';

export type EncounterIntentOrCommand = EncounterCommandDto['intent'] | EncounterCommandDto;

export function createEncounterCommand(input: {
  readonly value: EncounterIntentOrCommand;
  readonly projection: EncounterPublicProjectionDto | undefined;
  readonly grant: EncounterControlGrantDto | undefined;
  readonly selectedUnitId: string | null;
  readonly pending: EncounterCommandDto | undefined;
}): EncounterCommandDto | undefined {
  if ('commandId' in input.value)
    return input.pending?.commandId === input.value.commandId ? input.value : undefined;
  const { projection, grant } = input;
  if (
    !projection ||
    !grant ||
    !projection.actorUnitId ||
    !canIssueEncounterIntent(projection, grant, input.selectedUnitId) ||
    projection.actorUnitId !== input.selectedUnitId ||
    projection.activationId === null ||
    !encounterConditionAllows(
      grant,
      projection.activationId,
      projection.actorUnitId,
      input.value.type,
    )
  )
    return undefined;
  return {
    version: grant.tactical ? 2 : 1,
    encounterId: projection.encounterId,
    commandId: crypto.randomUUID(),
    expectedRevision: projection.revision,
    activationId: projection.activationId,
    actorId: projection.actorUnitId,
    intent: input.value,
  } as EncounterCommandDto;
}

export type EncounterAttemptPreparation =
  | { readonly kind: 'READY'; readonly attempt: EncounterCommandAttempt }
  | { readonly kind: 'RETRY_MISMATCH' }
  | { readonly kind: 'STORAGE_BLOCKED' };

export function prepareEncounterCommandAttempt(input: {
  readonly storage: EncounterCommandAttemptStorage;
  readonly scope: EncounterScope;
  readonly command: EncounterCommandDto;
  readonly retry: boolean;
  readonly pending: EncounterCommandAttempt | undefined;
}): EncounterAttemptPreparation {
  if (input.retry) {
    const current = readEncounterCommandAttempt(
      input.storage,
      input.scope,
      input.command.encounterId,
    );
    if (
      !input.pending ||
      JSON.stringify(input.command) !== input.pending.body ||
      current.kind !== 'FOUND' ||
      current.attempt.body !== input.pending.body
    )
      return { kind: 'RETRY_MISMATCH' };
    return { kind: 'READY', attempt: current.attempt };
  }

  const current = readEncounterCommandAttempt(
    input.storage,
    input.scope,
    input.command.encounterId,
  );
  if (current.kind !== 'EMPTY') return { kind: 'STORAGE_BLOCKED' };
  try {
    return {
      kind: 'READY',
      attempt: writeEncounterCommandAttempt(input.storage, input.scope, input.command),
    };
  } catch {
    return { kind: 'STORAGE_BLOCKED' };
  }
}

export type EncounterCommandPost =
  | { readonly kind: 'RESPONSE'; readonly response: EncounterCommandResponse }
  | { readonly kind: 'UNKNOWN'; readonly message: string };

export async function postEncounterCommand(
  sender: EncounterCommandSender,
  command: EncounterCommandDto,
): Promise<EncounterCommandPost> {
  try {
    const raw = await sender(command);
    const response = readEncounterCommandResponse(raw, command);
    return response
      ? { kind: 'RESPONSE', response }
      : { kind: 'UNKNOWN', message: 'Ответ боя не подтверждает отправленную команду.' };
  } catch (error) {
    return {
      kind: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Не удалось подтвердить команду.',
    };
  }
}

export type EncounterAttemptSettlement = 'UNAUTHORIZED' | 'CLEARED' | 'RETAINED';

export function settleEncounterCommandAttempt(
  storage: EncounterCommandAttemptStorage,
  attempt: EncounterCommandAttempt,
  response: EncounterCommandResponse,
): EncounterAttemptSettlement {
  if (response.status === 'rejected' && response.code === 'UNAUTHORIZED') return 'UNAUTHORIZED';
  return clearEncounterCommandAttempt(storage, attempt) ? 'CLEARED' : 'RETAINED';
}
