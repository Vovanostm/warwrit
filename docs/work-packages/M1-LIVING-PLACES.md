# Living places — 2026-10-04

Active owner request: make cities, villages and visited landmarks feel alive,
with parallax, highlighted entrances and at least ten building types with two
or three visual variants each, in one coherent style.

Parent `/root` is the sole writer on `codex/living-locations` in the primary
checkout, based on main `9c86605`. Existing player database and API are retained.
The independent visual critic is read-only. No merge or deployment permission.

## Observable outcome

Select a place on the map, open **Место**, explore its layered ink/wash scene,
hover or keyboard-focus a building and enter it when the party is physically
there. Return to the map without sending a movement command. Remote places
are previews, with entrance access disabled.

## Finite scope and decisions

- Ten types, each with rural, river and town variants: market, forge, elder's
  house, inn, chapel, herbalist, stable, guardhouse, mill and granary.
- Original transparent building sheets, three silhouettes per type. Shared
  black ink, weathered wood/stone, moss, ochre and rust palette under ADR-0006.
- Authored sets for Kamenny Brod, Bereznyak, Tikhaya Gat, Severny Dvor and the
  old mill. Existing painted landscapes supply the distant layer; buildings,
  foreground vegetation, smoke and night illumination supply depth and life.
- A building opens an illustrated place panel. The elder's house exposes the
  existing contract UI, forge links to the existing company equipment UI.
  Other interiors are descriptive visits; this cycle does not invent shops,
  healing, wages, recruits, goods or new NPC facts. Available existing contracts
  remain accessible from the place sidebar.
- Client presentation only. Actual movement mode/site controls entrance
  eligibility. No server, protocol, domain, migration or dependency changes.
- Native buttons, visible keyboard focus, Escape/return, touch selection,
  reduced-motion support and scoped pointer handling. No camera/game command
  on parallax or entrance selection.

## Owning files and checks

`apps/web/src/game/{GameShell,PlaceScene,place-buildings}` and place-scene CSS;
`assets/art/m1/places/buildings`, existing art manifest; this contract, current
plan and the existing wiki specification. No second source writer.

Focused web typecheck/build, changed-file lint/format, architecture check and
real authenticated browser journey (city/village/landmark, remote preview,
entrance, return, keyboard, reduced motion and narrow viewport). Independent
critic receives current captures and actual journey evidence before completion.
No full-M1 acceptance claim.

## Result

Implemented 2026-10-04. Ten transparent sheets contain three original variants
each. City, village, river settlement, farm and ruined mill use authored visual
sets. Persistent gold entrance labels distinguish actual access from disabled
remote previews. Layered pointer parallax, smoke, night shading, keyboard entry,
Escape and touch selection are available. The old mill retains its ruined
watermill image and one yard entrance; intact settlement mills have no local
contracts shortcut.

- Final `scripts/bootstrap.sh`: PASS, exit 0. Format/lint, architecture,
  dead-code, content, build/typecheck and unit checks passed: 604 checks,
  46 skipped. Combat stress: 10,000 battles. Migration/auth/encounter checks:
  14 passed, disposable PostgreSQL removed. Earlier interrupted run ended143
  and is not a pass. Existing player storage was not replaced.
- Final changed-code audit: PASS, three inherited findings excluded by the
  existing gate; no suppression or hook bypass. The action simplification made
  during the bootstrap is additionally checked through focused web typecheck,
  lint and authenticated browser readback.
- Actual browser: village visits for all ten entrances, elder/contracts and
  forge/equipment links, Enter/Escape with restored entrance focus, map return,
  city/river/ruin remote previews and 390px layout. Pointer motion gives distinct
  distant/building/foreground transforms. Final narrow width equals content
  width390. Current village scene fits1440×1000 with all ten entrances visible.
- Independent read-only critic inspected current source and fresh captures;
  reported no remaining established material issue after fixes for focus,
  persistent access labels, ruined-mill art, remote contract context and layout.
  Critic did not operate the browser or measure motion.
- NOT_RUN/NOT_MEASURED: live reduced-motion override, physical old-mill entry,
  device/performance matrix, subjective enjoyment and full M1 acceptance.
  Commerce, healing, repair, recruitment and new NPC services are unavailable;
  these visits are descriptive panels and links to existing actions.

Local playtest: `http://127.0.0.1:5287`, select a map place, then **Место**.
Enter a highlighted building where the party is present; **← Карта** returns.
Diagnostic captures remain local under `output/playwright/living-places`.
Published [PR139](https://github.com/Vovanostm/warwrit/pull/139), implementation
commit `584497b`, normal commit audit passed. GitHub CI pending at publication;
local checks do not prove its result. Canonical Airtable/Empirical publication
checkpoint NOT_UPDATED; repository files and PR own this delivery record.
NOT_MERGED; no deployment authorization.

## Owner correction — cohesive settlements, 2026-10-04

The owner rejected the overview as houses pasted over meadow texture and
requires a professionally composed, multilayer complete settlement. This
supersedes visual acceptance of the first cycle; earlier technical checks
remain historical evidence only.

Next observable outcome: open Bereznyak and see a coherent inhabited village
with lanes, courtyards, fences, supporting homes and grounded buildings in one
perspective and light. Painted distant scenery, settlement terrain/architecture
and close foliage/props provide separate depth planes; entrance points follow
the painted doors. Then apply the same art direction to city, river settlement,
farm and ruined mill. Retain ten building types/three variants and existing
actions, access eligibility and player storage. No new mechanics or technology.

Parent remains the sole writer on the same branch/PR. Independent critic is
read-only. Confirm no pasted silhouettes/texture repeats, perspective/light
consistency, door alignment at pointer extremes, unobstructed entrances,
remote-disabled cues and usable narrow framing. No merge/deployment.

### Cohesive scene result — 2026-10-04

Implemented five connected painted locations: village lanes/gardens, dense
stone town and crossing, riverside docks/boardwalks, farm working yard and
the ruined watermill. Ten building types each have rural, river and town
architecture within the paintings; the earlier 30 source variants remain.
The overview no longer pastes isolated building sprites onto grass texture.
Distance, continuous settlement terrain/architecture and near props move at
different depths. City, river and ruin have distinct foreground material;
the ruin retains its broken roof/wheel and distant castle silhouette.

Door markers share the settlement transform and render above foreground
decoration. Close views crop the same full painting and sidebar art matches it.
The overview stays mounted during visits, retaining image readiness and
keyboard focus on return. Narrow screens scroll the aspect-preserved panorama
and expose a two-column building menu. New prompts and inspected references
are recorded alongside consuming assets in
`assets/art/m1/places/settlements-v2/provenance.json` and the existing art index.
Removed the obsolete, now-unused `placeIllustration` adapter; no map/domain
rules or player storage change.

- Actual authenticated browser: all ten village entrances, elder/contracts
  focus, forge/equipment route, Enter/Escape and restored door focus, map
  return; disabled city/river/farm/ruin remote entrances. 390px page width
  equals content width; menu opens granary, Escape focuses its entrance and
  panorama scrolls to402.5px, exposing the far buildings. Separate layer motion
  confirmed on real pointer input from left/right river entrances, with no
  visible exposed edge seam. Current day/night overview and village close
  captures, plus refreshed site-specific foregrounds, were reviewed.
- Independent read-only critic found no established material defect in the
  inspected integrated scenes; village ink revision resolved its earlier
  style concern. Repeated foreground framing was optional feedback and was
  replaced for city, river and ruin. Critic inspected source/captures rather
  than operating the browser. Enjoyment remains NOT_MEASURED.
- Full bootstrap passed:604 unit checks,46 skipped,10000 combat stress battles
  and14 migration/auth/encounter checks. Disposable verification PostgreSQL
  was removed. First attempt failed on the obsolete illustration export and
  is not a pass. After the passing bootstrap, equivalent layer defaults were
  consolidated in `placeBuildings`; current web build/typecheck, affected lint and
  changed-code audit against `origin/main` passed, with4 inherited findings
  excluded by the existing gate. No suppression or hook bypass.
- NOT_RUN/NOT_MEASURED: live reduced-motion override, physical remote-place
  entry, broader device/performance matrix, full M1 acceptance. New commerce,
  repair, healing and recruiting mechanics remain outside this visual cycle.

Playtest remains at `http://127.0.0.1:5287`: map place → **Место** → highlighted
entrance. Current captures are local in `output/playwright/living-places`;
the incorrectly named `ruin-night-final-19.jpg` is a map after hot reload and
is excluded from visual evidence. Correction implementation commit `381fbf8`
passed the normal commit audit. PR139 owns publication; current correction CI
must be read from its new head. NOT_MERGED; no deployment authorization.

## Owner correction — contracts through people and places, 2026-10-04

Owner rejects a settlement-wide contract dispenser and requires meaningful
visits: tavern, smith, elder, notice board and watch/barracks. The broader goal
is a deep, interesting game. This supersedes the first visual cycle's decision
to keep every available offer actionable in the place sidebar.

Current-source readback: Airtable `recZhUoTiwT7kIc8s`, `rechIKj0hsvfXIvFU`
and the earlier proposal `recA4VT0YX9x0LuO1`, plus
[the authored catalogue](../content/CONTRACTS_M1_DERIVATIVE.md). Earlier rules
already require actual local issuers, authentic evidence and physical hand-in.
The earlier web shell at `9c86605` shows a common sidebar; it does not implement
individual building conversations. Original archive concordance remains
unavailable; this is not a reconstruction of original game UI.

First observable cycle: at Bereznyak, a lead directs the player to the herbalist;
enter, ask what happened and what payment requires, accept existing terms,
inspect the real daytime clue, return to the same issuer and report for the
existing once-only payment. The journal retains accepted tasks and findings
while away; it cannot replace conversations and hand-ins. The author owns the
existing web shell/boards, place presentation and this section. No new domain,
server, protocol, migration, reward or NPC identity is introduced.

### Implemented meeting-point presentation

| Existing issuer / contract                                    | Meeting point in the existing issuer area |
| ------------------------------------------------------------- | ----------------------------------------- |
| City notice clerk / road tracks                               | Market notice board                       |
| Village provisioner / missing herbs                           | Herbalist                                 |
| City watch / lost scout and raider standard                   | Guardhouse                                |
| Village steward / mill worker                                 | Elder's house                             |
| Bereznyak elder / wolf trail                                  | Elder's house                             |
| River caller / cellar rescue and warning keeper / night beast | Inn                                       |

The keeper's existing ASK step is also at the river inn. A notice board gives
a lead, while its existing clerk discusses the contract. A smith has no
existing authored contract: no assignment is fabricated merely to fill a door.
Remote scenes remain disabled previews. Meeting points are authored client
presentation inside the same canonical areas, not persisted server subareas;
server presence, proof, revision, funded wallet and replay checks remain the
authority. No claim of server-enforced interior occupancy is made.

Outside a meeting, new local offers show leads rather than accept/help buttons.
Inside, only the matching issuer's offers and relevant task interactions appear.
Source-based conversation topics expose the brief and fixed proof/payment terms.
Accepted field work stays accessible in the journal, while ASK/REPORT/DELIVER
and hunt PRESENT lead back to their meeting point. Existing request retries,
helper choices, encounter discovery and custody remain intact.

### Deeper design direction — proposal, not implemented policy

Use three distinct sources of opportunity: public announcements, local talk
and direct personal requests. Each offer has an interested issuer, a reason
to hire the company, a source for each known statement and explicit proof
requirements. Rumors remain attributed uncertain reports; hearing a rumor does
not establish guilt, spawn a captive or complete an objective.

Reference patterns: The Witcher 3 uses notice boards alongside conversations
with issuers; Mount & Blade: Warband distributes requests among lords, village
elders and guild masters, with taverns serving other social functions; Battle
Brothers distinguishes settlement contracts and tavern information. These are
design comparisons, not evidence of a replicated or newly tested game system.

Proposed roles: inn — travelers and attributed news; smith — equipment-related
work; elder — village needs; board — public leads; watch — official search and
bounties; herbalist — supplies and local observations; market — merchant needs.
New smith work, trade, reputation gates, bargaining, NPC schedules and response
consequences need a finite authored profile before becoming executable rules.
Existing rewards/terms are fixed; this cycle adds no bargaining or reputation
bonuses.

Depth should come from information and consequential choices. The existing
mill chain already distinguishes grain-cart evidence, a keeper's report,
night-beast proof and delivery of the living worker: killing the beast does
not prove grain theft. Extend that causal structure before generating extra
fetch quests. A future choice must change a source-backed outcome, relationship
or access and survive re-entry; dialogue options that all produce the same
result must not be presented as branching gameplay. Distinct information can
justify a detour; empty obligatory building hops cannot.

Current-cycle acceptance: a local lead opens the correct building; unrelated
buildings expose no acceptance or hand-in; a matching meeting shows fixed terms;
the journal preserves existing work; remote entry stays disabled; keyboard,
return focus and narrow screens remain usable. Full acceptance/payment playthrough
must be reported separately from read-only UI checks. Independent critic required.

### Meeting-point cycle result — 2026-10-04

The playable UI journey at `http://127.0.0.1:5287` is **Место → Пропавшие
травы → Поговорить** or the highlighted **Травник** door. The matching meeting
shows the established brief, fixed40-crown reward and personal evidence hand-in.
The elder separately offers **Волчья тропа**, with80 crowns visible before
acceptance. Plaza leads expose no accept button; unrelated buildings show no
other issuer's offers. The forge retains equipment access without an invented
smith contract. The journal keeps accepted tasks and observations.

Fresh read-only browser checks cover herbalist lead/doorway/topics, elder,
forge, journal focus, Escape return focus, and390px layout (viewport/content
both390px). The retained **Проверка луга** company remains at Bereznyak with850
crowns; no acceptance, field work, hand-in or payment command was submitted.
Current captures: `output/playwright/living-places/herbalist-conversation-wide-final-33.jpg`
and `herbalist-conversation-narrow-current-29.jpg`.

Critic-found regressions are fixed: premature hand-in invitations before proof,
lost journal focus, treating every village mill as the objective, and wolf
JOIN/PICKUP while speaking to the elder. Three component regressions check
lead/issuer routing, blocked versus ready hand-in including a remote site, and
actual ruined-mill versus village/issuer field access. The existing hunt
transport test also checks selected-instance routing, session rejection and
malformed/private response rejection after the reader extraction. These tests
verify public presentation/transport, not a fabricated gameplay transaction.

Final `scripts/bootstrap.sh` passed on the current source:608 unit checks,
46 skipped,10,000 combat stress battles and14 database checks; disposable
verification infrastructure was removed. Log:
`/tmp/warwrit-contract-visits-bootstrap-final.log`. Current coverage generation
and the normal changed-code audit passed; log:
`/tmp/warwrit-contract-visits-audit-final.log`. Focused renderer/transport checks
passed15 tests. Independent read-only critic returned **DONE** on the final
source and1440×900/390px captures, with no material defect found.
Earlier audit failures were corrected without suppressions or hook bypass.

PR139 currently conflicts with newer main map/road work. This branch is a
playable candidate; integration and CI must be reported independently. Full acceptance → clue → return → payout through these new
meeting controls is **NOT_RUN**; client visits are not a new server occupancy
rule. Broader systemic depth remains the proposal above. No merge/deployment.

## Authorized integration — 2026-10-04

Owner explicitly requested “fix conflicts, merge, update local main”. This
supersedes this work package's earlier no-merge statements for PR139 only.
Parent owns the isolated integration checkout; the primary checkout's unrelated
owner documents, local captures and retained player data remain intact.
Both settlement and road records are retained in the existing art registry;
current main exact geometry and road rendering remain authoritative. Final
integrated source checks, playable smoke check, independent critique and GitHub
CI are required before the expected-head merge. Deployment is not authorized.

Conflict resolution retains all existing registry entries and both delivery
histories. No domain/server/protocol difference remains against main. Fresh
integrated web typecheck and21 focused presentation/transport/exact-navigation
checks passed. Unit coverage run passed614 checks,46 skipped; the normal audit
against current main passed. Full clean CI and the independent integrated
playable review remain pending before merge. The initial isolated typecheck
could not find unbuilt public workspace packages; building the pinned packages
resolved that environment failure without source changes.
