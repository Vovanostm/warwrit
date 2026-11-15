import * as combat from '@warwrit/game-core';
import {
  PLAYGROUND_CONTENT_REVISION,
  PLAYGROUND_MULTISIDE_CONTENT_REVISION,
  PLAYGROUND_SCHEMA_REVISION,
  type PlaygroundScenario,
  type PlaygroundFieldError,
  type CombatLabBattleConfig,
  type CombatLabBattleConfigV2,
  type VersionedCombatLabBattleConfig,
} from '@warwrit/protocol';
import {
  combatLabCatalog,
  createCustomBattleFixture,
  defaultSpriteBattle,
  isCustomBattle,
} from '../combat-lab/custom-battle.js';
import {
  createMultisideBattleSetup,
  isMultisideBattle,
  defaultMultisideBattle,
  maximumMultisideBattle,
} from '../combat-lab/multiside-battle.js';
import { projectCombatLabView } from '../combat-lab/projection.js';

export function playgroundCatalog() {
  const catalog = combatLabCatalog();
  const stripSkills = <T extends VersionedCombatLabBattleConfig>(battle: T): T => ({
    ...battle,
    units: battle.units.map((unit) => ({ ...unit, skillRanks: {} })),
  });
  return {
    ...catalog,
    skills: [],
    profiles: catalog.profiles.map((profile) => ({ ...profile, defaultSkillRanks: {} })),
    defaultBattle: stripSkills(catalog.defaultBattle),
    presets: (catalog.presets ?? []).map((preset) => ({
      ...preset,
      battle: stripSkills(preset.battle),
    })),
  };
}

function legacyPlaygroundTemplate(): PlaygroundScenario & {
  initial: CombatLabBattleConfig;
  rulesetId: 'm1-domain-bridge-v5';
} {
  return {
    schemaRevision: PLAYGROUND_SCHEMA_REVISION,
    contentRevision: PLAYGROUND_CONTENT_REVISION,
    metadata: { name: 'Новый эксперимент' },
    mapRef: 'inline',
    initial: {
      ...defaultSpriteBattle(),
      units: defaultSpriteBattle().units.map((unit) => ({ ...unit, skillRanks: {} })),
    },
    controls: { mode: 'manual' },
    rulesetId: combat.M1_DOMAIN_BRIDGE_V5_RULESET_ID,
    resources: [],
    equipment: [],
  };
}

export function playgroundTemplate(): PlaygroundScenario & {
  initial: CombatLabBattleConfigV2;
  rulesetId: 'm1-domain-bridge-v6';
} {
  const legacy = legacyPlaygroundTemplate();
  const battle = defaultMultisideBattle();
  return {
    ...legacy,
    contentRevision: PLAYGROUND_MULTISIDE_CONTENT_REVISION,
    rulesetId: combat.M1_DOMAIN_BRIDGE_V6_RULESET_ID,
    initial: { ...battle, units: battle.units.map((unit) => ({ ...unit, skillRanks: {} })) },
  };
}

export function isSupportedPlaygroundContentRevision(value: unknown): boolean {
  return value === PLAYGROUND_CONTENT_REVISION || value === PLAYGROUND_MULTISIDE_CONTENT_REVISION;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Field diagnostics supplement (never replace) existing transport and domain validation. */
export function preflightPlayground(value: unknown): PlaygroundFieldError[] {
  const errors: PlaygroundFieldError[] = [];
  const add = (field: string, message: string) => errors.push({ field, message });
  if (!record(value)) return [{ field: 'scenario', message: 'Ожидается объект сценария.' }];
  const keys = [
    'schemaRevision',
    'contentRevision',
    'metadata',
    'mapRef',
    'initial',
    'controls',
    'rulesetId',
    'resources',
    'equipment',
  ];
  if (Object.keys(value).length !== keys.length || !keys.every((key) => Object.hasOwn(value, key)))
    add('scenario', 'Проверьте обязательные и неизвестные поля.');
  if (value['schemaRevision'] !== PLAYGROUND_SCHEMA_REVISION)
    add('schemaRevision', 'Неподдерживаемая версия схемы.');
  const multiside = record(value['initial']) && value['initial']['version'] === 2;
  if (
    value['contentRevision'] !==
    (multiside ? PLAYGROUND_MULTISIDE_CONTENT_REVISION : PLAYGROUND_CONTENT_REVISION)
  )
    add('contentRevision', 'Ревизия контента недоступна.');
  if (
    value['rulesetId'] !==
    (multiside ? combat.M1_DOMAIN_BRIDGE_V6_RULESET_ID : combat.M1_DOMAIN_BRIDGE_V5_RULESET_ID)
  )
    add('rulesetId', 'Неподдерживаемая версия правил.');
  if (value['mapRef'] !== 'inline') add('mapRef', 'Доступны только сохранённые inline-карты.');
  if (
    !record(value['metadata']) ||
    Object.keys(value['metadata']).length !== 1 ||
    typeof value['metadata']['name'] !== 'string' ||
    !value['metadata']['name'].trim() ||
    value['metadata']['name'].length > 100
  )
    add('metadata.name', 'Название обязательно, максимум 100 символов.');
  if (
    !record(value['controls']) ||
    Object.keys(value['controls']).length !== 1 ||
    value['controls']['mode'] !== 'manual'
  )
    add('controls.mode', 'Только управляемые команды: без фонового времени.');
  const initial = value['initial'];
  if (record(initial)) {
    if (
      !Number.isSafeInteger(initial['seed']) ||
      Number(initial['seed']) < 0 ||
      Number(initial['seed']) > 0xffffffff
    )
      add('initial.seed', 'Seed: целое число 0…4294967295.');
    if (Array.isArray(initial['units'])) {
      const positions = new Set<string>();
      const ids = new Set<string>();
      initial['units'].forEach((unit: unknown, index: number) => {
        const field = `initial.units[${index}]`;
        if (!record(unit)) {
          add(field, 'Ожидается боец.');
          return;
        }
        if (ids.has(String(unit['id']))) add(`${field}.id`, 'Повтор идентификатора.');
        ids.add(String(unit['id']));
        if (!playgroundCatalog().profiles.some((profile) => profile.id === unit['profileId']))
          add(`${field}.profileId`, 'Шаблон/экипировка отсутствует в каталоге.');
        if (record(unit['skillRanks']) && Object.keys(unit['skillRanks']).length)
          add(`${field}.skillRanks`, 'Навыки ещё не сопоставлены с правилами кампании.');
        if (record(unit['position'])) {
          const position = unit['position'];
          const tile =
            record(initial['map']) && Array.isArray(initial['map']['tiles'])
              ? initial['map']['tiles'].find(
                  (tile: unknown) =>
                    record(tile) && tile['q'] === position['q'] && tile['r'] === position['r'],
                )
              : undefined;
          const key = `${position['q']},${position['r']}`;
          if (!tile || tile['blocked'] || positions.has(key))
            add(`${field}.position`, 'Клетка отсутствует, занята или непроходима.');
          positions.add(key);
        } else add(`${field}.position`, 'Нужны координаты q и r.');
      });
    }
  }
  if (!(multiside ? isMultisideBattle(initial) : isCustomBattle(initial)))
    add(
      'initial',
      multiside
        ? 'Проверьте 2–3 стороны, до 12 бойцов на стороне и до 6 в отряде игрока, карту и выходы.'
        : 'Проверьте состав (1–6 на сторону), полную карту 15×11, проходы и выходы.',
    );
  const unitLimit = multiside ? 36 : 12;
  if (!Array.isArray(value['resources']) || value['resources'].length > unitLimit)
    add('resources', `Ожидается не более ${unitLimit} наборов ресурсов.`);
  if (!Array.isArray(value['equipment']) || value['equipment'].length > unitLimit)
    add('equipment', `Ожидается не более ${unitLimit} комплектов.`);
  if (errors.length) return errors;
  try {
    createPlaygroundSetup(
      '00000000-0000-4000-8000-000000000000',
      value as unknown as PlaygroundScenario,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Недопустимые ресурсы.';
    const pool = /^(.+)\.initialPools\.(health|armor|stamina|morale)\b/u.exec(message);
    const index = pool
      ? (value['resources'] as PlaygroundScenario['resources']).findIndex(
          (item) => item.unitId === pool[1],
        )
      : -1;
    add(
      pool && index >= 0
        ? `resources[${index}].${pool[2]}`
        : message.startsWith('equipment')
          ? 'equipment'
          : 'resources',
      message,
    );
  }
  return errors;
}

export function isPlaygroundScenario(value: unknown): value is PlaygroundScenario {
  return preflightPlayground(value).length === 0;
}

/** Reuse fixture catalogue, then the same V2 admission and initializer as campaign combat. */
export function createPlaygroundSetup(
  id: string,
  scenario: PlaygroundScenario,
): combat.BattleSetupV2 | combat.BattleSetupV3 {
  const base =
    scenario.initial.version === 2
      ? createMultisideBattleSetup(id, scenario.initial)
      : createCustomBattleFixture(id, scenario.initial).originalSetup();
  const seen = new Set<string>();
  for (const pools of scenario.resources) {
    combat.invariant(
      record(pools) &&
        Object.keys(pools).length === 5 &&
        ['unitId', 'health', 'armor', 'stamina', 'morale'].every((key) =>
          Object.hasOwn(pools, key),
        ),
      'resources: неизвестные или отсутствующие поля',
    );
    combat.invariant(
      base.units.some((unit) => unit.id === pools.unitId) && !seen.has(pools.unitId),
      'resources.unitId: отсутствует или повторяется',
    );
    seen.add(pools.unitId);
  }
  const equipped = new Set<string>();
  for (const item of scenario.equipment) {
    combat.invariant(
      record(item) &&
        Object.keys(item).length === 2 &&
        Object.hasOwn(item, 'unitId') &&
        Object.hasOwn(item, 'weaponId') &&
        base.units.some((unit) => unit.id === item.unitId) &&
        !equipped.has(item.unitId) &&
        combat.M0_WEAPON_IDS.includes(item.weaponId),
      'equipment: неизвестный боец, повтор или оружие',
    );
    equipped.add(item.unitId);
  }
  if (base.schemaVersion === combat.COMBAT_V3_SCHEMA_VERSION)
    return combat.validateBattleSetupV3({
      ...base,
      units: base.units.map((unit) => playgroundUnit(unit, scenario)),
    });
  return combat.validateBattleSetupV2({
    ...base,
    schemaVersion: combat.COMBAT_V2_SCHEMA_VERSION,
    rulesetId: combat.M1_DOMAIN_BRIDGE_V5_RULESET_ID,
    units: base.units.map((unit) => playgroundUnit(unit, scenario)),
  });
}

function playgroundUnit<T extends combat.CombatUnitSetup>(unit: T, scenario: PlaygroundScenario) {
  const {
    trainedMelee: _trained,
    threatProfile: _threat,
    incorporeal: _incorporeal,
    ...rest
  } = unit;
  const pools = scenario.resources.find((value) => value.unitId === unit.id);
  return {
    ...rest,
    weaponId: scenario.equipment.find((item) => item.unitId === unit.id)?.weaponId ?? unit.weaponId,
    skillRanks: {},
    capabilities: { move: true, attack: true, defend: true, retreat: true },
    initialPools: pools
      ? { health: pools.health, armor: pools.armor, stamina: pools.stamina, morale: pools.morale }
      : {
          health: unit.attributes.health,
          armor: unit.attributes.armor,
          stamina: unit.attributes.stamina,
          morale: unit.attributes.morale,
        },
  };
}

export function inspectPlaygroundScenario(id: string, scenario: PlaygroundScenario) {
  const setup = createPlaygroundSetup(id, scenario);
  const started =
    setup.schemaVersion === combat.COMBAT_V3_SCHEMA_VERSION
      ? combat.startBattleV3(setup)
      : combat.startBattleV2(setup);
  return projectCombatLabView(
    id,
    setup.sides[0]!.id,
    started.state,
    started.events,
    scenario.initial,
  );
}

/** Fresh input fixtures only; never patch active state or force an outcome. */
export function playgroundDebugScenarios(): PlaygroundScenario[] {
  const base = legacyPlaygroundTemplate();
  const duel = {
    ...base,
    initial: {
      ...base.initial,
      units: [
        {
          id: 'fighter',
          profileId: 'W01',
          sideId: 'human' as const,
          position: { q: 3, r: 5 },
          skillRanks: {},
        },
        {
          id: 'enemy',
          profileId: 'W05',
          sideId: 'opponent' as const,
          position: { q: 4, r: 5 },
          skillRanks: {},
        },
      ],
    },
  };
  const named = (name: string, scenario: PlaygroundScenario): PlaygroundScenario => ({
    ...scenario,
    metadata: { name },
    initial: { ...scenario.initial, name },
  });
  const maximum = maximumMultisideBattle();
  return [
    named('Ближний и дальний бой', duel),
    named('Движение и препятствия', base),
    named('Низкая мораль', {
      ...duel,
      resources: [{ unitId: 'fighter', health: 80, armor: 36, stamina: 100, morale: 10 }],
    }),
    named('Отступление у края', {
      ...duel,
      initial: {
        ...duel.initial,
        units: duel.initial.units.map((unit) => ({
          ...unit,
          position: { ...unit.position, q: unit.sideId === 'human' ? 0 : 5 },
        })),
      },
    }),
    named('Ранения и смерть', {
      ...duel,
      resources: [{ unitId: 'enemy', health: 1, armor: 0, stamina: 100, morale: 65 }],
    }),
    named('JOIN: две группы при старте', base),
    named('Retry / reconnect / restart', duel),
    named('Три стороны по двенадцать бойцов', {
      ...playgroundTemplate(),
      initial: { ...maximum, units: maximum.units.map((unit) => ({ ...unit, skillRanks: {} })) },
    }),
  ];
}
