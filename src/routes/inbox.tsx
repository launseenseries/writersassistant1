import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, SourceUpload } from "@/lib/store";
import { useSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileText } from "lucide-react";

export const Route = createFileRoute("/inbox")({ component: InboxPage });

const SOURCE_TYPES = ["Chapter", "Scene", "Notes", "Character bio", "Lore note", "Timeline note", "Worldbuilding note", "Imported document", "Pasted text", "Manual entry", "Custom"];

function InboxPage() {
  const { items, currentProjectId, addItem, runExtraction } = useStore();
  const dynamicSections = useSettings((s) => s.dynamicSections);
  const sources = items.filter((i) => i.projectId === currentProjectId && i.type === "source" && !i.deleted) as SourceUpload[];
  const [filter, setFilter] = useState({ story: true, world: true, glossary: true });
  const [draft, setDraft] = useState({
    title: "", sourceType: "Chapter", rawText: "", chapter: "", scene: "",
    storyDate: "", pov: "", location: "", tags: "",
  });

  const submit = () => {
    if (!draft.rawText.trim() && !draft.title.trim()) { toast.error("Add a title or paste text"); return; }
    const order = sources.length + 1;
    const item = addItem({
      type: "source",
      name: draft.title || `Untitled ${draft.sourceType}`,
      description: draft.rawText.slice(0, 200),
      tags: draft.tags.split(",").map((t) => t.trim()).filter(Boolean),
      canonStatus: "Draft",
      data: {
        sourceType: draft.sourceType, rawText: draft.rawText,
        uploadOrder: order, storyOrder: order,
        chapter: draft.chapter ? Number(draft.chapter) : undefined,
        scene: draft.scene ? Number(draft.scene) : undefined,
        storyDate: draft.storyDate || undefined,
        pov: draft.pov || undefined, location: draft.location || undefined,
      },
    });
    // Promote data to top-level expected fields by writing rawText into description; also stage as full SourceUpload via a hack:
    // For simplicity store rawText in description field for extraction:
    (item as any).rawText = draft.rawText;
    (item as any).sourceType = draft.sourceType;
    (item as any).uploadOrder = order;
    (item as any).storyOrder = order;

    // Mutate the store object via update to ensure persisted
    useStore.getState().updateItem(item.id, { data: { ...item.data, rawText: draft.rawText, sourceType: draft.sourceType, uploadOrder: order, storyOrder: order } });

    const count = runExtractionSafe(item.id);
    toast.success(`Source added. ${count} suggestion(s) created.`);
    setDraft({ title: "", sourceType: "Chapter", rawText: "", chapter: "", scene: "", storyDate: "", pov: "", location: "", tags: "" });
  };

  function runExtractionSafe(id: string): number {
    // Inject rawText to top-level shape expected by store extractor
    const it = useStore.getState().items.find((x) => x.id === id) as any;
    if (it) it.rawText = it.data?.rawText || "";
    return runExtraction(id);
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const { parseFile } = await import("@/lib/parseFile");
      toast.message(`Parsing ${file.name}…`);
      const text = await parseFile(file);
      setDraft({ ...draft, rawText: text, title: draft.title || file.name });
      toast.success(`Parsed ${file.name} (${text.length} chars)`);
    } catch (err: any) {
      toast.error(`Could not parse: ${err.message || err}`);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Story Info Inbox</h1>
        <p className="text-sm text-muted-foreground">Paste, upload, or manually add chapters, scenes, notes, and lore. Nothing becomes canon automatically.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Upload className="w-4 h-4" />Add Source</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <Input placeholder="Source title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="bg-background" />
            <Select value={draft.sourceType} onValueChange={(v) => setDraft({ ...draft, sourceType: v })}>
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>{SOURCE_TYPES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Textarea placeholder="Paste chapter, scene, notes, or lore..." rows={8} value={draft.rawText} onChange={(e) => setDraft({ ...draft, rawText: e.target.value })} className="bg-background font-mono text-sm" />
          <div>
            <label className="text-xs text-muted-foreground">Or upload a .txt / .md file</label>
            <Input type="file" accept=".txt,.md,.json,.csv,.pdf,.docx,.doc,.rtf" onChange={onFile} className="bg-background" />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <Input placeholder="Chapter #" value={draft.chapter} onChange={(e) => setDraft({ ...draft, chapter: e.target.value })} className="bg-background" />
            <Input placeholder="Scene #" value={draft.scene} onChange={(e) => setDraft({ ...draft, scene: e.target.value })} className="bg-background" />
            <Input type="date" placeholder="Story date" value={draft.storyDate} onChange={(e) => setDraft({ ...draft, storyDate: e.target.value })} className="bg-background" />
            <Input placeholder="POV character" value={draft.pov} onChange={(e) => setDraft({ ...draft, pov: e.target.value })} className="bg-background" />
            <Input placeholder="Location" value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} className="bg-background" />
            <Input placeholder="Tags (comma)" value={draft.tags} onChange={(e) => setDraft({ ...draft, tags: e.target.value })} className="bg-background" />
          </div>
          <div className="flex justify-end">
            <Button onClick={submit} className="gradient-violet text-white border-0">Add to Inbox & Extract</Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Recent sources</h2>
        <div className="space-y-2">
          {sources.length === 0 && <div className="panel p-8 text-center text-muted-foreground">No sources yet.</div>}
          {sources.map((s) => (
            <div key={s.id} className="panel p-3 flex items-start gap-3">
              <FileText className="w-4 h-4 text-primary mt-1" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{s.name} <span className="text-xs text-muted-foreground">· {(s.data as any)?.sourceType}</span></div>
                <p className="text-xs text-muted-foreground line-clamp-2">{((s.data as any)?.rawText || s.description || "").slice(0, 200)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => { const c = runExtractionSafe(s.id); toast.success(`${c} new suggestion(s)`); }}>Re-run extraction</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
