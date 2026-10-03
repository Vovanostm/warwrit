# M1 full build prompt

Status: owner-ready prompt draft, 2026-10-01. Not an approval, assignment or
acceptance record. The owner launches it in a fresh Claude Code session at the
repository root. Edit the **Authorizations** block before launch if the grants
should differ.

---

## Prompt

You are the lead developer of Warwrit. Your goal is the accepted local M1 alpha
described in [the M1 spec](../wiki/m1-spec.md): a player opens Warwrit in
Chrome on the owner's Mac, plays the whole M1 loop with all content, quits, and
returns to the same persistent world. You implement code and integrate it.
Codex generates all raster images and sprites.

### Authorizations (granted by the owner launching this prompt)

- Granted: implementation, tests, local runs, commits, new branches, pushing
  branches, opening and updating PRs.
- Granted: Phase 0 rescue of the c06 checkout as described below (commit and
  push its work to a new branch; restore deleted tracked files from `HEAD`).
- Granted: running `codex exec` locally for image generation as described in
  **Art with Codex**.
- Not granted: merge, auto-merge, deployment, paid provisioning, force-push,
  editing a released migration, approving open design questions. Ask the owner
  for each; record the grant in CURRENT_PLAN or the PR.

### Read first, in full

1. `AGENTS.md` (contract; its hard rules override this prompt).
2. `docs/wiki/m1-spec.md` — product scope, 11 scenes, states, §17 remaining
   work and the 2026-10-01 code snapshot.
3. `docs/engineering/CURRENT_PLAN.md` and `docs/engineering/NEXT_SESSION_HANDOFF.md`.
4. `docs/engineering/M1_PRODUCTION_PLAN.md`.
5. `docs/content/CONTRACTS_M1_DERIVATIVE.md` — read the **c06 copy**, which
   contains the 2026-10-01 `first-hunt-runtime-profile-2026-10-01-v1`
   amendment.
6. `docs/architecture/0006-m1-renderer-babylon.md`.
7. Matching skills in `.agents/skills/` when the task type fits.

After this reading, keep a short checkpoint; do not re-read unchanged files.

### Ground truth on 2026-10-01 (re-check before relying on it)

- `main` (`4ec0be6`): rich pure `game-core` (combat, company, economy, world,
  contract catalogue); server has auth, encounter runtime, migrations
  0001–0004; web is a WP-00 placeholder plus a dev combat lab. No playable path.
- `/Users/vovanostm/multica_workspaces_local/warwrit-alpha-c06`, branch
  `codex/m1-company-storage` (13 commits ahead / 5 behind `main`, **not on
  GitHub**): company opening and re-entry, world travel, FIRST HUNT executor
  with claim/payout, migrations 0005–0010, web screens `CompanyOpening`,
  `WorldTravel`, `FirstHunt`, `EncounterPanel`. Migrations 0006–0010 and most of
  this code are **untracked**. The whole `packages/` tree is deleted in the
  working copy (194 tracked files), so it does not build. FIRST HUNT runtime is
  `NOT_RUN`.
- c06 renders with PlayCanvas; Babylon.js exists only in `apps/renderer-spike`.
- c06 may hold live local services and private files under `.tmp/` (database
  URL, OIDC config). Never print, commit or move them.
- Open PRs: #129 (draft Knight sprite pilot, PlayCanvas, third-party-looking
  baked sprites) and #134 (quality tooling). Neither is part of this plan.

### Operating rules

- Results first. Every cycle ends with something the owner can play in a
  browser, with a one-paragraph "how to try it". Code, tests and reports alone
  are not delivery.
- Shortest cohesive path. Reuse existing `game-core`, c06 adapters and
  installed libraries. No new framework, service, database, Redis or second
  lockfile. A new dependency needs an inspected reason and a note in the PR.
- Server is the only authority. The client never chooses actor, roster,
  enemies, time, evidence owner, amount, recipient or claim right. UI never
  creates a canonical fact.
- Invalid commands change nothing. Money stays exact. Each item has one owner.
  One proof pays once. Public and private knowledge stay separate.
- `game-core` stays pure. Time and randomness are explicit inputs.
- New schema changes are new ordered up/down migrations. Never edit 0001–0010
  once they are pushed.
- Tests: add one only for a real defect or a money/authority/privacy/atomicity/
  idempotency risk. Use real PostgreSQL for persistence claims. No hash
  manifests, checksum comparisons or repeated evidence audits.
- Report honestly. A failed, skipped or unmeasured check is `NOT_RUN` or
  `NOT_MEASURED`, never a pass.
- Shell setup: run `eval "$(fnm env)"` before `pnpm`; Node 24.20.x, pnpm 11.25.x.
- Keep commits reviewable: one PR per phase/cycle, or smaller when a cycle is
  large. PR body: scope, how to try it, checks actually run, migration impact,
  remaining risks.
- If a step is blocked by an owner decision, ask one concise question in
  Russian and continue with the work it does not block.

### Phase 0 — rescue and one runnable build

Outcome: all game work is safe on GitHub, and one checkout builds and starts.

1. In c06, without disturbing `.tmp/` or running services: create branch
   `codex/m1-c06-rescue` from the current `HEAD`, restore deleted tracked
   files with `git restore --source=HEAD -- packages` (confirm first that the
   deletion is accidental: no moved copy exists elsewhere; leave the deleted
   `.agents/` skills to the merge with `main`), stage the
   untracked source, migration and doc files by explicit path (never
   `.tmp/`, `output/`, `.playwright-cli/` or secrets), commit, push.
2. In a fresh worktree of this repository, merge `origin/main` into the rescue
   branch. Resolve conflicts preserving both sides' intent; harness/docs
   changes from `main` win where they overlap.
3. Make `pnpm install --frozen-lockfile`, `pnpm build`, `pnpm typecheck` and
   the focused tests for company, world and contracts pass. Fix real defects;
   do not weaken checks.
4. Make one documented local start: `pnpm db:up`, `pnpm db:migrate:up`, local
   OIDC (reuse the existing compose identity setup), `pnpm dev`. Write it into
   `docs/engineering/LOCAL_DEVELOPMENT.md`.

Done when: a clean clone of the pushed branch starts the stack with the
documented commands and the web shell loads. Open a PR; do not merge.

### Cycle 1 — company and world are playable

How to try it: sign in, create a company, look at people, money and items,
choose a route on the global map, travel, sign out, restart the server, sign
in again and find the same company in the same place with the same state.

- Replace the WP-00 placeholder with the real game shell: sign-in, company,
  global map, settlement. Keep the combat lab dev-only.
- Global map: lawful locations from the region catalogue (town Kamenny Brod,
  villages Bereznyak, Tikhaya Gat, Severny Dvor, Old Mill — working names),
  the player's party moving on the server clock, other parties only from
  observer-lawful knowledge. Two clocks per spec §6.
- Dangerous route with supplies and lawful return; camp where allowed.
- Visible sign-out/sign-in and clear loading, refusal, disconnect and
  unknown-command-outcome states with safe retry.

Done when: the journey above works in real Chrome against real PostgreSQL
across a server restart. Record one short demonstration note (steps and what
was seen) in CURRENT_PLAN.

### Cycle 2 — one full FIRST HUNT (`ci.m1.raider-standard.01` / `HUNT-03`)

How to try it: two players in two browser profiles each take the "Raider
Standard" offer from the local issuer, travel to the mill, send separate JOIN
intents, fight three raiders in turn-based combat, pick up the standard,
return, present it, and the bearer receives exactly one payout. After quit and
server restart, wounds, deaths, items, money and the redeemed standard are all
still there.

- Use the bounded runtime profile terms only for this instance; do not
  generalize them.
- Producers are real: issuer, offer, funded wallet, persistent hostiles,
  lawful knowledge. No fixture enemies or UI-only facts.
- Combat runs through the existing encounter runtime and Colyseus adapter:
  real participants, 30-second human activation deadline with one atomic
  `wait`, disconnect and recovery.
- Terminal outcome applies real consequences to people, custody and items;
  the trophy has a real source and current physical owner; one atomic claim
  and payout.
- Also verify: owner-only attempt if admission allows it; repeated command,
  foreign actor and two simultaneous claims produce no partial change and no
  second payout.
- Render combat with the current view first if that is faster; move it to
  Babylon in Cycle 3. Do not block this cycle on the renderer.

Done when: the whole hunt is playable by two real companies in Chrome and
survives restart; the race/replay checks above pass on real PostgreSQL.

### Cycle 3 — full M1 content, Babylon presentation, acceptance

1. **Babylon.js renderer.** Move global map, settlement/camp and tactical
   combat views to Babylon.js in the web rendering adapter (inspect the
   lockfile version and typings first; reuse `apps/renderer-spike` lessons).
   Sprite-based 2.5D. Remove PlayCanvas from the production web app once
   Babylon covers its views.
2. **All contracts and scenes.** Make all 8 instances across HUNT /
   INVESTIGATE / RESCUE and all 11 scenes playable, including the chain "When
   the Mill Falls Silent" (`MILL-01..04`, `HUNT-01`). Each outcome comes only
   from real world state: rescue needs a real freed captive; investigation
   records only observed facts; a dead beast does not prove human guilt.
3. **Company life.** Upkeep, camp, F1, learning, departure/farewell, losses
   and succession through real commands and existing `game-core` rules.
4. **Owner decisions.** Before building the content that needs them, ask the
   owner (Russian, one question at a time, with a recommended option) about:
   ordinary payout amounts and shares, leave/cancel/term-change outside FIRST
   HUNT, trophy fate after ordinary redemption, unarmed/incapacitated combat
   profiles, camera angle and controls. Record each answer as a dated owner
   decision in the owning document.
5. **Art integration.** Integrate the Codex-generated set below.
6. **Local alpha guide.** `docs/engineering/M1_LOCAL_PLAYTEST.md`: prerequisites,
   start/stop, sign-in/re-entry, map/route, contracts/scenes,
   combat/proof/payout/consequences, safe data handling, troubleshooting.
7. **Acceptance.** Live browser runs for persistence/restart, privacy,
   concurrent commands and claims; renderer behavior and frame rate measured in
   Chrome on the owner's Mac; then the owner plays the full path. Run the full
   gate once on the final integrated build: `pnpm verify`,
   `pnpm test:combat:stress`, `pnpm test:migrations`. Record actual results and
   limitations.

Done when: the owner completes the full M1 path and confirms they understand
goal, actions, outcome, losses and return. Merge only with the owner's explicit
permission.

### Art with Codex

Codex generates every raster image. You own art direction, integration and the
asset manifest. Codex never edits code, docs or `assets/manifest.json`.

**Style gate first.** Before any production asset, have Codex generate a
style sheet for the owner: 3 variants of one mercenary unit sprite plus one
map tile and one portrait, dark-fantasy, sprite-based 2.5D, readable at game
scale, original (no imitation of Battle Brothers, Heroes or any existing art or
IP). Show them to the owner and ask which direction to take (pixel art or
painted, camera angle, outline). Record the choice in ADR-0006 as a dated
owner decision. Use the chosen image as the reference (`-i`) for every later
generation so the set stays consistent.

**Production list (M1 minimum, plus what the UI needs):**

| Group | Items |
| --- | --- |
| Backgrounds (4, reusable) | settlement/town, village, mill/wilderness night, camp |
| Portraits (6) | local issuer, mill worker, cellar captive, lost scout, two company members |
| Trophies (2) | raider standard, beast trophy |
| Enemy archetypes (3) | raider, night beast, wolf — each a unit sprite |
| Player units | mercenary archetypes used by company opening |
| Global map | terrain tiles or one painted map, location icons, party tokens |
| UI | small icons for money, wounds, food, proof — only where text is unclear |

Unit sprites: transparent PNG, consistent size and baseline, one facing
(mirrored in engine) plus idle, attack and hit poses. Do not chase
frame-by-frame animation; use engine tweens for motion. If a pose set looks
inconsistent, regenerate from the reference rather than hand-patching.

**Command template** (one asset or one coherent pose set per call; run from
the integration worktree; Codex runs locally, never on the game VM):

```bash
codex exec -C "$PWD" -s workspace-write \
  -i assets/art/m1/style/reference.png \
  -o artifacts/art-runs/<asset-id>.txt \
  "Use the \$imagegen skill with the built-in image_gen tool (not the CLI fallback). \
Generate <asset description>, dark-fantasy sprite-based 2.5D, matching the reference image's \
palette, lighting, line weight and scale. <size>, <transparent background | full frame>. \
Original design; no text, logos or watermarks. Copy the selected output to \
assets/art/m1/<group>/<asset-id>.png and write assets/art/m1/<group>/<asset-id>.json with \
{id, prompt, model, date, reference}. Do not modify any other file."
```

After each call, look at the image yourself. Reject unreadable, off-style or
derivative results and regenerate. Then post-process (trim, resize, atlas)
with existing repository tooling and add the entry to `assets/manifest.json`
with source `codex image_gen`, the prompt sidecar and date. A Codex image
failure is reported as `NOT_RUN`; do not substitute downloaded or third-party
art without the owner's permission and a license record.

### Reporting

- After each phase or cycle: update CURRENT_PLAN (status, how to try it,
  checks actually run), add a dated line to `docs/wiki/log.md`, and give the
  owner a short Russian report with links and the "how to try it" steps.
- Keep the spec §17 list current by marking finished items; do not copy the
  spec.
- Stop and ask when: an AGENTS.md hard rule would be broken, another writer
  owns the path, an owner decision blocks all remaining work, or the c06
  deletion turns out to be intentional.
