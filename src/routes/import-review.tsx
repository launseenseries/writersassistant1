import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, ImportSuggestion, EntityType } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, X, Edit, Combine } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/import-review")({ component: Page });

const CATEGORIES: EntityType[] = ["character", "location", "faction", "family", "heritage", "faith", "magic", "timeline", "worldbuilding"];

function Page() {
  const { suggestions, currentProjectId, approveSuggestion, rejectSuggestion } = useStore();
  const [filter, setFilter] = useState("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<ImportSuggestion | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCat, setEditCat] = useState<EntityType>("worldbuilding");

  const list = suggestions.filter((s) => s.projectId === currentProjectId && (filter === "all" || s.status === filter));

  const toggle = (id: string) => {
    const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n);
  };

  const approveSelected = () => { selected.forEach(approveSuggestion); toast.success(`Approved ${selected.size}`); setSelected(new Set()); };
  const rejectSelected = () => { selected.forEach(rejectSuggestion); toast.success(`Rejected ${selected.size}`); setSelected(new Set()); };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Import Review</h1>
        <p className="text-sm text-muted-foreground">Review extracted suggestions before they become canon.</p>
      </div>

      <div className="flex items-center gap-2 panel p-3">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px] bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={() => setSelected(new Set(list.map((s) => s.id)))}>Select all</Button>
        {selected.size > 0 && (
          <>
            <span className="text-sm">{selected.size} selected</span>
            <Button size="sm" onClick={approveSelected}><Check className="w-3 h-3 mr-1" />Approve</Button>
            <Button size="sm" variant="destructive" onClick={rejectSelected}><X className="w-3 h-3 mr-1" />Reject</Button>
          </>
        )}
      </div>

      <div className="space-y-2">
        {list.length === 0 && <div className="panel p-8 text-center text-muted-foreground">No suggestions.</div>}
        {list.map((s) => (
          <div key={s.id} className="panel p-3 flex items-start gap-3">
            <Checkbox checked={selected.has(s.id)} onCheckedChange={() => toggle(s.id)} className="mt-1" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {editing?.id === s.id ? (
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="bg-background h-7" />
                ) : (
                  <span className="font-medium">{s.suggestedTitle}</span>
                )}
                {editing?.id === s.id ? (
                  <Select value={editCat} onValueChange={(v) => setEditCat(v as EntityType)}>
                    <SelectTrigger className="h-7 w-[140px]"><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline">{s.suggestedCategory}</Badge>
                )}
                <Badge className="bg-electric/20 text-electric">{Math.round(s.confidence * 100)}%</Badge>
                <Badge variant="outline" className="text-xs">{s.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Reason: {s.reason}</p>
              <p className="text-sm mt-1 italic text-muted-foreground">"{s.excerpt}"</p>
            </div>
            <div className="flex gap-1">
              {editing?.id === s.id ? (
                <Button size="sm" onClick={() => {
                  // mutate suggestion locally via store update
                  useStore.setState((st) => ({
                    suggestions: st.suggestions.map((x) => x.id === s.id ? { ...x, suggestedTitle: editTitle, suggestedCategory: editCat } : x),
                  }));
                  setEditing(null);
                  toast.success("Updated");
                }}>Save</Button>
              ) : (
                <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setEditTitle(s.suggestedTitle); setEditCat(s.suggestedCategory); }}>
                  <Edit className="w-3 h-3" />
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => approveSuggestion(s.id)} disabled={s.status !== "pending"}><Check className="w-3 h-3 mr-1" />Approve</Button>
              <Button size="sm" variant="ghost" onClick={() => rejectSuggestion(s.id)} disabled={s.status !== "pending"}><X className="w-3 h-3" /></Button>
              <Button size="sm" variant="ghost" title="Merge with existing"><Combine className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
