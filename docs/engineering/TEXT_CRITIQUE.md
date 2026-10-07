# Text critique rubric

Owner request — 2026-10-07: agent tasks need critique so that the result meets
the expected quality. This rubric applies to every substantive player-facing
text: contract briefs and scenes, dialogue, findings, mission stories, the
company book, bestiary and quest cards. It mirrors the
[visual rubric](VISUAL_CRITIQUE.md). Earlier text was rejected by the owner as
saccharine, bureaucratic, unbelievable and once simply nonsensical («сторожил
мышей»); the rubric exists to catch those before the owner does.

Critics: Claude Code `warwrit-text-critic` (`.claude/agents/`), Codex
`warwrit_text_critic` (`.codex/agents/`). The diff reviewer does not accept text.

## References

- [Writing rules](../wiki/world/writing.md) — bans, voices, checklist.
- [Literary style](../wiki/world/literary-style.md) — devices and accepted samples.
- [World](../wiki/world/index.md), [Porechye](../wiki/world/porechye.md),
  [glossary](../content/world/glossary.csv) — names and facts.
- The brief's mechanics source (contract steps, mission data) — what the game
  actually does.

## Author obligations

- Give the critic the full text as the player will see it, in order, in both
  languages, with the speaker and the screen for each line; plus the mechanics
  facts it must match. Not a summary.
- Send the change list only after scoring.
- A missing input makes the result BLOCKED.

## Procedure

1. Read the whole text once as a player. Write the **first-read three**: the three
   places where a reader stumbles, disbelieves or gets bored. Each is a finding.
2. Read it aloud (or as if aloud). Mark every line no real person would say.
3. Score each criterion 0–3 against the references, never against the previous
   pass. Quote the line for each score below 3.
4. **ACCEPT** only if every criterion is at least 2 and none is 0. Otherwise
   **REJECT**. «No material defects» is forbidden while any score is below 2.
5. **Convergence:** a criterion at 1 or below for two passes means rewording is
   not working; name the structural change (different scene, speaker, conflict
   or cut).

Scores: 3 — a reader believes it and wants the next line; 2 — only polish
remains; 1 — a clear problem a player notices; 0 — nonsense, contradiction or
the wrong genre.

| Criterion          | What to check                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| People and voices  | Speakers have names, a want and something they do not say; voices differ by class and region                       |
| Concreteness       | Objects, numbers, days, places; the war shown through things, not the word «война»                                 |
| Living language    | No bureaucratese or banned words; no purple prose; no machine rhythm («не просто X, а Y», triads)                  |
| Clear subtext      | Evasion and understatement are understood on the first read; no riddles that need decoding                         |
| Lore truth         | Names, places, duchies and facts match the world pages; no invented canon, gods, magic or witnesses                |
| Mechanics truth    | The text promises nothing the game does not do; steps, outcomes and rewards match                                  |
| Rhythm and endings | Short lines for action, longer for landscape; endings on a fact or action; no moral; no repeated final lines       |
| Translation        | English complete, natural and glossary-consistent; no string concatenation; gender and number handled where needed |

## Finding format

Criterion and score; the quoted line and its screen; what is wrong for a player;
the smallest fix, marked **rewording** or **structural change**. Owner-taste
questions are listed separately and never offset a score below 2.

## Output

Verdict (ACCEPT, REJECT or BLOCKED); first-read three; score table; findings by
player impact; convergence note; inspected revision and file paths.

## Calibration — 2026-10-07

- «— Мышей. Мыши, они тоже есть хотят.» (Kondrat, sample 4, first version):
  Clear subtext **0** — a riddle the owner read as nonsense. Fixed by a plain
  reluctant answer about hidden grain.
- «Подготовить один разрешённый обход и пройти его для проверки» (quest Q047,
  player text): Living language **1** — contract language in a character's mouth.
- «Наше. В амбаре его сборщик найдёт, а там не искали. Зерно ладно. Вы парня
  верните.» (Kondrat, accepted): People and voices **3**, Clear subtext **3**.
