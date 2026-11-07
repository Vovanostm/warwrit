# Warwrit current delivery plan

## WLC-08 — Integration acceptance, 2026-11-08

Coordinator/writer: codex/wlc-08-integration, .claude/worktrees/wlc-08.
Owner authorizes isolated integration/QA, documentation, PR and Airtable sync;
merge/deployment are not authorized. Base main fdbb0dc2 includes WLC-02–05.
PR428/d2d82bc3 and PR429/b58c87ce are OPEN/NOT_MERGED and explicitly combined
in this candidate; source branches and original dirty checkout/saves retained.
[Owning journey, versions, actual checks and open criteria](WLC_08_ACCEPTANCE.md).
Current status LOCAL/IN_PROGRESS; frozen install, clean23migration up and corrected
full migration smoke PASS. Ordinary OIDC/new company/equipment/supply/contract
passed; physical travel started. Remaining journey/resilience/Playground/final
checks pending; payroll needs natural day2. M1 NOT_ACCEPTED. CI advisory.
Earlier dated blocks below retain their original delivery/evidence boundaries.

## WLC-06 — Combat Lab consolidation, 2026-11-08

Coordinator/writer: codex/wlc-06-combat-lab, .claude/worktrees/wlc-06.
Owner authorizes implementation and standalone PR; merge/deployment not authorized.
Base fdbb0dc2 includes WLC-04/05. Preserve original WIP and player saves.
[Owning journey, architecture and checks](COMBAT_LAB_CONSOLIDATION.md).
Status: PUBLISHED [PR428](https://github.com/Vovanostm/warwrit/pull/428), implementation6bd10ce0; OPEN/NOT_MERGED.
33 integration-mode (26SQL/7guards) +67 focused tests PASS; types/lint/architecture and migration up/down/up PASS.
Native setup/manual/auto/Pause/loss/reload/API restart/exact retry/terminal/replay PASS.
Owner confirmed active-battle reinforcements unavailable; game rules unchanged.
Screenshots and remaining limits are in the owning page. CI advisory; full M1 NOT_RUN.

## WLC-07 — Unified Map Editor, 2026-11-08

Coordinator/writer: codex/wlc-07-map-editor, .claude/worktrees/wlc-07.
Owner authorizes implementation and standalone PR; no merge/deployment.
Base fdbb0dc2 includes merged WLC-03/05. Preserve WLC-06's independent PR428.
[Owning journeys, isolation and acceptance](UNIFIED_MAP_EDITOR.md).
Status PUBLISHED [PR429](https://github.com/Vovanostm/warwrit/pull/429), implementation82cb5994. 52focused (3real PostgreSQL), native World/
Battle journeys, artifact delivery/recovery, migration rollback, types/lint/
architecture and production builds/artifact checks PASS. Current atlas v6 and
canonical rules remain owners; drafts never change active worlds. CI/full suite/
M1/deployment NOT_RUN; CI advisory, hosted completion not awaited.
Owned test stand cleaned up. No merge authorization; PR ready for owner review.

## WLC-05 — Developer Playground Foundation, 2026-11-07

Coordinator/writer: codex/wlc-05-playground, .claude/worktrees/wlc-05.
Owner authorizes implementation, standalone PR, merge and clean local-main update.
WLC-04/PR424 is merged in base a6d5e364. Scope: protected shell, isolated
sandbox lifecycle, versioned scenarios and inspection through existing renderer.
[Owning contract and results](DEVELOPER_PLAYGROUND.md). Editor functionality is deferred.
Status: MERGED [PR426](https://github.com/Vovanostm/warwrit/pull/426) as e14e549d; clean local main updated.
SQL5/config+lab16, types, lint/format/architecture and
production artifact checks PASS. Native lifecycle/retry and scene disposal3 PASS;
independent shell/infrastructure ACCEPT. CI advisory: unchanged formatter and contract-link parser failed.
[Confirmed receipt](DEVELOPER_PLAYGROUND.md#confirmed-merge--2026-11-07). Preserve other WIP/saves.

## WLC-04 — Server authority, 2026-11-07

Coordinator/writer: codex/wlc-04-server-authority, .claude/worktrees/wlc-04.
Owner authorizes implementation, PR, merge and clean local-main update.
Base43a2ff60 includes WLC-01/02/03; preserve other worktrees and saved games.
[Scope, mutation owners, player journey and checks](SERVER_AUTHORITY.md).
Equipment/camp exact retry, movement recovery and dependency enforcement implemented.
57integration-mode +49focused tests PASS/1pre-existingSKIP; web types/scoped lint/architecture PASS.
Native commit/lost-response/reload/exact-retry and API-restart recovery PASS.
Independent source review ACCEPT; broader scene-art/full-M1 acceptance NOT_RUN.
MERGED [PR424](https://github.com/Vovanostm/warwrit/pull/424) as56a34b22; clean local main updated to that merge.
[Confirmed receipt and advisory CI limits](SERVER_AUTHORITY.md#confirmed-merge--2026-11-07).
No parallel executor, migration, deployment or retained-save change.

## WLC-02 — Remove PlayCanvas pilot, 2026-11-07

Coordinator/writer: codex/wlc-02-remove-playcanvas, .claude/worktrees/wlc-02.
Owner assignment: standalone cleanup PR after merged WLC-01/PR419; base main79a6ba02.
Remove the executable paired renderer comparison/baker and PlayCanvas dependency;
retain public source assets/licenses/manifests, Git history and PR129's unmerged
branch. Production encounters and Combat Lab already share Babylon 9.28.0;
map/place lifecycle and game rules remain unchanged. Owner explicitly requested
“merge, update main” on2026-11-07: PR420 merge, documentation receipt and clean
local-main fast-forward are authorized. Deployment remains unauthorized.
[Owning scope and results](LEGACY_INVENTORY.md#wlc-02--remove-playcanvas-pilot-2026-11-07).
MERGED [PR420](https://github.com/Vovanostm/warwrit/pull/420) on2026-11-07
at17:36:10UTC asfd16fd23, expected head099cc7d6; reviewed/merged contents equal.
Clean local main fast-forwarded tofd16fd23.
[Merge receipt](LEGACY_INVENTORY.md#wlc-02-confirmed-merge--2026-11-07) retains
actual checks, advisory CI and open native-campaign acceptance limits.
Frozen install, workspace builds/types,
74 focused tests, architecture/content/scoped lint/format/diff PASS. Disposable
lab manual turn, auto start/stop, day/night, overview/zoom and scene disposal/
re-entry PASS (engines/scenes1/1 →0/0 →1/1). Ordinary App local login/map/place/
quest/travel/stop PASS on a disposable DB. Native campaign battle continuation,
full suite/coverage/performance and independent visual acceptance NOT_RUN.
Integration with main93adaef9/WLC-03 retains both deliveries. Fresh web types/
74tests/architecture/content (130assets) PASS; no game-source task delta.
Earlier CI4bb2a743 failed at unchanged connection.test.ts formatting, scope PASS.
CI advisory; final hosted completion not awaited, full-M1 acceptance not claimed.
Preserve the gameplay delivery blocks below and original dirty checkout.

## WLC-03 combat assets and atlas consolidation — 2026-11-07

Coordinator/writer: codex/wlc-03-assets, .claude/worktrees/wlc-03.
Base origin/main79a6ba02 includes WLC-01/PR419. Owner authorizes implementation,
review, PR and merge for this mission; no deployment or real-save mutation.
[Scope, player journey, archive and results](COMBAT_ASSET_CONSOLIDATION.md).
Status: MERGED [PR421](https://github.com/Vovanostm/warwrit/pull/421), implementation7e1f6b69; external archive restored;40focused +11PG
checks, production build and ordinary map journey PASS. Independent diff review
passed; scoped visual preservation ACCEPT (2–3/3). Hosted CI on7e1f6b69 failed at
unchanged connection.test.ts formatting; scope failed its contract-link pattern.
CI advisory; full suite NOT_RUN. PR421 merged2026-11-07 at16:46:47UTC as
25743a75, expected headf6a3953a; merge content equals the reviewed final head.
This worktree records the receipt; other local main/worktrees remain untouched.
Preserve other checkouts and WLC-02.

## Existing-item transfer #171 / PR339 — 2026-11-07

Coordinator/writer: codex/item-transfer-339-closeout, .claude/worktrees/item-transfer-339.
Owner assignment: integrate PR339 with current company UI; base main fbd34b22.
Owner explicitly requested “merge, update main” on2026-11-07.
PR339 merge, delivery documentation receipt and clean local-main update authorized; no deployment.
[Player journey and current results](../wiki/m1-spec.md#интеграция-передачи-вещей-pr339--2026-11-07).
MERGED [PR339](https://github.com/Vovanostm/warwrit/pull/339) at15:15:20UTC as c8128c54, expected head957087bc.
Clean local main fast-forwarded to c8128c54; merge and reviewed head have identical content.
[Merge receipt](../wiki/m1-spec.md#слияние-pr339-и-обновление-main--2026-11-07) retains checks and remaining scope; #171 stays OPEN.
Preserve care/recovery/payroll/recruitment.
25focused,4PG executor/13filteredSKIP,2PG routes,builds/types/lint PASS.
Native sword transfer/equip and split/lost-response/reload/retry PASS;28rations,one receipt.
Native capacity refusal now shows CAPACITY; atomic PG regression failed before fix,passes after.
Current screenshots1440/1280 and natural night captured; independent scoped critique ACCEPT (all applicable criteria2–3/3).
Local full suite/stress NOT_RUN. Hosted CI42382366905 failed at unchanged connection.test.ts formatting; PR scope PASS.
CI advisory; no gameplay failure reported by that early formatter stop. Previous checkpoint follows.

## Repeat unfinished hunt #409 — 2026-11-07

Coordinator/writer: codex/repeat-hunt-409-closeout, .claude/worktrees/repeat-hunt-409; implementation base main1d0667ce.
Owner assignment: implement #409; on2026-11-07 the owner explicitly requested “merge, update main”.
Merge of PR416, its documentation receipt and local main update are authorized. Deployment remains outside this mission.
Reuse committed specification156e26e4 and implementation39d874a9; preserve the original branch and primary WIP.
[Specification and current results](../wiki/mechanics/retreat.md#интеграция-409-с-текущим-main--2026-11-07) own the behavior and evidence.
MERGED [PR416](https://github.com/Vovanostm/warwrit/pull/416) at12:01:02UTC as d19193da, expected head941a505f.
Clean local main fast-forwarded to d19193da; reviewed head and merge have identical content.
[Merge receipt](../wiki/mechanics/retreat.md#слияние-409-и-обновление-main--2026-11-07) records actual delivery and retained acceptance limits.
Migration0020, multiple attempts/one current admission, fresh JOIN consent and exact living-hostile pools.
Repeat card, helper LEAVE/reconfirmation, saved-request retry and immediate payout refresh are integrated with current main.
Real PostgreSQL regression1PASS/24filteredSKIP; focused21PASS; public library builds, server/web types, scoped lint PASS.
Current App at1440×1000: prepared mixed retreat → repeat → reload waiting → helper LEAVE → renewed JOIN with lost reply → same-request retry → final death → pickup/PRESENT PASS.
Readback: two attempts, one current, wolf.02 pools10/0/66/20 unchanged at admission, prior dead excluded, one proof/payment.
Native OIDC new company «Повторный след» was created/equipped/travelled/joined normally; passive combat lost all3 without reproducing hostile retreat. Keep that save intact.
Full first-escape native acceptance remains open; do not close #409 or claim complete native acceptance.
Fresh independent API-process read and scoped playable critique ACCEPT (scores2–3/3); full native criterion remains open.
Publication verified against main1d0667ce/head6d1b238e. CI548d0027 failed only at the coordinator label in CURRENT_PLAN; corrected and focused plan check rerun. CI remains advisory; local full suite/coverage/stress NOT_RUN. Broader scene-art acceptance is outside this slice.

## Preserved predecessor deliveries

#370/PR414 and receipt PR415 are merged in the base; retained first-loop world/resources remain untouched.
#378/PR408 settled hostile retreat; #392/PR412 fixed the overlapping result panels.
Their detailed checkpoints and the earlier local #409 result are preserved in [history](CURRENT_PLAN_HISTORY.md#checkpoint-before-repeat-hunt-integration--2026-11-07).
Captivity #377, helper replacement and a player archive of battles remain separate features.
Next acceptance action: reproduce the first hostile escape through ordinary combat controls, then the already-working repeat continuation.
