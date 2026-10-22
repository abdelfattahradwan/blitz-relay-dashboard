<script lang="ts">
  import RelayConnectionForm from "#/lib/components/RelayConnectionForm.svelte";

  let { data } = $props();
</script>

<main class="flex flex-1 flex-col overflow-y-auto p-4">
  <RelayConnectionForm relayConnection={data.editedRelayConnection} />
</main>
