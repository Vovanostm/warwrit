# B3 — Repeatable contracts from world causes

Execute with [00-common.md](00-common.md). Type: code + text.
Time box: 8 agent-hours. Depends on: nothing. Blocks: B5.

## Goal

After the eight authored M1 contracts are done, the boards keep offering work.
Each new contract comes from a real cause in the shared world (a band on a
road, a pack near a village, a theft, a missing person, a shortage) and goes
away when the cause is resolved. Contracts differ in length; there are many
more of them than now.

**How the owner will try it:** finish the authored contracts in a local world;
boards in at least four places still show work, each tied to something visible
on the map or in the place; finishing one removes its cause.

## Owner decisions (verbatim)

- 2026-10-07: «Да, больше повторяемых контрактов, новых контрактов».
- 2026-10-07: «Не стоит ограничивать бюджет боя — будут разные контракты —
  можно расширить время контракта».
- 2026-10-03: long-term sandbox for weeks with repeatable contracts (m1-spec §18).

## Must read

- `docs/wiki/vision.md` (REQ-09, REQ-11, MMO fit table).
- `docs/wiki/economy-quests/shared-world.md`, `quest-rules.md`, `economy.md`,
  `catalogue.md` (R-type cards), `places.md`.
- `docs/wiki/bestiary/world-rules.md`, `encounters.md`, `bandits.md`.
- `docs/wiki/world/porechye.md` (people, the war context, the band).
- Code: `packages/game-core/src/contracts/` (`manifest.ts`, `ordinary.ts`,
  `runtime.ts`, `types.ts`, `validate.ts`); `packages/game-core/src/world/population.ts`;
  `apps/server/src/contracts/` (`ordinary.ts`, `executor.ts`, `repository.ts`, `routes.ts`);
  `apps/web/src/game/ContractBoard.tsx`, `apps/web/src/i18n/contracts.*.ts`.

## In scope

- Cause model: a world fact that can spawn and end offers.
- 6–10 contract templates, chosen from economy-quests R-cards that fit the war:
  at least HUNT (band, pack), RESCUE (missing person), INVESTIGATE (theft),
  DELIVERY (shortage between places).
- Deterministic generator from world state to offers; issuer per place;
  reward from the issuer's wallet; expiry when the cause ends.
- Text: per template 3–5 brief variants with named local issuers.

## Out of scope

Non-combat story missions (B4). Crisis contracts (B5). New regions. New enemy
types beyond those in `population.ts`.

## Design constraints

- No offer without a cause; one cause → at most one open offer of a template.
- One truth for all companies: if company A resolves the cause, company B's
  accepted contract on it ends with a defined outcome and no second payment.
- Rewards come from the issuer's wallet; money conserved exactly; an issuer
  with an empty wallet offers nothing.
- Length varies by template (travel distance, number of steps); no global
  time cap.
- Seeded, explicit time; same world state → same offers.
- Text follows writing.md; issuers are named people of the place (add rows to
  `docs/content/world/characters.csv`).

## Steps

1. **Contract.** `docs/work-packages/M1-REPEATABLE-CONTRACTS.md`: cause model,
   chosen templates (table: template, cause, steps, proof, reward range,
   typical length), shared-world outcomes, late player, AC. Commit.
2. **game-core.** Causes, templates, generator, validator. Tests: determinism,
   conservation, no causeless offer, cause resolution ends offers, A/B conflict
   outcome. Commit.
3. **Server.** Generate on campaign advance; persist; serve on the board. Tests.
   Commit.
4. **Text.** Brief variants and step/finding strings in
   `i18n/repeatable.ru.ts` / `.en.ts`; new characters rows. Commit.
5. **Journey.** Finish the authored eight (or seed a world where they are done);
   take and finish two generated contracts of different templates; see a new
   cause produce a new offer. Critics. Commit.

## Acceptance criteria

- **AC-1** With the authored eight done, boards in ≥ 4 places offer generated
  contracts (journey screenshot + test).
- **AC-2** Every generated offer names its cause; resolving the cause removes the
  offer (test).
- **AC-3** Same seed and world → same offers (test).
- **AC-4** Wallet and payment conservation; no double payment when two
  companies race (test).
- **AC-5** At least 6 templates, of which ≥ 1 HUNT, RESCUE, INVESTIGATE, DELIVERY.
- **AC-6** Brief variants pass the text critic in ru and en.
- **AC-7** Two different templates played to payment (journey).

## Critique

- Code: `warwrit-critic` — conservation, determinism, shared-world race, SSOT
  of contract rules.
- Text: `warwrit-text-critic` on all brief variants and step strings.
- Journey: the two played contracts and the regenerated offer.

## Stop and ask

- If a template needs a new world system (e.g. trade routes) not in the code.
- If reward ranges would change accepted M1 balance.
