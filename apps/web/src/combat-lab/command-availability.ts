import type { CombatLabHex, CombatLabView } from '@warwrit/protocol';

export function commandSelection(
  view: CombatLabView,
  selectedUnitId: string | null,
  selectedHex: CombatLabHex | null,
) {
  const selectedTarget = view.units.find(
    (unit) =>
      unit.id === selectedUnitId &&
      unit.sideId !== view.controlledSideId &&
      unit.status === 'active',
  );
  const selectedMovement = view.movementPreview?.find(
    ({ to }) => selectedHex !== null && to.q === selectedHex.q && to.r === selectedHex.r,
  );
  const selectedAttack = view.attackPreview?.find(
    ({ targetId }) => targetId === selectedTarget?.id,
  );
  const activeActor = view.units.find(({ id }) => id === view.activation?.actorId);
  const rules = view.ruleHints;
  const attackCost = rules?.weapons.find(({ id }) => id === activeActor?.weaponId);
  return {
    selectedTarget,
    selectedMovement,
    selectedAttack,
    activeActor,
    rules,
    attackCost,
    ap: view.activation?.actionPoints.current ?? 0,
  };
}

type Selection = ReturnType<typeof commandSelection>;

function insufficientResources(
  selection: Selection,
  cost: { actionPointCost: number; staminaCost: number } | undefined,
): string {
  if (!cost) return '';
  if (selection.ap < cost.actionPointCost) return 'Недостаточно ОД';
  if ((selection.activeActor?.pools.stamina.current ?? 0) < cost.staminaCost)
    return 'Недостаточно сил';
  return '';
}

function attackReason(selection: Selection): string {
  if (!selection.selectedTarget) return 'Выберите противника';
  if (selection.selectedAttack) return '';
  return insufficientResources(selection, selection.attackCost) || 'Цель недоступна для атаки';
}

function moveReason(selection: Selection, selectedHex: CombatLabHex | null): string {
  if (!selectedHex) return 'Выберите клетку';
  if (selection.selectedMovement) return '';
  return selection.ap === 0 ? 'Недостаточно ОД' : 'Нет доступного пути';
}

export function commandReasons(
  selection: Selection,
  view: CombatLabView,
  selectedHex: CombatLabHex | null,
  commonReason: string,
) {
  return {
    attackReason: commonReason || attackReason(selection),
    moveReason: commonReason || moveReason(selection, selectedHex),
    defendReason:
      commonReason ||
      (view.availableActions?.includes('defend') === false
        ? insufficientResources(selection, selection.rules?.defend) || 'Защита недоступна'
        : ''),
    waitReason:
      commonReason || (view.availableActions?.includes('wait') === false ? 'Ход недоступен' : ''),
    retreatReason:
      commonReason ||
      (view.availableActions?.includes('retreat') === false ? 'Нужен край отхода' : ''),
  };
}

export function canControl(view: CombatLabView): boolean {
  const actor = view.units.find((unit) => unit.id === view.activation?.actorId);
  return view.status === 'active' && actor?.sideId === view.controlledSideId;
}
