import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronUp, ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/uploads")({ component: Page });

function Page() {
  const { items, currentProjectId, updateItem } = useStore();
  const sources = items.filter((i) => i.projectId === currentProjectId && i.type === "source" && !i.deleted)
    .sort((a, b) => ((a.data as any)?.storyOrder || 0) - ((b.data as any)?.storyOrder || 0));

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [advice, setAdvice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [promptOpen, setPromptOpen] = useState<null | "all" | "selected">(null);
  const [userPrompt, setUserPrompt] = useState("");

  const toggle = (id: string) => { const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n); };

  const move = (id: string, dir: number) => {
    const idx = sources.findIndex((s) => s.id === id);
    const swap = sources[idx + dir]; if (!swap) return;
    const a = (sources[idx].data as any)?.storyOrder || idx + 1;
    const b = (swap.data as any)?.storyOrder || idx + 1 + dir;
    updateItem(id, { data: { ...sources[idx].data, storyOrder: b } });
    updateItem(swap.id, { data: { ...swap.data, storyOrder: a } });
    toast.message("Order updated.");
  };

  const getAdvice = async (scope: "all" | "selected", prompt: string) => {
    const list = scope === "all" ? sources : sources.filter((s) => selected.has(s.id));
    if (list.length === 0) { toast.error("Nothing to analyze"); return; }
    setBusy(true);
    try {
      const payload = list.map((s: any) => ({ name: s.name, text: (s.data?.rawText || s.description || "").slice(0, 4000) }));
      const { useSettings } = await import("@/lib/settings");
      const { data, error } = await supabase.functions.invoke("writing-advice", { body: { sources: payload, mode: "advice", familyFriendly: useSettings.getState().familyFriendly, userPrompt: prompt || undefined } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAdvice(data.advice || "(no advice)");
      logAudit("ai.advice", { entityType: "source", details: { count: list.length, scope, hasPrompt: !!prompt } });
      setPromptOpen(null); setUserPrompt("");
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Upload History / Source Order</h1>
          <p className="text-sm text-muted-foreground">Original upload order is preserved. Reorder to set corrected story order.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" disabled={busy} onClick={() => getAdvice("selected")}><Sparkles className="w-4 h-4 mr-1" />AI Advice (selected)</Button>
          <Button className="gradient-violet text-white border-0" disabled={busy} onClick={() => getAdvice("all")}><Sparkles className="w-4 h-4 mr-1" />AI Advice (all)</Button>
        </div>
      </div>

      <div className="panel p-3 text-sm text-yellow-300/80">
        ⚠ Changing upload story order updates pathway source trails and story-order sorting. No records are deleted.
      </div>

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-2 w-8"></th>
              <th className="p-2">#</th>
              <th className="p-2">Source</th>
              <th className="p-2">Type</th>
              <th className="p-2">Chapter / Scene</th>
              <th className="p-2">Story Date</th>
              <th className="p-2">Status</th>
              <th className="p-2 w-20">Order</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s, i) => {
              const d = s.data as any;
              return (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-2"><Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} /></td>
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2 font-medium">{s.name}</td>
                  <td className="p-2">{d?.sourceType}</td>
                  <td className="p-2">{d?.chapter ? `Ch ${d.chapter}` : "—"}{d?.scene ? ` · Sc ${d.scene}` : ""}</td>
                  <td className="p-2">{d?.storyDate || "—"}</td>
                  <td className="p-2"><Badge variant="outline" className="text-xs">{s.canonStatus}</Badge></td>
                  <td className="p-2 flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => move(s.id, -1)}><ChevronUp className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => move(s.id, 1)}><ChevronDown className="w-3 h-3" /></Button>
                  </td>
                </tr>
              );
            })}
            {sources.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No sources uploaded yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!advice} onOpenChange={(o) => !o && setAdvice(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>AI Writing Advice</DialogTitle></DialogHeader>
          <div className="text-sm whitespace-pre-wrap">{advice}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
