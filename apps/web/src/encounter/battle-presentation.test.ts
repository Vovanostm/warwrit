import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { EncounterControlGrantDto, EncounterPublicProjectionDto } from '@warwrit/protocol';
import { toEncounterBattlePresentation } from './battle-presentation.js';
import { fromCombatLabView } from '../combat-lab/battle-presentation.js';
import { UnitVitals } from '../combat-lab/UnitVitals.js';

const projection: EncounterPublicProjectionDto = {
  version: 1,
  encounterId: '9e0b0cb1-e4cb-42c3-9bba-2f10e0f2d879',
  revision: 8,
  status: 'active',
  round: 3,
  activationId: 'activation-8',
  actorUnitId: 'company.fists',
  deadlineAt: null,
  initiativeOrder: ['company.fists', 'world.wolf.leader.01'],
  turnIndex: 0,
  map: {
    hexes: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ],
    blocked: [],
    tiles: [
      { q: 0, r: 0, height: 0, terrain: 'plain' },
      { q: 1, r: 0, height: 0, terrain: 'mud' },
    ],
  },
  units: [
    {
      id: 'company.fists',
      sideId: 'companies',
      q: 0,
      r: 0,
      health: 18,
      maximumHealth: 24,
      weaponId: 'fists',
      armor: 5,
      stamina: 7,
      morale: 12,
      guarding: false,
      status: 'active',
      threat: null,
    },
    {
      id: 'world.wolf.leader.01',
      sideId: 'wolves',
      q: 1,
      r: 0,
      health: 9,
      status: 'active',
      threat: {
        targetId: 'company.fists',
        damage: { minimum: 3, maximum: 6 },
        responseReceived: false,
      },
    },
  ],
};

function grant(revision = projection.revision): EncounterControlGrantDto {
  return {
    version: 1,
    encounterId: projection.encounterId,
    revision,
    controllableUnitIds: ['company.fists'],
    actorActions: {
      activationId: 'activation-8',
      actorId: 'company.fists',
      permittedIntents: ['move', 'attack', 'wait'],
    },
    tactical: {
      activationId: 'activation-8',
      actorId: 'company.fists',
      actionPoints: 2,
      stamina: 7,
      moves: [
        {
          to: { q: 1, r: 0 },
          path: [{ q: 1, r: 0 }],
          actionPointCost: 1,
          staminaCost: 2,
          fireDamage: 0,
          reactionCount: 0,
        },
      ],
      attacks: [
        {
          targetId: 'world.wolf.leader.01',
          hitChance: 40,
          actionPointCost: 1,
          staminaCost: 3,
          damage: {
            health: { minimum: 1, maximum: 4 },
            armor: { minimum: 0, maximum: 1 },
          },
        },
      ],
    },
  };
}

const label = (unit: EncounterPublicProjectionDto['units'][number]) => unit.id;

it('keeps public observations honest and links only a matching owned quote', () => {
  const view = toEncounterBattlePresentation(projection, grant(), label);
  expect(view.sceneEnvironment).toBe('open-field');
  expect(view.initiativeOrder).toEqual(projection.initiativeOrder);
  expect(view.controlledUnitIds).toEqual(['company.fists']);
  expect(view.activation).toEqual({
    id: 'activation-8',
    actorId: 'company.fists',
    actionPoints: { current: 2 },
  });
  expect(view.movementPreview?.[0]).toMatchObject({ actionPointCost: 1, reactionCount: 0 });
  expect(view.attackPreview?.[0]?.targetId).toBe('world.wolf.leader.01');
  expect(view.units[0]).toMatchObject({
    weaponId: 'fists',
    visualKind: 'human',
    pools: {
      health: { current: 18, maximum: 24 },
      armor: { current: 5 },
      stamina: { current: 7 },
      morale: { current: 12 },
    },
  });
  expect(view.units[0]?.pools.armor).not.toHaveProperty('maximum');
  expect(view.units[1]).toMatchObject({
    visualKind: 'creature',
    threat: { targetId: 'company.fists', targetHex: { q: 0, r: 0 } },
  });
  expect(view.events).toBeUndefined();
});

it('retains the public actor identity but removes private quotes from stale grants', () => {
  const view = toEncounterBattlePresentation(projection, grant(projection.revision - 1), label);
  expect(view.activation).toEqual({ id: 'activation-8', actorId: 'company.fists' });
  expect(view.controlledUnitIds).toEqual([]);
  expect(view.attackPreview).toBeUndefined();
  expect(view.movementPreview).toBeUndefined();
});

it('keeps the company side on a resolved snapshot after the revision grant is gone', () => {
  const resolved = {
    ...projection,
    status: 'resolved' as const,
    activationId: null,
    actorUnitId: null,
    outcome: { reason: 'last-side-standing' as const, winnerSideId: 'companies' },
  };
  const view = toEncounterBattlePresentation(resolved, undefined, label, ['company.fists']);

  expect(view.controlledSideId).toBe('companies');
  expect(view.viewerSideKnown).toBe(true);
  expect(view.controlledUnitIds).toEqual([]);
  expect(view.attackPreview).toBeUndefined();
});

it('renders the persistent health bar from its observed maximum and preserves unknown caps', () => {
  const renderHealth = (maximumHealth: number | undefined) => {
    const observed = {
      ...projection,
      units: projection.units.map((unit) =>
        unit.id === 'company.fists'
          ? (() => {
              const observedUnit = { ...unit, health: 20 };
              if (maximumHealth === undefined) delete observedUnit.maximumHealth;
              else observedUnit.maximumHealth = maximumHealth;
              return observedUnit;
            })()
          : unit,
      ),
    };
    const view = toEncounterBattlePresentation(observed, undefined, label);
    const html = renderToStaticMarkup(createElement(UnitVitals, { unit: view.units[0]! }));
    const percent = html.match(/style="width:([\d.]+)%"/);
    return { html, percent: Number(percent?.[1]) };
  };

  expect(renderHealth(60).percent).toBeCloseTo(100 / 3);
  expect(renderHealth(80).percent).toBe(25);
  const unknown = renderHealth(undefined);
  expect(unknown.html).toContain('Здоровье: 20 · максимум неизвестен');
  expect(unknown.percent).toBe(0);
  expect(renderHealth(60).percent).toBeCloseTo(100 / 3);
});

it('keeps lab-only provenance on lab views while persistent views use their own label', () => {
  const lab = fromCombatLabView({
    sessionId: 'session',
    battleId: 'battle',
    scenarioId: 'combat-lab',
    map: { name: 'Test field', hexes: [], blocked: [] },
    controlledSideId: 'human',
    viewRevision: 1,
    status: 'active',
    round: 1,
    units: [],
    activation: null,
    events: [],
  } as never);
  expect(lab.sourceNote).toContain('без сохранения кампании');
  expect(toEncounterBattlePresentation(projection, undefined, label)).not.toHaveProperty(
    'sourceNote',
  );
});
