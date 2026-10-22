# Session callback extraction — #273

Frozen source: `a6b3514388828c5d9db79232df03486a2f72b4a2`, branch
`Vovanostm/qa-hooks-session-callbacks`. Behavior-preserving extraction of
`applyLatest` and `endBattle`; 137 changed source lines, tests excluded.

[Contract](contract.md) and [independent Tier U ACCEPT](eval-1.md) own the scope
and executed proof. Coordinator validation: exit 0, 9/9 gates PASS, 75 related
tests PASS; ordinary audit passes its changed-code gate with 5 inherited findings.
Independent focused tests: 48 PASS. Final component complexity remains deferred
to #269 AND #262; #263/#267/#231 stay open.

Try the ordinary mill, seed 20261009, at 1440 × 900: start, legal move, menu,
one-step, replay, autoplay/stop, manual order, restart, editor return and finish.
Evaluator completed actual day and night victories and transport/disabled guards.

| State            | Day                        | Night                        |
| ---------------- | -------------------------- | ---------------------------- |
| Menu closed      | [capture](day-closed.jpg)  | [capture](night-closed.jpg)  |
| Menu open        | [capture](day-open.jpg)    | [capture](night-open.jpg)    |
| Autoplay running | [capture](day-running.jpg) | [capture](night-running.jpg) |
| Autoplay stopped | [capture](day-stopped.jpg) | [capture](night-stopped.jpg) |
| Victory          | [capture](day-result.jpg)  | [capture](night-result.jpg)  |

JPEGs derive directly from evaluator screenshots. Full mounted traces, downloads,
console and cleanup logs remain local in
`.orca/qa-hooks-session-callbacks/`; report paths naming them are local evidence,
not tracked links. Independent opponent-pause and isolated root-unmount proof
remain NOT_RUN; other viewports/performance NOT_MEASURED. Full verify, stress,
migrations and production build NOT_RUN for this bounded pipeline slice.
No gameplay, protocol, replay, renderer, dependency or migration change.
Publication and merge state live in CURRENT_PLAN and GitHub.
