import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { useSettings } from "@/lib/settings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import {
  Inbox, History, FileSearch, Clock, Globe2, Library, Users, MapPin, Shield,
  Heart, Sparkles, GitBranch, AlertTriangle, BookOpen, Download, Settings as SettingsIcon,
  Sparkle, ScrollText, UserPlus, Crown, Landmark, Pencil, Check
} from "lucide-react";

export const Route = createFileRoute("/hub")({ component: Hub });

const NAV = [
  { to: "/inbox", label: "Story Info Inbox", icon: Inbox, group: "Capture" },
  { to: "/uploads", label: "Upload History", icon: History, group: "Capture" },
  { to: "/import-review", label: "Import Review", icon: FileSearch, group: "Capture" },
  { to: "/timeline", label: "Timeline", icon: Clock, group: "Canon" },
  { to: "/canon", label: "Canon Library", icon: Library, group: "Canon" },
  { to: "/characters", label: "Characters", icon: Users, group: "Canon" },
  { to: "/locations", label: "Locations", icon: MapPin, group: "Canon" },
  { to: "/factions", label: "Factions", icon: Shield, group: "Canon" },
  { to: "/families", label: "Families", icon: Crown, group: "Canon" },
  { to: "/heritage", label: "Heritage", icon: Landmark, group: "Canon" },
  { to: "/faith", label: "Faith", icon: Heart, group: "Canon" },
  { to: "/magic", label: "Magic / Power", icon: Sparkles, group: "Canon" },
  { to: "/worldbuilding", label: "Worldbuilding", icon: Globe2, group: "Canon" },
  { to: "/glossary", label: "Glossary", icon: BookOpen, group: "Canon" },
  { to: "/pathways", label: "Pathways", icon: GitBranch, group: "Structure" },
  { to: "/continuity", label: "Continuity", icon: AlertTriangle, group: "Structure" },
  { to: "/exports", label: "Exports", icon: Download, group: "Structure" },
  { to: "/collaborators", label: "Collaborators", icon: UserPlus, group: "Workspace" },
  { to: "/audit-log", label: "Master Log", icon: ScrollText, group: "Workspace" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, group: "Workspace" },
] as const;

function Hub() {
  const { projects, currentProjectId, items, updateProject } = useStore();
  const project = projects.find((p) => p.id === currentProjectId);
  const projItems = items.filter((i) => i.projectId === currentProjectId && !i.deleted);
  const [busy, setBusy] = useState(false);

  const groups = Array.from(new Set(NAV.map((n) => n.group)));

  const regenerate = async () => {
    if (!project) return;
    setBusy(true);
    try {
      const sources = projItems.filter((i) => i.type === "source").slice(-10).map((s: any) => ({
        name: s.name, text: (s.data?.rawText || s.description || "").slice(0, 4000),
      }));
      const { data, error } = await supabase.functions.invoke("writing-advice", { body: { sources, mode: "summary" } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      updateProject(project.id, {
        settingSummary: data.summary || project.settingSummary,
        toneNotes: data.tone || project.toneNotes,
      });
      toast.success("Story summary, tone, and setting refreshed");
    } catch (e: any) {
      toast.error(e.message || "Regeneration failed");
    } finally { setBusy(false); }
  };

  if (!project) return <div className="p-6">No active project.</div>;

  return (
    <div className="space-y-6">
      <div className="panel p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full gradient-violet opacity-20 blur-3xl" />
        <div className="relative">
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Project Hub</div>
          <h1 className="text-3xl font-bold mt-1 text-gradient">{project.title}</h1>
          <div className="mt-3 grid md:grid-cols-3 gap-3 text-sm">
            <div><div className="text-[10px] uppercase text-muted-foreground">Summary</div><p className="text-muted-foreground line-clamp-4">{project.settingSummary}</p></div>
            <div><div className="text-[10px] uppercase text-muted-foreground">Tone</div><p className="text-muted-foreground line-clamp-4">{project.toneNotes}</p></div>
            <div><div className="text-[10px] uppercase text-muted-foreground">Genre</div><p className="text-muted-foreground">{project.genre}</p></div>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Button size="sm" onClick={regenerate} disabled={busy} className="gradient-violet text-white border-0">
              <Sparkle className="w-3 h-3 mr-1" />{busy ? "Refreshing…" : "Refresh from canon"}
            </Button>
            <Badge variant="outline">{projItems.length} canon items</Badge>
          </div>
        </div>
      </div>

      {groups.map((g) => (
        <div key={g}>
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground mb-2">{g}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {NAV.filter((n) => n.group === g).map((n) => {
              const Icon = n.icon;
              return (
                <Link key={n.to} to={n.to}>
                  <Card className="hover:border-primary transition-colors cursor-pointer h-full">
                    <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                      <Icon className="w-4 h-4 text-primary" />
                      <CardTitle className="text-sm">{n.label}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs text-muted-foreground">Open →</CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
