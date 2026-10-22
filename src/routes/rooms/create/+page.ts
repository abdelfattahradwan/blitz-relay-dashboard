export async function load({ parent }) {
  const parentData = await parent();

  return {
    title: "Create room · Blitz Relay Dashboard",
    relayConnection: parentData.relayConnection!,
  };
}
