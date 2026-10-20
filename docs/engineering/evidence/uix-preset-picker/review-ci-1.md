VERDICT: ACCEPT 38c57915fbd3cc6ec0fa8a10d26238dd329b94d3

Independent bounded CI-correction review for #228 / PR243, 2026-10-20.
No observable defect requiring rework found. Only this report was written;
no tests/builds, browser/services, agents, source/shared records, Git mutations,
remote operations or Orca calls were performed.

## Evidence and correction

- Confirmed frozen HEAD38c57915 and read the ordinary diff from published
  3f1d395a: only BattleEditor.test.tsx, CHANGELOG and CURRENT_PLAN changed.
  The apps/packages diff excluding that test is empty. No production, package,
  lockfile, tsconfig, build ordering or gate changes accompany this correction.
- Read the relevant CI39369463852 failure in
  .orca/uix-preset-picker/ci-39369463852-failed.log (build section, lines625–644).
  Web starts compiling after protocol while game-core is still building. Its
  inclusion of ../server/src/combat-lab/custom-battle.ts produces TS2307 for
  @warwrit/game-core plus five TS18048 row diagnostics; web exits2. This remains
  a failed hosted run, not a pass superseded by local checks.
- The old test directly imported server custom-battle, whose first import is
  game-core. Web declares protocol but not game-core; its tsconfig includes
  src/**/*.ts(x), including this test. The correction removes that cross-app
  import rather than adding a dependency, changing scheduling or excluding tests.
- editorCatalog reuses the existing small cell-test DTO fixture and adds an
  independent human-duel preset with one human per side, a distinct name/seed,
  complete map and nested positions/skillRanks. Its dependencies are the public
  protocol types and existing local editor helper, not server/core code. The
  inspected editor imports retain that public boundary. Thus this offending
  compiler-graph edge is removed; a fresh hosted build is still required.

## Regression preservation

- Exact equality after explicit load remains against the selected independent
  fixture, including map, seed, roster, positions and skills. Selecting alone
  still must not call onChange; load starts disabled until a source is selected.
- Distinct-reference assertions remain for a tile, unit position and skillRanks.
  Editing name/removing a fighter, reloading exact source data, unchanged catalog
  comparison and detached default reset remain. Removal expectation changes from
  ten remaining actors to one to match the finite fixture.
- Missing/empty optional presets retain editor/reset coverage. Invalid empty
  roster and unavailable id must leave the draft unchanged; disabled controls
  and direct disabled load callback remain guarded. The unused fetch stub still
  rejects unintended network work by this component path. Keyboard-addressable
  and blocked/occupied editor-cell checks remain.
- Removed 6/5 cardinality assertions belonged to the real catalog fixture, not
  the generic picker replacement contract. The replacement does not claim to
  verify deserter content, names or balance. Real six-versus-five loading and
  launch remain covered by the completed independent UI journey, not this duel.
  No skips, assertion bypass, relaxed validation or new feature target appeared.

## Attribution, retained acceptance and limits

The supplied validation-correction.log contains all eight PASS results:
rebased, clean-tree, packages, typecheck, format, lint, related-tests and audit.
The parent reports five focused tests, web types, lint/format/diff and normal
commit audit PASS; shared records also record those focused results. These are
parent-supplied checks inspected here, not runs by this reviewer. **Hosted clean
full gate remains pending**; this source review does not predict its result.

I explicitly retain my Tier U gameplay **ACCEPT for unchanged picker production
049b6cb6d2778a64701642167823601aeb8199ad**. Relevant combat-lab production paths
remain unchanged; ordinary comparison against that source has no difference
other than this test. No new browser acceptance is claimed. Existing integration
changes elsewhere since049b6cb6 are outside this bounded correction review.

The prior .orca/uix-preset-picker/eval-1.md remains authoritative for the actual
100/125 desktop, save/load/reset/reload/restart, human manual orders, withdrawal
reaction and two terminal surrender observations, plus all measurement failures
and finite limits. Its late shared-index/runtime boundary remains intact:
unrelated encounter/core-pools/shared-record work appeared after browser closure,
the API listener changed and subsequent availability was not established. Nothing
here revisits that runtime or accepts later integration, #227, the whole scene,
balance/performance, deployment or merge. Parent owns publication and final CI.
