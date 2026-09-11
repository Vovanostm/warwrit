import { describe, expect, it } from 'vitest';
import { canonicalJson, evaluatePerkEffects } from '@warwrit/game-core';
import type { CompanyEconomyState, EquipmentSlot, PerkTaskScope } from '@warwrit/game-core';
import { economy } from './company-economy-fixture.js';
import { addContainer, addItem, container, item } from './company-physical-fixture.js';
function character(state: CompanyEconomyState, id: string) {
  return state.lifecycle.characters.find((entry) => entry.identity.characterId === id)!;
}
