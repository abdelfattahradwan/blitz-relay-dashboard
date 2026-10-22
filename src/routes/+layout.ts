import { redirect } from "@sveltejs/kit";
import { resolve } from "$app/paths";
import { loadRelayConnections, type RelayConnection } from "#/lib/utilities/relay-connection.ts";

export const ssr = false;

export async function load({ route, depends }) {
  depends("relay:connections");

  const { activeConnectionId, connections } = await loadRelayConnections();

  let relayConnection: RelayConnection | null = null;

  for (const connection of connections) {
    if (connection.id === activeConnectionId) {
      relayConnection = connection;

      break;
    }
  }

  if (relayConnection === null && !route.id?.startsWith("/connections")) {
    redirect(307, resolve(connections.length === 0 ? "/connections/new" : "/connections"));
  }

  return {
    title: "Blitz Relay Dashboard",
    relayConnections: connections,
    relayConnection,
  };
}
