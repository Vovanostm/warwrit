import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const webUrl = globalThis.process.env.WARWRIT_WEB_URL;
const playwrightCli = globalThis.process.env.WARWRIT_PLAYWRIGHT_CLI;

if (!webUrl) throw new Error('Set WARWRIT_WEB_URL to the running Warwrit Vite app URL.');
if (!playwrightCli)
  throw new Error('Set WARWRIT_PLAYWRIGHT_CLI to the installed Playwright CLI entrypoint.');

const playwrightRequire = createRequire(resolve(playwrightCli));
const { chromium } = playwrightRequire('playwright');
const playwrightVersion = JSON.parse(
  await readFile(playwrightRequire.resolve('playwright/package.json'), 'utf8'),
).version;

function createOpening(index) {
  return {
    schemaVersion: 1,
    opening: {
      candidateSetId: `browser-options-${index}`,
      companyId: 'browser-retry-company',
      bannerId: `server-issued-banner-${index}`,
      origin: { id: `origin-${index}`, label: `North ${index}` },
      culture: { id: 'culture-1', label: 'River' },
      homeland: { id: 'homeland-1', label: 'Marches' },
      familyStory: { id: 'family-1', label: 'Exiles' },
      leaderDefaults: {
        sex: 'female',
        birthCultureId: 'culture-1',
        birthplaceId: 'place-1',
        originId: `origin-${index}`,
        speciesId: 'human',
        bornAt: '0',
      },
      candidates: [
        {
          characterId: `candidate-${index}-1`,
          name: 'Alba',
          sex: 'female',
          templateId: 'template-1',
        },
        {
          characterId: `candidate-${index}-2`,
          name: 'Bren',
          sex: 'male',
          templateId: 'template-2',
        },
        {
          characterId: `candidate-${index}-3`,
          name: 'Cora',
          sex: 'female',
          templateId: 'template-3',
        },
      ],
      selection: { minCount: 1, maxCount: 2 },
      availability: { allCanonicalPlayerChoicesOpen: false },
    },
  };
}

const company = {
  companyId: 'browser-retry-company',
  revision: '1',
  leaderId: 'leader-1',
  runStatus: 'ACTIVE',
  characters: [
    { characterId: 'leader-1', name: 'Mara', nicknameTextKey: null, knownStatus: 'AVAILABLE' },
  ],
};

async function runScenario({
  name,
  accountIds,
  logoutStatuses = [],
  outcomes,
  openingCount = 1,
  switchAccountAfterLogout = false,
}) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    const commandBodies = [];
    let companyReads = 0;
    let created = false;
    let logoutCalls = 0;
    let openingReads = 0;
    let commandPosts = 0;
    let accountSwitched = false;

    await page.route('**/api/auth/session', (route) => {
      const accountId = accountIds[switchAccountAfterLogout && accountSwitched ? 1 : 0];
      return route.fulfill({ status: 200, json: { accountId } });
    });
    await page.route('**/api/auth/logout', (route) => {
      const status = logoutStatuses[Math.min(logoutCalls, logoutStatuses.length - 1)] ?? 204;
      logoutCalls += 1;
      if (switchAccountAfterLogout) accountSwitched = true;
      return route.fulfill({ status, json: status === 204 ? undefined : { error: 'Unavailable' } });
    });
    await page.route('**/api/company', (route) => {
      companyReads += 1;
      return route.fulfill({
        status: 200,
        json: { schemaVersion: 1, company: created ? company : null },
      });
    });
    await page.route('**/api/company/opening-options', (route) => {
      openingReads += 1;
      return route.fulfill({
        status: 200,
        json: createOpening(Math.min(openingReads, openingCount)),
      });
    });
    await page.route('**/api/company/commands', async (route) => {
      const rawBody = route.request().postData();
      assert.equal(typeof rawBody, 'string', `${name}: create request must have a raw body`);
      commandBodies.push(rawBody);
      commandPosts += 1;
      const outcome = outcomes[commandPosts - 1];
      assert.ok(outcome, `${name}: unexpected create submission ${commandPosts}`);
      if (outcome === 'lost') {
        await route.abort('failed');
        return;
      }
      const request = JSON.parse(rawBody);
      if (outcome === 'expired') {
        await route.fulfill({
          status: 409,
          json: { commandId: request.commandId, ok: false, code: 'INVALID_COMMAND' },
        });
        return;
      }
      assert.equal(outcome, 'accepted', `${name}: unsupported mocked create outcome`);
      created = true;
      await route.fulfill({
        status: 201,
        json: { commandId: request.commandId, ok: true, publicRevision: '1' },
      });
    });

    await page.goto(webUrl);
    await page.getByRole('heading', { name: 'Соберите компанию' }).waitFor();
    return {
      page,
      commandBodies,
      get commandPosts() {
        return commandPosts;
      },
      get openingReads() {
        return openingReads;
      },
      get companyReads() {
        return companyReads;
      },
    };
  } catch (error) {
    await context.close();
    throw error;
  }
}

async function fillCompanyForm(page, companyName) {
  await page.getByRole('textbox', { name: 'Имя главы' }).fill('Mara');
  await page.getByRole('textbox', { name: 'Название компании' }).fill(companyName);
  await page.getByRole('checkbox', { name: /Alba/u }).check();
  await page.getByRole('button', { name: 'Открыть компанию' }).click();
}

async function assertCompanyReady(page) {
  await page.getByRole('heading', { name: 'Ваша компания' }).waitFor();
  assert.equal(
    await page.getByRole('button', { name: 'Повторить сохранение компании' }).count(),
    0,
  );
  assert.equal(await page.getByText('Компания восстановлена').count(), 1);
}

function assertSameRequest(commandBodies, opening) {
  assert.equal(commandBodies.length, 2, 'both create request bodies must be captured');
  assert.equal(commandBodies[1], commandBodies[0], 'retry raw body must be byte-identical');
  const firstRequest = JSON.parse(commandBodies[0]);
  const retryRequest = JSON.parse(commandBodies[1]);
  assert.deepEqual(retryRequest, firstRequest, 'retry must preserve every request field');
  assert.equal(retryRequest.commandId, firstRequest.commandId, 'retry must reuse its command ID');
  assert.equal(retryRequest.payload.bannerId, opening.opening.bannerId);
  assert.equal('companyId' in retryRequest, false, 'client must not send companyId');
  assert.equal('companyId' in retryRequest.payload, false, 'client must not send companyId');
  return firstRequest;
}

let browser;
try {
  browser = await chromium.launch({
    headless: true,
    executablePath:
      globalThis.process.env.WARWRIT_CHROME ??
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  const directRetry = await runScenario({
    name: 'direct retry',
    accountIds: ['account-a'],
    outcomes: ['lost', 'accepted'],
  });
  try {
    await fillCompanyForm(directRetry.page, 'Ash Company');
    await directRetry.page.getByRole('button', { name: 'Повторить сохранение компании' }).waitFor();
    await directRetry.page.getByRole('button', { name: 'Повторить сохранение компании' }).click();
    await assertCompanyReady(directRetry.page);
    assertSameRequest(directRetry.commandBodies, createOpening(1));
    assert.equal(directRetry.companyReads, 2, 'company projection must be loaded after replay');
  } finally {
    await directRetry.page.context().close();
  }

  const restoredRetry = await runScenario({
    name: 'logout recovery',
    accountIds: ['account-a', 'account-a'],
    logoutStatuses: [503],
    outcomes: ['lost', 'accepted'],
  });
  try {
    await fillCompanyForm(restoredRetry.page, 'Ash Company');
    await restoredRetry.page
      .getByRole('button', { name: 'Повторить сохранение компании' })
      .waitFor();
    await restoredRetry.page.getByRole('button', { name: 'Выйти' }).click();
    await restoredRetry.page.getByRole('button', { name: 'Повторить проверку' }).waitFor();
    await restoredRetry.page.getByRole('button', { name: 'Повторить проверку' }).click();
    await restoredRetry.page.getByRole('heading', { name: 'Соберите компанию' }).waitFor();
    assert.equal(
      await restoredRetry.page.getByRole('textbox', { name: 'Имя главы' }).inputValue(),
      '',
    );
    assert.equal(
      await restoredRetry.page.getByRole('textbox', { name: 'Имя главы' }).isDisabled(),
      true,
    );
    await restoredRetry.page.getByRole('button', { name: 'Повторить сохранение компании' }).click();
    await assertCompanyReady(restoredRetry.page);
    assertSameRequest(restoredRetry.commandBodies, createOpening(1));
  } finally {
    await restoredRetry.page.context().close();
  }

  const changedAccount = await runScenario({
    name: 'account boundary',
    accountIds: ['account-a', 'account-b'],
    logoutStatuses: [503],
    outcomes: ['lost'],
    switchAccountAfterLogout: true,
  });
  try {
    await fillCompanyForm(changedAccount.page, 'Ash Company');
    await changedAccount.page
      .getByRole('button', { name: 'Повторить сохранение компании' })
      .waitFor();
    await changedAccount.page.getByRole('button', { name: 'Выйти' }).click();
    await changedAccount.page.getByRole('button', { name: 'Повторить проверку' }).click();
    await changedAccount.page.getByRole('heading', { name: 'Соберите компанию' }).waitFor();
    assert.equal(changedAccount.commandPosts, 1, 'different account must not replay prior request');
    assert.equal(
      await changedAccount.page.getByRole('textbox', { name: 'Имя главы' }).isDisabled(),
      false,
    );
    assert.equal(
      await changedAccount.page.getByRole('button', { name: 'Открыть компанию' }).isEnabled(),
      false,
    );
  } finally {
    await changedAccount.page.context().close();
  }

  const refreshedOpening = await runScenario({
    name: 'expired opening',
    accountIds: ['account-a'],
    openingCount: 2,
    outcomes: ['expired', 'accepted'],
  });
  try {
    await fillCompanyForm(refreshedOpening.page, 'Old Company');
    await refreshedOpening.page.getByText(/North 2, River/u).waitFor();
    await refreshedOpening.page
      .getByRole('textbox', { name: 'Название компании' })
      .fill('Fresh Company');
    await refreshedOpening.page.getByRole('textbox', { name: 'Имя главы' }).fill('Mara');
    await refreshedOpening.page.getByRole('checkbox', { name: /Alba/u }).check();
    await refreshedOpening.page.getByRole('button', { name: 'Открыть компанию' }).click();
    await assertCompanyReady(refreshedOpening.page);
    assert.equal(refreshedOpening.commandBodies.length, 2);
    assert.equal(refreshedOpening.openingReads, 2, '409 must trigger a fresh opening request');
    const expiredRequest = JSON.parse(refreshedOpening.commandBodies[0]);
    const freshRequest = JSON.parse(refreshedOpening.commandBodies[1]);
    assert.notEqual(freshRequest.commandId, expiredRequest.commandId);
    assert.notEqual(freshRequest.payload.candidateSetId, expiredRequest.payload.candidateSetId);
    assert.notEqual(freshRequest.payload.bannerId, expiredRequest.payload.bannerId);
    assert.equal(freshRequest.payload.candidateSetId, 'browser-options-2');
    assert.equal(freshRequest.payload.bannerId, 'server-issued-banner-2');
    assert.equal('companyId' in freshRequest.payload, false);
  } finally {
    await refreshedOpening.page.context().close();
  }

  globalThis.console.log(`App retry browser regressions passed (Playwright ${playwrightVersion}).`);
} finally {
  await browser?.close();
}
