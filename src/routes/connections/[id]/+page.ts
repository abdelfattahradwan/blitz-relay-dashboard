import { error } from "@sveltejs/kit";

export async function load({ parent, params }) {
  const parentData = await parent();

  for (const relayConnection of parentData.relayConnections) {
    if (relayConnection.id === params.id) {
      return {
        title: `Edit ${relayConnection.name} · Blitz Relay Dashboard`,
        editedRelayConnection: relayConnection,
      };
    }
  }

  error(404, "Connection not found.");
}
