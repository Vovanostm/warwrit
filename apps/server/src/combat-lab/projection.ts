import * as combat from '@warwrit/game-core';
import {
  COMBAT_LAB_EVENT_LIMIT,
  COMBAT_LAB_SCENARIO,
  COMBAT_LAB_VERSION,
  type CombatLabHex,
  type CombatLabView,
} from '@warwrit/protocol';

const copyHex = ({ q, r }: CombatLabHex): CombatLabHex => ({ q, r });
const pool = (current: number, maximum: number) => ({ current, maximum });

// journal is the complete ordered kernel journal, including startBattle events.
export function projectCombatLabView(
  sessionId: string,
  controlledSideId: string,
  state: combat.BattleState,
  journal: readonly combat.CombatEvent[],
): CombatLabView {
  combat.invariant(state.rulesetId === 'm0-prototype-v1', 'Combat lab requires M0');
  combat.invariant(
    state.sides.some(({ id }) => id === controlledSideId),
    'Unknown controlled side',
  );
  combat.invariant(
    journal[0]?.type === 'battle.started' && journal[0].revision === 0,
    'Complete journal required',
  );
  combat.invariant(
    journal.at(-1)?.revision === state.revision,
    'Journal must match current revision',
  );
  const rules = combat.combatRules(state.rulesetId);
  const { activation, outcome } = state;
  let revision = -1;
  let ordinal = -1;
  const events = journal.map((event) => {
    combat.invariant(
      event.battleId === state.battleId &&
        (event.revision === revision || event.revision === revision + 1),
      'Journal scope/order mismatch',
    );
    ordinal = event.revision === revision ? ordinal + 1 : 0;
    revision = event.revision;
    let unitId = 'unitId' in event ? event.unitId : null;
    if (event.type === 'attack.resolved') unitId = event.attackerId;
    return {
      id: JSON.stringify([state.battleId, revision, ordinal]),
      revision,
      ordinal,
      type: event.type,
      unitId,
      targetId: event.type === 'attack.resolved' ? event.targetId : null,
      hit: event.type === 'attack.resolved' ? event.hit : null,
      healthDamage: event.type === 'unit.damaged' ? event.healthDamage : null,
      armorDamage: event.type === 'unit.damaged' ? event.armorDamage : null,
    };
  });
  return {
    version: COMBAT_LAB_VERSION,
    scenarioId: COMBAT_LAB_SCENARIO,
    sessionId,
    battleId: state.battleId,
    controlledSideId,
    viewRevision: state.revision,
    status: state.status,
    round: state.round,
    map: { hexes: state.map.hexes.map(copyHex), blocked: state.map.blocked.map(copyHex) },
    sides: state.sides.map(({ id, retreatHexes }) => ({
      id,
      retreatHexes: retreatHexes.map(copyHex),
    })),
    units: state.units.map((unit) => ({
      id: unit.id,
      sideId: unit.sideId,
      weaponId: unit.weaponId,
      position: copyHex(unit.position),
      status: unit.status,
      guarding: unit.guarding,
      initiative: combat.effectiveInitiative(unit, rules),
      pools: {
        health: pool(unit.health, unit.attributes.health),
        armor: pool(unit.armor, unit.attributes.armor),
        stamina: pool(unit.stamina, unit.attributes.stamina),
        morale: pool(unit.morale, rules.morale.maximum),
      },
      wounds: unit.wounds.map(({ severity }) => severity),
    })),
    initiativeOrder: [...state.initiativeOrder],
    turnIndex: state.turnIndex,
    activation:
      activation === null
        ? null
        : {
            id: activation.id,
            actorId: activation.unitId,
            actionPoints: pool(activation.remainingActionPoints, rules.actionPointsPerActivation),
          },
    events: events.slice(-COMBAT_LAB_EVENT_LIMIT),
    omittedEventPrefix: Math.max(0, events.length - COMBAT_LAB_EVENT_LIMIT),
    outcome:
      outcome === undefined
        ? null
        : { reason: outcome.reason, winnerSideId: outcome.winnerSideId ?? null },
  };
}
