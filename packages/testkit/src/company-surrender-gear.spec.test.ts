import { describe, expect, it } from 'vitest';
import { dropSurrenderedCharacterGear } from '@warwrit/game-core';
import type { EconomyContext, PhysicalEvidence } from '@warwrit/game-core';
import { economy, physicalScope, place, tick } from './company-economy-fixture.js';
import { addContainer, addItem, container, item } from './company-physical-fixture.js';

function surrenderFixture() {
  let state = economy([1n], 10n, 0);
  state = addContainer(
    state,
    container('worker-pack', { kind: 'CHARACTER', id: 'worker-0' }, 30_000, {
      kind: 'CHARACTER',
      id: 'worker-0',
    }),
  );
  state = addItem(state, {
    ...item('worker-sword', 'sword', { kind: 'CHARACTER', id: 'worker-0' }, 'worker-pack'),
    equipped: { characterId: 'worker-0', slots: ['MAIN_HAND'] },
  });
  state = addItem(
    state,
    item('worker-coat', 'padded-coat', { kind: 'COMPANY', id: 'company' }, 'worker-pack'),
  );
  state = addItem(
    state,
    item('worker-ration', 'ration', { kind: 'COMPANY', id: 'company' }, 'worker-pack'),
  );
  const fact: PhysicalEvidence = {
    ...physicalScope(state, 'surrender-outcome', tick(0)),
    kind: 'SURRENDER_GEAR_OUTCOME',
    sourceEventId: 'battle-receipt:2:0',
    characterId: 'worker-0',
    unitId: 'combat-worker-0',
    location: place,
  };
  const context: EconomyContext = {
    companyId: state.lifecycle.companyId,
    worldId: state.lifecycle.worldId,
    principal: { kind: 'SYSTEM', id: 'verified-combat-finalizer' },
    publicRevision: state.lifecycle.knowledge.revision,
    canonicalRevision: state.lifecycle.revision,
    atTick: tick(0),
    completeGraph: true,
    contactIds: [],
    facts: [],
    financeFacts: [],
    physicalFacts: [fact],
  };
  return { state, fact, context };
}

describe('surrendering company combatant gear', () => {
  it('moves only existing carried items to a world ground bundle without changing their owners', () => {
    const { state, fact, context } = surrenderFixture();
    const next = dropSurrenderedCharacterGear(
      state.physical!,
      {
        receiptId: fact.id,
        sourceEventId: fact.sourceEventId,
        characterId: fact.characterId,
        unitId: fact.unitId,
      },
      context,
    );
    const bundle = next.containers.find((entry) => entry.kind === 'GROUND_BUNDLE');
    expect(bundle).toBeDefined();
    const bundleId = bundle!.containerId;
    expect(bundle).toMatchObject({
      kind: 'GROUND_BUNDLE',
      location: place,
      custodian: { kind: 'WORLD', id: 'world' },
      carrier: null,
      access: 'CUSTODIAN',
      closed: null,
    });
    expect(next.items.filter((entry) => entry.containerId === bundleId)).toEqual([
      expect.objectContaining({
        itemId: 'worker-sword',
        owner: { kind: 'CHARACTER', id: 'worker-0' },
        equipped: null,
      }),
      expect.objectContaining({
        itemId: 'worker-coat',
        owner: { kind: 'COMPANY', id: 'company' },
        equipped: null,
      }),
    ]);
    expect(next.items).toHaveLength(state.physical!.items.length);
    expect(next.items.map((entry) => entry.itemId).toSorted()).toEqual(
      state.physical!.items.map((entry) => entry.itemId).toSorted(),
    );
    expect(next.items.find((entry) => entry.itemId === 'worker-ration')?.containerId).toBe(
      'worker-pack',
    );
    expect(next.items.some((entry) => entry.containerId === 'fixture-supply')).toBe(true);
    expect(next.items.filter((entry) => entry.containerId === bundleId)).toHaveLength(2);
    expect(next.sourceEffects).toHaveLength(state.physical!.sourceEffects.length + 1);
  });

  it('replays the same source unchanged and rejects conflicting evidence for that source', () => {
    const { state, fact, context } = surrenderFixture();
    const input = {
      receiptId: fact.id,
      sourceEventId: fact.sourceEventId,
      characterId: fact.characterId,
      unitId: fact.unitId,
    };
    expect(() =>
      dropSurrenderedCharacterGear(
        state.physical!,
        { ...input, unitId: 'different-combat-unit' },
        context,
      ),
    ).toThrow(expect.objectContaining({ code: 'INVALID_SOURCE' }));
    const once = dropSurrenderedCharacterGear(state.physical!, input, context);
    expect(dropSurrenderedCharacterGear(once, input, context)).toBe(once);

    const conflict: PhysicalEvidence = {
      ...fact,
      id: 'surrender-outcome-conflict',
      location: { ...place, areaId: 'other-area' },
    };
    expect(() =>
      dropSurrenderedCharacterGear(
        once,
        { ...input, receiptId: conflict.id },
        { ...context, physicalFacts: [conflict] },
      ),
    ).toThrow(expect.objectContaining({ code: 'IDEMPOTENCY_CONFLICT' }));
  });

  it('records a surrender with no carried gear without creating an empty bundle', () => {
    const { state, fact, context } = surrenderFixture();
    const withoutGear = {
      ...state.physical!,
      items: state.physical!.items.filter(
        (entry) => entry.containerId !== 'worker-pack' || entry.tombstone !== null,
      ),
    };
    const next = dropSurrenderedCharacterGear(
      withoutGear,
      {
        receiptId: fact.id,
        sourceEventId: fact.sourceEventId,
        characterId: fact.characterId,
        unitId: fact.unitId,
      },
      context,
    );
    expect(next.containers.some((entry) => entry.kind === 'GROUND_BUNDLE')).toBe(false);
    expect(next.sourceEffects).toHaveLength(withoutGear.sourceEffects.length + 1);
  });
});
