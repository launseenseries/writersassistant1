import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    const counts = (t: string) => items.filter((i) => i.projectId === currentProjectId && i.type === t && !i.deleted && !i.archived).length;
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Canon Library</h1>
          <p className="text-sm text-muted-foreground">Your full story canon, browsable by category.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {CATS.map((c) => (
            <Link key={c.type} to={c.to}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader className="pb-2"><CardTitle className="text-sm">{c.label}</CardTitle></CardHeader>
                <CardContent className="text-3xl font-bold text-gradient">{counts(c.type)}</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    );
  },
});
