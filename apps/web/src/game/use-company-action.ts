import { useEffect, useRef, useState } from 'react';
import {
  browserCompanyRosterStorage,
  clearCompanyRosterAttempt,
  companyRosterAttemptKey,
  matchesCompanyRosterScope,
  persistCompanyRosterAttempt,
  postCompanyRosterAttempt,
  readCompanyRosterAttempt,
  type CompanyRosterAttempt,
  type CompanyRosterCommand,
  type CompanyRosterScope,
} from './company-roster-attempt.js';

type Action = Extract<
  CompanyRosterCommand,
  { type: 'EquipItem' | 'BeginFieldCamp' | 'EndFieldCamp' }
>;
const types = ['EquipItem', 'BeginFieldCamp', 'EndFieldCamp'] as const;
const unknownMessage = 'Ответ на приказ неизвестен. Повторите сохранённый приказ.';
const storageMessage = 'Не удалось прочитать или сохранить приказ. Проверьте хранилище браузера.';

/** Uses the existing company attempt transport; never applies a command's game effects. */
export function useCompanyAction(
  apiBaseUrl: string,
  scope: CompanyRosterScope | undefined,
  refresh: (scope: CompanyRosterScope) => Promise<unknown>,
  onUnauthorized: () => void,
) {
  const [pending, setPending] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const generation = useRef(0);
  const sending = useRef(false);

  useEffect(() => {
    generation.current++;
    sending.current = false;
    setBusy(false);
    setMessage(undefined);
    setPending(false);
    if (!scope) return;
    try {
      const storage = browserCompanyRosterStorage();
      if (!storage) throw new Error('storage unavailable');
      const occupied = types.some(
        (type) => storage.getItem(companyRosterAttemptKey(scope, type)) !== null,
      );
      setPending(occupied);
      if (occupied) setMessage(unknownMessage);
    } catch {
      setPending(true);
      setMessage(storageMessage);
    }
  }, [scope?.accountId, scope?.companyId]);

  async function execute(request?: Action) {
    const owner = scope;
    if (!owner || sending.current || !matchesCompanyRosterScope(activeScope.current, owner)) return;
    const token = generation.current;
    const current = () =>
      generation.current === token && matchesCompanyRosterScope(activeScope.current, owner);
    sending.current = true;
    setBusy(true);
    let attempt: CompanyRosterAttempt | undefined;
    try {
      const storage = browserCompanyRosterStorage();
      if (!storage) throw new Error('storage unavailable');
      // Resolve any occupied action slot before admitting a new equipment/camp intent.
      for (const type of types) {
        if (storage.getItem(companyRosterAttemptKey(owner, type)) === null) continue;
        attempt = readCompanyRosterAttempt(storage, owner, type);
        if (!attempt) throw new Error('damaged saved command');
        break;
      }
      if (!attempt && request) {
        const saved = persistCompanyRosterAttempt(storage, owner, request);
        if (saved.kind !== 'SAVED' && saved.kind !== 'EXISTING')
          throw new Error('command not saved');
        attempt = saved.attempt;
      }
      if (!attempt) {
        setPending(false);
        setMessage(undefined);
        return;
      }
      setPending(true);
      setMessage('Проверяем сохранённый приказ…');
      const result = await postCompanyRosterAttempt(apiBaseUrl, attempt);
      if (!current()) return;
      if (result === 'UNAUTHENTICATED') {
        setMessage('Сеанс истёк. После входа повторите сохранённый приказ.');
        onUnauthorized();
        return;
      }
      if (result === 'UNKNOWN') {
        setMessage(unknownMessage);
        return;
      }
      const completedType = attempt.type;
      const remaining = types.some(
        (type) =>
          type !== completedType && storage.getItem(companyRosterAttemptKey(owner, type)) !== null,
      );
      if (!clearCompanyRosterAttempt(storage, attempt)) throw new Error('command not cleared');
      setPending(remaining);
      setMessage(
        result === 'ACCEPTED'
          ? 'Приказ подтверждён.'
          : 'Сервер отклонил приказ. Проверьте сведения отряда; затем можно отдать новый приказ.',
      );
      try {
        await refresh(owner);
      } catch {
        if (current())
          setMessage(
            'Ответ сервера получен, но сведения отряда не обновились. Повторите обновление отряда.',
          );
      }
    } catch {
      if (current()) {
        setPending(true);
        setMessage(attempt ? unknownMessage : storageMessage);
      }
    } finally {
      if (current()) {
        sending.current = false;
        setBusy(false);
      }
    }
  }

  return {
    pending,
    busy,
    message,
    send: (request: Action) => execute(request),
    retry: () => execute(),
  };
}
