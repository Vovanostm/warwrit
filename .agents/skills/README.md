# Review skills in Warwrit

The four `warwrit-*` skills own the project workflow. Generic review skills are
optional helpers; they do not replace AGENTS.md, accepted decisions, or task scope.

| Skill             | Use                                                              |
| ----------------- | ---------------------------------------------------------------- |
| `warwrit-review`  | Domain invariants, source authority, counterexamples             |
| `code-review`     | Design, side effects, compatibility and evidence review          |
| `code-simplifier` | Clarity and fewer unnecessary abstractions in the current change |

## Upstream provenance

`code-review` and `code-simplifier` were installed from
[getsentry/skills](https://github.com/getsentry/skills/tree/c2f99a5b04b4cd992ec3022d7c2c3e23e938d241/skills)
on 2026-09-27, pinned to commit `c2f99a5b04b4cd992ec3022d7c2c3e23e938d241`.
The original source paths are `skills/code-review/SKILL.md` and
`skills/code-simplifier/SKILL.md`. See [LICENSE.getsentry](LICENSE.getsentry).
The simplifier credits Anthropic in its retained source comment.
Local changes are Prettier formatting and the corresponding modification notice;
upstream guidance is retained. No upstream scripts, hooks or package dependencies
were installed.

## Project precedence

- AGENTS.md and the selected contract govern tests, style and authority. The
  upstream CLAUDE.md reference does not establish another project policy file.
- Preserve the risk-based test policy. Generic coverage suggestions do not require
  new tests for wording or equivalent refactoring, nor repeated full gates.
- Do not impose Sentry-specific style or Django guidance on unrelated code.
- Review findings need an observable counterexample or an explicitly labelled risk.
  Review approval never grants merge, deployment or external-message authority.
- Simplify only the selected change; retain independent oracles and intentional
  actual/known state separation. No broad cleanup or new abstraction by default.

Read the selected SKILL.md directly in a running session. New sessions/turns can
use normal project skill discovery. The focused preparation plan is
[AGENT_DEVELOPMENT_PREPARATION.md](../../docs/engineering/AGENT_DEVELOPMENT_PREPARATION.md).
