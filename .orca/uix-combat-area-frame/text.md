# #310 — Tier T input

Screen: combat field, top-right utilities. Speaker: interface, no character.
Actual order: Home («Обзор поля», title «Обзор поля (Home)»), **Участники боя**,
grid toggle («Показать всю сетку» / «Скрыть общую сетку», title «Сетка»),
day/night toggle («Ночная сцена» / «Дневной свет», title «День / ночь»),
autoplay («Начать автобой» / «Остановить автобой»), existing «Меню боя».

Rework round 1 retains the same control order and wording, with a reserved utility
lane and an 18 px CSS label. Gate 1 subsequently measured 18 px and passing text contrast; the separate border
repair and its current measurements are recorded in report.md.

Only changed displayed line: **Участники боя**.
Accessible name: native button text **Участники боя**. No title or shortcut added.
English review translation: **Battle participants** (not a localized game screen).
Surrounding review translations: Field overview (Home), Show entire grid / Hide general grid, title: «Сетка» / “Grid”,
Night scene / Daylight, Day / night, Start autoplay / Stop autoplay, Battle menu.

Mechanics: camera-only explicit one-shot framing of public active silhouettes and enabled
retained dead/retreated/surrendered ground plaques. Includes distant public subjects and
plaques on occupied tiles. Does not select, order, advance time or change encounter state.
No subjects uses full-field bounds; an unusable measured HUD opening leaves camera unchanged.
Home retains full-field overview. No automatic terminal framing or Inspect disclosure added.

Text critic round 1: BLOCKED_ENV for missing Grid title translation; corrected here
in round 2, inventory only. Fresh text verdict remains coordinator-owned.
