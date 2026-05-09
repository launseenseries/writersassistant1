import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, Pathway, BaseItem } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, GitBranch, RefreshCw, ArrowRight, Plus as PlusIcon, Lock, Unlock, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pathways")({ component: Page });

const PATHWAY_TYPES = [
  "Character Pathway", "Location Pathway", "Faction Pathway", "Family Pathway",
  "Heritage Pathway", "Faith Pathway", "Magic / Power Pathway", "Object / Artifact Pathway",
  "Relationship Pathway", "Plot Arc Pathway", "Character Arc Pathway", "Timeline Pathway",
  "Chapter Pathway", "Scene Pathway", "Continuity Pathway", "Custom Pathway",
];

function Page() {
  const { items, currentProjectId, addItem, updateItem, deleteItems } = useStore();
  const pathways = items.filter((i) => i.projectId === currentProjectId && i.type === "pathway" && !i.deleted) as Pathway[];
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ name: "", pathwayType: "Character Pathway", description: "" });
  const [openPath, setOpenPath] = useState<Pathway | null>(null);
  const [progressPrompt, setProgressPrompt] = useState<Pathway | null>(null);
  const [refreshResult, setRefreshResult] = useState<{ pathway: Pathway; suggestions: string[] } | null>(null);

  const create = () => {
    if (!draft.name.trim()) { toast.error("Name required"); return; }
    addItem({
      type: "pathway", name: draft.name, description: draft.description, canonStatus: "Draft",
      data: { pathwayType: draft.pathwayType, nodes: [], connections: [], orderMode: "story" },
    });
    toast.success("Pathway created");
    setCreating(false);
    setDraft({ name: "", pathwayType: "Character Pathway", description: "" });
  };

  const addNode = (pw: Pathway, item: BaseItem) => {
    const nodes = (pw.data as any)?.nodes || pw.nodes || [];
    const newNode = {
      id: Math.random().toString(36).slice(2, 10),
      linkedItemId: item.id, linkedItemType: item.type,
      displayName: item.name, orderIndex: nodes.length,
    };
    updateItem(pw.id, { data: { ...pw.data, nodes: [...nodes, newNode], lastNodeId: newNode.id } });
    toast.success("Node added");
  };

  const refresh = (pw: Pathway) => {
    const projectItems = items.filter((i) => i.projectId === currentProjectId && !i.deleted && i.type !== "pathway");
    const nodeIds = new Set(((pw.data as any)?.nodes || []).map((n: any) => n.linkedItemId));
    const suggestions = projectItems
      .filter((i) => !nodeIds.has(i.id))
      .filter((i) => {
        const text = (i.name + " " + (i.description || "")).toLowerCase();
        return ((pw.data as any)?.nodes || []).some((n: any) =>
          text.includes(n.displayName.toLowerCase().split(" ")[0])
        );
      })
      .slice(0, 5)
      .map((i) => `${i.type}: ${i.name}`);
    setRefreshResult({ pathway: pw, suggestions });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Pathways</h1>
          <p className="text-sm text-muted-foreground">Connect story records into trails. Refresh to find new links across uploads.</p>
        </div>
        <div className="flex gap-2">
          <Link to="/pathways/prompt"><Button variant="outline"><Sparkles className="w-4 h-4 mr-1" />By prompt</Button></Link>
          <Button onClick={() => setCreating(true)} className="gradient-violet text-white border-0"><Plus className="w-4 h-4 mr-1" />New Pathway</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {pathways.map((pw) => {
          const d = pw.data as any;
          const nodes = d?.nodes || [];
          return (
            <div key={pw.id} className="panel p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-primary" />
                    <button className="font-semibold hover:text-primary" onClick={() => setOpenPath(pw)}>{pw.name}</button>
                  </div>
                  <Badge variant="outline" className="text-xs mt-1">{d?.pathwayType}</Badge>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" title={d?.lockedOrder ? "Unlock order" : "Lock custom order"} onClick={() => updateItem(pw.id, { data: { ...d, lockedOrder: !d?.lockedOrder } })}>
                    {d?.lockedOrder ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </Button>
                  <Button size="icon" variant="ghost" title="Refresh pathway" onClick={() => refresh(pw)}><RefreshCw className="w-3 h-3" /></Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">{pw.description}</p>
              <div className="flex flex-wrap gap-1">
                {nodes.slice(0, 6).map((n: any, i: number) => (
                  <div key={n.id} className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">{n.displayName}</Badge>
                    {i < Math.min(nodes.length - 1, 5) && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                  </div>
                ))}
                {nodes.length === 0 && <span className="text-xs text-muted-foreground">No nodes yet</span>}
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setOpenPath(pw)}>Open</Button>
                <Button size="sm" variant="outline" onClick={() => setProgressPrompt(pw)}>Progress further</Button>
              </div>
            </div>
          );
        })}
        {pathways.length === 0 && <div className="panel p-8 text-center text-muted-foreground col-span-2">No pathways yet.</div>}
      </div>

      {/* Create */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Pathway</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Pathway name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="bg-background" />
            <Select value={draft.pathwayType} onValueChange={(v) => setDraft({ ...draft, pathwayType: v })}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>{PATHWAY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Description" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="bg-background" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
            <Button onClick={create} className="gradient-violet text-white border-0">Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Open pathway map */}
      <Dialog open={!!openPath} onOpenChange={(o) => !o && setOpenPath(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{openPath?.name}</DialogTitle></DialogHeader>
          {openPath && <PathwayMap pathway={openPath} onAddNode={(item) => addNode(openPath, item)} onRefresh={() => refresh(openPath)} />}
        </DialogContent>
      </Dialog>

      {/* Progress further */}
      <Dialog open={!!progressPrompt} onOpenChange={(o) => !o && setProgressPrompt(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Do you want to progress this pathway further?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Continue from the last selected node, view branch options, or skip.</p>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="ghost" onClick={() => setProgressPrompt(null)}>Not now</Button>
            <Button variant="outline" onClick={() => { toast.message("Branch options panel — pick a connected character, location, or faction to continue."); setProgressPrompt(null); }}>Show branch options</Button>
            <Button className="gradient-violet text-white border-0" onClick={() => { toast.success("Continued from last node. Suggested next nodes shown in pathway map."); progressPrompt && refresh(progressPrompt); setProgressPrompt(null); }}>Yes, continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refresh result */}
      <Dialog open={!!refreshResult} onOpenChange={(o) => !o && setRefreshResult(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refresh Results — {refreshResult?.pathway.name}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            {refreshResult?.pathway.data && (refreshResult.pathway.data as any).lockedOrder && (
              <p className="text-xs text-yellow-300">This pathway uses a locked custom order. Refresh can suggest new links but won't reorder existing nodes unless you approve.</p>
            )}
            {refreshResult?.suggestions.length === 0 && <p className="text-sm text-muted-foreground">No new related items found.</p>}
            {refreshResult?.suggestions.map((s, i) => (
              <div key={i} className="flex items-center gap-2 panel p-2">
                <span className="flex-1 text-sm">Suggested new node — {s}</span>
                <Badge className="bg-electric/20 text-electric text-xs">~70%</Badge>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefreshResult(null)}>Reject all</Button>
            <Button onClick={() => { toast.success("Reviewed — apply suggestions one by one inside the pathway map."); setRefreshResult(null); }}>Review one by one</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PathwayMap({ pathway, onAddNode, onRefresh }: { pathway: Pathway; onAddNode: (i: BaseItem) => void; onRefresh: () => void }) {
  const { items, currentProjectId } = useStore();
  const nodes = (pathway.data as any)?.nodes || [];
  const [pickerOpen, setPickerOpen] = useState(false);
  const candidates = items.filter((i) => i.projectId === currentProjectId && !i.deleted && i.type !== "pathway");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 panel p-3 bg-muted/20">
        {nodes.length === 0 && <span className="text-sm text-muted-foreground">Empty pathway. Add a node to begin.</span>}
        {nodes.map((n: any, i: number) => (
          <div key={n.id} className="flex items-center gap-2">
            <div className="panel p-2 px-3 bg-card glow-violet/30">
              <div className="text-[10px] uppercase text-muted-foreground">{n.linkedItemType}</div>
              <div className="text-sm font-medium">{n.displayName}</div>
            </div>
            {i < nodes.length - 1 && <ArrowRight className="w-4 h-4 text-primary" />}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setPickerOpen(true)} className="gradient-violet text-white border-0"><PlusIcon className="w-3 h-3 mr-1" />Add node</Button>
        <Button size="sm" variant="outline" onClick={onRefresh}><RefreshCw className="w-3 h-3 mr-1" />Refresh pathway</Button>
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pick item to add</DialogTitle></DialogHeader>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {candidates.map((c) => (
              <button key={c.id} onClick={() => { onAddNode(c); setPickerOpen(false); }}
                className="w-full text-left p-2 rounded hover:bg-accent flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                <span className="text-sm">{c.name}</span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
