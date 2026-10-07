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

  'contract.ci.m1.raider-standard.01.title': 'Знамя Харитона Обуха',
  'contract.ci.m1.raider-standard.01.brief':
    'У мельницы стоит банда Харитона Обуха под обрезанным житным знаменем. Принесите знамя. Головы не надо — знамя.',
  'contract.ci.m1.wolf-trail.01.title': 'Волчья тропа',
  'contract.ci.m1.wolf-trail.01.brief':
    'После сечи волки людей не боятся: наелись у брода. Вчера зарезали стельную корову. Принесите шкуру вожака, чтобы все видели.',
  'contract.ci.m1.mill-beast.01.title': 'Ночной зверь у мельницы',
  'contract.ci.m1.mill-beast.01.brief':
    'После сечи оно и пришло. Раньше у мельницы только совы были. Там много закопано, неглубоко. Убейте его и принесите коготь.',

  'npc.city-watch-contact.kamenny-brod.01': 'Гордей Лапа, десятник стражи',
  'npc.woodland-village-caller.bereznyak.01': 'Тихон Бортник, староста Березняка',
  'npc.local-warning-keeper.tikhaya-gat.01': 'Фрол Звонарь, смотритель Тихой Гати',

  'person.cellar-captive.01': 'Демьян Перевозчик',
  'person.lost-scout.01': 'Ивашка Рябой, ранен',
  'person.mill-worker.01': 'Сенька',
} as const;
