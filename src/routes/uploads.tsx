import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronUp, ChevronDown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/uploads")({ component: Page });

function Page() {
  const { items, currentProjectId, updateItem } = useStore();
  const sources = items.filter((i) => i.projectId === currentProjectId && i.type === "source" && !i.deleted)
    .sort((a, b) => ((a.data as any)?.storyOrder || 0) - ((b.data as any)?.storyOrder || 0));

  const move = (id: string, dir: number) => {
    const idx = sources.findIndex((s) => s.id === id);
    const swap = sources[idx + dir]; if (!swap) return;
    const a = (sources[idx].data as any)?.storyOrder || idx + 1;
    const b = (swap.data as any)?.storyOrder || idx + 1 + dir;
    updateItem(id, { data: { ...sources[idx].data, storyOrder: b } });
    updateItem(swap.id, { data: { ...swap.data, storyOrder: a } });
    toast.message("Order updated. Pathway source trails will reflect new order.");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Upload History / Source Order</h1>
        <p className="text-sm text-muted-foreground">Original upload order is preserved. Drag or reorder to set corrected story order.</p>
      </div>

      <div className="panel p-3 text-sm text-yellow-300/80">
        ⚠ Changing upload story order updates pathway source trails and story-order sorting. No records are deleted.
      </div>

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr className="text-left">
              <th className="p-2">#</th>
              <th className="p-2">Source</th>
              <th className="p-2">Type</th>
              <th className="p-2">Chapter / Scene</th>
              <th className="p-2">Story Date</th>
              <th className="p-2">Upload Order</th>
              <th className="p-2">Status</th>
              <th className="p-2 w-20">Order</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s, i) => {
              const d = s.data as any;
              return (
                <tr key={s.id} className="border-t border-border">
                  <td className="p-2 text-muted-foreground">{i + 1}</td>
                  <td className="p-2 font-medium">{s.name}</td>
                  <td className="p-2">{d?.sourceType}</td>
                  <td className="p-2">{d?.chapter ? `Ch ${d.chapter}` : "—"}{d?.scene ? ` · Sc ${d.scene}` : ""}</td>
                  <td className="p-2">{d?.storyDate || "—"}</td>
                  <td className="p-2">{d?.uploadOrder}</td>
                  <td className="p-2"><Badge variant="outline" className="text-xs">{s.canonStatus}</Badge></td>
                  <td className="p-2 flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => move(s.id, -1)}><ChevronUp className="w-3 h-3" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => move(s.id, 1)}><ChevronDown className="w-3 h-3" /></Button>
                  </td>
                </tr>
              );
            })}
            {sources.length === 0 && (
              <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No sources uploaded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
