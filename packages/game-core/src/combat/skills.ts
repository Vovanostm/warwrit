import { previewWeaponDamage } from './damage-preview.js';
import { compareHex, hexDistance, hexKey } from './hex.js';
import {
  combatHitChance,
  combatRules,
  isCombatPanicked,
  weaponProfile,
  type WeaponProfile,
} from './rules.js';
import { prototypeLineOfSight } from './sprite-prototype.js';
import {
  COMBAT_SKILL_IDS,
  SPRITE_PROTOTYPE_V3_RULESET_ID,
  type BattleState,
  type CombatSkillId,
  type CombatUnitState,
  type UnitId,
  type Hex,
  type WeaponId,
  type CombatFailureCode,
} from './types.js';

export interface CombatSkillDefinition {
  readonly skillId: CombatSkillId;
  readonly name: string;
  readonly target: 'self' | 'enemy' | 'ally';
  readonly equipment: readonly WeaponId[];
  readonly minimumRange: number;
  readonly maximumRange: number;
  readonly actionPointCost: number;
  readonly staminaCost: number;
  readonly duration: 'instant' | 'until-next-activation';
  readonly description: string;
}
/** All coefficients are local prototype tuning, not campaign progression. */
export const COMBAT_SKILLS: readonly CombatSkillDefinition[] = [
  {
    skillId: 'shield-brace',
    name: 'Упор щитом',
    target: 'self',
    equipment: ['sword-shield'],
    minimumRange: 0,
    maximumRange: 0,
    actionPointCost: 2,
    staminaCost: 12,
    duration: 'until-next-activation',
    description: 'Защита и снижение входящего урона на 40/45/50% до следующей активации.',
  },
  {
    skillId: 'armor-pressure',
    name: 'Удар по броне',
    target: 'enemy',
    equipment: ['sword-shield', 'great-weapon', 'raider'],
    minimumRange: 1,
    maximumRange: 1,
    actionPointCost: 4,
    staminaCost: 22,
    duration: 'instant',
    description: 'Удар с повышенным повреждением брони; без игнорирования защиты.',
  },
  {
    skillId: 'reach-thrust',
    name: 'Дальний укол',
    target: 'enemy',
    equipment: ['spear'],
    minimumRange: 2,
    maximumRange: 2,
    actionPointCost: 4,
    staminaCost: 20,
    duration: 'instant',
    description: 'Укол на две клетки с прибавкой точности; требует свободной линии.',
  },
  {
    skillId: 'aimed-shot',
    name: 'Прицельный выстрел',
    target: 'enemy',
    equipment: ['bow'],
    minimumRange: 2,
    maximumRange: 4,
    actionPointCost: 4,
    staminaCost: 24,
    duration: 'instant',
    description: 'Выстрел с прибавкой точности и урона; требует свободной линии.',
  },
  {
    skillId: 'rally',
    name: 'Собраться',
    target: 'ally',
    equipment: ['sword-shield', 'spear', 'great-weapon', 'bow', 'raider'],
    minimumRange: 0,
    maximumRange: 2,
    actionPointCost: 2,
    staminaCost: 14,
    duration: 'instant',
    description:
      'Восстанавливает союзнику 12/18/24 морали; не действует на зверей и стойких существ.',
  },
];
export interface LearnedCombatSkill extends CombatSkillDefinition {
  readonly rank: 1 | 2 | 3;
  readonly equipmentAvailable: boolean;
}
export interface CombatSkillPreview extends LearnedCombatSkill {
  readonly rulesetId: BattleState['rulesetId'];
  readonly revision: number;
  readonly activationId: string | null;
  readonly actorId: UnitId;
  readonly targetId: UnitId;
  readonly legal: boolean;
  readonly reason?: CombatFailureCode;
  readonly hitChance?: number;
  readonly damage?: {
    readonly health: { readonly minimum: number; readonly maximum: number };
    readonly armor: { readonly minimum: number; readonly maximum: number };
  };
  readonly moraleGain?: number;
  readonly damageReductionPercent?: number;
}
export function getCombatSkills(
  state: BattleState,
  actorId?: UnitId,
): readonly LearnedCombatSkill[] {
  if (state.rulesetId !== SPRITE_PROTOTYPE_V3_RULESET_ID) return [];
  const actor = state.units.find((unit) => unit.id === (actorId ?? state.activation?.unitId));
  if (!actor) return [];
  return COMBAT_SKILLS.flatMap((skill) => {
    const rank = actor.skillRanks?.[skill.skillId];
    return rank === undefined
      ? []
      : [{ ...skill, rank, equipmentAvailable: skill.equipment.includes(actor.weaponId) }];
  });
}
export function combatSkillWeapon(
  state: BattleState,
  actor: CombatUnitState,
  skill: LearnedCombatSkill,
): WeaponProfile {
  const weapon = weaponProfile(combatRules(state.rulesetId), actor.weaponId);
  const rank = skill.rank;
  return {
    ...weapon,
    minimumRange: skill.minimumRange,
    maximumRange: skill.maximumRange,
    actionPointCost: skill.actionPointCost,
    staminaCost: skill.staminaCost,
    ...(skill.skillId === 'armor-pressure'
      ? { armorDamagePercent: weapon.armorDamagePercent + 60 + rank * 20 }
      : {}),
    ...(skill.skillId === 'aimed-shot' ? { baseDamage: weapon.baseDamage + rank * 3 } : {}),
  };
}
export function combatSkillHitChance(
  state: BattleState,
  actor: CombatUnitState,
  target: CombatUnitState,
  skill: LearnedCombatSkill,
): number {
  const chance = combatHitChance(actor, target, combatRules(state.rulesetId));
  if (chance === 0 || chance === 100) return chance;
  return Math.min(
    95,
    chance +
      (skill.skillId === 'aimed-shot' || skill.skillId === 'reach-thrust'
        ? 10 + skill.rank * 5
        : 0),
  );
}
function skillActorFailure(
  state: BattleState,
  actor: CombatUnitState,
  skill: LearnedCombatSkill,
): CombatFailureCode | undefined {
  if (state.status !== 'active') return 'BATTLE_TERMINAL';
  if (state.activation?.unitId !== actor.id || actor.status !== 'active') return 'NOT_ACTIVE_UNIT';
  if (isCombatPanicked(state, actor)) return 'PANICKED';
  if (!skill.equipmentAvailable || actor.threatProfile !== undefined) return 'SKILL_NOT_AVAILABLE';
  return undefined;
}

function skillTargetFailure(
  state: BattleState,
  actor: CombatUnitState,
  target: CombatUnitState,
  skill: LearnedCombatSkill,
): CombatFailureCode | undefined {
  if (target.status !== 'active') return 'INVALID_TARGET';
  if (
    skill.target === 'enemy'
      ? target.sideId === actor.sideId || target.incorporeal === true
      : target.sideId !== actor.sideId
  )
    return 'INVALID_TARGET';
  const rules = combatRules(state.rulesetId);
  if (
    skill.skillId === 'rally' &&
    (target.moralePolicy !== 'human' || target.morale >= rules.morale.maximum)
  )
    return 'INVALID_TARGET';
  if (skill.skillId === 'shield-brace' && actor.shieldBraceRank !== undefined)
    return 'SKILL_NOT_AVAILABLE';
  return skillPositionFailure(state, actor.position, target.position, skill);
}

function skillPositionFailure(
  state: BattleState,
  origin: Hex,
  position: Hex,
  skill: CombatSkillDefinition,
): CombatFailureCode | undefined {
  const distance = hexDistance(origin, position);
  if (distance < skill.minimumRange || distance > skill.maximumRange) return 'OUT_OF_RANGE';
  if (
    ['aimed-shot', 'reach-thrust', 'rally'].includes(skill.skillId) &&
    !prototypeLineOfSight(state, origin, position)
  )
    return 'BLOCKED_LINE_OF_SIGHT';
  return undefined;
}

export interface CombatSkillReach {
  readonly actorId: UnitId;
  readonly activationId: string;
  readonly revision: number;
  readonly skillId: CombatSkillId;
  readonly minimumRange: number;
  readonly maximumRange: number;
  readonly cells: readonly Hex[];
}

function skillReachActor(state: BattleState, actorId: UnitId): CombatUnitState | undefined {
  if (state.rulesetId !== SPRITE_PROTOTYPE_V3_RULESET_ID || state.status !== 'active')
    return undefined;
  if (state.activation?.unitId !== actorId) return undefined;
  return state.units.find((unit) => unit.id === actorId && unit.status === 'active');
}

function skillReachCells(
  state: BattleState,
  actor: CombatUnitState,
  skill: LearnedCombatSkill,
): readonly Hex[] {
  if (!skill.equipmentAvailable || actor.threatProfile !== undefined) return [];
  const blocked = new Set(state.map.blocked.map(hexKey));
  const cells = new Map(state.map.hexes.map((cell) => [hexKey(cell), cell]));
  return [...cells.values()]
    .filter(
      (cell) =>
        !blocked.has(hexKey(cell)) && !skillPositionFailure(state, actor.position, cell, skill),
    )
    .sort(compareHex)
    .map(({ q, r }) => ({ q, r }));
}

/** Passive spatial inspection; target eligibility and action resources remain in admission. */
export function previewCombatSkillReach(
  state: BattleState,
  actorId: UnitId,
): readonly CombatSkillReach[] {
  const actor = skillReachActor(state, actorId);
  if (!actor) return [];
  return getCombatSkills(state, actorId).map((skill) => ({
    actorId,
    activationId: state.activation!.id,
    revision: state.revision,
    skillId: skill.skillId,
    minimumRange: skill.minimumRange,
    maximumRange: skill.maximumRange,
    cells: skillReachCells(state, actor, skill),
  }));
}

function skillResourceFailure(
  state: BattleState,
  actor: CombatUnitState,
  skill: LearnedCombatSkill,
): CombatFailureCode | undefined {
  if (skill.actionPointCost > state.activation!.remainingActionPoints)
    return 'INSUFFICIENT_ACTION_POINTS';
  if (skill.staminaCost > actor.stamina) return 'INSUFFICIENT_STAMINA';
  return undefined;
}

export function previewCombatSkills(
  state: BattleState,
  actorId?: UnitId,
): readonly CombatSkillPreview[] {
  const id = actorId ?? state.activation?.unitId;
  const actor = state.units.find((unit) => unit.id === id);
  if (!actor) return [];
  const rules = combatRules(state.rulesetId);
  return getCombatSkills(state, actor.id).flatMap((skill) => {
    const targets = skill.target === 'self' ? [actor] : state.units;
    return targets.map((target) => {
      const reason =
        skillActorFailure(state, actor, skill) ??
        skillTargetFailure(state, actor, target, skill) ??
        skillResourceFailure(state, actor, skill);
      const weapon = combatSkillWeapon(state, actor, skill);
      return {
        ...skill,
        rulesetId: state.rulesetId,
        revision: state.revision,
        activationId: state.activation?.id ?? null,
        actorId: actor.id,
        targetId: target.id,
        legal: reason === undefined,
        ...(reason ? { reason } : {}),
        ...(skill.target === 'enemy'
          ? {
              hitChance: combatSkillHitChance(state, actor, target, skill),
              damage: previewWeaponDamage(target, weapon, rules),
            }
          : {}),
        ...(skill.skillId === 'rally'
          ? { moraleGain: Math.min(rules.morale.maximum - target.morale, 6 + skill.rank * 6) }
          : {}),
        ...(skill.skillId === 'shield-brace'
          ? { damageReductionPercent: 35 + skill.rank * 5 }
          : {}),
      };
    });
  });
}
export function validateCombatSkillRanks(ranks: unknown): boolean {
  return (
    ranks === undefined ||
    (ranks !== null &&
      typeof ranks === 'object' &&
      !Array.isArray(ranks) &&
      (Object.getPrototypeOf(ranks) === Object.prototype ||
        Object.getPrototypeOf(ranks) === null) &&
      Object.entries(ranks).every(
        ([id, rank]) =>
          COMBAT_SKILL_IDS.includes(id as CombatSkillId) &&
          typeof rank === 'number' &&
          Number.isInteger(rank) &&
          rank >= 1 &&
          rank <= 3,
      ))
  );
}
