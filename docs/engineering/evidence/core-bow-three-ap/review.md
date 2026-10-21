VERDICT: ACCEPT 63ce897e7523eb0946eab91a58ed781444f07ef6

## Findings

No reproduced in-scope defect, concrete rule/privacy/replay/determinism risk, or
material regression-test gap requiring source rework was established. This is
an independent source-review verdict; it does not complete playable acceptance
or authorize publication, issue closure or merge.

## Reviewed tree and authority

- Dedicated checkout `codex-company-profile-164`, branch `codex/bow-three-ap-249`.
  Initial clean HEAD was `482f8daaedd4bbd7269c4b4617617409303eed39`.
  Reviewed the full `git diff origin/main...HEAD`, including production consumers
  and tests, and separately `6109930d..482f8daa` for the round-two repair.
  Merge base / local `origin/main` is `d8a04196bcbcb13948b5a16e9874dfe08e1cdf5e`;
  that main and retained `e68025b9` are ancestors. No fetch or ref change performed.
- While reviewing, the parent advanced HEAD to the first-line SHA. Direct
  `482f8daa..63ce897e` name/status and content readback contains only
  `CHANGELOG.md` and `docs/engineering/CURRENT_PLAN.md`; source/tests are unchanged.
- Read AGENTS.md, `warwrit-review`, the full slice contract, report, review-1 and
  eval-1; live #249 body and comments; and merged
  `docs/engineering/evidence/core-bow-lab/{README,evaluation,review}.md`.
  The contract already cites the accepted product/split decisions.
  `docs/engineering/epics/217/contract.md` is absent; no substitute was fabricated.
- MCP inventory identifies another, older Warwrit checkout, so local source and
  ordinary diffs supplied proof. No index/configuration mutation performed.

## Round-two fixture and assertion assessment

- `apps/server/src/encounters/postgres.integration.test.ts:394` constructs separate
  opening evidence and invokes public `prepareCompanyLifecycle(CreateCompany)`
  at `:433`. The copied leader profile at `:449` contains the producer's exact
  skill progress/source binding and enabled-skill aptitudes, rather than
  hand-assigned archery values. Production `company/opening.ts:95-102,135-139`
  owns those values. Random candidate variation is not copied to the bow leader.
- `postgres.integration.test.ts:457-494` composes and strictly reads a synthetic
  **pre-admission** root. Only the existing leader's sword becomes a two-hand bow,
  retaining item ID/owner; that leader's shield is stowed, and knowledge item
  snapshots receive the same equipment change. Other fighters retain their
  original profiles/gear. `seedFirstHuntJoinScenario` constructs these roots
  before inserting snapshots and before ordinary authenticated JOINs. No active
  battle, journal, response or grant is rewritten. This proves neither ordinary
  onboarding nor equipment acquisition/travel; the report correctly says so.
- Both wolf reads now explicitly address `ci.m1.wolf-trail.01`, assert HTTP 200
  and supply that read's revision to JOIN (`:3943-3961`). The round-one wrong-hunt
  revision counterexample no longer applies; server revision checks are intact.
- The native waits at `:4079-4105` advance owned sword turns through authenticated
  commands. Hostile-wake assertions remain. The bow path still uses supplied
  movement, checks the same actor/activation at 3 AP, quotes 3 AP/16 stamina,
  accepts the ordinary shot and checks its separate stamina debit (`:4002-4075`).
  The trial core command only chooses a supplied destination; it is not persisted
  or substituted for the actual server command.
- Connection reopening, replay, original-response retry, exactly one shot receipt,
  active lookup and unchanged saved setup/version remain asserted (`:4118-4144`).
  This is a new DB connection, not a process restart.
- Actual legal command execution produces the asserted company victory before
  terminal processing. The test requires acknowledged effects, valid replay,
  one proof, one terminal company receipt each, cleared active bindings and one
  completion each (`:4148-4194`). A second pending-effects invocation and exact
  original shot retry compare complete company snapshots, company receipts and
  proof rows with the settled rows (`:4196-4200`). No production guard or prior
  assertion was weakened; temporary diagnostic changes are absent from the diff.

## Full production feature assessment

- `company/combat-projection.ts:175-184,271-293` and `combat-morale.ts:101-138`
  pair projection5 with bridge-v5, retaining detached values, capabilities,
  empty campaign skill ranks and human morale. Existing version defaults and
  historical projection shapes retain their prior branches.
- `company/encounter-binding.ts:200-218,267-306` selects from the supplied stored
  ruleset and preserves complete company/world participants, equipment, terrain,
  capabilities and morale. `aggregate-state.ts:536-704,1137-1179` admits exact
  V5 shapes and version pairing while keeping member/setup/initial-state checks
  and bridge-specific allowlists. Loading never selects the latest ruleset.
  Public binding regressions preserve old versions alongside V5, strict JSON
  roundtrip, malformed terrain/member rejection and old replay shape.
- `company/combat-physical.ts:189-245` reprojects V5 with its frozen discriminator;
  the public physical regression exercises the previously missed consumer.
  `combat-practice.ts:702-711,1083-1092` classifies V5 tactical strikes like V4
  without changing historical receipt classification. The terminal PG regression
  traverses physical/practice consumption through both completed company roots.
- `encounters/admission.ts:304-307` changes only new wolf admission to V5;
  legacy raider remains V3. The same prepared binding supplies encounter setup,
  state, admission and company roots in the existing transaction. Historical
  active battles use their saved setup. `encounters/executor.ts:99-160,463-470,
1010-1030,1353-1363` retains replay/version matching, bridge-only admission,
  tactical AI and command dispatch. Ownership, revision, deadline and exact-body
  retry guards remain; rejected core commands return before persistence at
  `:623-624`. No additional bow-cost rule is introduced.
- `encounters/access.ts:45-135,175-243` derives V5 previews and public tactical
  fields from core; private action/movement/attack grants still require the
  active actor in owned IDs. Binding access checks all participating company
  roots/owners and matching setup before returning the requesting owner's grant.
  No new private field or client legality implementation is introduced.
- `encounters/terminal-evidence.ts:395-403` retains unsupported surrender/hostile
  retreat as pending for V5. `contracts/executor.ts:538-546` changes terminal
  replay validation only. Existing replay-derived evidence, prepare-all-company
  transitions before writes, proof identity and acknowledgement transaction are
  preserved (`:604-732`); the test's stronger settlement/retry assertions are
  consistent with that boundary.
- Production and test deltas stay within assigned ownership; measured production
  delta is 239 added/deleted source lines in 11 files. Retained README/wiki and
  coordinator records are the documented parent-owned documentation history,
  not an additional worker implementation delta. Round two changes only the PG
  test and builder report. No new core/lab/protocol/web implementation, dependency,
  migration or released replay fixture delta appears against main.

## Checks and remaining limits

Source inspection and Git/GitHub readback only. Tests, coverage, builds, services,
browser, migrations, validator, typechecks, lint and audit are **NOT_RUN by this
reviewer**, as assigned. No delegation, Orca commands, external writes, commits,
ref changes or source/test/shared-record edits were performed.

The builder's finite PG **1 PASS / 23 filtered SKIP**, related current-source
**689 PASS / 34 SKIP** and normal audit/commit PASS remain author-reported
execution, not this reviewer's acceptance proof. The original missing-schema
failure, wrong-contract revision failure, two round-one terminal failures,
refreshed-coverage audit failure and intermediate round-two preparation/consumption
failures remain preserved in the existing reports/logs; none is reclassified.

Eval-1's native V5 move/shot/restart/retry and genuine V4 continuation retain their
original limits. Fresh supported-terminal/proof/retry runtime acceptance, native
2 AP refusal and complete rendered day/night journeys remain evaluator-owned.
Released seven-baseline runtime readback is prior #256/eval-1 evidence, not rerun
here. Full integrated gates, hosted CI and delivery remain parent-owned; balance
and performance are **NOT_MEASURED**. No visual-critic or full-M1 claim is made.

Documentation closeout is this requested report only. Parent owns shared
documentation and final delivery records; no source correction is requested.
