import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useStore } from "@/lib/store";
import { useCategories } from "@/lib/categories";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";
import { logAudit } from "@/lib/audit";
import { toast } from "sonner";

const CATS = [
  { type: "character", label: "Characters", to: "/characters" },
  { type: "location", label: "Locations", to: "/locations" },
  { type: "faction", label: "Factions", to: "/factions" },
  { type: "family", label: "Families", to: "/families" },
  { type: "heritage", label: "Heritage", to: "/heritage" },
  { type: "faith", label: "Faith", to: "/faith" },
  { type: "magic", label: "Magic / Power", to: "/magic" },
  { type: "timeline", label: "Timeline Events", to: "/timeline" },
  { type: "worldbuilding", label: "Worldbuilding", to: "/worldbuilding" },
  { type: "pathway", label: "Pathways", to: "/pathways" },
  { type: "continuity", label: "Continuity", to: "/continuity" },
  { type: "retcon", label: "Retcons", to: "/retcons" },
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
      if (!name.trim()) return;
      add(currentProjectId, name.trim());
      logAudit("canon.category.create", { entityName: name });
      toast.success(`Category "${name}" added`);
      setName(""); setShowAdd(false);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              Canon Library
              <Button size="icon" variant="ghost" onClick={() => setShowAdd((v) => !v)} title="Add new category"><Plus className="w-4 h-4" /></Button>
            </h1>
            <p className="text-sm text-muted-foreground">Your full story canon, browsable by category.</p>
          </div>
        </div>

        {showAdd && (
          <div className="panel p-3 flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New category name (e.g. Artifacts, Languages)" className="bg-background" onKeyDown={(e) => e.key === "Enter" && create()} />
            <Button onClick={create} className="gradient-violet text-white border-0">Add</Button>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CATS.map((c) => (
            <Link key={c.type} to={c.to}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader className="pb-2"><CardTitle className="text-sm">{c.label}</CardTitle></CardHeader>
                <CardContent className="text-3xl font-bold text-gradient">{counts(c.type)}</CardContent>
              </Card>
            </Link>
          ))}
          {myCats.map((c) => (
            <Card key={c.id} className="relative">
              <button className="absolute top-2 right-2 text-muted-foreground hover:text-destructive" onClick={() => { if (confirm(`Remove category "${c.name}"?`)) remove(c.id); }}><X className="w-3 h-3" /></button>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{c.name}</CardTitle></CardHeader>
              <CardContent className="text-3xl font-bold text-gradient">{customCounts(c.name)}</CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  },
});
