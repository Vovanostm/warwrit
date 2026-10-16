// UI concept study only: no battle API, canonical state or combat RNG.
const { unitArt, units, turnOrder } = window.WarwritCombatGalleryData;
const concepts = {
  a: [
    '01 / ПУЛЬТ · КЛАССИЧЕСКАЯ ТАКТИКА',
    'Пульт командира',
    'Три устойчивых острова снизу: боец, приказы, противник. Очередь сверху. Прогноз рядом с целью, ресурсы всегда на своих местах.',
    'Самый простой для освоения. Нижний центр занят действиями, подробности раскрываются в подсказках.',
  ],
  b: [
    '02 / ВОЗДУХ · ПОЛЕ НА ПЕРВОМ ПЛАНЕ',
    'Воздух и контуры',
    'Минимум рамок: портреты и ресурсы на мягкой подложке; круглые действия; тонкая лента инициативы. Всё внимание на фигурах и границе хода.',
    'Больше свободного поля. Подложки должны сохранять читаемость на любой земле.',
  ],
  c: [
    '03 / ЖУРНАЛ · РЕСУРСЫ И ТЕМП',
    'Полевой журнал',
    'Зеркальные таблицы ресурсов и два коротких ряда приказов: базовые действия отдельно от изученных приёмов. Инициатива сверху.',
    'Базовые команды и способности не смешиваются. Нижний центр плотнее, чем у остальных.',
  ],
  d: [
    '04 / ПРИКАЗЫ · ВЫБОР У БОЙЦА',
    'Боковые приказы',
    'Действия стоят вертикально над карточкой бойца. Справа — такая же карточка цели. Верхняя очередь остаётся отдельной, низ по центру свободен.',
    'Широкий свободный центр. До правой цели взгляд проходит дальше от левого набора действий.',
  ],
  e: [
    '05 / ПЕЧАТИ · СПОСОБНОСТИ В ЦЕНТРЕ',
    'Печати приказов',
    'Сверху общая очередь с границами раундов. Внизу — шестиугольные приказы и отдельный приподнятый ряд изученных приёмов.',
    'Способности заметнее и отделены от базовых действий. Центральная группа выше и занимает больше поля.',
  ],
};
const paths = {
  bow: 'M7 3q16 11 0 22M7 3v22M3 14h22m-5-4 5 4-5 4',
  aimed: 'M14 2v5m0 14v5M2 14h5m14 0h5M14 7a7 7 0 1 0 0 14 7 7 0 0 0 0-14M11 14h6m-3-3v6',
  rapid: 'M4 6h17m-4-3 4 3-4 3M7 14h17m-4-3 4 3-4 3M4 22h17m-4-3 4 3-4 3',
  spears: 'M6 26V3L3 7m3-4 3 4M14 26V3l-3 4m3-4 3 4M22 26V3l-3 4m3-4 3 4M3 18h22',
  move: 'M4 22h6V9h13m-4-4 5 4-5 4',
  defend: 'M14 3 5 7v8q1 7 9 10 8-3 9-10V7ZM14 6v15',
  end: 'M6 4v21M10 6l14 8-14 8',
  retreat: 'M9 4H5v20h4M24 14H11m5-5-5 5 5 5',
  grid: 'M6 4h8l4 7-4 7H6l-4-7ZM18 11h6l4 7-4 7h-8l-4-7',
  sun: 'M14 2v3m0 18v3M2 14h3m18 0h3M5 5l2 2m14 14 2 2M5 23l2-2M21 7l2-2M19 14a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  menu: 'M5 7h18M5 14h18M5 21h18',
  heart: 'M14 24 4 14Q-1 3 8 4q4 0 6 5 2-5 6-5 9-1 4 10Z',
  fatigue: 'M15 2 5 16h8l-1 10 11-15h-8Z',
  fear: 'M9 19q5-4 10 0M9 11h1m8 0h1M14 3C1 3 2 23 14 25 26 23 27 3 14 3Z',
  calm: 'M5 14l6 6L24 6',
  aggression: 'M5 24 23 6M17 4l7 1 1 7M5 15l9 9M4 24l4-4',
  lock: 'M8 12V8q0-9 12 0v4M5 12h18v13H5ZM14 17v4',
  fire: 'M14 2q4 7 2 10 6-1 6-7 11 20-8 21C1 25 2 15 8 10q0 7 4 6 4-3 2-14Z',
  poison: 'M10 3h8m-6 0v7L5 22q-1 3 3 3h12q4 0 3-3l-7-12V3M8 19h12',
  blood: 'M14 3 5 17q-3 9 9 9t9-9ZM9 21q0 3 4 3',
  prepare: 'M5 4h18M5 24h18M7 4q0 6 7 10-7 4-7 10m14-20q0 6-7 10 7 4 7 10',
  plus: 'M14 5v18M5 14h18',
  info: 'M14 12v9m0-15v2M14 2a12 12 0 1 0 0 24 12 12 0 0 0 0-24',
};
const icon = (id) =>
  `<svg viewBox="0 0 28 28" aria-hidden="true"><path d="${paths[id]}"></path></svg>`;
const actionsData = [
  [
    'bow',
    'Выстрел',
    '1',
    '4 ОД · 16 сил. ПКМ по выделенной цели. Показывает урон при попадании и шанс промаха.',
  ],
  [
    'move',
    'Движение',
    '2',
    'ПКМ по клетке. Наведение показывает путь, суммарную цену и остаток ОД.',
  ],
  ['defend', 'Защита', '3', '2 ОД · 8 сил. Завершает активацию.'],
  ['end', 'Завершить ход', 'Space', 'Отказ от оставшихся ОД. В макете — только демонстрация.'],
  [
    'retreat',
    'Отход с поля',
    '5',
    'Недоступно: боец не у края поля. Сначала доберитесь до выхода.',
  ],
];
const query = new URLSearchParams(location.search);
let view = Object.hasOwn(concepts, query.get('view')) ? query.get('view') : 'a';
let mode = query.get('mode') === 'move' ? 'move' : 'bow';
let night = query.get('night') === '1',
  showGrid = false;
let pinned = 'target',
  hovered = null;
const screen = document.querySelector('#screen');
function tooltip(label, body = '') {
  return `<span class="tip" role="tooltip"><strong>${label}</strong>${body ? `<span>${body}</span>` : ''}</span>`;
}
function face(u) {
  const style =
    u.art === 'B001'
      ? 'width:175%;left:-10%;top:-29px'
      : u.art === 'W04'
        ? 'width:260%;left:-65%;top:-22px'
        : u.art === 'B003'
          ? 'width:170%;left:-50%;top:-12px'
          : '';
  return `<img style="${style}" src="${unitArt[u.art].url}" alt="">`;
}
function status(id, name, explanation) {
  return `<button class="state tool ${id}" aria-label="${name}">${icon(id)}<span>${name}</span>${tooltip(name, explanation)}</button>`;
}
function resources(enemy) {
  return `<div class="resources">${resourceData(enemy).map(resourceRow).join('')}</div>`;
}
function resourceData(enemy) {
  return enemy
    ? [
        ['heart', 'Здоровье', '48 / 60', 80],
        ['defend', 'Броня', '52 / 80', 65],
        ['fatigue', 'Усталость', '24 / 80', 30],
      ]
    : [
        ['heart', 'Здоровье', '60 / 60', 100],
        ['defend', 'Броня', '35 / 35', 100],
        ['fatigue', 'Усталость', '16 / 80', 20],
      ];
}
function resourceRow([id, label, value, width]) {
  const [current, max] = value.split(' / ');
  return `<div class="resource" data-resource="${id}">${icon(id)}<span>${label}</span><b><strong>${current}</strong><small>/${max}</small></b><i><em style="width:${width}%"></em></i></div>`;
}
function card(enemy) {
  const u = units.find((u) => u.id === (enemy ? 'target' : 'archer'));
  return `<section class="character-card ${enemy ? 'target-card' : 'actor-card'}" aria-label="${cardLabel(enemy)}"><div class="card-header"><small>${cardHeading(enemy)}</small><span class="card-ap">${cardActionPoints(enemy)}</span></div><div class="card-main"><div class="portrait">${face(u)}</div><div class="card-data"><h2>${u.name}</h2>${resources(enemy)}</div></div><div class="states">${cardStates(enemy)}</div><div class="card-foot">${cardFoot(enemy)}</div></section>`;
}
function cardLabel(enemy) {
  return enemy ? 'Осматриваемая цель' : 'Действующий боец';
}
function cardHeading(enemy) {
  return enemy ? 'Противник · осмотр' : 'Ваш ход';
}
function cardActionPoints(enemy) {
  return enemy ? icon('info') : '<i></i><i></i><i></i><i></i><b>4 ОД</b>';
}
function cardStates(enemy) {
  return enemy
    ? status(
        'fear',
        'Страх',
        'Иллюстрация состояния морали: дрогнул. Порог и последствия здесь не вычисляются.',
      ) +
        status(
          'aggression',
          'Агрессия',
          'Иллюстрация наблюдаемого поведения: наступает. Не показывает скрытый выбор AI.',
        )
    : status(
        'calm',
        'Спокоен',
        'Мораль: спокоен. Осмотр других фигур не меняет действующего бойца.',
      ) + status('bow', 'Лук', 'Выстрел: 4 ОД · 16 сил. Значения демонстрационные.');
}
function cardFoot(enemy) {
  return enemy ? 'Закреплено · ЛКМ меняет осмотр' : 'ЛКМ — осмотр · ПКМ — приказ';
}
function actions() {
  return `<nav class="action-dock" aria-label="Действия бойца">${actionsData.map(([id, label, key, help]) => `<button class="action tool ${id === 'end' ? 'end' : ''}" data-action="${id}" aria-label="${label}" aria-description="${help}" ${id === 'retreat' ? 'aria-disabled="true"' : ''}>${icon(id)}<kbd>${key}</kbd>${id === 'retreat' ? `<span class="locked">${icon('lock')}</span>` : ''}${tooltip(label, help)}</button>`).join('')}</nav>`;
}
const effects = {
  poison: [
    'Отравлен',
    'Пример будущего эффекта. Урон, момент срабатывания, длительность и сложение ещё не определены.',
  ],
  fire: [
    'Горит',
    'Пример будущего эффекта на бойце. Не равен стоянию на клетке с огнём. Длительность и урон ещё не определены.',
  ],
  blood: [
    'Кровотечение',
    'Предложение состояния для UX. Источник, влияние и срок действия ещё не определены.',
  ],
  fear: [
    'Испуган',
    'Пример состояния морали. Порог, последствия и снятие должны приходить из правил, а не из рисунка.',
  ],
  fatigue: [
    'Истощён',
    'Пример ограничения от усталости. Точный порог и доступные действия ещё не определены.',
  ],
  defend: [
    'Защита',
    'Защита действует до следующей собственной активации. Осмотр показывает источник и влияние.',
  ],
  prepare: [
    'Готовит приём',
    'Предложение намерения. Показать цель и возможность ответа отдельно от отрицательных эффектов.',
  ],
  aggression: [
    'Наступает',
    'Иллюстрация наблюдаемого поведения. Агрессия AI не является статусным эффектом и не раскрывается как скрытая доктрина.',
  ],
};
const unitEffects = {
  arbalest: ['poison'],
  spear: ['defend'],
  target: ['fear'],
  great: ['fire'],
  boar: ['blood'],
  knife: ['fatigue'],
  mill: ['prepare'],
  shield: ['defend'],
};
function effectRow(id) {
  return (unitEffects[id] ?? [])
    .map(
      (key) =>
        `<span class="effect-badge ${key}" aria-label="${effects[key][0]}">${icon(key)}<span class="effect-tip" role="tooltip"><strong>${effects[key][0]}</strong><span>${effects[key][1]}</span></span></span>`,
    )
    .join('');
}
function turnTile(id, index, next = false) {
  const unit = units.find((u) => u.id === id);
  const states = unitStateNames(id);
  return `<button class="turn tool ${turnClass(unit, id, next)}" data-inspect="${id}" aria-label="${turnLabel(unit, index, next)}" aria-description="${states}"><span class="face">${face(unit)}</span><b class="order">${index + 1}</b>${turnCurrentMark(id, next)}<span class="effect-row">${effectRow(id)}</span>${turnLegalMark(unit, next)}${tooltip(unit.name, turnTooltip(unit, index, next, states))}</button>`;
}
function unitStateNames(id) {
  return (unitEffects[id] ?? []).map((key) => effects[key][0]).join(', ');
}
function turnClass(unit, id, next) {
  const side = unit.side === 'enemy' ? 'enemy' : 'ally';
  return [side, isCurrentTurn(id, next) ? 'active' : '', next ? 'future' : ''].join(' ');
}
function isCurrentTurn(id, next) {
  return id === 'archer' && !next;
}
function turnLabel(unit, index, next) {
  return `${next ? 'Прогноз следующего раунда' : 'Текущий раунд'}, ${index + 1}. ${unit.name}`;
}
function turnCurrentMark(id, next) {
  return id === 'archer' && !next ? '<span class="now">ХОД</span>' : '';
}
function turnLegalMark(unit, next) {
  return unit.legal && !next ? '<i class="legal-dot">◇</i>' : '';
}
function turnTooltip(unit, index, next, states) {
  const phase = next
    ? 'Следующий раунд: предварительный порядок'
    : `Раунд 1 · ${index + 1} в очереди`;
  const side = unit.side === 'human' ? 'свой' : 'противник';
  return `${phase} · ${side}${states ? ` · ${states}` : ''}`;
}
function initiative() {
  return `<nav class="initiative" aria-label="Инициатива с границами раундов"><div class="round-divider current"><b>1</b><span>РАУНД<br>СЕЙЧАС →</span></div><div class="queue current-queue">${turnOrder.map((id, n) => turnTile(id, n)).join('')}</div><div class="round-divider next"><b>2</b><span>РАУНД<br>ПРОГНОЗ →</span></div><div class="queue next-queue">${turnOrder
    .slice(0, 3)
    .map((id, n) => turnTile(id, n, true))
    .join('')}</div><span class="queue-tail">…</span></nav>`;
}
function abilities() {
  return `<nav class="ability-dock" aria-label="Способности от развития навыков"><small>ПРИЁМЫ</small>${[
    [
      'aimed',
      'Прицельный выстрел',
      'Выучено и доступно. Образец размещения способности; параметры ещё не заданы.',
      'ready',
    ],
    ['spears', 'Стена копий', 'Выучено, но сейчас недоступно: требуется копьё.', 'unavailable'],
    [
      'rapid',
      'Быстрая стрельба',
      'Ещё не изучено: требуется развитие навыка лука. Порог не согласован.',
      'locked',
    ],
    ['plus', 'Новый приём', 'Место для следующей выбранной способности. Не команда боя.', 'empty'],
  ]
    .map(
      ([ico, label, help, state], n) =>
        `<button class="ability tool ${state}" data-ability="${state}" aria-label="${label}" aria-description="${help}" ${state !== 'ready' ? 'aria-disabled="true"' : ''}>${icon(ico)}<kbd>${n + 6}</kbd>${state === 'locked' ? `<span class="locked">${icon('lock')}</span>` : state === 'unavailable' ? '<span class="unavailable-mark">!</span>' : ''}${tooltip(label, help)}</button>`,
    )
    .join('')}</nav>`;
}
function hex(q, r) {
  return { x: 265 + q * 46 + r * 23, y: 234 + r * 39.84 };
}
function points(p) {
  return `${p.x - 23},${p.y - 13.28} ${p.x},${p.y - 26.56} ${p.x + 23},${p.y - 13.28} ${p.x + 23},${p.y + 13.28} ${p.x},${p.y + 26.56} ${p.x - 23},${p.y + 13.28}`;
}
function distance(q, r) {
  return (Math.abs(q - 5) + Math.abs(r - 6) + Math.abs(q + r - 11)) / 2;
}
function battlefield() {
  let cells = '';
  for (let r = 0; r < 11; r++)
    for (let q = 0; q < 15; q++)
      cells += `<polygon class="cell" data-cell="${q},${r}" points="${points(hex(q, r))}"/>`;
  return `<div class="battlefield"><img class="ground" src="../battlefield/mill-field-v1.png" alt="Разрушенная мельница и каменный двор"><div class="play-plane"><svg class="map" viewBox="0 0 1440 900"><g class="ranges"></g><g class="grid">${cells}</g><g class="path"></g><g class="forecast-link"></g></svg>${units
    .map(battleUnit)
    .join(
      '',
    )}<div class="local-forecast" aria-live="polite"></div><div class="move-forecast" aria-live="polite"></div></div></div>`;
}
function battleUnit(unit) {
  const p = hex(unit.q, unit.r);
  const art = unitArt[unit.art];
  const scale = (unit.size ?? 80) / art.body;
  return `<button class="unit ${unit.side === 'enemy' ? 'enemy' : 'ally'} ${unit.id === 'archer' ? 'actor' : ''}" data-unit="${unit.id}" style="left:${p.x}px;top:${p.y}px" aria-label="${unit.name}"><span class="base"></span><img class="body" src="${art.url}" alt="" style="width:${art.width * scale}px;height:${art.height * scale}px;bottom:${-(art.height - art.foot) * scale}px"><span class="unit-health"><i></i></span>${unitStateMark(unit)}<span class="aim">◇</span><span class="unit-label">${unit.name}</span></button>`;
}
function unitStateMark(unit) {
  if (!['target', 'wolf'].includes(unit.id)) return '';
  return `<span class="unit-state">${icon(unit.id === 'wolf' ? 'aggression' : 'fear')}</span>`;
}
function render() {
  screen.className = `screen ${view}${night ? ' night' : ''}`;
  screen.innerHTML = `${battlefield()}<div class="vignette"></div><header class="scene-title"><span>СТАРАЯ МЕЛЬНИЦА</span><small>Развалины · 6 против 6</small></header><div class="utilities">${[
    ['grid', 'Сетка', 'Показать все 165 гексов'],
    ['sun', 'День / ночь', 'Переключить свет макета'],
    ['menu', 'Меню', 'Журнал и настройки после выбора концепта'],
  ]
    .map(
      ([id, label, help]) =>
        `<button class="tool" data-utility="${id}" aria-label="${label}">${icon(id)}${tooltip(label, help)}</button>`,
    )
    .join(
      '',
    )}</div>${initiative()}${card(false)}${card(true)}${actions()}${abilities()}<div class="mode-hint"><b class="mode-name"></b><span>Наведение — прогноз · ПКМ — приказ · Esc — отмена</span></div><div class="legend"><span class="move-key">Граница хода</span><span class="shot-key">Доступная цель</span><span class="inspect-key">Осмотр</span></div><p class="notice" role="status" hidden></p>`;
  document
    .querySelectorAll('[data-view]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  const [k, name, summary, tradeoff] = concepts[view];
  document.querySelector('#kicker').textContent = k;
  document.querySelector('#name').textContent = name;
  document.querySelector('#summary').textContent = summary;
  document.querySelector('#tradeoff').textContent = tradeoff;
  update();
  fit();
}
function updateModeDisplay() {
  screen.classList.toggle('night', night);
  screen.classList.toggle('show-grid', showGrid);
  screen.classList.toggle('move-mode', mode === 'move');
  screen
    .querySelectorAll('[data-action]')
    .forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.action === mode)),
    );
  screen
    .querySelectorAll('[data-ability]')
    .forEach((button) =>
      button.setAttribute(
        'aria-pressed',
        String(mode === 'skill' && button.dataset.ability === 'ready'),
      ),
    );
  const labels = {
    move: 'Движение · 4 ОД',
    bow: 'Выстрел · 4 ОД · 16 сил',
    skill: 'Приём · предпросмотр концепта',
    none: 'Выберите действие',
  };
  screen.querySelector('.mode-name').textContent = labels[mode] ?? labels.none;
}
function renderRanges() {
  screen.querySelector('.ranges').innerHTML = rangeMarkup(mode);
}
function rangeMarkup(currentMode) {
  if (!['move', 'bow'].includes(currentMode)) return '';
  const cells = [];
  for (let r = 0; r < 11; r++)
    for (let q = 0; q < 15; q++) cells.push(rangeForCell(q, r, currentMode));
  return cells.join('');
}
function rangeForCell(q, r, currentMode) {
  return inDisplayedRange(q, r) ? rangeCell(q, r, currentMode) : '';
}
function inDisplayedRange(q, r) {
  const d = distance(q, r);
  return d !== 0 && d <= 4;
}
function rangeCell(q, r, currentMode) {
  return `<polygon class="range ${currentMode}" points="${points(hex(q, r))}"/>`;
}
function updateInspectedUnit(inspection) {
  screen.querySelectorAll('.unit').forEach((button) => {
    const unit = units.find((entry) => entry.id === button.dataset.unit);
    updateUnitFlags(button, unit, inspection);
  });
  const inspected = units.find((unit) => unit.id === inspection);
  updateTargetCard(inspected);
  return inspected;
}
function updateUnitFlags(button, unit, inspection) {
  button.classList.toggle('legal', Boolean(unit.legal) && mode === 'bow');
  button.classList.toggle('inspected', unit.id === inspection);
}
function updateTargetCard(inspected) {
  const targetCard = screen.querySelector('.target-card');
  updateTargetIdentity(targetCard, inspected);
  updateTargetResources(targetCard, inspected);
  updateTargetStates(targetCard, inspected);
  targetCard.querySelector('.card-foot').textContent = inspectionFoot();
}
function updateTargetIdentity(targetCard, inspected) {
  targetCard.querySelector('.portrait').innerHTML = face(inspected);
  const heading = targetCard.querySelector('h2');
  heading.textContent = inspected.name;
  heading.title = inspected.name;
  targetCard.querySelector('.card-header small').textContent =
    inspected.side === 'enemy' ? 'Противник · осмотр' : 'Союзник · осмотр';
}
function updateTargetResources(targetCard, inspected) {
  targetCard.querySelector('.resources').innerHTML = resources(inspected.side === 'enemy');
  if (inspected.art.startsWith('B')) setUnarmored(targetCard);
}
function setUnarmored(targetCard) {
  targetCard.querySelector('[data-resource="defend"] b').textContent = '—';
  targetCard.querySelector('[data-resource="defend"] em').style.width = '0%';
}
function updateTargetStates(targetCard, inspected) {
  const states = (unitEffects[inspected.id] ?? []).map((key) =>
    status(key, effects[key][0], effects[key][1]),
  );
  targetCard.querySelector('.states').innerHTML =
    states.join('') || defaultInspectionStatus(inspected);
}
function inspectionFoot() {
  return hovered ? 'Наведение · ЛКМ закрепляет' : 'Закреплено · ЛКМ меняет осмотр';
}
function defaultInspectionStatus(inspected) {
  const explanation =
    inspected.id === 'wolf' ? effects.aggression[1] : 'Демонстрационное состояние.';
  const state = inspected.id === 'wolf' ? 'aggression' : 'calm';
  const name = inspected.id === 'wolf' ? 'Наступает' : 'Спокоен';
  return status(state, name, explanation);
}
function updateForecast(inspected) {
  const forecast = screen.querySelector('.local-forecast');
  const p = hex(inspected.q, inspected.r);
  forecast.hidden = !(mode === 'bow' && inspected.legal);
  forecast.innerHTML = `<div class="forecast-title">${icon('bow')}<span>Выстрел · ${inspected.name}</span></div><div class="shot-summary"><div class="chance-ring"><strong>75<small>%</small></strong></div><div class="chance-label"><b>Попадание</b><span>Промах <strong>25%</strong></span></div></div><div class="damage-grid"><div>${icon('heart')}<strong>2–4</strong><span>здоровье</span></div><div>${icon('defend')}<strong>12–18</strong><span>броня</span></div></div><div class="forecast-foot"><span>При попадании</span><b>4 ОД · 16 сил</b></div><em>ПКМ — выстрел</em>`;
  screen.querySelector('.forecast-link').innerHTML = '';
  if (!forecast.hidden) positionForecast(forecast, p);
}
function update() {
  updateModeDisplay();
  renderRanges();
  const inspected = updateInspectedUnit(hovered ?? pinned);
  updateForecast(inspected);
  if (mode !== 'move') clearRoute();
}

function clearRoute() {
  screen.querySelector('.path').innerHTML = '';
  screen.querySelector('.move-forecast').hidden = true;
  if (mode === 'move') screen.querySelector('.forecast-link').innerHTML = '';
}
function route(cell) {
  if (mode !== 'move') return;
  const [q, r] = cell.split(',').map(Number),
    d = distance(q, r);
  const f = screen.querySelector('.move-forecast'),
    p = hex(q, r),
    from = hex(5, 6);
  if (d === 0 || d > 4) {
    clearRoute();
    return;
  }
  const via = hex(5, r),
    cost = Math.ceil(d);
  screen.querySelector('.path').innerHTML =
    `<polyline class="path-ink" points="${from.x},${from.y} ${via.x},${via.y} ${p.x},${p.y}"/><polyline class="route" points="${from.x},${from.y} ${via.x},${via.y} ${p.x},${p.y}"/><polygon class="destination" points="${points(p)}"/>`;
  f.innerHTML = `<div class="forecast-title">${icon('move')}<span>Переход на клетку</span></div><div class="move-summary"><div><strong>${cost}<small> ОД</small></strong><span>стоимость</span></div><div><strong>${4 - cost}<small> / 4</small></strong><span>останется</span></div></div><div class="ap-preview">${Array.from({ length: 4 }, (_, n) => `<i class="${n < cost ? 'spent' : 'remaining'}"></i>`).join('')}</div><div class="terrain-summary"><span>Усталость <b>+${cost * 4}</b></span><span>Высота <b>0</b> · сухая земля</span></div><em>ПКМ — перейти · демонстрация пути</em>`;
  f.hidden = false;
  positionForecast(f, p);
}
function positionForecast(f, p) {
  const plane = screen.querySelector('.play-plane').getBoundingClientRect();
  const scale = plane.width / 1440;
  const size = { width: f.offsetWidth, height: f.offsetHeight };
  const obstacles = forecastObstacles(plane, scale);
  const placement = selectForecastPlacement(p, size, obstacles);
  f.style.left = `${placement.x}px`;
  f.style.top = `${placement.y}px`;
  drawForecastLink(f, p, placement, size);
}
function forecastObstacles(plane, scale) {
  return [
    ...screen.querySelectorAll('.unit, .character-card, .initiative, .action-dock, .ability-dock'),
  ].map((element) => obstacleBounds(element, plane, scale));
}
function obstacleBounds(element, plane, scale) {
  const box = element.getBoundingClientRect();
  return {
    x: (box.x - plane.x) / scale,
    y: (box.y - plane.y) / scale,
    w: box.width / scale,
    h: box.height / scale,
  };
}
function selectForecastPlacement(point, size, obstacles) {
  const candidates = forecastCandidates(point, size);
  return (
    candidates.find((candidate) => fitsForecast(candidate, size, obstacles)) ?? candidates.at(-1)
  );
}
function forecastCandidates(point, { width, height }) {
  return [
    { x: point.x - 115, y: point.y + 28 },
    { x: point.x + 34, y: point.y - height - 30 },
    { x: point.x - width - 34, y: point.y - height - 30 },
    { x: point.x - 115, y: point.y - height - 132 },
    { x: 1040, y: 120 },
  ];
}
function fitsForecast(candidate, { width, height }, obstacles) {
  return (
    inForecastBounds(candidate, width, height) &&
    obstacles.every((obstacle) => missesObstacle(candidate, width, height, obstacle))
  );
}
function inForecastBounds(candidate, width, height) {
  return (
    candidate.x >= 20 &&
    candidate.y >= 110 &&
    candidate.x + width <= 1420 &&
    candidate.y + height <= 780
  );
}
function missesObstacle(candidate, width, height, obstacle) {
  return (
    candidate.x + width + 10 < obstacle.x ||
    candidate.x - 10 > obstacle.x + obstacle.w ||
    candidate.y + height + 10 < obstacle.y ||
    candidate.y - 10 > obstacle.y + obstacle.h
  );
}
function drawForecastLink(forecast, point, placement, { width, height }) {
  const endpoint = forecastEndpoint(forecast, point);
  const anchor = forecastAnchor(endpoint, placement, width, height);
  screen.querySelector('.forecast-link').innerHTML =
    `<path d="M${anchor.x},${anchor.y}L${endpoint.x},${endpoint.y}"/><circle cx="${endpoint.x}" cy="${endpoint.y}" r="3"/>`;
}
function forecastEndpoint(forecast, point) {
  return { x: point.x, y: point.y - (forecast.classList.contains('local-forecast') ? 108 : 0) };
}
function forecastAnchor(endpoint, placement, width, height) {
  const anchor = {
    x: Math.max(placement.x + 12, Math.min(placement.x + width - 12, endpoint.x)),
    y: placement.y + height,
  };
  if (endpoint.y < placement.y) anchor.y = placement.y;
  if (endpoint.x < placement.x) {
    anchor.x = placement.x;
    anchor.y = clamp(endpoint.y, placement.y + 12, placement.y + height - 12);
  }
  if (endpoint.x > placement.x + width) {
    anchor.x = placement.x + width;
    anchor.y = clamp(endpoint.y, placement.y + 12, placement.y + height - 12);
  }
  return anchor;
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
// Raised skill rows use the clear left inspection area instead of covering figures.
function placeAbilityTooltip(button) {
  if (!['c', 'e'].includes(view)) return;
  const tip = button.querySelector('.tip');
  const stage = screen.getBoundingClientRect();
  const bounds = button.getBoundingClientRect();
  const scale = stage.width / screen.offsetWidth;
  tip.style.left = `${30 - (bounds.left - stage.left) / scale}px`;
  tip.style.top = `${screen.offsetHeight - 480 - (bounds.top - stage.top) / scale}px`;
  tip.style.bottom = 'auto';
  tip.style.transform = 'none';
}
function notice(message) {
  const n = screen.querySelector('.notice');
  n.textContent = message;
  n.hidden = false;
}
function inspect(id) {
  hovered = id;
  update();
}
function clearHover() {
  hovered = null;
  update();
}
screen.addEventListener('pointerover', (e) => handlePointerOver(e));
function handlePointerOver(e) {
  handleAbilityHover(e.target);
  handleUnitHover(e.target);
  handleCellHover(e.target);
}
function handleAbilityHover(targetElement) {
  const ability = targetElement.closest('[data-ability]');
  if (ability) placeAbilityTooltip(ability);
}
function handleUnitHover(targetElement) {
  const unit = targetElement.closest('[data-unit],[data-inspect]');
  if (unit) inspect(unit.dataset.unit ?? unit.dataset.inspect);
}
function handleCellHover(targetElement) {
  const cell = targetElement.closest('[data-cell]');
  if (cell) route(cell.dataset.cell);
}
screen.addEventListener('pointerout', (e) => handlePointerOut(e));
function handlePointerOut(e) {
  leaveUnit(e);
  leaveCell(e);
}
function leaveUnit(event) {
  const unit = event.target.closest('[data-unit],[data-inspect]');
  if (unit && !unit.contains(event.relatedTarget)) clearHover();
}
function leaveCell(event) {
  const cell = event.target.closest('[data-cell]');
  if (cell && !cell.contains(event.relatedTarget)) clearRoute();
}
screen.addEventListener('focusin', (e) => {
  const ability = e.target.closest('[data-ability]');
  if (ability) placeAbilityTooltip(ability);
  const u = e.target.closest('[data-unit],[data-inspect]');
  if (u) inspect(u.dataset.unit ?? u.dataset.inspect);
});
screen.addEventListener('focusout', (e) => {
  if (e.target.closest('[data-unit],[data-inspect]')) clearHover();
});
function handleAbilityClick(ability) {
  if (!ability) return false;
  notice(ability.getAttribute('aria-description'));
  if (ability.dataset.ability === 'ready') {
    mode = 'skill';
    update();
  }
  return true;
}
function handleActionClick(action) {
  if (!action) return false;
  if (isUnavailableAction(action)) return true;
  mode = action.dataset.action;
  screen.querySelector('.notice').hidden = true;
  update();
  showActionFeedback(mode);
  return true;
}
function isUnavailableAction(action) {
  if (action.getAttribute('aria-disabled') !== 'true') return false;
  notice('Отход недоступен: боец не у края поля.');
  return true;
}
function showActionFeedback(action) {
  const messages = {
    end: 'Макет: завершить ход. Боевые команды не отправляются.',
    defend: 'Макет: защита за 2 ОД · 8 сил завершает активацию.',
  };
  if (messages[action]) notice(messages[action]);
}
function handleInspectionClick(unit) {
  if (!unit) return false;
  pinned = unit.dataset.unit ?? unit.dataset.inspect;
  update();
  return true;
}
function handleUtilityClick(utility) {
  if (!utility) return;
  if (utility.dataset.utility === 'sun') night = !night;
  else if (utility.dataset.utility === 'grid') showGrid = !showGrid;
  else notice('Макет: журнал и настройки раскрываются отдельно.');
  update();
}
screen.addEventListener('click', (event) => handleClick(event));
function handleClick(event) {
  if (handleAbilityClick(event.target.closest('[data-ability]'))) return;
  if (handleActionClick(event.target.closest('[data-action]'))) return;
  if (handleInspectionClick(event.target.closest('[data-unit],[data-inspect]'))) return;
  handleUtilityClick(event.target.closest('[data-utility]'));
}

screen.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  notice('Предпросмотр приказа. Макет не изменяет боевое состояние.');
});
document.querySelectorAll('[data-view]').forEach((b) =>
  b.addEventListener('click', () => {
    view = b.dataset.view;
    hovered = null;
    render();
    const u = new URL(location);
    u.searchParams.set('view', view);
    history.replaceState(null, '', u);
  }),
);
function full(next) {
  document.body.classList.toggle('full', next);
  fit();
}
document.querySelector('#full-toggle').addEventListener('click', () => full(true));
document.querySelector('#exit-full').addEventListener('click', () => full(false));
document.addEventListener('keydown', (e) => handleKeydown(e));
function handleKeydown(e) {
  if (e.key === 'Escape') {
    cancelKeyAction();
    return;
  }
  if (e.target.closest('button')) return;
  selectKeyboardAction(e);
}
function cancelKeyAction() {
  if (document.body.classList.contains('full')) full(false);
  else {
    mode = 'none';
    update();
  }
}
function selectKeyboardAction(e) {
  const slot = Number(e.key) - 6;
  if (selectAbilitySlot(e, slot)) return;
  selectActionKey(e);
}
function selectAbilitySlot(event, slot) {
  if (slot < 0 || slot >= 4) return false;
  event.preventDefault();
  screen.querySelectorAll('[data-ability]')[slot].click();
  return true;
}
function selectActionKey(event) {
  const id = { 1: 'bow', 2: 'move', 3: 'defend', 5: 'retreat', ' ': 'end' }[event.key];
  if (!id) return;
  event.preventDefault();
  screen.querySelector(`[data-action="${id}"]`).click();
}
function fit() {
  const full = document.body.classList.contains('full'),
    frame = document.querySelector('.preview-frame');
  const scale = full
    ? Math.min(innerWidth / 1440, innerHeight / 900)
    : Math.min((innerWidth - 64) / 1440, (innerHeight - 290) / 900);
  const s = Math.max(0.2, scale),
    w = full ? innerWidth / s : 1440,
    h = full ? innerHeight / s : 900;
  frame.style.width = `${w * s}px`;
  frame.style.height = `${h * s}px`;
  screen.style.width = `${w}px`;
  screen.style.height = `${h}px`;
  screen.style.transform = `scale(${s})`;
  screen.querySelectorAll('[data-ability]').forEach(placeAbilityTooltip);
}
window.addEventListener('resize', fit);
if (query.get('full') === '1') document.body.classList.add('full');
if (query.get('capture') === '1') document.body.classList.add('capture');
render();
