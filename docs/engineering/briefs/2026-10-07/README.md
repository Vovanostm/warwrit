# Agent briefs — decisions of 2026-10-07

Owner request 2026-10-07: «Раздели по отдельным файлам — с критериями приёмки,
критикой и пр. чтобы агент однозначно выполнил задачу с ожидаемым качеством».
Each brief is one writer's contract. Every brief is executed together with
[00-common.md](00-common.md): rules, quality bar, critique loop, checks,
definition of done and handoff. Briefs are not dispatched until the parent
assigns them.

## Prerequisite P0

The briefs assume these local changes are on the base branch: the
`apps/web/src/i18n` catalogue, the rewritten contract texts, the world and
vision pages, `TEXT_CRITIQUE.md` and the text critic agents. On 2026-10-07 they
are uncommitted on primary `main`. The owner decides how to commit and publish
them; agents branch from that commit.

## Briefs

| ID                               | Outcome                                                     | Type               | Depends on            | Time box |
| -------------------------------- | ----------------------------------------------------------- | ------------------ | --------------------- | -------- |
| [B1](B1-field-camp.md)           | Camp: slower upkeep, terrain gathering, offline presence    | code + UI + text   | —                     | 6 h      |
| [B2](B2-autobattle.md)           | Autobattle with retreat; «go to a settlement and log out»   | code + UI + text   | B1                    | 8 h      |
| [B3](B3-repeatable-contracts.md) | Contracts generated from world causes                       | code + text        | —                     | 8 h      |
| [B4](B4-story-missions.md)       | Non-combat missions; detective «Кто выдал тайник»           | story + code + UI  | — (owner reads story) | 10 h     |
| [B5](B5-crisis-war.md)           | Crisis: duchy war, settlement capture and restoration       | design + code + UI | B2, B3, stages 3–6    | 10 h     |
| [B6](B6-localization.md)         | All UI strings in i18n, English complete, language switch   | code + text        | B1–B4 or ACKed scope  | 6 h      |
| [B7](B7-content-revision.md)     | Bestiary and 60 quest cards fit the world and writing rules | docs/text          | —                     | 6 h      |
| [B8](B8-company-book.md)         | New company opening book, two variants for the owner        | text               | —                     | 4 h      |
| [B9](B9-second-region.md)        | Second region proposals (after M1 only)                     | design             | M1 accepted           | 3 h      |

## Order and parallel work

- Wave 1 (independent, disjoint paths): **B1**, **B3**, **B4**, **B7**, **B8**.
  B1/B3/B4 touch different game-core modules; each adds its own i18n catalogue
  pair, so the only shared lines are one spread each in `i18n/ru.ts`/`en.ts`
  (the parent resolves them at merge).
- Wave 2: **B2** after B1; **B6** after B1–B4 (or on an ACKed component list).
- Wave 3: **B5** after B2 and B3, when CURRENT_PLAN shows stages 3–6 stable.
- After M1 acceptance: **B9**.

Owner checkpoints built into briefs: B4 story, B5 phase table, B8 variant choice,
B9 region choice.

## Critics

| Critic                                            | Rubric                                         |
| ------------------------------------------------- | ---------------------------------------------- |
| `warwrit-critic` / `warwrit_reviewer`             | `.agents/skills/warwrit-review/SKILL.md`       |
| `warwrit-visual-critic` / `warwrit_visual_critic` | [VISUAL_CRITIQUE.md](../../VISUAL_CRITIQUE.md) |
| `warwrit-text-critic` / `warwrit_text_critic`     | [TEXT_CRITIQUE.md](../../TEXT_CRITIQUE.md)     |

## Dispatch prompt

Give the agent exactly this, filling the brackets:

```text
You are the single writer for brief [Bn] of the Warwrit project.
Base commit: [sha]. Worktree: [path]. Branch: [name].
Read docs/engineering/briefs/2026-10-07/00-common.md and
docs/engineering/briefs/2026-10-07/[Bn-file].md in full; together with AGENTS.md
they are your contract. Execute the steps in order, commit each step, run the
critique loop, and finish with the handoff from 00-common §9.
Stop and ask me per 00-common §8; do not guess.
```
