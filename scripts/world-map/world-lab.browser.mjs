// Real browser/server journey; no substitute world state or successful HTTP responses.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { CloseCode } from '@colyseus/sdk';

const output = resolve(process.env.WORLD_LAB_BROWSER_OUTPUT ?? 'output/world-lab-ci');
const url = 'http://127.0.0.1:5338/scripts/world-map/world-lab.html';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.WORLD_LAB_CHROMIUM ? { executablePath: process.env.WORLD_LAB_CHROMIUM } : {}),
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => {
  const NativeSocket = globalThis.WebSocket;
  globalThis.worldLabSockets = [];
  globalThis.WebSocket = class extends NativeSocket {
    constructor(...args) {
      super(...args);
      globalThis.worldLabSockets.push(this);
    }
  };
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
const results = [];

function response(path) {
  return page.waitForResponse(
    (reply) => reply.url().endsWith(`/world-lab/${path}`) && reply.request().method() === 'POST',
  );
}
async function state() {
  return page.evaluate(async () => (await fetch('/world-lab-api/world-lab/state')).json());
}
async function rightClickMarker(selector) {
  const at = await page.locator(selector).evaluate((marker) => {
    const point = new globalThis.DOMPoint(0, 0).matrixTransform(marker.getScreenCTM());
    return { x: point.x, y: point.y };
  });
  await page.mouse.click(at.x, at.y, { button: 'right' });
}
async function stop() {
  if (await page.locator('#stop').isDisabled()) return;
  const accepted = response('movement');
  await page.locator('#map').focus();
  await page.keyboard.press('Space');
  assert.equal((await accepted).status(), 200);
  await page.waitForFunction(() => globalThis.document.querySelector('#stop').disabled);
}
async function selectPlayer(target, slot) {
  await target.goto(url);
  await target.locator('[data-slot="company-a"]').waitFor();
  await target.locator(`[data-slot="${slot}"]`).click();
  await target.waitForFunction(() => globalThis.document.body.dataset.connection === 'live');
}
async function visit() {
  await page.locator('#fit').click();
  const accepted = response('movement');
  await rightClickMarker('[data-site-id="bereznyak"]');
  const reply = await accepted;
  assert.equal(reply.status(), 200);
  const acceptedAt = (await reply.json()).serverTimeMs;
  await page.waitForFunction(
    (time) =>
      BigInt(globalThis.document.querySelector('#world-sequence').textContent) > BigInt(time),
    acceptedAt,
  );
  await page.waitForFunction(
    () =>
      !globalThis.document.querySelector('#enter-site').disabled &&
      globalThis.document.querySelector('#stop').disabled,
    undefined,
    {
      timeout: 45000,
    },
  );
  const visited = response('visit');
  await page.locator('#enter-site').click();
  assert.equal((await visited).status(), 200);
  await page.locator('#site-dialog').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  // A real interrupted request must not leave a completed/locked visit UI.
  await page.route('**/world-lab/visit', (route) => route.abort('connectionfailed'), { times: 1 });
  await page.locator('#enter-site').click();
  await page.waitForFunction(() =>
    globalThis.document.querySelector('#client-message').textContent.includes('Failed to fetch'),
  );
  const recovered = response('visit');
  await page.locator('#enter-site').click();
  assert.equal((await recovered).status(), 200);
  await page.locator('#site-dialog').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  results.push('server-validated visit and interrupted-request recovery');
}
async function cameraAndMovement() {
  await page.mouse.move(850, 450);
  await page.mouse.wheel(0, -700);
  await page.waitForTimeout(800);
  await page.locator('#follow-own').check();
  await page.keyboard.down('KeyD');
  await page.waitForTimeout(150);
  await page.keyboard.up('KeyD');
  assert.equal(await page.locator('#follow-own').isChecked(), false);
  await page.locator('#follow-own').check();
  await page.mouse.move(850, 450);
  await page.mouse.wheel(0, -150);
  await page.waitForTimeout(800);
  assert.equal(await page.locator('#follow-own').isChecked(), true);
  const at = await page.evaluate(() => {
    const point = new globalThis.DOMPoint(1850, 1244).matrixTransform(
      globalThis.document.querySelector('#map').getScreenCTM(),
    );
    return { x: point.x, y: point.y };
  });
  const before = (await state()).own.movement.point;
  const accepted = response('movement');
  await page.mouse.click(at.x, at.y, { button: 'right' });
  assert.equal((await accepted).status(), 200);
  await page.waitForTimeout(1000);
  assert.notDeepEqual((await state()).own.movement.point, before);
  await stop();
  await page.mouse.move(850, 450);
  await page.mouse.down();
  await page.mouse.move(930, 470, { steps: 6 });
  await page.mouse.up();
  assert.equal(await page.locator('#follow-own').isChecked(), false);
  await page.setViewportSize({ width: 1050, height: 800 });
  await page.locator('#center-own').click();
  await page.screenshot({ path: resolve(output, 'map.png') });
  results.push('ground movement, STOP, checkbox WASD, follow, zoom, drag and resize');
}
async function pursuitAndRetry() {
  await page.locator('#fit').click();
  const observed = await state();
  const point = observed.own.movement.point;
  const targets = observed.groups.filter((group) => group.pursuable && group.state === 'MOVING');
  targets.sort(
    (a, b) =>
      Math.hypot(
        Number(b.point.xMicroFp) - Number(point.xMicroFp),
        Number(b.point.zMicroFp) - Number(point.zMicroFp),
      ) -
      Math.hypot(
        Number(a.point.xMicroFp) - Number(point.xMicroFp),
        Number(a.point.zMicroFp) - Number(point.zMicroFp),
      ),
  );
  assert.ok(targets[0], 'an observed moving threat is required');
  const id = targets[0].id;
  const accepted = response('pursuit');
  await rightClickMarker(`[data-group-id="${id}"]`);
  assert.equal((await accepted).status(), 200);
  await page.waitForFunction(() => globalThis.document.querySelector('[data-pursuit-target]'));
  const statuses = [];
  const record = (reply) => {
    if (reply.url().endsWith('/world-lab/movement') && reply.request().method() === 'POST')
      statuses.push(reply.status());
  };
  page.on('response', record);
  // Delay one actual STOP until the real worker advances its epoch; no forged reply.
  await page.route(
    '**/world-lab/movement',
    async (route) => {
      const epoch = route.request().postDataJSON().expectedMovementEpoch;
      const deadline = Date.now() + 12000;
      let current = await state();
      while (current.own.movement.movementEpoch === epoch && Date.now() < deadline) {
        await page.waitForTimeout(300);
        current = await state();
      }
      assert.notEqual(current.own.movement.movementEpoch, epoch, 'worker must advance the epoch');
      await route.continue();
    },
    { times: 1 },
  );
  const stopped = page.waitForResponse(
    (reply) => reply.url().endsWith('/world-lab/movement') && reply.status() === 200,
  );
  await page.locator('#map').focus();
  await page.keyboard.press('Space');
  await stopped;
  page.off('response', record);
  assert.deepEqual(statuses, [409, 200]);
  assert.equal((await state()).pursuit, null);
  results.push('observed-threat pursuit and actual stale STOP409/retry200');
}
async function legacyControls() {
  const legacy = await context.newPage();
  try {
    await legacy.goto('http://127.0.0.1:5338/scripts/world-map/navigation-lab.html?map=atlas');
    await legacy.locator('#night').waitFor();
    await legacy.mouse.move(700, 420);
    await legacy.mouse.wheel(0, -500);
    await legacy.waitForTimeout(800);
    const before = await legacy.locator('#map').getAttribute('viewBox');
    await legacy.locator('#night').check();
    await legacy.keyboard.down('KeyD');
    await legacy.waitForTimeout(150);
    await legacy.keyboard.up('KeyD');
    assert.notEqual(await legacy.locator('#map').getAttribute('viewBox'), before);
    results.push('legacy atlas checkbox-focused WASD');
  } finally {
    await legacy.close();
  }
}

async function reconnect() {
  const previous = await page.evaluate((code) => {
    const socket = globalThis.worldLabSockets.find(
      (entry) =>
        entry.url.includes('/world-lab-ws/') && entry.readyState === globalThis.WebSocket.OPEN,
    );
    const address = new URL(socket.url);
    socket.close(code, 'Transport probe');
    return { path: address.pathname, session: address.searchParams.get('sessionId') };
  }, CloseCode.MAY_TRY_RECONNECT);
  await page.waitForFunction(
    (old) =>
      globalThis.worldLabSockets.some((socket) => {
        const address = new URL(socket.url);
        return (
          socket.readyState === globalThis.WebSocket.OPEN &&
          address.pathname === old.path &&
          address.searchParams.get('sessionId') === old.session &&
          address.searchParams.has('reconnectionToken')
        );
      }) && globalThis.document.body.dataset.connection === 'live',
    previous,
    { timeout: 20000 },
  );
  assert.equal((await state()).own.name, 'Отряд Березняка');
  results.push('actual Colyseus transport drop and reconnection');
}

await page.coverage.startJSCoverage({ resetOnNavigation: false });
try {
  await selectPlayer(page, 'company-a');
  const otherContext = await browser.newContext();
  try {
    await selectPlayer(await otherContext.newPage(), 'company-b');
    const observed = await state();
    assert.ok(observed.groups.some((group) => group.kind === 'PLAYER'));
    results.push('two authenticated browser contexts observe each other');
    await stop();
    await visit();
    await cameraAndMovement();
    await reconnect();
    await pursuitAndRetry();
    await legacyControls();
    await page.locator('#switch-slot').click();
    assert.equal(await page.locator('#follow-own').isDisabled(), true);
    await page.locator('[data-slot="company-a"]').click();
    await page.waitForFunction(() => globalThis.document.body.dataset.connection === 'live');
    assert.deepEqual(errors, []);
  } finally {
    await otherContext.close();
  }
} finally {
  const entries = (await page.coverage.stopJSCoverage()).filter((entry) =>
    entry.url.includes('/scripts/world-map/'),
  );
  await writeFile(resolve(output, 'browser.json'), JSON.stringify({ entries }));
  await writeFile(resolve(output, 'journey.json'), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
console.log(`World lab browser journey passed: ${results.join('; ')}`);
