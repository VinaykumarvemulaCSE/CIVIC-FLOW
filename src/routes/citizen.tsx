import { createFileRoute, Outlet, useRouterState, Link } from "@tanstack/react-router";
import { FilePlus2, Gauge, History, Search, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppShell, type NavItem } from "@/components/civic/app-shell";

export const Route = createFileRoute("/citizen")({
  component: CitizenLayout,
});

const items: NavItem[] = [
  { to: "/citizen", label: "Overview", icon: <Gauge className="size-4" />, exact: true },
  { to: "/citizen/new", label: "New complaint", icon: <FilePlus2 className="size-4" /> },
  { to: "/citizen/history", label: "My submissions", icon: <History className="size-4" /> },
  { to: "/citizen/track", label: "Track by ID", icon: <Search className="size-4" /> },
  { to: "/citizen/profile", label: "Profile", icon: <UserRound className="size-4" /> },
];

const TITLES: Record<string, [string, string]> = {
  "/citizen": ["Citizen overview", "Your reports and their live triage status"],
  "/citizen/new": ["New complaint", "Text, photo and location — the agents do the rest"],
  "/citizen/history": ["My submissions", "Everything you have reported"],
  "/citizen/track": ["Track a complaint", "Look up any ticket by its complaint ID"],
  "/citizen/profile": ["Profile", "Contact details and notification preferences"],
};

function CitizenLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const match =
    TITLES[pathname] ?? (["Complaint", "Live triage and officer updates"] as [string, string]);
  return (
    <AppShell
      role="citizen"
      items={items}
      title={match[0]}
      subtitle={match[1]}
      actions={
        <Button asChild size="sm">
          <Link to="/citizen/new">
            <FilePlus2 className="size-4" /> Report
          </Link>
        </Button>
      }
    >
      <Outlet />
    </AppShell>
  );
}
