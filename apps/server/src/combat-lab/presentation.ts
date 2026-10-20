import type { CombatLabBattleConfig, CombatLabReplayPresentation } from '@warwrit/protocol';
import { combatLabProfiles } from './custom-battle.js';

type Label = CombatLabReplayPresentation['units'][number];

/** Number equal catalogue labels across both sides in accepted setup order. */
function numberDuplicateNames(units: readonly Label[]): readonly Label[] {
  const totals = new Map<string, number>();
  for (const { name } of units) totals.set(name, (totals.get(name) ?? 0) + 1);
  const ordinals = new Map<string, number>();
  return units.map((unit) => {
    const ordinal = (ordinals.get(unit.name) ?? 0) + 1;
    ordinals.set(unit.name, ordinal);
    const name = totals.get(unit.name)! > 1 ? `${unit.name} ${ordinal}` : unit.name;
    return Object.freeze({ ...unit, name });
  });
}

export function createCombatLabPresentation(
  battle: CombatLabBattleConfig,
  controlledSideId: string,
): CombatLabReplayPresentation {
  const saved = structuredClone(battle);
  const units = saved.units.map(({ id, profileId }) => ({
    id,
    profileId,
    name: combatLabProfiles.find((profile) => profile.id === profileId)?.name ?? id,
  }));
  return Object.freeze({
    version: 1,
    controlledSideId,
    battle: saved,
    units: Object.freeze(numberDuplicateNames(units)),
  });
}
