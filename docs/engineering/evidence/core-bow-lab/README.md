# Bow core/lab #256 — 2026-10-21

Branch: `Vovanostm/core-bow-lab-256`; base actual main `0adcff2e`.
Code `1105189d56d616426a7202cb61de16da741b6605` adds sprite v4 / bridge v5
ordinary bow 3 AP; stamina remains 16. Released rules/replays and persistent
admission defaults retain their existing behavior.

## Gates and playable result

- [Fresh source review](review.md): ACCEPT at `81328bc06969a2f8a57b6d97064e8199c09e6e45`.
  Direct `1105189d..81328bc` diff changes only CHANGELOG/CURRENT_PLAN.
- [Independent playable evaluation](evaluation.md): ACCEPT for code `1105189d`.
  At 1440 × 900, real editor W05/W02 journeys in day and night produced a
  legal 1 AP step then ordinary 3 AP shot in the same activation: AP 4 → 3 → 0,
  stamina 100 → 96 → 80. Native responses plus exported command-prefix replay
  establish the costs despite automatic turn advancement after the shot.
- Fresh offline evaluator readback matches all seven released bow replay
  baselines against actual main and current code. Native duel and default
  mill battles completed; the mill's 163-command replay matches state/events/RNG.
- Coordinator validator: exit 0, 9/9 PASS at `1105189d`; 118 changed source
  lines. Builder related coverage: 812 PASS / 51 SKIP, normal audit PASS.
  These are inspected executed logs, not fresh coordinator test reruns here.
- Pre-integration hosted CI `39598354029` SUCCESS on published `f764b847`.
- Integrated main `4e83842a` through normal merge `a0dd20c0`; only additive
  CHANGELOG conflict resolved, both histories retained. No game source conflict.
  Fresh coordinator validator exit 0, 9/9 PASS on the integrated head.
  Final integrated-head hosted CI and merge remain pending; no deployment or migration.

## Screenshots

[Before the day step](day-before.jpg), [day 3 AP attack preview](day-3ap-preview.jpg),
[night 3 AP attack preview](night-3ap-preview.jpg),
[completed default mill battle](mill-finished-day.jpg).
These are small JPEG derivatives of the evaluator's original 1440 × 900 PNGs.

## Limits and retained evidence

Persistent company/binding/admission/save/restart is successor #249: NOT_RUN.
Balance is NOT_MEASURED; Tier V art acceptance is outside this Tier L change.
The 2 AP browser journey disables attack with a native insufficient-AP refusal;
15-stamina atomic rejection and aimed-shot 4 AP / 24 stamina are test/source
proof, not fresh browser command-rejection proof.

The first review attempt stopped on the records-only HEAD change; a fresh
complete review above supersedes that incomplete attempt. Earlier builder
failures remain in local reports. No failed check was converted into PASS.
Local originals and native response/replay evidence: `.orca/core-bow-lab/`
(in particular `eval-1-shots/`); these are untracked local paths, not committed
links. The evaluator stopped its browser/runtime and freed both assigned ports.
