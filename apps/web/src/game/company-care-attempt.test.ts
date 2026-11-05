// @vitest-environment jsdom
import { act, createElement, type ComponentProps } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { classifyCompanyCarePost, readCompanyCareAttempt } from './company-care-attempt.js';
import { CompanyCarePanel } from './CompanyCarePanel.js';

const request = {
  schemaVersion: 2 as const,
  commandId: 'care-command',
  expectedPublicRevision: '7',
  type: 'ApplyCare' as const,
  payload: {
    characterId: 'patient',
    conditionId: 'wound-instance',
    providerId: 'doctor',
    resourceItemId: 'medical-unit',
  },
};

describe('company care command retry', () => {
  it('restores the exact pending request for the same account and company', () => {
    const raw = JSON.stringify({ accountId: 'account', companyId: 'company', request });
    expect(readCompanyCareAttempt(raw, 'account', 'company')).toEqual(request);
    expect(readCompanyCareAttempt(raw, 'other-account', 'company')).toBeUndefined();
    expect(readCompanyCareAttempt(raw, 'account', 'other-company')).toBeUndefined();
  });

  it('keeps mismatched and incomplete responses unknown until a terminal receipt arrives', () => {
    expect(
      classifyCompanyCarePost(
        200,
        { commandId: 'other', ok: true, publicRevision: '8' },
        request.commandId,
      ),
    ).toBe('UNKNOWN');
    expect(
      classifyCompanyCarePost(
        200,
        { commandId: request.commandId, ok: true, publicRevision: '8' },
        request.commandId,
      ),
    ).toBe('ACCEPTED');
    expect(
      classifyCompanyCarePost(
        409,
        { commandId: request.commandId, ok: false, publicRevision: '7', code: 'STALE_REVISION' },
        request.commandId,
      ),
    ).toBe('REJECTED');
  });

  it('reuses the stored UI request after transport loss and a reauthentication refusal', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const post = vi.fn<typeof fetch>();
    post.mockRejectedValueOnce(new TypeError('Network reply lost'));
    post.mockResolvedValue(new Response('{"error":"authentication required"}', { status: 401 }));
    vi.stubGlobal('fetch', post);
    const props = {
      accountId: 'account',
      company: {
        companyId: 'company',
        revision: '7',
        companyPresentation: null,
        leaderId: 'doctor',
        runStatus: 'ACTIVE',
        characters: ['patient', 'doctor'].map((characterId) => ({
          characterId,
          name: characterId,
          nicknameTextKey: null,
          perkIds: [],
          knownStatus: 'AVAILABLE' as const,
        })),
      },
      holdings: {
        cashQ: '0',
        wallets: [],
        items: [],
        people: [],
        fieldCamp: false,
        wagesOwedQ: '0',
        wagesDueQ: '0',
        care: {
          treatments: [
            {
              characterId: 'patient',
              conditionId: 'wound-instance',
              definitionId: 'WOUND-HEAVY',
              careDefinitionId: 'CARE-WOUND',
              providers: [{ characterId: 'doctor' }],
              materials: [{ itemId: 'medical-unit', definitionId: 'MEDICAL', quantity: 1 }],
            },
          ],
        },
      },
      onRefresh: vi.fn(),
    } satisfies ComponentProps<typeof CompanyCarePanel>;
    const storageKey = 'warwrit:company-care:account:company';
    const host = document.createElement('div');
    document.body.append(host);
    let root = createRoot(host);
    try {
      await act(async () => root.render(createElement(CompanyCarePanel, props)));
      expect(host.querySelector('button')?.textContent).toBe('Провести уход');
      await act(async () => host.querySelector('button')!.click());
      expect(post).toHaveBeenCalledTimes(1);
      const firstBody = post.mock.calls[0]![1]?.body;
      expect(firstBody).toEqual(expect.any(String));
      const firstRequest = JSON.parse(firstBody as string);
      expect(firstRequest).toMatchObject({ ...request, commandId: expect.any(String) });
      const saved = sessionStorage.getItem(storageKey);
      expect(JSON.parse(saved!).request).toEqual(firstRequest);
      expect(host.textContent).toContain('Ответ о лечении неизвестен. Повторите тот же приказ.');

      await act(async () => root.unmount());
      root = createRoot(host);
      await act(async () => root.render(createElement(CompanyCarePanel, props)));
      expect(host.querySelector('button')?.textContent).toBe('Повторить тот же приказ');
      await act(async () => host.querySelector('button')!.click());
      expect(post).toHaveBeenCalledTimes(2);
      expect(post.mock.calls[1]![1]?.body).toBe(firstBody);
      expect(sessionStorage.getItem(storageKey)).toBe(saved);
      expect(host.textContent).toContain('Войдите снова и повторите тот же приказ о лечении.');
      expect(props.onRefresh).not.toHaveBeenCalled();
    } finally {
      await act(async () => root.unmount());
      host.remove();
      sessionStorage.removeItem(storageKey);
      vi.unstubAllGlobals();
    }
  });
});
