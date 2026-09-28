# Warwrit development roadmap

- Status: repository-side continuation map, as of 2026-09-28
- Operational checkpoint: [CURRENT_PLAN.md](CURRENT_PLAN.md)
- Product/task authority: canonical [full M1 index](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recZhUoTiwT7kIc8s), [current batch](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recB6KuIPTQiSCpCe), dated owner amendments and [issue #8](https://github.com/Vovanostm/warwrit/issues/8)

This is the delivery order for the owner's **full M1 alpha on the Mac**, not a new game rulebook or a promised PR count. M0, S-02, WP-00 and WP-01 are done; WP-02 and M1 remain incomplete. A source-ready task, a merged preparer and a green open PR do not establish an activated game path.

## Current frontier

The parent owns coordination and serial integration. Planning PR #89, PB06 PR #94 and G07 PR #95 merged through observed `d43b03f`; C05-FIN [PR #96](https://github.com/Vovanostm/warwrit/pull/96) then merged as `1075eb20`. Its corrected reviewed head `23fbed22` and tested merge tree `4ffb2404` passed [PR CI 36431795086](https://github.com/Vovanostm/warwrit/actions/runs/36431795086); [actual-main CI 36432229830](https://github.com/Vovanostm/warwrit/actions/runs/36432229830) passed on `1075eb20`. Parent-audited logs for both report 383 tests, 10,000 combat battles/100 replays and PostgreSQL migration smoke. These are observed checkpoints, not reset targets or proof of full M1. Before selecting another lane, read its full card, current Notes/Purpose and amendments, existing worktree/PR/handoff, and assign one writer for shared paths.

| Lane                  | Observed state                                                                         | Next unlock                                                   |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| C05 finance           | PR #88 funding admission and PR #96 FIN backing merged; PR and actual-main CI passed   | TIME, then COMPOSE; public learning still waits for C08       |
| E04 social            | BIND merged; E04-ACCEPT still lacks the combined exit/reload/old-claim/rehire journey  | Complete joint acceptance, then E05 privacy-safe views        |
| G combat consequences | G07 physical effects merged; G08 Luna writer active on `codex/m1-g08-life`             | Verify G08 conditions/death, then G09 practice and joined G10 |
| PB diagnostic         | PB06 browser controller merged through PR #94; PB05 not started                        | Optional diagnostic follow-ups only                           |
| Source contracts      | WORLD RC-P2 policy accepted; finite topology/routes and producers still need contracts | Close only the finite prerequisites needed by their consumers |

FIN's earlier architecture cycle was fixed with a finance-facing type-only subset; Sol source review found no remaining blocker. C05-TIME and then C05-COMPOSE can start against fresh main. E04-ACCEPT is a separate joint acceptance task; focused BIND tests do not prove farewell → reload → payment of a claim earned before exit → same-person rehire, with notice, remedy and decay respected. G08 implementation is active but unverified. A branch or prepared prompt does not establish completion. Reviewed branches must be combined against fresh main and verified on the resulting tree.

## Domain and durable company

```text
C05-FIN -> C05-TIME -> C05-COMPOSE -> C06 -> C07 -> C08 -> D01 -> D02
E04-ACCEPT -> E05 -> F01
G07 -> G08 -> G09
G09 + C08 + E05 -> G10
required domain + G10 -> H durable company/executor -> I01 -> I02
```

C08 activates real learning only after the full finance/time/composition and interruption/casualty path. G10 activates combat binding, receipt consumption and finalization only when all required physical, life, practice and social/learning effects join one atomic candidate and cursor. H owns the complete versioned PostgreSQL root, authenticated executor, audit/receipts and real parallel-connection/process-crash proof. I owns actual durable command journeys and complete required handler coverage; I02 also needs D02 and F01, while F02/B04 are merged. Implement H responsibilities against real predecessor APIs; the indexed H01–H08 are coverage, not a forced numeric serial chain.

## Persistent world and battle joins

The accepted playable loop is **company → travel → contract → physical two-company PvE → proof → consequences → save/re-entry**. The work can proceed in disjoint source and implementation lanes, then join at real authority boundaries:

1. **Finite source contracts.** [WORLD](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recTrujX2wy7V49qk)'s RC-P2 proposal is accepted as `AAAA` by [canonical approval](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/rechIKj0hsvfXIvFU) and the [lore v1.2 amendment](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recQNKqYfwoJpCXVu): initial six real hours/1,000 Campaign ticks per day, independent 600-second Light day/300-second night, prospective clock segments, continued accepted travel with defensive offline policy, and a visible supply guard for new dangerous routes without blocking a valid return or camp. SPEC-WORLD still fixes finite topology, coordinates, routes and producer contracts for arrival, visibility and handoff; accepted RC-P2 is not a fresh owner choice. SPEC-CONTRACTS fixes eight instances, three contract types, eleven scenes, helper terms, proof and terminal cases. ID01 fixes own-site account/recovery; RT01 fixes encounter authority/deadline; BATTLE-PROFILES fixes the minimum actor profiles; ART01 establishes the same-scene renderer comparison. Genuinely unsupported material policy needs one bounded owner decision before the affected activation.
2. **Durable foundations.** ID02–ID03 authenticate and bind an account to the same company on reconnect. W01–W03 provide source-bound topology, persistent Campaign Day and Light clocks, real routes/arrival; W04–W06 add supplies, camp, entities and one world writer. RT02–RT07 own persistent encounters, authenticated transitions, deadlines, Colyseus projections, reconnect and restart. ART02–ART07 measure Babylon.js and PlayCanvas on the actual Mac, select the renderer through the accepted decision, and provide licensed scene/actor assets. K01–K04 enforce source/time-aware map, battle and rumor knowledge.
3. **Contracts and physical join.** CT01–CT07 own versioned instances, accessible clues/captives/hunt proof, custody, globally unique authorized claims, rewards and the complete authored content. JOIN01–JOIN03 transfer the actual world/encounter writer, bind two companies by presence and opt-in terms, and apply terminal effects plus world/proof release atomically. A second company is physical participation, not a second bounty; a prepared single-company H transaction alone does not complete this join.
4. **Player path.** UI01 consumes PB06's controller experience but connects to persistent RT authority and the selected renderer. UI02–UI06 expose real company/services, map/travel, contracts/battle/proof, losses and re-entry without duplicating canonical state or disclosing private facts. Each advertised button needs its real command/result; do not present an ornamental quest as completion.

The accepted region is one city, three NPC villages and one dangerous site. Content completion means all eight HUNT/INVESTIGATE/RESCUE contract instances, eleven scenes, four reusable backgrounds, six portraits, two trophy images and three enemy archetypes, with source/licensing evidence. The chain is «Когда молчит мельница». These counts are acceptance scope, not current file counts or a test-count target. Preserve the original source-archive concordance limitation.

## Diagnostic local battle

PB01–PB04 are merged, providing the protocol/scenario, loopback server/session/actions and protocol-only view. PB06 joins server and view in a browser controller; its in-app browser journey exercised create, move, rejection, defend, reload, retreat and deletion through the local API. It is useful early proof of command/UI wiring but remains disposable server-memory gameplay, not M1 persistence, fog, timers or world join. PB06 is a source dependency for UI01.

PB05 AI stepping, PB07 replay import/export, PB08 launcher/reset controls and PB09 browser/Mac lab evidence are **optional** for the full-M1 alpha and unassigned here. Select them only when they improve diagnostic evidence. The final persistent alpha has its own RT/H/QA replay and browser obligations. Do not advertise a lab launcher until one exists or wait for optional PB follow-ups to start full-M1 lanes.

## Final acceptance and running it

QA00 prepares an actual browser runner, traces, ports and disposable database fixtures. QA01 then documents one working local launch only after the integrated server, database, identity, realtime, world, content and UI can start. QA02 exercises two-browser company/travel/contract/battle/proof/payment/re-entry and failure paths; QA03 tests real process crashes and competing actions/claims; QA04 measures privacy, input limits and renderer performance on the named Mac; QA05 records the owner's Mac playtest and actual player comprehension/turn evidence. M1-ACCEPT reads those results with the full indexed criteria. No runnable final launch instruction or owner playtest is currently proven.

Use small, nonduplicative public-invariant tests for deterministic replay, money/item conservation, authorization/privacy, atomic rejection/idempotency, serialization and real transaction/migration behavior. Do not add a test for each helper or substitute structural snapshots for gameplay evidence. The existing clean combined-tree gate remains `pnpm verify`, `pnpm test:combat:stress`, `pnpm test:migrations`; run it once for the final code tree and record actual outcomes. Browser, Mac, human, frame-rate and server-capacity evidence need their own measurements. No fixed PR line cap applies; keep changes cohesive and reviewable.

The original source ZIP concordance remains `NOT_RUN` / `RC-GAP-MACHINE-01`. Missing archives do not permit reconstructed canon or claims that historical catalogue checks ran. Deployment, paid resources, production load and M2 scope are separate from local alpha acceptance.
