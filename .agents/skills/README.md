# Warwrit skills

The four `warwrit-*` skills own the project workflow. They are workflows, not a
GDD or a source of authorization; [AGENTS.md](../../AGENTS.md) and the active
contract take precedence.

| Skill              | Use                                                                      |
| ------------------ | ------------------------------------------------------------------------ |
| `warwrit-context`  | Start or resume a slice; resolve source, status or ownership conflicts   |
| `warwrit-domain`   | Implement a bounded game-core change                                     |
| `warwrit-review`   | Invariant review, known defect patterns, general and simplification pass |
| `warwrit-delivery` | Validate, publish, authorized merge, checkpoint and next-task handoff    |

## Host discovery

Codex discovers `.agents/skills/`. Claude Code discovers `.claude/skills/`, where
each entry is a symlink to the matching directory here; edit only this directory.
Add a symlink when adding a skill.

## History

On 2026-09-27 the pinned getsentry `code-review` and `code-simplifier` skills
(commit `c2f99a5b04b4cd992ec3022d7c2c3e23e938d241`) were installed as optional
helpers. They were removed on 2026-09-29: their Django examples, blanket
test-coverage demand, approval wording and references to a non-existent
CLAUDE.md style guide contradicted project policy, and `code-review` collided
with a built-in Claude Code skill. Their applicable checks now live in
`warwrit-review` (General pass). The originals remain in Git history.
