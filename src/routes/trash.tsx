import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export const Route = createFileRoute("/trash")({
  component: () => {
    const { items, currentProjectId, restoreItems, hardDeleteItems } = useStore();
    const trashed = items.filter((i) => i.projectId === currentProjectId && i.deleted);
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Trash</h1>
          <p className="text-sm text-muted-foreground">Deleted items can be restored. Linked records are preserved.</p>
        </div>
        <div className="space-y-2">
          {trashed.length === 0 && <div className="panel p-8 text-center text-muted-foreground">Trash is empty.</div>}
          {trashed.map((i) => (
            <div key={i.id} className="panel p-3 flex items-center gap-3">
              <Badge variant="outline" className="text-xs">{i.type}</Badge>
              <span className="flex-1 font-medium">{i.name}</span>
              <span className="text-xs text-muted-foreground">{new Date(i.updatedAt).toLocaleDateString()}</span>
              <Button size="sm" variant="outline" onClick={() => { restoreItems([i.id]); toast.success("Restored"); }}>Restore</Button>
              <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete forever?")) { hardDeleteItems([i.id]); toast.success("Deleted forever"); } }}>Delete forever</Button>
            </div>
          ))}
        </div>
      </div>
    );
  },
});
