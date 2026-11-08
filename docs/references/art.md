---
title: Изображения-референсы — список, стиль, перегенерация
created: 2026-11-09
type: reference
status: review-draft
authority: стиль — assets/art/styles/graphic-novel.json (решение владельца 2026-10-25); изображения — не канон и не игровые ассеты
---

# Изображения-референсы

60 изображений сгенерированы 2026-11-09 (34 в первой партии, 26 во второй) встроенным `image_gen` Codex
(`codex exec`, по одному вызову на изображение) по точным промптам из
[manifest.json](images/manifest.json). Каждому вызову приложены три
эталона стиля «Сдержанный графический роман»: персонаж, город, мельница из
[assets/art/styles/references/graphic-novel](../../assets/art/styles/references/graphic-novel/).

Хранятся как JPEG (качество 82) ради размера репозитория; исходные PNG не
сохранены. Это **референсы для обсуждения**: не игровые ассеты, не эталон
спрайтов, не утверждённые места, люди или раскладка экранов.

## Список

| Файл                                                                 | Что                                      | Где обсуждается                                                    |
| -------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------ |
| [ui-01-world-map](images/ui/ui-01-world-map.jpg)                     | Карта мира: банды, армия, карточка места | [ui](ui.md), [world](world.md)                                     |
| [ui-02-settlement](images/ui/ui-02-settlement.jpg)                   | Поселение и положения                    | [ui](ui.md), [world](world.md)                                     |
| [ui-03-contract-offer](images/ui/ui-03-contract-offer.jpg)           | Предложение контракта                    | [ui](ui.md), [text](text.md)                                       |
| [ui-04-company-roster](images/ui/ui-04-company-roster.jpg)           | Состав компании                          | [ui](ui.md)                                                        |
| [ui-05-mercenary-sheet](images/ui/ui-05-mercenary-sheet.jpg)         | Лист наёмника                            | [ui](ui.md)                                                        |
| [ui-06-combat-preview](images/ui/ui-06-combat-preview.jpg)           | Предпросмотр удара, зона контроля        | [combat](combat.md)                                                |
| [ui-07-creature-intent](images/ui/ui-07-creature-intent.jpg)         | Намерение твари                          | [combat](combat.md)                                                |
| [ui-08-morale-break](images/ui/ui-08-morale-break.jpg)               | Слом морали                              | [combat](combat.md)                                                |
| [ui-09-after-battle](images/ui/ui-09-after-battle.jpg)               | Итог боя                                 | [combat](combat.md)                                                |
| [ui-10-story-scene](images/ui/ui-10-story-scene.jpg)                 | Сцена-новелла с выбором                  | [ui](ui.md), [text](text.md)                                       |
| [ui-11-chronicle](images/ui/ui-11-chronicle.jpg)                     | Летопись                                 | [world](world.md)                                                  |
| [ui-12-camp](images/ui/ui-12-camp.jpg)                               | Привал                                   | [ui](ui.md), [company](company.md)                                 |
| [ui-13-market-trade](images/ui/ui-13-market-trade.jpg)               | Рынок                                    | [ui](ui.md)                                                        |
| [ui-14-investigation](images/ui/ui-14-investigation.jpg)             | Расследование                            | [ui](ui.md), [quest-patterns](quest-patterns.md)                   |
| [ui-15-recruits](images/ui/ui-15-recruits.jpg)                       | Вербовщик                                | [ui](ui.md), [company](company.md)                                 |
| [ui-16-wounds-care](images/ui/ui-16-wounds-care.jpg)                 | Лекарь                                   | [ui](ui.md), [company](company.md)                                 |
| [q-01-mill-night](images/quests/q-01-mill-night.jpg)                 | Заказ со вторым поворотом                | [quest-patterns §1](quest-patterns.md#1-заказ-со-вторым-поворотом) |
| [q-02-deserters](images/quests/q-02-deserters.jpg)                   | Дезертиры                                | [quest-patterns §2](quest-patterns.md#2-охота-на-дезертиров)       |
| [q-03-missing-path](images/quests/q-03-missing-path.jpg)             | Пропавший                                | [quest-patterns §3](quest-patterns.md#3-пропавший)                 |
| [q-04-supply-train](images/quests/q-04-supply-train.jpg)             | Обоз                                     | [quest-patterns §4](quest-patterns.md#4-обоз)                      |
| [q-05-battlefield-after](images/quests/q-05-battlefield-after.jpg)   | Поле после битвы                         | [quest-patterns §5](quest-patterns.md#5-поле-после-битвы)          |
| [q-06-two-taxes](images/quests/q-06-two-taxes.jpg)                   | Два сбора                                | [quest-patterns §6](quest-patterns.md#6-два-сбора)                 |
| [q-07-quartered-regiment](images/quests/q-07-quartered-regiment.jpg) | Полк на постое                           | [quest-patterns §7](quest-patterns.md#7-полк-на-постое)            |
| [q-08-marsh-lair](images/quests/q-08-marsh-lair.jpg)                 | Логово у непогребённых                   | [quest-patterns §8](quest-patterns.md#8-логово-у-непогребённых)    |
| [q-09-hearing](images/quests/q-09-hearing.jpg)                       | Слушание                                 | [quest-patterns §9](quest-patterns.md#9-слушание)                  |
| [c-01-veteran-spearman](images/characters/c-01-veteran-spearman.jpg) | Старый копейщик                          | [company](company.md)                                              |
| [c-02-crossbow-woman](images/characters/c-02-crossbow-woman.jpg)     | Арбалетчица                              | [company](company.md)                                              |
| [c-03-young-recruit](images/characters/c-03-young-recruit.jpg)       | Новобранец                               | [company](company.md)                                              |
| [c-04-barber-surgeon](images/characters/c-04-barber-surgeon.jpg)     | Цирюльник-лекарь                         | [company](company.md)                                              |
| [c-05-quartermaster](images/characters/c-05-quartermaster.jpg)       | Обозная                                  | [company](company.md)                                              |
| [c-06-patron-merchant](images/characters/c-06-patron-merchant.jpg)   | Купец-заказчик                           | [company](company.md)                                              |
| [w-01-region-map](images/world/w-01-region-map.jpg)                  | Карта-предмет региона                    | [world](world.md)                                                  |
| [w-02-front-line](images/world/w-02-front-line.jpg)                  | Лагерь армии за рекой                    | [world](world.md)                                                  |
| [w-03-wolves-snow](images/world/w-03-wolves-snow.jpg)                | Волки у деревни                          | [world](world.md)                                                  |

## Вторая партия — карта, города, таверны, выборы

Список и разбор — [places-and-map.md](places-and-map.md) и
[moral-choices.md](moral-choices.md). Для m-01…m-03 базой служил уменьшенный
атлас v6, для m-04…m-06 — его вырезка вокруг Каменного Брода, для tw-01…tw-05 —
утверждённая картина Каменного Брода `assets/art/m1/places/settlements-v2/kamenny-brod-painting.png`
как образец. Поле `inputs` в манифесте называет базу.

## Известные ограничения

- Надписи на макетах генерирует модель: возможны опечатки (на ui-06 «ОИ»
  вместо «ОД»). Для решений смотреть на раскладку, не на текст.
- Модель добавила не запрошенное: вкладки регионов «Север / Речье /
  Пограничье / Низины» на ui-11 — заглушки, не названия мира; кнопки и
  вкладки на ui-06, ui-07, ui-16; конверт с печатью у купца c-06 выглядит
  поздно для эпохи; крыша мельницы на q-01 соломенная, а не гонтовая.
- Все 34 изображения просмотрены автором после генерации 2026-11-09;
  явных нарушений стиля, лишней геральдики или магии не найдено.
- Раскладка макетов не проверена на реальном клиенте; размеры кнопок,
  читаемость на 1280×720 и ландшафтном телефоне — NOT_RUN.
- Независимая визуальная критика по [VISUAL_CRITIQUE](../engineering/VISUAL_CRITIQUE.md) — NOT_RUN.

## Перегенерировать

Промпт каждого изображения — поле `prompt` в манифесте. Запуск из Claude Code
по [GAMEDEV_SKILLS](../engineering/GAMEDEV_SKILLS.md): задание передаётся
через stdin, эталоны стиля — флагами `-i`:

```bash
printf '%s' "<задание: id из манифеста, image_gen, скопировать в file>" | codex exec -s workspace-write -C . -i assets/art/styles/references/graphic-novel/character.png -i assets/art/styles/references/graphic-novel/town.png -i assets/art/styles/references/graphic-novel/mill.png -- -
```

После генерации — перевести PNG в JPEG и поменять расширение в ссылках.
