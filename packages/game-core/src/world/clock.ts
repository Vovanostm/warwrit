import { exactFraction, exactFractionInput, readExactFraction } from '../company/exact-fraction.js';
import type { ExactFraction } from '../company/exact-fraction.js';
import { plainObject, snapshotJson } from '../company/input.js';
import type { JsonValue } from '../company/input.js';
import { campaignTick, elapsedTicks } from '../company/values.js';

export interface CampaignRateSegment {
  readonly effectiveAtMs: string;
  readonly ticksPerMs: ExactFraction;
}

export interface CampaignClock {
  readonly schemaVersion: 1;
  readonly epochMs: string;
  readonly startingTick: string;
  readonly rateSegments: readonly CampaignRateSegment[];
}

export interface LightClock {
  readonly schemaVersion: 1;
  readonly epochMs: string;
}

export type LightPhase = 'DAY' | 'NIGHT';

const INITIAL_TICKS_PER_MS = exactFraction(1n, 21_600n);
const LIGHT_DAY_MS = 600_000n;
const LIGHT_NIGHT_MS = 300_000n;
const MAX_RATE_SEGMENTS = 1000;
const MAX_INTEGER_DIGITS = 40;

function unsignedInteger(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length <= MAX_INTEGER_DIGITS &&
    /^(0|[1-9][0-9]*)$/.test(value)
  );
}

function freezeClock(clock: CampaignClock): CampaignClock {
  return Object.freeze({
    ...clock,
    rateSegments: Object.freeze(
      clock.rateSegments.map((segment) =>
        Object.freeze({
          effectiveAtMs: segment.effectiveAtMs,
          ticksPerMs: readExactFraction(segment.ticksPerMs),
        }),
      ),
    ),
  });
}

export function createCampaignClock(epochMs: string, startingTick = '0'): CampaignClock {
  if (!unsignedInteger(epochMs) || !unsignedInteger(startingTick))
    throw new RangeError('Invalid campaign clock epoch');
  return freezeClock({
    schemaVersion: 1,
    epochMs,
    startingTick,
    rateSegments: [{ effectiveAtMs: epochMs, ticksPerMs: INITIAL_TICKS_PER_MS }],
  });
}

/** Validate and own a JSON-restored campaign clock. */
export function readCampaignClock(value: unknown): CampaignClock {
  const snapshot = snapshotJson(value);
  if (snapshot === undefined || !plainObject(snapshot))
    throw new RangeError('Invalid campaign clock');
  const record = snapshot as Readonly<Record<string, JsonValue>>;
  const rawSegments = record['rateSegments'];
  if (
    record['schemaVersion'] !== 1 ||
    !unsignedInteger(record['epochMs']) ||
    !unsignedInteger(record['startingTick']) ||
    !Array.isArray(rawSegments) ||
    rawSegments.length === 0 ||
    rawSegments.length > MAX_RATE_SEGMENTS ||
    Object.keys(record).some(
      (key) => !['schemaVersion', 'epochMs', 'startingTick', 'rateSegments'].includes(key),
    )
  )
    throw new RangeError('Invalid campaign clock');

  const segments: CampaignRateSegment[] = [];
  let previousAt = -1n;
  for (const rawCandidate of rawSegments) {
    if (!plainObject(rawCandidate)) throw new RangeError('Invalid campaign rate segment');
    const candidate = rawCandidate as Readonly<Record<string, JsonValue>>;
    const effectiveAtMs = candidate['effectiveAtMs'];
    const ticksPerMs = candidate['ticksPerMs'];
    if (
      Object.keys(candidate).some((key) => !['effectiveAtMs', 'ticksPerMs'].includes(key)) ||
      !unsignedInteger(effectiveAtMs) ||
      BigInt(effectiveAtMs) <= previousAt ||
      !exactFractionInput.read(ticksPerMs) ||
      BigInt(ticksPerMs.numerator) <= 0n
    )
      throw new RangeError('Invalid campaign rate segment');
    segments.push({ effectiveAtMs, ticksPerMs: readExactFraction(ticksPerMs) });
    previousAt = BigInt(effectiveAtMs);
  }
  if (
    segments[0]!.effectiveAtMs !== record['epochMs'] ||
    segments[0]!.ticksPerMs.numerator !== INITIAL_TICKS_PER_MS.numerator ||
    segments[0]!.ticksPerMs.denominator !== INITIAL_TICKS_PER_MS.denominator
  )
    throw new RangeError('Invalid campaign clock epoch or initial rate');
  return freezeClock({
    schemaVersion: 1,
    epochMs: record['epochMs'],
    startingTick: record['startingTick'],
    rateSegments: segments,
  });
}

interface ClockFraction {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

function greatestCommonDivisor(left: bigint, right: bigint): bigint {
  let a = left;
  let b = right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function addClockFractions(left: ClockFraction, right: ClockFraction): ClockFraction {
  const common = greatestCommonDivisor(left.denominator, right.denominator);
  const leftScale = right.denominator / common;
  const rightScale = left.denominator / common;
  const numerator = left.numerator * leftScale + right.numerator * rightScale;
  const denominator = left.denominator * leftScale;
  const divisor = greatestCommonDivisor(numerator, denominator);
  return { numerator: numerator / divisor, denominator: denominator / divisor };
}

function campaignTickFractionAt(clockInput: CampaignClock, atMs: string): ClockFraction {
  const clock = readCampaignClock(clockInput);
  if (!unsignedInteger(atMs) || BigInt(atMs) < BigInt(clock.epochMs))
    throw new RangeError('Campaign time precedes epoch');
  const endpoint = BigInt(atMs);
  let accrued: ClockFraction = { numerator: 0n, denominator: 1n };
  for (let index = 0; index < clock.rateSegments.length; index += 1) {
    const segment = clock.rateSegments[index]!;
    const segmentStart = BigInt(segment.effectiveAtMs);
    const endMs =
      endpoint < BigInt(clock.rateSegments[index + 1]?.effectiveAtMs ?? atMs)
        ? endpoint
        : BigInt(clock.rateSegments[index + 1]?.effectiveAtMs ?? atMs);
    if (endMs > segmentStart) {
      accrued = addClockFractions(accrued, {
        numerator: BigInt(segment.ticksPerMs.numerator) * (endMs - segmentStart),
        denominator: BigInt(segment.ticksPerMs.denominator),
      });
    }
    if (endMs === endpoint) break;
  }
  return addClockFractions(accrued, { numerator: BigInt(clock.startingTick), denominator: 1n });
}

export function campaignTickAt(clock: CampaignClock, atMs: string): string {
  const tick = campaignTickFractionAt(clock, atMs);
  return campaignTick((tick.numerator / tick.denominator).toString());
}

export function elapsedCampaignTicks(clock: CampaignClock, fromMs: string, toMs: string): string {
  if (!unsignedInteger(fromMs) || !unsignedInteger(toMs) || BigInt(toMs) < BigInt(fromMs))
    throw new RangeError('Invalid campaign interval');
  return elapsedTicks(
    campaignTick(campaignTickAt(clock, fromMs)),
    campaignTick(campaignTickAt(clock, toMs)),
  );
}

/** Append a future rate after the caller's explicit observed-through boundary. */
export function appendCampaignRate(
  clockInput: CampaignClock,
  observedThroughMs: string,
  effectiveAtMs: string,
  ticksPerMsInput: ExactFraction,
): CampaignClock {
  const clock = readCampaignClock(clockInput);
  const ticksPerMs = readExactFraction(ticksPerMsInput);
  const observed = unsignedInteger(observedThroughMs) ? BigInt(observedThroughMs) : -1n;
  const effective = unsignedInteger(effectiveAtMs) ? BigInt(effectiveAtMs) : -1n;
  const lastSegment = BigInt(clock.rateSegments.at(-1)!.effectiveAtMs);
  if (
    observed < lastSegment ||
    effective <= observed ||
    effective <= lastSegment ||
    BigInt(ticksPerMs.numerator) <= 0n
  )
    throw new RangeError('Campaign rate change must follow the observed boundary');
  if (clock.rateSegments.length >= MAX_RATE_SEGMENTS)
    throw new RangeError('Campaign rate history limit exceeded');
  return freezeClock({
    ...clock,
    rateSegments: [...clock.rateSegments, { effectiveAtMs, ticksPerMs }],
  });
}

export function createLightClock(epochMs: string): LightClock {
  if (!unsignedInteger(epochMs)) throw new RangeError('Invalid light clock');
  return Object.freeze({ schemaVersion: 1, epochMs });
}

/** Validate and own a JSON-restored light clock; accepted cycle lengths stay fixed. */
export function readLightClock(value: unknown): LightClock {
  const snapshot = snapshotJson(value);
  if (
    snapshot === undefined ||
    !plainObject(snapshot) ||
    snapshot['schemaVersion'] !== 1 ||
    !unsignedInteger(snapshot['epochMs']) ||
    Object.keys(snapshot).some((key) => !['schemaVersion', 'epochMs'].includes(key))
  )
    throw new RangeError('Invalid light clock');
  return createLightClock(snapshot['epochMs']);
}

export function lightPhaseAt(clock: LightClock, atMs: string): LightPhase {
  const validClock = readLightClock(clock);
  if (!unsignedInteger(atMs) || BigInt(atMs) < BigInt(validClock.epochMs))
    throw new RangeError('Invalid light clock time');
  const phaseOffset = (BigInt(atMs) - BigInt(validClock.epochMs)) % (LIGHT_DAY_MS + LIGHT_NIGHT_MS);
  return phaseOffset < LIGHT_DAY_MS ? 'DAY' : 'NIGHT';
}
