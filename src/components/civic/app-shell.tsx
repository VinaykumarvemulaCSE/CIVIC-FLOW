import { Link, useNavigate, useRouterState, useHydrated } from "@tanstack/react-router";
import { LogOut, Menu, ShieldCheck, RotateCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { resetDemoData, signOut, useSession, useLiveTick } from "@/lib/civic/store";
import { findUser } from "@/lib/civic/users";
import type { Role } from "@/lib/civic/types";

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
}

export function Logo({ tone = "light" }: { tone?: "light" | "dark" }) {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="flex size-8 items-center justify-center rounded-sm bg-accent text-accent-foreground">
        <ShieldCheck className="size-5" />
      </span>
      <span
        className={cn(
          "font-display text-lg font-bold uppercase tracking-tight",
          tone === "dark" && "text-sidebar-foreground",
        )}
      >
        CIVIC <span className="text-accent">FLOW</span>
      </span>
    </Link>
  );
}

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground",
              active && "bg-sidebar-accent text-sidebar-foreground",
            )}
          >
            <span className={cn("text-sidebar-foreground/60", active && "text-accent")}>
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({
  role,
  items,
  title,
  subtitle,
  actions,
  children,
}: {
  role: Role;
  items: NavItem[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const session = useSession();
  const navigate = useNavigate();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  useLiveTick();

  useEffect(() => {
    if (!hydrated) return;
    if (!session) {
      navigate({ to: "/auth", search: { role }, replace: true });
      return;
    }
    // A supervisor can suspend an account; sign them out on the next screen.
    const record = findUser(session.email);
    if (record?.status === "suspended") {
      signOut();
      toast.error("Your access has been suspended by a supervisor.");
      navigate({ to: "/auth", search: { role }, replace: true });
    }
  }, [hydrated, session, navigate, role]);

  if (!hydrated || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Checking your session…
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar p-4">
      <Logo tone="dark" />
      <p className="mt-6 mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/40">
        {role} workspace
      </p>
      <NavLinks items={items} onNavigate={() => setOpen(false)} />
      <div className="mt-auto space-y-2 border-t border-sidebar-border pt-4">
        <div className="px-3">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{session.name}</p>
          <p className="truncate text-xs text-sidebar-foreground/50">{session.email}</p>
        </div>
        <button
          onClick={() => resetDemoData()}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent"
        >
          <RotateCcw className="size-4" /> Reset demo data
        </button>
        <button
          onClick={() => {
            signOut();
            navigate({ to: "/" });
          }}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/60 hover:bg-sidebar-accent"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block">{sidebar}</aside>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-background/90 px-4 py-3 backdrop-blur lg:px-8">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-none p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              {sidebar}
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl font-bold uppercase tracking-tight">
              {title}
            </h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">{actions}</div>
        </header>
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
