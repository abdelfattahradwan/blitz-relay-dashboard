import { getRelayVersion } from "#/lib/utilities/relay-api.ts";

export async function load({ parent, fetch }) {
  const parentData = await parent();
  const relayVersions: Record<string, Promise<string | null>> = {};

  for (const relayConnection of parentData.relayConnections) {
    relayVersions[relayConnection.id] = getRelayVersion(relayConnection, fetch);
  }

  return {
    title: "Connections · Blitz Relay Dashboard",
    relayVersions,
  };
}
