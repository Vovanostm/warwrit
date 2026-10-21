import { describe, expect, it } from 'vitest';
import {
  applyCombatCommand,
  canonicalCombatState,
  combatRules,
  commandId,
  previewCombatMovement,
  replayCombat,
  startBattle,
  startBattleV2,
  type VersionedCombatReplay,
} from '../index.js';
import { releasedBowReplays } from './tests/bow-replay-baseline.js';

describe('released ordinary bow replay compatibility', () => {
  it.each(releasedBowReplays)(
    'preserves released setup, state, events and canonical bytes %#',
    (record) => {
      const replay = JSON.parse(record.input) as VersionedCombatReplay;
      const before = JSON.stringify(replay);
      const actual = replayCombat(replay);
      expect(actual).toEqual(JSON.parse(record.output));
      expect(canonicalCombatState(actual.state)).toBe(record.canonical);
      expect(JSON.stringify(replay)).toBe(before);
      expect(
        combatRules(replay.setup.rulesetId).weapons.find(({ id }) => id === 'bow'),
      ).toMatchObject({ actionPointCost: 4, staminaCost: 16 });
      const initial =
        replay.schemaVersion === 1
          ? startBattle(replay.setup).state
          : startBattleV2(replay.setup).state;
      const to = { q: 0, r: 0 };
      if (replay.schemaVersion === 1)
        expect(previewCombatMovement(initial)).toContainEqual(
          expect.objectContaining({ to, actionPointCost: 1 }),
        );
      const moved = applyCombatCommand(initial, {
        type: 'move',
        commandId: commandId('old-step'),
        actorId: initial.activation!.unitId,
        activationId: initial.activation!.id,
        to,
      });
      expect(moved.ok).toBe(true);
      if (!moved.ok) throw new Error(moved.error.code);
      const refused = applyCombatCommand(moved.state, {
        ...replay.commands[0]!,
        commandId: commandId('old-step-shot'),
      });
      expect(refused).toMatchObject({
        ok: false,
        error: { code: 'INSUFFICIENT_ACTION_POINTS' },
        state: moved.state,
      });
      expect(refused.state).toBe(moved.state);
    },
  );

  it.each([
    ['sprite-prototype-v3', 'sprite-prototype-v4'],
    ['m1-domain-bridge-v4', 'm1-domain-bridge-v5'],
  ] as const)('%s to %s changes only ordinary bow AP', (oldId, newId) => {
    const oldRules = combatRules(oldId);
    const newRules = combatRules(newId);
    const { id: _oldId, weapons: oldWeapons, ...oldRest } = oldRules;
    const { id: _newId, weapons: newWeapons, ...newRest } = newRules;
    expect(newRest).toEqual(oldRest);
    expect(newWeapons).toEqual(
      oldWeapons.map((weapon) =>
        weapon.id === 'bow' ? { ...weapon, actionPointCost: 3 } : weapon,
      ),
    );
    expect(newWeapons.find(({ id }) => id === 'bow')).toMatchObject({
      staminaCost: 16,
      minimumRange: 1,
      maximumRange: 4,
      baseDamage: 18,
      damageVariance: 4,
    });
  });
});
