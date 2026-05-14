import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface NpcCategory {
  id: string;
  projectId: string;
  key: string;       // stable key used in NPC data
  label: string;     // display label
  options: string[];
  allowMultiple?: boolean;
  builtin?: boolean;
}

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULTS: Omit<NpcCategory, "id" | "projectId">[] = [
  { key: "strain", label: "Strain", options: ["Mental", "Physical", "Elemental", "Sensory", "Wild", "Hybrid"], allowMultiple: true, builtin: true },
  { key: "powerType", label: "Power Type", options: ["Pyro", "Cryo", "Mental Manipulation", "Shadow Manipulation", "Glamour"], builtin: true },
  { key: "gender", label: "Gender", options: ["M", "F", "MtF", "FtM", "NB"], builtin: true },
  { key: "orientation", label: "Sexual Orientation", options: ["Straight", "Gay", "Lesbian", "Bi", "Pan", "Ace", "Demi", "Queer"], builtin: true },
  { key: "archetype", label: "Archetype", options: ["Mentor", "Trickster", "Warrior", "Healer", "Outcast", "Ruler", "Lover", "Scholar"], builtin: true },
  { key: "alignment", label: "Alignment", options: ["Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral", "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil"], builtin: true },
];

interface S {
  categories: NpcCategory[];
  ensureDefaults: (projectId: string) => void;
  addCategory: (projectId: string, label: string, options?: string[], allowMultiple?: boolean) => void;
  removeCategory: (id: string) => void;
  renameCategory: (id: string, label: string) => void;
  addOption: (id: string, value: string) => void;
  removeOption: (id: string, value: string) => void;
  setMultiple: (id: string, allowMultiple: boolean) => void;
  forProject: (projectId: string) => NpcCategory[];
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || `cat_${uid()}`;

export const useNpcTemplates = create<S>()(persist((set, get) => ({
  categories: [],
  ensureDefaults: (projectId) => {
    const existing = get().categories.filter((c) => c.projectId === projectId);
    if (existing.length > 0) return;
    set((s) => ({
      categories: [
        ...s.categories,
        ...DEFAULTS.map((d) => ({ id: uid(), projectId, ...d })),
      ],
    }));
  },
  addCategory: (projectId, label, options = [], allowMultiple = false) => set((s) => ({
    categories: [...s.categories, { id: uid(), projectId, key: slug(label), label, options, allowMultiple }],
  })),
  removeCategory: (id) => set((s) => ({ categories: s.categories.filter((c) => c.id !== id) })),
  renameCategory: (id, label) => set((s) => ({ categories: s.categories.map((c) => c.id === id ? { ...c, label } : c) })),
  addOption: (id, value) => set((s) => ({
    categories: s.categories.map((c) => c.id === id && !c.options.includes(value) ? { ...c, options: [...c.options, value] } : c),
  })),
  removeOption: (id, value) => set((s) => ({
    categories: s.categories.map((c) => c.id === id ? { ...c, options: c.options.filter((o) => o !== value) } : c),
  })),
  setMultiple: (id, allowMultiple) => set((s) => ({
    categories: s.categories.map((c) => c.id === id ? { ...c, allowMultiple } : c),
  })),
  forProject: (projectId) => get().categories.filter((c) => c.projectId === projectId),
}), { name: "writers-assistant-npc-templates" }));
