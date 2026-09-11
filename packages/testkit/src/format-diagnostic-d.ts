function f(state: any) {
  let matching = state;
  matching = equip(matching, 'leader', 'great-weapon', 'leader-heavy', ['MAIN_HAND', 'OFF_HAND']);
  Object.assign(state.lifecycle.company!, { actingLeaderId: 'worker-0' });
  expect(
    evaluatePerkEffects(state as Required<CompanyEconomyState>, { kind: 'LEADER_GROUP' }),
  ).toMatchObject({ effectiveLeaderId: 'worker-0' });
  Object.assign(state.physical!.items.find((entry) => entry.itemId === 'worker-raider')!, {
    equipped: null,
  });
}
