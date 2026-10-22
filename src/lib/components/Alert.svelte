<script lang="ts">
  import type { Snippet } from "svelte";

  let { tone, children }: { tone: "danger" | "success"; children: Snippet } = $props();
</script>

<p
  role={tone === "danger" ? "alert" : "status"}
  class={[
    "chip rounded-md px-3 py-2 text-sm",
    tone === "danger" &&
      "border-danger-line from-danger-surface-raised to-danger-surface text-danger-fg",
    tone === "success" &&
      "border-success-line from-success-surface-raised to-success-surface text-success-fg",
  ]}
>
  {@render children()}
</p>
