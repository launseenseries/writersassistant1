import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "dark" | "light";
interface S { theme: Theme; setTheme: (t: Theme) => void; }

export const useTheme = create<S>()(persist((set) => ({
  theme: "dark",
  setTheme: (theme) => {
    set({ theme });
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      document.documentElement.classList.toggle("light", theme === "light");
      document.body.classList.toggle("dark", theme === "dark");
      document.body.classList.toggle("light", theme === "light");
    }
  },
}), { name: "writers-assistant-theme" }));
