# Local sprite combat prototype

Run `pnpm dev:combat`, then open `http://127.0.0.1:5320/combat-lab`.
The launcher builds protocol/core and starts a separate loopback API on 3022
and web on 5320 without opening the campaign database. Override
`COMBAT_API_PORT` / `COMBAT_WEB_PORT` when those ports are occupied.

Choose up to six units per side from twenty approved visual profiles. Paint
terrain, heights and obstacles, place units, then start the accepted draft.
Battle and map JSON imports are validated before replacing the draft; named
local drafts survive page reloads. Presets are provisional equipment/stat
fixtures, not twenty complete bestiary rule implementations.

Movement is immediate. Static figures and overhead event text replace combat
animation. Hover a hex to see the canonical route, AP/stamina costs and known
fire damage. Right-click a reachable empty hex to move, or an available enemy
to attack; attack hover shows AP and miss chance. Hovering a living unit’s occupied hex, including uncovered ground around its
sprite, highlights that unit and shows the same inspection/forecast as its body.
Opaque sprites retain priority where figures overlap; empty terrain clears
temporary emphasis. A short left-click inspects a unit or hex. Hover uses full
hex input with continuous height-seam picking. One shared pointy-top grid
changes cell colours for movement, weapon range, their overlap, hover and pinned
selection. Neighbouring cells at the same height meet along a complete edge;
ground states do not stack separate borders. Reachable cells remain readable
with the full grid hidden. Movement cues disappear when AP is spent.
Commands always use the fighter whose initiative turn is active. Fire
requires confirmation; unavailable targets do not submit commands. Holding
WASD or arrow keys pans continuously; left- or middle-button drag also pans.
The wheel zooms, and camera navigation clears the old hover.
The battle uses a fixed perspective reference: equal cells and figures shrink
with distance. Pan/zoom crop the same reference image, preserving registration
with the painted background. The full viewport stays inside the painting on
zoom out and resize. This calibration is specific to the mill art; it does not
change canonical hex coordinates or other orthographic camera consumers.

The selected unit's passive weapon range uses canonical range/LOS and remains
visible independently of the active turn, AP and stamina. Server attack previews
separately admit legal current targets and commands. Hover an available enemy
to see an on-hit health/armor loss forecast and miss chance; previews do not
sample combat RNG. An empty range cell is a potential target position. Each
ordinary shot targets one enemy. Canonical attackable enemies receive warm
entity silhouettes and target-cell colours, plus initiative/roster labels.
Entity silhouettes remain separate from the ground grid and distinguish units
from the painted field in day/night. The legend explains movement, weapon
range, their overlap, attackable targets and fire.

The approved Command desk HUD overlays the full desktop viewport. Top portrait
initiative shows remaining current-round turns and a distinct next-round forecast
from the canonical order function. It refreshes with accepted state; inspection
never reorders it. Visible arrows, keyboard focus and trackpad scrolling reach
portraits beyond the viewport. Completed battles hide the active dock and queue,
leaving the result, journal and utilities. Hover/focus a portrait highlights its figure; clicking pins
inspection without changing the acting fighter. Selecting a cell retains pinned
inspection while its path forecast takes priority; selecting a unit clears the
selected path. Field hover overrides retained portrait focus. The bottom-left actor and, only for a different unit,
bottom-right hovered/pinned inspection cards show actual resources and observed
states. Five icon commands show short names and AP/stamina costs; hover/focus exposes
secondary detail and unavailable reasons;
keys 1–5 invoke the same commands when the field has focus. Four skill slots show learned abilities, with an explicit overflow button;
their ranks are editable before battle. Campaign progression and additional timed
status effects remain outside this local prototype. The top-right menu provides replay, restart and return to editors.
The sprite scenario advances the opponent automatically. Restart uses the
accepted battle setup. New default mill drafts spread twelve units into two
columns/three ranks per side; saved/imported setups retain their positions.

[Battle UI reference](../../../../assets/art/combat/stage1-2026-10-09/ui-reference-v1.html)
shows integrated bow day/night, melee and full mill views. Under Vite use
`http://127.0.0.1:5320/@fs/Users/vovanostm/learn/warwrit/assets/art/combat/stage1-2026-10-09/ui-reference-v1.html`.
The original acceptance excluded later crowded formations; the v2 amendment
below records the inspected dense round-two day/night result.
Replay export contains both sides' accepted commands and no capability.

Sessions are volatile: restarting the API loses them. An uncertain create is
not automatically retried. Action retries preserve the original body/request ID.
This local stand does not modify campaign state or accept the full M1 journey.
See [the owning contract](../../../../docs/wiki/battlefield-test-maps.md#рабочий-прототип-и-редакторы--2026-10-09)
for actual verification and remaining mechanics.

## Sprite v2 UX — 2026-10-12

New local battles show real panic/surrender states and the mill creature's
current target cell/strike strength/response gate. Movement forecasts list
canonical free-strike risks; living figures remain selectable on reused corpse
cells. Proportional figures use 82% presentation scale, with active/selected/hover
rings above figures. Inactive standing figures are replaced by compact non-pickable markers.
Overhead text describes events since the previous accepted view; inspection
changes do not replay all historical labels. Terminal results expose both
sides' survivors, deaths, retreats and surrenders, with restart/editor controls.
Command/skill tooltips are suppressed on terminal results so these controls remain clear.
Current ability slots remain reserved; twenty distinct skill sets are not
represented by twenty statistical fixture profiles.
[Current checks and limits](../../../../docs/wiki/battlefield-test-maps.md#алгоритм-доведения-боёвки--2026-10-12).

## Sprite v3 — 2026-10-13

New battles use `sprite-prototype-v3`. Grid, routes, movement/shot fills, threat
markers and all ground rings draw before figures. Alpha-aware body picking
follows the same stable entity order as rendering; transparent PNG margins
remain ground input. Height0/1/2 tops and exposed textured faces use the same
terrain metadata. Numeric height plaques show only hovered/pinned empty cells
(at most two); occupied tile height/surface is in the unit card.

Five finite learned abilities are real canonical commands: shield brace, armor
pressure, reach thrust, aimed shot and rally. The editor exposes unlearned and
ranks1–3 independently of equipment; incompatible gear disables use. Select an
enemy/ally ability, inspect its forecast, then right-click its legal target.
Shield brace executes directly on its owner. Escape cancels targeted mode.
HUD availability, costs and damage forecasts come from server projections.
Optional `ruleHints` also own rule-derived state badges/ordinary action costs;
historical projections without them display unknown/generic values.

“Один шаг” advances one human AI decision plus ordinary opponent continuation.
“Начать автобой” repeats the same server-owned canonical actions; “Остановить
автобой” stops future submissions after any already accepted pending step.
Stop/reload/retry do not create a second simulator or bypass action authority.
Static event labels include skill effects and actual HP lost on v3 overkill.
A declared-damage label sits above the victim while it occupies the announced
cell; live matching preparation/retarget captions suppress duplicate event labels.

[Integrated results and exact limits](../../../../docs/wiki/battlefield-test-maps.md#реализация-тз-sprite-v3--2026-10-13).
The dated v2 statements above are historical; v3 supersedes foreground ground
rings and reserved-only skill slots. Twenty visual profiles do not mean twenty
unique ability sets; no XP awards, captive campaign or poison/burn status engine.

## Single-cell rubble readability — 2026-10-13

The existing projected rubble sprite is uniformly scaled and its visible-art
centre is aligned to the blocked hex. Permanent ochre/ink borders identify
impassable cells even with the full grid off; borders remain below figures and
non-pickable. Hover/pin inspection names the blocked cell and explains that it
is impassable. Rubble never submits a move or steals body picking; canonical
map/range/LOS rules are unchanged.
[Current defect, journey and acceptance](../../../../docs/wiki/battlefield-test-maps.md#завалы-принадлежат-одному-гексу--2026-10-13).

## Weapon reach contrast — 2026-10-13

Historical two-contour result, superseded by the single-grid amendment below.

Weapon reach uses a stronger ochre wash and an ink-backed outer contour.
Movement-only cells stay teal. Overlapping cells retain one ochre wash and
a smaller cyan movement contour; this is a capability cue, not a smaller hex
or input gap. Every ground cue stays below figures. Public weaponReach remains
inspection range, while attackPreview alone admits an attack; no rule/LOS/cost
is inferred from colour. Legal enemy targets retain their orange emphasis.
[Current visual result and checks](../../../../docs/wiki/battlefield-test-maps.md#контраст-области-оружия--исправление-2026-10-13).

## Selected weapon inspection and command icons — 2026-10-13

Pin/left-click/initiative selection inspects that unit's public weapon reach;
transient hover does not replace its footprint. The caption/legend distinguishes
inspection/resources from ordinary attack admission; skill mode uses its own
preview. Sword/shield 1, spear/W09 1–2, bow 1–4 cells in this finite prototype.
[Owning range result](../../../../docs/wiki/battlefield-test-maps.md#дальность-выбранного-оружия--2026-10-13).

Commands and skills use a local ten-icon Game Icons subset through decorative
CSS masks. Button names, tooltip costs/refusal reasons and keyboard behaviour
remain owned by the existing buttons. Commands show their key; learned skills
retain rank and distinguish available, unavailable and selected states.
CC BY 3.0 author/source/adaptation credit is visible in the expanded battle log.
Provenance: `assets/art/combat/ui-icons/README.md` and `license.txt`.
[Owning icon result](../../../../docs/wiki/battlefield-test-maps.md#иконки-команд-и-приёмов--2026-10-13).

## Single colour grid — 2026-10-13

One stable cell-fill per hex and one tactical-grid with deduplicated physical
edges replace separate marker contours and inset rings. Movement, weapon reach,
intersection, pin, hover and route use cell colours; the HUD includes the
intersection legend. Canonical input/previews/inspection and entity silhouettes
remain separate. Ground cues stay group 0/non-pickable under group 1 figures.
Final single-grid/opaque projected-height cycle received scoped independent
field ACCEPT;21 geometry+UI checks PASS by renderer author after HUD freeze.
The same field critic confirmed no material regression in final integrated
day/night images after that freeze; own critic browser NOT_RUN.
This does not accept terminal HUD or the complete combat DoD.
[Current finite result and limits](../../../../docs/wiki/battlefield-test-maps.md#согласованное-поле-и-проверка-прогноза--2026-10-13).

## Unified desktop HUD — 2026-10-13

`battle-controls.css` owns one battle-control family: 56 px command/skill
squares, 40 px utilities, 36 px text controls and a common 6 px radius/state
palette on tested desktop sizes. Editor defaults exclude fighting HUD without
raising editor specificity. Icon CSS owns decorative masks only.
The compact command console aligns orders/skills and reserves feedback;
auto start/stop is always visible in the top utility group, single-step is in
the menu. Skill overflow opens above the console, closes on Esc/outside focus/
selection and returns focus on Esc. Explicit input modality selects a single
mouse or keyboard command tooltip, anchored above the actual actor card with
ResizeObserver rather than over battlefield figures. Active stance badges require
an active unit; resolved combat hides the unknown-next-round placeholder.
Actor/target resources, forecast and range
admission remain server-derived.
[Current measured result and visual limits](../../../../docs/wiki/battlefield-test-maps.md#единый-боевой-интерфейс--2026-10-13).

Resolved-state HUD also received scoped appearance ACCEPT at1366/1440;
fresh isolated auto match R8/revision151 passed terminal inspection with
zero action POSTs and unchanged revision. This is separate from original
manual R9 and was captured before the subsequent camera integration cycle.
[Terminal result and limits](../../../../docs/wiki/battlefield-test-maps.md#итоговый-hud-завершённого-боя--2026-10-13).

## Battle camera adapter and menu hint — 2026-10-13

Camera behaviour belongs to the shared `three-quarter-camera.ts` module.
The scene adapter only sets `panButtons:[0,1]`; it adds no parallel camera
implementation. The scene author reports scoped noEmit/lint/format/diff PASS;
its own browser probe was NOT_RUN after context loss.
The camera owner's isolated5322 journey used the integrated module/adapter:
held keys, LMB drag, preserved pin, short click after pan/zoom, combined wheel,
release/blur/HUD-focus and day/night PASS with0actionPOST/revision4/actor/AP/
12positions/statuses unchanged. Root read that actual result. Camera author
reports13 focused tests and independent source review PASS. Repeated independent
camera appearance review ACCEPT scored7criteria2/3 after required extra captures;
own critic input NOT_RUN. The separate module PR/main delivery is now verified
merged; this scene/helper/sprite integration remains local/unpublished.

The existing menu helper now explains LMB inspection, RMB orders, LMB drag,
WASD/arrows and wheel zoom. Root lint/format and actual menu copy/fit PASS;
no new panel, control geometry or gameplay rule was added.
[Owning adapter/helper result](../../../../docs/wiki/battlefield-test-maps.md#подсказка-управления-камерой--2026-10-13).

First camera module/test publication: [PR156](https://github.com/Vovanostm/warwrit/pull/156),
verified head64b49ee3 with matching successful CI38404171166. Its scope excludes
this scene adapter/helper and sprite WIP. Independent camera appearance was
BLOCKED for missing captures at that initial checkpoint.
The full CI result belongs to that clean PR tree, not this dirty sprite checkout.
A later same-critic full camera appearance ACCEPT supersedes the initial BLOCKED.
The intermediate head54f7da890 CI was initially IN_PROGRESS. Final live readback
now verifies PR156 MERGED/merge86c1da055 and same-headCI38407349732 SUCCESS.
The camera worktree is actual main, clean, with HEAD/main/originmain86c1da055;
ordinary finalhead-to-mergedtree diff is empty. The primary sprite checkout
retains codex/sprite-combat-stage1/HEADb44f5c1 and its WIP. Only camera module/
test/own-docs merged; this scene adapter, menu helper and sprite battle are
local/unpublished. Full combat DoD is not inferred from the camera PR gate.
