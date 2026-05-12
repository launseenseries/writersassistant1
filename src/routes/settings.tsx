import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTheme, THEMES } from "@/lib/theme";
import { useSettings } from "@/lib/settings";
import { Moon, Sun, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const THEME_ICON: Record<string, any> = { arcane: Moon, garden: Sun, kawaii: Sparkles };

export const Route = createFileRoute("/settings")({
  component: () => {
    const { theme, setTheme } = useTheme();
    const { familyFriendly, setFamilyFriendly, reduceMotion, setReduceMotion } = useSettings();

    return (
      <div className="space-y-4 max-w-3xl">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">Workspace preferences, theme, and content controls.</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Theme</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {THEMES.map((t) => {
                const Icon = THEME_ICON[t.id];
                const active = theme === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={cn(
                      "panel p-4 text-left transition-all",
                      active ? "ring-2 ring-primary glow-violet" : "hover:border-primary",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-primary" />
                      <span className="font-semibold">{t.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{t.tagline}</div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Content</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="ff" className="font-medium">Family-friendly mode</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When ON, AI suggestions avoid mature romance, intimacy, graphic violence, and adult themes.
                  When OFF (default), the AI supports adult literary fiction including romance, emotional intimacy, and dark themes — handled professionally and craft-focused.
                </p>
              </div>
              <Switch id="ff" checked={familyFriendly} onCheckedChange={setFamilyFriendly} />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div>
                <Label htmlFor="rm" className="font-medium">Reduce motion</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Minimize animations, sparkles, and floating particles across themes.</p>
              </div>
              <Switch id="rm" checked={reduceMotion} onCheckedChange={setReduceMotion} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Local Data</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">Local-only project data is stored in your browser.</p>
            <Button variant="destructive" onClick={() => {
              if (confirm("Reset all local data? This cannot be undone.")) {
                Object.keys(localStorage).filter((k) => k.startsWith("writers-assistant")).forEach((k) => localStorage.removeItem(k));
                location.reload();
              }
            }}>Reset all data</Button>
          </CardContent>
        </Card>
      </div>
    );
  },
});
