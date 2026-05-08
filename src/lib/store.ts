import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CanonStatus =
  | "Suggested" | "Draft" | "Soft Canon" | "Confirmed Canon"
  | "Needs Review" | "Contradiction" | "Retconned" | "Deprecated" | "Archived";

export const CANON_STATUSES: CanonStatus[] = [
  "Suggested", "Draft", "Soft Canon", "Confirmed Canon",
  "Needs Review", "Contradiction", "Retconned", "Deprecated", "Archived",
];

export const statusColor = (s: CanonStatus): string => ({
  "Suggested": "bg-muted text-muted-foreground",
  "Draft": "bg-secondary text-secondary-foreground",
  "Soft Canon": "bg-electric/20 text-electric",
  "Confirmed Canon": "bg-primary/30 text-primary-foreground",
  "Needs Review": "bg-yellow-500/20 text-yellow-300",
  "Contradiction": "bg-destructive/30 text-destructive-foreground",
  "Retconned": "bg-orange-500/20 text-orange-300",
  "Deprecated": "bg-zinc-500/20 text-zinc-300",
  "Archived": "bg-zinc-700/40 text-zinc-300",
}[s]);

export type EntityType =
  | "project" | "source" | "suggestion" | "timeline" | "worldbuilding"
  | "character" | "location" | "faction" | "family" | "heritage" | "faith"
  | "magic" | "pathway" | "continuity" | "retcon" | "template" | "export"
  | "chapter" | "scene" | "arc" | "category";

export interface BaseItem {
  id: string;
  projectId: string;
  type: EntityType;
  name: string;
  description?: string;
  notes?: string;
  tags: string[];
  canonStatus: CanonStatus;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  deleted?: boolean;
  versions: { version: number; snapshot: any; note?: string; createdAt: string }[];
  links: string[]; // ids of linked items
  data?: Record<string, any>; // type-specific extra fields
  sourceUploadIds?: string[];
}

export interface Project {
  id: string;
  title: string;
  genre: string;
  settingSummary: string;
  toneNotes: string;
  series: boolean;
  startDate: string;
  createdAt: string;
  updatedAt: string;
  deleted?: boolean;
}

export interface SourceUpload extends BaseItem {
  type: "source";
  sourceType: string;
  rawText: string;
  uploadOrder: number;
  storyOrder: number;
  chapter?: number;
  scene?: number;
  storyDate?: string;
  storyTime?: string;
  pov?: string;
  location?: string;
}

export interface ImportSuggestion {
  id: string;
  projectId: string;
  sourceUploadId: string;
  suggestedTitle: string;
  suggestedCategory: EntityType;
  excerpt: string;
  confidence: number;
  reason: string;
  status: "pending" | "approved" | "rejected" | "merged";
  createdAt: string;
}

export interface TimelineEvent extends BaseItem {
  type: "timeline";
  exactDate?: string;
  approxLabel?: string;
  storyTime?: string;
  orderIndex: number;
  chapter?: number;
  scene?: number;
  needsReview?: boolean;
}

export interface PathwayNode {
  id: string;
  linkedItemId: string;
  linkedItemType: EntityType;
  displayName: string;
  summary?: string;
  orderIndex: number;
  sourceUploadId?: string;
  excerpt?: string;
  notes?: string;
}
export interface PathwayConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  label: string;
}
export interface Pathway extends BaseItem {
  type: "pathway";
  pathwayType: string;
  nodes: PathwayNode[];
  connections: PathwayConnection[];
  orderMode: "story" | "upload" | "chronological" | "custom";
  lockedOrder?: boolean;
  lastNodeId?: string;
}

export interface ContinuityIssue extends BaseItem {
  type: "continuity";
  severity: "low" | "medium" | "high";
  status: "Unresolved" | "Resolved" | "Intentional" | "Ignored" | "Needs Review";
  suggestedFix?: string;
}

export interface Retcon extends BaseItem {
  type: "retcon";
  oldCanon: string;
  newCanon: string;
  reason: string;
  dateChanged: string;
}

export interface Template {
  id: string;
  name: string;
  type: EntityType;
  fields: { key: string; label: string; placeholder?: string }[];
  description?: string;
}

interface State {
  projects: Project[];
  currentProjectId: string;
  items: BaseItem[]; // catch-all for all entity types
  suggestions: ImportSuggestion[];
  templates: Template[];
  // actions
  setCurrentProject: (id: string) => void;
  createProject: (p: Partial<Project>) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addItem: (i: Partial<BaseItem> & { type: EntityType; name: string }) => BaseItem;
  updateItem: (id: string, patch: Partial<BaseItem>, mode?: "overwrite" | "version") => void;
  duplicateItem: (id: string) => void;
  deleteItems: (ids: string[]) => void;
  restoreItems: (ids: string[]) => void;
  hardDeleteItems: (ids: string[]) => void;
  archiveItems: (ids: string[], archived: boolean) => void;
  bulkSetStatus: (ids: string[], status: CanonStatus) => void;
  bulkAddTags: (ids: string[], tags: string[]) => void;
  approveSuggestion: (id: string) => void;
  rejectSuggestion: (id: string) => void;
  runExtraction: (sourceId: string) => number;
}

const now = () => new Date().toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

const STOPWORDS = new Set(["The","And","But","Or","A","An","Of","To","In","On","At","For","From","With","By","As","Is","Are","Was","Were","Be","Been","Being","It","This","That","These","Those","He","She","They","We","I","You","His","Her","Their","Our","My","Your","If","Not","So","Do","Did","Has","Have","Had","Will","Would","Could","Should"]);

function extractFromText(text: string): { name: string; category: EntityType; reason: string; confidence: number; excerpt: string }[] {
  const results: Map<string, { name: string; category: EntityType; reason: string; confidence: number; excerpt: string; count: number }> = new Map();
  // Capitalized phrases (1-3 words)
  const phraseRe = /\b([A-Z][a-zA-Z'’]+(?:\s+[A-Z][a-zA-Z'’]+){0,3})\b/g;
  let m;
  while ((m = phraseRe.exec(text))) {
    const phrase = m[1].trim();
    const first = phrase.split(/\s+/)[0];
    if (phrase.split(/\s+/).every((w) => STOPWORDS.has(w))) continue;
    if (phrase.length < 3) continue;
    if (STOPWORDS.has(first) && !phrase.includes(" ")) continue;
    const lower = text.toLowerCase();
    const idx = Math.max(0, m.index - 60);
    const excerpt = text.slice(idx, Math.min(text.length, m.index + 80));
    let category: EntityType = "worldbuilding";
    let reason = "Capitalized name";
    const ctx = text.slice(Math.max(0, m.index - 40), m.index + phrase.length + 40).toLowerCase();
    if (/family|house|clan|bloodline/.test(ctx)) { category = "family"; reason = "Near family-related word"; }
    else if (/heritage|culture|descent|ancestry/.test(ctx)) { category = "heritage"; reason = "Near heritage word"; }
    else if (/faith|religion|church|mosque|temple|coven/.test(ctx)) { category = "faith"; reason = "Near faith word"; }
    else if (/school|academy|council|registry|enforcement|organization|faction|guild|order|crew/.test(ctx)) { category = "faction"; reason = "Near organization word"; }
    else if (/city|street|neighborhood|district|building|park/.test(ctx) || /^(Los Angeles|Hollywood|Baldwin Village|LASMA)$/.test(phrase)) { category = "location"; reason = "Place name"; }
    else if (/magic|power|spell|veil/.test(ctx)) { category = "magic"; reason = "Near magic word"; }
    else if (phrase.split(/\s+/).length >= 2) { category = "character"; reason = "Multi-word proper name"; }
    const key = phrase + "|" + category;
    const existing = results.get(key);
    if (existing) { existing.count++; existing.confidence = Math.min(0.95, existing.confidence + 0.1); }
    else results.set(key, { name: phrase, category, reason, confidence: 0.6, excerpt, count: 1 });
    void lower;
  }
  // Key moment events
  const eventRe = /([^.!?\n]*\b(arrives|leaves|dies|discovers|reveals|attacks|escapes|joins|betrays|meets|fights|founded|born|moves|begins|ends|opens|closes|breaks)\b[^.!?\n]*)[.!?]/gi;
  while ((m = eventRe.exec(text))) {
    const sentence = m[1].trim();
    if (sentence.length < 8) continue;
    const key = sentence.slice(0, 60) + "|timeline";
    if (results.has(key)) continue;
    results.set(key, { name: sentence.slice(0, 80), category: "timeline", reason: `Key moment ("${m[2]}")`, confidence: 0.7, excerpt: sentence, count: 1 });
  }
  return Array.from(results.values()).filter((r) => r.confidence >= 0.5);
}

function seed(): Pick<State, "projects" | "currentProjectId" | "items" | "suggestions" | "templates"> {
  const pid = "demo-la-unseen";
  const project: Project = {
    id: pid,
    title: "LA Unseen Demo",
    genre: "Urban Fantasy",
    settingSummary: "LA Unseen is an urban fantasy story set in a hidden magical version of Los Angeles, beginning in 2025 as the veil between worlds starts weakening. Everyday neighborhoods, schools, and landmarks exist alongside a secret Magi society, with LASMA, an elite magical academy in Hollywood, at the center. As powerful young Magi come of age, they must navigate magic, identity, danger, and the systems deciding who gets protected and who gets watched.",
    toneNotes: "Contemporary urban fantasy with an LA street-level edge, blending magical danger, teen drama, institutional power, social commentary, and emotional coming-of-age. The tone should feel grounded, cinematic, tense, stylish, and culturally specific, with moments of humor, vulnerability, and supernatural awe.",
    series: true,
    startDate: "2025-01-01",
    createdAt: now(),
    updatedAt: now(),
  };
  const mk = (type: EntityType, name: string, extra: Partial<BaseItem> = {}): BaseItem => ({
    id: uid(), projectId: pid, type, name, tags: [], canonStatus: "Confirmed Canon",
    createdAt: now(), updatedAt: now(), versions: [], links: [], ...extra,
  });

  const items: BaseItem[] = [
    mk("character", "Valentina Jones", { description: "Powerful young Magi at the center of LASMA's attention.", canonStatus: "Confirmed Canon" }),
    mk("character", "Jezebel \"Belle\" Brooks", { description: "Magi student, fierce friend." }),
    mk("character", "Diego Alvarez", { description: "Magi student from the neighborhood." }),
    mk("character", "Aminah Sadiq", { description: "Magi student of Sudanese heritage." }),
    mk("location", "Los Angeles", { description: "City setting, both mundane and magical." }),
    mk("location", "Hollywood", { description: "Home of LASMA academy." }),
    mk("location", "LASMA", { description: "Los Angeles Society of Magickal Arts academy." }),
    mk("location", "Baldwin Village", { description: "Neighborhood with cultural significance." }),
    mk("faction", "LASMA", { description: "Elite magical academy and institution." }),
    mk("faction", "Magickal Risk Registry", { description: "Surveillance system for Magi deemed risky." }),
    mk("faction", "Urban Magickal Enforcement", { description: "Magical law enforcement." }),
    mk("family", "Jones Family", { description: "Valentina's family." }),
    mk("family", "Sadiq Family", { description: "Aminah's family." }),
    mk("heritage", "Sudanese heritage", { description: "Cultural background of the Sadiq family." }),
    mk("heritage", "Los Angeles neighborhood culture", { description: "Local cultural identity." }),
    mk("faith", "Islam", { description: "Faith tradition of the Sadiq family." }),
    mk("magic", "The Veil", { description: "Boundary between mundane and magical worlds." }),
    mk("timeline", "Story begins in 2025", { description: "Opening of the story.", canonStatus: "Confirmed Canon", data: { exactDate: "2025-01-01", orderIndex: 0 } }) as TimelineEvent,
    mk("timeline", "Valentina receives LASMA attention", { data: { approxLabel: "Spring 2025", orderIndex: 1 } }),
    mk("timeline", "Students arrive at LASMA", { data: { approxLabel: "Fall 2025", orderIndex: 2 } }),
    mk("timeline", "The veil begins weakening", { canonStatus: "Soft Canon", data: { approxLabel: "Late 2025", orderIndex: 3, needsReview: true } }),
    mk("continuity", "Some events need exact dates before the full timeline can be confirmed.", {
      description: "Several timeline events lack precise dates.",
      canonStatus: "Needs Review",
      data: { severity: "medium", status: "Unresolved" },
    }),
  ];

  // Pathways
  const charValentina = items.find((i) => i.name === "Valentina Jones")!;
  const lasma = items.find((i) => i.type === "faction" && i.name === "LASMA")!;
  const veil = items.find((i) => i.name === "The Veil")!;
  const ev1 = items.find((i) => i.name === "Valentina receives LASMA attention")!;
  const ev2 = items.find((i) => i.name === "Students arrive at LASMA")!;

  const pathway1: Pathway = {
    ...mk("pathway", "Valentina's LASMA Pathway", { description: "Valentina's journey through LASMA." }),
    type: "pathway", pathwayType: "Character Pathway", orderMode: "story",
    nodes: [
      { id: uid(), linkedItemId: charValentina.id, linkedItemType: "character", displayName: charValentina.name, orderIndex: 0 },
      { id: uid(), linkedItemId: ev1.id, linkedItemType: "timeline", displayName: ev1.name, orderIndex: 1 },
      { id: uid(), linkedItemId: lasma.id, linkedItemType: "faction", displayName: lasma.name, orderIndex: 2 },
    ],
    connections: [],
  } as Pathway;
  const pathway2: Pathway = {
    ...mk("pathway", "Veil Weakening Pathway", { description: "Tracks the weakening veil." }),
    type: "pathway", pathwayType: "Magic / Power Pathway", orderMode: "chronological",
    nodes: [
      { id: uid(), linkedItemId: veil.id, linkedItemType: "magic", displayName: veil.name, orderIndex: 0 },
      { id: uid(), linkedItemId: ev2.id, linkedItemType: "timeline", displayName: ev2.name, orderIndex: 1 },
    ],
    connections: [],
  } as Pathway;
  const pathway3: Pathway = {
    ...mk("pathway", "LASMA Institutional Power Pathway", { description: "Institutional power dynamics." }),
    type: "pathway", pathwayType: "Faction Pathway", orderMode: "story",
    nodes: [
      { id: uid(), linkedItemId: lasma.id, linkedItemType: "faction", displayName: lasma.name, orderIndex: 0 },
    ],
    connections: [],
  } as Pathway;
  items.push(pathway1, pathway2, pathway3);

  // Sample source upload
  const sourceText = `Chapter 1. Valentina Jones arrives at LASMA in Hollywood. The Magickal Risk Registry has flagged her name. Belle Brooks meets her at the gates. The veil weakens over Baldwin Village that night.`;
  const source: SourceUpload = {
    ...mk("source", "Chapter 1 — Arrival", { canonStatus: "Draft", description: "Pasted opening chapter." }),
    type: "source", sourceType: "Chapter", rawText: sourceText,
    uploadOrder: 1, storyOrder: 1, chapter: 1, pov: "Valentina Jones", storyDate: "2025-09-01",
  } as SourceUpload;
  items.push(source);

  // Generate suggestions from that source for demo
  const suggestions: ImportSuggestion[] = extractFromText(sourceText).map((s) => ({
    id: uid(), projectId: pid, sourceUploadId: source.id,
    suggestedTitle: s.name, suggestedCategory: s.category, excerpt: s.excerpt,
    confidence: s.confidence, reason: s.reason, status: "pending", createdAt: now(),
  }));

  const templates: Template[] = [
    { id: uid(), name: "Character Profile", type: "character", description: "Standard character bio fields.", fields: [
      { key: "aliases", label: "Aliases" }, { key: "age", label: "Age" }, { key: "personality", label: "Personality" }, { key: "powers", label: "Powers / Skills" },
    ]},
    { id: uid(), name: "Location Profile", type: "location", fields: [
      { key: "type", label: "Type" }, { key: "region", label: "Neighborhood / City / Region" }, { key: "significance", label: "Cultural Significance" },
    ]},
    { id: uid(), name: "Timeline Event", type: "timeline", fields: [
      { key: "exactDate", label: "Exact Date" }, { key: "approxLabel", label: "Approximate Date" }, { key: "summary", label: "Summary" },
    ]},
    { id: uid(), name: "Pathway", type: "pathway", fields: [
      { key: "pathwayType", label: "Pathway Type" }, { key: "description", label: "Description" },
    ]},
  ];

  return { projects: [project], currentProjectId: pid, items, suggestions, templates };
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      ...seed(),
      setCurrentProject: (id) => set({ currentProjectId: id }),
      createProject: (p) => {
        const proj: Project = {
          id: uid(), title: p.title || "Untitled Project", genre: p.genre || "",
          settingSummary: p.settingSummary || "", toneNotes: p.toneNotes || "",
          series: p.series ?? false, startDate: p.startDate || now(),
          createdAt: now(), updatedAt: now(),
        };
        set((s) => ({ projects: [...s.projects, proj], currentProjectId: proj.id }));
        return proj;
      },
      updateProject: (id, patch) => set((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, ...patch, updatedAt: now() } : p) })),
      deleteProject: (id) => set((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, deleted: true } : p) })),
      addItem: (i) => {
        const item: BaseItem = {
          id: uid(), projectId: i.projectId || get().currentProjectId, type: i.type,
          name: i.name, description: i.description, notes: i.notes, tags: i.tags || [],
          canonStatus: i.canonStatus || "Draft", createdAt: now(), updatedAt: now(),
          versions: [], links: i.links || [], data: i.data || {}, sourceUploadIds: i.sourceUploadIds || [],
        };
        set((s) => ({ items: [...s.items, item] }));
        return item;
      },
      updateItem: (id, patch, mode = "overwrite") => set((s) => ({
        items: s.items.map((it) => {
          if (it.id !== id) return it;
          const versions = mode === "version"
            ? [...it.versions, { version: it.versions.length + 1, snapshot: { ...it }, createdAt: now() }]
            : it.versions;
          return { ...it, ...patch, updatedAt: now(), versions };
        }),
      })),
      duplicateItem: (id) => set((s) => {
        const orig = s.items.find((i) => i.id === id);
        if (!orig) return {};
        const copy: BaseItem = { ...orig, id: uid(), name: orig.name + " (Copy)", createdAt: now(), updatedAt: now(), versions: [] };
        return { items: [...s.items, copy] };
      }),
      deleteItems: (ids) => set((s) => ({ items: s.items.map((i) => ids.includes(i.id) ? { ...i, deleted: true, updatedAt: now() } : i) })),
      restoreItems: (ids) => set((s) => ({ items: s.items.map((i) => ids.includes(i.id) ? { ...i, deleted: false, updatedAt: now() } : i) })),
      hardDeleteItems: (ids) => set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) })),
      archiveItems: (ids, archived) => set((s) => ({ items: s.items.map((i) => ids.includes(i.id) ? { ...i, archived, updatedAt: now() } : i) })),
      bulkSetStatus: (ids, status) => set((s) => ({ items: s.items.map((i) => ids.includes(i.id) ? { ...i, canonStatus: status, updatedAt: now() } : i) })),
      bulkAddTags: (ids, tags) => set((s) => ({ items: s.items.map((i) => ids.includes(i.id) ? { ...i, tags: Array.from(new Set([...i.tags, ...tags])), updatedAt: now() } : i) })),
      approveSuggestion: (id) => {
        const sug = get().suggestions.find((s) => s.id === id);
        if (!sug) return;
        get().addItem({
          type: sug.suggestedCategory, name: sug.suggestedTitle, canonStatus: "Draft",
          description: sug.excerpt, sourceUploadIds: [sug.sourceUploadId],
        });
        set((s) => ({ suggestions: s.suggestions.map((x) => x.id === id ? { ...x, status: "approved" } : x) }));
      },
      rejectSuggestion: (id) => set((s) => ({ suggestions: s.suggestions.map((x) => x.id === id ? { ...x, status: "rejected" } : x) })),
      runExtraction: (sourceId) => {
        const src = get().items.find((i) => i.id === sourceId) as SourceUpload | undefined;
        if (!src) return 0;
        const existing = get().suggestions.filter((s) => s.sourceUploadId === sourceId).map((s) => s.suggestedTitle.toLowerCase());
        const found = extractFromText(src.rawText).filter((s) => !existing.includes(s.name.toLowerCase()));
        const newSugs: ImportSuggestion[] = found.map((s) => ({
          id: uid(), projectId: src.projectId, sourceUploadId: sourceId,
          suggestedTitle: s.name, suggestedCategory: s.category, excerpt: s.excerpt,
          confidence: s.confidence, reason: s.reason, status: "pending", createdAt: now(),
        }));
        set((s) => ({ suggestions: [...s.suggestions, ...newSugs] }));
        return newSugs.length;
      },
    }),
    { name: "writers-assistant-v1" }
  )
);

export const useCurrentProject = () => {
  const { projects, currentProjectId } = useStore();
  return projects.find((p) => p.id === currentProjectId);
};

export const useItems = (filter?: (i: BaseItem) => boolean) => {
  const { items, currentProjectId } = useStore();
  return items.filter((i) => i.projectId === currentProjectId && !i.deleted && (!filter || filter(i)));
};
