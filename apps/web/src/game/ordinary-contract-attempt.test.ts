import { describe, expect, it } from 'vitest';
import type { OrdinaryContractCommandDto } from '@warwrit/protocol';
import {
  classifyOrdinaryContractPost,
  selectOrdinaryContractAttempt,
} from './ordinary-contract-attempt.js';

const command: OrdinaryContractCommandDto = {
  schemaVersion: 1,
  commandId: '11111111-1111-4111-8111-111111111111',
  instanceId: 'ci.m1.road-tracks.01',
  expectedRevision: '7',
  type: 'STEP',
  stepId: 'inspect-bank',
};

describe('ordinary contract command attempts', () => {
  it('retains the original command for retry and rejects a new action while its outcome is unknown', () => {
    const different: OrdinaryContractCommandDto = {
      ...command,
      commandId: '22222222-2222-4222-8222-222222222222',
      expectedRevision: '8',
      stepId: 'report',
    };

    expect(selectOrdinaryContractAttempt(command, different, false)).toBeUndefined();
    const retry = selectOrdinaryContractAttempt(command, different, true);
    expect(retry).toBe(command);
    expect(JSON.stringify(retry)).toBe(JSON.stringify(command));
    expect(selectOrdinaryContractAttempt(undefined, command, true)).toBeUndefined();
    expect(selectOrdinaryContractAttempt(undefined, command, false)).toBe(command);
  });

  it('keeps 5xx, malformed, incomplete, mismatched and status-inconsistent responses unknown', () => {
    expect(classifyOrdinaryContractPost(502, { error: 'Bad Gateway' }, command.commandId)).toEqual({
      kind: 'UNKNOWN',
    });
    expect(
      classifyOrdinaryContractPost(
        200,
        { schemaVersion: 1, commandId: 'other', ok: true, revision: '8', rewardQ: null },
        command.commandId,
      ),
    ).toEqual({ kind: 'UNKNOWN' });
    expect(
      classifyOrdinaryContractPost(
        200,
        { schemaVersion: 1, commandId: command.commandId, ok: true },
        command.commandId,
      ),
    ).toEqual({ kind: 'UNKNOWN' });
    expect(
      classifyOrdinaryContractPost(
        200,
        { schemaVersion: 1, commandId: command.commandId, ok: true, revision: '8', rewardQ: null },
        command.commandId,
      ),
    ).toEqual({
      kind: 'ACCEPTED',
      response: {
        schemaVersion: 1,
        commandId: command.commandId,
        ok: true,
        revision: '8',
        rewardQ: null,
      },
    });
    expect(
      classifyOrdinaryContractPost(
        409,
        { schemaVersion: 1, commandId: command.commandId, ok: false, code: 'STALE_REVISION' },
        command.commandId,
      ),
    ).toEqual({
      kind: 'REJECTED',
      response: {
        schemaVersion: 1,
        commandId: command.commandId,
        ok: false,
        code: 'STALE_REVISION',
      },
    });
    expect(
      classifyOrdinaryContractPost(
        200,
        { schemaVersion: 1, commandId: command.commandId, ok: false, code: 'STALE_REVISION' },
        command.commandId,
      ),
    ).toEqual({ kind: 'UNKNOWN' });
  });

  it('recognizes authentication expiry before attempting to parse an error body', () => {
    expect(classifyOrdinaryContractPost(401, null, command.commandId)).toEqual({
      kind: 'UNAUTHENTICATED',
    });
  });
});
