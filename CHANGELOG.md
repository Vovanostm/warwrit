# Changelog

Notable changes to the repository's tooling, gates and delivered behavior. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); the
project has no released versions yet, so entries stay under _Unreleased_. New
entries include their date, originating branch and actual delivery status; record
the merge date when merged. Earlier history is in the Git log and merged pull
requests.

## Unreleased

### Mechanics wiki with cross-links

- 2026-10-08, originating branch `codex/world-map`, merged 2026-10-08 (owner «commit, merge»): the owner asked to
  describe everything at once as a full wiki with cross-linked mechanics.
  Added [docs/wiki/mechanics/](docs/wiki/mechanics/index.md): 18 combat pages
  (turn and action points, fatigue, melee, armour, weapons, ranged, preview,
  zone of control, morale, telegraphed intent, retreat, formations,
  displacement, terrain, wounds, opponents, talents, pressure) and 10 world
  pages (world turn, place state, attached places, contracts, relations,
  armies, game master, crisis and season, ambitions, chronicle), each with
  status, rule or proposal, player view, cross-links, reference and mistake.
  Core numbers are quoted from `packages/game-core/src/combat/rules.ts`; new
  rules are candidates without numbers. Linked from benchmarks, DESIGN_COMPASS,
  vision, combat, wiki index and SCHEMA. Local links and anchors PASS;
  implementation NOT_RUN.

### Game benchmarks, mistakes to avoid and world game master

- 2026-10-08, originating branch `codex/world-map`, merged 2026-10-08 (owner «commit, merge»): the owner asked to
  analyse the world map, compare highly rated similar games and save which
  references Warwrit takes and which mistakes it avoids. Added
  [benchmarks](docs/wiki/benchmarks.md) (reviews of ten games, Battle Brothers
  world systems, mistake table, three-layer world proposal, first cycle,
  lore proposals) and linked it from the wiki index, world page and log.
  Recorded owner decisions as REQ-21 (mercenary band that does not command
  armies; duchy armies march and fight parallel battles so the world lives;
  a game master sets the war — direction, design not approved) and
  REQ-22 (test 10–20 players, target 200–1000 bands) and REQ-23 (focus on
  making the current world interesting and on deep, high-quality combat with
  many mechanics; new worlds/regions only after success) in
  [vision](docs/wiki/vision.md). Revision the same day: the report was rewritten
  in detail (world, story and combat per game, mistakes, good/bad examples) and
  a compact agent digest [DESIGN_COMPASS](docs/engineering/DESIGN_COMPASS.md)
  was added to the brief reading list. Owner: some army battles are decided by
  the game master, some by simple rules without tactical battle; REQ-19 and
  brief B9 (second region after M1) are cancelled. The owner then accepted the
  recommendations: first combat mechanics are zone of control, morale with
  flight/surrender and telegraphed creature intent; the game master decides
  battles that change a town's owner or turn the crisis, simple rules decide
  skirmishes, ambushes and small sieges. Documentation only; implementation NOT_RUN,
  server capacity NOT_MEASURED.

### Global world atlas concept

- 2026-10-08, originating branch `codex/world-map`, merged 2026-10-08 (owner «commit, merge»): the owner requested
  a generated world map consistent with Warwrit's lore. Added the standalone
  ink atlas, exact built-in imagegen prompt and provenance in
  `assets/art/world/stozhar-v1/`, plus [the owning design](docs/wiki/world/map.md)
  and wiki links. Existing north/south/west/east duchies, crown domain and
  disputed Porechye are retained; geometry, drainage and roads are proposals.
  First image generated at 1536×1024. Initial critique REJECT (castle-like
  Kamenny Brod and blue Mutnya); corrected still-image pass ACCEPT. Owner then
  rejected the small scale and requested more cities/villages, varied marshes
  and places damaged by war. Expanded design and exact prompt in
  `assets/art/world/stozhar-v2/`: 24 urban nodes, village networks, three river
  basins and ten distinct districts. Expanded generation/review pending;
  renderer integration and gameplay checks NOT_RUN.

- 2026-10-08 follow-up, `codex/world-map`, merged 2026-10-08: owner required tens of hours,
  more than 100 POIs and coherent geography. Added the desktop zoomable
  `assets/art/world/stozhar-v3/atlas.html`, 128 unique proposed places in
  `places.json`, five image iterations with exact prompts/provenance, and
  REQ-20 in [vision](docs/wiki/vision.md). Corrected the crown river loop,
  water-dependent landmarks, crossing/settlement anchors and Vyasov bypass;
  fields, woods, marsh and working/ruined sites follow their terrain. Initial
  v3 critic rejected misplaced city/crossing/waterwork markers; repeated style
  failures led to graphic ink reconstruction with low roof groups. Final
  standalone atlas ACCEPT at overview scale (six applicable scores 2); close
  rendering/materials remain 1 at 3× and require higher-resolution authored
  detail. Catalogue/embedded JSON/JS syntax/local links/diff, desktop atlas
  journeys and change audit PASS. Expanded v2 is complete but failed minor-label
  readability; v3 supersedes it. [Owning result](docs/wiki/world/map.md).
  Game integration/day/night NOT_RUN; play duration NOT_MEASURED.

### Wave 1 agent results: company book, cache investigation, bestiary

- 2026-10-08, branch `claude/wave1-docs` from `main` (`b7ffefc`), published;
  owner «Ok, merge prs, update main». Integrates the accepted, owner-approved
  parts of the wave-1 Codex briefs (documentation only, no code):
  - **B8 company book** (`codex/b8-company-book` at `5b943aa`): Codex variants
    A/B were REJECT after three text-critic rounds; on the owner's decision
    Claude rewrote the book as «Казна» and «Щит»; both ACCEPT in round 3.
    Owner chose «Щит», third person without the chronicler's «мы».
    [Text and rounds](docs/wiki/onboarding-book.md#b8--новая-редакция-казна-и-щит--2026-10-07).
  - **B4 «Кто выдал тайник»** (`codex/b4-story-missions` at `88590bd`): story
    revision 6 (patched-sack clue instead of the tally stick, owner decision)
    text-critic ACCEPT and owner «Одобряю»; runtime contract
    [M1-STORY-MISSIONS](docs/work-packages/M1-STORY-MISSIONS.md). Reward
    decision (40 crowns from Kondrat's existing funds) is recorded on the
    working branch, not yet here.
  - **B7 bestiary and quest decisions** (`codex/b7-content-revision` at
    `ef0008e`): 30 selected creatures, all 60 IDs retained; creature names
    text-critic ACCEPT; 60 quest editorial decisions. The rewritten quest
    drafts (REJECT) are not included.
    Checks: prettier on changed docs. Game, CI-only checks per PR. Code parts
    of B1/B3/B4 remain on their working branches.

### Pending local work published

- 2026-10-07, branch `claude/world-lore-and-briefs` from `main` (`47c60e0`),
  published: on the owner's «Да, всё закоммить» all pending local work on the
  primary checkout was committed in topical commits and opened as a pull
  request — the contract texts and i18n catalogue, world/vision/briefs docs,
  critics and 3D skills, terrain ink materials and the wiki research drafts
  written by earlier sessions. Local evidence (`output/`, `.playwright-cli/`)
  and agent worktrees (`.claude/worktrees/`) are now ignored, not committed.
  Merge is not authorized.
- 2026-10-07 correction: merged on the owner's «Yes» as
  [PR #152](https://github.com/Vovanostm/warwrit/pull/152) (`b7ffefc`).

### Work package: melee always connects (combat ruleset v3) — proposal

- 2026-10-07, originating branch `main` (`47c60e0`), local: the owner asked for
  a full specification with acceptance criteria, self-verification and a
  code-quality test for the accepted melee rule. Added
  [M1-MELEE-CONNECT](docs/work-packages/M1-MELEE-CONNECT.md), linked from
  [combat](docs/wiki/combat.md#урон-в-ближнем-бою--решение-владельца-2026-10-07).
  It specifies:
  - new ruleset `m1-domain-bridge-v3` with melee/ranged weapon kinds and
    `meleeTraining` per unit;
  - a one-roll quality model (precise/solid/glancing, miss only for recruits and
    ranged) with a provable always-damage invariant;
  - an optional `quality` on `attack.resolved`, leaving v1/v2 byte-identical;
  - practice mapping that keeps the SUCCESS rate;
  - a pure `previewAttack` exposed only in the combat lab;
  - seven time-boxed steps, 15 acceptance criteria, a test plan, a
    self-verification pass, a code-quality gate, and open decisions D1–D3.

  Grounded in the current engine, rules, setup-v2, practice, admission and
  protocol code. An independent `warwrit-critic` pass on revision 1 found 7
  confirmed gaps (M0-only combat lab, three v1/v2-only server checks,
  exact-field aggregate validators, the replay digest field, a missing schema 2
  stress runner, the D1 default, preview rejection codes). All are fixed in
  revision 2, together with a public `recentAttacks` battle line for a
  player-visible result. Documentation only; implementation NOT_RUN.

### Contract texts and string catalogue

- 2026-10-07, originating branch `main`, local: owner asked to split the briefs
  into separate files with acceptance criteria and critique. Added
  `docs/engineering/briefs/2026-10-07/` (README, 00-common, B1–B9), the text
  critique rubric [TEXT_CRITIQUE.md](docs/engineering/TEXT_CRITIQUE.md) and the
  `warwrit-text-critic` / `warwrit_text_critic` agents; removed the single
  AGENT_BRIEFS file. The i18n catalogue is split per area
  (`contracts.ru.ts`, `contracts.en.ts`) to avoid shared-file conflicts. Web
  typecheck, `vitest run apps/web/src` 80/80, eslint and prettier PASS.

- 2026-10-07, originating branch `main`, local: on the owner's «Да, перепиши»
  the eight M1 contracts use the rewritten Porechye texts (named issuers,
  briefs, steps, findings, completion facts; hunt briefs shown at the issuer).
  Strings moved to the new `apps/web/src/i18n` module (`ru.ts`, `en.ts`,
  `lookup`/`t`; `?lang=en`), with a type that requires a complete English
  catalogue; no new dependency. Mechanics, steps and rewards unchanged.
  Affected: `ContractBoard.tsx`, `contract-visits.ts`, `FirstHunt.tsx`,
  `ContractBoard.test.tsx` (two expected literals), world docs. Checks: web
  typecheck, `vitest run apps/web/src` 80/80, eslint and prettier PASS; browser
  NOT_RUN (local `.env` database port mismatch, not changed).
- 2026-10-07, originating branch `main`, local: detailed agent briefs B1–B9 for
  the remaining vision decisions in
  [briefs/2026-10-07](docs/engineering/briefs/2026-10-07/README.md) (split later the same day).
  Not dispatched.

### Game direction: Battle Brothers rules, XCOM presentation, melee always damages

- 2026-10-07, originating branch `main` (`47c60e0`), local: the owner answered
  «Да, давай дух Battle Brothers и взял у XCOM только подачу» and set the rule
  «Урон в ближнем бою должен быть всегда (кроме новобранцев или боя с
  призраками) — игра должна быть логичнее xcom в этом плане». Recorded in:
  - [m1-spec §18](docs/wiki/m1-spec.md#18-battle-brothers-направление-и-этапы--2026-10-03);
  - [combat](docs/wiki/combat.md#урон-в-ближнем-бою--решение-владельца-2026-10-07),
    with a proposed reading for confirmation: hit quality instead of miss,
    shield/armor damage counts, recruit threshold, incorporeal exception that
    adds no creature, ranged keeps its miss chance;
  - [battlefield-test-maps](docs/wiki/battlefield-test-maps.md): no cover or
    flanking, melee preview shows strike strength.

  The current core still rolls `hitChance` for every attack. The change needs a
  new combat rules version and a compatibility analysis, and V1 replays stay
  unchanged. Implementation NOT_RUN. The canonical Airtable record was not
  updated (no access in this session): NOT_RUN.
  Same day: the owner confirmed the proposed reading («Да»), which is now
  recorded as accepted in the spec, combat and battlefield pages. Open item: the
  recruit skill threshold.

### Game vision page

- 2026-10-07, originating branch `main`, local: owner confirmed autobattle with
  AI retreat and possible deaths, an order to travel to a settlement and log out
  with auto-resolved battles on the way, and a second region right after M1.
  Vision REQ-18/19, M1-spec §7 and CURRENT_PLAN updated. Documentation only.

- 2026-10-07, originating branch `main`, local: owner decided offline
  behaviour (field camp with slower upkeep, terrain hunting/gathering,
  autobattle when attacked, safer logout in settlements) and crises (duchy war
  with settlement capture first, monster waves next). Vision REQ-12/18 and
  sections, M1-spec §7/§18 and bestiary world-rules amended; the old camp rule
  is superseded. Documentation only.

- 2026-10-07, originating branch `main`, local: owner amendment — no battle
  time budget, contracts of varying length, more repeatable and new contracts,
  combat-free visual-novel and detective missions. Updated vision REQ-09/11,
  added REQ-17 and a proposed mission-format section with three candidates;
  M1-spec tempo answer and CURRENT_PLAN amended. Documentation only.

- 2026-10-07, originating branch `main`, local: owner restated the genre and
  references (Battle Brothers, Wartales, The Witcher, XCOM) and asked whether
  the MMO fits and whether it is recorded. Added
  [docs/wiki/vision.md](docs/wiki/vision.md): owner decision, pillars, what to
  take from each game, MMO-fit table, REQ-01..16 summary with sources, open
  decisions and plan refinements; linked from M1-spec §1, wiki index and
  CURRENT_PLAN. Web sources on Wartales, BB crises, Dofus/Wakfu and Foxhole are
  cited. Documentation only; game code unchanged.

### Battlefield look and test maps — proposal

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner asked that the
  battlefield look like Battle Brothers / Disciples / Wartales and for several
  maps to test combat, character display and animations. Added
  [battlefield-test-maps](docs/wiki/battlefield-test-maps.md), linked from the
  [wiki index](docs/wiki/index.md). It covers:
  - what to take from each reference and what not to copy;
  - shared battlefield acceptance targets (field, grid, camera scale options,
    unit base and bars, occlusion, night/local light, honest rules);
  - six diagnostic maps T0–T5 on existing places, bestiary and weapon profiles;
  - a minimal implementation path (serverless display stand first, combat-lab
    scenarios later);
  - open owner decisions (unit size, field size, elevation/cover).

  Grounded in the current core: hexes plus `blocked` only, spear range 1–2, and
  no line-of-sight rule. Documentation only; implementation NOT_RUN.
  Same day: added an XCOM-quality section covering six presentation pillars,
  the state/visualization split (an XCOM 2 `X2Action`-style client sequencer
  over the existing combat events), animation blending and contact-frame sync,
  and the rule decisions it needs (attack preview function, line of sight,
  ZOC/height/cover).

### World of warring duchies and writing rules

- 2026-10-07, originating branch `main`, local: owner found «Совет опекунов»
  odd and asked for a literary style after Lermontov, Tolkien and others.
  Renamed it to the Boyar Duma; read «Тамань», «Капитанская дочка» ch. II,
  «Бежин луг», part of «Севастополь в декабре месяце» and «Страшная месть»;
  added [literary-style.md](docs/wiki/world/literary-style.md) with borrowed
  devices, narrative voices, name phonology per duchy and five Porechye samples.
  Tolkien, Sapkowski and Glen Cook are summarized from memory, not re-read.
  Samples are review drafts; game text unchanged.

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner decided that
  Warwrit is an MMO with a large world of several duchies at war (Witcher
  analogy). Added [docs/wiki/world/](docs/wiki/world/index.md): realm, four
  duchies and the regency council, the succession war, Seroe Porechye in the war
  with named issuers and rewritten texts for the eight M1 contracts, anti-slop
  [writing rules](docs/wiki/world/writing.md) and a
  [localization design](docs/wiki/world/localization.md); analysis tables in
  `docs/content/world/*.csv`. AGENTS.md lore ban amended for the duchies. Cause:
  the lore review found constraints without history, power or people, and
  bureaucratic player text. Names, dates and texts are review drafts; game code
  and in-game text are unchanged. Checks: CSV column validation and local links;
  game tests NOT_RUN (documentation only).

### Characters 3D: Mixamo scope extended to combat packs

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner answered «Да,
  расширь». Mixamo use for `codex/characters-3d` now covers the free Sword and
  Shield, Great Sword and Longbow packs as the primary combat clip set. The
  cause: the visual rubric REJECT on `1687b19` traced pose and attack defects to
  the UAL clips. Updated the
  [warwrit-characters-3d](.agents/skills/warwrit-characters-3d/SKILL.md) and
  [mixamo-blender](.agents/skills/mixamo-blender/SKILL.md) skills: one pack per
  weapon family, root travel removed before the bake, and no runtime procedural
  position correction. The branch agent recorded the decision in its contract
  and adopted the skills (`def9fd6`); the primary copies remain uncommitted.

### Visual critic with a scored reference rubric

- 2026-10-07, originating branch `main` (`47c60e0`), local: the owner reported
  that `codex/characters-3d` results were still not acceptable after its critic
  passed them. Cause: visual passes used the diff reviewer (`warwrit_reviewer`),
  which re-checked only the author's fixes and had no reference rubric. Added
  [VISUAL_CRITIQUE.md](docs/engineering/VISUAL_CRITIQUE.md) (author inputs,
  first-look test, 8 scored criteria, ACCEPT only when every criterion is ≥ 2,
  a convergence rule that forces a technique change, and a calibration example on
  `1687b19`). Also added the Codex `warwrit_visual_critic` agent (registered in
  `.codex/config.toml`), the Claude `warwrit-visual-critic` agent, an
  [AGENTS.md](AGENTS.md#independent-playable-critique) policy bullet and the
  critique step in the `warwrit-characters-3d` skill. Check: an independent run
  of the rubric on the `1687b19` captures, without the calibration section,
  returned REJECT with the same gaps (pose, rendering language, night value,
  shield material, attack clip) and a convergence note. Prettier and link checks
  PASS; TOML parses. The branch agent copied the files into `codex/characters-3d`
  (`def9fd6`); the primary copies remain uncommitted.

### Skills: 3D character workflow and GLB optimisation

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner reviewed
  Codex thread `01a112ef-4c1f-7591-be7d-0fd49504ebee` (`codex/characters-3d`,
  style gate v2) and approved the character tilt toward the camera and Mixamo for
  clips missing from UAL. Added the
  [warwrit-characters-3d](.agents/skills/warwrit-characters-3d/SKILL.md) skill.
  It covers the skeleton and clip map, the tilt rule, ink-material value matching
  against the reference, lore limits (no emblems), the Mixamo retarget path, an
  evidence workflow, and `scripts/optimize-glb.sh` (glTF-Transform 4.5.1:
  dedup/prune/resize/WebP). Linked the skill from the
  [skills README](.agents/skills/README.md) and
  [mixamo-blender](.agents/skills/mixamo-blender/SKILL.md). Checks: the script
  ran on copies of `ranger.glb` (9.7 → 1.9 MB) and `Shield_Wooden.glb`
  (5.9 → 0.3 MB); both loaded in Babylon 9.28 with textures ready. A live tilt
  probe (−25…−30°) in the branch workshop gave an upright, reference-like figure.
  Corrections on the same day: the camera convention (the workshop views from +z,
  the battle camera from −z), the contact-shadow direction (screen up-right in
  the game camera) and plain-path references to the untracked `combat.md`. At the
  owner's request the review session copied both skills into `codex/characters-3d`
  with the owner decisions and next-cycle brief (commit `3f4fc06`, audit NOT_RUN
  under the branch exception). The primary copies remain uncommitted.

### Agent rules: work-package step discipline

- 2026-10-07, originating branch `main` (`47c60e0`), local: owner asked to
  prevent repeats of the defects found in the review of Codex thread
  `01a112ef-4c1f-7591-be7d-0fd49504ebee` (`codex/characters-3d` step 1:
  worktree and downloads in `/private/tmp`, production build and coverage run
  in parallel for a load-only step, timeouts reported without isolated rerun,
  audit blocker not asked, hand-edited lockfile, link to an untracked
  screenshot). Owner chose: intermediate work-branch commits may use
  `--no-verify` with the audit recorded `NOT_RUN`, passing before the PR.
  Added [AGENTS.md § Work-package steps](AGENTS.md#work-package-steps) and a
  sequential-checks rule under Proportional verification; cross-linked from
  [LOCAL_DEVELOPMENT](docs/engineering/LOCAL_DEVELOPMENT.md). Documentation only;
  game checks not applicable. Not committed/published/merged.

### Characters: real-time 3D plan with swappable equipment — proposal

- 2026-10-06, originating branch `main` (`47c60e0`), local: owner asked for a
  precise agent plan after reviewing the stalled Codex sprite-pipeline thread.
  [M1-CHARACTERS-3D](docs/work-packages/M1-CHARACTERS-3D.md) proposes real-time
  3D characters in Babylon (CC0 Quaternius bodies/outfits/animations, bone
  attachments) in eight time-boxed steps. Step 0 is an owner gate to amend the
  ADR-0006 sprite direction; nothing is activated. Documentation only; code,
  assets and checks NOT_RUN. Not committed/published/merged.

### Progression research and candidate balance correction

- 2026-10-06, originating branch `main` (`47c60e0`), local: owner requested
  continued modern-game/review research and concrete skill balance.
  [20-game overview](docs/wiki/progression-research.md),
  [source editions/limits](docs/wiki/progression-research-sources.md) and
  [B1 profile](docs/wiki/character-balance.md) compare tactics, practice,
  injuries and hybrid tradeoffs. Candidate future XP rates/course pace/physical
  bounds added; earlier whole-turn shot/armor prices corrected, attack reactions
  prepaid and eight hybrids priced. 13 disciplines/52 perks retained.
  Affected: owning progression/ability pages, combat cross-links, wiki index/log
  and CURRENT_PLAN. All new rules remain review-draft; accepted source policies,
  code/contracts/migrations/assets/player state unchanged. Actual documentary
  and arithmetic checks recorded in [owning results](docs/wiki/character-progression.md#исследование-и-поправка-b1--2026-10-06);
  gameplay/UI/simulation/playtest/independent playable critique NOT_RUN,
  actual balance/pace/course economy NOT_MEASURED. Not committed/published/merged.

### Character skills and hybrid abilities — design proposal

- 2026-10-06, originating branch `main` (`47c60e0`), local: owner requested
  skill trees, warrior/archer classes, hybrids and injury-related development.
  [Owning design](docs/wiki/character-progression.md) adds 13 discipline descriptions,
  eight roles and strength/health/pain/courage rules;
  [catalogue](docs/wiki/character-abilities.md) proposes 52 perks/eight hybrids.
  Retain actual-practice/finite-study/discipline-choice policies; damage alone
  does not award XP or increase HP/strength. Five added disciplines and all
  new ability/physical balance remain review-draft. Affected: two owning wiki
  pages, combat cross-links, wiki index/log and CURRENT_PLAN; source/contracts,
  migrations and player state unchanged. Documentation format/local-links/
  choice structure/readback/scoped diff-check PASS, recorded in owning design;
  implementation/game/browser/independent playable critique
  NOT_RUN, learning pace/balance NOT_MEASURED. Not committed/published/merged.

### Living-world merged / local-main synchronization

- 2026-10-05, originating branch `codex/living-world-main`, merged:
  owner requested merge/update main. [PR151](https://github.com/Vovanostm/warwrit/pull/151)
  (`f9d300d`) merged as `47c60e0`; primary/origin/GitHub main match, reviewed
  tree unchanged. Four-biome fauna/reactions, local synthesized ambience,
  bounded place work, lawful observations and known-work notes delivered.
  Web presentation/assets/registry/owning docs affected; no domain/protocol,
  migration or player-data change. Exact-head PR CI attempt2 SUCCESS (643/47,
  10000 stress,14 SQL/auth, coverage/audit); attempt1 navigation coverage
  timeouts retained. Independent critic READY_WITH_LIMITS; local typecheck,
  diff/readiness/native reload PASS. Scoped recovery preserves unrelated drafts,
  company/North Yard/850 crowns and original DB/Dex. Main CI IN_PROGRESS;
  actual new travel NOT_RUN, FPS/RAM/audio quality NOT_MEASURED.
  [Owning results and recovery](docs/wiki/m1-spec.md#слияние-и-обновление-main--2026-10-05).
  This dated closeout is local/uncommitted; no deployment.

### Living-world commit-audit correction

- 2026-10-05, originating branch `codex/living-world-main`, local: the ordinary commit audit rejected eight introduced complexity findings. Extract cohesive habitat/population/animation, sound and background UI functions without changing behavior or any gate. Corrected audit, focused7, typecheck/lint and temporary90-second exact fauna comparison PASS; initial diagnostic path failure retained. Earlier full coverage643/47 and bootstrap remain pre-extraction evidence; final PR CI is pending. [Owning validation](docs/wiki/m1-spec.md#проверка-изолированной-поставки--2026-10-05). No canonical state or migration change.

### Living-world delivery authorized

- 2026-10-05, originating branch `codex/living-world-main`, local: owner requested “merge, update local main”. Isolate the reviewed habitat/reaction/audio/place-activity/lawful-observation slice from unrelated primary drafts. Include its original wildlife assets/provenance and registry; canonical state, migrations and player data unchanged. Prior clean bootstrap PASS and independent capture review retained; exact PR CI and merge pending. [Owning behavior/checks](docs/wiki/m1-spec.md#реализация-живой-среды--2026-10-05).

### Living-world presentation implementation

- 2026-10-05, originating branch `main` (`f3d214c`), local: owner authorized
  implementation of the biome/living-world discussion. Habitat-specific four
  species now use actual flowers/trees and react to the company; opt-in local
  synthesized ambience, bounded day/night settlement work, lawful current map
  observations and company-known completed-work notes are integrated. Affected:
  web renderer/game presentation; owning [implementation and checks](docs/wiki/m1-spec.md#реализация-живой-среды--2026-10-05).
  No protocol, canonical state, migration or player-data change. Focused7,
  web typecheck/lint/format/architecture and representative native/component
  desktop/sound checks PASS after documented corrections. Independent affected
  source/capture critique found no remaining material defect after frog/bird
  scale correction; forest flight remains visually unproven. Clean final bootstrap
  PASS:643/47 skipped,10000 stress battles, migration smoke/14 PostgreSQL/auth
  checks; temporary DB removed. Real new journey, FPS and audible sound quality
  unverified.
  Actual moving patrols need unavailable route/observation state; no invented
  traffic, new species, seasons, paid art, publication, merge or deployment.

### Living-world layers beyond fauna — design follow-up

- 2026-10-05, originating branch `main`, local: owner's follow-up asks whether
  fauna is sufficient. [Owning recommendation](docs/wiki/m1-spec.md#достаточно-ли-фауны-для-живого-мира--2026-10-05)
  adds priorities for shared environmental motion, place-specific sound,
  settlement work, local reactions, actual world traffic and fact-bound
  consequences. Existing motion remains acknowledged; moving traders/caravans
  are not activated in M1. Documentation-only review-draft; no code/assets/audio
  or player-state change. Formatting/local links/readback checked; gameplay
  and browser acceptance NOT_RUN, appeal/production cost NOT_MEASURED.

### Biome-specific ambient wildlife proposal

- 2026-10-05, originating branch `main` (`f3d214c`), local: owner requested
  distinct biome fauna instead of hares/butterflies everywhere.
  [Owning matrix and next cycle](docs/wiki/m1-spec.md#20-биомы-и-живая-природа--2026-10-05)
  compare actual geography and four current wildlife forms with live WORLD/lore
  Notes/Purpose and inspected art. Propose habitat-based distribution, quiet
  forest/rock areas, dragonflies/ducks next, and later forest/night/domestic life.
  Real contract wolves/mill beast remain separate from ambient decoration.
  Only wiki/checkpoint/changelog documentation changed; runtime, assets and
  player state unchanged. Initial new-table formatting failure corrected;
  repeated formatting/local-link/readback checks PASS. Implementation, new
  browser journey/game tests/independent playable critique NOT_RUN; density/FPS
  NOT_MEASURED. Review-draft, not committed/published/merged.

### Company opening after reading Russian classics

- 2026-10-05, originating branch `main`, local: owner again rejected the
  compressed origin as non-literary and requested Lermontov, Dostoevsky and
  Tolstoy. Read the opening of Bela, Crime and Punishment I.1 and Caucasian
  Prisoner I–II; [sources and reading limits](docs/wiki/onboarding-references.md#классическая-проза--2026-10-05).
  Replaced the [five-page sample](docs/wiki/onboarding-book.md) with one
  third-person scene: proposal, questions, hesitation, paid hiring and arrival
  next morning. Miron is only a sample name for the player-selected leader.
  [Owning history and checks](docs/wiki/onboarding-lore.md) retains prior
  rejections. This sample covers two companions only; background mapping and
  first-job availability remain unresolved. M1 contracts/supplies/code unchanged.
  New prose is review-draft, not accepted or published; UI/art/playtest NOT_RUN.

### Company opening revised after owner rejection

- 2026-10-05, originating branch `main`, local: supersedes the military-opening
  recommendation below. Owner rejected its prose and fit with Warwrit, authorized
  a new origin, then requested clearer language and believable motives. Earlier
  rank correction and D&D reading remain historical research. The current
  [five-page book](docs/wiki/onboarding-book.md) follows a completed escort job,
  known companions and paid hiring from savings;
  [owning comparison](docs/wiki/onboarding-lore.md) records rejections and scope,
  [references](docs/wiki/onboarding-references.md) retain actual reading limits.
  Existing backgrounds, world contracts and supplies are unchanged. Navigation,
  wiki log and CURRENT_PLAN corrected after the shared writer completed.
  Formatting/local-link/readback checks PASS; UI/art/playtest NOT_RUN.
  New prose remains review-draft, without owner acceptance; not published/merged.

### Place motion merged closeout

- 2026-10-05, originating branch `codex/place-motion-sync`, merged:
  [PR150](https://github.com/Vovanostm/warwrit/pull/150), reviewed2c271ce,
  merged asf3d214c. PR CI37318286511 SUCCESS: bootstrap639/47 skipped,
  10000 stress battles, migrations/14 PostgreSQL checks, coverage and audit.
  Independent source/current-capture review found no material defect. Local
  main updated to the same remote commit; only two shared documents required
  scoped recovery, preserving all other drafts/player data and both histories.
  Integrated typecheck/diff/readiness PASS; existing local5293 runtime restored
  without data reset/migration. Main CI37319767204 IN_PROGRESS, new logged-in
  journey NOT_RUN; no deployment. Supersedes earlier local/pending motion entries.
  [Owning closeout](docs/work-packages/M1-LIVING-PLACES.md#motion-synchronization-merged-closeout--2026-10-05).

### Synchronized place motion

- 2026-10-05, originating branch `codex/place-motion-sync`, local: owner
  authorized merge/local-main update of the timing correction. Reapplied on
  PR149/main `793ce7e`, retaining its mount/draw extraction. `PlaceScene.tsx`,
  `place-scene.css` and `place-depth-scene.ts` drive painting, doors/smoke and
  outer layers from the same smoothed look, including startup/pointer leave,
  with no second active CSS transition. Assets/depth/amplitudes, fallback,
  reduced motion and player data retained. Earlier focused/browser review is
  historical; fresh typecheck/projection2/coverage639/47 skipped/audit and
  desktop360-frame/input/reduced-motion/fallback PASS, source review clear;
  fresh capture review/PR CI/merge pending. No migration/deployment.
  [Owning behavior, checks and limits](docs/work-packages/M1-LIVING-PLACES.md#motion-synchronization-delivery--2026-10-05).

### Location depth isolated validation

- 2026-10-05, originating branch `codex/place-depth-main`, local: final
  navigation-base candidate passes coverage639/47skipped, focused projection2/2,
  web typecheck, scoped lint/format and ordinary audit. Initial CRAP findings
  were corrected by cohesive mount/render/interpolation extraction with the
  same behavior and unchanged gate. Fresh isolated desktop native entrance,
  Escape/focus, movement, remount and12 actual extreme/fallback/reduced-motion
  states pass. Failed automation attempts and current evidence are retained in
  [owning verification](docs/work-packages/M1-LIVING-PLACES.md#isolated-candidate-verification--2026-10-05).
  Source scope and desktop policy above remain; PR CI/merge pending, FPS/memory
  NOT_MEASURED, full mill journey NOT_RUN.

### Location depth delivery authorized

- 2026-10-05, originating branch `codex/place-depth-main`, local: owner
  approved publication, merge and local-main update of the existing depth slice.
  Isolated branch starts at navigation main9ee53d3 and retains the reviewed DPR
  and foreground-edge corrections plus desktop policy. Scope and selected
  current visual evidence in
  [owning delivery record](docs/work-packages/M1-LIVING-PLACES.md#publication-authorized--2026-10-05).
  Local coverage and ordinary audit are recorded there; current-head PR CI,
  publication and merge remain pending. Unrelated primary drafts/player data
  preserved; no new migration or canonical gameplay change.

### Synchronized place motion

- 2026-10-05, originating branch `main`, local: owner-reported place image/
  parallax timing mismatch corrected in `PlaceScene.tsx`, `place-scene.css`
  and `place-depth-scene.ts`. Active outer layers now use the painting's
  smoothed look in the same render frame, including startup and pointer leave;
  remove their independent450ms CSS delay. Existing assets/depth/amplitudes,
  entrances/smoke, reduced motion, fallback and player state retained. Focused
  source checks and360-frame desktop component-browser/input checks PASS;
  independent source/seven-capture critic found no material defect; full
  journey/game/DB gate NOT_RUN.
  Local/uncommitted/unpublished, no migration or deployment.
  [Owning behavior, checks and limits](docs/work-packages/M1-LIVING-PLACES.md#синхронизация-движения-слоёв--2026-10-05).

### PR148 merged and primary main updated

- 2026-10-05, originating branch `codex/map-topology-experiments`, merged
  [PR148](https://github.com/Vovanostm/warwrit/pull/148) as `9ee53d3`; local-main
  closeout on `main` after the owner's explicit merge/update request. PR and main
  CI SUCCESS. Coordinated primary/doc write freezes, scoped six-document recovery
  and safe fast-forward retained all local source, assets, lore/forest/place/wildlife
  histories and player data. HEAD, origin/main and GitHub main match `9ee53d3`.
  Core build, core/web typecheck, diff and5287 proxied readiness PASS; normal
  browser reload restores the rendered map and original stationary850-crown company.
  No new travel or full integrated gameplay gate was run in this update; retained
  starvation limitation remains. Recovery stash retained; unrelated drafts remain
  uncommitted. No migration, deployment or player reset.
  [Owning closeout](docs/wiki/m1-spec.md#слияние-и-обновление-primary-main--2026-10-05).

- 2026-10-05, branch `codex/map-topology-experiments`, published:
  [PR148](https://github.com/Vovanostm/warwrit/pull/148) delivers the owner-selected
  hex default, cached exact route edges and bounded terrain detours. Independent
  source/playable review and focused checks pass; current-head clean CI and the
  explicitly authorized merge remain pending. Primary main is at PR147 with
  concurrent drafts preserved. GitHub owns subsequent CI/merge facts.
  [Owning delivery record](docs/wiki/m1-spec.md#ревью-и-доставка--2026-10-05).

### Company origins and illustrated opening — design proposal

- 2026-10-05, originating branch `main`, local: owner requested lore, MMO
  consistency, literary/Slavic references and a credible illustrated opening.
  [Owning comparison](docs/wiki/onboarding-lore.md),
  [ten-page book and late entry](docs/wiki/onboarding-book.md) and
  [sources/quest motifs](docs/wiki/onboarding-references.md) compare four origins
  and propose one shared military catastrophe with distinct witnesses, followed
  by later arrivals with other histories. Name/appearance precede the book;
  company naming follows it. Dragon, war, biographies and legal procedure remain
  proposals; existing M1 contracts, starting supplies and accepted private-world
  scope are preserved. Documentation fields/local links/formatting checked;
  initial formatting and link-parser issues corrected in owning results.
  Navigation and CURRENT_PLAN updated after parallel writers completed.
  No code/art implementation, publication or merge; gameplay/CI/independent
  playable critique NOT_RUN, reading time/appeal/capacity NOT_MEASURED.

### Ambient map wildlife

- 2026-10-05, originating branch `main`, local: owner-requested hares and
  butterflies animate on the global map. `map-wildlife.ts`, its regression,
  four continuous-map lifecycle additions, original `wildlife-v1` atlas/provenance
  and two asset registrations implement seeded safe habitats, bounds/rest,
  irregular winged flight and night response without targets or canonical NPC
  state. Future parties/traders/enemies remain separate scope. The independent
  integrated critic's butterfly readability finding was corrected and repeated
  desktop capture review found no remaining material defect. Focused checks,
  final primary typecheck/lint/format, architecture and content validation PASS;
  initial clean bootstrap PASS (632/47 skipped, 10,000 stress battles, migrations/
  14 PostgreSQL tests), corrected-source final bootstrap PASS with the same counts
  and temporary infrastructure removed. Pan/zoom and
  day/night motion inspected; retained company stayed stationary with 850 crowns.
  FPS/memory/enjoyment NOT_MEASURED; wildlife travel/STOP/reload NOT_RUN by this chat.
  Not committed/published/merged; no migration, player reset or deployment.
  [Owning results and limits](docs/work-packages/M1-FREE-MOVEMENT.md#ambient-map-wildlife--2026-10-05).

### Forest main/runtime closeout

- 2026-10-05, originating branch `codex/forest-diversity-main`, merged PR147
  `548837c`; local runtime/integration closeout on `main`: owner requested normal
  sign-in, verification, writer coordination and working primary main. Both active
  primary authors paused writes; safe fast-forward retained all drafts and both
  histories, with recovery stash kept. Restored5287/API3187/realtime3188 and matched
  PUBLIC_ORIGIN/OIDC callback without changing the other author's .env/services
  or retained player DB. Wildlife consumes the merged polygon-edge helper; its
  source/atlas remain the other local slice. Scope: forest integration/runtime,
  `M1-FREE-MOVEMENT`, `CURRENT_PLAN` and this entry. PR/main CI SUCCESS, integrated
  web typecheck/diff/readiness PASS; actual normal-UI opening, movement/S/reroute,
  reload/arrival, purchase and pan/zoom/day/night proof in separate test DB.
  Final independent forest critic PASS, including fully rendered settled reload
  at1365×900; old-company starvation recovery remains outside
  accepted rules. No deployment, player reset, new migration or full-M1 claim.
  [Actual result and limits](docs/work-packages/M1-FREE-MOVEMENT.md#primary-main-integration-and-actual-journey--2026-10-05).

### Tree diversity on current main

- 2026-10-05, branch `codex/forest-diversity-main`, local: owner requested the
  working 14-form forest in main. Continue PR146's composed curved crowns and
  original atlas style, with age/species silhouettes and deterministic natural
  pockets/clearings; preserve relief, input, routes and gameplay. Scope: web tree
  forms/geometry/placement/geography/mount and owning docs. Prior whole-sprite
  attempt and primary unrelated drafts/player data remain preserved. Four focused
  geometry/placement checks, typecheck/build/lint/content pass;
  independent source and day/night art critic READY_WITH_LIMITS. Full local
  coverage FAILED two unchanged navigation timeouts (629 pass/47 skip); normal
  PR CI/merge pending, authenticated journey NOT_RUN after automatic login
  rejection. Shared picking decoder/terrain validation and site-assembly extraction retain
  projection, material, alpha and input guards; final unchanged audit passes
  with current focused coverage.
  Active primary location-depth writer prevents overlapping shared-file writes;
  no deployment or new migration.
  [Owning scope/results](docs/work-packages/M1-FREE-MOVEMENT.md#tree-diversity-on-current-main--2026-10-05).

### Desktop target

- 2026-10-05, originating branch `main`, local: owner specified desktop as
  the supported game version, with landscape-only mobile viewing of the same
  interface at a smaller scale. [AGENTS.md](AGENTS.md#desktop-viewport-and-mobile-orientation)
  records the shared layout/acceptance target and excludes a separate mobile
  or portrait UX. Existing adaptations are retained; this changes instructions,
  not the UI. Current place work follows the updated scope. Documentation
  readback, formatting and scoped diff/link checks completed at closeout;
  no game tests needed for this policy-only change. Not published or merged.

### Location depth implementation

- 2026-10-05, originating branch `main`, local (not committed or published):
  owner requested optimal method selection, implementation, review and testing.
  Five offline Depth Anything V2 Small maps drive an original Babylon.js
  perspective shader; doors and smoke share the depth projection. Existing
  paintings, distant/foreground layers and game actions are preserved. Scope:
  `PlaceScene`, place layout/CSS, new `place-depth-*` renderer modules/tests,
  `prepare-place-depth.py`, `places/depth-v1`, additive asset registry and
  [owning result](docs/work-packages/M1-LIVING-PLACES.md#location-depth-implementation--2026-10-05).
  Focused projection tests, web build/typecheck, architecture and content97
  PASS. Independent repeated source/visual critique found no open material
  defect in five scenes/day/night/extremes; corrected the reproduced GPU-fallback
  edge strip by retaining the original static parallax range and resetting look.
  Final clean bootstrap at `548837c` plus this slice PASS:633/47skipped,
  10000-battle stress, migrations/14 PostgreSQL checks. Native entrance/Escape,
  remote-access and reduced-motion/fallback/lifecycle assertions PASS; harness
  and motion-frame proof limits are recorded in the owning document. Earlier
  final-source attempt was interrupted during build, not counted as a pass.
  Unrelated dirty work and retained player data preserved. No migration,
  publication of this slice, merge, deployment or paid provisioning. Forest PR147
  was integrated separately by its authorized writer with this dirty slice retained.

- 2026-10-05, originating branch `main`, local sharpness correction: native
  final view exposed a half-size canvas after a DPR2→1 transition. Removed the
  place renderer's manual hardware scaling override; shared Babylon adaptive
  scaling now retains full DPR resolution. Fresh DPR1/DPR2 mounts and repeated
  viewport/DPR changes PASS; new neutral/extreme/motion captures and affected
  independent critic show no material defect. Corrected clean bootstrap on
  `548837c` plus this slice PASS:633/47skipped,10000 battles,migrations/14PG.
  Prior cancelled stale-copy attempt is not counted. Updated source and
  [correction/evidence](docs/work-packages/M1-LIVING-PLACES.md#исправление-чёткости--2026-10-05);
  other authors' forest closeout preserved. FPS NOT_MEASURED; remains uncommitted.

- 2026-10-05, originating branch `main`, local gate-edge correction: owner
  reported clipped foreground edges at mouse extremes, missed by the previous
  visual pass. Active CSS foreground overscan increased to1.13 to cover the
  full42/21px travel; fallback/reduced-motion behavior retained. Native32-corner
  checks across four settlements/minimum desktop/fallback/reduced motion and
  scoped CSS format/diff PASS; affected critic DONE, no material finding. Full game/DB gate
  NOT_RUN for this CSS-only followup, FPS NOT_MEASURED. Scope: place CSS and
  [owning correction](docs/work-packages/M1-LIVING-PLACES.md#края-переднего-плана--2026-10-05);
  retained data/other writers untouched; uncommitted/unpublished.

### Location depth research

- 2026-10-05, originating branch `main`, local (not committed or published):
  owner requested modern simple methods and ready workflows for perspective
  inside location paintings. [Owning comparison](docs/work-packages/M1-LIVING-PLACES.md#location-depth-methods--2026-10-05)
  records source-checked tools, model/license/device limits and a proposed
  depth-shader-first prototype with selective occlusion repair. Updated only
  `M1-LIVING-PLACES`, `CURRENT_PLAN` and this entry; existing dirty work retained.
  Documentation readback, formatting, scoped diff and local links checked.
  No game/asset change; tool execution, integration and playable critique
  NOT_RUN, quality/performance NOT_MEASURED. No publication/merge/deployment.

### Terrain implementation

- 2026-10-04, branch `main`, local (not committed or published): owner requested
  implementation of [terrain-art](docs/wiki/terrain-art.md#13-реализация--2026-10-04)
  with subagents. First five original ink terrain/road PNGs and exact provenance
  use existing material slots; asset registry preserves historical resources.
  Removed the legacy 38% flat meadow tint so authored earth/grass washes survive.
  Scope: `assets/art/m1/terrain-ink-v1`, `assets/manifest.json`, renderer `art.ts`
  and `terrain-material.ts`; unrelated dirty route/docs preserved. Focused web
  typecheck, content validation, production build and lint/format passed. Independent
  source/raster critic found no established defect, but current integrated views
  and movement remain NOT_RUN after expired login and rejected test sign-in.
  Explicit sign-in/trip approval pending. Remaining five materials, full visual
  acceptance and candidate performance NOT_RUN/NOT_MEASURED; no merge/deployment.

### Added

- 2026-10-05, branch `codex/map-topology-experiments`, local (started 2026-10-04): owner-requested
  implemented comparison of square and six-neighbor hex navigation over the same
  exact geometry, roads and speed policy. Static road-edge costs and surface
  priority preparation are retained per field. At this stage, production kept
  square search and hex was opt-in; the later owner decision under Changed
  supersedes that default. Persisted V2/V3 plans remain unchanged.
  101 cases × 3 interleaved repeats: optimized square keeps 297/297 successful
  paths/durations, p95 175.96→100.09ms; hex p95 90.96ms but mean/worst travel
  duration +1.32%/+9.32%. Adds the finite reproduction script and measured case
  evidence; extends existing road-detour/thin-bridge specifications.
  [Owning results and limits](docs/wiki/m1-spec.md#эксперимент-и-реализация--2026-10-04).
  Final bootstrap PASS (verify 631/47 skipped, stress 10000, migrations/auth 14);
  separate movement PostgreSQL 11 and domain 20 PASS. Move/STOP/reload/reroute
  inspected independently from captures/response evidence; no confirmed new
  navigation defect. Historical failed attempts/limits remain in the owning page.
  Adds `experiment:navigation` in package.json. No migrations, deployment or
  merge; local uncommitted isolated checkout only, primary writers preserved.

- 2026-10-04, originating branch `main` at `bcc30f5`, local: owner-requested
  [global-map topology research and proposal](docs/wiki/m1-spec.md#19-гексы-устройство-глобальной-карты-и-генерация--2026-10-04)
  compares hex authoring, exact movement, terrain blending, current weighted
  search and future generation using current source and primary references.
  Recommends keeping continuous movement/exact roads and measuring search before
  changing topology; updates `CURRENT_PLAN` and wiki log. 100-goal source probe:
  98 paths/2 blocked goals / 0 errors, p95 1014.78ms under concurrent local builds;
  isolated performance/hex benefit NOT_MEASURED, game tests/browser/critic NOT_RUN.
  Documentation readback, local links and scoped diff checked. Changes are only
  in an isolated documentation checkout due to primary shared-file writers;
  NOT_INTEGRATED, uncommitted/unpublished. No game or save changes.

- 2026-10-04, originating branch `main`, local: owner-requested
  [terrain art specification](docs/wiki/terrain-art.md) for fields, marshes and
  roads coherent with existing ink town/village art. Defines shared inspected
  references, ten target materials, transitions, road-direction constraints,
  staged production and integrated visual/gameplay acceptance. Preserves the
  owner's example under `docs/wiki/references/`; updates wiki navigation/log and
  `CURRENT_PLAN`. Production details and numerical targets remain proposals.
  Documentation readback, links, formatting and scoped diff checked; new textures,
  game/runtime acceptance NOT_RUN, performance NOT_MEASURED. No publication/merge.

- 2026-09-29, #125: fallow (`pnpm check:dead-code` in `pnpm verify`,
  `pnpm check:changes` on pull requests, `pnpm report:quality`) and ast-grep
  code-shape rules with rule tests (`pnpm check:patterns`).
- 2026-09-29, #128: `pnpm test:coverage` (v8, no threshold) as evidence for
  `fallow health --coverage`; specifications for encounter HTTP authorization,
  the encounter command guard and duty-change learning settlement.

- 2026-09-29: `pnpm agent:status` prints live main, CI, open pull requests,
  active unmerged branches with their paths and the next migration number from
  git and gh, replacing hand-written status readback.
- 2026-09-30, #133: Git `pre-commit` and `pre-merge-commit` hooks run
  `pnpm check:changes` for every agent and terminal, not only Claude; Markdown-only
  commits skip. `pnpm install` (or `pnpm run prepare` in an existing clone) sets
  `core.hooksPath`, and `pnpm agent:preflight` reports it. Codex rules prompt on
  `git commit --no-verify`.

### Fixed

- 2026-10-05, originating branch `codex/component-forest-integration`, merged:
  [PR146](https://github.com/Vovanostm/warwrit/pull/146), reviewed `2ed5f08`,
  merged as `917644a`; supersedes pending entries below. Dark map art, composed
  trees, grounded contacts, alpha picking and labels retain main roads/supplies/
  unmasked routes. PR CI37234733636 SUCCESS: bootstrap628/47 skipped,10000 battles,
  migrations/14 PostgreSQL checks, coverage and unchanged audit. Primary main
  updated; both histories and five local terrain-ink slots preserved, restore
  conflicts resolved and recovery retained. Main push CI37235532971 IN_PROGRESS.
  Bounded critic approval; combined-route recapture/post-merge browser refresh
  NOT_RUN after URL-policy rejection. Local drafts remain outside PR art acceptance.
  [Owning result/limits](docs/work-packages/M1-FREE-MOVEMENT.md#component-forest-merged-closeout--2026-10-05).
  Primary typecheck/content92/format/diff PASS; Airtable checkpoint read back.
  Empirical event FAILED (storage limit), recorded in owning closeout.
  No migration, player-data reset, deployment or full-M1/performance claim.

- 2026-10-05, branch `codex/component-forest-integration`, published PR146:
  integrated newer main `4a82c36` (merged PR145) after concurrent route delivery.
  Preserved full unmasked route/goal annotations and both dated documentation
  histories; resolved only the React import and changelog insertion conflict.
  Final PR-head CI remains required. Browser refresh/capture via the in-app tool
  was blocked by its URL policy; no alternate browser workaround attempted.

- 2026-10-04, branch `codex/component-forest-integration`, local: owner-requested
  dark-fantasy map correction ports approved original terrain/settlement art and
  composed trunk/crown trees onto current main relief. Entrance/root pivots,
  alpha-aware targets and measured labels preserve a shared isometry and natural
  contacts. Scope: web map renderer/labels, original map-dark assets/provenance
  and manifest; roads, supplies, visits and canonical movement retain current main.
  [Owning integration](docs/work-packages/M1-FREE-MOVEMENT.md#component-forest-integration--2026-10-04)
  records actual checks and limits; exact-head PR CI/merge pending.

  Independent source/playable critique and native journey/input pass; original
  audit regressions corrected by bounded assembly/projection/measurement helpers
  and shared deterministic hash/obstacle primitives. One meaningful assembled-tree
  geometry regression added; final coverage628/47skip and audit pass. Exact-head
  PR CI/merge pending; primary concurrent drafts/writers preserved.

- 2026-10-05, originating branch `codex/route-visibility-fix`, merged:
  main push CI37233985843 completed SUCCESS at `4a82c36`, superseding the
  in-progress status below. Live remote main, origin/main and primary main match;
  route files have no local diff. Dev5293 restored the retained company (800
  crowns); readiness and documentation format/diff checks passed. Unrelated
  local terrain/art/wiki/skill work remains preserved. No deployment.

- 2026-10-04, branch `codex/route-visibility-fix`, merged:
  [PR145](https://github.com/Vovanostm/warwrit/pull/145), reviewed head `988eea2`,
  merged as `4a82c36`. PR CI37233180326 passed full bootstrap627/47 skipped,
  10000-battle stress, migration smoke/14 PostgreSQL checks, coverage and audit.
  This supersedes the local/pending entries below. Primary main updated to
  origin/main; scoped documentation restore retained both histories and all
  unrelated terrain/art/wiki/skill work. Main push CI37233985843 is in progress;
  dev5293 and player data retained. Actual merge/results are recorded in
  [the owning closeout](docs/work-packages/M1-FREE-MOVEMENT.md#route-visibility-merged-closeout--2026-10-04).

- 2026-10-04, branch `codex/route-visibility-fix`, local: owner authorized
  publication and merge of the reviewed route visibility correction. Isolated
  delivery includes only the three map files and owning movement/checkpoint/
  changelog records, preserving unrelated terrain/art/docs and retained player
  data. Clean PR CI/publication/merge pending; scoped source and playable results
  are recorded in [the owning contract](docs/work-packages/M1-FREE-MOVEMENT.md#route-visibility-delivery--2026-10-04).

- 2026-10-04, branch `main`, local: owner-authorized normal-UI testing now
  supersedes the permission-pending route correction status below. Town/village
  paths and complete site/ground diamonds were inspected at day/night and
  close/overview scales; S and arrival clear annotations, and reload restores
  the moving route with map art loaded. Independent moving-capture critique found
  no material defect, including the corrected settled-reload capture. Final return
  arrived in Kamenny Brod with overlay cleared; retained company has 800 crowns.
  Existing focused source checks apply to unchanged code; full gate NOT_RUN.
  [Actual journey and limits](docs/work-packages/M1-FREE-MOVEMENT.md#playable-verification-after-owner-authorization--2026-10-04).

- 2026-10-04, branch `main`, local (not committed or published): owner screenshots
  exposed cropped destination markers and missing route sections near settlements.
  Removed SVG clipping by full settlement sprite rectangles, including transparent
  margins; route annotations stay above the map while terrain-draped geometry,
  party junction, label avoidance and input remain unchanged. Affected paths:
  `ContinuousMapCanvas.tsx`, `renderer/route-overlay.ts`,
  `renderer/continuous-map-scene.ts`. Web typecheck, scoped ESLint/Prettier and
  diff checks passed. Live DOM has no route masks and retains `pointer-events: none`.
  Moving visual acceptance is pending permission to move the retained company;
  independent source critique confirmed the fix's cause/scope; no current moving
  visual verdict, new full gate, publication or merge. See
  [route visibility correction](docs/work-packages/M1-FREE-MOVEMENT.md#settlement-route-visibility-correction--2026-10-04).

- 2026-10-04, `codex/supplies-delivery`, merged: [PR144](https://github.com/Vovanostm/warwrit/pull/144)
  merged as `bcc30f5`; this supersedes the published status below. Final-head
  CI passed bootstrap, stress, migrations, coverage and changed-code gates.
  Primary main updated; main push CI37213517376 also passed. Unrelated owner
  drafts/skills and player data retained.

- 2026-10-04, branch `codex/supplies-delivery`, published (not yet merged):
  supplies can be bought through the local bazaar/granary with finite merchant
  stock, exact cash and retained retry receipts; future companies start with
  thirty rations and 800–850 crowns after hiring. Opening forms survive definitive
  rejection and refresh expired options before new requests. The proportionate
  party sprite, terrain-grounded ring and draped route share their foot junction.
  Independent review corrected legacy first-POST initialization, remote-cash
  quotes, carried ration ownership, malformed pending purchases, incomplete
  receipts and GAME_OVER purchase controls. A new ordered 0014 migration retains
  shop state and refuses destructive rollback. Scope: company core/protocol/server,
  web opening/shop/map and party art; owner request and actual checks/limits are in
  [M1-SUPPLIES](docs/work-packages/M1-SUPPLIES.md#delivery-amendment--2026-10-04).
  Local verify627/47 skipped, coverage/audit and sequential PostgreSQL17 checks
  passed; independent source/visual critique found no remaining material defect
  in inspected evidence. Final PR CI/merge pending; expired-form browser creation
  remains NOT_RUN. Existing saves and unrelated drafts are retained.

- 2026-09-29, #128: combat initiative ties, AI targets and canonical replay order
  no longer depend on the host locale (`compareCodeUnits`); stress digest
  unchanged for existing ids.
- 2026-09-29, #128: CI now runs the encounter and OIDC PostgreSQL specifications
  in `pnpm test:migrations`; they were skipped because only `DATABASE_URL` was set.

### Changed

- 2026-10-05, branch `codex/map-topology-experiments`, local committed:
  integrated main `548837c` (PR147) with current trees and route visibility,
  preserving both histories in three documentation conflicts. Navigation source
  remains reviewed. Combined build/typecheck and normal desktop fixture
  move/STOP/reload/reroute/arrival PASS with exact retained points; current-head
  full PR CI and merge remain pending. No migrations, deployment or player-data reset.
  [Owning integration results and limits](docs/wiki/m1-spec.md#ревью-и-доставка--2026-10-05).

- 2026-10-05, branch `codex/map-topology-experiments`, local: final review fixes
  changed-code audit blockers by separating grid preparation and bounded exact
  shortcut selection and sharing the identical legacy span-duration rule in
  `continuous-movement.ts`. Independent revision review found no defect;
  202 exact route/outcome/duration comparisons, 22 focused coverage tests and
  unchanged audit PASS. Earlier loaded-host timeouts remain documented failures;
  PR-head CI and integrated browser acceptance are pending.
  [Owning delivery record](docs/wiki/m1-spec.md#ревью-и-доставка--2026-10-05).

- 2026-10-05, branch `codex/map-topology-experiments`, local: owner authorized
  review, publication, merge and local-main update for the measured hex default
  and routing optimization. Preserve current main's renderer improvements and
  concurrent primary drafts; final review/PR CI/merge remain pending.
  [Delivery checkpoint](docs/engineering/CURRENT_PLAN.md).

- 2026-10-05, branch `codex/map-topology-experiments`, local: owner chose hex
  search speed after disclosure of measured ≤7.2% longer trips. New polygon-v1
  orders default to hex; legacy grids and frozen accepted V2/V3 plans remain.
  Compile sorted neighbors/exact costs once and check ≤16 exact terrain-detour
  candidates before accepting direct smoothing. Eleven of 99 hex routes improve,
  none regress against previous hex; case 51 saves 22.85s. Matched 101×3 typical
  search 29.61→27.24ms, p95 essentially unchanged 219.85→217.97ms under variable host
  load. Updates existing movement specs to public exact-surface queries and adds
  a two-topology terrain regression. Core/tests/experiment and owning docs only;
  no migrations, publication, merge or deployment. JSON spec 3.5.1 records the
  owner decision with historical topology retained. Final bootstrap: 633 tests,
  47 skipped, 10,000 stress battles and migrations/14 DB checks PASS; normal STOP/reload/reroute/arrival
  and independent supplied-evidence critique pass within inspected scope.
  [Results, checks and limits](docs/wiki/m1-spec.md#почему-гексы-и-оптимизация-маршрутов--2026-10-05).

- 2026-10-04, branch `codex/supplies-playtest`, local (not committed or merged):
  [AGENTS.md](AGENTS.md#required-changelog-and-change-awareness) requires agents
  to record substantive changes and their reasons in this changelog before
  closeout/commit/publication, and read incoming entries with `CURRENT_PLAN`
  after resuming, changing branches or integrating changes. Owner requested
  this to prevent agents from confusing branch-specific work and missing new
  decisions. Entries identify affected paths, delivery status and source links;
  integration preserves both branches' history. This entry covers only the
  instruction change and changelog format clarification. Verification: scoped
  diff, readback and local link check; game tests `NOT_RUN` (documentation only).
- 2026-09-29: local containers run on colima; see
  [LOCAL_DEVELOPMENT.md](docs/engineering/LOCAL_DEVELOPMENT.md#container-runtime-colima).
- 2026-09-29, #125: seven internal-only game-core exports removed; `ajv` and
  `fast-check` declared by testkit, which imports them.
- 2026-09-29, #128: encounter routes authenticate in one encapsulated Fastify
  hook; `protocol` owns the encounter id format.
