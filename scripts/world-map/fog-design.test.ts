import { describe, expect, it } from 'vitest';
import {
  EXAMPLES,
  GROUPS,
  canObserve,
  exampleView,
  projectGroups,
  pursuitOnLoss,
  sightBudget,
  visibleCells,
} from './fog-design/model.js';

describe('fog design examples — illustrative, not server protection', () => {
  it('retains exploration on returning without retaining live groups remotely', () => {
    const before = exampleView(1, false);
    const after = exampleView(1, true);
    expect({
      grows: after.explored.size > before.explored.size,
      visible: [...after.visible],
      groups: after.groups,
    }).toEqual({ grows: true, visible: [...before.visible], groups: before.groups });
  });
  it('reduces the same observation field at night and in adverse weather', () => {
    const clear = { night: false, weather: 'CLEAR', forest: true, height: 0 } as const;
    const origin = { x: 13.5, y: 30.5 };
    const day = visibleCells(origin, clear);
    for (const conditions of [
      { ...clear, night: true },
      { ...clear, weather: 'RAIN' as const },
      { ...clear, weather: 'FOG' as const },
    ]) {
      const reduced = visibleCells(origin, conditions);
      expect({
        less: reduced.size < day.size,
        subset: [...reduced].every((cell) => day.has(cell)),
        budget: sightBudget(conditions) < sightBudget(clear),
      }).toEqual({ less: true, subset: true, budget: true });
    }
  });
  it('makes forest and ridge examples change actual observed targets', () => {
    const forest = [exampleView(2, false), exampleView(2, true)].map((v) =>
      v.groups.map((g) => g.id),
    );
    const ridge = [exampleView(3, false), exampleView(3, true)].map((v) =>
      v.groups.map((g) => g.id),
    );
    expect({ forest, ridge }).toEqual({
      forest: [['bandits', 'wolves'], ['bandits']],
      ridge: [[], ['far']],
    });
  });
  it('loses a target without using its new hidden position', () => {
    const before = exampleView(6, false);
    const after = exampleView(6, true);
    expect({
      before: before.groups.map((g) => g.id),
      after: after.groups.map((g) => g.id),
      intent: pursuitOnLoss(after.lastSeen!),
    }).toEqual({
      before: ['bandits'],
      after: [],
      intent: { mode: 'LAST_SEEN', destination: { x: 22.5, y: 30.5 } },
    });
  });
  it('does not change a lawful payload when an unobserved party moves or is renamed', () => {
    expect(exampleView(9, false).payload).toEqual(exampleView(9, true).payload);
    const base = exampleView(9, false);
    const hidden = GROUPS.map((g) =>
      g.id === 'far' ? { ...g, id: 'different-id', name: 'different-name', x: 71, y: 0 } : g,
    );
    expect(projectGroups(hidden, base.own, base.conditions)).toEqual(base.groups);
  });
  it('distinguishes a public overview and approximate rumour from live vision', () => {
    const overview = exampleView(8, false);
    const rumour = exampleView(7, true);
    expect({
      examples: EXAMPLES.length,
      overviewLive: overview.groups,
      hiddenMill: overview.sites.some((s) => s.id === 'mill'),
      rumour,
      clearBeyondRange: canObserve({ x: 0, y: 0 }, { x: 71, y: 47 }, rumour.conditions),
    }).toMatchObject({
      examples: 10,
      overviewLive: [],
      hiddenMill: false,
      rumour: { rumour: { area: { x: 36, y: 20, radius: 6 } } },
      clearBeyondRange: false,
    });
  });
});
