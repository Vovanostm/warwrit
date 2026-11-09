# M1 return report «Пока вас не было»

Status: **proposed, not started** (owner decision 2026-11-09). No writer assigned.
Rules: [m1-spec §6](../wiki/m1-spec.md#6-два-независимых-хода-времени).

## Player outcome

A player who signs in after time passed sees what happened to the company:
days elapsed, rations eaten, wages paid or owed, debt and company events. If
nothing happened, no report appears.

- Normal path: sign in → report → close → game.
- Saved consequences: none new; the report only reads facts already recorded.
- Failure: missing facts are not invented; an empty interval shows nothing.

Simplest try: leave a company in camp, advance a campaign day through the
normal clock, sign in again.

## Current state (checked 2026-11-09)

No such report found in `apps/web` or `apps/server`.
