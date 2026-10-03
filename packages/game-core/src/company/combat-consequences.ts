import type { CombatEvent } from '../combat/types.js';
import { applyCondition } from './physical-care.js';
import type { CommandOf } from './lifecycle-types.js';
import { recordFinancialDeath } from './economy-knowledge.js';
import type {
  FinanceEvidence,
  EconomyContext,
  EconomyRequirement,
  FinancialDeathEvidence,
} from './economy-types.js';
import { COMPANY_CATALOGUE } from './definitions.js';
import { COMPANY_COMMAND_SCHEMA_VERSION, COMPANY_RULESET_ID } from './model.js';
import { applyDeath } from './physical-outcomes.js';
import type { DeathOutcomeEvidence, PhysicalEvidence } from './physical-types.js';
import type { MaterializedCompanyState } from './physical-root-types.js';
import { canonicalJson } from './input.js';
import { requirePhysical, validatePhysicalState } from './physical-state.js';
import { prepareCombatPhysicalEffects } from './combat-physical.js';
import type { PreparedCombatPhysicalEffects } from './combat-physical.js';
import { validateCombatReceiptJournal } from './combat-receipts.js';
import type { CombatReceiptJournal } from './combat-receipts.js';
import { validateEconomy } from './economy-state.js';
import { canonicalRevision } from './values.js';
import { PHYSICAL_POLICY_VERSION } from './physical-types.js';

export interface PreparedCombatConsequences extends PreparedCombatPhysicalEffects {
  readonly root: MaterializedCompanyState;
  readonly requirements: readonly EconomyRequirement[];
}

function eventCharacterId(
  event: CombatEvent,
  participantByUnit: ReadonlyMap<string, string>,
): string | undefined {
  if (event.type !== 'unit.wounded' && event.type !== 'unit.died') return undefined;
  return participantByUnit.get(event.unitId);
}

function oneFact<T>(facts: readonly T[]): T {
  requirePhysical(facts.length === 1, 'INVALID_SOURCE');
  const fact = facts[0];
  requirePhysical(fact !== undefined, 'INVALID_SOURCE');
  return fact;
}

function validatePhysicalScope(
  fact: Extract<PhysicalEvidence, { kind: 'CONDITION_SOURCE' | 'DEATH_OUTCOME' }>,
  context: EconomyContext,
  ordinal: number,
  sourceEventId: string,
) {
  requirePhysical(
    fact.companyId === context.companyId &&
      fact.worldId === context.worldId &&
      fact.revision === context.canonicalRevision &&
      fact.atTick === context.atTick &&
      fact.ordinal === ordinal &&
      fact.sourceEventId === sourceEventId,
    'INVALID_SOURCE',
  );
}

function validateFinanceScope(
  fact: Extract<EconomyContext['financeFacts'][number], { kind: 'FINANCIAL_DEATH' }>,
  context: EconomyContext,
  sourceEventId: string,
) {
  requirePhysical(
    fact.companyId === context.companyId &&
      fact.worldId === context.worldId &&
      fact.revision === context.canonicalRevision &&
      fact.atTick === context.atTick &&
      fact.sourceEventId === sourceEventId,
    'INVALID_SOURCE',
  );
}

function conditionForSeverity(severity: 'minor' | 'severe') {
  const category = severity === 'minor' ? 'REST_RECOVERABLE' : 'TREATMENT_REQUIRED_STABLE';
  const definitions = COMPANY_CATALOGUE.conditions.filter((entry) => entry.category === category);
  requirePhysical(definitions.length === 1, 'INVALID_STATE');
  return definitions[0]!;
}

function applyKernelWound(
  root: MaterializedCompanyState,
  context: EconomyContext,
  event: Extract<CombatEvent, { type: 'unit.wounded' }>,
  characterId: string,
  ordinal: number,
  sourceEventId: string,
): MaterializedCompanyState {
  const matching = (context.physicalFacts ?? []).filter(
    (fact): fact is Extract<PhysicalEvidence, { kind: 'CONDITION_SOURCE' }> =>
      fact.kind === 'CONDITION_SOURCE' && fact.sourceEventId === sourceEventId,
  );
  const fact = oneFact(matching);
  validatePhysicalScope(fact, context, ordinal, sourceEventId);
  const definition = conditionForSeverity(event.severity);
  requirePhysical(
    fact.characterId === characterId && fact.definitionId === definition.id,
    'INVALID_SOURCE',
  );
  const command: CommandOf<'ApplyCondition'> = {
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: sourceEventId,
    worldId: context.worldId,
    companyId: context.companyId,
    actorRef: { kind: 'DOMAIN_RECEIPT', id: fact.id },
    expectedRevision: context.canonicalRevision,
    campaignTick: context.atTick,
    rulesetId: COMPANY_RULESET_ID,
    sourceEventId,
    type: 'ApplyCondition',
    payload: {
      receiptId: fact.id,
      characterId,
      conditionDefinitionId: definition.id,
      causeId: fact.causeId,
      ...(fact.deadlineTick === undefined ? {} : { deadlineTick: fact.deadlineTick }),
    },
  };
  const applied = applyCondition(root, command, context);
  return { lifecycle: applied.lifecycle, finance: applied.finance, physical: applied.physical };
}

export type CombatReceiptDomainCommand = CommandOf<'ApplyCondition'> | CommandOf<'RecordDeath'>;

/** Derive the owner evidence for one journal receipt from its replayed events and frozen binding. */
export function deriveCombatReceiptDomainEvidence(
  root: MaterializedCompanyState,
  journal: CombatReceiptJournal,
  receiptIndex: number,
  scope: Pick<EconomyContext, 'canonicalRevision' | 'atTick' | 'companyId' | 'worldId'>,
): {
  readonly physicalFacts: readonly PhysicalEvidence[];
  readonly financeFacts: readonly FinanceEvidence[];
} {
  const validated = validateCombatReceiptJournal(journal);
  requirePhysical(
    scope.companyId === validated.companyId &&
      scope.worldId === validated.binding.worldId &&
      scope.companyId === root.lifecycle.companyId &&
      scope.worldId === root.lifecycle.worldId &&
      canonicalRevision(scope.canonicalRevision) === scope.canonicalRevision,
    'INVALID_SOURCE',
  );
  const receipt = validated.receipts[receiptIndex];
  requirePhysical(receipt && receiptIndex > 0, 'INVALID_SOURCE');
  const participantByUnit = new Map(
    validated.binding.participants
      .filter((participant) => participant.companyId === validated.companyId)
      .map((participant) => [participant.unitId, participant.projection.characterId]),
  );
  const physicalFacts: PhysicalEvidence[] = [];
  const financeFacts: FinanceEvidence[] = [];
  for (let ordinal = 0; ordinal < receipt.transition.events.length; ordinal += 1) {
    const event = receipt.transition.events[ordinal]!;
    const characterId = eventCharacterId(event, participantByUnit);
    if (!characterId) continue;
    const sourceEventId = receipt.sourceEventIds[ordinal];
    requirePhysical(sourceEventId, 'INVALID_STATE');
    const evidenceId = `${sourceEventId}:terminal-consequence`;
    if (event.type === 'unit.wounded') {
      const definition = conditionForSeverity(event.severity);
      physicalFacts.push({
        id: evidenceId,
        companyId: scope.companyId,
        worldId: scope.worldId,
        revision: scope.canonicalRevision,
        sourceEventId,
        atTick: scope.atTick,
        ordinal,
        version: PHYSICAL_POLICY_VERSION,
        kind: 'CONDITION_SOURCE',
        characterId,
        definitionId: definition.id,
        causeId: sourceEventId,
        onsetTick: scope.atTick,
      });
    } else if (event.type === 'unit.died') {
      const custodyOutcomeId = `${evidenceId}:custody`;
      const causeId = sourceEventId;
      physicalFacts.push({
        id: custodyOutcomeId,
        companyId: scope.companyId,
        worldId: scope.worldId,
        revision: scope.canonicalRevision,
        sourceEventId,
        atTick: scope.atTick,
        ordinal,
        version: PHYSICAL_POLICY_VERSION,
        kind: 'DEATH_OUTCOME',
        characterId,
        actualDeathTick: scope.atTick,
        causeId,
        location: validated.binding.location,
        corpseContainerId: `${evidenceId}:corpse`,
      });
      financeFacts.push({
        id: `${evidenceId}:finance`,
        companyId: scope.companyId,
        worldId: scope.worldId,
        revision: scope.canonicalRevision,
        sourceEventId,
        atTick: scope.atTick,
        kind: 'FINANCIAL_DEATH',
        characterId,
        actualDeathTick: scope.atTick,
        recipient: { kind: 'ESTATE', id: characterId },
        causeId,
        custodyOutcomeId,
      });
    }
  }
  return {
    physicalFacts: Object.freeze(physicalFacts),
    financeFacts: Object.freeze(financeFacts),
  };
}

/** Reuse G08's event-to-owner command derivation for one verified ordinal only. */
export function deriveCombatReceiptDomainCommands(
  journal: CombatReceiptJournal,
  receiptIndex: number,
  context: EconomyContext,
): readonly CombatReceiptDomainCommand[] {
  const validated = validateCombatReceiptJournal(journal);
  const receipt = validated.receipts[receiptIndex];
  requirePhysical(receipt && receiptIndex > 0, 'INVALID_SOURCE');
  requirePhysical(
    context.companyId === validated.companyId &&
      context.worldId === validated.binding.worldId &&
      canonicalRevision(context.canonicalRevision) === context.canonicalRevision,
    'INVALID_SOURCE',
  );
  const participantByUnit = new Map(
    validated.binding.participants
      .filter((participant) => participant.companyId === validated.companyId)
      .map((participant) => [participant.unitId, participant.projection.characterId]),
  );
  const effects: CombatReceiptDomainCommand[] = [];
  for (let ordinal = 0; ordinal < receipt.transition.events.length; ordinal += 1) {
    const event = receipt.transition.events[ordinal]!;
    const characterId = eventCharacterId(event, participantByUnit);
    if (!characterId) continue;
    const sourceEventId = receipt.sourceEventIds[ordinal];
    requirePhysical(sourceEventId !== undefined, 'INVALID_STATE');
    if (event.type === 'unit.wounded') {
      const fact = oneFact(
        (context.physicalFacts ?? []).filter(
          (entry): entry is Extract<PhysicalEvidence, { kind: 'CONDITION_SOURCE' }> =>
            entry.kind === 'CONDITION_SOURCE' && entry.sourceEventId === sourceEventId,
        ),
      );
      validatePhysicalScope(fact, context, ordinal, sourceEventId);
      const definition = conditionForSeverity(event.severity);
      requirePhysical(
        fact.characterId === characterId && fact.definitionId === definition.id,
        'INVALID_SOURCE',
      );
      effects.push({
        schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
        commandId: sourceEventId,
        worldId: context.worldId,
        companyId: context.companyId,
        actorRef: { kind: 'DOMAIN_RECEIPT', id: fact.id },
        expectedRevision: context.canonicalRevision,
        campaignTick: context.atTick,
        rulesetId: COMPANY_RULESET_ID,
        sourceEventId,
        type: 'ApplyCondition',
        payload: {
          receiptId: fact.id,
          characterId,
          conditionDefinitionId: definition.id,
          causeId: fact.causeId,
          ...(fact.deadlineTick === undefined ? {} : { deadlineTick: fact.deadlineTick }),
        },
      });
    } else if (event.type === 'unit.died') {
      const physicalFact = oneFact(
        (context.physicalFacts ?? []).filter(
          (entry): entry is DeathOutcomeEvidence =>
            entry.kind === 'DEATH_OUTCOME' && entry.sourceEventId === sourceEventId,
        ),
      );
      const financeFact = oneFact(
        context.financeFacts.filter(
          (entry): entry is FinancialDeathEvidence =>
            entry.kind === 'FINANCIAL_DEATH' && entry.sourceEventId === sourceEventId,
        ),
      );
      validatePhysicalScope(physicalFact, context, ordinal, sourceEventId);
      validateFinanceScope(financeFact, context, sourceEventId);
      requirePhysical(
        physicalFact.characterId === characterId &&
          financeFact.characterId === characterId &&
          physicalFact.actualDeathTick === context.atTick &&
          financeFact.actualDeathTick === context.atTick &&
          physicalFact.causeId === financeFact.causeId &&
          physicalFact.id === financeFact.custodyOutcomeId &&
          canonicalJson(physicalFact.location) === canonicalJson(validated.binding.location),
        'INVALID_SOURCE',
      );
      effects.push({
        schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
        commandId: sourceEventId,
        worldId: context.worldId,
        companyId: context.companyId,
        actorRef: { kind: 'OUTCOME_RECEIPT', id: financeFact.id },
        expectedRevision: context.canonicalRevision,
        campaignTick: context.atTick,
        rulesetId: COMPANY_RULESET_ID,
        sourceEventId,
        type: 'RecordDeath',
        payload: {
          receiptId: financeFact.id,
          characterId,
          actualDeathTick: financeFact.actualDeathTick,
          causeId: financeFact.causeId,
          custodyOutcomeId: financeFact.custodyOutcomeId,
        },
      });
    }
  }
  return Object.freeze(effects);
}

function applyKernelDeath(
  root: MaterializedCompanyState,
  context: EconomyContext,
  eventCharacter: string,
  ordinal: number,
  sourceEventId: string,
  bindingLocation: CombatReceiptJournal['binding']['location'],
): {
  readonly root: MaterializedCompanyState;
  readonly requirements: readonly EconomyRequirement[];
} {
  const physicalFacts = (context.physicalFacts ?? []).filter(
    (fact): fact is DeathOutcomeEvidence =>
      fact.kind === 'DEATH_OUTCOME' && fact.sourceEventId === sourceEventId,
  );
  const financeFacts = context.financeFacts.filter(
    (fact): fact is FinancialDeathEvidence =>
      fact.kind === 'FINANCIAL_DEATH' && fact.sourceEventId === sourceEventId,
  );
  const physicalFact = oneFact(physicalFacts);
  const financeFact = oneFact(financeFacts);
  validatePhysicalScope(physicalFact, context, ordinal, sourceEventId);
  validateFinanceScope(financeFact, context, sourceEventId);
  requirePhysical(
    physicalFact.characterId === eventCharacter &&
      financeFact.characterId === eventCharacter &&
      physicalFact.actualDeathTick === context.atTick &&
      financeFact.actualDeathTick === context.atTick &&
      physicalFact.causeId === financeFact.causeId &&
      physicalFact.id === financeFact.custodyOutcomeId &&
      canonicalJson(physicalFact.location) === canonicalJson(bindingLocation),
    'INVALID_SOURCE',
  );

  const deathCommand: CommandOf<'RecordDeath'> = {
    schemaVersion: COMPANY_COMMAND_SCHEMA_VERSION,
    commandId: sourceEventId,
    worldId: context.worldId,
    companyId: context.companyId,
    actorRef: { kind: 'OUTCOME_RECEIPT', id: financeFact.id },
    expectedRevision: context.canonicalRevision,
    campaignTick: context.atTick,
    rulesetId: COMPANY_RULESET_ID,
    sourceEventId,
    type: 'RecordDeath',
    payload: {
      receiptId: financeFact.id,
      characterId: eventCharacter,
      actualDeathTick: financeFact.actualDeathTick,
      causeId: financeFact.causeId,
      custodyOutcomeId: financeFact.custodyOutcomeId,
    },
  };
  const finance = recordFinancialDeath(root, deathCommand, context);
  const matchingOutcome = finance.requirements.filter(
    (requirement) =>
      requirement.kind === 'OUTCOME_APPLICATION' &&
      requirement.characterId === eventCharacter &&
      requirement.actualDeathTick === financeFact.actualDeathTick &&
      requirement.sourceEventId === sourceEventId &&
      requirement.custodyOutcomeId === financeFact.custodyOutcomeId,
  );
  requirePhysical(matchingOutcome.length === 1, 'INVALID_STATE');
  const remainingRequirements = finance.requirements.filter(
    (requirement) => !matchingOutcome.includes(requirement),
  );
  const death = applyDeath(
    { ...root, finance: finance.finance },
    {
      characterId: eventCharacter,
      actualDeathTick: financeFact.actualDeathTick,
      causeId: financeFact.causeId,
      custodyOutcomeId: financeFact.custodyOutcomeId,
      sourceEventId,
    },
    context,
  );
  return {
    root: { lifecycle: death.lifecycle, finance: death.finance, physical: death.physical },
    requirements: remainingRequirements,
  };
}

/** Bridges one verified G07 candidate and its authentic G06 history into existing physical/finance owners. */
export function prepareCombatConsequences(
  initialRoot: MaterializedCompanyState,
  physicalCandidate: PreparedCombatPhysicalEffects,
  journal: CombatReceiptJournal,
  context: EconomyContext,
): PreparedCombatConsequences {
  const validatedJournal = validateCombatReceiptJournal(journal);
  const verifiedCandidate = prepareCombatPhysicalEffects(initialRoot, validatedJournal);
  requirePhysical(
    canonicalJson(physicalCandidate) === canonicalJson(verifiedCandidate),
    'INVALID_SOURCE',
  );
  const binding = validatedJournal.binding;
  requirePhysical(
    context.companyId === validatedJournal.companyId &&
      context.worldId === binding.worldId &&
      context.canonicalRevision === initialRoot.lifecycle.revision &&
      context.atTick === binding.atTick &&
      initialRoot.lifecycle.companyId === validatedJournal.companyId &&
      initialRoot.lifecycle.worldId === binding.worldId &&
      initialRoot.lifecycle.campaignTick === binding.atTick,
    'INVALID_SOURCE',
  );

  const participantByUnit = new Map(
    binding.participants
      .filter((participant) => participant.companyId === validatedJournal.companyId)
      .map((participant) => [participant.unitId, participant.projection.characterId]),
  );
  let root = verifiedCandidate.root;
  const requirements: EconomyRequirement[] = [];
  for (const receipt of validatedJournal.receipts) {
    for (let ordinal = 0; ordinal < receipt.transition.events.length; ordinal += 1) {
      const event = receipt.transition.events[ordinal]!;
      const characterId = eventCharacterId(event, participantByUnit);
      if (!characterId) continue;
      const sourceEventId = receipt.sourceEventIds[ordinal];
      requirePhysical(sourceEventId !== undefined, 'INVALID_STATE');
      if (event.type === 'unit.wounded')
        root = applyKernelWound(root, context, event, characterId, ordinal, sourceEventId);
      else if (event.type === 'unit.died') {
        const outcome = applyKernelDeath(
          root,
          context,
          characterId,
          ordinal,
          sourceEventId,
          binding.location,
        );
        root = outcome.root;
        requirements.push(...outcome.requirements);
      }
    }
  }
  validatePhysicalState(root);
  validateEconomy(root, context);
  return Object.freeze({ ...verifiedCandidate, root, requirements: Object.freeze(requirements) });
}
