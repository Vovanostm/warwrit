# M1 local playtest

## Prepared owner session — 2026-11-17

READY_FOR_OWNER_TEST / LOCAL. Open `http://127.0.0.1:5333` in Chrome and choose
**Войти за компанию 3**. The prepared headed browser already has this company
open in Березняк. Its window belongs to the owner during the trial.
[Preparation and provenance](../work-packages/m1-next/09-player-experience.md#owner-playtest-preparation--2026-11-17).

The company has three equipped living people, each at 60/100 health and 50 morale,
21 rations and a company treasury of 970 crowns. The treasury wallet is physically
at Северный Двор. This retained QA world includes earlier battles and losses.
The parent moved the company to Березняк through normal travel and advanced the
protected test clock by 100 ticks. The parent also withdrew its earlier HUNT-04
acceptance so the owner can accept that offer personally.

## Short route

1. Open **Место → Дом старейшины → Вожак с рваным ухом**. Read the objective,
   reward and payment conditions, then choose **Договориться и взять поручение**.
   The current offer pays 60 crowns.
2. Open **Путь**. Right-click **Тихая Гать** to travel to the objective shown in
   the contract. The parent can advance the existing test clock for travel when
   requested. Let the company arrive before entering the battle.
3. Read the battle controls, choose a target and act with the company's own
   fighters. Try a manual action, one-action autoplay and returning to manual
   control. The turn timer continues while the player considers an action.
4. After a victory, collect the actual trophy through the contract control,
   return to Савва in Березняк and present it for the reward. After another
   outcome, describe the losses, saved result and available next step.
5. Reload and confirm the same company, result, people, items and money.

The old HUNT-02 offer has its owner/helper slots held by the previously defeated
QA companies. Use the prepared HUNT-04 offer for this trial. The two hunts have
different issuers, targets and rewards.

## Record the player's experience

Ask the owner to explain the objective and expected reward before accepting,
then describe one tactical choice, losses and the next step after battle.
Record the owner's own words and any confusing label, blocked control, delay or
unexpected money/item change. Check the actual viewport and manual-control
handoff. Human observation and final acceptance are currently NOT_RUN.
[N09](../work-packages/m1-next/09-player-experience.md) owns the result.

## Build and performance

The current session uses the existing development runtime against retained
`m1_control_sync_20261116`, API 3033, realtime 3034 and web 5333. Its private
configuration and process ownership are in
[N12](../work-packages/m1-next/12-release-preparation.md#current-local-runtime-pointers--2026-11-16).
Code includes the checks through `3c0435b6`. The preceding compiled rehearsal
served `index-DHU6DWGG.js`. The production processes were stopped normally
before the development restart on the same ports/database.

The owner budget is minimum 60 FPS on MacBook + Chrome. N10 retains production
atlas/result/place samples, including a first-scroll 45-FPS window, and separate
untraced development battle samples with 36 active sprites at minimum 97/99 FPS.
Full target-session compliance remains open. Load/resource and hardware details
belong to [N10](../work-packages/m1-next/10-desktop-performance.md).

## Reproducing a local launch

Use the pinned setup and start/stop instructions in
[LOCAL_DEVELOPMENT](LOCAL_DEVELOPMENT.md#development-processes).
[N11](../work-packages/m1-next/11-durability.md) and
[N12](../work-packages/m1-next/12-release-preparation.md) own the completed
second-executor restore, login, restart and DB-loss/recovery evidence.
Preserve the retained QA databases and failed saves when continuing this trial.
