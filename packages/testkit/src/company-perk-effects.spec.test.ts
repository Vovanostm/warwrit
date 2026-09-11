import { describe, expect, it } from 'vitest';
import { canonicalJson, evaluatePerkEffects } from '@warwrit/game-core';
import type {
  CompanyEconomyState,
  EquipmentSlot,
  MaterializedCompanyState,
  PerkTaskScope,
} from '@warwrit/game-core';
import { economy } from './company-economy-fixture.js';
import { addContainer, addItem, container, item } from './company-physical-fixture.js';

const identityBps = { numerator: '10000', denominator: '1' };
const root = (state: CompanyEconomyState) => state as MaterializedCompanyState;
function character(state: CompanyEconomyState, id: string) {
  return state.lifecycle.characters.find((entry) => entry.identity.characterId === id)!;
}
function select(state: CompanyEconomyState, id: string, perks: readonly string[]) {
  Object.assign(character(state, id), { perks: [...perks] });
  return state;
}
function effects(
  state: CompanyEconomyState,
  id = 'worker-0',
  task: PerkTaskScope = 'NONE',
) {
  return evaluatePerkEffects(root(state), { kind: 'CHARACTER', characterId: id, task });
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

describe('B02 — finite perk effect evaluation', () => {
  it('returns additive zero and exact bps identity without an applicable selection', () => {
    const state = economy([1n, 1n]);
    const before = canonicalJson(state);

    expect(effects(state, 'worker-0', 'CARE')).toMatchObject({
      additive: { accuracy: 0, initiative: 0, defense: 0, maxStamina: 0 },
      task: { careRecoveryBps: identityBps, careCostBps: identityBps },
      contributingPerkIds: [],
    });
    expect(canonicalJson(state)).toBe(before);
  });

  it('keeps defense personal while incomplete or mismatched weapon disciplines stay inactive', () => {
    let state = select(economy([1n, 1n]), 'worker-0', [
      'polearms-25-b',
      'heavy-25-b',
      'defense-25-a',
    ]);
    state = equip(state, 'worker-0', 'sword', 'worker-sword', ['MAIN_HAND']);
    state = equip(state, 'leader', 'spear', 'leader-spear', ['MAIN_HAND', 'OFF_HAND']);

    expect(effects(state)).toMatchObject({
      weapon: null,
      additive: { defense: 3, maxStamina: 0 },
      contributingPerkIds: ['defense-25-a'],
    });
  });

  it('uses only the holder matching actual profile and adds both selected milestones once', () => {
    let state = select(economy([1n, 1n]), 'worker-0', [
      'polearms-25-b',
      'polearms-60-b',
      'defense-25-a',
      'heavy-25-b',
    ]);
    state = equip(state, 'worker-0', 'spear', 'worker-spear', [
      'MAIN_HAND',
      'OFF_HAND',
    ]);
    select(state, 'leader', ['heavy-25-b']);
    state = equip(state, 'leader', 'great-weapon', 'leader-heavy', [
      'MAIN_HAND',
      'OFF_HAND',
    ]);

    expect(effects(state)).toMatchObject({
      weapon: {
        itemId: 'worker-spear',
        profileId: 'spear',
        contributingPerkIds: ['polearms-25-b', 'polearms-60-b'],
      },
      additive: { defense: 11, maxStamina: 0 },
      contributingPerkIds: ['defense-25-a', 'polearms-25-b', 'polearms-60-b'],
    });
  });

  it('requires the real sword off-hand before enabling its blade profile', () => {
    let state = select(economy([1n, 1n]), 'worker-0', ['blades-25-a']);
    state = equip(state, 'worker-0', 'sword', 'worker-sword', ['MAIN_HAND']);
    expect(effects(state)).toMatchObject({ weapon: null, additive: { accuracy: 0 } });

    state = equip(state, 'worker-0', 'shield', 'worker-shield', ['OFF_HAND']);
    expect(effects(state)).toMatchObject({
      weapon: { itemId: 'worker-sword', profileId: 'sword-shield' },
      additive: { accuracy: 3 },
      contributingPerkIds: ['blades-25-a'],
    });
  });

  it('takes starting morale once from the lifecycle effective leader only', () => {
    const state = select(economy([1n, 1n]), 'leader', ['leadership-25-a']);
    select(state, 'worker-0', ['leadership-60-a']);
    Object.assign(state.lifecycle.company!, { actingLeaderId: 'worker-0' });

    expect(evaluatePerkEffects(root(state), { kind: 'LEADER_GROUP' })).toMatchObject({
      effectiveLeaderId: 'worker-0',
      startingMorale: 5,
      contributingPerkIds: ['leadership-60-a'],
    });
  });

  it('isolates CARE/STUDY/TRAINING by holder and composes bps exactly independent of order', () => {
    const state = select(economy([1n, 1n]), 'worker-0', [
      'medicine-25-a',
      'medicine-60-a',
      'scholarship-25-a',
      'scholarship-60-b',
      'leadership-25-b',
    ]);
    const care = effects(state, 'worker-0', 'CARE');
    expect(care).toMatchObject({
      task: { careRecoveryBps: { numerator: '13200', denominator: '1' } },
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
    expect(effects(state, 'leader', 'CARE')).toMatchObject({
      task: { careRecoveryBps: identityBps, careCostBps: identityBps },
      contributingPerkIds: [],
    });

    Object.assign(character(state, 'worker-0'), {
      perks: [
        'leadership-25-b',
        'scholarship-60-b',
        'scholarship-25-a',
        'medicine-60-a',
        'medicine-25-a',
      ],
    });
    expect(effects(state, 'worker-0', 'CARE')).toEqual(care);
    expect(JSON.parse(JSON.stringify(care))).toEqual(care);
  });

  it('returns a detached snapshot and never mutates B01 selection or root revisions', () => {
    let state = select(economy([1n, 1n]), 'worker-0', ['blades-25-a']);
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
  });

  it('fails closed instead of ignoring an unknown selected perk', () => {
    const state = select(economy([1n, 1n]), 'worker-0', ['not-a-real-perk']);
    expect(() => effects(state)).toThrow('INVALID_STATE');
  });
});
