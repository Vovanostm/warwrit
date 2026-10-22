# CONTRACT — codex-uix-start-action-271

Issue: #271. Tier U. Base: main 61a91600; merge origin/main normally and inspect #273 before building.
Assignment: Orca msg_71e230d27fc5; preparation only until explicit web-slot handoff.

## Scope

For #271, the first desktop editor viewport must show the existing «Начать бой»
action and understandable readiness/error feedback for the current draft. This
applies to the default mill, a loaded preset and return from a completed battle.
Use the existing desktop layout and start transport; no new mechanics, visual
renderer, mobile layout, library, protocol, persistence or QA-hook refactor.

## Changes

- `apps/web/src/combat-lab/CombatLab.tsx`: `CombatLabEditor` currently renders
  `CombatLabEditorActions` after the entire `BattleEditor` (lines 720–741 at base).
  Move this one existing action group before the long editor; retain a single
  start control, its callback and every loading/invalid/pending/unresolved guard.
- In `CombatLabEditorActions`, use a small semantic action wrapper and place the
  existing validation feedback beside it; add only concise ready feedback if
  needed. Preserve existing reset semantics and unresolved-result notice.
- `apps/web/src/combat-lab/combat-lab.css`: bounded action-group spacing,
  existing-palette primary Start emphasis and visible keyboard focus. Keep the
  group in normal document flow so it cannot cover editor controls. No sticky
  or floating footer and no duplicate submit state.
- `apps/web/src/combat-lab/CombatLab.test.tsx`: reuse current editor guard/callback
  tests; add a regression only if a changed guard lacks coverage. Real viewport
  proof, rather than a source-order unit assertion, establishes discoverability.
- Reuse React 19, native button semantics, validateBattleDraft and onStart. The
  existing owner of start/guards is CombatLabEditorActions, not BattleEditor;
  injecting a second start workflow into BattleEditor would add needless coupling.
- Estimated source change <60 lines, below 300. Limit edits to the two editor
  functions and CSS. Do not restructure CombatLab session/controller code.

## Data

None. Existing current seed/composition and onStart path remain authoritative.
No replay, projection, command, compatibility, dependencies or migration changes.

## Proof

1. At 1440×900 and scrollY=0, capture the default mill: visible labeled Start,
   readiness/error text, no occluded editor controls. Repeat after loading the
   existing deserter preset and after battle result → editor. Check 1366×768
   as a bounded desktop fit check, without adding responsive reflows.
2. One mouse click starts the chosen draft; observe the actual request payload
   and resulting session for the selected seed and roster, with one create
   request. Preserve exact normal session behavior; never inject battle state.
3. Existing focused `CombatLab.test.tsx` checks prove absent catalog/draft,
   loading, invalid draft, starting and unresolved guards plus callbacks. In
   browser, blank name blocks Start and shows a nearby reason; restore it and
   start with keyboard. Check pending request disables duplicate start.
4. Keyboard Tab/Enter reaches and activates Start with visible focus. Reset,
   preset loading and editor inputs remain usable and unobstructed.
5. Continue actual battle to its result with the existing autobattle, return to
   editor and repeat. Capture actual day/night field to exclude entry regression;
   no claim of full scene/art, full M1, performance or balance acceptance.
6. Run focused test, web typecheck, scoped lint/format, normal commit audit;
   coordinator validates then an independent Tier U evaluator repeats the path.
   Full suites/stress/migrations are NOT_RUN for this UI slice.

## Questions

No product/rule question. Ownership request: after #273 integration and explicit
free-web-slot handoff, assign the two editor functions in CombatLab.tsx, its test
and combat-lab.css. Current assignment excludes source edits while #273 is live.
Coordinator owns CHANGELOG, CURRENT_PLAN, wiki, labels, PR/CI and merge decisions.
The pipeline may dispatch its own builder after #273; this chat is not a prerequisite.
At preparation: all implementation/browser/test evidence is NOT_RUN.
