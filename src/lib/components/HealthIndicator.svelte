<script lang="ts">
  let { status }: { status: "checking" | "up" | "down" } = $props();
</script>

<span
  class={[
    "size-3 rounded-full bg-current",
    status === "checking" && "text-fg-muted",
    status === "up" && "text-success-emphasis motion-safe:animate-pulse",
    status === "down" && "text-danger-emphasis motion-safe:animate-pulse",
  ]}
></span>
