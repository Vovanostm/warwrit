# #227 — controlled layer evidence, 2026-10-20

Source: `ff40f304b6d72a2f874a223555b6ecd5bdb3ac96`; frozen parent documentation head `8a68d296aa784a2583fbcfabe2d66bf40473900c`.

**Result: evidence packet ready for the same absolute visual critic.** Eleven matched on/off pairs now cover a source-grounded recreation of the archived archer configuration, valid occupied height0/1/2 cells, and a genuine announced threat. No concrete opaque-body crossing or rectangular transparency-mask defect was established in the personally inspected pairs. This evaluator does **not** issue full visual ACCEPT or decide whether visual5 F1 is closed; the critic must inspect and score these images with the existing references and completed eval5 journey.

## Narrow source recipe and exact differences

Read visual-5 F1 and the full mandatory layering rubric. Read only the relevant archived recipe/report pointers:

- `../uix-w1-scene/.orca/uix-w1-scene/round1/rejected-archer-fixture.js` and report.md's archived-recreation/overlay sections.
- Its original placement source `../uix-w1-outcome/.orca/uix-w1-outcome/v2-height-layers.js`.
- Current known owning source: sprite-battle-scene.ts marker/body construction, sprite-scene-markers.ts cell policies, renderer/battle-cell-grid.ts mesh creation and editor-actions.ts import boundary.

The archived four placements are archer/human-3(6,5), spear/human-2(5,5), halberd/human-5(7,5), creature/opponent-5(6,6). Archived outcome evidence fabricated a terminal view through response interception; the later scene fixture cloned an R5 view onto a separate renderer page, varied archer height0/1/2, and lacked the actual live HUD. Those methods were **not reused**.

This is a **new valid diagnostic gameplay scenario**, using the ordinary editor's current exported battle, existing W05/W04/W09/B053 profiles, full mill map, existing skills and seed20261009. Native pointer Export saved `default-editor-export.json`; offline setup edits in `diagnostic-battle.json` apply exactly the four placements, set archer tile6,5 to height1 and halberd tile7,5 to height2, and change the setup name. Both tiles remain traversable with their existing mud/plain terrain. `config-changes.json` records exact placement/tile edits. No other profile, pool, rule, skill, side or spawn was changed manually.

Native Import/file chooser and normal Start accepted this setup. Current initial and threat captures retain all four named placements. Spear and creature feet y0, archer y0.28 and halberd y0.56 establish actual height0/1/2 rendering. This is not an exact historical screenshot match: current map/art/HUD/current fresh pools and canonical R1/R2 state replace archived R5/intercepted terminal inputs; two neighbouring tile heights differ from the archived one-tile-at-a-time sweep. No exact camera/pixel/terminal replication is claimed. Height2 is now genuinely present in this **custom diagnostic**, not retroactively present in eval4/5's default map or a real campaign journey.

## Runtime, actual journey and requests

Fresh private headed Chrome `eval6227`,1440×900/native100, ordinary127.0.0.1:25420/combat-lab; normal Vite source URLs recorded in started-readback.txt. Source/docs remained frozen as supplied; no Git operation was run in this bounded pass. No agents, Orca, source/assets/shared-doc/memory edits, tests, build, coverage, remote write or service restart/stop.

Session `ecd5b7f5-088c-48f6-ba2f-f87ac9035ba2` is evaluator-owned and separate from eval5. The old eval5 fight was not loaded, reset or overwritten. No response/source interception, injected active state, gameplay API automation, body/material/depth substitution or invented event/result was used. Player selection/Home/day-night/zoom/End turn use native coordinate pointer or keyboard. File setup import is an ordinary supported editor action, not an active-state patch.

- Normal imported start yields canonical round1/revision4, archer current actor, all12 active. Four initial selected/acting-archer close/overview ×day/night pairs stay4→4,0combatPOST.
- Six actual End turns, all HTTP200 accepted `wait`, advance4→5→6→9→13→14→18. Existing ordinary enemy turns explain multi-revision advances. No autoplay, manual attack or forced threat was needed.
- At round2/revision18, actual creature threat targets archer/human-3 at6,5:27–37 before armour, “До удара — ваш ответный ход”. All12 remain active; the four archived placements and raised cells persist.
- Four threat close/overview ×day/night pairs, two closer archer day/night pairs, and one selected-halberd/reach/threat pair remain18→18 with0combatPOST. `selection-threat.txt` records the six real command requests separately from passive diagnostics.
- Final ordinary reload **after all visibility restoration/captures** reads the real server revision18 again with0POST (`final-readback.txt`), rather than using a cached view as sole server-revision evidence. Reload is not used to create the diagnostic arrangement or threat.

Prior eval4/5 unchanged camera/targeting/terminal/reference proof remains scoped exactly as those reports state; no whole fight, native125 matrix, all12 keyboard sweep or terminal was replayed for this evidence correction.

## Controlled renderer diagnostic and invariants

Explicit owner authorization permits this visibility-only diagnostic. `pairs.js` identifies actual current meshes, stores each original `isVisible` and `visibility`, hides only these existing ground-overlay classes, and restores both fields in `finally`:

- `tactical-grid`: one actual group0 mesh owns grid **and coloured cell borders/rings**, including actor/friendly/enemy/selected/reach/path/threat borders. Therefore disabling only this mesh is not merely toggling the full-grid preference.
- `cell-fill:<q>,<r>`:165 actual group0 cell meshes; only currently enabled members render. Recorded material names show movement-and-reach, ranged-shot-area, reachable-movement-area, selection-ochre, target-cell-wash; threat samples additionally include threat-cell-wash.
- Actual `threat-shaft:opponent-5` and `threat-head:opponent-5`, material prepared-threat-rust, in revision18 threat pairs.
- Optional archived `actor-foot-ring`, `path:`, `preview:`, `ring:` names are included only if actually present; none was present as a separate mesh here. Current cell-grid source owns those ground cell-border effects. Exact inventory, enabled state and material for every candidate is retained per pair, not inferred from names alone.

Figure planes `unit:*`, entity silhouette outlines `unit-edge:*`, resource strips, HTML identity markers, terrain/side walls/scenery, natural `contact:*` feathered foot shadows and HUD/world threat text remain visible. Threat/damage labels are feedback text, not ground fills/arrows; leaving them visible deliberately preserves the HUD. No texture, alpha, depth, render group, pose or body transform is changed.

Each pair records before/off/restored camera position/target/projection/view/ortho values; every figure's position/rotation/scale/foot/cell, material identity/alpha/texture/readiness/group; and full battle HUD text. **All eleven pairs have equal figure/camera/HUD before/off values, exact restored readback, unchanged revision and0combatPOST.** Original visibility is restored even on a failed capture. Normal render frames may advance environment effects; no claim of identical particle pixels or a global frame freeze is made.

All body planes/textures report ready, material alpha1, group1, alpha-texture enabled, existing depth-write-disabled setting retained. Alpha1 does not mean every texture pixel is opaque: read-only GPU texture samples independently establish both opaque interiors and transparent borders (`detail.txt`):

| Figure        | Alpha0 pixels | Alpha≥250 pixels | Other alpha pixels |
| ------------- | ------------: | ---------------: | -----------------: |
| Archer W05    |       1167344 |           368153 |              37019 |
| Spear W04     |       1332752 |           217070 |              22694 |
| Halberd W09   |       1279189 |           265085 |              28956 |
| Creature B053 |        657218 |           835031 |              80267 |

The diagnostic never changes these pixels/materials. This is finite loaded/alpha evidence, not an assertion that all antialias pixels should be fully opaque.

## Packet and personal pixel inspection

`eval6-layer-shots/packet.md` was written before this report, with images/provenance and no acceptance conclusion.22 original screenshots form11 pairs:

- `recreation-h1-{close,overview}-{day,night}-{on,off}.png`: selected/acting archer at6,5, spear left, halberd right on height2, creature behind on height0; selection/reach fills and ground borders vanish only in off. Close day/night pairs personally opened: no selected hex stroke visibly crosses the archer's opaque waist/legs/bow, spear/halberd shafts or creature paws. Transparent margins retain the actual ground rather than a rectangular blank patch.
- `actual-threat-{close,overview}-{day,night}-{on,off}.png`: same live scenario after genuine threat. Close day pair and overview day pair personally opened: actual red arrow/fill disappear in off, with unchanged figures/HUD and the threat banner retained. Archer, long weapons and creature remain grounded; no definite opaque-body crossing established.
- `archer-detail-{day,night}-{on,off}.png`: ordinary wheel-in increases body size, keeping real threat; all four images personally opened. Grid/arrow are absent in off while bow, waist, both legs and transparent border remain. Close crop can place part of creature beneath upper HUD; it is not proof that all figures fit at close zoom.
- `selection-reach-threat-day-{on,off}.png`: both personally opened. Actual selected halberd's ochre cell/reach, archer's red threatened cell and real arrow coexist in on; all ground overlays disappear in off. Actor remains archer; right inspection remains halberd. This explicitly includes selection + reach + ground + genuine threat, rather than calling grid-only evidence “all off”.

Opening/overview night variants not individually opened are supplied to the critic with their recorded invariants; no personal pixel observation is invented for those stills. The critic owns opening every image it scores. No new art or screenshot painting/compositing was produced.

## Precise remaining limits and tool history

- A distinct hovered route/path pair is absent: the first actual movement-preview candidate projected outside the usable close view, so no hover was issued and pathRow is null. Current border/path policy is in tactical-grid, but an unexecuted route is not claimed present. Genuine threat coverage supplies the requested actual threat/path branch.
- Exact owner-era intercepted terminal/HUD/camera/pools are not replicated. This is the source-grounded recreation explicitly permitted by the request, with differences above. It does not prove every historical height/zoom/transparent-edge permutation or legal movement across all raised tiles.
- No new visual score, full visual ACCEPT, animation, capacity, balance, fun or performance conclusion. Prior references/equal-height art comparison/played linkage are reused only at their unchanged-source boundaries; the same critic judges this missing-evidence packet.
- Initial combined file-chooser/run-code attempt paused at the modal; CLI `upload` resumed it. A following duplicate Start attempt timed out because the first operation had already started the battle. Both failed/confounded sidecars remain. Ordinary readback then proved the accepted named custom battle/revision4; no duplicate action or fabricated state was supplied. Missing-path source lookup and shell wildcard misses were discovery/tooling limits, not game defects.
- Only evaluator-owned report/evidence paths were written. Browser cleanup and final services readback are appended below; parent owns the full absolute visual gate and all shared records.

Final receipt: private browser `eval6227` closed; only its own `eval6-layer-shots/profile/` removed. All diagnostic mesh visibility restored before final ordinary reload; server revision18→18,0POST, empty pageerror list. Parent API23420 health/live200 and web25420 combat-lab200 remain running.22 original images and packet.md are ready; no source/shared-doc/Git/remote/Orca/agent/test/build action was performed. Automatic CLI snapshot/console sidecars are tooling output, not source changes.
