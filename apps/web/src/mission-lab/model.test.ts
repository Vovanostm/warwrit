import { harvest } from './harvest.js';
import { expect, it } from 'vitest';
import { forest } from './forest.js';
import { canChoose, choose } from './model.js';
import { missions } from './missions.js';
import { paintings } from './art.js';

it('the quiet night opportunity requires observing the camp first', () => {
  const opportunity = forest.scenes['sentry']!.choices.find((choice) => choice.id === 'kill')!;
  expect(canChoose(opportunity, ['start', 'tracks', 'sentry'])).toBe(false);
});

it('a choice from a later scene cannot jump past the investigation', () => {
  const path = ['start'];
  expect(choose(forest, path, 'kill')).toBe(path);
});

it('every illustrated quest step has its own illustration', () => {
  for (const mission of missions) {
    for (const scene of Object.values(mission.scenes)) {
      if (mission.presentation !== 'partial') {
        expect(Boolean(scene.art)).toBe(mission.presentation !== 'text');
      }
    }
  }
  const images = missions.flatMap((mission) =>
    Object.values(mission.scenes).flatMap((scene) => (scene.art ? [paintings[scene.art]] : [])),
  );
  expect(new Set(images).size).toBe(images.length);
});

it.each([
  ['S01-C01', 'S03-C01', 'S02-C02'],
  ['S01-C02', 'S02-C01', 'S03-C02'],
])('either field inspection order leaves the tested harvest available: %j', (...actions) => {
  let path: readonly string[] = ['start'];
  for (const action of actions) path = choose(harvest, path, action);
  const ended = choose(harvest, choose(harvest, path, 'S04-C01'), 'S05-C02');
  expect({
    ended: ended.at(-1),
    repeatedInspection: choose(harvest, ['start', 'edge', 'witness'], 'S02-C01'),
    earlyTrial: choose(harvest, ['start', 'witness'], 'S02-C02'),
  }).toEqual({
    ended: 'sharedHarvest',
    repeatedInspection: ['start', 'edge', 'witness'],
    earlyTrial: ['start', 'witness'],
  });
});
