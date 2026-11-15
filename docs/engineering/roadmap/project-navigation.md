# Compact project navigation and changelog workflow

## Status — 2026-11-08

Implemented locally on `codex/sprite-combat-stage1` at the owner's request.
No game changes, publication, merge, deployment or player-data changes.
Existing staged/unstaged WIP is retained.

## Result and use

- [ROADMAP](../ROADMAP.md) replaces CURRENT_PLAN as the sole project-state entry:
  checkbox links only, with details in existing task documents or focused pages
  in this directory. Checkbox meaning is in [navigation rules](README.md).
- Former roadmap dependencies and acceptance detail moved to the M1 domain,
  world, lab and acceptance pages. Stale renderer/gate wording follows current
  ADR-0006 and AGENTS.md. Unverified game milestones stay open.
  Supply provisioning/purchases retain their recorded PR144 completion, with
  the owning document's original checks and limits.
- The complete former CURRENT_PLAN is preserved verbatim in a historical file
  alongside the original, so its relative links retain their base. The old path
  is a three-line pointer, not a read/update target. Historical reports and
  earlier decisions are not rewritten as fresh delivery results or permissions.
- [warwrit-changelog](../../../.agents/skills/warwrit-changelog/SKILL.md) limits
  context reads to the first 50 lines and older-change searches to 50 output
  lines by regexp. New entries are short and link the owning task document.
  Historical entries remain intact.
- Root rules, context/domain/delivery skills, docs entry points, operational
  memory, reusable prompts/briefs and agent profile/status-script comments now
  route to roadmap → requested task. Full changelog/plan reads are not required.

To resume, open ROADMAP, select the requested task and read its active section.
For a specific older change, use the changelog skill's bounded regexp example.
To close work, update that task document, change its checkbox if done and add
one short Unreleased entry. Do not append a new operational diary.

## Done criterion and checks

Done when the index contains only checkbox links, its targets resolve, the old
plan is preserved, active startup/closeout instructions use the new route and
the changelog skill is discoverable and valid.

Skill validation (changelog/context/domain/delivery), TOML, shell syntax,
102 added local links/anchors, archive/history preservation and scoped
diff/self-review PASS. Roadmap is 15 checkbox-link lines; CURRENT_PLAN is three
lines; changelog skill is 37 lines. Actual recent-context read: 50 lines;
regexp search example: 43 lines; new changelog entry: three lines.
Game tests and CI NOT_RUN (documentation/instructions only).

## Next action

Use the new route for the next owner-requested task. This migration grants no
merge permission and does not choose a new game feature or accept full M1.
