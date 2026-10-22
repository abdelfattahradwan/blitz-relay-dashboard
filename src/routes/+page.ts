import { getErrorMessage } from "#/lib/utilities/get-error-message.ts";
import { getRelayVersion, getRooms } from "#/lib/utilities/relay-api.ts";

export async function load({ parent, depends, fetch }) {
  depends("relay:rooms");

  const parentData = await parent();
  const relayConnection = parentData.relayConnection!;
  const title = "Overview · Blitz Relay Dashboard";

  try {
    const [rooms, relayVersion] = await Promise.all([
      getRooms(relayConnection, fetch),
      getRelayVersion(relayConnection, fetch),
    ]);

    return {
      title,
      relayConnection,
      relayVersion,
      rooms,
      roomsError: null,
    };
  } catch (error) {
    return {
      title,
      relayConnection,
      relayVersion: undefined,
      rooms: null,
      roomsError: getErrorMessage(error),
    };
  }
}
