# Playable payroll: finite browser and PostgreSQL evidence

2026-10-28, `codex/game-payroll`, base `48d8a2ae`; LOCAL, uncommitted.
Contracts: #167, #320, #322. Parent owns runtime/evidence/delivery; source author
owns the payroll delta. No merge, deployment or paid provisioning permission.

## Actual provenance

The two accounts originally signed in through the ordinary local Dex form and
created their companies through the app. The original owned `warwrit` database
was dumped and restored into a separate disposable `warwrit_payrollqa_20261028_b1`
database on the owned PostgreSQL32787. The original database and other retained
labs were not reset or modified by the fixture.

The selected existing company is `Вторая проверка`. A QA-only canonical
`AdvanceCampaign` command advanced it from tick83 to tick2000, with normal food
facts and repository atomic persistence/receipt. Claims, rates, cash and paid
amounts were not directly edited. The clone clock was anchored to wall time at
2000: this is synthetic time preparation, not twelve real hours of gameplay.
An initial dry run failed on a fixture-only wrong status field; the helper was
corrected to the actual lifecycle.company.runStatus, dry-run passed, then applied.
[Native fixture result](earned-fixture-b1.json).

## DEFAULT, committed-response loss, reload and exact retry

Owned services: Dex5578, API3188/realtime3189/web5188 and loopback proxy3190.
The proxy lets the real API complete and receive HTTP200, then destroys that
response before browser delivery; it records no cookies or authorization headers.

1. Company panel showed850 crowns, Rell50 crowns and19.17 due across two earned
   claims: [before](01-before.jpg), [native state](b1-before.json).
2. Actual UI “Выплатить по очереди” submitted command
   `703f3976-daa1-48a0-a6e8-944c3d9b766f`, DEFAULT,19170000Q. The real API
   committed successfully; its response was dropped. UI retained the attempt:
   [unknown](02-unknown.jpg), [native request/response](b1-dropped-command.json).
3. PostgreSQL showed company830.83, Rell69.17, both due claims paid, canonical
   revision4. A new not-yet-due0.10 claim was legitimately earned from2000–2010;
   it was not included in the payment: [after drop](b1-after-drop.json).
4. Normal page reload and Company navigation restored the pending19.17 request
   while authoritative cash/history already showed payment: [restored](03-restored.jpg).
5. Actual UI “Повторить эту же выплату” returned success and removed pending:
   [retried](04-retried.jpg). Native readback retains exactly one receipt for
   that command, one CompanyPayrollPaid event, the same success response and
   revision4. All claims and wallets equal the after-drop state, proving no
   second payout: [after retry](b1-after-retry.json).

## Source and acceptance limits

The corrected initial server/web source received independent source ACCEPT.
Earlier author checks: payroll-access32, mounted5, real isolated PG routes2,
protocol build, server/web types and scoped lint/format PASS. A later fresh
coverage run passed1220 tests with84 skipped, including the PG cases in that
unit-only invocation; the earlier real PG checks remain separately attributed.
Normal audit initially FAILED introduced parsing/readback/payment complexity,
a small guard clone and selector findings. Cohesive parsing/readback functions,
one shared server record/key guard and component-owned payroll CSS corrected
the delta. Fresh combined realPG/focused coverage7 files/47 tests, server/web
types, lint/format/diff and normal audit PASS. Independent final server/client
source reviews ACCEPT. A final hook-only fix keeps a confirmed-payment message
after failed readback; its mounted7 tests/types/lint/format/audit PASS and
independent affected-source ACCEPT. No server code changed for that last fix.
The normal commit hook will refresh measured coverage against retained isolated
validation DB c1; no bypass, ignore or threshold reduction occurred.

The recorded browser journey is against the pre-quality-refactor source. Affected
source/readback and independent playable/visual critique are still required.
Current-source TARGETED journey is being recorded separately below. Real external
identity, real elapsed campaign timing,
full-game journey, target performance and full day/night visual acceptance are
NOT_RUN / NOT_MEASURED as applicable. The map initially showed its existing generic
initialization alert; reload restored rendering. Its cause remains unknown and
this payroll delta does not claim a renderer fix. Screenshots include that failure.

## Current-source TARGETED, lost response and night retry

After the quality correction and final message-boundary source ACCEPT, a second
independent restore `warwrit_payrollqa_20261028_b2` used the same original dump.
Its same normally-created company began again with850 crowns/Rell50; this is a
separate clone, not a money grant or rollback of the DEFAULT company's outcome.
Canonical AdvanceCampaign prepared one due9.17 claim at tick1000:
[fixture](earned-fixture-b2.json), [before](b2-before.json).

1. Normal browser reload → Company showed both DEFAULT and the named Rell
   action: [current source before](05-targeted-before.jpg).
2. Actual named payee button sent TARGETED command
   `a31ec477-bd1e-4947-8584-78661bb973bb`,9170000Q, Rell payee ID. Real successful
   HTTP200 was dropped after commit: [unknown](06-targeted-unknown.jpg),
   [request/response](b2-dropped-command.json).
3. SQL showed840.83 company /59.17 Rell, revision4, due claim paid, plus0.57
   legitimately accrued for the next day: [after drop](b2-after-drop.json).
4. Reload → Company restored the same pending9.17 action alongside the current
   authoritative balances/history: [day](07-targeted-restored-day.jpg). The same
   supported view was observed through the natural Light-clock night transition:
   [night](08-targeted-restored-night.jpg). No clock or image lighting was changed
   for this transition.
5. Actual Retry at night succeeded and removed pending: [result](09-targeted-retried-night.jpg).
   [Native final readback](b2-after-retry.json) retains exactly one receipt/event,
   TARGETED mode, revision4 and identical claims/wallets to the after-drop state.
   There is no second payout.

[Equal-height scene/native-pixel UI comparison](comparison.jpg) places existing
ordinary-contract retry controls beside current payroll controls. It is a native
browser capture of an HTML comparison, not repainted game evidence. No new art
was produced. Independent scored visual/playable critique is pending; these
frames do not establish full game, battle, performance or retention acceptance.

## Independent first visual critique and remaining rework

Independent native-role payroll_visual_critic opened the references, comparison
and all first-pass frames before reading financial conclusions. Bounded payroll
presentation REJECT: pending identity/retry1 and financial-history readability1;
input2, payroll control rendering2 and props/lore2. Material UI findings: pending
TARGETED/DEFAULT did not retain human mode/recipient context, and repeated payee
claim rows lacked a deadline/period label. Author is correcting these in the
existing presentation path, using the server-provided calendar rather than an
invented earned period or duplicated ticks-per-day rule. A same-critic re-pass
is required on current images.

The critic separately reported whole-scene integration0 for the earlier black
map, value/palette1 for weak day/night difference and terrain rendering1 against
the selected broad-wash references. Root cause/stability remain unresolved; this
slice does not accept the whole map. Owner policy preserves existing assets and
sets the new2D direction for new art; no new terrain image was produced here.
Native financial evidence readback was credible, but it did not offset visual
REJECT or establish the critic's own operated journey.

## Final presentation and current-source TARGETED proof

The final UI retains amount, human payment mode and targeted recipient in pending,
unknown and confirmation messages through one formatter. Each claim shows its
actual due day/tick using the server-provided ticksPerDay; dueAt1000 with1000
ticks/day is Day2/tick0. Independent affected-client source ACCEPT and mounted8,
web types/lint/format/audit PASS precede the current images.

The retained b2 clone continued from its paid9.17 claim. Another canonical
AdvanceCampaign earned the next10kr to tick2000; the clone clock was re-anchored
as explicit synthetic QA time: [fixture](earned-fixture-b2-final-ui.json).
It did not reset the company, its earlier receipts or wallets.

1. [Current before](10-payroll-final-before.jpg) and [native before](b2-final-ui-before.json)
   show840.83 company/59.17 Rell,10 due with its deadline.
2. Actual named-recipient action sent TARGETED command
   `8f8ba23f-1ac0-4e31-8827-7a1f6009cd5f`,10000000Q to Rell. Real HTTP200 was
   dropped after commit: [unknown](11-payroll-final-unknown.jpg),
   [request/response](b2-final-ui-dropped-command.json).
3. Ordinary reload restored the same named10kr request while the authoritative
   book showed paid10 and new not-yet-due0.09: [restored](12-payroll-final-restored.jpg).
4. Actual same-request Retry returned the original success and confirmation:
   [confirmed](13-payroll-final-confirmed.jpg). [After drop](b2-final-ui-after-drop.json)
   and [after retry](b2-final-ui-after-retry.json) are equal in the whole scoped
   readback: revision7, one receipt/event, same response, wallets and claims.
   Company840.83→830.83/Rell59.17→69.17; retry debits nothing again.
5. [Current equal-scale/native-close comparison](14-payroll-final-comparison.jpg)
   uses actual reference and candidate captures. [Natural night](15-payroll-final-night.jpg)
   shows the final confirmation and dated history without a light-clock edit
   for that transition. This is not a pending-at-night replay.

Initial browser observation failed because its control session was stale;
reinitializing that control session recovered the existing tab. The game services
and database were not restarted or reset for this environment correction.

The same independent visual critic reopened the references and all current
images before reading the native conclusions. Second absolute pass **ACCEPT
for bounded payroll controls**: rendering2, value/palette2, props/lore2,
scene integration2, history2, pending identity/retry2, unobstructed input2;
character/material/motion N/A. First-pass missing identity/deadline defects
are closed. The critic independently read the finite native records but did
not operate the browser/database.

Whole-scene/game acceptance remains separate: inherited terrain rendering1,
weak day/night distinction1 and the earlier unresolved WebGL failure. Those
broader visual findings require a technique change for whole-scene acceptance;
this slice created no terrain art and claims no renderer fix. Optional claim
ordering and repeated-message hierarchy polish are not payroll blockers.
External identity, genuine elapsed campaign time, full game, performance and
retention remain NOT_RUN/NOT_MEASURED. Normal commit hook and hosted CI follow.

## Refusal message lifecycle and real conflicting-request race

An additional actual browser refusal found a material defect before publication:
after a QA canonical advance changed the company's revision, the visible old
DEFAULT request was refused safely and fresh debt appeared, but its explanation
was erased by the revision-triggered hook effect: [initial gap](16-payroll-refusal-message-gap.jpg).
[Before](b2-refusal-before.json)/[after](b2-refusal-after.json) retain identical
claims, wallets, revisions and receipt/audit counts. The QA-only advances and
their synthetic-time anchors are recorded as earned-fixture-b2-refusal-*.json.

The final hook distinguishes an account/company change from a revision refresh:
terminal messages survive same-scope updates and a subsequent readback failure;
another account/company clears them. Existing generation/pending/freshness guards
remain. The mounted insufficient-funds case now includes the parent revision
rerender; mounted8, web types/lint PASS and independent affected-source ACCEPT.
An intermediate HMR observation remained ambiguous; a clean reload of the latest
served code was used for the decisive rerun, without further product changes.

After that clean reload, visible DEFAULT30 was made stale by another canonical
advance. Actual click retains the explanation and refreshes the due amount40:
[current refusal](17-payroll-refusal-preserved.jpg).
[Before](b2-refusal-clean-before.json)/[after](b2-refusal-clean-after.json) are
identical across the scoped native readback: revision11, receipt count9 and
audit count9, unchanged claims/wallets. No payment or refusal receipt was added.

The PG route scenario additionally submits one fresh same-ID/different-body
TARGETED race for the still-unpaid worker1, with1Q and2Q amounts. Exactly one
200 and one409 IDEMPOTENCY_CONFLICT; the stored winner receipt/event and exact
wallet/claim deltas match once; winner retries preserve root/audit. Initial
test draft targeted already-paid worker0; parent caught and author corrected it
before execution. The original historical replay still uses post-race state.
Independent affected-test SOURCE ACCEPT. Parent real isolated-c1 PostgreSQL
routes file2 PASS; intentional injected500 rollback remains expected test output.

## Final-source DEFAULT40, natural night and exact retry

On the continued b2 QA clone, the final clean-reloaded code offered40kr due
after the explicit synthetic advances used for refusal testing. Actual DEFAULT
command `32ae6f69-fa2c-4b02-a0f2-c746855d2813` sent40000000Q, with no payee.
The proxy dropped its real successful HTTP200 after commit:
[current unknown](18-payroll-default-final-unknown.jpg),
[request/response](b2-default-final-dropped-command.json).

Reload restored the same40kr/“по очереди” attempt against authoritative paid
balances: [restored](19-payroll-default-final-restored.jpg).
The existing attempt remained through natural Light transition:
[night pending](20-payroll-default-final-night-pending.jpg), then actual Retry
cleared it and named the recorded DEFAULT40 payment:
[night confirmation](21-payroll-default-final-night-confirmed.jpg).
[Final native comparison](22-payroll-final-night-comparison.jpg) uses the current
night pending frame at equal game height and original-pixel close scale.

[Before](b2-default-final-before.json), [after drop](b2-default-final-after-drop.json)
and [after retry](b2-default-final-after-retry.json):830.83→790.83 company /
69.17→109.17 Rell; after-drop and retry readbacks equal, revision13, one receipt,
one CompanyPayrollPaid event and same claims/response. A legitimately earned
not-yet-due0.06 remains for Day8. No additional payout on retry. No light-clock
change occurred between these current day/night frames; the earlier fixture
re-anchoring remains explicit synthetic-time provenance. Final same-critic
absolute acceptance readback follows; full game remains outside this slice.

The same critic's third absolute pass inspected17–22 and reopened references:
bounded payroll **ACCEPT**, all eight applicable criteria2 (including refusal
feedback), character/material/motion N/A. Current final-source pending and
confirmation are both shown at night. The critic read native records after
scoring; whole-scene/game REJECT remains separate. Optional subdued refusal
styling/claim grouping are polish, not material payroll defects.

## Final related-check environment and deterministic test correction

The first normal commit hook completed its audit but printed that its hidden
related tests failed. Parent reran that exact related coverage scope with visible
logs:456 PASS/1 FAIL/21 SKIP. The failure was the pre-existing pursuit rollback
test requiring a genuinely isolated `ww_integration_` database prefix, whereas
the assigned c1 validation database had a different name. No safety guard was
changed. Parent created a new empty owned `ww_integration_payroll_20261028`,
applied the existing17 migrations and retained the original c1 database.

The same related run on that database exposed a distinct existing world-route
assertion: the8 unchanged audit records arrived in a different SQL row order.
The owning test helper now orders its event query by unique event_id. All
state/route/receipt/event comparisons remain intact. Independent test-source
ACCEPT; the exact previously failing itinerary regression PASS1/13 filtered SKIP.
No production behavior changed. Final normal hook uses the full source scope and
the isolated-prefix database: **PASS**, including related tests and normal audit;
no suppressed test-failure warning on this final attempt, no bypass or threshold
change. This is the final committed production source; subsequent record edits
are documentation only. Hosted clean verification remains the publication gate.
Detailed diagnostic logs remain under local ignored output/playwright/game-payroll-runtime/.
