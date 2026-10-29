import { useEffect, useRef, useState } from 'react';
import type {
  CompanyOpeningOptionsResponseDto,
  CompanyReadResponseDto,
  CreateCompanyPayloadDto,
} from '@warwrit/protocol';

import { refreshedCompanyCreatePayload } from './company-create-attempt.js';
import './local-company-login.css';

async function enterLocalCompany(apiBaseUrl: string, companyNumber: number): Promise<void> {
  const login = await fetch(`${apiBaseUrl}/auth/local-companies`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ companyNumber }),
  });
  if (!login.ok) throw new Error('Не удалось войти в тестовую учётную запись.');

  if ((await readLocalCompany(apiBaseUrl)).company === null)
    await createLocalCompany(apiBaseUrl, companyNumber);
}

async function readLocalCompany(apiBaseUrl: string): Promise<CompanyReadResponseDto> {
  const response = await fetch(`${apiBaseUrl}/company`, {
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('Не удалось прочитать тестовую компанию.');
  return (await response.json()) as CompanyReadResponseDto;
}

async function createLocalCompany(apiBaseUrl: string, companyNumber: number): Promise<void> {
  const options = await fetch(`${apiBaseUrl}/company/opening-options`, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  if (!options.ok) {
    if ((await readLocalCompany(apiBaseUrl)).company !== null) return;
    throw new Error('Не удалось подготовить тестовую компанию.');
  }
  const { opening } = (await options.json()) as CompanyOpeningOptionsResponseDto;
  const payload = refreshedCompanyCreatePayload(opening, opening, {
    name: `Тестовая компания ${companyNumber}`,
    leaderName: `Капитан ${companyNumber}`,
    selectedCandidateIds: opening.candidates
      .slice(0, opening.selection.maxCount)
      .map((candidate) => candidate.characterId),
  });
  await saveLocalCompany(apiBaseUrl, payload);
}

async function saveLocalCompany(
  apiBaseUrl: string,
  payload: CreateCompanyPayloadDto,
): Promise<void> {
  try {
    const created = await fetch(`${apiBaseUrl}/company/commands`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        schemaVersion: 1,
        commandId: crypto.randomUUID(),
        type: 'CreateCompany',
        payload,
      }),
    });
    if (!created.ok) throw new Error('Company creation rejected');
  } catch {
    // Recover a committed creation even if its response was lost or another tab won.
    if ((await readLocalCompany(apiBaseUrl)).company === null)
      throw new Error('Не удалось сохранить тестовую компанию. Повторите вход.');
  }
}

export function SignIn(props: {
  readonly apiBaseUrl: string;
  readonly onLogin: () => Promise<void>;
}) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState<number>();
  const [error, setError] = useState<string>();
  const pending = useRef(false);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const controller = new AbortController();
    void fetch(`${props.apiBaseUrl}/auth/local-companies`, {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return;
        const body = (await response.json()) as { companies?: unknown };
        if (!controller.signal.aborted)
          setAvailable(JSON.stringify(body.companies) === '[1,2,3,4]');
      })
      .catch(() => {});
    return () => controller.abort();
  }, [props.apiBaseUrl]);

  async function login(companyNumber: number) {
    if (pending.current) return;
    pending.current = true;
    setBusy(companyNumber);
    setError(undefined);
    try {
      await enterLocalCompany(props.apiBaseUrl, companyNumber);
      await props.onLogin();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось войти. Повторите попытку.');
    } finally {
      pending.current = false;
      setBusy(undefined);
    }
  }

  return (
    <>
      <a
        className="primary-action"
        href={busy === undefined ? `${props.apiBaseUrl}/auth/login` : undefined}
        aria-disabled={busy !== undefined}
      >
        Войти <span aria-hidden="true">↗</span>
      </a>
      {available && (
        <div className="local-company-login" aria-busy={busy !== undefined}>
          <p className="state-note">Быстрый вход · локальная разработка</p>
          <div className="local-company-actions" aria-label="Тестовые компании">
            {[1, 2, 3, 4].map((companyNumber) => (
              <button
                key={companyNumber}
                type="button"
                className="primary-action"
                disabled={busy !== undefined}
                onClick={() => void login(companyNumber)}
              >
                {busy === companyNumber ? 'Входим…' : `Войти за компанию ${companyNumber}`}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="state-note">
              {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}
