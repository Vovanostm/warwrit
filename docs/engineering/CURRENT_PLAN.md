# Warwrit current delivery plan

## WLC-03 combat assets and atlas consolidation — 2026-11-07

Coordinator/writer: codex/wlc-03-assets, .claude/worktrees/wlc-03.
Base origin/main79a6ba02 includes WLC-01/PR419. Owner authorizes implementation,
review, PR and merge for this mission; no deployment or real-save mutation.
[Scope, player journey, archive and results](COMBAT_ASSET_CONSOLIDATION.md).
Status: LOCAL implementation checked; external archive restored;40focused +11PG
checks, production build and ordinary map journey PASS. Independent diff review
passed; scoped visual critique pending. CI NOT_RUN/advisory. Preserve other checkouts and WLC-02.

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
