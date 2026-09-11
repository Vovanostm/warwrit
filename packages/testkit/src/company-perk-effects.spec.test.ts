import { describe, expect, it } from 'vitest';
import { canonicalJson, evaluatePerkEffects } from '@warwrit/game-core';
import type { CompanyEconomyState, EquipmentSlot } from '@warwrit/game-core';
import { economy } from './company-economy-fixture.js';
import { addContainer, addItem, container, item } from './company-physical-fixture.js';

function character(state: CompanyEconomyState, characterId: string) {
  return state.lifecycle.characters.find((entry) => entry.identity.characterId === characterId)!;
}

function select(
  state: CompanyEconomyState,
  characterId: string,
  perks: readonly string[],
): CompanyEconomyState {
  Object.assign(character(state, characterId), { perks: [...perks] });
  return state;
}

function equip(
  state: CompanyEconomyState,
  characterId: string,
  definitionId: string,
  itemId: string,
  slots: readonly EquipmentSlot[],
): CompanyEconomyState {
  const containerId = `pack-${characterId}`;
  if (!state.physical!.containers.some((entry) => entry.containerId === containerId)) {
    addContainer(
      state,
      container(
        containerId,
        { kind: 'CHARACTER', id: characterId },
        30000,
        { kind: 'CHARACTER', id: characterId },
      ),
      false,
    );
  }
  addItem(
    state,
    {
      ...item(itemId, definitionId, { kind: 'COMPANY', id: state.lifecycle.companyId }, containerId),
      equipped: { characterId, slots: [...slots] },
    },
    false,
  );
  return state;
}

const identityBps = { numerator: '10000', denominator: '1' };

describe('B02 — finite perk effect evaluation', () => {
  it('returns additive zero and exact bps identity without selected applicable perks', () => {
    const state = economy([1n, 1n]);
    const before = canonicalJson(state);

    expect(
      evaluatePerkEffects(state as Required<CompanyEconomyState>, {
        kind: 'CHARACTER',
        characterId: 'worker-0',
        task: 'CARE',
      }),
    ).toMatchObject({
      additive: { accuracy: 0, initiative: 0, defense: 0, maxStamina: 0 },
      task: { careRecoveryBps: identityBps, careCostBps: identityBps },
      contributingPerkIds: [],
    });
    expect(canonicalJson(state)).toBe(before);
  });

  it('keeps personal defense active while mismatched and incomplete weapon disciplines stay inactive', () => {
    const state = select(economy([1n, 1n]), 'worker-0', [
      'polearms-25-b',
      'heavy-25-b',
      'defense-25-a',
    ]);
    equip(state, 'worker-0', 'sword', 'worker-sword', ['MAIN_HAND']);
    equip(state, 'leader', 'spear', 'leader-spear', ['MAIN_HAND', 'OFF_HAND']);

    const snapshot = evaluatePerkEffects(state as Required<CompanyEconomyState>, {
      kind: 'CHARACTER',
      characterId: 'worker-0',
      task: 'NONE',
    });

    expect(snapshot).toMatchObject({
      weapon: null,
      additive: { defense: 3, maxStamina: 0 },
      contributingPerkIds: ['defense-25-a'],
    });
  });

  it('uses only the holder actual matching equipped profile and preserves discipline scope', () => {
    const state = select(economy([1n, 1n]), 'worker-0', [
      'polearms-25-b',
      'defense-25-a',
      'heavy-25-b',
    ]);
    equip(state, 'worker-0', 'spear', 'worker-spear', ['MAIN_HAND', 'OFF_HAND']);
    select(state, 'leader', ['heavy-25-b']);
    equip(state, 'leader', 'great-weapon', 'leader-heavy', ['MAIN_HAND', 'OFF_HAND']);

    expect(
      evaluatePerkEffects(state as Required<CompanyEconomyState>, {
        kind: 'CHARACTER',
        characterId: 'worker-0',
        task: 'NONE',
      }),
    ).toMatchObject({
      weapon: { itemId: 'worker-spear', profileId: 'spear' },
      additive: { defense: 6, maxStamina: 0 },
      contributingPerkIds: ['defense-25-a', 'polearms-25-b'],
    });
  });

  it('requires the sword off-hand profile before enabling blade perks', () => {
    const state = select(economy([1n, 1n]), 'worker-0', ['blades-25-a']);
    equip(state, 'worker-0', 'sword', 'worker-sword', ['MAIN_HAND']);
    const withoutShield = evaluatePerkEffects(state as Required<CompanyEconomyState>, {
      kind: 'CHARACTER',
      characterId: 'worker-0',
      task: 'NONE',
    });
    expect(withoutShield).toMatchObject({ weapon: null, additive: { accuracy: 0 } });

    equip(state, 'worker-0', 'shield', 'worker-shield', ['OFF_HAND']);
    expect(
      evaluatePerkEffects(state as Required<CompanyEconomyState>, {
        kind: 'CHARACTER',
        characterId: 'worker-0',
        task: 'NONE',
      }),
    ).toMatchObject({
      weapon: { itemId: 'worker-sword', profileId: 'sword-shield' },
      additive: { accuracy: 3 },
      contributingPerkIds: ['blades-25-a'],
    });
  });

  it('contributes starting morale once from the lifecycle effective leader only', () => {
    const state = select(economy([1n, 1n]), 'leader', ['leadership-25-a']);
    select(state, 'worker-0', ['leadership-60-a']);
    Object.assign(state.lifecycle.company!, { actingLeaderId: 'worker-0' });

    expect(
      evaluatePerkEffects(state as Required<CompanyEconomyState>, { kind: 'LEADER_GROUP' }),
    ).toMatchObject({
      effectiveLeaderId: 'worker-0',
      startingMorale: 5,
      contributingPerkIds: ['leadership-60-a'],
    });
  });

  it('isolates task modifiers by holder and composes bps exactly independent of perk order', () => {
    const state = select(economy([1n, 1n]), 'worker-0', [
      'medicine-25-a',
      'medicine-60-a',
    ]);
    const first = evaluatePerkEffects(state as Required<CompanyEconomyState>, {
      kind: 'CHARACTER',
      characterId: 'worker-0',
      task: 'CARE',
    });
    expect(first).toMatchObject({
      task: {
        careRecoveryBps: { numerator: '13200', denominator: '1' },
        careCostBps: identityBps,
      },
      contributingPerkIds: ['medicine-25-a', 'medicine-60-a'],
    });
    expect(
      evaluatePerkEffects(state as Required<CompanyEconomyState>, {
        kind: 'CHARACTER',
        characterId: 'leader',
        task: 'CARE',
      }),
    ).toMatchObject({
      task: { careRecoveryBps: identityBps, careCostBps: identityBps },
    });

    Object.assign(character(state, 'worker-0'), {
      perks: ['medicine-60-a', 'medicine-25-a'],
    });
    const reversed = evaluatePerkEffects(state as Required<CompanyEconomyState>, {
      kind: 'CHARACTER',
      characterId: 'worker-0',
      task: 'CARE',
    });
    expect(reversed).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
  });

  it('returns a detached snapshot and leaves B01 selection/root state untouched', () => {
    const state = select(economy([1n, 1n]), 'worker-0', ['blades-25-a']);
    equip(state, 'worker-0', 'raider-weapon', 'worker-raider', ['MAIN_HAND']);
    const before = canonicalJson(state);
    const snapshot = evaluatePerkEffects(state as Required<CompanyEconomyState>, {
      kind: 'CHARACTER',
      characterId: 'worker-0',
      task: 'NONE',
    });
    expect(canonicalJson(state)).toBe(before);

    Object.assign(character(state, 'worker-0'), { perks: [] });
    Object.assign(state.physical!.items.find((entry) => entry.itemId === 'worker-raider')!, {
      equipped: null,
    });
    expect(snapshot).toMatchObject({
      weapon: { itemId: 'worker-raider', profileId: 'raider' },
      additive: { accuracy: 3 },
      contributingPerkIds: ['blades-25-a'],
    });
  });

  it('fails closed on corrupt selected perk definitions', () => {
    const state = select(economy([1n, 1n]), 'worker-0', ['not-a-real-perk']);
    expect(() =>
      evaluatePerkEffects(state as Required<CompanyEconomyState>, {
        kind: 'CHARACTER',
        characterId: 'worker-0',
        task: 'NONE',
      }),
    ).toThrow('INVALID_STATE');
  });
});
