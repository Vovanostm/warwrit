import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, KeyboardEvent, PointerEvent } from 'react';
import type {
  CombatLabBattleConfig,
  CombatLabCatalog,
  CombatLabHex,
  CombatLabTile,
  CombatLabCustomUnit,
} from '@warwrit/protocol';
import {
  editorSkills,
  createEmptyTiles,
  paintBattleTile,
  placeBattleUnit,
  removeBattleUnit,
  toMapDraft,
  validateBattleDraft,
  validateMapDraft,
} from './editor-model.js';
import type { TilePatch } from './editor-model.js';
import './battle-editor.css';

export interface BattleEditorProps {
  readonly catalog: CombatLabCatalog;
  readonly value: CombatLabBattleConfig;
  readonly onChange: (value: CombatLabBattleConfig) => void;
  readonly disabled?: boolean;
}

type Brush =
  | 'plain'
  | 'mud'
  | 'fire'
  | 'blocked'
  | 'clear-blocked'
  | 'height-0'
  | 'height-1'
  | 'height-2'
  | 'place';
type SavedDrafts = Record<string, CombatLabBattleConfig>;

const storageKey = 'warwrit.combat-lab.drafts.v1';
const hexKey = ({ q, r }: CombatLabHex) => `${q},${r}`;
const center = ({ q, r }: CombatLabHex): [number, number] => [
  Math.sqrt(3) * 21 * (q + r / 2),
  31.5 * r,
];
const radius = 21;
const corners = Array.from({ length: 6 }, (_, index) => {
  const angle = ((60 * index - 30) * Math.PI) / 180;
  return `${radius * Math.cos(angle)},${radius * Math.sin(angle)}`;
}).join(' ');

function tileClass(tile: CombatLabTile): string {
  return `battle-editor-cell terrain-${tile.terrain}${tile.blocked ? ' blocked' : ''} height-${tile.height}`;
}

function downloadJson(filename: string, value: unknown): void {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function readSavedDrafts(): SavedDrafts {
  const raw = localStorage.getItem(storageKey);
  if (raw === null) return {};
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return parsed as SavedDrafts;
}

function cellFromEvent(event: { target: EventTarget | null }): CombatLabHex | null {
  if (!(event.target instanceof Element)) return null;
  const cell = event.target.closest<SVGGElement>('[data-editor-cell]');
  if (cell === null) return null;
  const q = Number(cell.getAttribute('data-q'));
  const r = Number(cell.getAttribute('data-r'));
  return Number.isInteger(q) && Number.isInteger(r) ? { q, r } : null;
}

function nextDraftName(units: readonly CombatLabCustomUnit[], side: string): string {
  const existing = new Set(units.map((unit) => unit.id));
  let suffix = 1;
  while (existing.has(`${side}-${suffix}`)) suffix += 1;
  return `${side}-${suffix}`;
}

/** Local battle and map draft editor; all imports are validated before onChange. */
export function BattleEditor({ catalog, value, onChange, disabled = false }: BattleEditorProps) {
  const [brush, setBrush] = useState<Brush>('plain');
  const [inspectedHex, setInspectedHex] = useState<CombatLabHex | null>(null);
  const [sideId, setSideId] = useState<CombatLabCustomUnit['sideId']>('human');
  const [profileId, setProfileId] = useState(catalog.profiles[0]?.id ?? '');
  const [savedDrafts, setSavedDrafts] = useState<SavedDrafts>({});
  const [savedName, setSavedName] = useState('');
  const [notice, setNotice] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const battleInput = useRef<HTMLInputElement>(null);
  const mapInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const drafts = readSavedDrafts();
      const valid: SavedDrafts = {};
      for (const [name, draft] of Object.entries(drafts)) {
        if (validateBattleDraft(draft, catalog).length === 0) valid[name] = draft;
      }
      setSavedDrafts(valid);
      if (Object.keys(drafts).length !== Object.keys(valid).length) {
        localStorage.setItem(storageKey, JSON.stringify(valid));
      }
    } catch (error) {
      setNotice(`Не удалось прочитать локальные черновики: ${errorMessage(error)}`);
    }
  }, [catalog]);

  const errors = validateBattleDraft(value, catalog);
  const sortedTiles = [...value.map.tiles].sort((a, b) => a.r - b.r || a.q - b.q);
  const points = sortedTiles.map(center);
  const left = Math.min(0, ...points.map(([x]) => x)) - 25;
  const top = Math.min(0, ...points.map(([, y]) => y)) - 25;
  const width = Math.max(0, ...points.map(([x]) => x)) + 25 - left;
  const height = Math.max(0, ...points.map(([, y]) => y)) + 25 - top;
  const unitsAt = new Map(value.units.map((unit) => [hexKey(unit.position), unit]));

  function change(patch: Partial<CombatLabBattleConfig>): void {
    onChange({ ...value, ...patch });
    setImportErrors([]);
  }

  function setTile(hex: CombatLabHex): void {
    const tile = value.map.tiles.find(
      (candidate) => candidate.q === hex.q && candidate.r === hex.r,
    );
    if (tile === undefined) return;
    setInspectedHex(hex);
    if (brush === 'place') {
      if (tile.blocked) {
        setNotice(`Клетка ${hexKey(hex)} занята препятствием.`);
        return;
      }
      const placed = placeBattleUnit(value.units, profileId, sideId, hex);
      if (placed === null) {
        setNotice(`Нельзя поставить бойца: клетка занята или сторона уже набрала 6 участников.`);
        return;
      }
      change({ units: placed });
      setNotice(`Боец ${nextDraftName(value.units, sideId)} размещён на ${hexKey(hex)}.`);
      return;
    }
    let patch: TilePatch;
    if (brush === 'blocked') patch = { blocked: true };
    else if (brush === 'clear-blocked') patch = { blocked: false };
    else if (brush.startsWith('height-')) {
      patch = { height: Number(brush.at(-1)) as CombatLabTile['height'] };
    } else patch = { terrain: brush as CombatLabTile['terrain'] };
    if (
      patch.blocked === true &&
      value.units.some((unit) => hexKey(unit.position) === hexKey(hex))
    ) {
      setNotice('Сначала уберите бойца с клетки, затем отметьте препятствие.');
      return;
    }
    const tiles = paintBattleTile(value.map.tiles, hex, patch);
    change({ map: { ...value.map, tiles } });
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>): void {
    const hex = cellFromEvent(event);
    if (hex === null || disabled) return;
    event.preventDefault();
    setTile(hex);
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>): void {
    if (event.buttons !== 1 || brush === 'place' || disabled) return;
    const hex = cellFromEvent(event);
    if (hex !== null) setTile(hex);
  }

  function handleCellKey(event: KeyboardEvent<SVGGElement>, hex: CombatLabHex): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setTile(hex);
    }
  }

  function saveDraft(): void {
    const validation = validateBattleDraft(value, catalog);
    if (validation.length > 0) {
      setImportErrors(validation);
      setNotice('Сохранение недоступно: исправьте ошибки состава и карты.');
      return;
    }
    const name = value.name.trim();
    try {
      const next = { ...readSavedDrafts(), [name]: value };
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSavedDrafts(next);
      setSavedName(name);
      setNotice(`Черновик «${name}» сохранён только в этом браузере.`);
    } catch (error) {
      setNotice(`Не удалось сохранить черновик в браузере: ${errorMessage(error)}`);
    }
  }

  function loadDraft(name: string): void {
    const draft = savedDrafts[name];
    if (draft === undefined) return;
    const validation = validateBattleDraft(draft, catalog);
    if (validation.length > 0) {
      setImportErrors(validation);
      setNotice('Сохранённый черновик повреждён и не загружен.');
      return;
    }
    onChange(draft);
    setSavedName(name);
    setImportErrors([]);
    setNotice(`Загружен локальный черновик «${name}».`);
  }

  function deleteDraft(): void {
    if (!savedName || !(savedName in savedDrafts)) return;
    try {
      const next = { ...savedDrafts };
      delete next[savedName];
      localStorage.setItem(storageKey, JSON.stringify(next));
      setSavedDrafts(next);
      setSavedName('');
      setNotice(`Локальный черновик «${savedName}» удалён.`);
    } catch (error) {
      setNotice(`Не удалось удалить локальный черновик: ${errorMessage(error)}`);
    }
  }

  async function importFile(
    event: ChangeEvent<HTMLInputElement>,
    kind: 'battle' | 'map',
  ): Promise<void> {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file === undefined) return;
    try {
      const data: unknown = JSON.parse(await file.text());
      if (kind === 'battle') {
        const validation = validateBattleDraft(data, catalog);
        if (validation.length > 0) {
          setImportErrors(validation);
          setNotice('Импорт отменён: файл боя не прошёл проверку.');
          return;
        }
        onChange(data as CombatLabBattleConfig);
        setImportErrors([]);
        setNotice(`Бой «${(data as CombatLabBattleConfig).name}» загружен из JSON.`);
        return;
      }
      const validation = validateMapDraft(data);
      if (validation.length > 0) {
        setImportErrors(validation);
        setNotice('Импорт отменён: карта должна содержать полную сетку 15×11.');
        return;
      }
      const map = data as { name: string; tiles: readonly CombatLabTile[] };
      const next = { ...value, map: { name: map.name, tiles: map.tiles } };
      const battleErrors = validateBattleDraft(next, catalog);
      if (battleErrors.length > 0) {
        setImportErrors(battleErrors);
        setNotice('Импорт отменён: новые препятствия пересекаются с бойцами.');
        return;
      }
      onChange(next);
      setImportErrors([]);
      setNotice(`Карта «${map.name}» импортирована; состав боя сохранён.`);
    } catch (error) {
      setNotice(`Не удалось прочитать JSON: ${errorMessage(error)}`);
    }
  }

  function clearMap(): void {
    const tiles = createEmptyTiles();
    change({ map: { name: 'Чистое поле', tiles } });
    setNotice('Карта очищена; состав боя оставлен.');
  }

  function resetDefault(): void {
    onChange(catalog.defaultBattle);
    setImportErrors([]);
    setNotice(`Восстановлен сценарий «${catalog.defaultBattle.name}».`);
  }

  return (
    <section className="battle-editor" aria-label="Редактор черновика боя">
      <header className="battle-editor-heading">
        <div>
          <p className="battle-editor-eyebrow">Локальный конструктор · без кампании</p>
          <h2>Черновик боя</h2>
          <p>Состав, поле и seed редактируются до запуска. Здесь бой не симулируется.</p>
        </div>
        <div className="battle-editor-files">
          <button
            type="button"
            disabled={disabled}
            onClick={() => downloadJson('warwrit-battle.json', value)}
          >
            Экспорт боя
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => downloadJson('warwrit-map.json', toMapDraft(value))}
          >
            Экспорт карты
          </button>
          <button type="button" disabled={disabled} onClick={() => battleInput.current?.click()}>
            Импорт боя
          </button>
          <button type="button" disabled={disabled} onClick={() => mapInput.current?.click()}>
            Импорт карты
          </button>
          <input
            ref={battleInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => void importFile(event, 'battle')}
          />
          <input
            ref={mapInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => void importFile(event, 'map')}
          />
        </div>
      </header>

      <div className="battle-editor-layout">
        <section className="battle-editor-board-panel" aria-label="Поле боя 15 на 11">
          <div className="battle-editor-board-title">
            <label>
              Карта
              <input
                value={value.map.name}
                maxLength={80}
                disabled={disabled}
                onChange={(event) => change({ map: { ...value.map, name: event.target.value } })}
              />
            </label>
            <span>15 × 11 · нажмите или ведите кистью</span>
          </div>
          <svg
            className="battle-editor-board"
            viewBox={`${left} ${top} ${width} ${height}`}
            role="group"
            aria-label="Поле для рисования и размещения бойцов"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
          >
            {sortedTiles.map((tile) => {
              const hex = { q: tile.q, r: tile.r };
              const [x, y] = center(hex);
              const unit = unitsAt.get(hexKey(hex));
              const sideName = unit?.sideId === 'human' ? 'свои' : 'противник';
              const profile = catalog.profiles.find(({ id }) => id === unit?.profileId);
              return (
                <g
                  key={hexKey(hex)}
                  data-editor-cell="true"
                  data-q={tile.q}
                  data-r={tile.r}
                  data-selected={inspectedHex?.q === tile.q && inspectedHex.r === tile.r}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-label={`Клетка ${tile.q}, ${tile.r}: ${tile.terrain}, высота ${tile.height}${tile.blocked ? ', препятствие' : ''}${unit ? `, ${sideName}: ${profile?.name ?? unit.profileId}` : ''}`}
                  onKeyDown={(event) => handleCellKey(event, hex)}
                >
                  <title>{`Клетка ${tile.q}, ${tile.r}: ${tile.terrain}, высота ${tile.height}`}</title>
                  <polygon
                    className={tileClass(tile)}
                    points={corners}
                    transform={`translate(${x} ${y})`}
                  />
                  <text
                    className="battle-editor-coordinate"
                    x={x}
                    y={y + 3}
                  >{`${tile.q},${tile.r}`}</text>
                  {unit && (
                    <g
                      className={`battle-editor-unit ${unit.sideId}`}
                      transform={`translate(${x} ${y - 10})`}
                    >
                      <circle r="11" />
                      <text y="4">{profile?.kind === 'creature' ? 'Т' : 'Б'}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
          {inspectedHex && (
            <p className="battle-editor-inspector" role="status">
              Выбрана клетка {inspectedHex.q}, {inspectedHex.r} · высота{' '}
              {
                value.map.tiles.find(
                  (tile) => tile.q === inspectedHex.q && tile.r === inspectedHex.r,
                )?.height
              }
            </p>
          )}
          <div className="battle-editor-legend" aria-label="Условные обозначения">
            <span>
              <i className="legend-plain" />
              Ровное поле
            </span>
            <span>
              <i className="legend-mud" />
              Грязь
            </span>
            <span>
              <i className="legend-fire" />
              Огонь
            </span>
            <span>
              <i className="legend-blocked" />
              Препятствие
            </span>
            <span>
              <i className="legend-height" />
              Высота 1 / 2
            </span>
            <span>
              <i className="legend-human" />
              Свои
            </span>
            <span>
              <i className="legend-opponent" />
              Противник
            </span>
          </div>
        </section>

        <aside className="battle-editor-controls">
          <fieldset disabled={disabled}>
            <legend>Кисть карты</legend>
            <div className="battle-editor-brushes">
              {(
                [
                  ['plain', 'Ровное поле'],
                  ['mud', 'Грязь'],
                  ['fire', 'Огонь'],
                  ['blocked', 'Препятствие'],
                  ['clear-blocked', 'Убрать препятствие'],
                  ['height-0', 'Высота 0'],
                  ['height-1', 'Высота 1'],
                  ['height-2', 'Высота 2'],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={brush === id}
                  onClick={() => setBrush(id)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p>Кисти задают или снимают препятствие; рисование можно вести удержанием кнопки.</p>
          </fieldset>

          <fieldset disabled={disabled}>
            <legend>Расстановка</legend>
            <label>
              Сторона
              <select
                value={sideId}
                onChange={(event) => setSideId(event.target.value as CombatLabCustomUnit['sideId'])}
              >
                <option value="human">Свои</option>
                <option value="opponent">Противник</option>
              </select>
            </label>
            <label>
              Боец из каталога
              <select value={profileId} onChange={(event) => setProfileId(event.target.value)}>
                {catalog.profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              aria-pressed={brush === 'place'}
              onClick={() => setBrush(brush === 'place' ? 'plain' : 'place')}
            >
              {brush === 'place' ? 'Выберите клетку для бойца…' : 'Режим размещения бойца'}
            </button>
            <p>
              {value.units.filter((unit) => unit.sideId === sideId).length} / 6 на выбранной
              стороне. Клик по бойцу в списке снимет его с поля.
            </p>
            <ul className="battle-editor-unit-list">
              {value.units.map((unit) => {
                const profile = catalog.profiles.find(({ id }) => id === unit.profileId);
                return (
                  <li key={unit.id}>
                    <span>
                      <b>{unit.sideId === 'human' ? 'Свои' : 'Противник'}</b> ·{' '}
                      {profile?.name ?? unit.profileId} · {hexKey(unit.position)}
                    </span>
                    <div
                      className="battle-editor-skills"
                      aria-label={`Изученные приёмы: ${profile?.name ?? unit.id}`}
                    >
                      {editorSkills.map(([skillId, label]) => (
                        <label key={skillId}>
                          {label}
                          <select
                            aria-label={`${label}: ${unit.id}`}
                            value={unit.skillRanks?.[skillId] ?? 0}
                            onChange={(event) => {
                              const rank = Number(event.target.value);
                              const skillRanks = { ...unit.skillRanks };
                              if (rank === 0) delete skillRanks[skillId];
                              else skillRanks[skillId] = rank as 1 | 2 | 3;
                              change({
                                units: value.units.map((candidate) =>
                                  candidate.id === unit.id
                                    ? { ...candidate, skillRanks }
                                    : candidate,
                                ),
                              });
                            }}
                          >
                            <option value={0}>Не изучен</option>
                            {[1, 2, 3].map((rank) => (
                              <option key={rank} value={rank}>
                                Ранг {rank}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                    </div>
                    <button
                      type="button"
                      aria-label={`Убрать ${profile?.name ?? unit.id}`}
                      onClick={() => change({ units: removeBattleUnit(value.units, unit.id) })}
                    >
                      Убрать
                    </button>
                  </li>
                );
              })}
            </ul>
          </fieldset>
        </aside>
      </div>

      <section className="battle-editor-meta" aria-label="Параметры и локальные черновики">
        <label>
          Название боя
          <input
            value={value.name}
            maxLength={80}
            disabled={disabled}
            onChange={(event) => change({ name: event.target.value })}
          />
        </label>
        <label>
          Seed
          <input
            type="number"
            min={0}
            max={4294967295}
            step={1}
            value={value.seed}
            disabled={disabled}
            onChange={(event) => change({ seed: Number(event.target.value) })}
          />
        </label>
        <button type="button" disabled={disabled} onClick={saveDraft}>
          Сохранить локально
        </button>
        <label>
          Мои черновики
          <select
            disabled={disabled || Object.keys(savedDrafts).length === 0}
            value={savedName}
            onChange={(event) => loadDraft(event.target.value)}
          >
            <option value="">Выберите сохранение</option>
            {Object.keys(savedDrafts)
              .sort()
              .map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
          </select>
        </label>
        <button
          type="button"
          disabled={disabled || !savedName}
          onClick={() => loadDraft(savedName)}
        >
          Загрузить черновик
        </button>
        <button type="button" disabled={disabled || !savedName} onClick={deleteDraft}>
          Удалить сохранение
        </button>
        <button type="button" disabled={disabled} onClick={clearMap}>
          Очистить карту
        </button>
        <button type="button" disabled={disabled} onClick={resetDefault}>
          Сбросить на сценарий мельницы
        </button>
      </section>
      <p className="battle-editor-local-note">
        Сохранения остаются в этом браузере и на этом устройстве; в кампанию они не попадают.
      </p>
      {errors.length > 0 && (
        <section className="battle-editor-errors" role="alert" aria-label="Ошибки перед запуском">
          <h3>Нельзя запустить этот черновик</h3>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      )}
      {errors.length === 0 && (
        <p className="battle-editor-ready" role="status">
          Черновик можно отправить на запуск; сервер повторит проверку перед созданием боя.
        </p>
      )}
      {importErrors.length > 0 && (
        <section className="battle-editor-errors" role="alert" aria-label="Ошибки импорта">
          <h3>Файл не применён</h3>
          <ul>
            {importErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      )}
      {notice && (
        <p className="battle-editor-notice" role="status">
          {notice}
        </p>
      )}
    </section>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'неизвестная ошибка хранилища';
}
