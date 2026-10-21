VERDICT: ACCEPT 81328bc06969a2f8a57b6d97064e8199c09e6e45

No blocking findings: no reproduced defect, concrete changed-behavior risk or
material regression-test gap found in this independent Tier L source review.

## Target and authority

- Reviewed `origin/main...HEAD`, base `0adcff2e06344ce823f9631ff346248de666ebc4`,
  branch `Vovanostm/core-bow-lab-256`, current full HEAD
  `81328bc06969a2f8a57b6d97064e8199c09e6e45`.
- Independently read AGENTS.md, warwrit-review, the full accepted
  `.orca/core-bow-lab/contract.md`, issue #256 and #249 bodies/comments, and
  epic #217's body and relevant owner decision. The tracked
  `docs/engineering/epics/217/contract.md` is absent; no substitute was invented.
- Direct diff confirms `1105189d56d616426a7202cb61de16da741b6605..HEAD` changes
  only CHANGELOG.md and CURRENT_PLAN.md. These are authorized coordinator
  records, not combat changes or a reason for REWORK. Production/test changes
  remain in the assigned ownership paths. `review-1.md` was preserved and its
  conclusions were not used to determine this verdict.

## Independent source assessment

- **Version dispatch and compatibility:** `rules.ts:239` derives the new weapon
  profiles by changing only ordinary bow AP. The old profiles and old dispatch
  returns remain intact, including fists and recovery. `rules.ts:394` retains
  historical locale ordering for M0/bridge v1 and code-unit ordering for the
  later IDs. The widened tactical predicates preserve their truth values for
  every released ID. `replay.ts:51` preserves old canonical field selection and
  ordering while admitting the new versions' terrain, capabilities and tactical
  fields; replay schema dispatch is unchanged. `bow-compatibility.test.ts:16`
  asserts full state/events, literal canonical bytes, unchanged parsed inputs,
  old 4 AP/16 stamina and refusal after a 1 AP move for all seven released
  sprite/bridge IDs. The fixture literals were inspected, including bridge
  v1–v3 terrain omission and bridge v4 terrain/capabilities. Existing Unicode,
  legacy AI and replay assertions in `order-compatibility.test.ts:236` remain
  unchanged. This is static compatibility assessment, not a fresh replay run.
- **Admission and atomic resources:** `setup-v2.ts:125`, `runtime-v2.ts:62` and
  `engine.ts:1723` carry bridge v5 through the predecessor's terrain validation,
  defensive materialization, required capabilities and unmapped-input
  restrictions. `engine.ts:1097` performs target/resource admission before
  strike RNG or spending. Both preview and execution use the selected core
  weapon profile and shared refusal policy in `sprite-prototype.ts:403`.
  New sprite/bridge regressions assert same-activation move/shot, 2 AP and
  15 stamina refusal, original state identity/bytes, no events and unchanged RNG.
  Extended bridge tests retain forbidden actions, fists and terrain behavior.
- **Determinism and special actions:** `autobattle.test.ts:105` and
  `runtime-v2.test.ts:524` specify bounded, repeated new-version tactical battles
  with bows, mixed weapons and terrain, then JSON replay comparison of events,
  canonical state and RNG/draws. `skills.test.ts:106` explicitly retains aimed
  shot at 4 AP/24 stamina and refuses it after the step. Skill definitions,
  range, LOS, strike damage and RNG implementation are unchanged.
- **Lab authority and transport:** `custom-battle.ts:255` selects v4 for new
  default/preset/custom sessions; `routes.ts:76` and `routes.ts:174` select
  tactical AI without changing authority, revision, retry or scheduler guards.
  `projection.ts:105` and `projection.ts:274` derive hints, previews and movement
  affordability from core. `custom-battle.test.ts:166` exercises the specified
  W05/W02 create → supplied step → supplied shot journey, same activation,
  3 AP/16 stamina execution and downloaded replay reconstruction. Projection
  regressions cover bow refusals and absence of accepted replay commands on
  rejection. No capability token or additional private field is introduced.
- **Client and successor boundary:** the protocol only widens the optional
  ruleset union. `view-validation.ts:194` admits v4 reach while retaining actor,
  activation, revision and geometry checks; its rejection matrix now covers v3
  and v4. No client range/LOS/cost/legality rule was added. Company/binding,
  encounter and contract source is unchanged; the actual admission selector at
  `apps/server/src/encounters/admission.ts:304` still chooses bridge v3/v4.

## Proof limits and handoff

Source and test-contract inspection only. Tests, runtime/browser journeys,
validation, builds, typechecks, lint, audit, coverage, stress and migrations are
**NOT_RUN by this reviewer**, as instructed; coordinator-reported validator
9/9 PASS was not repeated or used as a substitute for source assessment.
Fresh execution of the baseline fixture capture is also NOT_RUN. The MCP graph
points to another checkout/older head, so local source was used instead.

Persistent selectors/admission/save/restart acceptance belongs to successor
#249 and is **NOT_RUN here**; balance is **NOT_MEASURED**. Playable evaluation,
hosted CI and publication remain coordinator-owned gates. No builder rework is
requested. Only this report was written; source, refs, shared records and
external services were not modified.
