VERDICT: ACCEPT STAGED_DELTA_ba9b146

Independent read-only source review for #164, 2026-10-20. Base HEAD is
`ba9b1462330668a888d1e1655db6c11f54b590ee`. Reviewed exactly
`git diff HEAD -- packages/game-core/src/company/combat-practice.ts packages/testkit/src/company-combat-physical.spec.test.ts`:
267 insertions / 33 deletions across those two paths. Main `eb98dd2` integration,
other source and additive shared-document conflict resolutions are outside this
verdict. No material finding remains in the reviewed delta; no further source fix
is requested. This is source acceptance of the cohesive correction, not whole
#164 acceptance or permission to merge.

## Confirmed correction and preserved rules

- `packages/game-core/src/company/combat-practice.ts:202–248` now validates the
  actual attack event, actor/target and opposing side, then retains leadership
  evidence **before** the null-skill skip at line 239. That skip now excludes only
  the weapon action start. Defend starts still precede attack qualification
  (:213–220). No fists weapon start is introduced.
- Both consumers independently retain authentic attack facts before weapon-credit
  qualification (:346–405 and :809–867). Facts use the attack event's exact index
  into `receipt.sourceEventIds`, bound character IDs, the existing defender
  character/world-unit fallback and the actual receipt ordinal. They require an
  owning-company attacker and opposing-side target; waiting, movement, allied
  attacks and guard actions do not become leadership attacks.
- Cycle proof construction now reads those facts (:470–508 and :928–965), with
  unchanged commander identity/active membership, active subordinate membership,
  at least two distinct subordinates, source uniqueness, interval and non-overlap
  checks. Receipt proofs retain each threat's receipt tick; effects proofs retain
  their existing `context.atTick` convention. The delta does not harmonize those
  pre-existing timing contracts or change their validation.
- For equipped attacks, the new facts equal the fields previously taken from
  weapon interactions, in the same receipt order. Weapon-start validation,
  skill/profile, outcome, source identity, credit ordering and credit matching are
  unchanged. The new fact collection cannot bypass a missing equipped start:
  the existing weapon branch still rejects it before processing cycles.
- Guard credit remains independent (:407–436 and :869–897): an opposing incoming
  attack must find the defender guarding in the prior state and a matching
  earlier defend/start. Neither branch requires a weapon skill. An unarmed own
  defender who defends and then receives a real opposing fists attack keeps its
  defense start and guard interaction. The new leadership arrays cannot alter
  that path. Existing real-guard specification at
  `packages/testkit/src/company-combat-physical.spec.test.ts:1376` is preserved;
  runtime verification by this reviewer is NOT_RUN.

The former counterexample is resolved, not waived: active leader L with active
subordinates U (genuinely unarmed) and A (equipped), where U then A resolve two
qualifying external attacks, now retains both attacks for one existing pairing;
only A receives a weapon start/credit. Existing owners support this separation:
`company/definitions.ts:341–345` assigns separate defense/leadership methods;
`company/practice-admission.ts:20–46,78–105` requires distinct external
interactions for a command cycle without a weapon-skill prerequisite. The local
contract's Data section explicitly preserves separate defense/leadership rules.
The accepted owner amendment in
`docs/content/CONTRACTS_M1_DERIVATIVE.md:307–323` prohibits weapon-skill XP, not
leadership credit. No remaining early-skip counterexample was found in these
current paths, and no additional leadership rule is inferred.

## Extraction, ownership and compatibility

`derivePracticeActions` owns the finite journal scan and its two derived arrays;
`deriveLeadershipCycles` owns sorting/pairing. These are cohesive private
calculations, not a forwarding layer or generic audit-only framework.

Pairing (:251–286) preserves decimal tick, code-unit command ID and code-unit
unit ID sorting; leader exclusion; previous-end ordinal guard; first-action
retention; distinct-character/increasing-ordinal pairing; reset and non-overlap.
Cycle IDs interpolate the identical battle ID. Adding genuine fists facts is
the intended repair; no other pairing policy changes.

Sorting mutates only fresh local records/arrays. Retained values are scalars;
root, binding participants, receipt records and tick input gain no new mutable
aliases. `LeadershipAttack` is a private readonly field subset, not public state.
The READY wrapper remains unfrozen; its profile and both returned arrays remain
shallow-frozen, with entry objects unfrozen exactly as at HEAD (:189–199).

Journal-validation catch and NOT_READY guards retain their order and residuals.
Leader resolution moves after the finite action scan but remains after the same
input guards; the scan consumes replay-validated commands/targets and has no new
error conversion. No observable error/compatibility regression was found. No
export, schema/version, dependency, canonical serialization or retry guard changes.

Core snapshot ownership at `company/combat-aggregate.ts:751–812` and server
`encounters/terminal-evidence.ts:126–173` still excludes null-skill attack
snapshots while collecting leader snapshots independently per receipt. The real
terminal caller still derives this profile (:255–263). Aggregate exact retry
still validates receipt/evidence/profile digests before returning the same state
object (`combat-aggregate.ts:644–681`).

## Regression and evidence limits

Read `review-3.md` and `leadership-fix.md` before inspecting the delta. The latter
records the exact mixed-subordinate targeted test failing with zero cycles before
the fix, then passing after it; three focused files / 28 tests, core typecheck and
scoped lint/format/diff PASS are **worker-reported executed evidence**, not runs
performed here. Red/green evidence is retained as part of this acceptance; it is
not replaced by a helper-level assertion or inferred from green coverage.

The added public regression at
`packages/testkit/src/company-combat-physical.spec.test.ts:3643–3830` uses the real
fixture, genuine pre-binding unequip, bridge-v3 binding, legal kernel commands
and validated receipt acceptance. It checks one leader cycle, only the equipped
start, exact subordinate/source IDs, armed weapon plus leader credits, both
effects and aggregate XP, unchanged unarmed skills, absence of unarmed snapshots,
state-reader roundtrip and exact retry returning the identical state object.
Prefix aggregate consumption supplies the actual saved leader snapshot rather
than fabricating it. Expectations do not invoke the extracted private helpers.
The test is meaningful public-boundary evidence; it does not prove SQL restart,
terminal recovery or a played UI journey.

Performed here: AGENTS/warwrit-review, full contract/classification, prior reports,
exact diff and affected owning-source/caller/specification inspection, report
readback. Graph inventory has no index rooted at this checkout, so direct source
was used without reindexing. Tests, typechecks, lint, builds, coverage, audit,
browser, DB and Orca: **NOT_RUN by reviewer**. Complexity/CRAP/coverage improvement:
**NOT_MEASURED** here. Parent coverage remains parent-owned. Earlier integrated
771 PASS / 48 SKIP / three timeouts remains **FAIL**, not superseded by this review.

Critical-bleed attack/defense classification remains `PENDING_OWNER` in the fully
read classification decision. Rescue/assisted transport remains unresolved.
Neither is a defect introduced by this delta; no policy or rescue is invented.

Only this report was written. Parent remains sole source/shared-file/Git writer:
integrate this scoped acceptance and actual checks into the owning status and
changelog, retain failed integrated/playable/policy limits, and verify the
committed two-path delta equals the reviewed delta before adoption. Later source
changes require affected review; this report does not certify a later commit.
