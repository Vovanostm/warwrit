const elements = Object.fromEntries(
  [...document.querySelectorAll('[id]')].map((element) => [element.id, element]),
);
let board;
let activeQuestion;
let activeBrief;
let showingHistory = false;
let pending;
let saving = false;
let loadedPending = false;
let feedbackKey;
let loadSequence = 0;
let appliedLoad = 0;
const phases = { explore: 'Поиск', refine: 'Уточнение', final: 'Финал' };

function readLocation() {
  const route = new URLSearchParams(window.location.hash.slice(1));
  showingHistory = route.has('history');
  activeBrief = route.get('brief') ?? undefined;
  activeQuestion = route.get('round') ?? board?.questions[0]?.id;
  if (!activeQuestion && !activeBrief) activeBrief = Object.keys(board?.briefs ?? {})[0];
}

function node(tag, className, text) {
  const element = document.createElement(tag);
  element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function notice(message, error = false) {
  elements.notice.textContent = message;
  elements.notice.classList.toggle('error', error);
}

function storageKey() {
  return `game-decisions.pending.${board.boardId}`;
}

function persistPending() {
  try {
    if (pending) localStorage.setItem(storageKey(), JSON.stringify(pending));
    else localStorage.removeItem(storageKey());
  } catch {
    notice(
      'Браузер не сохраняет запросы между перезагрузками. Текущий повтор доступен на этой странице.',
      true,
    );
  }
}

function renderNavigation() {
  elements.questions.replaceChildren();
  for (const saved of Object.values(board.briefs ?? {})) {
    const button = node('button', 'question-link', `${saved.brief.title} · Бриф`);
    button.type = 'button';
    button.setAttribute(
      'aria-current',
      String(!showingHistory && activeBrief === saved.componentId),
    );
    button.addEventListener('click', () => {
      activeBrief = saved.componentId;
      window.location.hash = `brief=${saved.componentId}`;
      showingHistory = false;
      render();
    });
    elements.questions.append(button);
  }
  const rounds = {};
  for (const question of board.questions) {
    const selected = board.votes[question.id] ?? [];
    const button = node('button', 'question-link');
    button.type = 'button';
    button.setAttribute(
      'aria-current',
      String(!showingHistory && !activeBrief && activeQuestion === question.id),
    );
    button.append(node('span', `question-dot${selected.length ? ' chosen' : ''}`));
    let label = question.topic;
    if (question.study) {
      const component = question.study.componentId;
      rounds[component] = (rounds[component] ?? 0) + 1;
      label = `${question.topic} · ${phases[question.study.phase]} ${rounds[component]}`;
    }
    button.append(node('span', '', label));
    button.title = question.title;
    button.addEventListener('click', () => {
      activeQuestion = question.id;
      activeBrief = undefined;
      window.location.hash = `round=${question.id}`;
      showingHistory = false;
      render();
    });
    elements.questions.append(button);
  }
  const completed = board.questions.filter((question) => board.votes[question.id]?.length).length;
  elements.progress.textContent = `Выбор сделан в ${completed} из ${board.questions.length} вопросов`;
  if (!board.questions.length)
    elements.progress.textContent = `Сохранено брифов — ${Object.keys(board.briefs ?? {}).length}`;
  elements['progress-fill'].style.width =
    `${board.questions.length ? (completed / board.questions.length) * 100 : 0}%`;
}

function cardElement(card, question, selected) {
  const article = node('article', `card${selected ? ' selected' : ''}`);
  if (card.image) {
    const button = node('button', 'image-button');
    button.type = 'button';
    button.setAttribute('aria-label', `Рассмотреть ${card.title}`);
    const image = node('img', '');
    image.src = card.image;
    image.alt = card.title;
    button.append(image);
    button.addEventListener('click', () => {
      elements['large-image'].src = card.image;
      elements['large-image'].alt = card.title;
      elements['image-caption'].textContent = card.title;
      elements['image-dialog'].showModal();
    });
    article.append(button);
  }
  const body = node('div', 'card-body');
  body.append(node('h2', '', card.title), node('p', 'card-summary', card.summary));
  const details = node('details', '');
  details.append(node('summary', '', 'Что выбираем'), node('p', '', card.consequence));
  if (card.source) details.append(node('p', 'source', card.source));
  body.append(details);
  if (card.generation) {
    const recipe = node('details', 'recipe');
    recipe.append(node('summary', '', 'Промпт и JSON генерации'));
    recipe.append(node('pre', '', JSON.stringify(card.generation, null, 2)));
    body.append(recipe);
  }
  const button = node('button', 'vote');
  button.type = 'button';
  button.setAttribute('aria-label', `${selected ? 'Снять выбор' : 'Выбрать'} «${card.title}»`);
  button.setAttribute('aria-pressed', String(selected));
  button.disabled = Boolean(pending) || saving;
  let label = selected ? 'Выбрано' : 'Нравится направление';
  if (!selected && question.study?.phase === 'final') label = 'Утвердить концепт';
  button.append(node('span', '', label));
  button.append(node('span', 'heart', selected ? '♥' : '♡'));
  button.addEventListener('click', () => {
    pending = {
      boardId: board.boardId,
      questionId: question.id,
      cardId: card.id,
      revision: question.revision,
      liked: !selected,
      requestId: crypto.randomUUID(),
    };
    persistPending();
    void sendPending();
  });
  body.append(button);
  article.append(body);
  return article;
}

function renderHistory() {
  elements.topic.textContent = 'Сохранённые решения';
  elements.title.textContent = 'История выбора';
  elements.context.textContent =
    'Каждая запись сохраняет формулировку и редакцию вопроса на момент выбора.';
  elements.instruction.textContent = '';
  elements.edition.textContent = '';
  elements.history.replaceChildren();
  const events = board.history
    .filter((event) =>
      [
        'vote',
        'feedback',
        'master-revoked',
        'brief-saved',
        'artifact-drafted',
        'artifact-reviewed',
      ].includes(event.type),
    )
    .toReversed();
  for (const event of events) {
    const entry = node('article', 'history-entry');
    entry.append(node('time', '', new Date(event.at).toLocaleString('ru-RU')));
    if (['brief-saved', 'artifact-drafted', 'artifact-reviewed'].includes(event.type)) {
      const labels = {
        'brief-saved': 'Бриф сохранён',
        'artifact-drafted': 'ТЗ и промпт подготовлены',
        'artifact-reviewed': 'ИИ проверил редакцию',
      };
      entry.append(
        node('h2', '', `${labels[event.type]} · ${event.componentId} · редакция ${event.revision}`),
      );
      const details = node('details', 'recipe');
      details.append(node('summary', '', 'Открыть сохранённый документ'));
      details.append(
        node('pre', '', JSON.stringify(event.brief ?? event.artifact ?? event.review, null, 2)),
      );
      entry.append(details);
      elements.history.append(entry);
      continue;
    }
    entry.append(node('h2', '', event.question.title));
    if (event.type === 'master-revoked') {
      entry.append(node('p', '', 'Утверждение основного промпта отозвано'));
      elements.history.append(entry);
      continue;
    }
    const titles = event.question.cards
      .filter((card) => event.selected.includes(card.id))
      .map((card) => card.title);
    entry.append(node('p', '', titles.length ? titles.join(' · ') : 'Выбор снят'));
    if (event.type === 'feedback') {
      entry.append(node('p', '', event.notes));
      entry.append(node('p', 'source', `Запрошено новых концептов — ${event.nextCount}`));
    }
    elements.history.append(entry);
  }
  if (!events.length)
    elements.history.append(node('p', 'context', 'История появится после первого выбора.'));
}

function renderRequests(question) {
  elements['round-links'].replaceChildren();
  for (const request of board.requests ?? []) {
    if (request.question.id !== question.id) continue;
    const entry = node('article', 'request-entry');
    const status =
      request.status === 'completed' ? 'Новые варианты готовы' : 'Ожидает генерации агентом';
    entry.append(node('p', '', `${status} · ${new Date(request.at).toLocaleString('ru-RU')}`));
    if (request.notes) entry.append(node('p', 'context', request.notes));
    for (const child of request.children) {
      const button = node('button', 'quiet-button', `Открыть раунд «${child.title}»`);
      button.type = 'button';
      button.addEventListener('click', () => {
        activeQuestion = child.questionId;
        activeBrief = undefined;
        window.location.hash = `round=${child.questionId}`;
        render();
        window.scrollTo({ top: 0 });
      });
      entry.append(button);
    }
    elements['round-links'].append(entry);
  }
}

function appendList(container, title, values) {
  if (!values.length) return;
  container.append(node('h3', '', title));
  const list = node('ul', '');
  for (const value of values) list.append(node('li', '', value));
  container.append(list);
}

function renderInterview(saved) {
  const brief = saved.brief;
  elements.cards.hidden = true;
  elements.interview.hidden = false;
  elements.topic.textContent = 'Запрос и уточнения';
  elements.title.textContent = brief.title;
  elements.context.textContent = brief.request;
  elements.instruction.textContent =
    brief.status === 'ready'
      ? 'Бриф готов к генерации концептов.'
      : 'ИИ уточняет требования перед генерацией.';
  elements.edition.textContent = `Бриф · редакция ${saved.revision}`;
  elements.interview.replaceChildren(
    node('h2', '', 'Задача'),
    node('p', '', brief.goal),
    node('p', '', brief.output),
  );
  for (const answer of brief.answers) {
    elements.interview.append(node('h3', '', answer.question), node('p', '', answer.answer));
  }
  appendList(elements.interview, 'Ограничения', brief.fixed);
  appendList(elements.interview, 'Варианты для сравнения', brief.vary);
  appendList(elements.interview, 'Требования', brief.requirements);
  appendList(elements.interview, 'Открытые вопросы', brief.openQuestions);
  elements['saved-note'].textContent =
    'Вопросы и ответы сохраняются в истории и входят в экспорт ТЗ.';
}

function renderDocumentation(master) {
  elements.documentation.hidden = false;
  elements.documentation.replaceChildren(node('h2', '', 'ТЗ и рабочий промпт'));
  const record = master.document;
  if (!record) {
    elements['saved-note'].textContent =
      'Решение сохранено. Следующий шаг ИИ — подготовить и проверить ТЗ и рабочий промпт.';
    elements.documentation.append(
      node(
        'p',
        '',
        'Концепт принят. ИИ подготовит по нему ТЗ и рабочий промпт, затем проверит их.',
      ),
    );
    return;
  }
  const statuses = {
    awaiting_review: 'Ожидает проверки ИИ',
    needs_changes: 'Требует исправлений',
    verified: 'Проверено ИИ',
  };
  elements['saved-note'].textContent =
    'ТЗ, промпты и проверки входят в экспорт ZIP, Markdown и JSON.';
  elements.documentation.append(
    node(
      'p',
      'document-status',
      `${statuses[record.status]} · редакция ${record.revision} · ${record.createdBy}`,
    ),
  );
  const artifact = record.artifact;
  elements.documentation.append(node('h3', '', artifact.title), node('p', '', artifact.summary));
  appendList(elements.documentation, 'Требования', artifact.requirements);
  appendList(elements.documentation, 'Приёмка', artifact.acceptance);
  appendList(elements.documentation, 'Открытые вопросы', artifact.openQuestions);
  elements.documentation.append(
    node('h3', '', 'Рабочий промпт'),
    node('pre', '', artifact.generation.prompt),
  );
  const details = node('details', 'recipe');
  details.append(
    node('summary', '', 'JSON рабочего промпта'),
    node('pre', '', JSON.stringify(artifact.generation, null, 2)),
  );
  elements.documentation.append(details);
  if (record.review) {
    elements.documentation.append(
      node('h3', '', 'Результат проверки'),
      node('p', '', record.review.review.summary),
    );
    for (const check of record.review.review.checks) {
      elements.documentation.append(
        node(
          'p',
          '',
          `${check.result === 'pass' ? '✓' : '✕'} ${check.criterion} — ${check.evidence}`,
        ),
      );
    }
    appendList(elements.documentation, 'Замечания', record.review.review.issues);
  }
}

function renderStudy(question, selected) {
  const study = question.study;
  elements.refinement.hidden = !study;
  elements.brief.hidden = !study;
  elements.master.hidden = true;
  if (!study) return;
  elements['brief-content'].textContent = JSON.stringify(study.brief, null, 2);
  elements['saved-note'].textContent =
    'Лайки и уточнение формируют следующий бриф. Генерацию выполняет агент по сохранённому запросу.';
  const feedback = board.feedback?.[question.id];
  const saved = feedback?.question.revision === question.revision ? feedback : undefined;
  const key = `game-decisions.feedback.${board.boardId}.${question.id}.${question.revision}`;
  if (feedbackKey !== key) {
    let draft;
    try {
      draft = JSON.parse(localStorage.getItem(key) ?? 'null');
    } catch {
      /* Keep fields usable without browser storage. */
    }
    elements['feedback-notes'].value = draft?.notes ?? saved?.notes ?? '';
    elements['next-count'].value =
      draft?.nextCount ?? saved?.nextCount ?? study.brief.counts?.refine ?? 3;
    feedbackKey = key;
  }
  elements['save-feedback'].disabled = !selected.length || Boolean(pending) || saving;
  elements['feedback-state'].textContent =
    'Выбери исходные концепты. При желании добавь комментарий.';
  if (feedback) {
    elements['feedback-state'].textContent =
      `Сохранено уточнение редакции ${feedback.question.revision} для ${feedback.selected.length} концептов. Новых вариантов — ${feedback.nextCount}.`;
  }
  renderRequests(question);
  const master = board.masters?.[study.componentId];
  if (master) {
    elements.master.hidden = false;
    elements['master-title'].textContent = `${master.card.title} · редакция ${master.revision}`;
    elements['master-prompt'].textContent = master.card.generation.prompt;
    elements['revoke-master'].disabled = Boolean(pending) || saving;
    renderDocumentation(master);
  }
}

function render() {
  if (!board) return;
  elements.project.textContent = board.project;
  document.title = `${board.project} — направление игры`;
  renderNavigation();
  elements.pending.hidden = !pending;
  elements.retry.disabled = saving;
  elements.cards.hidden = showingHistory;
  elements.history.hidden = !showingHistory;
  elements.refinement.hidden = true;
  elements.master.hidden = true;
  elements.brief.hidden = true;
  elements.interview.hidden = true;
  elements.documentation.hidden = true;
  elements['saved-note'].textContent =
    'Выбор сохраняется в проекте и доступен агенту через экспорт решений.';
  if (showingHistory) return renderHistory();
  if (activeBrief && board.briefs?.[activeBrief]) return renderInterview(board.briefs[activeBrief]);
  const question = board.questions.find((item) => item.id === activeQuestion);
  elements.cards.replaceChildren();
  if (!question) {
    elements.topic.textContent = board.project;
    elements.title.textContent = 'Добавьте первый вопрос';
    elements.context.textContent =
      'Агент подготовит варианты и загрузит их через команду import-board.';
    elements.instruction.textContent = '';
    elements.edition.textContent = '';
    return;
  }
  elements.topic.textContent = question.topic;
  elements.title.textContent = question.title;
  elements.context.textContent = question.context;
  elements.instruction.textContent =
    question.mode === 'single'
      ? 'Лайк выбирает один вариант. Повторное нажатие снимает выбор.'
      : 'Можно выбрать несколько направлений.';
  elements.edition.textContent = `Редакция ${question.revision}`;
  if (question.study) {
    elements.edition.textContent = `${phases[question.study.phase]} · редакция ${question.revision}`;
    elements.instruction.textContent =
      question.study.phase === 'final'
        ? 'Выбери один итоговый концепт. Его промпт станет основным для этой части игры.'
        : 'Отметь понравившиеся концепты и нажми «Уточнить выбранное».';
  }
  const selected = board.votes[question.id] ?? [];
  for (const card of question.cards)
    elements.cards.append(cardElement(card, question, selected.includes(card.id)));
  renderStudy(question, selected);
}

async function load(force = false) {
  const sequence = ++loadSequence;
  const response = await fetch('/api/board');
  const snapshot = await response.json();
  if (!response.ok) throw new Error(snapshot.error);
  if (sequence < appliedLoad) return;
  if (board?.boardId === snapshot.boardId && snapshot.revision < board.revision) return;
  appliedLoad = sequence;
  const changed =
    !board || board.revision !== snapshot.revision || board.boardId !== snapshot.boardId;
  board = snapshot;
  activeQuestion ??= board.questions[0]?.id;
  if (!activeQuestion) activeBrief ??= Object.keys(board.briefs ?? {})[0];
  if (!loadedPending) {
    readLocation();
    try {
      pending = JSON.parse(localStorage.getItem(storageKey()) ?? 'null');
    } catch {
      pending = null;
    }
    loadedPending = true;
  }
  if (changed || force) render();
}

async function sendPending() {
  if (!pending || saving) return;
  saving = true;
  let acknowledged = false;
  render();
  try {
    const endpoint =
      { feedback: '/api/feedback', revoke: '/api/revoke' }[pending.action] ?? '/api/vote';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending),
    });
    const result = await response.json();
    if (response.status >= 500) throw new Error(result.error);
    acknowledged = response.ok;
    pending = null;
    persistPending();
    await load();
    const question = board.questions.find((item) => item.id === result.questionId);
    if (response.ok && result.questionId && question?.revision !== result.revision) {
      notice('Предыдущий выбор сохранён в истории. Обновлённые карточки требуют нового выбора.');
    } else if (!response.ok) notice(result.error, true);
    else if (result.action === 'revoke')
      notice('Отзыв сохранён. Текущий основной промпт показан на доске.');
    else if (result.action === 'feedback')
      notice('Уточнение сохранено. Оно доступно агенту для следующей генерации.');
    else if (
      JSON.stringify(result.selected) !== JSON.stringify(board.votes[result.questionId] ?? [])
    ) {
      notice('Действие сохранено в истории. Текущий выбор показан на доске.');
    } else notice('Выбор сохранён');
  } catch (error) {
    const message = acknowledged
      ? 'Действие сохранено. Обновите доску для просмотра результата.'
      : 'Сохранение требует проверки.';
    notice(`${message} ${error.message}`, true);
  } finally {
    saving = false;
    render();
  }
}

function saveFeedbackDraft() {
  try {
    localStorage.setItem(
      feedbackKey,
      JSON.stringify({
        notes: elements['feedback-notes'].value,
        nextCount: elements['next-count'].value,
      }),
    );
  } catch {
    /* The current form remains available. */
  }
}

elements['feedback-notes'].addEventListener('input', saveFeedbackDraft);
elements['next-count'].addEventListener('input', saveFeedbackDraft);
elements.refinement.addEventListener('submit', (event) => {
  event.preventDefault();
  if (pending || saving) return;
  const question = board.questions.find((item) => item.id === activeQuestion);
  pending = {
    action: 'feedback',
    boardId: board.boardId,
    questionId: question.id,
    revision: question.revision,
    selected: board.votes[question.id] ?? [],
    notes: elements['feedback-notes'].value,
    nextCount: elements['next-count'].valueAsNumber,
    requestId: crypto.randomUUID(),
  };
  persistPending();
  void sendPending();
});

elements['revoke-master'].addEventListener('click', () => {
  if (pending || saving) return;
  const question = board.questions.find((item) => item.id === activeQuestion);
  const master = board.masters[question.study.componentId];
  pending = {
    action: 'revoke',
    boardId: board.boardId,
    componentId: master.componentId,
    approvalId: master.approvalId,
    requestId: crypto.randomUUID(),
  };
  persistPending();
  void sendPending();
});

elements.retry.addEventListener('click', () => void sendPending());
elements.refresh.addEventListener(
  'click',
  () => void load(true).catch((error) => notice(error.message, true)),
);
elements['history-button'].addEventListener('click', () => {
  showingHistory = true;
  window.location.hash = 'history=1';
  render();
});
window.addEventListener('hashchange', () => {
  readLocation();
  render();
});
elements['close-image'].addEventListener('click', () => elements['image-dialog'].close());
void load().catch((error) => notice(`Не удалось загрузить карточки. ${error.message}`, true));
setInterval(() => {
  if (!saving) void load().catch((error) => notice(error.message, true));
}, 4000);
