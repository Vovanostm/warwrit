import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import type { CombatLabView } from '@warwrit/protocol';
import { BattleView } from './BattleView.js';

const view: CombatLabView = {
  version: 1,
  sessionId: 'session',
  battleId: 'battle',
  scenarioId: 'sprite-6v6-v1',
  ruleHints: {
    hit: {
      shakenMoraleThreshold: 25,
      shakenPenalty: 10,
      lowStaminaThresholdPercent: 25,
      lowStaminaPenalty: 10,
    },
    weapons: [],
    defend: { actionPointCost: 2, staminaCost: 8 },
    recovery: { staminaPerActivation: 18 },
  },
  battle: {
    version: 1,
    name: 'Тесный двор',
    seed: 41,
    map: { name: 'Старая мельница', tiles: [] },
    units: [],
  },
  controlledSideId: 'human',
  viewRevision: 7,
  status: 'active',
  round: 2,
  map: {
    name: 'Старая мельница',
    hexes: [
      { q: 0, r: 0 },
      { q: 1, r: 0 },
    ],
    blocked: [],
    tiles: [
      { q: 0, r: 0, height: 0, terrain: 'plain', blocked: false },
      { q: 1, r: 0, height: 1, terrain: 'fire', blocked: false },
    ],
  },
  movementPreview: [
    {
      to: { q: 1, r: 0 },
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
      actionPointCost: 2,
      staminaCost: 3,
    },
  ],
  attackPreview: [{ targetId: 'B001', hitChance: 68, actionPointCost: 2, staminaCost: 1 }],
  sides: [{ id: 'human', retreatHexes: [{ q: 0, r: 0 }] }],
  units: [
    {
      id: 'W01',
      profileId: 'W01',
      name: 'Щитник',
      sideId: 'human',
      weaponId: 'sword-shield',
      position: { q: 0, r: 0 },
      status: 'active',
      guarding: false,
      initiative: 18,
      pools: {
        health: { current: 9, maximum: 31 },
        armor: { current: 4, maximum: 11 },
        stamina: { current: 12, maximum: 40 },
        morale: { current: 70, maximum: 90 },
      },
      wounds: [],
    },
    {
      id: 'B001',
      profileId: 'B001',
      name: 'Волк',
      sideId: 'opponent',
      weaponId: 'raider',
      position: { q: 1, r: 0 },
      status: 'active',
      guarding: false,
      initiative: 13,
      pools: {
        health: { current: 22, maximum: 31 },
        armor: { current: 0, maximum: 11 },
        stamina: { current: 38, maximum: 40 },
        morale: { current: 80, maximum: 90 },
      },
      wounds: [],
    },
  ],
  initiativeOrder: ['W01', 'B001'],
  turnIndex: 0,
  activation: { id: 'activation', actorId: 'W01', actionPoints: { current: 3, maximum: 4 } },
  events: [
    {
      id: 'event',
      revision: 7,
      ordinal: 0,
      type: 'attack.resolved',
      unitId: 'W01',
      targetId: 'B001',
      hit: true,
      healthDamage: 3,
      armorDamage: 0,
    },
  ],
  omittedEventPrefix: 0,
  outcome: null,
};

const render = (observation = view) =>
  renderToStaticMarkup(
    <BattleView
      view={observation}
      selectedUnitId="B001"
      selectedHex={null}
      onSelectUnit={() => {}}
      onSelectHex={() => {}}
    />,
  );

it('shows the approved command desk from observed resources and server attack previews', () => {
  const html = render();
  for (const text of [
    'Щитник',
    'Волк',
    'Здоровье',
    'ОД 3/4',
    'Шанс попадания 68%',
    'События боя (1)',
    'попадание',
  ])
    expect(html).toContain(text);
  expect(html).toContain('15 × 11 гексов');
  expect(html).not.toContain('hidden-seed');
  expect(html.match(/class="initiative-unit(?: [^"]*)?"/g)).toHaveLength(2);
  expect(html).not.toContain('Предварительный порядок');
  expect(html).toContain('урон недоступен');
});

it('places canonical health, armor and morale bars under each full portrait', () => {
  const zeroArmorView: CombatLabView = {
    ...view,
    units: view.units.map((unit) =>
      unit.id === 'B001'
        ? { ...unit, pools: { ...unit.pools, armor: { current: 0, maximum: 0 } } }
        : unit,
    ),
  };
  const html = render(zeroArmorView);
  const portraitIndex = html.indexOf('class="battle-portrait"');
  const firstVitalsIndex = html.indexOf('class="unit-vitals"', portraitIndex);
  const sideMarkIndex = html.indexOf('class="battle-side-mark"', firstVitalsIndex);
  const firstVitalResources = html.slice(firstVitalsIndex, sideMarkIndex);
  const healthIndex = firstVitalResources.indexOf('data-resource="health"');
  const armorIndex = firstVitalResources.indexOf('data-resource="armor"');
  const moraleIndex = firstVitalResources.indexOf('data-resource="morale"');
  expect(portraitIndex).toBeGreaterThanOrEqual(0);
  expect(firstVitalsIndex).toBeGreaterThan(portraitIndex);
  expect(sideMarkIndex).toBeGreaterThan(firstVitalsIndex);
  expect(healthIndex).toBeGreaterThanOrEqual(0);
  expect(armorIndex).toBeGreaterThan(healthIndex);
  expect(moraleIndex).toBeGreaterThan(armorIndex);
  expect(html.match(/class="unit-vital" data-resource=/g)).toHaveLength(6);
  expect(html).toContain('title="Здоровье: 9/31"');
  expect(html).toContain('title="Броня: 4/11"');
  expect(html).toContain('title="Мораль: 70/90"');
  expect(html).toContain('title="Броня: 0/0"');
  expect(html).toContain('style="width:0%"');
});

it('retains fallback inspection, utilities and honestly unavailable ability slots', () => {
  const html = render();
  expect(html).toContain('<canvas');
  expect(html).toContain('aria-label="Поле боя с выбором бойца или клетки"');
  expect(html).toContain('aria-pressed="true"');
  expect(html).toContain('Ночная сцена');
  expect(html).toContain('Нет изученных приёмов');
  expect(html).not.toContain('class="battle-ability-slot"');
});

it('does not claim a winner absent a server outcome', () => {
  for (const status of ['active', 'resolved'] as const) {
    const html = render({ ...view, status, activation: null, outcome: null });
    expect(html).not.toContain('aria-label="Результат боя"');
    expect(html).not.toContain('<h2>Победа</h2>');
  }
});

it('does not show active stances or a future round after battle resolution', () => {
  const html = render({
    ...view,
    status: 'resolved',
    activation: null,
    units: [
      view.units[0]!,
      {
        ...view.units[1]!,
        status: 'dead',
        guarding: true,
        panicking: true,
        threat: {
          targetId: 'W01',
          targetHex: { q: 0, r: 0 },
          range: 2,
          damage: { minimum: 20, maximum: 30 },
          retargeted: false,
          responseReceived: true,
        },
      },
    ],
  });
  expect(html).not.toContain('aria-label="Приказы действующему бойцу"');
  expect(html).not.toContain('Готовит тяжёлый удар');
  expect(html).not.toContain('Паника · бежит');
  expect(html).not.toContain('до следующего хода');
  expect(html).not.toContain('ПОРЯДОК НЕИЗВЕСТЕН');
});

it('exposes the declared cell and fresh response warning from canonical threat state', () => {
  const html = render({
    ...view,
    rulesetId: 'sprite-prototype-v2',
    units: [
      view.units[0]!,
      {
        ...view.units[1]!,
        threat: {
          targetId: 'W01',
          targetHex: { q: 0, r: 0 },
          range: 2,
          damage: { minimum: 20, maximum: 30 },
          retargeted: true,
          responseReceived: false,
        },
      },
    ],
  });
  expect(html).toContain('Объявленные угрозы');
  expect(html).toContain('Удар 20–30 до брони · клетка 0, 0');
  expect(html).toContain('больше не сменит цель');
  expect(html).toContain('До удара — ваш ответный ход');
});

it('distinguishes surrendered from dead and shows a visible terminal result with restart', () => {
  const html = renderToStaticMarkup(
    <BattleView
      view={{
        ...view,
        status: 'resolved',
        activation: null,
        outcome: { reason: 'last-side-standing', winnerSideId: 'human' },
        sides: [...view.sides, { id: 'opponent', retreatHexes: [] }],
        units: [view.units[0]!, { ...view.units[1]!, status: 'surrendered' }],
      }}
      selectedUnitId="B001"
      selectedHex={null}
      onSelectUnit={() => {}}
      onSelectHex={() => {}}
      onRestart={() => {}}
      onEditor={() => {}}
    />,
  );
  expect(html).toContain('aria-label="Результат боя"');
  expect(html).toContain('<h2>Победа</h2>');
  expect(html).toContain('У противника не осталось бойцов в строю.');
  expect(html).not.toContain('aria-label="Действующий боец"');
  expect(html).not.toContain('aria-label="Состояние: Волк"');
  expect(html).toContain('data-unit-id="B001"');
  expect(html).toContain('Сдался');
  expect(html).toContain('Осмотреть поле');
  expect(html).toContain('aria-expanded="true"');
  expect(html).toContain('Начать заново');
  expect(html).toContain('К редактору');
  expect(html).not.toContain('data-attackable="true"');
});

it('shows every final fighter once on its side, preserving duplicate names and exact observations', () => {
  const units: CombatLabView['units'] = [
    { ...view.units[0]!, name: 'Тёзка', wounds: ['minor', 'severe', 'minor'] },
    {
      ...view.units[0]!,
      id: 'W02',
      name: 'Тёзка',
      status: 'retreated',
      pools: {
        ...view.units[0]!.pools,
        health: { current: 7, maximum: 33 },
        armor: { current: 0, maximum: 0 },
      },
    },
    {
      ...view.units[1]!,
      status: 'dead',
      wounds: ['severe', 'severe'],
      pools: { ...view.units[1]!.pools, health: { current: 0, maximum: 31 } },
    },
    { ...view.units[1]!, id: 'B002', status: 'surrendered' },
  ];
  const html = render({
    ...view,
    status: 'resolved',
    activation: null,
    outcome: { reason: 'last-side-standing', winnerSideId: 'human' },
    sides: [...view.sides, { id: 'opponent', retreatHexes: [] }],
    units,
  });
  const result = html.slice(html.indexOf('aria-label="Результат боя"'), html.indexOf('</footer>'));
  const own = result.slice(
    result.indexOf('data-side-id="human"'),
    result.indexOf('data-side-id="opponent"'),
  );
  const enemy = result.slice(result.indexOf('data-side-id="opponent"'));
  for (const id of ['W01', 'W02']) expect(own).toContain(`data-unit-id="${id}"`);
  for (const id of ['B001', 'B002']) expect(enemy).toContain(`data-unit-id="${id}"`);
  for (const unit of units)
    expect(result.match(new RegExp(`data-unit-id="${unit.id}"`, 'g'))).toHaveLength(1);
  expect(result.match(/class="battle-portrait"/g)).toHaveLength(4);
  expect(result.match(/>Тёзка</g)).toHaveLength(2);
  for (const text of [
    'Здоровье 9/31',
    'Броня 4/11',
    'Здоровье 7/33',
    'Броня 0/0',
    'Здоровье 0/31',
    'Лёгкие: 2',
    'Тяжёлые: 1',
    'Тяжёлые: 2',
    'Нет ранений',
    'В строю',
    'Отступил',
    'Погиб',
    'Сдался',
  ])
    expect(result).toContain(text);
});

it('renders legacy terminal identities and portraits without optional preview or hint fields', () => {
  const historical = { ...view };
  delete historical.ruleHints;
  delete historical.movementPreview;
  delete historical.attackPreview;
  const units = view.units.map((unit) => {
    const legacy = { ...unit };
    delete legacy.name;
    delete legacy.profileId;
    return legacy;
  });
  const html = render({
    ...historical,
    units,
    sides: [...view.sides, { id: 'opponent', retreatHexes: [] }],
    status: 'resolved',
    activation: null,
    outcome: { reason: 'round-limit', winnerSideId: null },
  });
  const result = html.slice(html.indexOf('aria-label="Результат боя"'));
  expect(result).toContain('>W01<');
  expect(result).toContain('>B001<');
  expect(result.match(/class="battle-portrait"/g)).toHaveLength(2);
  expect(result).toContain('Здоровье 9/31');
});

it('renders the original guarded round-limit survivor without terminal condition policy', () => {
  const survivor = {
    ...view.units[0]!,
    guarding: true,
    shieldBraceRank: 1 as const,
    panicking: false,
    wounds: ['minor', 'severe', 'minor'] as const,
    pools: {
      ...view.units[0]!.pools,
      morale: { current: 25, maximum: 90 },
      stamina: { current: 10, maximum: 40 },
    },
  };
  const html = render({
    ...view,
    status: 'resolved',
    activation: null,
    outcome: { reason: 'round-limit', winnerSideId: null },
    units: [survivor, view.units[1]!],
  });
  expect(html).toContain('<h2>Ничья</h2>');
  expect(html).toContain('Достигнут предел раундов.');
  expect(html).toContain('Здоровье 9/31');
  expect(html).toContain('Лёгкие: 2');
  expect(html).toContain('Тяжёлые: 1');
  expect(html).toContain('В строю');
  for (const text of [
    'Дрогнул',
    'Истощён',
    'до следующего хода',
    'Упор щитом',
    'Приказы действующему бойцу',
  ])
    expect(html).not.toContain(text);
  expect(html).toContain('Показать всю сетку');
  expect(html).toContain('Ночная сцена');
});

it('explains defeat from the controlled side while enemies remain active', () => {
  const html = render({
    ...view,
    status: 'resolved',
    activation: null,
    outcome: { reason: 'last-side-standing', winnerSideId: 'opponent' },
    units: [{ ...view.units[0]!, status: 'retreated' }, view.units[1]!],
  });
  expect(html).toContain('<h2>Поражение</h2>');
  expect(html).toContain('В вашем отряде не осталось бойцов в строю.');
  expect(html).not.toContain('У противника не осталось бойцов в строю.');
});

it('keeps acting authority independent of the inspected enemy and accepts parent commands/menu', () => {
  const html = renderToStaticMarkup(
    <BattleView
      view={view}
      selectedUnitId="B001"
      selectedHex={null}
      onSelectUnit={() => {}}
      onSelectHex={() => {}}
      menu={<button>Меню боя</button>}
    >
      <button disabled>Приказ ожидает ответа</button>
    </BattleView>,
  );
  const actor = html.slice(
    html.indexOf('aria-label="Действующий боец"'),
    html.indexOf('class="battle-dock-orders"'),
  );
  expect(actor).toContain('Щитник');
  expect(actor).not.toContain('Волк');
  expect(actor).toContain('Очки действий: 3 из 4');
  expect(actor.match(/data-filled="true"/g)).toHaveLength(3);
  expect(actor.match(/data-filled="false"/g)).toHaveLength(1);
  expect(html).toContain('Меню боя');
  expect(html).toContain('Приказ ожидает ответа');
  expect(html).toContain('Состояние: Волк');
});

it('marks only server-preview enemies attackable while keeping all units inspectable', () => {
  expect(render().match(/data-attackable="true"/g)).toHaveLength(1);
  expect(render({ ...view, attackPreview: [] })).not.toContain('data-attackable="true"');
  expect(render({ ...view, activation: { ...view.activation!, actorId: 'B001' } })).not.toContain(
    'data-attackable="true"',
  );
});

it('renders path cost, remaining AP and lethal fire only from movement observations', () => {
  const html = renderToStaticMarkup(
    <BattleView
      view={{ ...view, movementPreview: [{ ...view.movementPreview![0]!, fireDamage: 9 }] }}
      selectedUnitId={null}
      selectedHex={{ q: 1, r: 0 }}
      onSelectUnit={() => {}}
      onSelectHex={() => {}}
    />,
  );
  expect(html).toContain('2 клетки пути');
  expect(html).toContain('Будет потрачено 2 ОД, останется 1 из 4');
  expect(html.match(/data-ap="spent"/g)).toHaveLength(2);
  expect(html.match(/data-ap="remaining"/g)).toHaveLength(1);
  expect(html.match(/data-ap="empty"/g)).toHaveLength(1);
  expect(html).toContain('цена пути');
  expect(html).toContain('останется');
  expect(html).toContain('2 ОД · 3 сил');
  expect(html).toContain('Боец погибнет на пути и не достигнет клетки.');
});

it('previews the selected path while retaining an enemy inspection card', () => {
  const html = renderToStaticMarkup(
    <BattleView
      view={view}
      selectedUnitId="B001"
      selectedHex={{ q: 1, r: 0 }}
      onSelectUnit={() => {}}
      onSelectHex={() => {}}
    />,
  );
  expect(html).toContain('ПКМ — идти');
  expect(html).toContain('Будет потрачено 2 ОД, останется 1 из 4');
  expect(html).not.toContain('Шанс попадания 68%');
  expect(html).toContain('Состояние: Волк');
});

it('shows canonical guarding and wounds without inventing demonstration effects', () => {
  const html = render({
    ...view,
    units: [{ ...view.units[0]!, guarding: true, wounds: ['severe'] }, view.units[1]!],
  });
  expect(html).toContain('Защита');
  expect(html).toContain('Ранений: 1');
  expect(html).toContain('тяжёлое');
  const braced = render({
    ...view,
    units: [
      { ...view.units[0]!, guarding: true, shieldBraceRank: 3, guardDamageReductionPercent: 50 },
      view.units[1]!,
    ],
  });
  expect(braced).toContain('Упор щитом · ранг 3');
  expect(braced).toContain('−50%');
  for (const invented of ['Отравлен', 'Горит', 'Готовит приём', 'Агрессия', 'Испуган'])
    expect(html).not.toContain(invented);
});

it('uses canonical shaken and low-stamina boundaries without inferring aggression', () => {
  const low = {
    ...view.units[0]!,
    pools: {
      ...view.units[0]!.pools,
      morale: { current: 25, maximum: 90 },
      stamina: { current: 10, maximum: 40 },
    },
  };
  const html = render({ ...view, units: [low, view.units[1]!] });
  expect(html).toContain('Дрогнул: точность и защита');
  expect(html).toContain('Истощён: точность');
  const recovered = render({
    ...view,
    units: [
      {
        ...low,
        pools: {
          ...low.pools,
          morale: { current: 26, maximum: 90 },
          stamina: { current: 11, maximum: 40 },
        },
      },
      view.units[1]!,
    ],
  });
  expect(recovered).not.toContain('Дрогнул');
  expect(recovered).not.toContain('Истощён');
  const historical = { ...view };
  delete historical.ruleHints;
  expect(render({ ...historical, units: [low, view.units[1]!] })).not.toContain('Дрогнул');
});

it('renders learned skills with ranks and canonical costs, plus overflow instead of a four-skill cap', () => {
  const skillIds = [
    'shield-brace',
    'armor-pressure',
    'reach-thrust',
    'aimed-shot',
    'rally',
  ] as const;
  const skills = skillIds.map((skillId) => ({
    skillId,
    name: skillId,
    rank: 2 as const,
    target: 'enemy' as const,
    minimumRange: 1,
    maximumRange: 2,
    actionPointCost: 2,
    staminaCost: 7,
    duration: 'instant' as const,
    description: 'Описание приёма',
    equipmentAvailable: true,
  }));
  const html = renderToStaticMarkup(
    <BattleView
      view={{
        ...view,
        skills,
        skillPreview: skills.map((skill) => ({
          ...skill,
          rulesetId: 'sprite-prototype-v3',
          revision: 7,
          activationId: 'activation',
          actorId: 'W01',
          targetId: 'B001',
          legal: true,
        })),
      }}
      selectedUnitId="B001"
      selectedHex={null}
      onSelectUnit={() => {}}
      onSelectHex={() => {}}
    />,
  );
  expect(html).toContain('shield-brace · ранг 2');
  expect(html).toContain('2 ОД · 7 сил');
  expect(html).toContain('Ещё +1');
  expect(html).not.toContain('ещё не реализован');
});

it('explains unavailable equipment and absent skill targets without blaming the inspected unit', () => {
  const skill = {
    skillId: 'aimed-shot' as const,
    name: 'Прицельный выстрел',
    rank: 1 as const,
    target: 'enemy' as const,
    minimumRange: 2,
    maximumRange: 4,
    actionPointCost: 4,
    staminaCost: 24,
    duration: 'instant' as const,
    description: 'Прицельный выстрел из лука',
    equipmentAvailable: true,
  };
  const preview = {
    ...skill,
    rulesetId: 'sprite-prototype-v3' as const,
    revision: view.viewRevision,
    activationId: 'activation',
    actorId: 'W01',
    targetId: 'W01',
    legal: false,
    reason: 'INVALID_TARGET',
  };
  const observation = {
    ...view,
    skills: [skill],
    skillPreview: [preview, { ...preview, targetId: 'B001', reason: 'OUT_OF_RANGE' }],
  };
  expect(render(observation)).toContain('Нет подходящей цели в зоне приёма · дальность 2–4.');
  expect(render({ ...observation, skills: [{ ...skill, equipmentAvailable: false }] })).toContain(
    'Текущее снаряжение не подходит для этого приёма.',
  );
  expect(
    render({
      ...observation,
      skillPreview: [
        preview,
        { ...preview, targetId: 'B001', reason: 'INSUFFICIENT_ACTION_POINTS' },
      ],
    }),
  ).toContain('Не хватает очков действий.');
});

it('identifies the selected blocked hex without offering a move forecast', () => {
  const blocked = { q: 2, r: 0 };
  const html = renderToStaticMarkup(
    <BattleView
      view={{ ...view, map: { ...view.map, blocked: [blocked] } }}
      selectedUnitId={null}
      selectedHex={blocked}
      onSelectUnit={() => {}}
      onSelectHex={() => {}}
    />,
  );
  expect(html).toContain('aria-label="Непроходимая клетка"');
  expect(html).toContain('Завал · клетка 2, 0');
  expect(html).toContain('Непроходимо');
  expect(html).not.toContain('aria-label="Предпросмотр действия"');
});

it('labels pinned weapon reach as inspection without changing the active fighter', () => {
  const inspected = {
    ...view,
    units: view.units.map((unit) => ({
      ...unit,
      weaponReach: { minimumRange: 1, maximumRange: unit.id === 'B001' ? 2 : 1, cells: [] },
    })),
  };
  const html = renderToStaticMarkup(
    <BattleView
      view={inspected}
      selectedUnitId="B001"
      selectedHex={null}
      onSelectUnit={() => {}}
      onSelectHex={() => {}}
    />,
  );
  expect(html).toContain('Дальность выбранного оружия');
  expect(html).toContain('Волк · ');
  expect(html).toContain('1–2');
  expect(html).toContain(' · осмотр');
  expect(html).toContain('Ход: Щитник');
});

it('retains weapon reach with an explicit AP warning instead of implying a legal attack', () => {
  const spent = {
    ...view,
    ruleHints: {
      ...view.ruleHints!,
      weapons: [{ id: 'sword-shield' as const, actionPointCost: 3, staminaCost: 12 }],
    },
    activation: { ...view.activation!, actionPoints: { current: 0, maximum: 4 } },
    attackPreview: [],
    units: view.units.map((unit) => ({
      ...unit,
      weaponReach: { minimumRange: 1, maximumRange: 1, cells: [] },
    })),
  };
  const html = renderToStaticMarkup(
    <BattleView
      view={spent}
      selectedUnitId="W01"
      selectedHex={null}
      onSelectUnit={() => {}}
      onSelectHex={() => {}}
    />,
  );
  expect(html).toContain('Дальность выбранного оружия');
  expect(html).toContain('не хватает ОД');
  expect(html).not.toContain('Можно атаковать');
});

it('removes acted portraits and keeps the actual actor at the start of the received queue', () => {
  const html = renderToStaticMarkup(
    <BattleView
      view={{ ...view, turnIndex: 1, activation: { ...view.activation!, actorId: 'B001' } }}
      selectedUnitId={null}
      selectedHex={null}
      onSelectUnit={() => {}}
      onSelectHex={() => {}}
    />,
  );
  expect(html).not.toContain('data-unit-id="W01"');
  expect(html).toContain('data-unit-id="B001"');
  expect(html).toContain('aria-current="step"');
  expect(html).not.toContain('ПОРЯДОК НЕИЗВЕСТЕН');
});

it('uses the canonical forecast order and never sorts it in the browser', () => {
  const before = render({ ...view, nextRoundInitiative: { round: 3, unitIds: ['B001', 'W01'] } });
  const nextQueue = before.slice(before.indexOf('aria-label="Прогноз следующего раунда"'));
  expect(nextQueue.indexOf('data-unit-id="B001"')).toBeLessThan(
    nextQueue.indexOf('data-unit-id="W01"'),
  );
  expect(before.match(/aria-current="step"/g)).toHaveLength(1);
  expect(before).not.toContain('ПОРЯДОК НЕИЗВЕСТЕН');
  const after = render({ ...view, nextRoundInitiative: { round: 3, unitIds: ['W01', 'B001'] } });
  const changedQueue = after.slice(after.indexOf('aria-label="Прогноз следующего раунда"'));
  expect(changedQueue.indexOf('data-unit-id="W01"')).toBeLessThan(
    changedQueue.indexOf('data-unit-id="B001"'),
  );
});

it('does not show an unavailable forecast or departed combatant in the live queue', () => {
  const html = render({
    ...view,
    units: view.units.map((unit) =>
      unit.id === 'B001' ? { ...unit, status: 'retreated' as const } : unit,
    ),
  });
  expect(html).not.toContain('data-unit-id="B001"');
  expect(html).not.toContain('aria-label="Прогноз следующего раунда"');
});

it('shows one actor card without a duplicate inspection or neutral terrain badge', () => {
  const html = renderToStaticMarkup(
    <BattleView
      view={view}
      selectedUnitId="W01"
      selectedHex={null}
      onSelectUnit={() => {}}
      onSelectHex={() => {}}
    />,
  );
  expect(html).toContain('aria-label="Действующий боец"');
  expect(html).not.toContain('aria-label="Состояние: Щитник"');
  expect(html).not.toContain('Высота +0');
  expect(html).not.toContain('ЛКМ — осмотр');
  const other = render();
  expect(other).toContain('aria-label="Состояние: Волк"');
  expect(other).toContain('Высота +1');
  expect(other).toContain('Огонь');
});
