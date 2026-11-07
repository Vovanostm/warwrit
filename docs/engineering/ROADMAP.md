# Warwrit development roadmap

Updated 2026-11-05 at the owner's request. M1 is **in progress**, not accepted.
[CURRENT_PLAN](CURRENT_PLAN.md) owns the live checkpoint;
[execution plan](M1_PRODUCTION_PLAN.md#current-execution-plan--2026-11-05)
owns the next playable steps; [task queue](PARALLEL_WAVES.md) maps them to GitHub.
The owner's small-task follow-up is recorded in the [AI task contract](PARALLEL_WAVES.md#ai-task-contract):
33 new leaf issues plus 7 reused bounded entries, with explicit dependencies and acceptance.
[Current assessment](../wiki/m1-spec.md#state-2026-11-05) records implementation
and evidence separately. The superseded September roadmap and queue are retained
in [history](CURRENT_PLAN_HISTORY.md#planning-baselines-superseded-on-2026-11-05).

## Product-first delivery — owner decision 2026-11-06

Prioritize the repeatable company loop. Before feature code, complete the
[owning specification](../../AGENTS.md#feature-specification-before-implementation)
with the player problem, expected improvement, full behavior, architecture choice
and small executable tasks. Select boundaries that support the next known rule or
content variant within the existing modular monolith; no speculative framework.

The former global visual BLOCKED is removed as a prerequisite for development.
[Review](VISUAL_CRITIQUE.md) checks the affected result and concrete player impact.
Missing broader comparisons remain unassessed scene work. This does not claim
visual acceptance or completion of the still-open full loop/M1. The immediate
product target remains the retained company's next contract, reward, maintenance
and restart; refresh its actual integration dependencies before implementation.

## Hostile-retreat delivery — 2026-11-06

[#376 specification](../wiki/mechanics/retreat.md#терминальные-исходы--спецификация-376-2026-11-06)
separates battle resolution, physical consequences and contract proof. The owner
accepted hostile-retreat policy; #378 is implemented and accepted in [PR408](https://github.com/Vovanostm/warwrit/pull/408). Actual encounter/SQL checks prove atomic company release,
preserved living enemies and no false trophy. Finite result UI is accepted;
hostile escape was not reproduced in the ordinary native journey.
[Owning result and limitations](../wiki/mechanics/retreat.md#реализация-378--2026-11-06).

[#409](https://github.com/Vovanostm/warwrit/issues/409) implementation is merged in
[PR416](https://github.com/Vovanostm/warwrit/pull/416), main d19193da: historical attempts, fresh JOIN consent,
exact saved survivors and the ordinary repeat/retry/payout continuation.
[Current evidence and remaining native criterion](../wiki/mechanics/retreat.md#интеграция-409-с-текущим-main--2026-11-07)
distinguish the passing SQL/prepared-save App journey from the unsuccessful new-company
first-escape run. Full native first-escape acceptance remains open; merging the implementation
does not close that criterion or issue #409.
Captivity #377, helper replacement and a player battle archive remain separate scope.

## Target and authority

Deliver the accepted persistent local M1 on MacBook/Chrome: the same account and
company travel, take authentic contracts, participate physically in two-company
PvE, obtain lawful proof, receive one reward, live with consequences and return
after disconnect/restart. Warwrit's larger goal remains a dark-fantasy MMO about
mercenary companies in warring duchies.

Authority remains the [M1 milestone](https://airtable.com/apph3bj1NyVrfJeLM/tbleBIa46HLrKEEvP/recX4Qx8bvArvSAEQ),
[complete M1 index and amendments](https://airtable.com/apph3bj1NyVrfJeLM/tblwAxG5Ek1FyWpiW/recZhUoTiwT7kIc8s),
[vision](../wiki/vision.md), accepted ADRs and newer owner decisions.
This roadmap sequences delivery; it approves no new mechanic or reduced scope.
The October 30 external roadmap remains a proposal: its three-contract cut,
negotiation system, fixed playtest counts and ten showcase frames are not new gates.

## Delivery order

| Stage                                    | Observable player result                                                                                                                        | Exit evidence and task owner                                                                                                                                                              |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — close the ordinary loop              | Sign in → company → contract → atlas travel → battle → proof/reward → treatment, rest, payroll → next contract → restart, with the same company | Complete the current retained continuation, then repeat from ordinary new-player entry without database edits. #169, #167, #171, #174 and the first checklist of #177.                    |
| B — complete M1 capabilities and content | All eight contracts and required company actions are usable; investigation, rescue and hunt follow their real facts and distinct outcomes       | #168 service, #170 learning/retraining, #171 remaining inventory/roster, #172 authentic nickname and residual #8; all contract branches and world knowledge checks under #177.            |
| C — accept the full game                 | A new player understands goals, costs, turns and consequences; two accounts can play and recover safely on the supported device                 | #173 tactics, #174 durability/restore, #175 measured performance, #176 clean launch, #177 final journey; affected #217 UI/text issues and independent integrated critique.                |
| D — hosted closed test                   | Approved participants use a repeatable hosted build with normal identity, backups, restore and rollback                                         | Prepare release/runbook after the local loop is accepted; deployment is a separately authorized operation. The proposed 10–20-player pilot needs an explicit scope and measured capacity. |

Work on the next failed player step in A. Do not wait for every B/C task to run
the first journey. Conversely, a successful A does not close full M1.
Fix an input, loss or readability blocker when it obstructs that journey;
defer broad art expansion, new terrain sets and unrelated tooling.
Implementation may overlap only with separate writers/resources; the existing
publication mission retains at most two active game-writing worktrees.

## What is already available

Main contains native identity/company persistence, world clocks and movement,
camp/supplies/equipment, authored contracts and durable tactical combat with the
commander HUD. The painted company-private atlas, accepted hunt destination
markers, ordinary wound treatment and local recruitment are merged.
Reuse these implementations. They are no longer foundation tasks.

At the assessment snapshot, recovery assignment PR363 and payroll PR338 are
published, verified candidates awaiting actual integration; PR338 is stacked on
PR363. Item transfer PR339 and command recovery PR335 retain useful prior
evidence but conflict with current main. Old green checks do not accept a new
integration. Local art/novel laboratories retain their own boundaries.

The player-facing target uses Babylon.js under ADR-0006 and the selected
«Сдержанный графический роман» art direction, with the explicit
«Туман и мокрый камень» environment override. No new engine competition or full
3D conversion is a prerequisite.

## Full M1 scope that remains binding

- One region, one city, three NPC villages and one dangerous site.
- Eight HUNT/INVESTIGATE/RESCUE contract instances, eleven scenes and the
  «Когда молчит мельница» chain, with real clues, captives, custody and failure paths.
- Four reusable backgrounds, six portraits, two trophy images and three enemy
  archetypes with source/licensing evidence; counts alone do not establish quality.
- Actual company maintenance, care, recruitment, inventory, progression,
  service and remaining F01/D02/I02 responsibilities; no successful placeholder.
- Physical owner plus one consenting helper; server-owned time, knowledge,
  encounter authority and one lawful reward. No teleport, invented witness,
  resurrection or automatic heir.
- Current integrated browser, persistence, privacy, visual/device and owner
  comprehension evidence. Preserve historical replay/saves and exact money.

Original source ZIP concordance remains RC-GAP-MACHINE-01 / NOT_RUN.
Canonical proposals and provisional numeric profiles retain their original status.

## Beyond M1

| Horizon                                       | Intended result                                                                                 | Entry boundary                                                                                                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First expansion after M1                      | Second region and second city, per the October 7 owner decision                                 | Complete M1 first; define the finite regional contract and compatible transition.                                                                                             |
| M2 — one persistent MMO world                 | PvP, direct trade, captivity, three-sided battles/reinforcements and first capturable holding   | Source-defined policies, real integration and 50–100 CCU load/soak evidence. Historical numeric scope is not measured capacity or a reason to restore superseded roster caps. |
| M3 — repeatability and retention              | Content and world causes sustain decisions, progression and stories beyond the authored opening | Observe real players and measure content cost, economy and reasons to stop; use evidence to select changes.                                                                   |
| M4 — own-site Early Access / Yandex candidate | Platform identity, localization/accessibility, support and release/rollback operations          | Platform journeys and release acceptance; payments/ads only if separately approved.                                                                                           |
| M5 — seasonal/political expansion             | Expeditions and politics preserve the permanent company and its history                         | Accepted season/transfer policy and real duplication/recovery checks.                                                                                                         |

These are canonical horizons, not an authorization to start them during M1.
No completion percentage, delivery date, enjoyment or server capacity is inferred
from test totals. Use the smallest meaningful checks during each step; run the
existing clean integrated game gate once at final code delivery. Documentation
updates do not require game tests.
