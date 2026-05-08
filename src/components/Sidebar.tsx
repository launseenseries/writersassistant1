import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FolderKanban, Inbox, History, FileSearch, Clock, Globe2, Library,
  Users, MapPin, Shield, Heart, Sparkles, BookOpen, Wand2, GitBranch, AlertTriangle,
  RotateCcw, FileText, Download, Trash2, Settings, Feather, Crown, Landmark
} from "lucide-react";

const groups: { label: string; items: { to: string; label: string; icon: any }[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/projects", label: "Projects", icon: FolderKanban },
      { to: "/inbox", label: "Story Info Inbox", icon: Inbox },
      { to: "/uploads", label: "Upload History", icon: History },
      { to: "/import-review", label: "Import Review", icon: FileSearch },
    ],
  },
  {
    label: "Story Canon",
    items: [
      { to: "/timeline", label: "Timeline", icon: Clock },
      { to: "/worldbuilding", label: "Worldbuilding", icon: Globe2 },
      { to: "/canon", label: "Canon Library", icon: Library },
      { to: "/characters", label: "Characters", icon: Users },
      { to: "/locations", label: "Locations", icon: MapPin },
      { to: "/factions", label: "Factions", icon: Shield },
      { to: "/families", label: "Families", icon: Crown },
      { to: "/heritage", label: "Heritage", icon: Landmark },
      { to: "/faith", label: "Faith", icon: Heart },
      { to: "/magic", label: "Magic / Power", icon: Sparkles },
    ],
  },
  {
    label: "Structure",
    items: [
      { to: "/pathways", label: "Pathways", icon: GitBranch },
      { to: "/continuity", label: "Continuity Issues", icon: AlertTriangle },
      { to: "/retcons", label: "Retcons", icon: RotateCcw },
      { to: "/templates", label: "Templates", icon: FileText },
      { to: "/exports", label: "Exports", icon: Download },
      { to: "/trash", label: "Trash", icon: Trash2 },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <aside className="w-60 shrink-0 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 flex items-center gap-2 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-md gradient-violet flex items-center justify-center glow-violet">
          <Feather className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="text-sm font-semibold text-sidebar-foreground">Writer's Assistant</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Canon Studio</div>
        </div>
      </div>
      <nav className="p-2 space-y-4">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground">{g.label}</div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = path === it.to;
                const Icon = it.icon;
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                        active
                          ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-primary"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {it.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
