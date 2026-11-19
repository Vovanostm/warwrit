---
name: warwrit-changelog
description: Read recent Warwrit changes, find a specific historical change or add a concise CHANGELOG entry. Use for change awareness and substantive delivery records; not for reconstructing the full project history.
---

# Read and write a compact changelog

Follow [AGENTS.md](../../../AGENTS.md). [CHANGELOG](../../../CHANGELOG.md) records
changes; [ROADMAP](../../../docs/engineering/ROADMAP.md) is the project-state entry.

## Read or search

- For recent context, read at most the first 50 lines: `sed -n '1,50p' CHANGELOG.md`.
- For a specific change, use a regexp for its topic, path, date or PR, with at
  most 50 output lines, including surrounding context:
  `rg -n -i -m 8 -C 2 -- 'suppl(y|ies)|M1-SUPPLIES|PR[ #]*146' CHANGELOG.md | head -n 50`.
- Narrow an overflowing query; do not read the file in full or page through it.
  Open the matching entry's owning document only if it is needed for the task.
- Reuse context already read. Compare with actual source/diff or GitHub for live
  state; an old changelog statement is dated evidence, not current completion.

## Write

- Add one short entry at the top of `Unreleased` for a substantive behavior,
  contract, decision or workflow change. Trivial replies need no entry.
- Format: `- YYYY-MM-DD — TYPE: concrete change and why; DETAILS_LINK. STATE.`
  TYPE is Added/Changed/Fixed/Removed; STATE is LOCAL/PUBLISHED/MERGED.
  DETAILS_LINK is a relative Markdown link to the actual owning document.
- Use one or two sentences, normally at most three wrapped lines. Match the
  surrounding developer-document language and the client date.
- State what changed and its practical effect; include the reason when needed.
  Keep branch, commands, test lists, blockers and detailed evidence in the linked
  task document. Never claim publication, merge or acceptance from local work.
- Preserve old entries and unrelated edits. Correct history with a dated follow-up;
  record a later merge in the same entry or a concise dated correction.
- Review only the edited entry/diff and its link; this does not justify a full
  changelog read. Keep one writer per shared file.
