// Real browser/server journey; no substitute world state or successful HTTP responses.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { chromium } from 'playwright';
import { CloseCode } from '@colyseus/sdk';

const output = resolve(process.env.WORLD_LAB_BROWSER_OUTPUT ?? 'output/world-lab-ci');
const url = 'http://127.0.0.1:5338/scripts/world-map/world-lab.html';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  ...(process.env.WORLD_LAB_CHROMIUM ? { executablePath: process.env.WORLD_LAB_CHROMIUM } : {}),
});
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
function instrumentWorldLab() {
  const NativeSocket = globalThis.WebSocket;
  globalThis.worldLabSockets = [];
  globalThis.worldLabStopInputs = [];
  globalThis.readWorldLabUi = () => {
    const map = globalThis.document.getElementById('map');
    if (!map) return undefined;
    return {
      connection: globalThis.document.body.dataset.connection,
      message: globalThis.document.getElementById('client-message').textContent,
      viewport: map.getAttribute('viewBox'),
      activeElement: globalThis.document.activeElement.id,
      stopDisabled: globalThis.document.getElementById('stop').disabled,
      sequence: globalThis.document.getElementById('world-sequence').textContent,
      ownState: globalThis.document.getElementById('own-state').textContent,
    };
  };
  globalThis.worldLabMapIsFresh = (previous) =>
    globalThis.document.body.dataset.connection === 'live' &&
    (previous === undefined ||
      globalThis.document.getElementById('world-sequence').textContent !== previous);
  globalThis.addEventListener(
    'keydown',
    (event) => {
      if (event.code !== 'Space') return;
      const ui = globalThis.readWorldLabUi();
      if (ui) globalThis.worldLabStopInputs.push({ target: event.target.id, ...ui });
    },
    true,
  );
  globalThis.WebSocket = class extends NativeSocket {
    constructor(...args) {
      super(...args);
      globalThis.worldLabSockets.push(this);
    }
  };
}
await context.addInitScript(instrumentWorldLab);
const page = await context.newPage();
const stopTraffic = [];
page.on('request', (request) => {
  if (isStopRequest(request)) stopTraffic.push({ event: 'request', body: request.postDataJSON() });
});
page.on('response', (reply) => {
  if (isStopRequest(reply.request()))
    stopTraffic.push({ event: 'response', status: reply.status() });
});
const errors = [];
page.on('pageerror', (error) => errors.push(String(error)));
const results = [];
const authoringEntries = [];

function isStopRequest(request) {
  return (
    request.url().endsWith('/world-lab/movement') &&
    request.method() === 'POST' &&
    request.postDataJSON()?.action?.kind === 'STOP'
  );
}
function recordStopStatuses(statuses) {
  return (reply) => {
    if (isStopRequest(reply.request())) statuses.push(reply.status());
  };
}
function response(path) {
  return page.waitForResponse(
    (reply) => reply.url().endsWith(`/world-lab/${path}`) && reply.request().method() === 'POST',
  );
}
async function state() {
  return page.evaluate(async () => (await fetch('/world-lab-api/world-lab/state')).json());
}
async function waitForFreshMap(target = page, afterSequence) {
  await target.waitForFunction(
    (previous) => globalThis.worldLabMapIsFresh(previous),
    afterSequence,
  );
}
async function rightClickMarker(selector) {
  const previous = await page.locator('#world-sequence').textContent();
  const point = await page.waitForFunction(
    ({ selector, previous }) => {
      if (!globalThis.worldLabMapIsFresh(previous)) return false;
      const marker = globalThis.document.querySelector(selector);
      if (!marker) return false;
      const at = new globalThis.DOMPoint(0, 0).matrixTransform(marker.getScreenCTM());
      if (!globalThis.document.elementFromPoint(at.x, at.y)?.closest(selector)) return false;
      return { x: at.x, y: at.y };
    },
    { selector, previous },
  );
  const at = await point.jsonValue();
  await page.mouse.click(at.x, at.y, { button: 'right' });
  await point.dispose();
}
async function rightClickMapPoint(x, y) {
  const previous = await page.locator('#world-sequence').textContent();
  const point = await page.waitForFunction(
    ({ x, y, previous }) => {
      if (!globalThis.worldLabMapIsFresh(previous)) return false;
      const map = globalThis.document.querySelector('#map');
      const at = new globalThis.DOMPoint(x, y).matrixTransform(map.getScreenCTM());
      const target = globalThis.document.elementFromPoint(at.x, at.y);
      if (!target?.closest('#map') || target.closest('[data-group-id], [data-site-id]'))
        return false;
      return { x: at.x, y: at.y };
    },
    { x, y, previous },
  );
  const at = await point.jsonValue();
  const accepted = response('movement');
  await page.mouse.click(at.x, at.y, { button: 'right' });
  await point.dispose();
  return accepted;
}
async function stop(requireMoving = false) {
  await page.locator('#map').focus();
  const previous = await page.locator('#world-sequence').textContent();
  await waitForFreshMap(page, previous);
  if (await page.locator('#stop').isDisabled()) {
    assert.equal(requireMoving, false, 'movement probe must still be moving before keyboard STOP');
    const stopped = await state();
    assert.notEqual(stopped.own.movement.mode, 'MOVING');
    assert.equal(stopped.pursuit, null);
    return;
  }
  const statuses = [];
  const record = recordStopStatuses(statuses);
  page.on('response', record);
  try {
    const accepted = page.waitForResponse(
      (reply) => isStopRequest(reply.request()) && reply.status() === 200,
    );
    await page.keyboard.press('Space');
    await accepted;
    assert.ok(
      JSON.stringify(statuses) === '[200]' || JSON.stringify(statuses) === '[409,200]',
      `STOP must settle directly or through the existing one stale retry: ${statuses}`,
    );
    await page.waitForFunction(() => globalThis.document.querySelector('#stop').disabled);
    const stopped = await state();
    assert.notEqual(stopped.own.movement.mode, 'MOVING');
    assert.equal(stopped.pursuit, null);
  } finally {
    page.off('response', record);
  }
}
async function waitForLoadedMap(target) {
  await target.waitForFunction(() => {
    const images = [...globalThis.document.querySelectorAll('#map-tiles image')];
    return images.length > 0 && images.every((image) => image.getAttribute('opacity') === '1');
  });
}
async function selectPlayer(target, slot) {
  await target.goto(url);
  await target.locator('[data-slot="company-a"]').waitFor();
  await target.locator(`[data-slot="${slot}"]`).click();
  await waitForFreshMap(target);
  await waitForLoadedMap(target);
  const ownTile = await target.evaluate(() => {
    const own = globalThis.document.querySelector('#own-marker');
    const size = Number(
      globalThis.document.querySelector('#map-tiles image')?.getAttribute('width'),
    );
    const column = Math.floor(Number(own?.dataset.anchorX) / size);
    const row = Math.floor(Number(own?.dataset.anchorY) / size);
    const key = `${column},${row}`;
    const image = globalThis.document.querySelector(`#map-tiles image[data-tile="${key}"]`);
    return { key, href: image?.getAttribute('href') };
  });
  assert.ok(ownTile.href, 'the loaded own-position tile is required for the recovery probe');
  const tileUrl = new URL(ownTile.href, target.url());
  const isTargetTile = (candidate) =>
    candidate.origin === tileUrl.origin && candidate.pathname === tileUrl.pathname;
  let interruptedTile;
  let recoveredUrl;
  const recoveredTile = target.waitForResponse(
    (reply) =>
      Boolean(interruptedTile) && reply.status() === 200 && isTargetTile(new URL(reply.url())),
  );
  await target.route(
    isTargetTile,
    (route) => {
      interruptedTile = route.request().url();
      return route.abort('connectionfailed');
    },
    { times: 1 },
  );
  try {
    await target.locator('#switch-slot').click();
    await target.locator(`[data-slot="${slot}"]`).click();
    recoveredUrl = (await recoveredTile).url();
    assert.ok(interruptedTile, 'a real current-view tile request must be interrupted');
    await waitForFreshMap(target);
    await waitForLoadedMap(target);
    await target.locator(`#map-tiles image[data-tile="${ownTile.key}"][opacity="1"]`).waitFor();
  } finally {
    await writeFile(
      resolve(output, `map-recovery-${slot}.json`),
      JSON.stringify({ tile: ownTile.key, interruptedTile, recoveredUrl }, null, 2),
    );
  }
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
  const target = await page.evaluate(() => {
    const map = globalThis.document.querySelector('#map');
    const own = globalThis.document.querySelector('#own-marker');
    const point = new globalThis.DOMPoint(0, 0)
      .matrixTransform(own.getScreenCTM())
      .matrixTransform(map.getScreenCTM().inverse());
    const width = map.viewBox.baseVal.width;
    // Leave time for the movement observation and keyboard STOP before arrival.
    return { x: point.x + Math.min(52, width * 0.18), y: point.y };
  });
  const before = (await state()).own.movement.point;
  const accepted = await rightClickMapPoint(target.x, target.y);
  assert.equal(accepted.status(), 200);
  await page.waitForTimeout(1000);
  assert.notDeepEqual((await state()).own.movement.point, before);
  await stop(true);
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
function movingThreats(observed) {
  return observed.groups.filter((group) => group.pursuable && group.state === 'MOVING');
}
async function approachMovingThreat(observed, deadline) {
  // This midpoint belongs to a public home-charted road, not an NPC position.
  const before = observed.own.movement.point;
  const accepted = await rightClickMapPoint(1654, 1229);
  assert.equal(accepted.status(), 200);
  while (Date.now() < deadline) {
    const current = await state();
    const progressed = !isDeepStrictEqual(current.own.movement.point, before);
    if (progressed && movingThreats(current).length) return current;
    await page.waitForTimeout(300);
  }
  assert.fail('Actual travel must reveal an observed moving threat');
}
function pursuitSetupReady(observed) {
  return observed.own.movement.mode !== 'MOVING' && movingThreats(observed).length > 0;
}
async function pursuitAndRetry() {
  await page.locator('#fit').click();
  const preparationDeadline = Date.now() + 45000;
  const beforeApproach = await state();
  if (!movingThreats(beforeApproach).length)
    await approachMovingThreat(beforeApproach, preparationDeadline);
  // Let the finite approach arrive before starting the next order.
  let observed = await state();
  while (!pursuitSetupReady(observed) && Date.now() < preparationDeadline) {
    await page.waitForTimeout(300);
    observed = await state();
  }
  const targets = movingThreats(observed);
  const point = observed.own.movement.point;
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
  assert.ok(
    pursuitSetupReady(observed),
    JSON.stringify({
      required: 'a stationary observer and an observed moving threat',
      ownMovement: observed.own.movement.mode,
      observedGroups: observed.groups.map((group) => ({
        id: group.id,
        state: group.state,
        pursuable: group.pursuable,
      })),
    }),
  );
  assert.equal(observed.pursuit, null, 'approach must finish without a pursuit order');
  const id = targets[0].id;
  const statuses = [];
  const record = recordStopStatuses(statuses);
  const details = [];
  const recordDetails = (reply) => {
    if (isStopRequest(reply.request()))
      details.push(
        reply.json().then((body) => ({
          status: reply.status(),
          request: reply.request().postDataJSON(),
          body,
        })),
      );
  };
  page.on('response', record);
  page.on('response', recordDetails);
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
  const accepted = response('pursuit');
  await rightClickMarker(`[data-group-id="${id}"]`);
  const pursuitReply = await accepted;
  if (pursuitReply.status() !== 200) {
    await writeFile(
      resolve(output, 'pursuit-start-response.json'),
      JSON.stringify(
        {
          status: pursuitReply.status(),
          request: pursuitReply.request().postDataJSON(),
          responseBody: await pursuitReply.text(),
        },
        null,
        2,
      ),
    );
  }
  assert.equal(pursuitReply.status(), 200);
  const pursuitOrderId = (await state()).pursuit?.orderId;
  assert.ok(pursuitOrderId, 'accepted pursuit must have an order ID');
  await page.waitForFunction(
    () =>
      globalThis.document.body.dataset.connection === 'live' &&
      globalThis.document.querySelector('[data-pursuit-target]') &&
      !globalThis.document.querySelector('#stop').disabled,
  );
  const settled = page.waitForResponse(
    (reply) => isStopRequest(reply.request()) && (reply.status() === 200 || statuses.length === 2),
  );
  await page.locator('#map').press('Space');
  let replies;
  try {
    await settled;
    replies = await Promise.all(details);
  } finally {
    page.off('response', record);
    page.off('response', recordDetails);
    await writeFile(
      resolve(output, 'pursuit-stop-responses.json'),
      JSON.stringify(await Promise.all(details), null, 2),
    );
  }
  assert.equal(replies.length, 2, 'one stale STOP permits exactly one automatic retry');
  assert.notEqual(replies[0].request.commandId, replies[1].request.commandId);
  assert.notEqual(
    replies[0].request.expectedMovementEpoch,
    replies[1].request.expectedMovementEpoch,
    'retry must use the refreshed movement epoch',
  );
  assert.equal(replies[0].body.code, 'STALE_REVISION');
  if (replies[1].status === 200) {
    assert.deepEqual(statuses, [409, 200]);
    assert.equal((await state()).pursuit, null);
    results.push('observed-threat pursuit and actual stale STOP409/retry200');
  } else {
    // The real worker can invalidate the single retry too. Verify that finite
    // rejection path separately; it does not demonstrate successful cancellation.
    assert.deepEqual(statuses, [409, 409]);
    assert.equal(replies[1].body.code, 'STALE_REVISION');
    await page.waitForFunction(
      () =>
        globalThis.document.querySelector('#client-message').textContent ===
        'Приказ отклонён: STALE_REVISION',
    );
    assert.equal((await state()).pursuit?.orderId, pursuitOrderId);
    results.push(
      'observed-threat pursuit and two stale STOP409 responses; pursuit retained, cancellation not demonstrated',
    );
  }
}
async function legacyControls() {
  const legacy = await context.newPage();
  legacy.on('pageerror', (error) => errors.push(String(error)));
  await legacy.coverage.startJSCoverage({ resetOnNavigation: false });
  try {
    await legacy.goto('http://127.0.0.1:5326/scripts/world-map/navigation-lab.html?map=atlas');
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
    // Preserve the existing documented examples as an authoring UI only.
    await legacy.goto('http://127.0.0.1:5326/scripts/world-map/fog-design/index.html');
    const examples = legacy.locator('#examples button');
    await examples.first().waitFor();
    assert.equal(await examples.count(), 10);
    for (let index = 0; index < 10; index += 1) {
      await examples.nth(index).click();
      assert.equal(await examples.nth(index).getAttribute('aria-pressed'), 'true');
      assert.ok((await legacy.locator('#map').getAttribute('aria-label'))?.length > 0);
      await legacy.locator('#after').click();
      assert.equal(await legacy.locator('#after').getAttribute('aria-pressed'), 'true');
      assert.ok((await legacy.locator('#result').innerText()).length > 0);
    }
    results.push('retained ten authoring examples render before and after');
  } finally {
    authoringEntries.push(...(await legacy.coverage.stopJSCoverage()));
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
  for (const path of [
    '/assets/art/world/porechye-atlas-v1/atlas-v6.png',
    '/scripts/world-map/navigation-lab.html',
    '/scripts/world-map/navigation-maps.ts',
    '/bad%encoding',
  ]) {
    const denied = await page.request.get(`http://127.0.0.1:5338${path}`);
    assert.equal(
      denied.status(),
      404,
      'private world origin must deny authored source and malformed paths',
    );
  }
  results.push('private world origin denies full atlas, authoring files and malformed paths');

  const otherContext = await browser.newContext();
  await otherContext.addInitScript(instrumentWorldLab);
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
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failed-map.png') });
  await writeFile(
    resolve(output, 'failure-ui.json'),
    JSON.stringify(
      await page.evaluate(() => ({
        ...globalThis.readWorldLabUi?.(),
        stopInputs: globalThis.worldLabStopInputs,
      })),
      null,
      2,
    ),
  );
  await writeFile(resolve(output, 'stop-traffic.json'), JSON.stringify(stopTraffic, null, 2));
  throw error;
} finally {
  const entries = [...(await page.coverage.stopJSCoverage()), ...authoringEntries].filter((entry) =>
    entry.url.includes('/scripts/world-map/'),
  );
  await writeFile(resolve(output, 'browser.json'), JSON.stringify({ entries }));
  await writeFile(resolve(output, 'journey.json'), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
console.log(`World lab browser journey passed: ${results.join('; ')}`);
