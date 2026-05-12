import { createFileRoute, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/invite/$token")({ component: AcceptInvite });

function AcceptInvite() {
  const { token } = useParams({ from: "/invite/$token" });
  const { user } = useAuth();
  const nav = useNavigate();
  const [invite, setInvite] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (supabase as any).rpc("get_invite_by_token", { _token: token }).then(({ data }: any) => {
      const row = Array.isArray(data) ? data[0] : data;
      setInvite(row && !row.expired ? row : null);
      setLoading(false);
    });
  }, [token]);

  const accept = async () => {
    if (!user) { nav({ to: "/auth" }); return; }
    const { data, error } = await (supabase as any).rpc("accept_invite", { _token: token });
    if (error) { toast.error(error.message); return; }
    const row = Array.isArray(data) ? data[0] : data;
    await logAudit("collaborator.joined", { entityType: "project", entityId: row?.project_id, entityName: row?.project_title, details: { role: row?.role } });
    toast.success(`Joined as ${row?.role}`);
    nav({ to: "/collaborators" });
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading invite…</div>;
  if (!invite) return <div className="p-8 text-center text-muted-foreground">Invalid or expired invite.</div>;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader><CardTitle>Project invitation</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">You've been invited to <span className="font-semibold">{invite.project_title || invite.project_id}</span> as <span className="font-semibold capitalize">{invite.role}</span>.</p>
          {!user && <p className="text-xs text-muted-foreground">Sign in or create an account first to accept.</p>}
          <Button className="w-full gradient-violet text-white border-0" onClick={accept}>{user ? "Accept invitation" : "Sign in to accept"}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
