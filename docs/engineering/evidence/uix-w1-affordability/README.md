# UIX-03a / #184 — affordability producer proof

2026-10-19; branch `Vovanostm/uix-w1-affordability`; gated source
`c055e9a03e5ed8562a761162a0d86ee1a3e330fd`, source-before `1665527`.
Producer-only local ACCEPT. Publication/CI/merge pending.

The optional `movementPreview[].attackAffordableAfter` comes from shared core
attack admission/resource checks. It quotes nominal affordability after the whole
path; survival, arrival, continued activation and target availability are separate.
Legacy omitted flags remain valid. No rule, RNG, replay or migration changes.

## Independent gates and actual journey

[Reviewer1](review-1.md) ACCEPT for the gated source; [evaluator1](eval-1.md)
ACCEPT after actual default-mill play. Coordinator validator on that source:
EXIT0,8/8,709PASS/47SKIP,auditPASS. Evaluator:62 focused tests,29 live boundary
cases,96 matched captures across1366/1440/1920,100/125% native Chrome zoom,
overview/close and day/night. Visible zoom reset100% afterward.

Run `pnpm dev:combat`, open `/combat-lab`, start untouched «Развалины мельницы».
Initial bow:39 movement rows,all false. Move and use mouse/keyboard end-turn to
reach sword:6 one-AP rows true,29 longer rows false. Existing scene has one band;
the received wire data is the producer result. Four manual orders plus89 UI
autobattle orders finished human victory R10/rev182; terminal inspection added
zero orders. No renderer exception; favicon404 only. Both evaluator servers stopped.

A baseline-only unexpected order during extra zoom readback was retained in the
report, then the baseline was restarted through UI and matched states repeated.
It was not reproduced on candidate or asserted as its defect. Final isolated
integration CI and finite replay/stress comparison remain pending. Performance,
balance and capacity NOT_MEASURED; deployment NOT_RUN.

## Images and retained evidence

The JPEGs below are unscaled quality65 copies of evaluator PNGs. Full96 PNGs,
wire facts, dimensions and native zoom logs remain at the local operational path
`uix-w1-affordability/.orca/uix-w1-affordability/eval-shots/`.
They are runtime proof of an unchanged scene, not acceptance of movement bands.

- [before-bow-overview-1440x900-zoom100-day](before-bow-overview-1440x900-zoom100-day.jpg)
- [before-bow-overview-1440x900-zoom100-night](before-bow-overview-1440x900-zoom100-night.jpg)
- [before-bow-close-1440x900-zoom100-day](before-bow-close-1440x900-zoom100-day.jpg)
- [before-bow-close-1440x900-zoom100-night](before-bow-close-1440x900-zoom100-night.jpg)
- [before-sword-overview-1440x900-zoom100-day](before-sword-overview-1440x900-zoom100-day.jpg)
- [before-sword-overview-1440x900-zoom100-night](before-sword-overview-1440x900-zoom100-night.jpg)
- [before-sword-close-1440x900-zoom100-day](before-sword-close-1440x900-zoom100-day.jpg)
- [before-sword-close-1440x900-zoom100-night](before-sword-close-1440x900-zoom100-night.jpg)
- [candidate-bow-overview-1440x900-zoom100-day](candidate-bow-overview-1440x900-zoom100-day.jpg)
- [candidate-bow-overview-1440x900-zoom100-night](candidate-bow-overview-1440x900-zoom100-night.jpg)
- [candidate-bow-close-1440x900-zoom100-day](candidate-bow-close-1440x900-zoom100-day.jpg)
- [candidate-bow-close-1440x900-zoom100-night](candidate-bow-close-1440x900-zoom100-night.jpg)
- [candidate-sword-overview-1440x900-zoom100-day](candidate-sword-overview-1440x900-zoom100-day.jpg)
- [candidate-sword-overview-1440x900-zoom100-night](candidate-sword-overview-1440x900-zoom100-night.jpg)
- [candidate-sword-close-1440x900-zoom100-day](candidate-sword-close-1440x900-zoom100-day.jpg)
- [candidate-sword-close-1440x900-zoom100-night](candidate-sword-close-1440x900-zoom100-night.jpg)
- [before-sword-overview-1366x768-zoom125-day](before-sword-overview-1366x768-zoom125-day.jpg)
- [before-sword-overview-1366x768-zoom125-night](before-sword-overview-1366x768-zoom125-night.jpg)
- [candidate-sword-overview-1366x768-zoom125-day](candidate-sword-overview-1366x768-zoom125-day.jpg)
- [candidate-sword-overview-1366x768-zoom125-night](candidate-sword-overview-1366x768-zoom125-night.jpg)
- [candidate-terminal-day-1440](candidate-terminal-day-1440.jpg)
- [candidate-terminal-night-1440](candidate-terminal-night-1440.jpg)
- [native-zoom-125-control](native-zoom-125-control.jpg)
- [native-zoom-reset100-visible](native-zoom-reset100-visible.jpg)
- [keyboard-visible-focus-1440](keyboard-visible-focus-1440.jpg)

## Remaining issue scope

#184 stays open. Bands, legend, CVD and rendered legacy fallback belong to
`uix-w2-scene` after #187; its integrated visual critic is mandatory.
This PR references #184 and never closes it. Tier L gates apply to this producer;
no separate Tier V acceptance is claimed.
