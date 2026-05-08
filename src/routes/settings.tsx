import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  component: () => {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">Workspace preferences and data.</p>
        </div>
        <Card>
          <CardHeader><CardTitle className="text-base">Local Data</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">All data is stored locally in your browser. Use Exports to back up.</p>
            <Button variant="destructive" onClick={() => {
              if (confirm("Reset all local data? This cannot be undone.")) {
                localStorage.removeItem("writers-assistant-v1");
                location.reload();
              }
            }}>Reset all data</Button>
          </CardContent>
        </Card>
      </div>
    );
  },
});
