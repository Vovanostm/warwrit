VERDICT: ACCEPT ff40f304b6d72a2f874a223555b6ecd5bdb3ac96

# Independent absolute visual critique — #227, completed pass 6

Visual result: **ACCEPT** for this frozen #227 integrated overview/inspection slice. All applicable absolute criteria score2 at game scale and close view; motion is N/A. Visual5 F1 is closed by the source-grounded archer recreation and controlled ground-on/off comparisons, not by a build or evaluator verdict. This does not accept all combat permutations, new assets, animation or the full UI epic.

2026-10-20. Code `ff40f304b6d72a2f874a223555b6ecd5bdb3ac96`; documentation head `8a68d296aa784a2583fbcfabe2d66bf40473900c`, unchanged as supplied. Same independent visual5 critic, resumed after interrupted visual6 work. Visual5 remains historical REWORK/BLOCKED; visual2's findings remain historical failures. Interrupted attempts produced no verdict and count as neither acceptance nor a new scored pass. Specialist responsibilities/rubric are applied; no claim that native role configuration was loaded.

## Method and attributable reuse

First action in this recovery opened images directly. Personally reopened all22 originals in eval6-layer-shots and the seven ordinary eval5 images listed below. No resource polling or browser actions. After initial images, read completed eval-6-layers.md, its packet.md, visual-5.md and full docs/engineering/VISUAL_CRITIQUE.md. Scores below compare images with approved references, not with visual5's numeric results.

Explicitly reuse my own visual5 inspection of assets/art/m1/style/unit-c-ink.png, assets/art/m1/places/staraya-melnitsa.png and assets/art/combat/stage1-2026-10-09/ui-reference-{day,night,melee,mill}.png: adult compact shield guard, interior ink/worn materials, ruined mill, grounded distinct melee figures, subdued day/night family. Also reuse my personally inspected eval4-shots/unit-c-comparison.png (approximately384px enlargement of108px game crop plus108px equal-height row), archer/long-weapon/height1/crowded pairs, and visual5's ordinary close/log/scrolled-card/commander inspections. These are unchanged-art/renderer evidence, not new assets or a native384px render. The source reuse boundary was established by ordinary diff during visual5: only BattleUnitCard.tsx/battle-controls.css changed from5124298c toff40f304; subsequent head is documentation only. No new source archaeology or Git command here.

D below = .orca/uix-overview-zoom/eval6-layer-shots/; E = .orca/uix-overview-zoom/eval5-shots/. Every filename in the following inventory was directly opened in this recovery. Unlisted earlier images are explicitly reused above, not claimed newly opened.

## Per-image observations

### Controlled diagnostic originals

- D recreation-h1-close-day-on.png: selected archer centred near x720/y425, spear left, halberd right, creature behind; yellow cell and grid stay visibly behind opaque figures.
- D recreation-h1-close-day-off.png: coloured ground/grid vanish; same archer waist/legs/bow, shafts, creature paws, foot bars and HUD remain; no rectangular blank sprite margin.
- D recreation-h1-close-night-on.png: same raised arrangement darkens with scene; grid remains behind the readable bodies/weapons.
- D recreation-h1-close-night-off.png: ground treatments disappear while night figure silhouettes, bars and HUD remain in place.
- D recreation-h1-overview-day-on.png: complete field and twelve identifiers, archer C central gold ring, nearby B/E/K distinct, ruined mill visible.
- D recreation-h1-overview-day-off.png: ground grid/fills absent, same figures/letters and mill remain; identifiers preserve represented positions.
- D recreation-h1-overview-night-on.png: subdued full-field view, separated identifiers and legible HUD; no glowing world figures.
- D recreation-h1-overview-night-off.png: same night formation without ground overlays, including retained HTML C identifier ring.
- D actual-threat-close-day-on.png: actual red arrow from creature toward archer, red cell under archer, adjacent polearms and readable threat banner; no visible arrow over opaque archer pixels.
- D actual-threat-close-day-off.png: red arrow/fills/grid disappear, archer waist/legs/bow and creature/polearms remain; threat text remains deliberately as HUD feedback.
- D actual-threat-close-night-on.png: same arrow and threatened archer at night, dark bodies remain distinct from coloured ground.
- D actual-threat-close-night-off.png: same night bodies and HUD, ground arrow/grid/fills absent.
- D actual-threat-overview-day-on.png: complete field under threat band, archer C and creature K distinct; red threatened cell and small arrow fit within the field.
- D actual-threat-overview-day-off.png: same positions, letters and feedback labels without ground treatments; field participants stay visible.
- D actual-threat-overview-night-on.png: same readable threat formation at night, banner separated from field/queue.
- D actual-threat-overview-night-off.png: night ground treatments absent, identifiers and figures/HUD retained.
- D archer-detail-day-on.png: larger archer near x720/y460, bow/waist/both legs legible; red cell/arrow behind figure; creature head partly beneath top HUD at this deliberately closer zoom.
- D archer-detail-day-off.png: archer and shafts retain their shapes with ground treatments removed; terrain remains visible around transparent borders.
- D archer-detail-night-on.png: darker archer retains interior detail and outlined shape; arrow terminates beside the leg rather than visibly over it.
- D archer-detail-night-off.png: same night body/bow/legs, no residual ground line through opaque pixels or rectangular masking patch established.
- D selection-reach-threat-day-on.png: halberd inspection/ochre selected cell alongside red threatened archer and genuine arrow; actor card remains archer, inspected card halberd.
- D selection-reach-threat-day-off.png: selected/reach/threat ground treatments vanish together; same halberd, archer, creature, foot bars and inspection/HUD remain.

### Ordinary current gameplay originals

- E opening-1280-125-day.png: twelve distinct ground-linked letter identifiers, mill at upper left, complete field between initiative and desk, separate command/skill lanes.
- E opening-1280-125-night.png: same formation and readable identifiers; world bodies darken without glowing.
- E casualty-threat-1280-125-day.png: ten distinct survivors in central cluster, threat above them, bounded Wolf1/0/50/dead inspection at lower right; no banner-marker collision.
- E casualty-1280-1.25-night.png: same separated survivors and dead-card identity at night.
- E A-selects-A-125.png: inspected Меч + щит/80/80 while actor remains Лук; sword fighter and creature occupy separate threat cells; queue resource rows stay above banner.
- E terminal-1280-1.25-day.png: complete round8 victory card, five allies active/one dead and six opponents dead; counts and both actions fit.
- E terminal-1280-1.25-night.png: same contained result at night, readable counts/actions.

## First-look three, against the references

1. **Less visual priority for bodies in overview.** E casualty's group around x565–721/y300–385 is small beside large terrain/HUD areas, unlike the closer R melee/mill examples. Score2 hierarchy polish: full-field fit is the required result; field cropping/body shrinking is not a fix.
2. **Letters carry overview identity.** E overview requires marker→queue portrait/inspection reading rather than direct species/equipment recognition. The recorded parent contract amendment permits scale-aware identification, and actual eval5 targeting establishes correct identity/cell linkage. This accepted representation difference is not anatomy or invented lore. Cross-reference cost remains polish2.
3. **Cooler, broader flat panels.** E/D panels occupy more space and use cooler slate than the compact warmer reference HUD. Muted slate/soot/umber/ochre and cream remain coherent. This is value/hierarchy polish2, not a different art family or material obstruction.

## Full absolute scores

0 broken/different style;1 clear player-visible gap;2 polish remains;3 same artist/family. Overview body criteria concern the actual art and corresponding existing-art portraits, not anatomy inferred from letters. Close evidence includes the new diagnostic and ordinary E A-selects-A plus attributable unchanged close comparisons.

| Criterion                  | Day overview | Night overview | Close day / night | Reference comparison and region                                                                                                                                                                                                                                                                                                |
| -------------------------- | ------------ | -------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Silhouette and proportions | 2            | 2              | 2 / 2             | Unit-C and R melee versus D central archer/polearms, E sword fighter and reused equal-height shield comparison: adult ratios, credible equipment silhouettes, no toy/hero form.                                                                                                                                                |
| Pose and gesture           | 2            | 2              | 2 / 2             | Unit-C compact guard versus E sword fighter and D archer/polearms: weight/guard read plausibly in still poses; no malformed reach established.                                                                                                                                                                                 |
| Rendering language         | 2            | 2              | 2 / 2             | Unit-C/place versus D archer-detail body/folds and creature fur, reused comparison, E ruined mill: interior ink, irregular contours and strong dark masses remain. Labelled crop enlargement is not native high-resolution proof.                                                                                              |
| Value and palette          | 2            | 2              | 2 / 2             | R day/night versus D night pairs and E night opening/casualty: world figures darken with soil; identifiers/HUD remain legible; no luminous sticker bodies. Terrain/panel emphasis is polish.                                                                                                                                   |
| Materials and wear         | 2            | 2              | 2 / 2             | Unit-C worn shield/cloth and ruined-place timber/stone versus E sword/mill, D polearms and reused comparison: credible rough surfaces, no glossy/pristine replacement.                                                                                                                                                         |
| Props and lore             | 2            | 2              | 2 / 2             | R mill/Unit-C versus D bow/spear/halberd and E shield/sword: plausible gear; ruined wheel/building identity retained. Letters are UI identifiers, not invented faction symbols. Exact metres NOT_MEASURED.                                                                                                                     |
| Scene integration          | 2            | 2              | 2 / 2             | E native125 opening/casualty fits participants between bands; A/actor/queue distinction is supported by actual journey. D close/detail on/off preserves opaque archer/bow/legs, polearms and paws; transparent margins expose terrain naturally. New height0/1/2 and genuine threat cases complement reused crowd/hover cases. |
| Motion, when in scope      | N/A          | N/A            | N/A               | No clip/animation production in #227. Stills and command receipts do not prove foot/grip continuity; animation is not accepted here.                                                                                                                                                                                           |

Every applicable criterion is≥2; none is0 in close view. No concrete opaque-body layer crossing or rectangular transparency-mask defect is reproduced in these inspected cases. There is no outstanding mandatory input blocker for this bounded slice: the two specific missing inputs in visual5 are now supplied. Distinct hovered-route coverage remains explicitly unclaimed below.

## Visual5 F1 readback and diagnostic boundaries

**F1 closed, scene integration2.** This conclusion uses appearance plus provenance, not the evaluator's personal conclusion. D initial close pairs place the selected archer at6,5, spear5,5, halberd7,5 and creature6,6. The larger D archer-detail pairs make waist/bow/legs and transparent margins directly inspectable. Selected ground edges/fills and actual red arrow do not visibly cross opaque body/weapon pixels. Halberd selection/reach plus threatened archer coexist in D selection-reach-threat; both remain grounded when overlays are removed. No solution by changing body size/material/depth is involved.

Completed eval-6-layers.md attributes this to ordinary editor Export→valid edited setup Import→Start using existing profiles/map/seed. Archer tile height1 and neighbouring halberd tile height2 give feet0.28/0.56; spear/creature stay0. This is a source-grounded reconstruction, **not** the identical archived intercepted terminal/R5 screenshot. Current fresh pools, current map/art/HUD, R1/R2 state, camera and simultaneous neighbouring heights differ from the archived one-height-at-a-time sweep. The request explicitly permits this attributable recreation; no exact historic screenshot claim is needed or made.

The all-off comparison is genuinely broader than ordinary grid toggle: tactical-grid contains coloured cell borders/rings;165 cell-fill candidates include current movement/reach/shot/selection/target washes; threat pairs also hide actual threat-shaft:opponent-5 and threat-head:opponent-5. Only enabled members render. No separate actor-foot-ring/path:/preview:/ring: mesh existed in the sampled scene. HTML markers, entity outlines, resource strips, natural contact shadows, terrain and HUD/world feedback text remain; the C HTML identifier ring in overview is not a residual ground hex. A missing optional mesh name is not reported tested.

Evaluator records all11 pairs with equal figure/material/texture/camera/HUD before/off invariants, exact visibility restoration, unchanged revision and0combatPOST. Texture samples include both opaque interiors and transparent borders; material alpha1 alone is not used as proof that every texture pixel is opaque. Pixel inspection around bow/shafts/paws/margins shows natural ground rather than rectangular blank regions. This is finite visual evidence, not exhaustive antialias-pixel certification.

Six real waits advance4→5→6→9→13→14→18 and produce the actual creature→archer threat27–37 at6,5. Pairs are passive at4 or18; final normal reload after restoration reads18 again,0POST. Diagnostics change only temporary ground visibility. They are not ordinary player-facing all-off controls and are not a second completed fight. Eval5's continuous ordinary victory/input acceptance remains the gameplay evidence.

## Remaining findings and minimum fixes

No material visual defect is established for this #227 result. The following remain concrete polish observations, not acceptance blockers:

- **Scene hierarchy/value2:** E casualty central cluster versus broad terrain/panels. Impact: attention must shift from tiny world art to identifiers. Minimum **tuning**, if polishing later: reduce competing terrain/detail emphasis while retaining full-field fit and current readable controls; no new assets/body shrink.
- **Identity association2:** E opening/casualty markers require queue/inspection cross-reference compared with R mill's direct silhouettes. Minimum **tuning**: preserve identical marker/queue/inspection identifiers and explicit hover/selected linkage; do not enlarge/displace cards into another collision. The representation itself is authorized and actual targeting succeeds.
- **Close composition2:** D archer-detail upper creature partly lies beneath HUD at deliberate wheel-in; E ordinary A view keeps its inspected fighter and imminent creature visible, and overview restores full field. Minimum **tuning** if revising focus: place the actor/relevant threat pair within measured usable opening. This is not a requirement to fit all figures at close zoom, nor a reproduced overview/input obstruction.

## History and convergence

Visual2 integration1 correctly rejected threat-banner concealment of overview portraits/initiative. Current measured top/field/dock layout and grounded letter identifiers are the technique-level change; newly reopened E frames do not reproduce those collisions. Eval4 A→J after retained death remains historical failure; eval5 actual ten-target selection/A→A and bounded scrolling card close it on current source. Visual5's observed2 did not grant acceptance: its F1 required new evidence. That evidence now exists and is personally inspected; visual5 itself is left untouched. Stalled visual3/4 and unfinished visual6 attempts contribute no approval.

No current criterion stays≤1. If integration recurs at≤1, parameter tuning is not converging: use occupied-space layout/non-overlapping ground-linked identification for obstruction, or correct the actual renderer ordering/masking technique for a reproduced opaque-body crossing. Do not respond by shrinking figures or brightening them. Here the approach change was controlled, attributable rendering evidence, not another offset or ordinary grid-toggle screenshot.

## Reused actual play and finite limits

- Eval5, read in visual5, owns the ordinary continuous move4→5, wait5→6, attack25→32, retained wolf death33 and real threat75; ten survivor selections and scroll/log/inspection75→75 with0POST; explicit wait75→76; actual round8 victory149, five allies active/one dead/six opponents dead. Current E terminal images agree. No reset/fabricated terminal substitutes for it.
- Eval5 owns genuine Chrome100/125 readback, CSS1024×640 at1280×800/native125, eight casualty geometry/card combinations, keyboard/pointer scrolling, separate commander skills/tooltips and actual A→A. Eval4's all12 opening keyboard/pointer sweep, navigation/resize/wheel and layer cases are reused only for unchanged paths, with their original limits. This critic performed no pointer journey.
- **NOT_RUN:** distinct hovered route/path on/off pair (the attempted candidate was outside usable close view; no hover occurred and pathRow was null), exhaustive overlay/transparent-border/height/zoom combinations, every skill execution, other outcomes, full new fight/native125 matrix in eval6, animation continuity. Genuine threat pairs do not retroactively prove a route path; they cover the actual threat branch. These limits do not recreate either missing visual5 F1 input.
- Height2 is demonstrated only in the custom diagnostic, not retroactively on eval5's default map. No claim of legal traversal across every raised tile, campaign state or identical historical camera/pools.
- **NOT_MEASURED:** numeric contrast, exact prop metres, sustained FPS, capacity, balance and enjoyment. These optional measurements do not withhold the completed visual verdict.
- **NOT_RUN by critic:** browser/services/tests/build/validator/CI. No score derives from validator8of8 or a build. No source/assets/shared-doc/Git/remote/Orca/agent writes; sole write is this report. Parent owns integration, CI/validator/publication and any separately authorized merge.
