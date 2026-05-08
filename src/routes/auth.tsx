import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      if (mode === "signup") {
        if (!username.trim()) { toast.error("Pick a username"); return; }
        const { error } = await supabase.auth.signUp({
          email, password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { username, display_name: username },
          },
        });
        if (error) throw error;
        toast.success("Account created. Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Signed in");
        nav({ to: "/" });
      }
    } catch (e: any) {
      toast.error(e.message || "Auth error");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-sm">
        <CardHeader><CardTitle>{mode === "signin" ? "Sign in" : "Create account"}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {mode === "signup" && (
            <Input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="bg-background" />
          )}
          <Input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background" />
          <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-background" />
          <Button className="w-full gradient-violet text-white border-0" onClick={submit} disabled={loading}>
            {loading ? "..." : mode === "signin" ? "Sign in" : "Sign up"}
          </Button>
          <button className="text-xs text-muted-foreground hover:underline w-full text-center" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
            {mode === "signin" ? "No account? Sign up" : "Have an account? Sign in"}
          </button>
          <Link to="/" className="block text-center text-xs text-muted-foreground hover:underline">Continue without account</Link>
        </CardContent>
      </Card>
    </div>
  );
}
