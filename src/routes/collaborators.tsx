import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Copy, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

export const Route = createFileRoute("/collaborators")({ component: Page });

type Role = "author" | "editor" | "viewer";

function Page() {
  const { user } = useAuth();
  const { projects, currentProjectId } = useStore();
  const project = projects.find((p) => p.id === currentProjectId);
  const [collabs, setCollabs] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [role, setRole] = useState<Role>("viewer");

  const refresh = async () => {
    if (!user || !currentProjectId) return;
    const [c, i] = await Promise.all([
      supabase.from("project_collaborators").select("*").eq("project_id", currentProjectId),
      supabase.from("project_invites").select("*").eq("project_id", currentProjectId).order("created_at", { ascending: false }),
    ]);
    setCollabs(c.data || []);
    setInvites(i.data || []);
  };
  useEffect(() => { refresh(); }, [user, currentProjectId]);

  // Auto-add owner as author
  useEffect(() => {
    (async () => {
      if (!user || !currentProjectId) return;
      const { data } = await supabase.from("project_collaborators").select("id").eq("project_id", currentProjectId).eq("user_id", user.id).maybeSingle();
      if (!data) {
        await supabase.from("project_collaborators").insert({ project_id: currentProjectId, project_title: project?.title, user_id: user.id, role: "author" });
        refresh();
      }
    })();
  }, [user, currentProjectId]);

  const createInvite = async () => {
    if (!user) { toast.error("Sign in first"); return; }
    const { data, error } = await supabase.from("project_invites").insert({
      project_id: currentProjectId, project_title: project?.title, role, created_by: user.id,
    }).select().single();
    if (error) { toast.error(error.message); return; }
    const url = `${window.location.origin}/invite/${data.token}`;
    await navigator.clipboard.writeText(url);
    await logAudit("invite.created", { entityType: "project", entityId: currentProjectId, details: { role } });
    toast.success("Invite link copied to clipboard");
    refresh();
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/invite/${token}`);
    toast.success("Link copied");
  };
  const revoke = async (id: string) => {
    await supabase.from("project_invites").delete().eq("id", id);
    refresh();
  };

  if (!user) {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-semibold">Collaborators</h1>
        <p className="text-sm text-muted-foreground">Sign in to invite collaborators.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Collaborators</h1>
        <p className="text-sm text-muted-foreground">Invite people to {project?.title} as Author, Editor, or Viewer.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserPlus className="w-4 h-4" />Create invite link</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Role</label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger className="w-[160px] bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="author">Author</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Viewer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={createInvite} className="gradient-violet text-white border-0">Generate invite link</Button>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Members ({collabs.length})</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {collabs.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm panel p-2">
                <span className="font-mono text-xs">{c.user_id.slice(0, 8)}…</span>
                <Badge variant="outline" className="capitalize">{c.role}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Active invite links</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {invites.length === 0 && <p className="text-xs text-muted-foreground">None yet.</p>}
            {invites.map((i) => (
              <div key={i.id} className="flex items-center gap-2 text-sm panel p-2">
                <Badge variant="outline" className="capitalize">{i.role}</Badge>
                <Input readOnly value={`${window.location.origin}/invite/${i.token}`} className="bg-background h-8 text-xs flex-1" />
                <Button size="icon" variant="ghost" onClick={() => copyLink(i.token)}><Copy className="w-3 h-3" /></Button>
                <Button size="icon" variant="ghost" onClick={() => revoke(i.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
