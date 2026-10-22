<script lang="ts">
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Alert from "#/lib/components/Alert.svelte";
  import { getErrorMessage } from "#/lib/utilities/get-error-message.ts";
  import { createRoom } from "#/lib/utilities/relay-api.ts";

  let { data } = $props();

  let creating = $state(false);

  let errorMessage = $state<string | null>(null);

  async function onsubmit(event: SubmitEvent & { currentTarget: HTMLFormElement }) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);

    creating = true;
    errorMessage = null;

    try {
      const room = await createRoom(data.relayConnection, {
        maximumClients: Number(formData.get("maximumClients")),
        displayName: String(formData.get("displayName")),
        isPublic: formData.has("isPublic"),
        metadata: null,
      });

      await goto(resolve("/rooms/[code]", { code: room.code }));
    } catch (error) {
      errorMessage = getErrorMessage(error);
    } finally {
      creating = false;
    }
  }
</script>

<main class="flex flex-1 flex-col overflow-y-auto p-4">
  <form {onsubmit} class="panel mx-auto flex w-full max-w-3xl flex-col gap-4">
    <h1 class="text-xl font-bold">Create a persistent room</h1>
    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">Display name</span>
      <input name="displayName" maxlength="255" autocomplete="off" class="field" />
    </label>
    <label class="flex flex-col gap-1">
      <span class="text-sm font-medium">Maximum clients</span>
      <input
        name="maximumClients"
        type="number"
        min="1"
        max="65535"
        value="4096"
        required
        class="field font-mono"
      />
    </label>
    <label class="flex items-center gap-2">
      <input name="isPublic" type="checkbox" class="size-4 accent-primary-emphasis" />
      <span class="text-sm font-medium">Public</span>
    </label>
    {#if errorMessage}
      <Alert tone="danger">{errorMessage}</Alert>
    {/if}
    <div class="flex justify-end gap-2">
      <a href={resolve("/rooms")} class="button button-secondary">Cancel</a>
      <button type="submit" disabled={creating} class="button button-primary">
        {creating ? "Creating…" : "Create room"}
      </button>
    </div>
  </form>
</main>
