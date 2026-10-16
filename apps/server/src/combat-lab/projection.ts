import * as combat from '@warwrit/game-core';
import {
  COMBAT_LAB_EVENT_LIMIT,
  COMBAT_LAB_SCENARIO,
  COMBAT_LAB_VERSION,
  SPRITE_COMBAT_LAB_SCENARIO,
  type CombatLabBattleConfig,
  type CombatLabHex,
  type CombatLabView,
} from '@warwrit/protocol';
import { combatLabProfiles } from './custom-battle.js';

const copyHex = ({ q, r }: CombatLabHex): CombatLabHex => ({ q, r });
const pool = (current: number, maximum: number) => ({ current, maximum });

// journal is the complete ordered kernel journal, including startBattle events.
export function projectCombatLabView(
  sessionId: string,
  controlledSideId: string,
  state: combat.BattleState,
  journal: readonly combat.CombatEvent[],
  battle?: CombatLabBattleConfig,
): CombatLabView {
  combat.invariant(
    state.rulesetId === 'm0-prototype-v1' || combat.isSpritePrototypeRuleset(state.rulesetId),
    'Unknown combat lab ruleset',
  );
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
  const ordinaryGuard = { ...state.units[0]!, guarding: true };
  delete ordinaryGuard.shieldBraceRank;
  const { activation, outcome } = state;
  let previewCommandId = combat.commandId(`lab-preview:${state.revision}`);
  while (state.processedCommandIds.includes(previewCommandId))
    previewCommandId = combat.commandId(`${previewCommandId}:`);
  const availableActions =
    activation === null
      ? []
      : (['defend', 'wait', 'retreat'] as const).filter(
          (type) =>
            combat.applyCombatCommand(state, {
              type,
              commandId: previewCommandId,
              actorId: activation.unitId,
              activationId: activation.id,
            }).ok,
        );
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
      targetId: 'targetId' in event ? event.targetId : null,
      hit: event.type === 'attack.resolved' ? event.hit : null,
      healthDamage:
        event.type === 'unit.damaged' || event.type === 'unit.fire-damaged'
          ? event.healthDamage
          : null,
      armorDamage: event.type === 'unit.damaged' ? event.armorDamage : null,
      ...(event.type === 'unit.moved'
        ? { actionPointCost: event.actionPointCost, staminaCost: event.staminaCost }
        : {}),
      ...(event.type === 'skill.used' ? { skillId: event.skillId, rank: event.rank } : {}),
    };
  });
  return {
    version: COMBAT_LAB_VERSION,
    rulesetId: state.rulesetId as NonNullable<CombatLabView['rulesetId']>,
    ruleHints: {
      hit: {
        shakenMoraleThreshold: rules.hit.shakenMoraleThreshold,
        shakenPenalty: rules.hit.shakenPenalty,
        lowStaminaThresholdPercent: rules.hit.lowStaminaThresholdPercent,
        lowStaminaPenalty: rules.hit.lowStaminaPenalty,
      },
      weapons: rules.weapons.map(({ id, actionPointCost, staminaCost }) => ({
        id,
        actionPointCost,
        staminaCost,
      })),
      defend: {
        actionPointCost: rules.defend.actionPointCost,
        staminaCost: rules.defend.staminaCost,
        damageReductionPercent: 100 - combat.combatGuardedDamage(100, ordinaryGuard, rules),
      },
      recovery: { staminaPerActivation: rules.recovery.staminaPerActivation },
    },
    scenarioId: combat.isSpritePrototypeRuleset(state.rulesetId)
      ? SPRITE_COMBAT_LAB_SCENARIO
      : COMBAT_LAB_SCENARIO,
    ...(battle === undefined ? {} : { battle }),
    sessionId,
    battleId: state.battleId,
    controlledSideId,
    viewRevision: state.revision,
    status: state.status,
    round: state.round,
    map: {
      hexes: state.map.hexes.map(copyHex),
      blocked: state.map.blocked.map(copyHex),
      ...(battle === undefined ? {} : { name: battle.map.name, tiles: battle.map.tiles }),
    },
    ...(combat.isSpritePrototypeRuleset(state.rulesetId) && state.status === 'active'
      ? {
          movementPreview: combat.previewCombatMovement(state),
          attackPreview: combat.previewCombatAttacks(state),
          rangedAttackArea: combat.previewCombatRangedArea(state),
          availableActions,
          skills: combat.getCombatSkills(state),
          skillPreview: combat.previewCombatSkills(state).map((preview) => ({
            ...preview,
            rulesetId: state.rulesetId as NonNullable<CombatLabView['rulesetId']>,
          })),
        }
      : {}),
    sides: state.sides.map(({ id, retreatHexes }) => ({
      id,
      retreatHexes: retreatHexes.map(copyHex),
    })),
    units: state.units.map((unit) => {
      const weaponReach = combat.previewCombatWeaponReach(state, unit.id);
      const configured = battle?.units.find((config) => config.id === unit.id);
      const profile = combatLabProfiles.find((profile) => profile.id === configured?.profileId);
      return {
        id: unit.id,
        ...(configured === undefined || profile === undefined
          ? {}
          : {
              profileId: configured.profileId,
              name: profile.name,
            }),
        sideId: unit.sideId,
        weaponId: unit.weaponId,
        ...(weaponReach === undefined ? {} : { weaponReach }),
        position: copyHex(unit.position),
        status: unit.status,
        guarding: unit.guarding,
        ...(unit.guarding
          ? { guardDamageReductionPercent: 100 - combat.combatGuardedDamage(100, unit, rules) }
          : {}),
        ...(unit.skillRanks === undefined ? {} : { skillRanks: { ...unit.skillRanks } }),
        ...(unit.shieldBraceRank === undefined ? {} : { shieldBraceRank: unit.shieldBraceRank }),
        panicking: combat.isCombatPanicked(state, unit),
        ...(unit.threat === undefined
          ? {}
          : {
              threat: {
                ...unit.threat,
                targetHex: copyHex(unit.threat.targetHex),
                damage: { ...unit.threat.damage },
              },
            }),
        ...(unit.escapePlan === undefined
          ? {}
          : {
              escapePlan: {
                ...unit.escapePlan,
                exit: copyHex(unit.escapePlan.exit),
                path: unit.escapePlan.path.map(copyHex),
              },
            }),
        initiative: combat.effectiveInitiative(unit, rules),
        pools: {
          health: pool(unit.health, unit.attributes.health),
          armor: pool(unit.armor, unit.attributes.armor),
          stamina: pool(unit.stamina, unit.attributes.stamina),
          morale: pool(unit.morale, rules.morale.maximum),
        },
        wounds: unit.wounds.map(({ severity }) => severity),
      };
    }),
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
