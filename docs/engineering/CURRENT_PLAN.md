# Warwrit current delivery plan

- Status: operational mirror for coding agents, as of 2026-09-28
- Product authority: canonical Airtable base `apph3bj1NyVrfJeLM`
- Full M1 execution index: [WARWRIT-M1-COMPLETE-v1](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recZhUoTiwT7kIc8s), including dated comments
- WP-02 batch and amendments: [September 21 record](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recB6KuIPTQiSCpCe); [ROUTE](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recujFwLEiCeXwK6b); [V3](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recFIf3eiwmpI03Qu)
- Parent [issue #8](https://github.com/Vovanostm/warwrit/issues/8); compact dependency view: [ROADMAP.md](ROADMAP.md)

## Mission and checkpoint

The owner's current mission is the **full persistent M1 alpha on this Mac**: create and keep a company, travel, accept a contract, join a physical two-company PvE battle, obtain and present proof, apply consequences, save and re-enter the same world. The accepted first region includes one city, three NPC villages and one dangerous site; eight contract instances across HUNT, INVESTIGATE and RESCUE; eleven scenes, four reusable backgrounds, six portraits, two trophy images and three enemy archetypes. These are delivery requirements, not claims that the content exists. The authored chain is «Когда молчит мельница». M2 public MMO, PvP, trading, conquest, ads and 50–100 CCU proof remain outside this private M1 alpha.

M0, S-02, WP-00 and WP-01 are done; WP-02 and M1 remain in progress. Observed main is `5a5df95d51b381f23b96ef655340024eec4253d3`, tree `67427ec799867b6f1bbc2bac9a82443eba03bd88`, after [PR #104](https://github.com/Vovanostm/warwrit/pull/104) (C06 book-transfer settlement) and [PR #105](https://github.com/Vovanostm/warwrit/pull/105) (isolated verification database). Independent Sol reviews are clear. Parent-audited [PR105 CI](https://github.com/Vovanostm/warwrit/actions/runs/36467109369) and [actual-main CI](https://github.com/Vovanostm/warwrit/actions/runs/36467454990) passed 404 tests across 60 files, 10,000 battles/100 replay checks and PostgreSQL migration smoke. A real Mac bootstrap and forced-failure/KEEP_INFRA cleanup checks also passed without touching existing services. C06 remains partial; public learning, G10, durable world/company execution, rendering and full M1 are not established. Issues [#69](https://github.com/Vovanostm/warwrit/issues/69) and [#71](https://github.com/Vovanostm/warwrit/issues/71) retain their scoped E04/C05 closure. Recheck live refs before changing status.

The latest owner direction supersedes older **operational** text saying no assignment, no merge or a fixed 400-line PR cap for this alpha mission. It does not alter game rules or make a green branch a merge. Implementation and checked task PR merges are authorized within the owner's current full-M1 direction; inspect exact head/base, reviews, unresolved threads and CI before each merge, then read back the actual main tree and post-merge result. Deployment, auto-merge and paid provisioning remain separate decisions.

## Immediate responsibilities and ownership

| Responsibility                                                 | Actual state                                                                      | Next responsibility                                                |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Operational plan                                               | Parent integrates Sol-reviewed planning; this mirror records observed deliveries  | Keep CURRENT_PLAN and ROADMAP aligned with live results            |
| PB06 / [PR #94](https://github.com/Vovanostm/warwrit/pull/94)  | Merged; real diagnostic browser actions exercised                                 | Preserve diagnostic boundary; UI01 later uses persistent authority |
| PB05, PB07–PB09                                                | Optional diagnostic follow-ups, unassigned                                        | Select only when useful; not full-M1 gates                         |
| C05 / [PR #100](https://github.com/Vovanostm/warwrit/pull/100) | Internal time/task/study/skill/finance composition merged; issue #71 closed       | C06/C07 real interruption/history producer, then C08 activation    |
| E04 / [PR #99](https://github.com/Vovanostm/warwrit/pull/99)   | Joint acceptance merged; issue #69 closed                                         | E05 delivered in PR #101; F01 follows                              |
| G08 / [PR #98](https://github.com/Vovanostm/warwrit/pull/98)   | Physical and causal life preparers merged                                         | G09 delivered in PR #102; G10 waits for C08                        |
| World / identity / RT / art                                    | W01/W02 pure foundation merged in PR #103; local OIDC implementation active       | Real movement, durable authority and measured renderer comparison  |
| H/I and final QA                                               | Foundation SQL exists; aggregate execution, crash/race proof and playtest pending | Durable execution and actual integrated journeys                   |

The parent coordinates one writer per shared path, owns these two planning documents, and controls integration, database lifecycle and final gates. E05 safe observed/recruit views and G09 real combat practice are delivered in PR #101/#102; W01/W02 authored topology and pure clocks in PR #103. C06 book transfer is delivered in PR #104: the actual command settles the earned prefix, moves the item and records the interruption in one candidate; failure preserves all owners. Full C06/C07 still need location/duty/F1/loss and causal outcome history before C08 activation.

Current source-reviewed assignments:

- `codex/m1-learning-history`: one Luna owns company learning/history, the economy composition seam, narrowly needed owner-history producers, company exports and focused learning specifications. It preserves PR104 and keeps C08 disabled. No second company writer is assigned.
- `codex/m1-world-routes`: a separate Luna owns only `world/route.ts`, `world/index.ts` and focused route specifications. This is finite pure route/arrival preparation; actual party/member/carrier location and durable arrival remain existing company/physical and future H/W06 responsibilities. It must not edit the C06 files or claim a prepared arrival is committed.
- ID01/ID02 is under integration in [PR #106](https://github.com/Vovanostm/warwrit/pull/106): real local Dex OIDC, durable issuer/subject accounts and opaque sessions, migration 0002 and an isolated fixture. Independent Sol review and parent Chrome/real PostgreSQL proof passed; check fresh PR CI/merge state before calling it delivered. Details and reproducible commands are in [ID01-IDENTITY.md](ID01-IDENTITY.md). ID03 company binding waits for H. External-provider login and lost-credential recovery are not proven by local reauthentication.

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

`StartLearning` stays disabled until C08. `BeginEncounterBinding`, `ConsumeCombatReceipt` and `FinalizeEncounter` stay disabled until G10 joins all required effects and one applied cursor. G07–G09 preparation alone cannot produce accepted persistent consequences. H must provide complete versioned company round-trip, authenticated tenant-bound command execution, atomic root/audit/receipt writes, idempotent retry, race and crash recovery through real PostgreSQL. `PREPARED` is not aggregate `Accepted` or durable commit. I must exercise care, study, battle, departure and reload with the same identities and resources; D02 and F01 join final command coverage. Do not count the existing migration smoke as future H transaction evidence.

The external full-M1 lanes are finite: own-site account and company recovery (ID), source-bound world topology and separate Campaign Day / Light clocks (W), real world knowledge and lawful disclosure (K), contract definitions and issuer/proof/reward custody (CT), production encounter authority and reconnect/deadlines (RT), source-backed actor profiles and physical two-company joining (JOIN), measured renderer choice and licensed art (ART), and truthful company/world/battle/contract/loss/re-entry UI. Source readiness is not implementation. [WORLD](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recTrujX2wy7V49qk)'s earlier RC-P2 proposal was accepted as `AAAA` in [canonical approval](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/rechIKj0hsvfXIvFU) and the [lore v1.2 amendment](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recQNKqYfwoJpCXVu): initial Campaign Day is six real hours/1,000 logical ticks, Light runs separately at 600 seconds day/300 seconds night, clock-rate changes create prospective segments, offline execution continues an accepted route under defensive policy, and a new dangerous route must expose supply assumptions and reject a known shortage without blocking valid return or camp. PR #103 supplies authored finite coordinates/topology and pure clocks. SPEC-WORLD/W03 onward still must fix routes and actual producers for physical arrival, visibility and handoff; these are not a renewed owner choice about RC-P2. Contracts, identity, encounter and renderer decisions still need their named records before activation; any genuinely unsupported material policy gets one bounded decision packet. Storage shapes and finite adapters are engineering choices, not a new S-02 interview.

Keep the accepted company without a roster cap of twelve or emergency heir. No invented witness, resurrected captive, free weapon, remote hand-in, teleport, duplicate reward, client-authored identity or raw hidden fact. A unique bearer receives the declared bounty once through the authorized presentation; helper terms and physical presence do not create a second reward. Preserve real money, inventory, debt, learning, care, succession and knowledge owners. The original source ZIP concordance is still `NOT_RUN` / `RC-GAP-MACHINE-01`; label any new authored derivative and keep the affected source limitation visible.

## Local battle, final evidence and launch

PB01–PB04 provide a diagnostic protocol, loopback server/session/actions and protocol-only view. PB06 now joins them into a browser controller; its local in-app browser journey exercised create, move, rejection, defend, reload, retreat and deletion. This remains a **disposable local battle**, with server memory and all-visible diagnostic state. PB05 AI stepping and PB07–PB09 replay/launcher/device journeys are optional for this mission. PB06 is a source dependency for the later persistent `UI01` controller. Do not use PB state as production company or encounter authority, and do not advertise `pnpm dev:combat-lab` until a launcher actually exists.

The final alpha needs one documented, runnable local startup with PostgreSQL, authenticated company/session, real world and encounter authority, content and UI, followed by two-browser company → travel → contract → join → battle → proof → payment/consequences → save/re-entry and failure/retry paths. Run real process restart, concurrent claims/commands and privacy checks. Measure the representative Babylon.js versus PlayCanvas scene on the named Mac before selecting the renderer; do not infer FPS or capacity from headless tests. Owner Mac playtest, comprehension/turn timing and any formative player evidence are **pending** until actually performed. A final launch command or successful human journey is not yet available.

Tests should prove durable public invariants with a small, nonduplicative set: deterministic replay, exact conservation, authorization and privacy, atomic rejection/idempotency, value-preserving serialization and real transaction/migration behavior. Add a focused regression for a discovered defect; no test per helper, mirrored rule engine or fixed count target. During edits run affected focused checks. Before acceptance the exact combined tree must pass `pnpm verify`, `pnpm test:combat:stress` and `pnpm test:migrations` once in a clean disposable environment. Record tree, commands, outcomes and limits; changed code invalidates prior-tree evidence. Browser, Mac, human and load evidence remain separate. Maintain the pinned Node 24/pnpm, Fastify, PostgreSQL/Kysely/pg and pure game-core boundaries from [ADR-0003](../architecture/0003-m0-m1-technology-baseline.md) and [AI_TECHNOLOGY_HANDOFF.md](AI_TECHNOLOGY_HANDOFF.md).
