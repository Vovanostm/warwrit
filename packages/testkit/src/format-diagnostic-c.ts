function equip(
  state: CompanyEconomyState,
  characterId: string,
  definitionId: string,
  itemId: string,
  slots: readonly EquipmentSlot[],
) {
  const containerId = `pack-${characterId}`;
  let next = state;
  if (!next.physical!.containers.some((entry) => entry.containerId === containerId))
    next = addContainer(
      next,
      container(
        containerId,
        { kind: 'CHARACTER', id: characterId },
        30000,
        { kind: 'CHARACTER', id: characterId },
      ),
      false,
    );
  return addItem(
    next,
    {
      ...item(
        itemId,
        definitionId,
        { kind: 'COMPANY', id: state.lifecycle.companyId },
        containerId,
      ),
      equipped: { characterId, slots: [...slots] },
    },
    false,
  );
}
