// @vitest-environment jsdom
import assert from 'node:assert/strict';
import { test } from 'vitest';
import { advanceMapView, panMapView, wheelPixels, zoomMapView } from './map-camera.js';
import { mountContractPreview } from './navigation-contracts.js';
import {
  buildNavigationField,
  compileMovementPlan,
  continuousSurfaceAt,
  findTravelPath,
} from '@warwrit/game-core';
import { atlasRegion, atlasPoint, atlasPlaces, atlasPresets } from './porechye-atlas.js';
import { atlasContracts } from './porechye-atlas-contracts.js';
import { atlasMap } from './navigation-maps.js';
import { canEnterPlace, planPlaceArrival } from './place-entries.js';

// The atlas is one continuous region; tile edges are not artificial barriers.
const atlasField = buildNavigationField(atlasRegion);

test('atlas journeys reach the settlement boundary from roads and fields without targeting its center', () => {
  const entry = atlasMap.entries[0]!;
  const journeys = (
    [
      [60, 190],
      [400, 225],
      [195, 120],
    ] as const
  ).map((p) => {
    const arrival = planPlaceArrival(atlasField, entry, atlasPoint([p[0] + 1536, p[1] + 1024]))!;
    const [x, y] = atlasMap.pixel(arrival.goal);
    return {
      canVisit: canEnterPlace(atlasField, entry, arrival.goal),
      stopsAtOutskirts: Math.hypot(x - 1731, y - 1244) > 50,
    };
  });
  assert.deepEqual(
    journeys,
    Array.from({ length: 3 }, () => ({ canVisit: true, stopsAtOutskirts: true })),
  );
});

test('the whole dry village area is visitable, including field-facing edges outside the former approach circles', () => {
  const entry = atlasMap.entries[0]!;
  assert.deepEqual(
    [
      [195, 220],
      [200, 275],
      [250, 260],
      [165, 175],
    ].map(([x, y]) => canEnterPlace(atlasField, entry, atlasPoint([x! + 1536, y! + 1024]))),
    [true, true, true, true],
  );
});

test('area arrival ends before the center and charges the actual trimmed travel plan', () => {
  const entry = atlasMap.entries[0]!;
  const start = atlasPoint([1936, 1249]);
  const arrival = planPlaceArrival(atlasField, entry, start)!;
  const center = compileMovementPlan({
    field: atlasField,
    path: findTravelPath(atlasField, start, entry.anchor)!,
    startedAtMs: '0',
    movementEpoch: '0',
    planId: 'center-comparison',
  });
  assert.ok(BigInt(arrival.plan.totalDurationUs) < BigInt(center.totalDurationUs));
});

test('Brod arrival from the south crosses the bridge before allowing entry', () => {
  const entry = atlasMap.entries[1]!;
  const start = atlasPoint([2636, 1579]); // District [1100,555], southern bank.
  const arrival = planPlaceArrival(atlasField, entry, start)!;
  assert.deepEqual(
    {
      southBankEntry: canEnterPlace(atlasField, entry, start),
      arrivalEntry: canEnterPlace(atlasField, entry, arrival.goal),
      beforeBridge: atlasMap.pixel(arrival.goal)[1] < 1478,
      water: arrival.plan.speedSpans
        .filter((s) => s.terrainId === 'deep_water')
        .map((s) => s.overlayId),
    },
    { southBankEntry: false, arrivalEntry: true, beforeBridge: true, water: ['bridge'] },
  );
});

test('an erroneous area across the river still cannot grant entry through open water', () => {
  const entry = atlasMap.entries[1]!;
  const overlapping = {
    ...entry,
    footprint: [
      [1000, 270],
      [1300, 270],
      [1300, 600],
      [1000, 600],
    ].map(([x, y]) => atlasPoint([x! + 1536, y! + 1024])),
  };
  assert.deepEqual(
    {
      inside: canEnterPlace(atlasField, entry, entry.anchor),
      acrossOpenWater: canEnterPlace(atlasField, overlapping, atlasPoint([2636, 1579])),
      water: canEnterPlace(atlasField, overlapping, atlasPoint([2636, 1530])),
    },
    { inside: true, acrossOpenWater: false, water: false },
  );
});

test('all 34 atlas destinations and every contract issuer can be reached from Bereznyak', () => {
  const names = new Set(atlasPlaces.map((p) => p.name));
  assert.deepEqual(
    {
      unreachable: atlasPlaces
        .filter((p) => !findTravelPath(atlasField, atlasPoint([1731, 1244]), atlasPoint(p.at)))
        .map((p) => p.name),
      missingIssuers: atlasContracts.filter((c) => !names.has(c.issuerAt)).map((c) => c.id),
    },
    { unreachable: [], missingIssuers: [] },
  );
});

test('a far atlas journey crosses the main river only over an existing bridge', () => {
  const trip = atlasPresets[1]!;
  const plan = compileMovementPlan({
    field: atlasField,
    path: findTravelPath(atlasField, atlasPoint(trip.from), atlasPoint(trip.to))!,
    startedAtMs: '0',
    movementEpoch: '0',
    planId: 'atlas-far',
  });
  assert.deepEqual(
    [
      ...new Set(
        plan.speedSpans.filter((s) => s.terrainId === 'deep_water').map((s) => s.overlayId),
      ),
    ],
    ['bridge'],
  );
});

test('English contract selection localizes the list and preview while keeping design truth private', () => {
  document.body.innerHTML =
    '<details id="contracts-section" hidden></details><select id="contract"><option value="">Выберите предложение</option></select><select id="contract-language"><option value="ru">RU</option><option value="en">EN</option></select><article id="contract-preview" hidden></article>';
  const destinations: string[] = [];
  try {
    mountContractPreview((name) => destinations.push(name));
    const doc = document;
    const language = doc.getElementById('contract-language') as HTMLSelectElement;
    const select = doc.getElementById('contract') as HTMLSelectElement;
    // Switch locale before selecting: this used to leave every title Russian.
    language.value = 'en';
    language.dispatchEvent(new Event('change'));
    select.value = '0';
    select.dispatchEvent(new Event('change'));
    const card = doc.getElementById('contract-preview')!;
    card.querySelector<HTMLButtonElement>('button')!.click();
    assert.deepEqual(
      {
        list: select.options[1]!.textContent,
        title: card.querySelector('h3')!.textContent,
        issuerLocalized: card.textContent!.includes('Bereznyak'),
        revealsDesign: card.textContent!.includes(atlasContracts[0]!.authorTruth),
        destinations,
      },
      {
        list: '1. Tar on the Axle',
        title: 'Tar on the Axle',
        issuerLocalized: true,
        revealsDesign: false,
        destinations: ['Березняк'],
      },
    );
  } finally {
    document.body.replaceChildren();
  }
});

test('visible water in all new river tiles and the retting pond stays blocked', () => {
  const probes: readonly (readonly [number, number])[] = [
    [80, 1620],
    [300, 1670],
    [800, 1560],
    [1450, 1400],
    [3150, 1670],
    [3456, 1625],
    [3922, 1780],
    [4540, 1740],
    [1510, 1394],
    [1536, 1394],
    [1568, 1394],
    [3016, 1674],
    [3072, 1674],
    [3116, 1674],
    [4100, 2800],
    [4070, 2790],
    [4145, 2825],
  ];
  assert.deepEqual(
    probes.map((p) => continuousSurfaceAt(atlasField, atlasPoint(p)).speedPermille),
    probes.map(() => 0),
  );
});

test('fine wheel deltas accumulate around the cursor and respect map bounds', () => {
  const extent = { width: 4608, height: 3072 };
  const initial = { x: 0, y: 0, ...extent };
  const cursor = [0.3, 0.4] as const;
  const fine = zoomMapView(initial, cursor, -1, extent);
  const first = zoomMapView(initial, cursor, -100, extent);
  const second = zoomMapView(first, cursor, -100, extent);
  const combined = zoomMapView(initial, cursor, -200, extent);
  const limit = zoomMapView(second, cursor, -10000, extent);
  assert.deepEqual(
    {
      fineStep: initial.width - fine.width < 10,
      accumulated: Math.abs(second.width - combined.width) < 0.001,
      anchorX: Math.abs(second.x + cursor[0] * second.width - cursor[0] * extent.width) < 0.001,
      anchorY: Math.abs(second.y + cursor[1] * second.height - cursor[1] * extent.height) < 0.001,
      minimumWidth: Math.round(limit.width),
      lineUnits: wheelPixels(-2, 1, 800),
    },
    {
      fineStep: true,
      accumulated: true,
      anchorX: true,
      anchorY: true,
      minimumWidth: 829,
      lineUnits: -32,
    },
  );
});

test('camera eases through intermediate frames and converges independently of refresh rate', () => {
  const initial = { x: 0, y: 0, width: 4608, height: 3072 };
  const target = { x: 600, y: 400, width: 2304, height: 1536 };
  const half = advanceMapView(initial, target, 1000 / 60);
  const settle = (frames: number) => {
    let camera = initial;
    for (let i = 0; i < frames; i++) camera = advanceMapView(camera, target, 1000 / frames);
    return camera;
  };
  assert.deepEqual(
    {
      intermediate: half.width < initial.width && half.width > target.width,
      converged60: settle(60),
      converged120: settle(120),
    },
    { intermediate: true, converged60: target, converged120: target },
  );
});

test('keyboard camera travel has equal diagonal speed, frame-rate independence and closed bounds', () => {
  const extent = { width: 4608, height: 3072 };
  const initial = { x: 600, y: 400, width: 2304, height: 1536 };
  const move = (direction: readonly [number, number], frames: number) => {
    let camera = initial;
    for (let i = 0; i < frames; i++) camera = panMapView(camera, direction, 1000 / frames, extent);
    return camera;
  };
  const right = move([1, 0], 60),
    diagonal = move([1, 1], 60);
  const distance = (v: typeof initial) => Math.hypot(v.x - initial.x, v.y - initial.y);
  const edge = panMapView({ ...initial, x: 2304, y: 1536 }, [1, 1], 64, extent);
  assert.deepEqual(
    {
      moved: right.x > initial.x,
      sameDiagonalSpeed: Math.abs(distance(right) - distance(diagonal)) < 0.001,
      sameAt120Hz: Math.abs(right.x - move([1, 0], 120).x) < 0.001,
      staysInside: edge,
    },
    {
      moved: true,
      sameDiagonalSpeed: true,
      sameAt120Hz: true,
      staysInside: { ...initial, x: 2304, y: 1536 },
    },
  );
});
