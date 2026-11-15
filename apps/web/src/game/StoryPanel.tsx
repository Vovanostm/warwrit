import type {
  StoryChoiceIdDto,
  StoryCommandRequestDto,
  StoryCommandResponseDto,
  StoryFactDto,
  StoryReadResponseDto,
} from '@warwrit/protocol';
import { isStoryCommandRequest } from '@warwrit/protocol';
import { useEffect, useState } from 'react';
import { lookup } from '../i18n/index.js';
import './story.css';

const api = (import.meta.env['VITE_API_BASE_URL'] ?? '/api').replace(/\/$/u, '');
const mission = 'story.sm.m1.cache-disclosure.01.';
const storageKey = (accountId: string, companyId: string) =>
  `warwrit:story-attempt:v1:${encodeURIComponent(accountId)}:${encodeURIComponent(companyId)}`;

type Scope = { readonly accountId: string; readonly companyId: string };
type StoredAttempt = { readonly scope: Scope; readonly body: string };
type ReadResult =
  | { readonly kind: 'READY'; readonly story: StoryReadResponseDto }
  | { readonly kind: 'ERROR'; readonly message: string };
type PostResult =
  | { readonly kind: 'ACCEPTED'; readonly response: Extract<StoryCommandResponseDto, { ok: true }> }
  | {
      readonly kind: 'REJECTED';
      readonly response: Extract<StoryCommandResponseDto, { ok: false }>;
    }
  | { readonly kind: 'UNKNOWN' }
  | { readonly kind: 'UNAUTHENTICATED' };

const rejectionCodes = new Set([
  'INVALID_COMMAND',
  'NOT_AUTHORIZED',
  'NOT_AVAILABLE',
  'NOT_ACCEPTED',
  'NOT_ELIGIBLE',
  'NOT_AT_LOCATION',
  'WRONG_PLACE',
  'MISSING_FACT',
  'NOT_MET',
  'NO_PENDING_ACCUSATION',
  'STALE_REVISION',
  'ALREADY_COMPLETED',
  'INSUFFICIENT_FUNDS',
  'CONFLICTING_REPLAY',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isStoryFact(value: unknown): value is StoryFactDto {
  if (!isRecord(value) || !isRecord(value['source'])) return false;
  const source = value['source'];
  const validSource =
    (source['kind'] === 'ACTOR' &&
      ['KONDRAT', 'SENKA', 'ULITA'].includes(source['actorId'] as string)) ||
    (source['kind'] === 'OBSERVED' &&
      ['PATCHED_SACK', 'PAYMENT_RECEIPTS'].includes(source['objectId'] as string));
  return (
    validSource &&
    /^F(?:0[1-9]|1[01])$/u.test(value['factId'] as string) &&
    typeof value['sceneId'] === 'string' &&
    typeof value['choiceId'] === 'string' &&
    typeof value['sourceEventId'] === 'string' &&
    typeof value['learnedAtTick'] === 'string'
  );
}

function isStoryRead(value: unknown): value is StoryReadResponseDto {
  return (
    isRecord(value) &&
    value['schemaVersion'] === 1 &&
    value['missionId'] === 'sm.m1.cache-disclosure.01' &&
    value['definitionVersion'] === 1 &&
    ['OFFERED', 'CLOSED', 'NOT_YET_AVAILABLE'].includes(value['availability'] as string) &&
    typeof value['sceneId'] === 'string' &&
    typeof value['worldRevision'] === 'string' &&
    typeof value['companyRevision'] === 'string' &&
    Array.isArray(value['visibleLineIds']) &&
    value['visibleLineIds'].every((id) => typeof id === 'string') &&
    Array.isArray(value['availableChoices']) &&
    value['availableChoices'].every((id) => typeof id === 'string') &&
    Array.isArray(value['journal']) &&
    value['journal'].every(isStoryFact) &&
    Array.isArray(value['metActors']) &&
    value['metActors'].every((actor) => ['KONDRAT', 'SENKA', 'ULITA'].includes(actor as string)) &&
    (value['publicOutcome'] === null ||
      (isRecord(value['publicOutcome']) &&
        typeof value['publicOutcome']['isFinishingCompany'] === 'boolean'))
  );
}

function isStoredAttempt(value: unknown, scope: Scope): value is StoredAttempt {
  if (!isRecord(value) || value['body'] === undefined || typeof value['body'] !== 'string')
    return false;
  const storedScope = value['scope'];
  if (
    !isRecord(storedScope) ||
    storedScope['accountId'] !== scope.accountId ||
    storedScope['companyId'] !== scope.companyId
  )
    return false;
  try {
    const request: unknown = JSON.parse(value['body']);
    return isStoryCommandRequest(request) && JSON.stringify(request) === value['body'];
  } catch {
    return false;
  }
}

async function readStory(): Promise<ReadResult> {
  try {
    const response = await fetch(`${api}/story`, { credentials: 'same-origin' });
    if (response.status === 409)
      return { kind: 'ERROR', message: lookup(`${mission}ui.not-at-place`)! };
    if (response.status === 404)
      return { kind: 'ERROR', message: lookup(`${mission}ui.unavailable`)! };
    if (response.status === 401)
      return { kind: 'ERROR', message: lookup(`${mission}ui.unauthenticated`)! };
    if (!response.ok) return { kind: 'ERROR', message: lookup(`${mission}ui.error`)! };
    const value: unknown = await response.json();
    return isStoryRead(value)
      ? { kind: 'READY', story: value }
      : { kind: 'ERROR', message: lookup(`${mission}ui.error`)! };
  } catch {
    return { kind: 'ERROR', message: lookup(`${mission}ui.error`)! };
  }
}

async function postStory(body: string, commandId: string): Promise<PostResult> {
  let response: Response;
  try {
    response = await fetch(`${api}/story/commands`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body,
    });
  } catch {
    return { kind: 'UNKNOWN' };
  }
  if (response.status === 401) return { kind: 'UNAUTHENTICATED' };
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    return { kind: 'UNKNOWN' };
  }
  if (!isRecord(value) || value['schemaVersion'] !== 1 || value['commandId'] !== commandId)
    return { kind: 'UNKNOWN' };
  if (
    response.status === 200 &&
    value['ok'] === true &&
    isStoryRead(value['story']) &&
    (value['rewardPaidQ'] === null ||
      (typeof value['rewardPaidQ'] === 'string' && /^(0|[1-9][0-9]*)$/u.test(value['rewardPaidQ'])))
  )
    return { kind: 'ACCEPTED', response: value as Extract<StoryCommandResponseDto, { ok: true }> };
  if (
    [403, 404, 409].includes(response.status) &&
    value['ok'] === false &&
    typeof value['code'] === 'string' &&
    rejectionCodes.has(value['code']) &&
    (value['story'] === null || isStoryRead(value['story']))
  )
    return { kind: 'REJECTED', response: value as Extract<StoryCommandResponseDto, { ok: false }> };
  return { kind: 'UNKNOWN' };
}

function lineText(sceneId: string, lineId: string): string | undefined {
  return lookup(`${mission}${sceneId}.${lineId}`);
}

function speaker(sceneId: string, lineId: string): string | undefined {
  if (lineId === 'title' || lineId === 'brief' || lineId === 'reward' || lineId.startsWith('warn-'))
    return undefined;
  if (lineId.startsWith('journal-') || (sceneId === 'LATE' && lineId === 'moved')) return undefined;
  let who = 'PLAYER';
  if (sceneId === 'S00')
    who = ['01'].includes(lineId)
      ? 'NARRATOR'
      : ['02-rescuers', '02-others', '04', '06', '07'].includes(lineId)
        ? 'KONDRAT'
        : 'PLAYER';
  else if (sceneId === 'S01')
    who =
      lineId === '04'
        ? 'NARRATOR'
        : ['01', '02', '03', '05'].includes(lineId)
          ? 'KONDRAT'
          : 'PLAYER';
  else if (sceneId === 'S02') who = ['01', '02', '03', '04'].includes(lineId) ? 'SENKA' : 'PLAYER';
  else if (sceneId === 'S03')
    who = ['01', '02-sound', '04'].includes(lineId)
      ? 'NARRATOR'
      : ['02', '02-son', '03', '05', '06'].includes(lineId)
        ? 'ULITA'
        : 'PLAYER';
  else if (sceneId === 'S04') who = ['01', '03'].includes(lineId) ? 'SENKA' : 'PLAYER';
  else if (sceneId === 'S06')
    who =
      lineId === '01' ? 'NARRATOR' : ['02', '03', '04', '05'].includes(lineId) ? 'ULITA' : 'PLAYER';
  else if (sceneId === 'S07') who = lineId === '01' ? 'KONDRAT' : 'PLAYER';
  else if (sceneId === 'S08')
    who = ['02', '04-no-sack', '04-clue'].includes(lineId) ? 'KONDRAT' : 'PLAYER';
  else if (sceneId === 'E01')
    who = ['01', '02'].includes(lineId)
      ? 'PLAYER'
      : ['04', '07'].includes(lineId)
        ? 'NARRATOR'
        : 'KONDRAT';
  else if (sceneId === 'E02')
    who = ['01'].includes(lineId)
      ? 'PLAYER'
      : ['08', '09'].includes(lineId)
        ? 'NARRATOR'
        : ['02', '04', '06'].includes(lineId)
          ? 'SENKA'
          : 'KONDRAT';
  else if (sceneId === 'E03')
    who = ['01'].includes(lineId)
      ? 'PLAYER'
      : ['08', '09'].includes(lineId)
        ? 'NARRATOR'
        : ['05', '07'].includes(lineId)
          ? 'SENKA'
          : 'KONDRAT';
  else if (sceneId === 'LATE') who = 'KONDRAT';
  return lookup(`${mission}speaker.${who}`);
}

function choiceText(choice: StoryChoiceIdDto, story: StoryReadResponseDto): string {
  if (choice === 'ask-son' && !story.journal.some((fact) => fact.factId === 'F06'))
    return lookup(`${mission}S03.who`)!;
  const key =
    choice === 'ask-senka-sack'
      ? `${story.sceneId}.${story.sceneId === 'S02' ? 'ask-senka-sack' : story.sceneId === 'S04' ? 'ask' : 'next'}`
      : choice === 'confirm'
        ? story.visibleLineIds.includes('commit-proof')
          ? 'commit-proof'
          : 'commit'
        : choice === 'accuse-ulita'
          ? story.visibleLineIds.includes('proof')
            ? 'proof'
            : 'ulita'
          : choice === 'accuse-senka'
            ? 'senka'
            : choice === 'accuse-kondrat'
              ? 'kondrat'
              : `choice.${choice}`;
  const sceneChoice = choice === 'confirm' || choice.startsWith('accuse-');
  return (
    lookup(`${mission}${sceneChoice ? `${story.sceneId}.` : ''}${key}`) ??
    lookup(`${mission}ui.unavailable`)!
  );
}

function choiceCommand(choice: StoryChoiceIdDto): StoryCommandRequestDto['command'] {
  if (choice === 'accept') return { type: 'ACCEPT' };
  if (choice === 'defer') return { type: 'DEFER' };
  if (choice === 'confirm') return { type: 'CONFIRM' };
  return { type: 'CHOOSE', choiceId: choice };
}

function sourceLabel(fact: StoryFactDto): string {
  if (fact.source.kind === 'ACTOR') return lookup(`${mission}ui.actor.${fact.source.actorId}`)!;
  return `${lookup(`${mission}ui.actor.OBSERVED`)} · ${lookup(`${mission}ui.object.${fact.source.objectId}`)}`;
}

function choiceLineId(choice: StoryChoiceIdDto, sceneId: string): string {
  if (choice === 'ask-senka-sack')
    return sceneId === 'S02' ? 'ask-senka-sack' : sceneId === 'S04' ? 'ask' : 'next';
  const shared: Partial<Record<StoryChoiceIdDto, string>> = {
    accept: 'accept',
    defer: 'later',
    'ask-sacks': 'sacks',
    'ask-tax': 'tax',
    'inspect-receipts': 'inspect',
    'compare-receipts': 'compare',
    'ask-guard': 'guard',
    'ask-bread': 'food',
    'ask-son': 'son',
    'inspect-sack': 'inspect',
    'ask-sack-origin': 'sack',
    'ask-why-cache': 'grain',
    'ask-senka-sack': 'next',
    'to-kondrat': 'next',
    'to-senka': 'next',
    'to-ulita': 'next',
    'confront-ulita': 'compare',
    'ask-where-grain': 'ask',
    'open-confrontation': 'next',
    'open-accusation': '01',
    'accuse-ulita': 'ulita',
    'accuse-senka': 'senka',
    'accuse-kondrat': 'kondrat',
    wait: 'wait',
    confirm: 'commit',
    back: 'back',
  };
  return shared[choice] ?? choice;
}

function isChoiceLine(story: StoryReadResponseDto, lineId: string): boolean {
  if (lineId === 'son' && story.journal.some((fact) => fact.factId === 'F06')) return false;
  if (lineId === 'proof' && story.availableChoices.includes('accuse-ulita')) return true;
  return (
    story.availableChoices.some((choice) => choiceLineId(choice, story.sceneId) === lineId) ||
    (story.availableChoices.includes('confirm') && lineId === 'commit-proof')
  );
}

export function StoryPanel(props: {
  readonly scope: Scope;
  readonly onRefreshCompany: () => void;
  readonly onClose: () => void;
}) {
  const key = storageKey(props.scope.accountId, props.scope.companyId);
  const [story, setStory] = useState<StoryReadResponseDto | null>(null);
  const [message, setMessage] = useState(lookup(`${mission}ui.loading`)!);
  const [pendingBody, setPendingBody] = useState<string | null>(null);
  const [invalidPending, setInvalidPending] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const result = await readStory();
    if (result.kind === 'READY') {
      setStory(result.story);
      setMessage('');
    } else {
      setStory(null);
      setMessage(result.message);
    }
  };

  useEffect(() => {
    let live = true;
    try {
      const raw = sessionStorage.getItem(key);
      if (raw) {
        const stored: unknown = JSON.parse(raw);
        if (isStoredAttempt(stored, props.scope)) setPendingBody(stored.body);
        else {
          setInvalidPending(true);
          setMessage(lookup(`${mission}ui.retry-blocked`)!);
        }
      }
    } catch {
      setInvalidPending(true);
      setMessage(lookup(`${mission}ui.retry-blocked`)!);
    }
    void readStory().then((result) => {
      if (!live) return;
      if (result.kind === 'READY') {
        setStory(result.story);
        setMessage('');
      } else setMessage(result.message);
    });
    return () => {
      live = false;
    };
  }, [key]);

  const send = async (requested?: StoryChoiceIdDto, retry = false) => {
    if (busy || invalidPending) return;
    let body = pendingBody;
    if (!body) {
      if (retry || !story || !requested) return;
      const commandId = crypto.randomUUID();
      const request: StoryCommandRequestDto = {
        schemaVersion: 1,
        commandId,
        expectedWorldRevision: story.worldRevision,
        expectedCompanyRevision: story.companyRevision,
        command: choiceCommand(requested),
      };
      body = JSON.stringify(request);
      try {
        sessionStorage.setItem(
          key,
          JSON.stringify({ scope: props.scope, body } satisfies StoredAttempt),
        );
      } catch {
        setMessage(lookup(`${mission}ui.retry-blocked`)!);
        return;
      }
      setPendingBody(body);
    } else if (!retry) return;

    let request: unknown;
    try {
      request = JSON.parse(body);
    } catch {
      setInvalidPending(true);
      return;
    }
    if (!isStoryCommandRequest(request)) {
      setInvalidPending(true);
      setMessage(lookup(`${mission}ui.retry-blocked`)!);
      return;
    }
    setBusy(true);
    const result = await postStory(body, request.commandId);
    setBusy(false);
    if (result.kind === 'UNKNOWN') {
      setMessage(lookup(`${mission}ui.unknown`)!);
      return;
    }
    if (result.kind === 'UNAUTHENTICATED') {
      setMessage(lookup(`${mission}ui.unauthenticated`)!);
      return;
    }
    try {
      const current = sessionStorage.getItem(key);
      const stored: unknown = current ? JSON.parse(current) : null;
      if (!isStoredAttempt(stored, props.scope) || stored.body !== body) {
        setInvalidPending(true);
        setMessage(lookup(`${mission}ui.retry-blocked`)!);
        return;
      }
      sessionStorage.removeItem(key);
    } catch {
      setInvalidPending(true);
      setMessage(lookup(`${mission}ui.retry-blocked`)!);
      return;
    }
    setPendingBody(null);
    if (result.kind === 'ACCEPTED') {
      setStory(result.response.story);
      setMessage(result.response.rewardPaidQ ? lookup(`${mission}ui.reward`)! : '');
      if (result.response.rewardPaidQ) props.onRefreshCompany();
      return;
    }
    const code = result.response.code;
    const feedback =
      code === 'INSUFFICIENT_FUNDS'
        ? lookup(`${mission}ui.insufficient`)!
        : code === 'STALE_REVISION'
          ? lookup(`${mission}ui.stale`)!
          : code === 'ALREADY_COMPLETED'
            ? lookup(`${mission}ui.closed`)!
            : lookup(`${mission}ui.error`)!;
    if (result.response.story) setStory(result.response.story);
    else await refresh();
    setMessage(feedback);
  };

  const lineIds = story?.visibleLineIds ?? [];
  const title = story
    ? lookup(`${mission}${story.sceneId === 'LATE' ? 'LATE' : story.sceneId}.title`)
    : undefined;
  return (
    <section className="story-panel" aria-label={lookup(`${mission}journal.title`)!}>
      <header className="story-header">
        <h3>{title ?? lookup(`${mission}journal.title`)}</h3>
        <button type="button" className="quiet-action" onClick={props.onClose}>
          {lookup(`${mission}ui.close`)}
        </button>
      </header>
      {message && (
        <p className="story-status" role="status">
          {message}
        </p>
      )}
      {story && (
        <>
          {story.sceneId === 'S00' && lineIds.includes('brief') && (
            <p className="story-brief">{lineText(story.sceneId, 'brief')}</p>
          )}
          <div className="story-lines" aria-live="polite">
            {lineIds
              .filter(
                (lineId) =>
                  lineId !== 'title' &&
                  lineId !== 'brief' &&
                  lineId !== 'reward' &&
                  lineId !== 'moved' &&
                  !isChoiceLine(story, lineId),
              )
              .map((lineId, index) => {
                const text = lineText(story.sceneId, lineId);
                if (!text) return null;
                const who = speaker(story.sceneId, lineId);
                const warning = lineId.startsWith('warn-');
                return (
                  <p
                    key={`${lineId}:${index}`}
                    className={`story-line${warning ? ' story-warning' : lineId.startsWith('journal-') ? ' story-public-note' : ''}`}
                    role={warning ? 'alert' : undefined}
                  >
                    {who && (
                      <span className="story-portrait" aria-hidden="true">
                        {who.slice(0, 1)}
                      </span>
                    )}
                    <span>
                      {who && <strong>{who}</strong>}
                      {text}
                    </span>
                  </p>
                );
              })}
          </div>
          {lineIds.includes('reward') && (
            <p className="story-reward">
              {lineText(story.sceneId, 'reward')} {lookup(`${mission}ui.reward-offer`)}
            </p>
          )}
          {story.availability === 'CLOSED' &&
            story.publicOutcome &&
            !story.publicOutcome.isFinishingCompany && (
              <p className="story-status">{lookup(`${mission}LATE.moved`)}</p>
            )}
          {pendingBody && (
            <p className="story-status" role="status">
              {lookup(`${mission}ui.unknown`)}
            </p>
          )}
          {story.availableChoices.length > 0 && (
            <div className="story-choices" aria-label={lookup(`${mission}journal.title`)!}>
              {story.availableChoices.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  disabled={busy || Boolean(pendingBody) || invalidPending}
                  onClick={() => void send(choice)}
                >
                  {choiceText(choice, story)}
                </button>
              ))}
            </div>
          )}
          <details className="story-journal">
            <summary>
              {lookup(`${mission}ui.journal`)} ({story.journal.length})
            </summary>
            <ol>
              {story.journal.map((fact) => (
                <li key={fact.factId}>
                  <p>{lookup(`${mission}journal.${fact.factId}`)}</p>
                  <small>
                    {lookup(`${mission}ui.source`)}: {sourceLabel(fact)} ·{' '}
                    {lookup(`${mission}ui.tick`)!.replace('{tick}', fact.learnedAtTick)}
                  </small>
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
      {pendingBody && (
        <button
          className="story-retry"
          type="button"
          disabled={busy || invalidPending}
          onClick={() => void send(undefined, true)}
        >
          {lookup(`${mission}ui.retry-command`)}
        </button>
      )}
      {!story && !pendingBody && (
        <button className="story-retry" type="button" onClick={() => void refresh()}>
          {lookup(`${mission}ui.retry-read`)}
        </button>
      )}
    </section>
  );
}
