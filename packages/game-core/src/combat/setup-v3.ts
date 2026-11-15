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
  type CombatCapabilities,
  type CombatParty,
} from './types.js';
import {
  validateCombatCapabilities,
  validatePersistentTacticalInputs,
  M1_DOMAIN_BRIDGE_V6_RULESET_ID,
  type CombatInitialPoolsV2,
  type CombatUnitSetupV2,
} from './setup-v2.js';

export const COMBAT_V3_SCHEMA_VERSION = 3 as const;
export { M1_DOMAIN_BRIDGE_V6_RULESET_ID } from './setup-v2.js';

export type CombatPartySetupV3 = CombatParty;

export interface CombatUnitSetupV3 extends CombatUnitSetupV2 {
  readonly partyId: string;
  readonly capabilities: CombatCapabilities;
}

export interface BattleSetupV3 {
  readonly schemaVersion: typeof COMBAT_V3_SCHEMA_VERSION;
  readonly battleId: BattleId;
  readonly rulesetId: typeof M1_DOMAIN_BRIDGE_V6_RULESET_ID;
  readonly seed: number;
  readonly map: CombatMap;
  readonly sides: readonly CombatSideSetup[];
  readonly parties: readonly CombatPartySetupV3[];
  readonly units: readonly CombatUnitSetupV3[];
}

function validatePools(unit: CombatUnitSetupV3): void {
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
  const pools: readonly [keyof CombatInitialPoolsV2, number, number, number][] = [
    ['health', unit.initialPools.health, attributes.health, 1],
    ['armor', unit.initialPools.armor, attributes.armor, 0],
    ['stamina', unit.initialPools.stamina, attributes.stamina, 0],
    ['morale', unit.initialPools.morale, attributes.morale, 1],
  ];
  for (const [name, value, maximum, minimum] of pools) {
    validateInteger(value, `${unit.id}.initialPools.${name}`, minimum);
    invariant(
      value <= maximum,
      `${unit.id}.initialPools.${name} must not exceed its maximum ${maximum}`,
    );
  }
}

export function validateBattleSetupV3(setup: BattleSetupV3): BattleSetupV3 {
  invariant(
    setup.schemaVersion === COMBAT_V3_SCHEMA_VERSION,
    'V3 battle setup schemaVersion must be 3',
  );
  invariant(
    setup.rulesetId === M1_DOMAIN_BRIDGE_V6_RULESET_ID,
    'V3 battle setup requires bridge-v6',
  );
  invariant(setup.battleId.length > 0, 'Battle id must not be empty');
  invariant(Number.isSafeInteger(setup.seed), 'Battle seed must be a safe integer');
  invariant(
    setup.sides.length >= 2 && setup.sides.length <= 3,
    'V3 battle requires two or three sides',
  );
  invariant(
    setup.units.length >= 2 && setup.units.length <= 36,
    'V3 battle must contain 2-36 real units',
  );
  validateCombatTiles(setup.map);
  const { mapKeys, blockedKeys } = validateCombatMap(setup.map);
  const { sideIds, unitIds, occupied, unitsPerSide } = createUnitAdmission(
    setup.sides,
    mapKeys,
    blockedKeys,
  );
  const parties = new Map<string, CombatPartySetupV3>();
  for (const party of setup.parties) {
    invariant(party.id.length > 0, 'Party id must not be empty');
    invariant(!parties.has(party.id), `Duplicate party id: ${party.id}`);
    invariant(
      sideIds.has(party.sideId),
      `Party ${party.id} references unknown side ${party.sideId}`,
    );
    invariant(
      party.kind === 'player' || party.kind === 'npc',
      `Party ${party.id} has invalid kind`,
    );
    if (party.kind === 'player')
      invariant(
        typeof party.controllerId === 'string' && party.controllerId.length > 0,
        `Player party ${party.id} requires controllerId`,
      );
    else
      invariant(
        party.controllerId === undefined || party.controllerId.length > 0,
        `NPC party ${party.id} controllerId must be non-empty`,
      );
    parties.set(party.id, party);
  }
  invariant(parties.size > 0, 'V3 battle requires at least one party');
  const unitsPerParty = new Map<string, number>();
  for (const unit of setup.units) {
    validateUnitIdentity(unit, unitIds, sideIds);
    const party = parties.get(unit.partyId);
    invariant(party !== undefined, `Unit ${unit.id} references unknown party ${unit.partyId}`);
    invariant(party.sideId === unit.sideId, `Unit ${unit.id} side must match party ${party.id}`);
    const partyCount = (unitsPerParty.get(unit.partyId) ?? 0) + 1;
    unitsPerParty.set(unit.partyId, partyCount);
    invariant(
      party.kind !== 'player' || partyCount <= 6,
      `Player party ${party.id} exceeds six units`,
    );
    const sideCount = (unitsPerSide.get(unit.sideId) ?? 0) + 1;
    unitsPerSide.set(unit.sideId, sideCount);
    invariant(sideCount <= 12, `Side ${unit.sideId} exceeds twelve units`);
    validateUnitPosition(unit, mapKeys, blockedKeys, occupied);
    validatePersistentTacticalInputs(unit);
    invariant(
      (M0_WEAPON_IDS as readonly string[]).includes(unit.weaponId) || unit.weaponId === 'fists',
      `Unsupported V3 weapon profile: ${unit.weaponId}`,
    );
    validateCombatCapabilities(unit.capabilities, M1_DOMAIN_BRIDGE_V6_RULESET_ID);
    validatePools(unit);
  }
  for (const side of setup.sides)
    invariant((unitsPerSide.get(side.id) ?? 0) > 0, `Side ${side.id} must have at least one unit`);
  for (const party of parties.values())
    invariant(
      (unitsPerParty.get(party.id) ?? 0) > 0,
      `Party ${party.id} must have at least one unit`,
    );
  return setup;
}
