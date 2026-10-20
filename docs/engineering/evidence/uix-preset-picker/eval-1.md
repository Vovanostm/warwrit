VERDICT: ACCEPT 049b6cb6d2778a64701642167823601aeb8199ad

Independent read-only Tier U evaluation, 2026-10-20. No blocking picker/source
defect found. Acceptance covers this editor change and its stated human journey;
it does not accept the whole combat scene, #227, balance, or the full UI epic.

## Scope and provenance

- Frozen branch codex/preset-picker-228; base merged PR240 eb98dd2. Read AGENTS,
  context/review/Playwright skills, full local contract and activation amendment,
  author report, current CHANGELOG/CURRENT_PLAN entries, live issue228 and its
  producer-merge comment, ordinary five-file base-to-HEAD diff, editor callers,
  validation/storage/start boundaries, and committed producer evidence.
- Stale graph belongs to another checkout; direct current source was used.
  No source/shared-document/Git/remote/Orca/memory writes, agents, builds, suites,
  coverage, service restarts or other checkouts. Parent owns documentation
  integration, validator, publication and merge. Parent's EXIT0/8of8 is supplied
  evidence, not a validator run by this evaluator.
- Used only parent API23998/web25998/combat-lab. Listener readback: API PID95055
  cwd this checkout/apps/server; web PID95014 cwd this checkout/apps/web.
  Both original listeners were observed alive at the completed-play readback.
- Own headed Chrome155.0.8059.82 Playwright session picker228-eval1 and private
  eval1-shots/profile. Only this session was controlled and closed. Ordinary
  native DOM/pointer/keyboard actions drove all edits and combat. Passive response
  listeners/read-only DOM observations supplied measurements. No route mocks,
  interception, injected game state, action API driver or simulated result.

## Editor and source checks

- Initial mill draft; native selector «Сценарий для загрузки» and explicit
  «Загрузить сценарий». Choosing deserter-band left exported draft byte-equivalent
  as parsed JSON; loading remained a separate action. All editor operations before
  the first launch emitted **0 combat POSTs**.
- UI export after load exactly equals current server catalog deserter-band:
  complete map/seed/positions/skills, six allies and five human opponents
  W01/W04/W05/W01/W04. The actual first create request also equals that catalog
  battle. Source owns no duplicate roster and uses existing validation plus
  structuredClone before replacement; launch retains the existing controller path.
- Saved «Evaluator saved mill» locally. Loaded human preset, edited its name,
  removed one ally and painted tile0,0 muddy. Reload restored the exact catalog
  battle. Restoring the saved mill yielded the exact original saved configuration;
  the same saved draft survived ordinary page reload and subsequent restoration.
  No persisted draft was overwritten by preset load.
- Source selection remained deserter-band after edits and saved-draft restoration;
  it is explicitly labelled as the source for loading. Actual name/seed and roster
  remain the draft controls; no selected-source-as-current-draft claim was found.
- Mill reset restored exact catalog.defaultBattle and cleared picker selection,
  inspection and load errors. Final reset after human gameplay also exported the
  exact default. Existing optional creature skillRanks are normalized to {} by the
  server on creation; mill restart preserves that normalized configuration, map,
  seed and roster. The initial mill create payload equals catalog.defaultBattle.
- Native desktop1440×900 and1280×800 inspected at100% and125%. Native125 was
  selected in this private Chrome's Appearance→Page zoom control: DPR1.25,
  visualViewport.scale1, CSS viewports1152×720 and1024×640 respectively.
  Picker label, chosen title, load action and explanatory text fit without
  overlap or horizontal overflow. Load worked at125%; ordinary scrolling reaches
  name/seed/saved controls and launch. No hidden/obstructed picker input found.
- Missing/empty optional catalog, unavailable id, invalid empty roster, disabled
  controls and replacement guard reuse the author's five PASS component tests
  in BattleEditor.test.tsx, whose callbacks/source were inspected. No natural
  runtime variant exists here; these cases were **not browser-faked or rerun**.
  The hook harness omits effects/native DOM, so browser lifecycle proof above is
  separate. Author types/lint/format/audit results are attributed, not rerun.

## Actual human battles and lifecycle

| UI run                                              | Actual result                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Seed20261009, catalog loaded unchanged              | Manual move human-3→(3,5), then end turn, both HTTP200; normal UI autoplay; victory R7/rev133. Allies5 active/1dead; opponents3dead/2surrendered/0retreated. Terminal displays «Сдались2».                                                                                                                                                                                                                                                          |
| Seed20261010, only seed edited through normal input | Eight menu «Один шаг» clicks reached the next human-3 activation. Home overview, pointer(780,490) selected(8,3); UI warned «Свободные удары при отходе»,100%,6–14health/12armour,4AP/13stamina. Accepted move at rev23 produced unit.moved and opponent-1→human-3 attack.resolved, hit,14health/12armour; forced end turn rev24, returned view26. UI autoplay then victory R8/rev146: allies5 active/1dead; opponents4dead/1surrendered/0retreated. |

- Seed09 session09448942-cb0e-4dad-ae71-563909d0b7a7 reloaded resolved/rev133.
  Seed10 session79dc06dd-005e-4984-9cf9-2edbcd76e8de. Terminal and its
  genuine surrender count were inspected in both screenshots and projections.
- Downloaded seed10 replay through «Скачать запись боя»:91708B, failure=null.
  No duplicate producer replay suite was run. Existing producer report supplied
  the two known seeds/withdrawal route and its unchanged reconstruction proof;
  both battles and picker/lifecycle checks reported here were played afresh.
- Normal human restart created session73267d21-b15c-43d5-9e61-4a2e8c7c0941,
  same seed10 configuration, active R1/rev0; reload retained that session/revision.
  Return to editor→mill reset→normal launch created mill sessiond6ba7739,
  original six creature opponents, R1/rev4 after existing AI startup. Reload
  retained it; normal restart created e70b2ee4-8624-4deb-b36f-6ffe3d956f39,
  same normalized mill configuration/rev4; another reload retained it.
- Final request log:134 POSTs, all HTTP200/201, including5 explicit UI creates
  (two played human runs, human restart, mill launch, mill restart). These combat
  orders are distinct from the earlier zero-POST editor phase.

## Evidence, failures and limits

Evidence is local/untracked under .orca/uix-preset-picker/eval1-shots/:
checks.json, catalog.json, before/chosen/loaded/edited/reloaded-preset JSON,
saved-mill/restored-saved/restored-after-reload JSON, reset-mill/final-reset-mill
JSON, observations.json, final-observations.json, reaction10-correct.json,
ui-replay10.json, runtime.txt and native125 measurements. Raw CLI snapshots and
outputs retain actual requests/revisions and tool failures.

Personally viewed captures: before-1440-100.png, loaded-1440-100.png,
edited-1440-100.png, reset-1440-100.png, loaded-1280-100.png,
loaded-1440-native125.png, loaded-1280-native125.png,
identity-1280-native125.png, gameplay-start09.png, withdrawal-before10.png,
withdrawal-after10.png, terminal09.png, terminal10.png and mill-start.png.
The identity/footer capture confirms lower controls fit; it has an inherited
blank/dark upper area at that scroll position and is not a scene-quality pass.

Setup/measurement failures preserved: wrapper lacked executable permission
(used bash); default npm cache EPERM (used cache within owned output); wrong
run-code argument destructuring and unsupported dynamic import (corrected to
page argument and UI downloads); stale ref after reload (fresh snapshot/native
locator); Meta+Equal did not change zoom (used actual Chrome settings). Summary
code after the eight step clicks read an acknowledgement as a view and threw;
clicks themselves completed. An initial cross-session event filter selected the
seed09 rev23 attack; reaction10-correct.json supersedes that misattribution using
the actual seed10 session. A naive mill equality check found only omitted versus
empty creature skillRanks; source payload and normalized restart were compared
separately. These were evaluator/tool errors, not hidden game passes.

Only initial favicon404 was seen; final reload console had0errors/0warnings.
No completed escape observed (both runs0retreated). Two seeded surrenders are
observations, not a guaranteed balance property. Performance/balance and broad
gameplay enjoyment are NOT_MEASURED. Full suites/build/coverage/CI/publication/
merge are NOT_RUN here. Existing overview readability/HUD issues remain with
#227; none blocked this picker/manual withdrawal/terminal journey. No absolute
art rubric or whole-scene ACCEPT is claimed. Parent must recheck affected UI
after normal integration of accepted main/#227. No required picker fix remains.

Final readback boundary: after closing the private browser, HEAD still049b6cb
and the picker/test/catalog-producer paths had no diff against HEAD, but the
shared index now contained unrelated encounter/protocol/core-pools and shared
documentation work. API23998's listener changed from95055 to7561 after the
played captures (web remained95014); the subsequent PID7561 cwd probe returned
no process, so continuing API availability is not claimed. This evaluator changed none of those files
or processes. The verdict applies to the captured frozen picker journey, not
the later parent runtime/integration. Those unrelated staged changes were left
untouched; no clean-tree or later-runtime acceptance is claimed.
