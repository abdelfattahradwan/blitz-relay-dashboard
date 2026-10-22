<script lang="ts">
  import { PlusIcon, RotateCcwIcon, SaveIcon, TrashIcon, Undo2Icon } from "@lucide/svelte";
  import { invalidate } from "$app/navigation";
  import Alert from "#/lib/components/Alert.svelte";
  import { getErrorMessage } from "#/lib/utilities/get-error-message.ts";
  import { patchRoom } from "#/lib/utilities/relay-api.ts";
  import type { RelayConnection } from "#/lib/utilities/relay-connection.ts";

  type MetadataEntry = {
    id: number;
    key: string;
    value: string;
    persisted: boolean;
    removed: boolean;
  };

  let {
    relayConnection,
    code,
    metadata,
  }: {
    relayConnection: RelayConnection;
    code: string;
    metadata: Record<string, string>;
  } = $props();

  let nextId = 0;

  function toMetadataEntries(metadata: Record<string, string>): Array<MetadataEntry> {
    const entries = $state<Array<MetadataEntry>>([]);

    for (const key in metadata) {
      entries.push({
        id: nextId++,
        key,
        value: metadata[key],
        persisted: true,
        removed: false,
      });
    }

    return entries;
  }

  function toMetadata(entries: Array<MetadataEntry>): Record<string, string> {
    const metadata: Record<string, string> = {};

    for (const entry of entries) {
      if (!entry.removed && entry.key !== "") {
        metadata[entry.key] = entry.value;
      }
    }

    return metadata;
  }

  function isMetadataEqual(left: Record<string, string>, right: Record<string, string>): boolean {
    for (const key in left) {
      if (!Object.hasOwn(right, key) || left[key] !== right[key]) {
        return false;
      }
    }

    for (const key in right) {
      if (!Object.hasOwn(left, key)) {
        return false;
      }
    }

    return true;
  }

  let latestMetadata: Record<string, string> = {};

  const savedMetadata = $derived.by(() => {
    if (!isMetadataEqual(metadata, latestMetadata)) {
      latestMetadata = metadata;
    }

    return latestMetadata;
  });

  let entries = $derived(toMetadataEntries(savedMetadata));

  const editedMetadata = $derived(toMetadata(entries));

  const changed = $derived(!isMetadataEqual(editedMetadata, savedMetadata));

  const discardable = $derived.by(() => {
    if (changed) {
      return true;
    }

    for (const entry of entries) {
      if (!entry.persisted) {
        return true;
      }
    }

    return false;
  });

  let saving = $state(false);
  let saveError = $state<string | null>(null);

  async function save(event: SubmitEvent) {
    event.preventDefault();

    const metadataToAdd: Record<string, string> = {};
    const metadataToRemove: Array<string> = [];

    let hasMetadataToAdd = false;

    for (const key in editedMetadata) {
      if (!Object.hasOwn(savedMetadata, key) || savedMetadata[key] !== editedMetadata[key]) {
        metadataToAdd[key] = editedMetadata[key];
        hasMetadataToAdd = true;
      }
    }

    for (const key in savedMetadata) {
      if (!Object.hasOwn(editedMetadata, key)) {
        metadataToRemove.push(key);
      }
    }

    saving = true;
    saveError = null;

    try {
      await patchRoom(relayConnection, code, {
        displayName: null,
        metadataToAdd: hasMetadataToAdd ? metadataToAdd : null,
        metadataToRemove: metadataToRemove.length > 0 ? metadataToRemove : null,
      });

      await invalidate("relay:room");
    } catch (error) {
      saveError = getErrorMessage(error);
    } finally {
      saving = false;
    }
  }
</script>

<form onsubmit={save} class="panel flex flex-col gap-4">
  <h2 class="font-semibold">Metadata</h2>
  {#each entries as entry, index (entry.id)}
    <div class="flex items-center gap-2">
      <input
        bind:value={entry.key}
        disabled={entry.removed}
        placeholder="Key"
        aria-label="Metadata key"
        autocomplete="off"
        class={[
          "field flex-1 font-mono",
          entry.removed && "border-danger-line! bg-danger-surface! text-danger-fg",
        ]}
      />
      <input
        bind:value={entry.value}
        disabled={entry.removed}
        placeholder="Value"
        aria-label="Metadata value"
        autocomplete="off"
        class={[
          "field flex-1 font-mono",
          entry.removed && "border-danger-line! bg-danger-surface! text-danger-fg",
        ]}
      />
      {#if entry.removed}
        <button
          type="button"
          onclick={() => {
            entry.removed = false;
          }}
          aria-label="Restore entry"
          title="Restore entry"
          class="icon-button button-secondary"
        >
          <RotateCcwIcon size={18} />
        </button>
      {:else}
        <button
          type="button"
          onclick={() => {
            if (entry.persisted) {
              entry.removed = true;
            } else {
              entries.splice(index, 1);
            }
          }}
          aria-label="Remove entry"
          title="Remove entry"
          class="icon-button button-secondary"
        >
          <TrashIcon size={18} />
        </button>
      {/if}
    </div>
  {:else}
    <p class="text-sm text-fg-muted">No metadata.</p>
  {/each}
  {#if saveError}
    <Alert tone="danger">{saveError}</Alert>
  {/if}
  <div class="flex gap-2">
    <button
      type="button"
      onclick={() => {
        entries.push({
          id: nextId++,
          key: "",
          value: "",
          persisted: false,
          removed: false,
        });
      }}
      disabled={saving}
      class="button button-secondary me-auto max-sm:w-10 max-sm:px-0"
    >
      <PlusIcon size={16} class="max-sm:size-4.5" />
      <span class="max-sm:sr-only">Add entry</span>
    </button>
    <button
      type="button"
      onclick={() => {
        entries = toMetadataEntries(savedMetadata);
      }}
      disabled={saving || !discardable}
      class="button button-secondary max-sm:w-10 max-sm:px-0"
    >
      <Undo2Icon size={16} class="max-sm:size-4.5" />
      <span class="max-sm:sr-only">Discard changes</span>
    </button>
    <button
      type="submit"
      disabled={saving || !changed}
      class="button button-primary max-sm:w-10 max-sm:px-0"
    >
      <SaveIcon size={16} class="max-sm:size-4.5" />
      <span class="max-sm:sr-only">{saving ? "Saving…" : "Save metadata"}</span>
    </button>
  </div>
</form>
