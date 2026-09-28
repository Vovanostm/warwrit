import { describe, expect, it } from 'vitest';
import {
  appendCampaignRate,
  campaignTickAt,
  createCampaignClock,
  createLightClock,
  elapsedCampaignTicks,
  lightPhaseAt,
  readCampaignClock,
  readLightClock,
} from '@warwrit/game-core';

const ONE_TICK_PER_MS = { numerator: '1', denominator: '1' } as const;
const DOUBLE_INITIAL_TICK_RATE = { numerator: '1', denominator: '10800' } as const;
const plus = (left: string, right: number): string => (BigInt(left) + BigInt(right)).toString();

describe('world clocks', () => {
  it('conserves elapsed ticks across split queries and prospective rate changes after JSON reload', () => {
    const epoch = '1000';
    const initial = createCampaignClock(epoch);
    const changed = appendCampaignRate(
      initial,
      plus(epoch, 9_999),
      plus(epoch, 10_000),
      DOUBLE_INITIAL_TICK_RATE,
    );
    const restored = readCampaignClock(JSON.parse(JSON.stringify(changed)));

    expect(campaignTickAt(changed, plus(epoch, 10_000))).toBe(
      campaignTickAt(initial, plus(epoch, 10_000)),
    );
    expect(elapsedCampaignTicks(restored, epoch, plus(epoch, 15_800))).toBe(
      (
        BigInt(elapsedCampaignTicks(restored, epoch, plus(epoch, 10_000))) +
        BigInt(elapsedCampaignTicks(restored, plus(epoch, 10_000), plus(epoch, 15_800)))
      ).toString(),
    );
    expect(campaignTickAt(restored, plus(epoch, 15_800))).toBe('1');
  });

  it('keeps the accepted light cycle independent of campaign tick rates', () => {
    const light = createLightClock('0');
    const restoredLight = readLightClock(JSON.parse(JSON.stringify(light)));
    const campaign = appendCampaignRate(
      createCampaignClock('0'),
      '299999',
      '300000',
      ONE_TICK_PER_MS,
    );

    expect(campaignTickAt(campaign, '300000')).toBe('13');
    expect(campaignTickAt(campaign, '300001')).toBe('14');
    expect(lightPhaseAt(light, '300001')).toBe('DAY');
    expect(lightPhaseAt(light, '599999')).toBe('DAY');
    expect(lightPhaseAt(light, '600000')).toBe('NIGHT');
    expect(lightPhaseAt(light, '899999')).toBe('NIGHT');
    expect(lightPhaseAt(light, '900000')).toBe('DAY');
    expect(lightPhaseAt(restoredLight, '900000')).toBe('DAY');
    expect(() =>
      readLightClock({ schemaVersion: 1, epochMs: '0', dayMs: '1', nightMs: '1' }),
    ).toThrow();
  });

  it('rejects malformed and retroactive rate changes without mutating the clock', () => {
    const clock = createCampaignClock('0');
    expect(() => appendCampaignRate(clock, '0', '0', ONE_TICK_PER_MS)).toThrow();
    expect(() => appendCampaignRate(clock, '1000', '999', ONE_TICK_PER_MS)).toThrow();
    expect(() =>
      appendCampaignRate(clock, '0', '1', { numerator: '1', denominator: '0' }),
    ).toThrow();
    expect(campaignTickAt(clock, '21600000')).toBe('1000');

    const wideFraction = {
      numerator: `1${'0'.repeat(123)}`,
      denominator: (10n ** 127n + 3n).toString(),
    };
    const wideClock = appendCampaignRate(createCampaignClock('0'), '0', '1', wideFraction);
    expect(campaignTickAt(wideClock, '2')).toBe('0');

    const overflowingClock = appendCampaignRate(createCampaignClock('0'), '0', '1', {
      numerator: `1${'0'.repeat(127)}`,
      denominator: '1',
    });
    expect(() => campaignTickAt(overflowingClock, `1${'0'.repeat(39)}`)).toThrow();
  });
});
