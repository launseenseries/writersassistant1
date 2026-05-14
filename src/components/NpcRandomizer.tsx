import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Dice5, Loader2 } from "lucide-react";
import { useStore, useCurrentProject } from "@/lib/store";
import { useNpcTemplates } from "@/lib/npc-templates";
import { useSettings } from "@/lib/settings";
import { EditableSelect } from "@/components/EditableSelect";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

export function NpcRandomizer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const project = useCurrentProject();
  const projectId = useStore((s) => s.currentProjectId);
  const addItem = useStore((s) => s.addItem);
  const { ensureDefaults, forProject, addCategory, removeCategory, addOption, removeOption } = useNpcTemplates();
  const familyFriendly = useSettings((s) => s.familyFriendly);

  useEffect(() => { if (open) ensureDefaults(projectId); }, [open, projectId, ensureDefaults]);
  const cats = forProject(projectId);

  const [seed, setSeed] = useState("");
  const [newCatName, setNewCatName] = useState("");
  const [loading, setLoading] = useState(false);
  const [npc, setNpc] = useState<any | null>(null);
  const [overrides, setOverrides] = useState<Record<string, any>>({});

  const generate = async () => {
    setLoading(true);
    setNpc(null);
    try {
      const { data, error } = await supabase.functions.invoke("npc-randomizer", {
        body: {
          categories: cats.map((c) => ({ key: c.key, label: c.label, options: c.options, allowMultiple: c.allowMultiple })),
          seed,
          project: { genre: project?.genre, toneNotes: project?.toneNotes, settingSummary: project?.settingSummary },
          familyFriendly,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setNpc((data as any).npc);
      setOverrides({});
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate NPC");
    } finally {
      setLoading(false);
    }
  };

  const merged = npc ? { ...npc, ...overrides } : null;

  const save = () => {
    if (!merged) return;
    const data: Record<string, any> = {};
    cats.forEach((c) => { data[c.key] = merged[c.key]; });
    data.appearance = merged.appearance;
    data.personality = merged.personality;
    data.hook = merged.hook;
    addItem({
      type: "character",
      name: merged.name || "Unnamed NPC",
      description: merged.shortBio,
      canonStatus: "Suggested",
      tags: ["npc", "randomized"],
      data,
    });
    logAudit("npc.randomize.save", { entityName: merged.name });
    toast.success(`NPC "${merged.name}" saved`);
    onOpenChange(false);
    setNpc(null);
    setSeed("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Dice5 className="w-4 h-4 text-primary" /> AI NPC Randomizer</DialogTitle>
          <DialogDescription>Generate a fresh NPC from your editable templates. Add or remove options inline — your changes persist.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Seed / direction (optional)</label>
            <Textarea value={seed} onChange={(e) => setSeed(e.target.value)} rows={2} placeholder="e.g. retired shadow-witch running a teahouse in the lower city" className="bg-background" />
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {cats.map((c) => (
              <div key={c.id}>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">{c.label}</label>
                  {!c.builtin && (
                    <button className="text-[10px] text-muted-foreground hover:text-destructive" onClick={() => removeCategory(c.id)}>remove</button>
                  )}
                </div>
                <EditableSelect
                  label={c.label}
                  options={c.options}
                  multiple={c.allowMultiple}
                  value={merged?.[c.key]}
                  onChange={(v) => setOverrides({ ...overrides, [c.key]: v })}
                  onAddOption={(v) => addOption(c.id, v)}
                  onRemoveOption={(v) => removeOption(c.id, v)}
                  placeholder={loading ? "…" : "(empty)"}
                />
              </div>
            ))}
          </div>

          <div className="panel p-2 flex gap-2 items-center">
            <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="+ Add new category (e.g. Profession)" className="bg-background h-8 text-xs" />
            <Button size="sm" variant="outline" onClick={() => { if (newCatName.trim()) { addCategory(projectId, newCatName.trim()); setNewCatName(""); } }}>Add</Button>
          </div>

          {merged && (
            <div className="panel p-3 space-y-2">
              <div className="text-lg font-semibold">{merged.name}</div>
              <p className="text-sm text-muted-foreground">{merged.shortBio}</p>
              <div className="grid sm:grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Appearance:</span> {merged.appearance}</div>
                <div><span className="text-muted-foreground">Personality:</span> {merged.personality}</div>
                <div className="sm:col-span-2"><span className="text-muted-foreground">Hook:</span> {merged.hook}</div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={generate} disabled={loading} className="gradient-violet text-white border-0">
            {loading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Sparkles className="w-4 h-4 mr-1" />}
            {merged ? "Re-roll" : "Generate"}
          </Button>
          {merged && <Button onClick={save} className="gradient-violet text-white border-0">Save as Character</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
