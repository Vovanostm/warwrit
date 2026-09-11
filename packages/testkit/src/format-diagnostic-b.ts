function select(
  state: CompanyEconomyState,
  id: string,
  perks: readonly string[],
  skills: Readonly<Record<string, number>> = {},
) {
  const target = character(state, id);
  Object.assign(target, { perks: [...perks], skills: { ...target.skills, ...skills } });
  return state;
}
