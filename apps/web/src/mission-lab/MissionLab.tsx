import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { paintings } from './art.js';
import { missions } from './missions.js';
import {
  advance,
  canChoose,
  initialStory,
  matches,
  sceneAt,
  type Mission,
  type StoryScene,
  type StoryStep,
} from './model.js';
import './mission-lab.css';

export function MissionLab() {
  const [selected, setSelected] = useState(0);
  const [night, setNight] = useState(false);
  const mission = missions[selected] ?? missions[0];
  return (
    <main className={`mission-lab${night ? ' mission-lab--night' : ''}`}>
      <header className="mission-masthead">
        <a href="/" className="mission-wordmark">
          WARWRIT <span>Серое Поречье</span>
        </a>
        <nav aria-label="Тестовые страницы">
          <a href="/">Игра</a>
          <span aria-current="page">Миссии</span>
        </nav>
        <button
          type="button"
          className="mission-light"
          aria-pressed={night}
          onClick={() => setNight(!night)}
        >
          {night ? 'Вернуть исходный свет' : 'Приглушить свет'}
        </button>
      </header>
      <div className="mission-workspace">
        <aside className="mission-library" aria-label="Выбор миссии">
          <p className="mission-eyebrow">Тестирование миссий</p>
          <h1>
            Истории
            <br />
            Поречья
          </h1>
          <p className="mission-library-intro">
            Пограничье двух герцогств.
            <br />
            Седьмой год Смуты.
          </p>
          <div className="mission-cards">
            {missions.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={`mission-card${selected === index ? ' mission-card--active' : ''}`}
                aria-pressed={selected === index}
                onClick={() => setSelected(index)}
              >
                <span className="mission-card-number">
                  0{index + 1} / {item.genre}
                </span>
                <strong>{item.title}</strong>
                <span>{item.place}</span>
              </button>
            ))}
          </div>
          <div className="mission-scope">
            <span>Квестовые новеллы · {missions.length}</span>
            <p>
              Выборы действуют только в этой пробе. Сохранения и имущество компании не меняются.
            </p>
            <p>Новые события и персонажи — предложения для обсуждения.</p>
          </div>
        </aside>
        <MissionReader key={mission.id} mission={mission} night={night} />
      </div>
    </main>
  );
}

function MissionReader({ mission, night }: { readonly mission: Mission; readonly night: boolean }) {
  const [history, setHistory] = useState<readonly StoryStep[]>(initialStory);
  const path = history.map((step) => step.scene);
  const facts = history.at(-1)?.facts ?? [];
  const [journalOpen, setJournalOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const lines = useRef<HTMLDivElement>(null);
  const scene = sceneAt(mission, path);
  const currentId = path.at(-1) ?? 'start';
  const ended = scene.ending !== undefined;
  const findings = [...new Set(path)].flatMap((id) => {
    const observed = mission.scenes[id];
    return observed?.finding ? [{ id, title: observed.title, text: observed.finding }] : [];
  });
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    lines.current?.scrollTo?.({ top: 0 });
  }, [history]);
  return (
    <section className="mission-reader" aria-label={mission.title}>
      <h2 className="mission-reader-title">
        {mission.title}
        <span>{mission.place}</span>
      </h2>
      <div
        className={`mission-reader-stage${journalOpen ? ' mission-reader-stage--journal' : ''}${scene.art ? '' : ' mission-reader-stage--text'}`}
      >
        {scene.art && (
          <div
            className="mission-art"
            data-art={scene.art}
            style={{ '--mission-art': `url("${paintings[scene.art]}")` } as CSSProperties}
          >
            <div className="mission-art-top">
              <span>{scene.title}</span>
              <span>{night ? 'Приглушённый свет' : 'Исходный свет'}</span>
            </div>
          </div>
        )}
        <div className="mission-toolbar">
          <span>
            {ended ? 'Развязка' : `Сцена ${path.length}`}{' '}
            <span className="mission-toolbar-separator">/</span> {scene.title}
          </span>
          <div>
            <button
              type="button"
              aria-expanded={journalOpen}
              aria-controls="mission-journal"
              onClick={() => setJournalOpen(!journalOpen)}
            >
              Находки <span>{findings.length}</span>
            </button>
            <button
              type="button"
              disabled={path.length === 1}
              onClick={() => setHistory(history.slice(0, -1))}
            >
              На шаг назад
            </button>
            <button
              type="button"
              onClick={() => {
                setHistory(initialStory);
                setJournalOpen(false);
              }}
            >
              Сначала
            </button>
          </div>
        </div>
        <div className="mission-reading-area">
          <article className="mission-prose" data-scene={currentId}>
            <h3 ref={heading} tabIndex={-1}>
              {scene.title}
            </h3>
            <MissionSceneText
              scene={scene}
              facts={facts}
              textKeyPrefix={`mission.${mission.id}.${currentId}`}
              scrollRef={lines}
            />
            {ended ? (
              <div className="mission-ending">
                <span>Конец этой истории</span>
                <button type="button" onClick={() => setHistory(initialStory)}>
                  Попробовать другой путь
                </button>
              </div>
            ) : (
              <div className="mission-choices" aria-label="Ваш выбор">
                {scene.choices
                  .filter((choice) => matches(choice.when, facts))
                  .map((choice, index) => (
                    <button
                      type="button"
                      key={choice.id}
                      disabled={!canChoose(choice, path, facts)}
                      onClick={() => setHistory(advance(mission, history, choice.id))}
                    >
                      <span className="mission-choice-number">{index + 1}</span>
                      <span>
                        {choice.text}
                        {!canChoose(choice, path, facts) && <small>{choice.unavailable}</small>}
                      </span>
                      <span className="mission-choice-arrow" aria-hidden="true">
                        ↗
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </article>
          {journalOpen && <MissionJournal findings={findings} />}
        </div>
      </div>
      <footer className="mission-reader-footer">
        <span>К предыдущему выбору можно вернуться в любой момент</span>
        <button
          type="button"
          aria-expanded={notesOpen}
          aria-controls="mission-author-notes"
          onClick={() => setNotesOpen(!notesOpen)}
        >
          О замысле и источниках
        </button>
      </footer>
      <MissionAuthorNotes open={notesOpen} mission={mission} illustrated={Boolean(scene.art)} />
    </section>
  );
}

function MissionAuthorNotes({
  open,
  mission,
  illustrated,
}: {
  readonly open: boolean;
  readonly mission: Mission;
  readonly illustrated: boolean;
}) {
  if (!open) return null;
  return (
    <div id="mission-author-notes" className="mission-author-notes">
      <p>{mission.brief}</p>
      <p>{mission.motif}</p>
      <p>
        {mission.presentation === 'partial'
          ? 'Пробная иллюстрация подготовлена для одной сцены. Остальные сцены пока доступны только как текст.'
          : illustrated
            ? 'У каждой сцены и развязки своя иллюстрация. Приглушение света проверяет контраст изображения; время в истории остаётся прежним.'
            : 'Текстовое прохождение. Иллюстрации к этой истории ещё не подготовлены.'}
      </p>
      <p>
        Построение: <a href="https://www.inklestudios.com/ink/">ink</a>,{' '}
        <a href="https://twinery.org/">Twine</a>; заготовки конфликтов:{' '}
        <a href="https://donjon.bin.sh/fantasy/">donjon</a>. Сюжеты написаны для Warwrit.
      </p>
    </div>
  );
}

function MissionSceneText({
  scene,
  facts,
  textKeyPrefix,
  scrollRef,
}: {
  readonly scene: StoryScene;
  readonly facts: readonly string[];
  readonly textKeyPrefix: string;
  readonly scrollRef: RefObject<HTMLDivElement | null>;
}) {
  const [hasMoreText, setHasMoreText] = useState(false);
  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const measure = () => {
      setHasMoreText(element.scrollHeight - element.clientHeight - element.scrollTop > 1);
    };
    measure();
    element.addEventListener('scroll', measure, { passive: true });
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    observer?.observe(element);
    return () => {
      element.removeEventListener('scroll', measure);
      observer?.disconnect();
    };
  }, [scene, facts, scrollRef]);
  return (
    <>
      <div
        ref={scrollRef}
        className="mission-lines"
        role="region"
        tabIndex={0}
        aria-label="Текст сцены"
      >
        {scene.lines
          .filter((line) => matches(line.when, facts))
          .map((line) => (
            <p
              key={line.id}
              data-text-key={`${textKeyPrefix}.${line.id}`}
              className={line.speaker ? 'mission-dialogue' : undefined}
            >
              {line.speaker && <span className="mission-speaker">{line.speaker}</span>}
              {line.speaker ? '— ' : ''}
              {line.text}
            </p>
          ))}
        {scene.finding && (
          <p className="mission-finding-notice">Запись в находках: {scene.finding}</p>
        )}
        {scene.ending && <p>{scene.ending}</p>}
      </div>
      {hasMoreText && <div className="mission-text-continuation">Продолжение ниже ↓</div>}
    </>
  );
}

function MissionJournal({
  findings,
}: {
  readonly findings: readonly {
    readonly id: string;
    readonly title: string;
    readonly text: string;
  }[];
}) {
  return (
    <aside className="mission-journal" id="mission-journal" aria-label="Находки этой миссии">
      <h3>То, что известно</h3>
      {findings.length === 0 ? (
        <p>Пока только просьба. Осмотрите место или расспросите людей.</p>
      ) : (
        <ol>
          {findings.map((finding) => (
            <li key={finding.id}>
              <strong>{finding.title}</strong>
              <p>{finding.text}</p>
            </li>
          ))}
        </ol>
      )}
      <p className="mission-journal-note">
        Возврат на шаг назад убирает и сведения, полученные на этом шаге.
      </p>
    </aside>
  );
}
