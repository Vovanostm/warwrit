/**
 * Russian source strings for places, contracts and hunts. Keys come from stable game IDs; style and voices:
 * docs/wiki/world/writing.md and docs/wiki/world/literary-style.md.
 */
export const contractsRu = {
  'place.kamenny-brod.name': 'Каменный Брод',
  'place.kamenny-brod.in': 'в Каменном Броде',
  'place.bereznyak.name': 'Березняк',
  'place.bereznyak.in': 'в Березняке',
  'place.tikhaya-gat.name': 'Тихая Гать',
  'place.tikhaya-gat.in': 'в Тихой Гати',
  'place.severny-dvor.name': 'Северный Двор',
  'place.severny-dvor.in': 'в Северном Дворе',
  'place.staraya-melnitsa.name': 'Старая мельница',
  'place.staraya-melnitsa.in': 'у Старой мельницы',

  'area.kamenny-brod-market': 'городской рынок',
  'area.bereznyak-green': 'деревенский луг',
  'area.tikhaya-gat-bank': 'берег',
  'area.severny-dvor-yard': 'двор',
  'area.staraya-melnitsa-yard': 'двор мельницы',

  'contract.ci.m1.road-tracks.01.title': 'Следы на дороге',
  'contract.ci.m1.road-tracks.01.issuer': 'Евсей Пыжов, писарь',
  'contract.ci.m1.road-tracks.01.brief':
    'По ночам кто-то ходит дорогой на Тихую Гать, без фонаря. Сторож с моста слышал телегу. Купцы ездят днём и платят мостовое. Посмотрите следы на берегу и скажите мне, чьи они.',
  'contract.ci.m1.road-tracks.01.step.inspect-bank': 'Осмотреть берег у Тихой Гати',
  'contract.ci.m1.road-tracks.01.step.report': 'Рассказать Евсею, что нашли',
  'contract.ci.m1.road-tracks.01.finding.inspect-bank':
    'Подкованные сапоги, как у житной пехоты, и колея гружёной телеги. Следы уходят к Старой мельнице.',
  'contract.ci.m1.road-tracks.01.done': 'Евсей записал: ночью дорогой ходят люди в житных сапогах.',

  'contract.ci.m1.missing-herbs.01.title': 'Пропавшие травы',
  'contract.ci.m1.missing-herbs.01.issuer': 'Агафья Сушина, травница',
  'contract.ci.m1.missing-herbs.01.brief':
    'Из сушильни пропали связки тысячелистника — того, что останавливает кровь. Не мыши: мыши верёвку не развязывают. Узнайте, кто взял.',
  'contract.ci.m1.missing-herbs.01.step.stock-record': 'Пересчитать с Агафьей, чего не хватает',
  'contract.ci.m1.missing-herbs.01.step.inspect-green': 'Осмотреть луг (только днём)',
  'contract.ci.m1.missing-herbs.01.step.report': 'Рассказать Агафье',
  'contract.ci.m1.missing-herbs.01.finding.stock-record':
    'Нет шести связок, и все — от крови. Остальное не тронуто.',
  'contract.ci.m1.missing-herbs.01.finding.inspect-green':
    'Свежие срезы у корня, ножом. Тропа уходит к Северному Двору.',
  'contract.ci.m1.missing-herbs.01.condition.inspect-green': 'ночью следов не разглядеть',
  'contract.ci.m1.missing-herbs.01.done': 'Агафья знает: травы унесли в сторону Северного Двора.',

  'contract.ci.m1.cellar-rescue.01.title': 'Пленник в погребе',
  'contract.ci.m1.cellar-rescue.01.issuer': 'Марфа, дочь перевозчика',
  'contract.ci.m1.cellar-rescue.01.brief':
    'Отца держат в погребе у Старой мельницы. Приведите его домой. Денег у меня мало. Лодку отдам, если надо.',
  'contract.ci.m1.cellar-rescue.01.step.release': 'Освободить Демьяна из погреба',
  'contract.ci.m1.cellar-rescue.01.step.deliver': 'Привести Демьяна в Тихую Гать',
  'contract.ci.m1.cellar-rescue.01.finding.release': 'Демьян жив. Идёт сам, только молчит.',
  'contract.ci.m1.cellar-rescue.01.condition.release': 'у мельницы стоит банда',
  'contract.ci.m1.cellar-rescue.01.done': 'Демьян вернулся в Тихую Гать.',

  'contract.ci.m1.lost-scout.01.title': 'Пропавший разведчик',
  'contract.ci.m1.lost-scout.01.issuer': 'Гордей Лапа, десятник стражи',
  'contract.ci.m1.lost-scout.01.brief':
    'Ивашка Рябой ушёл смотреть броды у Тихой Гати. Третий день нет. Он не сбежит, у него тут мать. Значит, лежит где-то. Найдите.',
  'contract.ci.m1.lost-scout.01.step.search': 'Обыскать берег у Тихой Гати',
  'contract.ci.m1.lost-scout.01.step.deliver': 'Привести Ивашку в Каменный Брод',
  'contract.ci.m1.lost-scout.01.finding.search':
    'Ивашка в камышах, нога перебита. Говорит, били свои — в житных куртках.',
  'contract.ci.m1.lost-scout.01.done': 'Ивашку принесли в Каменный Брод.',

  'contract.ci.m1.mill-worker.01.title': 'Когда молчит мельница',
  'contract.ci.m1.mill-worker.01.issuer': 'Кондрат Овсяник, староста',
  'contract.ci.m1.mill-worker.01.brief':
    'Сенька, наш работник, пропал у Старой мельницы. Там лежало наше зерно: в амбаре его сборщик найдёт. Зерно тоже пропало. Зерно ладно — вы парня верните.',
  'contract.ci.m1.mill-worker.01.step.inspect-yard': 'Осмотреть двор мельницы',
  'contract.ci.m1.mill-worker.01.step.ask-keeper': 'Расспросить Фрола Звонаря в Тихой Гати',
  'contract.ci.m1.mill-worker.01.step.release': 'Вызволить Сеньку из мельницы',
  'contract.ci.m1.mill-worker.01.step.deliver': 'Привести Сеньку в Северный Двор',
  'contract.ci.m1.mill-worker.01.finding.inspect-yard':
    'Колея гружёной телеги и рассыпанная рожь. Грузили не в одни руки.',
  'contract.ci.m1.mill-worker.01.finding.ask-keeper':
    'Фрол видел ночью: что-то большое, на четырёх, гнало человека к мельнице.',
  'contract.ci.m1.mill-worker.01.finding.release':
    'Сенька жив. Два дня просидел на балке под крышей.',
  'contract.ci.m1.mill-worker.01.condition.release': 'зверь у мельницы ещё жив',
  'contract.ci.m1.mill-worker.01.done': 'Сенька вернулся в Северный Двор.',

  'contract.ci.m1.light-sack.01.title': 'Мешок легче накладной',
  'contract.ci.m1.light-sack.01.issuer': 'Нил Безмен, городской кладовщик',
  'contract.ci.m1.light-sack.01.brief':
    'Каждый мешок ржи из Северного Двора на городских весах на два кило легче, чем в накладной. Узнайте почему.',
  'contract.ci.m1.light-sack.01.step.inspect-granary': 'Осмотреть амбар Северного Двора',
  'contract.ci.m1.light-sack.01.step.ask-gate': 'Расспросить стражу у городских ворот',
  'contract.ci.m1.light-sack.01.step.report': 'Показать Нилу найденные улики',
  'contract.ci.m1.light-sack.01.done': 'Нил переписал накладную по найденным уликам.',
  'contract.ci.m1.light-sack.01.result.light-sack.measure-clue':
    'В Северном Дворе зерно меряют старым ведром с вмятиной на боку.',
  'contract.ci.m1.light-sack.01.result.light-sack.dry-grain-clue': 'Зерно сухое и шуршит.',
  'contract.ci.m1.light-sack.01.result.light-sack.wet-sacks-clue':
    'Телега пришла под дождём, мешки были мокрыми.',
  'contract.ci.m1.light-sack.01.result.light-sack.measure-result':
    'Нил смеётся так, что приходится утирать глаза рукавом. — Мятым ведром! Ладно, перепишу накладную.',
  'contract.ci.m1.light-sack.01.result.light-sack.damp-rye-result':
    'Нил растирает зерно между пальцами и нюхает. — Усушка, — говорит он. — Так сборщику и запишу. Это слово он знает.',

  'contract.ci.m1.two-receipts.01.title': 'Чужая расписка',
  'contract.ci.m1.two-receipts.01.issuer': 'Тихон Бортник, староста Березняка',
  'contract.ci.m1.two-receipts.01.brief':
    'Мы отдали сборщику Полесского герцогства шесть мешков налога, у меня есть расписка. А он говорит, что ничего не получал. Узнайте, кто врёт.',
  'contract.ci.m1.two-receipts.01.step.inspect-receipt': 'Проверить печать на расписке',
  'contract.ci.m1.two-receipts.01.step.ask-ledger': 'Сверить книгу сборщика в Каменном Броде',
  'contract.ci.m1.two-receipts.01.step.ask-gordey': 'Расспросить Гордея Лапу о бляхе',
  'contract.ci.m1.two-receipts.01.step.report-tikhon': 'Рассказать только Тихону',
  'contract.ci.m1.two-receipts.01.step.report-both': 'Рассказать и Тихону, и сборщику',
  'contract.ci.m1.two-receipts.01.done':
    'Тихон знает установленную цепочку. Требование сборщика остаётся.',
  'contract.ci.m1.two-receipts.01.result.two-receipts.smudged-seal':
    'Печать на расписке смазана, букв не разобрать.',
  'contract.ci.m1.two-receipts.01.result.two-receipts.empty-ledger':
    'Березняк в этом году не платил. В книге пусто.',
  'contract.ci.m1.two-receipts.01.result.two-receipts.stolen-badge':
    'Бляху с отбитым краем люди Обуха забрали у сборщика, которого ограбили осенью.',
  'contract.ci.m1.two-receipts.01.result.two-receipts.tikhon-only':
    'Тихон разглаживает расписку на колене, будто от этого она станет настоящей. — Значит, рожь у Обуха. А платить опять нам.',
  'contract.ci.m1.two-receipts.01.result.two-receipts.tikhon-and-collector':
    'Сборщик слушает про Обуха, не поднимая головы от книги. — Это ваше дело. Шесть мешков — до первого снега.',

  'contract.ci.m1.empty-watch-record.01.title': 'Обход, которого не было',
  'contract.ci.m1.empty-watch-record.01.issuer': 'Евсей Пыжов, писарь при доске объявлений',
  'contract.ci.m1.empty-watch-record.01.brief':
    'Из городского амбара за три ночи пропали четыре мешка ржи. В журнале караула все три ночи обход. Узнайте, куда делась рожь. — Запись аккуратная. Почерк караульного Прокопа Сенцова. — А сторож на мосту? — Говорит, чужих не видел. Сторож пьёт, но ночью не спит.',
  'contract.ci.m1.empty-watch-record.01.step.read-watch-log': 'Сверить журнал караула',
  'contract.ci.m1.empty-watch-record.01.step.ask-bridge-watchman': 'Расспросить сторожа на мосту',
  'contract.ci.m1.empty-watch-record.01.step.find-camp': 'Осмотреть шалаши под мостом',
  'contract.ci.m1.empty-watch-record.01.step.inspect-sack': 'Осмотреть пустой мешок',
  'contract.ci.m1.empty-watch-record.01.step.ask-prokop': 'Расспросить Прокопа Сенцова',
  'contract.ci.m1.empty-watch-record.01.step.hand-sack-to-evsey': 'Отдать мешок Евсею',
  'contract.ci.m1.empty-watch-record.01.step.throw-sack-in-river': 'Бросить мешок в реку',
  'contract.ci.m1.empty-watch-record.01.done': 'Евсей знает, чем кончился обход.',
  'contract.ci.m1.empty-watch-record.01.result.empty-watch-record.watch-log':
    'Запись аккуратная. Почерк караульного Прокопа Сенцова.',
  'contract.ci.m1.empty-watch-record.01.result.empty-watch-record.bridge-witness':
    'Чужих не было. Прокоп ходил, так он по службе.',
  'contract.ci.m1.empty-watch-record.01.result.empty-watch-record.refugee-camp':
    'Под мостом шалаши. В них живут семь семей с того берега, из Полесского герцогства.',
  'contract.ci.m1.empty-watch-record.01.result.empty-watch-record.city-marked-sack':
    'У шалашей лежит пустой мешок с городским клеймом.',
  'contract.ci.m1.empty-watch-record.01.result.empty-watch-record.prokop-confession':
    'Прокоп признаётся: «Три ночи носил им рожь. Четыре мешка. Обход не ходил — не успевал».',
  'contract.ci.m1.empty-watch-record.01.result.empty-watch-record.sack-handed-over':
    'Евсей кладёт мешок на стол, разглаживает клеймо ладонью и долго, красиво выводит в книге имя Прокопа. — Распишитесь вот тут.',
  'contract.ci.m1.empty-watch-record.01.result.empty-watch-record.proof-destroyed-immediate':
    'Мешок не сразу идёт ко дну: сначала его несёт, раздутый, к опорам моста. — Ничего? — Евсей вздыхает и закрывает книгу. — Значит, деньги остаются в казне.',
  'contract.ci.m1.empty-watch-record.01.result.empty-watch-record.old-ford-revealed':
    'Через несколько дней Прокоп сам находит вас у моста. — Беженцы с того берега ходят старым бродом у ив. Там никто не сторожит. Говорит и уходит, не дожидаясь ответа.',
  'contract.ci.m1.empty-watch-record.01.world.camp-removed':
    'Через два дня под мостом остаются только чёрные круги от костров.',
  'contract.ci.m1.empty-watch-record.01.world.camp-present':
    'Под мостом шалаши. В них живут семь семей с того берега, из Полесского герцогства.',
  'contract.ci.m1.empty-watch-record.01.world.watchman-in-custody': 'Прокопа посадили под замок.',
  'contract.ci.m1.empty-watch-record.01.world.watchman-on-duty': 'Прокоп остаётся на службе.',
  'contract.ci.m1.empty-watch-record.01.report.handed-over':
    'Мешок отдали Евсею. Прокоп под замком.',
  'contract.ci.m1.empty-watch-record.01.report.proof-destroyed':
    'Мешок бросили в реку. Деньги остались в казне, шалаши стоят.',
  'contract.ci.m1.empty-watch-record.01.report.camp-removed': 'Шалаши убрали через два дня.',
  'contract.ci.m1.empty-watch-record.01.report.old-ford-revealed':
    'Через несколько дней Прокоп рассказал о старом броде у ив.',

  'contract.ci.m1.tracks-over-tracks.01.title': 'Свежие следы на дороге',
  'contract.ci.m1.tracks-over-tracks.01.issuer': 'Гордей Лапа, командир городской стражи',
  'contract.ci.m1.tracks-over-tracks.01.brief':
    'На дороге рядом со старыми следами банды Обуха появились свежие. Это наши косари или снова бандиты? Косари ждут ответа.',
  'contract.ci.m1.tracks-over-tracks.01.step.follow-mowers': 'Осмотреть свежие следы на лугу',
  'contract.ci.m1.tracks-over-tracks.01.step.inspect-old-stand': 'Проверить старую стоянку у брода',
  'contract.ci.m1.tracks-over-tracks.01.step.report-tracks': 'Доложить Гордею о свежих следах',
  'contract.ci.m1.tracks-over-tracks.01.step.report-no-findings':
    'Доложить Гордею, что следов не нашли',
  'contract.ci.m1.tracks-over-tracks.01.done': 'Гордей решил, пускать ли косарей на луг.',
  'contract.ci.m1.tracks-over-tracks.01.result.tracks-over-tracks.kosars-fresh-traces':
    'На краю луга скошена полоса на пробу. Трава ещё не завяла.',
  'contract.ci.m1.tracks-over-tracks.01.result.tracks-over-tracks.bandits-fresh-traces':
    'Поверх следов лаптей отпечатались вчерашние подкованные сапоги, как в старых следах банды.',
  'contract.ci.m1.tracks-over-tracks.01.result.tracks-over-tracks.old-stand':
    'Стоянка у брода старая, зола холодная.',
  'contract.ci.m1.tracks-over-tracks.01.result.tracks-over-tracks.kosars-report':
    'Гордей тут же посылает за старшим косарём. — Свои это. Завтра выходите.',
  'contract.ci.m1.tracks-over-tracks.01.result.tracks-over-tracks.bandits-report':
    'Гордей долго молчит. — Косарей держу дома. Вы кому-нибудь ещё сказали?',
  'contract.ci.m1.tracks-over-tracks.01.result.tracks-over-tracks.no-findings':
    '— Никого не встретили — это про вас, а не про дорогу, — говорит Гордей.',

  'contract.ci.m1.not-one-pack.01.title': 'Вожак с рваным ухом',
  'contract.ci.m1.not-one-pack.01.brief':
    'Волки опять ходят к моему пастбищу. Это не та стая, что у Тихона: у вожака рваное ухо. Убейте их.',

  'contract.ci.m1.raider-standard.01.title': 'Знамя Харитона Обуха',
  'contract.ci.m1.raider-standard.01.brief':
    'У мельницы стоит банда Харитона Обуха под обрезанным житным знаменем. Принесите знамя. Головы не надо — знамя.',
  'contract.ci.m1.wolf-trail.01.title': 'Волчья тропа',
  'contract.ci.m1.wolf-trail.01.brief':
    'После сражения у брода волки людей не боятся: наелись у брода. Вчера зарезали стельную корову. Принесите шкуру вожака, чтобы все видели.',
  'contract.ci.m1.mill-beast.01.title': 'Ночной зверь у мельницы',
  'contract.ci.m1.mill-beast.01.brief':
    'После сражения у брода оно и пришло. Раньше у мельницы только совы были. Там много закопано, неглубоко. Убейте его и принесите коготь.',

  'npc.city-watch-contact.kamenny-brod.01': 'Гордей Лапа, десятник стражи',
  'npc.woodland-village-caller.bereznyak.01': 'Тихон Бортник, староста Березняка',
  'npc.woodland-village-caller.savva-krivonos.01': 'Савва Кривонос, сосед Тихона Бортника',
  'npc.local-warning-keeper.tikhaya-gat.01': 'Фрол Звонарь, смотритель Тихой Гати',

  'person.cellar-captive.01': 'Демьян Перевозчик',
  'person.lost-scout.01': 'Ивашка Рябой, ранен',
  'person.mill-worker.01': 'Сенька',
} as const;
