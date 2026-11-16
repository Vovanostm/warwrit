# Visual and playable review

## Product-focused review — owner decision 2026-11-06

This replaces the 2026-10-07 mandatory scoring/capture/convergence procedure.
Review the feature's specified player result and affected visuals. Missing
whole-scene evidence does not block unrelated gameplay development or reopen an
accepted control fix. The selected art direction and lore remain binding.
The historical calibration below records a real art failure, not a current gate.

## Inputs and scope

Use the feature specification, inspected revision, current integrated screenshots
and actual journey evidence. Read [ART_LORE_POLICY](ART_LORE_POLICY.md) and the
applicable approved references when art/style/lore is affected. For new 2D art use
the current graphic-novel profile, or an explicitly assigned fog-wet-stone profile;
historical assets retain their documented geography/material/proportion authority.

Choose evidence for the claim being made:

- Controls/feedback: the relevant states at supported desktop scale, visible
  feedback and actual input/result. A screenshot alone cannot prove interaction.
- Art/proportions: the changed asset beside its applicable reference at a useful
  comparable scale, integrated in the scene. Close views only when needed.
- Lighting: day/night when lighting or night readability is affected.
- Animation: relevant motion when a clip, pose or transition changes.
- Combat layering/picking: affected overlays, silhouettes, targets and overlap
  scenarios when those systems change. Keep ground overlays behind opaque figures;
  preserve readable targets, hover/pin linkage and unobstructed controls.

A feature need not provide every category. Final integrated scene acceptance
covers all relevant categories in its own scope. Reuse evidence for unchanged
behavior. State missing evidence for a required criterion as NOT_RUN and leave
that criterion open; do not infer a pass or declare a global project block.

## Review

Inspect images yourself and compare affected art to references. Play/read the
actual journey evidence for input, understandable goals/costs/consequences,
loading/refusal/retry and the next player action. Check credible form/materials,
projection, grounding, palette, lore and motion where affected.

Report only observed findings: exact image/region or journey step, unmet criterion,
player impact and smallest appropriate fix. Separate:

- **Defect:** prevents the specified result, misleads the player, obstructs input
  or materially violates the feature's approved art/lore contract. Fix before
  accepting that result.
- **Evidence gap:** a required claim was not checked; name the smallest missing
  check. Unrelated missing comparisons belong to their future scene review.
- **Polish:** optional improvement; prioritize by player benefit, not score.

No mandatory score table, three-difference quota or fixed-round technique switch.
If fixes do not solve a defect, investigate the cause and reconsider the approach.
After a fix review affected results and regressions; repeat the full review only
when the change invalidates its wider evidence.

## Result

Return the reviewed scope/revision, observed player result, material defects,
missing required checks, optional polish and next action. ACCEPT means the scoped
criteria passed; REWORK names a concrete defect; NOT_RUN names missing required
evidence. None of these labels alone accepts or blocks the whole game. Read-only
critics do not edit, publish or grant owner acceptance.

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
