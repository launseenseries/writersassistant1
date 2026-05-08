import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/templates")({
  component: () => {
    const { templates } = useStore();
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="text-sm text-muted-foreground">Reusable structures for characters, locations, events, and more.</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader><CardTitle className="text-base flex items-center gap-2">{t.name}<Badge variant="outline" className="text-xs">{t.type}</Badge></CardTitle></CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                {t.fields.map((f) => <div key={f.key}>• {f.label}</div>)}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  },
});
