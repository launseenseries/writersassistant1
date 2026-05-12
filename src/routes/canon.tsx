import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useCategories } from "@/lib/categories";
import { pickCategoryIcon } from "@/lib/category-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, X, Users, MapPin, Shield, Crown, Landmark, Heart, Sparkles, Clock,
  Globe2, GitBranch, AlertTriangle, RotateCcw,
} from "lucide-react";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

const CATS = [
  { type: "character", label: "Characters", to: "/characters", Icon: Users },
  { type: "location", label: "Locations", to: "/locations", Icon: MapPin },
  { type: "faction", label: "Factions", to: "/factions", Icon: Shield },
  { type: "family", label: "Families", to: "/families", Icon: Crown },
  { type: "heritage", label: "Heritage", to: "/heritage", Icon: Landmark },
  { type: "faith", label: "Faith", to: "/faith", Icon: Heart },
  { type: "magic", label: "Magic / Power", to: "/magic", Icon: Sparkles },
  { type: "timeline", label: "Timeline Events", to: "/timeline", Icon: Clock },
  { type: "worldbuilding", label: "Worldbuilding", to: "/worldbuilding", Icon: Globe2 },
  { type: "pathway", label: "Pathways", to: "/pathways", Icon: GitBranch },
  { type: "continuity", label: "Continuity", to: "/continuity", Icon: AlertTriangle },
  { type: "retcon", label: "Retcons", to: "/retcons", Icon: RotateCcw },
] as const;

export const Route = createFileRoute("/canon")({
  component: () => {
    const { items, currentProjectId } = useStore();
    const { categories, add, remove } = useCategories();
    const [showAdd, setShowAdd] = useState(false);
    const [name, setName] = useState("");
    const counts = (t: string) => items.filter((i) => i.projectId === currentProjectId && i.type === t && !i.deleted && !i.archived).length;
    const customCounts = (catName: string) => items.filter((i) => i.projectId === currentProjectId && !i.deleted && i.tags?.includes(`category:${catName}`)).length;
    const myCats = categories.filter((c) => c.projectId === currentProjectId);

    const create = () => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const Icon = pickCategoryIcon(trimmed);
      add(currentProjectId, trimmed, (Icon as any).displayName || (Icon as any).name);
      logAudit("canon.category.create", { entityName: trimmed });
      toast.success(`Category "${trimmed}" added`, { description: `Icon auto-selected from name.` });
      setName(""); setShowAdd(false);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              Canon Library
              <Button size="icon" variant="ghost" onClick={() => setShowAdd((v) => !v)} title="Add new category" className="rounded-full hover:bg-accent">
                <Plus className="w-4 h-4" />
              </Button>
            </h1>
            <p className="text-sm text-muted-foreground">Your full story canon, browsable by category. Add custom categories with the + button.</p>
          </div>
        </div>

        {showAdd && (
          <div className="panel p-3 flex gap-2 animate-in fade-in slide-in-from-top-2">
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New category name (e.g. Artifacts, Languages, Creatures)"
              className="bg-background"
              onKeyDown={(e) => e.key === "Enter" && create()}
            />
            <Button onClick={create} className="gradient-violet text-white border-0">Add</Button>
            <Button variant="outline" onClick={() => { setShowAdd(false); setName(""); }}>Cancel</Button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CATS.map((c) => (
            <Link key={c.type} to={c.to}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                  <c.Icon className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm">{c.label}</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-bold text-gradient">{counts(c.type)}</CardContent>
              </Card>
            </Link>
          ))}
          {myCats.map((c) => {
            const Icon = pickCategoryIcon(c.name);
            return (
              <Card key={c.id} className="relative hover:border-primary transition-colors">
                <button
                  className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"
                  onClick={() => { if (confirm(`Remove category "${c.name}"?`)) { remove(c.id); logAudit("canon.category.remove", { entityName: c.name }); } }}
                  title="Remove category"
                >
                  <X className="w-3 h-3" />
                </button>
                <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
                  <Icon className="w-4 h-4 text-primary" />
                  <CardTitle className="text-sm">{c.name}</CardTitle>
                </CardHeader>
                <CardContent className="text-3xl font-bold text-gradient">{customCounts(c.name)}</CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  },
});
