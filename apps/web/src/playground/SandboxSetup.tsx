import type { PlaygroundBootstrap, PlaygroundScenario } from '@warwrit/protocol';
import { validateMapDraft } from '../combat-lab/editor-model.js';
import { BattleEditor } from '../combat-lab/BattleEditor.js';

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

/** Keep malformed JSON in the text editor; never mount visual controls on unsafe shapes. */
export function isEditableScenario(value: unknown): value is PlaygroundScenario {
  if (!record(value) || value['schemaRevision'] !== 2 || !record(value['initial'])) return false;
  const initial = value['initial'];
  return (
    record(initial['map']) &&
    validateMapDraft({ version: 1, ...initial['map'] }).length === 0 &&
    typeof initial['name'] === 'string' &&
    Array.isArray(initial['units']) &&
    initial['units'].every(
      (unit) =>
        record(unit) &&
        typeof unit['id'] === 'string' &&
        typeof unit['profileId'] === 'string' &&
        typeof unit['sideId'] === 'string' &&
        record(unit['position']) &&
        typeof unit['position']['q'] === 'number' &&
        typeof unit['position']['r'] === 'number',
    ) &&
    Array.isArray(value['equipment']) &&
    value['equipment'].every(
      (item) =>
        record(item) && typeof item['unitId'] === 'string' && typeof item['weaponId'] === 'string',
    ) &&
    Array.isArray(value['resources']) &&
    value['resources'].every((pool) => record(pool) && typeof pool['unitId'] === 'string')
  );
}

export function SandboxSetup({
  scenario,
  bootstrap,
  disabled,
  onChange,
}: {
  readonly scenario: PlaygroundScenario;
  readonly bootstrap: PlaygroundBootstrap;
  readonly disabled: boolean;
  readonly onChange: (scenario: PlaygroundScenario) => void;
}) {
  const changeInitial: Parameters<typeof BattleEditor>[0]['onChange'] = (initial) =>
    onChange({
      ...scenario,
      initial,
      resources: scenario.resources.filter((pools) =>
        initial.units.some((unit) => unit.id === pools.unitId),
      ),
      equipment: scenario.equipment.filter((item) =>
        initial.units.some((unit) => unit.id === item.unitId),
      ),
    });
  return (
    <div className="sandbox-setup">
      <label>
        Диагностический сценарий{' '}
        <select
          disabled={disabled}
          value=""
          onChange={(event) => {
            const selected = bootstrap.debugScenarios[Number(event.target.value)];
            if (selected) onChange(structuredClone(selected));
          }}
        >
          <option value="">Выбрать новый draft…</option>
          {bootstrap.debugScenarios.map((item, index) => (
            <option key={item.metadata.name} value={index}>
              {item.metadata.name}
            </option>
          ))}
        </select>
      </label>
      <p>
        Правила: {scenario.rulesetId}. AI: текущий tactical chooser. День/ночь меняют только
        отображение. Навыки и особые силы, не сопоставленные с кампанией, недоступны.
      </p>
      <BattleEditor
        catalog={bootstrap.catalog}
        value={scenario.initial}
        disabled={disabled}
        onChange={changeInitial}
      />
      <details>
        <summary>Экипировка и начальные ресурсы</summary>
        <p>По умолчанию — максимум шаблона. Сервер проверяет каждый предел до Start.</p>
        {scenario.initial.units.map((unit) => (
          <fieldset key={unit.id} disabled={disabled}>
            <legend>
              {unit.id} ·{' '}
              {bootstrap.catalog.profiles.find((profile) => profile.id === unit.profileId)?.name}
            </legend>
            <label>
              Оружие{' '}
              <select
                value={scenario.equipment.find((item) => item.unitId === unit.id)?.weaponId ?? ''}
                onChange={(event) =>
                  onChange({
                    ...scenario,
                    equipment: [
                      ...scenario.equipment.filter((item) => item.unitId !== unit.id),
                      ...(event.target.value
                        ? [
                            {
                              unitId: unit.id,
                              weaponId: event.target
                                .value as PlaygroundScenario['equipment'][number]['weaponId'],
                            },
                          ]
                        : []),
                    ],
                  })
                }
              >
                <option value="">Из шаблона</option>
                {Object.entries({
                  'sword-shield': 'Меч и щит',
                  spear: 'Копьё',
                  bow: 'Лук',
                  raider: 'Топор/нож',
                  'great-weapon': 'Двуручное',
                }).map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            {(['health', 'armor', 'stamina', 'morale'] as const).map((pool) => {
              const defaults = bootstrap.catalog.profiles.find(
                (profile) => profile.id === unit.profileId,
              )?.maximumPools;
              const current =
                scenario.resources.find((item) => item.unitId === unit.id) ?? defaults;
              return (
                <label key={pool}>
                  {{ health: 'HP', armor: 'Броня', stamina: 'Силы', morale: 'Мораль' }[pool]}{' '}
                  <input
                    aria-label={`${unit.id} ${pool}`}
                    type="number"
                    step="1"
                    min={pool === 'health' || pool === 'morale' ? 1 : 0}
                    max={defaults?.[pool]}
                    disabled={disabled || !defaults}
                    value={current?.[pool] ?? ''}
                    onChange={(event) => {
                      if (!current) return;
                      onChange({
                        ...scenario,
                        resources: [
                          ...scenario.resources.filter((item) => item.unitId !== unit.id),
                          {
                            ...current,
                            unitId: unit.id,
                            [pool]:
                              event.target.value === '' ? Number.NaN : Number(event.target.value),
                          },
                        ],
                      });
                    }}
                  />
                </label>
              );
            })}
            <button
              disabled={disabled}
              onClick={() =>
                onChange({
                  ...scenario,
                  resources: scenario.resources.filter((item) => item.unitId !== unit.id),
                })
              }
            >
              Ресурсы из шаблона
            </button>
          </fieldset>
        ))}
      </details>
    </div>
  );
}
