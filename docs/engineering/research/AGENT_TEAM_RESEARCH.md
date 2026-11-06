# Evidence behind the agent setup

> Research record, 2026-09-29: moved to `docs/engineering/research/`. Not task
> context; load only when reviewing the agent setup. The `code-review` and
> `code-simplifier` helpers named below were later removed; see
> [skills history](../../../.agents/skills/README.md#history).

## Game-skill adoption and forward trials — 2026-11-06

The owner authorized review, addition and subagent trials after the survey and
stack explanation. LOCAL on `codex/harness-diagnostic-skills`, baseline `f82c278b`.
Project-local installation was chosen so source, adaptation and discovery changes
travel with Warwrit. This section supersedes the survey's adoption status below.

### Accepted and removed instructions

| Decision                              | Implemented result                                                                                                                                                                                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adopt Babylon reference narrowly      | [babylonjs](../../../.agents/skills/babylonjs/SKILL.md) diagnoses the existing scene, resource owner, late loads and visible readiness. Retains Apache-2.0 license and pinned provenance.                                                                                        |
| Adopt balance measurement narrowly    | [eval-driven-game-development](../../../.agents/skills/eval-driven-game-development/SKILL.md) checks modeled mechanics, ruleset, seeds, sample and policies. Both absolute targets and regression deltas need approval before gating. Retains MIT license and pinned provenance. |
| Reuse narrative/quest/UX review       | [warwrit-review](../../../.agents/skills/warwrit-review/SKILL.md) routes to an on-demand project-authored reference grounded in writing, canonical knowledge and state transitions.                                                                                              |
| Keep Colyseus with narrower discovery | Activate for actual realtime/API work. Remove the package-presence trigger and automatic new-app scaffolding. Record the local amendment in its provenance.                                                                                                                      |
| Correct art and character routing     | New 2D selects current graphic-novel references. RGB compositing applies to opaque art. Transparent sprite edits preserve alpha. Retained 3D work activates for its assignment. Final critic timing follows current AGENTS.                                                      |
| Retain engine-independent GLB parser  | Replace PlayCanvas-only instruction assumptions and unavailable neighbor-skill links with Babylon placement/runtime checks. Parser and license remain intact.                                                                                                                    |
| Remove stale operational directions   | Delete the character audit-bypass clause and nested CLI/model art-generation recipe. Use current hooks and available image tools.                                                                                                                                                |

No whole existing skill was removed. The reviewed workflows have distinct local
consumers. Four Claude discovery links cover the two additions plus previously
missing Colyseus and GLB inspection entries. Codex uses `.agents/skills/`.

The Babylon upstream's unconditional engine disposal conflicts with Warwrit's
shared per-canvas engine owner and delayed release. The adaptation preserves that
owner. Generic PBR/orbit setup, Havok/XR/WebGPU/GUI/MCP additions and author benchmark
numbers were omitted. The balance adaptation also removes the claim that matching
aggregate win rates proves a seed/refactor preserves deterministic semantics.

Stanestane narrative packages remain research candidates with unresolved licensing.
The local review reference derives from Warwrit's existing rules. Ink/Inky remains
a candidate for a separately bounded narrative integration experiment. This task
adds instruction workflows to the existing product stack.

### Trials and actual observations

Two read-only agents first reviewed candidate adoption and local cleanup. Three
fresh agents then received separate tasks, the adapted skills and minimal raw
sources, without the parent rubric or previous conclusions. Criteria were recorded
before dispatch in ignored `output/gamedev-skill-trial-20261106/rubric.json`.

| Assigned trial                                       | First submitted result                                                 | Actual evidence and limits                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Babylon map close/reopen diagnosis                   | Accepted within source-review scope                                    | Traced `WorldMapCanvas` → map scene → engine owner, delayed release, reacquisition and render-loop cleanup. Preserved the owner. Proposed one native reproduction for a blank canvas. Browser/remount execution NOT_RUN.                                                                                                                                                                                                        |
| Eight-battle sample and physician inference          | Accepted with explicit model limits                                    | `pnpm exec tsx scripts/combat-stress.ts 8`, exit 0. Seeds 1–8, generated `m0-prototype-v1`, mixed aggressive/survivor policies. All eight resolved, alpha 5 / beta 3, 1,019 commands. Replay checks 0 and deterministic reruns 0 because this sample never reaches their interval triggers.                                                                                                                                     |
| Art/GLB routing and supplied narrative/state fixture | Core routing/diagnosis accepted, review-timing clarification requested | Selected current 2D references, alpha-preserving sprite edits and explicitly assigned 3D/GLB workflow. Identified the fixture's hidden-death disclosure and reward-success contradiction. The first plan omitted explicit independent-review scheduling. On clarification, it supplied final-only specialist review, actual images/journey inputs and rubric criteria. No asset generation, GLB execution or visual acceptance. |

The physician question was correctly left open because the executed combat sample
omits recruitment, treatment, medical supplies, rewards and payroll. A larger
unchanged combat run would retain that omission. The generated sample's outcomes
leave ordinary campaign difficulty and player enjoyment unmeasured.

All three initial reports completed. Two were accepted at first submission for
all assigned criteria. The third needed the review-timing clarification described
above. This is a development trial using cases related to the design review.
There was no baseline/control variant or held-out reliability evaluation. General
agent efficiency, token cost and end-to-end product delivery improvement are
NOT_MEASURED. Raw sample output remains at
`output/gamedev-skill-trial-20261106/balance-run.txt`.

The affected five existing skill entrypoints plus two additions grew from 44,925
to 50,322 bytes, a net 5,397-byte increase. This is on-demand workflow content.
No root AGENTS expansion was needed. Narrower discovery and removed stale advice
are expected to prevent specific errors. Their actual savings remain unmeasured.

### Closeout

Pinned upstream entries were downloaded with the built-in installer to owned
ignored staging and byte-compared with the reviewed source. Adapted entries keep
the applicable licenses and local modification records. The local-validator-only
`compatibility` problem was avoided by putting runtime details in the body.
Independent sampled instruction/source diff review ACCEPT. The reviewer checked
resource ownership, installed versions, actual stress sampling, art authority,
alpha behavior, license/provenance pointers and discovery links. The retained 3D
entry still names historical experiment files absent from this checkout. Its
explicit task/contract routing is preserved. Manifest/link/discovery/format/diff
checks PASS. Full game, SQL, browser and release acceptance are NOT_RUN.

All three initial reports were available between the parent dispatch marker at
13:09:52 UTC and readback at 13:15:26 UTC. This 5m34s observation window includes
parallel work, concurrent review and parent activity. The clarification and final
checks followed. Individual agent active effort/token usage is NOT_MEASURED. First-submission acceptance was 2/3 for this development set, eventual
bounded-task acceptance 3/3 after clarification. These counts have no control or
held-out comparison and establish only the described trial outcomes.

## Game-development skills for Warwrit — 2026-11-06

Owner request: find useful skills for this game and its theme. **Supported shortlist,
with bounded adaptation/experiments still needed.** Reviewed 50 source documents:
44 pinned GitHub artifacts from 16 upstream repositories and 6 official engine/network
documents. They contain 31 distinct skill entrypoints. Related files are dependent
sources, not 50 independent studies. Long references were read in relevant sections;
two read-only agents inspected 26 design/narrative documents and local scope rules.
No game work, skill installation, paid service or upstream program was activated.

### What the project actually needs

The inspected checkout uses Babylon 9.28.0, Colyseus core 0.18.17, SDK 0.18.4 and
schema 5.0.34, React/Vite, PostgreSQL canonical state and a pure deterministic core.
The finite normal journey remains the delivery target. Skill research does not
activate product implementation or amend mechanics, balances or content authority.
New 2D artwork uses the approved graphic-novel profile; the fog/wet-stone environment
profile is an explicit override. These do not replace the separate 3D workflow.

Local-gap review identified two potential additions: real-session Babylon lifecycle/
profiling diagnosis and game-shaped browser input/readiness diagnosis. Existing
Colyseus, character/GLB/location, art, domain, delivery and visual-critic workflows
already cover much of the rest. A new skill must add a concrete procedure, not
another GDD, renderer, world bible, test framework or studio organization.

### Recommended use, in order of practical need

1. **Babylon 9 engine reference:** TerminalSkills/babylonjs is the closest new
   technical candidate (GD05). Its module-level asset loading signatures match
   installed 9.28 typings. ESM/deep-import guidance, AssetContainer, debug-only
   inspector and disposal are relevant. Adapt before installation: preserve the
   approved camera/material pipeline, pnpm and existing packages; omit unsolicited
   Havok/XR/WebGPU/GUI/MCP setup. This is a broad reference, not a complete measured
   CPU/GPU/memory-session diagnosis workflow.
2. **Actual game QA:** pair visual output with public state and input observations,
   through normal entry and real time (GD40–43). No inspected external package is
   ready to install unchanged: Summer needs another engine/MCP; the Playwright
   examples assume a different Three.js shooter; actor-kit QA requires R3F/Leva and
   new mutation hooks. Existing Warwrit browser journeys remain the implementation
   owner. Do not skip setup through test APIs and call that normal-path acceptance.
3. **Explicit balance questions:** edhahn/eval-driven-game-development is the best
   conditional candidate (GD16,30–32). It first asks whether the simulator implements
   the suspected mechanic, chooses a small question, retains seed/n/policy and keeps
   unapproved targets nonblocking. Use after a concrete authorized balance question;
   it does not settle enjoyment, player comprehension or SQL correctness. No new
   scenario catalog, simulator or CI gate is needed for this research.
4. **Theme and prose:** the strongest mechanisms are impossible-knowledge,
   narrative-state, environmental-storytelling and dialogue-subtext audits
   (GD11–14,33–34). They fit observer knowledge, state-dependent contract text,
   credible visible detail and distinct human voices. Stanestane's inspected complete
   tree/README supplies no license grant, so this is a mechanism shortlist, not an
   upstream installation recommendation. Do not invent an acquisition event,
   witness, faction or secret motive to make an audit pass. Existing writing rules
   and canonical core remain authoritative.
5. **Networking:** keep the existing official Colyseus skill. Its local entry is
   byte-identical to GD01 at `9e3ce1326a05`. Avoid another generic multiplayer skill
   that selects distributed servers just because the genre is MMO. Prediction,
   synchronized Room state and local input never become canonical money/inventory.

### Ratings: suitability, not measured improvement

Use the earlier rubric: `6F + 5E + 4C + 3I + 2S`, maximum 100. F=task fit,
E=validation evidence, C=proportional cost, I=integration/version/license readiness,
S=scope/finding discipline, each 1–5. These are source-based judgments; small score
gaps are not measurements. Missing license, unavailable engine tools or authority
conflicts block unchanged adoption regardless of score. Stars add no points.
Scores describe mechanism fit; the action column distinguishes already-covered,
conditional, adaptation-needed and rejected candidates. No candidate's productivity
uplift on Warwrit is established.

| Candidate / pinned source                                                                                                                                                                                    | F/E/C/I/S | Score /100 | Recommendation                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| [colyseus/skill](https://github.com/colyseus/skill/blob/9e3ce1326a057f7f1edb71330e1cbb731b9e9536/SKILL.md) (GD01)                                                                                            | 5/3/4/5/4 | 84         | Already present, exact entry match. Reuse for adapter/API work; no second install.                             |
| [TerminalSkills / babylonjs](https://github.com/TerminalSkills/skills/blob/0abb852010feb21984fa40f0bf52352a440ae6d4/skills/babylonjs/SKILL.md) (GD05)                                                        | 5/2/4/4/3 | 74         | Best new engine-reference candidate; adapt to approved renderer/style and local validator before installation. |
| [edhahn / eval-driven-game-development](https://github.com/edhahn/agent-skills/blob/ffc6fc4bf1408bc3cac522916bb58e603f39ab45/eval-driven-game-development/SKILL.md) (GD16)                                   | 3/3/4/5/5 | 74         | Best conditional balance candidate, only for an explicit existing-rule measurement question.                   |
| [Stanestane / audit-impossible-knowledge](https://github.com/Stanestane/narrative-design-skills/blob/ca3c0f7f2854b59e9ffac6dc5674ca15f166aa57/skills/audit-impossible-knowledge/SKILL.md) (GD11)             | 5/2/5/1/5 | 73         | Strong thematic audit fit; no license grant established, so no upstream installation recommended.              |
| [Stanestane / audit-narrative-state](https://github.com/Stanestane/narrative-design-skills/blob/ca3c0f7f2854b59e9ffac6dc5674ca15f166aa57/skills/audit-narrative-state/SKILL.md) (GD33)                       | 5/2/5/1/4 | 71         | Relevant canonical-state-to-prose audit; same license blocker.                                                 |
| [Stanestane / audit-environmental-storytelling](https://github.com/Stanestane/narrative-design-skills/blob/ca3c0f7f2854b59e9ffac6dc5674ca15f166aa57/skills/audit-environmental-storytelling/SKILL.md) (GD12) | 4/2/5/1/5 | 67         | Good future place audit; established evidence only, license unresolved.                                        |
| [Stanestane / audit-dialogue-subtext](https://github.com/Stanestane/narrative-design-skills/blob/ca3c0f7f2854b59e9ffac6dc5674ca15f166aa57/skills/audit-dialogue-subtext/SKILL.md) (GD13)                     | 4/2/5/1/5 | 67         | Good narrow text audit against existing voices; license unresolved.                                            |
| [Stanestane / audit-narrative-consistency](https://github.com/Stanestane/narrative-design-skills/blob/ca3c0f7f2854b59e9ffac6dc5674ca15f166aa57/skills/audit-narrative-consistency/SKILL.md) (GD34)           | 4/2/4/1/4 | 61         | Useful later; overlaps existing lore review and license unresolved.                                            |
| [sickn33 / web-games](https://github.com/sickn33/agentic-awesome-skills/blob/739c841480587361c3cb2047f5b34cdca69a0623/skills/game-development/web-games/SKILL.md) (GD22)                                     | 3/1/4/3/3 | 54         | Reference only; broad framework/PWA/performance defaults are unnecessary.                                      |
| [morbeo / game-design](https://github.com/morbeo/ai-skills/blob/548d3d22eb58eb3ec1f4ab526f317e48b753298a/game-design/SKILL.md) (GD15)                                                                        | 2/2/3/4/3 | 52         | Generic design reference; no current authority to redesign the loop.                                           |
| [Curiosity / BabylonJS](https://github.com/Curiosity-Ai-BV/Babylonjs-Skill/blob/892b375a85199656f02c4aba98f9cf6c8ed3e174/BabylonJS/SKILL.md) (GD03)                                                          | 4/1/3/2/2 | 51         | Do not install unchanged: Babylon 8, reference/API issue and incomplete license packaging.                     |
| [fcsouza / quest-narrative-coherence](https://github.com/fcsouza/agent-skills/blob/a06a4d1201b5c6f9e718d6d37f0e7c53f863248a/skills/quest-narrative-coherence/SKILL.md) (GD09)                                | 3/2/2/3/3 | 51         | Useful consistency idea; do not create another quest/world canon or prerequisite chain.                        |
| [edhahn / game-designer](https://github.com/edhahn/agent-skills/blob/ffc6fc4bf1408bc3cac522916bb58e603f39ab45/game-designer/SKILL.md) (GD17)                                                                 | 3/2/2/3/3 | 51         | Only for separately requested design proposals; avoid studio/engine assumptions.                               |
| [sickn33 / game-design](https://github.com/sickn33/agentic-awesome-skills/blob/739c841480587361c3cb2047f5b34cdca69a0623/skills/game-development/game-design/SKILL.md) (GD23)                                 | 2/1/4/3/3 | 48         | Core-loop heuristics only; approved Warwrit contract already owns the design.                                  |
| [Yuki / game-design-review](https://github.com/Yuki001/game-dev-skills/blob/8a33c687e0d9cadc8c1f1cdeef13f6079e88cb76/skills/game-design-review/SKILL.md) (GD07)                                              | 3/2/2/1/4 | 47         | Evidence method good; 6-domain formal-review minimum and unresolved license block unchanged adoption.          |
| [baxatron / playtest-protocol-designer](https://github.com/baxatron-git/claude-game-design-suite/blob/5dd265ac2b143d13683766cdaae9695d3d871909/playtest-protocol-designer/SKILL.md) (GD18)                   | 3/2/2/1/4 | 47         | Future human-playtest planning only; artifact overhead and license unresolved.                                 |
| [baxatron / world-logic-checker](https://github.com/baxatron-git/claude-game-design-suite/blob/5dd265ac2b143d13683766cdaae9695d3d871909/world-logic-checker/SKILL.md) (GD36)                                 | 3/2/2/1/4 | 47         | Source-based consistency idea, not another world bible; license unresolved.                                    |
| [baxatron / scope-feature-prioritizer](https://github.com/baxatron-git/claude-game-design-suite/blob/5dd265ac2b143d13683766cdaae9695d3d871909/scope-feature-prioritizer/SKILL.md) (GD37)                     | 3/2/2/1/4 | 47         | Existing slice/authority rules already cover near-term scope; license unresolved.                              |
| [sickn33 / multiplayer](https://github.com/sickn33/agentic-awesome-skills/blob/739c841480587361c3cb2047f5b34cdca69a0623/skills/game-development/multiplayer/SKILL.md) (GD21)                                 | 2/1/4/3/2 | 46         | Reject distributed-MMO default; existing Colyseus/core/SQL contract is more precise.                           |
| [shipshitgames / playwright-game-testing](https://github.com/shipshitgames/skills/blob/e4d7d2cf6907041df95f6b66964b94ea2ce6e61c/skills/playwright-game-testing/SKILL.md) (GD42)                              | 3/2/2/2/2 | 46         | Useful QA mechanism; worked game/Three.js hooks and bypassed menus require redesign, not direct installation.  |
| [Summer / playtesting-a-feature](https://github.com/SummerEngine/summer/blob/705da9341fc666a5654400c287ed134636077d15/library/skills/playtesting-a-feature/SKILL.md) (GD40)                                  | 3/2/2/1/3 | 45         | Reject unchanged Summer/Godot tool dependency; existing delivery already requires a real journey.              |
| [Summer / agent-playtesting](https://github.com/SummerEngine/summer/blob/705da9341fc666a5654400c287ed134636077d15/library/skills/agent-playtesting/SKILL.md) (GD41)                                          | 3/2/2/1/3 | 45         | Frame-evidence idea useful; actual Summer runtime controls are unavailable.                                    |
| [GameForge / game-playtest](https://github.com/AlterLab-IEU/AlterLab_GameForge/blob/189979565d092a84d48f3328bdeaa41ce79d523f/skills/workflows/game-playtest/SKILL.md) (GD19)                                 | 3/2/1/2/2 | 42         | Only a future human-research reference; broad studio/session gates unsuitable now.                             |
| [freshtechbro / babylonjs-engine](https://github.com/freshtechbro/claudedesignskills/blob/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd/.claude/skills/babylonjs-engine/SKILL.md) (GD06)                          | 3/1/1/2/2 | 37         | Reject unchanged Babylon 7 reference and blanket visual-degrading optimizations.                               |
| [GameForge / game-design-review](https://github.com/AlterLab-IEU/AlterLab_GameForge/blob/189979565d092a84d48f3328bdeaa41ce79d523f/skills/workflows/game-design-review/SKILL.md) (GD38)                       | 2/2/1/2/2 | 36         | Reject fixed dimensions/finding/test quotas and studio prerequisites.                                          |
| [Edgegap / edgegap-colyseus](https://github.com/edgegap/llm-agent-skills/blob/b153756eeba7174f6d1bf97f6b9b8234fc42988e/skills/edgegap-colyseus/SKILL.md) (GD24)                                              | 1/3/1/1/3 | 34         | Different hosting/runtime lifecycle; no need or authority for platform/deployment change.                      |
| [jonmumm / game-qa](https://github.com/jonmumm/skills/blob/841be8f44106ac9a7dc365cfbbba5ab51276c1db/game-qa/SKILL.md) (GD43)                                                                                 | 2/2/1/1/1 | 31         | R3F/actor-kit/Leva/mutable bridge and license unresolved; poor current fit.                                    |
| [fcsouza / game-economy-design](https://github.com/fcsouza/agent-skills/blob/a06a4d1201b5c6f9e718d6d37f0e7c53f863248a/skills/game-economy-design/SKILL.md) (GD10)                                            | 1/1/2/3/1 | 30         | Reject dual-currency/Stripe/idle-economy defaults and unapproved target values.                                |
| [fcsouza / worldbuilding](https://github.com/fcsouza/agent-skills/blob/a06a4d1201b5c6f9e718d6d37f0e7c53f863248a/skills/worldbuilding/SKILL.md) (GD35)                                                        | 1/1/2/3/1 | 30         | Reject new factions/religion/history quotas; canon already exists.                                             |
| [GameForge / game-narrative-director](https://github.com/AlterLab-IEU/AlterLab_GameForge/blob/189979565d092a84d48f3328bdeaa41ce79d523f/skills/agents/game-narrative-director/SKILL.md) (GD39)                | 2/1/1/2/1 | 29         | Reject competing studio canon, new pipelines and blanket narration rules.                                      |
| [GameForge / game-economy-designer](https://github.com/AlterLab-IEU/AlterLab_GameForge/blob/189979565d092a84d48f3328bdeaa41ce79d523f/skills/agents/game-economy-designer/SKILL.md) (GD20)                    | 1/1/1/2/1 | 23         | Reject monetization/MonteCarlo quotas and transfer-as-creation framing.                                        |

### Why keyword matches and marketplace ratings were insufficient

- GD05's author advertises 87/100 and 2.33x across 3 scenarios, but the landing page
  explicitly marks the score stale. GD25 identifies an Ollama gpt-oss20b model
  judgment and a prior scored artifact, not current runtime/Warwrit measurements.
  The website was opened to challenge the claim; its duplicate claim is not another
  counted source. No benchmark gain is incorporated into our score.
- Curiosity's guide explicitly targets Babylon 8 and its performance reference
  misdescribes `material.dispose(true)` (GD26). Installed9.28's
  `Materials/material.pure.d.ts` says the first `_forceDisposeEffect` argument is
  retained for compatibility; texture disposal is the second argument. This is a
  source/API mismatch, not a reproduced game leak. Its README claims MIT but the
  referenced LICENSE is absent from the inspected complete tree.
- The freshtechbro guide says Babylon 7.x (GD06). Generic PBR/scene optimization can
  replace accepted ink materials or disable shadows, pointer picking and dynamic
  updates. Official DOC01/05 spell out the preconditions and quality degradation;
  optimization advice is not automatic permission to change appearance or input.
- GD10/35 prescribe premium/dual currencies, Stripe, idle formulas, factions,
  religion and history. These conflict with established scope/canon. GD20's flow
  model must not treat transfers as global currency creation. None is an accepted
  Warwrit economy rule or proof of conservation.
- Yuki's formal-document review defaults to at least 6 domains (GD07). GameForge's
  review prescribes a psychology finding and fixed checks/counts (GD38). Finding
  quotas, studio packets and whole-world prerequisites are a poor fit for the next
  playable step, even when the underlying observation→hypothesis→test idea is useful.
- Source precision remains necessary even in official docs: DOC03 uses the options
  generic, while DOC04 retains a `Room<MyState>` example. Installed Colyseus 0.18.17
  `build/Room.d.ts` declares `Room<T extends RoomOptions>`. A copied example is not
  stronger evidence than the installed version's typings and the owning contract.

### Existing instruction issues, separate from game defects

The read-only local comparison also found stale routing worth a later bounded fix:
warwrit-art's initial inputs still foreground historical style-C without explicit
new 2D graphic-novel selection; inspect-glb's description remains PlayCanvas-centric
although the inspector is reused for Babylon; the character skill retains old
step-audit/no-verify guidance despite the current whitespace-only hook. These are
instruction observations. They do not establish a product/art defect and do not
justify replacing the approved3D references or changing assets now.

### Evidence and next discriminating check

Before using a new engine-reference skill, try one existing owned Babylon issue:
read pinned APIs, observe the normal route, capture the actual failure and choose
one targeted check. Preserve scene/camera/style; distinguish lifecycle/resource,
input, network and canonical-state causes. No fresh engine scaffold or inspector
package is implied. For a balance task, verify the real rule exists in the runner
before measuring it. For prose, cite actor/state/chronology for each material claim.
A small native result with one confirmed defect is more useful than a larger pack.

Structural probes actually ran: edhahn and impossible-knowledge manifests PASS;
Terminal's manifest is rejected by the installed quick validator on `compatibility`.
That field is in the Agent Skills standard, so this is a local-validator integration
issue, not proof the skill cannot load in Codex. Installed loading/disposal/Room
signatures were read statically. No downloaded programs, game tests, browser/SQL
journey, performance benchmark or human playtest ran. Runtime benefit is NOT_MEASURED.

Root licenses were retrieved for the most concrete technical candidates: Terminal
Apache-2.0, edhahn MIT and Colyseus MIT. No per-file exception was found in their
inspected skill paths; this is not a legal review of all catalog content. Unknown
license candidates remain unresolved. No author was contacted and no source copied
into the installed skill catalog.

### All 50 source documents

Usefulness ratings concern the source's role in this decision: 4=precise method/API
or discriminating constraint; 3=inspected procedure with applicability limits;
2=catalog/author score claim;1=unsupported opinion. No score is a measured task-success
rate. GitHub artifacts are pinned. Official docs were read on 2026-11-06 in relevant
sections and may change. Mirrored packs, license files, catalog API responses and
failed/unreadable fetches do not inflate the count.

| ID    | Source                                                                                                                                                                                                                                                                                  | Usefulness /5 | What it contributed / limit                                                                                                                                   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GD01  | [colyseus/skill · SKILL.md](https://github.com/colyseus/skill/blob/9e3ce1326a057f7f1edb71330e1cbb731b9e9536/SKILL.md)                                                                                                                                                                   | 4             | Official version-detection/API-drift procedure; existing local entry is byte-identical to this pinned upstream. Retain project SQL/core ownership.            |
| GD02  | [colyseus/skill · README.md](https://github.com/colyseus/skill/blob/9e3ce1326a057f7f1edb71330e1cbb731b9e9536/README.md)                                                                                                                                                                 | 3             | Explains standalone skill, generated reference routing and maintenance checks. Installation count is not outcome evidence.                                    |
| GD03  | [Curiosity-Ai-BV/Babylonjs-Skill · BabylonJS/SKILL.md](https://github.com/Curiosity-Ai-BV/Babylonjs-Skill/blob/892b375a85199656f02c4aba98f9cf6c8ed3e174/BabylonJS/SKILL.md)                                                                                                             | 3             | Modular Babylon 8 reference with disposals/observables; project is9.28. Namespace example, broad modeling scope and malformed reference need review.          |
| GD04  | [Curiosity-Ai-BV/Babylonjs-Skill · README.md](https://github.com/Curiosity-Ai-BV/Babylonjs-Skill/blob/892b375a85199656f02c4aba98f9cf6c8ed3e174/README.md)                                                                                                                               | 2             | README claims MIT but links an absent LICENSE; this is incomplete packaging evidence, not an established full license review.                                 |
| GD05  | [TerminalSkills/skills · skills/babylonjs/SKILL.md](https://github.com/TerminalSkills/skills/blob/0abb852010feb21984fa40f0bf52352a440ae6d4/skills/babylonjs/SKILL.md)                                                                                                                   | 3             | Babylon 9 ESM loaders, AssetContainer, deep imports, debug-only inspector and disposal; broad PBR/Havok/XR defaults need scope adaptation.                    |
| GD06  | [freshtechbro/claudedesignskills · .claude/skills/babylonjs-engine/SKILL.md](https://github.com/freshtechbro/claudedesignskills/blob/1da73febff0c3e1dfefc07f8a5ef8f7d1dfdb6cd/.claude/skills/babylonjs-engine/SKILL.md)                                                                 | 3             | Explicitly Babylon 7.x; useful React listener cleanup, but1230-line generic guide and quality-degrading optimization recipes are poor defaults.               |
| GD07  | [Yuki001/game-dev-skills · skills/game-design-review/SKILL.md](https://github.com/Yuki001/game-dev-skills/blob/8a33c687e0d9cadc8c1f1cdeef13f6079e88cb76/skills/game-design-review/SKILL.md)                                                                                             | 3             | Observation/mechanism/uncertainty/validation is useful. Formal-document comprehensive mode requires at least 6 domains, adding unnecessary breadth.           |
| GD08  | [Yuki001/game-dev-skills · README.md](https://github.com/Yuki001/game-dev-skills/blob/8a33c687e0d9cadc8c1f1cdeef13f6079e88cb76/README.md)                                                                                                                                               | 2             | Catalog of game architecture/design/balance/image workflows; no license grant established in inspected tree/README.                                           |
| GD09  | [fcsouza/agent-skills · skills/quest-narrative-coherence/SKILL.md](https://github.com/fcsouza/agent-skills/blob/a06a4d1201b5c6f9e718d6d37f0e7c53f863248a/skills/quest-narrative-coherence/SKILL.md)                                                                                     | 3             | Quest facts, chronology, actors and reward coherence; prescribed registry/world files and companion skills risk a second canon.                               |
| GD10  | [fcsouza/agent-skills · skills/game-economy-design/SKILL.md](https://github.com/fcsouza/agent-skills/blob/a06a4d1201b5c6f9e718d6d37f0e7c53f863248a/skills/game-economy-design/SKILL.md)                                                                                                 | 3             | Faucet/sink inventory can help a scoped audit; dual currencies, premium/Stripe, idle formulas and numeric health targets are outside authority.               |
| GD11  | [Stanestane/narrative-design-skills · skills/audit-impossible-knowledge/SKILL.md](https://github.com/Stanestane/narrative-design-skills/blob/ca3c0f7f2854b59e9ffac6dc5674ca15f166aa57/skills/audit-impossible-knowledge/SKILL.md)                                                       | 3             | Trace actor, chronology and acquisition/communication/inference; preserve belief versus knowledge and optional paths. No offscreen excuses.                   |
| GD12  | [Stanestane/narrative-design-skills · skills/audit-environmental-storytelling/SKILL.md](https://github.com/Stanestane/narrative-design-skills/blob/ca3c0f7f2854b59e9ffac6dc5674ca15f166aa57/skills/audit-environmental-storytelling/SKILL.md)                                           | 3             | Visible evidence→player inference, interaction support and navigation readability. New props cannot silently invent history.                                  |
| GD13  | [Stanestane/narrative-design-skills · skills/audit-dialogue-subtext/SKILL.md](https://github.com/Stanestane/narrative-design-skills/blob/ca3c0f7f2854b59e9ffac6dc5674ca15f166aa57/skills/audit-dialogue-subtext/SKILL.md)                                                               | 3             | Speaker intent/tactic, literal versus implied meaning and known relationship; no invented secret motives merely to add subtext.                               |
| GD14  | [Stanestane/narrative-design-skills · README.md](https://github.com/Stanestane/narrative-design-skills/blob/ca3c0f7f2854b59e9ffac6dc5674ca15f166aa57/README.md)                                                                                                                         | 2             | Audit/generation separation and severity/confidence conventions fit; public repository has no discovered license-like file.                                   |
| GD15  | [morbeo/ai-skills · game-design/SKILL.md](https://github.com/morbeo/ai-skills/blob/548d3d22eb58eb3ec1f4ab526f317e48b753298a/game-design/SKILL.md)                                                                                                                                       | 3             | Broad MDA/core-loop/design/playtest guidance; no demonstrated new procedure for the already specified normal journey.                                         |
| GD16  | [edhahn/agent-skills · eval-driven-game-development/SKILL.md](https://github.com/edhahn/agent-skills/blob/ffc6fc4bf1408bc3cac522916bb58e603f39ab45/eval-driven-game-development/SKILL.md)                                                                                               | 3             | Check what simulation actually models, choose one question, report seed/n/policy, keep unapproved balance bands nonblocking.                                  |
| GD17  | [edhahn/agent-skills · game-designer/SKILL.md](https://github.com/edhahn/agent-skills/blob/ffc6fc4bf1408bc3cac522916bb58e603f39ab45/game-designer/SKILL.md)                                                                                                                             | 3             | New-design studio workflow with engine/role/document assumptions; not the next step for implementing approved mechanics.                                      |
| GD18  | [baxatron-git/claude-game-design-suite · playtest-protocol-designer/SKILL.md](https://github.com/baxatron-git/claude-game-design-suite/blob/5dd265ac2b143d13683766cdaae9695d3d871909/playtest-protocol-designer/SKILL.md)                                                               | 3             | Blind/facilitated playtests, hypothesis, observation/intervention timestamps; five deliverables and companion roles are disproportionate for code acceptance. |
| GD19  | [AlterLab-IEU/AlterLab_GameForge · skills/workflows/game-playtest/SKILL.md](https://github.com/AlterLab-IEU/AlterLab_GameForge/blob/189979565d092a84d48f3328bdeaa41ce79d523f/skills/workflows/game-playtest/SKILL.md)                                                                   | 3             | Human behavior evidence and traceable observations are useful; session/studio templates and universal participant/severity ratios are not acceptance rules.   |
| GD20  | [AlterLab-IEU/AlterLab_GameForge · skills/agents/game-economy-designer/SKILL.md](https://github.com/AlterLab-IEU/AlterLab_GameForge/blob/189979565d092a84d48f3328bdeaa41ce79d523f/skills/agents/game-economy-designer/SKILL.md)                                                         | 3             | Approved economy stock/flow modeling can help later. New monetization, MonteCarlo/monitoring quotas and transfer-as-faucet examples need rejection.           |
| GD21  | [sickn33/agentic-awesome-skills · skills/game-development/multiplayer/SKILL.md](https://github.com/sickn33/agentic-awesome-skills/blob/739c841480587361c3cb2047f5b34cdca69a0623/skills/game-development/multiplayer/SKILL.md)                                                           | 3             | Server validation/privacy/idempotency advice; blanket MMO→distributed-server selection conflicts with current modular-monolith target.                        |
| GD22  | [sickn33/agentic-awesome-skills · skills/game-development/web-games/SKILL.md](https://github.com/sickn33/agentic-awesome-skills/blob/739c841480587361c3cb2047f5b34cdca69a0623/skills/game-development/web-games/SKILL.md)                                                               | 3             | DOM+canvas lifecycle/audio/fallback hints; new framework/PWA/worker selection, 2MB startup goal and tab-pause recipe are not current requirements.            |
| GD23  | [sickn33/agentic-awesome-skills · skills/game-development/game-design/SKILL.md](https://github.com/sickn33/agentic-awesome-skills/blob/739c841480587361c3cb2047f5b34cdca69a0623/skills/game-development/game-design/SKILL.md)                                                           | 3             | Concise genre/core-loop heuristics; no new design authority or evidence that RPG defaults match this war-company game.                                        |
| GD24  | [edgegap/llm-agent-skills · skills/edgegap-colyseus/SKILL.md](https://github.com/edgegap/llm-agent-skills/blob/b153756eeba7174f6d1bf97f6b9b8234fc42988e/skills/edgegap-colyseus/SKILL.md)                                                                                               | 3             | Concrete Edgegap deployment lifecycle and cost boundaries; different hosting, one-match-per-process and 0.17-oriented setup are outside this project.         |
| GD25  | [TerminalSkills/skills · skills/babylonjs/_scores.json](https://github.com/TerminalSkills/skills/blob/0abb852010feb21984fa40f0bf52352a440ae6d4/skills/babylonjs/_scores.json)                                                                                                           | 2             | Author score87/100 and 2.33x derive from three model-graded scenarios; landing page says stale. No current Warwrit or runtime uplift established.             |
| GD26  | [Curiosity-Ai-BV/Babylonjs-Skill · BabylonJS/references/performance.md](https://github.com/Curiosity-Ai-BV/Babylonjs-Skill/blob/892b375a85199656f02c4aba98f9cf6c8ed3e174/BabylonJS/references/performance.md)                                                                           | 3             | GPU/CPU counters and disposal pointers; unsafe generic optimization scope and incorrect material.dispose(true) comment conflict with9.28 typings.             |
| GD27  | [Yuki001/game-dev-skills · skills/game-design-review/references/production-validation-and-responsibility.md](https://github.com/Yuki001/game-dev-skills/blob/8a33c687e0d9cadc8c1f1cdeef13f6079e88cb76/skills/game-design-review/references/production-validation-and-responsibility.md) | 3             | Match prototypes/playtests to uncertainty; human experience and production feasibility stay separate from automated technical checks.                         |
| GD28  | [Yuki001/game-dev-skills · skills/game-design-review/references/interface-feedback-and-accessibility.md](https://github.com/Yuki001/game-dev-skills/blob/8a33c687e0d9cadc8c1f1cdeef13f6079e88cb76/skills/game-design-review/references/interface-feedback-and-accessibility.md)         | 3             | Intention→action→feedback, controls, error recovery and accessibility; hypotheses require actual player/interface evidence.                                   |
| GD29  | [Yuki001/game-dev-skills · skills/game-design-review/references/narrative-world-and-characters.md](https://github.com/Yuki001/game-dev-skills/blob/8a33c687e0d9cadc8c1f1cdeef13f6079e88cb76/skills/game-design-review/references/narrative-world-and-characters.md)                     | 3             | World causality, story through play and audience knowledge; no license or permission to rewrite established lore inferred.                                    |
| GD30  | [edhahn/agent-skills · eval-driven-game-development/references/harness.md](https://github.com/edhahn/agent-skills/blob/ffc6fc4bf1408bc3cac522916bb58e603f39ab45/eval-driven-game-development/references/harness.md)                                                                     | 3             | Existing-runner/seed/manifest examples and baseline ownership; full harness/CI work only when explicitly requested.                                           |
| GD31  | [edhahn/agent-skills · eval-driven-game-development/references/metrics.md](https://github.com/edhahn/agent-skills/blob/ffc6fc4bf1408bc3cac522916bb58e603f39ab45/eval-driven-game-development/references/metrics.md)                                                                     | 3             | Intervals,n,policy,rare tails and correlation caveats; trial-count tables, Elo/entropy and proposed bands are contextual examples.                            |
| GD32  | [edhahn/agent-skills · eval-driven-game-development/references/scenario-catalog.md](https://github.com/edhahn/agent-skills/blob/ffc6fc4bf1408bc3cac522916bb58e603f39ab45/eval-driven-game-development/references/scenario-catalog.md)                                                   | 3             | Scenario menu for an actual question; do not complete every genre, add factions, or replace reachable game assertions with toy simulations.                   |
| GD33  | [Stanestane/narrative-design-skills · skills/audit-narrative-state/SKILL.md](https://github.com/Stanestane/narrative-design-skills/blob/ca3c0f7f2854b59e9ffac6dc5674ca15f166aa57/skills/audit-narrative-state/SKILL.md)                                                                 | 3             | Trace narrative state writers/readers/transitions and optional paths; anchor to canonical core instead of a competing state registry.                         |
| GD34  | [Stanestane/narrative-design-skills · skills/audit-narrative-consistency/SKILL.md](https://github.com/Stanestane/narrative-design-skills/blob/ca3c0f7f2854b59e9ffac6dc5674ca15f166aa57/skills/audit-narrative-consistency/SKILL.md)                                                     | 3             | Chronology, world facts and character consistency; report material contradictions and uncertainty rather than rewriting by default.                           |
| GD35  | [fcsouza/agent-skills · skills/worldbuilding/SKILL.md](https://github.com/fcsouza/agent-skills/blob/a06a4d1201b5c6f9e718d6d37f0e7c53f863248a/skills/worldbuilding/SKILL.md)                                                                                                             | 3             | World/geography coherence ideas but prescribes new history, religions and at least 3 factions: reject as an authoring default.                                |
| GD36  | [baxatron-git/claude-game-design-suite · world-logic-checker/SKILL.md](https://github.com/baxatron-git/claude-game-design-suite/blob/5dd265ac2b143d13683766cdaae9695d3d871909/world-logic-checker/SKILL.md)                                                                             | 3             | World-rule causal audit with missing-evidence distinctions; document/studio scale and unresolved license prevent adoption as-is.                              |
| GD37  | [baxatron-git/claude-game-design-suite · scope-feature-prioritizer/SKILL.md](https://github.com/baxatron-git/claude-game-design-suite/blob/5dd265ac2b143d13683766cdaae9695d3d871909/scope-feature-prioritizer/SKILL.md)                                                                 | 3             | Cut scope around player value and production constraints; broad scoring/templates and unresolved license add no immediate implementation capability.          |
| GD38  | [AlterLab-IEU/AlterLab_GameForge · skills/workflows/game-design-review/SKILL.md](https://github.com/AlterLab-IEU/AlterLab_GameForge/blob/189979565d092a84d48f3328bdeaa41ce79d523f/skills/workflows/game-design-review/SKILL.md)                                                         | 3             | Quote contradiction sides and testability; mandated finding/check counts,13 dimensions and a required psychology finding are incompatible.                    |
| GD39  | [AlterLab-IEU/AlterLab_GameForge · skills/agents/game-narrative-director/SKILL.md](https://github.com/AlterLab-IEU/AlterLab_GameForge/blob/189979565d092a84d48f3328bdeaa41ce79d523f/skills/agents/game-narrative-director/SKILL.md)                                                     | 3             | Stateful narrative/consequence ideas; studio pipelines and scripts-as-truth language cannot supersede pure core/canonical facts.                              |
| GD40  | [SummerEngine/summer · library/skills/playtesting-a-feature/SKILL.md](https://github.com/SummerEngine/summer/blob/705da9341fc666a5654400c287ed134636077d15/library/skills/playtesting-a-feature/SKILL.md)                                                                               | 3             | Concrete played walkthrough and before/after frames; Summer/Godot probes and companion verification skills are unavailable here.                              |
| GD41  | [SummerEngine/summer · library/skills/agent-playtesting/SKILL.md](https://github.com/SummerEngine/summer/blob/705da9341fc666a5654400c287ed134636077d15/library/skills/agent-playtesting/SKILL.md)                                                                                       | 3             | Atomic frame/state capture and deterministic input distinguish action from evidence; requires Summer runtime ops and engine.                                  |
| GD42  | [shipshitgames/skills · skills/playwright-game-testing/SKILL.md](https://github.com/shipshitgames/skills/blob/e4d7d2cf6907041df95f6b66964b94ea2ce6e61c/skills/playwright-game-testing/SKILL.md)                                                                                         | 3             | Pixels+HUD/input/pointer-lock diagnosis is concrete; Scourge-Survivors/Three.js hooks and direct start methods are not normal Warwrit acceptance.             |
| GD43  | [jonmumm/skills · game-qa/SKILL.md](https://github.com/jonmumm/skills/blob/841be8f44106ac9a7dc365cfbbba5ab51276c1db/game-qa/SKILL.md)                                                                                                                                                   | 3             | R3F/actor-kit/Leva and new mutable test bridge; ready-on-mount is not first-frame readiness; no license grant established.                                    |
| GD44  | [colyseus/skill · references/netcode.md](https://github.com/colyseus/skill/blob/9e3ce1326a057f7f1edb71330e1cbb731b9e9536/references/netcode.md)                                                                                                                                         | 4             | Official 0.18 input/prediction primitives and sanitize-vs-rule distinction. Do not make realtime projections canonical or invent frame-replay acceptance.     |
| DOC01 | [Babylon: Optimize Your Scene](https://doc.babylonjs.com/features/featuresDeepDive/scene/optimize_your_scene)                                                                                                                                                                           | 4             | Static transforms/materials and active-mesh/picking optimizations have behavioral preconditions. Never freeze dynamic combat or input to gain FPS.            |
| DOC02 | [Babylon: glTF loader](https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF)                                                                                                                                                                                              | 4             | ESM loader registration and codecs; production resource delivery and embedded-image behavior are separate from mesh correctness.                              |
| DOC03 | [Colyseus 0.18: Rooms](https://docs.colyseus.io/room)                                                                                                                                                                                                                                   | 4             | Room<{state,...}> options generic, mutable synchronized state and message handling. Framework state does not override PostgreSQL ownership.                   |
| DOC04 | [Colyseus 0.18: State Synchronization](https://docs.colyseus.io/state)                                                                                                                                                                                                                  | 3             | Server mutation/client projection and latest-property patches; one Room<MyState> example remains inconsistent with current options generic. Verify typings.   |
| DOC05 | [Babylon: SceneOptimizer](https://doc.babylonjs.com/features/featuresDeepDive/scene/sceneOptimizer)                                                                                                                                                                                     | 4             | Built-in optimizer can disable shadows/postprocessing or shrink textures. Its target FPS is not permission to degrade accepted ink/flat-wash visuals.         |
| DOC06 | [Colyseus: Migrating to 0.18](https://docs.colyseus.io/migrating/0.18)                                                                                                                                                                                                                  | 4             | Schema 5, metadata replacement, removed client.id and additive prediction APIs; optional new database/admin are not a stack migration instruction.            |

### Search and closeout

Three search directions: renderer/network version compatibility, playable-loop/QA/
balance procedures, and canon-preserving narrative/environment review. Search used
primary GitHub sources plus web discovery; catalog mirrors supplied leads only.
The 13 initial repositories expanded to 16 for concrete browser QA; aliases/forks
were deduplicated (antigravity now resolves to agentic-awesome-skills). Source
retrieval under the shared GitHub account was sequential. Up to 20 candidate
families were allowed; the shortlist stopped at 16 after the useful mechanisms and
adoption blockers were clear. This is a bounded ecosystem survey, not proof that
no other matching skill exists.

EngineInstrumentation's dynamic API page supplied no readable body and the Khronos
spec fetch timed out; neither is counted. Relevant readable official pages replaced
them. Sources/sidecar notes, metadata, licenses and evidence.json remain under ignored
output/gamedev-skill-research-20261106/. The tracked register retains every counted
link, revision, decision and limitation. Final checks cover source/URL uniqueness,
50-document count, 31 score formulas, local pointers, formatting and scoped diff.
Independent read-only review: ACCEPT for source counts, all 31 score formulas,
pinned local paths and sampled engine/network/QA claims. The reviewer did not reopen
all 50 upstream pages or measure effectiveness. Source-count/deduplication, local
pointers, formatting and scoped diff checks PASS. Game tests NOT_RUN (documentation
only); effectiveness NOT_MEASURED.

No installation, game-rule/source change, deployment, merge or new game acceptance
is claimed by this research.

## Diagnostic skill installation after survey — 2026-11-06

The owner explicitly requested installation of the most useful surveyed skills.
Added user-scoped `/Users/vovanostm/.codex/skills/property-based-testing` from
Trail of Bits commit `470419e16f97e112d01fc32f4898aea1755015d9`, path
`plugins/property-based-testing/skills/property-based-testing`. The built-in
installer fetched it into an owned staging directory before local adaptation
and publication to the absent user-skill destination. No existing skill was
overwritten. Existing variant-analysis and debugging-strategies were retained.

The local adaptation removes the validator-rejected `effort` field, narrows
activation to assigned property testing or a concrete invariant risk, and adds
a short scope/evidence paragraph. It bounds production refactoring, mock-based
integration claims and the references' fixed severity labels. Remaining upstream
content is retained. Complete CC-BY-SA-4.0 terms, attribution, exact source and
the modification list are in the installed LICENSE and UPSTREAM.md. The survey's
unchanged-upstream compatibility rejection below is historical; this adapted
installation now passes the local manifest validator.

Installation checks PASS: all three skill manifests; the new package's local
references, license and provenance; no executable files/symlinks; installed
bytes match the validated staged package. The skill uses the project's existing
test library when applicable; no new library, plugin, hook or analyzer was added.
The two existing installations passed source readback. These are structural
checks. Behavioral/product tests NOT_RUN and effectiveness NOT_MEASURED.
Skills are available on the next turn. The game checkpoint and product source
are outside this installation task.

## Expanded diagnostic-skill survey — 2026-11-06

Owner correction: the first five-repository comparison was too narrow. This survey
expands it to **62 distinct source documents: 38 GitHub artifacts from 13 upstream
repositories, 12 primary papers/engineering reports and 12 Reddit discussions**.
It supersedes the earlier selection rationale below; the local installation receipt
remains historical. The decision is **supported shortlist; a discriminating local
experiment is still needed**. No new skill, plugin or tool was installed in this
expanded research, and neither existing installation is declared effective.

### Counting and evidence boundaries

A source is one substantive document actually opened or retrieved and inspected in
task-relevant sections. Related files in one repository are related evidence, not
independent confirmations. Paper HTML/PDF/abstract mirrors, API metadata, licenses,
search snippets and crosspost duplicates do not increase the count. The bibliography
below identifies every counted source. This is 62 documents, not 62 independent
experiments or 62 skill repositories. Some long documents were inspected selectively.

GitHub artifacts were pinned before reading. GitHub requests were sequential under
the shared account. Separate read-only agents covered social and empirical sources;
the parent read their evidence records and independently reopened the decisive
SWE-Skills-Bench/realistic-retrieval/ETH results and both social comparison posts.
No product tests, browser journey, paid evaluation or downloaded program ran.

### Rating method

Scores rank **suitability for the current Warwrit defect/delivery workflow**, not
intrinsic quality, measured accuracy or percentage speedup. Each component is 1–5:

| Component                         | Weight | What earns a higher rating                                                                      |
| --------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| F: task fit and missing procedure | 30%    | A narrow procedure for the assigned failure; no speculative product redesign.                   |
| E: validation evidence            | 25%    | Discriminating behavioral cases and valid negative controls; structural checks alone are weak.  |
| C: cost and proportionality       | 20%    | Focused checks, bounded search and reuse of unchanged evidence.                                 |
| I: integration                    | 15%    | Existing toolchain, portable manifest, standalone route and usable license.                     |
| S: scope and finding discipline   | 10%    | Current authority, read-only review where assigned, guards/callers and false-positive handling. |

`score = 6F + 5E + 4C + 3I + 2S` (maximum100). A one-point change in F moves
the result by6 points: small rank gaps are not meaningful precision. Scores are
author judgments from source inspection; there are no confidence intervals.
E=2 means examples/procedure but no convincing marginal-effect evidence; E=3
means relevant behavioral cases/methods with limitations. No candidate earns E=4/5
for a reproduced Warwrit benefit. A manifest/authority/license conflict blocks
unchanged adoption regardless of score. Stars are reported separately and add0.

### Ranked shortlist and rejected alternatives

| Rank | Candidate / source                                                                                                                                                                                              | F/E/C/I/S | Score /100 | Action                                                                                                       |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- | ------------------------------------------------------------------------------------------------------------ |
| 1    | [Trail of Bits / variant-analysis](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/variant-analysis/skills/variant-analysis/SKILL.md) (GH27)                        | 5/3/4/4/4 | 81         | Keep installed; invoke for a known cause, not initial readiness audit.                                       |
| 2    | [wshobson / debugging-strategies](https://github.com/wshobson/agents/blob/4bde3168b43c0655c4d00ea2726e631719908a6d/plugins/developer-essentials/skills/debugging-strategies/SKILL.md) (GH25)                    | 4/2/4/5/4 | 73         | Keep as optional trial; generic diagnosis is not proven uplift.                                              |
| 3    | [Trail of Bits / property-based-testing](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/property-based-testing/skills/property-based-testing/SKILL.md) (GH19)      | 4/3/4/3/4 | 72         | Next conditional trial; local validator rejects effort. Reuse existing fast-check; do not install unchanged. |
| 4    | [Sentry / find-bugs](https://github.com/getsentry/skills/blob/869bc1cd766bdc69863921af20e39881dc29662d/skills/find-bugs/SKILL.md) (GH01)                                                                        | 4/2/3/4/4 | 66         | Optional branch audit; overlaps existing review, not first choice for current playable failure.              |
| 5    | [Microsoft / playwright-cli](https://github.com/microsoft/playwright-cli/blob/2cbc57d186eb8a70e64ebbd6c923741100c69a9e/skills/playwright-cli/SKILL.md) (GH16)                                                   | 3/3/4/3/4 | 66         | Reuse existing browser skill; no extra CLI/skill installation justified.                                     |
| 6    | [Sentry / code-review](https://github.com/getsentry/skills/blob/869bc1cd766bdc69863921af20e39881dc29662d/skills/code-review/SKILL.md) (GH02)                                                                    | 3/2/4/4/4 | 64         | Do not duplicate current domain review.                                                                      |
| 7    | [ECC / agent-introspection-debugging](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/.agents/skills/agent-introspection-debugging/SKILL.md) (GH15)                               | 4/2/3/3/4 | 63         | Useful recovery ideas; companion verification workflow makes unchanged adoption costly.                      |
| 8    | [Matt Pocock / diagnosing-bugs](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/diagnosing-bugs/SKILL.md) (GH36)                                          | 4/2/2/4/4 | 62         | For hard bugs; not a default replacement for every small failure.                                            |
| 9    | [Addy Osmani / debugging-and-error-recovery](https://github.com/addyosmani/agent-skills/blob/301b02b12bff98e4688e6984af6556802322bbde/skills/debugging-and-error-recovery/SKILL.md) (GH05)                      | 4/3/2/3/3 | 62         | Adapt only: full checks and confirmation rule conflict with current harness.                                 |
| 10   | [Superpowers / systematic-debugging](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/systematic-debugging/SKILL.md) (GH30)                                             | 4/3/2/2/3 | 59         | Not unchanged: skill dependencies and escalation/verification policy.                                        |
| 11   | [wshobson / code-review-excellence](https://github.com/wshobson/agents/blob/4bde3168b43c0655c4d00ea2726e631719908a6d/plugins/developer-essentials/skills/code-review-excellence/SKILL.md) (GH26)                | 3/2/3/4/3 | 58         | Not unchanged: arbitrary size gate and duplicate generic review.                                             |
| 12   | [Matt Pocock / code-review](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/code-review/SKILL.md) (GH37)                                                  | 4/2/2/2/4 | 56         | Spec/standards idea useful; setup/delegation and smell noise need adaptation.                                |
| 13   | [Addy Osmani / code-review-and-quality](https://github.com/addyosmani/agent-skills/blob/301b02b12bff98e4688e6984af6556802322bbde/skills/code-review-and-quality/SKILL.md) (GH06)                                | 3/3/2/3/3 | 56         | Not unchanged: mutation/testing by reviewer conflicts with read-only review.                                 |
| 14   | [Vercel / react-best-practices](https://github.com/vercel-labs/agent-skills/blob/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/skills/react-best-practices/SKILL.md) (GH18)                                          | 2/3/3/3/4 | 56         | Existing specialist plugin only for a measured React issue, not general readiness.                           |
| 15   | [Trail of Bits / differential-review](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/differential-review/skills/differential-review/SKILL.md) (GH29)               | 3/3/2/2/3 | 53         | Reserve for a scoped security audit.                                                                         |
| 16   | [ECC / eval-harness](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/.agents/skills/eval-harness/SKILL.md) (GH13)                                                                 | 3/2/2/3/3 | 51         | Reference for evaluation work; not another runtime acceptance framework.                                     |
| 17   | [Anthropic / webapp-testing](https://github.com/anthropics/skills/blob/ca45fc496a3436251f191354091d557da31c15b5/skills/webapp-testing/SKILL.md) (GH32)                                                          | 3/2/2/3/2 | 49         | Do not duplicate browser workflows; readiness/lifecycle risks.                                               |
| 18   | [Superpowers / verification-before-completion](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/verification-before-completion/SKILL.md) (GH31)                         | 2/2/1/3/2 | 39         | Reject repeated fresh-command requirement.                                                                   |
| 19   | [Anthropic / silent-failure-hunter agent](https://github.com/anthropics/claude-plugins-official/blob/baa09e0cfeff5e646f5637087f39fbb54acd0f73/plugins/pr-review-toolkit/agents/silent-failure-hunter.md) (GH10) | 2/2/2/2/1 | 38         | Do not install unchanged: app-specific helpers and inflated generic severity.                                |
| 20   | [planning-with-files](https://github.com/OthmanAdi/planning-with-files/blob/8eef6dc6540dde5eef3fdc0ac487ad9c48ef3ba5/.agents/skills/planning-with-files/SKILL.md) (GH24)                                        | 2/2/1/2/2 | 36         | Reject a second planning/attestation/hook system for this project.                                           |
| 21   | [Matt Pocock / improve-codebase-architecture](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/improve-codebase-architecture/SKILL.md) (GH38)              | 2/2/1/1/3 | 35         | Not for the current delivery task; multiple companion skills and speculative refactor scope.                 |
| 22   | [ECC / verification-loop](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/.agents/skills/verification-loop/SKILL.md) (GH14)                                                       | 2/1/1/3/2 | 34         | Reject repeated broad checks, coverage target and fragile pipeline examples.                                 |
| 23   | [Anthropic / code-review command](https://github.com/anthropics/claude-plugins-official/blob/baa09e0cfeff5e646f5637087f39fbb54acd0f73/plugins/code-review/commands/code-review.md) (GH09)                       | 2/2/1/1/2 | 33         | Reject unchanged: mandatory fan-out and exclusion of input/state-dependent bugs.                             |

The existing Warwrit context/domain/review/delivery skills remain the default
authority for game rules, atomicity, exact money, privacy and player acceptance.
A generic external checklist does not replace these contracts. Retain the two
installed skills as optional trials; do not activate both for every task.

### What changed after deeper inspection

1. **The earlier generic-debugging recommendation is weaker than it sounded.**
   SWE-Skills-Bench v2 reports76.59%→76.93% across3,920 paired evaluations of98
   SWE skills, with92 showing no significant directional effect. Its generated
   requirements, four configurations and per-skill samples limit generalization
   (EVAL04). This does not prove the installed skills useless. It removes any
   basis for assuming their generic advice improves this game agent.
2. **Evidence is mixed, not uniformly negative.** SkillsBench v1 reports+16.2pp
   with curated task-paired skills on84 tasks (EVAL02). A realistic-selection
   study observes Claude55.4% force-loaded→43.5% with distractors→38.4% generic
   retrieval, against35.4% baseline (EVAL03). The interventions differ. The useful
   question is which missing procedure a selected skill supplies on our task.
3. **Property testing is a more specific next candidate than another review pack.**
   fast-check4.9.0 already belongs to testkit/protocol dev dependencies; game-core
   retains zero runtime dependencies. GH19 checks vacuity, tautological oracles and
   shrunk counterexamples. However, its `effort: low` field is rejected by the
   installed quick_validate.py. That is a reproduced local validator rejection,
   not proof Codex cannot load it. Unchanged installation is deferred pending
   host compatibility and one concrete property-testing task. No new library needed.
4. **Some highly ranked social tools encode the wrong contract for this project.**
   GH09 mandates seven initial agents plus per-finding validation and explicitly
   excludes bugs depending on specific inputs/state, a poor fit for temporal,
   inventory and authorization invariants. GH10 hard-codes app-specific Sentry/
   Statsig helpers and calls broad catches critical regardless of actual impact.
   These are inspected instructions, not reproduced defects in their agents.
5. **A review skill can silently turn the reviewer into another writer.** GH06
   requires inverting a condition, running the suite and restoring code. That
   conflicts with this project's read-only reviewer role. A meaningful mutation
   check may belong to the author on owned fixtures; it is not a universal review
   prerequisite. GH05 also requires full checks and confirmation for diagnostic
   commands found in errors. These conflict with proportional, authorized recovery.
6. **Evaluation plumbing can be mistaken for quality.** GH14 prescribes coverage
   targets, broad repeated checks and shell pipelines without explicit pipefail.
   GH13 includes a helper-name grep grader: finding that text does not demonstrate
   correct authentication. GH07 explicitly separates lexical routing from actual
   behavior; GH28 discloses saturated/non-firing inline evals. Treat these as
   different claims rather than adding a badge for the existence of an eval folder.

### Social reviews: useful contradictions, no consensus estimate

Twelve opened Reddit discussions supply first-person experience and leads. The
convenience sample is heavily skewed toward Superpowers, with older/unpinned
versions, customization, promotion and self-selection. No meaningful Sentry/Trail
of Bits social outcome evidence was established. An X search returned irrelevant
material; no X post is counted and no claim is made about all X discussion.

- SOC01 reports15 historical bugs, three runs per arm, the same9/15 fixed by
  plain Claude and both debugging skills, about3 extra minutes, but smaller changes
  for Pocock. Private code/raw runs were not inspected; the author promotes their
  own eval framework. This is a useful3/5 anecdotal comparison, not a replication.
- SOC12 compares five review setups on one private roughly100-file PR and favors
  pr-review-toolkit. Its author explicitly did not verify findings against code.
  More comments and faster time do not establish greater recall/precision.
- SOC02/03/08/09/10 include positive large-task planning reports and negative
  small-fix overhead reports. Both can be true for different task shapes. Reports
  of unsolicited worktrees/commits concern described setups, not proven current
  behavior of a pinned version. SOC05's reasoning-trigger allegation is disputed.
- SOC11 argues for supplying the actual requirement/invariants to reviewers.
  Named skill endorsements include promotional interests; they do not establish
  that switching brands finds more real game defects.

### Popularity snapshot, separate from the rating

GitHub API snapshot on2026-11-06 Moscow date. Stars concern whole repositories,
not the individual skill, compatible installation count or quality. No direction
of causality is inferred. The old everything-claude-code URL resolves to ECC.

| Repository                                                                                                                                | Stars   | Reviewed HEAD  | API license metadata                                |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------- | --------------------------------------------------- |
| [mattpocock/skills](https://github.com/mattpocock/skills/tree/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d)                                   | 315,046 | `4ae2317ddb22` | MIT                                                 |
| [obra/superpowers](https://github.com/obra/superpowers/tree/22f0b463e7a5e579904dd6211a520321035526f7)                                     | 312,967 | `22f0b463e7a5` | MIT                                                 |
| [affaan-m/ECC](https://github.com/affaan-m/ECC/tree/b38be6a7f6350964d59328b52f0624e1d1d552d1)                                             | 297,811 | `b38be6a7f635` | MIT                                                 |
| [anthropics/skills](https://github.com/anthropics/skills/tree/ca45fc496a3436251f191354091d557da31c15b5)                                   | 187,724 | `ca45fc496a34` | See per-skill terms; API has no root classification |
| [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills/tree/301b02b12bff98e4688e6984af6556802322bbde)                       | 113,488 | `301b02b12bff` | MIT                                                 |
| [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official/tree/baa09e0cfeff5e646f5637087f39fbb54acd0f73) | 46,222  | `baa09e0cfeff` | Apache-2.0                                          |
| [wshobson/agents](https://github.com/wshobson/agents/tree/4bde3168b43c0655c4d00ea2726e631719908a6d)                                       | 42,239  | `4bde3168b43c` | MIT                                                 |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills/tree/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62)                     | 33,592  | `1a2c79d4e6c4` | See per-skill terms; API has no root classification |
| [OthmanAdi/planning-with-files](https://github.com/OthmanAdi/planning-with-files/tree/8eef6dc6540dde5eef3fdc0ac487ad9c48ef3ba5)           | 27,907  | `8eef6dc6540d` | MIT                                                 |
| [agentskills/agentskills](https://github.com/agentskills/agentskills/tree/83021e2be457a9b6679148719c1f6074f0ad975e)                       | 26,975  | `83021e2be457` | Apache-2.0                                          |
| [microsoft/playwright-cli](https://github.com/microsoft/playwright-cli/tree/2cbc57d186eb8a70e64ebbd6c923741100c69a9e)                     | 14,987  | `2cbc57d186eb` | Apache-2.0                                          |
| [trailofbits/skills](https://github.com/trailofbits/skills/tree/470419e16f97e112d01fc32f4898aea1755015d9)                                 | 8,024   | `470419e16f97` | CC-BY-SA-4.0                                        |
| [getsentry/skills](https://github.com/getsentry/skills/tree/869bc1cd766bdc69863921af20e39881dc29662d)                                     | 1,125   | `869bc1cd766b` | Apache-2.0                                          |

API root license metadata is not legal clearance for every file. Existing
installations retain their inspected MIT/CC-BY-SA-4.0 terms and provenance.
No additional adoption is based solely on this table.

### Smallest discriminating follow-up

Use the next already-authorized defect, not a new whole-game audit. For a credible
skill-on/off comparison, replay a few comparable historical tasks in isolated
checkouts, hide the original fix, keep model/tools/time/resources equal and blind
the finding review. Include a safe look-alike and a task that should not trigger.
Judge the actual original symptom and saved/public result, then regressions,
confirmed/refuted findings, elapsed time, human attention and total parent/child
effort. Separate setup/CI/service failures from model diagnosis. Do not interpret
an adaptive debugging retry as an independent pass@k trial. This comparison is
NOT_RUN, not a newly activated goal or permission for paid model calls.

EVAL05/06 show why perceived helpfulness and elapsed/productivity estimates can
diverge. EVAL07/09/10 show why interface/resource differences confound comparisons.
EVAL08/11 support observing the real task outcome. EVAL12 reports a recall/noise
tradeoff: its historical-bug-only precision must not be inverted into a false-
positive rate. Useful secondary findings are outside that precision denominator.

### Source register: all62 inspected documents

Usefulness ratings are **within the stated evidence type**. 5=strong controlled
evidence for the source's own scoped claim; 4=discriminating evaluation method/
cases or substantial benchmark; 3=inspected implementation or concrete anecdotal
comparison; 2=qualitative/catalog/first-person context; 1=opinion. None is a
Warwrit performance score. Related upstream files remain one provenance family.

#### GitHub artifacts —38 documents /13 repositories

| ID   | Source at pinned revision                                                                                                                                                                                                                                                                                           | Usefulness /5 | Contribution and limit                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| GH01 | [getsentry/skills · skills/find-bugs/SKILL.md](https://github.com/getsentry/skills/blob/869bc1cd766bdc69863921af20e39881dc29662d/skills/find-bugs/SKILL.md)                                                                                                                                                         | 3             | Read-only branch review; every-file security checklist, HEAD-only diff and local default-branch freshness need care.                             |
| GH02 | [getsentry/skills · skills/code-review/SKILL.md](https://github.com/getsentry/skills/blob/869bc1cd766bdc69863921af20e39881dc29662d/skills/code-review/SKILL.md)                                                                                                                                                     | 3             | Compact contextual review; Sentry/Django examples and generic test layers add little to existing Warwrit review.                                 |
| GH03 | [getsentry/skills · README.md](https://github.com/getsentry/skills/blob/869bc1cd766bdc69863921af20e39881dc29662d/README.md)                                                                                                                                                                                         | 2             | Catalog distinguishes Sentry internal development skills from production integration; bulk install would import unrelated commit/branch rules.   |
| GH04 | [getsentry/skills · skills/skill-writer/references/skill-evals.md](https://github.com/getsentry/skills/blob/869bc1cd766bdc69863921af20e39881dc29662d/skills/skill-writer/references/skill-evals.md)                                                                                                                 | 4             | Eval routing stays outside runtime; cases, holdouts, evidence and artifact minimality; AXIS is a framework choice, not a Warwrit requirement.    |
| GH05 | [addyosmani/agent-skills · skills/debugging-and-error-recovery/SKILL.md](https://github.com/addyosmani/agent-skills/blob/301b02b12bff98e4688e6984af6556802322bbde/skills/debugging-and-error-recovery/SKILL.md)                                                                                                     | 3             | Strong triage but requires full suite/build and user confirmation for commands suggested by errors; source compatibility conflict.               |
| GH06 | [addyosmani/agent-skills · skills/code-review-and-quality/SKILL.md](https://github.com/addyosmani/agent-skills/blob/301b02b12bff98e4688e6984af6556802322bbde/skills/code-review-and-quality/SKILL.md)                                                                                                               | 3             | Caller-aware findings and zero-finding outcome are useful; reviewer must mutate code/run suite and imposes sizing/cleanup requirements.          |
| GH07 | [addyosmani/agent-skills · evals/README.md](https://github.com/addyosmani/agent-skills/blob/301b02b12bff98e4688e6984af6556802322bbde/evals/README.md)                                                                                                                                                               | 4             | Separates structural, lexical routing and actual behavior; reports version-sensitive invocation and warns that routing is only an approximation. |
| GH08 | [addyosmani/agent-skills · evals/cases/debugging-and-error-recovery.json](https://github.com/addyosmani/agent-skills/blob/301b02b12bff98e4688e6984af6556802322bbde/evals/cases/debugging-and-error-recovery.json)                                                                                                   | 4             | Concrete off-by-one and time-pressure behavioral cases; presence of cases is not an executed improvement.                                        |
| GH09 | [anthropics/claude-plugins-official · plugins/code-review/commands/code-review.md](https://github.com/anthropics/claude-plugins-official/blob/baa09e0cfeff5e646f5637087f39fbb54acd0f73/plugins/code-review/commands/code-review.md)                                                                                 | 3             | Seven initial agents plus per-finding validators; limits bug search to introduced diff and excludes input/state-dependent issues.                |
| GH10 | [anthropics/claude-plugins-official · plugins/pr-review-toolkit/agents/silent-failure-hunter.md](https://github.com/anthropics/claude-plugins-official/blob/baa09e0cfeff5e646f5637087f39fbb54acd0f73/plugins/pr-review-toolkit/agents/silent-failure-hunter.md)                                                     | 3             | Silent-failure audit hard-codes Sentry/Statsig helpers and labels broad catches critical; needs domain-specific severity calibration.            |
| GH11 | [anthropics/claude-plugins-official · plugins/pr-review-toolkit/commands/review-pr.md](https://github.com/anthropics/claude-plugins-official/blob/baa09e0cfeff5e646f5637087f39fbb54acd0f73/plugins/pr-review-toolkit/commands/review-pr.md)                                                                         | 3             | Selectable review axes but defaults to all applicable agents plus simplification; Claude Task workflow, not standalone Codex skill.              |
| GH12 | [anthropics/claude-plugins-official · plugins/pr-review-toolkit/README.md](https://github.com/anthropics/claude-plugins-official/blob/baa09e0cfeff5e646f5637087f39fbb54acd0f73/plugins/pr-review-toolkit/README.md)                                                                                                 | 2             | Six specialist agent roles and usage routes; catalog claims are not confirmed review precision.                                                  |
| GH13 | [affaan-m/ECC · .agents/skills/eval-harness/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/.agents/skills/eval-harness/SKILL.md)                                                                                                                                           | 3             | Distinguishes pass@k/pass^k, but literal helper-name graders and illustrative success targets do not establish outcome validity.                 |
| GH14 | [affaan-m/ECC · .agents/skills/verification-loop/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/.agents/skills/verification-loop/SKILL.md)                                                                                                                                 | 3             | Full build/types/lint/coverage cycle, 80% target and 15-minute/function cadence; pipelines can mask exit codes without pipefail.                 |
| GH15 | [affaan-m/ECC · .agents/skills/agent-introspection-debugging/SKILL.md](https://github.com/affaan-m/ECC/blob/b38be6a7f6350964d59328b52f0624e1d1d552d1/.agents/skills/agent-introspection-debugging/SKILL.md)                                                                                                         | 3             | Useful loop/cwd/context/quota diagnosis; integration routes to verification-loop and further ECC skills.                                         |
| GH16 | [microsoft/playwright-cli · skills/playwright-cli/SKILL.md](https://github.com/microsoft/playwright-cli/blob/2cbc57d186eb8a70e64ebbd6c923741100c69a9e/skills/playwright-cli/SKILL.md)                                                                                                                               | 3             | Browser snapshots/find/session controls; broad storage/mobile/cleanup commands require task and resource ownership constraints.                  |
| GH17 | [microsoft/playwright-cli · README.md](https://github.com/microsoft/playwright-cli/blob/2cbc57d186eb8a70e64ebbd6c923741100c69a9e/README.md)                                                                                                                                                                         | 2             | CLI/MCP cost comparison is author claim; existing browser workflows should be reused, not replaced by another global latest install.             |
| GH18 | [vercel-labs/agent-skills · skills/react-best-practices/SKILL.md](https://github.com/vercel-labs/agent-skills/blob/1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62/skills/react-best-practices/SKILL.md)                                                                                                                   | 3             | React/Next performance rules; specific techniques useful on an assigned React performance defect, not generic game readiness.                    |
| GH19 | [trailofbits/skills · plugins/property-based-testing/skills/property-based-testing/SKILL.md](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/property-based-testing/skills/property-based-testing/SKILL.md)                                                             | 3             | Properties, independent oracles, tautology/vacuity checks and shrinking; existing fast-check fits, effort metadata fails local validator.        |
| GH20 | [trailofbits/skills · plugins/property-based-testing/README.md](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/property-based-testing/README.md)                                                                                                                       | 4             | Separates trigger from effect; reports small, partial dependency-behavior ablation and explicitly unmeasured test-quality dimensions.            |
| GH21 | [trailofbits/skills · plugins/property-based-testing/evals/03-dependency-is-users-call/graders/dependency-left-to-user.md](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/property-based-testing/evals/03-dependency-is-users-call/graders/dependency-left-to-user.md) | 4             | Negative dependency-adoption grader; framing/checkable changes matter, not automatic new library installation.                                   |
| GH22 | [agentskills/agentskills · docs/skill-creation/evaluating-skills.mdx](https://github.com/agentskills/agentskills/blob/83021e2be457a9b6679148719c1f6074f0ad975e/docs/skill-creation/evaluating-skills.mdx)                                                                                                           | 4             | With/without runs, timing, blinded judgment and human calibration; prescriptive assertion counts are not task correctness.                       |
| GH23 | [agentskills/agentskills · docs/specification.mdx](https://github.com/agentskills/agentskills/blob/83021e2be457a9b6679148719c1f6074f0ad975e/docs/specification.mdx)                                                                                                                                                 | 4             | Portable name/description contract and progressive loading; schema compliance is structural evidence only.                                       |
| GH24 | [OthmanAdi/planning-with-files · .agents/skills/planning-with-files/SKILL.md](https://github.com/OthmanAdi/planning-with-files/blob/8eef6dc6540dde5eef3fdc0ac487ad9c48ef3ba5/.agents/skills/planning-with-files/SKILL.md)                                                                                           | 3             | Three planning files, lifecycle hooks, recovery selection and attestation; broad 5-tool-call trigger duplicates existing checkpoint ownership.   |
| GH25 | [wshobson/agents · plugins/developer-essentials/skills/debugging-strategies/SKILL.md](https://github.com/wshobson/agents/blob/4bde3168b43c0655c4d00ea2726e631719908a6d/plugins/developer-essentials/skills/debugging-strategies/SKILL.md)                                                                           | 3             | Reproduce/localize/hypothesis/minimal experiment; compact standalone procedure, no demonstrated marginal benefit.                                |
| GH26 | [wshobson/agents · plugins/developer-essentials/skills/code-review-excellence/SKILL.md](https://github.com/wshobson/agents/blob/4bde3168b43c0655c4d00ea2726e631719908a6d/plugins/developer-essentials/skills/code-review-excellence/SKILL.md)                                                                       | 3             | Generic review with 200-400-line cap and split requests; disagrees with outcome-based slice sizing.                                              |
| GH27 | [trailofbits/skills · plugins/variant-analysis/skills/variant-analysis/SKILL.md](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/variant-analysis/skills/variant-analysis/SKILL.md)                                                                                     | 3             | Known-root-cause matching, one-step generalization and safe-candidate triage; direct workflow avoids plugin fan-out.                             |
| GH28 | [trailofbits/skills · plugins/variant-analysis/evals/README.md](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/variant-analysis/evals/README.md)                                                                                                                       | 4             | Inline ablation saturates and does not trigger skill; its authors disclose that it cannot measure uplift.                                        |
| GH29 | [trailofbits/skills · plugins/differential-review/skills/differential-review/SKILL.md](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/differential-review/skills/differential-review/SKILL.md)                                                                         | 3             | Security audit with mandatory history/report and optional namespaced roles; suitable only for explicit audit scope.                              |
| GH30 | [obra/superpowers · skills/systematic-debugging/SKILL.md](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/systematic-debugging/SKILL.md)                                                                                                                                   | 3             | Root-cause tracing plus mandatory TDD/verification skill references and three-attempt human escalation.                                          |
| GH31 | [obra/superpowers · skills/verification-before-completion/SKILL.md](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/verification-before-completion/SKILL.md)                                                                                                               | 3             | Fresh full command in current message before success claims; prevents reuse of valid unchanged verification.                                     |
| GH32 | [anthropics/skills · skills/webapp-testing/SKILL.md](https://github.com/anthropics/skills/blob/ca45fc496a3436251f191354091d557da31c15b5/skills/webapp-testing/SKILL.md)                                                                                                                                             | 3             | Python Playwright/networkidle recipe duplicates current tools; not universal readiness for a persistent game.                                    |
| GH33 | [anthropics/skills · skills/webapp-testing/scripts/with_server.py](https://github.com/anthropics/skills/blob/ca45fc496a3436251f191354091d557da31c15b5/skills/webapp-testing/scripts/with_server.py)                                                                                                                 | 3             | Port-open readiness and unread child pipes are inspectable risk mechanisms; no runtime failure reproduced.                                       |
| GH34 | [trailofbits/skills · plugins/variant-analysis/tests/README.md](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/variant-analysis/tests/README.md)                                                                                                                       | 4             | Seeded cross-module bug and safe decoy; compares orchestration vs skill-equipped baseline, not this skill vs none.                               |
| GH35 | [wshobson/agents · plugins/developer-essentials/skills/debugging-strategies/references/tools-and-techniques.md](https://github.com/wshobson/agents/blob/4bde3168b43c0655c4d00ea2726e631719908a6d/plugins/developer-essentials/skills/debugging-strategies/references/tools-and-techniques.md)                       | 3             | Optional debugger/bisect/profiling examples; raw argument/user tracing needs redaction and isolated resources.                                   |
| GH36 | [mattpocock/skills · skills/engineering/diagnosing-bugs/SKILL.md](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/diagnosing-bugs/SKILL.md)                                                                                                                   | 3             | Tight red-capable loop and real-call-site seam; hard-bug procedure also prescribes 3-5 hypotheses and repeated/stress loops.                     |
| GH37 | [mattpocock/skills · skills/engineering/code-review/SKILL.md](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/code-review/SKILL.md)                                                                                                                           | 3             | Spec/standards separation, repository override, explicit base; requires setup tracker and two agents, with generic smell baseline.               |
| GH38 | [mattpocock/skills · skills/engineering/improve-codebase-architecture/SKILL.md](https://github.com/mattpocock/skills/blob/4ae2317ddb22b046e26455e4f9c9b3aaaf62212d/skills/engineering/improve-codebase-architecture/SKILL.md)                                                                                       | 3             | Targeted architecture exploration but calls several companion skills, renders CDN HTML in temp and opens an owner grilling loop.                 |

#### Primary papers and engineering reports —12 documents

| ID     | Source / edition                                                                                                                                                                                                                          | Evidence /5 | Scoped result and limit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| EVAL01 | [Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?](https://arxiv.org/html/2602.11988v3) · v3, 2026-09-29; parent inspected sections 4.2-4.4                                                            | 4           | Repository context did not significantly improve average resolution; generated context increased inference cost by 20-23%. Developer-written context had +2.4pp at p=0.21. Python tasks and specific agent/model pairs; not an on-demand skill trial. Repository context files are not on-demand diagnostic skills; single sampled completion per condition, selected repositories, model/version dependence. Human context was not uniformly harmful.                                                  |
| EVAL02 | [SkillsBench: Benchmarking How Well Agent Skills Work Across Diverse Tasks](https://arxiv.org/html/2602.12670v1) · v1, inspected experimental denominator 84 tasks; do not mix with later 87-task leaderboard                             | 4           | Seven model/harness configurations, three commercial harnesses, 84 evaluated tasks across 11 domains, five trials per task, 7,308 valid trajectories. Curated skills improved average pass rate by 16.2 percentage points; configuration gains ranged 13.6–23.3 points. Skills are supplied in an idealized task-paired setting. Correlation between length/skill quantity and success does not establish an optimal universal limit. Benchmark versions have different denominators.                   |
| EVAL03 | [How Well Do Agentic Skills Work in the Wild: Benchmarking LLM Skill Usage in Realistic Settings](https://arxiv.org/html/2604.04323v1) · v1                                                                                               | 4           | 34,198 collected skills; three model/harness pairs; 84 SkillsBench tasks, three trials per condition. Claude pass rate fell from 55.4% force-loaded curated to 51.2% autonomous curated, 43.5% with distractors, and 38.4% retrieved without curated skills, versus 35.4% baseline. Specific collection, retrieval engine and benchmarks; model/harness are coupled. Retrieval/refinement adds cost; no Warwrit measurement.                                                                            |
| EVAL04 | [SWE-Skills-Bench: Do Agent Skills Actually Help in Real-World Software Engineering?](https://arxiv.org/html/2603.15401v2) · v2; original submission 2026-03-16, do not attribute v2 numbers to v1                                        | 4           | 98 public SWE skills, ten repository-specific generated requirements each, four model/harness configurations, 3,920 paired with/without evaluations. Mean verifier pass ratio changed 76.59%→76.93%; four skills were significantly helpful, two harmful, 92 had no detected directional effect. Ten requirements per skill, generated requirements/verifiers and limited configurations. Non-significance does not prove zero effect; classification uses p<0.05 and needs caution across many skills. |
| EVAL05 | [Measuring the Impact of Early-2025 AI on Experienced Open-Source Developer Productivity](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/) · Official study report; same study as arXiv:2507.09089, counted once | 5           | Randomized AI access on 246 real tasks from 16 experienced open-source developers in familiar large repositories. Early-2025 tooling, primarily Cursor with Claude 3.5/3.7, increased completion time by 19%. Developers nevertheless estimated a 20% speedup after use. Small, selected population, familiar repositories, dated tools; does not establish slowdown for most developers or future systems. See EVAL06 for later measurement problems.                                                  |
| EVAL06 | [We are Changing our Developer Productivity Experiment Design](https://metr.org/blog/2026-02-24-uplift-update/) · Distinct later experiment/methodology report                                                                            | 3           | Later study recruited ten returning and 47 new developers. Returning-developer time estimate was −18% (CI −38% to +9%); new developers −4% (CI −15% to +9%). METR calls these unreliable current-productivity estimates because of selection and timing problems. Confidence intervals overlap zero; biased participation/task selection and concurrent work preclude a clean updated causal effect size.                                                                                               |
| EVAL07 | [SWE-agent: Agent-Computer Interfaces Enable Automated Software Engineering](https://arxiv.org/html/2405.15793v3) · v3 inspected; original arXiv submission 2024-05-24                                                                    | 4           | SWE-agent reported 12.5% full SWE-bench and 87.7% HumanEvalFix pass@1. SWE-bench Lite interface ablations compare an 18% baseline with no editor (10.3%), no edit linting (15%), entire-file viewing (12.7%) and iterative search (12%). Older models and benchmark-specific tuning; does not isolate present skill efficacy. Interface/resource effects should not be credited to a prompt alone.                                                                                                      |
| EVAL08 | [Demystifying evals for AI agents](https://www.anthropic.com/research/demystifying-evals-for-ai-agents) · Official engineering guidance/report                                                                                            | 2           | First-party engineering experience distinguishes task, trial, grader, transcript and final environment outcome; an agent claim of completion is not the resulting state. It recommends multiple trials and task-appropriate combinations of deterministic, model and human assessment. Practice synthesis, not a controlled estimate; examples have no common sample or isolated effect size. LLM rubrics need expert calibration.                                                                      |
| EVAL09 | [Writing effective tools for agents — with agents](https://www.anthropic.com/research/writing-tools-for-agents) · Official engineering report                                                                                             | 2           | Internal Slack/Asana tool development used realistic workflows and held-out tests; the report attributes further gains beyond expert-written tools to iterative tool/schema/description optimization. No numeric sample or chart-derived effect is claimed here. Vendor first-party examples, incomplete experimental detail and no independent replication; recommendation is not proof for a specific diagnostic skill.                                                                               |
| EVAL10 | [Quantifying infrastructure noise in agentic coding evals](https://www.anthropic.com/research/infrastructure-noise) · Official internal experiment report                                                                                 | 3           | Same Claude model/harness/tasks on Terminal-Bench 2.0 across six resource settings: uncapped versus strict allocation changed success by six percentage points (p<0.01). Infrastructure errors declined 5.8%→2.1% with 3x headroom (p<0.001), while corresponding score change stayed within noise (p=0.40). Internal experiment, particular benchmark/provider; model and trial count not specified in inspected text. Broader non-Claude generality was not rigorously tested.                        |
| EVAL11 | [Effective harnesses for long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents) · Official qualitative engineering experiment report                                                        | 2           | Opus 4.5/Agent SDK long-running web-app experiments found compaction alone insufficient: agents overreached, left partial implementations, or declared completion prematurely. Incremental features, persisted progress and browser checks improved observed continuation. Qualitative examples, no trial count or controlled effect size; a large application harness is not necessarily appropriate for a bounded diagnostic task.                                                                    |
| EVAL12 | [CR-Bench: Evaluating the Real-World Utility of AI Code Review Agents](https://arxiv.org/html/2603.11078v1) · v1                                                                                                                          | 3           | 174 verified PR tasks; two models, single-shot versus Reflexion; Sonnet-4.5 judge. GPT-5.2 recall increased 27.01%→32.76%, while usefulness fell 83.63%→66.10% and signal/noise 5.11→1.95 under Reflexion. Exploratory benchmark with an LLM judge, mostly structural defects, reconstructed tasks. Its precision counts only historical bug hits: 3.56% precision DOES NOT mean 96.44% false positives because valid other suggestions are excluded.                                                   |

#### Reddit observations —12 discussions

Exact publication dates are not used for trend inference: several search dates
disagree with relative timestamps. All were read on2026-11-06. Comment trees were
partial. Automatically generated bot summaries and promotional install figures
are excluded. Crosspost/original are one source.

| ID    | Opened discussion                                                                                                                                                                                                                                   | Usefulness /5 | Observation and main caveat                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SOC01 | [Matt Pocock and Superpowers are overrated(for debugging)](https://www.reddit.com/r/claudeskills/comments/1wv6eoq/matt_pocock_and_superpowers_are_overratedfor/)                                                                                    | 3             | Author reports 15 private historical bugs, three runs per arm, equal 9/15 fixes with extra latency, but smaller Pocock changes. No raw runs inspected; author promotes own eval framework; no independently confirmed uplift.                                                                                                                                                                                                                                                                                                                                                                              |
| SOC02 | [Are you guys still using the superpowers skill?](https://www.reddit.com/r/ClaudeCode/comments/1u2tqud/are_you_guys_still_using_the_superpowers_skill/)                                                                                             | 2             | OP turned Superpowers off then restored it. Some commenters value brainstorming previews and sustained specification/review/testing flow. Others prefer documented-repository native planning and report excessive context cost. A disagreement over manual invocation is directly visible: one user says automatic task-based invocation works while another warns of overlapping descriptions. Self-selected anecdotes with differing projects and customized setups; a commenter promotes a personal alternative and another promotes a fork. No token measurements or trigger success rates inspected. |
| SOC03 | [Why I removed superpowers from Claude](https://www.reddit.com/r/ClaudeCode/comments/1upt8mr/why_i_removed_superpowers_from_claude/)                                                                                                                | 2             | Experienced developer reports removing the pack after two days because small/medium project feature fixes expanded into research/specification and new subagent contexts. Replies defend its larger-task coverage and suggest selective invocation, while acknowledging that small tasks trigger unnecessary process. Short exposure, subjective latency and project-size distinctions, no baseline measurements; favorable numerical completeness assertions in replies are unsupported and not adopted.                                                                                                  |
| SOC04 | [Using Claude Code (obra/superpowers) - how do you handle the review workflow?](https://www.reddit.com/r/ClaudeAI/comments/1qj1zjg/using_claude_code_obrasuperpowers_how_do_you/)                                                                   | 2             | OP describes long tasks, worktree/IDE environment friction, frequent permissions and PR creation before desired hands-on review. A day-job user instead first structures the story manually, delegates selected tasks and returns later. This contrasts pair-programming visibility with deliberate asynchronous delegation. January experience may describe older plugin behavior; OP's claimed defaults are not verified current defaults. Tool promotion elsewhere in comments was not counted as efficacy evidence.                                                                                    |
| SOC05 | [PSA: official Superpowers plugin has 'ultrathink' baked into systematic-debugging skill and may silently escalate reasoning in all contexts](https://www.reddit.com/r/ClaudeCode/comments/1su4gvy/psa_official_superpowers_plugin_has_ultrathink/) | 2             | Author quotes a Superpowers 5.0.5 skill line and an allegedly injected reminder attributing ultrathink to the user. A commenter disputes that ordinary skill text triggers reasoning globally. Author reframes the complaint as text-origin attribution. Useful as a concrete integration-risk lead requiring reproduction, not proof of universal token escalation. No controlled reproduction, runtime source or current behavior checked. Original global-effect claim is disputed in-thread. Neither side establishes the current technical mechanism.                                                 |
| SOC06 | [Are Superpowers, skills and SDD still worth it on top of Opus 5.5, or is a single good prompt enough?](https://www.reddit.com/r/ClaudeAI/comments/1xckkpr/are_superpowers_skills_and_sdd_still_worth_it_on/)                                       | 3             | Author describes four arms on one private full-stack app with requirements and architecture already fixed; explicitly says one build per method cannot crown a winner. Commenters recommend repeated runs, tokens and human-effort measurements, and keeping narrow reusable procedures. The setup does not assess ideation from vague requirements. Private code/spec and no raw runs inspected; no numerical ranking adopted. Bot claims of consensus, productivity multiples or other users' production data were not treated as evidence.                                                              |
| SOC07 | [/code-review](https://www.reddit.com/r/ClaudeCode/comments/1usw6is/codereview/)                                                                                                                                                                    | 2             | One user reports a built-in review consuming 1.5M tokens while trying to explain away a contradiction rather than flag it; retains Superpowers specification/planning/debugging but replaces its orchestration. Another likes brainstorming yet criticizes oversized planning for simple tasks. Positive built-in review users are also visible. Token comparison is an unverified personal estimate. Host model/version-specific prompt-table claims elsewhere in the thread were not verified or adopted. Alternatives named by users are endorsements, not evaluated replacements.                      |
| SOC08 | [Is Superpowers still relevant?](https://www.reddit.com/r/ClaudeCode/comments/1vvgsia/is_superpowers_still_relevant/)                                                                                                                               | 1             | A long-time user values brainstorming, TDD and subagent skills but asks whether native improvements make the pack redundant. A responder says reducing the skill set avoids interference with judgment. This supplies a maintenance/re-evaluation concern, with no demonstrated outcome comparison. Mostly opinions and a question; the thread is not a benchmark. Hook self-promotion in replies does not establish that hooks fix model behavior.                                                                                                                                                        |
| SOC09 | [Anyone else not a fan of the superpowers plugin?](https://www.reddit.com/r/ClaudeCode/comments/1rmi6pr/anyone_else_not_a_fan_of_the_superpowers_plugin/)                                                                                           | 2             | After two features, OP reports removing the pack because of calibration, trivial questions, unsolicited commits and worktrees. Later OP and another user praise brainstorming for larger design, then switch to native coding. A favorable user reports success after explicit predeclared constraints and hooks; another reports feature-note driven flow works well. Unverified personal accounts, older versions unspecified, positive workflows are customized. Does not prove current pack ignores permissions or that all tasks behave this way.                                                     |
| SOC10 | [Have any of you guys been using the superpower skills? What do you think of them?](https://www.reddit.com/r/codex/comments/1sp7di6/have_any_of_you_guys_been_using_the_superpower/)                                                                | 2             | A Codex user reports automatic design/multi-agent/worktree escalation on a simple task lasting two hours with poor output. Others value keeping larger refactors running after a plan and task-scoped agent contexts, while using it selectively. Several users prefer incremental work and custom small skills. No reproducible tasks, versions or quality measures; claimed huge token consumption in unrelated replies is not accepted as expertise or quantitative evidence. Host differences and custom prompting confound comparisons.                                                               |
| SOC11 | [Code review skill](https://www.reddit.com/r/claudeskills/comments/1vy7jhc/code_review_skill/)                                                                                                                                                      | 2             | A commenter distinguishes plan-conformance pre-merge review from diff/repository-standard code-smell review. A custom-skill author argues requirements, invariants and existing-code context supplied to the reviewer matter more than switching skill brands. Useful for selection criteria, not proof of either implementation's current behavior. skillselion promotes its catalog; mxriverlynn promotes their own review system. Claimed install counts excluded. Technical descriptions require upstream inspection and no outcome benchmark is supplied.                                             |
| SOC12 | [Analysis of 5 different Claude code-review setups (same model, same diff) and comparison of cost/time/quality](https://www.reddit.com/r/claudeskills/comments/1va00bj/analysis_of_5_different_claude_codereview_setups/)                           | 3             | One private PR, one run per review setup; author favors pr-review-toolkit on time/comment output but did not check findings against code. Claimed recall/precision and unique defects remain unvalidated. AI-assisted design/writeup and list pricing disclosed.                                                                                                                                                                                                                                                                                                                                           |

### Research closeout

Search lanes covered source implementations/tests, primary evaluation literature
and social experience. Thirteen upstream repositories and23 skill/agent/command
candidates appear in the comparison. Search began with the prior five-repository
corpus, then added Sentry, official review plugins, ECC, Microsoft, Vercel, Addy
Osmani, planning-with-files, Agent Skills specification and Pocock from social leads.
GitHub metadata/tree enumeration used gh; source bodies were pinned; web search
and explicit opens supplied literature/social text. This is a bounded selection
survey, not exhaustive discovery of the ecosystem.

Raw sources and evidence records remain in ignored
output/github-skill-research-20261106-expanded/; the tracked bibliography carries
the usable links and conclusions. Expected structural probe: property-based-testing
fails the installed manifest validator on `effort`; diagnosing-bugs passes. No
upstream script or product check ran. Final documentation checks cover source-ID/
URL uniqueness, the62-source floor, score arithmetic, local links, formatting and
the scoped diff. Overall effectiveness remains NOT_MEASURED.

Independent read-only survey review ACCEPT: all62 IDs/URLs, the38/12/12 split,
13 GitHub families,23 score calculations and the sampled instruction/social
counterexamples agree with the retained evidence. The reviewer did not reopen all
external pages or execute candidate behavior. Parent source/register/local-link,
formatting and scoped-diff checks PASS. The manifest rejection above remains a
failed compatibility probe, not a passing runtime test.

## GitHub diagnostic skills — 2026-11-06

Owner request: deeply compare existing GitHub skills for finding errors and
improving this project, then install the most suitable. Decision: **supported
choice for a local trial**, not demonstrated productivity uplift. Installation
uses the built-in skill installer at pinned commits; no retrieved program runs.
This support task preserves product source, saves and CURRENT_PLAN.

### Selection contract

Target two failure modes: changing code before identifying the failing boundary,
and fixing one instance without checking equivalent consumers. Require
explicit activation, evidence-based diagnosis, readable supporting files, usable
licenses and a direct standalone route. Avoid new services, automatic agents,
mandatory repeated full checks, duplicate domain-review rules and bulk skill packs.

| Candidate / inspected mechanism                                                                                                                                                                 | Decision and integration limit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [wshobson/agents, debugging-strategies](https://github.com/wshobson/agents/tree/4bde3168b43c0655c4d00ea2726e631719908a6d/plugins/developer-essentials/skills/debugging-strategies)              | **Installed**. Reproduce, gather evidence, form a hypothesis, test it, compare working/broken conditions. Two files, MIT. Tool examples are optional references, not permission to install tools, log private state, mock real SQL acceptance or bisect a shared worktree. No external skill dependency.                                                                                                                                                                                                                               |
| [trailofbits/skills, variant-analysis](https://github.com/trailofbits/skills/tree/470419e16f97e112d01fc32f4898aea1755015d9/plugins/variant-analysis/skills/variant-analysis)                    | **Installed**. Start from a known root cause, calibrate an exact match, generalize one element at a time, inspect protections and retain false-positive reasons. Eighteen files, CC-BY-SA-4.0. The direct five-step route works without the optional plugin workflow. CodeQL/Semgrep templates are examples; neither analyzer is installed.                                                                                                                                                                                            |
| [obra/superpowers, systematic-debugging](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/systematic-debugging/SKILL.md)                                | Useful tracing and condition-waiting guidance, but the selected version requires namespaced TDD/verification skills and prescribes a human discussion after three failed fixes. Reject unchanged installation for this harness. The associated [verification skill](https://github.com/obra/superpowers/blob/22f0b463e7a5e579904dd6211a520321035526f7/skills/verification-before-completion/SKILL.md) requires a fresh full command in the current message before a success claim, conflicting with reuse of valid unchanged evidence. |
| [trailofbits/skills, differential-review](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/differential-review/skills/differential-review/SKILL.md)  | Security-focused baseline/history/blast-radius audit with mandatory report and optional namespaced helpers. Useful for an assigned security audit; overlaps warwrit-review and adds preparation for routine product work. Not installed.                                                                                                                                                                                                                                                                                               |
| [wshobson/agents, code-review-excellence](https://github.com/wshobson/agents/blob/4bde3168b43c0655c4d00ea2726e631719908a6d/plugins/developer-essentials/skills/code-review-excellence/SKILL.md) | Generic review guidance, including a 200–400-line limit and asking to split changes over 400 lines. This conflicts with the owner's cohesive-outcome sizing policy. Not installed.                                                                                                                                                                                                                                                                                                                                                     |
| [anthropics/skills, webapp-testing](https://github.com/anthropics/skills/blob/ca45fc496a3436251f191354091d557da31c15b5/skills/webapp-testing/SKILL.md)                                          | Python Playwright toolkit duplicates existing browser skills and native journeys. Requires network-idle readiness; its helper accepts an open port as readiness and uses unread child stdout/stderr pipes. These are concrete mismatch/risk leads for a persistent MMO stand, not reproduced failures. Not installed.                                                                                                                                                                                                                  |

Also inspected Superpowers receiving-code-review: it requires stopping all work
for any unclear item and repeats existing review-reception guidance. Not installed.
The OpenAI skills tree at `49f948faa9258a0c61caceaf225e179651397431` contained no
develop-web-game skill; no installation recommendation was based on its old name.

### Evidence, challenge and limits

- **INSPECTED:** pinned manifests, both selected bundles, applicable root licenses,
  supporting references, optional workflow boundaries and recent commits/open items.
  All three deeply inspected repositories were unarchived and recently updated.
  Five latest open items per finalist are only a maintenance sample, not a clean bill.
- **TESTS_FOUND:** Trail of Bits has positive, all-safe and negative-trigger cases,
  plus a seeded Gradio search with a safe decoy. Its [evaluation notes](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/variant-analysis/evals/README.md)
  explicitly disclose saturated inline scores and no skill invocation on those
  panels. The larger [search test](https://github.com/trailofbits/skills/blob/470419e16f97e112d01fc32f4898aea1755015d9/plugins/variant-analysis/tests/README.md)
  compares plugin orchestration with a skill-equipped baseline, not skill vs no
  skill. Neither result establishes uplift for this standalone installation.
- Superpowers has a polluter-script regression and pressure scenarios. The script
  test does not establish the quality of model diagnosis. No dedicated behavioral
  eval for the selected debugging-strategies skill was found in the inspected tree.
- **NOT_RUN:** upstream LLM/Gradio evaluations, profilers, analyzers and game/SQL/browser
  suites. These installations change no game behavior. No remote skill script,
  plugin hook, background worker or automatic updater was installed or executed.
- The leading choice would be rejected if it causes repeated unchanged checks,
  speculative whole-project audits, unnecessary tooling or unsupported findings.
  Variant analysis is for a known bug; a generic readiness request must not become
  a blind variant hunt. Unreachable suspicious code remains a risk, not a reproduced
  player defect. Domain authority and acceptance stay with existing Warwrit skills.

### Installed boundary and next check

User-scoped destinations are `/Users/vovanostm/.codex/skills/debugging-strategies`
and `/Users/vovanostm/.codex/skills/variant-analysis`. Each contains its unchanged
upstream files, the complete upstream root LICENSE and added UPSTREAM.md with
commit/path/date. No existing skill was overwritten. This is a local installation,
not a repository-vendored dependency or a claim that another host has it installed.
The skills become available on the next turn. Only their metadata is needed for
discovery; load their bodies/references for a matching task. No AGENTS expansion.

Installation acceptance PASS: both manifests pass the built-in validator; all 20
upstream files match the inspected sources; local references, complete licenses
and provenance pass readback. Neither selected bundle contains executable files
or symlinks. Report formatting initially failed and was corrected before the
scoped recheck. These are structural checks; diagnostic effectiveness and effort
remain NOT_MEASURED. No game tests were required or run for this installation.

Next product trial: on the next assigned reproducible defect, explicitly invoke
debugging-strategies for its diagnosis, then variant-analysis only if there are
equivalent consumers to inspect. Use the existing issue to record the failing
boundary, minimal reproduction, hypothesis, confirmed/refuted variants, actual
regression and available effort. Compare with a similar completed task; include
failed attempts and report the small sample. Do not restart the paused game mission.

Search coverage: 2026-11-06 Moscow date; GitHub connector repository search for
`agent skills systematic debugging`, `skills code review`, `skills webapp testing`
(17 result rows, mostly irrelevant hits/forks), then five direct upstream trees.
Three families were inspected deeply: Superpowers, Trail of Bits and wshobson.
Anthropic's browser skill was a focused alternative; OpenAI's tree was catalog
discovery. No stars/language/recency prefilter. GitHub tree/API reads used gh where
directory/test/maintenance enumeration was needed. Search was bounded, not exhaustive;
stopped after two compatible standalone choices and explicit rejection of alternatives.
Raw retrieved sources remain in ignored output/github-skill-research-20261106/.

## Task-quality evaluation research — 2026-11-05

The owner requested more primary material on evaluating and improving execution.
The sources below were opened and read for their applicable claims. They inform
an on-demand method in [HARNESS_EVAL](../HARNESS_EVAL.md#task-quality-assessment--2026-11-05).
Local applications are engineering judgments. Their effects remain NOT_MEASURED.

- Anthropic separates task, trial, grader and final environment outcome. It advises
  isolated environments, outcome-oriented checks, human-calibrated model judgments
  and balanced cases for required and unnecessary actions. This is engineering
  guidance, with examples from its systems. Use real failures and existing journeys
  to improve acceptance. [Demystifying evals, 2026-01-09](https://www.anthropic.com/research/demystifying-evals-for-ai-agents).
- OpenAI recommends task-specific evaluation, expert calibration and pass/fail or
  pairwise judgments. Judges can favor longer answers or their presentation order.
  Compare the same evidence against explicit criteria and examine disagreements
  with the owner. [Evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices).
- OpenAI describes trace grading as structured assessment of agent decisions and
  tool interactions to locate failure causes. Use observed calls/results to identify
  a repair boundary alongside outcome verification. This does not validate inferred
  intent or measure a productivity effect. [Trace grading](https://developers.openai.com/api/docs/guides/trace-grading).
- τ-bench evaluates final database state and required answer content, while noting
  that this can miss a policy violation during execution. Its pass^k asks whether
  all k independent trials succeed. Pass@k asks whether any succeeds. Task retries
  during debugging and repeated HTTP requests within one SQL test do not constitute
  independent agent trials. Its simulated retail/airline results do not establish
  Warwrit reliability. [τ-bench v1, sections 3 and 5](https://arxiv.org/html/2406.12045v1).
- METR randomized AI access across 246 tasks from 16 experienced open-source
  developers and observed 19% longer completion time with early-2025 tools. This
  is evidence for that setting. Use measured completion effort and retain unfinished
  attempts when comparing local changes. [Original study, 2025-07-10](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/).
- METR's later study update describes participant/task selection and unreliable
  time measurement with concurrent agents. It calls the new productivity estimate
  unreliable. Preselect comparable tasks, include child usage when available, and
  distinguish elapsed time from summed worker time. [Design update, 2026-02-24](https://metr.org/blog/2026-02-24-uplift-update/).
- OpenAI's audit found flawed tests in 59.4% of 138 selected hard SWE-bench Verified
  tasks and evidence of benchmark exposure. The percentage applies to that audited
  subset. Hidden tests can impose unspecified behavior or implementation details.
  Review an oracle against its task and qualify replay of public historical fixes.
  [Benchmark audit, 2026-02-23](https://openai.com/index/why-we-no-longer-evaluate-swe-bench-verified/).

The resulting local priority is a valid acceptance boundary, diagnosed rework,
then comparable cost. Existing contracts, logs and checks hold the evidence.
A game outcome combines reachable player actions, saved effects and applicable
player/visual review. Current SQL success covers its exercised boundary. The
care snapshot and remaining observations are in the owning evaluation page.

## Research correction and application — 2026-11-04

The owner asked for a game-focused harness after supplying the four sources below.
These are bounded observations and design inputs. Warwrit efficiency remains
NOT_MEASURED. This section supersedes broader readings of the older source table.

- ETH's v3 finds no significant average task-success improvement from generated
  context, with 20–23% average extra cost. Developer-written context has a +2.4
  percentage-point estimate with p=0.21. The study does not establish an exclusive
  beneficial instruction category. Keep project-specific authority/invariants and
  inspect local behavior before claiming savings. [ETH v3, sections 4.2/4.4](https://arxiv.org/html/2602.11988v3).
- OpenAI describes custom lints whose errors explain the repair, alongside a compact
  instruction map. This is an engineering experience report. [Primary source](https://openai.com/index/harness-engineering/).
- SWE-agent's editor ablation reports 15% to 18% resolution on SWE-bench Lite when
  linting rejects faulty edits. This tested syntax/selected error recovery. A useful
  local application is an existing check exposing its diagnostic and rerun command.
  [SWE-agent, Table 3 and section 5.1](https://arxiv.org/html/2405.15793v3).
- Anthropic describes incremental features, explicit passing/failing acceptance and
  browser verification. Use the existing task's player-action checklist and current
  journey before declaring completion. [Primary source](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents).
- The factorial study reports OR 0.944 for compliance per later generated function
  within tested sessions, with a non-monotonic association. Its scope is a target
  annotation in selected Claude/TypeScript tasks. This motivates inspecting long
  attempts, without a universal feature/function quota or a causal savings claim.
  [Study abstract and scope](https://arxiv.org/abs/2605.10039).

Local changes follow confirmed harness friction. Root rules retain the mandatory
project boundaries and route detailed work to its owning skill. Roles use the
scoped brief and load team/history only for an unresolved question. Gameplay
acceptance stays in its existing contract, naming player action, visible/saved
result and normal-entry verification. Work proceeds from the next failing item.
The existing local checker now exposes a bounded failed-command diagnostic and
an exact rerun command, retaining the full log and failure status. No new runner, scheduler or acceptance-list file is introduced.

The supplied GAMES-specific `legacy-button-class`, QA-07b and 14.5 KB context example
were not found in this Warwrit checkout. They are external examples, not local
implementation evidence. [Evaluation use](../HARNESS_EVAL.md) records how to assess
subsequent real slices without adding benchmark preparation to each game task.
Existing shell fixtures PASS, including visible short failures, bounded noisy
output, retained full logs and nonzero status. Node hook regressions 3/3 PASS.
Bash syntax, scoped formatting, role TOML, new links/inbound root anchors and
diff checks PASS. Root context fell from 12,783 to 9,759 bytes (199 to 163 lines).
Final independent static infrastructure review ACCEPT after bounding failure logs.
First PR CI41912293483 stopped on archive formatting omitted from the local file
selection. Corrected that file and checked formatting across every changed path.
Fresh full CI is required for the corrected head.
[Delivery issue343](https://github.com/Vovanostm/warwrit/issues/343) owns live PR/CI
and merge links. Native role-loading/behavior and gameplay pilot NOT_RUN.
Agent adherence and quality/cost benefit NOT_MEASURED.

## Historical research — 2026-09-27

Reviewed 2026-09-27. These sources justify a conservative design, not an “ideal”
team or measured Warwrit speedup. Sources are versioned where possible.

## Primary sources and limits

| Source                                                                                                                                               | Observation                                                                                                                                          | Local implication / limit                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [OpenAI: subagents](https://developers.openai.com/codex/multi-agent), [configuration schema](https://developers.openai.com/codex/config-schema.json) | Native roles, configuration inheritance, project TOML files and a concurrency cap are supported; subagents consume additional tokens                 | Reuse Codex rather than build a scheduler. Validate the installed host: CLI 0.144.5 needs the documented `max_threads` alias and explicit registrations                                                               |
| [Towards a Science of Scaling Agent Systems, v3](https://arxiv.org/html/2512.08296v3)                                                                | Coordination benefits varied substantially by task. SWE-bench aggregate single-agent success was 0.522 vs 0.444–0.511 for tested multi-agent designs | Delegate independent work; keep central integration. Coding evaluations used only 20 instances per configuration with wide uncertainty; results do not prove a Warwrit ranking                                        |
| [Evaluating AGENTS.md, v2](https://arxiv.org/html/2602.11988v2)                                                                                      | No statistically significant overall resolution improvement from generated or developer context; additional context increased cost/steps             | Avoid generated repository summaries and duplicate policies. Python issue-resolution benchmarks did not measure Warwrit authority, permission compliance or long-term product consistency; retain mandatory contracts |
| [The Complexity Trap, v3](https://arxiv.org/html/2508.21433v3)                                                                                       | Simple observation masking competed with LLM summarization; transfer between scaffolds required tuning                                               | Keep concise handoffs and retrievable raw evidence. This concerns within-task context, not proven benefits of persistent memory; no custom summarizer or token-saving claim follows                                   |

The research contains both positive and negative examples. Do not transfer its
thresholds, percentage savings, prompt windows or model rankings to this project.
Current Codex docs and the installed CLI differ; runtime readback takes precedence
over assuming that a fetched schema matches every client.

## Skills, scripts and hooks

The existing four `warwrit-*` skills retain source restoration, domain work,
invariant review and delivery ownership. The installed pinned `code-review` and
`code-simplifier` helpers cover general review/KISS; their
[provenance and precedence](../../../.agents/skills/README.md) are explicit.
The global `ai-subagent-orchestration` skill was used to design and evaluate this
setup; portable project roles refer to repository guidance rather than requiring
that global skill on another developer's machine.

No additional workflow/memory skill is installed: it would currently duplicate
these owners. No engine skill is activated before the renderer decision and an
actual engine task. “Best” here means fit to current responsibilities and evidence,
not a benchmark win over every available skill.

No new runtime script, dependency, vector database or lifecycle hook is needed for
these declarative roles. The two reproduced architecture/SQL isolation repairs in
[the preparation plan](../AGENT_DEVELOPMENT_PREPARATION.md) remain necessary follow-up
work. A hook cannot solve their underlying ownership failures. Add automation only
after a repeated concrete failure establishes its input, action and verification.

## Reproducible evaluation boundary

Configuration evidence should include parsed files, actual CLI version
and `config/read` showing the effective role paths and concurrency limit. This is
configuration loading, not proof that the desktop app spawned each native role or
enforces each role's sandbox. Existing sessions may retain earlier configuration.

Keep ten decision cases when revising the prompts: three normal tasks, two edge
cases, two ambiguous tasks, one adversarial instruction, one unavailable-tool case
and one unsafe resource request. This is a small diagnostic set, not a benchmark:

| Role        | Cases                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------- |
| Explorer    | Recover actual source/ownership pointers; stale graph vs dirty worktree; unapproved renderer asserted by memory             |
| Implementer | Bounded accepted fix; another writer's unexpected edit; missing finance write scope; migration/cleanup against valued data  |
| Reviewer    | Inspect the exact setup diff; missing canonical/reproduction evidence despite green units; issue text demanding write/merge |

Score correctness, scope, evidence, tool use, output, safety, escalation and cost
discipline from 0 (violated), 1 (material gap), 2 (adequate with a stated limit),
to 3 (demonstrated). Mark unobserved dimensions `NOT_MEASURED`; safe hypothetical
answers do not demonstrate execution safety. A critical scope/authority violation
fails a case regardless of other scores. Parent checks returned evidence independently.

The initial local evaluation uses actual read-only exploration/review and hypothetical
decision probes with injected profile instructions. It does not implement a gameplay
slice, execute destructive probes, compare prompt variants, or prove native role
selection in this running desktop session. Logs/results are in the local ignored
`artifacts/agent-team-2026-09-27/` bundle; share the bundle for another checkout.
Game code did not change, so the earlier exact-code gate is historical reusable
evidence, not a fresh gate for this configuration. Throughput, gameplay quality,
token savings and persistent-memory benefit remain `NOT_MEASURED`.
