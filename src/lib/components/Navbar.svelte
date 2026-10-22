<script lang="ts">
  import { CheckIcon, ChevronsUpDownIcon, MenuIcon, ServerIcon, XIcon } from "@lucide/svelte";
  import { goto } from "$app/navigation";
  import { resolve } from "$app/paths";
  import { page } from "$app/state";
  import favicon from "#/lib/assets/favicon.ico";
  import Alert from "#/lib/components/Alert.svelte";
  import ThemeToggleButton from "#/lib/components/ThemeToggleButton.svelte";
  import { getErrorMessage } from "#/lib/utilities/get-error-message.ts";
  import {
    activateRelayConnection,
    type RelayConnection,
  } from "#/lib/utilities/relay-connection.ts";

  let {
    relayConnections,
    relayConnection,
  }: {
    relayConnections: Array<RelayConnection>;
    relayConnection: RelayConnection;
  } = $props();

  let drawer = $state<HTMLDialogElement>();

  let connectionSwitcher = $state<HTMLElement>();

  const destinations = [
    { route: "/", label: "Home" },
    { route: "/rooms", label: "Rooms" },
    { route: "/connections", label: "Connections" },
  ] as const;

  let switching = $state(false);
  let switchError = $state<string | null>(null);

  async function switchConnection(id: string, close: () => void) {
    if (id === relayConnection.id) {
      close();

      return;
    }

    switching = true;
    switchError = null;

    try {
      await activateRelayConnection(id);
      await goto(resolve("/"), { invalidate: ["relay:connections"] });
      close();
    } catch (error) {
      switchError = getErrorMessage(error);
    } finally {
      switching = false;
    }
  }
</script>

{#snippet connections(close: () => void)}
  {#each relayConnections as connection (connection.id)}
    {@const current = connection.id === relayConnection.id}
    <button
      type="button"
      onclick={() => {
        void switchConnection(connection.id, close);
      }}
      disabled={switching}
      aria-current={current ? "true" : undefined}
      class="flex h-10 w-full items-center gap-2 rounded-md px-3 text-start text-sm font-medium text-fg-secondary disabled:cursor-not-allowed disabled:opacity-50 aria-[current=true]:text-primary-fg fine-hover:hover:bg-surface-strong fine-hover:hover:not-aria-[current=true]:text-fg"
    >
      <CheckIcon size={16} class={["shrink-0", !current && "invisible"]} />
      <span class="truncate">{connection.name}</span>
    </button>
  {/each}
  {#if switchError}
    <Alert tone="danger">{switchError}</Alert>
  {/if}
{/snippet}

{#snippet links(onclick?: () => void)}
  {#each destinations as destination (destination.route)}
    {@const current =
      destination.route === "/"
        ? page.route.id === "/"
        : page.route.id?.startsWith(destination.route)}
    <a
      href={resolve(destination.route)}
      {onclick}
      aria-current={current ? "page" : undefined}
      class="flex h-10 items-center rounded-md border border-transparent px-3 text-sm font-medium text-fg-secondary aria-[current=page]:chip aria-[current=page]:border-primary-line aria-[current=page]:from-primary-surface-raised aria-[current=page]:to-primary-surface aria-[current=page]:text-primary-fg fine-hover:hover:not-aria-[current=page]:bg-surface-strong fine-hover:hover:not-aria-[current=page]:text-fg"
    >
      {destination.label}
    </a>
  {/each}
{/snippet}

<nav
  class="relative z-10 flex items-center gap-2 border-b border-line bg-surface-raised px-4 py-2 shadow-(--shadow-bar)"
>
  <a href={resolve("/")} class="me-auto flex items-center gap-2 font-semibold">
    <img src={favicon} alt="" class="size-6" />
    Blitz Relay
  </a>
  <div class="flex items-center gap-2 max-md:hidden">
    {@render links()}
  </div>
  <button
    type="button"
    commandfor="connection-switcher"
    command="toggle-popover"
    aria-label="Active connection: {relayConnection.name}. Switch connection."
    title="Switch connection"
    class="button button-secondary max-w-56 max-md:hidden"
  >
    <ServerIcon size={16} class="shrink-0" />
    <span class="truncate">{relayConnection.name}</span>
    <ChevronsUpDownIcon size={16} class="shrink-0" />
  </button>
  <div
    id="connection-switcher"
    bind:this={connectionSwitcher}
    popover
    class="connection-switcher panel gap-2 p-2!"
  >
    {@render connections(() => {
      connectionSwitcher?.hidePopover();
    })}
  </div>
  <ThemeToggleButton />
  <button
    type="button"
    commandfor="navigation-drawer"
    command="show-modal"
    aria-label="Open menu"
    title="Open menu"
    class="icon-button button-secondary md:hidden"
  >
    <MenuIcon size={18} />
  </button>
</nav>

<dialog
  id="navigation-drawer"
  bind:this={drawer}
  closedby="any"
  aria-label="Menu"
  class="navigation-drawer"
>
  <div class="flex items-center justify-between border-b border-line py-2 ps-5 pe-2">
    <span class="font-semibold">Menu</span>
    <button
      type="button"
      commandfor="navigation-drawer"
      command="close"
      aria-label="Close menu"
      title="Close menu"
      class="icon-button button-secondary"
    >
      <XIcon size={18} />
    </button>
  </div>
  <nav class="flex flex-col gap-2 p-2">
    {@render links(() => {
      drawer?.close();
    })}
  </nav>
  <section class="flex flex-col gap-2 border-t border-line p-2">
    <h2 class="px-3 pt-2 text-sm font-semibold">Connection</h2>
    {@render connections(() => {
      drawer?.close();
    })}
  </section>
</dialog>

<style>
  .connection-switcher {
    margin: 0;
    margin-block-start: 0.5rem;
    inset: auto;
    width: min(16rem, calc(100vw - 2rem));
    position-area: block-end span-inline-start;
    position-try-fallbacks: flip-inline;
    display: none;
    opacity: 0;
    translate: 0 -0.5rem;
    transition:
      opacity 200ms ease,
      translate 200ms ease,
      overlay 200ms allow-discrete,
      display 200ms allow-discrete;
  }

  .connection-switcher:popover-open {
    display: flex;
    flex-direction: column;
    opacity: 1;
    translate: 0 0;
  }

  @starting-style {
    .connection-switcher:popover-open {
      opacity: 0;
      translate: 0 -0.5rem;
    }
  }

  .navigation-drawer {
    inset-block: 0;
    inset-inline: auto 0;
    width: min(18rem, 85vw);
    max-width: none;
    height: 100dvh;
    max-height: none;
    margin: 0;
    padding: 0;
    border: 0;
    border-inline-start: 1px solid var(--color-line);
    background-color: var(--color-surface-raised);
    color: var(--color-fg);
    box-shadow: var(--shadow-drawer);
    translate: 100% 0;
    transition:
      translate 250ms ease-out,
      display 250ms allow-discrete,
      overlay 250ms allow-discrete;
  }

  .navigation-drawer[open] {
    display: flex;
    flex-direction: column;
    translate: 0 0;
  }

  @starting-style {
    .navigation-drawer[open] {
      translate: 100% 0;
    }
  }

  .navigation-drawer::backdrop {
    background-color: color-mix(in oklab, var(--color-backdrop) 50%, transparent);
    opacity: 0;
    transition:
      opacity 250ms ease-out,
      display 250ms allow-discrete,
      overlay 250ms allow-discrete;
  }

  .navigation-drawer[open]::backdrop {
    opacity: 1;
  }

  @starting-style {
    .navigation-drawer[open]::backdrop {
      opacity: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .connection-switcher,
    .navigation-drawer,
    .navigation-drawer::backdrop {
      transition: none;
    }
  }
</style>
