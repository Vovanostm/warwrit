import { describe, expect, it } from 'vitest';
import { canonicalJson, evaluatePerkEffects } from '@warwrit/game-core';
import type { CompanyEconomyState, EquipmentSlot, PerkTaskScope } from '@warwrit/game-core';
import { economy } from './company-economy-fixture.js';
import { addContainer, addItem, container, item } from './company-physical-fixture.js';
function character(state: CompanyEconomyState, id: string) {
  return state.lifecycle.characters.find((entry) => entry.identity.characterId === id)!;
}
function select(
  state: CompanyEconomyState,
  id: string,
  perks: readonly string[],
  skills: Readonly<Record<string, number>> = {},
) {
  const target = character(state, id);
  Object.assign(target, { perks: [...perks], skills: { ...target.skills, ...skills } });
  return state;
}
function equip(
  state: CompanyEconomyState,
  characterId: string,
  definitionId: string,
  itemId: string,
  slots: readonly EquipmentSlot[],
) {
  const containerId = `pack-${characterId}`;
  let next = state;
  if (!next.physical!.containers.some((entry) => entry.containerId === containerId))
    next = addContainer(
      next,
      container(
        containerId,
        { kind: 'CHARACTER', id: characterId },
        30000,
        { kind: 'CHARACTER', id: characterId },
      ),
      false,
    );
  return addItem(
    next,
    {
      ...item(
        itemId,
        definitionId,
        { kind: 'COMPANY', id: state.lifecycle.companyId },
        containerId,
      ),
      equipped: { characterId, slots: [...slots] },
    },
    false,
  );
}
function effects(
  state: CompanyEconomyState,
  characterId = 'worker-0',
  task: PerkTaskScope = 'NONE',
) {
  return evaluatePerkEffects(state as Required<CompanyEconomyState>, {
    kind: 'CHARACTER',
    characterId,
    task,
  });
}
const identityBps = { numerator: '10000', denominator: '1' };
describe('B02 — finite perk effect evaluation', () => {
  it('returns identity values without mutation or non-contributing weapon provenance', () => {
    let state = economy([1n, 1n]);
    state = equip(state, 'worker-0', 'spear', 'worker-spear', ['MAIN_HAND', 'OFF_HAND']);
    const before = canonicalJson(state);
    expect(effects(state, 'worker-0', 'CARE')).toMatchObject({
      weapon: null,
      additive: { accuracy: 0, initiative: 0, defense: 0, maxStamina: 0 },
      task: { careRecoveryBps: identityBps, careCostBps: identityBps },
      contributingPerkIds: [],
    });
    expect(canonicalJson(state)).toBe(before);
  });
  it('keeps semantic scopes on the holder and the actual matching weapon only', () => {
    let wrong = select(
      economy([1n, 1n]),
      'worker-0',
      ['blades-25-a', 'heavy-25-b', 'defense-25-a'],
      { blades: 25, heavy: 25, defense: 25 },
    );
    wrong = equip(wrong, 'worker-0', 'sword', 'worker-sword', ['MAIN_HAND']);
    wrong = equip(wrong, 'leader', 'spear', 'leader-spear', ['MAIN_HAND', 'OFF_HAND']);
    expect(effects(wrong)).toMatchObject({
      weapon: null,
      additive: { defense: 3, maxStamina: 0 },
      contributingPerkIds: ['defense-25-a'],
    });
    let matching = select(
      economy([1n, 1n]),
      'worker-0',
      ['polearms-25-b', 'polearms-60-b', 'defense-25-a', 'heavy-25-b'],
      { polearms: 60, defense: 25, heavy: 25 },
    );
    matching = equip(matching, 'worker-0', 'spear', 'worker-spear', ['MAIN_HAND', 'OFF_HAND']);
    select(matching, 'leader', ['heavy-25-b'], { heavy: 25 });
    matching = equip(matching, 'leader', 'great-weapon', 'leader-heavy', ['MAIN_HAND', 'OFF_HAND']);
    expect(effects(matching)).toMatchObject({
      weapon: { itemId: 'worker-spear', profileId: 'spear' },
      additive: { defense: 11, maxStamina: 0 },
      contributingPerkIds: ['defense-25-a', 'polearms-25-b', 'polearms-60-b'],
    });
  });
  it('uses only the lifecycle effective leader for the one group aura', () => {
    const state = select(economy([1n, 1n]), 'leader', ['leadership-25-a'], { leadership: 25 });
    select(state, 'worker-0', ['leadership-60-a'], { leadership: 60 });
    Object.assign(state.lifecycle.company!, { actingLeaderId: 'worker-0' });
    expect(
      evaluatePerkEffects(state as Required<CompanyEconomyState>, { kind: 'LEADER_GROUP' }),
    ).toMatchObject({
      effectiveLeaderId: 'worker-0',
      startingMorale: 5,
      contributingPerkIds: ['leadership-60-a'],
    });
  });
  it('isolates care/study/training and keeps exact bps order- and JSON-stable', () => {
    const chosen = [
      'medicine-25-a',
      'medicine-60-a',
      'scholarship-25-a',
      'scholarship-60-b',
      'leadership-25-b',
    ];
    const state = select(economy([1n, 1n]), 'worker-0', chosen, {
      medicine: 60,
      scholarship: 60,
      leadership: 25,
    });
    const care = effects(state, 'worker-0', 'CARE');
    expect(care).toMatchObject({
      task: {
        careRecoveryBps: { numerator: '13200', denominator: '1' },
        careCostBps: identityBps,
      },
      contributingPerkIds: ['medicine-25-a', 'medicine-60-a'],
    });
    expect(effects(state, 'worker-0', 'STUDY')).toMatchObject({
      task: { studyDurationBps: { numerator: '9000', denominator: '1' } },
      contributingPerkIds: ['scholarship-25-a'],
    });
    expect(effects(state, 'worker-0', 'TRAINING')).toMatchObject({
      task: {
        trainingCostBps: { numerator: '8000', denominator: '1' },
        trainingDurationBps: { numerator: '9000', denominator: '1' },
      },
      contributingPerkIds: ['leadership-25-b', 'scholarship-60-b'],
    });
    expect(effects(state, 'leader', 'TRAINING')).toMatchObject({
      task: { trainingCostBps: identityBps, trainingDurationBps: identityBps },
    });
    Object.assign(character(state, 'worker-0'), { perks: [...chosen].reverse() });
    expect(effects(state, 'worker-0', 'CARE')).toEqual(care);
    expect(JSON.parse(JSON.stringify(care))).toEqual(care);
  });
  it('returns a detached snapshot and fails closed on corrupt selected data', () => {
    let state = select(economy([1n, 1n]), 'worker-0', ['blades-25-a'], { blades: 25 });
    state = equip(state, 'worker-0', 'raider-weapon', 'worker-raider', ['MAIN_HAND']);
    const before = canonicalJson(state);
    const snapshot = effects(state);
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
    const unknown = select(economy([1n, 1n]), 'worker-0', ['not-a-real-perk']);
    expect(() => effects(unknown)).toThrow('INVALID_STATE');
    const duplicate = select(
      economy([1n, 1n]),
      'worker-0',
      ['defense-25-a', 'defense-25-b'],
      { defense: 25 },
    );
    expect(() => effects(duplicate)).toThrow('INVALID_STATE');
  });
});
