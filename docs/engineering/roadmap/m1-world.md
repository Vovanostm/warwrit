# Persistent world, contracts and physical joins

## Status and next action — 2026-11-08

Full integrated journey remains incomplete. The requirements below were moved
from the September roadmap; use the latest owner amendments in the linked
contracts and [M1 specification](../../wiki/m1-spec.md) when scope differs.
No live queue, writer assignment or fresh gameplay result is inferred here.
Select the requested world/contract/join slice and check its actual producer
and consumer evidence.

## Dependencies and acceptance scope

The accepted playable loop is **company → travel → contract → physical two-company PvE → proof → consequences → save/re-entry**. The work can proceed in disjoint source and implementation lanes, then join at real authority boundaries:

1. **Finite source contracts.** The accepted RC-P2 rules in [M1-WORLD-FOUNDATION](../../work-packages/M1-WORLD-FOUNDATION.md) and the [world wiki](../../wiki/world/index.md) remain in force: initial six real hours/1,000 Campaign ticks per day, independent 600-second Light day/300-second night, prospective clock segments, continued accepted travel with defensive offline policy, and a visible supply guard for new dangerous routes without blocking a valid return or camp. PR #103 fixes authored topology/coordinates and pure clocks; SPEC-WORLD/W03 onward still fix routes and actual producers for arrival, visibility and handoff; accepted RC-P2 is not a fresh owner choice. SPEC-CONTRACTS fixes eight instances, three contract types, eleven scenes, helper terms, proof and terminal cases. ID01 fixes own-site account/recovery; RT01 fixes encounter authority/deadline; BATTLE-PROFILES fixes the minimum actor profiles; ART01 establishes the same-scene renderer comparison. Genuinely unsupported material policy needs one bounded owner decision before the affected activation.
2. **Durable foundations.** ID02–ID03 authenticate and bind an account to the same company on reconnect. W01–W03 provide source-bound topology, persistent Campaign Day and Light clocks, real routes/arrival; W04–W06 add supplies, camp, entities and one world writer. RT02–RT07 own persistent encounters, authenticated transitions, deadlines, Colyseus projections, reconnect and restart. ART02–ART07 implement and validate scene/actor assets against the owner-selected Babylon.js renderer in [ADR-0006](../../architecture/0006-m1-renderer-babylon.md); they do not reopen renderer selection. K01–K04 enforce source/time-aware map, battle and rumor knowledge.
3. **Contracts and physical join.** CT01–CT07 own versioned instances, accessible clues/captives/hunt proof, custody, globally unique authorized claims, rewards and the complete authored content. JOIN01–JOIN03 transfer the actual world/encounter writer, bind two companies by presence and opt-in terms, and apply terminal effects plus world/proof release atomically. A second company is physical participation, not a second bounty; a prepared single-company H transaction alone does not complete this join.
4. **Player path.** UI01 consumes PB06's controller experience but connects to persistent RT authority and the selected renderer. UI02–UI06 expose real company/services, map/travel, contracts/battle/proof, losses and re-entry without duplicating canonical state or disclosing private facts. Each advertised button needs its real command/result; do not present an ornamental quest as completion.

The accepted region is one city, three NPC villages and one dangerous site. Content completion means all eight HUNT/INVESTIGATE/RESCUE contract instances, eleven scenes, four reusable backgrounds, six portraits, two trophy images and three enemy archetypes, with source/licensing evidence. The chain is «Когда молчит мельница». These counts are acceptance scope, not current file counts or a test-count target. Preserve the original source-archive concordance limitation.

Record current implementation, blockers and checks in the affected work package.
Complete this milestone only with the physical multi-company journey and durable
consequences demonstrated; see [acceptance](m1-acceptance.md) and
[ROADMAP](../ROADMAP.md).
