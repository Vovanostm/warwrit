import type { EncounterCommandDto, EncounterControlGrantDto } from '@warwrit/protocol';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { EncounterLiveLane } from './EncounterLiveLane.js';

const pendingCommand: EncounterCommandDto = {
  encounterId: 'encounter-1',
  commandId: 'command-1',
  expectedRevision: 3,
  activationId: 'activation-1',
  actorId: 'fighter-1',
  version: 2,
  intent: { type: 'wait' },
};

it('keeps the same-command retry inside the fullscreen live lane', () => {
  const html = renderToStaticMarkup(
    <EncounterLiveLane
      status="reconnecting"
      statusLabel="Связь прервана · восстанавливаем подключение"
      battleActive
      resumePending={false}
      commandPending={false}
      pendingCommand={pendingCommand}
      onResume={() => {}}
      onRetry={() => {}}
    />,
  );

  expect(html).toMatch(
    /<div class="encounter-live-lane"><span[^>]*>Связь прервана · восстанавливаем подключение<\/span><div class="encounter-command-pending" role="status">/,
  );
  expect(html).toContain('Повтор отправит тот же запрос с тем же ID.');
  expect(html).toContain('<button class="quiet-action" type="button">Повторить команду</button>');
});

it('hides AFK controls after battle resolution but keeps an uncertain command retry', () => {
  const html = renderToStaticMarkup(
    <EncounterLiveLane
      status="connected"
      statusLabel="Сводка боя синхронизирована"
      battleActive={false}
      grant={{
        version: 1,
        encounterId: 'encounter-1',
        revision: 4,
        controllableUnitIds: ['fighter-1'],
        selfAfk: true,
        resumeRequestedAfterEpoch: null,
      }}
      resumePending={false}
      commandPending={false}
      pendingCommand={pendingCommand}
      onResume={() => {}}
      onRetry={() => {}}
    />,
  );

  expect(html).not.toContain('Вы отмечены сервером как бездействующий участник.');
  expect(html).not.toContain('Вернуться к управлению');
  expect(html).toContain('Повторить команду');
});

it('hides routine AFK state notices after battle resolution', () => {
  const grants = [
    {
      version: 1 as const,
      encounterId: 'encounter-1',
      revision: 4,
      controllableUnitIds: ['fighter-1'],
      selfAfk: false,
    },
    undefined,
  ];

  for (const grant of grants) {
    const html = renderToStaticMarkup(
      <EncounterLiveLane
        status="connected"
        statusLabel="Сводка боя синхронизирована"
        battleActive={false}
        {...(grant !== undefined ? { grant } : {})}
        resumePending={false}
        commandPending={false}
        onResume={() => {}}
        onRetry={() => {}}
      />,
    );

    expect(html).not.toContain('Сервер не считает вас бездействующим участником.');
    expect(html).not.toContain('Состояние бездействия недоступно в этой версии службы.');
  }
});

it('shows active AFK resume progress and the accepted next-turn state', () => {
  const baseGrant: EncounterControlGrantDto = {
    version: 1 as const,
    encounterId: 'encounter-1',
    revision: 4,
    controllableUnitIds: ['fighter-1'],
    selfAfk: true,
    resumeRequestedAfterEpoch: null,
  };
  const renderLane = (
    status: 'connected' | 'reconnecting',
    resumePending: boolean,
    grant: EncounterControlGrantDto,
  ) =>
    renderToStaticMarkup(
      <EncounterLiveLane
        status={status}
        statusLabel="Бой продолжается"
        battleActive
        grant={grant}
        resumePending={resumePending}
        commandPending={false}
        onResume={() => {}}
        onRetry={() => {}}
      />,
    );

  const pending = renderLane('connected', true, baseGrant);
  expect(pending).toContain('Вы отмечены сервером как бездействующий участник.');
  expect(pending).toContain('disabled=""');
  expect(pending).toContain('Отправляем запрос…');

  const reconnecting = renderLane('reconnecting', false, baseGrant);
  expect(reconnecting).toContain('Вернуться к управлению');
  expect(reconnecting).toContain('disabled=""');

  const accepted = renderLane('connected', false, {
    ...baseGrant,
    resumeRequestedAfterEpoch: 5,
  });
  expect(accepted).toContain('Запрос на возвращение принят; он подействует после следующего хода.');
  expect(accepted).not.toContain('Вернуться к управлению');
});
