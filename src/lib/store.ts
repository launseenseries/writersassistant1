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

// Fire-and-forget audit logger (lazy import to avoid circular dep)
function audit(action: string, opts?: { entityType?: string; entityId?: string; entityName?: string; details?: any }) {
  import("./audit").then(({ logAudit }) => logAudit(action, opts)).catch(() => {});
}

// Debounced auto-refresh of project summary/tone/setting after approvals
let summaryTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleSummaryRefresh() {
  if (summaryTimer) clearTimeout(summaryTimer);
  summaryTimer = setTimeout(async () => {
    try {
      const state = useStore.getState();
      const project = state.projects.find((p) => p.id === state.currentProjectId);
      if (!project) return;
      const sources = state.items
        .filter((i) => i.projectId === project.id && i.type === "source" && !i.deleted)
        .slice(-10)
        .map((s: any) => ({ name: s.name, text: (s.data?.rawText || (s as any).rawText || s.description || "").slice(0, 4000) }));
      if (!sources.length) return;
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.functions.invoke("writing-advice", { body: { sources, mode: "summary" } });
      if (error || !data || data.error) return;
      state.updateProject(project.id, {
        settingSummary: data.summary || project.settingSummary,
        toneNotes: data.tone || project.toneNotes,
      });
      audit("auto_refresh_summary", { entityType: "project", entityId: project.id, entityName: project.title });
    } catch { /* silent */ }
  }, 4000);
}

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
  const pid = "demo-oz";
  const project: Project = {
    id: pid,
    title: "The Wonderful Wizard of Oz (Demo)",
    genre: "Classic Fantasy",
    settingSummary: "A young Kansas farm girl named Dorothy is swept by a cyclone into the magical Land of Oz. To return home she must travel the yellow brick road to the Emerald City and seek help from the mysterious Wizard, gathering unlikely companions along the way.",
    toneNotes: "Whimsical, warm, and wondrous with moments of peril and gentle moral lesson. The voice is plainspoken and fairy-tale, anchored by friendship, courage, and the longing for home.",
    series: true,
    startDate: "1900-01-01",
    createdAt: now(),
    updatedAt: now(),
  };
  const mk = (type: EntityType, name: string, extra: Partial<BaseItem> = {}): BaseItem => ({
    id: uid(), projectId: pid, type, name, tags: [], canonStatus: "Confirmed Canon",
    createdAt: now(), updatedAt: now(), versions: [], links: [], ...extra,
  });

  const items: BaseItem[] = [
    mk("character", "Dorothy Gale", { description: "A kind young girl from Kansas, swept to Oz with her dog Toto." }),
    mk("character", "Scarecrow", { description: "Stuffed with straw, longs for a brain." }),
    mk("character", "Tin Woodman", { description: "A man of tin who wishes for a heart." }),
    mk("character", "Cowardly Lion", { description: "A lion who seeks courage." }),
    mk("character", "Toto", { description: "Dorothy's loyal little black dog." }),
    mk("character", "The Wizard of Oz", { description: "The mysterious ruler of the Emerald City." }),
    mk("character", "Glinda", { description: "The Good Witch of the South." }),
    mk("character", "Wicked Witch of the West", { description: "Tyrant of the Winkie Country, fears water." }),
    mk("location", "Kansas", { description: "Dorothy's grey home prairie." }),
    mk("location", "Land of Oz", { description: "The magical land Dorothy is carried to." }),
    mk("location", "Munchkin Country", { description: "Eastern land of small folk in blue." }),
    mk("location", "Emerald City", { description: "The shining capital of Oz." }),
    mk("location", "Yellow Brick Road", { description: "Path leading to the Emerald City." }),
    mk("location", "Winkie Country", { description: "Western land ruled by the Wicked Witch." }),
    mk("faction", "Munchkins", { description: "Peaceful villagers of the East." }),
    mk("faction", "Winged Monkeys", { description: "Bound to serve the holder of the Golden Cap." }),
    mk("faction", "Quadlings", { description: "People of the South, ruled by Glinda." }),
    mk("family", "Gale Family", { description: "Aunt Em and Uncle Henry, Dorothy's guardians." }),
    mk("heritage", "Kansas farming life", { description: "Hard, grey prairie upbringing." }),
    mk("faith", "Belief in the Wizard", { description: "Reverence for the unseen ruler of Oz." }),
    mk("magic", "Silver Shoes", { description: "Magic shoes from the Wicked Witch of the East — can carry the wearer anywhere." }),
    mk("magic", "Golden Cap", { description: "Commands the Winged Monkeys three times." }),
    mk("timeline", "The cyclone carries Dorothy to Oz", { description: "Opening event.", canonStatus: "Confirmed Canon", data: { exactDate: "1900-05-01", orderIndex: 0 } }) as TimelineEvent,
    mk("timeline", "Dorothy meets the Scarecrow", { data: { approxLabel: "Day 2", orderIndex: 1 } }),
    mk("timeline", "The companions reach the Emerald City", { data: { approxLabel: "Week 1", orderIndex: 2 } }),
    mk("timeline", "Dorothy melts the Wicked Witch of the West", { canonStatus: "Confirmed Canon", data: { approxLabel: "Week 3", orderIndex: 3 } }),
    mk("timeline", "Dorothy returns to Kansas", { canonStatus: "Soft Canon", data: { approxLabel: "End", orderIndex: 4, needsReview: true } }),
    mk("continuity", "Confirm exact day count for the journey to the Emerald City.", {
      description: "Travel time across chapters is approximate.",
      canonStatus: "Needs Review",
      data: { severity: "low", status: "Unresolved" },
    }),
  ];

  // Pathways
  const dorothy = items.find((i) => i.name === "Dorothy Gale")!;
  const emerald = items.find((i) => i.name === "Emerald City")!;
  const ev1 = items.find((i) => i.name === "Dorothy meets the Scarecrow")!;
  const ev2 = items.find((i) => i.name === "The companions reach the Emerald City")!;
  const witch = items.find((i) => i.name === "Wicked Witch of the West")!;

  const pathway1: Pathway = {
    ...mk("pathway", "Dorothy's Journey to Oz", { description: "Dorothy's path from Kansas to the Emerald City." }),
    type: "pathway", pathwayType: "Character Pathway", orderMode: "story",
    nodes: [
      { id: uid(), linkedItemId: dorothy.id, linkedItemType: "character", displayName: dorothy.name, orderIndex: 0 },
      { id: uid(), linkedItemId: ev1.id, linkedItemType: "timeline", displayName: ev1.name, orderIndex: 1 },
      { id: uid(), linkedItemId: ev2.id, linkedItemType: "timeline", displayName: ev2.name, orderIndex: 2 },
      { id: uid(), linkedItemId: emerald.id, linkedItemType: "location", displayName: emerald.name, orderIndex: 3 },
    ],
    connections: [],
  } as Pathway;
  const pathway2: Pathway = {
    ...mk("pathway", "Wicked Witch Conflict Pathway", { description: "Tracks the conflict with the Wicked Witch of the West." }),
    type: "pathway", pathwayType: "Antagonist Pathway", orderMode: "chronological",
    nodes: [
      { id: uid(), linkedItemId: witch.id, linkedItemType: "character", displayName: witch.name, orderIndex: 0 },
      { id: uid(), linkedItemId: dorothy.id, linkedItemType: "character", displayName: dorothy.name, orderIndex: 1 },
    ],
    connections: [],
  } as Pathway;
  items.push(pathway1, pathway2);

  // Sample source upload
  const sourceText = `Chapter 1. Dorothy lived in the midst of the great Kansas prairies with Uncle Henry and Aunt Em. A great cyclone lifted the little house high into the air and carried it to the Land of Oz. There she met the Munchkins and the Good Witch of the North, who told her to follow the Yellow Brick Road to the Emerald City and ask the Wizard of Oz for help.`;
  const source: SourceUpload = {
    ...mk("source", "Chapter 1 — The Cyclone", { canonStatus: "Draft", description: "Pasted opening chapter." }),
    type: "source", sourceType: "Chapter", rawText: sourceText,
    uploadOrder: 1, storyOrder: 1, chapter: 1, pov: "Dorothy Gale", storyDate: "1900-05-01",
  } as SourceUpload;
  items.push(source);

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
        audit("create_project", { entityType: "project", entityId: proj.id, entityName: proj.title });
        return proj;
      },
      updateProject: (id, patch) => {
        set((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, ...patch, updatedAt: now() } : p) }));
        audit("update_project", { entityType: "project", entityId: id, details: Object.keys(patch) });
      },
      deleteProject: (id) => {
        set((s) => ({ projects: s.projects.map((p) => p.id === id ? { ...p, deleted: true } : p) }));
        audit("delete_project", { entityType: "project", entityId: id });
      },
      addItem: (i) => {
        const item: BaseItem = {
          id: uid(), projectId: i.projectId || get().currentProjectId, type: i.type,
          name: i.name, description: i.description, notes: i.notes, tags: i.tags || [],
          canonStatus: i.canonStatus || "Draft", createdAt: now(), updatedAt: now(),
          versions: [], links: i.links || [], data: i.data || {}, sourceUploadIds: i.sourceUploadIds || [],
        };
        set((s) => ({ items: [...s.items, item] }));
        audit("create", { entityType: item.type, entityId: item.id, entityName: item.name });
        return item;
      },
      updateItem: (id, patch, mode = "overwrite") => {
        let edited: BaseItem | undefined;
        set((s) => ({
          items: s.items.map((it) => {
            if (it.id !== id) return it;
            const versions = mode === "version"
              ? [...it.versions, { version: it.versions.length + 1, snapshot: { ...it }, createdAt: now() }]
              : it.versions;
            edited = { ...it, ...patch, updatedAt: now(), versions };
            return edited;
          }),
        }));
        if (edited) audit(mode === "version" ? "save_version" : "update", { entityType: edited.type, entityId: edited.id, entityName: edited.name });
      },
      duplicateItem: (id) => {
        const orig = get().items.find((i) => i.id === id);
        if (!orig) return;
        const copy: BaseItem = { ...orig, id: uid(), name: orig.name + " (Copy)", createdAt: now(), updatedAt: now(), versions: [] };
        set((s) => ({ items: [...s.items, copy] }));
        audit("duplicate", { entityType: copy.type, entityId: copy.id, entityName: copy.name });
      },
      deleteItems: (ids) => {
        set((s) => ({ items: s.items.map((i) => ids.includes(i.id) ? { ...i, deleted: true, updatedAt: now() } : i) }));
        audit("soft_delete", { details: { ids } });
      },
      restoreItems: (ids) => {
        set((s) => ({ items: s.items.map((i) => ids.includes(i.id) ? { ...i, deleted: false, updatedAt: now() } : i) }));
        audit("restore", { details: { ids } });
      },
      hardDeleteItems: (ids) => {
        set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
        audit("hard_delete", { details: { ids } });
      },
      archiveItems: (ids, archived) => {
        set((s) => ({ items: s.items.map((i) => ids.includes(i.id) ? { ...i, archived, updatedAt: now() } : i) }));
        audit(archived ? "archive" : "unarchive", { details: { ids } });
      },
      bulkSetStatus: (ids, status) => {
        set((s) => ({ items: s.items.map((i) => ids.includes(i.id) ? { ...i, canonStatus: status, updatedAt: now() } : i) }));
        audit("bulk_status", { details: { ids, status } });
      },
      bulkAddTags: (ids, tags) => {
        set((s) => ({ items: s.items.map((i) => ids.includes(i.id) ? { ...i, tags: Array.from(new Set([...i.tags, ...tags])), updatedAt: now() } : i) }));
        audit("bulk_tag", { details: { ids, tags } });
      },
      approveSuggestion: (id) => {
        const sug = get().suggestions.find((s) => s.id === id);
        if (!sug) return;
        get().addItem({
          type: sug.suggestedCategory, name: sug.suggestedTitle, canonStatus: "Draft",
          description: sug.excerpt, sourceUploadIds: [sug.sourceUploadId],
        });
        set((s) => ({ suggestions: s.suggestions.map((x) => x.id === id ? { ...x, status: "approved" } : x) }));
        audit("approve_suggestion", { entityType: sug.suggestedCategory, entityName: sug.suggestedTitle });
        scheduleSummaryRefresh();
      },
      rejectSuggestion: (id) => {
        const sug = get().suggestions.find((s) => s.id === id);
        set((s) => ({ suggestions: s.suggestions.map((x) => x.id === id ? { ...x, status: "rejected" } : x) }));
        if (sug) audit("reject_suggestion", { entityType: sug.suggestedCategory, entityName: sug.suggestedTitle });
      },
      runExtraction: (sourceId) => {
        const src = get().items.find((i) => i.id === sourceId) as any;
        if (!src) return 0;
        const rawText: string = src.rawText || src.data?.rawText || src.description || "";
        const existing = get().suggestions.filter((s) => s.sourceUploadId === sourceId).map((s) => s.suggestedTitle.toLowerCase());
        const found = extractFromText(rawText).filter((s) => !existing.includes(s.name.toLowerCase()));
        const newSugs: ImportSuggestion[] = found.map((s) => ({
          id: uid(), projectId: src.projectId, sourceUploadId: sourceId,
          suggestedTitle: s.name, suggestedCategory: s.category, excerpt: s.excerpt,
          confidence: s.confidence, reason: s.reason, status: "pending", createdAt: now(),
        }));
        set((s) => ({ suggestions: [...s.suggestions, ...newSugs] }));
        audit("run_extraction", { entityType: "source", entityId: sourceId, entityName: src.name, details: { found: newSugs.length } });
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
