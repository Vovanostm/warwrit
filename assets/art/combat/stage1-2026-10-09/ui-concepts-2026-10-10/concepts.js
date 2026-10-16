// UI concept study only: no battle API, canonical state or combat RNG.
const artRoot = '../';
const unitArt = {
  W01: {
    url: `${artRoot}roster/w01/sprite.png`,
    width: 1240,
    height: 1269,
    body: 1236,
    foot: 1207.5,
  },
  W02: {
    url: `${artRoot}roster/w02/sprite.png`,
    width: 1254,
    height: 1254,
    body: 1196,
    foot: 1163,
  },
  W03: {
    url: `${artRoot}roster/w03/sprite.png`,
    width: 1254,
    height: 1254,
    body: 1171,
    foot: 1153.5,
  },
  W04: {
    url: `${artRoot}roster/w04/sprite.png`,
    width: 1254,
    height: 1254,
    body: 825,
    foot: 1044.5,
  },
  W05: {
    url: `${artRoot}roster/w05/sprite.png`,
    width: 1254,
    height: 1254,
    body: 1177,
    foot: 1162.5,
  },
  W06: {
    url: `${artRoot}roster/w06/sprite.png`,
    width: 1254,
    height: 1254,
    body: 1173,
    foot: 1149,
  },
  W08: {
    url: `${artRoot}roster/w08/sprite.png`,
    width: 1254,
    height: 1254,
    body: 1115,
    foot: 1140.5,
  },
  B001: { url: '../../../m1/battle/unit-wolf.png', width: 512, height: 512, body: 293, foot: 491 },
  B003: {
    url: `${artRoot}roster/b003/sprite.png`,
    width: 1254,
    height: 1254,
    body: 1024,
    foot: 1164,
  },
  B019: {
    url: `${artRoot}roster/b019/sprite.png`,
    width: 1145,
    height: 1374,
    body: 1260,
    foot: 1327,
  },
  B025: {
    url: `${artRoot}roster/b025/sprite.png`,
    width: 1254,
    height: 1254,
    body: 1204,
    foot: 1236,
  },
  B053: {
    url: `${artRoot}roster/b053/sprite.png`,
    width: 1254,
    height: 1254,
    body: 1206,
    foot: 1226,
  },
};
const units = [
  { id: 'shield', art: 'W01', name: 'Меч + щит', q: 2, r: 2, side: 'human' },
  { id: 'arbalest', art: 'W08', name: 'Арбалет', q: 5, r: 2, side: 'human' },
  { id: 'spear', art: 'W04', name: 'Копьё', q: 2, r: 6, side: 'human' },
  { id: 'archer', art: 'W05', name: 'Лучник', q: 5, r: 6, side: 'human' },
  { id: 'great', art: 'W03', name: 'Двуручный топор', q: 2, r: 10, side: 'human' },
  { id: 'knife', art: 'W06', name: 'Нож', q: 5, r: 10, side: 'human' },
  { id: 'wolf', art: 'B001', name: 'Волк', q: 8, r: 6, side: 'enemy', legal: true, size: 48 },
  { id: 'target', art: 'W02', name: 'Топор + щит', q: 9, r: 3, side: 'enemy', legal: true },
  { id: 'boar', art: 'B003', name: 'Дикий вепрь', q: 10, r: 7, side: 'enemy', size: 61 },
  { id: 'warden', art: 'B019', name: 'Могильный сторож', q: 12, r: 3, side: 'enemy', size: 86 },
  { id: 'reed', art: 'B025', name: 'Камышник', q: 10, r: 10, side: 'enemy', size: 82 },
  { id: 'mill', art: 'B053', name: 'Мельничная тварь', q: 13, r: 7, side: 'enemy', size: 106 },
];
const turnOrder = [
  'archer',
  'wolf',
  'arbalest',
  'spear',
  'target',
  'great',
  'boar',
  'knife',
  'mill',
  'shield',
  'warden',
  'reed',
];
const descriptions = {
  a: {
    kicker: '01 / HEROES · КОМПАКТНАЯ КЛАССИКА',
    title: 'Поле и командная консоль',
    summary:
      'Портрет, приказы и прогноз собраны в одну устойчивую нижнюю полосу. Поле остаётся широким, внимание идёт от цели к результату и действию.',
    risk: 'Консоль занимает нижнюю часть экрана. Подробные состояния открываются отдельно.',
  },
  b: {
    kicker: '02 / WARTALES · ПОЛЕ В ПЕРВУЮ ОЧЕРЕДЬ',
    title: 'Свободное поле',
    summary:
      'Сцена занимает весь экран. Портрет и компактные приказы лежат отдельными островами; прогноз возникает рядом с целью.',
    risk: 'В боевой реализации плавающим панелям нужно избегать фигур и доступных клеток.',
  },
  c: {
    kicker: '03 / BATTLE BROTHERS · РЕСУРСЫ И ОРУЖИЕ',
    title: 'Досье действующего бойца',
    summary:
      'Слева всегда видны здоровье, броня, силы и оружие. Приказы и очередь — внизу. Подходит для боя, где цена каждого действия важна.',
    risk: 'Поле уже, а постоянная карточка требует привычки. Новые свойства или способности не добавлены.',
  },
  d: {
    kicker: '04 / WARWRIT · ПОЛЕ И ПОСЛЕДСТВИЯ',
    title: 'Тактическая панель',
    summary:
      'Справа — выбранный противник, прогноз и очередь; снизу — тот, кто действует, и его приказы. Цель и действующий боец разделены явно.',
    risk: 'Самое узкое поле. Внедрение потребует проверить места боя и зум на этой ширине.',
  },
};
const iconPaths = {
  bow: 'M6 3q16 10 0 20M6 3v20M3 13h21m-5-4 5 4-5 4',
  move: 'M3 19h7V9h12m-4-4 5 4-5 4M3 19l4-3M3 19l4 3',
  defend: 'M13 3 4 7v7q1 7 9 10 8-3 9-10V7ZM13 6v14',
  end: 'M6 5v18M9 7l14 7-14 7',
  retreat: 'M9 4H5v19h4M22 13H10m4-4-4 4 4 4',
  grid: 'M5 3h8l4 6-4 6H5L1 9ZM17 9h6l4 6-4 6h-8l-4-6',
  sun: 'M13 1v3m0 20v3M1 13h3m20 0h3M5 5l2 2m14 14 2 2M5 21l2-2M21 7l2-2M18 13a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
  menu: 'M4 7h20M4 14h20M4 21h20',
};
const icon = (id) =>
  `<svg class="icon" viewBox="0 0 28 28" aria-hidden="true"><path d="${iconPaths[id]}"></path></svg>`;
const portrait = (id) => `<div class="portrait"><img src="${unitArt[id].url}" alt=""></div>`;
const pips = () =>
  '<div class="pips" aria-label="4 из 4 очков действия"><i></i><i></i><i></i><i></i><span>4 / 4 ОД</span></div>';
function meters(target = false) {
  return `<div class="meters ${target ? 'target-resources' : ''}">
 <div class="resource"><span>Здоровье</span><div class="bar"><i style="width:${target ? 80 : 100}%"></i></div><b>${target ? '48 / 60' : '60 / 60'}</b></div>
 <div class="resource"><span>Броня</span><div class="bar armor"><i style="width:${target ? 65 : 100}%"></i></div><b>${target ? '52 / 80' : '35 / 35'}</b></div>
 ${target ? '' : '<div class="resource"><span>Силы</span><div class="bar stamina"><i style="width:80%"></i></div><b>64 / 80</b></div>'}
 </div>`;
}
function actorCard(kind = 'actor-card') {
  return `<section class="${kind}" aria-label="Действующий боец">${portrait('W05')}<div><p class="micro">Ваш ход</p><h2 class="actor-name">Лучник</h2>${pips()}${meters()}</div></section>`;
}
function actions() {
  return `<div class="actions">${[
    ['bow', 'Выстрел', '4 ОД · 16 сил', '1'],
    ['move', 'Движение', 'По пути', '2'],
    ['defend', 'Защита', '2 ОД · 8 сил', '3'],
    ['end', 'Конец хода', 'Оставшиеся ОД', '4'],
    ['retreat', 'Отход', 'У края поля', '5'],
  ]
    .map(
      ([id, label, cost, key]) =>
        `<button class="action ${id === 'end' ? 'end' : ''} ${id === 'retreat' ? 'muted' : ''}" data-action="${id}" title="${id === 'defend' ? 'Защита завершает активацию' : id === 'retreat' ? 'Отход доступен у края карты' : label}"><span class="key">${key}</span>${icon(id)}<span>${label}</span><small>${cost}</small></button>`,
    )
    .join('')}</div>`;
}
function forecast() {
  return `<section class="forecast" aria-label="Прогноз по цели"><div class="target-heading">${portrait('W02')}<div><p class="micro">Цель выстрела</p><h3 class="target-name">Топор + щит</h3></div></div><div class="probability"><strong>75%</strong><span>попадание · 25% промах</span></div><div class="damage"><span>Здоровье <b>−2–4</b></span><span>Броня <b>−12–18</b></span></div><div class="cost-line">При попадании · 4 ОД · 16 сил</div></section>`;
}
function turns() {
  return `<div class="turns hud" aria-label="Очередь хода"><span class="turn-caption">Инициатива</span>${turnOrder
    .map((id, index) => {
      const u = units.find((v) => v.id === id);
      return `<button class="turn-tile ${u.side === 'enemy' ? 'enemy' : ''} ${id === 'archer' ? 'active' : ''}" data-inspect="${id}" title="${index + 1}. ${u.name}${id === 'archer' ? ' · действует сейчас' : ''}" aria-label="${index + 1}. ${u.name}"><img class="face" style="${u.art === 'B001' ? `width:175%;left:-10%;top:${4 - { a: 49, b: 46, c: 68, d: 37 }[view] * 0.78}px` : u.art === 'W04' ? `width:260%;left:-65%;top:${4 - { a: 49, b: 46, c: 68, d: 37 }[view] * 0.52}px` : u.art === 'B003' ? 'width:170%;left:-50%;top:-12px' : ''}" src="${unitArt[u.art].url}" alt=""><span class="n">${index + 1}</span></button>`;
    })
    .join('')}</div>`;
}
const hint = '<p class="hint action-hint">ЛКМ — осмотр · ПКМ — приказ · Наведение — прогноз</p>';
function topline() {
  return `<header class="topline hud"><span class="site">Развалины мельницы</span><span class="round">РАУНД 1</span><div class="balance"><span><b>Свои</b> 6</span><span>Противники 6</span></div><div class="utility"><button data-utility="grid" title="Показать всю сетку" aria-label="Показать всю сетку">${icon('grid')}</button><button data-utility="night" title="День / ночь" aria-label="День / ночь">${icon('sun')}</button><button data-utility="menu" title="Журнал, редактор, настройки" aria-label="Открыть меню">${icon('menu')}</button></div></header>`;
}
function hex(q, r) {
  return { x: 230 + q * 33 + r * 16.5, y: 144 + r * 29 };
}
function polygon(x, y) {
  return `${x - 16.5},${y - 9.5} ${x},${y - 19} ${x + 16.5},${y - 9.5} ${x + 16.5},${y + 9.5} ${x},${y + 19} ${x - 16.5},${y + 9.5}`;
}

function map() {
  let cells = '';
  for (let r = 0; r < 11; r++)
    for (let q = 0; q < 15; q++) {
      const p = hex(q, r);
      cells += `<polygon class="grid" points="${polygon(p.x, p.y)}"/>`;
    }
  return `<svg class="map" viewBox="0 0 1000 600" preserveAspectRatio="none"><g class="all-grid" style="display:none">${cells}</g><g class="area"></g><g class="path"></g></svg>`;
}
function board() {
  return `<div class="board"><img class="ground" src="../battlefield/mill-field-v1.png" alt="Разрушенная каменная мельница и открытый двор">${map()}${units
    .map((u) => {
      const p = hex(u.q, u.r),
        a = unitArt[u.art],
        height = u.size ?? 80,
        scale = height / a.body;
      return `<button class="unit ${u.side === 'enemy' ? 'enemy' : ''} ${u.legal ? 'legal' : ''} ${u.id === 'archer' ? 'actor' : ''}" data-unit="${u.id}" aria-label="${u.name}${u.legal ? ' · доступен выстрел' : ''}" style="left:${p.x / 10}%;top:${p.y / 6}%"><span class="base"></span><img class="body" src="${a.url}" alt="" style="width:${a.width * scale}px;height:${a.height * scale}px;bottom:${-(a.height - a.foot) * scale}px"><span class="unit-health"><i></i></span><span class="unit-label">${u.name}</span></button>`;
    })
    .join('')}<span class="locator">Развалины · 15 × 11 гексов</span></div>`;
}
function composition(view) {
  const field = board(),
    top = topline();
  if (view === 'a')
    return `${top}${field}${turns()}<span class="scene-meta hud">ДВОР МЕЛЬНИЦЫ · ДНЕВНОЙ БОЙ</span><div class="console panel hud">${actorCard()}${actions()}${forecast()}${hint}</div>`;
  if (view === 'b')
    return `${field}${top}${turns()}<div class="floating-actor panel hud">${portrait('W05')}<div><p class="micro">Действует</p><h2 class="actor-name">Лучник</h2>${pips()}</div>${meters()}</div><div class="hud floating-actions">${actions()}</div><div class="pinned-target hud">${forecast()}</div><p class="field-hint hint hud">Выстрел · 4 ОД · ПКМ по выделенной цели</p>`;
  if (view === 'c')
    return `${top}${field}<aside class="dossier panel hud"><p class="micro">Действующий боец</p>${portrait('W05')}<h2 class="actor-name">Лучник</h2>${pips()}${meters()}<div class="equipment">${icon('bow')}<div>Лук<small>Дальность 1–4 гекса</small><small>Выстрел 4 ОД · 16 сил</small></div></div><p class="dossier-note">Осмотр других фигур<br>не меняет действующего бойца.</p></aside><div class="ledger panel hud">${actions()}${forecast()}</div>${turns()}`;
  return `${top}${field}<aside class="inspector panel hud"><p class="inspect-title">ОСМОТР ЦЕЛИ <span>01 / 02</span></p>${forecast()}${meters(true)}<div class="target-reason">В пределах выстрела.<br>Линия огня открыта.</div>${turns()}<p class="hint">ЛКМ закрепляет осмотр.<br>Приказ исполняет лучник, чей ход сейчас.</p></aside><div class="console panel hud">${actorCard()}${actions()}${hint}</div>`;
}
const screen = document.querySelector('#screen');
const query = new URLSearchParams(location.search);
let view = ['a', 'b', 'c', 'd'].includes(query.get('view')) ? query.get('view') : 'a';
let mode = 'bow',
  target = 'target',
  night = false,
  showGrid = false;
function updatePreview() {
  document
    .querySelectorAll('.action')
    .forEach((b) => b.classList.toggle('selected', b.dataset.action === mode));
  document.querySelectorAll('.unit').forEach((b) => {
    const u = units.find((v) => v.id === b.dataset.unit);
    b.classList.toggle('target', u.id === target);
    b.classList.toggle('legal', Boolean(u.legal) && mode === 'bow');
  });
  const area = screen.querySelector('.area');
  const actor = units.find((u) => u.id === 'archer');
  let cells = '';
  for (let r = 0; r < 11; r++)
    for (let q = 0; q < 15; q++) {
      const distance =
        (Math.abs(q - actor.q) + Math.abs(r - actor.r) + Math.abs(q + r - actor.q - actor.r)) / 2;
      if (distance > 0 && distance <= (mode === 'move' ? 3 : 4)) {
        const p = hex(q, r);
        cells += `<polygon class="range" points="${polygon(p.x, p.y)}"/>`;
      }
    }
  area.innerHTML = ['bow', 'move'].includes(mode) ? cells : '';
  area.style.opacity = mode === 'move' ? '.65' : '1';
  screen.classList.toggle('night', night);
  const sceneMeta = screen.querySelector('.scene-meta');
  if (sceneMeta)
    sceneMeta.textContent = night ? 'ДВОР МЕЛЬНИЦЫ · НОЧНОЙ БОЙ' : 'ДВОР МЕЛЬНИЦЫ · ДНЕВНОЙ БОЙ';
  screen.querySelector('.all-grid').style.display = showGrid ? '' : 'none';
  const chosen = units.find((u) => u.id === target);
  screen.querySelectorAll('.target-name').forEach((n) => (n.textContent = chosen.name));
  screen
    .querySelectorAll('.target-heading .portrait img')
    .forEach((n) => (n.src = unitArt[chosen.art].url));
  const legal = Boolean(chosen.legal);
  screen
    .querySelectorAll('.probability strong')
    .forEach((n) => (n.textContent = legal ? '75%' : '—'));
  screen
    .querySelectorAll('.probability span')
    .forEach((n) => (n.textContent = legal ? 'попадание · 25% промах' : 'Нет доступного выстрела'));
  screen.querySelectorAll('.damage').forEach((n) => (n.style.visibility = legal ? '' : 'hidden'));
  screen
    .querySelectorAll('.cost-line')
    .forEach(
      (n) =>
        (n.textContent = legal ? 'При попадании · 4 ОД · 16 сил' : 'Выберите цель в зоне выстрела'),
    );
  screen
    .querySelectorAll('.target-reason')
    .forEach(
      (n) =>
        (n.innerHTML = legal
          ? 'В пределах выстрела.<br>Линия огня открыта.'
          : 'Осмотр фигуры.<br>Доступный выстрел не показан.'),
    );
  screen.querySelector('.board-forecast')?.remove();
  if (view === 'b' && legal && mode === 'bow') {
    const f = document.createElement('div'),
      p = hex(chosen.q, chosen.r);
    f.className = 'board-forecast';
    f.style.left = `${Math.min(76, p.x / 10 - 4)}%`;
    f.style.top = `${p.y / 6 - 19}%`;
    f.innerHTML =
      '<strong>75% попадание</strong><span>Здоровье −2–4 · броня −12–18</span><br><span>При попадании · 4 ОД</span>';
    screen.querySelector('.board').append(f);
  }
}
function fit() {
  const frame = document.querySelector('.preview-frame'),
    full = document.body.classList.contains('full');
  const scale = full
    ? Math.min(innerWidth / 1440, innerHeight / 900)
    : Math.min((innerWidth - 64) / 1440, (innerHeight - 260) / 900);
  const s = Math.max(0.25, scale);
  frame.style.width = `${1440 * s}px`;
  frame.style.height = `${900 * s}px`;
  screen.style.transform = `scale(${s})`;
}
function setView(next) {
  view = next;
  screen.className = `screen ${view}`;
  screen.innerHTML = composition(view);
  document
    .querySelectorAll('[data-view]')
    .forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === view)));
  const d = descriptions[view];
  document.querySelector('#concept-kicker').textContent = d.kicker;
  document.querySelector('#concept-title').textContent = d.title;
  document.querySelector('#concept-summary').textContent = d.summary;
  document.querySelector('#concept-risk').textContent = d.risk;
  const p = new URL(location);
  p.searchParams.set('view', view);
  history.replaceState(null, '', p);
  updatePreview();
  fit();
}
function notice(text) {
  screen.querySelector('.notice')?.remove();
  const n = document.createElement('p');
  n.className = 'notice';
  n.textContent = text;
  screen.append(n);
}
screen.addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]');
  if (action) {
    mode = action.dataset.action;
    updatePreview();
    if (!['bow', 'move'].includes(mode))
      notice(
        mode === 'end'
          ? 'Конец хода · предварительный просмотр'
          : mode === 'defend'
            ? 'Защита · 2 ОД · завершает активацию'
            : 'Отход · нужен край карты',
      );
    return;
  }
  const unit = event.target.closest('[data-unit],[data-inspect]');
  if (unit) {
    target = unit.dataset.unit ?? unit.dataset.inspect;
    updatePreview();
    return;
  }
  const utility = event.target.closest('[data-utility]');
  if (utility) {
    if (utility.dataset.utility === 'night') night = !night;
    else if (utility.dataset.utility === 'grid') showGrid = !showGrid;
    else notice('Журнал · редактор боя · настройки — в меню');
    updatePreview();
  }
});
screen.addEventListener('pointerover', (event) => {
  const b = event.target.closest('[data-unit]');
  if (b && b.classList.contains('enemy')) {
    target = b.dataset.unit;
    updatePreview();
  }
});
screen.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  if (event.target.closest('[data-unit],.board')) notice('Макет: боевой приказ не отправлен');
});
document
  .querySelectorAll('[data-view]')
  .forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
document.querySelector('#full-toggle').addEventListener('click', () => {
  document.body.classList.add('full');
  fit();
});
document.querySelector('#exit-full').addEventListener('click', () => {
  document.body.classList.remove('full');
  fit();
});
addEventListener('resize', fit);
addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.body.classList.remove('full');
    screen.querySelector('.notice')?.remove();
    fit();
  } else if (['1', '2', '3', '4', '5'].includes(event.key)) {
    const action = ['bow', 'move', 'defend', 'end', 'retreat'][Number(event.key) - 1];
    screen.querySelector(`[data-action="${action}"]`).click();
  }
});
if (query.get('full') === '1' || query.get('capture') === '1') document.body.classList.add('full');
if (query.get('capture') === '1') document.body.classList.add('capture');
setView(view);
