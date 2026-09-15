# Warwrit current delivery plan

- Status: operational mirror for coding agents
- As of: 2026-09-14
- Product/planning authority: canonical Airtable base `apph3bj1NyVrfJeLM`
- Active route: [WP02-SMALL-STEPS-v1](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recujFwLEiCeXwK6b), parent [#8](https://github.com/Vovanostm/warwrit/issues/8)
- Current execution cards: [WARWRIT-PARALLEL-SESSIONS-v2](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/reccRe24oWIFAbiXo), supporting delivery guidance, not game canon
- Main checkpoint: E04a [PR #74](https://github.com/Vovanostm/warwrit/pull/74) merged as `6a54bbafd212af6dad6744cb87ffec33fd3b7708`; full E04 remains partial
- Current product fronts: C05 after merged C04b; E04 remainder after merged E04a; G05 after merged G04

## Current state

```yaml
M0: done
S-02: done
WP-00: done
WP-01: done
WP-02: in-progress
M1: incomplete
main: 6a54bbafd212af6dad6744cb87ffec33fd3b7708
main_post_merge_verification: passed-run-34875753751
C_flow: C04b-merged-pr61; C05-in-progress-issue71; prerequisite-pr73-unmerged
E_flow: E01-E03-merged; E04a-merged-pr74; E04-partial-issue69
G_flow: G01-G04-merged; G05-pr72-unmerged; G10-after-G09+C08+E05
H_flow: after-required-domain-activation-and-G10
I_flow: after-H-durability-executor-path
F02: merged-pr35
PR17: separate-docs-merged
renderer: issue6-open-Q-T03-evidence-pending
merge_authorized: false
deploy_authorized: false
production_runtime: repository-pinned-node-24
package_manager: repository-pinned-pnpm
persistence: postgresql-kysely-pg
```

Status words are not interchangeable: **OPEN** means not merged; **READY FOR REVIEW** means the
current PR has review/verification evidence suitable for a merge decision; **MERGED** means GitHub
records the merge on `main`; **post-merge verification** means a subsequent `main` CI run passed.
A predecessor PR's green CI is not post-merge evidence for a later main revision.
The checkpoint above passed main-push [CI run 34875753751](https://github.com/Vovanostm/warwrit/actions/runs/34875753751).
That existing run verifies the integrated main checkpoint, not this later OPS2 documentation change.

WP-02.1–02.4 and R00 are merged. [PR #18](https://github.com/Vovanostm/warwrit/pull/18)
merged R00 as `321640fb737ed22db96fb5525b4b4257b01397ab`,
tree `c1533292f0e0ff094c67fac4cdbc51282fb18546`, after [PR #16](https://github.com/Vovanostm/warwrit/pull/16).
A01 [PR #20](https://github.com/Vovanostm/warwrit/pull/20) merged as `b60ab8c36e5e458b08cb012a02de7eac55cae348`,
tree `0550d28dae1683899bc7f6aba91b6d7536c7d1f2`. Do not reset newer main or repeat completed tasks.
A02 [PR #22](https://github.com/Vovanostm/warwrit/pull/22) merged as `88d78a710cd574efdd1375750d89ac273b14375b`,
tree `4e1dc5fe58d762feff2dfaa66045679196176b36`. A03 [PR #25](https://github.com/Vovanostm/warwrit/pull/25)
merged as `5d28edc1e4c9223ad3771745eab39bebe7b2d66e`, tree `80d58db2af63198108dd14811a6cbdbd536ddbc1`.
B03 [PR #46](https://github.com/Vovanostm/warwrit/pull/46) and B04 [PR #50](https://github.com/Vovanostm/warwrit/pull/50)
are merged; B04 is the completed care-practice successor, not a future pointer. F02 [PR #35](https://github.com/Vovanostm/warwrit/pull/35)
is also merged; it is no longer blocked by a missing narrow service contract.
C01/C03/C02/C04a/C04b are merged through PRs #29/#56/#58/#60/#61; C05 is the active C slice.
Existing [PR #73](https://github.com/Vovanostm/warwrit/pull/73) is an unmerged historical start-input prerequisite;
full C05 settlement remains open in [issue #71](https://github.com/Vovanostm/warwrit/issues/71), not C06-ready.
E01 [PR #32](https://github.com/Vovanostm/warwrit/pull/32), E02 [PR #37](https://github.com/Vovanostm/warwrit/pull/37)
and E03 [PR #67](https://github.com/Vovanostm/warwrit/pull/67) are merged.
E04a [PR #74](https://github.com/Vovanostm/warwrit/pull/74) is merged, but E04 remains partial in [issue #69](https://github.com/Vovanostm/warwrit/issues/69):
exact warning/farewell contexts and causal composition remain, plus the unresolved no-farewell fact/notification/cutoff policy. Do not advance to E05.
G01 [PR #31](https://github.com/Vovanostm/warwrit/pull/31), G02 [PR #41](https://github.com/Vovanostm/warwrit/pull/41),
G03 [PR #55](https://github.com/Vovanostm/warwrit/pull/55) and G04 [PR #65](https://github.com/Vovanostm/warwrit/pull/65)
are merged; continue G05 in existing unmerged [PR #72](https://github.com/Vovanostm/warwrit/pull/72), not a duplicate. G06 waits for actual G05 merge.
[PR #17](https://github.com/Vovanostm/warwrit/pull/17) is MERGED as a separate documentation-only language/context change;
it does not change WP-02 product status or merge authority.
The earlier OPS [PR #62](https://github.com/Vovanostm/warwrit/pull/62) is merged; duplicate [PR #63](https://github.com/Vovanostm/warwrit/pull/63)
is closed without merge. Do not repeat PR #62 or reopen PR #63.
Renderer [issue #6](https://github.com/Vovanostm/warwrit/issues/6) remains the separate Q-T03 Babylon.js-vs-PlayCanvas evidence spike for later WP-04.
No successor merge, auto-merge, deployment or purchases are authorized by this plan.

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
- **Progression/perks (L/D):** [skill-progress.ts](../../packages/game-core/src/company/skill-progress.ts) defines A02's single per-character `skills` entry: a legacy level or versioned exact XP/carry/binding, never both. [progression.ts](../../packages/game-core/src/company/progression.ts) derives levels and owns arithmetic. Missing XP stays unknown; only trusted explicit imports or new-person opening grants bind it. A03 supplies legitimate practice/source credits. B01 uses the existing per-character `perks` selection as the durable used-milestone record; B02 owns effect evaluation.
- **Learning (L, planned C/D):** finite task/work-section progress and occupied study intervals, with references to physical access and finance. Reuse the same bounded course model for retraining.
- **Social (L/X/A, planned E):** base relations, source memories and chronicle have one owner; effective relations and active-memory selection are derived. E03 binds legacy bypass contributions once; clamped results cannot be inverted into invented base values.
- **Binding (B/X, planned G):** immutable tactical snapshot and provenance, not another persistent Character, item or HP store; preserve V1 history.
- **Composition/persistence (C/B/X):** [prepareCompanyEconomy](../../packages/game-core/src/company/economy.ts) currently prepares one lifecycle+finance+physical draft. Extend that composition, not independent child commits; H adds one atomic snapshot/audit/receipt transaction and post-commit publication.

`PREPARED` is not aggregate `Accepted` or durable commit. E04a consumes supported
`INFORMED_SOCIAL_CONTRIBUTION` requirements internally; full E04 context composition and E05
public disclosure remain unfinished. Actual and known snapshots intentionally differ; do not collapse the
privacy boundary for DRY. Independent test expectations are not a second production owner.

## Delivery sequence and activation gates

Use the full small-step registry for dependencies and acceptance, not this abbreviated route:

```text
MERGED WP-02.1 -> WP-02.2 -> WP-02.3 -> WP-02.4
  -> R00 -> A practice -> B perks/care -> C finite study -> D retraining
  -> E social -> F remaining commands -> G combat V2 -> H PostgreSQL -> I acceptance
```

The route is a dependency graph, not a single serial cursor. Current verified fronts are:

```text
C: C04b MERGED -> C05 -> C06 -> C07 -> C08
E: E01 + E02 + E03 MERGED -> E04 (E04a MERGED; remainder #69) -> E05
G: G01 + G02 + G03 + G04 MERGED -> G05 -> G06 -> G07 -> G08 -> G09 -> G10
```

G10 is the combat activation point and requires G09 plus the completed C08 and E05 paths.
H durable persistence/execution follows the required completed domain paths and G10; I acceptance
follows H rather than substituting for H's transaction/race/crash evidence. Refine distant G/H tasks
against real predecessor APIs instead of assuming the original sketches remain exact.
C08 opens D01 -> D02 (B01 is merged); E05 opens F01. H01-H08 lead to I01;
I02 additionally requires F01, D02 and the already merged F02/B04.
The current remainder is 25 original WP-02 responsibilities, not a promised PR count or game-completion percentage.

One writer and one small reviewable PR per task. `CURRENT_PLAN.md` is maintained by one delivery
coordinator; parallel implementation sessions record their own PR/Airtable/Empirical results and do
not race-edit this file. Before finalizing a plan update, re-read live `main`, open PRs and CI.
The target is 300–400 added+deleted lines across code, tests, SQL and docs after normal formatting;
smaller is fine (R00 is intentionally short). Above 400, split a cohesive tested responsibility before delivery;
do not hide tests, minify, change formatting or split only commits inside a giant PR.
Dependencies outrank letter order; refine distant G/H tasks against real predecessor APIs.

A01 supplies exact XP/milliXP, rational carry and level-threshold arithmetic only,
not active gameplay learning or proof that practice was legitimate.
A02's exact owner is merged. A03 is merged: `practice-admission.ts`, exact `CreditPractice`,
skill-scoped root replay and retained source evidence are live on `main` through PR #25.
No missing legacy XP is invented. B04 now supplies the concrete `care-provided` producer; G09 remains deferred.
A04 is merged independently through [PR #34](https://github.com/Vovanostm/warwrit/pull/34); do not reimplement it. B01 owns only
`ChoosePerk`: actual target-skill mastery, one selection per skill+25/60 milestone and durable
choice history. B02 owns effect evaluation; B03/B04 own care/help integration; D owns retraining.
No study, social, V2, SQL or UI activation. `StartLearning` stays disabled until C08.
`BeginEncounterBinding`, `ConsumeCombatReceipt` and `FinalizeEncounter` stay disabled until G10.
F02's bounded paid hair-style service is merged through PR #35; additional cosmetic categories remain deferred scope,
not a blocker for WP-02 closure unless separately added to the canonical route.
WP-03 authority/reconnect/timers, Q-T03 / issue #6 renderer comparison and WP-04–15
remain later work, not silently completed or decomposed here.

## Source and evidence boundaries

G0 permits an explicitly labelled independent reconstruction of machine contracts from canonical Notes. Neither the missing original v1 ZIP nor the independently regenerated v1.2 ZIP is claimed byte-verified by this implementation. `RC-GAP-MACHINE-01` remains a named source-concordance gap, not a new product interview. Use the source manifest in the active WP contract; do not infer 117 executed tests from a catalogue count.

Original source ZIP concordance remains `NOT_RUN`. Previous merged PR CI is predecessor evidence,
not a current-task test run. Foundation migration smoke is not proof of the future H transaction/race/crash
guarantees. A green PR is not MERGED; a merge is not post-merge verification until the corresponding
`main` check is observed. Full WP-02 and M1 remain incomplete.

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
