<script lang="ts">
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
</script>

<svelte:head>
  <title>{page.status} · Blitz Relay Dashboard</title>
</svelte:head>

<main class="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
  <p class="metric text-6xl">{page.status}</p>
  <h1 class="text-xl font-bold">{page.error?.message}</h1>
  <a href={resolve("/")} class="button button-secondary">Back to the overview</a>
</main>
