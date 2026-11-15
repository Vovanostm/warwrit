# Quickstart — проверка завершения M1

Это инструкция для будущего выполнения, не отчёт о пройденных проверках.
Игровые, browser и SQL сценарии при подготовке этого плана — NOT_RUN;
производительность — NOT_MEASURED. Форматы и границы описаны в
[контрактах](contracts/README.md) и [модели данных](data-model.md).

## 1. Выбор базы и аккаунта

Перед запуском T001 подтверждает интеграционную базу и доступ к ней, T003 —
write set и владение ресурсами. T002 подтверждает аккаунт и сохранённую компанию
для кампанийной части. Для локального Playground требуется development/test
loopback, уже вошедший аккаунт из developer allowlist и совпадающий origin.
Sandbox использует собственную PostgreSQL schema и не выдаёт доступ к миру
кампании. Не переключайте существующую локальную базу или аккаунт без записи
владельца T001/T002.

Инструментарий проверяется из корня выбранного checkout:

```bash
cd /Users/vovanostm/learn/warwrit
node --version
pnpm --version
```

## 2. Обычный вход в Playground

Сначала использовать подготовленную разработческую базу и существующий локальный
вход. Команды ниже управляют только локальной конфигурацией:

```bash
pnpm db:up
pnpm db:migrate:up
pnpm dev
```

Открыть `/dev/playground/combat` на URL, который запустил Vite, и войти под
разрешённым developer аккаунтом. Браузер использует обычную cookie-сессию;
server дополнительно проверяет environment, loopback host, origin, allowlist
и владельца sandbox. Создать sandbox, изменить сценарий, выполнить preflight,
валидировать и активировать бой. Продолжить через обычный combat view; получить
последнюю projection, отправить допустимую команду и прочитать replay report.
Путь API: `GET /dev/playground/api`, `POST /dev/playground/api/preflight`,
`POST /dev/playground/api/commands`, `GET /dev/playground/api/:id`,
`POST /dev/playground/api/combat/commands` и
`GET /dev/playground/api/:id/replay`. Запросы выполняются из same-origin UI
с учётными credentials; в документацию/конфиг не копировать session cookie.

После активации проверить config 2 round trip через редактор и owner-scoped
sandbox save/reload. Конфиг боя имеет `version: 2`; export включает name, seed,
map, sides, parties и units. Экспорт карты остаётся `version: 1` с name/tiles.
Сверить side IDs, retreatHexes, party IDs/kinds, unit IDs, позиции и принадлежность.

## 3. Адресные проверки кода

Адресные regression команды для schema 3/replay, боевой логики и адаптеров:

```bash
pnpm --filter @warwrit/game-core build
pnpm --filter @warwrit/protocol build
pnpm exec vitest run packages/game-core/src/combat/setup-v3.test.ts
pnpm exec vitest run packages/game-core/src/combat/setup-v2.test.ts packages/game-core/src/combat/runtime-v2.test.ts packages/game-core/src/combat/fixtures.test.ts
pnpm exec vitest run packages/game-core/src/combat/tactical-ai.test.ts packages/game-core/src/combat/sprite-s4.test.ts packages/game-core/src/combat/autobattle.test.ts
pnpm exec vitest run apps/server/src/combat-lab/multiside-battle.test.ts
pnpm exec vitest run apps/web/src/playground/SandboxSetup.test.tsx apps/web/src/playground/SandboxCombat.test.tsx apps/web/src/combat-lab/BattleView.test.tsx
```

`setup-v3.test.ts` покрывает setup, runtime и replay schema 3. Playground
integration test `apps/server/src/playground/routes.integration.test.ts`
подключается только при заданном `DATABASE_URL`; использовать выделенную
одноразовую локальную integration database и миграции, не ресурс обычного мира:

```bash
pnpm exec vitest run apps/server/src/playground/routes.integration.test.ts
```

Интеграционный сценарий проверяет отсутствие/неразрешённую session, allowlist,
foreign origin, чужого владельца sandbox, exact retry, revise конфликт,
activation, команды/receipt, reload и replay. Эти адресные команды не заменяют
browser journey и кампанийную приёмку. Статусы SKIP/не заданный DB URL записывать
как NOT_RUN. Выполнять проверки последовательно.

## 4. Двух- и трёхсторонний бой

Через обычный Playground editor создать конфигурации с двумя и тремя сторонами,
включая распределение 12 + 12 + 12. Использовать свои стороны/отряды и
допущенные profiles. Проверить:

| Шаг | Действие | Ожидаемое наблюдение |
| --- | --- | --- |
| 1 | Сохранить, перечитать, экспортировать и импортировать config 2 | Все side IDs, retreat areas, parties, units, позиции и управление восстановлены |
| 2 | Проверить 7 бойцов одной player party, 13 на стороне, 37 фигур, 4 стороны, дубликаты и пересечения | Preflight/admission отказывает с понятным полем/причиной; активный бой не создаётся частично |
| 3 | Выбрать цель каждой враждебной стороны, действовать и осмотреть preview | AI, инициатива, атаки, реакции и доступная проекция учитывают все hostile side IDs |
| 4 | Попытаться управлять бойцом чужой party в союзной стороне | Команда отклонена; состояние и право владельца не меняются |
| 5 | Вывести одну сторону из боя | Оставшиеся две продолжают; история и side ID выбывшей стороны сохранены |
| 6 | Завершить бой, перезагрузить sandbox и получить replay report | Тот же terminal result, события и каноническое состояние воспроизводятся |

Эти шаги являются планом, не фактическим PASS. Приёмка должна отдельно покрыть
atomic refusal, сохранённые последствия и одинаковый replay setup/seed/commands.
Старые setup/replay schema 1/2 и rulesets проверяются своими тестами и не
пересериализуются новым форматом.

## 5. Кампанийный путь

Playground не проверяет кампанийный исход. После прохождения T002 и допуска
T008/T010 провести отдельную обычную кампанию через физическое прибытие,
согласие и доверенное membership. Игрок командует только своими бойцами.
Проверить сохранение участников, потерь, имущества, proof, terminal result,
ожидающей обработки последствий, однократное применение, освобождение и
повторный вход после перезапуска. Провести обе ветви допустимого исхода,
повтор команды с исходным телом и команду с конфликтующим телом. Финансовый
путь предъявления, выплаты и трофея проверять у владельца ordinary contract.

## 6. Остальные истории M1

Для компании, услуг, обучения, прозвища, маршрута, сведений мира, посещения,
квестов и offline report использовать обычные входы и владельцев N02–N09.
На каждом пути проверять цену и причину отказа, сохранённое состояние,
полномочия/приватность и следующий допустимый шаг. Четыре моральные развилки
сравнить на независимых историях. B4 проводить только после T033/T034 подтверждения
реального источника 40 крон. Сохранение кампании и recovery проверять на
раздельных ресурсах по N11/N12; источник остаётся нетронутым.

## 7. Устройство, бюджет и сводка

На целевом MacBook/Chrome пройти полный маршрут карта → место → бой → исход →
повторный вход. Для 36 фигур записать устройство, build, viewport, DPR/zoom,
день/ночь, кадры/время кадра, загрузку и память. N10 владеет методом и
численным бюджетом; отсутствующие измерения отмечать NOT_MEASURED.

T036 сводит SC-001–SC-009 только на одной совместимой версии и с ответом
владельца. T037 записывает фактически проверенный путь и ограничения. Полный
M1, публикация, merge и размещение не следуют автоматически из локального
Playground результата и требуют своих критериев/разрешений.
