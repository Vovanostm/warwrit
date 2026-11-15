import type {
  CombatLabBattleConfigV2,
  PlaygroundBootstrap,
  PlaygroundScenario,
  VersionedCombatLabBattleConfig,
} from '@warwrit/protocol';
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
        (initial['version'] !== 2 || typeof unit['partyId'] === 'string') &&
        record(unit['position']) &&
        typeof unit['position']['q'] === 'number' &&
        typeof unit['position']['r'] === 'number',
    ) &&
    (initial['version'] !== 2 ||
      (Array.isArray(initial['sides']) &&
        Array.isArray(initial['parties']) &&
        initial['sides'].every((side) => record(side) && typeof side['id'] === 'string') &&
        initial['parties'].every(
          (party) =>
            record(party) &&
            typeof party['id'] === 'string' &&
            typeof party['sideId'] === 'string' &&
            ['player', 'npc'].includes(String(party['kind'])),
        ))) &&
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
  const changeInitial = (initial: VersionedCombatLabBattleConfig) =>
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
      {scenario.initial.version === 2 ? (
        <MultisideBattleEditor
          catalog={bootstrap.catalog}
          value={scenario.initial}
          disabled={disabled}
          onChange={changeInitial}
        />
      ) : (
        <BattleEditor
          catalog={bootstrap.catalog}
          value={scenario.initial}
          disabled={disabled}
          onChange={changeInitial}
        />
      )}
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

export function MultisideBattleEditor({
  catalog,
  value,
  disabled,
  onChange,
}: {
  readonly catalog: PlaygroundBootstrap['catalog'];
  readonly value: CombatLabBattleConfigV2;
  readonly disabled: boolean;
  readonly onChange: (value: VersionedCombatLabBattleConfig) => void;
}) {
  const errors: string[] = [];
  if (value.sides.length < 2 || value.sides.length > 3) errors.push('Нужно от 2 до 3 сторон.');
  if (value.units.length > 36) errors.push('В бою может быть не более 36 бойцов.');
  if (new Set(value.sides.map((side) => side.id)).size !== value.sides.length)
    errors.push('ID сторон должны быть уникальными.');
  if (new Set(value.parties.map((party) => party.id)).size !== value.parties.length)
    errors.push('ID отрядов должны быть уникальными.');
  if (new Set(value.units.map((unit) => unit.id)).size !== value.units.length)
    errors.push('ID бойцов должны быть уникальными.');
  if (validateMapDraft({ version: 1, ...value.map }).length)
    errors.push('Карта должна содержать все 165 корректных клеток поля 15×11.');
  const occupied = new Set<string>();
  for (const side of value.sides) {
    const count = value.units.filter((unit) => unit.sideId === side.id).length;
    if (count < 1 || count > 12)
      errors.push(`Сторона ${side.id}: от 1 до 12 бойцов (сейчас ${count}).`);
    if (!side.retreatHexes.length) errors.push(`У стороны ${side.id} не задана область отхода.`);
    for (const hex of side.retreatHexes) {
      if (
        !Number.isInteger(hex.q) ||
        !Number.isInteger(hex.r) ||
        hex.q < 0 ||
        hex.q >= 15 ||
        hex.r < 0 ||
        hex.r >= 11 ||
        value.map.tiles.find((tile) => tile.q === hex.q && tile.r === hex.r)?.blocked
      )
        errors.push(`Сторона ${side.id}: клетка отхода ${hex.q},${hex.r} не подходит.`);
    }
  }
  for (const party of value.parties) {
    if (!value.sides.some((side) => side.id === party.sideId))
      errors.push(`Отряд ${party.id}: неизвестная сторона.`);
    const count = value.units.filter((unit) => unit.partyId === party.id).length;
    if (party.kind === 'player' && count > 6)
      errors.push(`Отряд игрока ${party.id}: не более 6 бойцов.`);
    if (count > 12) errors.push(`Отряд ${party.id}: не более 12 бойцов.`);
  }
  for (const unit of value.units) {
    if (!value.parties.some((party) => party.id === unit.partyId && party.sideId === unit.sideId))
      errors.push(`Боец ${unit.id}: отряд должен принадлежать указанной стороне.`);
    if (Object.keys(unit.skillRanks ?? {}).length)
      errors.push(`Боец ${unit.id}: тактические навыки пока не поддерживаются.`);
    const { q, r } = unit.position;
    const key = `${q},${r}`;
    if (!Number.isInteger(q) || !Number.isInteger(r) || q < 0 || q >= 15 || r < 0 || r >= 11)
      errors.push(`Боец ${unit.id}: позиция должна быть внутри поля 15×11.`);
    if (occupied.has(key)) errors.push(`Клетка ${key} занята несколькими бойцами.`);
    occupied.add(key);
    if (value.map.tiles.find((tile) => tile.q === q && tile.r === r)?.blocked)
      errors.push(`Боец ${unit.id}: клетка ${key} занята препятствием.`);
  }
  const patch = (next: Partial<CombatLabBattleConfigV2>) => onChange({ ...value, ...next });
  const addSide = () => {
    if (value.sides.length >= 3) return;
    let n = 1;
    while (value.sides.some((side) => side.id === `side-${n}`)) n++;
    const id = `side-${n}`;
    patch({
      sides: [...value.sides, { id, retreatHexes: [] }],
      parties: [...value.parties, { id: `${id}-party`, sideId: id, kind: 'npc' }],
    });
  };
  const addParty = (sideId: string, kind: 'player' | 'npc') => {
    let n = 1;
    while (value.parties.some((party) => party.id === `${sideId}-party-${n}`)) n++;
    patch({ parties: [...value.parties, { id: `${sideId}-party-${n}`, sideId, kind }] });
  };
  const addUnit = (partyId: string) => {
    const party = value.parties.find((candidate) => candidate.id === partyId);
    if (!party || value.units.length >= 36) return;
    let n = 1;
    while (value.units.some((unit) => unit.id === `${partyId}-${n}`)) n++;
    const tile = value.map.tiles.find(
      (candidate) =>
        !candidate.blocked &&
        !value.units.some(
          (unit) => unit.position.q === candidate.q && unit.position.r === candidate.r,
        ),
    );
    if (!tile) return;
    patch({
      units: [
        ...value.units,
        {
          id: `${partyId}-${n}`,
          profileId: catalog.profiles[0]?.id ?? '',
          sideId: party.sideId,
          partyId,
          position: { q: tile.q, r: tile.r },
          skillRanks: {},
        },
      ],
    });
  };
  return (
    <section className="multiside-editor" aria-label="Редактор боя с несколькими сторонами">
      <header>
        <h2>Состав боя · версия 2</h2>
        <p>Стороны, отряды, контроль и позиции сохраняются в сценарии целиком.</p>
      </header>
      <label>
        Название боя{' '}
        <input
          disabled={disabled}
          value={value.name}
          onChange={(e) => patch({ name: e.target.value })}
        />
      </label>
      <label>
        Seed{' '}
        <input
          disabled={disabled}
          type="number"
          min="0"
          max="4294967295"
          value={value.seed}
          onChange={(e) => patch({ seed: Number(e.target.value) })}
        />
      </label>
      <button type="button" disabled={disabled || value.sides.length >= 3} onClick={addSide}>
        Добавить сторону
      </button>
      <div className="multiside-editor-grid">
        {value.sides.map((side) => (
          <fieldset key={side.id} disabled={disabled}>
            <legend>
              Сторона{' '}
              <input
                aria-label="ID стороны"
                value={side.id}
                onChange={(e) =>
                  patch({
                    sides: value.sides.map((item) =>
                      item.id === side.id ? { ...item, id: e.target.value } : item,
                    ),
                    parties: value.parties.map((party) =>
                      party.sideId === side.id ? { ...party, sideId: e.target.value } : party,
                    ),
                    units: value.units.map((unit) =>
                      unit.sideId === side.id ? { ...unit, sideId: e.target.value } : unit,
                    ),
                  })
                }
              />
            </legend>
            <label>
              Клетки отхода (q,r через пробел)
              <input
                aria-label={`${side.id} клетки отхода`}
                value={side.retreatHexes.map(({ q, r }) => `${q},${r}`).join(' ')}
                onChange={(e) =>
                  patch({
                    sides: value.sides.map((item) =>
                      item.id !== side.id
                        ? item
                        : {
                            ...item,
                            retreatHexes: e.target.value
                              .trim()
                              .split(/\s+/)
                              .filter(Boolean)
                              .flatMap((pair) => {
                                const [q, r] = pair.split(',').map(Number);
                                return q !== undefined &&
                                  r !== undefined &&
                                  Number.isInteger(q) &&
                                  Number.isInteger(r)
                                  ? [{ q, r }]
                                  : [];
                              }),
                          },
                    ),
                  })
                }
              />
            </label>
            <button
              type="button"
              disabled={value.sides.length <= 2}
              onClick={() => {
                patch({
                  sides: value.sides.filter((item) => item.id !== side.id),
                  parties: value.parties.filter((party) => party.sideId !== side.id),
                  units: value.units.filter((unit) => unit.sideId !== side.id),
                });
              }}
            >
              Убрать сторону и её состав
            </button>
            {value.parties
              .filter((party) => party.sideId === side.id)
              .map((party) => (
                <fieldset key={party.id} className="multiside-editor-party">
                  <legend>Отряд</legend>
                  <label>
                    ID{' '}
                    <input
                      value={party.id}
                      onChange={(e) =>
                        patch({
                          parties: value.parties.map((item) =>
                            item.id === party.id ? { ...item, id: e.target.value } : item,
                          ),
                          units: value.units.map((unit) =>
                            unit.partyId === party.id ? { ...unit, partyId: e.target.value } : unit,
                          ),
                        })
                      }
                    />
                  </label>
                  <label>
                    Вид{' '}
                    <select
                      value={party.kind}
                      onChange={(e) =>
                        patch({
                          parties: value.parties.map((item) =>
                            item.id === party.id
                              ? { ...item, kind: e.target.value as 'player' | 'npc' }
                              : item,
                          ),
                        })
                      }
                    >
                      <option value="npc">NPC</option>
                      <option value="player">Игрок</option>
                    </select>
                  </label>
                  <label>
                    Сторона{' '}
                    <select
                      value={party.sideId}
                      onChange={(e) =>
                        patch({
                          parties: value.parties.map((item) =>
                            item.id === party.id ? { ...item, sideId: e.target.value } : item,
                          ),
                          units: value.units.map((unit) =>
                            unit.partyId === party.id ? { ...unit, sideId: e.target.value } : unit,
                          ),
                        })
                      }
                    >
                      {value.sides.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.id}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Контролёр ID{' '}
                    <input
                      value={party.controllerId ?? ''}
                      onChange={(e) =>
                        patch({
                          parties: value.parties.map((item) =>
                            item.id === party.id
                              ? (() => {
                                  const { controllerId: _controllerId, ...withoutController } =
                                    item;
                                  return e.target.value
                                    ? { ...item, controllerId: e.target.value }
                                    : withoutController;
                                })()
                              : item,
                          ),
                        })
                      }
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => addUnit(party.id)}
                    disabled={value.units.length >= 36}
                  >
                    Добавить бойца
                  </button>
                  {value.units
                    .filter((unit) => unit.partyId === party.id)
                    .map((unit) => (
                      <div className="multiside-editor-unit" key={unit.id}>
                        <label>
                          ID{' '}
                          <input
                            aria-label="ID бойца"
                            value={unit.id}
                            onChange={(e) =>
                              patch({
                                units: value.units.map((item) =>
                                  item.id === unit.id ? { ...item, id: e.target.value } : item,
                                ),
                              })
                            }
                          />
                        </label>
                        <label>
                          Профиль{' '}
                          <select
                            value={unit.profileId}
                            onChange={(e) =>
                              patch({
                                units: value.units.map((item) =>
                                  item.id === unit.id
                                    ? { ...item, profileId: e.target.value }
                                    : item,
                                ),
                              })
                            }
                          >
                            {catalog.profiles.map((profile) => (
                              <option key={profile.id} value={profile.id}>
                                {profile.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          Клетка q,r{' '}
                          <input
                            aria-label="Позиция бойца"
                            value={`${unit.position.q},${unit.position.r}`}
                            onChange={(e) => {
                              const [q, r] = e.target.value.split(',').map(Number);
                              if (
                                q !== undefined &&
                                r !== undefined &&
                                Number.isInteger(q) &&
                                Number.isInteger(r)
                              )
                                patch({
                                  units: value.units.map((item) =>
                                    item.id === unit.id ? { ...item, position: { q, r } } : item,
                                  ),
                                });
                            }}
                          />
                        </label>
                        {Object.keys(unit.skillRanks ?? {}).length > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              patch({
                                units: value.units.map((item) =>
                                  item.id === unit.id ? { ...item, skillRanks: {} } : item,
                                ),
                              })
                            }
                          >
                            Очистить неподдерживаемые навыки
                          </button>
                        )}
                        <button
                          type="button"
                          aria-label={`Убрать бойца ${unit.id}`}
                          onClick={() =>
                            patch({ units: value.units.filter((item) => item.id !== unit.id) })
                          }
                        >
                          Убрать
                        </button>
                      </div>
                    ))}
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        parties: value.parties.filter((item) => item.id !== party.id),
                        units: value.units.filter((unit) => unit.partyId !== party.id),
                      })
                    }
                  >
                    Убрать отряд и бойцов
                  </button>
                </fieldset>
              ))}
            <button type="button" onClick={() => addParty(side.id, 'npc')}>
              Добавить NPC отряд
            </button>
            <button type="button" onClick={() => addParty(side.id, 'player')}>
              Добавить отряд игрока
            </button>
          </fieldset>
        ))}
      </div>
      {errors.length > 0 && (
        <section role="alert">
          <b>Черновик сохранён, но перед запуском нужны исправления:</b>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      )}
      <p>
        Карта: {value.map.name} · 15 × 11. Полный сценарий можно сохранить, загрузить и перенести
        через JSON редактор ниже.
      </p>
    </section>
  );
}
