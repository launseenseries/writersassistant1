// Glossary stored separately as items of a new "glossary" type via store data field is heavy.
// Use a dedicated zustand slice persisted alongside.
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface GlossaryEntry {
  id: string;
  projectId: string;
  term: string;
  category: "slang" | "religious" | "cultural" | "technical" | "other";
  definition: string;
  example?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  versions: { version: number; snapshot: any; createdAt: string }[];
  deleted?: boolean;
}

interface GState {
  entries: GlossaryEntry[];
  add: (e: Partial<GlossaryEntry> & { term: string; projectId: string }) => GlossaryEntry;
  update: (id: string, patch: Partial<GlossaryEntry>, mode?: "overwrite" | "version") => void;
  remove: (id: string) => void;
  duplicate: (id: string) => void;
}
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

export const useGlossary = create<GState>()(persist((set, get) => ({
  entries: [],
  add: (e) => {
    const entry: GlossaryEntry = {
      id: uid(), projectId: e.projectId, term: e.term, category: e.category || "other",
      definition: e.definition || "", example: e.example, tags: e.tags || [],
      createdAt: now(), updatedAt: now(), versions: [],
    };
    set((s) => ({ entries: [...s.entries, entry] }));
    return entry;
  },
  update: (id, patch, mode = "overwrite") => set((s) => ({
    entries: s.entries.map((it) => {
      if (it.id !== id) return it;
      const versions = mode === "version"
        ? [...it.versions, { version: it.versions.length + 1, snapshot: { ...it }, createdAt: now() }]
        : it.versions;
      return { ...it, ...patch, updatedAt: now(), versions };
    }),
  })),
  remove: (id) => set((s) => ({ entries: s.entries.map((e) => e.id === id ? { ...e, deleted: true } : e) })),
  duplicate: (id) => set((s) => {
    const o = s.entries.find((e) => e.id === id); if (!o) return {};
    return { entries: [...s.entries, { ...o, id: uid(), term: o.term + " (Copy)", createdAt: now(), updatedAt: now(), versions: [] }] };
  }),
}), { name: "writers-assistant-glossary-v1" }));
