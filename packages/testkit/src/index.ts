import { invariant } from '@warwrit/game-core';
import { PROTOCOL_VERSION } from '@warwrit/protocol';

export interface FixedClock {
  readonly now: () => Date;
}

export function createFixedClock(isoTimestamp: string): FixedClock {
  const timestamp = new Date(isoTimestamp);
  invariant(!Number.isNaN(timestamp.getTime()), 'fixed clock timestamp must be valid');

  return {
    now: () => new Date(timestamp),
  };
}

export function currentTestProtocolVersion(): typeof PROTOCOL_VERSION {
  return PROTOCOL_VERSION;
}
