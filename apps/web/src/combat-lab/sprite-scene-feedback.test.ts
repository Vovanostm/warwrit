import { expect, it } from 'vitest';
import type { CombatLabEvent, CombatLabView } from '@warwrit/protocol';
import { eventFeedback } from './sprite-scene-feedback.js';

const fighter: CombatLabView['units'][number] = {
  id: 'fighter',
  sideId: 'human',
  weaponId: 'spear',
  position: { q: 0, r: 0 },
  status: 'active',
  guarding: false,
  initiative: 1,
  wounds: [],
  pools: {
    health: { current: 20, maximum: 20 },
    armor: { current: 10, maximum: 10 },
    stamina: { current: 20, maximum: 20 },
    morale: { current: 20, maximum: 20 },
  },
};
const target = { ...fighter, id: 'target' };
function event(type: CombatLabEvent['type'], values: Partial<CombatLabEvent> = {}): CombatLabEvent {
  return {
    id: 'event',
    ordinal: 0,
    revision: 4,
    type,
    unitId: fighter.id,
    targetId: target.id,
    hit: null,
    healthDamage: null,
    armorDamage: null,
    ...values,
  };
}
function feedback(
  events: CombatLabEvent[],
  previousRevision: number | null = null,
  units = [fighter, target],
) {
  return eventFeedback({ units, events, viewRevision: 4 }, previousRevision);
}

it('shows only the current revision at mount and aggregates subsequent accepted revisions', () => {
  const events = [
    event('unit.moved', { revision: 2, targetId: null, actionPointCost: 1 }),
    event('attack.resolved', { revision: 3, hit: true, healthDamage: 4 }),
    event('unit.wounded'),
  ];
  expect([...feedback(events)]).toEqual([['target', 'РАНЕНИЕ']]);
  expect([...feedback(events, 2)]).toEqual([['target', 'ПОПАДАНИЕ −4 · РАНЕНИЕ']]);
  expect([...feedback(events, 4)]).toEqual([]);
});

it('does not duplicate a persistent threat badge but keeps changed targets and execution feedback', () => {
  const preparing = {
    ...fighter,
    threat: {
      targetId: target.id,
      targetHex: target.position,
      range: 2 as const,
      damage: { minimum: 2, maximum: 5 },
      retargeted: false,
      responseReceived: false,
    },
  };
  expect([...feedback([event('threat.prepared')], null, [preparing, target])]).toEqual([]);
  expect([
    ...feedback([event('threat.prepared', { targetId: 'changed' })], null, [preparing, target]),
  ]).toEqual([['fighter', 'ГОТОВИТ УДАР']]);
  expect([...feedback([event('threat.executed')], null, [preparing, target])]).toEqual([
    ['target', 'УДАР'],
  ]);
  expect([
    ...feedback([event('threat.retargeted')], null, [
      { ...preparing, threat: { ...preparing.threat, retargeted: true } },
      target,
    ]),
  ]).toEqual([]);
});

it('keeps miss, armor, fire, movement and unavailable subject feedback faithful to public events', () => {
  expect([...feedback([event('attack.resolved', { hit: false })])]).toEqual([['target', 'ПРОМАХ']]);
  expect([...feedback([event('unit.damaged', { armorDamage: 3 })])]).toEqual([
    ['target', 'БРОНЯ −3'],
  ]);
  expect([...feedback([event('unit.fire-damaged', { healthDamage: 2 })])]).toEqual([
    ['target', 'ОГОНЬ −2'],
  ]);
  expect([...feedback([event('unit.moved', { targetId: null, actionPointCost: 2 })])]).toEqual([
    ['fighter', 'ШАГ · −2 ОД'],
  ]);
  expect([...feedback([event('unit.died', { targetId: 'missing' })])]).toEqual([]);
});
