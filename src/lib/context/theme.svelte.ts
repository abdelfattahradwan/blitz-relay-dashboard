import { createContext } from "svelte";

export type Theme = "dark" | "light" | "auto";

export class ThemeState {
  #current = $state<Theme>("dark");

  constructor() {
    const storedTheme = window.localStorage.getItem("theme");

    if (storedTheme === "light" || storedTheme === "auto") {
      this.#current = storedTheme;
      document.documentElement.dataset.theme = storedTheme;
    }
  }

  get current(): Theme {
    return this.#current;
  }

  set current(theme: Theme) {
    this.#current = theme;
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("theme", theme);
  }
}

export const [getThemeState, setThemeState, hasThemeState] = createContext<ThemeState>();
