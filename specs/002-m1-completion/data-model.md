# Data Model — Завершение M1

Это карта существующих сущностей и целевого расширения боя.
Точные поля принадлежат доменным типам и публичным DTO.

## Существующее состояние

| Сущность                 | Поля и связи                                                            | Валидация и переход                                                                                 | Владелец                                                                  |
| ------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Аккаунт и компания       | account/world/company ID, membership, revision                          | Подтверждённая сессия и актуальное владение определяют доступ                                       | `apps/server/src/auth/session.ts`, `company/`, N01/N02                    |
| MaterializedCompanyState | lifecycle, finance, physical                                            | Канонические части сохраняются согласованно через существующий executor                             | `packages/game-core/src/company/physical-root-types.ts`                   |
| Человек                  | Членство, положение, presence/duty/ability, здоровье, навыки            | Действие проверяет нужную возможность, недееспособность пропускает активации                        | `packages/game-core/src/company/lifecycle-types.ts`, `physical-types.ts`  |
| Предмет                  | ID, источник, владелец, опека, место, состояние и класс                 | Единственное владение, передача/расход/продажа только по допустимому эффекту                        | `packages/game-core/src/company/physical-types.ts`                        |
| Финансы                  | wallets, claims, obligations, reservations, movements, applied          | Точные суммы, существующий источник средств, однократный расчёт                                     | `packages/game-core/src/company/economy-types.ts`, `physical-payments.ts` |
| Курс и прозвище          | Каталог, поставщик, условия, прогресс, навык, поступок, согласие        | Start → progress → stop/finish/accepted interruption, переобучение заменяет навык при завершении    | N06 и `packages/game-core/src/company/`                                   |
| Путь                     | Region/route version, положение, сегменты, сроки, revision              | STOP/новый путь учитывают прошедший сегмент, новая скорость действует вперёд                        | `packages/protocol/src/world.ts`, `apps/server/src/world/`, N07           |
| Наблюдение               | Наблюдатель, источник, время, содержание и давность                     | Приватность проекции, три состояния атласа и дата старого маркера                                   | `apps/server/src/world/surroundings.ts`, N07                              |
| Принятый контракт        | ID/version, issuer, terms, objective, participation, proof и settlement | Принятые условия обычного контракта фиксированы, доказательство/владение проверяются перед расчётом | `apps/server/src/contracts/`, M1-CONTRACT-TERMS                           |
| Квитанция                | world/company/command ID, request key, исходный ответ                   | Сначала полномочие, затем private lookup. Точный повтор возвращает ответ, конфликт тела отклоняется | ordinary.ts, company executor и существующие receipt tables               |
| Сюжет B4                 | Definition version, личные находки компаний, общий исход, плательщик    | Общий исход записывается один раз, доказанная награда — 40 крон из проверенного кошелька            | M1-STORY-MISSIONS, T033/T034                                              |
| Playground sandbox       | owner account, scenario/content revision, status, revision, expiry      | Только development/test loopback; владелец видит и меняет свой sandbox; lifecycle commands дают receipts | `apps/server/src/playground/{routes,store}.ts`, `packages/protocol/src/playground.ts` |
| Sandbox encounter        | setup/state schema, commands, events, receipts, rejections               | Запись живёт в schema `playground`, команды идут через существующий encounter executor              | `apps/server/src/playground/combat.ts`, `apps/server/src/encounters/executor.ts` |

Finance learningObligations/learningEffects имеют существующую optional-форму
для старого сохранённого состояния. Прочтение прежней редакции использует
её действующие правила и точную сериализацию.

## Целевая модель многосоставного боя

| Сущность         | Поля / связи                                                                  | Инвариант                                                                      |
| ---------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Setup schema 3   | `schemaVersion`, bridge-v6, seed, map, `sides`, `parties`, `units`        | `BattleSetupV3`: 2–3 стороны; до 12 бойцов на стороне и 36 всего              |
| Сторона          | Стабильный side ID, метаданные, зоны отхода, ссылки участников                | Уникальный ID, до 12 участников, допустимые зоны и начальные участники         |
| Отряд            | Ссылка на реальный источник членства, side ID, fighter IDs                    | Игрок выводит до 6 бойцов. Сумма допущенных отрядов стороны до 12              |
| Боец             | Уникальный unit ID, side ID, принадлежность отряду, позиция, состояние        | Один участник и одна сторона, законная свободная позиция, состояние по профилю |
| Право управления | Сессия/компания и вычисленные сервером unit IDs                               | Союз на одной стороне сохраняет отдельное право каждой компании                |
| Battle state     | `schemaVersion: 1`, все стороны, parties, units, очередь, RNG, revision и outcome | Runtime state schema остаётся 1; устранённая сторона сохраняет ID и историю |
| Replay schema 3  | Новый setup и упорядоченные принятые команды                                  | Одинаковые setup/seed/команды дают одинаковый результат                        |
| Battle config 2  | `version`, `name`, `seed`, `map`, `sides`, `parties`, `units`                 | Round trip сохраняет стороны, retreat areas, party/unit ownership              |
| Playground scenario revision 2 | content revision, inline config, manual controls, resources/equipment | `playground-v3:m1-domain-bridge-v6` выбирает config 2 и bridge-v6 |

Ограничение шести относится к отряду игрока. Состав NPC задаётся доверенным
профилем встречи в пределах вместимости стороны. Членство и полномочия
кампании выводятся из сохранённой компании. Экспорт battle config содержит
редактируемый состав и не содержит сессионной авторизации. Playground
аутентифицирует account через существующую cookie session, developer allowlist,
origin guard и owner-scoped sandbox rows. Текущая команда sandbox боя идёт
через `POST /dev/playground/api/combat/commands`; отдельного capability header
или capability в sessionStorage у этого пути нет.

## Версии и совместимость

| Граница                       | Наблюдаемая редакция                | Целевая редакция                                             |
| ----------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| Setup и replay                | Schema 1/2, прежние rulesets        | Schema 3, bridge-v6, коллекция 2–3 сторон; readers 1/2 сохраняются |
| Runtime battle state          | Schema 1                             | Schema 1 с 2+ sides и party attribution                       |
| Battle config                 | Version 1, human/opponent           | Version 2, `sides`/`parties`/party-aware `units`               |
| Playground scenario           | Schema revision 2; legacy content v2/bridge-v5 | content revision v3/bridge-v6 и config 2            |
| Экспорт карты                 | Version 1, `name`/`tiles`           | Существующий формат карты 1                                   |
| Компания и финансы            | Существующие schema/policy versions | Изменение только при потребности конкретного доменного среза |

Выпущенные readers и ruleset dispatch сохраняют свой путь.
Schema 3 запускается через V3 validator/runtime и общий state/command reducer.
Playground сохраняет sandbox/encounter данные в своей существующей PostgreSQL
schema с owner ID, revision и receipt границами. Не следует добавлять второй
transient session store или отдельный combat executor. Любое необходимое изменение
payload/storage подтверждается текущим владельцем таблиц; выпущенные миграции
не редактируются.

## Переходы и транзакционные границы

1. **Редактор.** Черновик → проверенный setup → активный бой. Ошибка допуска
   сохраняет черновик и возвращает причину, канонический частичный бой не создаётся.
2. **Стороны.** Active → eliminated сохраняет состав и историю. Пока действуют
   две стороны, бой продолжается. Финальный исход вычисляет существующая политика.
3. **Последствия.** Сохранённый терминальный исход → pending effects → применённые
   последствия. Существующий encounters/effects.ts атомарно фиксирует изменения
   компаний, доказательства, освобождение и подтверждение обработки.
   Сбой между этапами сохраняет исход и ожидание обработки. После перезапуска
   существующий переход возобновляет обработку с однократным применением
   последствий. Предусмотренное
   ожидание выбора лидерства следует своему переходу. Освобождение компаний
   фиксируется вместе с применёнными последствиями по правилам исхода.
4. **Выплата.** Право и блокировки → проверка исходной квитанции → подготовка
   и проверка средств → контракт/кошельки/компания/квитанции → commit.
   Точный повтор после дальнейших изменений возвращает исходный ответ.
5. **Восстановление.** Реальная согласованная копия → отдельный изолированный
   ресурс → обычный вход → следующее законное действие. Источник и его игроки
   сохраняют собственный ресурс.

[Публичные границы](contracts/README.md) · [Проверка](quickstart.md)
