# M1 melee always connects — combat ruleset v3 (2026-10-07)

Status: **proposal, awaiting activation.** Written by the Claude Code review
session on primary `main` (`47c60e0`) at the owner's request: «Подготовь
глубокое, проработанное полноценное ТЗ с критериями приёмки и самопроверкой и
тестом качества кода». Revision 2 incorporates an independent critic pass (see
[Review record](#review-record)). Implementation, tests and checks are NOT_RUN.

## Owner decisions (authority)

Quoted 2026-10-07, recorded in
[m1-spec §18](../wiki/m1-spec.md#18-battle-brothers-направление-и-этапы--2026-10-03)
and [combat](../wiki/combat.md#урон-в-ближнем-бою--решение-владельца-2026-10-07):

1. «Урон в ближнем бою должен быть всегда (кроме новобранцев или боя с
   призраками) — игра должна быть логичнее xcom в этом плане».
2. «Да, давай дух Battle Brothers и взял у XCOM только подачу». There is no cover,
   flanking or side-wide turn.
3. «Да» to the reading:
   - hit quality replaces the melee miss;
   - a blow taken by shield or armor is damage;
   - only a recruit below a weapon-skill threshold can miss;
   - ranged attacks keep their miss chance.

Precedence: latest owner decision > accepted ADRs (0002 combat kernel) > this
contract > implementation. This contract adds no creature, lore, cover, line of
sight, or animation work.

## Player-visible outcome

In a real encounter, an adjacent or reach melee blow by a trained fighter never
"misses". The battle shows a short public line per blow — «скользящий удар»,
«удар», «точный удар», or «промах» for recruits and bows. The target's armor or
health always drops after a trained melee blow.

Simplest way to try: start a world encounter (wolves or raiders) on a fresh local
world and attack adjacent enemies several times. No «промах» appears for trained
melee, and every blow is listed. A headless v3 battle log printed by the stress
script is the developer-side evidence.

The diagnostic combat lab stays M0 (schema 1, `m0-prototype-v1`) and unchanged.
Its projection asserts M0, and its tests forbid exposing `hitChance` or the
roll.

## Current behaviour (facts)

- **Engine.** `applyAttack` in
  [engine.ts](../../packages/game-core/src/combat/engine.ts):
  - computes `hitChance = clamp(base + accuracy + weapon.accuracyModifier −
defense, 5, 95)` and draws one `1..100` roll, then on hit one
    damage-variance roll;
  - melee and ranged can both miss (`hit: false`, no damage);
  - it is private; `applyCombatCommand` first filters `BATTLE_TERMINAL`,
    `DUPLICATE_COMMAND`, `UNIT_NOT_FOUND`, `NOT_ACTIVE_UNIT` and
    `STALE_ACTIVATION`.
- **Rules.** In [rules.ts](../../packages/game-core/src/combat/rules.ts),
  `combatRules()` returns `COMBAT_RULES_V1` for all three ruleset ids.
  `compareCombatUnitIds` switches on ruleset id. Weapon profiles have no
  melee/ranged kind. Penetration is 15–35 % on every profile.
- **Replay.** `canonicalUnit` in
  [replay.ts](../../packages/game-core/src/combat/replay.ts) lists unit fields
  explicitly for the replay digest.
- **Encounter server.**
  - New encounters use `m1-domain-bridge-v2`
    ([admission.ts](../../apps/server/src/encounters/admission.ts)).
  - Replay verification and world-hostile AI wake accept only v1/v2
    ([encounters/executor.ts](../../apps/server/src/encounters/executor.ts)).
  - FIRST HUNT terminal settlement requires v2
    ([contracts/executor.ts](../../apps/server/src/contracts/executor.ts)).
- **Company aggregate.**
  [aggregate-state.ts](../../packages/game-core/src/company/aggregate-state.ts)
  validates stored setup units, world participants and battle units with
  exact-field shapes (`hasExactStoredFields`). It compares participants to setup
  units by canonical JSON, and accepts only listed combat ruleset ids.
- **Practice.**
  [combat-practice.ts](../../packages/game-core/src/company/combat-practice.ts)
  maps `hit` to `SUCCESS` / `MEANINGFUL_FAILURE`.
- **Company projection.**
  [combat-projection.ts](../../packages/game-core/src/company/combat-projection.ts)
  is persisted. It is pinned to `combatRulesetId: m1-domain-bridge-v1` and
  derives accuracy from the weapon skill level. The kernel does not know skill
  levels.
- **Production protocol.** The encounter protocol publishes unit health and
  status, not attack events or armor.
- **Stress script.** `scripts/combat-stress.ts` runs only schema 1
  `m0-prototype-v1` through `runAiBattle`. There is no schema 2 stress runner.

## Normative rule — ruleset `m1-domain-bridge-v3`

### Definitions

- **Weapon kind.** Every `WeaponProfile` declares the required
  `kind: 'melee' | 'ranged'`, including the v1 profiles; rules are code and are
  not persisted. v1/v2 resolution never reads `kind`. `sword-shield`, `spear`,
  `great-weapon` and `raider` are melee (a spear at distance 2 is a melee reach
  blow); `bow` is ranged.
- **Melee training.** Every v3 unit has `meleeTraining: 'trained' | 'recruit'`.
  - Company fighters: admission derives it from the authoritative character's
    weapon skill level at admission time: `recruit` when the level is below
    `RECRUIT_WEAPON_SKILL_LEVEL` (D1). It is not stored in the persisted company
    combat projection and is never client-supplied.
  - World and hostile units: always `trained` in v3; there is no authored
    override.
- **Score.** `S = clamp(base + effectiveAccuracy + weapon.accuracyModifier −
effectiveDefense, min, max)`. This is the existing formula and inputs (low
  stamina, shaken, defend bonus), unchanged.

### Resolution (one quality roll, then the existing damage roll)

Draw `R = drawRandomInt(1, 100)` once, as today. `P = ⌊S × precisePercent / 100⌋`.

| Attack         | `R ≤ P`   | `P < R ≤ S` | `R > S`    |
| -------------- | --------- | ----------- | ---------- |
| Melee, trained | `precise` | `solid`     | `glancing` |
| Melee, recruit | `precise` | `solid`     | `miss`     |
| Ranged         | `solid`   | `solid`     | `miss`     |

On any quality except `miss`:

- draw the damage-variance roll as today;
- `raw = max(1, ⌊max(1, base + variance) × tierPercent / 100⌋)`, where
  `tierPercent` is `glancing`, `solid` or `precise` from the rules;
- the existing penetration, armor absorption, armor wear, morale, wound, death,
  ally-death morale and terminal-outcome pipeline runs unchanged.

Provisional v3 numbers, kept in rules and not in code: `precisePercent 20`,
tier damage `glancing 50 / solid 100 / precise 125` (D2). Balance is
NOT_MEASURED.

**Always-damage invariant.** For a trained melee attack on any active enemy,
the event values satisfy `armorDamage + healthDamage ≥ 1`:

- `raw ≥ 1`;
- penetration is below 100 %, so `blockable ≥ 1`. v3 rules assert penetration
  is below 100 for every melee profile;
- with armor, `armorDamage ≥ armorAbsorbed ≥ 1`;
- without armor, `healthDamage = raw ≥ 1`.

Assert the invariant in code (`invariant`) and in property tests.

**Shield.** There is no separate shield pool. Defense and the `defend` bonus
shift blows toward `glancing`, and the blow lands on the single armor pool. A
shield durability pool is out of scope.

**Incorporeal.** The owner exception «бой с призраками» is recorded. No
canonical incorporeal creature exists, so v3 implements no incorporeal flag.
The first approved incorporeal creature gets its own contract.

### Event contract

`attack.resolved` gains optional `quality?: 'miss' | 'glancing' | 'solid' |
'precise'` and `qualityScore?: number`:

- both are **required** for v3 and **absent** for v1/v2, whose historical
  events never change;
- for v3, `hit` stays `quality !== 'miss'`, `hitChance` is the connect chance
  (100 for trained melee, `S` otherwise), and `qualityScore` is `S`.

`unit.damaged` and the other events are unchanged. Every exhaustive switch over
`quality` ends in `assertNever`.

### Practice mapping (fail closed)

`combat-practice.ts` branches on the event:

- `quality` present: `precise` and `solid` map to `SUCCESS`; `glancing` and `miss`
  map to `MEANINGFUL_FAILURE`;
- `quality` absent: v1/v2 journal, the existing `hit` mapping;
- `quality` present but the ruleset is not v3, or v3 without `quality`: reject
  (`INVALID_SOURCE`).

For the same `S` the v3 SUCCESS set (`R ≤ S`) equals the v2 hit set, so the
per-attack success rate is unchanged. Per-battle progression can still shift
because battles get shorter (NOT_MEASURED).

### Public battle line (player-visible)

The encounter public projection gains `recentAttacks` under an encounter
protocol version bump:

- the attacks of the current activation and the previous one, at most 8;
- each entry is `{ attackerId, targetId, quality }`.

There is no roll, chance, armor value or private field. Every participant can
observe these facts in the battle. The web encounter view renders them as one
short line each. A knowledge review confirms nothing beyond the observed blow
leaks (MC-16).

### Pre-attack preview (pure core function)

Export `previewAttack(state, command)` from `@warwrit/game-core`:

- **Input.** An `AttackCommand` with the current `activationId`.
- **Oracle.** `applyCombatCommand` with the same command and a fresh
  `commandId`.
- **Rejections.** It returns exactly the oracle's rejection for
  `BATTLE_TERMINAL`, `UNIT_NOT_FOUND`, `NOT_ACTIVE_UNIT`, `TARGET_NOT_FOUND`,
  `INVALID_TARGET`, `OUT_OF_RANGE`, `INSUFFICIENT_ACTION_POINTS` and
  `INSUFFICIENT_STAMINA`. `DUPLICATE_COMMAND` and `STALE_ACTIVATION` are outside
  its contract.
- **Result.** `{ connectChance, qualityScore, tiers: [{ quality, chancePer100,
event: { healthDamage: {min, max}, armorDamage: {min, max} } }] }`, with
  `chancePer100` summing to 100. The ranges use the **event** values: uncapped
  `healthDamage` and capped `armorDamage`, as `unit.damaged` reports them.
- **Implementation.** It uses the same score and damage functions as
  resolution, with no second formula, no RNG and no mutation.
- **Exposure.** None in this contract. Exposing it to players is D3.

## Versioning and compatibility

- **Ruleset.** Add `M1_DOMAIN_BRIDGE_V3_RULESET_ID = 'm1-domain-bridge-v3'`.
  `combatRules(id)` and `compareCombatUnitIds` become exhaustive switches with
  a v3 case (code-unit ordering, like v2). There is no fallback.
- **Setup.** `BattleSetupV2` (schema 2) accepts v3. `meleeTraining` is required
  on every v3 unit and rejected on v1/v2 units; validation fails closed with no
  partial setup.
- **Replay digest.** `canonicalUnit` adds `meleeTraining`. `JSON.stringify`
  omits `undefined`, so v1/v2 canonical bytes and digests are unchanged
  (asserted in MC-04).
- **Server consumers** accept v3 explicitly:
  - admission (new encounters → v3);
  - encounter replay verification;
  - world-hostile AI wake;
  - FIRST HUNT terminal settlement (v2 or v3).

  Persisted in-flight v2 encounters continue and settle under v2.

- **Company aggregate.** For v3 only, the exact-field shapes (setup unit, world
  participant, battle unit) and the participant-to-setup canonical comparison
  account for `meleeTraining`. v1/v2 shapes are unchanged. The persisted company
  combat projection shape and its pinned `combatRulesetId` are unchanged.
- **No SQL migration.** `ruleset_id` in `0005_company_domain` is unconstrained
  text, and combat ruleset ids live in JSON.
- **Combat lab** unchanged (M0).

## Out of scope

- line of sight, cover, flanking, height, zone of control;
- incorporeal targets, shield durability and new weapon profiles (knife, axe);
- exposing the preview to players, the 3D animation sequencer and the
  battlefield test maps
  ([battlefield-test-maps](../wiki/battlefield-test-maps.md));
- moving the combat lab to schema 2;
- balance acceptance.

## Steps

Commit after each step; one writer. Hard time box: **8 h** total. If a step fails
twice or exceeds its box, stop and ask the owner one bundled question.

| #   | Step                                                                                                                     | Box     | Done when                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------ | ------- | ------------------------------------------------- |
| 0   | Gate: read ADR-0002, this contract, warwrit-domain; print starting-company weapon skill levels; record D1                | 20 min  | D1 value recorded here                            |
| 1   | Rules: required `kind`, `COMBAT_RULES_V3`, ruleset id, exhaustive `combatRules`/`compareCombatUnitIds`                   | 45 min  | Typecheck passes; v1/v2 tests unchanged and green |
| 2   | Setup and digest: `meleeTraining` validation, kernel unit state, `canonicalUnit`                                         | 45 min  | MC-04 and MC-09 pass                              |
| 3   | Resolution: tiers, tier damage, invariant, event fields; shared score/damage functions                                   | 90 min  | MC-01, 02, 03, 06 pass                            |
| 4   | Preview: `previewAttack` on the shared functions                                                                         | 45 min  | MC-07 and MC-08 pass                              |
| 5   | Company and server: practice branch, aggregate v3 shapes, admission derivation, replay verification, AI wake, settlement | 120 min | MC-10, 11, 15 pass                                |
| 6   | Public battle line: `recentAttacks` projection, protocol bump, web line                                                  | 60 min  | MC-12 and MC-16 pass                              |
| 7   | Stress and closeout: schema 2 generator and AI runner for v2/v3, docs, changelog, review                                 | 75 min  | MC-13, 14, 17 pass                                |

## Acceptance criteria

Each criterion needs evidence: a test name, a command output or a screenshot
path.

| Id    | Criterion                                                                                                                                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| MC-01 | v3 trained melee never yields `miss` (property over ≥ 10 000 generated attacks)                                                                                                                                                             |
| MC-02 | Always-damage invariant holds on event values for v3 trained melee, including armor 0, armor ≥ raw, every melee profile and a defending target                                                                                              |
| MC-03 | v3 recruit melee and v3 ranged can miss; with `S` fixed, boundaries are exactly `P` and `S` (tests at boundary −1/0/+1, including `S = 5` and `S = 95`)                                                                                     |
| MC-04 | v1 and v2: all existing fixtures, golden replays and digests are unchanged, and `git diff` shows no edits to released fixtures; v1/v2 canonical bytes are identical before and after                                                        |
| MC-05 | A v3 battle replays to identical state, events and digest across two runs and from the journal                                                                                                                                              |
| MC-06 | Rule shape: one quality roll, plus one damage roll exactly when the quality is not `miss` (draw counts differ from v2 for the same attacks by design)                                                                                       |
| MC-07 | `previewAttack` agrees with resolution: for random states, every `R` and variance, the realised quality is a listed tier and the event `healthDamage`/`armorDamage` lie within that tier's ranges; `chancePer100` sums to 100               |
| MC-08 | `previewAttack` rejects exactly as the oracle for the eight listed codes and never mutates deep-frozen input                                                                                                                                |
| MC-09 | A v3 unit without `meleeTraining`, or a v1/v2 unit with it, is rejected with no partial state                                                                                                                                               |
| MC-10 | Practice: for every `S` in {5, 40, 65, 95}, enumerating `R` in 1..100 gives v3 SUCCESS count equal to v2 hit count; a malformed source is rejected; v1/v2 mapping unchanged                                                                 |
| MC-11 | End to end: a new world encounter is admitted under v3, AI wakes, it resolves, replay verification passes, and FIRST HUNT settlement accepts it; a persisted v2 encounter resumes and settles under v2                                      |
| MC-12 | In the running game, attacking adjacent enemies shows the public lines and no «промах» for trained melee; screenshot saved                                                                                                                  |
| MC-13 | Stress: the same schema 2 generator runs ≥ 10 000 battles each for v2 and v3; all terminate within limits and replay deterministically; average rounds and the `maximumRounds` termination share are recorded, and v3 is not higher than v2 |
| MC-14 | `game-core` purity: no new runtime dependency or I/O; `check:architecture` passes                                                                                                                                                           |
| MC-15 | Admission derives `meleeTraining` from authoritative skill; a client cannot supply or alter it (test with a forged field)                                                                                                                   |
| MC-16 | Knowledge review: `recentAttacks` contains only attacker, target and quality; no roll, chance, armor or private field (projection test with a deny-list like `pb01.test.ts`)                                                                |
| MC-17 | Docs: this contract's result section, combat wiki status, CURRENT_PLAN line and CHANGELOG updated with actual checks                                                                                                                        |

## Tests to write (smallest meaningful, public boundaries)

- `combat/melee-v3.test.ts`:
  - boundary tables;
  - fast-check properties MC-01/02/03/06/07/08 over generated v3 states;
  - independent oracles compute tiers from `S` and `R` without calling the
    helper under test.
- `testkit`: a schema 2 setup generator (v2/v3) and an AI runner for schema 2,
  reused by the properties and the stress script.
- `setup-v2.test.ts`: MC-09. `replay` test: MC-04 and MC-05 digests.
- Company: MC-10 enumeration and the rejection case; aggregate v3 shape
  round-trip.
- Server: MC-11 end to end, MC-15 forged field, MC-16 projection deny-list.
- Web: render test for the public battle line.

## Self-verification (author, before review)

1. Tick every acceptance row with its evidence.
2. Counterexample pass (warwrit-review):
   - armor 0; armor larger than raw; `S` at 5 and 95; `P = 0` (`S < 5` is
     impossible, assert);
   - a defending target; a shaken, low-stamina attacker; a spear at distance 2;
   - a recruit bow; a recruit with level exactly at the threshold;
   - the last enemy dying (terminal path); a rejected attack (no state change);
   - an in-flight v2 encounter across deploy.
3. Compatibility pass:
   - existing combat, company and encounter test files run unchanged;
   - no edits to fixtures or golden data;
   - replay an existing v2 journal.
4. Consumer pass:
   `git grep -n "attack.resolved\|\.hit\b\|hitChance\|CombatRulesetId\|M1_DOMAIN_BRIDGE"`;
   every hit either handles v3 or provably ignores it.
5. Knowledge pass: run the MC-16 deny-list; the preview is unexposed.
6. Demonstration: MC-12 screenshot under
   `docs/work-packages/assets/melee-connect/`.

## Code quality gate

Step checks, the smallest relevant set:

- `pnpm --filter @warwrit/game-core typecheck`;
- the touched test files;
- `pnpm exec eslint <changed>`;
- `pnpm check:architecture`.

Before the PR, once and sequentially:

- `pnpm format`, `pnpm lint`, `pnpm check:patterns`, `pnpm check:dead-code`;
- `pnpm exec fallow review --base origin/main --brief` with no new complexity or
  clone findings in changed code;
- `pnpm test:coverage` then `pnpm check:changes` (commit audit), with the
  changed `game-core` lines covered;
- `pnpm test:combat:stress` (v2 and v3), then `pnpm verify`;
- `pnpm test:migrations` only if a migration was added (none expected).

Never weaken a check or skip the audit on the PR head.

Design rules:

- One score function and one damage function, shared by resolution and preview.
- Exhaustive `switch` + `assertNever` on ruleset, weapon kind and quality.
- Rules data live in `COMBAT_RULES_V3`, not as engine constants.
- Reject invalid input without partial mutation.
- No class, framework or event bus.
- Stay within the fallow complexity limits; extract cohesive helpers only.

Review: run an independent `warwrit_reviewer` on the frozen diff. Run the visual
critic only on the MC-12 screenshot if the battle UI changes visibly. Fix
confirmed findings and repeat once.

## Open owner decisions

- **D1, recruit threshold.** `recruit` when the weapon skill level is below
  `RECRUIT_WEAPON_SKILL_LEVEL`. Recommended default: **1**, i.e. only fighters
  with level 0 in that weapon are recruits. Step 0 prints starting-company
  levels. If starting companions are level 0, the default would make the whole
  starting party recruits; then ask the owner before continuing.
- **D2, tier numbers.** `precisePercent 20`, damage `50/100/125`. Recommended:
  accept as provisional and tune after playtest.
- **D3, preview exposure.** Showing chances reveals derived enemy defense.
  Recommended: a separate contract after the 3D battle presentation.

## Review record

2026-10-07, independent read-only critic (`warwrit-critic`) on revision 1
returned DONE_WITH_CONCERNS. All confirmed findings are incorporated in revision 2:

- F1: the combat lab is M0-only and forbids chance exposure. The demo moved to
  the real encounter plus a stress log, and the lab is out of scope.
- F2: three missed server v1/v2-only checks were added (replay verification, AI
  wake, settlement).
- F3: exact-field aggregate validators were added. `meleeTraining` is derived
  at admission, not persisted in the company projection.
- F4: `canonicalUnit` digest field added.
- F5: schema 2 stress runner and generator added.
- F6: the D1 default changed from 0 to 1.
- F7: preview oracle and rejection codes specified.
- Risks R1–R4 were adopted: practice fails closed, hostiles are always
  trained, event-value ranges, and MC-06 rephrased.
- Advice adopted: `kind` is required on every profile.

The critic confirmed the always-damage proof, the practice SUCCESS-set
equality, no SQL constraint on ruleset ids, and that v1/v2 byte identity is
achievable.
