import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/audit-log")({ component: Page });

function Page() {
  const { user } = useAuth();
  const { currentProjectId } = useStore();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("audit_log").select("*").eq("project_id", currentProjectId).order("created_at", { ascending: false }).limit(500)
      .then(({ data }) => setRows(data || []));
  }, [user, currentProjectId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Master Change Log</h1>
        <p className="text-sm text-muted-foreground">Every change made by any user, recorded with timestamp.</p>
      </div>
      {!user && <div className="panel p-6 text-sm text-muted-foreground">Sign in to view the master log.</div>}
      {user && (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left">
              <tr><th className="p-2">When</th><th className="p-2">User</th><th className="p-2">Action</th><th className="p-2">Entity</th><th className="p-2">Name</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2">{r.username || "—"}</td>
                  <td className="p-2"><Badge variant="outline" className="text-xs">{r.action}</Badge></td>
                  <td className="p-2 text-xs">{r.entity_type || "—"}</td>
                  <td className="p-2">{r.entity_name || "—"}</td>
                </tr>
              ))}
              {rows.length === 0 && user && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No entries yet.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
