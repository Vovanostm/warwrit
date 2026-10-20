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
memory edit was made. Main push CI39449025408 subsequently completed SUCCESS.

## Trophy pickup refusal — 2026-10-20

The ordinary UI offered fixture-supply as the sole destination with101.5kg
free and enabled «Забрать трофей». PICKUP command
397edc72-0275-4d95-a273-b629f2e4a866 rejected409/CAPACITY, expected/current
public revision4. Native readback shows no partial pickup: proof remains
unclaimed on the ground; company revisions2, completed1, null bindings and
wallets/items remain unchanged. PRESENT and the planned process restart are
NOT_RUN. This is a retained failed journey, not payment acceptance.

Evidence is under .orca/persistent-hud-166/evaluator-prep/representative-postmerge/:
pickup-receipt.json, pickup-after.png and picked-up-native.json. The last
filename does not imply success. Read-only diagnosis compares offered container
space with canonical whole-party carrying capacity before assigning an owning
fix. The failed receipt and saved game remain intact; no reseed or direct state
repair was performed.

One pure replay of the existing prepareFirstHuntProofPickup on the retained
request/root also rejects CAPACITY. Native companies/proof remain equal. Each
party has3human carriers×30000g=90000g capacity,98500g shared supply plus
3personal packs×12100g=134800g current load; the1500g proof would raise that
to136300g. The initial combat fixture was already overloaded. Such retained
overload is valid state; canonical transfers may unload it but cannot increase
it. Both companies share this constraint. This establishes an admission-UI
mismatch, not a broken carrying rule: firstHuntPickupTargets considers only
container space. Diagnosis: pickup-diagnosis.json in the same directory.

Existing UI has no transfer/drop/discard/manual-consume action. Camp does not
consume provisions; travel would need at least93rations/31campaign days to
make room for the proof. No time acceleration, artificial capacity or direct
state repair is approved as evidence. The retained DB6 remains the failed
journey. A separate DB7 may start with a valid production-like ration stock
and repeat the real browser battle/payment/restart path from its own beginning.
Its fixture provenance and result will be recorded separately.

[Issue248](https://github.com/Vovanostm/warwrit/issues/248) owns the projection
correction: filter destinations through the same existing pure pickup preparer
used for commands. Keep canonical rejection and atomicity intact. Source writer
owns routes.ts and the real-PG boundary regression; implementation/review/checks
remain pending.

Independent frozen source/test review ACCEPT: GET uses the actual aggregate,
account, encounter and stored proof, discards the pure preparer's candidate,
and leaves POST locking/CAS/catch-up/persistence untouched. GET remains an
advisory snapshot; POST revalidates. The regression retains terminal settlement
assertions, omits overloaded owner supply, permits helper supply and asserts
409/CAPACITY without physical/proof mutation. Execution is still NOT_RUN.

### Pickup regression execution — first attempts

The isolated real-PG fail-before run reaches the intended assertion: old GET
still offers the overloaded fixture-supply. The first after run with coverage
and a subsequent ordinary after run fail earlier during terminal settlement
with PHYSICAL_CONSEQUENCE_EVIDENCE_MISSING, before testing pickup. Instrumentation
is therefore not established as the cause. Original terminal assertions and
cleanup remain; no passing after-run or regression acceptance is claimed.
Diagnosis must distinguish the changed supply fixture from a real terminal
defect. Logs: .orca/persistent-hud-166/pg-248/. DB6/DB7 were not used by these
isolated regressions.

A subsequent single ordinary diagnostic attempt passed1test/14filteredSKIP
(8.74s) and captured successful pre/post terminal state in
.orca/persistent-hud-166/pg-248/terminal-attempt.json. This proves the pickup
assertions can pass but does not explain two earlier terminal failures; one
of those normal attempts took63.58s. Bounded capture attempts seek the failing
state, not a passing seed. No settlement fix or stable full-gate PASS is claimed.

Independent source review confirms the test's timing is not deterministic:
its clock epoch is22.6s in the past, commands use trusted Date.now(), and
campaign ticks last21.6s. Failed coverage requests span58.18s and cross at
least2ticks; short successful snapshots stay at1001. Later ticks select the
food/AdvanceCampaign path, though the same generic residual can also come from
receipt consumption. The next bounded diagnostic explicitly advances the
existing test world clock after JOIN, preserves the seed/assertions and captures
the result. Cause remains unisolated; no capacity or settlement rule is changed.

The first explicit-clock diagnostic passed (55.41s), but every one of its61
command receipts and both preterminal aggregates still recorded tick1001.
It therefore did not exercise elapsed-tick evidence. Snapshot:
.orca/persistent-hud-166/pg-248/terminal-attempt-d970c292-f104-434b-ba14-d78b16afb751.json.
The post-JOIN clock update must be traced to the actual command boundary before
another diagnostic; no terminal fix or stable regression acceptance is claimed.

Source trace found the diagnostic offset error: the fixture root starts at1000,
but its initial clock already admits both companies at1001. Adding1to the
fixture root restored1001; the next diagnostic targets1002and checks that the
world clock exceeds admission before commands. The retained regression uses
bridge-v3, so any failure is scoped to that compatibility path until separately
verified for current bridge-v4. No further run has occurred at this checkpoint.

Canonical M1 supporting Notes now append the retained refusal, separate DB7
plan, unresolved terminal timing diagnosis and local range187 verification.
Fresh record read followed by exact readback PASS; all other fields, including
Purpose/status, are unchanged. Issue161 body readback also matches its update.
Empirical remains NOT_WRITTEN under the previously reported storage limit.

Correction after parent source inspection: the temporary clock setter was
inserted in the neighbouring loss test, while the focused victory test only
contained the later readback guard. The +2attempt failed that guard at1001
because it never executed the setter. This is a diagnostic harness placement
error, not evidence of a production clock defect or mismatched origin. Remove
the temporary edit from the loss test and put the advance after both JOINs in
the targeted victory test, using its persisted clock/admission. Earlier passing
diagnostics did not exercise the intended elapsed-tick path.

The corrected targeted diagnostic reproduced the terminal failure at the
intended elapsed boundary: admission/root tick1001, all61commands tick1002.
Snapshot: .orca/persistent-hud-166/pg-248/terminal-attempt-d3f4a615-b794-4bc4-89ad-6bc44d877778.json.
Independent review confirms the rejected helper has197rations in STATIC
fixture-supply, with no qualifying carried food. prepareEncounterFoodFacts
rejects before receipt consumption; the existing food regression explicitly
rejects stocked STATIC containers. This is a test-fixture precondition failure,
not a reproduced production food-policy defect.

The correction preserves the original same-lifecycle-revision assertion with
a deterministic scoped clock and separately checks elapsed time using30actual
rations in the helper's PARTY_SUPPLY, including matching item snapshots. Both
cases still execute real HTTP/PG gameplay. Temporary capture instrumentation
is removed from tracked tests; captured failures remain. Focused checks and
independent final-diff review are in progress. No carrying or food policy changes.

### Retained DB6 resource recovery — 2026-10-20

After the host/Docker interruption, the original disposable container and its
listeners were absent. Retained JSON snapshots were evidence exports, not a full
database backup. The surviving anonymous volume
071d8af7eae13022517d69fd9294de14f7ce1e40f7d777c7cb476c57aa080207
was inspected through a read-only mount: PostgreSQL17, cluster identifier
7698701893570277410, interrupted running-cluster metadata. The evaluator copied
it to the separate durable volume bridge166-db6-recovery-20261020 and started
only that clone with the existing image, no network or published ports. WAL
recovery completed. The original volume was never started or modified.

Native clone readback matches retained picked-up-native.json for the encounter,
admission,40commands/receipts,two companies,ten company receipts,one proof,
three contracts,world-hunt state and original account/ownership identities.
Timestamp,bytea and bigint driver representations were normalized for comparison.
Encounter07d09d99-8f62-40da-8ae0-effabd7eba00 remains resolved at revision40.
This proves recovery identity, not successful pickup/payment or browser recovery.
No gameplay, reseed or session renewal ran on the clone.

### Final regression correction — 2026-10-20

The first elapsed-food assertion incorrectly required another whole ration debit.
The actual after-JOIN boundary is27rations and three membership carries1; one
additional tick should retain27rations and advance each carry to2. No food rule
was changed. Both earlier focused cases passed with a weaker carry oracle.
The final exact-oracle run passed the lifecycle-equality case but failed before
reading terminal food: the explicit pending-effects call returned an empty list.
Coverage was NOT_RUN in that attempt. The initial background-worker explanation was rejected on source readback:
this fixture does not pass encounterRealtime and therefore does not start that
worker. An empty batch also occurs when terminal settlement waits for a lawful
leadership choice; the neighbouring integration test handles this explicitly.
The failed run's actual pending reason was NOT_MEASURED because finally cleanup
removed its rows. Diagnosis and exact persisted-state assertions remain required;
no final corrected PASS or production defect is established.

Independent final-source review ACCEPT after reusing the existing real leadership
GET/POST flow only when effects remain pending. Settlement must then persist the
applied marker, released binding/completion once, three helper carries1→2,
rations27→27, root at admission+1 and one terminal receipt. A subsequent scan
must omit the encounter and preserve physical state. Missing settlement still
fails. This replaces the unsupported worker-race explanation; the earlier failed
run's exact cause remains NOT_MEASURED. Final focused coverage is running.
Recovery detail: .orca/persistent-hud-166/evaluator-prep/recovery-20261020/RESULT.md.

### Coverage invocation correction — 2026-10-21

The first final coverage invocation incorrectly inserted an extra `--` before
the file/filter, leaving the intended focus unproven. It was interrupted; no
result is attributed to it. The corrected direct Vitest coverage invocation
finished in85.31s: elapsed-food PASS with exact persisted assertions, equality
case FAIL during fixture setup on duplicate world_campaign_clocks primary key,
14filteredSKIP. The fixed test-world residue is being inspected/cleaned only in
the owned disposable test database before one corrected clean-environment run.
Neither attempt used retained DB6 or prepared DB7.

Final clean-environment focused coverage on2026-10-21: **2PASS/14filteredSKIP**,
117.37s. Exact three carries1→2, rations27→27, release/completion, one receipt
and unchanged physical retry all passed. Scoped interrupted-fixture residue was
removed transactionally and verified absent in the owned test DB; retained
DB6/DB7 untouched. [Final checks](pickup-248-checks.md) and
[independent source review](pickup-248-review.md). Normal commit audit, integrated
validator, current-source browser evaluation, hosted CI and merge remain pending.

Source frozen as f439db7fed3e39b7f7d22633800f8592f7f299cc; normal audit PASS
with8inherited findings excluded and reported semantic-attribution fallback.
Independent exact-source stamp ACCEPT. Clean parent validator EXIT0,8/8steps
PASS,41relatedPASS/31SKIP. The two focused real-PG cases above remain separate
executed evidence. Evaluator now owns the exclusive runtime window for recovered
DB6 target readback and a distinct lawful DB7 payment/restart journey; these
checks are not yet passed. No published pickup PR or merge yet.

Independent saved-state evaluation **ACCEPT** on f439db7: both recovered DB6
accounts expose no impossible pickup destination/button,0POST; all11canonical
collections unchanged through auth renewal/reloads. Clean live card captures
replace the earlier post-shutdown fetch-error framing; both attempts retain
accurate attribution. [Runtime report](pickup-248-runtime.md). DB7 remains
unstarted until actual-main integration. Hosted CI/publication/merge pending.

### Range integration and publication boundary — 2026-10-21

Merged actual mainb0eeb8e8 (PR250) into pickup branch as c5acd803. Only additive
CHANGELOG/CURRENT_PLAN sections conflicted; both histories retained. Production
and regression sources exactly match accepted f439db7. Normal merge auditPASS;
clean union validator EXIT0,8/8PASS,41relatedPASS/31SKIP. Focused real-PG2PASS
and recovered-save runtime ACCEPT remain attributed to the unchanged source.
Logs: .orca/persistent-hud-166/pg-248/union-validation.log and integration-commit.log.
Airtable supporting M1 Notes appended/read back exactly after range delivery;
other fields unchanged. Issue161 and PR250 exact native readbackPASS. Empirical
remains storage-blocked/NOT_WRITTEN. Pickup publication/hosted CI/merge follow;
DB7 remains unstarted and full174/177/M1 partial.
