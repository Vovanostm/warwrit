import { describe, expect, it } from 'vitest';
import { canonicalJson, projectCharacterCombat } from '@warwrit/game-core';
import type { CompanyEconomyState, EquipmentSlot } from '@warwrit/game-core';
import { economy } from './company-economy-fixture.js';
import {
  addContainer,
  addItem,
  addVitals,
  container,
  item,
  visibleCharacter,
  withLoadedConditions,
} from './company-physical-fixture.js';

const root = (state: CompanyEconomyState) => state as Required<CompanyEconomyState>;
function character(
  state: CompanyEconomyState,
  skills: Readonly<Record<string, number>>,
  perks: readonly string[] = [],
) {
  return visibleCharacter(state, 'worker-0', (entry) => ({
    ...entry,
    skills: { ...entry.skills, ...skills },
    perks: [...perks],
  }));
}
function equip(
  state: CompanyEconomyState,
  definitionId: string,
  itemId: string,
  slots: readonly EquipmentSlot[],
  currentCondition?: number,
  maximumCondition?: number,
) {
  const carrier = { kind: 'CHARACTER' as const, id: 'worker-0' };
  const containerId = 'combat-pack';
  let next = state;
  if (!next.physical!.containers.some((entry) => entry.containerId === containerId))
    next = addContainer(next, container(containerId, carrier, 30000, carrier), false);
  const value = item(
    itemId,
    definitionId,
    { kind: 'COMPANY', id: next.lifecycle.companyId },
    containerId,
    1,
    currentCondition,
    maximumCondition,
  );
  return addItem(next, { ...value, equipped: { characterId: 'worker-0', slots } }, false);
}
function vitals(state: CompanyEconomyState, health: number, stamina: number) {
  return addVitals(
    state,
    {
      characterId: 'worker-0',
      sourceId: 'combat-vitals',
      maximumHealth: 100,
      currentHealth: health,
      healthCarry: '0',
      maximumStamina: 100,
      currentStamina: stamina,
      staminaCarry: '0',
    },
    false,
  );
}

describe('G03 — character/equipment/condition combat projection', () => {
  it('projects real gear, skills/perks and an existing wound exactly once without refill', () => {
    let state = character(
      economy([1n]),
      { blades: 60, defense: 25 },
      ['blades-25-a', 'blades-60-b', 'defense-25-b'],
    );
    state = equip(state, 'sword', 'real-sword', ['MAIN_HAND']);
    state = equip(state, 'shield', 'real-shield', ['OFF_HAND']);
    state = equip(state, 'simple-helmet', 'real-helmet', ['HEAD'], 12, 20);
    state = equip(state, 'padded-coat', 'real-coat', ['BODY'], 30, 40);
    state = vitals(state, 45, 90);
    state = withLoadedConditions(state, { 'worker-0': ['severe-stable-wound'] }, 'wound');
    const before = canonicalJson(state);

    const projected = projectCharacterCombat(root(state), 'worker-0');
    expect(projected.weapon).toEqual({
      itemId: 'real-sword',
      requiredOffHandItemId: 'real-shield',
      definitionId: 'sword',
      profileId: 'sword-shield',
      skillId: 'blades',
    });
    expect(projected.armor).toEqual([
      { itemId: 'real-coat', definitionId: 'padded-coat', slot: 'BODY', maximumArmor: 40, currentArmor: 30 },
      { itemId: 'real-helmet', definitionId: 'simple-helmet', slot: 'HEAD', maximumArmor: 20, currentArmor: 12 },
    ]);
    expect(projected.conditionIds).toEqual(['wound-worker-0-0']);
    expect(projected.contributingPerkIds).toEqual(['blades-25-a', 'blades-60-b', 'defense-25-b']);
    expect(projected.attributes).toEqual({
      accuracy: 49,
      armor: 60,
      defense: 11,
      health: 60,
      initiative: 41,
      stamina: 85,
    });
    expect(projected.current).toEqual({ health: 45, armor: 42, stamina: 85 });
    expect(canonicalJson(state)).toBe(before);
  });

  it('keeps a wounded sparse-skill candidate and never invents armor', () => {
    let state = equip(economy([1n]), 'spear', 'real-spear', ['MAIN_HAND', 'OFF_HAND']);
    state = vitals(state, 60, 37);
    state = withLoadedConditions(state, { 'worker-0': ['old-impairment'] }, 'old');

    expect(projectCharacterCombat(root(state), 'worker-0')).toMatchObject({
      weapon: { itemId: 'real-spear', requiredOffHandItemId: null, profileId: 'spear' },
      armor: [],
      conditionIds: ['old-worker-0-0'],
      attributes: { accuracy: 20, armor: 0, defense: 5, health: 60, initiative: 37, stamina: 80 },
      current: { health: 60, armor: 0, stamina: 37 },
    });
  });

  it('fails closed rather than creating a weapon or accepting an incomplete loadout', () => {
    expect(() => projectCharacterCombat(root(vitals(economy([1n]), 60, 80)), 'worker-0')).toThrow(
      'INVALID_STATE',
    );
    let state = equip(economy([1n]), 'sword', 'lonely-sword', ['MAIN_HAND']);
    state = vitals(state, 60, 80);
    expect(() => projectCharacterCombat(root(state), 'worker-0')).toThrow('INVALID_STATE');
  });
});
