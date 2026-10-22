<script lang="ts">
  import { MoonIcon, SunIcon, SunMoonIcon } from "@lucide/svelte";
  import { getThemeState, type Theme } from "#/lib/context/theme.svelte.ts";

  const themeState = getThemeState();

  const themes: Record<Theme, { label: string; next: Theme; icon: typeof MoonIcon }> = {
    dark: { label: "Dark", next: "light", icon: MoonIcon },
    light: { label: "Light", next: "auto", icon: SunIcon },
    auto: { label: "Auto", next: "dark", icon: SunMoonIcon },
  };

  const current = $derived(themes[themeState.current]);
  const next = $derived(themes[current.next]);
</script>

<button
  type="button"
  onclick={() => {
    themeState.current = current.next;
  }}
  aria-label="Theme: {current.label}. Switch to {next.label}."
  title="Theme: {current.label} (switch to {next.label})"
  class="icon-button button-secondary"
>
  <current.icon size={18} />
</button>
