<script lang="ts">
  import { PlusIcon, SlidersHorizontalIcon } from "@lucide/svelte";
  import { invalidate } from "$app/navigation";
  import { resolve } from "$app/paths";
  import Alert from "#/lib/components/Alert.svelte";
  import RoomBadges from "#/lib/components/RoomBadges.svelte";
  import { RoomKind, type RoomSnapshot } from "#/lib/utilities/relay-api.ts";

  let { data } = $props();

  const filterDefinitions = [
    {
      key: "kind",
      label: "Type",
      options: [
        { value: "all", label: "All types" },
        { value: "persistent", label: "Persistent" },
        { value: "ephemeral", label: "Ephemeral" },
      ],
    },
    {
      key: "visibility",
      label: "Visibility",
      options: [
        { value: "all", label: "All visibilities" },
        { value: "public", label: "Public" },
        { value: "private", label: "Private" },
      ],
    },
    {
      key: "host",
      label: "Host",
      options: [
        { value: "all", label: "All hosts" },
        { value: "hosted", label: "Hosted" },
        { value: "pending", label: "Host claim pending" },
        { value: "none", label: "No host" },
      ],
    },
    {
      key: "clients",
      label: "Clients",
      options: [
        { value: "all", label: "All rooms" },
        { value: "occupied", label: "With clients" },
        { value: "empty", label: "Empty" },
        { value: "full", label: "Full" },
      ],
    },
  ] as const;

  let filters = $state<Record<(typeof filterDefinitions)[number]["key"], string>>({
    kind: "all",
    visibility: "all",
    host: "all",
    clients: "all",
  });

  let searchQuery = $state("");

  const activeFilterCount = $derived.by(() => {
    let count = 0;

    for (const definition of filterDefinitions) {
      if (filters[definition.key] !== "all") {
        count++;
      }
    }

    return count;
  });

  function matchesFilters(room: RoomSnapshot): boolean {
    if (filters.kind === "persistent" && room.kind !== RoomKind.PersistentReserved) {
      return false;
    }

    if (filters.kind === "ephemeral" && room.kind !== RoomKind.EphemeralHostOwned) {
      return false;
    }

    if (filters.visibility === "public" && !room.isPublic) {
      return false;
    }

    if (filters.visibility === "private" && room.isPublic) {
      return false;
    }

    if (filters.host === "hosted" && !room.hasHost) {
      return false;
    }

    if (filters.host === "pending" && (room.hasHost || !room.hasPendingHostClaim)) {
      return false;
    }

    if (filters.host === "none" && (room.hasHost || room.hasPendingHostClaim)) {
      return false;
    }

    if (filters.clients === "occupied" && room.connectedClientCount === 0) {
      return false;
    }

    if (filters.clients === "empty" && room.connectedClientCount !== 0) {
      return false;
    }

    if (filters.clients === "full" && room.connectedClientCount < room.maximumClients) {
      return false;
    }

    return true;
  }

  const filteredRooms = $derived.by(() => {
    if (!data.rooms) {
      return null;
    }

    const query = searchQuery.trim().toLowerCase();
    const rooms: Array<RoomSnapshot> = [];

    for (const room of data.rooms) {
      if (!matchesFilters(room)) {
        continue;
      }

      if (
        query !== "" &&
        !room.code.toLowerCase().includes(query) &&
        !room.displayName.toLowerCase().includes(query)
      ) {
        continue;
      }

      rooms.push(room);
    }

    return rooms;
  });

  $effect(() => {
    const interval = window.setInterval(() => {
      void invalidate("relay:rooms");
    }, 5_000);

    return () => {
      window.clearInterval(interval);
    };
  });
</script>

<main class="flex flex-1 flex-col overflow-y-auto p-4">
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-4">
    <div class="flex flex-wrap gap-2">
      <input
        type="search"
        bind:value={searchQuery}
        placeholder="Search by code or name…"
        aria-label="Search rooms"
        autocomplete="off"
        class="field flex-1 max-sm:basis-full"
      />
      <button
        type="button"
        commandfor="room-filters"
        command="toggle-popover"
        class="button button-secondary flex-1 sm:hidden"
      >
        <SlidersHorizontalIcon size={16} />
        {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : "Filters"}
      </button>
      <a href={resolve("/rooms/create")} class="button button-primary max-sm:flex-1">
        <PlusIcon size={16} />
        Create room
      </a>
    </div>
    <div id="room-filters" popover class="room-filters panel gap-4 sm:grid-cols-4">
      {#each filterDefinitions as definition (definition.key)}
        <label class="flex flex-col gap-1">
          <span class="text-sm font-medium">{definition.label}</span>
          <select bind:value={filters[definition.key]} class="field">
            {#each definition.options as option (option.value)}
              <option value={option.value}>{option.label}</option>
            {/each}
          </select>
        </label>
      {/each}
    </div>
    {#if filteredRooms}
      <div class="grid grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))] gap-4">
        {#each filteredRooms as room (room.code)}
          <a
            href={resolve("/rooms/[code]", { code: room.code })}
            class="panel flex flex-col gap-4 transition-[translate,border-color] fine-hover:hover:-translate-y-0.5 fine-hover:hover:border-primary-line-strong"
          >
            <div class="flex items-start justify-between gap-4">
              <div class="flex min-w-0 flex-col gap-1">
                <span class="truncate font-semibold">{room.displayName || "Untitled room"}</span>
                <span class="font-mono text-sm text-fg-tertiary">{room.code}</span>
              </div>
              <span class="shrink-0 font-mono text-sm text-fg-secondary tabular-nums">
                {room.connectedClientCount} / {room.maximumClients}
              </span>
            </div>
            <RoomBadges {room} />
          </a>
        {:else}
          <p class="text-sm text-fg-muted">
            {data.rooms?.length
              ? "No rooms match the filters and search."
              : "There are no rooms on this relay."}
          </p>
        {/each}
      </div>
    {:else}
      <Alert tone="danger">Could not load the rooms. {data.roomsError}</Alert>
    {/if}
  </div>
</main>

<style>
  .room-filters {
    margin: 0;
    margin-block-start: 0.5rem;
    inset: auto;
    width: min(20rem, calc(100vw - 2rem));
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

  .room-filters:popover-open {
    display: grid;
    opacity: 1;
    translate: 0 0;
  }

  @starting-style {
    .room-filters:popover-open {
      opacity: 0;
      translate: 0 -0.5rem;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .room-filters {
      transition: none;
    }
  }

  @media (min-width: 40rem) {
    .room-filters {
      position: static;
      display: grid;
      width: auto;
      margin: 0;
      overflow: visible;
      opacity: 1;
      translate: none;
      transition: none;
    }
  }
</style>
