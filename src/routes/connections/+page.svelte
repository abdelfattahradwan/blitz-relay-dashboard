<script lang="ts">
  import { ArrowRightLeftIcon, PencilIcon, PlusIcon, TrashIcon } from "@lucide/svelte";
  import { goto, invalidate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Alert from "#/lib/components/Alert.svelte";
  import Badge from "#/lib/components/Badge.svelte";
  import { getErrorMessage } from "#/lib/utilities/get-error-message.ts";
  import {
    activateRelayConnection,
    deleteRelayConnection,
    type RelayConnection,
  } from "#/lib/utilities/relay-connection.ts";

  let { data } = $props();

  let searchQuery = $state("");

  const filteredRelayConnections = $derived.by(() => {
    const query = searchQuery.trim().toLowerCase();
    const relayConnections: Array<RelayConnection> = [];

    for (const relayConnection of data.relayConnections) {
      if (
        query !== "" &&
        !relayConnection.name.toLowerCase().includes(query) &&
        !relayConnection.url.toLowerCase().includes(query)
      ) {
        continue;
      }

      relayConnections.push(relayConnection);
    }

    return relayConnections;
  });

  let busy = $state(false);
  let errorMessage = $state<string | null>(null);

  async function activate(relayConnection: RelayConnection) {
    busy = true;
    errorMessage = null;

    try {
      await activateRelayConnection(relayConnection.id);
      await goto(resolve("/"), { invalidate: ["relay:connections"] });
    } catch (error) {
      errorMessage = getErrorMessage(error);
    } finally {
      busy = false;
    }
  }

  async function remove(relayConnection: RelayConnection) {
    if (!window.confirm(`Delete the "${relayConnection.name}" connection?`)) {
      return;
    }

    busy = true;
    errorMessage = null;

    try {
      await deleteRelayConnection(relayConnection.id);
      await invalidate("relay:connections");
    } catch (error) {
      errorMessage = getErrorMessage(error);
    } finally {
      busy = false;
    }
  }
</script>

<main class="flex flex-1 flex-col overflow-y-auto p-4">
  <div class="mx-auto flex w-full max-w-3xl flex-col gap-4">
    <div class="flex flex-wrap gap-2">
      <input
        type="search"
        bind:value={searchQuery}
        placeholder="Search by name or URL…"
        aria-label="Search connections"
        autocomplete="off"
        class="field flex-1 max-sm:basis-full"
      />
      <a href={resolve("/connections/new")} class="button button-primary max-sm:flex-1">
        <PlusIcon size={16} />
        Add connection
      </a>
    </div>
    {#if errorMessage}
      <Alert tone="danger">{errorMessage}</Alert>
    {/if}
    {#each filteredRelayConnections as relayConnection (relayConnection.id)}
      {@const active = relayConnection.id === data.relayConnection?.id}
      <section class="panel flex items-center gap-4">
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <div class="flex min-w-0 items-center gap-2">
            <h2 class="truncate font-semibold">{relayConnection.name}</h2>
            {#if active}
              <Badge tone="primary">Active</Badge>
            {/if}
          </div>
          <span class="truncate font-mono text-sm text-fg-tertiary">{relayConnection.url}</span>
          {#await data.relayVersions[relayConnection.id]}
            <span class="text-sm text-fg-muted">Checking version…</span>
          {:then relayVersion}
            <span class="text-sm text-fg-tertiary">
              {relayVersion === null ? "Version older than 1.4.0" : `Version ${relayVersion}`}
            </span>
          {:catch}
            <span class="text-sm text-fg-muted">Version unavailable</span>
          {/await}
        </div>
        <div class="flex shrink-0 gap-2">
          {#if !active}
            <button
              type="button"
              onclick={() => {
                void activate(relayConnection);
              }}
              disabled={busy}
              class="button button-secondary max-sm:w-10 max-sm:px-0"
            >
              <ArrowRightLeftIcon size={16} class="max-sm:size-4.5" />
              <span class="max-sm:sr-only">Switch</span>
            </button>
          {/if}
          <a
            href={resolve("/connections/[id]", { id: relayConnection.id })}
            aria-label="Edit {relayConnection.name}"
            title="Edit connection"
            class="icon-button button-secondary"
          >
            <PencilIcon size={18} />
          </a>
          <button
            type="button"
            onclick={() => {
              void remove(relayConnection);
            }}
            disabled={busy}
            aria-label="Delete {relayConnection.name}"
            title="Delete connection"
            class="icon-button button-danger-soft"
          >
            <TrashIcon size={18} />
          </button>
        </div>
      </section>
    {:else}
      <p class="text-sm text-fg-muted">
        {data.relayConnections.length > 0
          ? "No connections match the search."
          : "There are no saved connections."}
      </p>
    {/each}
  </div>
</main>
