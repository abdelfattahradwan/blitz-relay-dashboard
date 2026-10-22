import { getErrorMessage } from "#/lib/utilities/get-error-message.ts";
import { getRooms } from "#/lib/utilities/relay-api.ts";

export async function load({ parent, depends, fetch }) {
  depends("relay:rooms");

  const parentData = await parent();
  const relayConnection = parentData.relayConnection!;
  const title = "Rooms · Blitz Relay Dashboard";

  try {
    const rooms = await getRooms(relayConnection, fetch);

    return {
      title,
      rooms,
      roomsError: null,
    };
  } catch (error) {
    return {
      title,
      rooms: null,
      roomsError: getErrorMessage(error),
    };
  }
}
