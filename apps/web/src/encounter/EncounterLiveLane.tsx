import type { EncounterCommandDto, EncounterControlGrantDto } from '@warwrit/protocol';
import type { EncounterConnectionStatus } from './connection.js';

export function EncounterLiveLane({
  status,
  statusLabel,
  battleActive,
  message,
  grant,
  resumePending,
  commandPending,
  pendingCommand,
  onResume,
  onRetry,
}: {
  readonly status: EncounterConnectionStatus;
  readonly statusLabel: string;
  readonly battleActive: boolean;
  readonly message?: string;
  readonly grant?: EncounterControlGrantDto;
  readonly resumePending: boolean;
  readonly commandPending: boolean;
  readonly pendingCommand?: EncounterCommandDto;
  readonly onResume: () => void;
  readonly onRetry: (command: EncounterCommandDto) => void;
}) {
  return (
    <div className="encounter-live-lane">
      <span className={`encounter-status encounter-status-${status}`} role="status">
        {statusLabel}
      </span>
      {message && <p className="encounter-message" role="status">{message}</p>}
      <ParticipantActivity status={status} active={battleActive} selfAfk={grant?.selfAfk} />
      {pendingCommand && (
        <PendingCommand
          pending={commandPending}
          command={pendingCommand}
          onRetry={onRetry}
        />
      )}
      {battleActive && grant?.selfAfk === true && (
        <ResumeNotice
          status={status}
          pending={resumePending}
          requestedAfterEpoch={grant.resumeRequestedAfterEpoch}
          onResume={onResume}
        />
      )}
    </div>
  );
}

function ParticipantActivity({
  status,
  active,
  selfAfk,
}: {
  status: EncounterConnectionStatus;
  active: boolean;
  selfAfk: boolean | undefined;
}) {
  if (!active) return null;
  if (selfAfk === false)
    return <p className="state-note">Сервер не считает вас бездействующим участником.</p>;
  if (selfAfk === undefined && status === 'connected')
    return <p className="state-note">Состояние бездействия недоступно в этой версии службы.</p>;
  return null;
}

function PendingCommand({
  pending,
  command,
  onRetry,
}: {
  pending: boolean;
  command: EncounterCommandDto;
  onRetry: (command: EncounterCommandDto) => void;
}) {
  return (
    <div className="encounter-command-pending" role="status">
      <p>
        {pending
          ? 'Ждём подтверждение команды.'
          : 'Ответ не подтверждён. Повтор отправит тот же запрос с тем же ID.'}
      </p>
      {!pending && (
        <button className="quiet-action" type="button" onClick={() => onRetry(command)}>
          Повторить команду
        </button>
      )}
    </div>
  );
}

function ResumeNotice({
  status,
  pending,
  requestedAfterEpoch,
  onResume,
}: {
  status: EncounterConnectionStatus;
  pending: boolean;
  requestedAfterEpoch: number | null | undefined;
  onResume: () => void;
}) {
  return (
    <div className="encounter-afk" role="status">
      <p>Вы отмечены сервером как бездействующий участник.</p>
      {requestedAfterEpoch !== null && requestedAfterEpoch !== undefined ? (
        <p>Запрос на возвращение принят; он подействует после следующего хода.</p>
      ) : (
        <button
          className="quiet-action"
          type="button"
          disabled={pending || status !== 'connected'}
          onClick={onResume}
        >
          {pending ? 'Отправляем запрос…' : 'Вернуться к управлению'}
        </button>
      )}
    </div>
  );
}
