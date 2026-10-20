VERDICT: REWORK 94c723c2ee56ed1a663711c14ff6b20135ff3bea

# Independent absolute visual critique — #227, round 2

Visual result: REJECT. Scene integration scores 1 because an announced-attack
panel obscures overview participants and close-view initiative resources.
2026-10-20. Report completed after host recovery from the surviving frozen packet;
the current uncommitted source belongs to another writer and is **not reviewed**.

## Identity, method and scope

- Frozen web source: `94c723c2ee56ed1a663711c14ff6b20135ff3bea`.
  Integrated capture checkout: `87b3d02155acec78690b574951a14ace3072a884`.
  These identify this image review, not the checkout's present source.
- E below means `.orca/uix-overview-zoom/eval3-shots/`; R means
  `assets/art/combat/stage1-2026-10-09/`.
- Personally opened the six references and the images individually listed below.
  Initial scores were recorded before reading `visual-1.md`, the contract/amendment,
  author change descriptions or `eval-3.md`. Final inventory and completed eval-3,
  including its final receipt, were read before this verdict. Sidecar/author
  confidence does not determine these scores.
- Read the supplied AGENTS instructions, `docs/engineering/VISUAL_CRITIQUE.md`
  and the developer_instructions in `.codex/agents/warwrit_visual_critic.toml`;
  retained the configured model. No agents, Orca, browser, runtime, tests, source,
  shared-document, asset, memory, commit or remote writes. Only this report written.
- Scope: full-field overview and minimum coherent controls at physical
  1440×900/1280×800, Chrome native 100/125%, day/night, associated close views and
  real crowded/terminal states. This does not accept full M1 or the UI epic.
- Runtime provenance and command results are independently reported by eval-3;
  this critic did not rerun them. Its final readback associates ordinary loaded
  modules with the frozen web source and says the integrated web diff was empty.
  Intercepted author `shots-rework-1/` images are excluded from runtime acceptance.

## Per-image observations

Each following image was personally viewed. Observations describe pixels, not
successful inputs. Coordinates elsewhere refer to original image pixels.

### References

- `assets/art/m1/style/unit-c-ink.png`: adult shield fighter, compact weighted guard,
  quilted interior ink lines, worn wood/leather/cloth, restrained earth colours.
- `assets/art/m1/places/staraya-melnitsa.png`: collapsed roof and broken timber,
  weathered stone/wheel, rough riverbank, irregular contours and slate/ochre dusk.
- R`ui-reference-day.png`: distinct grounded figures on the mill clearing, warm
  ground overlays and separately readable bottom actions.
- R`ui-reference-night.png`: darker environment retains figure silhouettes and
  legible target cells without luminous bodies.
- R`ui-reference-melee.png`: fighter, wolf and undead remain distinct in contact;
  equipment and foot-level selected hexes remain visible.
- R`ui-reference-mill.png`: ruined mill anchors the clearing; infantry, polearms
  and large creature remain separately identifiable.

### Fresh openings and overview matrix

- E`initial-1440-100-day.png`: twelve portrait markers over miniature grounded
  figures; selected archer amber; command and skill lanes separate.
- E`initial-1280-100-day.png`: same complete participant set in a smaller opening;
  short leaders and visible feet sit below portrait cards.
- E`initial-1440-125-day.png`: enlarged HUD and portraits; full group between bands;
  command labels and ability have separate space.
- E`initial-1280-125-day.png`: twelve tightly packed portrait cards, some only a
  narrow gap apart; small ground figures are secondary to those cards.
- E`overview-1440-100-day.png`: same broad field presentation, mill upper left,
  separate utilities, no obvious command/skill collision.
- E`overview-1440-100-night.png`: darker ground and bodies; portrait images retain
  class identification on their dark backgrounds.
- E`overview-1280-100-day.png`: participants visible across the clearing; large
  surrounding terrain area and a clipped queue continuation behind its arrow.
- E`overview-1280-100-night.png`: same arrangement, subdued terrain; portrait cards
  separate enemies from the similarly dark ground.
- E`overview-1440-125-day.png`: enlarged portraits and upper queue; thin foot links
  make the represented ground positions visible between cards.
- E`overview-1440-125-night.png`: dark scene, stable readable HUD and portraits;
  no glowing in-world figures.
- E`overview-1280-125-day.png`: compact portrait cluster above a larger desk;
  figures themselves are very small, but equipment/species read in portraits.
- E`overview-1280-125-night.png`: same compact cluster, creature portraits remain
  distinguishable; ground association is less immediate than in the references.
- E`settled-resize-1440-100.png`: broad group, all portrait cards visible, mill
  partly beneath the top queue; no overlapping command labels.
- E`settled-resize-1280-100.png`: cards/feet visibly occupy a different settled
  arrangement from the explicit overview; controls remain separate.
- E`settled-resize-1440-125.png`: enlarged controls and portrait cards with distinct
  utility lane; group stays above the desk.
- E`settled-resize-1280-125.png`: denser staggered cards with diagonal foot links;
  lower command/ability groups remain distinct.
- E`extreme-out-1440-100.png`: overview-scale portrait field, complete visible
  participant set, no extra geometric inference from the still.
- E`extreme-out-1280-100.png`: same compact overview class markers and separate desk.
- E`extreme-out-1440-125.png`: enlarged HUD and portrait field; body scale remains
  secondary to marker scale.
- E`extreme-out-1280-125.png`: smallest field presentation between enlarged bands;
  no repeated retreat/ability label collision visible.
- E`chrome100-setting.png`: Chrome Appearance page visibly displays Page zoom100%.
- E`chrome125-setting.png`: enlarged Chrome Appearance page; zoom dropdown is below
  the visible crop, so this image alone does not prove125%.

### Inspection, close views and layers

- E`inspect-human-1-100-day.png`: shield fighter and spear fighter at useful size;
  selected ground behind the shield fighter, readable right inspection card.
- E`inspect-human-3-100-day.png`: archer and shield fighter retain ink detail and
  grounded feet; no ground line visibly crosses their opaque bodies.
- E`inspect-human-5-100-day.png`: halberd silhouette/shaft readable over selected
  ground; separate inspection panel and command desk.
- E`inspect-opponent-1-100-day.png`: wolf on amber ground, second wolf below/right,
  readable opponent card and movement forecast at left.
- E`inspect-opponent-5-100-day.png`: large creature readable in central cell;
  inspection title breaks inside “Мельничная” beside its portrait.
- E`archer-day-localgrid-125.png`: archer torso/bow/feet in front of local grid;
  separate foot strips and broad translucent desk.
- E`archer-day-fullgrid-125.png`: additional outer grid; same opaque body remains
  visually in front of ground lines.
- E`archer-night-localgrid-125.png`: coherently darkened archer remains readable
  on amber cell without a bright sticker silhouette.
- E`archer-night-fullgrid-125.png`: outer grid returns; bow/body/feet remain legible.
- E`long-day-localgrid-125.png`: halberd fighter and long shaft remain distinct;
  inspection card does not cover the focused figure.
- E`long-day-fullgrid-125.png`: outer grid added without a visible opaque-shaft or
  body crossing.
- E`long-night-localgrid-125.png`: muted polearm/body retain a readable guard and
  selected-ground separation.
- E`long-night-fullgrid-125.png`: darker ground with outer grid; shaft and feet
  stay in front of the inspected ground treatment.
- E`large-day-localgrid-125.png`: creature hands/body cover selected cell cleanly;
  inspection heading again splits “Мельничная”.
- E`large-day-fullgrid-125.png`: extra outer grid; no visible hex across opaque
  hands or torso, no rectangular sprite mask established.
- E`large-night-localgrid-125.png`: dark creature remains recognisable; subdued
  fur/shadow mass and distinct foot strips.
- E`large-night-fullgrid-125.png`: outer grid retained behind creature; no visible
  ground line through its opaque body.
- E`height1-day-localgrid-125.png`: wolf above a stepped bank with another ground
  level below; paws meet the selected ground.
- E`height1-day-fullgrid-125.png`: outer cells visible around bank; selected wolf
  and inspection remain distinct.
- E`height1-night-localgrid-125.png`: wolf darkens with scene but retains outline
  against amber ground; bank remains readable.
- E`height1-night-fullgrid-125.png`: extended grid behind wolf and bank; no obvious
  opaque-body crossing.
- E`initiative-hover-125.png`: close archer and adjacent shield fighter; queue,
  local grid and desk visible, no successful hover inferred from the filename.
- E`home-125.png`: overview with left movement-cost card; portraits separate
  classes, command/ability lanes remain readable.
- E`keyboard-portrait-125.png`: shield fighter focused with right inspection;
  complete central body and foot strips visible.
- E`menu-125.png`: readable combat menu covers part of the right inspection area;
  explicit popover, with the focused central figure still visible.
- E`move-hover-125.png`: amber destination beside archer and1AP/4stamina forecast;
  figure remains on its earlier cell in this still.
- E`manual-move-125.png`: step feedback, archer in changed formation, AP3/4 and
  stamina96 visible; execution/revision comes from eval-3.
- E`manual-attack-125.png`: attack/damage feedback, injured wolf and commander;
  left preview and command tooltip overlap each other but command buttons remain visible.

### Crowded states, threat and overlays

- E`contact-overview-125.png`: portraits arranged in a dense staggered block;
  leaders descend amongst/behind adjacent cards, obscuring some ground associations.
- E`crowd-selected-wolf-day-localgrid-125.png`: wolf selected beside shield fighter;
  movement forecast and right wolf card, ground behind opaque bodies.
- E`crowd-selected-wolf-day-fullgrid-125.png`: same participants with outer grid;
  no visible grid across the inspected wolf or shield fighter.
- E`crowd-selected-wolf-night-localgrid-125.png`: dark contact group remains legible;
  focused wolf separates from amber ground.
- E`crowd-selected-wolf-night-fullgrid-125.png`: extended grid retains that separation;
  no obvious rectangular sprite mask.
- E`crowd-hover-ally-shot-target-125.png`: selected wolf plus readable ally card,
  spear/shield fighters and ground cells; still does not prove pointer linkage.
- E`dense-overview-125-day.png`: central announced-attack banner covers the top row
  of portrait markers, directly concealing participant images and links.
- E`dense-overview-100-day.png`: same banner partly covers upper portrait row;
  some figures remain visible below, but the overview loses complete identification.
- E`dense-overview-100-night.png`: same participant obstruction under night grade.
- E`dense-close-100-day.png`: readable shield fighter, beast and polearms on red
  threatened ground; banner overlaps lower initiative information.
- E`dense-close-100-night.png`: same overlap; muted figures retain ink silhouettes
  and remain in front of inspected ground fills.
- E`dense-threat-day-localgrid-125.png`: threat panel overlaps queue resource rows;
  shield fighter/beast readable below, red threat arrow at ground level.
- E`dense-threat-day-fullgrid-125.png`: same banner collision; taller left movement
  forecast also covers most of the actor-card heading/portrait area.
- E`dense-threat-night-localgrid-125.png`: same HUD collisions; night bodies remain
  separate from highlighted cells.
- E`dense-threat-night-fullgrid-125.png`: extended grid; no visible opaque-body
  crossing, but threat/queue and forecast/actor-card overlap persists.
- E`dense-portrait-hover-125.png`: left ally tooltip and readable selected actor;
  central threat banner still covers lower queue information.
- E`tooltip-1-125.png`: commander skill tooltip readable above actor card;
  commands and two vertically stacked skills remain separate.
- E`tooltip-2-125.png`: attack tooltip at left, distinct command buttons and costs.
- E`tooltip-3-125.png`: movement tooltip at left; no command/skill text collision.
- E`tooltip-4-125.png`: defence tooltip above actor card; command labels readable.
- E`tooltip-5-125.png`: End-turn tooltip readable at left; separate hourglass control.
- E`tooltip-6-125.png`: retreat tooltip readable at left; separate retreat/skill icons.
- E`log-open-125.png`: expanded translucent log covers actor card and most commands;
  log summary remains visible at the bottom for closing it.

### Comparison, recovery and terminal

- E`unit-c-comparison.png`: reference and integrated shield fighter at384/96px body
  heights; enlarged game crop is pixelated but retains adult ratios, ink and wear.
- E`contact-sheet.png`: derivative overview/close/layer montage; confirms packet
  breadth, not a substitute for the individually opened originals.
- E`recovery-new-default-125.png`: oversized-window recovery capture with large
  portraits and clipped lower desk; not target-viewport matrix evidence.
- E`first-casualty-125.png`: oversized capture; threat banner covers upper bodies
  and queue rows, casualty/health feedback visible below.
- E`midfight-125.png`: oversized capture of same threatened group, large banner
  and damage feedback; does not establish requested viewport fit.
- E`terminal-125.png`: oversized victory panel clipped at lower edge; superseded
  for target-size acceptance by the eight explicitly sized captures below.
- E`terminal-1440-1-day.png`: complete central victory card, counts and two buttons;
  queue/dock absent, ruined mill remains visible.
- E`terminal-1440-1-night.png`: same complete result card, darker integrated scene.
- E`terminal-1280-1-day.png`: complete readable victory card and buttons within screen.
- E`terminal-1280-1-night.png`: same contained panel under night grade.
- E`terminal-1440-1.25-day.png`: larger complete result card with readable counts
  and buttons; no lower-edge clipping.
- E`terminal-1440-1.25-night.png`: same contained native125 panel, dark scene.
- E`terminal-1280-1.25-day.png`: complete result card and both actions at smallest
  target viewport; log summary accessible at bottom.
- E`terminal-1280-1.25-night.png`: same contained result card, readable at night.
- E`terminal-log-100.png`: expanded log intentionally covers much of the result
  card/left button; disclosure summary remains visible for closing.

Unopened supplemental originals: anchor before/after pairs, tooltip0,
manual-endturn100 and final initiative-return/forecast stills. Their successful
input claims are attributed solely to eval-3, not to personal pixel inspection.

## First-look three and initial scoring

Before contract/prior critique/evaluator text, the three immediate differences
were: (1) opaque portrait cards dominate tiny field silhouettes; (2) large HUD
bands and broad terrain give the battle less visual priority than R day/mill;
(3) the mill-beast inspection title breaks inside a word.

Initial absolute art scores: silhouette2, pose2, rendering2, palette2,
materials2, props2, scene integration1, motionN/A. Additional provisional
layout observations: overview readability1, command lanes2, inspection typography1.
These were first-look observations, not a final judgment of the permitted
overview representation. The subsequently read parent amendment explicitly
authorizes scale-aware existing-art identification and full-field fit. Thus a
portrait is UI, not an incorrectly grounded world creature; empty map margins
are not themselves a defect. Final findings retain the concrete association and
typography issues below, with typography classified as polish rather than a
second material rejection. The independently viewed dense banner supplies the
decisive scene-integration failure. No author/evaluator ACCEPT substitutes for it.

## Absolute rubric — final scores

0 broken/different style;1 clear player-visible gap;2 only polish;3 same artist
and family. Scores compare the current packet with the named references, not
with round1. Overview includes real dense/threat states, not just initial setup.

| Criterion                  | Day overview | Night overview | Close day/night | Reference and precise visible basis                                                                                                                                                                                                                                              |
| -------------------------- | ------------ | -------------- | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Silhouette and proportions | 2            | 2              | 2 / 2           | Unit-C and R melee/mill: inspection shield/spear/halberd figures retain adult ratios; creature identities read in overview portraits. Portrait-frame geometry is UI, not body anatomy.                                                                                           |
| Pose and gesture           | 2            | 2              | 2 / 2           | Unit-C compact guard matches shield fighter in inspect-human1 and archer/long layer frames; no visible malformed reach. Still poses only.                                                                                                                                        |
| Rendering language         | 2            | 2              | 2 / 2           | Unit-C/place interior ink, worn folds and shadow masses persist in unit-c-comparison, long/large close frames and ruined mill; magnified game pixels are not proof of missing ink.                                                                                               |
| Value and palette          | 2            | 2              | 2 / 2           | R day/night/mill: earth/slate/soot family retained; overview portraits provide separation from busy dark soil; close night figures darken with the scene rather than glow. Terrain competition remains polish.                                                                   |
| Materials and wear         | 2            | 2              | 2 / 2           | Unit-C worn shield/cloth and place's damaged timber/stone remain credible in inspection, close layers and terminal mill scene; no pristine/glossy replacement established.                                                                                                       |
| Props and lore             | 2            | 2              | 2 / 2           | Unit-C/R mill: plausible shield, bow and long shaft silhouettes; collapsed roof/wheel retain ruined-mill identity; no new emblem/lore visible. Exact metre dimensions not measured by critic.                                                                                    |
| Scene integration          | **1**        | **1**          | **1 / 1**       | R day/night/melee/mill show identifiable participants and separately legible HUD. Dense overview threat panel conceals portrait images; dense close day/night panel covers queue resource rows (F1). Inspected ground/opaque-body layering itself shows no reproduced violation. |
| Motion                     | N/A          | N/A            | N/A             | No animation/clip production in this camera/UI slice; stills and commands do not establish animation quality.                                                                                                                                                                    |

Close score1 is HUD integration, not rejection of the inspected body artwork.
Terminal card and ordinary command/skill spacing score2 within this scope.
Final overall visual result is REJECT because scene integration is below2.

## Findings ordered by impact

### F1 — Material: announced threat conceals participants and initiative data

**Scene integration1; REWORK.** E`dense-overview-125-day.png`, x414–865/y165–261:
the dark announced-attack panel covers the upper row of field portrait images
and their foot links. E`dense-overview-100-day.png` and its night pair,
x459–820/y132–209: the same panel overlaps upper markers. E`dense-threat-day-fullgrid-125.png`
and both night variants, x414–865/y165–215: it also covers lower initiative
resource rows. R day/night/mill keep participants and their HUD independently
readable. Whole-field geometric inclusion does not make these hidden images
visually available.

Impact: the overview cannot continuously communicate all participant identities
in an actual announced-attack state; queue health/armour/morale information is
partly unreadable in close view. This is visible obstruction. **No click
interception is claimed:** eval-3 reports `pointer-events:none` on the banner and
sampled controls hitting their own buttons.

Smallest correction — **approach change at the layout boundary:** make the existing
threat panel part of measured HUD space and keep it outside initiative resources;
reserve its occupied region when fitting field/portraits. Reuse existing content,
camera and markers. Do not shrink the fighters, brighten them or add new art.
Recheck the same real round4/revision81 state at both zooms and day/night,
including the close queue. Eval-3 independently reproduces this state and names
the threat strip plus camera-opening boundary; this report did not inspect
current source and does not review another writer's fix.

### F2 — Overview ground association and visual hierarchy need polish

**Scene integration2 for the representation alone.** E`contact-overview-125.png`,
x560–855/y175–350, and E`initial-1280-125-day.png`, x460–955/y175–350:
opaque, displaced cards form a tight block; several leader segments/ground
figures are concealed amongst neighbouring cards. Unlike R mill's direct
body-to-foot reading, identifying class and locating its exact cell are two
separate visual steps. The cards nevertheless retain distinct readable images;
eval-3 reports individual inspection/focus. This is not a proven missing target
or reason to ban the authorized marker technique.

Smallest correction — **tuning:** preserve a visible ground endpoint for each
displaced card and keep leaders legible behind cards; make selected/hovered
card-to-cell association explicit. Avoid additional card enlargement. Broad
terrain and HUD proportions remain hierarchy concerns, not a request to crop
the mandated full field or a measured enjoyment/performance failure.

### F3 — Inspection heading splits a word

**Scene integration/typographic polish2.** E`inspect-opponent-5-100-day.png`,
right card x1055–1195/y555–600; E`large-day-localgrid-125.png` and siblings,
x1008–1168/y495–550: “Мельничная” breaks before its final “я”, unlike the intact
labels in R mill. The name remains readable and does not cover another control.
Smallest correction — **tuning:** give the title a full-width row or sufficient
width beside the portrait; wrap between words without reducing text size.

### Explicit overlays — observation, not a second material failure

E`log-open-125.png`, x33–844/y328–767, covers actor/actions;
E`terminal-log-100.png`, x27–676/y335–774, covers result data/left action.
This coverage is real. Eval-3 documents deliberate open/close through the log
summary, which remains visible in both images. Simultaneous control visibility
while this explicit overlay is open is not established as a required interaction
contract, and failed targeting was not reproduced. Therefore these are not
silently counted as another input failure. A bounded/scrolling log that preserves
more task context would be polish; the menu is likewise an explicit popover.

The tall movement forecast in dense-threat full-grid/day and night covers much
of the left actor card. It is an additional HUD hierarchy/occlusion observation;
the same actor and resources remain available in the queue. No separate failed
command or second material blocker is inferred from that still alone.

## Convergence

Round1 scene integration was1; round2 remains1. Parameter tuning is not
converging for the whole scene/HUD invariant. The required next technique change
is **one measured occupied-space layout for initiative, announced threats and
the field opening**, rather than offsets applied only to the ordinary desk or
smaller world figures. The portrait technique already changes class recognition;
its gain does not reserve the threat banner's space.

Round1 value/palette1 rises to2 because existing-art portraits now separate
overview identities and the current close-night figures remain readable.
Round1 native125 retreat/ability and utility/queue collisions are not reproduced
in the current initial/tooltip matrix. Preserve those gains. Prior critique is
used for this convergence note only, not as the absolute score oracle.

## Evaluator-owned actual journey and finite limits

- Completed `eval-3.md` reports fresh ordinary runtime, loaded-module inspection,
  actual Chrome zoom readback (corrected settings text owns125% proof), full
  165-ground/12-unit/12-target initial fit in all four viewport/zoom combinations,
  all12 portrait selections, Home/button/current-actor return, keyboard, drag,
  WASD, settled resize and wheel anchoring. These are evaluator evidence, not
  actions performed by this critic or inferred from filenames.
- Actual manual move revision4→5, End turn5→6 and attack25→32 including existing
  reactions were reported; sampled passive intervals had0combatPOST/unchanged
  revision. A separate fresh ordinary default fight reached human victory,
  round8/revision151,5allies active/1dead and6opponents dead; terminal navigation
  remained151→151 with0combatPOST. Readable terminal matrix supports appearance,
  not every other outcome or mechanics acceptance.
- Personally inspected archer/long weapon/large creature/height1 day/night
  local/full-grid pairs, actual crowded contact, dense threat and portrait-hover
  states. No concrete grid/fill/arrow through an inspected opaque body, shield,
  shaft or paw, or rectangular transparency mask, was established. This is
  finite visual evidence, not a proof of every border pixel or overlay variant.
- **Applicable layer limits:** the actual default map has height0/1 and no
  height2 case; none was fabricated. No exposed all-overlays-off control exists,
  so local/full-grid pairs retain selection/movement/shot/threat treatments and
  are not clean overlays-off comparisons. The exact historic rejected archer
  waist/leg state was not supplied/recreated. These limit exhaustive combat-layer
  acceptance; they are not invented regressions of this overview/control change.
  Missing motion proof is N/A here, not a failure of another asset type.
- Equal-height384/96px comparison personally inspected. Its upper game row is
  an enlarged approximately106px integrated screenshot crop, not a native384px
  render. No independent high-resolution close or exact overview-marker-sized
  comparison is claimed. Existing actual close/day/night images support the
  bounded scores; they do not accept new character assets or animation work.
- Remaining NOT_RUN/NOT_MEASURED: other terminal outcomes, exhaustive skills,
  complete historic ground-layer matrix, numeric contrast, sustained FPS,
  balance, capacity and enjoyment. No current-source fix, publication, merge,
  deployment or owner acceptance is implied.
- No owner-taste question is needed to correct F1. Parent owns integration,
  shared documentation and delivery. This report's only material blocker is F1;
  scene integration must be rescored after that correction on its own fresh
  source packet. The present verdict remains tied exclusively to frozen web
  `94c723c2ee56ed1a663711c14ff6b20135ff3bea`, captured at integrated
  `87b3d02155acec78690b574951a14ace3072a884`.
