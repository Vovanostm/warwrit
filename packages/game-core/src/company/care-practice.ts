import { COMPANY_CATALOGUE, COMPANY_RULES } from './definitions.js';
import { requireEconomy } from './economy-state.js';
import { canonicalJson } from './input.js';
import { person } from './lifecycle-state.js';
import { COMPANY_COMMAND_SCHEMA_VERSION, COMPANY_RULESET_ID } from './model.js';
import { applyCare } from './physical-care.js';
import { physicalFact, physicalId } from './physical-state.js';
import { preparePracticeCredit } from './practice-credit.js';
import { PROGRESSION_RULES } from './progression.js';
import { skillLevel } from './skill-progress.js';
import type { EconomyContext } from './economy-types.js';
import type { CommandOf } from './lifecycle-types.js';
import type { MaterializedCompanyState, PhysicalChange } from './physical-root-types.js';
import type { PracticeContext, PracticeEvidence } from './practice-admission.js';

const CARE_PRACTICE_ACTOR_ID = 'care-practice-producer';

/**
 * B04 producer: successful care remains the source of truth. Company-member practice is
 * credited in the same root draft; external providers stay outside company progression.
 */
export function applyCareWithPractice(
  root: MaterializedCompanyState,
  command: CommandOf<'ApplyCare'>,
  context: EconomyContext,
): PhysicalChange {
  const change = applyCare(root, command, context);
  const fact = physicalFact(context, command.payload.resourceOrProviderReceiptId, 'CARE_FULFILLMENT');
  const membership = root.lifecycle.memberships.find(
    (entry) =>
      entry.companyId === root.lifecycle.companyId &&
      entry.characterId === fact.providerId &&
      entry.endedAt === null,
  );
  if (!membership) return change;

  const treated = root.physical.conditions.find(
    (entry) =>
      entry.conditionId === command.payload.conditionId &&
      entry.characterId === command.payload.characterId,
  );
  requireEconomy(treated, 'INVALID_STATE');
  const provider = person(root.lifecycle, fact.providerId);
  const medicine = provider.skills['medicine'];
  requireEconomy(medicine !== undefined, 'INVALID_STATE');
  const levelAtStart = skillLevel(medicine);
  const aptitudeAtStartBps = provider.aptitudeBySkill['medicine'];
  requireEconomy(
    Number.isSafeInteger(aptitudeAtStartBps) && aptitudeAtStartBps! > 0,
    'INVALID_STATE',
  );
  requireEconomy(
    Number.isSafeInteger(fact.practiceChallengeLevel) &&
      fact.practiceChallengeLevel! >= 0 &&
      fact.practiceChallengeLevel! <= COMPANY_RULES.maxSkillLevel,
    'INVALID_SOURCE',
  );

  const sourceEventId = fact.sourceEventId;
  const receiptId = physicalId(fact.id, fact.providerId, 'care-practice-receipt');
  const practiceCommand: CommandOf<'CreditPractice'> = {
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: physicalId(fact.id, fact.providerId, 'care-practice-command'),
    worldId: root.lifecycle.worldId,
    companyId: root.lifecycle.companyId,
    actorRef: { kind: 'DOMAIN_RECEIPT', id: CARE_PRACTICE_ACTOR_ID },
    expectedRevision: root.lifecycle.revision,
    campaignTick: context.atTick,
    rulesetId: COMPANY_RULESET_ID,
    sourceEventId,
    type: 'CreditPractice',
    payload: {
      receiptId,
      characterId: fact.providerId,
      skillId: 'medicine',
      methodId: 'care-provided',
      challengeLevel: fact.practiceChallengeLevel!,
      outcome: 'SUCCESS',
      effortTicks: '0',
    },
  };
  const source: PracticeEvidence = {
    worldId: root.lifecycle.worldId,
    companyId: root.lifecycle.companyId,
    sourceEventId,
    rulesVersion: PROGRESSION_RULES.version,
    catalogueVersion: COMPANY_CATALOGUE.version,
    payload: practiceCommand.payload,
    startedAt: context.atTick,
    completedAt: context.atTick,
    levelAtStart,
    aptitudeAtStartBps: aptitudeAtStartBps!,
    proof: {
      kind: 'care-provided',
      providerId: fact.providerId,
      patientId: command.payload.characterId,
      conditionId: command.payload.conditionId,
      conditionDefinitionId: treated.definitionId,
      careId: command.payload.careDefinitionId,
      appliedCareReceiptId: sourceEventId,
    },
  };
  const practiceContext: EconomyContext & Pick<PracticeContext, 'practiceFacts'> = {
    ...context,
    principal: practiceCommand.actorRef,
    canonicalRevision: root.lifecycle.revision,
    publicRevision: root.lifecycle.knowledge.revision,
    internalGrant: {
      commandId: practiceCommand.commandId,
      sourceEventId,
      canonicalRequest: canonicalJson(practiceCommand),
    },
    practiceFacts: [source],
  };
  const credited = preparePracticeCredit(
    { lifecycle: change.lifecycle, finance: change.finance, physical: change.physical },
    practiceCommand,
    practiceContext,
  );
  return { ...credited, requirements: change.requirements };
}
