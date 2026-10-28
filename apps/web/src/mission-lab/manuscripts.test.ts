import { expect, it } from 'vitest';
import { faddei } from './faddei.js';
import { savva } from './savva.js';
import { guide } from './guide.js';
import { yakov } from './yakov.js';
import {
  advance,
  canChoose,
  initialStory,
  matches,
  sceneAt,
  type Mission,
  type StoryStep,
} from './model.js';

const manuscripts = [faddei, savva, guide, yakov];

function walk(mission: Mission, actions: readonly string[]) {
  let history = initialStory;
  for (const action of actions) {
    const next = advance(mission, history, action);
    expect(next, `Unavailable ${mission.id}/${action}`).not.toBe(history);
    history = next;
  }
  return history;
}

function prose(mission: Mission, history: readonly StoryStep[]) {
  return sceneAt(
    mission,
    history.map((step) => step.scene),
  )
    .lines.filter((line) => matches(line.when, history.at(-1)!.facts))
    .map((line) => line.text)
    .join('\n');
}

it.each(manuscripts)(
  '$title: every scene, conditional passage, choice and ending is reachable',
  (mission) => {
    const reached = new Set<string>();
    const lines = new Set<string>();
    const choices = new Set<string>();
    const endings = new Set<string>();
    function visit(history: readonly StoryStep[]) {
      expect(history.length).toBeLessThan(20);
      const current = history.at(-1)!;
      reached.add(current.scene);
      const path = history.map((step) => step.scene);
      const scene = sceneAt(mission, path);
      for (const line of scene.lines) {
        if (matches(line.when, current.facts)) lines.add(`${current.scene}/${line.id}`);
        expect(line.text).not.toMatch(/Для автора|Последствие:|\*\*Если/);
      }
      if (scene.ending !== undefined) {
        endings.add(current.scene);
        expect(scene.choices).toHaveLength(0);
        return;
      }
      const available = scene.choices.filter((choice) => canChoose(choice, path, current.facts));
      expect(available.length).toBeGreaterThan(0);
      for (const choice of available) {
        choices.add(`${current.scene}/${choice.id}`);
        expect(mission.scenes[choice.to]).toBeDefined();
        visit(advance(mission, history, choice.id));
      }
    }
    visit(initialStory);
    expect([...reached].sort()).toEqual(Object.keys(mission.scenes).sort());
    for (const [id, scene] of Object.entries(mission.scenes)) {
      for (const line of scene.lines)
        expect(lines.has(`${id}/${line.id}`), `${id}/${line.id}`).toBe(true);
      for (const choice of scene.choices)
        expect(choices.has(`${id}/${choice.id}`), `${id}/${choice.id}`).toBe(true);
    }
    expect(endings.size).toBe(mission.id === 'savva' ? 2 : 3);
  },
);

it('Faddei: the captured sentry cannot be released before the final exchange', () => {
  const captured = walk(faddei, ['start-c1', 's2-c1']);
  expect(prose(faddei, captured)).toContain('связывает ему руки и закрывает рот');
  expect(advance(faddei, captured, 's3-c2')).toBe(captured);
  expect(advance(faddei, captured, 's3-c1').at(-1)?.scene).toBe('s4');
});

it.each([
  [true, true],
  [true, false],
  [false, true],
  [false, false],
])(
  'Faddei: scouted=%s, freed early=%s preserve price, rescue and trust across all exits',
  (scouted, free) => {
    const choice = walk(faddei, [
      'start-c1',
      scouted ? 's2-c1' : 's2-c2',
      's3-c1',
      's4-c1',
      free ? 's5-c1' : 's5-c2',
    ]);
    const paid = advance(faddei, choice, 's6-c1');
    const paidEnding = advance(faddei, paid, 's7-c1');
    const paidText = prose(faddei, paidEnding);
    expect(paidText).toContain('Вы опускаете тело возле печи');
    expect(paidText).toContain('Пустую сумку кладёте на кирпичи');
    expect(paidText.includes('пусть нас рассудят')).toBe(scouted);
    expect(paidText.includes('В городе сама скажу')).toBe(!scouted);
    expect(paidText.includes('он сам берёт корзину')).toBe(free);
    expect(paidText.includes('пока ваш человек не просит его взять корзину')).toBe(!free);

    const escaped = advance(faddei, choice, 's6-c2');
    const escapedText = prose(faddei, escaped);
    expect(escapedText.includes('Стрела попадает Климу в правое плечо')).toBe(!scouted);
    expect(escapedText.includes('прижимаете к ране сложенный платок')).toBe(!scouted);
    expect(escapedText.includes('Вы разрезаете верёвку у запястья')).toBe(!free);
    const escapedEnding = prose(faddei, advance(faddei, escaped, 's8-c1'));
    expect(escapedEnding).toContain('Вы кладёте сумку с деньгами на кирпичи');
    expect(escapedEnding).toContain('Потом я найму людей за мужем');
    expect(escapedEnding.includes('готовят носилки')).toBe(!scouted);
    expect(escapedEnding.includes('где вас можно найти в городе')).toBe(free);
    expect(escapedEnding.includes('отвечает только после повторного вопроса')).toBe(!free);

    const body = advance(faddei, choice, 's6-c3');
    const bodyText = prose(faddei, body);
    expect(bodyText).toContain('Вы отсчитываете четверть монет');
    expect(bodyText).toContain('Клим остаётся возле колеса');
    expect(bodyText.includes('Он делает шаг вслед за вами')).toBe(free);
    expect(bodyText.includes('Верёвка удерживает его возле колеса')).toBe(!free);
    expect(prose(faddei, advance(faddei, body, 's9-c1'))).toContain(
      'Вы называете сумму, отданную за тело, и возвращаете остальные деньги',
    );
  },
);

it.each([
  [true, true],
  [true, false],
  [false, true],
  [false, false],
])('Yakov: cart=%s and scouted route=%s determine survival', (cart, scout) => {
  const history = walk(yakov, [
    cart ? 'start-c1' : 'start-c2',
    scout ? 's2-c1' : 's2-c2',
    's3-c1',
    's4-c1',
    's5-c1',
    's6-c2',
  ]);
  const survives = cart || scout;
  const next = advance(yakov, history, survives ? 's8-c1' : 's8-c2');
  expect(next.at(-1)?.scene).toBe(survives ? 'end2' : 'end3');
  expect(advance(yakov, history, survives ? 's8-c2' : 's8-c1')).toBe(history);
  expect(prose(yakov, history).includes('Кровь толчками')).toBe(!survives);
});

it.each([
  [false, false],
  [false, true],
  [true, false],
  [true, true],
])('Guide: boats=%s and rope=%s determine guarded rescue', (boats, rope) => {
  const history = walk(guide, [
    boats ? 'start-c1' : 'start-c2',
    rope ? 's2-c1' : 's2-c2',
    's3-c1',
    's4-c2',
  ]);
  const text = prose(guide, history);
  const survives = boats || rope;
  expect(text.includes('удерживают Никифора на верёвке')).toBe(rope);
  expect(text.includes('Анисья упирается веслом в столб')).toBe(!rope && boats);
  expect(text.includes('он не дышит')).toBe(!survives);
  expect(advance(guide, history, survives ? 's6-c1' : 's6-c2').at(-1)?.scene).toBe(
    survives ? 'end2' : 'end3',
  );
  expect(advance(guide, history, survives ? 's6-c2' : 's6-c1')).toBe(history);
});

it.each([
  [false, false, false],
  [false, false, true],
  [false, true, false],
  [false, true, true],
  [true, false, false],
  [true, false, true],
  [true, true, false],
  [true, true, true],
])('Savva: trust=%s, custody=%s and ration=%s remain independent', (trust, custody, ration) => {
  const exposed = walk(savva, ['start-c1', 's2-c1', trust ? 's3-c1' : 's3-c2']);
  expect(prose(savva, exposed).includes('Дарья завязывает начатый мешок')).toBe(trust);
  expect(prose(savva, exposed)).toContain('пятятся от груза и уходят через задний проход');
  expect(prose(savva, exposed)).toContain('возвращается к вам и протягивает палку');
  const measure = advance(savva, advance(savva, exposed, 's4-c1'), custody ? 's5-c1' : 's5-c2');
  expect(prose(savva, measure)).toContain('пять закрытых мешков и остаток шестого');
  expect(prose(savva, measure).includes('связывает Савве руки')).toBe(custody);
  const action = `s6-c${ration ? 2 : 1}-${custody ? 'custody' : 'free'}`;
  const ended = advance(savva, measure, action);
  expect(ended.at(-1)?.scene).toBe(custody ? 'end1' : 'end2');
  const text = prose(savva, ended);
  expect(/шесть крон остаются у Тихона|Тихон ждёт с закрытым кошелём/.test(text)).toBe(ration);
  expect(/про сломанную руку она не спорит|благодарит за помощь/.test(text)).toBe(trust);
  expect(advance(savva, measure, `s6-c1-${custody ? 'free' : 'custody'}`)).toBe(measure);
});
