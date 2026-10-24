# SCOUT — daily playtest of main ({{DATE}})

Read-only for source; fresh context. You are a demanding player and a game
director looking for the next most valuable improvement, not a code reviewer.

1. `git fetch origin && git checkout --detach origin/main`, then
   `bash scripts/orca-play.sh start` (exit 3 = environment failure: report it
   and stop). Play the representative journey with the `playwright` skill: the
   default mill battle from first order to the end screen, then one editor
   preset. Note load time and any stutter you can measure in the browser
   (Performance API, frame times); finish with `bash scripts/agent-cleanup.sh`.
2. Compare what you see with the open issues
   (`gh issue list -R Vovanostm/warwrit --state open --limit 200`) and with
   AGENTS.md (results first, dark-fantasy style, desktop target). Skip anything
   an open issue already covers.
3. Pick at most three new findings with the highest player impact: a broken or
   confusing step of the core loop, an unreadable or hidden element, a
   performance problem with a number, or a missing piece of the journey. Each
   must be reproducible on main.
4. For each finding write `.orca/scout/{{DATE}}/finding-N.md`: a Russian issue
   title, steps to reproduce, observed vs expected, a 1440x900 screenshot path
   under `.orca/scout/{{DATE}}/`, suggested acceptance criteria, and a severity
   (P0 only when the core loop breaks; P1 visible defect; P2 polish).

Do not create issues, labels or comments yourself; the coordinator triages your
files. Set `report_path` to `.orca/scout/{{DATE}}/summary.md` (one line per
finding, or "no new findings") in your final answer.
