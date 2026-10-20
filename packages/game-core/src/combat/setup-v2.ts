import {
  validateUnitIdentity,
  validateUnitPosition,
  validateCombatMap,
  validateCombatTiles,
  createUnitAdmission,
  validateInteger,
} from './setup-validation.js';
import { invariant } from '../primitives.js';
import {
  M0_WEAPON_IDS,
  type BattleId,
  type CombatMap,
  type CombatSideSetup,
  type CombatUnitSetup,
  type CombatCapabilities,
} from './types.js';

export const COMBAT_V2_SCHEMA_VERSION = 2 as const;
export const M1_DOMAIN_BRIDGE_RULESET_ID = 'm1-domain-bridge-v1' as const;
export const M1_DOMAIN_BRIDGE_V2_RULESET_ID = 'm1-domain-bridge-v2' as const;
export const M1_DOMAIN_BRIDGE_V3_RULESET_ID = 'm1-domain-bridge-v3' as const;

export const M1_DOMAIN_BRIDGE_V4_RULESET_ID = 'm1-domain-bridge-v4' as const;

export function validateCombatCapabilities(
  value: CombatCapabilities | undefined,
  rulesetId: string,
): void {
  if (
    rulesetId !== M1_DOMAIN_BRIDGE_V3_RULESET_ID &&
    rulesetId !== M1_DOMAIN_BRIDGE_V4_RULESET_ID
  ) {
    invariant(value === undefined, 'Capabilities require bridge-v3');
    return;
  }
  invariant(
    value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value) &&
      Object.keys(value).length === 4 &&
      ['move', 'attack', 'defend', 'retreat'].every(
        (key) => typeof value[key as keyof CombatCapabilities] === 'boolean',
      ),
    'Bridge-v3 requires four boolean capabilities',
  );
}

const V2_UNIT_LIMITS = {
  minimum: 2,
  maximum: 12,
} as const;

export interface CombatInitialPoolsV2 {
  readonly health: number;
  readonly armor: number;
  readonly stamina: number;
  readonly morale: number;
}

export interface CombatUnitSetupV2 extends CombatUnitSetup {
  readonly initialPools: CombatInitialPoolsV2;
}

export interface BattleSetupV2 {
  readonly schemaVersion: typeof COMBAT_V2_SCHEMA_VERSION;
  readonly battleId: BattleId;
  readonly rulesetId:
    | typeof M1_DOMAIN_BRIDGE_RULESET_ID
    | typeof M1_DOMAIN_BRIDGE_V2_RULESET_ID
    | typeof M1_DOMAIN_BRIDGE_V3_RULESET_ID
    | typeof M1_DOMAIN_BRIDGE_V4_RULESET_ID;
  readonly seed: number;
  readonly map: CombatMap;
  readonly sides: readonly [CombatSideSetup, CombatSideSetup];
  readonly units: readonly CombatUnitSetupV2[];
}

function validateCurrentPool(current: number, maximum: number, name: string, minimum = 0): void {
  validateInteger(current, name, minimum);
  invariant(current <= maximum, `${name} must not exceed its maximum ${maximum}`);
}

function validateUnitPools(unit: CombatUnitSetupV2): void {
  const { attributes } = unit;
  validateInteger(attributes.health, `${unit.id}.attributes.health`, 1);
  validateInteger(attributes.armor, `${unit.id}.attributes.armor`);
  validateInteger(attributes.stamina, `${unit.id}.attributes.stamina`, 1);
  validateInteger(attributes.initiative, `${unit.id}.attributes.initiative`, 1);
  validateInteger(attributes.accuracy, `${unit.id}.attributes.accuracy`);
  validateInteger(attributes.defense, `${unit.id}.attributes.defense`);
  validateInteger(attributes.morale, `${unit.id}.attributes.morale`, 1);
  invariant(attributes.morale <= 100, `${unit.id}.attributes.morale must be <= 100`);

  invariant(unit.initialPools !== undefined, `${unit.id}.initialPools must be provided`);
  validateCurrentPool(
    unit.initialPools.health,
    attributes.health,
    `${unit.id}.initialPools.health`,
    1,
  );
  validateCurrentPool(unit.initialPools.armor, attributes.armor, `${unit.id}.initialPools.armor`);
  validateCurrentPool(
    unit.initialPools.stamina,
    attributes.stamina,
    `${unit.id}.initialPools.stamina`,
  );
  validateCurrentPool(
    unit.initialPools.morale,
    attributes.morale,
    `${unit.id}.initialPools.morale`,
    1,
  );
}

export function validateBattleSetupV2(setup: BattleSetupV2): BattleSetupV2 {
  invariant(
    setup.schemaVersion === COMBAT_V2_SCHEMA_VERSION,
    `V2 battle setup schemaVersion must be ${COMBAT_V2_SCHEMA_VERSION}`,
  );
  invariant(
    setup.rulesetId === M1_DOMAIN_BRIDGE_RULESET_ID ||
      setup.rulesetId === M1_DOMAIN_BRIDGE_V2_RULESET_ID ||
      setup.rulesetId === M1_DOMAIN_BRIDGE_V3_RULESET_ID ||
      setup.rulesetId === M1_DOMAIN_BRIDGE_V4_RULESET_ID,
    `V2 battle setup ruleset must be ${M1_DOMAIN_BRIDGE_RULESET_ID} or ${M1_DOMAIN_BRIDGE_V2_RULESET_ID}`,
  );
  invariant(setup.battleId.length > 0, 'Battle id must not be empty');
  invariant(Number.isSafeInteger(setup.seed), 'Battle seed must be a safe integer');
  invariant(setup.sides.length === 2, 'V2 battle requires exactly two sides');
  invariant(
    setup.units.length >= V2_UNIT_LIMITS.minimum && setup.units.length <= V2_UNIT_LIMITS.maximum,
    `V2 battle must contain ${V2_UNIT_LIMITS.minimum}-${V2_UNIT_LIMITS.maximum} real units`,
  );

  const tactical = setup.rulesetId === M1_DOMAIN_BRIDGE_V4_RULESET_ID;
  if (tactical) validateCombatTiles(setup.map);
  const { mapKeys, blockedKeys } = validateCombatMap(setup.map);
  const { sideIds, unitIds, occupied, unitsPerSide } = createUnitAdmission(
    setup.sides,
    mapKeys,
    blockedKeys,
  );
  for (const unit of setup.units) {
    validateUnitIdentity(unit, unitIds, sideIds);
    if (tactical) {
      validatePersistentTacticalInputs(unit);
    } else {
      invariant(
        unit.trainedMelee === undefined && unit.incorporeal === undefined,
        'Prototype combat traits require sprite-prototype-v1',
      );
    }
    unitsPerSide.set(unit.sideId, (unitsPerSide.get(unit.sideId) ?? 0) + 1);

    validateUnitPosition(unit, mapKeys, blockedKeys, occupied);

    invariant(
      (M0_WEAPON_IDS as readonly string[]).includes(unit.weaponId) ||
        ((setup.rulesetId === M1_DOMAIN_BRIDGE_V3_RULESET_ID || tactical) &&
          unit.weaponId === 'fists'),
      `Unsupported V2 weapon profile: ${unit.weaponId}`,
    );
    validateCombatCapabilities(unit.capabilities, setup.rulesetId);
    validateUnitPools(unit);
  }

  for (const side of setup.sides) {
    invariant((unitsPerSide.get(side.id) ?? 0) > 0, `Side ${side.id} must have at least one unit`);
  }

  return setup;
}

/** The bounded campaign bridge has no accepted skill/trait mapping. */
export function validatePersistentTacticalInputs(unit: CombatUnitSetup): void {
  invariant(
    unit.skillRanks !== null &&
      typeof unit.skillRanks === 'object' &&
      !Array.isArray(unit.skillRanks) &&
      Object.keys(unit.skillRanks).length === 0,
    'Unmapped campaign skills are unavailable',
  );
  invariant(
    unit.trainedMelee === undefined &&
      unit.incorporeal === undefined &&
      unit.threatProfile === undefined,
    'Unmapped campaign traits are unavailable',
  );
  invariant(
    ['human', 'beast', 'steady'].includes(unit.moralePolicy ?? ''),
    'Tactical bridge requires a morale policy',
  );
}
