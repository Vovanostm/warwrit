# Contracts — публичные границы завершения M1

Фактические форматы принадлежат публичным `@warwrit/protocol` DTO и их
серверным адаптерам. Ниже отделены действующие маршруты от критериев будущей
кампанийной приёмки. Текущая реализация не считается пройденным тестом.

## Защищённый Playground и бой

Обычная точка входа браузера — `/dev/playground/combat`. Она использует
`/dev/playground/api` и существующий dev proxy `/api`. Серверный путь доступен
только в `development`/`test` на loopback, с разрешённым origin и аккаунтом из
developer allowlist. `resolveSessionAccount` получает аккаунт по существующей
session cookie. Для чтения и изменения sandbox сервер также проверяет `owner_id`.
Combat Lab capability header и ephemeral sessionStorage не являются авторизацией
этого пути. Playground — persistent PostgreSQL sandbox с ограниченным сроком
жизни и receipts; он изолирован от мира кампании.

| Метод и путь | Тело / ответ | Назначение и доступ |
| --- | --- | --- |
| `GET /dev/playground/api` | `PlaygroundBootstrap`: аккаунт, template, catalog, сценарии и принадлежащие аккаунту sandboxes | Авторизованный bootstrap редактора |
| `GET /dev/playground/api/:id` | `PlaygroundInspection` | Прочитать только принадлежащий аккаунту sandbox, encounter projection и audit |
| `GET /dev/playground/api/:id/replay` | Replay report и replay payload | Воспроизведение доступного активного sandbox encounter |
| `POST /dev/playground/api/preflight` | `PlaygroundScenario`; ответ `{ valid, errors }` | Проверить scenario без активации |
| `POST /dev/playground/api/commands` | `PlaygroundCommand`: `commandId`, `issuedAt`, `operation`; для не-create также `sandboxId`, `expectedRevision`; configure передаёт `scenario` | Lifecycle `create/configure/validate/activate/clone/reset/delete`; точный повтор возвращает сохранённый receipt |
| `POST /dev/playground/api/combat/commands` | `EncounterCommandDto` | Команда проходит существующий `executeEncounterCommand` с источником `playground`; ответ/receipt проверяются по owner sandbox |

Все маршруты защищены общей проверкой cookie account, developer allowlist,
origin и окружения. Client command ID/revision ссылаются на данные, но не дают
полномочий. Sandbox command receipts сравнивают canonical JSON запроса; устаревшая
revision и изменённый повтор дают отказ. Внутри combat маршрута отдельно
проверяются участник, активная активация, полномочие и encounter revision.

## Формат многосоставного боя

Новый авторский конфиг — `CombatLabBattleConfigV2`, `version: 2`, поля
`name`, `seed`, `map`, `sides`, `parties`, `units`. У `sides` есть стабильный
`id` и `retreatHexes`; `parties` содержит `id`, `sideId`, `kind` (`player` или
`npc`) и необязательный `controllerId`; unit связывает `id`, `profileId`,
`sideId`, `partyId`, `position` и необязательные навыки. Экспорт battle config
не содержит session cookie или авторизационный токен. Карта сохраняет прежний
отдельный формат `version: 1`, `name`, `tiles`.

`PlaygroundScenario` имеет `schemaRevision: 2`; его новый content revision —
`playground-v3:m1-domain-bridge-v6`, `rulesetId: m1-domain-bridge-v6`,
`mapRef: inline`, `controls.mode: manual`, `initial` config 2,
`resources` и `equipment`. Новый combat setup/replay — schema 3,
`m1-domain-bridge-v6`; `BattleState.schemaVersion` остаётся 1. Старые setup/
replay schema 1/2, config 1 и Playground content revision с bridge-v5
маршрутизируются к своим readers/rulesets и не переписываются.

V3 admission требует 2–3 стороны, 2–36 участников, не более 12 бойцов на
сторону и 6 в одной player party; IDs, принадлежности, позиции, зоны отхода,
profiles и capabilities валидируются до создания/активации. Полный
export/import/save/reload сохраняет каждую сторону, party grouping, retreat
areas, unit IDs и позиции. Кампанийный admission дополнительно подтверждает
реальное membership и выводит контролируемые unit IDs на сервере.

Союзные party могут иметь общую сторону, но это не передаёт управление чужой
компании. Проекция, initiative order, targeting, previews и итог сохраняют все
side IDs. В трёхстороннем бою устранение одной стороны оставляет две оставшиеся
в бою; окончательное разрешение использует текущую детерминированную combat
policy. Эти пункты — контракт приёмки, а не утверждение о пройденной проверке.

## Кампанийный результат и обычные выплаты

Кампанийный путь проходит через существующие encounter admission/executor и
их terminal effects. Сохранение terminal marker и применение pending effects
остаются отдельными проверяемыми переходами; сбой между ними должен оставить
восстанавливаемую работу с однократным применением последствий.
Освобождение компаний, имущество, proof и результат следуют действующим
политикам `M1-CAMPAIGN-BATTLE.md` и First Hunt. Sandbox Playground не заменяет
этот путь и не считается долговременной кампанийной приёмкой.

Обычный контракт использует `apps/server/src/contracts/ordinary.ts` через
существующие session, owner/lock проверки, canonical request key, receipt и
транзакцию выплаты. Точный повтор возвращает исходный ответ; изменённое тело
с тем же ID и команда чужого владельца отклоняются без раскрытия чужой
квитанции. Не вводить второй owner финансов или общий новый receipt сервис.

## Остальные границы

| Путь игрока | Владелец | Ожидаемая гарантия |
| --- | --- | --- |
| Подготовка, курс, прозвище, продажа | `packages/protocol/src/company.ts`, server company, N03/N04/N06 | Поставщик, средства, состояние и полномочия проверены; обязательные эффекты сохранены |
| Маршрут, остановка, атлас, место | `packages/protocol/src/world.ts`, server world, N07 | Положение и время соответствуют версии маршрута; сведения принадлежат наблюдателю |
| Квесты, моральные развилки, offline report | M1-QUESTS, B4, M1-OFFLINE-REPORT | Личные сведения не смешиваются; общий исход и потребитель последствия подтверждены |
| Готовность и восстановление | N11/N12 и действующий health API | Готовность отражает обязательные зависимости; восстановленная копия проходит обычный вход |

## Матрица проверки границы

MULTI-1–MULTI-8 покрывают новый состав, сохранность версий, права, результат и
читаемость. Проверять настройки/команды через Playground editor → sandbox
activation → обычную combat view → command receipts → replay. Кампанийные
последствия принимаются отдельно через обычный admission, сохранение и
recovery. N11/R1–R4 покрывают сбои, терминальное применение, выплаты,
конкуренцию, exact retry и private readback; R5 подтверждает восстановление на
отдельном ресурсе. Все команды, предпосылки и текущий статус перечислены в
[quickstart](../quickstart.md).
