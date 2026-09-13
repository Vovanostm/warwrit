import { COMPANY_COMMAND_INPUTS } from './commands.js';
import { COMPANY_CATALOGUE, COMPANY_RULES } from './definitions.js';
import { EconomyViolation, requireEconomy } from './economy-state.js';
import { guardCompanyCommand } from './guards.js';
import type { TrustedCompanyContext } from './guards.js';
import {
  array,
  canonicalJson,
  choice,
  either,
  id,
  natural,
  object,
  snapshotJson,
  unsigned,
} from './input.js';
import type { ValueOf } from './input.js';
import { progressionChallengeBps, PROGRESSION_RULES, xpToMilliXp } from './progression.js';

const interaction = object({
  sourceEventId: id,
  attackerId: id,
  defenderId: id,
  atTick: unsigned,
  origin: choice('EXTERNAL'),
});
const proof = either(
  object({ kind: choice('weapon-attack'), interaction, weaponProfile: id }),
  either(
    object({ kind: choice('guard-interaction'), interaction }),
    either(
      object({
        kind: choice('care-provided'),
        providerId: id,
        patientId: id,
        conditionId: id,
        conditionDefinitionId: id,
        careId: id,
        appliedCareReceiptId: id,
      }),
      object({
        kind: choice('command-cycle'),
        commanderId: id,
        cycleId: id,
        subordinateIds: array(id, 2, 1000, true),
        interactions: array(interaction, 2, 1000, true),
      }),
    ),
  ),
);
const practiceInput = object({
  worldId: id,
  companyId: id,
  sourceEventId: id,
  rulesVersion: choice(PROGRESSION_RULES.version),
  catalogueVersion: choice(COMPANY_CATALOGUE.version),
  payload: COMPANY_COMMAND_INPUTS.CreditPractice,
  startedAt: unsigned,
  completedAt: unsigned,
  levelAtStart: natural(0, COMPANY_RULES.maxSkillLevel),
  aptitudeAtStartBps: natural(1),
  proof,
});
/** Adapter-resolved historical work, never copied from a request or current equipment.
 * B04/G09 must prove actual external interactions, needed applied care, or subordinate work.
 * Supply one fact per request. This boundary does not implement those producers.
 */
export type PracticeEvidence = ValueOf<typeof practiceInput>;
export interface PracticeContext extends TrustedCompanyContext {
  readonly atTick: string;
  readonly practiceFacts?: readonly PracticeEvidence[];
}

function relevant(fact: PracticeEvidence): boolean {
  const work = fact.proof;
  const p = fact.payload;
  switch (work.kind) {
    case 'weapon-attack':
      return (
        work.interaction.attackerId === p.characterId &&
        COMPANY_CATALOGUE.items.some(
          (item) =>
            item.enabled && item.weaponProfile === work.weaponProfile && item.skillId === p.skillId,
        )
      );
    case 'guard-interaction':
      return work.interaction.defenderId === p.characterId;
    case 'care-provided':
      return (
        work.providerId === p.characterId &&
        work.appliedCareReceiptId === fact.sourceEventId &&
        COMPANY_CATALOGUE.cares.some((care) => care.id === work.careId && care.enabled) &&
        COMPANY_CATALOGUE.conditions.some(
          (c) => c.id === work.conditionDefinitionId && c.careId === work.careId,
        )
      );
    case 'command-cycle':
      return (
        work.commanderId === p.characterId &&
        work.cycleId === fact.sourceEventId &&
        !work.subordinateIds.includes(p.characterId) &&
        work.interactions.every((entry) => work.subordinateIds.includes(entry.attackerId)) &&
        new Set(work.interactions.map((entry) => entry.attackerId)).size >= 2 &&
        new Set(work.interactions.map((entry) => entry.sourceEventId)).size ===
          work.interactions.length
      );
  }
}

// Admission only: root replay/CAS, exact accumulator credit and atomic commit remain separate.
export function admitPractice(value: unknown, context: PracticeContext) {
  const guarded = guardCompanyCommand(value, context);
  if (!guarded.ok) throw new EconomyViolation(guarded.error);
  requireEconomy(guarded.command.type === 'CreditPractice', 'INVALID_SOURCE');
  const command = guarded.command;
  const facts = snapshotJson(context.practiceFacts);
  requireEconomy(array(practiceInput, 1, 1).read(facts), 'INVALID_SOURCE');
  const fact = facts[0]!;
  const p = command.payload;
  const method = COMPANY_CATALOGUE.methods.find((entry) => entry.id === p.methodId);
  requireEconomy(
    command.campaignTick === context.atTick &&
      fact.worldId === context.worldId &&
      fact.companyId === context.companyId &&
      fact.sourceEventId === command.sourceEventId &&
      canonicalJson(fact.payload) === canonicalJson(p) &&
      method?.enabled &&
      method.interval === 'EVENT' &&
      method.xp !== undefined &&
      (method.target === 'mapped-weapon' || method.target === p.skillId) &&
      fact.proof.kind === p.methodId &&
      BigInt(fact.startedAt) <= BigInt(fact.completedAt) &&
      BigInt(fact.completedAt) <= BigInt(command.campaignTick) &&
      BigInt(p.effortTicks) <= BigInt(fact.completedAt) - BigInt(fact.startedAt) &&
      relevant(fact),
    'INVALID_SOURCE',
  );
  const work = fact.proof;
  const interactions =
    'interaction' in work
      ? [work.interaction]
      : work.kind === 'command-cycle'
        ? work.interactions
        : [];
  requireEconomy(
    interactions.every(
      (entry) =>
        entry.attackerId !== entry.defenderId &&
        BigInt(entry.atTick) >= BigInt(fact.startedAt) &&
        BigInt(entry.atTick) <= BigInt(fact.completedAt) &&
        (work.kind === 'command-cycle' || entry.sourceEventId === fact.sourceEventId),
    ),
    'INVALID_SOURCE',
  );
  return Object.freeze({
    source: fact,
    baseMilliXp: xpToMilliXp(method.xp),
    coefficients: Object.freeze({
      aptitudeBps: fact.aptitudeAtStartBps,
      challengeBps: progressionChallengeBps(p.challengeLevel, fact.levelAtStart),
      outcomeBps:
        p.outcome === 'SUCCESS'
          ? PROGRESSION_RULES.outcomeBps.success
          : PROGRESSION_RULES.outcomeBps.meaningfulFailure,
    }),
  });
}
