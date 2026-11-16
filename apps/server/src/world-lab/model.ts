import type { WorldLabSlot } from '@warwrit/protocol';

export const WORLD_LAB_SESSION_COOKIE = 'warwrit_world_lab_session';

export interface WorldLabFixture {
  readonly slot: WorldLabSlot;
  readonly accountId: string;
  readonly companyId: string;
  readonly partyId: string;
  readonly name: string;
}
