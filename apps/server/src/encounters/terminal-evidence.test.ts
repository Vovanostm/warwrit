import * as combat from '@warwrit/game-core';
import { createCompanyCombatAggregateFixture } from '@warwrit/testkit';
import { describe, expect, it } from 'vitest';

import { prepareFirstHuntTerminalEvidence } from './terminal-evidence.js';
import type { TerminalCommandRow } from './terminal-evidence.js';

function resolvedBattle(
  killLeader = false,
  retreatVersion?: 3 | 4,
  leaderHealth = 100,
  reactionGain = false,
) {
  let fixture = createCompanyCombatAggregateFixture(false, killLeader ? leaderHealth : 10_000);
  if (retreatVersion) {
    const evidence = {
      ...fixture.f.evidence,
      setup: {
        ...fixture.f.evidence.setup,
        rulesetId:
          retreatVersion === 4
            ? combat.M1_DOMAIN_BRIDGE_V4_RULESET_ID
            : combat.M1_DOMAIN_BRIDGE_V3_RULESET_ID,
      },
    };
    const begun = combat.prepareBeginCombatAggregate(
      fixture.state,
      fixture.f.sources,
      fixture.f.request,
      evidence,
    );
    if (begun.kind !== 'PREPARED') throw new Error('Retreat fixture admission failed');
    fixture = { ...fixture, begun };
  }
  if (reactionGain) {
    const source = fixture.f.sources[0]!;
    const root = {
      ...source.root,
      lifecycle: {
        ...source.root.lifecycle,
        characters: source.root.lifecycle.characters.map((person) =>
          person.identity.characterId === 'a-worker-0'
            ? {
                ...person,
                skills: {
                  ...person.skills,
                  blades: {
                    ...combat.initialSkillProgress(0, 'terminal-near-level'),
                    amount: { milliXp: '9999', carry: '0' },
                  },
                },
              }
            : person,
        ),
      },
    };
    const sources = [{ ...source, root }, fixture.f.sources[1]!];
    const positions = [
      [
        { q: -1, r: 0 },
        { q: 0, r: -1 },
        { q: 0, r: 1 },
      ],
      [
        { q: 0, r: 0 },
        { q: 1, r: -1 },
        { q: 1, r: 0 },
      ],
    ];
    const evidence = {
      ...fixture.f.evidence,
      setup: { ...fixture.f.evidence.setup, rulesetId: combat.M1_DOMAIN_BRIDGE_V4_RULESET_ID },
      parties: fixture.f.evidence.parties.map((party, index) => ({
        ...party,
        members: party.members.map((member, ordinal) => ({
          ...member,
          position: positions[index]![ordinal]!,
        })),
      })),
    };
    const begun = combat.prepareBeginCombatAggregate(
      { ...fixture.state, economy: root },
      sources,
      fixture.f.request,
      evidence,
    );
    if (begun.kind !== 'PREPARED') throw new Error(begun.error);
    fixture = { ...fixture, begun };
  }
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
    if (retreatVersion) {
      const base = {
        commandId: combat.commandId(`retreat-proof-${state.revision}`),
        activationId: state.activation!.id,
        actorId: actor.id,
      };
      const exits = state.sides.find((side) => side.id === actor.sideId)!.retreatHexes;
      const onExit = exits.some((exit) => coreHexEqual(exit, actor.position));
      const freeExit = exits.find(
        (exit) =>
          !state.units.some(
            (unit) => unit.status === 'active' && coreHexEqual(unit.position, exit),
          ),
      );
      command =
        actor.sideId === 'a-side' || (!freeExit && !onExit)
          ? { ...base, type: 'wait' }
          : onExit
            ? { ...base, type: 'retreat' }
            : { ...base, type: 'move', to: freeExit! };
    }
    if (reactionGain) {
      const base = {
        commandId: combat.commandId(`terminal-reaction-${index}`),
        activationId: state.activation!.id,
        actorId: actor.id,
      };
      command =
        index === 1
          ? { ...base, type: 'attack', targetId: combat.unitId('b-leader-unit') }
          : index === 4
            ? { ...base, type: 'move', to: { q: -2, r: 0 } }
            : index < 4 || actor.sideId === 'b-side'
              ? { ...base, type: 'wait' }
              : combat.chooseTacticalCombatCommand(state);
    }
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

function terminalInput(
  killLeader = false,
  retreatVersion?: 3 | 4,
  leaderHealth = 100,
  reactionGain = false,
) {
  const battle = resolvedBattle(killLeader, retreatVersion, leaderHealth, reactionGain);
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

  it('settles supported reactions after preceding level gain and retries without double practice', () => {
    const { battle, input } = terminalInput(false, undefined, 100, true);
    expect(battle.state.outcome?.winnerSideId).toBe('a-side');
    expect(
      battle.state.units
        .filter((unit) => unit.sideId === 'b-side')
        .every((unit) => unit.status === 'dead'),
    ).toBe(true);
    const before = combat.canonicalStateJson(input.previous);
    const prepared = prepareFirstHuntTerminalEvidence(input);
    expect(prepared.status).toBe('READY');
    if (prepared.status !== 'READY') throw new Error(prepared.residuals.join(','));
    const ordinary = prepared.consume.applications[2]!.practiceCredits.find(
      (credit) => credit.command.payload.characterId === 'a-worker-0',
    );
    const reaction = prepared.consume.applications[5]!.practiceCredits.find(
      (credit) => credit.command.payload.characterId === 'a-worker-0',
    );
    expect(ordinary?.context.practiceFacts?.[0]?.levelAtStart).toBe(0);
    expect(reaction?.context.practiceFacts?.[0]?.levelAtStart).toBe(2);
    const consumed = combat.prepareConsumeCombatAggregate(input.previous, prepared.consume);
    if (consumed.kind !== 'PREPARED') throw new Error(consumed.error);
    const replayed = combat.prepareConsumeCombatAggregate(consumed.next, prepared.consume);
    expect(replayed.kind).toBe('PREPARED');
    if (replayed.kind !== 'PREPARED') throw new Error(replayed.error);
    expect(replayed.replayed).toBe(true);
    expect(replayed.next).toEqual(consumed.next);
    const finalized = combat.prepareFinalizeCombatAggregate(consumed.next, prepared.finalize);
    if (finalized.kind !== 'PREPARED') throw new Error(finalized.error);
    const retry = combat.prepareFinalizeCombatAggregate(finalized.next, prepared.finalize);
    expect(retry.kind).toBe('PREPARED');
    if (retry.kind !== 'PREPARED') throw new Error(retry.error);
    expect(retry.replayed).toBe(true);
    expect(retry.next).toEqual(finalized.next);
    expect(finalized.next.encounter.active).toBeNull();
    expect(finalized.next.encounter.completed).toHaveLength(1);
    expect(combat.canonicalStateJson(input.previous)).toBe(before);
  }, 15_000);

  it('fails closed when persisted receipt evidence is incomplete', () => {
    const { input } = terminalInput();
    const prepared = prepareFirstHuntTerminalEvidence({
      ...input,
      commandRows: input.commandRows.slice(1),
    });
    expect(prepared).toEqual({ status: 'NOT_READY', residuals: ['ENCOUNTER_REPLAY_INVALID'] });
  });

  it('ends a company through the existing resolver after its party dies without a successor', () => {
    // The source fixture supplies one HP before admission; every death and receipt is replayed.
    const { battle, input } = terminalInput(true, undefined, 1);
    const leader = input.previous.encounter.active!.binding.participants.find(
      (participant) => participant.projection.characterId === 'a-leader',
    )!;
    expect(battle.state.units.find((unit) => unit.id === leader.unitId)?.health).toBe(0);
    const before = combat.canonicalStateJson(input.previous);
    expect(
      battle.state.units
        .filter((unit) => unit.sideId === leader.sideId)
        .every((unit) => unit.health === 0),
    ).toBe(true);
    const prepared = prepareFirstHuntTerminalEvidence(input);
    expect(prepared.status).toBe('READY');
    if (prepared.status !== 'READY') throw new Error(prepared.residuals.join(','));
    expect(prepared.finalize.leadership?.command).toMatchObject({
      type: 'ResolveLeadership',
      actorRef: { kind: 'SYSTEM', id: 'encounter-runtime' },
      payload: { mode: 'ACTING' },
    });
    expect(prepared.finalize.leadership?.context.facts).toContainEqual(
      expect.objectContaining({ kind: 'CRISIS', leaderId: 'a-leader', reason: 'LEADER_DIED' }),
    );
    expect(prepared.finalState.economy.lifecycle.company?.runStatus).toBe('GAME_OVER');
    expect(prepared.finalState.encounter.active).toBeNull();
    expect(prepared.finalState.encounter.completed).toHaveLength(1);
    expect(combat.readCompanyCombatAggregateState(prepared.finalState)).toEqual(
      prepared.finalState,
    );
    expect(combat.canonicalStateJson(input.previous)).toBe(before);
  }, 15_000);

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

function coreHexEqual(a: { q: number; r: number }, b: { q: number; r: number }): boolean {
  return a.q === b.q && a.r === b.r;
}

it('preserves historical retreat settlement but leaves new tactical hostile retreat pending', () => {
  for (const version of [3, 4] as const) {
    const { battle, input } = terminalInput(false, version);
    expect(
      battle.state.units
        .filter((unit) => unit.sideId === 'b-side')
        .every((unit) => unit.status === 'retreated'),
    ).toBe(true);
    const result = prepareFirstHuntTerminalEvidence(input);
    if (version === 3) expect(result.status, JSON.stringify(result)).toBe('READY');
    else
      expect(result).toEqual({
        status: 'NOT_READY',
        residuals: ['TERMINAL_DISPOSITION_EVIDENCE_MISSING'],
      });
  }
}, 15_000);
