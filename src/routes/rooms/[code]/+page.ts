import { error } from "@sveltejs/kit";
import { getErrorMessage } from "#/lib/utilities/get-error-message.ts";
import {
  getRelayVersion,
  getRoom,
  getRoomClients,
  RelayError,
  type RoomSnapshot,
} from "#/lib/utilities/relay-api.ts";

export async function load({ parent, params, depends, fetch }) {
  depends("relay:room");

  const parentData = await parent();
  const relayConnection = parentData.relayConnection!;

  let room: RoomSnapshot;
  let relayVersion: string | null;

  try {
    [room, relayVersion] = await Promise.all([
      getRoom(relayConnection, params.code, fetch),
      getRelayVersion(relayConnection, fetch),
    ]);
  } catch (cause) {
    error(cause instanceof RelayError ? cause.status : 502, getErrorMessage(cause));
  }

  const title = `${room.displayName || room.code} · Blitz Relay Dashboard`;

  if (relayVersion === null) {
    return {
      title,
      relayConnection,
      relayVersion,
      room,
      clients: null,
      clientsError: null,
    };
  }

  try {
    const clients = await getRoomClients(relayConnection, params.code, fetch);

    return {
      title,
      relayConnection,
      relayVersion,
      room,
      clients,
      clientsError: null,
    };
  } catch (cause) {
    return {
      title,
      relayConnection,
      relayVersion,
      room,
      clients: null,
      clientsError: getErrorMessage(cause),
    };
  }
}
