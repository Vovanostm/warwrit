VERDICT: ACCEPT f589f94ce16f0f307f460f35c952777aa79bfaf1

| Rubric criterion           | Game scale | Close | Image/region evidence and applicability                                                                                                                                                                                                                                                                                                                                                                      |
| -------------------------- | ---------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Silhouette and proportions | N/A        | N/A   | Static tactical bands, no new body asset. Existing figures are context, not character-production acceptance.                                                                                                                                                                                                                                                                                                 |
| Pose and gesture           | N/A        | N/A   | No pose or clip change.                                                                                                                                                                                                                                                                                                                                                                                      |
| Rendering language         | **2**      | **2** | R/sword-overview-native100-day-none-1440x900.png, outer movement area; R/sword-detail-native100-day-none.png, left/right ground; P/close-day.png against approved melee reference. Fine interrupted pale cores with dark edges leave earth texture visible. The regular diagonal rhythm remains a polish difference from the irregular ink of REF/unit and REF/place; it no longer presents broad pale bars. |
| Value and palette          | **2**      | **2** | All 24 R overview frames, especially native125 night achromatopsia 1366x768; E/sword-actual-overview-night.png and inspected CVD close frames. Patterned and unpatterned areas remain distinct without hue; ochre reach remains independent. Faint solid wash is P2 below.                                                                                                                                   |
| Materials and wear         | N/A        | N/A   | Nonphysical tactical annotation; no new cloth, metal, wood or terrain material. Weathered earth remains visible underneath.                                                                                                                                                                                                                                                                                  |
| Props and lore             | N/A        | N/A   | No new weapon, emblem, creature or narrative content.                                                                                                                                                                                                                                                                                                                                                        |
| Scene integration          | **2**      | **2** | E/{level,steps}-{overview,group}-{day-grid-off,night-grid-on}-{on,off}.png; bear shoulders and left polearm tip, plus native geometry/readback described below. Marks remain behind inspected opaque pixels, conform to raised ground, and preserve transparent borders. P3 is panel-backing polish.                                                                                                         |
| Motion                     | N/A        | N/A   | Static overlays; no animation clip in scope. A motion proof format is inapplicable here.                                                                                                                                                                                                                                                                                                                     |

Every applicable item is at least 2 at game scale, and none is 0 close. This is a bounded Tier V appearance verdict for #184, not publication, merge, gameplay-rule or full-M1 acceptance.

## Revision, inputs and scope

Entry HEAD: f589f94ce16f0f307f460f35c952777aa79bfaf1, branch codex/combat-affordability-184. Initial Git status was clean. Read full AGENTS.md, the complete critic developer_instructions, ART_LORE_POLICY and VISUAL_CRITIQUE; issue #184 body and comments from GitHub; both assigned contracts; previous visual-1.md; report.md including rework 2. Current-plan/changelog status were read for checkpoint awareness only. No source discovery or code-quality review was needed.

The final readiness file .orca/uix-affordability-bands/eval3-images-ready.json arrived during review and names this exact HEAD and source 5599c8f121b1a3665e7e3570459f9857906a3285. Its eight final overview/group pairs were opened individually. Read rework-2-readback.json, eval3-final-readback.json and both eval3 intersection logs. These are supplied native observations, not measurements executed by this critic. No evaluator verdict was used to set the visual scores.

Final checkout readback found HEAD 51cc05aff3273952b399fed9abee781bc1d393fa, advanced concurrently by a documentation checkpoint. Ordinary diff from the assigned frozen revision lists only CHANGELOG.md and docs/engineering/CURRENT_PLAN.md; this critic did not make that commit. The readiness-file capture revision and this verdict remain explicitly f589f94ce16f0f307f460f35c952777aa79bfaf1; acceptance is not silently retargeted to the later head.

Path keys:

- R = .orca/uix-affordability-bands/rework-2-shots/.
- E = .orca/uix-affordability-bands/eval3-shots/.
- P = .orca/uix-affordability-bands/visual2-proof/.
- REF/unit = assets/art/m1/style/unit-c-ink.png.
- REF/place = assets/art/m1/places/staraya-melnitsa.png.
- REF/ui-reference-_.png = assets/art/combat/stage1-2026-10-09/ui-reference-_.png.

Four P sheets juxtapose unchanged 1440x900 current/reference images at equal panel height: current left, approved UI reference right. The night close sheet uses the available night overview reference as palette context; the day close sheet uses the melee close reference for stroke/figure context. Full-size original images were separately inspected. Equal-body-height character-production proof is N/A to this overlay change. P crops are unscaled rectangular extracts of final E group pairs, with no retouching: level x240 y220 w600 h300; steps x240 y180 w600 h300. Earlier temporary crops from exploratory close pairs were replaced by these final-pair crops.

Old shots/, eval-shots/, rework-1-shots/ and visual-inputs/ are historical; their old ACCEPT/REWORK boundaries remain unchanged. This verdict uses current R and fresh E images. Some E filenames saying overview actually show close views, and some saying close show broad views; observations below describe visible framing, not filename assertions.

## First-look three against approved references

1. **P1, rendering language 2 — geometric diagonal rhythm.** R overview outer movement area and R detail ground: pale/dark interrupted strokes are more regular than the fine, irregular ink of REF/unit and REF/place. The binary patterned/unpatterned distinction is explicitly authorized by #184; the remaining difference is stroke rhythm polish, not a demand to remove accessible shape coding. Compared with the reference UI's similarly graphic hex lines and translucent washes, the current thin marks are compatible. Optional smallest change: vary the interruption rhythm within the existing treatment (tuning), preserving overview contrast. No blocking defect.
2. **P2, value/palette 2 — weak solid-wash/legend correspondence.** R/sword-overview-native100-day-none-1440x900.png, island around A versus lower cyan legend sample: the solid region reads mainly as slightly washed earth inside the ochre reach contour. REF/ui-reference-day.png has a more immediate wash-to-legend relationship. Pattern absence still clearly distinguishes the category, including monochrome. Optional smallest change: make the existing solid wash a little more recognizable against brown earth (tuning). This is polish, not a false server-classification finding.
3. **P3, scene integration 2 — ground texture visible through HUD backing.** R/sword-detail-native125-night-none.png and E/steps-group-night-grid-on-on.png, lower command panel: faint diagonal/contour traces remain visible behind the dark backing. REF UI panels are quieter and more uniform. Labels and icons remain legible; no input failure is inferred. Optional smallest change: increase the existing panel backing opacity (tuning), without changing the layout or figures.

The inherited fullscreen composition and smaller overview figures differ from the old UI references. They are not new #184 assets and are not grounds for a character/HUD redesign in this gate. No owner-taste question or art/lore exception is needed for the current scores.

## B1: final concrete layering evidence

The final E group frames show a genuine compact adjacent-cell group of 12 actors with two bears, a mill creature and long weapons. Separation between bodies alone is not intersection proof. B1 closes here because the final image regions and native projected geometry identify actual annotation/body intersections:

- Level: E/level-group-day-grid-off-on.png, left bear's upper shoulder/back near x551-626, y313-338, and left polearm tip near x370-385, y425-436. Hatch support approaches these silhouettes and disappears behind opaque fur/weapon; no readable stroke traverses them. The on/off group pair preserves the figures and HUD. Night/grid-on repeats the visible result.
- Steps: final E/steps-group-*-on.png show the raised hatch and ochre contour meeting the upper bear shoulders and long-weapon extremities. The ochre boundary is visibly interrupted by the bear body rather than drawn across its fur. P/steps-bear-weapon-on.png makes that junction inspectable. Day/grid-off and night/grid-on group pairs preserve the figures and HUD.
- Native intersection logs locate alpha >=200 sprite samples inside projected hatch/contour triangles, rather than testing rectangular sprite bounds alone: level opponent-3 bear 3057 sampled intersections and opponent-5 weapon 152; steps opponent-3 bear 5238, opponent-1 bear 4649, with smaller weapon intersections. These are sampled geometric-support counts, not counts of incorrectly drawn pixels; the shader can discard parts of a hatch strip. The steps log's exact coordinates belong to its close camera, not the later group framing. The visual verdict comes from the actual paired images.
- The fresh final readback records unchanged figures/HUD/camera for all eight readiness-file overview/group pairs, stable revision 0 and POST total 99 within each interval. It records ShaderMaterial ready, alpha blending, nonpickable group 0 and disableDepthWrite=true. This supports capture integrity, not exhaustive renderer correctness.
- Level and 0/1/2 setups are shown in supported-editor captures/readbacks; the raised battle visibly bends the hatch/contour over the terrain and displays Height +1 for the active actor. No fixture/source changes were requested by this critic.
- Transparent borders remain natural: no rectangular cutout or ground curtain is visible around the examined bears, polearms, archer or boots. The selected archer's ring remains below the bow/body/feet in the supplied current close contexts. The existing sword/spear close frames provide additional isolated checks, not a substitute for the group.

Two exploratory E steps-close pairs have figuresAndHudUnchanged=false in the retained readback; they are **not** used to certify the invariant. The final group pairs are true and fully frame the group above the HUD. No missing-capture blocker remains for this bounded visual assignment. No all-layout impossibility claim or exhaustive opaque-pixel comparison is made.

## Previous findings and convergence

Previous visual-1 rendering language was 1 on 06479a47. Current absolute comparison is 2: narrow interrupted strokes preserve terrain detail close up while retaining a visible night/monochrome pattern at overview. This is not a second consecutive <=1 result, so the mandatory technique-change rule is not triggered. No additional source rework is requested. Prior value/palette and panel-backing polish remains explicitly listed above; B1 is closed by fresh concrete intersection evidence, not by accepting the builder's earlier separated layout or the evaluator's conclusion.

## Viewed images: one observation per image

### Approved references

- REF/unit — adult compact shield fighter, dark quilt seams, irregular ink contours and worn wood/cloth.
- REF/place — ruined stone/timber mill, dark water, broken roofing, slate/umber earth and fine irregular ink texture.
- REF/ui-reference-day.png — ink fighters on an umber field, orange transparent hex wash and quiet dark action panel.
- REF/ui-reference-night.png — darker field and figures with legible orange ground markings and quiet dark panel.
- REF/ui-reference-melee.png — close shield fighter, wolf and undead; ground rings remain behind feet and limbs.
- REF/ui-reference-mill.png — twelve mill-field figures, weathered scenery, transparent orange hex area and compact legend.

### Current builder captures

- R/sword-overview-native100-day-none-1366x768.png — 1366x768, umber/slate day overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; ordinary HUD.
- R/sword-overview-native100-day-none-1440x900.png — 1440x900, umber/slate day overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; ordinary HUD.
- R/sword-overview-native100-day-none-1920x1080.png — 1920x1080, umber/slate day overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; ordinary HUD.
- R/sword-overview-native100-day-achromatopsia-1366x768.png — 1366x768, grey day overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; ordinary HUD.
- R/sword-overview-native100-day-achromatopsia-1440x900.png — 1440x900, grey day overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; ordinary HUD.
- R/sword-overview-native100-day-achromatopsia-1920x1080.png — 1920x1080, grey day overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; ordinary HUD.
- R/sword-overview-native100-night-none-1366x768.png — 1366x768, umber/slate night overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; ordinary HUD.
- R/sword-overview-native100-night-none-1440x900.png — 1440x900, umber/slate night overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; ordinary HUD.
- R/sword-overview-native100-night-none-1920x1080.png — 1920x1080, umber/slate night overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; ordinary HUD.
- R/sword-overview-native100-night-achromatopsia-1366x768.png — 1366x768, grey night overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; ordinary HUD.
- R/sword-overview-native100-night-achromatopsia-1440x900.png — 1440x900, grey night overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; ordinary HUD.
- R/sword-overview-native100-night-achromatopsia-1920x1080.png — 1920x1080, grey night overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; ordinary HUD.
- R/sword-overview-native125-day-none-1366x768.png — 1366x768, umber/slate day overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; enlarged HUD.
- R/sword-overview-native125-day-none-1440x900.png — 1440x900, umber/slate day overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; enlarged HUD.
- R/sword-overview-native125-day-none-1920x1080.png — 1920x1080, umber/slate day overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; enlarged HUD.
- R/sword-overview-native125-day-achromatopsia-1366x768.png — 1366x768, grey day overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; enlarged HUD.
- R/sword-overview-native125-day-achromatopsia-1440x900.png — 1440x900, grey day overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; enlarged HUD.
- R/sword-overview-native125-day-achromatopsia-1920x1080.png — 1920x1080, grey day overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; enlarged HUD.
- R/sword-overview-native125-night-none-1366x768.png — 1366x768, umber/slate night overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; enlarged HUD.
- R/sword-overview-native125-night-none-1440x900.png — 1440x900, umber/slate night overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; enlarged HUD.
- R/sword-overview-native125-night-none-1920x1080.png — 1920x1080, umber/slate night overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; enlarged HUD.
- R/sword-overview-native125-night-achromatopsia-1366x768.png — 1366x768, grey night overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; enlarged HUD.
- R/sword-overview-native125-night-achromatopsia-1440x900.png — 1440x900, grey night overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; enlarged HUD.
- R/sword-overview-native125-night-achromatopsia-1920x1080.png — 1920x1080, grey night overview; fine diagonal outer area remains separate from unpatterned inner island and ochre reach; enlarged HUD.
- R/sword-detail-native100-day-none.png — umber/slate day close fighter with clear shield/sword/boots; thin broken ground strokes remain outside the inner island; faint lines show through panel backing.
- R/sword-detail-native100-day-achromatopsia.png — grey day close fighter with clear shield/sword/boots; thin broken ground strokes remain outside the inner island; faint lines show through panel backing.
- R/sword-detail-native100-night-none.png — umber/slate night close fighter with clear shield/sword/boots; thin broken ground strokes remain outside the inner island; faint lines show through panel backing.
- R/sword-detail-native100-night-achromatopsia.png — grey night close fighter with clear shield/sword/boots; thin broken ground strokes remain outside the inner island; faint lines show through panel backing.
- R/sword-detail-native125-day-none.png — umber/slate day close fighter with clear shield/sword/boots; thin broken ground strokes remain outside the inner island; faint lines show through panel backing.
- R/sword-detail-native125-day-achromatopsia.png — grey day close fighter with clear shield/sword/boots; thin broken ground strokes remain outside the inner island; faint lines show through panel backing.
- R/sword-detail-native125-night-none.png — umber/slate night close fighter with clear shield/sword/boots; thin broken ground strokes remain outside the inner island; faint lines show through panel backing.
- R/sword-detail-native125-night-achromatopsia.png — grey night close fighter with clear shield/sword/boots; thin broken ground strokes remain outside the inner island; faint lines show through panel backing.
- R/crowd-level-overview-day-grid-off-on.png — compact distant level day group; hatches/contours visible around occupied-cell holes; this earlier layout alone does not establish B1 intersection.
- R/crowd-level-overview-day-grid-off-off.png — compact distant level day group; ground overlays absent, figures and HUD retained; this earlier layout alone does not establish B1 intersection.
- R/crowd-level-overview-night-grid-on-on.png — compact distant level night group; hatches/contours visible around occupied-cell holes; this earlier layout alone does not establish B1 intersection.
- R/crowd-level-overview-night-grid-on-off.png — compact distant level night group; ground overlays absent, figures and HUD retained; this earlier layout alone does not establish B1 intersection.
- R/crowd-level-group-day-grid-off-on.png — inspectable twelve-actor level day group; hatches/contours visible around occupied-cell holes; this earlier layout alone does not establish B1 intersection.
- R/crowd-level-group-day-grid-off-off.png — inspectable twelve-actor level day group; ground overlays absent, figures and HUD retained; this earlier layout alone does not establish B1 intersection.
- R/crowd-level-group-night-grid-on-on.png — inspectable twelve-actor level night group; hatches/contours visible around occupied-cell holes; this earlier layout alone does not establish B1 intersection.
- R/crowd-level-group-night-grid-on-off.png — inspectable twelve-actor level night group; ground overlays absent, figures and HUD retained; this earlier layout alone does not establish B1 intersection.
- R/crowd-steps-overview-day-grid-off-on.png — compact distant steps day group; hatches/contours visible around occupied-cell holes; this earlier layout alone does not establish B1 intersection.
- R/crowd-steps-overview-day-grid-off-off.png — compact distant steps day group; ground overlays absent, figures and HUD retained; this earlier layout alone does not establish B1 intersection.
- R/crowd-steps-overview-night-grid-on-on.png — compact distant steps night group; hatches/contours visible around occupied-cell holes; this earlier layout alone does not establish B1 intersection.
- R/crowd-steps-overview-night-grid-on-off.png — compact distant steps night group; ground overlays absent, figures and HUD retained; this earlier layout alone does not establish B1 intersection.
- R/crowd-steps-group-day-grid-off-on.png — inspectable twelve-actor steps day group; hatches/contours visible around occupied-cell holes; this earlier layout alone does not establish B1 intersection.
- R/crowd-steps-group-day-grid-off-off.png — inspectable twelve-actor steps day group; ground overlays absent, figures and HUD retained; this earlier layout alone does not establish B1 intersection.
- R/crowd-steps-group-night-grid-on-on.png — inspectable twelve-actor steps night group; hatches/contours visible around occupied-cell holes; this earlier layout alone does not establish B1 intersection.
- R/crowd-steps-group-night-grid-on-off.png — inspectable twelve-actor steps night group; ground overlays absent, figures and HUD retained; this earlier layout alone does not establish B1 intersection.
- R/native125-settings.png — Chrome Appearance page visibly shows Page zoom 125%.

### Fresh evaluator captures

- E/sword-overview-day-deuteranopia.png — despite filename, close sword/spear view in muted yellow/olive day; thin hatch and unpatterned island remain distinct.
- E/sword-overview-day-protanopia.png — despite filename, close sword/spear view in muted yellow/olive day; thin hatch and unpatterned island remain distinct.
- E/sword-overview-night-deuteranopia.png — despite filename, close sword/spear view in muted yellow/olive night; thin hatch and unpatterned island remain distinct.
- E/sword-overview-night-protanopia.png — despite filename, close sword/spear view in muted yellow/olive night; thin hatch and unpatterned island remain distinct.
- E/sword-actual-overview-day.png — true mill overview in day; patterned outer region, unpatterned island and three legend entries visible.
- E/sword-native125-day.png — enlarged HUD and compact mill overview in day; pattern remains visible.
- E/sword-native125-close-day.png — still a broad field view, with enlarged HUD and clear outer hatch; not used as close detail proof.
- E/sword-actual-overview-night.png — true mill overview in night; patterned outer region, unpatterned island and three legend entries visible.
- E/sword-native125-night.png — enlarged HUD and compact mill overview in night; pattern remains visible.
- E/sword-native125-close-night.png — still a broad field view, with enlarged HUD and clear outer hatch; not used as close detail proof.
- E/level-close-day-grid-off-on.png — inspectable day group with bears and polearms; ground hatch/contours visible, opaque figures remain clear.
- E/level-close-day-grid-off-off.png — inspectable day group with bears and polearms; ground absent, figure silhouettes retained.
- E/level-close-night-grid-on-on.png — inspectable night group with bears and polearms; ground hatch/contours visible, opaque figures remain clear.
- E/level-close-night-grid-on-off.png — inspectable night group with bears and polearms; ground absent, figure silhouettes retained.
- E/level-overview-day-grid-off-on.png — distant day group with bears and polearms; ground hatch/contours visible, opaque figures remain clear.
- E/level-overview-day-grid-off-off.png — distant day group with bears and polearms; ground absent, figure silhouettes retained.
- E/level-overview-night-grid-on-on.png — distant night group with bears and polearms; ground hatch/contours visible, opaque figures remain clear.
- E/level-overview-night-grid-on-off.png — distant night group with bears and polearms; ground absent, figure silhouettes retained.
- E/level-group-day-grid-off-on.png — inspectable day group with bears and polearms; ground hatch/contours visible, opaque figures remain clear.
- E/level-group-day-grid-off-off.png — inspectable day group with bears and polearms; ground absent, figure silhouettes retained.
- E/level-group-night-grid-on-on.png — inspectable night group with bears and polearms; ground hatch/contours visible, opaque figures remain clear.
- E/level-group-night-grid-on-off.png — inspectable night group with bears and polearms; ground absent, figure silhouettes retained.
- E/steps-close-day-grid-off-on.png — inspectable day group with bears and polearms; ground hatch/contours visible, opaque figures remain clear. Exploratory pair has failed unchanged readback and is excluded from invariant proof.
- E/steps-close-day-grid-off-off.png — inspectable day group with bears and polearms; ground absent, figure silhouettes retained. Exploratory pair has failed unchanged readback and is excluded from invariant proof.
- E/steps-close-night-grid-on-on.png — inspectable night group with bears and polearms; ground hatch/contours visible, opaque figures remain clear. Exploratory pair has failed unchanged readback and is excluded from invariant proof.
- E/steps-close-night-grid-on-off.png — inspectable night group with bears and polearms; ground absent, figure silhouettes retained. Exploratory pair has failed unchanged readback and is excluded from invariant proof.
- E/steps-overview-day-grid-off-on.png — distant day group with bears and polearms; ground hatch/contours visible, opaque figures remain clear.
- E/steps-overview-day-grid-off-off.png — distant day group with bears and polearms; ground absent, figure silhouettes retained.
- E/steps-overview-night-grid-on-on.png — distant night group with bears and polearms; ground hatch/contours visible, opaque figures remain clear.
- E/steps-overview-night-grid-on-off.png — distant night group with bears and polearms; ground absent, figure silhouettes retained.
- E/steps-group-day-grid-off-on.png — inspectable day group with bears and polearms; ground hatch/contours visible, opaque figures remain clear.
- E/steps-group-day-grid-off-off.png — inspectable day group with bears and polearms; ground absent, figure silhouettes retained.
- E/steps-group-night-grid-on-on.png — inspectable night group with bears and polearms; ground hatch/contours visible, opaque figures remain clear.
- E/steps-group-night-grid-on-off.png — inspectable night group with bears and polearms; ground absent, figure silhouettes retained.
- E/steps-editor.png — supported editor with compact roster, Height 2 selected and selected cell readout height 2.
- E/level-open-flank-editor.png — supported level editor, compact roster with an open left flank; selected cell height 0.
- E/sword-current-native125-detail-day.png — panned day field with wolves and raised obstacles, left-edge hatch; active fighter is outside the central framing, so this is not the primary sword close proof.
- E/sword-current-native125-detail-night.png — same darker panned field, visible wolves/raised terrain and left hatch; primary sword close proof remains R/detail.
- E/selected-skill.png — archer aimed-shot selected; movement hatch and movement legend absent, skill panel and reach contour visible.
- E/sword-moved-false-only.png — sword at 3/4 AP and 96 stamina, movement-only hatch and weapon legend; no move+attack legend.

### Comparison sheets and crops

- P/game-day.png — equal-height current overview left/reference day UI right; current fine diagonal pattern versus reference orange wash.
- P/game-night.png — equal-height current night overview/reference night UI; patterned/unpatterned distinction persists on dark earth.
- P/close-day.png — current fine ground marks and ink fighter beside reference melee close; terrain remains visible between strokes.
- P/close-night.png — current close night fighter/ground beside night UI palette reference; thin strokes and opaque figure stay separate.
- P/level-bear-weapon-on.png — final level group crop: hatch approaches bear shoulder and left long-weapon tip, with no line across opaque pixels.
- P/level-bear-weapon-off.png — matching final crop without ground overlays; same bear/weapon/archer silhouettes.
- P/steps-bear-weapon-on.png — final steps group crop: gold boundary is occluded by bear shoulder; hatch bends across raised ground at left.
- P/steps-bear-weapon-off.png — matching final steps crop without ground; fur, weapon and archer remain intact.

## Execution and handback limits

Only visual-2.md and eight optional proof PNGs were written. Proof sheets/crops were composed with local ffmpeg/sips from supplied images; an initial optional Pillow composition attempt was NOT_RUN because Pillow was unavailable, then replaced by those native tools. No evaluator images/readbacks were overwritten. No source/test/fixture/reference/shared-document edits, services, browser starts, tests/builds/coverage/audit/validator, delegation, Orca, commit/push/PR/merge, database or paid actions.

Runtime input journeys, pointer targeting, passive-command guarantees, full viewport/CVD execution, legacy substitution and gameplay acceptance remain evaluator-owned and NOT_RUN by this critic. FPS, player enjoyment and exhaustive final-pixel occlusion are NOT_MEASURED. The report is the only substantive documentation update assigned to this gate; the coordinator owns changelog/CURRENT_PLAN/wiki integration and engineering delivery. No publication/merge/full-M1 acceptance is granted.
