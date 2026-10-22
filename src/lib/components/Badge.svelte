<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    tone,
    children,
  }: {
    tone: "neutral" | "primary" | "info" | "success" | "warning" | "danger";
    children: Snippet;
  } = $props();
</script>

<span
  class={[
    "chip rounded-sm px-1.5 py-0.5 font-mono text-xs font-medium uppercase",
    tone === "neutral" && "border-line from-surface-stronger to-surface-strong text-fg-secondary",
    tone === "primary" &&
      "border-primary-line from-primary-surface-raised to-primary-surface text-primary-fg",
    tone === "info" && "border-info-line from-info-surface-raised to-info-surface text-info-fg",
    tone === "success" &&
      "border-success-line from-success-surface-raised to-success-surface text-success-fg",
    tone === "warning" &&
      "border-warning-line from-warning-surface-raised to-warning-surface text-warning-fg",
    tone === "danger" &&
      "border-danger-line from-danger-surface-raised to-danger-surface text-danger-fg",
  ]}
>
  {@render children()}
</span>
