VERDICT: ACCEPT STAGED_DELTA_74e1da1

Independent source review of the five staged code files against
`74e1da1257f26cb8e661b846b9a9b2161a7be2ad` on
`codex/company-profile-164`. No blocking source finding in this delta.
This is not overall #164 acceptance or acceptance of the earlier source review.
Parent must compare the committed code with this reviewed delta before adopting
the verdict; changed code requires a new review of the affected result.

## Exact reviewed delta

The working code matched the index (no unstaged tracked diff at final inspection).
Staged CHANGELOG/CURRENT_PLAN/combat-wiki edits are parent-owned and outside this
code verdict. The five reviewed file changes are:

- `packages/game-core/src/combat/rules.ts` (+15/-5), function at line 293:
  `combatActionAllowed` gains the state's ruleset discriminator. Non-bridge-v3
  returns true without reading capabilities. Bridge-v3 move/attack/defend/retreat
  require the corresponding property to be exactly true; other intents continue
  to their existing command-specific guards.
- `packages/game-core/src/combat/engine.ts` (+10/-5): imports bridge-v3 and m0
  identifiers; schema-1 `validateSetup` at line 197 accepts only m0/sprite selected
  rules with matching setup ID; command capability dispatch at line 1594 passes
  state; `assertBattleState` at line 1680 validates capabilities only for bridge-v3.
- `packages/game-core/src/combat/ai.ts` (+5/-5): the five capability calls in
  `chooseAiCommand` at lines 285-326 pass state (retreat, retreat movement,
  attack, movement, defend). Selection order and fallback wait are unchanged.
- `packages/game-core/src/combat/sprite-prototype.test.ts` (+4/-1): the old
  unknown-version example uses v99; a separate bridge-v3 schema-1 call must throw
  the setup/rules mismatch, preserving the adjacent bridge-v1 assertion.
- `apps/server/src/combat-lab/pb01.test.ts` (+34/-29): the existing privacy and
  detachment test is parameterized with string `secret` and four false capability
  flags. It captures the baseline public view before injecting private fields,
  requires whole-view equality afterwards, and retains forbidden-field and
  bidirectional detachment assertions.

## Counterexample traces and compatibility boundaries

1. **Legacy private-field crash and silent action removal:**
   `.orca/validate-related-tests.log` reproduces the prior `in`-operator TypeError
   for `capabilities='secret'` through `projectCombatLabView`'s simulated ordinary
   actions (`apps/server/src/combat-lab/projection.ts:65-73`). A false capability
   object could instead silently remove defend/retreat previews. The revised
   helper exits on the legacy ruleset before inspecting either value, and the
   revised assertion ignores that unrelated field on legacy states. AI also
   supplies the discriminator at every helper call. The revised test requires
   the same full public view in both cases, not merely absence of an exception.
   This is an actual compatibility/privacy regression, not waived as a fixture
   artifact. No further owning fix is needed in the staged delta.

2. **New version through old setup entrypoint:**
   `combatRules` now recognizes bridge-v3 and returns rules whose ID is bridge-v3,
   so the previous equality-only schema-1 gate incorrectly admitted that ID.
   `engine.ts:197-200` now rejects all bridge rulesets through `startBattle`:
   v1/v2 fail their existing ID mismatch and v3 fails the explicit m0/sprite gate.
   v99 still fails unknown-rules dispatch. The new v3-specific assertion preserves
   the wrong-entrypoint rejection instead of replacing it with only a v99 test.
   `startBattleV2` remains valid: it uses its separate validator and required v3
   capabilities (`runtime-v2.ts:50-53`, `setup-v2.ts:115-150`).

3. **Restricted or missing v3 capabilities:**
   ordinary move/attack/defend/retreat require literal true. Missing capabilities
   cannot grant those actions. The rejection in `applyCombatCommand` precedes
   action execution, AP/stamina/RNG consumption and command/revision advancement;
   it returns the original state. V3 setup and state assertions still reject
   absent, nonboolean or extra capability fields. AI selects only permitted
   ordinary actions and can wait; autoplay routes through that AI for bridge
   rules (`tactical-ai.ts:472`, `autobattle.ts:27-35`). Existing runtime-v2 tests
   at lines 219-305 cover immobile edge rejection, fists replay, missing setup
   capabilities and wait-only round-limit termination. Inspected, not executed.
   Invalid externally fabricated v3 states are not promised successful wait:
   their required-field assertion still rejects them.

4. **Alternate-command bypass:**
   the helper's default does not enable bridge skills, panic movement or threat
   attacks. Skills are enumerated only for sprite-v3 (`skills.ts:123`); panic
   eligibility requires sprite S4 (`rules.ts:244-250`), and threat execution has
   its own S4 gate (`engine.ts:1448`). Unknown commands retain `assertNever`.
   No new rescue, incapacitation or transport semantics are introduced.

5. **Permissive historical runtime versus strict stored JSON:**
   relaxing the old runtime assertion does not relax stored readers.
   `company/aggregate-state.ts:638-669,730-819,953-978` still uses exact field
   shapes, requires capabilities for v3 and forbids them for old nested units,
   setups and projections. `bindingVersionsMatch` at line 534 pairs projection3
   with v3; world/v3 member validation compares setup and projection values and
   reconstructs the exact initial transition (`:598-619`). The public aggregate
   reader therefore still rejects cross-version payloads before the relaxed
   legacy runtime assertion could admit them. `setup-v2.ts:23-40` also retains
   cross-version rejection for its typed setup entrypoint.

6. **Serializer/history and ordinary old assertions:**
   `replay.ts:46-91` adds capabilities to canonical state only for bridge-v3;
   old canonical fields, ordering and random state are untouched by this delta.
   Replay schema1 routes to `startBattle`, schema2 to `startBattleV2` (`:101-110`).
   Historical runtime assertions retain weapon, pool, occupancy, activation and
   outcome checks; only the newly introduced unrelated capability check is
   removed from their branch. Existing old-rule dispatch/order assertions remain
   in `order-compatibility.test.ts:369-396`. Historical execution/byte comparison
   was NOT_RUN by this reviewer.

## Evidence and remaining gates

- Read supplied AGENTS, warwrit-review, full local contract, original review-1,
  live classification decision, current checkpoint/correction and actual staged
  code plus the consumers above. Used actual source because the graph belongs to
  another checkout. No extra catalogue research or new policy interpretation.
- Review-1's source ACCEPT missed the two reproduced compatibility defects above;
  it cannot serve as proof that the integrated source was defect-free. This
  verdict applies only to their staged correction and traced boundaries.
- Read existing logs: related validation has 766 PASS/48 SKIP/6 FAIL (four timeout
  cases and the two compatibility failures); corrected focused run has 34 PASS;
  timeout rerun has three PASS and one remaining world-navigation timeout.
  Parent reports typecheck/lint PASS. These are inherited execution evidence,
  not fresh checks by this reviewer. Broader focused coverage/audit is in progress;
  no successful normal correction commit or completed integrated gate is claimed.
- Real campaign JOIN with unarmed Mora, unavailable initial controls and eventual
  inactivity defeat are parent-reported runtime observations. Their cause is
  unproved and belongs to the independent evaluator; this source verdict neither
  diagnoses nor waives that journey failure.
- Final classification readback remains `PENDING_OWNER`: critical-bleed attack/
  defence policy is unresolved. Rescue/assisted transport remains excluded.
- Reviewer tests/builds/coverage/browser: NOT_RUN. Performance/balance:
  NOT_MEASURED. Only this ignored report was written; no source/shared-doc edits,
  Orca calls, agents, commits or remote writes. Parent owns shared documentation
  and adoption of this bounded verdict after comparing frozen committed code.
