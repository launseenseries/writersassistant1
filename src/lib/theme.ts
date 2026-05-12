import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Theme = "arcane" | "garden" | "kawaii";

export const THEMES: { id: Theme; label: string; tagline: string }[] = [
  { id: "arcane", label: "Cinematic Arcane", tagline: "Dark · neon · magical archive" },
  { id: "garden", label: "Story Garden", tagline: "Light · sage · cozy notebook" },
  { id: "kawaii", label: "Magical Dream", tagline: "Pink · sparkle · dreamy" },
];

interface S { theme: Theme; setTheme: (t: Theme) => void; cycle: () => void; }

const apply = (theme: Theme) => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const body = document.body;
  ["arcane", "garden", "kawaii", "dark", "light"].forEach((c) => {
    root.classList.remove(`theme-${c}`, c);
    body.classList.remove(`theme-${c}`, c);
  });
  root.classList.add(`theme-${theme}`);
  body.classList.add(`theme-${theme}`);
  // keep dark class for shadcn dark variants on non-light themes
  if (theme !== "garden") {
    root.classList.add("dark");
    body.classList.add("dark");
  } else {
    root.classList.add("light");
    body.classList.add("light");
  }
};

export const useTheme = create<S>()(persist((set, get) => ({
  theme: "arcane",
  setTheme: (theme) => { set({ theme }); apply(theme); },
  cycle: () => {
    const order: Theme[] = ["arcane", "garden", "kawaii"];
    const next = order[(order.indexOf(get().theme) + 1) % order.length];
    set({ theme: next }); apply(next);
  },
}), {
  name: "writers-assistant-theme-v2",
  onRehydrateStorage: () => (state) => { if (state) apply(state.theme); },
}));
