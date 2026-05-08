import { supabase } from "@/integrations/supabase/client";
import { useStore } from "./store";

export async function logAudit(action: string, opts?: {
  entityType?: string; entityId?: string; entityName?: string; details?: any;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return; // local-only mode, skip
    const { data: profile } = await supabase.from("profiles").select("username").eq("id", user.id).maybeSingle();
    const projectId = useStore.getState().currentProjectId;
    await supabase.from("audit_log").insert({
      project_id: projectId,
      user_id: user.id,
      username: profile?.username || user.email,
      action,
      entity_type: opts?.entityType,
      entity_id: opts?.entityId,
      entity_name: opts?.entityName,
      details: opts?.details ?? null,
    });
  } catch (e) {
    console.warn("audit log failed", e);
  }
}
