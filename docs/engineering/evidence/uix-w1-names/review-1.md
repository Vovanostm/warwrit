VERDICT: ACCEPT f5803e5da321e6f71506e8488e612e75531943e9

No findings requiring rework in the amended names-producer scope.

Reviewed `git diff origin/main...HEAD`, baseline
`073a02ba9bd44c1b1f867bb486e9374f647526d8`, against AGENTS.md,
the complete local contract including its 2026-10-19 coordinator amendment,
live #207 body/comments, #217 body/comments and current shared-record additions.
Applied `warwrit-review`. Source/tests match producer `796fa528c8a9dc8e407b9cbee48a96209614c9e0`;
the other branch commits are coordinator CHANGELOG/CURRENT_PLAN receipts.
No tracked epic217 contract exists; none was created.

Source and independent test-expectation inspection:

- `apps/server/src/combat-lab/presentation.ts:7`: totals and ordinals use the complete accepted roster in input order, across both sides, without initiative/status filtering. Singleton labels remain unchanged. `projection.test.ts:493` and `:514` independently expect the two numbered wolves, twelve distinct mill labels, cross-side ordering with reverse-sorting IDs, the unchanged singleton and stable inactive labels.
- `apps/server/src/combat-lab/presentation.ts:23` and `routes.ts:329`: session creation retains cloned config values and resolved label records. `projection.test.ts:532` changes the original draft and catalogue wording while expecting the saved wolf label and unchanged snapshot, including JSON-only reconstruction.
- `apps/server/src/combat-lab/replay.ts:15` and `:52`: the export adds only optional presentation metadata; reconstruction invokes unchanged public core replay and passes saved metadata directly to projection. The metadata-present path does not resolve names through the current catalogue. `custom-battle.test.ts:809` exercises authenticated create/read/accepted orders through an inactive wolf, then JSON serialize/parse and reconstruction with no separate config argument. Its expectations compare every ID/name/status, repeat reconstruction, check unchanged input and compare complete canonical replay results with metadata omitted, including RNG/events/accepted count.
- `apps/server/src/combat-lab/replay.ts:24`: reconstruction checks version, controlled-side membership, complete unique roster IDs and nonempty string labels. `projection.test.ts:561` supplies explicit malformed counterexamples and expects rejection without input mutation. Metadata does not enter command admission or canonical setup construction.
- `apps/server/src/combat-lab/routes.ts:418`: export retains the existing capability/origin guard. The exported object selects setup, commands and presentation explicitly; it does not spread private session records. Metadata contains existing public config/roster identity, not new enemy resource or hidden-LOS data. `routes.test.ts:44` and `custom-battle.test.ts:876` cover legacy omission, missing capability, foreign origin and metadata shape/capability exclusion. This is the existing all-visible lab model, not fog-of-war proof.
- `apps/server/src/combat-lab/routes.ts:341` initializes accounting from the complete export; unchanged `prepareTransition` adds command UTF-8 bytes and the inter-command comma. `routes.test.ts:136` checks actual serialized size after an accepted command and explicit exact-limit/one-byte-over expectations. Initial custom input remains bounded by existing admission/body limits.
- All eight producer source/test paths are owned. The only additional tracked diff is the explicitly coordinator-owned shared receipts. No core rule, RNG, historical serialization, migration, web legality calculation or authorization policy changes were found.

Review limits:

- Tests, builds, typechecks, coverage, audit, browser journeys and screenshots: **NOT_RUN by this reviewer**, as assigned while the independent evaluator owns runtime proof. Coordinator validator results and builder evidence are provenance only, not fresh executions or independent runtime acceptance here.
- The graph indexes a different checkout, so source discovery used local diff/files. No source/test/shared-document edits, child agents, Orca calls, processes, commits or remote writes were made.
- This is Tier L source ACCEPT for the producer only. Visible field captions and terminal inactive-card inspection remain assigned to `uix-w1-name-consumers`; they are **not accepted here**. Full desktop/native125%, day/night and passive-input proof remain evaluator gates. The producer PR must use `Refs #207`; #207 remains open until its complete acceptance criteria are met.
