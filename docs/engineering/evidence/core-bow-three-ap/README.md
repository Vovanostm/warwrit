# Persistent bow 3 AP — #249

2026-10-21, `codex/bow-three-ap-249`, local independent Tier L ACCEPT.
Gated head `63ce897e7523eb0946eab91a58ed781444f07ef6`; source/tests
`482f8daaedd4bbd7269c4b4617617409303eed39`. Main `46fe0c33` integrated
as `16cedf56`: CHANGELOG conflict only, both histories preserved; game source
and tests did not change after the gates. Publication/CI/merge remain pending.

Only new tactical wolf admissions select existing bridge-v5/projection5.
Old active encounters retain their saved rules; raider admission retains V3.
Preview, affordability and execution use core-owned costs. No new migration,
version ID, protocol field, rule, dependency or deployment.

[Independent source review](review.md) and [playable evaluation](evaluation.md)
both ACCEPT the gated head. The evaluator used synthetic pre-admission companies
with ordinary producer-derived bow aptitude, carried supplies and a named existing
wolf objective; this does not prove onboarding, equipment acquisition or travel.

- Two separate rendered 1440×900 day/night activations: 4 → 3 → 0 AP,
  80 → 76 → 60 stamina; ordinary move then 3 AP / 16-stamina shot.
- Native 2 AP refusal leaves encounter/RNG/commands/receipts unchanged; disabled
  UI action. The 15-stamina refusal is test-only evidence.
- Real process restart retains V5 save/version/command prefix; exact retry
  matches one receipt. Genuine old-server V4 admission continues on current
  code with its saved 4 AP / 16-stamina shot.
- Supported company victory: all wolves dead, one company fighter dead;
  one proof, one terminal receipt per company, completed/cleared bindings,
  stable repeated terminal processing and exact shot retry.
- Default mill day/night move/shot and round 7 victory; downloaded 140-command
  replay matches state/RNG. Fresh finite checks: 61 PASS, including all seven
  unchanged released bow baselines and aimed shot 4 AP / 24 stamina.

Coordinator integrated validator: exit 0, 9/9 PASS on `16cedf56`,
671 PASS / 52 SKIP; scope 239 source lines. Log in coordinator worktree:
`.orca/pipeline/ticks/20261021T1526/validate249.log`. Full final clean-checkout
CI is still pending. Earlier failed fixtures, attempts and their exact limits
remain in evaluation.md and the original worker report; no gate was weakened.
Original PNGs, native JSON/logs/replays remain under
`.orca/core-bow-three-ap/` in the dedicated worktree. JPEG copies here are
viewing evidence; command/retry/version claims use the native rows/replays.
Balance/performance NOT_MEASURED; no full-M1 acceptance claim.
