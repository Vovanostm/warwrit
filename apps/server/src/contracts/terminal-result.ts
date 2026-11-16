import type { BattleState, CompanyCombatAggregateState } from '@warwrit/game-core';
import type { FirstHuntContractViewDto } from '@warwrit/protocol';

/** An owned company's immutable participation grants knowledge after helper leave. */
export function huntTerminalSummary(
  encounter: { readonly id: string; readonly state: unknown },
  effectsAppliedAt: Date | null,
  company: CompanyCombatAggregateState | undefined,
): FirstHuntContractViewDto['terminal'] {
  const state = encounter.state as BattleState;
  if (state.status !== 'resolved' || company === undefined) return undefined;
  const participated =
    company.encounter.active?.binding.setup.battleId === encounter.id ||
    company.encounter.completed.some(
      (entry) => entry.terminalSourceEventId === `encounter:${encounter.id}:terminal`,
    );
  if (!participated) return undefined;
  return {
    effects: effectsAppliedAt === null ? 'PENDING' : 'APPLIED',
    hostileRetreated: state.units.some(
      (unit) => unit.sideId === 'first-hunt-hostiles' && unit.status === 'retreated',
    ),
  };
}
