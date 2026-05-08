import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileJson, FileText } from "lucide-react";
import { toast } from "sonner";

const SECTIONS = ["character", "location", "faction", "family", "heritage", "faith", "magic", "timeline", "worldbuilding", "pathway", "continuity", "retcon"] as const;

export const Route = createFileRoute("/exports")({
  component: () => {
    const { items, currentProjectId, projects } = useStore();
    const project = projects.find((p) => p.id === currentProjectId);
    const [selected, setSelected] = useState<Set<string>>(new Set(SECTIONS));

    const toggle = (s: string) => { const n = new Set(selected); n.has(s) ? n.delete(s) : n.add(s); setSelected(n); };

    const doExport = (format: "json" | "md") => {
      const data = items.filter((i) => i.projectId === currentProjectId && !i.deleted && selected.has(i.type));
      if (format === "json") {
        const blob = new Blob([JSON.stringify({ project, items: data }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${project?.title}-bible.json`; a.click();
      } else {
        let md = `# ${project?.title}\n\n${project?.settingSummary}\n\n`;
        Array.from(selected).forEach((sec) => {
          const list = data.filter((i) => i.type === sec);
          if (list.length === 0) return;
          md += `\n## ${sec}\n`;
          list.forEach((i) => { md += `\n### ${i.name} _(${i.canonStatus})_\n${i.description || ""}\n${i.notes || ""}\n`; });
        });
        const blob = new Blob([md], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `${project?.title}-bible.md`; a.click();
      }
      toast.success("Export downloaded");
    };

    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Exports</h1>
          <p className="text-sm text-muted-foreground">Build a series bible, character sheets, timeline reports, and more.</p>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Series Bible Export</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SECTIONS.map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={selected.has(s)} onCheckedChange={() => toggle(s)} />{s}
                </label>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => doExport("md")} className="gradient-violet text-white border-0"><FileText className="w-4 h-4 mr-1" />Export Markdown</Button>
              <Button variant="outline" onClick={() => doExport("json")}><FileJson className="w-4 h-4 mr-1" />Export JSON</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  },
});
