# PR241 main integration review — 2026-10-20

**VERDICT: REWORK fbe225a3a3b131651744d23377b9338875387410**

Independent source-only integration review, not full #164 acceptance or policy approval.
Reviewed committed merge HEAD, not a staged candidate: first parent
`795c84230ace5b5d288bd936b32310cf55d3d5b5`, second parent actual main
`3c934c164838dcef492d070c57c017fff10141f8`. Initial index/working tree were clean.
Compared ordinary diffs against each parent and the combined test resolution.
No material production integration defect found; one remaining test incompatibility blocks ACCEPT.

## R1 — P2: mixed-company DB regression still requires six public fields

- Source: `apps/server/src/encounters/postgres.integration.test.ts:2881–2883`.
  Contract requires public capability exclusion while preserving canonical HP.
- Concrete counterexample: run “admits a mixed unarmed company through real JOIN
  and reloads the durable replay” with PostgreSQL configured. Its successful JOIN
  creates nine units (:2871); authenticated `readEncounterAccess` calls the merged
  projector. `access.ts:69–76` returns exactly seven keys for every unit:
  health, id, maximumHealth, q, r, sideId, status. Consequently the test's
  `every(...length === 6)` evaluates false, but expects true.
- This is a deterministic source-level contradiction, **not an executed DB failure**.
  Profile parent retained the six-key expectation; main added maximumHealth.
  Their automatic merge preserves both incompatible pieces. The analogous manual
  correction in access.test.ts did not reach this second assertion.
- Smallest fix: replace this count with the exact sorted seven-field allowlist
  already used in `access.test.ts:128–138`. Retain the explicit capabilities
  exclusion, foreign-account rejection, private grant assertions and subsequent
  reload/JOIN retry/state equality checks. Do not remove maximumHealth or relax
  public privacy. Parent should run this named real-DB regression after correction.
- Impact: the profile admission/reload DB regression cannot pass and never reaches
  its later checks on this integrated head. No production rule defect is inferred.

## Preserved integration boundaries

- `access.ts`: relative to profile parent, only canonical
  `maximumHealth: unit.attributes.health` is added. Relative to main, the private
  grant adds actor actions only for bridge-v3, an existing activation and an owned
  actor with capabilities. Revision/activation binding and authenticated access
  remain; public units contain no raw capability, equipment, condition or RNG data.
- `EncounterPanel.tsx`: HP labels retain current/canonical maximum or explicit
  unknown text in roster and target options. Private condition restrictions still
  gate attack/move/defend/retreat controls and fresh submissions; existing grant,
  revision, selection and retry boundaries are preserved.
- `renderer/projection.ts`: public unit parsing/room copying retain optional
  maximum normalization, cap-only updates and known/unknown transitions. Private
  actor-action parsing, permitted-intent validation and actor/activation matching
  coexist without entering the public unit shape. `protocol/encounter.ts` retains
  both separate optional contracts: public maximumHealth and private actorActions.
- `access.test.ts`: the manual seven-field correction is valid and stronger than
  a count; it excludes capabilities and every other extra key. Main's damaged
  current20/initial40/cap60 assertions and profile's owned/foreign/legacy grant
  cases all survive. This correction is accepted within the REWORK verdict.
- DB parent diffs preserve main's corrected stock-cap70 real HTTP/two-client/
  reconnect/application-reopen/replay test, with sole real AI worker and lawful
  human checkpoint/deadline. Profile's separate mixed JOIN/replay/private-access/
  reload/retry test and default unmixed fixtures remain, subject to R1.
- `d3975cf..795c842` has no apps/packages delta. Merge adds no game-core change,
  nor changes to admission, encounter/contract execution or terminal evidence
  relative to profile parent. Room/schema/scene and both picker source/test files
  equal main parent. No new production rule, replay format or migration change.

## Reused evidence, rollout and limits

Read AGENTS, warwrit-review, full local profile contract/classification, tracked
profile review4/eval3, HP review1/review2/README and picker CI-correction review.
Reuse their unchanged boundaries only; prior journeys keep their recorded heads.
Graph inventory has no index rooted at this checkout; direct local source used.

Parent logs retain initial access.test.ts:130 FAIL (783 PASS/48 SKIP), corrected
related coverage 784 PASS/48 SKIP, and normal merge audit/commit completion at
fbe225a3. Focused corrected test/lint PASS is parent-reported. These checks do
not establish execution of R1's DB case. Earlier stale/missing-coverage hook
failures remain historical failures; this review neither bypasses nor reruns hooks.

Producer/reader rollout constraint is unchanged: new readers accept omitted
maximumHealth as unknown; pre-HP strict six-field readers reject a new producer's
seventh key. Coordinate producer/new-reader rollout and account for old clients;
optional DTO syntax alone does not make that pairing compatible.

Critical-bleed attack/defence remains **PENDING_OWNER**; existing permissive
classification is not approved here. Approved fists remain range1/base6/2AP/
8stamina/no penetration/no weapon XP; immobility denies move/independent retreat.
Rescue/transport excluded. No payment, terminal-browser, visual/full-game,
publication, deployment or merge acceptance/authorization is supplied.

Reviewer tests/builds/browser/DB/services/heavy checks: **NOT_RUN**.
Only this report written; no agents, Orca calls or Git mutations. Parent owns
source correction, checks, shared docs/changelog and publication. Update the
integration checkpoint with this R1 and actual committed head; retain policy gaps.
