<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Alert from "#/lib/components/Alert.svelte";
  import { checkRelayHealth } from "#/lib/utilities/relay-api.ts";
  import {
    addRelayConnection,
    updateRelayConnection,
    type RelayConnection,
    type RelayConnectionDetails,
  } from "#/lib/utilities/relay-connection.ts";

  let { relayConnection }: { relayConnection?: RelayConnection } = $props();

  let name = $derived(relayConnection?.name ?? "");
  let url = $derived(relayConnection?.url ?? "");
  let adminToken = $derived(relayConnection?.adminToken ?? "");

  const changed = $derived(
    relayConnection === undefined ||
      name !== relayConnection.name ||
      url !== relayConnection.url ||
      adminToken !== relayConnection.adminToken,
  );

  let saving = $state(false);
  let errorMessage = $state<string | null>(null);

  async function onsubmit(event: SubmitEvent) {
    event.preventDefault();

    const details: RelayConnectionDetails = {
      name: name.trim(),
      url: url.replace(/\/+$/, ""),
      adminToken,
    };

    saving = true;
    errorMessage = await checkRelayHealth(details.url);

    if (errorMessage === null) {
      try {
        if (relayConnection) {
          await updateRelayConnection(relayConnection.id, details);
          await goto(resolve("/connections"), { invalidate: ["relay:connections"] });
        } else {
          await addRelayConnection(details);
          await goto(resolve("/"), { invalidate: ["relay:connections"] });
        }
      } catch {
        errorMessage =
          "Could not save the connection. Check that this browser allows site storage.";
      }
    }

    saving = false;
  }
</script>

<form {onsubmit} class="panel mx-auto flex w-full max-w-3xl flex-col gap-4">
  <div class="flex flex-col gap-1">
    <h1 class="text-xl font-bold">{relayConnection ? "Edit connection" : "Add a connection"}</h1>
    <p class="text-sm text-fg-tertiary">
      Name the connection and enter your relay's HTTP API address and admin token. The connection is
      encrypted and stored in this browser only.
    </p>
  </div>
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Name</span>
    <input
      name="name"
      bind:value={name}
      placeholder="Production"
      required
      autocomplete="off"
      class="field"
    />
  </label>
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Relay URL</span>
    <input
      name="url"
      type="url"
      bind:value={url}
      placeholder="http://localhost:7771"
      pattern="https?://.+"
      required
      autocomplete="off"
      class="field"
    />
  </label>
  <label class="flex flex-col gap-1">
    <span class="text-sm font-medium">Admin token</span>
    <input
      name="adminToken"
      type="password"
      bind:value={adminToken}
      required
      autocomplete="off"
      class="field"
    />
    <span class="text-xs text-fg-muted">
      The value of <code>BLITZ_RELAY_HTTP_ADMIN_TOKEN</code> on the relay.
    </span>
  </label>
  {#if errorMessage}
    <Alert tone="danger">{errorMessage}</Alert>
  {/if}
  <div class="flex justify-end gap-2">
    <a href={resolve("/connections")} class="button button-secondary">Cancel</a>
    <button
      type="submit"
      disabled={saving || !changed || name.trim() === "" || url === "" || adminToken === ""}
      class="button button-primary"
    >
      {#if relayConnection}
        {saving ? "Saving…" : "Save connection"}
      {:else}
        {saving ? "Connecting…" : "Add connection"}
      {/if}
    </button>
  </div>
</form>
