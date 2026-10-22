<script lang="ts">
  import { UserXIcon } from "@lucide/svelte";
  import { goto, invalidate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Alert from "#/lib/components/Alert.svelte";
  import MetadataEditor from "#/lib/components/MetadataEditor.svelte";
  import RoomBadges from "#/lib/components/RoomBadges.svelte";
  import { getErrorMessage } from "#/lib/utilities/get-error-message.ts";
  import {
    deleteRoom,
    kickClient,
    patchRoom,
    removeHost,
    RoomKind,
  } from "#/lib/utilities/relay-api.ts";

  let { data } = $props();

  const savedDisplayName = $derived(data.room.displayName);

  let displayName = $derived(savedDisplayName);

  const clientColumns = $derived.by(() => {
    let ipAddress = false;
    let port = false;

    for (const client of data.clients ?? []) {
      ipAddress ||= "ipAddress" in client;
      port ||= "port" in client;
    }

    return { ipAddress, port };
  });

  let saving = $state(false);
  let saveError = $state<string | null>(null);

  let virtualClientId = $state<number | null>(null);
  let kicking = $state(false);
  let kickMessage = $state<string | null>(null);
  let kickError = $state<string | null>(null);

  let removingHost = $state(false);
  let removeHostError = $state<string | null>(null);

  let deleting = $state(false);
  let deleteError = $state<string | null>(null);

  async function save(event: SubmitEvent) {
    event.preventDefault();

    saving = true;
    saveError = null;

    try {
      await patchRoom(data.relayConnection, data.room.code, {
        displayName,
        metadataToAdd: null,
        metadataToRemove: null,
      });

      await invalidate("relay:room");
    } catch (error) {
      saveError = getErrorMessage(error);
    } finally {
      saving = false;
    }
  }

  async function kick(kickedClientId: number) {
    if (!window.confirm(`Kick client ${kickedClientId} from room ${data.room.code}?`)) {
      return;
    }

    kicking = true;
    kickMessage = null;
    kickError = null;

    try {
      await kickClient(data.relayConnection, data.room.code, kickedClientId);
      kickMessage = `Client ${kickedClientId} was kicked.`;
      virtualClientId = null;
      await invalidate("relay:room");
    } catch (error) {
      kickError = getErrorMessage(error);
    } finally {
      kicking = false;
    }
  }

  async function kickTypedClient(event: SubmitEvent) {
    event.preventDefault();

    if (virtualClientId !== null) {
      await kick(virtualClientId);
    }
  }

  async function removeRoomHost() {
    if (!window.confirm(`Remove the host of room ${data.room.code}?`)) {
      return;
    }

    removingHost = true;
    removeHostError = null;

    try {
      await removeHost(data.relayConnection, data.room.code);
      await invalidate("relay:room");
    } catch (error) {
      removeHostError = getErrorMessage(error);
    } finally {
      removingHost = false;
    }
  }

  async function remove() {
    if (!window.confirm(`Delete room ${data.room.code} and disconnect everyone in it?`)) {
      return;
    }

    deleting = true;
    deleteError = null;

    try {
      await deleteRoom(data.relayConnection, data.room.code);
      await goto(resolve("/rooms"));
    } catch (error) {
      deleteError = getErrorMessage(error);
    } finally {
      deleting = false;
    }
  }

  $effect(() => {
    const interval = window.setInterval(() => {
      void invalidate("relay:room");
    }, 5_000);

    return () => {
      window.clearInterval(interval);
    };
  });
</script>

<main class="flex flex-1 flex-col overflow-y-auto p-4">
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
    <section class="panel flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="flex min-w-0 flex-col gap-1">
          <h1 class="truncate text-xl font-bold">{data.room.displayName || "Untitled room"}</h1>
          <span class="font-mono text-sm text-fg-tertiary">{data.room.code}</span>
        </div>
        <div class="flex flex-col gap-1 sm:items-end">
          <span class="metric text-2xl">
            {data.room.connectedClientCount} / {data.room.maximumClients}
          </span>
          <span class="text-xs text-fg-muted">Connected clients</span>
        </div>
      </div>
      <RoomBadges room={data.room} />
    </section>
    <form onsubmit={save} class="panel flex flex-col gap-4">
      <h2 class="font-semibold">Display name</h2>
      <input
        name="displayName"
        bind:value={displayName}
        maxlength="255"
        autocomplete="off"
        aria-label="Display name"
        class="field"
      />
      {#if saveError}
        <Alert tone="danger">{saveError}</Alert>
      {/if}
      <button
        type="submit"
        disabled={saving || displayName === savedDisplayName}
        class="button button-primary self-end"
      >
        {saving ? "Saving…" : "Save display name"}
      </button>
    </form>
    <MetadataEditor
      relayConnection={data.relayConnection}
      code={data.room.code}
      metadata={data.room.metadata}
    />
    <section class="panel flex flex-col gap-4">
      <h2 class="font-semibold">Clients</h2>
      {#if data.clients?.length === 0}
        <p class="text-sm text-fg-muted">No clients are connected.</p>
      {:else if data.clients}
        <table
          class={[
            "grid overflow-hidden rounded-md border border-line-strong bg-surface",
            clientColumns.port
              ? "grid-cols-[auto_minmax(0,1fr)_auto_auto]"
              : clientColumns.ipAddress
                ? "grid-cols-[auto_minmax(0,1fr)_auto]"
                : "grid-cols-[minmax(0,1fr)_auto]",
          ]}
        >
          <thead class="contents">
            <tr class="contents">
              <th
                class="bg-surface-stronger px-3 py-2 text-start text-xs font-semibold text-fg not-first:border-s not-first:border-line-stronger"
              >
                ID
              </th>
              {#if clientColumns.ipAddress}
                <th
                  class="bg-surface-stronger px-3 py-2 text-start text-xs font-semibold text-fg not-first:border-s not-first:border-line-stronger"
                >
                  IP
                </th>
              {/if}
              {#if clientColumns.port}
                <th
                  class="bg-surface-stronger px-3 py-2 text-start text-xs font-semibold text-fg not-first:border-s not-first:border-line-stronger"
                >
                  Port
                </th>
              {/if}
              <th
                class="bg-surface-stronger px-3 py-2 not-first:border-s not-first:border-line-stronger"
              >
                <span class="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody class="contents">
            {#each data.clients as client (client.virtualClientId)}
              <tr class="contents even:*:bg-surface-strong">
                <td
                  class="flex min-w-0 items-center border-t border-line-strong px-3 py-2 font-mono tabular-nums not-first:border-s"
                >
                  {client.virtualClientId}
                </td>
                {#if "ipAddress" in client}
                  <td
                    class="flex min-w-0 items-center border-t border-line-strong px-3 py-2 font-mono not-first:border-s"
                  >
                    <span class="truncate">{client.ipAddress}</span>
                  </td>
                {/if}
                {#if "port" in client}
                  <td
                    class="flex min-w-0 items-center border-t border-line-strong px-3 py-2 font-mono tabular-nums not-first:border-s"
                  >
                    {client.port}
                  </td>
                {/if}
                <td
                  class="flex min-w-0 items-center justify-end border-t border-line-strong px-3 py-2 not-first:border-s"
                >
                  <button
                    type="button"
                    onclick={() => {
                      void kick(client.virtualClientId);
                    }}
                    disabled={kicking}
                    aria-label="Kick client {client.virtualClientId}"
                    title="Kick client"
                    class="button button-danger-soft max-sm:w-10 max-sm:px-0"
                  >
                    <UserXIcon size={16} class="max-sm:size-4.5" />
                    <span class="max-sm:sr-only">Kick</span>
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      {:else if data.relayVersion === null}
        <p class="text-sm text-fg-tertiary">
          This relay is older than version 1.4.0 and can't list its clients. Kick a client by the
          virtual client ID the relay assigned when it joined.
        </p>
        <form onsubmit={kickTypedClient} class="flex gap-2">
          <input
            name="virtualClientId"
            type="number"
            bind:value={virtualClientId}
            min="1"
            required
            placeholder="Virtual client ID"
            aria-label="Virtual client ID"
            class="field flex-1 font-mono"
          />
          <button
            type="submit"
            disabled={kicking || virtualClientId === null}
            class="button button-danger-soft"
          >
            {kicking ? "Kicking…" : "Kick"}
          </button>
        </form>
      {:else}
        <Alert tone="danger">Could not load the clients. {data.clientsError}</Alert>
      {/if}
      {#if kickMessage}
        <Alert tone="success">{kickMessage}</Alert>
      {/if}
      {#if kickError}
        <Alert tone="danger">{kickError}</Alert>
      {/if}
    </section>
    {#if data.room.kind === RoomKind.PersistentReserved && data.room.hasHost && data.relayVersion !== null}
      <section class="panel flex flex-col gap-4">
        <div class="flex flex-col gap-1">
          <h2 class="font-semibold">Remove host</h2>
          <p class="text-sm text-fg-tertiary">
            Disconnects the host. The relay then promotes the longest-connected client to host.
          </p>
        </div>
        {#if removeHostError}
          <Alert tone="danger">{removeHostError}</Alert>
        {/if}
        <button
          type="button"
          onclick={removeRoomHost}
          disabled={removingHost}
          class="button button-danger-soft self-end"
        >
          {removingHost ? "Removing…" : "Remove host"}
        </button>
      </section>
    {/if}
    <section class="panel flex flex-col gap-4">
      <div class="flex flex-col gap-1">
        <h2 class="font-semibold">Delete room</h2>
        <p class="text-sm text-fg-tertiary">
          Closes the room and disconnects everyone in it. This cannot be undone.
        </p>
      </div>
      {#if deleteError}
        <Alert tone="danger">{deleteError}</Alert>
      {/if}
      <button
        type="button"
        onclick={remove}
        disabled={deleting}
        class="button button-danger self-end"
      >
        {deleting ? "Deleting…" : "Delete room"}
      </button>
    </section>
  </div>
</main>
