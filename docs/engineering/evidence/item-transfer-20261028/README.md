# Player item transfer — finite local evidence

2026-10-28, branch `codex/game-item-transfer`, base `48d8a2ae`; LOCAL.
Contract: #171, existing property between accessible co-located containers,
with ownership preserved. Parent owns validation/resources/records/delivery;
one delegated editor owns the source. No merge/deployment/Orca permission.

## Real environment and provenance

Separate local API3198/realtime3199/web5198, response-loss proxy3200 and
Dex5588. Parent created the empty `warwrit_transferqa_20261028` database on
owned PostgreSQL32787 and applied the existing17 migrations. It is independent
of payroll, validation databases and the retained world lab. No reset or
synthetic canonical state/time grant was used.

The browser signed in through the normal Dex form as fixture player one and
created “Дорожная стража” with Яромир and Rell through ordinary onboarding.
Company `b70c3d8a-ebe4-485c-888b-d28e5bc48bf3` began with850 crowns/30 rations.
The proxy forwards the real command, waits for actual API success, then drops
that response; it records no authorization headers, cookies or session tokens.
Light day/night transitions in the captures are natural.

## Split, lost response, reload and exact retry

The initial unstyled form selected2 rations from party supply into Яромир's
pack: [before](01-before.jpg), [unknown](02-unknown.jpg),
[restored](03-restored.jpg). Native before/after-drop/after-retry.json preserve
all scoped snapshots, receipts and audit rows; dropped-command.json retains
the actual wire request/response. Command6d953e2b-0ac8-469f-a35b-1af9a03cab34
committed at revision2; its exact retry leaves the entire native readback equal
and retains one receipt for the command.

On this first command, normal elapsed-time settlement opened one ration for
each of the2 people:30 =26 in supply +2 moved +2 opened for food. foodCarry
records8 tick units for each member. This is legitimate food consumption, not
loss or creation by transfer. Later live stacks total28 and are conserved.
There is no newly invented transfer audit event: existing audit rows remain5.

## Current controls and full item movement

The initial white inline fields were replaced with stacked dark native controls
using existing UI colours and focus treatment. Current [day form](04-current-form-day.jpg),
[unknown at night](05-full-unknown-night.jpg), [restored at night](06-full-restored-night.jpg),
[confirmed at night](07-full-confirmed-night.jpg) and
[equal-height/native-pixel comparison](08-comparison.jpg) show the current UI.
The comparison is an HTML rendering of actual screenshots, without repainting.

The actual sword moved from Яромир's pack into Rell's; the owner and quantity
remain unchanged, and Rell's readback shows both swords. The successful response
was dropped, reload restored the exact request, and Retry cleared it.
full-before/full-after-drop/full-after-retry/full-dropped-command.json retain
the proof: after-drop and after-retry are entirely equal at revision3, with one
receipt for that transfer. These captures precede the later core split-ID fix;
full movement and the UI are unchanged by that fix.

## Repeated split defect and compatible correction

A source probe found legacy split IDs recursively embed the parent ID. With
ordinary UUID inputs they grow58→115→178→247→322; a fourth child fails the
existing256-character guard. No over-limit item is persisted, but repeated
inventory use is blocked.

Core TransferItem now accepts an optional validated splitItemId. Commands that
omit it retain the exact historical derived ID, preserving their replay.
The new V2 server producer supplies its already bounded commandId; the public
wire payload cannot supply internal access evidence or splitItemId. Child
creation, ownership, capacity, collision rejection and known-item observation
remain with the existing core owner. Whole moves and other split callers retain
their old behavior. No migration, snapshot-version rewrite or new economy rule.

Parent rebuilt core, restarted only its owned API and left the same database
and browser company intact. Actual final-source split6 into Rell used a
36-character child ID equal to its command ID. A real successful response was
dropped: [unknown](09-bounded-split-unknown.jpg); reload restored it at natural
night: [restored](10-bounded-restored-night.jpg). Actual Retry leaves the entire
bounded-after-drop/bounded-after-retry readback equal at revision4, one receipt.

The browser then split that child6→5→4→3 through three more actual transfers:
[confirmed fourth split](11-fourth-split-confirmed.jpg). fourth-after.json has
four new36-character IDs, quantities1/1/1/3, preserved company ownership and
28 total live rations. Canonical revision7, total receipts7/audit rows5.

## Verification and limits

- Earlier and final server/web typechecks PASS after fixing test-only dataset
  access syntax; game-core/testkit builds PASS.
- Final focused public physical regression2 PASS/5 filtered SKIP: six successive
  explicit child splits with canonical JSON reload, quantity/ownership and known
  snapshot assertions, collision atomicity and exact legacy derived ID.
- Final mounted hook3 PASS: unknown/reload/exact retry and stale revision/read
  races; independent affected-client review ACCEPT.
- Real dedicated PostgreSQL transfer regression1 PASS/11 filtered SKIP:
  inaccessible destination, foreign account, concurrent exact retry, persistence
  and changed-body conflict. Database `ww_integration_transfer_20261028` has the
  existing17 migrations; it is separate from the actual browser database.
- Independent initial server/protocol review found no confirmed defect; affected
  core/producer compatibility review ACCEPT. Reviewers ran no product tests.
- Scoped lint, final CSS/source formatting and diff checks PASS. The first core
  test command named the wrong directory and found no files; the corrected
  existing testkit path produced the2 actual passes above.
- Final normal hook/related checks/audit PASS with no bypass or hidden-test
  failure warning; independent final bounded visual ACCEPT is recorded below.
  Hosted clean verification remains pending PR publication. No full game,
  browser capacity/FPS or deployment acceptance.

This slice neither creates a stationary stash nor reduces aggregate carried mass.
New recruitment, healing, whole-scene map style/night lighting and unrelated
WebGL-loss diagnosis are outside this transfer boundary. The original map
renderer remains in use. Source and finite browser evidence are local; #171 and
the full game are not declared complete by this record.

## Final UI quality correction and actual readback

The first normal commit hook reached the unchanged audit and failed four
introduced web findings: panel complexity/unrendered coverage, nested submit
handling, response-parser coverage, and unrendered container labels. Inherited
server/core findings were excluded and not refactored. No gate was bypassed.

Panel shell/pending/form responsibilities now remain in one component file;
selection remains in its shell. Terminal settlement is a cohesive hook operation.
The first synthetic wrapper test became a real mounted panel journey through
item/count/destination controls, response loss, remount, mismatched response,
byte-identical retry and explicit capacity refusal. The two race regressions
remain. Public parser/storage cases protect matching terminal outcomes and scope.
Focused tests18 PASS; final web types/lint PASS after completing the test DTO
fixture. Independent affected-client source review ACCEPT. CSS/text are unchanged.

Parent repeated the actual final-source browser journey with1 medical unit:
[unknown](12-final-ui-unknown.jpg), [restored](13-final-ui-restored.jpg),
[confirmed](14-final-ui-confirmed.jpg). Real HTTP200 was dropped after commit;
reload retained the same request and actual Retry cleared it. final-ui-before,
final-ui-after-drop, final-ui-after-retry and final-ui-dropped-command.json retain
provenance. After-drop and after-retry scoped records are entirely equal:
revision8, total receipts8/audit rows5, one receipt for that command, unchanged
items/ownership/wallets and no second transfer. No synthetic time/state setup.

Independent absolute critic scored the bounded transfer controls at2 for all
applicable criteria, while whole-scene rendering/materials/night remain1 and
REJECT. The established form/journal hierarchy has optional polish remaining.
The same critic reopened references and12–14 for its second absolute pass:
bounded transfer UI ACCEPT, all six applicable criteria2; whole scene REJECT
(rendering/materials/night1). Full-game visual acceptance
is not inferred from this bounded UI result. A second hook closed three audit
findings and retained only submit cognitive17. A private failure-message helper
preserves the same sent/unsent wording and generation check; independent
affected-source ACCEPT, final web types/focused18/lint PASS. The final normal hook/related checks/audit PASS on this source, with no
suppressed-test-failure warning, bypass or threshold change. Final source was
committed as9dc7717e; the following closeout changes documentation only.
Hosted clean verification remains the publication gate.
