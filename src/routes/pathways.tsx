import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, BaseItem, SourceUpload } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Sparkles, Pin, PinOff, Check, X as XIcon, Bookmark, Archive, RefreshCw,
  ArrowUp, ArrowDown, Trash2, Wand2, GitBranch, Crown, Layers,
  PlayCircle, Pencil, ChevronRight, History,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pathways")({ component: Page });

const PATHWAY_TYPES = [
  "Plot Arc Pathway", "Character Arc Pathway", "Character Pathway", "Location Pathway",
  "Faction Pathway", "Family Pathway", "Heritage Pathway", "Faith Pathway",
  "Magic / Power Pathway", "Object / Artifact Pathway", "Relationship Pathway",
  "Timeline Pathway", "Chapter Pathway", "Scene Pathway", "Continuity Pathway", "Custom Pathway",
];

type CardState =
  | "Suggested" | "Previewed" | "Edited" | "SavedForLater"
  | "ConfirmedCanon" | "AlternateCanon" | "SoftCanon"
  | "Rejected" | "Archived";

const STATE_LABEL: Record<CardState, string> = {
  Suggested: "Suggested", Previewed: "Previewed", Edited: "Edited",
  SavedForLater: "Saved for Later", ConfirmedCanon: "Confirmed Canon",
  AlternateCanon: "Alternate Canon", SoftCanon: "Soft Canon",
  Rejected: "Rejected", Archived: "Archived",
};

const STATE_COLOR: Record<CardState, string> = {
  Suggested: "bg-muted text-muted-foreground",
  Previewed: "bg-secondary text-secondary-foreground",
  Edited: "bg-secondary text-secondary-foreground",
  SavedForLater: "bg-amber-500/20 text-amber-300",
  ConfirmedCanon: "bg-primary/30 text-primary",
  AlternateCanon: "bg-violet-500/20 text-violet-300",
  SoftCanon: "bg-electric/20 text-electric",
  Rejected: "bg-destructive/30 text-destructive-foreground",
  Archived: "bg-zinc-700/40 text-zinc-300",
};

interface CardData {
  cardState: CardState;
  pinned?: boolean;
  parentId?: string;
  rootId?: string;
  pathwayType: string;
  logline?: string;
  summary?: string;
  beats?: string[];
  involves?: string[];
  timelineImpact?: string;
  risks?: string;
  context?: {
    mode: "current-order" | "selected-uploads" | "manual" | "continuation";
    uploadIds: string[];
    uploadOrder: string[]; // upload names in order
    filters?: Record<string, any>;
    endGoal?: string;
    tone?: string;
    pacing?: string;
    relationships?: string;
    generatedAt: string;
    generatedBy?: string;
    parentTitle?: string;
  };
}

function Page() {
  const { items, currentProjectId, addItem, updateItem, deleteItems } = useStore();
  const projectItems = items.filter((i) => i.projectId === currentProjectId && !i.deleted);
  const pathways = projectItems.filter((i) => i.type === "pathway");
  const sources = projectItems.filter((i) => i.type === "source") as SourceUpload[];
  const canon = projectItems.filter((i) => i.type !== "pathway" && i.type !== "source" && i.type !== "suggestion");

  const [search, setSearch] = useState("");

  const get = (pw: BaseItem): CardData => ({
    cardState: "Suggested",
    pathwayType: "Plot Arc Pathway",
    ...((pw.data as any) || {}),
  });

  const filtered = (state: CardState | "Pinned" | "All") => pathways
    .filter((p) => {
      const d = get(p);
      if (state === "Pinned") return d.pinned;
      if (state === "All") return true;
      return d.cardState === state;
    })
    .filter((p) => !search || (p.name + " " + (p.description || "")).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));

  const setState = (pw: BaseItem, cardState: CardState) => {
    const d = get(pw);
    const patch: any = { data: { ...d, cardState } };
    if (cardState === "ConfirmedCanon") patch.canonStatus = "Confirmed Canon";
    else if (cardState === "SoftCanon") patch.canonStatus = "Soft Canon";
    else if (cardState === "AlternateCanon") patch.canonStatus = "Soft Canon";
    else if (cardState === "Rejected") patch.canonStatus = "Deprecated";
    else if (cardState === "Archived") patch.canonStatus = "Archived";
    updateItem(pw.id, patch);
    toast.success(STATE_LABEL[cardState]);
  };
  const togglePin = (pw: BaseItem) => {
    const d = get(pw);
    updateItem(pw.id, { data: { ...d, pinned: !d.pinned, cardState: !d.pinned && d.cardState === "Suggested" ? "SavedForLater" : d.cardState } });
    toast.success(d.pinned ? "Unpinned" : "Pinned");
  };

  // Generator state
  const [genOpen, setGenOpen] = useState(false);
  const [genMode, setGenMode] = useState<"current-order" | "selected-uploads">("current-order");
  const [pathwayType, setPathwayType] = useState("Plot Arc Pathway");
  const [count, setCount] = useState(4);
  const [endGoal, setEndGoal] = useState("");
  const [tone, setTone] = useState("");
  const [pacing, setPacing] = useState("");
  const [relationships, setRelationships] = useState("");
  const [filters, setFilters] = useState("");
  const [selectedUploads, setSelectedUploads] = useState<string[]>([]); // ordered ids
  const [busy, setBusy] = useState(false);
  const [continueFromId, setContinueFromId] = useState<string | null>(null);

  const orderedUploads = useMemo(() => {
    if (genMode === "current-order") {
      return [...sources].sort((a, b) => (a.storyOrder || a.uploadOrder || 0) - (b.storyOrder || b.uploadOrder || 0));
    }
    return selectedUploads.map((id) => sources.find((s) => s.id === id)).filter(Boolean) as SourceUpload[];
  }, [genMode, sources, selectedUploads]);

  const moveUpload = (id: string, dir: -1 | 1) => {
    setSelectedUploads((prev) => {
      const i = prev.indexOf(id); if (i < 0) return prev;
      const j = i + dir; if (j < 0 || j >= prev.length) return prev;
      const next = [...prev]; [next[i], next[j]] = [next[j], next[i]]; return next;
    });
  };

  const openContinue = (pw: BaseItem) => {
    const d = get(pw);
    setContinueFromId(pw.id);
    // Preload settings from prior context
    if (d.context) {
      setEndGoal(d.context.endGoal || "");
      setTone(d.context.tone || "");
      setPacing(d.context.pacing || "");
      setRelationships(d.context.relationships || "");
      setSelectedUploads(d.context.uploadIds || []);
      setGenMode(d.context.mode === "selected-uploads" ? "selected-uploads" : "current-order");
    }
    setPathwayType(d.pathwayType || "Plot Arc Pathway");
    setGenOpen(true);
  };

  const generate = async () => {
    if (orderedUploads.length === 0 && genMode === "selected-uploads") {
      toast.error("Select at least one upload"); return;
    }
    setBusy(true);
    try {
      const continueFrom = continueFromId ? pathways.find((p) => p.id === continueFromId) : null;
      const continueData = continueFrom ? get(continueFrom) : null;
      // Memory: prior confirmed/pinned + chain ancestors
      const memory = pathways
        .filter((p) => {
          const d = get(p);
          return d.pinned || ["ConfirmedCanon", "AlternateCanon", "SoftCanon"].includes(d.cardState);
        })
        .slice(0, 12)
        .map((p) => ({ title: p.name, summary: get(p).summary || p.description || "", state: STATE_LABEL[get(p).cardState] }));

      const { useSettings } = await import("@/lib/settings");
      const familyFriendly = useSettings.getState().familyFriendly;
      const { data, error } = await supabase.functions.invoke("pathway-cards", {
        body: {
          mode: continueFrom ? "continue" : "fresh",
          continueFrom: continueFrom ? { title: continueFrom.name, summary: continueData?.summary || continueFrom.description || "", state: STATE_LABEL[continueData!.cardState] } : null,
          sources: orderedUploads.map((s, i) => ({
            name: s.name, order: i + 1,
            excerpt: ((s as any).rawText || (s.data as any)?.rawText || s.description || "").slice(0, 1500),
          })),
          canon: canon.slice(0, 120).map((c) => ({ name: c.name, type: c.type })),
          priorCards: memory,
          filters: filters ? { notes: filters } : {},
          endGoal, tone, pacing, relationships,
          pathwayType, count,
          familyFriendly,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const cards: any[] = data?.cards || [];
      if (!cards.length) { toast.error("No cards returned"); return; }

      const ctx: CardData["context"] = {
        mode: continueFrom ? "continuation" : (genMode === "current-order" ? "current-order" : "selected-uploads"),
        uploadIds: orderedUploads.map((s) => s.id),
        uploadOrder: orderedUploads.map((s) => s.name),
        filters: filters ? { notes: filters } : {},
        endGoal, tone, pacing, relationships,
        generatedAt: new Date().toISOString(),
        parentTitle: continueFrom?.name,
      };

      const rootId = continueFrom ? (continueData?.rootId || continueFrom.id) : undefined;

      cards.forEach((c) => {
        const created = addItem({
          type: "pathway",
          name: c.title || "Untitled Pathway",
          description: c.logline || c.summary || "",
          canonStatus: "Suggested",
          data: {
            cardState: "Suggested",
            pathwayType,
            logline: c.logline,
            summary: c.summary,
            beats: c.beats || [],
            involves: c.involves || [],
            timelineImpact: c.timelineImpact,
            risks: c.risks,
            parentId: continueFrom?.id,
            rootId: rootId,
            context: ctx,
          } as CardData,
        });
        // assign rootId of first card if none
        if (!continueFrom) updateItem(created.id, { data: { ...(created.data as any), rootId: created.id } });
      });
      toast.success(`${cards.length} pathway card${cards.length > 1 ? "s" : ""} generated`);
      setGenOpen(false);
      setContinueFromId(null);
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally {
      setBusy(false);
    }
  };

  // Continuation history: build chains
  const chains = useMemo(() => {
    const byRoot: Record<string, BaseItem[]> = {};
    pathways.forEach((p) => {
      const d = get(p);
      const r = d.rootId || p.id;
      (byRoot[r] = byRoot[r] || []).push(p);
    });
    return Object.entries(byRoot)
      .map(([rootId, list]) => ({
        rootId,
        list: list.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || "")),
      }))
      .filter((c) => c.list.length > 1) // only show chains with continuations
      .sort((a, b) => (b.list[b.list.length - 1].updatedAt || "").localeCompare(a.list[a.list.length - 1].updatedAt || ""));
  }, [pathways]);

  const counts = {
    Suggested: filtered("Suggested").length,
    Pinned: filtered("Pinned").length,
    ConfirmedCanon: filtered("ConfirmedCanon").length,
    AlternateCanon: filtered("AlternateCanon").length,
    SoftCanon: filtered("SoftCanon").length,
    SavedForLater: filtered("SavedForLater").length,
    Rejected: filtered("Rejected").length,
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2"><GitBranch className="w-5 h-5 text-primary" />Pathways</h1>
          <p className="text-sm text-muted-foreground">Cinematic, card-based AI continuations grounded in your canon. Pin, confirm, and continue your story's evolution.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/pathways/prompt"><Button variant="outline"><Wand2 className="w-4 h-4 mr-1" />By prompt</Button></Link>
          <Button onClick={() => { setContinueFromId(null); setGenOpen(true); }} className="gradient-violet text-white border-0">
            <Sparkles className="w-4 h-4 mr-1" />Generate Pathway Cards
          </Button>
        </div>
      </div>

      <Input placeholder="Search pathway cards…" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-background max-w-sm" />

      <Tabs defaultValue="suggested" className="space-y-4">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="suggested">Suggested <Badge variant="outline" className="ml-2">{counts.Suggested}</Badge></TabsTrigger>
          <TabsTrigger value="pinned"><Pin className="w-3 h-3 mr-1" />Pinned <Badge variant="outline" className="ml-2">{counts.Pinned}</Badge></TabsTrigger>
          <TabsTrigger value="confirmed"><Crown className="w-3 h-3 mr-1" />Confirmed Canon <Badge variant="outline" className="ml-2">{counts.ConfirmedCanon}</Badge></TabsTrigger>
          <TabsTrigger value="alternate"><Layers className="w-3 h-3 mr-1" />Alternate Canon <Badge variant="outline" className="ml-2">{counts.AlternateCanon + counts.SoftCanon}</Badge></TabsTrigger>
          <TabsTrigger value="saved"><Bookmark className="w-3 h-3 mr-1" />Saved for Later <Badge variant="outline" className="ml-2">{counts.SavedForLater}</Badge></TabsTrigger>
          <TabsTrigger value="rejected">Rejected <Badge variant="outline" className="ml-2">{counts.Rejected}</Badge></TabsTrigger>
          <TabsTrigger value="history"><History className="w-3 h-3 mr-1" />Continuation History</TabsTrigger>
        </TabsList>

        <TabsContent value="suggested"><CardGrid cards={filtered("Suggested")} get={get} setState={setState} togglePin={togglePin} onContinue={openContinue} onDelete={(id) => deleteItems([id])} updateItem={updateItem} addItem={addItem} /></TabsContent>
        <TabsContent value="pinned"><CardGrid cards={filtered("Pinned")} get={get} setState={setState} togglePin={togglePin} onContinue={openContinue} onDelete={(id) => deleteItems([id])} updateItem={updateItem} addItem={addItem} variant="pinned" /></TabsContent>
        <TabsContent value="confirmed"><CardGrid cards={filtered("ConfirmedCanon")} get={get} setState={setState} togglePin={togglePin} onContinue={openContinue} onDelete={(id) => deleteItems([id])} updateItem={updateItem} addItem={addItem} variant="canon" /></TabsContent>
        <TabsContent value="alternate"><CardGrid cards={[...filtered("AlternateCanon"), ...filtered("SoftCanon")]} get={get} setState={setState} togglePin={togglePin} onContinue={openContinue} onDelete={(id) => deleteItems([id])} updateItem={updateItem} addItem={addItem} variant="alternate" /></TabsContent>
        <TabsContent value="saved"><CardGrid cards={filtered("SavedForLater")} get={get} setState={setState} togglePin={togglePin} onContinue={openContinue} onDelete={(id) => deleteItems([id])} updateItem={updateItem} addItem={addItem} /></TabsContent>
        <TabsContent value="rejected"><CardGrid cards={filtered("Rejected")} get={get} setState={setState} togglePin={togglePin} onContinue={openContinue} onDelete={(id) => deleteItems([id])} updateItem={updateItem} addItem={addItem} variant="rejected" /></TabsContent>
        <TabsContent value="history">
          {chains.length === 0 ? (
            <div className="panel p-8 text-center text-muted-foreground">No continuation chains yet. Use <span className="text-foreground">Continue Pathway</span> on a confirmed or pinned card to begin one.</div>
          ) : (
            <div className="space-y-4">
              {chains.map((c) => (
                <Card key={c.rootId} className="panel">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <History className="w-4 h-4 text-primary" />
                      Chain: {c.list[0].name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {c.list.map((p, i) => {
                        const d = get(p);
                        return (
                          <div key={p.id} className="flex items-center gap-2 text-sm">
                            <div className="text-muted-foreground w-5">{i + 1}.</div>
                            <Badge className={`text-[10px] ${STATE_COLOR[d.cardState]}`}>{STATE_LABEL[d.cardState]}</Badge>
                            {d.pinned && <Pin className="w-3 h-3 text-amber-400" />}
                            <span className="font-medium">{p.name}</span>
                            <span className="text-muted-foreground line-clamp-1 flex-1">— {d.logline || d.summary || p.description}</span>
                            {i < c.list.length - 1 && <ChevronRight className="w-4 h-4 text-primary" />}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Generator Dialog */}
      <Dialog open={genOpen} onOpenChange={(o) => { setGenOpen(o); if (!o) setContinueFromId(null); }}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {continueFromId ? <><PlayCircle className="w-5 h-5 text-primary" />Continue Pathway</> : <><Sparkles className="w-5 h-5 text-primary" />Generate Pathway Cards</>}
            </DialogTitle>
          </DialogHeader>

          {continueFromId && (
            <div className="panel p-3 bg-primary/5 border-primary/30 text-sm">
              <div className="text-xs text-muted-foreground">Continuing from</div>
              <div className="font-medium">{pathways.find((p) => p.id === continueFromId)?.name}</div>
            </div>
          )}

          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Pathway type</label>
                <Select value={pathwayType} onValueChange={setPathwayType}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{PATHWAY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Number of cards</label>
                <Input type="number" min={1} max={8} value={count} onChange={(e) => setCount(Math.min(8, Math.max(1, +e.target.value || 1)))} className="bg-background" />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Story material source</label>
              <div className="flex gap-2 flex-wrap">
                <Button variant={genMode === "current-order" ? "default" : "outline"} size="sm" onClick={() => setGenMode("current-order")}>
                  Use Current Upload Order
                </Button>
                <Button variant={genMode === "selected-uploads" ? "default" : "outline"} size="sm" onClick={() => setGenMode("selected-uploads")}>
                  Start from Selected Uploads
                </Button>
              </div>
            </div>

            {genMode === "selected-uploads" && (
              <div className="panel p-3 space-y-2">
                <div className="text-xs text-muted-foreground">Select uploads, then drag-order with the arrows. AI will use this upload order as story progression context.</div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {sources.map((s) => {
                    const checked = selectedUploads.includes(s.id);
                    return (
                      <div key={s.id} className="flex items-center gap-2 p-1 hover:bg-accent/50 rounded">
                        <Checkbox checked={checked} onCheckedChange={(v) => {
                          if (v) setSelectedUploads((p) => [...p, s.id]);
                          else setSelectedUploads((p) => p.filter((id) => id !== s.id));
                        }} />
                        <span className="text-sm flex-1 truncate">{s.name}</span>
                        <Badge variant="outline" className="text-[10px]">Ch {s.chapter ?? "—"}</Badge>
                      </div>
                    );
                  })}
                  {sources.length === 0 && <div className="text-xs text-muted-foreground">No uploads in this project yet.</div>}
                </div>
                {selectedUploads.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-border/50">
                    <div className="text-xs uppercase text-muted-foreground">Story order</div>
                    {selectedUploads.map((id, i) => {
                      const s = sources.find((x) => x.id === id); if (!s) return null;
                      return (
                        <div key={id} className="flex items-center gap-2 panel p-2">
                          <span className="text-xs text-muted-foreground w-12">Upload #{i + 1}</span>
                          <span className="text-sm flex-1 truncate">{s.name}</span>
                          <Button size="icon" variant="ghost" onClick={() => moveUpload(id, -1)}><ArrowUp className="w-3 h-3" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => moveUpload(id, 1)}><ArrowDown className="w-3 h-3" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setSelectedUploads((p) => p.filter((x) => x !== id))}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <Textarea rows={2} placeholder="Desired ending direction / end goal" value={endGoal} onChange={(e) => setEndGoal(e.target.value)} />
              <Textarea rows={2} placeholder="Tone (e.g. melancholic, hopeful, gritty)" value={tone} onChange={(e) => setTone(e.target.value)} />
              <Textarea rows={2} placeholder="Pacing (slow burn, escalating, cliffhanger)" value={pacing} onChange={(e) => setPacing(e.target.value)} />
              <Textarea rows={2} placeholder="Relationship priorities" value={relationships} onChange={(e) => setRelationships(e.target.value)} />
            </div>
            <Textarea rows={2} placeholder="Filters / canon restrictions (free text)" value={filters} onChange={(e) => setFilters(e.target.value)} />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>Cancel</Button>
            <Button onClick={generate} disabled={busy} className="gradient-violet text-white border-0">
              {busy ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
              {busy ? "Generating…" : (continueFromId ? "Generate continuations" : "Generate cards")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CardGrid({
  cards, get, setState, togglePin, onContinue, onDelete, updateItem, addItem, variant,
}: {
  cards: BaseItem[];
  get: (pw: BaseItem) => CardData;
  setState: (pw: BaseItem, s: CardState) => void;
  togglePin: (pw: BaseItem) => void;
  onContinue: (pw: BaseItem) => void;
  onDelete: (id: string) => void;
  updateItem: (id: string, patch: Partial<BaseItem>) => void;
  addItem: (i: any) => any;
  variant?: "pinned" | "canon" | "alternate" | "rejected";
}) {
  if (cards.length === 0) {
    return <div className="panel p-8 text-center text-muted-foreground">Nothing here yet.</div>;
  }
  return (
    <div className="grid md:grid-cols-2 gap-3">
      {cards.map((pw) => (
        <PathwayCard key={pw.id} pw={pw} d={get(pw)} setState={setState} togglePin={togglePin} onContinue={onContinue} onDelete={onDelete} updateItem={updateItem} addItem={addItem} variant={variant} />
      ))}
    </div>
  );
}

function PathwayCard({
  pw, d, setState, togglePin, onContinue, onDelete, updateItem, addItem, variant,
}: {
  pw: BaseItem; d: CardData;
  setState: (pw: BaseItem, s: CardState) => void;
  togglePin: (pw: BaseItem) => void;
  onContinue: (pw: BaseItem) => void;
  onDelete: (id: string) => void;
  updateItem: (id: string, patch: Partial<BaseItem>) => void;
  addItem: (i: any) => any;
  variant?: "pinned" | "canon" | "alternate" | "rejected";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: pw.name, summary: d.summary || pw.description || "", beats: (d.beats || []).join("\n") });

  const ring =
    variant === "canon" ? "border-primary/60 shadow-[0_0_24px_-12px_hsl(var(--primary))]" :
    variant === "pinned" ? "border-amber-400/50" :
    variant === "alternate" ? "border-violet-400/40" :
    variant === "rejected" ? "opacity-70" : "";

  const save = () => {
    const beats = draft.beats.split("\n").map((b) => b.trim()).filter(Boolean);
    updateItem(pw.id, { name: draft.name, description: d.logline || draft.summary, data: { ...d, summary: draft.summary, beats, cardState: "Edited" } });
    toast.success("Saved");
    setEditing(false);
  };

  const linkToTimeline = () => {
    addItem({
      type: "timeline",
      name: pw.name,
      description: d.summary || pw.description,
      canonStatus: "Soft Canon",
      data: { approxLabel: "From pathway", needsReview: true, fromPathwayId: pw.id },
    });
    toast.success("Timeline event created");
  };

  return (
    <Card className={`panel relative overflow-hidden ${ring}`}>
      {variant === "canon" && <div className="absolute top-0 right-0 px-2 py-0.5 text-[10px] uppercase bg-primary/30 text-primary">Canon</div>}
      {variant === "pinned" && <Pin className="absolute top-2 right-2 w-3 h-3 text-amber-400" />}
      <CardHeader className="pb-2">
        <div className="flex items-start gap-2">
          <CardTitle className="text-base flex-1">{pw.name}</CardTitle>
          <Badge className={`text-[10px] ${STATE_COLOR[d.cardState]}`}>{STATE_LABEL[d.cardState]}</Badge>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="outline" className="text-[10px]">{d.pathwayType}</Badge>
          {d.context?.parentTitle && <Badge variant="outline" className="text-[10px]">↳ from {d.context.parentTitle}</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {d.logline && <p className="italic text-muted-foreground">"{d.logline}"</p>}
        {d.summary && <p className="line-clamp-4">{d.summary}</p>}
        {d.beats && d.beats.length > 0 && (
          <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
            {d.beats.slice(0, 5).map((b, i) => <li key={i} className="line-clamp-1">{b}</li>)}
          </ul>
        )}
        {d.involves && d.involves.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {d.involves.slice(0, 6).map((n, i) => <Badge key={i} variant="secondary" className="text-[10px]">{n}</Badge>)}
          </div>
        )}
        {(d.timelineImpact || d.risks) && (
          <div className="text-[11px] text-muted-foreground space-y-1 pt-1 border-t border-border/40">
            {d.timelineImpact && <div><span className="text-foreground">Impact:</span> {d.timelineImpact}</div>}
            {d.risks && <div><span className="text-foreground">Risks:</span> {d.risks}</div>}
          </div>
        )}
        {d.context && (
          <details className="text-[10px] text-muted-foreground">
            <summary className="cursor-pointer hover:text-foreground">Generation context</summary>
            <div className="pt-1 space-y-0.5">
              <div>Mode: {d.context.mode}</div>
              {d.context.uploadOrder?.length > 0 && <div>Order: {d.context.uploadOrder.map((n, i) => `#${i + 1} ${n}`).join(" → ")}</div>}
              {d.context.endGoal && <div>End goal: {d.context.endGoal}</div>}
              {d.context.tone && <div>Tone: {d.context.tone}</div>}
              {d.context.pacing && <div>Pacing: {d.context.pacing}</div>}
              <div>Generated: {new Date(d.context.generatedAt).toLocaleString()}</div>
            </div>
          </details>
        )}

        <div className="flex flex-wrap gap-1 pt-2">
          <Button size="sm" variant="outline" onClick={() => togglePin(pw)}>
            {d.pinned ? <><PinOff className="w-3 h-3 mr-1" />Unpin</> : <><Pin className="w-3 h-3 mr-1" />Pin</>}
          </Button>
          {d.cardState !== "ConfirmedCanon" && (
            <Button size="sm" variant="outline" className="border-primary/50 text-primary" onClick={() => setState(pw, "ConfirmedCanon")}>
              <Check className="w-3 h-3 mr-1" />Confirm Canon
            </Button>
          )}
          {d.cardState === "ConfirmedCanon" && (
            <>
              <Button size="sm" variant="outline" onClick={() => setState(pw, "Suggested")}>Remove from Canon</Button>
              <Button size="sm" variant="outline" onClick={linkToTimeline}>Link to Timeline</Button>
            </>
          )}
          {d.cardState !== "AlternateCanon" && <Button size="sm" variant="ghost" onClick={() => setState(pw, "AlternateCanon")}><Layers className="w-3 h-3 mr-1" />Alternate</Button>}
          {d.cardState !== "SoftCanon" && <Button size="sm" variant="ghost" onClick={() => setState(pw, "SoftCanon")}>Soft Canon</Button>}
          {d.cardState !== "SavedForLater" && <Button size="sm" variant="ghost" onClick={() => setState(pw, "SavedForLater")}><Bookmark className="w-3 h-3 mr-1" />Save</Button>}
          {d.cardState !== "Rejected" && <Button size="sm" variant="ghost" onClick={() => setState(pw, "Rejected")}><XIcon className="w-3 h-3 mr-1" />Reject</Button>}
          {d.cardState !== "Archived" && <Button size="sm" variant="ghost" onClick={() => setState(pw, "Archived")}><Archive className="w-3 h-3 mr-1" />Archive</Button>}
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}><Pencil className="w-3 h-3 mr-1" />Edit</Button>
          <Button size="sm" className="gradient-violet text-white border-0 ml-auto" onClick={() => onContinue(pw)}>
            <PlayCircle className="w-3 h-3 mr-1" />Continue Pathway
          </Button>
        </div>
      </CardContent>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit pathway card</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="bg-background" />
            <Textarea rows={4} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} placeholder="Summary" />
            <Textarea rows={6} value={draft.beats} onChange={(e) => setDraft({ ...draft, beats: e.target.value })} placeholder="One beat per line" />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => onDelete(pw.id)}><Trash2 className="w-3 h-3 mr-1" />Delete</Button>
            <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button onClick={save} className="gradient-violet text-white border-0">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
