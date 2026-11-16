import type { matchMaker } from '@colyseus/core';
import type { EncounterRoomTicketDto } from '@warwrit/protocol';

export function roomTicketFromReservation(
  reservation: Awaited<ReturnType<typeof matchMaker.joinOrCreate>>,
): EncounterRoomTicketDto {
  return {
    name: reservation.name,
    sessionId: reservation.sessionId,
    roomId: reservation.roomId,
    ...(reservation.processId === undefined ? {} : { processId: reservation.processId }),
    ...(reservation.publicAddress === undefined
      ? {}
      : { publicAddress: reservation.publicAddress }),
    ...(reservation.reconnectionToken === undefined
      ? {}
      : { reconnectionToken: reservation.reconnectionToken }),
    ...(reservation.devMode === undefined ? {} : { devMode: reservation.devMode }),
  };
}
