# Warwrit current delivery plan

- Status: operational mirror for coding agents
- As of: 2026-09-10
- Product/planning authority: canonical Airtable base `apph3bj1NyVrfJeLM`
- Active route: [WP02-SMALL-STEPS-v1](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recujFwLEiCeXwK6b), parent [#8](https://github.com/Vovanostm/warwrit/issues/8)
- Current delivery: R00, documentation only; next implementation: A01 only, after verified R00 merge

## Current state

```yaml
M0: done
S-02: done
WP-00: done
WP-01: done
WP-02: in-progress
M1: incomplete
current_slice: R00
next_implementation: A01
activation_requires: R00-verified-merged
merge_authorized: R00-only-by-owner-2026-09-10
deploy_authorized: false
production_runtime: repository-pinned-node-24
package_manager: repository-pinned-pnpm
persistence: postgresql-kysely-pg
renderer: Q-T03-evidence-pending
```

WP-02.1–02.4 are merged. [PR #16](https://github.com/Vovanostm/warwrit/pull/16)
merged on 2026-09-09 at 20:53:37 UTC; verified main is
`34015bc0147163bfc3255668756a9151a5c10f4e`, tree `d448dd7a0dc3ced1c8dff9e76f71c261e166c86d`.
This is the R00 starting checkpoint, not permission to reset a newer main.
Read live refs, comments and CI before delivery; a feature checkout is not merge evidence.
The owner authorized implementation and merge of R00 only. Do not repeat WP-02.4,
implement A01 in R00, or incorporate [PR #17](https://github.com/Vovanostm/warwrit/pull/17)
(language policy, separately open at this checkpoint). Other merges, auto-merge,
deployment and purchases require separate permission.

## Authority and source order

Follow [AGENTS.md](../../AGENTS.md). Read full Notes plus dated Purpose amendments,
not just titles or historical statuses. The small-step route changes delivery size/order,
not approved game rules. These are pointers into Artifacts `tblwAxG5Ek1FyWpiW`, not a second GDD:

- W: WP-02 card `rec6JCF929ViGc2MX` in Work Packages `tbl9QMeAY4gJKUlHy`; launch `rec5bphVYSZUTqavX`.
- A / X: approval `rechIKj0hsvfXIvFU`; corrections C01–08/D09 `recuq6OOuKnmc1yJL` override conflicting older rules.
- L / D: Learning/Social `recOyDQ7yV34AageO`; Definitions `reci8qK8KmIhPzasI`, only parameters compatible with X/A.
- C / B: Commands `rec3eMARPK5nj4pMD`; Bridge/Persistence/extensions `rectWbemYe4OgAxFD`.
- Y / E / P: lifecycle `rec39pw7h0ycTk4r7`; economy `recveXOcVDyTz6dAZ`; physical `recuaQS4s8GTRcEgA`.
- Edition: readiness v1.2 `recuCnhrb6OJMIvak`; baseline `recdUjdne68biQYoE` and its substantive sources; semantic corrections `rec822ZmnjlU0kcaR`.

The former Q-CHAR-13A..14C and Q-CHAR-15A blocking lists describe historical state. Do not reopen those decisions. See the [dated ADR-0004 addendum](../architecture/0004-company-identity-succession-2026-09-07.md). Keep the original accepted history intact.

## Ownership map: existing state versus planned additions

Paths below are under `packages/game-core/src/company/`. Read actual consumers before changing ownership.

- **Lifecycle (Y):** [lifecycle-types.ts](../../packages/game-core/src/company/lifecycle-types.ts) owns identity, kinship, membership, location and availability. Its existing skills/perks and bypass records are compatibility inputs, not proof that progression/social execution is finished.
- **Finance (E):** [economy-types.ts](../../packages/game-core/src/company/economy-types.ts) owns q balances, claims, reserves and payments. A learning `maxBudget` is a spending limit, never a second wallet.
- **Physical (P):** [physical-types.ts](../../packages/game-core/src/company/physical-types.ts) owns item identity/owner/custody, books, equipment, condition instances and current pools. Learning references these entities; it does not clone inventory. Preserve explicit legacy condition bindings.
- **Progression/perks (L/D, planned A/B):** one XP/carry/source-credit owner and one perk selection/history owner. Level is derived/checked, not a second writable counter. A02 must bind existing level-only saves explicitly; missing fractional XP cannot be invented.
- **Learning (L, planned C/D):** finite task/work-section progress and occupied study intervals, with references to physical access and finance. Reuse the same bounded course model for retraining.
- **Social (L/X/A, planned E):** base relations, source memories and chronicle have one owner; effective relations and active-memory selection are derived. E03 binds legacy bypass contributions once; clamped results cannot be inverted into invented base values.
- **Binding (B/X, planned G):** immutable tactical snapshot and provenance, not another persistent Character, item or HP store; preserve V1 history.
- **Composition/persistence (C/B/X):** [prepareCompanyEconomy](../../packages/game-core/src/company/economy.ts) currently prepares one lifecycle+finance+physical draft. Extend that composition, not independent child commits; H adds one atomic snapshot/audit/receipt transaction and post-commit publication.

`PREPARED` is not aggregate `Accepted` or durable commit. `INFORMED_SOCIAL_CONTRIBUTION`
is still residual. Actual and known snapshots intentionally differ; do not collapse the
privacy boundary for DRY. Independent test expectations are not a second production owner.

## Delivery sequence and activation gates

Use the full small-step registry for dependencies and acceptance, not this abbreviated route:

```text
MERGED WP-02.1 -> WP-02.2 -> WP-02.3 -> WP-02.4
  -> R00 -> A practice -> B perks/care -> C finite study -> D retraining
  -> E social -> F remaining commands -> G combat V2 -> H PostgreSQL -> I acceptance
```

One writer and one small reviewable PR per task. The target is 300–400 added+deleted
lines across code, tests, SQL and docs after normal formatting; smaller is fine (R00 is
intentionally short). Above 400, split a cohesive tested responsibility before delivery;
do not hide tests, minify, change formatting or split only commits inside a giant PR.
Dependencies outrank letter order; refine distant G/H tasks against real predecessor APIs.

Next **A01 only**: exact XP/milliXP, rational carry and level-threshold arithmetic,
using L/D/X and the registry's full A01 launcher. No Character migration, gameplay command,
book/task, payment, social, V2, SQL or UI integration. A01 and subsequent tasks are not delivered by R00.
`StartLearning` stays disabled until C08. `BeginEncounterBinding`,
`ConsumeCombatReceipt` and `FinalizeEncounter` stay disabled until G10.
F02 remains `NEEDS_NARROW_SERVICE_CONTRACT` for cosmetic/service keys: it blocks itself
and full WP-02 closure, not independent arithmetic, bridge or database preparation.
WP-03 authority/reconnect/timers, Q-T03 / issue #6 renderer comparison and WP-04–15
remain later work, not silently completed or decomposed here.

## Source and evidence boundaries

G0 permits an explicitly labelled independent reconstruction of machine contracts from canonical Notes. Neither the missing original v1 ZIP nor the independently regenerated v1.2 ZIP is claimed byte-verified by this implementation. `RC-GAP-MACHINE-01` remains a named source-concordance gap, not a new product interview. Use the source manifest in the active WP contract; do not infer 117 executed tests from a catalogue count.

Original source ZIP concordance remains `NOT_RUN`. Previous PR #16 CI is predecessor
evidence, not an A01 or R00 test run. Foundation migration smoke is not proof of the
future H transaction/race/crash guarantees. Full WP-02 and M1 remain incomplete.

M0 proves deterministic combat, termination and replay, not player enjoyment. Q-C01/Q-C10/R-01 require interactive M1 evidence. The 30-second activation limit remains a versioned parameter for player validation. Q-T03 / issue #6 compares Babylon and PlayCanvas with the same scene and workflow; no permanent renderer dependency is installed by WP-02.1.

## Resources

One owner plus ChatGPT agents. Server target: Yandex Cloud, 2 cores / 4 GB RAM. Account conservatively for OS, application and database within the total until topology is specified. Do not presume a paid external database, use the game VM as a coding/CI runner, or promise 50-100 CCU without measurements.

Primary available test client: MacBook + Chrome. Record actual model/chip/RAM/OS/browser/resolution at benchmark time; do not guess Apple Silicon. Other compatibility profiles are not silently removed. Unspecified spending/time budgets do not authorize purchases or block headless type work.

## Validation and change control

Retain the pinned toolchain, zero-runtime-dependency core, Fastify control plane and PostgreSQL/Kysely persistence. Realtime and rendering remain adapters. Run repository validation without weakening it, report exact commits/commands/outcomes, and distinguish source, implementation, database, renderer and player evidence. Update Airtable and Empirical with readback after each actual delivery.

Use the unchanged full gate in [AGENTS.md](../../AGENTS.md) / [bootstrap.sh](../../scripts/bootstrap.sh)
once on the exact final tree; do not repeat passing identical-tree checks. Perform two
separate author reviews: source/postulate/counterexample, then ownership/consumers/privacy/
compatibility/scope/raw diff size. Do not claim independent approval from those passes.
Record actual PR merge and next-step status in GitHub/Airtable/Empirical with readback;
Git history and linked PRs retain older operational transitions. Do not rewrite ADRs or PR #17.
