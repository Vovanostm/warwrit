import type { CombatLabView, CombatLabHex, CombatLabSkillId } from '@warwrit/protocol';
import type { Unit } from './BattleUnitCard.js';
import type { BattleFieldTarget } from './sprite-battle-scene.js';
export function battleHudProjection(
  view: CombatLabView,
  selectedUnitId: string | null,
  selectedHex: CombatLabHex | null,
  initiativeHover: string | null,
  hoveredTarget: BattleFieldTarget | null,
  selectedSkillId: CombatLabSkillId | null,
) {
  const activeActor = view.units.find(({ id }) => id === view.activation?.actorId);
  const { reachUnit, reach, reachNote } = weaponInspection(view, selectedUnitId, activeActor);
  const inspectedId = initiativeHover ?? hoveredTarget?.unitId ?? selectedUnitId;
  const inspected = view.units.find(({ id }) => id === inspectedId);
  const { attackId, target, isAttackable, forecastAttack, forecastMove } = actionForecast(
    view,
    selectedUnitId,
    selectedHex,
    initiativeHover,
    hoveredTarget,
    selectedSkillId,
    activeActor,
  );
  const inspectedCell =
    initiativeHover !== null || hoveredTarget?.unitId ? null : (hoveredTarget?.hex ?? selectedHex);
  const blockedCell = view.map.blocked.find(
    (hex) => hex.q === inspectedCell?.q && hex.r === inspectedCell?.r,
  );
  const forecastSkill = selectedSkillId
    ? view.skillPreview?.find(
        (preview) => preview.skillId === selectedSkillId && preview.targetId === inspectedId,
      )
    : undefined;
  const remainingAP = view.activation
    ? view.activation.actionPoints.current -
      (forecastMove?.actionPointCost ?? forecastAttack?.actionPointCost ?? 0)
    : 0;
  const status = battleStatus(view, activeActor);
  return {
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
  };
}

function weaponInspection(
  view: CombatLabView,
  selectedUnitId: string | null,
  activeActor: Unit | undefined,
) {
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
  return { reachUnit, reach, reachNote };
}

function actionForecast(
  view: CombatLabView,
  selectedUnitId: string | null,
  selectedHex: CombatLabHex | null,
  initiativeHover: string | null,
  hoveredTarget: BattleFieldTarget | null,
  selectedSkillId: CombatLabSkillId | null,
  activeActor: Unit | undefined,
) {
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
  return { attackId, target, isAttackable, forecastAttack, forecastMove };
}

function battleStatus(view: CombatLabView, activeActor: Unit | undefined) {
  const status =
    view.status === 'resolved' && view.outcome
      ? view.outcome.winnerSideId === null
        ? 'Бой завершён без победителя'
        : `Победа: ${view.outcome.winnerSideId === view.controlledSideId ? 'ваша сторона' : 'противник'}`
      : activeActor
        ? `Ход: ${activeActor.name ?? activeActor.id}`
        : 'Ожидание следующего хода';
  return status;
}
