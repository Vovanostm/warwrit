import type { EncounterPublicUnitDto } from '@warwrit/protocol';

const HOSTILE_LABELS: Readonly<Record<string, string>> = {
  'world.raider.old-mill.front.01': 'Налётчик с топором',
  'world.raider.old-mill.bow.01': 'Налётчик-лучник',
  'world.raider.old-mill.heavy.01': 'Налётчик с двуручником',
};

const uuidPattern = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/** Show only names supplied by the owner's company record or established public unit kinds. */
export function encounterUnitLabel(
  unit: Pick<EncounterPublicUnitDto, 'id' | 'sideId'>,
  ourNames: Readonly<Record<string, string>>,
): string {
  const suppliedName = ourNames[unit.id];
  if (suppliedName)
    return uuidPattern.test(suppliedName) ? ownedFighterLabel(unit.id, ourNames) : suppliedName;

  return (
    HOSTILE_LABELS[unit.id] ??
    (unit.id.startsWith('world.wolf.')
      ? unit.id.includes('.leader.')
        ? 'Вожак волков'
        : 'Волк'
      : unit.id.startsWith('world.beast.')
        ? 'Огромный зверь'
        : undefined) ??
    (unit.sideId === 'first-hunt-companies'
      ? 'Боец второй компании'
      : 'Участник без открытого имени')
  );
}

function ownedFighterLabel(unitId: string, ourNames: Readonly<Record<string, string>>): string {
  const ordinal = Object.keys(ourNames).indexOf(unitId) + 1;
  return ordinal > 0 ? `Боец вашей компании ${ordinal}` : 'Боец вашей компании';
}
