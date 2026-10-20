import { BattleHeading } from './BattleHeading.js';
import { BattleGuidance } from './BattleGuidance.js';
import { BattleThreats } from './BattleThreats.js';
import { useBattleScene } from './battle-hud-scene.js';
import { battleHudProjection } from './battle-hud-projection.js';
import { BattleLog } from './BattleLog.js';
import { BattleForecast } from './BattleForecast.js';
import { BattleInitiative } from './BattleInitiative.js';
import { BattleOutcome } from './BattleOutcome.js';
import { BattleSkills } from './BattleSkills.js';
import { useRef } from 'react';
import type { BattleViewProps } from './battle-view-props.js';

import { Icon, UnitCard } from './BattleUnitCard.js';
import './battle-view.css';
import './battle-controls.css';

export function BattleView(props: BattleViewProps) {
  const {
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
  } = props;
  const battleViewRef = useRef<HTMLElement>(null);
  const {
    canvasRef,
    focusUnit,
    showOverview,
    night,
    setNight,
    fullGrid,
    setFullGrid,
    sceneError,
    hoveredTarget,
    initiativeHover,
    setInitiativePointer,
    setInitiativeFocus,
    setHoveredTarget,
    tooltipInput,
    setTooltipInput,
  } = useBattleScene(
    {
      view,
      selectedUnitId,
      selectedHex,
      onSelectUnit,
      onSelectHex,
      onAct,
      onRefusal,
      selectedSkillId,
    },
    battleViewRef,
  );
  const {
    activeActor,
    reachUnit,
    reach,
    reachNote,
    inspected,
    isAttackable,
    forecastAttack,
    forecastMove,
    blockedCell,
    forecastSkill,
    remainingAP,
    status,
    target,
    attackId,
  } = battleHudProjection(
    view,
    selectedUnitId,
    selectedHex,
    initiativeHover,
    hoveredTarget,
    selectedSkillId,
  );

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
      <BattleHeading view={view} />
      <div className="battle-utilities">
        <button
          className="battle-control battle-control--utility"
          type="button"
          aria-label="Обзор поля"
          title="Обзор поля (Home)"
          onClick={showOverview}
        >
          Home
        </button>
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
      <div className="battle-top-band">
        <BattleInitiative
          view={view}
          selectedUnitId={selectedUnitId}
          onSelectUnit={(id) => {
            onSelectUnit(id);
            focusUnit(id);
          }}
          isAttackable={isAttackable}
          setInitiativePointer={setInitiativePointer}
          setInitiativeFocus={setInitiativeFocus}
          setHoveredTarget={setHoveredTarget}
        />
        <BattleThreats view={view} />
      </div>
      <BattleOutcome view={view} busy={busy} onRestart={onRestart} onEditor={onEditor} />
      <BattleForecast
        view={view}
        blockedCell={blockedCell}
        selectedSkillId={selectedSkillId}
        forecastSkill={forecastSkill}
        forecastAttack={forecastAttack}
        forecastMove={forecastMove}
        target={target}
        attackId={attackId}
        remainingAP={remainingAP}
        activeActor={activeActor}
      />
      {view.status === 'active' && (
        <section className="battle-action-dock" aria-label="Приказы действующему бойцу">
          <UnitCard unit={activeActor} actor view={view} />
          <div
            className="battle-dock-orders"
            data-tooltip-input={tooltipInput}
            onPointerMove={() => setTooltipInput('pointer')}
            onKeyDownCapture={() => setTooltipInput('keyboard')}
          >
            <BattleGuidance
              view={view}
              status={status}
              reachUnit={reachUnit}
              reach={reach}
              reachNote={reachNote}
              selectedSkillId={selectedSkillId}
            />
            <div className="battle-command-area">
              {children ?? <p>Приказы доступны в управлении боем.</p>}
            </div>
            <BattleSkills
              view={view}
              selectedSkillId={selectedSkillId}
              onSelectSkill={onSelectSkill}
              skillDisabledReason={skillDisabledReason}
            />
          </div>
          {inspected && inspected.id !== activeActor?.id && (
            <UnitCard unit={inspected} view={view} />
          )}
        </section>
      )}
      <BattleLog
        view={view}
        status={status}
        selectedUnitId={selectedUnitId}
        onSelectUnit={(id) => {
          onSelectUnit(id);
          focusUnit(id);
        }}
      />
    </section>
  );
}
