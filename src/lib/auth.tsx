import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  username: string | null;
  loading: boolean;
}

const Ctx = createContext<AuthCtx>({ user: null, session: null, username: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(async () => {
          const { data } = await supabase.from("profiles").select("username").eq("id", s.user.id).maybeSingle();
          setUsername(data?.username ?? null);
        }, 0);
      } else setUsername(null);
    });
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <Ctx.Provider value={{ user: session?.user ?? null, session, username, loading }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
