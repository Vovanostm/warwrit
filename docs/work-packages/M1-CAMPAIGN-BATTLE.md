# M1 campaign battle rules — S4 in the ordinary battle

Status: **proposed, not started** (owner decisions 2026-11-09). No writer assigned.
Rules: [m1-spec §7–§8](../wiki/m1-spec.md#8-тактическое-сражение-и-физические-последствия).

## Player outcome

A contract battle on the campaign map plays by the same rules as the
diagnostic S4 stand: leaving an adjacent hex draws one reaction, enemies
declare intents, morale drops cause panic, escape and surrender. Each company
brings up to six fighters; a helper adds its own six. A contract may field up
to 12 enemies, 24 figures at most. An incapacitated fighter lies down and
skips every remaining turn.

- Normal path: accept a contract → travel → join → battle with S4 feedback
  (threat preview, reaction, panic, surrender) → result saved to the company.
- Alternatives: enemies flee or surrender; own fighters panic; helper joins
  with up to six; a fighter is incapacitated and stays down.
- Failure/retry: defeat keeps casualties and the unfinished contract.
- Saved consequences: casualties, surrendered/fled enemies and loot stay facts.

Simplest try: FIRST HUNT mill battle with a helper company; check a panic or
surrender and a 6+6 player side in one fight.

## Current state (checked 2026-11-09)

Campaign encounters use ruleset `m1-domain-bridge-v5`
(`apps/server/src/contracts/executor.ts`, `apps/server/src/encounters/access.ts`).
S4 features live in `packages/game-core/src/combat/sprite-s4.ts` under the
sprite prototype ruleset used by the combat lab. Participant and enemy limits
in code: NOT_CHECKED.

## Constraints

- New behaviour needs a new ruleset version; never rewrite released replays.
  Analyze serialization/RNG compatibility first (AGENTS.md).
- Previous rule "incapacitated may wait/retreat" is replaced.
- Battle chronicle is after M1.
