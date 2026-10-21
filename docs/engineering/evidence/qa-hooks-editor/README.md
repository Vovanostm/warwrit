# Editor extraction — #261 / R1 of #231

2026-10-21, branch `Vovanostm/qa-hooks-editor`.
Gated code: `4523f609db8e4321ed088ba9043cee9fef6473e1`; main base: `b9dc49fccfd2`.

The existing editor, validation/start/reset and feedback priority are preserved.
The [contract](contract.md) owns this finite child; #231 remains open for its other children.
Independent [Tier U evaluation](eval-1.md) ACCEPTS that code head with no findings.
Later shared records change only CHANGELOG/CURRENT_PLAN; this evidence commit adds no game code.

Try the default mill at desktop 1440×900: seed 20261009, clear the battle name,
observe disabled Start, reset, set the seed again and start once. Inspect the
battlefield in day/night, return through the menu, then reset once.
The evaluator independently performed this journey: one POST 201, DELETE 204,
original reason tooltip and reset controls. Exact request bodies/logs and native
PNG captures stay in worktree `.orca/qa-hooks-editor/eval-logs/` and `eval-shots/`.
No credentials are included here. JPEGs are display copies of native captures.

| View             | Baseline                | Candidate                                             |
| ---------------- | ----------------------- | ----------------------------------------------------- |
| Editor           | [Main](main-editor.jpg) | [Editor](editor.jpg)                                  |
| Invalid controls | —                       | [Disabled Start and validation](invalid-controls.jpg) |
| Day              | [Main](main-day.jpg)    | [Day](day.jpg)                                        |
| Night            | [Main](main-night.jpg)  | [Night](night.jpg)                                    |

Coordinator validator: exit 0, 9/9 PASS, 64 related tests PASS, source scope 182.
Independent evaluator: 42 focused tests PASS, pinned diff and diff check PASS.
Ordinary source commit audit PASS with no introduced findings; seven inherited
findings remain excluded by the unchanged gate. Favicon 404 is reproduced baseline
behavior; no other console/page error was observed in this journey.

Hosted CI and merge remain pending at evidence publication. Full verify/stress/
migrations/build were NOT_RUN locally for this R1. Full battle victory, hooks,
deterministic clock/playback and full #231 acceptance are outside this child.
Performance and balance NOT_MEASURED. No rules, protocol, replay, renderer,
dependency or migration changes; no deployment or full-M1 claim.
