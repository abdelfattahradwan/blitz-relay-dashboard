<script lang="ts">
  import "@fontsource-variable/geist";
  import "@fontsource-variable/geist-mono";
  import "#/routes/layout.css";
  import { page } from "$app/state";
  import favicon from "#/lib/assets/favicon.ico";
  import Navbar from "#/lib/components/Navbar.svelte";
  import { setThemeState, ThemeState } from "#/lib/context/theme.svelte.ts";

  let { data, children } = $props();

  setThemeState(new ThemeState());
</script>

<svelte:head>
  <title>{page.data.title}</title>
  <link rel="icon" href={favicon} />
</svelte:head>

{#if data.relayConnection}
  <Navbar relayConnections={data.relayConnections} relayConnection={data.relayConnection} />
{/if}

{@render children()}
