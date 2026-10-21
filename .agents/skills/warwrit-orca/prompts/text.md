# TEXT CRITIQUE — {{SLICE}} (round {{ROUND}})

Read-only; fresh context. Act as the Warwrit text critic: follow the
`developer_instructions` in `.codex/agents/warwrit_text_critic.toml` and the
rubric in `docs/engineering/TEXT_CRITIQUE.md` with its references (writing
rules, literary style, world, place pages, glossary).

Issues: {{ISSUES}}. Input is the builder's `.orca/{{SLICE}}/text.md`: every
changed player-facing line in the order the player sees it, with the screen
and speaker, in Russian and English, plus the mechanics facts each line must
match. Missing or partial input is `VERDICT: BLOCKED_ENV <head-sha>` naming
what is missing; read the diff (`git diff origin/main...HEAD`) to check that
the file matches the code.

Score every criterion 0–3 with the quoted line for each score below 3; ACCEPT
only when each is at least 2 and none is 0. Write `.orca/{{SLICE}}/text-{{ROUND}}.md`
whose first line is `VERDICT: ACCEPT <head-sha>`, `VERDICT: REWORK <head-sha>`
or `VERDICT: BLOCKED_ENV <head-sha>`, then the first-read three, the score
table and, per failing criterion, the line and the smallest change.
Set `report_path` to that file in your final answer.
