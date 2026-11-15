import { expect, it } from 'vitest';
import * as combat from '@warwrit/game-core';
import type {
  CombatOwnerContext,
  CombatReceiptApplication,
  CompanyCombatAggregateState,
} from '@warwrit/game-core';
import { accept, combatContext, fixture } from './company-combat-aggregate-fixture.js';
import { command, context } from './company-economy-fixture.js';

it('finalizes verified V6 surrender with living members, dropped gear and an exact retry', () => {
  const original = fixture();
  const own = original.sources[0]!;
  const root = {
    ...own.root,
    physical: {
      ...own.root.physical,
      vitals: own.root.physical.vitals.map((vitals) => ({ ...vitals, morale: 0 })),
    },
  };
  const sources = [{ ...own, root }, original.sources[1]!];
  const evidence: combat.EncounterPositionEvidence = {
    ...original.evidence,
    setup: {
      ...original.evidence.setup,
      schemaVersion: 3,
      rulesetId: combat.M1_DOMAIN_BRIDGE_V6_RULESET_ID,
      map: {
        ...original.evidence.setup.map,
        blocked: [
          { q: -2, r: 1 },
          { q: -1, r: 1 },
        ],
      },
      sides: original.evidence.setup.sides.map((side) =>
        side.id === 'a-side' ? { ...side, retreatHexes: [{ q: -2, r: 2 }] } : side,
      ),
    },
    parties: original.evidence.parties.map((party) =>
      party.sideId === 'a-side'
        ? {
            ...party,
            members: party.members.map((member, index) =>
              index === 2 ? { ...member, position: { q: 0, r: 1 } } : member,
            ),
          }
        : party,
    ),
  };
  const binding = combat.prepareEncounterBinding(sources, original.request, evidence);
  const f = {
    ...original,
    sources,
    root,
    evidence,
    binding,
    journal: combat.createCombatReceiptJournal(binding, root.lifecycle.companyId),
  };
  let journal = accept(f, f.journal, binding.initial, null);
  for (let step = 0; step < 20; step += 1) {
    const state = journal.receipts.at(-1)!.transition.state;
    if (state.status === 'resolved') break;
    const activation = state.activation!;
    const actor = state.units.find((unit) => unit.id === activation.unitId)!;
    const kernelCommand: combat.CombatCommand = {
      type: actor.sideId === 'a-side' ? 'surrender' : 'wait',
      commandId: combat.commandId(`surrender-${step}`),
      actorId: actor.id,
      activationId: activation.id,
    };
    const result = combat.applyCombatCommand(state, kernelCommand);
    if (!result.ok) throw new Error(result.error.message);
    journal = accept(f, journal, { state: result.state, events: result.events }, kernelCommand);
  }
  const final = journal.receipts.at(-1)!.transition.state;
  expect(final.status).toBe('resolved');
  expect(final.units.filter((unit) => unit.sideId === 'a-side').map((unit) => unit.status)).toEqual(
    ['surrendered', 'surrendered', 'surrendered'],
  );
  const state: CompanyCombatAggregateState = {
    economy: root,
    learning: combat.createCompanyLearningState(),
    social: combat.createSocialState(),
    encounter: combat.createCombatEncounterApplication(),
  };
  const begun = combat.prepareBeginCombatAggregate(state, sources, f.request, evidence);
  if (begun.kind !== 'PREPARED') throw new Error(begun.error);
  const applications: CombatReceiptApplication[] = journal.receipts.map((receipt) => ({
    time: {
      version: combat.COMBAT_RECEIPT_TIME_VERSION,
      id: `surrender-time-${receipt.transition.state.revision}`,
      sourceEventId: receipt.request.sourceEventId!,
      battleId: binding.setup.battleId,
      receiptId: receipt.request.payload.receiptId,
      revision: receipt.transition.state.revision,
      atTick: root.lifecycle.campaignTick,
    },
    context: combatContext(f, { financeFacts: [], physicalFacts: [] }) as CombatOwnerContext,
    learning: { intervals: [] },
    practiceCredits: [],
  }));
  const consumed = combat.prepareConsumeCombatAggregate(begun.next, {
    journal,
    applications,
    practiceProfile: {
      version: combat.COMBAT_PRACTICE_PROFILE_VERSION,
      profileId: 'surrender-practice',
      bindingId: binding.bindingId,
      challengeLevel: 0,
      actionStarts: [],
      leadershipCycles: [],
    },
  });
  if (consumed.kind !== 'PREPARED') throw new Error(consumed.error);
  const terminalCommand = command(
    consumed.next.economy,
    'FinalizeEncounter',
    {
      bindingId: binding.bindingId,
      terminalReceiptId: journal.receipts.at(-1)!.request.payload.receiptId,
      finalStateDigest: 'surrender-state',
      outcomeReceiptId: 'surrender-outcome',
    },
    'surrender-finalize',
    'COMBAT_RECEIPT',
  );
  const input: combat.FinalizeCombatAggregateInput = {
    command: terminalCommand,
    journal,
    applications,
    terminal: {
      version: 's02-combat-terminal-outcome-1',
      id: 'surrender-state',
      sourceEventId: terminalCommand.sourceEventId,
      bindingId: binding.bindingId,
      battleId: binding.setup.battleId,
      receiptId: journal.receipts.at(-1)!.request.payload.receiptId,
      revision: final.revision,
      atTick: root.lifecycle.campaignTick,
      finalStateCanonical: combat.canonicalCombatState(final),
      outcomeDigest: 'surrender-outcome',
      dispositions: binding.participants
        .filter((p) => p.companyId === root.lifecycle.companyId)
        .map((p) => ({
          id: `surrender-disposition-${p.unitId}`,
          sourceEventId: terminalCommand.sourceEventId,
          unitId: p.unitId,
          characterId: p.projection.characterId,
          status: 'PRESENT',
          location: binding.location,
        })),
    },
    context: context(consumed.next.economy, terminalCommand) as CombatOwnerContext,
  };
  const finalized = combat.prepareFinalizeCombatAggregate(consumed.next, input);
  if (finalized.kind !== 'PREPARED') throw new Error(finalized.error);
  expect(finalized.next.encounter.active).toBeNull();
  const physical = finalized.next.economy.physical!;
  const bundles = physical.containers.filter((container) => container.kind === 'GROUND_BUNDLE');
  expect(bundles).toHaveLength(3);
  expect(bundles.every((container) => container.custodian.kind === 'WORLD')).toBe(true);
  const bundleIds = new Set(bundles.map((container) => container.containerId));
  const dropped = physical.items.filter(
    (item) => item.containerId && bundleIds.has(item.containerId),
  );
  expect(dropped).toHaveLength(12);
  expect(dropped.every((item) => item.equipped === null)).toBe(true);
  expect(physical.items.map((item) => item.itemId).toSorted()).toEqual(
    root.physical.items.map((item) => item.itemId).toSorted(),
  );
  for (const before of root.lifecycle.characters) {
    const after = finalized.next.economy.lifecycle.characters.find(
      (character) => character.identity.characterId === before.identity.characterId,
    )!;
    expect(after.presence).toEqual(before.presence);
  }
  expect(combat.readCompanyCombatAggregateState(finalized.next)).toEqual(finalized.next);
  const retry = combat.prepareFinalizeCombatAggregate(finalized.next, input);
  expect(retry.kind).toBe('PREPARED');
  if (retry.kind === 'PREPARED') {
    expect(retry.replayed).toBe(true);
    expect(retry.next).toBe(finalized.next);
  }
});
