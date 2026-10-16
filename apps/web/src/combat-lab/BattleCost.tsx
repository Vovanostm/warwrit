export function BattleCost({
  cost,
}: {
  cost: { readonly actionPointCost: number; readonly staminaCost: number };
}) {
  return (
    <span
      className="battle-action-cost"
      aria-label={`${cost.actionPointCost} ОД · ${cost.staminaCost} сил`}
    >
      <span>{cost.actionPointCost} ОД</span>
      <span>{cost.staminaCost} сил</span>
    </span>
  );
}
