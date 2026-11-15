# Research — Завершение M1

**Дата** 2026-11-15. **Состояние** решения дизайна, LOCAL.

## Объём и проверка исходников

Проверена интеграционная ветка `codex/m1-completion-20261115`, HEAD
`f708c958121ac301a5805d23719a30bb48392825`. Checkout содержит обширные
staged/unstaged и untracked изменения. Это исследование использует текущие
исходники, но не утверждает, что локальные правки проверены или приняты.
Игровые, SQL и browser проверки — NOT_RUN; производительность — NOT_MEASURED.

Источники фактических границ: `packages/game-core/src/combat/{types,setup-v2,
setup-v3,runtime-v3,replay,rules}.ts`, `packages/protocol/src/{combat-lab,
playground}.ts`, `apps/server/src/playground/{routes,scenario,combat,store}.ts`,
`apps/server/src/combat-lab/multiside-battle.ts` и `apps/web/src/playground/`.
Рабочий игровой путь и отдельные контракты остаются у владельцев из [плана](plan.md).

## Решения

| Вопрос | Решение | Основание | Рассмотренный вариант |
| --- | --- | --- | --- |
| Многосоставный setup | Использовать `BattleSetupV3` / replay schema 3 и `m1-domain-bridge-v6` | `setup-v3.ts` задаёт 2–3 стороны, до 12 на сторону, до 36 всего; V3 сохраняет party ID и capabilities | Расширять setup/replay 1/2 или копировать отдельный движок |
| Runtime state | Оставить `BattleState.schemaVersion = 1`; сохраняемая сторона содержит 2+ side rows и необязательные parties | `types.ts` задаёт runtime state schema 1; `runtime-v3.ts` запускает setup schema 3 через общий state/command model | Называть runtime schema новой версией setup/replay |
| Формат редактора | Использовать `CombatLabBattleConfigV2` (`version: 2`) | Protocol DTO содержит `sides`, `parties`, party-aware `units`; старый config v1 остаётся отдельным reader | Переиспользовать старый бинарный config v1 |
| Обычный вход | Использовать защищённый persistent Playground `/dev/playground/combat` и `/dev/playground/api` | `playground/routes.ts` подтверждает session account, developer allowlist, origin и dev/test loopback; `store.ts` сохраняет sandbox в схеме `playground` с owner ID, revisions, receipts и TTL | Возвращать временный standalone combat-lab сессии |
| Команда боя | Отправлять `EncounterCommandDto` на `/dev/playground/api/combat/commands`, который вызывает существующий `executeEncounterCommand` с областью `playground` | `routes.ts` и `combat.ts`; обычная projection/read извлекается из sandbox-owned encounter | Второй combat executor и второй механизм квитанций |
| Доступ | Использовать существующую cookie-сессию и проверки владельца sandbox; не передавать отдельную session capability | Playground preValidation вызывает `resolveSessionAccount`; reads дополнительно фильтруются по owner ID | Исторический `x-combat-lab-capability` и `sessionStorage` из standalone lab |
| Старые версии | Оставить setup/replay schema 1/2, config 1, bridge-v5 и старый Playground content revision на их readers | Replay dispatcher и `scenario.ts` маршрутизируют по версии/revision | Переписывать старые сохранённые setup/replay |
| Результат боя | Переиспользовать сохранённый encounter terminal marker и существующий pending-effects recovery | Доменный executor и `encounters/effects.ts` владеют сохранением и возобновлением терминальных последствий | Вводить отдельную транзакцию-владельца или второй recovery loop |
| Обычная выплата | Использовать `apps/server/src/contracts/ordinary.ts`, существующие receipt key, транзакцию и payment writer | Владельцы проверяют полномочие до приватного receipt lookup и сохраняют точный ответ | Создавать общий новый receipt/payment сервис |
| Производительность | Снять baseline и повторить ту же нагрузку на принятом устройстве; принять по N10 | N10 задаёт метод, но число бюджета/фактический результат здесь не проверялись | Обещать FPS или вместимость из целевых характеристик VM |

## Версии и совместимость

- Setup/replay schema 1 и 2 остаются читаемыми своими функциями. Новый путь
  использует schema 3 и replay dispatch для `BattleSetupV3`.
- `BattleState.schemaVersion` остаётся 1. Новый setup содержит коллекции сторон
  и party ownership, но runtime state намеренно продолжает общий формат state 1.
- Старый battle config `version: 1` и новый `CombatLabBattleConfigV2.version: 2`
  различаются. Новая конфигурация хранит `sides`, `parties` и `units.partyId`.
- `PLAYGROUND_SCHEMA_REVISION` равна 2. Новый content revision
  `playground-v3:m1-domain-bridge-v6` выбирает config 2 и `m1-domain-bridge-v6`;
  прежний `playground-v2:m1-domain-bridge-v5` выбирает config 1/bridge-v5.
- `m1-domain-bridge-v6` — новая редакция правил. Более старые bridge rulesets
  и replay history сохраняют собственный dispatch; V6 не переименовывает их.

## Ограничения допуска и управления

`validateBattleSetupV3` проверяет 2–3 уникальные стороны, 2–36 фигур, уникальные
ID и позиции, до 12 бойцов на сторону, до 6 в player party, party/side consistency,
положения и capabilities. Серверный допуск кампании обязан дополнительно вывести
party membership и доступные unit IDs из доверенного владельца; поля DTO не являются
разрешением. Союзная сторона объединяет party membership, но не полномочия.

Playground — ограниченный developer sandbox, а не доказательство долгосрочных
последствий кампании. Его защищают session cookie, allowlist аккаунтов, origin
и владение строкой sandbox. Он хранится в изолированной PostgreSQL schema,
ограничен сроком жизни, и команды используют существующий encounter executor.
Standalone `/dev/combat-lab` route module и capability header остались в исходниках,
но `registerCombatLab` не зарегистрирован в `apps/server/src/app.ts`. Это не
доступный обычный вход и не часть выбранного нового среза.

## Входы исполнения

T001/T003 подтверждают интеграционную базу, права на ресурсы и writer ownership;
T002 подтверждает сохранённую компанию до кампанийного сценария. Реальный
SQL-переход, exact retry и recovery проверяются в задачах их владельцев.
T028 использует N10 для baseline, бюджета и повторного измерения. T033/T034
подтверждают источник средств B4 при выплате 40 крон. Состояние исходного
архива остаётся зафиксированным в `RC-GAP-MACHINE-01`.

[План](plan.md) · [Модель](data-model.md) · [Контракты](contracts/README.md) · [Проверка](quickstart.md)
