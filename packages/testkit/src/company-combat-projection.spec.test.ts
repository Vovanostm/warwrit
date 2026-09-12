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

function materialized(state: CompanyEconomyState) {
  return state as Required<CompanyEconomyState>;
}
function configure(
  state: CompanyEconomyState,
  characterId: string,
  skills: Readonly<Record<string, number>>,
  perks: readonly string[] = [],
) {
  return visibleCharacter(state, characterId, (character) => ({
    ...character,
    skills: { ...character.skills, ...skills },
    perks: [...perks],
  }));
}
function equip(
  state: CompanyEconomyState,
  characterId: string,
  definitionId: string,
  itemId: string,
  slots: readonly EquipmentSlot[],
  currentCondition?: number,
  maximumCondition?: number,
) {
  const containerId = `combat-pack-${characterId}`;
  const carrier = { kind: 'CHARACTER' as const, id: characterId };
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
  return addItem(
    next,
    { ...value, equipped: { characterId, slots: [...slots] } },
    false,
  );
}
function withVitals(
  state: CompanyEconomyState,
  characterId: string,
  currentHealth: number,
  currentStamina: number,
) {
  return addVitals(
    state,
    {
      characterId,
      sourceId: `vitals-${characterId}`,
      maximumHealth: 100,
      currentHealth,
      healthCarry: '0',
      maximumStamina: 100,
      currentStamina,
      staminaCarry: '0',
    },
    false,
  );
}

describe('G03 — character/equipment/condition combat projection', () => {
  it('projects exact real equipment, skill/perk modifiers and persistent wounds once', () => {
    let state = configure(
      economy([1n]),
      'worker-0',
      { blades: 60, defense: 25 },
      ['blades-25-a', 'blades-60-b', 'defense-25-b'],
    );
    state = equip(state, 'worker-0', 'sword', 'real-sword', ['MAIN_HAND']);
    state = equip(state, 'worker-0', 'shield', 'real-shield', ['OFF_HAND']);
    state = equip(state, 'worker-0', 'simple-helmet', 'real-helmet', ['HEAD'], 12, 20);
    state = equip(state, 'worker-0', 'padded-coat', 'real-coat', ['BODY'], 30, 40);
    state = withVitals(state, 'worker-0', 45, 90);
    state = withLoadedConditions(
      state,
      { 'worker-0': ['severe-stable-wound'] },
      'projection-wounds',
    );
    const before = canonicalJson(state);

    expect(projectCharacterCombat(materialized(state), 'worker-0')).toEqual({
      schemaVersion: 1,
      catalogueVersion: 's02-lifecycle-catalogue-1',
      domainRulesetId: 's02-domain-provisional-0.2',
      combatRulesetId: 'm1-domain-bridge-v1',
      characterId: 'worker-0',
      weapon: {
        itemId: 'real-sword',
        requiredOffHandItemId: 'real-shield',
        definitionId: 'sword',
        profileId: 'sword-shield',
        skillId: 'blades',
      },
      armor: [
        {
          itemId: 'real-coat',
          definitionId: 'padded-coat',
          slot: 'BODY',
          maximumArmor: 40,
          currentArmor: 30,
        },
        {
          itemId: 'real-helmet',
          definitionId: 'simple-helmet',
          slot: 'HEAD',
          maximumArmor: 20,
          currentArmor: 12,
        },
      ],
      conditionIds: ['projection-wounds-worker-0-0'],
      contributingPerkIds: ['blades-25-a', 'blades-60-b', 'defense-25-b'],
      attributes: {
        accuracy: 49,
        armor: 60,
        defense: 11,
        health: 60,
        initiative: 41,
        stamina: 85,
      },
      current: { health: 45, armor: 42, stamina: 85 },
    });
    expect(canonicalJson(state)).toBe(before);
  });

  it('keeps a wounded real candidate with sparse skill state and never invents armor', () => {
    let state = economy([1n]);
    state = equip(state, 'worker-0', 'spear', 'real-spear', ['MAIN_HAND', 'OFF_HAND']);
    state = withVitals(state, 'worker-0', 60, 37);
    state = withLoadedConditions(state, { 'worker-0': ['old-impairment'] }, 'old-wound');

    expect(projectCharacterCombat(materialized(state), 'worker-0')).toMatchObject({
      weapon: {
        itemId: 'real-spear',
        requiredOffHandItemId: null,
        profileId: 'spear',
        skillId: 'polearms',
      },
      armor: [],
      conditionIds: ['old-wound-worker-0-0'],
      attributes: {
        accuracy: 20,
        armor: 0,
        defense: 5,
        health: 60,
        initiative: 37,
        stamina: 80,
      },
      current: { health: 60, armor: 0, stamina: 37 },
    });
  });

  it('fails closed instead of synthesizing a weapon or accepting an incomplete loadout', () => {
    const unarmed = withVitals(economy([1n]), 'worker-0', 60, 80);
    expect(() => projectCharacterCombat(materialized(unarmed), 'worker-0')).toThrow(
      'INVALID_STATE',
    );

    let missingShield = economy([1n]);
    missingShield = equip(missingShield, 'worker-0', 'sword', 'lonely-sword', ['MAIN_HAND']);
    missingShield = withVitals(missingShield, 'worker-0', 60, 80);
    expect(() => projectCharacterCombat(materialized(missingShield), 'worker-0')).toThrow(
      'INVALID_STATE',
    );

    let unexpectedOffHand = economy([1n]);
    unexpectedOffHand = equip(
      unexpectedOffHand,
      'worker-0',
      'raider-weapon',
      'raider-main',
      ['MAIN_HAND'],
    );
    unexpectedOffHand = equip(
      unexpectedOffHand,
      'worker-0',
      'shield',
      'unexpected-shield',
      ['OFF_HAND'],
    );
    unexpectedOffHand = withVitals(unexpectedOffHand, 'worker-0', 60, 80);
    expect(() => projectCharacterCombat(materialized(unexpectedOffHand), 'worker-0')).toThrow(
      'INVALID_STATE',
    );
  });
});
