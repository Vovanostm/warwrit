/** Keep visual inspection independent from the currently authorized command actor. */
export function inspectEncounterUnit(
  unitId: string,
  attackableUnitIds: ReadonlySet<string>,
  authorizedActorId: string | null,
) {
  return {
    inspectedUnitId: unitId,
    targetUnitId: attackableUnitIds.has(unitId) ? unitId : undefined,
    commandUnitId: unitId === authorizedActorId ? unitId : undefined,
  };
}
