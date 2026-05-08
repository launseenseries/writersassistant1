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
    supabase.from("project_invites").select("*").eq("token", token).maybeSingle().then(({ data }) => {
      setInvite(data); setLoading(false);
    });
  }, [token]);

  const accept = async () => {
    if (!user) { nav({ to: "/auth" }); return; }
    const { error } = await supabase.from("project_collaborators").insert({
      project_id: invite.project_id,
      project_title: invite.project_title,
      user_id: user.id,
      role: invite.role,
    });
    if (error) { toast.error(error.message); return; }
    await logAudit("collaborator.joined", { entityType: "project", entityId: invite.project_id, entityName: invite.project_title, details: { role: invite.role } });
    toast.success(`Joined as ${invite.role}`);
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
