import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban, Inbox, FileSearch, Clock, AlertTriangle, GitBranch,
  Plus, Upload, Users, Download
} from "lucide-react";

export const Route = createFileRoute("/")({ component: Dashboard });

function StatCard({ icon: Icon, label, value, accent }: any) {
  return (
    <div className="panel p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-md flex items-center justify-center ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { projects, items, suggestions, currentProjectId } = useStore();
  const project = projects.find((p) => p.id === currentProjectId);
  const projectItems = items.filter((i) => i.projectId === currentProjectId && !i.deleted);
  const recent = [...projectItems].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const pendingSugs = suggestions.filter((s) => s.projectId === currentProjectId && s.status === "pending");
  const continuity = projectItems.filter((i) => i.type === "continuity");
  const pathways = projectItems.filter((i) => i.type === "pathway");
  const timelineGaps = projectItems.filter((i) => i.type === "timeline" && (i.data as any)?.needsReview);

  return (
    <div className="space-y-6">
      <div className="panel p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full gradient-violet opacity-20 blur-3xl" />
        <div className="relative">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Active Project</div>
          <h1 className="text-3xl font-bold mt-1 text-gradient">{project?.title}</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-3xl">{project?.settingSummary}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard icon={FolderKanban} label="Projects" value={projects.filter((p) => !p.deleted).length} accent="bg-primary/20 text-primary" />
        <StatCard icon={Inbox} label="Sources" value={projectItems.filter((i) => i.type === "source").length} accent="bg-electric/20 text-electric" />
        <StatCard icon={FileSearch} label="Suggestions" value={pendingSugs.length} accent="bg-yellow-500/20 text-yellow-300" />
        <StatCard icon={Clock} label="Timeline events" value={projectItems.filter((i) => i.type === "timeline").length} accent="bg-violet-glow/20 text-violet-glow" />
        <StatCard icon={GitBranch} label="Pathways" value={pathways.length} accent="bg-primary/20 text-primary" />
        <StatCard icon={AlertTriangle} label="Continuity" value={continuity.length} accent="bg-destructive/20 text-destructive-foreground" />
      </div>

      <div>
        <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">Quick actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/projects"><Button variant="outline"><Plus className="w-4 h-4 mr-1" />New Project</Button></Link>
          <Link to="/inbox"><Button variant="outline"><Upload className="w-4 h-4 mr-1" />Import Story Info</Button></Link>
          <Link to="/timeline"><Button variant="outline"><Clock className="w-4 h-4 mr-1" />Add Timeline Event</Button></Link>
          <Link to="/characters"><Button variant="outline"><Users className="w-4 h-4 mr-1" />Add Character</Button></Link>
          <Link to="/pathways"><Button variant="outline"><GitBranch className="w-4 h-4 mr-1" />Add Pathway</Button></Link>
          <Link to="/exports"><Button variant="outline"><Download className="w-4 h-4 mr-1" />Export Series Bible</Button></Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Recently edited canon</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recent.map((it) => (
              <div key={it.id} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-[10px]">{it.type}</Badge>
                <span className="flex-1 truncate">{it.name}</span>
                <span className="text-xs text-muted-foreground">{new Date(it.updatedAt).toLocaleDateString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Open import suggestions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {pendingSugs.length === 0 && <p className="text-sm text-muted-foreground">All caught up.</p>}
            {pendingSugs.slice(0, 6).map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-[10px]">{s.suggestedCategory}</Badge>
                <span className="flex-1 truncate">{s.suggestedTitle}</span>
                <span className="text-xs text-muted-foreground">{Math.round(s.confidence * 100)}%</span>
              </div>
            ))}
            <Link to="/import-review"><Button size="sm" variant="outline" className="w-full mt-2">Open Import Review</Button></Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Open continuity issues</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {continuity.length === 0 && <p className="text-sm text-muted-foreground">No issues.</p>}
            {continuity.map((c) => (
              <div key={c.id} className="text-sm">
                <div className="font-medium">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.description}</div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Timeline gaps</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {timelineGaps.length === 0 && <p className="text-sm text-muted-foreground">No undated or needs-review events.</p>}
            {timelineGaps.map((t) => <div key={t.id} className="text-sm">{t.name}</div>)}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
