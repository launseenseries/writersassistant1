import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, FolderKanban } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/projects")({ component: ProjectsPage });

function ProjectsPage() {
  const { projects, createProject, updateProject, deleteProject, setCurrentProject, currentProjectId } = useStore();
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ title: "", genre: "", settingSummary: "", toneNotes: "", series: false, startDate: "" });

  const submit = () => {
    if (!draft.title.trim()) { toast.error("Title required"); return; }
    createProject(draft);
    toast.success("Project created");
    setCreating(false);
    setDraft({ title: "", genre: "", settingSummary: "", toneNotes: "", series: false, startDate: "" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Projects</h1>
          <p className="text-sm text-muted-foreground">Each project is its own canon database.</p>
        </div>
        <Button onClick={() => setCreating(true)} className="gradient-violet text-white border-0"><Plus className="w-4 h-4 mr-1" />New Project</Button>
      </div>

      {creating && (
        <Card>
          <CardHeader><CardTitle>New Project</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Project title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="bg-background" />
            <Input placeholder="Genre" value={draft.genre} onChange={(e) => setDraft({ ...draft, genre: e.target.value })} className="bg-background" />
            <Textarea placeholder="Setting summary" value={draft.settingSummary} onChange={(e) => setDraft({ ...draft, settingSummary: e.target.value })} className="bg-background" />
            <Textarea placeholder="Tone notes" value={draft.toneNotes} onChange={(e) => setDraft({ ...draft, toneNotes: e.target.value })} className="bg-background" />
            <Input type="date" value={draft.startDate} onChange={(e) => setDraft({ ...draft, startDate: e.target.value })} className="bg-background" />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button>
              <Button onClick={submit} className="gradient-violet text-white border-0">Create</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {projects.filter((p) => !p.deleted).map((p) => (
          <div key={p.id} className={`panel p-4 ${p.id === currentProjectId ? "ring-1 ring-primary" : ""}`}>
            <div className="flex items-start gap-2">
              <FolderKanban className="w-5 h-5 text-primary mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-semibold truncate">{p.title}</div>
                <div className="text-xs text-muted-foreground">{p.genre || "Uncategorized"}</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{p.settingSummary}</p>
            <div className="flex gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => setCurrentProject(p.id)}>Open</Button>
              <Button size="sm" variant="outline" onClick={() => { const t = prompt("Rename project", p.title); if (t) updateProject(p.id, { title: t }); }}>Rename</Button>
              <Button size="sm" variant="ghost" onClick={() => { if (confirm("Move to Trash?")) deleteProject(p.id); }}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
