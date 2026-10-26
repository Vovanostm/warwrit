import type { Pixel } from './porechye-navigation.js';

export interface ContractCopy {
  readonly place: string;
  readonly issuerAt: string;
  readonly title: string;
  readonly issuer: string;
  readonly kind: string;
  readonly brief: string;
  readonly scene: readonly { readonly speaker: string; readonly text: string }[];
  readonly objective: string;
  readonly description: string;
}
export interface AtlasContract extends ContractCopy {
  readonly id: string;
  readonly tile: 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';
  readonly at: Pixel;
  readonly label: Pixel;
  readonly major: boolean;

  readonly evidence: string;
  readonly choice: string;
  readonly outcomes: readonly string[];
  readonly authorTruth: string;
  readonly status: 'proposal';
  readonly en: ContractCopy;
}
// Authored proposals. No runtime quest or reward is created. The workshop card
// shows title, issuer/kind, brief, named scene turns, objective, description in
// that order. evidence/choice/outcomes/authorTruth stay in the designer record.
export const atlasContracts: readonly AtlasContract[] = [
  {
    id: 'draft.porechye.atlas.01',
    tile: 'nw',
    place: 'Смолокурня',
    at: [450, 330],
    label: [450, 288],
    major: false,
    title: 'Смола на оси',
    issuer: 'Авдотья Круглова, хозяйка смолокурни',
    issuerAt: 'Березняк',
    kind: 'Сопровождение',
    brief:
      'Доведите телегу со смолой от лесных ям до Березняка. У возчика одна лошадь и ни одного помощника.',
    scene: [
      {
        speaker: 'Авдотья Круглова, хозяйка смолокурни',
        text: 'Ступица греется. Я ему говорю: стой, а он на рынок торопится.',
      },
      {
        speaker: 'Авдотья Круглова, хозяйка смолокурни',
        text: 'Возьмите запасную ось. За дорогу сама заплачу.',
      },
    ],
    objective: 'Встретить возчика у смолокурни и довести телегу до двора в Березняке.',
    evidence:
      'Возчик, лошадь и телега действительно прибыли вместе; состояние груза осмотрено при передаче.',
    choice: 'Чинить колесо перед выходом или вести тяжёлую телегу длинной ровной дорогой.',
    outcomes: [
      'После ремонта телега выходит позже, но возчик сохраняет груз.',
      'Длинный обход требует больше пути и корма; доставку всё равно надо завершить.',
    ],
    authorTruth:
      'Авдотья заложила будущую варку, чтобы нанять возчика. Она не крала груз и не готовит засаду.',
    description: 'Земляные печи, бочки и крытый навес у тёмной опушки.',
    status: 'proposal',
    en: {
      title: 'Tar on the Axle',
      issuer: 'Avdotya Kruglova, tar maker',
      kind: 'Escort',
      brief:
        'Bring the tar cart from the forest kilns to Bereznyak. The carter has one horse and no helper.',
      scene: [
        {
          speaker: 'Avdotya Kruglova, tar maker',
          text: 'The hub is hot. I tell him to stop; he wants to reach the market.',
        },
        {
          speaker: 'Avdotya Kruglova, tar maker',
          text: 'Take a spare axle. I will pay for the escort myself.',
        },
      ],
      objective: 'Meet the carter at the kilns and bring the cart to the yard in Bereznyak.',
      description: 'Earth kilns, barrels and a roofed shelter by the dark woodland edge.',
      place: 'Tar Kilns',
      issuerAt: 'Bereznyak',
    },
  },
  {
    id: 'draft.porechye.atlas.02',
    tile: 'nw',
    place: 'Ловчая стоянка',
    at: [1120, 300],
    label: [1120, 258],
    major: false,
    title: 'Чужой силок',
    issuer: 'Степан Лобанов, зверолов',
    issuerAt: 'Березняк',
    kind: 'Розыск',
    brief: 'На тропе к стоянке стоят чужие силки. Найдите хозяина: вчера в петлю попал наш пёс.',
    scene: [
      {
        speaker: 'Степан Лобанов, зверолов',
        text: 'У меня петли из конского волоса. Здесь проволока.',
      },
      {
        speaker: 'Человек из отряда',
        text: 'Пёс даст подойти?',
      },
      {
        speaker: 'Степан Лобанов, зверолов',
        text: 'Дам ему рукав кусать. Вы петлю режьте.',
      },
    ],
    objective: 'Осмотреть силки, освободить пса и найти человека, который их поставил.',
    evidence:
      'Пёс выведен; принадлежность ловушек установлена по осмотру и разговору с владельцем, а не по одной догадке.',
    choice: 'Вернуть ловушки хозяину с условием убрать их с тропы или передать старосте.',
    outcomes: [
      'При соглашении опасная тропа освобождена, а ловец сохраняет снасти.',
      'Староста получает ловушки и спор с их хозяином; компания не объявляет его вором без доказательств.',
    ],
    authorTruth:
      'Силки поставил соседний ловец, чьи старые участки заняли лесорубы. Он не желал покалечить собаку.',
    description: 'Две низкие палатки, стойки для шкур и узкая тропа среди сосен.',
    status: 'proposal',
    en: {
      title: "Someone Else's Snare",
      issuer: 'Stepan Lobanov, trapper',
      kind: 'Search',
      brief:
        'Someone has set wire snares on the camp trail. Find the setter. Our dog was caught yesterday.',
      scene: [
        {
          speaker: 'Stepan Lobanov, trapper',
          text: 'My loops are horsehair. This is wire.',
        },
        {
          speaker: 'Company member',
          text: 'Will the dog let us close?',
        },
        {
          speaker: 'Stepan Lobanov, trapper',
          text: 'I will let him bite my sleeve. Cut the loop.',
        },
      ],
      objective: 'Inspect the snares, free the dog and find whoever set them.',
      description: 'Two low tents, hide racks and a narrow trail among the pines.',
      place: 'Trappers’ Camp',
      issuerAt: 'Bereznyak',
    },
  },
  {
    id: 'draft.porechye.atlas.03',
    tile: 'nw',
    place: 'Старая сторожка',
    at: [760, 790],
    label: [760, 748],
    major: false,
    title: 'Дым над сторожкой',
    issuer: 'Яким Суворов, углежог',
    issuerAt: 'Смолокурня',
    kind: 'Помощь человеку',
    brief:
      'У сторожки дымит труба, а хозяин третий день не выходит. Отнесите воду и проверьте, жив ли он.',
    scene: [
      {
        speaker: 'Яким Суворов, углежог',
        text: 'Дверь у него подпёрта изнутри. Не выбивайте сразу.',
      },
      {
        speaker: 'Яким Суворов, углежог',
        text: 'Он чужих не любит. Назовите меня.',
      },
    ],
    objective: 'Добраться до сторожки, установить состояние хозяина и помочь ему выйти к людям.',
    evidence:
      'Нужен встреченный живой человек и его фактическое сопровождение либо отдельно подтверждённый иной исход.',
    choice:
      'Уговорить хозяина открыть дверь или искать безопасный вход, если он не может ответить.',
    outcomes: [
      'При согласии хозяин выходит с помощью компании.',
      'Если помощь не оказана, возвращается сообщение о наблюдённом состоянии, а не выдуманная смерть.',
    ],
    authorTruth:
      'Хозяин сильно ушиб ногу и боится оставить накопленные дрова. Яким обещал ему помощь, но задержался с работой.',
    description: 'Покосившаяся деревянная сторожка на сухом бугре у старой дороги.',
    status: 'proposal',
    en: {
      title: 'Smoke above the Hut',
      issuer: 'Yakim Suvorov, charcoal burner',
      kind: 'Aid',
      brief:
        'Smoke rises from the watch hut, but its owner has not emerged for three days. Bring water and check on him.',
      scene: [
        {
          speaker: 'Yakim Suvorov, charcoal burner',
          text: 'His door is barred from inside. Do not break it down yet.',
        },
        {
          speaker: 'Yakim Suvorov, charcoal burner',
          text: 'He dislikes strangers. Tell him I sent you.',
        },
      ],
      objective: 'Reach the hut, check on its owner and help him get back to people.',
      description: 'A leaning timber watch hut on a dry knoll beside an old road.',
      place: 'Old Watch Hut',
      issuerAt: 'Tar Kilns',
    },
  },
  {
    id: 'draft.porechye.atlas.04',
    tile: 'n',
    place: 'Житный амбар',
    at: [1000, 585],
    label: [1000, 515],
    major: true,
    title: 'Сбитая мерка',
    issuer: 'Дарья Боброва, амбарная смотрительница',
    issuerAt: 'Северный Двор',
    kind: 'Проверка меры',
    brief: 'В амбаре меряют зерно чужим коробом. Сверьте его с нашим, пока не начали раздачу.',
    scene: [
      {
        speaker: 'Дарья Боброва, амбарная смотрительница',
        text: 'Короб тот же на вид. Дно у него выше.',
      },
      {
        speaker: 'Человек из отряда',
        text: 'Кто подменил?',
      },
      {
        speaker: 'Дарья Боброва, амбарная смотрительница',
        text: 'Сперва померьте. Кричать мы и без вас умеем.',
      },
    ],
    objective: 'Сравнить две меры на одном зерне и установить, сколько расходится объём.',
    evidence:
      'Записаны оба наблюдённых отмера и происхождение коробов; несоответствие не доказывает само по себе умысел.',
    choice: 'Остановить раздачу до повторного отмера или сначала отделить уже отмеренные мешки.',
    outcomes: [
      'Повторный отмер выявляет недостачу до выдачи остального зерна.',
      'Отделённые мешки позволяют проверить прошлую выдачу, но люди ждут дольше.',
    ],
    authorTruth:
      'Новый короб тесал ученик по неверной зарубке. Дарья подозревает сборщика, с которым давно спорит.',
    description: 'Длинный хлебный амбар с сухой площадкой для телег.',
    status: 'proposal',
    en: {
      title: 'The Short Measure',
      issuer: 'Darya Bobrova, granary keeper',
      kind: 'Checking measures',
      brief:
        "They are measuring grain with someone else's box. Compare it with ours before they start handing it out.",
      scene: [
        {
          speaker: 'Darya Bobrova, granary keeper',
          text: 'It looks the same. The bottom sits higher.',
        },
        {
          speaker: 'Company member',
          text: 'Who changed it?',
        },
        {
          speaker: 'Darya Bobrova, granary keeper',
          text: 'Measure first. We can do the shouting ourselves.',
        },
      ],
      objective: 'Compare both measures using the same grain and work out the difference.',
      description: 'A long grain barn with a dry cart yard.',
      place: 'Grain Barn',
      issuerAt: 'Severny Dvor',
    },
  },
  {
    id: 'draft.porechye.atlas.05',
    tile: 'n',
    place: 'Садовый хутор',
    at: [450, 300],
    label: [450, 258],
    major: true,
    title: 'Лестница в саду',
    issuer: 'Милана Горелова, садовница',
    issuerAt: 'Житный амбар',
    kind: 'Хозяйственная работа',
    brief:
      'Уберите сломанную лестницу и помогите снять последние груши. Одних рук мне на сад не хватает.',
    scene: [
      {
        speaker: 'Милана Горелова, садовница',
        text: 'Верхние для сушки, нижние ребятам.',
      },
      {
        speaker: 'Человек из отряда',
        text: 'А гнилые?',
      },
      {
        speaker: 'Милана Горелова, садовница',
        text: 'Козам. Вон корзина у лестницы.',
      },
    ],
    objective: 'Обезопасить лестницу, собрать плоды с отмеченных деревьев и передать их хозяйке.',
    evidence:
      'Работа проверяется осмотром участка и передачей собранного; обещание собрать урожай не считается результатом.',
    choice: 'Починить лестницу или работать с земли шестом, сохраняя часть плодов на ветвях.',
    outcomes: [
      'Исправная лестница позволяет снять верхние плоды и остаётся в хозяйстве.',
      'Работа шестом безопаснее при недостатке материала, но часть плодов остаётся.',
    ],
    authorTruth:
      'Милана бережёт лучшие груши к приезду дочери. В её просьбе нет скрытой кражи или проклятия.',
    description: 'Жилой хутор с рядами старых плодовых деревьев и сушильным навесом.',
    status: 'proposal',
    en: {
      title: 'The Orchard Ladder',
      issuer: 'Milana Gorelova, orchard keeper',
      kind: 'Farm work',
      brief:
        'Remove the broken ladder and help pick the last pears. I cannot manage the orchard alone.',
      scene: [
        {
          speaker: 'Milana Gorelova, orchard keeper',
          text: 'The upper ones are for drying. The lower ones for the children.',
        },
        {
          speaker: 'Company member',
          text: 'And the rotten ones?',
        },
        {
          speaker: 'Milana Gorelova, orchard keeper',
          text: 'For the goats. The basket is by the ladder.',
        },
      ],
      objective:
        'Make the ladder safe, gather fruit from the marked trees and give it to the owner.',
      description: 'An inhabited farm among rows of old fruit trees, with a drying shelter.',
      place: 'Orchard Farm',
      issuerAt: 'Grain Barn',
    },
  },
  {
    id: 'draft.porechye.atlas.06',
    tile: 'n',
    place: 'Северный выгон',
    at: [1150, 250],
    label: [1150, 208],
    major: false,
    title: 'До первой травы',
    issuer: 'Клим Сазонов, гуртовщик',
    issuerAt: 'Скотный загон',
    kind: 'Проводка стада',
    brief:
      'Проведите стадо на северный выгон. Молодой бык ломится в рожь, а пастухов осталось двое.',
    scene: [
      {
        speaker: 'Клим Сазонов, гуртовщик',
        text: 'В рожь зайдёт — мне за всё поле платить.',
      },
      {
        speaker: 'Клим Сазонов, гуртовщик',
        text: 'Вы держите край. Скота палками зря не бейте.',
      },
    ],
    objective: 'Провести животных между загонами, не потеряв их по пути и не пустив на посевы.',
    evidence:
      'Стадо реально прибыло в конечный загон; потери и повреждённые посевы учитываются отдельно.',
    choice: 'Короткий проход вдоль пашни или широкий обход по дороге.',
    outcomes: [
      'У короткого пути выше риск потравы, которую нельзя скрыть успешным прибытием.',
      'Обход бережёт посевы, но растягивает проводку и требует больше людей на краях.',
    ],
    authorTruth:
      'Клим выдаёт быка за послушного, потому что покупатель уже заплатил задаток. Остальное стадо спокойно.',
    description: 'Большой огороженный выпас, водопойное корыто и ворота у дороги.',
    status: 'proposal',
    en: {
      title: 'Until the First Grass',
      issuer: 'Klim Sazonov, cattle drover',
      kind: 'Moving cattle',
      brief:
        'Drive the herd to the northern pasture. The young bull keeps heading for the rye. Only two herders remain.',
      scene: [
        {
          speaker: 'Klim Sazonov, cattle drover',
          text: 'If he gets into the rye, I pay for the whole field.',
        },
        {
          speaker: 'Klim Sazonov, cattle drover',
          text: 'Hold the flank. No beating the cattle for nothing.',
        },
      ],
      objective:
        'Move the herd between the pens without losing animals or letting them into the crops.',
      description: 'A broad fenced pasture, a water trough and a gate by the road.',
      place: 'Northern Pasture',
      issuerAt: 'Cattle Pen',
    },
  },
  {
    id: 'draft.porechye.atlas.07',
    tile: 'ne',
    place: 'Торфяные резы',
    at: [1050, 250],
    label: [1050, 208],
    major: false,
    title: 'Торф под водой',
    issuer: 'Домна Ершова, старшая на выработке',
    issuerAt: 'Гончарная слобода',
    kind: 'Вывоз припасов',
    brief: 'Вывезите сухой торф с нижней площадки. Вода уже подошла к первому штабелю.',
    scene: [
      {
        speaker: 'Домна Ершова, старшая на выработке',
        text: 'Мокрый не берите. Печь им только закоптишь.',
      },
      {
        speaker: 'Человек из отряда',
        text: 'На чём везти?',
      },
      {
        speaker: 'Домна Ершова, старшая на выработке',
        text: 'На волокуше. У сарая лежит, за верёвку потянете.',
      },
    ],
    objective: 'Выбрать пригодный торф, вынести его на сухую площадку и передать приёмщику.',
    evidence:
      'Приёмщик осматривает доставленные партии; мокрый торф не превращается в сухой от отметки в журнале.',
    choice: 'Перетаскать торф малыми связками или взять широкую волокушу для более тяжёлой партии.',
    outcomes: [
      'Малые связки требуют больше ходок; оставшийся торф всё ещё может намокнуть.',
      'Волокуша берёт больше груза, но вязнет в размокшей колее; нужна сухая дорога.',
    ],
    authorTruth:
      'Домна оставила нижний штабель ради чужого заказа. Она стыдится просить работников признать ошибку.',
    description: 'Тёмные торфяные выработки, штабели сухих брикетов и небольшой рабочий навес.',
    status: 'proposal',
    en: {
      title: 'Peat under Water',
      issuer: 'Domna Yershova, peat crew leader',
      kind: 'Moving supplies',
      brief: 'Bring the dry peat off the lower platform. Water has reached the first stack.',
      scene: [
        {
          speaker: 'Domna Yershova, peat crew leader',
          text: 'Leave the wet peat. It will only smoke up the kiln.',
        },
        {
          speaker: 'Company member',
          text: 'What do we carry it on?',
        },
        {
          speaker: 'Domna Yershova, peat crew leader',
          text: 'The drag by the shed. Pull it by the rope.',
        },
      ],
      objective: 'Select usable peat, move it to dry ground and hand it over.',
      description: 'Dark peat cuttings, stacks of dried blocks and a small work shelter.',
      place: 'Peat Cuttings',
      issuerAt: 'Potters’ Hamlet',
    },
  },
  {
    id: 'draft.porechye.atlas.08',
    tile: 'ne',
    place: 'Просевшая гать',
    at: [700, 700],
    label: [700, 658],
    major: false,
    title: 'Последний настил',
    issuer: 'Прохор Свешников, дорожный плотник',
    issuerAt: 'Тихая Гать',
    kind: 'Разведка пути',
    brief: 'Пройдите вдоль просевшей гати и отметьте сухой обход. Телеги туда пока не пускайте.',
    scene: [
      {
        speaker: 'Прохор Свешников, дорожный плотник',
        text: 'Пешего выдержит не всякая доска. Щупом сперва.',
      },
      {
        speaker: 'Прохор Свешников, дорожный плотник',
        text: 'Метки ставьте свои, старые в воду ушли.',
      },
    ],
    objective: 'Осмотреть повреждённый участок и пройти предложенный обход до сухого конца.',
    evidence:
      'Нужны наблюдения о повреждениях и реально пройденный маршрут; статичная линия на карте не доказывает пригодность.',
    choice: 'Разметить пеший обход сейчас или принести материал для ограниченного ремонта.',
    outcomes: [
      'Пеший обход не открывает дорогу телегам.',
      'Ремонт считается выполненным только после работ; старое обещание не меняет проходимость.',
    ],
    authorTruth:
      'Прохор знает, что часть свай сгнила давно, но прежде отвечал только за настил. Нового виновника он не видел.',
    description: 'Разошедшиеся деревянные настилы над сырой землёй; сбоку виден сухой крюк тропы.',
    status: 'proposal',
    en: {
      title: 'The Last Boards',
      issuer: 'Prokhor Sveshnikov, road carpenter',
      kind: 'Route survey',
      brief: 'Inspect the sunken causeway and mark a dry detour. Keep the carts off it for now.',
      scene: [
        {
          speaker: 'Prokhor Sveshnikov, road carpenter',
          text: 'Some boards will not even hold a person. Probe them first.',
        },
        {
          speaker: 'Prokhor Sveshnikov, road carpenter',
          text: 'Use fresh markers. The old ones went under.',
        },
      ],
      objective: 'Inspect the damage and walk the proposed detour all the way to dry ground.',
      description:
        'Split timber walkways over wet ground, with a dry trail bending around the side.',
      place: 'Sunken Causeway',
      issuerAt: 'Tikhaya Gat',
    },
  },
  {
    id: 'draft.porechye.atlas.09',
    tile: 'ne',
    place: 'Зимняя делянка',
    at: [1200, 830],
    label: [1200, 788],
    major: false,
    title: 'Собаки у делянки',
    issuer: 'Остап Марков, лесоруб',
    issuerAt: 'Пильный стан',
    kind: 'Защита работников',
    brief:
      'Стая собак не пускает нас к дровам. Отведите её от делянки или защитите людей при вывозе.',
    scene: [
      {
        speaker: 'Остап Марков, лесоруб',
        text: 'Одна ещё с ошейником. Остальные к рукам не идут.',
      },
      {
        speaker: 'Остап Марков, лесоруб',
        text: 'Мне дрова нужны. За каждую шкуру платить не стану.',
      },
    ],
    objective: 'Обеспечить безопасный вывоз дров, установив, что происходит со стаей.',
    evidence:
      'Нужно реальное устранение угрозы для работников; один найденный ошейник не доказывает безопасность.',
    choice: 'Увести собак приманкой и перекрыть доступ либо вступить в столкновение при нападении.',
    outcomes: [
      'При отводе стаи вывоз проходит без боя, если собаки действительно не вернулись к работникам.',
      'При столкновении учитываются его реальные исходы и потери; число шкур не заменяет цель.',
    ],
    authorTruth:
      'Остап оставлял отходы у делянки, пока собак было мало. Он не хочет говорить об этом нанятым людям.',
    description: 'Свежая лесная вырубка с поленницами и санным волоком.',
    status: 'proposal',
    en: {
      title: 'Dogs at the Clearing',
      issuer: 'Ostap Markov, woodcutter',
      kind: 'Protecting workers',
      brief:
        'The dogs keep us from the firewood. Lead them away or guard the workers while they bring it out.',
      scene: [
        {
          speaker: 'Ostap Markov, woodcutter',
          text: 'One still has a collar. The others will not come near a hand.',
        },
        {
          speaker: 'Ostap Markov, woodcutter',
          text: 'I need firewood. I am not paying for each hide.',
        },
      ],
      objective: 'Find out what is happening with the pack and get the firewood out safely.',
      description: 'A fresh woodland clearing with woodpiles and a hauling track.',
      place: 'Winter Clearing',
      issuerAt: 'Saw Pit',
    },
  },
  {
    id: 'draft.porechye.atlas.10',
    tile: 'w',
    place: 'Глиняный карьер',
    at: [450, 250],
    label: [450, 208],
    major: false,
    title: 'Плохая глина',
    issuer: 'Арина Белова, мастер обжига',
    issuerAt: 'Гончарная слобода',
    kind: 'Осмотр материала',
    brief:
      'Сходите в карьер за образцами из двух слоёв. Из последней партии горшки лопаются в печи.',
    scene: [
      {
        speaker: 'Арина Белова, мастер обжига',
        text: 'Не с поверхности. Покажите резчику, откуда брали.',
      },
      {
        speaker: 'Арина Белова, мастер обжига',
        text: 'Черепки не выбрасывайте, я их рядом положу.',
      },
    ],
    objective: 'Взять различимые образцы из двух доступных выработок и доставить мастеру.',
    evidence:
      'Происхождение образцов связано с осмотренными слоями; приёмщик сравнивает их с неудачной партией.',
    choice: 'Собирать на безопасном старом срезе или звать резчика к новому, неустойчивому забою.',
    outcomes: [
      'Старый срез даёт ограниченное сравнение без риска у свежей стенки.',
      'Новый слой исследуется только после безопасного доступа; найденный образец сам по себе не чинит весь заказ.',
    ],
    authorTruth:
      'Партии смешали у навеса, а не в карьере. Арина этого пока не знает; осмотр может опровергнуть её подозрение.',
    description: 'Срезы серой глины и пологий съезд для небольших телег.',
    status: 'proposal',
    en: {
      title: 'Bad Clay',
      issuer: 'Arina Belova, potter',
      kind: 'Testing material',
      brief:
        'Bring samples from two quarry layers. Pots made from the last batch crack in the kiln.',
      scene: [
        {
          speaker: 'Arina Belova, potter',
          text: 'Not off the surface. Show the digger where you took it.',
        },
        {
          speaker: 'Arina Belova, potter',
          text: 'Keep the shards. I will lay them alongside.',
        },
      ],
      objective:
        'Take separate samples from two accessible clay cuts and bring them to the potter.',
      description: 'Grey clay cuts and a gentle ramp for small carts.',
      place: 'Clay Quarry',
      issuerAt: 'Potters’ Hamlet',
    },
  },
  {
    id: 'draft.porechye.atlas.11',
    tile: 'w',
    place: 'Заброшенный перевоз',
    at: [780, 430],
    label: [780, 388],
    major: false,
    title: 'Лодка на цепи',
    issuer: 'Савва Карпов, лодочник',
    issuerAt: 'Тихая Гать',
    kind: 'Поиск хозяина вещи',
    brief: 'Лодка у перевоза бьётся о сваи. Найдите хозяина, пока борт не разбило.',
    scene: [
      {
        speaker: 'Савва Карпов, лодочник',
        text: 'Цепь не рубите. Лодка чужая.',
      },
      {
        speaker: 'Савва Карпов, лодочник',
        text: 'Я её раньше чинил: медный гвоздь под кормой увидите.',
      },
    ],
    objective:
      'Защитить борт с берега, не рубя цепь; найти владельца по приметам лодки и разговорам.',
    evidence:
      'Владелец связывается с самой лодкой и её историей ремонта; одной похожей зарубки для передачи мало.',
    choice:
      'Подложить с берега мягкие кранцы между бортом и сваями, не рубя цепь, затем искать хозяина; либо с его согласия вытащить лодку на тот же берег.',
    outcomes: [
      'Кранцы защищают борт, пока лодка остаётся на цепи; состояние и крепление надо проверить на месте.',
      'Хранение требует фактической передачи и не даёт права забрать лодку компании.',
    ],
    authorTruth:
      'Хозяин жив и прячется от взыскателя. Савва не знает, кому тот должен. Переправа через реку не открывается.',
    description: 'Старый причал на северном берегу, одна прикованная лодка и покосившийся сарай.',
    status: 'proposal',
    en: {
      title: 'The Chained Boat',
      issuer: 'Savva Karpov, boatman',
      kind: 'Finding an owner',
      brief:
        'A boat at the old landing is knocking against the piles. Find its owner before the hull splits.',
      scene: [
        {
          speaker: 'Savva Karpov, boatman',
          text: 'Do not cut the chain. The boat belongs to someone.',
        },
        {
          speaker: 'Savva Karpov, boatman',
          text: 'I repaired it once. Look for a copper nail under the stern.',
        },
      ],
      objective:
        'Protect the hull from the bank without cutting the chain, then ask after the owner.',
      description: 'An old landing on the north bank, one chained boat and a leaning shed.',
      place: 'Old Ferry Landing',
      issuerAt: 'Tikhaya Gat',
    },
  },
  {
    id: 'draft.porechye.atlas.12',
    tile: 'w',
    place: 'Затопленный луг',
    at: [1100, 830],
    label: [1100, 788],
    major: false,
    title: 'Сено на кочке',
    issuer: 'Лада Миронова, сенокосница',
    issuerAt: 'Северный Двор',
    kind: 'Заготовка корма',
    brief: 'Вывезите два сухих стога с кочки на дорогу. Коров ещё до весны кормить.',
    scene: [
      {
        speaker: 'Лада Миронова, сенокосница',
        text: 'Верх снимите отдельно: там сухо.',
      },
      {
        speaker: 'Лада Миронова, сенокосница',
        text: 'Продавец мокрое сено мне по цене сухого считает. Сами посмотрите.',
      },
    ],
    objective: 'Добраться до стогов по суше, отделить пригодное сено и доставить его на дорогу.',
    evidence:
      'Передано осмотренное пригодное сено; спор о прежней продаже не решается одной доставкой.',
    choice: 'Нести сухую часть вручную или искать длинный подъезд для волокуши.',
    outcomes: [
      'Ручной вынос оставляет часть сена на лугу.',
      'Подъезд позволяет взять больше только после проверки грунта; нельзя провести телегу через глубокую воду.',
    ],
    authorTruth:
      'Лада уже расплатилась за оба стога и не хочет терять корм. Продавец ошибся с площадкой, а не готовил обман.',
    description: 'Пойменная луговина с сухой кочкой, остатками стогов и тропой к южной дороге.',
    status: 'proposal',
    en: {
      title: 'Hay on the Hummock',
      issuer: 'Lada Mironova, hay cutter',
      kind: 'Gathering fodder',
      brief:
        'Bring two dry haystacks off the hummock to the road. The cows need feeding until spring.',
      scene: [
        {
          speaker: 'Lada Mironova, hay cutter',
          text: 'Take the top off separately. That part is dry.',
        },
        {
          speaker: 'Lada Mironova, hay cutter',
          text: 'The seller charges me for dry hay, even when it is wet. See for yourselves.',
        },
      ],
      objective:
        'Reach the stacks over dry ground, separate the usable hay and bring it to the road.',
      description:
        'A flood meadow with a dry hummock, remnants of haystacks and a trail to the southern road.',
      place: 'Flood Meadow',
      issuerAt: 'Severny Dvor',
    },
  },
  {
    id: 'draft.porechye.atlas.13',
    tile: 'e',
    place: 'Пустая мытарня',
    at: [400, 250],
    label: [400, 208],
    major: true,
    title: 'Лишняя печать',
    issuer: 'Лука Григорьев, обозный писарь',
    issuerAt: 'Постоялый двор',
    kind: 'Проверка документов',
    brief:
      'У пустой мытарни снова берут за проезд. Сверьте их печать с прошлой распиской и узнайте, кто там сидит.',
    scene: [
      {
        speaker: 'Лука Григорьев, обозный писарь',
        text: 'Бумагу не отдавайте. Мне её ещё показывать.',
      },
      {
        speaker: 'Человек из отряда',
        text: 'А если опять денег попросят?',
      },
      {
        speaker: 'Лука Григорьев, обозный писарь',
        text: 'Спросите, кому платим. Имена мне запомните.',
      },
    ],
    objective:
      'Осмотреть требования у мытарни и сопоставить их с имеющимися расписками и названными людьми.',
    evidence:
      'Подозрение проверяется документами и доступными свидетельствами; похожая печать не делает человека виновным.',
    choice:
      'Добиваться объяснения на месте или собрать сведения и вернуться к писарю без столкновения.',
    outcomes: [
      'Разговор может открыть источник нового сбора; его правомерность не объявляется из сцены автоматически.',
      'Собранные сведения позволяют обойти опасное место, но не возвращают чужие деньги сами по себе.',
    ],
    authorTruth:
      'В пустой будке сидят люди прежнего сборщика и собирают его личный долг под старым знаком. Нового права на сбор у них нет.',
    description: 'Низкая пустая дорожная будка и брошенный шлагбаум, без нового моста.',
    status: 'proposal',
    en: {
      title: 'One Seal Too Many',
      issuer: 'Luka Grigoryev, caravan clerk',
      kind: 'Checking papers',
      brief:
        'Someone is charging tolls at the empty booth again. Compare their seal with the old receipt and ask who they are.',
      scene: [
        {
          speaker: 'Luka Grigoryev, caravan clerk',
          text: 'Keep the paper. I still need to show it.',
        },
        {
          speaker: 'Company member',
          text: 'What if they demand more money?',
        },
        {
          speaker: 'Luka Grigoryev, caravan clerk',
          text: 'Ask whom we are paying. Remember the names for me.',
        },
      ],
      objective: 'Check the demands at the booth against the receipts and the names given.',
      description: 'A low abandoned toll booth and a fallen barrier, with no new bridge.',
      place: 'Empty Toll Booth',
      issuerAt: 'Roadside Inn',
    },
  },
  {
    id: 'draft.porechye.atlas.14',
    tile: 'e',
    place: 'Плотницкий двор',
    at: [1100, 420],
    label: [1100, 378],
    major: false,
    title: 'Поперёк волокон',
    issuer: 'Роман Туров, плотник',
    issuerAt: 'Постоялый двор',
    kind: 'Починка',
    brief: 'Осмотрите запас во дворе и помогите заменить треснувшую ось. Обоз ждёт у развилки.',
    scene: [
      {
        speaker: 'Роман Туров, плотник',
        text: 'Сучок у края видите? По нему ось и расколется.',
      },
      {
        speaker: 'Роман Туров, плотник',
        text: 'Старую ось рядом положите, мерить будем по ней.',
      },
    ],
    objective:
      'Вместе с плотником выбрать подходящую заготовку и заменить повреждённую часть телеги.',
    evidence:
      'Починка подтверждается выполненной работой и осмотром телеги; принесённая доска ещё не готовая ось.',
    choice: 'Ждать подходящего дерева или разгрузить телегу и вести её после ограниченной починки.',
    outcomes: [
      'Полная замена задерживает обоз на месте до конца работы.',
      'Ограниченная починка не разрешает прежнюю нагрузку; часть груза остаётся на отдельной подводе.',
    ],
    authorTruth:
      'Роман обещал срок, не проверив запас. Он не пытается подсунуть гниль, но боится потерять заказ.',
    description: 'Плотницкий двор с козлами, сухими брёвнами и ручной пилой.',
    status: 'proposal',
    en: {
      title: 'Across the Grain',
      issuer: 'Roman Turov, carpenter',
      kind: 'Repair',
      brief:
        'Inspect the timber in the yard and help replace a cracked axle. The caravan waits at the fork.',
      scene: [
        {
          speaker: 'Roman Turov, carpenter',
          text: 'See that knot by the edge? The axle will split there.',
        },
        {
          speaker: 'Roman Turov, carpenter',
          text: 'Lay the old axle beside it. We will measure from that.',
        },
      ],
      objective: 'Choose suitable timber with the carpenter and replace the damaged cart part.',
      description: "A carpenter's yard with trestles, dry logs and a hand saw.",
      place: 'Carpenter’s Yard',
      issuerAt: 'Roadside Inn',
    },
  },
  {
    id: 'draft.porechye.atlas.15',
    tile: 'e',
    place: 'Гончарная слобода',
    at: [800, 900],
    label: [800, 858],
    major: true,
    title: 'Тёплая печь',
    issuer: 'Евдокия Морозова, гончар',
    issuerAt: 'Гончарная слобода',
    kind: 'Смена у печи',
    brief:
      'Побудьте у печей, пока я схожу за покупателем. Подмастерью одному страшно оставаться после прошлых налётчиков.',
    scene: [
      {
        speaker: 'Евдокия Морозова, гончар',
        text: 'В печь не лезьте. Заслонку тронет Матвей.',
      },
      {
        speaker: 'Человек из отряда',
        text: 'До вечера вернёшься?',
      },
      {
        speaker: 'Евдокия Морозова, гончар',
        text: 'С покупателем. Хоть одного приведу, всё не зря топили.',
      },
    ],
    objective: 'Сопроводить смену у действующих печей до возвращения хозяйки, не мешая обжигу.',
    evidence:
      'Пост действительно выдержан, работник и изделия осмотрены при передаче; будущая безопасность всей слободы не обещается.',
    choice: 'Остаться во дворе или обойти ближние подходы, оставив одного человека с подмастерьем.',
    outcomes: [
      'Пост во дворе сохраняет людей у печей, но не даёт сведений о дальних подходах.',
      'Обход даёт только реально увиденные сведения и не отменяет обязанность оставить двор под защитой.',
    ],
    authorTruth:
      'Евдокия опасается, что Матвей уйдёт в наёмники, если ещё раз останется один. Налёт сейчас не предопределён.',
    description: 'Жилая гончарная слобода с двумя земляными печами и рядами сохнущих горшков.',
    status: 'proposal',
    en: {
      title: 'The Warm Kiln',
      issuer: 'Yevdokiya Morozova, potter',
      kind: 'Keeping watch',
      brief:
        'Stay by the kilns while I fetch a buyer. The apprentice fears being left alone after the raids.',
      scene: [
        {
          speaker: 'Yevdokiya Morozova, potter',
          text: 'Stay out of the kiln. Matvey handles the damper.',
        },
        {
          speaker: 'Company member',
          text: 'Will you be back before evening?',
        },
        {
          speaker: 'Yevdokiya Morozova, potter',
          text: 'With a buyer. Just one, and all that firing was worth it.',
        },
      ],
      objective:
        'Stay with the apprentice until the potter returns, keeping clear of the firing work.',
      description: "An inhabited potters' hamlet with two earth kilns and rows of drying pots.",
      place: 'Potters’ Hamlet',
      issuerAt: 'Potters’ Hamlet',
    },
  },
  {
    id: 'draft.porechye.atlas.16',
    tile: 'sw',
    place: 'Пильный стан',
    at: [450, 300],
    label: [450, 258],
    major: false,
    title: 'Нижний козёл',
    issuer: 'Гаврила Сухов, распиловщик',
    issuerAt: 'Кузнечный хутор',
    kind: 'Освобождение раненого',
    brief: 'У пильного стана сорвалось бревно. Освободите Еремея и помогите донести его до дороги.',
    scene: [
      {
        speaker: 'Гаврила Сухов, распиловщик',
        text: 'Не тяните его за руки. Сначала бревно подопрём.',
      },
      {
        speaker: 'Гаврила Сухов, распиловщик',
        text: 'Этот козёл я ставил. Дайте клинья, пока не просел.',
      },
    ],
    objective:
      'Освободить пострадавшего безопасным способом и вынести к дороге для передачи помощи.',
    evidence:
      'Спасён реальный человек; состояние после освобождения и доставка проверяются отдельно, мгновенное выздоровление не выдумывается.',
    choice: 'Собрать опору и разбирать завал по частям или звать дополнительных работников.',
    outcomes: [
      'Подпёртое бревно даёт доступ без рывка, если работа завершена.',
      'Дополнительные люди меняют состав помощи, а не создают готовый спасательный исход одним разговором.',
    ],
    authorTruth:
      'Нижнюю опору собирал сам Гаврила. Еремей знает об этом, но сейчас просит только не дать бревну сдвинуться.',
    description: 'Ручной пильный стан с продольными ямами, козлами и штабелями леса.',
    status: 'proposal',
    en: {
      title: 'The Lower Trestle',
      issuer: 'Gavrila Sukhov, sawyer',
      kind: 'Rescue',
      brief: 'A log slipped at the saw pit. Free Yeremey and help carry him to the road.',
      scene: [
        {
          speaker: 'Gavrila Sukhov, sawyer',
          text: 'Do not pull his arms. We shore up the log first.',
        },
        {
          speaker: 'Gavrila Sukhov, sawyer',
          text: 'I set that trestle. Give me wedges before it sinks.',
        },
      ],
      objective: 'Free the injured man safely and carry him to the road for help.',
      description: 'A manual saw yard with long pits, trestles and stacks of timber.',
      place: 'Saw Pit',
      issuerAt: 'Smith’s Farm',
    },
  },
  {
    id: 'draft.porechye.atlas.17',
    tile: 'sw',
    place: 'Охотничий лаз',
    at: [350, 760],
    label: [350, 718],
    major: false,
    title: 'Сбитая тропа',
    issuer: 'Вера Лисицына, охотница',
    issuerAt: 'Ловчая стоянка',
    kind: 'Охота',
    brief:
      'Раненый волк уходит к южным дворам. Найдите его след и не дайте ему снова зайти к скоту.',
    scene: [
      {
        speaker: 'Вера Лисицына, охотница',
        text: 'В глине правая задняя лапа едва отпечаталась.',
      },
      {
        speaker: 'Человек из отряда',
        text: 'До дворов далеко?',
      },
      {
        speaker: 'Вера Лисицына, охотница',
        text: 'За лазом уже загоны. Там перехватывайте.',
      },
    ],
    objective: 'Проследить животное и устранить наблюдённую угрозу для дворов.',
    evidence:
      'Нужен результат встречи с этим источником угрозы; чужая шкура и слух о волке не заменяют доказательство.',
    choice:
      'Перехватить зверя у лаза или сначала предупредить дворы и подготовить безопасный подход.',
    outcomes: [
      'Перехват может завершиться столкновением с его реальными последствиями.',
      'Предупреждение уменьшает риск для скота, но само по себе не завершает охоту.',
    ],
    authorTruth:
      'Вера ранила волка и потеряла его. Она признается, если её спросят о первом следе.',
    description: 'Узкий звериный проход между лесными кочками и поваленными деревьями.',
    status: 'proposal',
    en: {
      title: 'The Broken Trail',
      issuer: 'Vera Lisitsyna, hunter',
      kind: 'Hunt',
      brief:
        'A wounded wolf is heading towards the southern farms. Track it and keep it away from the cattle.',
      scene: [
        {
          speaker: 'Vera Lisitsyna, hunter',
          text: 'The right hind paw barely marks the clay.',
        },
        {
          speaker: 'Company member',
          text: 'How far to the farms?',
        },
        {
          speaker: 'Vera Lisitsyna, hunter',
          text: 'The pens are just beyond the gap. Cut it off there.',
        },
      ],
      objective: 'Track the wolf and deal with the threat you find near the farms.',
      description: 'A narrow animal track between woodland hummocks and fallen trees.',
      place: 'Animal Gap',
      issuerAt: 'Trappers’ Camp',
    },
  },
  {
    id: 'draft.porechye.atlas.18',
    tile: 'sw',
    place: 'Щебёночный карьер',
    at: [1200, 800],
    label: [1200, 758],
    major: false,
    title: 'Камень для опоры',
    issuer: 'Богдан Малый, каменщик',
    issuerAt: 'Старая сторожка',
    kind: 'Разведка и вывоз',
    brief:
      'Проверьте съезд к карьеру. Нужен камень для подпорки Житного амбара, а не ещё одна сломанная телега.',
    scene: [
      {
        speaker: 'Богдан Малый, каменщик',
        text: 'Внизу серый, сверху крошится. Не весь подряд грузите.',
      },
      {
        speaker: 'Богдан Малый, каменщик',
        text: 'К сроку амбар подопрём, если опять съезд не развезёт.',
      },
    ],
    objective: 'Пройти съезд, найти пригодный камень и договориться о вывозе к Житному амбару.',
    evidence: 'Осмотр привязан к участку; доставка и пригодность груза подтверждаются отдельно.',
    choice: 'Расчистить короткий съезд или брать меньше камня по пологому обходу.',
    outcomes: [
      'Расчистка требует фактической работы и не означает готовую подпорку амбара.',
      'Обход бережёт подводы ценой меньшей партии; оставшаяся нужда в камне сохраняется.',
    ],
    authorTruth:
      'Богдану не дали людей на дорогу, но срок подпорки уже назначили. Он ищет рабочий выход, а не виноватого.',
    description: 'Невысокий старый карьер с осыпью, съездом и небольшими штабелями камня.',
    status: 'proposal',
    en: {
      title: 'Stone for the Prop',
      issuer: 'Bogdan Maly, mason',
      kind: 'Survey and haulage',
      brief:
        'Check the quarry ramp. We need stone to prop the Grain Barn, not another broken cart.',
      scene: [
        {
          speaker: 'Bogdan Maly, mason',
          text: 'Grey stone below. It crumbles on top. Do not load it all together.',
        },
        {
          speaker: 'Bogdan Maly, mason',
          text: 'We can prop the barn in time, if the ramp holds.',
        },
      ],
      objective: 'Check the ramp, find sound stone and arrange to bring it to the Grain Barn.',
      description: 'A shallow old quarry with scree, a ramp and small stone stacks.',
      place: 'Gravel Quarry',
      issuerAt: 'Old Watch Hut',
    },
  },
  {
    id: 'draft.porechye.atlas.19',
    tile: 's',
    place: 'Постоялый двор',
    at: [1000, 500],
    label: [1000, 458],
    major: true,
    title: 'Стол для обозных',
    issuer: 'Аграфена Петрова, хозяйка двора',
    issuerAt: 'Постоялый двор',
    kind: 'Переговоры о ночлеге',
    brief:
      'Договоритесь о ночлеге для обозных на северных дворах. У меня места только лошадям хватит.',
    scene: [
      {
        speaker: 'Аграфена Петрова, хозяйка двора',
        text: 'В конюшне люди уже лежат. Больше не втиснуть.',
      },
      {
        speaker: 'Человек из отряда',
        text: 'Солому дадите?',
      },
      {
        speaker: 'Аграфена Петрова, хозяйка двора',
        text: 'Дам. Только с хозяевами дворов сначала поговорите.',
      },
    ],
    objective: 'Найти согласных хозяев и довести людей до согласованных мест ночлега.',
    evidence:
      'Нужны согласие принимающих и фактическое размещение людей; обещание пустить всех не считается ночлегом.',
    choice:
      'Разместить людей по нескольким хуторам или устроить общий навес с согласия хозяина земли.',
    outcomes: [
      'Отдельные дворы дают крышу и несколько разных договорённостей.',
      'Навес оставляет обозных вместе, но требует материала и работы, а не только выбранной реплики.',
    ],
    authorTruth:
      'Аграфена ждёт свадьбу племянницы и не хочет превращать застолье в солдатский постой. Она всё же даёт припасы.',
    description: 'Жилой постоялый двор у развилки, конюшня, колодец и широкий двор для подвод.',
    status: 'proposal',
    en: {
      title: 'Room for the Carters',
      issuer: 'Agrafena Petrova, innkeeper',
      kind: 'Finding lodging',
      brief: 'Find beds for the carters at the northern farms. I barely have room for the horses.',
      scene: [
        {
          speaker: 'Agrafena Petrova, innkeeper',
          text: 'There are people sleeping in the stable already. No room left.',
        },
        {
          speaker: 'Company member',
          text: 'Can you spare straw?',
        },
        {
          speaker: 'Agrafena Petrova, innkeeper',
          text: 'Yes. Speak to the farm owners first.',
        },
      ],
      objective: 'Find willing hosts and bring the carters to the agreed lodgings.',
      description: 'An inhabited roadside inn with a stable, a well and a broad cart yard.',
      place: 'Roadside Inn',
      issuerAt: 'Roadside Inn',
    },
  },
  {
    id: 'draft.porechye.atlas.20',
    tile: 's',
    place: 'Скотный загон',
    at: [400, 350],
    label: [400, 308],
    major: false,
    title: 'Чужие клейма',
    issuer: 'Мирон Рог, скотник',
    issuerAt: 'Северный Двор',
    kind: 'Спор о собственности',
    brief: 'Сверьте клейма у южного загона. За одними и теми же коровами пришли два хозяина.',
    scene: [
      {
        speaker: 'Мирон Рог, скотник',
        text: 'У рыжей левый рог сколот. Я её телёнком выхаживал.',
      },
      {
        speaker: 'Человек из отряда',
        text: 'Клеймо покажешь?',
      },
      {
        speaker: 'Мирон Рог, скотник',
        text: 'Железо в амбаре. Сейчас принесу.',
      },
    ],
    objective: 'Осмотреть животных, сравнить клейма и собрать доступные сведения о передаче стада.',
    evidence:
      'Происхождение каждого спорного животного устанавливается отдельно; выбранная сторона не создаёт права собственности.',
    choice:
      'Оставить спорных животных под совместным присмотром или вести к старосте тех, о ком есть сведения.',
    outcomes: [
      'Присмотр сохраняет животных до решения и не объявляет спор оконченным.',
      'Доставка помогает разбору, но выдавать всех по одному совпавшему клейму нельзя.',
    ],
    authorTruth:
      'Часть стада действительно смешалась после реквизиции. Мирон уверен в своей корове, но не знает происхождения остальных.',
    description: 'Большой скотный загон с двумя секциями и навесом для кормов.',
    status: 'proposal',
    en: {
      title: "Other People's Brands",
      issuer: 'Miron Rog, cattle keeper',
      kind: 'Ownership dispute',
      brief: 'Check the brands at the southern pen. Two owners have come to claim the same cows.',
      scene: [
        {
          speaker: 'Miron Rog, cattle keeper',
          text: 'The red one has a chipped left horn. I raised her from a calf.',
        },
        {
          speaker: 'Company member',
          text: 'Show us the brand?',
        },
        {
          speaker: 'Miron Rog, cattle keeper',
          text: 'The iron is in the barn. I will fetch it.',
        },
      ],
      objective: 'Inspect the cattle, compare the brands and ask how the herd changed hands.',
      description: 'A large cattle pen in two sections, with a fodder shelter.',
      place: 'Cattle Pen',
      issuerAt: 'Severny Dvor',
    },
  },
  {
    id: 'draft.porechye.atlas.21',
    tile: 's',
    place: 'Обгоревшие повозки',
    at: [650, 850],
    label: [650, 808],
    major: false,
    title: 'Три целых обода',
    issuer: 'Данила Клепало, кузнечный подмастерье',
    issuerAt: 'Кузнечный хутор',
    kind: 'Сбор уцелевшего',
    brief:
      'Найдите три целых обода у обгоревших повозок. Перед тем спросите людей из постоялого двора, чьи они.',
    scene: [
      {
        speaker: 'Данила Клепало, кузнечный подмастерье',
        text: 'По ободу легонько стукните. Треснувший глухо ответит.',
      },
      {
        speaker: 'Данила Клепало, кузнечный подмастерье',
        text: 'Чужое без спроса не тащите. Мне спор в кузне не нужен.',
      },
    ],
    objective:
      'Установить, кто распоряжается остатками повозок, и получить пригодные обода с его согласия.',
    evidence:
      'Требуются доступное разрешение и физическая передача осмотренных предметов; находка не делает их собственностью компании.',
    choice:
      'Выкупить у владельца подходящие детали либо договориться обменять их на разбор остатков.',
    outcomes: [
      'Выкуп меняет владельца только после фактической сделки.',
      'Разбор требует работы; согласие на него не означает передачу всего железа.',
    ],
    authorTruth:
      'Данила хочет сделать обод для свадебной телеги. Его мастер просил только два, третий подмастерье задумал себе.',
    description: 'Остовы нескольких сгоревших повозок рядом с боковой дорогой.',
    status: 'proposal',
    en: {
      title: 'Three Sound Tyres',
      issuer: "Danila Klepalo, smith's apprentice",
      kind: 'Salvage',
      brief:
        'Find three sound wheel tyres by the burned carts. First ask at the inn who owns them.',
      scene: [
        {
          speaker: "Danila Klepalo, smith's apprentice",
          text: 'Tap the tyre lightly. A cracked one gives a dull sound.',
        },
        {
          speaker: "Danila Klepalo, smith's apprentice",
          text: 'Ask before taking anything. I want no quarrels in the forge.',
        },
      ],
      objective: 'Find who controls the cart remains and get their consent to take usable tyres.',
      description: 'The frames of several burned carts beside a minor road.',
      place: 'Burned Carts',
      issuerAt: 'Smith’s Farm',
    },
  },
  {
    id: 'draft.porechye.atlas.22',
    tile: 'se',
    place: 'Сторожевой холм',
    at: [350, 300],
    label: [350, 258],
    major: false,
    title: 'Не тот огонь',
    issuer: 'Захар Дозор, сторож',
    issuerAt: 'Каменный Брод',
    kind: 'Наблюдение',
    brief:
      'Посмотрите, кто зажигает огонь на пустом холме. Не зовите стражу, пока сами людей не увидите.',
    scene: [
      {
        speaker: 'Захар Дозор, сторож',
        text: 'Сухого дерева там нет. Значит, носят.',
      },
      {
        speaker: 'Человек из отряда',
        text: 'Сколько их?',
      },
      {
        speaker: 'Захар Дозор, сторож',
        text: 'Не скажу. Издали всякий куст человек.',
      },
    ],
    objective:
      'Добраться до холма, наблюдать подходы и установить доступные признаки ночующих людей.',
    evidence:
      'Записываются только увиденные люди, вещи и действия; один огонь не доказывает налёт или принадлежность к войску.',
    choice: 'Поговорить открыто или наблюдать с дороги, не входя в стоянку.',
    outcomes: [
      'Разговор даёт слова встреченных людей, которые ещё надо отличать от проверки.',
      'Наблюдение сохраняет дистанцию, но может оставить личности и намерения неизвестными.',
    ],
    authorTruth:
      'На холме сушит вещи семья дорожных работников. У одного есть солдатская куртка; это не делает их налётчиками.',
    description: 'Низкий сторожевой бугор с остатком деревянной ограды и костровой площадкой.',
    status: 'proposal',
    en: {
      title: 'The Wrong Fire',
      issuer: 'Zakhar Dozor, watchman',
      kind: 'Observation',
      brief:
        'See who lights fires on the empty hill. Do not call the watch before you have seen the people.',
      scene: [
        {
          speaker: 'Zakhar Dozor, watchman',
          text: 'No dry wood up there. They must carry it in.',
        },
        {
          speaker: 'Company member',
          text: 'How many people?',
        },
        {
          speaker: 'Zakhar Dozor, watchman',
          text: 'Cannot say. Every bush looks like a person at that distance.',
        },
      ],
      objective:
        'Reach the hill, watch the approaches and see what you can learn about the campers.',
      description: 'A low watch knoll with remnants of timber fencing and a fire ring.',
      place: 'Watch Knoll',
      issuerAt: 'Kamenny Brod',
    },
  },
  {
    id: 'draft.porechye.atlas.23',
    tile: 'se',
    place: 'Мочильный пруд',
    at: [970, 715],
    label: [970, 673],
    major: false,
    title: 'Чья вода',
    issuer: 'Нестор Лён, льновод',
    issuerAt: 'Садовый хутор',
    kind: 'Хозяйственный спор',
    brief:
      'У пруда пастухи поят скот водой после льна. Помогите поставить корыто и привезти чистую воду.',
    scene: [
      {
        speaker: 'Нестор Лён, льновод',
        text: 'Лён выну раньше — нитка плохая выйдет.',
      },
      {
        speaker: 'Нестор Лён, льновод',
        text: 'А их коровы мне не враги. Пусть только в пруд не лезут.',
      },
    ],
    objective: 'Договориться с пастухами о корыте вне пруда и подвозе чистой воды из их колодца.',
    evidence:
      'Нужны согласие сторон и выполненные работы по ограждению или отводу доступа; разговор не очищает воду автоматически.',
    choice:
      'Подвозить воду из пастушьего колодца к отдельному корыту либо отложить мочение до устройства поилки.',
    outcomes: [
      'Корыто помогает только при подвозе чистой воды; ограда одна скот не напоит.',
      'Отсрочка требует согласия хозяина льна; вода в пруду не становится чистой сразу после разговора.',
    ],
    authorTruth:
      'Обе стороны имеют бытовую нужду; скрытого отравителя нет. Нестор слишком поздно предупредил пастухов о работах.',
    description:
      'Небольшой мочильный пруд, жерди для льна и сухой подход по северо-западному берегу.',
    status: 'proposal',
    en: {
      title: 'Whose Water',
      issuer: 'Nestor Lyon, flax grower',
      kind: 'Farm dispute',
      brief:
        'The herders water cattle at the retting pond. Help set up a trough and bring clean water.',
      scene: [
        {
          speaker: 'Nestor Lyon, flax grower',
          text: 'Take the flax out early and the thread comes out poor.',
        },
        {
          speaker: 'Nestor Lyon, flax grower',
          text: 'I have nothing against their cows. Just keep them out of the pond.',
        },
      ],
      objective:
        'Agree with the herders where to put a trough outside the pond and bring clean water from their well.',
      description:
        'A small flax-retting pond, drying poles and a dry approach on its northwestern bank.',
      place: 'Retting Pond',
      issuerAt: 'Orchard Farm',
    },
  },
  {
    id: 'draft.porechye.atlas.24',
    tile: 'se',
    place: 'Кузнечный хутор',
    at: [1150, 350],
    label: [1150, 308],
    major: true,
    title: 'Молот в залог',
    issuer: 'Устин Железник, кузнец',
    issuerAt: 'Кузнечный хутор',
    kind: 'Возврат инструмента',
    brief:
      'Верните большой молот из постоялого двора. Хозяйка держит его за долг моего подмастерья.',
    scene: [
      {
        speaker: 'Устин Железник, кузнец',
        text: 'Он молотом не расплатился. Он его оставил и ушёл.',
      },
      {
        speaker: 'Устин Железник, кузнец',
        text: 'Данила мне про уголь говорил. Вы про долг сперва спросите.',
      },
    ],
    objective: 'Выяснить обстоятельства залога и договориться о возврате инструмента хозяину.',
    evidence:
      'Инструмент возвращается только после согласованной передачи; обещание за подмастерье не списывает долг.',
    choice:
      'Помочь погасить долг работой или убедить стороны заменить залог вещью, которой подмастерье распоряжается.',
    outcomes: [
      'Работа уменьшает долг лишь в объёме, который приняла хозяйка.',
      'Замена залога требует согласия обеих сторон и не делает чужой молот собственностью должника.',
    ],
    authorTruth:
      'Данила занимал на свадебный пир, а Устину сказал, что покупает уголь. Аграфена не знает, что молот не его.',
    description: 'Жилой кузнечный хутор с маленькой горновой пристройкой, навесом и запасом угля.',
    status: 'proposal',
    en: {
      title: 'The Pledged Hammer',
      issuer: 'Ustin Zheleznik, smith',
      kind: 'Recovering tools',
      brief:
        "Bring my large hammer back from the inn. The innkeeper holds it for my apprentice's debt.",
      scene: [
        {
          speaker: 'Ustin Zheleznik, smith',
          text: 'He did not pay with it. He left it and walked away.',
        },
        {
          speaker: 'Ustin Zheleznik, smith',
          text: 'Danila told me it was for charcoal. Ask about the debt first.',
        },
      ],
      objective: 'Ask how the hammer was pledged and agree its return to the owner.',
      description:
        "An inhabited smith's farm with a small forge annex, a work canopy and charcoal stores.",
      place: 'Smith’s Farm',
      issuerAt: 'Smith’s Farm',
    },
  },
];
