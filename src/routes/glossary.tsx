import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useGlossary, GlossaryEntry } from "@/lib/glossary";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Copy, Trash2, History } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/glossary")({ component: Page });

const CATS = ["slang", "religious", "cultural", "technical", "other"] as const;

function Page() {
  const { currentProjectId } = useStore();
  const { entries, add, update, remove, duplicate } = useGlossary();
  const list = entries.filter((e) => e.projectId === currentProjectId && !e.deleted);
  const [editing, setEditing] = useState<GlossaryEntry | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [draft, setDraft] = useState({ term: "", category: "slang" as GlossaryEntry["category"], definition: "", example: "" });
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");

  const filtered = list.filter((e) =>
    (cat === "all" || e.category === cat) &&
    (!search || e.term.toLowerCase().includes(search.toLowerCase()) || e.definition.toLowerCase().includes(search.toLowerCase()))
  );

  const create = () => {
    if (!draft.term.trim()) { toast.error("Term required"); return; }
    const e = add({ projectId: currentProjectId, ...draft });
    logAudit("glossary.create", { entityType: "glossary", entityId: e.id, entityName: e.term });
    setDraft({ term: "", category: "slang", definition: "", example: "" });
    setShowNew(false);
    toast.success("Glossary entry added");
  };

  const save = (mode: "overwrite" | "version") => {
    if (!editing) return;
    update(editing.id, editing, mode);
    logAudit(mode === "version" ? "glossary.version" : "glossary.update", { entityType: "glossary", entityId: editing.id, entityName: editing.term });
    toast.success(mode === "version" ? "Saved as new version" : "Updated");
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Glossary</h1>
          <p className="text-sm text-muted-foreground">Slang, religious, cultural, and other not-well-known words for your story.</p>
        </div>
        <Button className="gradient-violet text-white border-0" onClick={() => setShowNew(true)}><Plus className="w-4 h-4 mr-1" />New Term</Button>
      </div>

      <div className="flex gap-2 panel p-3">
        <Input placeholder="Search terms…" value={search} onChange={(e) => setSearch(e.target.value)} className="bg-background max-w-xs" />
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-[160px] bg-background"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {showNew && (
        <Card>
          <CardHeader><CardTitle className="text-base">New entry</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Input placeholder="Term" value={draft.term} onChange={(e) => setDraft({ ...draft, term: e.target.value })} className="bg-background" />
            <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v as any })}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
            </Select>
            <Textarea placeholder="Definition" value={draft.definition} onChange={(e) => setDraft({ ...draft, definition: e.target.value })} className="bg-background" />
            <Textarea placeholder="Example usage (optional)" value={draft.example} onChange={(e) => setDraft({ ...draft, example: e.target.value })} className="bg-background" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowNew(false)}>Cancel</Button>
              <Button className="gradient-violet text-white border-0" onClick={create}>Add</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((e) => (
          <div key={e.id} className="panel p-3">
            {editing?.id === e.id ? (
              <div className="space-y-2">
                <Input value={editing.term} onChange={(ev) => setEditing({ ...editing, term: ev.target.value })} className="bg-background font-semibold" />
                <Select value={editing.category} onValueChange={(v) => setEditing({ ...editing, category: v as any })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                </Select>
                <Textarea value={editing.definition} onChange={(ev) => setEditing({ ...editing, definition: ev.target.value })} className="bg-background" />
                <Textarea value={editing.example || ""} onChange={(ev) => setEditing({ ...editing, example: ev.target.value })} className="bg-background" placeholder="Example" />
                <div className="flex gap-2 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
                  <Button size="sm" variant="outline" onClick={() => save("version")}>Save as new version</Button>
                  <Button size="sm" className="gradient-violet text-white border-0" onClick={() => save("overwrite")}>Overwrite</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold">{e.term}</div>
                    <Badge variant="outline" className="text-[10px] capitalize mt-1">{e.category}</Badge>
                    {e.versions.length > 0 && <Badge variant="outline" className="text-[10px] ml-1"><History className="w-3 h-3 mr-1 inline" />{e.versions.length}</Badge>}
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => setEditing(e)}><Edit2 className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { duplicate(e.id); toast.success("Duplicated"); }}><Copy className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => { if (confirm("Delete?")) { remove(e.id); logAudit("glossary.delete", { entityType: "glossary", entityId: e.id, entityName: e.term }); } }}><Trash2 className="w-3 h-3" /></Button>
                  </div>
                </div>
                <p className="text-sm mt-2">{e.definition}</p>
                {e.example && <p className="text-xs italic text-muted-foreground mt-1">"{e.example}"</p>}
              </>
            )}
          </div>
        ))}
        {filtered.length === 0 && <div className="panel p-8 text-center text-muted-foreground col-span-full">No glossary entries yet.</div>}
      </div>
    </div>
  );
}
