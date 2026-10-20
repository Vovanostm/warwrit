# Persistent HUD delivery readback — 2026-10-20

[PR247](https://github.com/Vovanostm/warwrit/pull/247) merged at15:30:19UTC as
`7a7f1f1841958ebe74a4c9cc632a6a5ea88fb61d`. Owner mission: “Implement, review, merge.”
Reviewed head `662d67626f43bc0c55853f9bf80343f8b04879f5`; tested synthetic merge
`0ef9c13634fa684e5ed988ab05a649afec7a7360`. Ordinary diffs confirm identical
contents among reviewed, hosted and actual merged commits. Native PR/main/issue
readback confirms MERGED, main7a7f1f18 and #166 CLOSED/agent:done. No unresolved
review thread or blocking label existed before the expected-head merge.

## Checks and acceptance

- Independent source review, actual two-company playable review and absolute
  visual critique ACCEPT. Every applicable rubric criterion2, motion N/A.
- Final clean coordinator validator8/8,252PASS/49SKIP; normal hooks/audit PASS.
- [CI39446960412](https://github.com/Vovanostm/warwrit/actions/runs/39446960412),
  job118711312428 SUCCESS:932unitPASS/49SKIP,10000combat stress with20reruns and
  100replay checks; real PostgreSQL/auth16PASS, ordered migration smoke/up,
  measured coverage and changed-code audit PASS. No migration was added.
- First hosted failure39442491652 found unused legacy art exports; only the dead
  block/imports were removed. Next failure39444350305 found stale integration
  expectations. Strict public HTTP/room expectations were corrected without
  weakening privacy/reconnect/reload checks; isolated PG17 failed before and
  passed2tests/13filteredSKIP after. Intermediate1PASS/1FAIL remains recorded.

Raw logs remain under .orca/persistent-hud-166/ in the owning persistent worktree:
ci-failure.log, ci-cleanup.log, ci-final.log, integrated-pg-shape.log and
pg-shape-before/after/final.log. Full behavior, journeys and failed passes are
in the [owning record](README.md).

## Actual-main continuation

The same isolated checkout switched cleanly to actual main7a7f1f18 and then to
`codex/representative-hunt-recovery`, with unchanged production contents.
Retained DB6 wolf battle07d09d99-8f62-40da-8ae0-effabd7eba00 ended in company
victory40 with one proof. Native actual-main readback preserves revision40,
29accountcommands (40total commands), both original company identities, null
active bindings/completed1 and one unclaimed/unredeemed proof. The parent read
back the native encounter/proof snapshot at
.orca/persistent-hud-166/evaluator-prep/representative-postmerge/main-before-native.json.

Ordinary owner/helper reload returned login: the synthetic60-minute sessions
expired at15:25:54UTC during CI. This is a fixture-expiry failure, not a proven
HUD/game defect or browser-restoration PASS. Only those same two disposable
accounts may receive fresh sessions through the existing auth helper; canonical
world/company/encounter/proof state must remain unchanged. After renewal, ordinary owner/helper reload restores the same companies and
world UI. Native before/after equality confirms every captured canonical table
unchanged; only2fresh session rows for those same accounts were inserted and
old expired rows retained. The parent inspected main-renewed-owner.png. This is
synthetic fixture restoration PASS, not external sign-in or expired-session
recovery evidence. Pickup/payment/process restart remains pending. Login capture:
.orca/persistent-hud-166/evaluator-prep/representative-postmerge/main-owner-boundary.png.

This uses synthetic local identities and starting company fixtures. Actual
ACCEPT/HELP/JOIN, accepted battle commands, terminal effects and proof creation
were played through the normal interface; external OIDC, company creation and
travel were not newly proven. The approved representative continuation does not
close the full #174 recovery matrix or #177 eight-contract/owner acceptance.
Unmapped abilities, rescue/transport, unsupported surrender and acknowledged
terminal history retain their documented gaps. No deployment or capacity claim.

## Checkpoint closeout

Canonical supporting M1 Airtable Notes append the merged result and explicit
fixture-expiry/next-proof boundary; exact native readback matches, all other
fields including Purpose/status are unchanged. Issue161 body was updated to
mark166delivered and retain the partial sprint. Empirical checkpoint NOT_WRITTEN:
the read again reports its existing storage limit; no retry/purchase or personal
memory edit was made. Main push CI39449025408 remains pending at this checkpoint.
