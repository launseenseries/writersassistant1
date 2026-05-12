
-- 1) Restrict project_invites SELECT to creator only
DROP POLICY IF EXISTS invites_public_read ON public.project_invites;
CREATE POLICY invites_select_creator ON public.project_invites
  FOR SELECT TO authenticated
  USING (auth.uid() = created_by);

-- 2) get_invite_by_token: safe token-based lookup
CREATE OR REPLACE FUNCTION public.get_invite_by_token(_token text)
RETURNS TABLE(project_id text, project_title text, role public.collab_role, expired boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT i.project_id, i.project_title, i.role,
         (i.expires_at IS NOT NULL AND i.expires_at <= now()) AS expired
  FROM public.project_invites i
  WHERE i.token = _token
  LIMIT 1;
$$;

-- 3) accept_invite: validates token, inserts collaborator, deletes invite
CREATE OR REPLACE FUNCTION public.accept_invite(_token text)
RETURNS TABLE(project_id text, project_title text, role public.collab_role)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  inv public.project_invites%ROWTYPE;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO inv FROM public.project_invites WHERE token = _token LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invite';
  END IF;
  IF inv.expires_at IS NOT NULL AND inv.expires_at <= now() THEN
    RAISE EXCEPTION 'Invite expired';
  END IF;

  INSERT INTO public.project_collaborators (project_id, project_title, user_id, role)
  VALUES (inv.project_id, inv.project_title, uid, inv.role)
  ON CONFLICT DO NOTHING;

  DELETE FROM public.project_invites WHERE id = inv.id;

  RETURN QUERY SELECT inv.project_id, inv.project_title, inv.role;
END;
$$;

-- 4) Tighten collab_insert_self: require a matching valid invite OR be the first member (project creator bootstrap)
DROP POLICY IF EXISTS collab_insert_self ON public.project_collaborators;
CREATE POLICY collab_insert_self ON public.project_collaborators
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      -- bootstrap: no collaborators yet for this project, user becomes owner/author
      NOT EXISTS (SELECT 1 FROM public.project_collaborators c WHERE c.project_id = project_collaborators.project_id)
      OR EXISTS (
        SELECT 1 FROM public.project_invites i
        WHERE i.project_id = project_collaborators.project_id
          AND i.role = project_collaborators.role
          AND (i.expires_at IS NULL OR i.expires_at > now())
      )
    )
  );

-- 5) Audit log: remove project_id IS NULL public branch
DROP POLICY IF EXISTS audit_select_members ON public.audit_log;
CREATE POLICY audit_select_members ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    (project_id IS NOT NULL AND public.is_project_member(project_id, auth.uid()))
    OR (project_id IS NULL AND auth.uid() = user_id)
  );

-- 6) Lock down internal helpers used only by policies
REVOKE EXECUTE ON FUNCTION public.is_project_member(text, uuid) FROM anon, authenticated, public;

-- 7) Allow authenticated to call invite helpers
GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;
