import { previewWeaponDamage } from './damage-preview.js';
import { isSpriteS4Ruleset, SPRITE_PROTOTYPE_FIRE_DAMAGE } from './rules.js';
import { previewCombatReactions, type CombatReactionPreview } from './reaction.js';
import { isCombatPanicked } from './rules.js';
import { invariant } from '../primitives.js';
import { compareHex, hexDistance, hexKey, hexNeighbors } from './hex.js';
import {
  isSpritePrototypeRuleset,
  combatHitChance,
  combatRules,
  compareCombatUnitIds,
  weaponProfile,
  type WeaponProfile,
} from './rules.js';
import {
  type BattleState,
  type CombatTile,
  type CombatUnitState,
  type Hex,
  type UnitId,
} from './types.js';

// Warwrit-specific bounded multi-resource Dijkstra; algorithm shape informed by
// https://github.com/nkzw-tech/athena-crisis/tree/1d7033db46ebf0e5435368673faf05764f66f256
// No source was copied and no dependency was adopted.
export interface CombatMovementPreview {
  readonly to: Hex;
  readonly path: readonly Hex[];
  readonly actionPointCost: number;
  readonly staminaCost: number;
  readonly reactions?: readonly CombatReactionPreview[];
  readonly fireDamage: number;
}

export interface CombatAttackPreview {
  readonly targetId: UnitId;
  readonly hitChance: number;
  readonly actionPointCost: number;
  readonly staminaCost: number;
  /** Actual health/armor loss ranges conditional on a hit. */
  readonly damage: {
    readonly health: { readonly minimum: number; readonly maximum: number };
    readonly armor: { readonly minimum: number; readonly maximum: number };
  };
}

interface MovementLabel {
  readonly hex: Hex;
  readonly actionPointCost: number;
  readonly staminaCost: number;
  readonly fireDamage: number;
  readonly parent?: MovementLabel;
}

export interface PrototypeAttackRoute {
  readonly targetId: UnitId;
  readonly position: Hex;
  readonly path: readonly Hex[];
}

function activeActor(state: BattleState): CombatUnitState {
  invariant(state.activation !== null, 'Combat preview requires an active unit');
  const actor = state.units.find(({ id }) => id === state.activation?.unitId);
  invariant(actor?.status === 'active', 'Combat preview activation must reference an active unit');
  return actor;
}

function isPrototype(state: BattleState): boolean {
  return isSpritePrototypeRuleset(state.rulesetId);
}

function tileAt(state: BattleState, hex: Hex): CombatTile | undefined {
  return state.map.tiles?.find((tile) => tile.q === hex.q && tile.r === hex.r);
}

function stepCost(state: BattleState, from: Hex, to: Hex): readonly [number, number] {
  // Prototype balance: plain entry costs 1 AP / 4 stamina; mud adds 1 / 1;
  // each uphill height level adds 1 AP / 4 stamina. Descent has no surcharge.
  const heightGain = Math.max(
    0,
    (tileAt(state, to)?.height ?? 0) - (tileAt(state, from)?.height ?? 0),
  );
  const mud = tileAt(state, to)?.terrain === 'mud';
  return [1 + heightGain + (mud ? 1 : 0), 4 + heightGain * 4 + (mud ? 1 : 0)];
}

function comparePaths(left: readonly Hex[], right: readonly Hex[]): number {
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    const a = left[index];
    const b = right[index];
    invariant(a !== undefined && b !== undefined, 'Path comparison index must exist');
    const difference = compareHex(a, b);
    if (difference !== 0) return difference;
  }
  return left.length - right.length;
}

function pathOf(label: MovementLabel): readonly Hex[] {
  const reverse: Hex[] = [];
  let current: MovementLabel | undefined = label;
  while (current?.parent !== undefined) {
    reverse.push({ ...current.hex });
    current = current.parent;
  }
  return reverse.reverse();
}

function compareLabels(left: MovementLabel, right: MovementLabel): number {
  return (
    left.actionPointCost - right.actionPointCost ||
    left.staminaCost - right.staminaCost ||
    comparePaths(pathOf(left), pathOf(right))
  );
}

function compareAttackRouteLabels(left: MovementLabel, right: MovementLabel): number {
  return left.fireDamage - right.fireDamage || compareLabels(left, right);
}

function movementObstacles(state: BattleState, actor: CombatUnitState): ReadonlySet<string> {
  return new Set([
    ...state.map.blocked.map(hexKey),
    ...state.units
      .filter((unit) => unit.status === 'active' && unit.id !== actor.id)
      .map((unit) => hexKey(unit.position)),
  ]);
}

function extendMovement(state: BattleState, current: MovementLabel, next: Hex): MovementLabel {
  const [stepAp, stepStamina] = stepCost(state, current.hex, next);
  return {
    hex: next,
    actionPointCost: current.actionPointCost + stepAp,
    staminaCost: current.staminaCost + stepStamina,
    fireDamage:
      current.fireDamage +
      (tileAt(state, next)?.terrain === 'fire' ? SPRITE_PROTOTYPE_FIRE_DAMAGE : 0),
    parent: current,
  };
}

function dominatesMovement(label: MovementLabel, by: MovementLabel): boolean {
  if (label.actionPointCost > by.actionPointCost || label.staminaCost > by.staminaCost)
    return false;
  const equal =
    label.actionPointCost === by.actionPointCost && label.staminaCost === by.staminaCost;
  return !equal || comparePaths(pathOf(label), pathOf(by)) <= 0;
}

function retainMovementLabel(
  labels: Map<string, MovementLabel[]>,
  candidate: MovementLabel,
): boolean {
  const key = hexKey(candidate.hex);
  const previous = labels.get(key) ?? [];
  if (previous.some((label) => dominatesMovement(label, candidate))) return false;
  const survivors = previous.filter((label) => !dominatesMovement(candidate, label));
  survivors.push(candidate);
  survivors.sort(compareLabels);
  labels.set(key, survivors);
  return true;
}

function movementCandidates(
  state: BattleState,
  current: MovementLabel,
  valid: ReadonlySet<string>,
  obstacles: ReadonlySet<string>,
): readonly MovementLabel[] {
  return hexNeighbors(current.hex)
    .toSorted(compareHex)
    .filter((next) => valid.has(hexKey(next)) && !obstacles.has(hexKey(next)))
    .map((next) => extendMovement(state, current, next));
}

function movementField(state: BattleState): readonly CombatMovementPreview[] {
  const actor = activeActor(state);
  invariant(state.activation !== null, 'Movement preview requires an activation');
  const apBudget = state.activation.remainingActionPoints;
  const staminaBudget = actor.stamina;
  const valid = new Set(state.map.hexes.map(hexKey));
  const obstacles = movementObstacles(state, actor);
  const labels = new Map<string, MovementLabel[]>([
    [
      hexKey(actor.position),
      [
        {
          hex: actor.position,
          actionPointCost: 0,
          staminaCost: 0,
          fireDamage: 0,
        },
      ],
    ],
  ]);
  const frontier = [...labels.get(hexKey(actor.position))!];

  while (frontier.length > 0) {
    frontier.sort(compareLabels);
    const current = frontier.shift();
    invariant(current !== undefined, 'Movement frontier must contain its selected label');
    const currentLabels = labels.get(hexKey(current.hex));
    if (currentLabels === undefined || !currentLabels.includes(current)) continue;

    for (const candidate of movementCandidates(state, current, valid, obstacles)) {
      if (candidate.actionPointCost > apBudget || candidate.staminaCost > staminaBudget) continue;
      if (!retainMovementLabel(labels, candidate)) continue;
      frontier.push(candidate);
    }
  }

  return previewMovementLabels(state, actor, labels);
}

function previewMovementLabels(
  state: BattleState,
  actor: CombatUnitState,
  labels: ReadonlyMap<string, readonly MovementLabel[]>,
): readonly CombatMovementPreview[] {
  const results: CombatMovementPreview[] = [];
  for (const [key, options] of labels) {
    if (key === hexKey(actor.position)) continue;
    const best = options.toSorted(compareLabels)[0];
    invariant(best !== undefined, 'Reachable hex must have a movement label');
    results.push({
      to: { ...best.hex },
      path: pathOf(best),
      actionPointCost: best.actionPointCost,
      staminaCost: best.staminaCost,
      fireDamage: Math.min(actor.health, best.fireDamage),
      ...(isSpriteS4Ruleset(state.rulesetId)
        ? { reactions: previewCombatReactions(state, actor, pathOf(best)) }
        : {}),
    });
  }
  return results.toSorted((a, b) => compareHex(a.to, b.to));
}

function validAttackTargets(
  state: BattleState,
  actor: CombatUnitState,
): readonly CombatUnitState[] {
  return state.units
    .filter(
      (target) =>
        target.status === 'active' && target.sideId !== actor.sideId && target.incorporeal !== true,
    )
    .toSorted((left, right) => compareCombatUnitIds(state.rulesetId, left.id, right.id));
}

/** A finite full-map field prefers fire-free routes, then survivable fire crossings. */
export function findPrototypeAttackRoute(state: BattleState): PrototypeAttackRoute | undefined {
  if (!isPrototype(state)) return undefined;
  const actor = activeActor(state);
  const weapon = weaponProfile(combatRules(state.rulesetId), actor.weaponId);
  const targets = validAttackTargets(state, actor);
  const valid = new Set(state.map.hexes.map(hexKey));
  const obstacles = movementObstacles(state, actor);
  const start: MovementLabel = {
    hex: actor.position,
    actionPointCost: 0,
    staminaCost: 0,
    fireDamage: 0,
  };
  const bestByHex = new Map([[hexKey(actor.position), start]]);
  const frontier = [start];

  while (frontier.length > 0) {
    frontier.sort(compareAttackRouteLabels);
    const current = frontier.shift();
    invariant(current !== undefined, 'Route frontier must contain its selected label');
    if (bestByHex.get(hexKey(current.hex)) !== current) continue;
    const target = targets.find((candidate) => {
      const distance = hexDistance(current.hex, candidate.position);
      return (
        distance >= weapon.minimumRange &&
        distance <= weapon.maximumRange &&
        (actor.weaponId !== 'bow' || prototypeLineOfSight(state, current.hex, candidate.position))
      );
    });
    if (target !== undefined) {
      return { targetId: target.id, position: { ...current.hex }, path: pathOf(current) };
    }

    for (const candidate of movementCandidates(state, current, valid, obstacles)) {
      const key = hexKey(candidate.hex);
      if (candidate.fireDamage >= actor.health) continue;
      const existing = bestByHex.get(key);
      if (existing !== undefined && compareAttackRouteLabels(existing, candidate) <= 0) continue;
      bestByHex.set(key, candidate);
      frontier.push(candidate);
    }
  }
  return undefined;
}

export function previewCombatMovement(state: BattleState): readonly CombatMovementPreview[] {
  if (!isPrototype(state)) return [];
  return movementField(state);
}

export function preparePrototypeMove(
  state: BattleState,
  destination: Hex,
): CombatMovementPreview | undefined {
  if (!isPrototype(state)) return undefined;
  return movementField(state).find(({ to }) => to.q === destination.q && to.r === destination.r);
}

export function prototypeMovementStep(
  state: BattleState,
  from: Hex,
  to: Hex,
): {
  readonly actionPointCost: number;
  readonly staminaCost: number;
  readonly fire: boolean;
} {
  const [actionPointCost, staminaCost] = stepCost(state, from, to);
  return {
    actionPointCost,
    staminaCost,
    fire: tileAt(state, to)?.terrain === 'fire',
  };
}

function roundedCube(q: number, r: number): Hex {
  const x = q;
  const z = r;
  const y = -x - z;
  let rx = Math.round(x);
  const ry = Math.round(y);
  let rz = Math.round(z);
  const dx = Math.abs(rx - x);
  const dy = Math.abs(ry - y);
  const dz = Math.abs(rz - z);
  if (dx > dy && dx > dz) rx = -ry - rz;
  else if (dy <= dz) rz = -rx - ry;
  return { q: rx, r: rz };
}

/** Bow rays use rounded axial interpolation; blocked cells or intervening terrain above the ray block. */
export function prototypeLineOfSight(state: BattleState, from: Hex, to: Hex): boolean {
  const distance = hexDistance(from, to);
  if (distance <= 1) return true;
  const blocked = new Set(state.map.blocked.map(hexKey));
  const sourceHeight = tileAt(state, from)?.height ?? 0;
  const targetHeight = tileAt(state, to)?.height ?? 0;
  for (let step = 1; step < distance; step += 1) {
    const t = step / distance;
    const hex = roundedCube(from.q + (to.q - from.q) * t, from.r + (to.r - from.r) * t);
    if (blocked.has(hexKey(hex))) return false;
    const lineHeight = sourceHeight + (targetHeight - sourceHeight) * t;
    if ((tileAt(state, hex)?.height ?? 0) > lineHeight) return false;
  }
  return true;
}

function canAffordAttack(
  state: BattleState,
  actor: CombatUnitState,
  weapon: WeaponProfile,
): boolean {
  return (
    state.activation !== null &&
    weapon.actionPointCost <= state.activation.remainingActionPoints &&
    weapon.staminaCost <= actor.stamina
  );
}

function withinAttackRange(
  state: BattleState,
  actor: CombatUnitState,
  position: Hex,
  weapon: WeaponProfile,
): boolean {
  const distance = hexDistance(actor.position, position);
  return (
    distance >= weapon.minimumRange &&
    distance <= weapon.maximumRange &&
    (actor.weaponId !== 'bow' || prototypeLineOfSight(state, actor.position, position))
  );
}

/** Read-only weapon inspection; turn ownership, resources and target eligibility are separate. */
export function previewCombatWeaponReach(
  state: BattleState,
  inspectedId: UnitId,
):
  | { readonly minimumRange: number; readonly maximumRange: number; readonly cells: readonly Hex[] }
  | undefined {
  if (!isPrototype(state) || state.status !== 'active') return undefined;
  const inspected = state.units.find(({ id }) => id === inspectedId);
  if (!inspected || inspected.status !== 'active') return undefined;
  const weapon = weaponProfile(combatRules(state.rulesetId), inspected.weaponId);
  const blocked = new Set(state.map.blocked.map(hexKey));
  return {
    minimumRange: weapon.minimumRange,
    maximumRange: weapon.maximumRange,
    cells: state.map.hexes
      .filter(
        (hex) => !blocked.has(hexKey(hex)) && withinAttackRange(state, inspected, hex, weapon),
      )
      .toSorted(compareHex)
      .map((hex) => ({ ...hex })),
  };
}

/** Affordable bow target cells, including empty cells; ordinary invalid targets are omitted. */
export function previewCombatRangedArea(state: BattleState): readonly Hex[] {
  if (!isPrototype(state) || state.status !== 'active' || state.activation === null) return [];
  const actor = activeActor(state);
  if (actor.weaponId !== 'bow') return [];
  const weapon = weaponProfile(combatRules(state.rulesetId), actor.weaponId);
  if (!canAffordAttack(state, actor, weapon)) return [];
  const excluded = new Set([
    ...state.map.blocked.map(hexKey),
    ...state.units
      .filter(
        (unit) =>
          unit.status === 'active' && (unit.sideId === actor.sideId || unit.incorporeal === true),
      )
      .map((unit) => hexKey(unit.position)),
  ]);
  return state.map.hexes
    .filter(
      (position) =>
        !excluded.has(hexKey(position)) && withinAttackRange(state, actor, position, weapon),
    )
    .toSorted(compareHex)
    .map((position) => ({ ...position }));
}

export function previewCombatAttacks(state: BattleState): readonly CombatAttackPreview[] {
  if (!isPrototype(state) || state.status !== 'active' || state.activation === null) return [];
  const actor = activeActor(state);
  if (
    isCombatPanicked(state, actor) ||
    (isSpriteS4Ruleset(state.rulesetId) && actor.threatProfile === 'mill-slam')
  )
    return [];
  const rules = combatRules(state.rulesetId);
  const weapon = weaponProfile(rules, actor.weaponId);
  if (!canAffordAttack(state, actor, weapon)) return [];
  return validAttackTargets(state, actor)
    .filter((target) => withinAttackRange(state, actor, target.position, weapon))
    .map((target) => {
      return {
        targetId: target.id,
        hitChance: combatHitChance(actor, target, rules),
        actionPointCost: weapon.actionPointCost,
        staminaCost: weapon.staminaCost,
        damage: previewWeaponDamage(target, weapon, rules),
      };
    });
}

export { SPRITE_PROTOTYPE_FIRE_DAMAGE };
