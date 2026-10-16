import { CombatIcon } from './CombatIcon.js';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type {
  CombatLabAction,
  CombatLabHex,
  CombatLabView,
  CombatLabSkillId,
} from '@warwrit/protocol';
import { spriteForUnit } from './sprite-art.js';
import { mountSpriteBattleScene, type BattleFieldTarget } from './sprite-battle-scene.js';
import './battle-view.css';
import './battle-controls.css';

export interface BattleViewProps {
  readonly view: CombatLabView;
  readonly selectedUnitId: string | null;
  readonly selectedHex: CombatLabHex | null;
  readonly onSelectUnit: (id: string) => void;
  readonly onSelectHex: (hex: CombatLabHex) => void;
  readonly children?: ReactNode;
  readonly menu?: ReactNode;
  readonly onRefusal?: (reason: string) => void;
  readonly onAct?: (action: CombatLabAction['intent']) => void;
  readonly onRestart?: () => void;
  readonly onEditor?: () => void;
  readonly busy?: boolean;
  readonly selectedSkillId?: CombatLabSkillId | null;
  readonly onSelectSkill?: (id: CombatLabSkillId) => void;
  readonly skillDisabledReason?: string;
}

const unitStatus = {
  active: 'В строю',
  dead: 'Погиб',
  retreated: 'Отступил',
  surrendered: 'Сдался',
};
const poolLabels = {
  health: 'Здоровье',
  armor: 'Броня',
  stamina: 'Силы',
  morale: 'Мораль',
};
const eventLabels: Record<string, string> = {
  'skill.used': 'Приём применён',
  'battle.started': 'Бой начался',
  'round.started': 'Новый раунд',
  'activation.started': 'Ход бойца',
  'activation.ended': 'Активация завершена',
  'unit.moved': 'Перемещение',
  'attack.resolved': 'Атака',
  'unit.damaged': 'Получен урон',
  'unit.fire-damaged': 'Урон от огня',
  'unit.wounded': 'Ранение',
  'unit.died': 'Погиб',
  'unit.defended': 'Защита',
  'unit.retreated': 'Отступил',
  'unit.surrendered': 'Сдался',
  'threat.prepared': 'Готовит тяжёлый удар',
  'threat.retargeted': 'Изменил цель тяжёлого удара',
  'threat.cancelled': 'Тяжёлый удар отменён',
  'threat.executed': 'Тяжёлый удар',
  'unit.morale-changed': 'Изменилась мораль',
  'battle.resolved': 'Бой завершён',
};

const damageRange = ({
  minimum,
  maximum,
}: {
  readonly minimum: number;
  readonly maximum: number;
}) => (minimum === maximum ? `${minimum}` : `${minimum}–${maximum}`);

function eventText(view: CombatLabView, event: CombatLabView['events'][number]): string {
  const actor = view.units.find(({ id }) => id === event.unitId);
  const target = view.units.find(({ id }) => id === event.targetId);
  const announcing =
    event.type === 'threat.prepared' ||
    event.type === 'threat.retargeted' ||
    event.type === 'threat.cancelled';
  const subject = announcing
    ? `${actor?.name ?? actor?.id ?? 'Тварь'}${target ? ` → ${target.name ?? target.id}` : ''}`
    : (target?.name ?? target?.id ?? actor?.name ?? actor?.id);
  const skillNames: Record<string, string> = {
    'shield-brace': 'Упор щитом',
    'armor-pressure': 'Удар по броне',
    'reach-thrust': 'Дальний укол',
    'aimed-shot': 'Прицельный выстрел',
    rally: 'Собраться',
  };
  const skill = event.skillId
    ? view.skills?.find((candidate) => candidate.skillId === event.skillId)
    : undefined;
  const skillText =
    event.type === 'skill.used'
      ? ` · ${skill?.name ?? skillNames[event.skillId ?? ''] ?? 'Приём'} · ранг ${event.rank ?? '?'}${event.moraleGain ? ` · мораль +${event.moraleGain}` : ''}`
      : '';
  const outcome =
    event.type === 'attack.resolved'
      ? event.hit === true
        ? ' · попадание'
        : event.hit === false
          ? ' · промах'
          : ''
      : '';
  const damage =
    event.healthDamage !== null && event.healthDamage > 0
      ? ` · здоровье −${event.healthDamage}`
      : event.armorDamage !== null && event.armorDamage > 0
        ? ` · броня −${event.armorDamage}`
        : '';
  return `${eventLabels[event.type] ?? 'Событие'}${subject ? ` · ${subject}` : ''}${skillText}${outcome}${damage}`;
}

type Unit = CombatLabView['units'][number];
const iconPaths = {
  health: 'M14 24 4 14Q-1 3 8 4q4 0 6 5 2-5 6-5 9-1 4 10Z',
  armor: 'M14 3 5 7v8q1 7 9 10 8-3 9-10V7ZM14 6v15',
  stamina: 'M15 2 5 16h8l-1 10 11-15h-8Z',
  morale: 'M5 14l6 6L24 6',
  fear: 'M9 19q5-4 10 0M9 11h1m8 0h1M14 3C1 3 2 23 14 25 26 23 27 3 14 3Z',
  wound: 'M14 3 5 17q-3 9 9 9t9-9ZM9 21q0 3 4 3',
  grid: 'M6 4h8l4 7-4 7H6l-4-7ZM18 11h6l4 7-4 7h-8l-4-7',
  sun: 'M14 2v3m0 18v3M2 14h3m18 0h3M5 5l2 2m14 14 2 2M5 23l2-2M21 7l2-2M19 14a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  skill: 'M14 5v18M5 14h18',
};
function Icon({ name }: { name: keyof typeof iconPaths }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <path d={iconPaths[name]} />
    </svg>
  );
}
function Portrait({ unit }: { unit: Unit }) {
  const art = spriteForUnit(unit);
  return (
    <span className="battle-portrait" data-art={art.id}>
      <img src={art.url} alt="" />
    </span>
  );
}
function UnitStates({
  unit,
  view,
  compact = false,
}: {
  unit: Unit;
  view: CombatLabView;
  compact?: boolean;
}) {
  const rules = view.ruleHints;
  const tile = view.map.tiles?.find(({ q, r }) => q === unit.position.q && r === unit.position.r);
  const shaken =
    rules !== undefined &&
    unit.status === 'active' &&
    unit.pools.morale.current <= rules.hit.shakenMoraleThreshold;
  const exhausted =
    rules !== undefined &&
    unit.status === 'active' &&
    unit.pools.stamina.current * 100 <=
      unit.pools.stamina.maximum * rules.hit.lowStaminaThresholdPercent;
  return (
    <div className={compact ? 'battle-effects' : 'battle-unit-states'}>
      {unit.status === 'active' && unit.panicking && (
        <span
          title="Паника: боец ищет выход с поля. При перекрытом безопасном выходе человек может сдаться людям."
          aria-label="Паника"
        >
          <Icon name="fear" />
          {!compact && 'Паника · бежит'}
        </span>
      )}
      {unit.status === 'active' && unit.threat && (
        <span
          title={`Тяжёлый удар: ${unit.threat.damage.minimum}–${unit.threat.damage.maximum}. ${unit.threat.responseReceived ? 'Ответный ход прошёл' : 'До удара будет ответный ход'}`}
          aria-label="Готовит тяжёлый удар"
        >
          <Icon name="wound" />
          {!compact && 'Готовит удар'}
        </span>
      )}
      {shaken && rules && !unit.panicking && (
        <span
          title={`Мораль ${unit.pools.morale.current} ≤ ${rules.hit.shakenMoraleThreshold}. Точность и защита −${rules.hit.shakenPenalty}.`}
          aria-label={`Дрогнул: точность и защита −${rules.hit.shakenPenalty}`}
        >
          <Icon name="fear" />
          {!compact && 'Дрогнул'}
        </span>
      )}
      {exhausted && rules && (
        <span
          title={`Силы не выше ${rules.hit.lowStaminaThresholdPercent}% максимума. Точность −${rules.hit.lowStaminaPenalty}.`}
          aria-label={`Истощён: точность −${rules.hit.lowStaminaPenalty}`}
        >
          <Icon name="stamina" />
          {!compact && 'Истощён'}
        </span>
      )}
      {unit.status === 'active' && unit.guarding && (
        <span
          title={
            unit.shieldBraceRank
              ? `Упор щитом · ранг ${unit.shieldBraceRank}${unit.guardDamageReductionPercent !== undefined ? `: сила входящего удара −${unit.guardDamageReductionPercent}%` : ''}, до следующего хода`
              : unit.guardDamageReductionPercent !== undefined
                ? `Защита: сила входящего удара −${unit.guardDamageReductionPercent}%, до следующего хода`
                : 'Защита'
          }
          aria-label={unit.shieldBraceRank ? `Упор щитом · ранг ${unit.shieldBraceRank}` : 'Защита'}
        >
          <Icon name="armor" />
          {!compact && (unit.shieldBraceRank ? `Упор щитом · ${unit.shieldBraceRank}` : 'Защита')}
        </span>
      )}
      {unit.wounds.length > 0 && (
        <span
          title={`Ранения: ${unit.wounds.map((w) => (w === 'severe' ? 'тяжёлое' : 'лёгкое')).join(', ')}`}
          aria-label={`Ранений: ${unit.wounds.length}`}
        >
          <Icon name="wound" />
          {!compact && `Ранений: ${unit.wounds.length}`}
        </span>
      )}
      {unit.status !== 'active' && <span>{unitStatus[unit.status]}</span>}
      {!compact && (
        <span title="Наблюдаемое значение морали">
          <Icon name="morale" />
          Мораль {unit.pools.morale.current}/{unit.pools.morale.maximum}
        </span>
      )}
      {!compact && tile && (
        <span title={`Клетка ${tile.q}, ${tile.r}; текущая поверхность, без постоянного эффекта`}>
          Высота +{tile.height}
          {tile.terrain === 'mud' ? ' · грязь' : tile.terrain === 'fire' ? ' · огонь' : ''}
        </span>
      )}
    </div>
  );
}
function UnitCard({
  unit,
  actor,
  view,
  temporary = false,
}: {
  unit: Unit | undefined;
  actor?: boolean;
  view: CombatLabView;
  temporary?: boolean;
}) {
  const points = actor ? view.activation?.actionPoints : undefined;
  return (
    <section
      className={`battle-unit-card ${actor ? 'battle-acting-unit' : 'battle-inspected-unit'}`}
      aria-label={
        actor ? 'Действующий боец' : unit ? `Состояние: ${unit.name ?? unit.id}` : 'Осмотр бойца'
      }
    >
      <div className="battle-card-header">
        <span>
          {actor
            ? view.status === 'resolved'
              ? 'Бой завершён'
              : unit?.sideId === view.controlledSideId
                ? 'Ваш ход'
                : 'Ход противника'
            : unit
              ? `${unit.sideId === view.controlledSideId ? 'Союзник' : 'Противник'} · осмотр`
              : 'Осмотр бойца'}
        </span>
        {points && (
          <div
            className="battle-action-points"
            aria-label={`Очки действий: ${points.current} из ${points.maximum}`}
          >
            <span className="battle-ap-pips" aria-hidden="true">
              {Array.from({ length: points.maximum }, (_, i) => (
                <i key={i} data-filled={i < points.current} />
              ))}
            </span>
            <b>
              ОД {points.current}/{points.maximum}
            </b>
          </div>
        )}
      </div>
      {unit ? (
        <>
          <div className="battle-card-main">
            <Portrait unit={unit} />
            <div className="battle-card-data">
              <h2>{unit.name ?? unit.id}</h2>
              <dl className="battle-pools">
                {(['health', 'armor', 'stamina'] as const).map((key) => (
                  <div className="battle-resource" data-resource={key} key={key}>
                    <Icon name={key} />
                    <dt>{poolLabels[key]}</dt>
                    <dd>
                      <strong>{unit.pools[key].current}</strong>
                      <small>/{unit.pools[key].maximum}</small>
                    </dd>
                    <span className="battle-resource-track">
                      <i
                        style={{
                          width: `${unit.pools[key].maximum > 0 ? Math.max(0, Math.min(100, (100 * unit.pools[key].current) / unit.pools[key].maximum)) : 0}%`,
                        }}
                      />
                    </span>
                  </div>
                ))}
              </dl>
            </div>
          </div>
          <UnitStates unit={unit} view={view} />
        </>
      ) : (
        <p className="battle-empty-inspection">
          Наведите на портрет или фигуру.
          <br />
          ЛКМ закрепляет осмотр.
        </p>
      )}
      <small className="battle-card-foot">
        {actor
          ? 'ЛКМ — осмотр · ПКМ — приказ'
          : temporary
            ? 'Наведение · ЛКМ закрепляет осмотр'
            : 'Закреплено · ЛКМ меняет осмотр'}
      </small>
    </section>
  );
}

export function BattleView({
  view,
  selectedUnitId,
  selectedHex,
  onSelectUnit,
  onSelectHex,
  onAct,
  onRefusal,
  children,
  menu,
  onRestart,
  onEditor,
  busy = false,
  selectedSkillId = null,
  onSelectSkill,
  skillDisabledReason = '',
}: BattleViewProps) {
  const battleViewRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Awaited<ReturnType<typeof mountSpriteBattleScene>> | null>(null);
  const [moreSkills, setMoreSkills] = useState(false);
  const [tooltipInput, setTooltipInput] = useState<'pointer' | 'keyboard'>('pointer');
  const moreSkillsButtonRef = useRef<HTMLButtonElement>(null);
  const [sceneError, setSceneError] = useState('');
  const [night, setNight] = useState(false);
  const [fullGrid, setFullGrid] = useState(false);
  const [hoveredTarget, setHoveredTarget] = useState<BattleFieldTarget | null>(null);
  const [initiativePointer, setInitiativePointer] = useState<string | null>(null);
  const [initiativeFocus, setInitiativeFocus] = useState<string | null>(null);
  const initiativeHover = initiativePointer ?? (hoveredTarget === null ? initiativeFocus : null);
  const latestCallbacks = useRef({ onSelectUnit, onSelectHex, onAct, onRefusal });
  latestCallbacks.current = { onSelectUnit, onSelectHex, onAct, onRefusal };
  const latestSceneView = useRef({
    view,
    selectedUnitId,
    selectedHex,
    night,
    fullGrid,
    initiativeHover,
    selectedSkillId,
  });
  latestSceneView.current = {
    view,
    selectedUnitId,
    selectedHex,
    night,
    fullGrid,
    initiativeHover,
    selectedSkillId,
  };

  useEffect(() => {
    const root = battleViewRef.current;
    const card = root?.querySelector('.battle-acting-unit');
    if (!root || !card) return;
    const placeTooltip = () => {
      const bounds = card.getBoundingClientRect();
      root.style.setProperty('--battle-tooltip-left', `${bounds.left}px`);
      root.style.setProperty(
        '--battle-tooltip-bottom',
        `${window.innerHeight - bounds.top + 12}px`,
      );
      root.style.setProperty('--battle-tooltip-width', `${Math.min(264, bounds.width)}px`);
    };
    const observer = new ResizeObserver(placeTooltip);
    observer.observe(root);
    observer.observe(card);
    window.addEventListener('resize', placeTooltip);
    placeTooltip();
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', placeTooltip);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setHoveredTarget(null);
    setInitiativePointer(null);
    setInitiativeFocus(null);
    const abort = new AbortController();
    void mountSpriteBattleScene(
      canvas,
      view,
      selectedUnitId,
      selectedHex,
      {
        onSelectUnit: (id) => latestCallbacks.current.onSelectUnit(id),
        onSelectHex: (hex) => latestCallbacks.current.onSelectHex(hex),
        onHover: setHoveredTarget,
        onRefusal: (reason) => latestCallbacks.current.onRefusal?.(reason),
        onAct: (action) => latestCallbacks.current.onAct?.(action),
      },
      night,
      abort.signal,
    )
      .then((scene) => {
        if (abort.signal.aborted) scene.destroy();
        else {
          sceneRef.current = scene;
          const latest = latestSceneView.current;
          scene.update(
            latest.view,
            latest.selectedUnitId,
            latest.selectedHex,
            latest.night,
            latest.fullGrid,
            latest.selectedSkillId,
          );
          scene.setHighlightedUnit(latest.initiativeHover);
          setSceneError('');
        }
      })
      .catch(() => {
        if (!abort.signal.aborted)
          setSceneError('Поле боя не удалось открыть. Данные и команды остаются доступны.');
      });
    return () => {
      abort.abort();
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
  }, [view.sessionId, view.battleId]);
  useEffect(() => {
    sceneRef.current?.update(view, selectedUnitId, selectedHex, night, fullGrid, selectedSkillId);
  }, [view, selectedUnitId, selectedHex, night, fullGrid, selectedSkillId]);
  useEffect(() => {
    sceneRef.current?.setHighlightedUnit(initiativeHover);
  }, [initiativeHover]);

  const activeActor = view.units.find(({ id }) => id === view.activation?.actorId);
  const reachUnit = selectedUnitId
    ? view.units.find(({ id }) => id === selectedUnitId)
    : activeActor;
  const reach = reachUnit?.status === 'active' ? reachUnit.weaponReach : undefined;
  const reachCost = view.ruleHints?.weapons.find(({ id }) => id === reachUnit?.weaponId);
  const reachNote =
    reachUnit?.id !== activeActor?.id
      ? 'осмотр'
      : reachUnit?.panicking
        ? 'паника: атака недоступна'
        : reachCost && (view.activation?.actionPoints.current ?? 0) < reachCost.actionPointCost
          ? 'не хватает ОД'
          : reachCost && reachUnit && reachUnit.pools.stamina.current < reachCost.staminaCost
            ? 'не хватает сил'
            : 'одна цель';
  const inspectedId = initiativeHover ?? hoveredTarget?.unitId ?? selectedUnitId;
  const inspected = view.units.find(({ id }) => id === inspectedId);
  const selectedMovement = view.movementPreview?.find(
    ({ to }) => to.q === selectedHex?.q && to.r === selectedHex?.r,
  );
  const hoveredMove = !hoveredTarget?.unitId
    ? view.movementPreview?.find(
        ({ to }) => to.q === hoveredTarget?.hex.q && to.r === hoveredTarget?.hex.r,
      )
    : undefined;
  const attackId = initiativeHover ?? (hoveredTarget ? hoveredTarget.unitId : selectedUnitId);
  const attack = view.attackPreview?.find(({ targetId }) => targetId === attackId);
  const target = view.units.find(({ id }) => id === attack?.targetId);
  const move = hoveredMove ?? (!hoveredTarget && !initiativeHover ? selectedMovement : undefined);
  const playerTurn = view.status === 'active' && activeActor?.sideId === view.controlledSideId;
  const isAttackable = (unit: Unit) =>
    playerTurn &&
    unit.status === 'active' &&
    unit.sideId !== view.controlledSideId &&
    view.attackPreview?.some(({ targetId }) => targetId === unit.id);
  const forecastAttack = playerTurn && !selectedSkillId && !move ? attack : undefined;
  const forecastMove = playerTurn && !selectedSkillId ? move : undefined;
  const inspectedCell =
    initiativeHover !== null || hoveredTarget?.unitId ? null : (hoveredTarget?.hex ?? selectedHex);
  const blockedCell = view.map.blocked.find(
    (hex) => hex.q === inspectedCell?.q && hex.r === inspectedCell?.r,
  );
  const forecastSkill = selectedSkillId
    ? view.skillPreview?.find(
        (preview) =>
          preview.skillId === selectedSkillId &&
          preview.targetId === (initiativeHover ?? hoveredTarget?.unitId ?? selectedUnitId),
      )
    : undefined;
  const remainingAP = view.activation
    ? view.activation.actionPoints.current -
      (forecastMove?.actionPointCost ?? forecastAttack?.actionPointCost ?? 0)
    : 0;
  const status =
    view.status === 'resolved' && view.outcome
      ? view.outcome.winnerSideId === null
        ? 'Бой завершён без победителя'
        : `Победа: ${view.outcome.winnerSideId === view.controlledSideId ? 'ваша сторона' : 'противник'}`
      : activeActor
        ? `Ход: ${activeActor.name ?? activeActor.id}`
        : 'Ожидание следующего хода';

  const renderSkillSlot = (skill: NonNullable<CombatLabView['skills']>[number]) => {
    const previews =
      view.skillPreview?.filter((candidate) => candidate.skillId === skill.skillId) ?? [];
    const reason =
      skillDisabledReason ||
      (previews.some((preview) => preview.legal) ? '' : combatSkillReasonText(previews[0]?.reason));
    return (
      <span className="battle-ability-slot battle-control-slot" key={skill.skillId}>
        <button
          className="battle-control battle-control--icon"
          type="button"
          aria-label={`${skill.name} · ранг ${skill.rank}`}
          aria-pressed={selectedSkillId === skill.skillId}
          aria-disabled={Boolean(reason)}
          onClick={() => {
            if (!reason) {
              setMoreSkills(false);
              onSelectSkill?.(skill.skillId);
            }
          }}
          aria-describedby={`skill-${skill.skillId}`}
        >
          <CombatIcon
            name={
              skill.skillId === 'shield-brace'
                ? 'brace'
                : skill.skillId === 'rally'
                  ? 'rally'
                  : skill.skillId === 'aimed-shot'
                    ? 'aim'
                    : skill.skillId === 'reach-thrust'
                      ? 'reach'
                      : 'pressure'
            }
          />
          <b className="battle-skill-rank">{skill.rank}</b>
        </button>
        <span id={`skill-${skill.skillId}`} className="battle-command-tooltip" role="tooltip">
          <strong>
            {skill.name} · ранг {skill.rank}
          </strong>
          <span>
            {skill.actionPointCost} ОД · {skill.staminaCost} сил
          </span>
          <span>{skill.description}</span>
          <small className={reason ? 'battle-command-reason' : ''}>
            {reason ||
              (skill.target === 'self'
                ? 'Применить к себе'
                : 'Выберите цель · ПКМ — приём · Esc — отменить')}
          </small>
        </span>
      </span>
    );
  };

  return (
    <section
      ref={battleViewRef}
      className={`combat-lab battle-view${night ? ' battle-night' : ''}`}
      aria-label="Поле боя"
    >
      <div className="battle-board-frame">
        <canvas
          ref={canvasRef}
          className="battle-board-canvas"
          aria-label="Поле боя с выбором бойца или клетки"
          tabIndex={0}
        />
        {sceneError && (
          <p className="battle-scene-error" role="alert">
            {sceneError}
          </p>
        )}
      </div>
      <header className="battle-heading">
        <p>{view.map.name ?? view.battle?.map.name ?? 'Старая мельница'}</p>
        <small>
          {
            view.units.filter((u) => u.sideId === view.controlledSideId && u.status === 'active')
              .length
          }{' '}
          против{' '}
          {
            view.units.filter((u) => u.sideId !== view.controlledSideId && u.status === 'active')
              .length
          }{' '}
          · раунд {view.round}
        </small>
      </header>
      <div className="battle-utilities">
        <button
          className="battle-control battle-control--utility"
          type="button"
          aria-label={fullGrid ? 'Скрыть общую сетку' : 'Показать всю сетку'}
          title="Сетка"
          aria-pressed={fullGrid}
          onClick={() => setFullGrid(!fullGrid)}
        >
          <Icon name="grid" />
        </button>
        <button
          className="battle-control battle-control--utility"
          type="button"
          aria-label={night ? 'Дневной свет' : 'Ночная сцена'}
          title="День / ночь"
          aria-pressed={night}
          onClick={() => setNight(!night)}
        >
          <Icon name="sun" />
        </button>
        {menu}
      </div>
      <nav className="battle-initiative" aria-label="Очередь инициативы">
        <div className="battle-round-divider">
          <b>{view.round}</b>
          <span>
            РАУНД
            <br />
            СЕЙЧАС →
          </span>
        </div>
        <div className="battle-current-queue">
          {view.initiativeOrder.map((id, index) => {
            const unit = view.units.find((u) => u.id === id);
            if (!unit) return null;
            return (
              <button
                className="initiative-unit battle-control"
                key={id}
                type="button"
                data-side={unit.sideId === view.controlledSideId ? 'human' : 'opponent'}
                data-past={index < view.turnIndex}
                aria-label={`Раунд ${view.round}, ${index + 1}. ${unit.name ?? unit.id} · ${unit.sideId === view.controlledSideId ? 'Союзник' : 'Противник'}${isAttackable(unit) ? ' · Можно атаковать' : ''}`}
                aria-current={view.activation?.actorId === id ? 'step' : undefined}
                aria-pressed={selectedUnitId === id}
                data-attackable={isAttackable(unit) ? 'true' : undefined}
                onClick={() => onSelectUnit(id)}
                onMouseEnter={() => setInitiativePointer(id)}
                onMouseLeave={() => setInitiativePointer(null)}
                onFocus={() => {
                  setHoveredTarget(null);
                  setInitiativeFocus(id);
                }}
                onBlur={() => setInitiativeFocus(null)}
              >
                <Portrait unit={unit} />
                <span
                  className="battle-side-mark"
                  aria-label={unit.sideId === view.controlledSideId ? 'Союзник' : 'Противник'}
                  title={unit.sideId === view.controlledSideId ? 'Союзник' : 'Противник'}
                />
                <b className="battle-order-number">{index + 1}</b>
                {view.activation?.actorId === id && <span className="battle-turn-now">ХОД</span>}
                <UnitStates unit={unit} view={view} compact />
                <span className="battle-initiative-tip" role="tooltip">
                  <strong>{unit.name ?? unit.id}</strong>
                  <span>
                    {unitStatus[unit.status]} · инициатива {unit.initiative}
                  </span>
                  {isAttackable(unit) && <span>Можно атаковать</span>}
                </span>
              </button>
            );
          })}
        </div>
        {view.status === 'active' && (
          <div className="battle-round-divider battle-next-round">
            <b>{view.round + 1}</b>
            <span>
              РАУНД
              <br />
              ПОРЯДОК НЕИЗВЕСТЕН
            </span>
          </div>
        )}
        {view.status === 'active' && (
          <span
            className="battle-unknown-order"
            title="Порядок следующего раунда ещё не получен от сервера"
          >
            ?
          </span>
        )}
      </nav>
      {view.status === 'active' &&
        view.units.some((unit) => unit.status === 'active' && unit.threat) && (
          <aside className="battle-threat-strip" aria-label="Объявленные угрозы">
            {view.units
              .filter((unit) => unit.status === 'active' && unit.threat)
              .map((unit) => {
                const threat = unit.threat!;
                const victim = view.units.find((candidate) => candidate.id === threat.targetId);
                return (
                  <div key={unit.id}>
                    <Icon name="wound" />
                    <strong>
                      {unit.name ?? unit.id} → {victim?.name ?? threat.targetId}
                    </strong>
                    <span>
                      Удар {threat.damage.minimum}–{threat.damage.maximum} до брони · клетка{' '}
                      {threat.targetHex.q}, {threat.targetHex.r}
                    </span>
                    <small>
                      {threat.retargeted
                        ? 'Наведение изменено · больше не сменит цель'
                        : 'Может сменить цель один раз'}{' '}
                      ·{' '}
                      {threat.responseReceived
                        ? 'Ответный ход прошёл'
                        : 'До удара — ваш ответный ход'}
                    </small>
                  </div>
                );
              })}
          </aside>
        )}
      {view.status === 'resolved' && view.outcome && (
        <section className="battle-outcome-panel" aria-label="Результат боя" role="status">
          <p>РАУНД {view.round} · БОЙ ЗАВЕРШЁН</p>
          <h2>
            {view.outcome.winnerSideId === null
              ? 'Ничья'
              : view.outcome.winnerSideId === view.controlledSideId
                ? 'Победа'
                : 'Поражение'}
          </h2>
          <small>
            {view.outcome.reason === 'round-limit'
              ? 'Достигнут предел раундов.'
              : view.outcome.winnerSideId === view.controlledSideId
                ? 'У противника не осталось бойцов в строю.'
                : 'В вашем отряде не осталось бойцов в строю.'}
          </small>
          <div className="battle-outcome-sides">
            {[
              view.controlledSideId,
              view.sides.find((side) => side.id !== view.controlledSideId)?.id,
            ].map((sideId) => {
              const units = view.units.filter((unit) => unit.sideId === sideId);
              return (
                <div key={sideId}>
                  <strong>{sideId === view.controlledSideId ? 'Ваш отряд' : 'Противник'}</strong>
                  <span>
                    В строю <b>{units.filter((unit) => unit.status === 'active').length}</b>
                  </span>
                  <span>
                    Погибли <b>{units.filter((unit) => unit.status === 'dead').length}</b>
                  </span>
                  <span>
                    Ушли <b>{units.filter((unit) => unit.status === 'retreated').length}</b>
                  </span>
                  <span>
                    Сдались <b>{units.filter((unit) => unit.status === 'surrendered').length}</b>
                  </span>
                </div>
              );
            })}
          </div>
          <footer>
            {onRestart && (
              <button className="battle-control" type="button" disabled={busy} onClick={onRestart}>
                Начать заново
              </button>
            )}
            {onEditor && (
              <button className="battle-control" type="button" disabled={busy} onClick={onEditor}>
                К редактору
              </button>
            )}
          </footer>
        </section>
      )}
      {view.status === 'active' && blockedCell && !selectedSkillId && (
        <aside className="battle-target-forecast" aria-label="Непроходимая клетка">
          <p className="battle-forecast-heading">
            Завал · клетка {blockedCell.q}, {blockedCell.r}
          </p>
          <p>
            <strong>Непроходимо</strong>
          </p>
          <small>Выберите соседнюю свободную клетку</small>
        </aside>
      )}
      {forecastSkill && (
        <aside className="battle-target-forecast" aria-label="Предпросмотр приёма">
          <p className="battle-forecast-heading">
            {forecastSkill.name} · ранг {forecastSkill.rank}
          </p>
          <strong>
            {view.units.find((unit) => unit.id === forecastSkill.targetId)?.name ??
              forecastSkill.targetId}
          </strong>
          {forecastSkill.hitChance !== undefined && <p>Попадание {forecastSkill.hitChance}%</p>}
          {forecastSkill.damage && (
            <p>
              Здоровье {damageRange(forecastSkill.damage.health)} · броня{' '}
              {damageRange(forecastSkill.damage.armor)}
            </p>
          )}
          {forecastSkill.moraleGain !== undefined && <p>Мораль +{forecastSkill.moraleGain}</p>}
          {forecastSkill.damageReductionPercent !== undefined && (
            <p>Сила входящего удара −{forecastSkill.damageReductionPercent}%</p>
          )}
          <p>
            {forecastSkill.actionPointCost} ОД · {forecastSkill.staminaCost} сил
          </p>
          <small>
            {forecastSkill.legal
              ? 'ПКМ — применить приём'
              : combatSkillReasonText(forecastSkill.reason)}
          </small>
        </aside>
      )}
      {(forecastAttack || forecastMove) && (
        <aside
          className={`battle-target-forecast${forecastMove ? ' battle-move-forecast' : ''}`}
          aria-label="Предпросмотр действия"
        >
          <p className="battle-forecast-heading">
            {forecastMove ? 'Движение' : `Атака · ${target?.name ?? attackId}`}
          </p>
          {forecastAttack && (
            <>
              <div className="battle-chance-row">
                <div
                  className="battle-chance-ring"
                  style={{
                    background: `conic-gradient(#d3bb7e ${forecastAttack.hitChance}%, #3d5052 0)`,
                  }}
                >
                  <strong>
                    {forecastAttack.hitChance}
                    <small>%</small>
                  </strong>
                </div>
                <div>
                  <b>Попадание</b>
                  <span>
                    Промах <strong>{100 - forecastAttack.hitChance}%</strong>
                  </span>
                </div>
              </div>
              <span className="battle-sr-only">Шанс попадания {forecastAttack.hitChance}%</span>
              {forecastAttack.damage && (
                <div className="battle-damage-channels">
                  <div>
                    <Icon name="health" />
                    <strong>{damageRange(forecastAttack.damage.health)}</strong>
                    <small>здоровье</small>
                  </div>
                  <div>
                    <Icon name="armor" />
                    <strong>{damageRange(forecastAttack.damage.armor)}</strong>
                    <small>броня</small>
                  </div>
                </div>
              )}
              <small>При попадании{!forecastAttack.damage && ' · урон не указан сервером'}</small>
            </>
          )}
          {forecastMove && (
            <>
              <div className="battle-move-ap">
                <strong>
                  {forecastMove.actionPointCost}
                  <small>ОД</small>
                </strong>
                <span>цена пути</span>
                <strong>
                  {remainingAP}
                  <small>ОД</small>
                </strong>
                <span>останется</span>
              </div>
              <div
                className="battle-move-pips"
                aria-label={`Будет потрачено ${forecastMove.actionPointCost} ОД, останется ${remainingAP} из ${view.activation?.actionPoints.maximum ?? 0}`}
              >
                {Array.from({ length: view.activation?.actionPoints.maximum ?? 0 }, (_, index) => (
                  <i
                    key={index}
                    data-ap={
                      index < forecastMove.actionPointCost
                        ? 'spent'
                        : index < (view.activation?.actionPoints.current ?? 0)
                          ? 'remaining'
                          : 'empty'
                    }
                  />
                ))}
              </div>
              <p className="battle-path">
                {forecastMove.path.length}{' '}
                {forecastMove.path.length === 1
                  ? 'клетка пути'
                  : forecastMove.path.length < 5
                    ? 'клетки пути'
                    : 'клеток пути'}
              </p>
              {(forecastMove.reactions?.length ?? 0) > 0 && (
                <div className="battle-danger-warning">
                  <strong>Свободные удары при отходе</strong>
                  {forecastMove.reactions?.map((reaction) => (
                    <p key={reaction.attackerId}>
                      {view.units.find((unit) => unit.id === reaction.attackerId)?.name ??
                        reaction.attackerId}
                      : {reaction.hitChance}% · здоровье {damageRange(reaction.damage.health)} /
                      броня {damageRange(reaction.damage.armor)}
                    </p>
                  ))}
                  <small>
                    При попадании; последующие удары могут пробить ослабленную броню. Выживший
                    продолжит путь.
                  </small>
                </div>
              )}
              {(forecastMove.fireDamage ?? 0) > 0 && (
                <p className="battle-danger-warning">
                  {activeActor && (forecastMove.fireDamage ?? 0) >= activeActor.pools.health.current
                    ? 'Боец погибнет на пути и не достигнет клетки.'
                    : `Огонь: −${forecastMove.fireDamage} здоровья.`}
                </p>
              )}
            </>
          )}
          <footer>
            <span>{forecastAttack ? 'Атака' : 'Путь'}</span>
            <b>
              {forecastMove?.actionPointCost ?? forecastAttack?.actionPointCost} ОД ·{' '}
              {forecastMove?.staminaCost ?? forecastAttack?.staminaCost} сил
            </b>
          </footer>
          <small>ПКМ — {forecastMove ? 'идти' : 'атаковать'}</small>
        </aside>
      )}
      <section className="battle-action-dock" aria-label="Приказы действующему бойцу">
        <UnitCard unit={activeActor} actor view={view} />
        <div
          className="battle-dock-orders"
          data-tooltip-input={tooltipInput}
          onPointerMove={() => {
            if (tooltipInput !== 'pointer') setTooltipInput('pointer');
          }}
          onKeyDownCapture={() => {
            if (tooltipInput !== 'keyboard') setTooltipInput('keyboard');
          }}
        >
          <div className="battle-order-guidance" role="status">
            <strong>{status}</strong>
            {view.status === 'active' && reach && !selectedSkillId && (
              <span className="battle-weapon-reach" aria-label="Дальность выбранного оружия">
                <i aria-hidden="true" />
                {reachUnit?.name ?? reachUnit?.id} ·{' '}
                {reach.minimumRange === reach.maximumRange
                  ? reach.maximumRange
                  : `${reach.minimumRange}–${reach.maximumRange}`}{' '}
                {reach.maximumRange === 1 ? 'гекс' : 'гекса'} · {reachNote}
              </span>
            )}
            {view.status === 'active' && !selectedSkillId ? (
              <span className="battle-range-legend" aria-label="Обозначения зон">
                <i data-zone="move" aria-hidden="true" /> Ход
                <i data-zone="weapon" aria-hidden="true" /> Дальность
                <i data-zone="both" aria-hidden="true" /> Ход + дальность
                <small>ПКМ — приказ ходящему</small>
              </span>
            ) : (
              <span className="battle-skill-mode">
                {selectedSkillId
                  ? `Выбран приём: ${view.skills?.find((skill) => skill.skillId === selectedSkillId)?.name} · ПКМ по цели · Esc — отменить`
                  : 'Наведение — прогноз · ПКМ — приказ'}
              </span>
            )}
          </div>
          <div className="battle-command-area">
            {children ?? <p>Приказы доступны в управлении боем.</p>}
          </div>
          <nav
            className="battle-ability-dock"
            aria-label="Изученные приёмы"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setMoreSkills(false);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape' && moreSkills) {
                setMoreSkills(false);
                moreSkillsButtonRef.current?.focus();
              }
            }}
          >
            <small>ПРИЁМЫ</small>
            <div className="battle-skill-list">
              {(view.skills?.length ?? 0) === 0 && (
                <span className="battle-no-skills">Нет изученных приёмов</span>
              )}
              {(view.skills ?? []).slice(0, 4).map(renderSkillSlot)}
              {(view.skills?.length ?? 0) > 4 && (
                <span className="battle-control-slot">
                  <button
                    ref={moreSkillsButtonRef}
                    className="battle-control battle-control--icon battle-more-skills"
                    type="button"
                    aria-label={
                      moreSkills
                        ? 'Свернуть дополнительные приёмы'
                        : `Ещё +${view.skills!.length - 4}`
                    }
                    aria-expanded={moreSkills}
                    aria-controls="battle-skills-overflow"
                    aria-describedby="battle-more-skills-tip"
                    onClick={() => setMoreSkills(!moreSkills)}
                  >
                    <span aria-hidden="true">···</span>
                    <b className="battle-skill-rank">+{view.skills!.length - 4}</b>
                  </button>
                  <span
                    id="battle-more-skills-tip"
                    className="battle-command-tooltip"
                    role="tooltip"
                  >
                    <strong>Дополнительные приёмы</strong>
                    <small>Ещё +{view.skills!.length - 4} · Esc — закрыть</small>
                  </span>
                </span>
              )}
            </div>
            <div
              id="battle-skills-overflow"
              className="battle-skills-overflow"
              hidden={!moreSkills}
              role="group"
              aria-label="Дополнительные приёмы"
            >
              {(view.skills ?? []).slice(4).map(renderSkillSlot)}
            </div>
          </nav>
        </div>
        <UnitCard
          unit={inspected}
          view={view}
          temporary={initiativeHover !== null || hoveredTarget?.unitId != null}
        />
      </section>
      <details className="battle-log">
        <summary>События боя ({view.events.length})</summary>
        <div className="battle-log-content">
          <p className="battle-status-line">{status}</p>
          <p>15 × 11 гексов · без сохранения кампании</p>
          {view.omittedEventPrefix > 0 && <p>Ранние события: {view.omittedEventPrefix}</p>}
          <ol>
            {view.events.map((event) => (
              <li key={event.id}>{eventText(view, event)}</li>
            ))}
          </ol>
          {view.outcome && (
            <p className="battle-result">
              {view.outcome.reason === 'round-limit'
                ? 'Достигнут предел раундов.'
                : 'На поле осталась одна сторона.'}
            </p>
          )}
          <p className="battle-icon-credits">
            Иконки: Lorc, Delapouite, Sbed ·{' '}
            <a href="https://game-icons.net" target="_blank" rel="noreferrer">
              Game Icons
            </a>
            {' · '}
            <a href="https://creativecommons.org/licenses/by/3.0/" target="_blank" rel="noreferrer">
              CC BY 3.0
            </a>
            {' · адаптированы для интерфейса'}
          </p>
          <div className="battle-unit-rail" aria-label="Бойцы на поле">
            {view.units.map((unit) => (
              <button
                className="battle-roster-unit battle-control"
                key={unit.id}
                type="button"
                aria-pressed={selectedUnitId === unit.id}
                onClick={() => onSelectUnit(unit.id)}
              >
                {unit.name ?? unit.id} · {unitStatus[unit.status]}
              </button>
            ))}
          </div>
        </div>
      </details>
    </section>
  );
}
import { combatSkillReasonText } from './controller.js';
