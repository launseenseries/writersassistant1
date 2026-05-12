import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CustomCategory { id: string; projectId: string; name: string; icon?: string; createdAt: string; }
interface S {
  categories: CustomCategory[];
  add: (projectId: string, name: string, icon?: string) => void;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
}
const uid = () => Math.random().toString(36).slice(2, 10);
export const useCategories = create<S>()(persist((set) => ({
  categories: [],
  add: (projectId, name, icon) => set((s) => ({ categories: [...s.categories, { id: uid(), projectId, name, icon, createdAt: new Date().toISOString() }] })),
  remove: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),
  rename: (id, name) => set((s) => ({ categories: s.categories.map((c) => c.id === id ? { ...c, name } : c) })),
}), { name: "writers-assistant-categories" }));
