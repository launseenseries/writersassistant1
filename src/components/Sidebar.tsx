import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Home, FolderKanban, Inbox, History, FileSearch, Clock, Globe2, Library,
  Users, MapPin, Shield, Heart, Sparkles, BookOpen, GitBranch, AlertTriangle,
  RotateCcw, FileText, Download, Trash2, Settings, Feather, Crown, Landmark,
  UserPlus, ScrollText, Sun, Moon, LogIn, LogOut, Plus, Loader2
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCategories } from "@/lib/categories";
import { useStore } from "@/lib/store";
import { pickCategoryIcon } from "@/lib/category-icons";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

const groups: { label: string; items: { to: string; label: string; icon: any }[] }[] = [
  {
    label: "Workspace",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard },
      { to: "/hub", label: "Project Hub", icon: Home },
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
      { to: "/glossary", label: "Glossary", icon: BookOpen },
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
    ],
  },
  {
    label: "Collaboration",
    items: [
      { to: "/collaborators", label: "Collaborators", icon: UserPlus },
      { to: "/audit-log", label: "Master Log", icon: ScrollText },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar({ variant = "desktop", onNavigate }: { variant?: "desktop" | "mobile"; onNavigate?: () => void } = {}) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { theme, setTheme } = useTheme();
  void setTheme;
  const { user, username } = useAuth();
  const currentProjectId = useStore((s) => s.currentProjectId);
  const cats = useCategories((s) => s.categories).filter((c) => c.projectId === currentProjectId);
  const addCategory = useCategories((s) => s.add);
  const [adding, setAdding] = useState<null | string>(null); // null = closed, "" = open empty
  const [busy, setBusy] = useState(false);

  const submitCategory = async () => {
    const name = (adding || "").trim();
    if (!name) { setAdding(null); return; }
    setBusy(true);
    let iconName: string | undefined;
    try {
      const { data, error } = await supabase.functions.invoke("category-icon", { body: { name } });
      if (!error && (data as any)?.icon) iconName = (data as any).icon;
    } catch { /* fallback to local heuristic */ }
    addCategory(currentProjectId, name, iconName);
    logAudit("canon.category.create", { entityName: name, details: { icon: iconName, source: "sidebar" } });
    toast.success(`Category "${name}" added`);
    setAdding(null);
    setBusy(false);
  };

  const wrapperClass = variant === "mobile"
    ? "w-full h-full bg-sidebar overflow-y-auto"
    : "hidden lg:block w-60 shrink-0 bg-sidebar border-r border-sidebar-border h-screen sticky top-0 overflow-y-auto";

  return (
    <aside className={wrapperClass}>
      <div className="p-4 flex items-center gap-2 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-md gradient-violet flex items-center justify-center glow-violet">
          <Feather className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-sidebar-foreground">Writer's Assistant</div>
          <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Canon Studio</div>
        </div>
        <button onClick={() => useTheme.getState().cycle()} className="text-muted-foreground hover:text-foreground" title={`Theme: ${theme} — click to cycle`}>
          {theme === "arcane" ? <Moon className="w-4 h-4" /> : theme === "garden" ? <Sun className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
        </button>
      </div>

      <div className="p-3 border-b border-sidebar-border text-xs">
        {user ? (
          <div className="flex items-center justify-between">
            <span className="truncate">{username || user.email}</span>
            <button onClick={() => supabase.auth.signOut()} className="text-muted-foreground hover:text-destructive"><LogOut className="w-3 h-3" /></button>
          </div>
        ) : (
          <Link to="/auth" onClick={onNavigate} className="flex items-center gap-1 text-muted-foreground hover:text-foreground"><LogIn className="w-3 h-3" />Sign in</Link>
        )}
      </div>

      <nav className="p-2 space-y-4">
        {groups.map((g) => (
          <div key={g.label}>
            <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>{g.label}</span>
              {g.label === "Story Canon" && (
                <button
                  onClick={() => setAdding(adding === null ? "" : null)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Add custom category"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const active = path === it.to;
                const Icon = it.icon;
                return (
                  <li key={it.to}>
                    <Link
                      to={it.to}
                      onClick={onNavigate}
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
            {g.label === "Story Canon" && adding !== null && (
              <div className="mt-1 px-2 flex gap-1 items-center">
                <Input
                  autoFocus
                  value={adding}
                  onChange={(e) => setAdding(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") submitCategory(); if (e.key === "Escape") setAdding(null); }}
                  placeholder="Category name…"
                  className="h-7 text-xs bg-background"
                  disabled={busy}
                />
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={submitCategory} disabled={busy}>
                  {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                </Button>
              </div>
            )}
            {g.label === "Story Canon" && cats.length > 0 && (
              <ul className="space-y-0.5 mt-0.5 pl-1 border-l border-sidebar-border ml-2">
                {cats.map((c) => {
                  const Icon = pickCategoryIcon(c.name, c.icon);
                  return (
                    <li key={c.id}>
                      <Link
                        to="/canon"
                        onClick={onNavigate}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                        title={`Custom category: ${c.name}`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {c.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ))}
      </nav>
    </aside>
  );
}

void Button;

