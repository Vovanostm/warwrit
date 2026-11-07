import { exportCombatLabReplay } from '../combat-lab/replay.js';
import { createCombatLabPresentation } from '../combat-lab/presentation.js';
import {
  PLAYGROUND_CONTENT_REVISION,
  PLAYGROUND_SCHEMA_REVISION,
  type PlaygroundScenario,
} from '@warwrit/protocol';
import {
  createCustomBattleFixture,
  defaultSpriteBattle,
  isCustomBattle,
} from '../combat-lab/custom-battle.js';
import { projectCombatLabView } from '../combat-lab/projection.js';

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value: Record<string, unknown>, names: string[]) =>
  Object.keys(value).length === names.length && names.every((name) => Object.hasOwn(value, name));

export function playgroundTemplate(): PlaygroundScenario {
  return {
    schemaRevision: PLAYGROUND_SCHEMA_REVISION,
    contentRevision: PLAYGROUND_CONTENT_REVISION,
    metadata: { name: 'Новый эксперимент' },
    mapRef: 'inline',
    initial: defaultSpriteBattle(),
    controls: { mode: 'manual' },
  };
}

export function isPlaygroundScenario(value: unknown): value is PlaygroundScenario {
  return (
    record(value) &&
    keys(value, [
      'schemaRevision',
      'contentRevision',
      'metadata',
      'mapRef',
      'initial',
      'controls',
    ]) &&
    value['schemaRevision'] === PLAYGROUND_SCHEMA_REVISION &&
    value['contentRevision'] === PLAYGROUND_CONTENT_REVISION &&
    value['mapRef'] === 'inline' &&
    record(value['metadata']) &&
    keys(value['metadata'], ['name']) &&
    typeof value['metadata']['name'] === 'string' &&
    value['metadata']['name'].trim().length > 0 &&
    value['metadata']['name'].length <= 100 &&
    record(value['controls']) &&
    keys(value['controls'], ['mode']) &&
    value['controls']['mode'] === 'manual' &&
    isCustomBattle(value['initial'])
  );
}

/** Same setup, rules and observer projection as the existing lab; no simulation fork. */
export function inspectPlaygroundScenario(id: string, scenario: PlaygroundScenario) {
  const fixture = createCustomBattleFixture(id, scenario.initial);
  const started = fixture.start();
  return projectCombatLabView(
    id,
    fixture.controlledSideId,
    started.state,
    started.events,
    fixture.battle,
  );
}

/** Initial deterministic replay only; WLC-05 has no simulation command endpoint. */
export function exportPlaygroundReplay(id: string, scenario: PlaygroundScenario) {
  const fixture = createCustomBattleFixture(id, scenario.initial);
  return exportCombatLabReplay({
    originalSetup: fixture.originalSetup(),
    commands: [],
    presentation: createCombatLabPresentation(fixture.battle, fixture.controlledSideId),
  });
}
