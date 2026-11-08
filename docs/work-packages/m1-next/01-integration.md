# N01 — Reconcile and verify the integrated candidate

## Current result — 2026-11-08

IN_PROGRESS / LOCAL. N01 reserves the separate persistent worktree
`.claude/worktrees/n01-integration`, branch `codex/n01-integration`, from PR430
`d22336a423eaf96e32197e6252bed9a3820dde0b`. Live main is
`3c55cf35`; PR429 remains
`b58c87ce3f489484a9fd8cdf1eecf2efd8c6203b`, already an ancestor of PR430.
Both PRs are OPEN/conflicting; source worktrees were clean at intake and remain
owned by their original writers. No source-branch push or merge is authorized.

INT-1 selected: the main merge has only one textual conflict, CHANGELOG.md.
Keep both additive records; main adds only PR428 authorization documentation,
so executable source and released migrations remain byte-identical to PR430.
Inherited WLC evidence is historical, not a fresh run. Fresh ordinary entry,
production artifact refusal and SQL evidence are pending.

Exact write reservation in this worktree: `CHANGELOG.md`,
`docs/engineering/WLC_08_ACCEPTANCE.md`, `AGENTS.md`,
`docs/engineering/ROADMAP.md`, `docs/work-packages/m1-next/COMMON.md`,
`docs/work-packages/m1-next/01-integration.md` and
`docs/work-packages/m1-next/prompts/01-integration.md`.
No application, renderer, content, migration or retained-save edits are planned.
The AGENTS/roadmap adjustments preserve the November 8 navigation/advisory
amendments without importing the primary checkout's application WIP.

Owned stand: Compose `warwrit-n01-20261108`, PostgreSQL54901, Dex55901,
API33901, realtime33902, web53901. Reserve only this project and its newly
created database; no access to retained WLC08 saves is inferred.
Graph fallback: the indexed Warwrit project points at the old primary sprite
checkout7841632a, not this candidate. Use bounded source reads instead.
[Common contract](COMMON.md) applies. [Launch prompt](prompts/01-integration.md).

## Player problem and outcome

Useful features are spread across an integrated candidate and main. The player
needs one coherent ordinary game, with authoring tools isolated from it.
Observable outcome: normal sign-in reaches the same durable company and a real
journey on one reviewable candidate, while production excludes debug tools.
Try: ordinary login → company → map/place → accepted contract; restart/re-enter.

## Sources and existing owners

- [M1 scope](../../wiki/m1-spec.md), [ADR0006](../../architecture/0006-m1-renderer-babylon.md).
- [PR429](https://github.com/Vovanostm/warwrit/pull/429) and
  [PR430](https://github.com/Vovanostm/warwrit/pull/430), actual live heads/diffs.
- At the selected live ref, read `docs/engineering/WLC_08_ACCEPTANCE.md`,
  `UNIFIED_MAP_EDITOR.md`, `COMBAT_LAB_CONSOLIDATION.md`,
  `SERVER_AUTHORITY.md` and isolated setup in `LOCAL_DEVELOPMENT.md`.
  Some are absent in this old primary checkout; use `git show <ref>:<path>`
  before choosing a working base. No copying an obsolete implementation.

## Behavior, alternatives and persistence

Keep ordinary entry as the player entry. Protected Playground has explicit debug
identity, sandbox ownership and production exclusion. Editor content publication
does not silently assign a new map to retained worlds. Campaign and lab use the
selected authoritative rules and renderer; old replay versions stay readable.
Invalid/stale/unauthorized commands explain refusal and leave canonical state
unchanged. Lost responses retain exact retry; reload is observational.
Keep actual failed runs and casualties. Conflict resolution cannot erase them.

## Scope, architecture and compatibility

IN: reconcile PR429/430 with actual main, preserve both feature histories, fix
integration defects, verify production/debug separation, launch/readiness and
save/replay/migration compatibility. OUT: redesigning maps, new combat rules,
all M1 content, unrelated CI cleanup, merging/deploying without explicit authority.
Use the existing monolith/executor/protocol; no second simulation or persistence root.

Candidate write scope: only actual conflict/defect files within existing
Playground/editor/renderer/server authority/build configuration and directly
affected tests/docs. Reserve each file first. Never take the entire package tree.
Migration `0022` is released at the recorded baseline; re-read the ledger before
accepting candidate migrations `0023`–`0025`. Never renumber/edit a migration already released later.

## Work plan

1. Record live heads, PR state, ownership and executable vs documentation changes.
2. Choose the existing integration branch with its owner's consent/authority,
   or reserve a separate persistent candidate; reconcile dependencies serially.
3. Resolve each conflict according to newer owner decisions and actual consumers.
   Preserve November 8 roadmap/advisory-check amendments even if main's docs lag.
4. Inspect migrations and content/replay versions; check existing saves in an
   isolated authorized copy without rewriting the source save.
5. Run affected focused checks; build production only to prove debug exclusion.
6. Try normal login/map/company/contract entry and restart; recheck only changed
   parts of WLC-08. Record prior unchanged evidence as inherited, not rerun.
7. Self-review and prepare the exact candidate diff, actual evidence and PR update.
   Stop at review readiness unless this actual merge is explicitly authorized.

## Acceptance / DoD

- [ ] INT-1 Current candidate has no unresolved textual or semantic conflicts with
      its recorded base; exact dependencies, owned changes and compatibility are recorded.
- [ ] INT-2 Normal entry and re-entry retain company/people/money/items/world;
      map/place navigation remains usable without a data reset.
- [ ] INT-3 Production web/server artifacts exclude executable debug entrypoints;
      direct debug API requests refuse, with no ordinary-world mutation.
- [ ] INT-4 Editor/Lab checks stay sandbox-scoped; no content reassignment to
      existing worlds, reinterpretation of old replay, or duplicate canonical writer.
- [ ] INT-5 Relevant real DB migration/readback evidence covers actual schema
      changes; a legacy-save failure is fixed or explicitly keeps this row open.
- [ ] INT-6 Scoped diff, owning docs and CHANGELOG are reviewed/recorded;
      publication/merge state is truthful. A candidate ready for review is not merged M1.

## Direct checks and blockers

Use existing focused conflict/production/SQL regressions and ordinary browser entry.
Do not rerun full suites solely for advisory CI. A retained DB's unavailable owner
blocks only its save-specific proof; use isolated data for independent checks.
A conflicting writer requires path coordination. Missing merge permission does not
block candidate preparation and is not a reason to stop earlier.
