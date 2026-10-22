<script lang="ts">
  import Badge from "#/lib/components/Badge.svelte";
  import { RoomKind, type RoomSnapshot } from "#/lib/utilities/relay-api.ts";

  let { room }: { room: RoomSnapshot } = $props();
</script>

<div class="flex flex-wrap gap-2">
  {#if room.kind === RoomKind.PersistentReserved}
    <Badge tone="primary">Persistent</Badge>
  {:else}
    <Badge tone="neutral">Ephemeral</Badge>
  {/if}
  {#if room.isPublic}
    <Badge tone="info">Public</Badge>
  {:else}
    <Badge tone="neutral">Private</Badge>
  {/if}
  {#if room.hasHost}
    <Badge tone="success">Hosted</Badge>
  {:else if room.hasPendingHostClaim}
    <Badge tone="warning">Host claim pending</Badge>
  {:else}
    <Badge tone="danger">No host</Badge>
  {/if}
</div>
