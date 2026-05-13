import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import appCss from "../styles.css?url";
import { Sidebar } from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { useStore } from "@/lib/store";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AuthProvider } from "@/lib/auth";
import { useTheme } from "@/lib/theme";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Feather } from "lucide-react";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-gradient">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Writer's Assistant — Story Canon Studio" },
      { name: "description", content: "Organize your story canon, timeline, worldbuilding, and pathways in one place." },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body className="dark">{children}<Scripts /></body>
    </html>
  );
}

function ProjectSwitcher() {
  const { projects, currentProjectId, setCurrentProject } = useStore();
  const active = projects.filter((p) => !p.deleted);
  return (
    <Select value={currentProjectId} onValueChange={setCurrentProject}>
      <SelectTrigger className="w-[160px] sm:w-[260px] bg-card"><SelectValue /></SelectTrigger>
      <SelectContent>
        {active.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => { setTheme(theme); }, [theme, setTheme]);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <div className="flex min-h-screen w-full bg-background text-foreground">
          <Sidebar />
          <div className="flex-1 min-w-0 flex flex-col">
            <header className="h-14 border-b border-border flex items-center justify-between gap-2 px-4 sm:px-6 sticky top-0 bg-background/80 backdrop-blur z-20">
              <div className="flex items-center gap-2 min-w-0">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-sidebar-border">
                    <SheetTitle className="sr-only">Navigation</SheetTitle>
                    <Sidebar variant="mobile" onNavigate={() => setMobileOpen(false)} />
                  </SheetContent>
                </Sheet>
                <div className="lg:hidden flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md gradient-violet flex items-center justify-center">
                    <Feather className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-semibold truncate">Writer's Assistant</span>
                </div>
                <div className="hidden lg:block text-sm text-muted-foreground">Active project</div>
              </div>
              <ProjectSwitcher />
            </header>
            <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
              <Outlet />
            </main>
          </div>
          <Toaster richColors position="top-right" />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}
