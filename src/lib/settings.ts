import { create } from "zustand";
import { persist } from "zustand/middleware";

interface S {
  familyFriendly: boolean;
  setFamilyFriendly: (v: boolean) => void;
  reduceMotion: boolean;
  setReduceMotion: (v: boolean) => void;
}

export const useSettings = create<S>()(persist((set) => ({
  familyFriendly: false,
  setFamilyFriendly: (familyFriendly) => set({ familyFriendly }),
  reduceMotion: false,
  setReduceMotion: (reduceMotion) => set({ reduceMotion }),
}), { name: "writers-assistant-settings" }));
