# Art bible — Warwrit

## Review status

2026-11-13 — владелец подтвердил «Сдержанный графический роман» и уточнение
эталонов карты, боя, поселений и сцен в этом направлении.
[Принятый ответ](../docs/engineering/roadmap/design-review.md#решения-владельца--2026-11-13).

## Direction

«Сдержанный графический роман» is the selected main 2D direction.
«Туман и мокрый камень» applies to explicitly chosen locations.
[Owner decision](../docs/wiki/vision.md#графика-и-тексты).

## Palette and lighting

Muted slate, soot, umber and ochre, restrained rust accents, broad matte washes
and strong grouped shadows. Lighting, facing, ground axes and pivots follow the
consuming view's contract. Numerical palette sampling is pending and introduces
no new colour approval.

## Form and materials

Adult practical proportions, weathered stone/timber and credible equipment.
The ruined old watermill retains its broken wheel and structural damage.
Existing place briefs own geography, condition and knowledge.

## Camera and composition

M1 uses static full-body sprites in Babylon 2.5D. Combat uses the owner's
orthographic «ровные ряды» view. The camera-elevation and 3D-kit probes retain
their own experimental scope and pending integrated acceptance.

## Signature techniques

- Irregular focal ink contours and calm peripheral edges.
- Broad flat/matte wash shapes with grouped shadows.
- Selective detail and focal contrast around figures, paths and entrances.

## UI

Reuse the existing command desk, resource feedback and credited Game Icons
subset. Check labels, costs, disabled reasons and controls at actual desktop size.

## Restrictions

Follow [art/lore rules](../.agents/skills/warwrit-graphics/references/art-direction.md)
for materials, lore, projection, transparent cutouts and reference use.

## References

### Копирование с переработкой — решение владельца 2026-11-14

Визуальные концепты, композиции, персонажи, костюмы, окружение и интерфейсы
других игр можно использовать как референсы и основу для переработки.
Копирование с изменениями под мир, стиль, масштаб и игровой контекст Warwrit
разрешено. Перенос готового материала as-is, без изменений, запрещён.

В записи ассета указываются исходный референс и внесённые изменения.
Результат проверяется в потребляющей сцене по читаемости, принятому стилю
и соответствию миру. Визуальное ревью учитывает замысел переработки.

### Эталоны представлений — уточнение 2026-11-13

| Представление           | Существующие образцы основного профиля | Что уточнять и проверять в потребляющем виде                                                                                                                                                     |
| ----------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Глобальный атлас        | field, forest, town, village           | Крупные спокойные формы местности, читаемые пути и подписи. Различимы неизвестное, изученное и видимое сейчас. У старого маркера есть дата                                                       |
| Бой                     | character, mill                        | Цельная фигура и оружие читаются на фактическом масштабе. Фон сохраняет спокойные массы, уступы высоты и клетки согласованы с камерой. Проверяется состав до 36 фигур и различимость трёх сторон |
| Поселение               | town, village, mill                    | Читаются входы и предмет взаимодействия. Материалы и состояние места совпадают с его источником. Мельница сохраняет разрушения                                                                   |
| Портрет                 | character                              | Натуральные взрослые пропорции, ясное лицо и выборочный контур. Личность и снаряжение берутся из источника конкретного персонажа                                                                 |
| Повествовательная сцена | mill, town, village, field             | Ясный сюжетный центр и спокойное место для текста. Детали поддерживают доступные игроку факты и географию сцены                                                                                  |

Имена образцов соответствуют `references[].subject` основного JSON-профиля.
Профиль тумана применяется по отдельному выбору места. Решение владельца
2026-11-13 (#17): в M1 это Тихая Гать и Старая мельница; город, Березняк
и Северный Двор остаются в основном стиле. Первый интегрированный эталон — бой у мельницы днём и ночью с HUD.
Движок и интерфейс проверяются на составе до 12×12×12, по шесть бойцов
в одном отряде игрока.
Для каждого представления следующий образец сопоставляется с эталоном в
реальном кадре и масштабе. Интегрированные результаты и согласование раскладки
фиксируются в его собственной задаче.

Камера боя следует утверждённому эталону `frontal`, 35° и yaw 0° в исходной
пробе от 30 октября. Перенос требует согласованных осей поля и рисунка.
Новый художественный образец использует этот потребляющий вид.
[Владелец камеры](https://github.com/Vovanostm/warwrit/blob/ba1272da64f57ef72196d5b16bf6e9c2e83b08b7/docs/wiki/battlefield-test-maps.md#камера-сетка-и-высоты--решение-владельца-2026-10-30).

[Main profile](../assets/art/styles/graphic-novel.json) links seven selected
images. [Location profile](../assets/art/styles/fog-wet-stone.json) links six.
These are generated direction references. Each production asset needs its
actual alpha, pivot, scale and day/night readability checked in its scene.
