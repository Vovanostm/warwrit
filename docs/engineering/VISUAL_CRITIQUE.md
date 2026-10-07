# Visual critique rubric

Owner request — 2026-10-07: the independent critic must catch the gaps the owner
sees. Earlier passes used the diff reviewer, which checked only whether the
author's fixes landed, and returned "no new material defect" while the character
still clearly differed from the reference. This rubric applies to every
substantive visual result (characters, places, map, UI art), not only to
characters. It implements
[AGENTS.md § Independent playable critique](../../AGENTS.md#independent-playable-critique).

Critics: Codex `warwrit_visual_critic` (`.codex/agents/`), Claude Code
`warwrit-visual-critic` (`.claude/agents/`). The diff reviewer stays responsible
for code; it does not accept visuals.

## Author obligations

- Give the critic image paths, not conclusions. Required every pass:
  1. the approved references: `assets/art/m1/style/unit-c-ink.png` and the
     relevant `assets/art/m1/places/` scene;
  2. a side-by-side sheet of the candidate and the reference at equal height, in
     close view and at game scale;
  3. in-scene views at game scale, by day and by night;
  4. motion frames (start, contact, end) for every clip in scope.
- Send the change list only after the critic has scored, so the scores are not
  primed by what you fixed.
- A missing input makes the result BLOCKED, never a pass.

## Procedure

1. Open every image yourself and write one line per image saying what is
   actually visible.
2. **First-look test:** name the three differences from the reference that a
   player would notice in five seconds. Each one is a finding unless a recorded
   owner decision accepts it.
3. Score every criterion below from 0 to 3 against the **reference**, never
   against the previous pass. Cite image and region for each score.
4. Verdict: **ACCEPT** only if every criterion is at least 2 at game scale and
   none is 0 in close view. Otherwise **REJECT**. "No material defects" is
   forbidden while any score is below 2.
5. **Convergence:** if a criterion stays at 1 or below for two passes, state that
   tuning is not converging and name the technique-level change (different
   asset, clip, render technique or reference-matched painting).
6. Readback of earlier findings is additional work and never replaces the full
   absolute review.

Scores: 3 — reads as the same artist and family at that scale; 2 — only polish
remains; 1 — a clear gap a player notices; 0 — a different style, or broken.

| Criterion                  | What to compare with the reference                                                                                           |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Silhouette and proportions | Adult grounded body; head, hand and limb ratios; no hero, toy or cute shapes                                                 |
| Pose and gesture           | Weight, guard and intent; compact readable attitude; no stumble or ape-like reach                                            |
| Rendering language         | Interior ink contours, hatching and texture density, strong shadow masses; painted ink rather than smooth CG fills           |
| Value and palette          | Day and night values relative to the scene; slate/soot/umber/ochre; no glowing or sticker-like figure at night               |
| Materials and wear         | Credible cloth, leather, wood and metal with weathering; nothing pristine, toy-like or glossy                                |
| Props and lore             | Weapon and shield scale in metres; no emblems or invented symbols; period-plausible gear                                     |
| Scene integration          | Scale against doors, barrels and people in the place art; grounding and contact shadow; one light direction; readable target |
| Motion (when in scope)     | Foot contact, arcs, grip through the clip, believable weight; no sliding or popping                                          |

## Finding format

Each finding gives:

- the criterion and its score;
- the image and region;
- what is observed versus the reference;
- the player impact;
- the smallest fix, marked as **tuning** or **approach change**.

Owner-taste questions are listed separately and never offset a score below 2.

## Output

Return:

- the verdict (ACCEPT, REJECT or BLOCKED);
- the per-image lines;
- the first-look three;
- the score table;
- findings ordered by player impact;
- the convergence note;
- the inspected revision and image paths.

## Calibration example — character A, `1687b19`, 2026-10-07

Scored by the Claude Code review session on the cycle 1 captures; verdict
**REJECT**. The branch critic passed the same images.

- First-look three:
  - smooth CG figure next to a hatched ink drawing;
  - pale, glowing figure in the night scene;
  - a long, bright sword and a new-looking orange shield.
- Rendering language **1**: flat fills without interior contours or quilting.
  The bind-space hatch is invisible.
- Value at night **1**: the figure is lighter than the surrounding scene.
- Materials **1**:
  - orange wood with a light-grey rim reads as new;
  - the sword is bright and pristine.
- Props **1**: the blade is about 1 m and reaches the ground in idle; the
  reference blade is about arm length.
- Pose **1**:
  - `Sword_Idle` is a wide crouch with long hanging arms;
  - the attack peak reads as a stumble.
- Proportions **1–2**: long arms and large hands.
- Scene integration **2**: upright and grounded after the tilt, with a correct
  shadow side.
- Convergence: rendering language has been at 1 for three passes. Band and value
  tuning does not add ink lines. The approach change is a screen-space ink pass
  (depth/normal edges for interior contours, tonal hatching, albedo-edge lines
  for seams and quilting).
