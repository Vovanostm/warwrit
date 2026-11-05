// Real ordinary-company journey; no route or state stubs.
import assert from 'node:assert/strict';
import process from 'node:process';
import console from 'node:console';
import { URL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const output = resolve(process.env.WARWRIT_BROWSER_OUTPUT ?? 'output/painted-game-browser');
let webOrigin;
let qaEmail = '';
let qaPassword = '';
const checkpoints = [];
const errors = [];
const coverage = [];
let failure;
let browser;

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment input: ${name}`);
  return value;
}

function loopbackOrigin(value, name) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a loopback HTTP origin.`);
  }
  const loopback = ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname);
  assert.equal(url.protocol, 'http:', `${name} must use local HTTP.`);
  assert.ok(loopback, `${name} must resolve to loopback.`);
  assert.equal(url.username, '', `${name} must not embed credentials.`);
  assert.equal(url.password, '', `${name} must not embed credentials.`);
  assert.ok(url.pathname === '/' && !url.search && !url.hash, `${name} must be an origin only.`);
  return url.origin;
}

function safeError(reason) {
  const message = reason instanceof Error ? reason.message : String(reason);
  return message
    .replaceAll(qaEmail || '\u0000', '<qa-email>')
    .replaceAll(qaPassword || '\u0000', '<qa-password>')
    .replace(/https?:\/\/[^\s)]+/gu, '<local-url>');
}

function checkpoint(name, detail) {
  checkpoints.push({ name, detail, status: 'PASS' });
}

function coverageFor(entries, origin) {
  return entries
    .filter((entry) => {
      const url = new URL(entry.url);
      const sourcePath = url.pathname;
      return (
        url.origin === origin &&
        !sourcePath.includes('/node_modules/') &&
        !sourcePath.includes('/@vite/') &&
        /\/(?:apps\/web\/src|src|scripts\/world-map)\//u.test(sourcePath) &&
        /\.(?:[cm]?js|tsx?)$/u.test(sourcePath)
      );
    })
    .map((entry) => {
      const url = new URL(entry.url);
      return { ...entry, url: `${url.origin}${url.pathname}` };
    });
}

function attachPageErrors(page, label) {
  page.on('pageerror', (error) => errors.push({ phase: label, message: safeError(error) }));
}

async function guardNavigation(page, label) {
  await page.route('**/*', (route) => {
    const request = route.request();
    if (!request.isNavigationRequest()) return route.continue();
    const url = new URL(request.url());
    if (
      url.protocol !== 'http:' ||
      !['127.0.0.1', 'localhost', '::1', '[::1]'].includes(url.hostname)
    ) {
      errors.push({ phase: label, message: 'Blocked a non-loopback page navigation.' });
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
}

async function loginIfNeeded(page) {
  const loginLink = page.getByRole('link', { name: /Войти/u });
  if (!(await loginLink.isVisible().catch(() => false))) return;
  await loginLink.click();
  const username = page
    .locator('input[type="email"], input[name="login"], input[name="username"], input[type="text"]')
    .first();
  await username.waitFor({ state: 'visible', timeout: 20000 });
  assert.equal(
    new URL(page.url()).origin,
    'http://127.0.0.1:5618',
    'fixture credentials require the approved local Dex',
  );
  await username.fill(qaEmail);

  let password = page.locator('input[type="password"]').first();
  if (!(await password.isVisible().catch(() => false))) {
    await page.locator('button[type="submit"], input[type="submit"]').last().click();
    await password.waitFor({ state: 'visible', timeout: 20000 });
  }
  assert.equal(new URL(page.url()).origin, 'http://127.0.0.1:5618');
  await password.fill(qaPassword);
  await page.locator('button[type="submit"], input[type="submit"]').last().click();
  await page.waitForFunction(
    () =>
      globalThis.document.querySelector('nav[aria-label="Разделы"]') !== null ||
      globalThis.document.querySelector('h1')?.textContent?.includes('Соберите компанию') === true,
    undefined,
    { timeout: 30000 },
  );
  checkpoint(
    'local OIDC sign-in',
    'completed through the game sign-in link and identity-provider form',
  );
}

async function openCompanyOnlyWhenEmpty(page) {
  const opening = page.getByRole('heading', { name: 'Соберите компанию' });
  if (!(await opening.isVisible().catch(() => false))) return;
  assert.equal(
    await page.getByRole('button', { name: 'Повторить сохранение компании' }).count(),
    0,
    'an unresolved company write needs owner review before retry',
  );
  const candidates = page.locator('form.opening-form input[type="checkbox"]');
  assert.ok((await candidates.count()) > 0, 'company opening must offer a companion');
  await candidates.first().check();
  assert.equal(await page.locator('form.opening-form input[type="checkbox"]:checked').count(), 1);
  await page.locator('input[name="leaderName"]').fill('Тестовый проводник');
  await page.locator('input[name="companyName"]').fill('Проверка рисованной карты');
  await page.getByRole('button', { name: 'Открыть компанию' }).click();
  await page.locator('nav[aria-label="Разделы"]').waitFor({ state: 'visible', timeout: 30000 });
  checkpoint(
    'empty account opened normally',
    'created one company with exactly one selected companion',
  );
}

function waitForOwnedCompanyRead(page) {
  return page.waitForResponse(
    async (response) => {
      const url = new URL(response.url());
      if (
        !url.pathname.endsWith('/company') ||
        response.request().method() !== 'GET' ||
        !response.ok()
      )
        return false;
      try {
        const body = await response.json();
        return typeof body?.company?.companyId === 'string';
      } catch {
        return false;
      }
    },
    { timeout: 30000 },
  );
}

async function waitForCompanyAndMap(page, tileResponses, tileOffset = 0) {
  await page.locator('nav[aria-label="Разделы"]').waitFor({ state: 'visible', timeout: 30000 });
  const map = page.locator('svg.painted-world-map');
  await map.waitFor({ state: 'visible', timeout: 30000 });
  await page.waitForFunction(
    () => {
      const images = [...globalThis.document.querySelectorAll('g.painted-map-tiles image')];
      return (
        images.length > 0 &&
        images.every(
          (image) =>
            image.getAttribute('opacity') === '1' &&
            image.getAttribute('href')?.startsWith('blob:'),
        )
      );
    },
    undefined,
    { timeout: 30000 },
  );
  await page.waitForFunction(
    () => globalThis.document.querySelector('.painted-map-error') === null,
  );
  await map
    .locator('.painted-map-party[visibility="visible"]')
    .waitFor({ state: 'attached', timeout: 10000 });
  assert.ok(
    tileResponses.slice(tileOffset).some((status) => status === 200),
    'a scoped cartography tile must load',
  );
  return map;
}

async function exerciseMapCamera(page, map) {
  const beforeZoom = await map.getAttribute('viewBox');
  const bounds = await map.boundingBox();
  assert.ok(bounds, 'painted map needs a visible viewport');
  const center = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
  await page.mouse.move(center.x, center.y);
  await page.mouse.wheel(0, -360);
  await page.waitForFunction(
    (before) =>
      globalThis.document.querySelector('svg.painted-world-map')?.getAttribute('viewBox') !==
      before,
    beforeZoom,
    { timeout: 5000 },
  );

  const view = (await map.getAttribute('viewBox')).split(/\s+/u).map(Number);
  const sheetWidth = Number(await map.locator('.painted-map-ground').getAttribute('width'));
  const dragX = view[0] + view[2] < sheetWidth - 1 ? -80 : 80;
  const beforeDrag = await map.getAttribute('viewBox');
  await page.mouse.move(center.x, center.y);
  await page.mouse.down();
  await page.mouse.move(center.x + dragX, center.y + 35, { steps: 4 });
  await page.mouse.up();
  await page.waitForFunction(
    (before) =>
      globalThis.document.querySelector('svg.painted-world-map')?.getAttribute('viewBox') !==
      before,
    beforeDrag,
    { timeout: 5000 },
  );

  const afterDrag = (await map.getAttribute('viewBox')).split(/\s+/u).map(Number);
  const key = afterDrag[0] + afterDrag[2] < sheetWidth - 1 ? 'KeyD' : 'KeyA';
  await map.focus();
  const beforeKeys = await map.getAttribute('viewBox');
  await page.keyboard.down(key);
  await page.waitForTimeout(220);
  await page.keyboard.up(key);
  await page.waitForFunction(
    (before) =>
      globalThis.document.querySelector('svg.painted-world-map')?.getAttribute('viewBox') !==
      before,
    beforeKeys,
    { timeout: 5000 },
  );
  checkpoint(
    'painted map controls',
    'wheel zoom, pointer drag, and native camera key each changed the view',
  );
}

async function chooseReachableSite(page, map, observerSiteId) {
  await page.getByRole('button', { name: 'Путь' }).click();
  const mapRect = await map.evaluate((node) => {
    const { left, right, top, bottom } = node.getBoundingClientRect();
    return { left, right, top, bottom };
  });
  const positions = await map
    .locator('.painted-site[role="button"][data-site-id]')
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const matrix = node.getScreenCTM();
        const label = node.querySelector('.site-label');
        if (!matrix || !label) return null;
        const style = globalThis.getComputedStyle(label);
        const labelRect = label.getBoundingClientRect();
        const point = new globalThis.DOMPoint(0, 0).matrixTransform(matrix);
        return {
          siteId: node.getAttribute('data-site-id'),
          name: node.getAttribute('aria-label'),
          x: point.x,
          y: point.y,
          labelX: labelRect.x + labelRect.width / 2,
          labelY: labelRect.y + labelRect.height / 2,
          labelDisplay: style.display,
          labelVisibility: style.visibility,
          labelWidth: labelRect.width,
        };
      }),
    );
  const markers = positions.filter(
    (marker) =>
      marker?.siteId &&
      marker.labelDisplay !== 'none' &&
      marker.labelVisibility !== 'hidden' &&
      marker.labelWidth !== 0 &&
      marker.x >= mapRect.left &&
      marker.x <= mapRect.right &&
      marker.y >= mapRect.top &&
      marker.y <= mapRect.bottom &&
      marker.labelX >= mapRect.left &&
      marker.labelX <= mapRect.right &&
      marker.labelY >= mapRect.top &&
      marker.labelY <= mapRect.bottom,
  );
  assert.ok(markers.length > 0, 'a known site marker must be visible');

  const own = await map.locator('.painted-map-party').evaluate((party) => {
    if (party.getAttribute('visibility') === 'hidden') return null;
    const matrix = party.getScreenCTM();
    if (!matrix) return null;
    const point = new globalThis.DOMPoint(0, 0).matrixTransform(matrix);
    return { x: point.x, y: point.y };
  });
  const nearest = markers
    .filter((marker) => marker.siteId !== observerSiteId)
    .sort((left, right) => {
      if (own === null) return 0;
      return (
        Math.hypot(left.x - own.x, left.y - own.y) - Math.hypot(right.x - own.x, right.y - own.y)
      );
    })[0];
  assert.ok(nearest, 'a visible known site away from the current marker must be available');
  const currentName = await map
    .locator(`[data-site-id="${observerSiteId}"]`)
    .getAttribute('aria-label');
  assert.ok(currentName, 'the actual settlement must be visible on the known map');
  await map.locator(`[data-site-id="${nearest.siteId}"] .site-disc`).click();
  await page.getByText(`Выбрано на карте: ${nearest.name}`, { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Место' }).click();
  await page
    .getByRole('region', { name: 'Место', exact: true })
    .getByRole('heading', { name: currentName, exact: true })
    .waitFor();
  await page.getByRole('button', { name: 'Путь' }).click();
  checkpoint('known site selected', `selected ${nearest.siteId}, retained the actual settlement`);
  return nearest;
}

async function moveAndStop(page, map, marker) {
  const acceptedMove = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());
      return (
        url.pathname.endsWith('/world/free-movement') && response.request().method() === 'POST'
      );
    },
    { timeout: 20000 },
  );
  await map.locator(`[data-site-id="${marker.siteId}"] .site-label`).click({ button: 'right' });
  const response = await acceptedMove;
  const body = await response.json();
  const moving = response.status() === 200 && body.result === 'ACCEPTED' && body.mode === 'MOVING';
  let movementMayBeActive = body.result === 'ACCEPTED' && body.mode === 'MOVING';
  const sendStop = async () => {
    const acceptedStop = page.waitForResponse(
      (reply) => {
        const url = new URL(reply.url());
        return url.pathname.endsWith('/world/free-movement') && reply.request().method() === 'POST';
      },
      { timeout: 20000 },
    );
    await map.focus();
    await page.keyboard.press('Space');
    const stopped = await acceptedStop;
    const stoppedBody = await stopped.json();
    assert.equal(stopped.request().postDataJSON().action.kind, 'STOP');
    if (
      stopped.status() === 200 &&
      stoppedBody.result === 'ACCEPTED' &&
      stoppedBody.mode !== 'MOVING'
    )
      movementMayBeActive = false;
    assert.equal(stopped.status(), 200, 'server must accept the normal STOP command');
    assert.equal(stoppedBody.result, 'ACCEPTED');
    assert.notEqual(stoppedBody.mode, 'MOVING');
  };
  try {
    const requested = response.request().postDataJSON();
    assert.equal(requested.action.kind, 'MOVE_TO');
    assert.deepEqual(requested.action.target, { kind: 'SITE', siteId: marker.siteId });
    assert.ok(moving, 'server must accept the selected SITE target as active movement');
    await sendStop();
    checkpoint(
      'server movement and STOP',
      'server accepted a reachable SITE move, then accepted Space STOP',
    );
  } finally {
    if (movementMayBeActive) {
      try {
        await sendStop();
      } catch (reason) {
        errors.push({ phase: 'movement cleanup', message: safeError(reason) });
      }
    }
  }
}

async function ordinaryJourney() {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const tileResponses = [];
  attachPageErrors(page, 'ordinary');
  await guardNavigation(page, 'ordinary');
  page.on('response', (response) => {
    const path = new URL(response.url()).pathname;
    if (path.includes('/world/cartography/tiles/')) tileResponses.push(response.status());
  });
  await page.coverage.startJSCoverage({ resetOnNavigation: false });
  try {
    const initialCompanyRead = waitForOwnedCompanyRead(page);
    const initialMapRead = page.waitForResponse(
      async (response) => {
        if (!new URL(response.url()).pathname.endsWith('/world/surroundings') || !response.ok())
          return false;
        const body = await response.json();
        return Boolean(body.map?.cartography);
      },
      { timeout: 30000 },
    );
    await page.goto(webOrigin, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      () =>
        globalThis.document.querySelector('nav[aria-label="Разделы"]') !== null ||
        globalThis.document.querySelector('a[href$="/auth/login"]') !== null ||
        globalThis.document.querySelector('h1')?.textContent?.includes('Соберите компанию') ===
          true,
      undefined,
      { timeout: 20000 },
    );
    await loginIfNeeded(page);
    await openCompanyOnlyWhenEmpty(page);
    let map = await waitForCompanyAndMap(page, tileResponses);
    checkpoint(
      'painted cartography loaded',
      `${tileResponses.filter((status) => status === 200).length} successful local tile responses`,
    );
    const companyName = (await page.locator('.topbar-name').innerText()).trim();
    assert.ok(companyName, 'existing company name should be visible');
    const initialCompanyBody = await (await initialCompanyRead).json();
    const companyId = initialCompanyBody.company.companyId;
    await page.screenshot({ path: resolve(output, 'painted-map.png') });

    await page.getByRole('button', { name: 'Отряд', exact: true }).click();
    assert.equal(
      await page.getByRole('button', { name: 'Отряд', exact: true }).getAttribute('aria-pressed'),
      'true',
    );
    await page.getByRole('button', { name: 'Место' }).click();
    assert.equal(
      await page.getByRole('button', { name: 'Место' }).getAttribute('aria-pressed'),
      'true',
    );
    await page.getByRole('button', { name: 'Путь' }).click();
    checkpoint('company and place tabs', 'opened both ordinary company and place tabs');

    await exerciseMapCamera(page, map);
    const observerSiteId = (await (await initialMapRead).json()).observerSiteId;
    const marker = await chooseReachableSite(page, map, observerSiteId);
    await moveAndStop(page, map, marker);
    await page.getByRole('button', { name: 'Отряд', exact: true }).click();
    await page.getByRole('button', { name: 'Место' }).click();
    await page.getByRole('button', { name: 'Путь' }).click();
    coverage.push(...coverageFor(await page.coverage.stopJSCoverage(), webOrigin));
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    const tileOffset = tileResponses.length;
    const reloadedCompanyRead = waitForOwnedCompanyRead(page);
    await page.reload({ waitUntil: 'domcontentloaded' });
    map = await waitForCompanyAndMap(page, tileResponses, tileOffset);
    assert.equal((await page.locator('.topbar-name').innerText()).trim(), companyName);
    const reloadedCompanyBody = await (await reloadedCompanyRead).json();
    assert.equal(
      reloadedCompanyBody.company.companyId,
      companyId,
      'same server company id must survive reload',
    );
    await page.screenshot({ path: resolve(output, 'painted-map-after-reload.png') });
    checkpoint(
      'reload retained company',
      'same company remained after reload and its map reloaded',
    );
    assert.deepEqual(
      errors.filter((entry) => entry.phase === 'ordinary'),
      [],
    );
    assert.ok(
      tileResponses.every((status) => status === 200),
      'every requested scoped tile must load',
    );
  } catch (reason) {
    if (
      await page
        .locator('nav[aria-label="Разделы"]')
        .isVisible()
        .catch(() => false)
    ) {
      await page.screenshot({ path: resolve(output, 'painted-map-failed.png') });
      await writeFile(
        resolve(output, 'failure-place.txt'),
        await page.locator('section.place-panel').innerText(),
      );
    }
    throw reason;
  } finally {
    try {
      coverage.push(...coverageFor(await page.coverage.stopJSCoverage(), webOrigin));
    } catch (reason) {
      errors.push({ phase: 'ordinary coverage', message: safeError(reason) });
    }
    try {
      await context.close();
    } catch (reason) {
      errors.push({ phase: 'ordinary browser cleanup', message: safeError(reason) });
    }
  }
}

await mkdir(output, { recursive: true });
try {
  webOrigin = loopbackOrigin(required('WARWRIT_WEB_URL'), 'WARWRIT_WEB_URL');
  qaEmail = required('WARWRIT_QA_EMAIL');
  qaPassword = required('WARWRIT_QA_PASSWORD');
  browser = await chromium.launch({});
  await ordinaryJourney();
} catch (reason) {
  failure = safeError(reason);
  errors.push({ phase: 'journey', message: failure });
} finally {
  if (browser) {
    try {
      await browser.close();
    } catch (reason) {
      errors.push({ phase: 'browser cleanup', message: safeError(reason) });
      if (!failure) failure = safeError(reason);
    }
  }
  if (!failure && errors.length > 0) failure = 'browser errors were recorded; see journey.json';
  await writeFile(
    resolve(output, 'journey.json'),
    JSON.stringify({ checkpoints, errors, failure }, null, 2),
  );
  await writeFile(resolve(output, 'browser.json'), JSON.stringify({ entries: coverage }));
}

if (failure) {
  console.error(`Painted game browser journey failed: ${failure}`);
  process.exitCode = 1;
} else {
  console.log(
    `Painted game browser journey passed: ${checkpoints.map(({ name }) => name).join('; ')}`,
  );
}
