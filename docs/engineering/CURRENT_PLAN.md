# Warwrit current delivery plan

- Status: operational mirror for coding agents
- As of: 2026-09-22
- Product/planning authority: canonical Airtable base `apph3bj1NyVrfJeLM`
- Execution index: [WARWRIT-M1-COMPLETE-v1](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recZhUoTiwT7kIc8s); current [Sept21 batch and amendments](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recB6KuIPTQiSCpCe)
- Supporting WP-02 sources: [ROUTE](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recujFwLEiCeXwK6b), [V3](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recFIf3eiwmpI03Qu), parent [#8](https://github.com/Vovanostm/warwrit/issues/8); dated amendments supersede old operational statuses
- Main checkpoint: `74394870ac0397626e5a18f42d2205f637273875`, tree `01f98bc541aed0f08af336cfd4d755072f0c5d4a`; no open PRs at preflight, before this M1-OPS PR
- Eligible implementation responsibilities: PB01 / C05-FIN / E04-BIND / G07; eligibility is not an assignment, reservation or launched agent

## Current state

```yaml
M0: done
S-02: done
WP-00: done
WP-01: done
WP-02: in-progress
M1: incomplete
main: 74394870ac0397626e5a18f42d2205f637273875
main_post_merge_verification: passed-run-35095951069
C_flow: C05-prerequisites-merged-pr73-pr75-pr79; C05-FIN-next; issue71-open
E_flow: E04-A-accepted; E04a-e-merged-pr74-pr78-pr80-pr81-pr82; E04-BIND-next; issue69-open
G_flow: G01-G06-merged; G07-next; G10-after-G09+C08+E05
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

**SOURCE-READY** is not implementation. **IMPLEMENTED/PARTIAL** does not complete its parent card.
**REVIEWED/OPEN/UNMERGED** needs actual author-review and exact-tree gate evidence; it is not a merge.
**MERGED** requires actual GitHub/main readback; **post-merge verification** requires observed main CI.
The checkpoint above passed main-push [CI run 35095951069](https://github.com/Vovanostm/warwrit/actions/runs/35095951069).
That existing run verifies the integrated main checkpoint, not this later M1-OPS documentation tree.

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
C01/C03/C02/C04a/C04b are merged through PRs #29/#56/#58/#60/#61.
C05 prerequisites [PR #73](https://github.com/Vovanostm/warwrit/pull/73), [#75](https://github.com/Vovanostm/warwrit/pull/75)
and [#79](https://github.com/Vovanostm/warwrit/pull/79) are merged: historical inputs, fractional study/XP and accepted course efficiency.
[COURSE approval/delivery](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recPH833vQYr6teHf) supersedes its old proposal title.
Full C05 still needs finance, finite elapsed/terminal/replay and composition in [#71](https://github.com/Vovanostm/warwrit/issues/71); C06 is not ready.
E01 [PR #32](https://github.com/Vovanostm/warwrit/pull/32), E02 [PR #37](https://github.com/Vovanostm/warwrit/pull/37)
and E03 [PR #67](https://github.com/Vovanostm/warwrit/pull/67) are merged.
E04a-e PRs #74/#78/#80/#81/[#82](https://github.com/Vovanostm/warwrit/pull/82) are merged: exact contexts, social remedy primitive,
final outcome and selected-gift exit composition. [FAREWELL_ACCEPTED](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/rec7kz9dUerTb0ZdL)
accepts E04-A; lawful individual knowledge/reaction/remedy binding and full acceptance remain in [#69](https://github.com/Vovanostm/warwrit/issues/69). E05 stays gated.
G01 [PR #31](https://github.com/Vovanostm/warwrit/pull/31), G02 [PR #41](https://github.com/Vovanostm/warwrit/pull/41),
G03 [PR #55](https://github.com/Vovanostm/warwrit/pull/55) and G04 [PR #65](https://github.com/Vovanostm/warwrit/pull/65)
are merged, as are G05 [#72](https://github.com/Vovanostm/warwrit/pull/72) and G06 [#77](https://github.com/Vovanostm/warwrit/pull/77).
[G06 delivery](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recegOJzWgEhi3k3K) is receipt preparation, not applied physical effects or combat activation; continue G07.
[PR #17](https://github.com/Vovanostm/warwrit/pull/17) is MERGED as a separate documentation-only language/context change;
it does not change WP-02 product status or merge authority.
Earlier OPS [#62](https://github.com/Vovanostm/warwrit/pull/62) and OPS2 [#68](https://github.com/Vovanostm/warwrit/pull/68) are merged;
duplicate [#63](https://github.com/Vovanostm/warwrit/pull/63) stays closed without merge. Retained branches are not new deliverables.
Renderer [issue #6](https://github.com/Vovanostm/warwrit/issues/6) remains the separate Q-T03 Babylon.js-vs-PlayCanvas evidence spike for later WP-04.
This plan grants no merge, auto-merge, deployment or purchases. Existing FAREWELL_ACCEPTED permission
covers only the necessary bounded E04 remainder, after its review/exact-tree/guarded-merge conditions.
It does not transfer to M1-OPS, PB, C, G or E05; the default above remains false.

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
- **Composition/persistence (C/B/X):** [prepareCompanyEconomy](../../packages/game-core/src/company/economy.ts) prepares one lifecycle+finance+physical candidate with supported social preparation. Extend that composition, not independent child commits; H adds one atomic snapshot/audit/receipt transaction and post-commit publication.

`PREPARED` is not aggregate `Accepted` or durable commit. E04a-b consume supported
`INFORMED_SOCIAL_CONTRIBUTION` requirements and exact contexts internally; final E04 binding and E05
public disclosure remain unfinished. Actual and known snapshots intentionally differ; do not collapse the
privacy boundary for DRY. Independent test expectations are not a second production owner.

## Delivery sequence and activation gates

Use the current index/batch and full small-step registry for acceptance, not this abbreviated graph.
The following successor edges are conditional work, not launched agents or permission to copy an open PR:

```text
PB01 -> PB02 || PB04
C05-FIN -> C05-TIME -> C05-COMPOSE -> C06 -> C07 -> C08
E04-BIND -> E04-ACCEPT -> E05
G07 -> G08 -> G09; G10 additionally requires C08 + E05
```

A complete predecessor must actually merge, unless explicitly accepted as source/evidence-only.
A green/open or partial prerequisite cannot unlock a consumer needing its full responsibility.
C08 additionally joins C07 with the already merged A04/B03. G10 requires G09 plus completed C08 and E05.
H durable persistence/execution follows the required completed domain paths and G10; I acceptance
follows H rather than substituting for H's transaction/race/crash evidence. Refine distant G/H tasks
against real predecessor APIs instead of assuming the original sketches remain exact.
C08 opens D01 -> D02 (B01 is merged); E05 opens F01. H01-H08 lead to I01;
I02 additionally requires F01, D02 and the already merged F02/B04.
The index retains parent criteria; this is neither a promised PR count nor a completion percentage.

### Single coordinator and temporary shared-path ownership

Only M1-OPS writes `docs/engineering/CURRENT_PLAN.md`; PB-OPS is replaced, not another coordinator.
The [ownership/handoff note](https://github.com/Vovanostm/warwrit/issues/8#issuecomment-5774396065) records this writer,
branch `docs/m1-ops-current-plan-20260922`, narrow plan-only scope and current handoff status.
No implementation-lane writer/reservation was acknowledged in the inspected batch at this checkpoint;
a prepared prompt or no-results search cannot establish launched work or disprove unpushed work.
PB01 owns lab DTO/scenario/projection work; C05-FIN owns finance cost/carry and its terminal sub-q policy check;
E04-BIND owns lawful observer binding; G07 owns receipt-to-physical preparation, without combat activation.
Only E04-BIND may narrowly edit the existing `company/economy.ts` root in this batch. C05-FIN does not
activate learning or edit that root; later C05-COMPOSE owns learning composition.
Shared `company/index.ts`, root/finance/physical types, command registry and common tests require an
explicit temporary exclusive author/branch/path/purpose reservation BEFORE editing, with acknowledged
completion/handoff before release. Entitlement or an unacknowledged request is not a reservation.
Continue disjoint work or hand off a precise pending patch; do not bypass exports or collect open PRs.
Root scripts, lockfile, migrations, `App.tsx` and server mounting remain OUT for these four cards unless
a separately authorized, measured prerequisite changes that boundary. M1-OPS edits none of their game files.

Before a branch and publication inspect issues, all-state PRs, retained branches and saved handoffs;
continue usable work without reopening merged branches. Re-read live main/open PRs/CI before publication,
especially an authorized concurrent E04 merge. Each PR is <=400 normally formatted added+deleted textual
lines including tests, SQL, docs, fixtures and configuration; no minimum. Split complete tested responsibilities,
not just commits; do not omit tests or minify. Independent green branches do not prove their union.

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

## Persistent M1 versus early PB

Full M1 is persistent company -> travel -> contracts -> physical two-company PvE -> proof -> consequences
-> re-entry, with the accepted scope in the index. [PB01-PB09](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recaVmScKRBtwZqIX)
are a separate disposable diagnostic battle, not world/co-op delivery or M1 completion.
PB01 is eligible independently of the remaining persistent-company work; this plan does not launch it.
Actual integrated PB05 + PB06 delivery is the first local-battle candidate. Browser interaction and actual
MacBook/human evidence remain separate; authored journeys, headless CI or screenshots are not those passes.
`pnpm dev:combat-lab` is still a proposed PB08 deliverable, absent from current root package.json.
PB replay/lab acceptance does not artificially block full M1; required production durability and recovery do.
Production Colyseus authority/reconnect/timers, Q-T03 renderer comparison and full world/co-op remain separate
index responsibilities, not silently completed. Their source review need not wait for an active OPS service.

## Source and evidence boundaries

Original source ZIP concordance remains `NOT_RUN` / `RC-GAP-MACHINE-01`. Missing archives do not authorize
invented canon, byte-equivalence claims or reopening S-02. Use accepted source/version pointers and preserve
the affected concordance gate; do not infer 117 executed tests from a catalogue count.
Previous merged PR CI is predecessor evidence, not a current-task test run. Foundation migration smoke
is not proof of future H transaction/race/crash guarantees. Full WP-02 and M1 remain incomplete.

M0 proves deterministic combat, termination and replay, not player enjoyment. Q-C01/Q-C10/R-01 require interactive M1 evidence. The 30-second activation limit remains a versioned parameter for player validation. Q-T03 / issue #6 compares Babylon and PlayCanvas with the same scene and workflow; no permanent renderer dependency is installed by WP-02.1.

## Resources

One owner plus ChatGPT agents. Server target: Yandex Cloud, 2 cores / 4 GB RAM. Account conservatively for OS, application and database within the total until topology is specified. Do not presume a paid external database, use the game VM as a coding/CI runner, or promise 50-100 CCU without measurements.

Primary available test client: MacBook + Chrome. Record actual model/chip/RAM/OS/browser/resolution at benchmark time; do not guess Apple Silicon. Other compatibility profiles are not silently removed. Unspecified spending/time budgets do not authorize purchases or block headless type work.

## Validation and change control

Retain the pinned toolchain, zero-runtime-dependency core, Fastify control plane and PostgreSQL/Kysely persistence. Realtime and rendering remain adapters. Run repository validation without weakening it, report exact commits/commands/outcomes, and distinguish source, implementation, database, renderer and player evidence. Update Airtable and Empirical with readback after each actual delivery.

Use the unchanged full gate in [AGENTS.md](../../AGENTS.md) / [bootstrap.sh](../../scripts/bootstrap.sh)
once on the exact final combined tree: `pnpm verify`, `pnpm test:combat:stress`, `pnpm test:migrations`.
Use a separate disposable smoke database, never valued game data. Reuse evidence only for the same tree;
a changed integration base requires checking the actual resulting tree. Missing execution/device evidence is `NOT_RUN`.
Perform two author passes: sources/behavior/counterexamples, then owners/time/privacy/serialization/concurrency/scope/raw size;
these are not independent approvals. Record base/head/tree, commands/exits, run/job links, findings and limitations.
Save the narrow result and pointers in the selected Airtable checkpoint, GitHub and Empirical, then read back.
M1-OPS has no merge permission; leave its PR in the actual unmerged readiness state and stop at this card.
Git history and linked PRs retain older transitions. Do not rewrite ADRs or PR #17 or declare all WP-02/M1 complete.
