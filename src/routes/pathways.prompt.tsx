import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, BaseItem, EntityType } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Wand2, ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pathways/prompt")({ component: PromptPage });

const PATHWAY_TYPES = [
  "Character Pathway", "Location Pathway", "Faction Pathway", "Family Pathway",
  "Heritage Pathway", "Faith Pathway", "Magic / Power Pathway", "Object / Artifact Pathway",
  "Relationship Pathway", "Plot Arc Pathway", "Character Arc Pathway", "Timeline Pathway",
  "Chapter Pathway", "Scene Pathway", "Continuity Pathway", "Custom Pathway",
];

interface DraftNode { name: string; itemType: string; summary?: string; isNew?: boolean }
interface DraftConn { from: string; to: string; label: string }
interface Draft {
  name: string; description?: string; pathwayType: string;
  nodes: DraftNode[]; connections?: DraftConn[];
}

function PromptPage() {
  const { items, currentProjectId, addItem, updateItem } = useStore();
  const nav = useNavigate();
  const canon = useMemo(
    () => items.filter((i) => i.projectId === currentProjectId && !i.deleted && i.type !== "pathway" && i.type !== "source"),
    [items, currentProjectId]
  );

  const [prompt, setPrompt] = useState("");
  const [pathwayType, setPathwayType] = useState("Character Pathway");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);

  const generate = async () => {
    if (!prompt.trim()) { toast.error("Describe the pathway you want"); return; }
    setBusy(true);
    try {
      const canonPayload = canon.map((c) => ({ name: c.name, type: c.type }));
      const { useSettings } = await import("@/lib/settings");
      const { data, error } = await supabase.functions.invoke("pathway-from-prompt", {
        body: { prompt, pathwayType, canon: canonPayload, familyFriendly: useSettings.getState().familyFriendly },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDraft(data as Draft);
      toast.success("Pathway draft generated");
    } catch (e: any) {
      toast.error(e.message || "Generation failed");
    } finally { setBusy(false); }
  };

  const updateNode = (idx: number, patch: Partial<DraftNode>) => {
    if (!draft) return;
    setDraft({ ...draft, nodes: draft.nodes.map((n, i) => i === idx ? { ...n, ...patch } : n) });
  };
  const removeNode = (idx: number) => {
    if (!draft) return;
    setDraft({ ...draft, nodes: draft.nodes.filter((_, i) => i !== idx) });
  };

  const save = () => {
    if (!draft || !draft.nodes.length) { toast.error("Need at least one node"); return; }
    const uid = () => Math.random().toString(36).slice(2, 10);
    const allowed: EntityType[] = ["character","location","faction","family","heritage","faith","magic","timeline","worldbuilding"];
    const nameToId: Record<string, string> = {};

    const finalNodes = draft.nodes.map((n, i) => {
      const itemType = (allowed.includes(n.itemType as EntityType) ? n.itemType : "worldbuilding") as EntityType;
      // Match existing canon by exact name + type, else by name only
      let target: BaseItem | undefined = canon.find((c) => c.name.toLowerCase() === n.name.toLowerCase() && c.type === itemType);
      if (!target) target = canon.find((c) => c.name.toLowerCase() === n.name.toLowerCase());
      if (!target) {
        target = addItem({ type: itemType, name: n.name, description: n.summary, canonStatus: "Draft" });
      }
      nameToId[n.name.toLowerCase()] = target.id;
      return {
        id: uid(), linkedItemId: target.id, linkedItemType: target.type,
        displayName: target.name, summary: n.summary, orderIndex: i,
      };
    });

    const finalConns = (draft.connections || [])
      .map((c) => ({
        id: uid(),
        fromNodeId: finalNodes[draft.nodes.findIndex((n) => n.name.toLowerCase() === c.from.toLowerCase())]?.id,
        toNodeId: finalNodes[draft.nodes.findIndex((n) => n.name.toLowerCase() === c.to.toLowerCase())]?.id,
        label: c.label,
      }))
      .filter((c) => c.fromNodeId && c.toNodeId);

    const created = addItem({
      type: "pathway", name: draft.name || "Prompted Pathway",
      description: draft.description || prompt, canonStatus: "Draft",
      data: {
        pathwayType: draft.pathwayType || pathwayType,
        nodes: finalNodes, connections: finalConns, orderMode: "story",
        promptSource: prompt,
      },
    });
    void updateItem;
    toast.success("Pathway saved");
    nav({ to: "/pathways" });
    void created;
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-2">
        <Link to="/pathways"><Button variant="ghost" size="sm"><ArrowLeft className="w-4 h-4 mr-1" />Pathways</Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-gradient flex items-center gap-2"><Wand2 className="w-5 h-5" />Pathways by Prompt</h1>
          <p className="text-sm text-muted-foreground">Describe a journey, arc, or relationship. AI drafts a pathway you can edit and save.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Prompt</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-[1fr_240px] gap-3">
            <Textarea
              rows={4} placeholder="e.g. Trace Dorothy's emotional arc from leaving Kansas to confronting the Wizard."
              value={prompt} onChange={(e) => setPrompt(e.target.value)}
            />
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Pathway type</div>
              <Select value={pathwayType} onValueChange={setPathwayType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PATHWAY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={generate} disabled={busy} className="w-full gradient-violet text-white border-0">
                <Sparkles className="w-3 h-3 mr-1" />{busy ? "Generating…" : "Generate"}
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">Uses {canon.length} canon items as context.</div>
        </CardContent>
      </Card>

      {draft && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base">Draft pathway</CardTitle>
              <Badge variant="outline">{draft.nodes.length} nodes</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Pathway name" />
              <Input value={draft.pathwayType} onChange={(e) => setDraft({ ...draft, pathwayType: e.target.value })} placeholder="Type" />
            </div>
            <Textarea value={draft.description || ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Description" rows={2} />

            <div className="space-y-2">
              {draft.nodes.map((n, i) => {
                const exists = canon.some((c) => c.name.toLowerCase() === n.name.toLowerCase());
                return (
                  <div key={i} className="panel p-3 flex flex-col sm:flex-row gap-2 sm:items-center">
                    <div className="text-xs text-muted-foreground w-6">{i + 1}.</div>
                    <Input value={n.name} onChange={(e) => updateNode(i, { name: e.target.value })} className="sm:w-56" />
                    <Input value={n.itemType} onChange={(e) => updateNode(i, { itemType: e.target.value })} className="sm:w-36" />
                    <Input value={n.summary || ""} onChange={(e) => updateNode(i, { summary: e.target.value })} placeholder="Summary" className="flex-1" />
                    <Badge variant={exists ? "secondary" : "default"} className="text-[10px]">{exists ? "Existing" : "New"}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => removeNode(i)}>Remove</Button>
                  </div>
                );
              })}
              <Button variant="outline" size="sm" onClick={() => setDraft({ ...draft, nodes: [...draft.nodes, { name: "New node", itemType: "worldbuilding", isNew: true }] })}>
                <Plus className="w-3 h-3 mr-1" />Add node
              </Button>
            </div>

            {draft.connections && draft.connections.length > 0 && (
              <div className="space-y-1">
                <div className="text-xs uppercase text-muted-foreground">Connections</div>
                {draft.connections.map((c, i) => (
                  <div key={i} className="text-sm text-muted-foreground">{c.from} → {c.to} <span className="text-xs">({c.label})</span></div>
                ))}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDraft(null)}>Discard</Button>
              <Button onClick={save} className="gradient-violet text-white border-0">Save pathway</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
