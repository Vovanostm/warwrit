/** Finite matched comparison; experiment only, no game state or database writes. */
import { execFileSync } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { cpus, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';
import * as candidate from '../packages/game-core/src/world/continuous-movement.js';
import { CONTINUOUS_WORLD_REGION } from '../packages/game-core/src/world/continuous-region.js';

const base = 'bcc30f5eed48240149cb711ec27a1a096e5c1279';
const root = resolve(import.meta.dirname, '..');
const output = process.argv[2] ?? '/private/tmp/warwrit-topology-comparison.json';
const rounds = Number(process.argv[3] ?? '3');
if (!Number.isInteger(rounds) || rounds < 1 || rounds > 5) throw new Error('Use 1–5 rounds');
const temporary = await mkdtemp(join(tmpdir(), 'warwrit-topology-baseline-'));
try {
  const files = execFileSync(
    'git',
    [
      'ls-tree',
      '-r',
      '--name-only',
      base,
      'packages/game-core/src/world',
      'packages/game-core/src/primitives.ts',
    ],
    { cwd: root, encoding: 'utf8' },
  )
    .trim()
    .split('\n');
  // Freeze the entire baseline world, not a hybrid of old search and new geometry.
  await cp(join(root, 'packages/game-core/src'), temporary, { recursive: true });
  for (const file of files)
    await writeFile(
      join(temporary, file.replace('packages/game-core/src/', '')),
      execFileSync('git', ['show', `${base}:${file}`], { cwd: root }),
    );
  const baseline: typeof candidate = await import(
    pathToFileURL(join(temporary, 'world/continuous-movement.ts')).href
  );
  const baselineRegion = (
    await import(pathToFileURL(join(temporary, 'world/continuous-region.ts')).href)
  ).CONTINUOUS_WORLD_REGION;
  if (JSON.stringify(baselineRegion) !== JSON.stringify(CONTINUOUS_WORLD_REGION))
    throw new Error('Geometry differs from frozen baseline');
  const previous: typeof candidate | undefined = process.argv[4]
    ? await import(pathToFileURL(resolve(process.argv[4], 'world/continuous-movement.ts')).href)
    : undefined;
  const variants = [
    ...(previous
      ? [
          { name: 'previous-square', api: previous, topology: 'square' as const },
          { name: 'previous-hex', api: previous, topology: 'hex' as const },
        ]
      : []),
    { name: 'baseline-square', api: baseline, topology: 'square' as const },
    { name: 'optimized-square', api: candidate, topology: 'square' as const },
    { name: 'hex', api: candidate, topology: 'hex' as const },
  ].map((variant) => {
    const before = performance.now();
    const field = variant.api.buildNavigationField(CONTINUOUS_WORLD_REGION, variant.topology);
    return { ...variant, field, buildMs: performance.now() - before };
  });
  const sites = CONTINUOUS_WORLD_REGION.sites;
  const pairs: { kind: string; start: candidate.PointFp; goal: candidate.PointFp }[] = [];
  for (const start of sites)
    for (const goal of sites)
      if (start.siteId !== goal.siteId)
        pairs.push({ kind: 'site', start: start.anchorFp, goal: goal.anchorFp });
  let state = 20261004;
  const next = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  for (let i = 0; i < 80; i++)
    pairs.push({
      kind: 'sample',
      start: sites[i % sites.length]!.anchorFp,
      goal: { xFp: Math.round(-8000 + 16000 * next()), zFp: Math.round(-5900 + 11800 * next()) },
    });
  // Fractional stopped origins and endpoints immediately either side of surface boundaries.
  pairs.push({ kind: 'fractional', start: { xFp: 160.25, zFp: -864.5 }, goal: sites[0]!.anchorFp });
  for (const variant of variants)
    variant.api.findTravelPath(variant.field, pairs[0]!.start, pairs[0]!.goal);
  const samples = [];
  for (let round = 0; round < rounds; round++) {
    for (const [index, pair] of pairs.entries()) {
      const order = [
        ...variants.slice(round % variants.length),
        ...variants.slice(0, round % variants.length),
      ];
      for (const variant of order) {
        const before = performance.now();
        const path = variant.api.findTravelPath(variant.field, pair.start, pair.goal);
        const searchMs = performance.now() - before;
        const plan = path
          ? variant.api.compileMovementPlan({
              field: variant.field,
              path,
              startedAtMs: '1000',
              movementEpoch: '1',
              planId: 'topology-comparison',
            })
          : undefined;
        samples.push({
          round,
          index,
          variant: variant.name,
          ...pair,
          searchMs,
          outcome: path
            ? 'path'
            : variant.api.isContinuousPointWalkable(variant.field, pair.goal)
              ? 'no-path'
              : 'blocked-goal',
          durationUs: plan?.totalDurationUs,
          path,
          roadUs: plan?.speedSpans
            .filter((s) => s.overlayId !== null)
            .reduce((n, s) => n + Number(s.endOffsetUs) - Number(s.startOffsetUs), 0),
        });
      }
    }
    process.stdout.write(`Finished matched round ${round + 1}/${rounds}\n`);
  }
  const summaries = variants.map((variant) => {
    const selected = samples.filter((s) => s.variant === variant.name);
    const times = selected
      .filter((s) => s.outcome === 'path')
      .map((s) => s.searchMs)
      .sort((a, b) => a - b);
    const deltas = selected
      .filter((s) => s.outcome === 'path')
      .map((s) => {
        const original = samples.find(
          (b) => b.variant === 'baseline-square' && b.round === s.round && b.index === s.index,
        )!;
        return {
          samePath: JSON.stringify(original.path) === JSON.stringify(s.path),
          delta: Number(s.durationUs) / Number(original.durationUs) - 1,
        };
      });
    return {
      variant: variant.name,
      buildMs: variant.buildMs,
      nodes: variant.field.walkable.length,
      roadNodes: variant.field.roadPoints?.length,
      attempts: selected.length,
      paths: times.length,
      blockedGoals: selected.filter((s) => s.outcome === 'blocked-goal').length,
      unreachable: selected.filter((s) => s.outcome === 'no-path').length,
      p50Ms: times[Math.ceil(times.length * 0.5) - 1],
      p95Ms: times[Math.ceil(times.length * 0.95) - 1],
      maxMs: times.at(-1),
      identicalPaths: deltas.filter((d) => d.samePath).length,
      meanDurationDelta: deltas.reduce((n, d) => n + d.delta, 0) / deltas.length,
      worstDurationDelta: Math.max(...deltas.map((d) => d.delta)),
      bestDurationDelta: Math.min(...deltas.map((d) => d.delta)),
      deterministic: selected.every(
        (s) =>
          JSON.stringify(s.path) ===
          JSON.stringify(selected.find((first) => first.index === s.index)!.path),
      ),
    };
  });
  const result = {
    base,
    runtime: process.version,
    cpu: cpus()[0]?.model,
    mapEdition: CONTINUOUS_WORLD_REGION.mapEdition,
    seed: 20261004,
    rounds,
    method:
      '101 identical directed cases, warmup per variant, sequential interleaved variant order rotated each round; search only timed, plan compilation outside timing; builds measured once; host load not isolated; no target-server capacity claim',
    summaries,
    samples,
  };
  await writeFile(output, JSON.stringify(result, null, 2) + '\n');
  process.stdout.write(JSON.stringify(summaries, null, 2) + '\n');
  // Ensure the written result can be consumed directly.
  JSON.parse(await readFile(output, 'utf8'));
} finally {
  await rm(temporary, { recursive: true, force: true });
}
