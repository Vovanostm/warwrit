import * as combat from '@warwrit/game-core';
import { COMBAT_LAB_VERSION, type CombatLabAction } from '@warwrit/protocol';

export const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const id = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128;

export function isActionBody(value: unknown): value is CombatLabAction {
  if (!record(value) || Object.keys(value).length !== 8) return false;
  if (
    value['version'] !== COMBAT_LAB_VERSION ||
    !id(value['sessionId']) ||
    !id(value['battleId']) ||
    !id(value['requestId']) ||
    !Number.isSafeInteger(value['expectedViewRevision']) ||
    (value['expectedViewRevision'] as number) < 0 ||
    !id(value['activationId']) ||
    !id(value['actorId']) ||
    !record(value['intent'])
  )
    return false;
  return isActionIntent(value['intent']);
}

function isActionIntent(intent: Record<string, unknown>): boolean {
  switch (intent['type']) {
    case 'use-skill':
      return isSkillIntent(intent);
    case 'autoplay':
      return Object.keys(intent).length === 1;
    case 'move':
      return Object.keys(intent).length === 2 && isHex(intent['to']);
    case 'prepare-threat':
    case 'retarget-threat':
    case 'attack':
      return Object.keys(intent).length === 2 && id(intent['targetId']);
    case 'defend':
    case 'wait':
    case 'flee':
    case 'surrender':
    case 'execute-threat':
    case 'retreat':
      return Object.keys(intent).length === 1;
    default:
      return false;
  }
}

function isSkillIntent(intent: Record<string, unknown>): boolean {
  return (
    combat.COMBAT_SKILL_IDS.includes(intent['skillId'] as combat.CombatSkillId) &&
    (Object.hasOwn(intent, 'targetId')
      ? Object.keys(intent).length === 3 && id(intent['targetId'])
      : Object.keys(intent).length === 2)
  );
}

function isHex(value: unknown): boolean {
  return (
    record(value) &&
    Object.keys(value).length === 2 &&
    Number.isSafeInteger(value['q']) &&
    Number.isSafeInteger(value['r'])
  );
}
