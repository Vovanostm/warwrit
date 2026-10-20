# PR241 integration correction review — 2026-10-20

**VERDICT: ACCEPT 0fa34edc6376bf43a15436d8d012a689a2cc36d6**

Independent narrow source re-review of R1 from review-main-integration.md.
Reviewed committed HEAD above, direct parent
`fbe225a3a3b131651744d23377b9338875387410`; index/working tree clean.
Compared the complete fbe225a..HEAD diff: three files, 32 insertions/3 deletions;
only code change is the PostgreSQL test assertion. Other changes are additive
CHANGELOG/CURRENT_PLAN records. Production, migrations and replay rules unchanged.
Prior integration review's production assessment is reused across this boundary;
its REWORK remains the correct historical verdict for fbe225a.

## R1 closed without weakening evidence

`apps/server/src/encounters/postgres.integration.test.ts:2881–2892` replaces
the obsolete six-key count with exact sorted equality for every public unit:
health, id, maximumHealth, q, r, sideId, status. This is the smallest owning fix.
It accepts the canonical HP field while rejecting every extra private field,
including capabilities; it does not merely increase a permissive field count.

The ordinary diff contains no other test change. Direct context readback confirms
the explicit capability exclusion, foreign-account rejection, actor ownership/
wait assertions, nine admitted units, fists/immobility and replay verification
remain. Subsequent saved binding membership, active encounter lookup, new app
instance, original JOIN receipt retry and exact persisted revision/state/setup
equality remain. No skip, timeout increase, helper substitute or removed durable
assertion was introduced. No material finding remains in this correction.

## Parent-executed proof and attribution

- Read main-db-before.log: named mixed unarmed JOIN/reload test FAIL at the old
  :2881 six-field assertion, expected true/received false; 13 filtered SKIP.
  This executes the exact counterexample identified by the initial source review.
- Read main-db-after.log: same named test PASS1/13 filtered SKIP, 671ms test time.
  The remaining reload/retry/state assertions are now reached and pass.
- Read main-db-correction-commit.log: normal audit gate reports no issues in
  52 changed files, excluding 61 inherited findings, followed by commit0fa34ed.
  Preserve its warning: base/head semantic identities differed, so attribution
  used syntactic comparison with head refinement. No stronger audit claim made.
- Parent reports server typecheck/lint PASS and pre-correction integrated
  validator EXIT0/8of8 at fbe225a (784 PASS/48 SKIP). That validator is not a new
  post-correction full run. Parent reports removal of its disposable
  profile164-maincheck-20261020-0515 database environment only; not inspected here.

All execution above belongs to the parent; reviewer performed source/log readback
only. Tests/builds/browser/DB/services/heavy checks: **NOT_RUN by reviewer**.

## Unchanged limits

Critical-bleed attack/defence remains **PENDING_OWNER**, confirmed in the current
classification decision. Existing permissive classification is not approved.
Rescue/transport remains excluded. This ACCEPT covers integration and the R1
correction only, not full #164, payment, terminal-browser, visual or full-game
acceptance; it grants no publication, merge or deployment permission.

Producer/reader rollout constraint remains: new readers accept absent maximum
as unknown; old strict six-field readers reject a new producer's seventh key.
Coordinate producer/new-reader rollout and account for existing clients.

Only this report written; no agents, Orca calls or Git mutations. Parent owns
shared documentation/status closeout and subsequent delivery. Later source
changes require affected review; this verdict names only the committed HEAD above.
