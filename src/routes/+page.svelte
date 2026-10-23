<script lang="ts">
  import { invalidate } from "$app/navigation";
  import Alert from "#/lib/components/Alert.svelte";
  import HealthIndicator from "#/lib/components/HealthIndicator.svelte";
  import LatencyGauge from "#/lib/components/LatencyGauge.svelte";
  import { pingRelay, RoomKind } from "#/lib/utilities/relay-api.ts";

  let { data } = $props();

  let latency = $state<number | null>();

  const status = $derived(latency === undefined ? "checking" : latency === null ? "down" : "up");

  const stats = $derived.by(() => {
    if (!data.rooms) {
      return null;
    }

    let persistentRooms = 0;
    let publicRooms = 0;
    let connectedClients = 0;
    let hostlessRooms = 0;
    let pendingHostClaims = 0;

    for (const room of data.rooms) {
      if (room.kind === RoomKind.PersistentReserved) {
        persistentRooms++;
      }

      if (room.isPublic) {
        publicRooms++;
      }

      if (!room.hasHost) {
        hostlessRooms++;
      }

      if (room.hasPendingHostClaim) {
        pendingHostClaims++;
      }

      connectedClients += room.connectedClientCount;
    }

    return {
      rooms: data.rooms.length,
      ephemeralRooms: data.rooms.length - persistentRooms,
      persistentRooms,
      publicRooms,
      privateRooms: data.rooms.length - publicRooms,
      connectedClients,
      hostlessRooms,
      pendingHostClaims,
    };
  });

  $effect(() => {
    const url = data.relayConnection.url;

    let active = true;
    let timeout = 0;

    async function ping() {
      latency = await pingRelay(url);

      if (active) {
        timeout = window.setTimeout(ping, 2_000);
      }
    }

    void ping();

    return () => {
      active = false;
      window.clearTimeout(timeout);
    };
  });

  $effect(() => {
    const interval = window.setInterval(() => {
      void invalidate("relay:rooms");
    }, 5_000);

    return () => {
      window.clearInterval(interval);
    };
  });
</script>

{#snippet stat(label: string, value: number, detail?: string)}
  <section class="panel flex flex-col gap-1">
    <h2 class="text-sm font-medium text-fg-tertiary">{label}</h2>
    <span class="metric text-3xl">{value}</span>
    {#if detail}
      <span class="text-xs text-fg-muted">{detail}</span>
    {/if}
  </section>
{/snippet}

<main class="flex flex-1 flex-col overflow-y-auto p-4">
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-4">
    <div class="grid gap-4 md:grid-cols-2">
      <section class="panel flex flex-col gap-4">
        <h2 class="text-sm font-medium text-fg-tertiary">Relay</h2>
        <div class="flex items-center gap-2">
          <span class="text-2xl font-bold">
            {#if status === "checking"}
              Checking…
            {:else if status === "up"}
              Healthy
            {:else}
              Unreachable
            {/if}
          </span>
          <HealthIndicator {status} />
        </div>
        <div class="flex flex-col gap-1">
          <p class="font-mono text-sm break-all text-fg-secondary">{data.relayConnection.url}</p>
          {#if data.relayVersion !== undefined}
            <p class="text-sm text-fg-tertiary">
              {data.relayVersion === null
                ? "Version older than 1.4.0"
                : `Version ${data.relayVersion}`}
            </p>
          {/if}
        </div>
      </section>
      <section class="panel flex flex-col gap-4">
        <h2 class="text-sm font-medium text-fg-tertiary">Latency</h2>
        <div class="w-full max-w-56 self-center">
          <LatencyGauge {latency} />
        </div>
      </section>
    </div>
    {#if stats}
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {@render stat(
          "Rooms",
          stats.rooms,
          `${stats.ephemeralRooms} ephemeral · ${stats.persistentRooms} persistent`,
        )}
        {@render stat("Connected clients", stats.connectedClients)}
        {@render stat("Public rooms", stats.publicRooms, `${stats.privateRooms} private`)}
        {@render stat(
          "Rooms without a host",
          stats.hostlessRooms,
          `${stats.pendingHostClaims} pending host ${stats.pendingHostClaims === 1 ? "claim" : "claims"}`,
        )}
      </div>
    {:else}
      <Alert tone="danger">Could not load the rooms. {data.roomsError}</Alert>
    {/if}
  </div>
</main>
