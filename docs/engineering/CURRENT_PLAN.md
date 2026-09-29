# Warwrit current delivery plan

- Status: operational mirror for coding agents, as of 2026-09-29
- Product authority: canonical Airtable base `apph3bj1NyVrfJeLM`
- Full M1 execution index: [WARWRIT-M1-COMPLETE-v1](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recZhUoTiwT7kIc8s), including dated comments
- WP-02 batch and amendments: [September 21 record](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recB6KuIPTQiSCpCe); [ROUTE](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recujFwLEiCeXwK6b); [V3](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recFIf3eiwmpI03Qu)
- Parent [issue #8](https://github.com/Vovanostm/warwrit/issues/8); compact dependency view: [ROADMAP.md](ROADMAP.md)

## Mission and checkpoint

The owner's current mission is the **full persistent M1 alpha on this Mac**: create and keep a company, travel, accept a contract, join a physical two-company PvE battle, obtain and present proof, apply consequences, save and re-enter the same world. The accepted first region includes one city, three NPC villages and one dangerous site; eight contract instances across HUNT, INVESTIGATE and RESCUE; eleven scenes, four reusable backgrounds, six portraits, two trophy images and three enemy archetypes. These are delivery requirements, not claims that the content exists. The authored chain is «Когда молчит мельница». M2 public MMO, PvP, trading, conquest, ads and 50–100 CCU proof remain outside this private M1 alpha.

M0, S-02, WP-00 and WP-01 are done; WP-02 and M1 remain in progress. Observed main is `154af42577ca688c7f66f68d9f720a4597b95740`, tree `566c41ffa48add53ff5e2cc4fb8281f6204cbb2e`, after [PR #116](https://github.com/Vovanostm/warwrit/pull/116), which selects PlayCanvas for the current Mac/Chrome target. Parent audited PR116 CI36516144845 for the exact matching tree; actual-main CI is pending readback. Parent audited PR CI36512432787 and actual-main CI36512903232: 427 tests in 63 files, 10,000 battles/100 replay checks and real PostgreSQL migration smoke passed; five opt-in tests were skipped in that gate. Separate parent PostgreSQL and Chrome evidence is scoped below. G10 terminal composition, durable company/world execution, ART05 art-pipeline selection, production renderer integration and the full alpha remain incomplete. Recheck live refs before dispatch.

The latest owner direction supersedes older **operational** text saying no assignment, no merge or a fixed 400-line PR cap for this alpha mission. It does not alter game rules or make a green branch a merge. Implementation and checked task PR merges are authorized within the owner's current full-M1 direction; inspect exact head/base, reviews, unresolved threads and CI before each merge, then read back the actual main tree and post-merge result. Deployment, auto-merge and paid provisioning remain separate decisions.

## Immediate responsibilities and ownership

| Responsibility                                                 | Actual state                                                                      | Next responsibility                                                |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Operational plan                                               | Parent integrates Sol-reviewed planning; this mirror records observed deliveries  | Keep CURRENT_PLAN and ROADMAP aligned with live results            |
| PB06 / [PR #94](https://github.com/Vovanostm/warwrit/pull/94)  | Merged; real diagnostic browser actions exercised                                 | Preserve diagnostic boundary; UI01 later uses persistent authority |
| PB05, PB07–PB09                                                | Optional diagnostic follow-ups, unassigned                                        | Select only when useful; not full-M1 gates                         |
| C05 / [PR #100](https://github.com/Vovanostm/warwrit/pull/100) | Internal time/task/study/skill/finance composition merged; issue #71 closed       | Pure C08 delivered in PR113; G10 and real world producers next     |
| E04 / [PR #99](https://github.com/Vovanostm/warwrit/pull/99)   | Joint acceptance merged; issue #69 closed                                         | E05 delivered in PR #101; F01 follows                              |
| G08 / [PR #98](https://github.com/Vovanostm/warwrit/pull/98)   | Physical and causal life preparers merged                                         | G09 and pure C08 delivered; G10 composition next                   |
| World / identity / RT / art                                    | W01/W02 and pure W03 preparation merged; local identity merged in PR #106         | Real movement, durable authority and measured renderer comparison  |
| H/I and final QA                                               | Foundation SQL exists; aggregate execution, crash/race proof and playtest pending | Durable execution and actual integrated journeys                   |

The parent coordinates one writer per shared path, owns these two planning documents, and controls integration, database lifecycle and final gates. E05 safe observed/recruit views and G09 real combat practice are delivered in PR #101/#102; W01/W02 authored topology and pure clocks in PR #103. C06 book transfer is delivered in PR #104: the actual command settles the earned prefix, moves the item and records the interruption in one candidate; failure preserves all owners. PR107 also delivers duty-change prefix settlement and exact task-owned book-access closure, including future-tick commands. PR113 now joins existing location/F1/access and causal outcome producers with pure C08 commands; actual world/combat producers remain separate.

Current source-reviewed assignments:

- Learning composition is delivered in PR113. Actual command candidates settle the earned prefix, close task-owned access, distinguish factual death from observation and preserve harmless changes. One public scenario proves two course learners sharing a deceased provider retain five-tick earned/accrued prefixes while an unrelated book task remains unchanged; it does not prove a separate cash payout. There is no authentic producer entering `OUT_OF_CONTACT` yet: the ResolveMissing fixture starts from a constructed missing state. That production gap belongs to G10/world/JOIN, not a fake learning handler. Pure C08 is available; G10 is the next company responsibility.
- Pure route/arrival preparation is delivered in PR108. Backdated movement and unauthored origin were corrected; supply and return evidence is bound to its actual scope. Real party/member/carrier application, supply/fatigue, durable epochs and trusted arrival/return producers remain W04/H/W06 work. This does not close full W03.
- ID01/ID02 local identity is delivered in PR106: Dex OIDC, durable issuer/subject accounts and opaque sessions, migration 0002 and an isolated fixture. Reproducible local commands and limits are in [ID01-IDENTITY.md](ID01-IDENTITY.md). ID03 company binding waits for H. External-provider login and lost-credential recovery are not proven by local reauthentication.
- Renderer harness is merged in PR109. Same licensed KayKit 18-actor scene runs in Babylon 9.28.0 and PlayCanvas 2.22.4 under normal dependency-age policy. Parent verified body/hex picking, off-board misses, fog/camera/light parity, fixed-buffer resize and real WebGL loss/restoration. Sol reviewed final source and mechanical corrections; all 19 README asset hashes match. Local production build and clean CI passed. Parent recorded three alternating 120-second captures per engine at preview port 5178 after 30-second warmups, with raw-bin/percentile recomputation. Both exceed 30 FPS in this observed Mac workload; ordinary background load limits inference. Comparative authoring, ART04 decision and ART05 pipeline remain unfinished. Recorded build bytes precede mechanical formatting/type-only changes and are independently inventoried; no current-source performance equivalence is assumed from a commit name.

- [PR #112](https://github.com/Vovanostm/warwrit/pull/112) is merged at `a2b3b67a215dd00bf3a3ab04976cd0df843c6bcf`, tree `bcda8e291a9fe219e3e03525fd44e5030e0ba208`: migration 0003, authenticated local fixture commands, atomic snapshot/journal/receipt writes, grant decoding and consistent replay reads. Parent audited PR CI36499938186 and actual-main CI36500401584: 425 tests across 62 files, 10,000 battles/100 replay checks and real migration smoke passed; the opt-in identity/encounter integrations are separate. Parent also passed actual encounter PostgreSQL integration on the final combined code. This proves RT02/narrow RT03 fixture execution, not physical JOIN, playable projection or process restart. Runtime Luna owns unreleased migration 0004, explicit AI authority/wakes, projection and Colyseus. H uses the next migration only after this reservation is released and live schema is rechecked. Human timeout action remains a pending bounded decision.

## Runtime and G10 verification checkpoint — 2026-09-29

PR115 delivered persisted AI wakes, authenticated Colyseus projections, HTTP-to-room
refresh, monotonic asynchronous reads and durable responses when notification fails.
Parent verified real PostgreSQL execution, Chrome reconnect/reload/process restart,
same-ID retry and foreign-account/logout rejection. The final optional dependency
policy explicitly denies `msgpackr-extract@3.0.4` native install; a fresh empty-store
install, server build and authenticated Chrome HTTP/room journey passed without it.
[Runtime evidence](evidence/RT04-PARENT-20260929.md) and the PR distinguish historical
checks from final source. Reviewed, CI and actual-main trees match. This remains
fixture admission, not physical JOIN; human timeout policy and single-origin wiring
remain pending. Migration0004 is released; recheck the next number before H.

G10 packet A is locally committed at `c2f8518` on the combat-aggregate branch after
rebase onto PR115. Sol reviewed its causal/practice/evidence corrections; parent
reproduced the sparse-aptitude fix. The two-cycle alias scenario was source-reviewed,
not independently executed. B1 now composes learner/provider/mentor interruption
and a sourced MISSING entry through existing owners; its candidate is frozen for
review. Eleven focused specs pass, but terminal MISSING custody/prefix proof remains
missing and Sol is checking concrete counterexamples.
B2 owns terminal custody, departure, crisis/succession, overflow and immutable retry
identity. No final G10 activation or durable-company acceptance is claimed.

## Focused studio dispatch

Use [PARALLEL_WAVES.md](PARALLEL_WAVES.md) for the Sol-reviewed packet queue, exact
path/resource reservations, dependencies and minimal proof. The parent owns this
plan, integration, shared resources and final verification. Luna writes production
code; Sol reviews frozen packets and plans. The current session has two retained
child threads: `runtime_luna` on isolated ART05 while
`g10_sequence_review_sol` reviews frozen B1. Later assignments are queued, not running.

The project configuration prepares three child slots for a fresh trusted session:
two disjoint Luna writers and one Sol reviewer. Actual host capacity must be checked
before launching a third child; current session capacity is unchanged. No throughput
advantage is claimed before measurement. Do not create user-owned tasks as a workaround.

ART scene3 calibration has passed the parent's six visual checks and one fresh
production pair with independently recomputed raw samples. Minimum one-second FPS
was120/119 for Babylon/PlayCanvas on M3Pro/Chrome154. ART04 decision is merged in PR116/[ADR0005](../architecture/0005-m1-renderer-playcanvas.md), with actual-main CI pending; ART05
three-representation comparison is active and remains unmeasured. CT01 and K01 pure packets can
run independently of G10 when their named source/export ownership is ready; H
implementation waits for final G10 serialization. Root exports, migrations, lockfile,
app mounting and service ports always have one explicitly named writer.

Each frozen packet receives a bounded read-only review; corrections return to its
writer. The parent uses that interval for integration and browser/transaction proof,
while the writer may move to an explicitly handed-off independent packet. Completed
checks are reused only for unchanged source. Full indexed cards remain acceptance
responsibilities, not a fixed PR count, test count or line limit.

Ports 55433/5557/3107 and preserved identity volumes belong to the parent-managed identity fixture. PR105 gives the clean gate a unique disposable Compose project and dynamic loopback port; it is not the eventual full-alpha launcher. App mounting, root composition, exports, command registry, migrations, launch scripts and lockfile still require explicit one-writer ownership. Independent green branches do not prove their union.

Tests in testkit import built workspace exports. Build the affected game-core package before running its source regressions; `typecheck --noEmit` does not refresh `dist`.

## Domain activation and persistent alpha route

Use the full index/card for acceptance and sources. The graph below is a continuation map, not a second GDD:

```text
C05-FIN -> C05-TIME -> C05-COMPOSE -> C06 -> C07 -> C08 -> D01 -> D02
E04-ACCEPT -> E05 -> F01
G07 -> G08 -> G09
G09 + C08 + E05 -> G10 -> H durable root/executor -> I acceptance

SPEC-WORLD -> W world/clock/travel; SPEC-CONTRACTS -> CT content/proof
ID identity + H + W + RT encounters + ART renderer + K knowledge
  -> physical JOIN -> UI company/world/battle/contracts/re-entry -> QA -> M1-ACCEPT
```

`StartLearning`, `StopLearning` and `AdvanceCampaign` now have pure combined learning candidates from PR113; durable authenticated execution still belongs to H. `BeginEncounterBinding`, `ConsumeCombatReceipt` and `FinalizeEncounter` stay disabled until G10 joins all required effects and one applied cursor. G07–G09 preparation alone cannot produce accepted persistent consequences. H must provide complete versioned company round-trip, authenticated tenant-bound command execution, atomic root/audit/receipt writes, idempotent retry, race and crash recovery through real PostgreSQL. `PREPARED` is not aggregate `Accepted` or durable commit. I must exercise care, study, battle, departure and reload with the same identities and resources; D02 and F01 join final command coverage. Do not count the existing migration smoke as future H transaction evidence.

The external full-M1 lanes are finite: own-site account and company recovery (ID), source-bound world topology and separate Campaign Day / Light clocks (W), real world knowledge and lawful disclosure (K), contract definitions and issuer/proof/reward custody (CT), production encounter authority and reconnect/deadlines (RT), source-backed actor profiles and physical two-company joining (JOIN), measured renderer choice and licensed art (ART), and truthful company/world/battle/contract/loss/re-entry UI. Source readiness is not implementation. [WORLD](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recTrujX2wy7V49qk)'s earlier RC-P2 proposal was accepted as `AAAA` in [canonical approval](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/rechIKj0hsvfXIvFU) and the [lore v1.2 amendment](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recQNKqYfwoJpCXVu): initial Campaign Day is six real hours/1,000 logical ticks, Light runs separately at 600 seconds day/300 seconds night, clock-rate changes create prospective segments, offline execution continues an accepted route under defensive policy, and a new dangerous route must expose supply assumptions and reject a known shortage without blocking valid return or camp. PR #103 supplies authored finite coordinates/topology and pure clocks. SPEC-WORLD/W03 onward still must fix routes and actual producers for physical arrival, visibility and handoff; these are not a renewed owner choice about RC-P2. Contracts, identity, encounter and renderer decisions still need their named records before activation; any genuinely unsupported material policy gets one bounded decision packet. Storage shapes and finite adapters are engineering choices, not a new S-02 interview.

Keep the accepted company without a roster cap of twelve or emergency heir. No invented witness, resurrected captive, free weapon, remote hand-in, teleport, duplicate reward, client-authored identity or raw hidden fact. A unique bearer receives the declared bounty once through the authorized presentation; helper terms and physical presence do not create a second reward. Preserve real money, inventory, debt, learning, care, succession and knowledge owners. The original source ZIP concordance is still `NOT_RUN` / `RC-GAP-MACHINE-01`; label any new authored derivative and keep the affected source limitation visible.

## Local battle, final evidence and launch

PB01–PB04 provide a diagnostic protocol, loopback server/session/actions and protocol-only view. PB06 now joins them into a browser controller; its local in-app browser journey exercised create, move, rejection, defend, reload, retreat and deletion. This remains a **disposable local battle**, with server memory and all-visible diagnostic state. PB05 AI stepping and PB07–PB09 replay/launcher/device journeys are optional for this mission. PB06 is a source dependency for the later persistent `UI01` controller. Do not use PB state as production company or encounter authority, and do not advertise `pnpm dev:combat-lab` until a launcher actually exists.

The final alpha needs one documented, runnable local startup with PostgreSQL, authenticated company/session, real world and encounter authority, content and UI, followed by two-browser company → travel → contract → join → battle → proof → payment/consequences → save/re-entry and failure/retry paths. Run real process restart, concurrent claims/commands and privacy checks. Measure the representative Babylon.js versus PlayCanvas scene on the named Mac before selecting the renderer; do not infer FPS or capacity from headless tests. Owner Mac playtest, comprehension/turn timing and any formative player evidence are **pending** until actually performed. A final launch command or successful human journey is not yet available.

Tests should prove durable public invariants with a small, nonduplicative set: deterministic replay, exact conservation, authorization and privacy, atomic rejection/idempotency, value-preserving serialization and real transaction/migration behavior. Add a focused regression for a discovered defect; no test per helper, mirrored rule engine or fixed count target. During edits run affected focused checks. Before acceptance the exact combined tree must pass `pnpm verify`, `pnpm test:combat:stress` and `pnpm test:migrations` once in a clean disposable environment. Record tree, commands, outcomes and limits; changed code invalidates prior-tree evidence. Browser, Mac, human and load evidence remain separate. Maintain the pinned Node 24/pnpm, Fastify, PostgreSQL/Kysely/pg and pure game-core boundaries from [ADR-0003](../architecture/0003-m0-m1-technology-baseline.md) and [AI_TECHNOLOGY_HANDOFF.md](AI_TECHNOLOGY_HANDOFF.md).
