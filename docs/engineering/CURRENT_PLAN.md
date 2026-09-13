# Warwrit current delivery plan

- Status: operational mirror for coding agents
- As of: 2026-09-13 (dated snapshot; refresh live statuses before integration)
- Product/planning authority: canonical Airtable base `apph3bj1NyVrfJeLM`
- Active route: [WP02-SMALL-STEPS-v1](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recujFwLEiCeXwK6b), parent [#8](https://github.com/Vovanostm/warwrit/issues/8)
- Current frontier: C04b accepted technically, awaiting owner merge authorization; E03 and G04 in separate implementation sessions

## Current state

```yaml
M0: done
S-02: done
WP-00: done
WP-01: done
WP-02: in-progress
M1: incomplete
current_streams:
  C: C04b-PR61-open-ready-for-review-unmerged
  E: E03-predecessors-merged
  G: G04-predecessors-merged
next_C: C05-after-actual-C04b-merge
plan_writer: OPS
A04: merged
merge_authorized: false
deploy_authorized: false
production_runtime: repository-pinned-node-24
package_manager: repository-pinned-pnpm
persistence: postgresql-kysely-pg
renderer: Q-T03-evidence-pending
```

WP-02.1–02.4 and R00 are merged. [PR #18](https://github.com/Vovanostm/warwrit/pull/18)
merged R00 as `321640fb737ed22db96fb5525b4b4257b01397ab`,
tree `c1533292f0e0ff094c67fac4cdbc51282fb18546`, after [PR #16](https://github.com/Vovanostm/warwrit/pull/16).
A01 [PR #20](https://github.com/Vovanostm/warwrit/pull/20) merged as `b60ab8c36e5e458b08cb012a02de7eac55cae348`,
tree `0550d28dae1683899bc7f6aba91b6d7536c7d1f2`. Do not reset newer main or repeat completed tasks.
A02 [PR #22](https://github.com/Vovanostm/warwrit/pull/22) merged as `88d78a710cd574efdd1375750d89ac273b14375b`,
tree `4e1dc5fe58d762feff2dfaa66045679196176b36`. A03 [PR #25](https://github.com/Vovanostm/warwrit/pull/25)
merged as `5d28edc1e4c9223ad3771745eab39bebe7b2d66e`, tree `80d58db2af63198108dd14811a6cbdbd536ddbc1`.
B02 [PR #40](https://github.com/Vovanostm/warwrit/pull/40) is merged as
`720ebdefc631d1fe46d8cb3b8876bc25070ae890`, tree `188e1a411dd85564efff953be069033f3ef17994`.
Additional merged delivery pointers (do not repeat completed slices):

- B01 [#33](https://github.com/Vovanostm/warwrit/pull/33), B03 [#46](https://github.com/Vovanostm/warwrit/pull/46), B04 [#50](https://github.com/Vovanostm/warwrit/pull/50); A04 [#34](https://github.com/Vovanostm/warwrit/pull/34) is also merged.
- C01 [#29](https://github.com/Vovanostm/warwrit/pull/29), C02 [#58](https://github.com/Vovanostm/warwrit/pull/58), C03a [#54](https://github.com/Vovanostm/warwrit/pull/54), C03 [#56](https://github.com/Vovanostm/warwrit/pull/56), C04a [#60](https://github.com/Vovanostm/warwrit/pull/60). Superseded C02 #42 / C03 #48 are not merge candidates.
- E01 [#32](https://github.com/Vovanostm/warwrit/pull/32), E02 [#37](https://github.com/Vovanostm/warwrit/pull/37); F02 [#35](https://github.com/Vovanostm/warwrit/pull/35), narrow paid hair-style service only.
- G01 [#31](https://github.com/Vovanostm/warwrit/pull/31), G02 [#41](https://github.com/Vovanostm/warwrit/pull/41), G03 [#55](https://github.com/Vovanostm/warwrit/pull/55).

Snapshot main is `28bc1703e4261f0a0c078a8774e9b204d6217143`,
tree `c64ebb8f59d5a066baa6620adc62cd07fbde2d25` (actual C04a merge).
Its [post-merge main CI](https://github.com/Vovanostm/warwrit/actions/runs/34706141062)
is completed/success. This is predecessor evidence, not a new run for this documentation PR.

C04b [PR #61](https://github.com/Vovanostm/warwrit/pull/61) is **OPEN / READY FOR REVIEW /
UNMERGED**, `draft=false`, head `1d86b223b6fe6863d0099062775dd49a9bf08544`.
[CI 34750195063](https://github.com/Vovanostm/warwrit/actions/runs/34750195063) is completed/success;
[review 1](https://github.com/Vovanostm/warwrit/pull/61#pullrequestreview-5190360649) and
[review 2](https://github.com/Vovanostm/warwrit/pull/61#pullrequestreview-5190361585)
are two final-head **author** passes, not independent approvals. The later
[acceptance review](https://github.com/Vovanostm/warwrit/pull/61#pullrequestreview-5190913050)
reports technical PASS without code changes or a duplicate CI run. Owner merge authorization
is still absent; C04 remains In Progress and C05 waits for actual C04b merge.
E03 and G04 have merged prerequisites and can proceed independently; dependency readiness
is not implementation or review completion. Reuse assigned sessions and any existing work.

**OPEN** means not merged; **ready for review** describes review readiness, not merge permission.
**MERGED** requires GitHub's actual merge result/SHA and main ancestry; a synthetic merge ref is
not an executed merge. **Post-merge verification** separately records the actual main tree and
its CI conclusion. PR61 has no post-merge evidence while unmerged; green PR CI cannot supply it.
No successor merge, auto-merge, deployment or purchases are authorized by this plan.

[PR #17](https://github.com/Vovanostm/warwrit/pull/17) is a separate **OPEN / UNMERGED**
language/context documentation change, now reviewed and integrated with snapshot main at
head `fc61752f654e40e57ff0718cb36c66534874bdf9`; new
[CI 34760551133](https://github.com/Vovanostm/warwrit/actions/runs/34760551133) is completed/success.
The earlier conflict/September 8 evidence is historical; merge still requires separate permission.
Do not fold its AGENTS/research changes into OPS. [Renderer issue #6](https://github.com/Vovanostm/warwrit/issues/6)
is separately **OPEN**: Q-T03 evidence is still required before WP-04 locks a production renderer;
comparison preparation is not a renderer decision or WP-02 completion.

## Authority and source order

Follow [AGENTS.md](../../AGENTS.md). Read full Notes plus latest dated Purpose amendments and comments,
not just titles or historical statuses. The small-step route changes delivery size/order,
not approved game rules. These are pointers into Artifacts `tblwAxG5Ek1FyWpiW`, not a second GDD:

- W: WP-02 card `rec6JCF929ViGc2MX` in Work Packages `tbl9QMeAY4gJKUlHy`; launch `rec5bphVYSZUTqavX`.
- A / X: approval `rechIKj0hsvfXIvFU`; corrections C01–08/D09 `recuq6OOuKnmc1yJL` override conflicting older rules.
- L / D: Learning/Social `recOyDQ7yV34AageO`; Definitions `reci8qK8KmIhPzasI`, only parameters compatible with X/A.
- C / B: Commands `rec3eMARPK5nj4pMD`; Bridge/Persistence/extensions `rectWbemYe4OgAxFD`.
- Y / E / P: lifecycle `rec39pw7h0ycTk4r7`; economy `recveXOcVDyTz6dAZ`; physical `recuaQS4s8GTRcEgA`.
- Edition: readiness v1.2 `recuCnhrb6OJMIvak`; baseline `recdUjdne68biQYoE` and its substantive sources; semantic corrections `rec822ZmnjlU0kcaR`.

The supporting [parallel-session plan / common contract / OPS card](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recv24shrBMjbHZk4)
indexes execution, not new game rules. Its final September 13 Purpose and comments supersede
historical Draft/no-review observations for PR61 and correct C08 to existing `AdvanceCampaign`.

The former Q-CHAR-13A..14C and Q-CHAR-15A blocking lists describe historical state. Do not reopen those decisions. See the [dated ADR-0004 addendum](../architecture/0004-company-identity-succession-2026-09-07.md). Keep the original accepted history intact.

## Ownership map: existing state versus planned additions

Paths below are under `packages/game-core/src/company/`. Read actual consumers before changing ownership.

- **Lifecycle (Y):** [lifecycle-types.ts](../../packages/game-core/src/company/lifecycle-types.ts) owns identity, kinship, membership, location and availability. Its existing skills/perks and bypass records are compatibility inputs, not proof that progression/social execution is finished.
- **Finance (E):** [economy-types.ts](../../packages/game-core/src/company/economy-types.ts) owns q balances, claims, reserves and payments. A learning `maxBudget` is a spending limit, never a second wallet.
- **Physical (P):** [physical-types.ts](../../packages/game-core/src/company/physical-types.ts) owns item identity/owner/custody, books, equipment, condition instances and current pools. Learning references these entities; it does not clone inventory. Preserve explicit legacy condition bindings.
- **Progression/perks (L/D):** [skill-progress.ts](../../packages/game-core/src/company/skill-progress.ts) defines A02's single per-character `skills` entry: a legacy level or versioned exact XP/carry/binding, never both. [progression.ts](../../packages/game-core/src/company/progression.ts) derives levels and owns arithmetic. Missing XP stays unknown; only trusted explicit imports or new-person opening grants bind it. A03 supplies legitimate practice/source credits. B01 uses the existing per-character `perks` selection as the durable used-milestone record; B02 owns effect evaluation.
- **Learning (L):** C01–C03/C04a own finite work-section progress, occupied copy intervals, source/quotes and frozen internal tasks. C04b binds those real owners; C05–C08/D remain successors, referencing physical access and finance. Reuse the same bounded course model for retraining.
- **Social (L/X/A):** merged E01/E02 own base relations, source memories and chronicle; effective relations and active-memory selection are derived. Next E03 binds legacy bypass contributions once; clamped results cannot be inverted into invented base values.
- **Binding (B/X):** G01–G03 supply V2 input/runtime and real-character projection; G04–G10 add morale, binding and outcomes. The immutable tactical snapshot/provenance must not become another persistent Character, item or HP store; preserve V1 history.
- **Composition/persistence (C/B/X):** [prepareCompanyEconomy](../../packages/game-core/src/company/economy.ts) currently prepares one lifecycle+finance+physical draft. Extend that composition, not independent child commits; H adds one atomic snapshot/audit/receipt transaction and post-commit publication.

`PREPARED` is not aggregate `Accepted` or durable commit. `INFORMED_SOCIAL_CONTRIBUTION`
is still residual. Actual and known snapshots intentionally differ; do not collapse the
privacy boundary for DRY. Independent test expectations are not a second production owner.

## Delivery sequence and activation gates

Use the full small-step registry for dependencies and acceptance, not this abbreviated route:

```text
Merged foundation: WP-02.1–02.4, R00, A01–A04, B01–B04, F02
C: merged C01–C03/C04a -> C04b (#61 open/unmerged) -> C05 -> C06 -> C07 -> C08
E: merged E01–E02 -> E03 -> E04 -> E05 -> F01
G: merged G01–G03 -> G04 -> G05 -> G06 -> G07 -> G08 -> G09
C08 + merged B01 -> D01 -> D02
G09 + C08 + E05 -> G10
G10 -> H01 -> H02 -> H03 -> H04 -> H05 -> H06 -> H07 -> H08 -> I01
I01 + F01 + D02 + merged F02/B04 -> I02
```

One writer and one small reviewable PR per task. The target is 300–400 added+deleted
lines across code, tests, SQL and docs after normal formatting; smaller is fine (R00 is
intentionally short). Above 400, split a cohesive tested responsibility before delivery;
do not hide tests, minify, change formatting or split only commits inside a giant PR.
Dependencies outrank letter order; refine distant G/H tasks against real predecessor APIs.
Each dependent slice starts after actual predecessor merges, not merely open green PRs.
C08 also needs merged A04/B03; E05 needs merged A04; G09 needs merged A03.
Do not impose a global barrier on independent C/E/G streams. G10 joins all three;
H implementation is not ready before G10. Integrate sequentially against fresh main.
OPS alone edits CURRENT_PLAN; other sessions retain scoped GitHub/Airtable/Empirical results.
Before final fixation, refresh main, merged/open PRs, review/CI state and dated source comments;
do not overwrite another writer's changes or create duplicate branches, PRs or empty issue batches.

A01 supplies exact XP/milliXP, rational carry and level-threshold arithmetic only,
not active gameplay learning or proof that practice was legitimate.
A02's exact owner is merged. A03 is merged: `practice-admission.ts`, exact `CreditPractice`,
skill-scoped root replay and retained source evidence are live on `main` through PR #25.
No missing legacy XP is invented. B04 supplies actual care practice; G09 combat practice remains deferred. Injected facts alone are tests.
A04 is merged independently through [PR #34](https://github.com/Vovanostm/warwrit/pull/34); do not reimplement it. B01 owns only
`ChoosePerk`: actual target-skill mastery, one selection per skill+25/60 milestone and durable
choice history. B02 owns effect evaluation; B03/B04 own care/help integration; D owns retraining.
Public `StartLearning`/`StopLearning` stay disabled until C08, which integrates learning
through existing `AdvanceCampaign`, not a new command. E05 owns remaining social root integration.
`BeginEncounterBinding`, `ConsumeCombatReceipt` and `FinalizeEncounter` stay disabled until G10.
F02's former service-contract blocker is resolved by merged #35 for `hairStyleId` only;
other cosmetic categories, identity changes and scar editing are not authorized.
G10's complete in-memory preparation does not supply H's durable SQL guarantees.
WP-03 authority/reconnect/timers and WP-04–15 remain later work, not silently completed
or decomposed here; Q-T03 stays a separate comparison lane.

## Source and evidence boundaries

G0 permits an explicitly labelled independent reconstruction of machine contracts from canonical Notes. Neither the missing original v1 ZIP nor the independently regenerated v1.2 ZIP is claimed byte-verified by this implementation. `RC-GAP-MACHINE-01` remains a named source-concordance gap, not a new product interview. Use the source manifest in the active WP contract; do not infer 117 executed tests from a catalogue count.

Original source ZIP concordance remains `NOT_RUN`. Previous merged PR CI is predecessor evidence,
not execution or acceptance evidence for an unimplemented successor. Foundation migration smoke is not proof of the future H transaction/race/crash
guarantees. Full WP-02 and M1 remain incomplete.

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
