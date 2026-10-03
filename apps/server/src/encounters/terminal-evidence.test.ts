import * as combat from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { describe, expect, it } from 'vitest';

import { prepareFirstHuntTerminalEvidence } from './terminal-evidence.js';
import type { TerminalCommandRow } from './terminal-evidence.js';

function resolvedBattle(killLeader = false) {
  const fixture = createCompanyCombatAggregateFixture(false, killLeader ? 100 : 10_000);
  const companyId = fixture.f.root.lifecycle.companyId;
  const leaderId =
    fixture.f.root.lifecycle.company?.actingLeaderId ??
    fixture.f.root.lifecycle.company?.currentLeaderId;
  const leaderUnit = fixture.begun.binding.participants.find(
    (participant) =>
      participant.companyId === companyId && participant.projection.characterId === leaderId,
  );
  if (!leaderUnit) throw new Error('Expected the bound company leader');
  let state = structuredClone(fixture.begun.binding.initial.state);
  const commandRows: TerminalCommandRow[] = [];

  for (let index = 0; state.status === 'active' && index < 500; index += 1) {
    const actor = state.units.find((unit) => unit.id === state.activation?.unitId);
    if (!actor) throw new Error('Expected an active combat actor');
    const leaderState = state.units.find((unit) => unit.id === leaderUnit.unitId);
    const leaderCanBeTargeted = leaderState?.health !== 0 && leaderState?.status === 'active';
    let command =
      killLeader && leaderCanBeTargeted && actor.sideId === 'a-side'
        ? {
            type: 'wait' as const,
            commandId: combat.commandId(`terminal-leader-wait-${state.revision}`),
            activationId: state.activation!.id,
            actorId: actor.id,
          }
        : killLeader && leaderCanBeTargeted && actor.sideId === 'b-side'
          ? {
              type: 'attack' as const,
              commandId: combat.commandId(`terminal-leader-attack-${state.revision}`),
              activationId: state.activation!.id,
              actorId: actor.id,
              targetId: leaderUnit.unitId,
            }
          : combat.chooseAiCommand(
              state,
              killLeader && !leaderCanBeTargeted
                ? actor.sideId === 'b-side'
                  ? 'survivor'
                  : 'aggressive'
                : 'aggressive',
            );
    let transition = combat.applyCombatCommand(state, command);
    if (!transition.ok && command.type === 'attack') {
      const target = state.units.find((unit) => unit.id === leaderUnit.unitId)!;
      const occupied = new Set(state.units.map(({ position }) => `${position.q},${position.r}`));
      const distance = (left: { q: number; r: number }, right: { q: number; r: number }) =>
        (Math.abs(left.q - right.q) +
          Math.abs(left.r - right.r) +
          Math.abs(left.q + left.r - right.q - right.r)) /
        2;
      const destination = state.map.hexes.find(
        (hex) =>
          !occupied.has(`${hex.q},${hex.r}`) &&
          distance(hex, actor.position) < distance(target.position, actor.position) &&
          distance(hex, target.position) < distance(actor.position, target.position),
      );
      command = destination
        ? {
            type: 'move',
            commandId: combat.commandId(`terminal-leader-move-${state.revision}`),
            activationId: state.activation!.id,
            actorId: actor.id,
            to: destination,
          }
        : {
            type: 'wait',
            commandId: combat.commandId(`terminal-leader-wait-${state.revision}`),
            activationId: state.activation!.id,
            actorId: actor.id,
          };
      transition = combat.applyCombatCommand(state, command);
    }
    if (!transition.ok) {
      command = {
        type: 'wait',
        commandId: combat.commandId(`terminal-leader-wait-${state.revision}`),
        activationId: state.activation!.id,
        actorId: actor.id,
      };
      transition = combat.applyCombatCommand(state, command);
    }
    if (!transition.ok) throw new Error(transition.error.message);
    state = transition.state;
    commandRows.push({ revision: state.revision, campaign_tick: '1001', command });
  }
  if (state.status !== 'resolved') throw new Error('Combat fixture did not resolve');
  return { fixture, state, commandRows };
}

function terminalInput(killLeader = false) {
  const battle = resolvedBattle(killLeader);
  const active = battle.fixture.begun.binding;
  const companyId = battle.fixture.f.root.lifecycle.companyId;
  const partyId = active.participants.find(
    (participant) => participant.companyId === companyId,
  )!.partyId;
  const physical = battle.fixture.begun.next.economy.physical!;
  const ration = physical.items.find((item) => item.definitionId === 'ration');
  if (!ration) throw new Error('Expected fixture ration stock');
  const containerId =
    'terminal-evidence-party-food' as (typeof physical.containers)[number]['containerId'];
  const foodContainer = {
    containerId,
    kind: 'PARTY_SUPPLY' as const,
    location: active.location,
    custodian: { kind: 'COMPANY' as const, id: companyId },
    carrier: { kind: 'PARTY' as const, id: partyId },
    capacityG: 30_000,
    access: 'COMPANY' as const,
    closed: null,
  };
  const foodItem = {
    ...ration,
    itemId: 'terminal-evidence-ration' as typeof ration.itemId,
    containerId,
    quantity: 10,
    provenance: { ...ration.provenance, sourceId: 'terminal-evidence-ration-source' },
  };
  const preparedPrevious = combat.readCompanyCombatAggregateState({
    ...structuredClone(battle.fixture.begun.next),
    economy: {
      ...structuredClone(battle.fixture.begun.next.economy),
      physical: {
        ...structuredClone(physical),
        containers: [...physical.containers, foodContainer],
        items: [...physical.items, foodItem],
        knowledge: {
          ...physical.knowledge,
          containerSnapshots: [...physical.knowledge.containerSnapshots, foodContainer],
          itemSnapshots: [...physical.knowledge.itemSnapshots, foodItem],
        },
      },
    },
  });
  return {
    battle,
    input: {
      worldId: active.worldId,
      encounterId: active.setup.battleId,
      terminalRevision: battle.state.revision,
      companyId,
      previous: preparedPrevious,
      contractProfileId: combat.FIRST_HUNT_PROFILE_ID,
      contractTermsDigest: 'a'.repeat(64),
      stored: {
        state: battle.state,
        revision: battle.state.revision,
        status: 'resolved' as const,
      },
      commandRows: battle.commandRows,
    },
  };
}

describe('FIRST HUNT terminal evidence composition', () => {
  it('produces READY from a resolved bound combat and receipts at a later food-backed tick', () => {
    const { battle, input } = terminalInput();
    const active = input.previous.encounter.active!;
    const leaderId =
      input.previous.economy.lifecycle.company?.actingLeaderId ??
      input.previous.economy.lifecycle.company?.currentLeaderId;
    const leaderUnit = active.binding.participants.find(
      (participant) =>
        participant.companyId === input.companyId &&
        participant.projection.characterId === leaderId,
    );
    expect(leaderUnit).toBeDefined();
    expect(
      battle.state.units.find((unit) => unit.id === leaderUnit?.unitId)?.health,
    ).toBeGreaterThan(0);

    const prepared = prepareFirstHuntTerminalEvidence(input);
    expect(prepared.status, JSON.stringify(prepared)).toBe('READY');
    if (prepared.status !== 'READY') return;
    expect(prepared.consume.applications[1]?.time.atTick).toBe('1001');
    expect(prepared.consume.applications[1]?.advance?.command.type).toBe('AdvanceCampaign');
    expect(
      prepared.consume.applications[1]?.advance?.context.physicalFacts?.some(
        (fact) => fact.kind === 'FOOD_FULFILLMENT',
      ),
    ).toBe(true);
    expect(prepared.finalStateDigest).toMatch(/^[0-9a-f]{64}$/u);
  }, 15_000);

  it('fails closed when persisted receipt evidence is incomplete', () => {
    const { input } = terminalInput();
    const prepared = prepareFirstHuntTerminalEvidence({
      ...input,
      commandRows: input.commandRows.slice(1),
    });
    expect(prepared).toEqual({ status: 'NOT_READY', residuals: ['ENCOUNTER_REPLAY_INVALID'] });
  });

  // NOT_RUN: the generic fixture needs a long target-combat simulation to force a durable death.
  // Keep the intended residual assertion visible until a small authentic V2 fixture is available.
  it.skip('leaves leadership unresolved when the bound leader dies', () => {
    const { battle, input } = terminalInput(true);
    const leaderId =
      input.previous.economy.lifecycle.company?.actingLeaderId ??
      input.previous.economy.lifecycle.company?.currentLeaderId;
    const leaderUnit = input.previous.encounter.active?.binding.participants.find(
      (participant) =>
        participant.companyId === input.companyId &&
        participant.projection.characterId === leaderId,
    );
    expect(leaderUnit).toBeDefined();
    expect(battle.state.units.find((unit) => unit.id === leaderUnit?.unitId)?.health).toBe(0);

    expect(prepareFirstHuntTerminalEvidence(input)).toEqual({
      status: 'NOT_READY',
      residuals: ['LEADERSHIP_SUCCESSION_EVIDENCE_MISSING'],
    });
  });
});
