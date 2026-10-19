# UIX-01a / #180 — ordinary attack refusal evidence

2026-10-19; branch `Vovanostm/uix-w1-projection`; source candidate
`fa7f51662bd0fa0042467a77340171aa796aae71`, baseline
`84861773b58548ae0817c1a2c322ae8d8d5a2a19`. Local evaluation **ACCEPT**;
publication prepared, CI and owner-approved merge pending. This is the #180
projection boundary, not downstream refusal wording, #184 affordability,
#187 skill reach or #207 names.

## How to try

Run `pnpm dev:combat`, open `/combat-lab`, start unchanged «Развалины мельницы»
(seed20261009, six per side). At first settled human bow activation, inspect
the real view response: six active enemies have one range refusal each
(distances5/7/9/11/12/14, range1–4); none has an attack preview. The renderer
is unchanged. Hover, inspect, move the camera and change lighting: 0 action
POST/revision4. An accepted move and mouse/keyboard end-turn advance the
revision normally; UI autobattle finishes at round9/revision160, human victory,
74 action POST; terminal inspection remains at that revision.

## Independent review

[Evaluation2](eval-2.md) preserves REWORK history: source/live/F1/F2 passed,
F3 comparison pending. [Evaluation3](eval-3.md) independently resolves F3 and
starts `VERDICT: ACCEPT`; source stayed unchanged. Report references to `.orca/`
are operational paths in retained persistent worktrees, not tracked links.
No visual implementation changed; no new visual-critic verdict is claimed.

## Actual checks and limits

- Coordinator `orca-validate.sh`: EXIT0,8/8,702 related PASS/47SKIP, eight-file
  audit PASS. Independent public projection/session tests:17PASS.
- Clean persistent exact-candidate `scripts/bootstrap.sh`: EXIT0;
  verify833PASS/47SKIP, stress10,000 battles/20deterministic reruns/100replay
  checks, disposable PostgreSQL integration14PASS. Disposable infra removed.
- Paired baseline/candidate stress: every deterministic result field identical;
  only measured duration excluded. Fifteen baseline-saved command streams
  replayed on both sources: equal canonical state, complete events and accepted
  counts (362 commands/1,016 events); sprite v1/v2/v3 on schema1, bridge v1/v2
  on schema2, seeds1/42/20261009. Finite generated saved cases, not a historical
  replay archive or proof of every possible stream.
- Original bootstrap EXIT1 from ignored evaluator JS probes is retained;
  unchanged gate passed in a clean persistent checkout. First baseline replay
  fixture incorrectly used S4 traits on v1 and was rejected; the evidence
  fixture was corrected before comparison. No gate/golden/source weakened.
- D1 privacy scope: existing all-visible lab, controlled actor budgets only,
  no hidden LOS details/foreign target IDs. Real fog-of-war NOT_RUN.
- Performance/balance/capacity NOT_MEASURED; deployment/merge NOT_RUN.
  No migration, dependency, command, replay schema, RNG or balance change.

Underlying coordinator gate/comparison records remain in persistent
`pipeline-coordinator/.orca/pipeline/ticks/20261019T0246/`; raw evaluator logs
and original PNGs remain in `uix-w1-projection/.orca/uix-w1-projection/`.
These are named local evidence paths, not repository links.

## Screenshots

Unscaled JPEG copies of evaluator-owned PNGs; no scene/UI changes or crops.
The 24 source pairs below hold the same initial revision4/POST0 and positions.
Dimensions name content viewports at100%; actual native outer window1440×888
was constrained by the desktop, consistently across sources and zoom levels.
Native Chrome125% was selected through its visible Appearance/Page zoom control,
not simulated by CSS or DPR. Inner sizes at125%:1093×614,1152×720,1536×864,
DPR1.25; setting reset100% afterward. [Visible125%](eval2-native-settings125.jpg).

| Content viewport | Native zoom | Day before / after                                                                                | Night before / after                                                                                  |
| ---------------- | ----------- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1366x768         | 100%        | [before](eval2-before-1366x768-zoom100-day.jpg) / [after](eval2-after-1366x768-zoom100-day.jpg)   | [before](eval2-before-1366x768-zoom100-night.jpg) / [after](eval2-after-1366x768-zoom100-night.jpg)   |
| 1366x768         | 125%        | [before](eval2-before-1366x768-zoom125-day.jpg) / [after](eval2-after-1366x768-zoom125-day.jpg)   | [before](eval2-before-1366x768-zoom125-night.jpg) / [after](eval2-after-1366x768-zoom125-night.jpg)   |
| 1440x900         | 100%        | [before](eval2-before-1440x900-zoom100-day.jpg) / [after](eval2-after-1440x900-zoom100-day.jpg)   | [before](eval2-before-1440x900-zoom100-night.jpg) / [after](eval2-after-1440x900-zoom100-night.jpg)   |
| 1440x900         | 125%        | [before](eval2-before-1440x900-zoom125-day.jpg) / [after](eval2-after-1440x900-zoom125-day.jpg)   | [before](eval2-before-1440x900-zoom125-night.jpg) / [after](eval2-after-1440x900-zoom125-night.jpg)   |
| 1920x1080        | 100%        | [before](eval2-before-1920x1080-zoom100-day.jpg) / [after](eval2-after-1920x1080-zoom100-day.jpg) | [before](eval2-before-1920x1080-zoom100-night.jpg) / [after](eval2-after-1920x1080-zoom100-night.jpg) |
| 1920x1080        | 125%        | [before](eval2-before-1920x1080-zoom125-day.jpg) / [after](eval2-after-1920x1080-zoom125-day.jpg) | [before](eval2-before-1920x1080-zoom125-night.jpg) / [after](eval2-after-1920x1080-zoom125-night.jpg) |

Close inspection: [day](eval2-after-close-day-1440.jpg),
[night](eval2-after-close-night-1440.jpg).
Completed battle: [100% day](eval2-terminal-1440-zoom100-day.jpg),
[100% night](eval2-terminal-1440-zoom100-night.jpg),
[125% day](eval2-terminal-1440-zoom125-day.jpg),
[125% night](eval2-terminal-1440-zoom125-night.jpg).
