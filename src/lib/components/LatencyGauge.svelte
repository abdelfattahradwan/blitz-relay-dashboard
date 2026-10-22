<script lang="ts">
  let { latency }: { latency: number | null | undefined } = $props();

  const MAXIMUM_LATENCY = 500;

  const fill = $derived(latency ? Math.min(latency / MAXIMUM_LATENCY, 1) * 100 : 0);
</script>

<div class="relative">
  <svg viewBox="0 0 120 66" class="w-full">
    <path
      d="M 10 60 A 50 50 0 0 1 110 60"
      pathLength="100"
      fill="none"
      stroke-width="8"
      stroke-linecap="round"
      class="stroke-surface-strong"
    />
    <path
      d="M 10 60 A 50 50 0 0 1 110 60"
      pathLength="100"
      fill="none"
      stroke-width="8"
      stroke-linecap="round"
      stroke-dasharray="{fill} 100"
      class={[
        "transition-[stroke-dasharray] duration-500",
        latency && latency <= 150 && "stroke-success-emphasis",
        latency && latency > 150 && latency <= 300 && "stroke-warning-emphasis",
        latency && latency > 300 && "stroke-danger-emphasis",
      ]}
    />
  </svg>
  <div class="absolute inset-x-0 bottom-0 flex flex-col items-center">
    {#if latency === undefined}
      <span class="text-sm text-fg-muted">Measuring…</span>
    {:else if latency === null}
      <span class="text-sm font-medium text-danger-fg">No response</span>
    {:else}
      <span class="metric text-3xl">{latency}</span>
      <span class="text-xs text-fg-tertiary">ms</span>
    {/if}
  </div>
</div>
