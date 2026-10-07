import type { contractsRu } from './contracts.ru.js';

/** English for contracts.ru.ts; the type requires every Russian key. Glossary: docs/content/world/glossary.csv. */
export const contractsEn: Readonly<Record<keyof typeof contractsRu, string>> = {
  'place.kamenny-brod.name': 'Kamenny Brod',
  'place.kamenny-brod.in': 'in Kamenny Brod',
  'place.bereznyak.name': 'Bereznyak',
  'place.bereznyak.in': 'in Bereznyak',
  'place.tikhaya-gat.name': 'Tikhaya Gat',
  'place.tikhaya-gat.in': 'in Tikhaya Gat',
  'place.severny-dvor.name': 'Severny Dvor',
  'place.severny-dvor.in': 'in Severny Dvor',
  'place.staraya-melnitsa.name': 'the Old Mill',
  'place.staraya-melnitsa.in': 'at the Old Mill',

  'area.kamenny-brod-market': 'the town market',
  'area.bereznyak-green': 'the village green',
  'area.tikhaya-gat-bank': 'the riverbank',
  'area.severny-dvor-yard': 'the yard',
  'area.staraya-melnitsa-yard': 'the mill yard',

  'contract.ci.m1.road-tracks.01.title': 'Tracks on the Road',
  'contract.ci.m1.road-tracks.01.issuer': 'Yevsey Pyzhov, clerk',
  'contract.ci.m1.road-tracks.01.brief':
    'Someone walks the Tikhaya Gat road at night, without a lantern. The bridge watchman heard a cart. Merchants travel by day and pay the bridge toll. Look at the tracks on the bank and tell me whose they are.',
  'contract.ci.m1.road-tracks.01.step.inspect-bank': 'Search the bank near Tikhaya Gat',
  'contract.ci.m1.road-tracks.01.step.report': 'Tell Yevsey what you found',
  'contract.ci.m1.road-tracks.01.finding.inspect-bank':
    'Hobnailed boots like the Zhitnoe infantry wear, and the rut of a loaded cart. The tracks lead to the Old Mill.',
  'contract.ci.m1.road-tracks.01.done':
    'Yevsey wrote it down: men in Zhitnoe boots walk the road at night.',

  'contract.ci.m1.missing-herbs.01.title': 'The Missing Herbs',
  'contract.ci.m1.missing-herbs.01.issuer': 'Agafya Sushina, herbwoman',
  'contract.ci.m1.missing-herbs.01.brief':
    'Bundles of yarrow are gone from the drying shed — the kind that stops bleeding. Not mice: mice don’t untie string. Find out who took them.',
  'contract.ci.m1.missing-herbs.01.step.stock-record': 'Count with Agafya what is missing',
  'contract.ci.m1.missing-herbs.01.step.inspect-green': 'Search the green (daylight only)',
  'contract.ci.m1.missing-herbs.01.step.report': 'Tell Agafya',
  'contract.ci.m1.missing-herbs.01.finding.stock-record':
    'Six bundles gone, all of them for wounds. Nothing else touched.',
  'contract.ci.m1.missing-herbs.01.finding.inspect-green':
    'Fresh cuts at the root, made with a knife. A path leads toward Severny Dvor.',
  'contract.ci.m1.missing-herbs.01.condition.inspect-green': 'no tracks can be seen at night',
  'contract.ci.m1.missing-herbs.01.done': 'Agafya knows the herbs went toward Severny Dvor.',

  'contract.ci.m1.cellar-rescue.01.title': 'The Prisoner in the Cellar',
  'contract.ci.m1.cellar-rescue.01.issuer': 'Marfa, the ferryman’s daughter',
  'contract.ci.m1.cellar-rescue.01.brief':
    'They are holding my father in a cellar at the Old Mill. Bring him home. I have little money. You can have the boat, if it helps.',
  'contract.ci.m1.cellar-rescue.01.step.release': 'Free Demyan from the cellar',
  'contract.ci.m1.cellar-rescue.01.step.deliver': 'Bring Demyan to Tikhaya Gat',
  'contract.ci.m1.cellar-rescue.01.finding.release':
    'Demyan is alive. He walks on his own, but says nothing.',
  'contract.ci.m1.cellar-rescue.01.condition.release': 'a band is camped at the mill',
  'contract.ci.m1.cellar-rescue.01.done': 'Demyan is back in Tikhaya Gat.',

  'contract.ci.m1.lost-scout.01.title': 'The Missing Scout',
  'contract.ci.m1.lost-scout.01.issuer': 'Gordey Lapa, watch sergeant',
  'contract.ci.m1.lost-scout.01.brief':
    'Ivashka Ryaboy went to watch the fords near Tikhaya Gat. Three days now. He wouldn’t run, his mother lives here. So he’s lying somewhere. Find him.',
  'contract.ci.m1.lost-scout.01.step.search': 'Search the bank near Tikhaya Gat',
  'contract.ci.m1.lost-scout.01.step.deliver': 'Bring Ivashka to Kamenny Brod',
  'contract.ci.m1.lost-scout.01.finding.search':
    'Ivashka is in the reeds with a broken leg. He says his own side beat him — men in Zhitnoe jackets.',
  'contract.ci.m1.lost-scout.01.done': 'Ivashka was carried back to Kamenny Brod.',

  'contract.ci.m1.mill-worker.01.title': 'When the Mill Falls Silent',
  'contract.ci.m1.mill-worker.01.issuer': 'Kondrat Ovsyanik, village elder',
  'contract.ci.m1.mill-worker.01.brief':
    'Senka, our hired lad, went missing at the Old Mill. Our grain was stored there: in the barn the tax collector would find it. The grain is gone too. Never mind the grain — bring the boy back.',
  'contract.ci.m1.mill-worker.01.step.inspect-yard': 'Search the mill yard',
  'contract.ci.m1.mill-worker.01.step.ask-keeper': 'Question Frol Zvonar in Tikhaya Gat',
  'contract.ci.m1.mill-worker.01.step.release': 'Get Senka out of the mill',
  'contract.ci.m1.mill-worker.01.step.deliver': 'Bring Senka to Severny Dvor',
  'contract.ci.m1.mill-worker.01.finding.inspect-yard':
    'The rut of a loaded cart and spilled rye. More than one pair of hands did the loading.',
  'contract.ci.m1.mill-worker.01.finding.ask-keeper':
    'Frol saw it at night: something large, on four legs, driving a man toward the mill.',
  'contract.ci.m1.mill-worker.01.finding.release':
    'Senka is alive. He spent two days on a beam under the roof.',
  'contract.ci.m1.mill-worker.01.condition.release': 'the beast at the mill is still alive',
  'contract.ci.m1.mill-worker.01.done': 'Senka is back in Severny Dvor.',

  'contract.ci.m1.raider-standard.01.title': 'Khariton Obukh’s Banner',
  'contract.ci.m1.raider-standard.01.brief':
    'Khariton Obukh’s band is camped at the mill under a cut-down Zhitnoe banner. Bring me the banner. Not his head — the banner.',
  'contract.ci.m1.wolf-trail.01.title': 'The Wolf Trail',
  'contract.ci.m1.wolf-trail.01.brief':
    'Since the battle the wolves aren’t afraid of people: they ate their fill by the ford. Yesterday they killed a cow in calf. Bring the leader’s pelt so everyone can see it.',
  'contract.ci.m1.mill-beast.01.title': 'The Night Beast at the Mill',
  'contract.ci.m1.mill-beast.01.brief':
    'It came after the battle. Before that, only owls lived at the mill. A lot was buried there, not deep. Kill it and bring me a claw.',

  'npc.city-watch-contact.kamenny-brod.01': 'Gordey Lapa, watch sergeant',
  'npc.woodland-village-caller.bereznyak.01': 'Tikhon Bortnik, elder of Bereznyak',
  'npc.local-warning-keeper.tikhaya-gat.01': 'Frol Zvonar, watchman of Tikhaya Gat',

  'person.cellar-captive.01': 'Demyan the Ferryman',
  'person.lost-scout.01': 'Ivashka Ryaboy, wounded',
  'person.mill-worker.01': 'Senka',
};
