# WLC-08 — Real M1 journey and consolidation acceptance

Owner assignment, 2026-11-08, P0; dependencies WLC-02–07. Writer/coordinator:
`codex/wlc-08-integration`, `.claude/worktrees/wlc-08`. Implementation, integration,
isolated QA, documentation, GitHub PR and Airtable synchronization authorized.
Merge, deployment, auto-merge and paid provisioning are not authorized.

## N01 reconciliation — 2026-11-09

[N01](../work-packages/m1-next/01-integration.md) records the separate local
`codex/n01-integration` candidate, integration commit e8784c1c, based on current
main3c55cf35 and PR430d22336a4. The only conflict was additive changelog text;
executable code is unchanged from PR430. PR428 is merged; PR429/430 remain open,
and their source branches plus all retained failed WLC08 worlds are untouched.
November 8 navigation/advisory amendments are retained; the previous roadmap is
preserved in [dated history](ROADMAP_HISTORY_N01.md).

Fresh normal OIDC/new-company/contract/equipment/supply/restart/re-entry PASS at
measured1440×1000: Дозор N01, three living people,760crowns,37rations, Rell's
sword/shield, accepted mill contract.18canonical groups match across restart.
Production builds/debug refusals,40integration-mode checks,51focused unit checks,
migration smoke and isolated owned-save restore25→22→25/readback PASS.
Historical-player-save proof remains NOT_RUN pending a scoped read-only source;
N01 is PARTIAL/LOCAL, not published, merged or full M1 accepted. Detailed commands,
actual probe failures, remaining limits and reproduction are recorded once in N01.
All previous WLC08 evidence below remains historical and unmodified.

## Scope and player result

Prove the ordinary persistent company loop on the integrated candidate, without
editing account/company/world/time/combat state. Start with local Dex OIDC and a
new company, equip, buy provisions, accept authentic contracts, physically travel,
enter actual PvE through normal admission and use the ordinary HUD. Preserve the
real outcome and casualties; obtain physical proof, return/present, receive one
lawful reward, treat/rest/pay, take another contract, restart and sign in again.
Refusal must explain its prerequisite; lost replies/exact retry and reconnect must
retain server-owned results once. A defeat is a real outcome, not a passing proof/
payment journey. Missing wounds cannot be fabricated to claim treatment coverage.
The full accepted M1 scope still includes the roadmap's company/content/co-op criteria.

Also check Combat Lab setup/activation/manual/autoplay/replay/cleanup and World/
Battle Map drafts/validation/export/invalid-publication refusal. Developer scenarios
are isolated in `playground`; their combat does not establish campaign acceptance.
Retain versioned replay, saves, archived provenance and dated owner decisions.
Remove stale operational guidance, preserving local UI acceptance for damaged journeys.

## Owner amendment — accelerated QA campaign time, 2026-11-08

Owner explicitly requested «Ускорь время и добавь возможность ускорения времени
для playground» and authorized player-two's ordinary login/company/physical PvE.
This supersedes the natural-payroll wait for this isolated acceptance stand only.
Accelerated observations must be labelled; they do not prove real six-hour waiting.

Add a development-only campaign-time panel to Playground. An operator must opt in
with `PLAYGROUND_CAMPAIGN_WORLD` equal to this stand's configured world. Default
Playground remains sandbox-only; production/unknown environments refuse this mode.
Use an exclusively owned disposable database, never a retained player stand.
The panel explicitly names the affected QA world, current campaign tick and fixed
forward steps1/10/100/1000. This exceptional QA control affects that world, unlike
ordinary sandbox commands. No arbitrary world input, reverse time, money/item/
health edits, wall-clock/auth/session/deadline changes or autonomous speed loop.

Existing `readWorldClock` remains the clock owner. Under its world-row lock, advance
simulation offset `qa_offset_ms` by the duration of the chosen campaign step and
atomically retain an account-scoped exact request/receipt in migration0024.
Migration0025 owns the offset; ordinary worlds retain zero. Millisecond movement,
campaign ticks and world light share that adjusted clock; authentication/session
expiry and combat deadlines retain real time. Exact retry returns its receipt; a conflicting
ID refuses. Reject advances while a canonical encounter is active to preserve
combat admission/effect timing. Ordinary movement, food, wages and rest then assess
elapsed campaign ticks through their existing server/domain paths; no second
settlement engine. Time remains advanced after restart or disabling the tool.
Rollback refuses to discard an existing adjustment journal; it cannot rewind time.

The UI persists the request before sending and offers exact retry after reload or
lost response; storage failure prevents a new command. Existing OIDC/allowlist/
origin/loopback/production guards own access. Verify real SQL atomicity/concurrent
retry/conflict, disabled/wrong-world/production/foreign session and active battle
refusals, restart readback and no direct finance/item mutation by the clock command.
Then use the panel in the ordinary journey and record actual lazy settlement.

## Candidate and dependency boundary

Base `fdbb0dc2764803a28098ad3f85985a02c8122ece` (main at initial live readback).
WLC-02 PR420, WLC-03 PR421, WLC-04 PR424 and WLC-05 PR426 are merged there.
WLC-06 PR428 head `d2d82bc3340f6546aa04f2a447c778ce0d617d58` and WLC-07 PR429
head `b58c87ce3f489484a9fd8cdf1eecf2efd8c6203b` are OPEN/NOT_MERGED. They are
explicitly included in this integration branch, without changing either writer's
branch. Their earlier results do not prove this new combination. Local integration
commits `f2cf972e` and `da3e8174` preserve both histories; only additive documentation
conflicts required resolution. Final checked executable SHA is recorded below.

Version pointers (read directly from this candidate):

- `assets/manifest.json`, schema1, active runtime revisions and archive source links;
  current world raster `atlas-v6`, saved namespace `world.porechye.atlas-v1` retained.
- Campaign/Combat Lab `m1-domain-bridge-v5`; historical M0/sprite replay versions retained.
- Playground schema2, `playground-v2:m1-domain-bridge-v5`.
- Map artifact schema1, `map-v1:atlas-v6:sprite-prototype-v4`; published content
  applies to new worlds only and is never assigned to existing saves by the editor.
- Ordered migrations0001–0025; no released migration changed.
- Pinned Node24.20.0 / pnpm11.25.0, frozen existing lockfile; Babylon is the renderer.

## Owned resources and reproducibility

Dedicated Compose project `warwrit-wlc08-20261108`, PostgreSQL54808, Dex55808,
API33808, realtime33809, web53808. Generated ignored `.env` and Dex config follow
[the isolated ordinary setup](LOCAL_DEVELOPMENT.md#isolated-ordinary-game-worktree--176)
with these matching ports. `pnpm install --frozen-lockfile`, `pnpm db:up`,
`pnpm db:migrate:up`, `pnpm dev` launch the ordinary game. The original dirty
checkout, other stands and saved companies are untouched. Graph index refers to
the original old checkout, so discovery here uses owning source and `rg` fallback.
Raw logs are ignored under `output/wlc08/`; durable summarized evidence lives here.

## Integration result — 2026-11-08

**Representative ordinary company loop PASS, with explicitly accelerated QA time.**
Executable candidate `0c0aae839c884403a2389562808485604acc80bc`;
tree `98c5ae3cac07fcc5bbc01019a00a0d1a9862cbec`. Later delivery changes are
documentation/screenshots only. Publication SHA and final-head check results are
recorded in the integration PR. Status PUBLISHED / REVIEW / NOT_MERGED;
full M1 remains NOT_ACCEPTED. No old CI result is reused as new integration proof.

### Ordinary journey (all actions through the game UI)

Final empty database `wlc08_final`, migrated0001–0025; ordinary `pnpm dev`.
Dex player-one owns `1ff758bf-31f7-4fb3-b714-e1b09c71fc50`, «Итоговый дозор WLC08»;
player-two owns `e58e721d-1987-49d9-8799-fa39ff69515e`, «Итоговая помощь WLC08».
Neither account, company, route, combat result nor inventory was repaired in SQL.

| Requested steps                             | Actual result                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1–3 OIDC, creation, initial people/property | Both ordinary OIDC accounts created companies with a leader and two selected companions. Main cash800,27rations after opening upkeep. Main chose Rell/Kest; helper Rell/Mora.                                                                                                                                                      |
| 4–5 Equipment/provisions                    | All9equipment actions accepted for each company; main bought10rations for40crowns:760/37. One prematurely repeated helper click left a shield unequipped; the real JOIN refused. The missing shield was equipped normally and consent renewed, with no code/state bypass.                                                          |
| 6–8 Contract/travel/arrival                 | Main accepted HUNT-02 at Bereznyak, then physically travelled Bereznyak→Kamenny Brod→Bereznyak before JOIN. Both had initially travelled from Severny Dvor. Fixed QA steps closed the saved routes through the ordinary movement worker.                                                                                           |
| 9–11 Actual PvE/HUD/outcome                 | Helper HELP/JOIN, then owner JOIN activated both rosters. Encounter `0e8d9b21-03b3-4b1c-b21f-7a65de5cf3c1`, bridge-v5, resolved revision52/round4,52commands/52receipts. Manual attack accepted after API restart; subsequent actions used ordinary HUD's single-action chooser. Victory:5allies standing, Kest dead,3wolves dead. |
| 12 Consequences                             | Terminal effects committed once; Kest's death and minor-wound/death history persisted. His raider weapon and coat stayed in the company's supply. Two survivors retained reduced health/stamina and damaged armour.                                                                                                                |
| 13–16 Proof/issuer/presentation/one payout  | Picked the actual unique pelt into the supply container, returned to the elder's interaction and PRESENTed it. Cash760→840; helper stayed800. PRESENT response was dropped after commit; reload/exact retry confirmed the same command without a second80crowns or pelt. One redeemed world proof remains.                         |
| 17 Rest                                     | Returned to the actual Severny Dvor site, assigned both survivors to RECOVERY, advanced+1000ticks, refreshed: both100/100health/stamina; food37→35. Returned both to FIELD. Medical treatment NOT_RUN: Kest was the only physician and died; the survivors had no treatable condition.                                             |
| 18 Payroll                                  | Allocated Rell's due10crowns at the local company wallet: treasury840→830, Rell50→60, claim paid10/pending0. No allocation to deceased Kest was attempted; that separate estate/death-payroll path remains unverified.                                                                                                             |
| 19 Next contract                            | Same company accepted «Когда молчит мельница» from the Severny Dvor elder. Its four ordinary objectives remain in the journal. This is a started next contract, not its completion.                                                                                                                                                |
| 20–21 Restart/login/persistence             | Restarted the API and repeated normal OIDC login. Same company,830crowns, Rell60,35rations, two living members, Kest dead, retained equipment/pelt and both contract results remained.                                                                                                                                             |

The native browser reported568×853; the attempted viewport override did not change
that measured size. These captures prove the observed controls, not desktop-wide
visual acceptance or mobile approval. No critical control prevented this completed
path. Broad presentation/device/enjoyment acceptance remains separate.

### Resilience and conservation

| Scenario                  | Evidence/result                                                                                                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Travel disconnect/restart | Both accepted physical routes recovered after stand restart; ordinary reload showed movement continuing. Accelerated arrival and subsequent departure worked on the same simulation clock.                                                                                     |
| Lost response/exact ID    | Time and PRESENT replies were actually dropped by a transport-only relay after HTTP200; reload retained the saved requests. Exact retries produced one effect/receipt. PRESENT command `178cd4c8-13c3-4e62-8d39-d2aea50a27b3`, receipt `a07b3214-dd5a-4b5c-9150-9df8bd5e25fe`. |
| API restart in battle     | Restarted only the owned API at active revision6; the same encounter recovered and accepted a manual attack. No encounter/receipt was re-created.                                                                                                                              |
| Complete settled recovery | An initial11-group comparison passed. Expanded capture then included proof, ordinary contracts/receipts and QA clock/journal: **all17groups exactly equal across another API restart**, before elapsed-time observations. Normal OIDC re-entry separately checked the UI.      |
| Invalid action            | Incomplete sword/shield loadout and remote-wallet recovery were refused without a partial command effect. Physical entry at the visible Severny Dvor marker was required; clicking empty space within a marker's overall bounds had legitimately targeted nearby terrain.      |
| No double reward/items    | One redeemed pelt, one80crown transfer, helper balance unchanged; exact PRESENT retry adds neither. Retained gear,35rations and unique item IDs checked in canonical snapshots. Full17groups also stayed exactly equal across the final Combat Lab/Map Editor scenarios.       |

### Playground and production

Repeated on `0c0aae83`: Combat Lab create→choose «Ранения и смерть»→save→Validate
→Start→manual Defend→Autoplay→victory→replay MATCH→Delete PASS. Encounter
`79c54b8a-a436-4436-8cd4-7a1219e270d0`, revision2,2commands/receipts,12events;
deleted sandbox `c1322f44-0315-417a-b455-d65a96daef9e`. An initial replay click
paused Autoplay before a new action; the subsequent observed terminal run is the
evidence cited here. Sandbox outcomes never entered the campaign.

World draft `2cd80d25-390d-4a60-9a4c-fa765bec1ece`: removed required Bereznyak,
saved/validated→DANGLING_SITE and disabled export; restored the content ID,
saved/validated/exported. Battle draft `950b853f-a801-4a3e-9583-306e152f708b`:
painted cell0,0height1, saved/validated, rendered Babylon preview and exported.
Invalid publication, ownership/origin/session/production refusals and immutable
publication are covered by the real integration boundary tests; no content was
published or assigned to an existing world in this journey.

Production web build with the normal development `.env` contains no executable
Playground/CampaignTime/MapEditor entry chunks. Fresh production-preview navigation
to `/dev/playground/combat` showed «Инструмент недоступен». Production server
distribution excludes Playground/campaign-time routes and editor routes; shared
content/fixture helpers remain legitimate consumers. Production configuration/API
guards PASS in focused and full tests. No retired renderer/asset dependency was
introduced; content validation resolves all130active assets.

### Technical checks at the executable SHA

| Check                                                       | Result                                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Frozen dependency install                                   | PASS, unchanged pinned lockfile                                                                        |
| Format/lint, architecture, dead code/dependencies, patterns | PASS                                                                                                   |
| Content validation                                          | PASS,130assets                                                                                         |
| Production build and all package typechecks                 | PASS; existing chunk-size advisory retained                                                            |
| Unit mode                                                   | PASS1150 /117SKIP,170passed files                                                                      |
| PostgreSQL integration mode                                 | PASS108 /17files, per-file migrated clean databases, one worker                                        |
| Migration up/down                                           | PASS complete smoke through0025, retained legacy checks and used-clock rollback refusal                |
| Determinism/stress                                          | PASS10000battles,20deterministic reruns,100replays,1302384commands                                     |
| Focused clock regressions                                   | PASS32 movement/world/time tests and2real wolf JOIN/move/bow/retry/terminal variants (zero/+2160000ms) |
| CI / deployment / owner acceptance                          | NOT_RUN / NOT_RUN / NOT_ACCEPTED                                                                       |

Raw local logs/captures: ignored `output/wlc08/`, including final-0c0a-checks.json,
complete-before/after-restart.json and after-final-playground.json. The final-head
publication check log is reported in the PR. Earlier3364fcb4 full SQL run timed out
on the wolf terminal test under contention; the unchanged test passed alone. The
final0c0aae83 run with one worker passed all108. Earlier lint failure came solely
from temporary diagnostic scripts in output; moving those tools under the ignored
worktree-tools directory restored lint without changing the rule.

### Screenshots

[Victory](evidence/wlc08/final-victory.jpg),
[one payment](evidence/wlc08/final-payment.jpg),
[rest/payroll](evidence/wlc08/final-rest-payroll.jpg),
[next contract](evidence/wlc08/final-next-contract.jpg),
[re-entry](evidence/wlc08/final-relogin.jpg),
[Lab replay](evidence/wlc08/final-lab-replay.jpg),
[production refusal](evidence/wlc08/final-production-denied.jpg).

## Publication and canonical synchronization

Published [PR430](https://github.com/Vovanostm/warwrit/pull/430), open/non-draft,
NOT_MERGED. GitHub readback confirms the dependency heads and mergeability.
PR428/429 received links to these actual integrated results; PR430's matrix also
links all four merged dependency PRs. Final delivery SHA/check readback lives in
that PR; no merge, deployment or auto-merge was requested or executed.

Canonical Airtable Work Packages contained no WLC records at the fresh search.
Created WLC-02–08 under the existing M1 milestone, with source PR/evidence links:
02–05 **Done** (their merged scope only),06–08 **Review**. [WLC-08 record](https://airtable.com/apph3bj1NyVrfJeLM/tbl9QMeAY4gJKUlHy/recaaz0pdrXUCjWuZ)
links its six dependencies and the existing delivery/execution artifacts.
Readback confirms all seven statuses. Appended dated operational corrections to
artifact Purpose fields `recqHVaV1d5ZLbGeM` and `recZhUoTiwT7kIc8s`; readback
matches. Historical Purpose/Notes and owner decisions were preserved. Earlier
renderer/global-gate/standalone-entry instructions are explicitly superseded;
full M1 remains incomplete. Empirical event NOT_WRITTEN: previously reported
storage quota is still exhausted; no repeated write or paid provisioning.

## Initial checkpoint — SUPERSEDED by the integration result above

Historical status: LOCAL / IN_PROGRESS, NOT_MERGED, M1 NOT_ACCEPTED. No historical green CI
is used as fresh evidence. Checks below are local observations unless named otherwise.

- Frozen dependency install PASS; normal launch/readiness PASS.
- Clean database migration up0001–0023 PASS. Existing migration smoke reproduced
  a real stale-catalogue failure: expected list stopped at0019. Updated expected
  migration order and rolled back0023→0020 before all existing older data-preservation
  tests. The same empty database then passed full smoke/up/down, including preserved
  legacy encounters and all previous rollback refusals. Playground schema removal
  additionally preserves public encounters. No migration or saved-data change. A second stale list in the world-clock
  round-trip integration test also stopped at0019; its retained rollback/order/clock
  assertions now include0020–0023. Direct single-migration guard probes are valid
  and retained. A first integration-mode command included unit files without SQL
  allocations; those setup errors are invalid harness evidence. The corrected
  invocation selects `.integration.test.ts` files.
- Ordinary Dex player-one sign-in, new company «Приёмка WLC08», leader «Дозор»,
  Rell/Mora, all9equipment commands, provisions purchase and authentic local mill
  contract PASS. Opening cash800, rations27 after upkeep; purchase40 gives cash760,
  rations37 and settlement stock290. Travel to Kamenny Brod accepted normally.
- Fresh battle/proof/payment/care/payroll/next-contract/restart, all resilience,
  integrated Playground checks, static checks, production artifacts and full
  final acceptance remain pending / NOT_RUN until their observed results are added.
- Payroll originally required natural day2/tick0. The owner then explicitly
  authorized accelerated QA time; the amendment above supersedes that wait.
  Real six-hour waiting remains NOT_RUN, never claimed by an accelerated check.

### Integration defects and corrections

The standard web build with the ordinary local `.env` (`NODE_ENV=development`)
produced executable Playground chunks. This is a reproduced production-isolation
defect despite prior candidate artifact claims. The web build command now pins
`NODE_ENV=production` for Vite, preserving normal development behavior and using
Vite's existing dead-code elimination. Fresh artifact results follow below.
Removed six unused exports left by retired editor paths (two become private;
obsolete map-draft helper/type, unused drawing pace constants and type re-export
are removed), plus stale Fallow paths. The sole repository formatting failure
was corrected without changing that test's behavior.

The first ordinary unit command accidentally inherited the gameplay stand's
DATABASE_URL. It was stopped and is INVALID evidence; a later SQL read retained
the same ordinary company/revision and no encounters. SQL checks use the existing
integration runner with independently migrated per-file databases. No world reset
or manual repair of the ordinary company was used.

## Documentation and visual gate

Current README/docs map/roadmap now point to the ordinary game, selected Babylon,
protected Combat Lab and unified editor. ADR0003's old renderer competition is
explicitly SUPERSEDED by ADR0006; its historical rationale remains readable.
WLC-05's foundation description is marked historical rather than an active editor
instruction. AGENTS and relevant skills follow optional independent review and
advisory CI. No global visual BLOCKED prerequisite was found in executable scripts/
CI; existing BLOCKED_ENV reports describe scoped missing resources, not art gates.
Concrete critical UI defects still prevent acceptance of their affected journeys.

## Remaining M1 scope and delivery limits

The representative first loop and consolidation checks above are proven. WLC-06/07
remain unmerged dependencies, and this integration needs owner review/merge; no
programme rollout or full-M1 completion is declared by this report.
Existing broader M1 requirements (eight authentic contracts and branches, physical
owner/helper, company service/learning/remaining inventory, privacy, backup/restore,
device/performance and owner comprehension) retain their owning roadmap issues.
Medical treatment, deceased-member payroll/estate resolution, the complete second
contract, backup restore and the complete eight-contract/branch matrix remain
NOT_RUN here. Generic loadout/remote-wallet refusals and raw trophy IDs could give
clearer guidance; no broad UX approval is inferred. Desktop-wide layout, performance,
FPS/capacity/heap/enjoyment NOT_MEASURED; no deployment or owner acceptance inferred.

## Retained failed runs

Database `warwrit`: ordinary owner/helper journey, supply response-loss/exact retry,
travel, active encounter `040d4db5-c0b6-4c81-bc9e-8c442fa8c20a` restart PASS.
The agent then missed «Вернуться к управлению»; all six allies died. Final
revision145 and terminal effects persisted, no proof/reward minted, main cash756.
This is a failed player run, retained without reset. See
[defeat](evidence/wlc08/first-run-defeat.jpg); raw first-run-final.json stays local.
Database `wlc08_success` retains the prototype clock/terminal failure described
below. Neither failed world supplies success evidence for the final company.

### QA time implementation checkpoint

Migration0024 applied to this owned stand; no released migration changed. Three
real SQL tests PASS: concurrent/exact/restart receipt, conflicting body, foreign
session/origin/disabled/production/invalid steps, active encounter refusal, journal
rollback refusal and an actual receipt-write constraint failure rolling back the
clock before a successful identical retry. Server/web types, scoped lint and18
config/HUD tests PASS. Initial test-only fixture omitted required activation clock
columns and failed; corrected fixture passes. This was not a production defect.

Native +100 committed at127→227 with command6d5857b1-5f7f-4f20-8b1f-a2048aa5620f;
the real reply was dropped. Server restart/reload/exact retry PASS with one receipt.
Player-two was created through authorized ordinary OIDC and all9equipment commands;
its physical route to Bereznyak was accepted. No helper/position/finance fabrication.

### Corrected simulation-clock semantics

The first QA implementation advanced campaign ticks while movement milliseconds
remained real. The prototype world reproduced temporary TRUSTED_TIME_UNAVAILABLE
while a route accepted after that adjustment had a future arrival tick. Preserve
this failed attempt: it does not establish successful accelerated travel.
Migration0025 converts only the opt-in journal's advances to milliseconds while
preserving current tick; no saved company/route is rewritten. Both ordinary
prototype companies subsequently arrived and remain retained. New acceleration
uses the simulation offset consistently, including routes started after a jump.
32 focused real PostgreSQL checks PASS (campaign-time, continuous movement,
world routes), including arrival after an offset, stable repeated settlement and
next departure on that same clock. Final native journey and final-SHA checks pending.

The retained `wlc08_success` prototype then won an ordinary two-company wolf
encounter (round11, three enemies dead, four allies standing/one dead/one fled).
Terminal settlement correctly refused RECEIPT_TIME_EVIDENCE_MISSING: the encounter
adapter had independently calculated receipt ticks without the QA offset. No proof,
reward or saved casualty acceptance is claimed for that run. The shared `worldClockAt`
now owns both world reads and combat receipt timestamps. The real wolf JOIN/move/
bow/retry/terminal regression is exercised at zero and +2160000ms offsets; the
offset case failed before the correction. Never rewrite the prototype's receipts.
Final native acceptance restarts from empty `wlc08_final`; both earlier worlds remain.
