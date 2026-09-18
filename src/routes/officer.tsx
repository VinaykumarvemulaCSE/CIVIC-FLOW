import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { ClipboardCheck, Layers, Map, ScrollText, Search, UserRound } from "lucide-react";
import { AppShell, type NavItem } from "@/components/civic/app-shell";

export const Route = createFileRoute("/officer")({
  component: OfficerLayout,
});

const items: NavItem[] = [
  {
    to: "/officer",
    label: "Complaint inbox",
    icon: <ClipboardCheck className="size-4" />,
    exact: true,
  },
  { to: "/officer/issues", label: "Work items", icon: <Layers className="size-4" /> },
  { to: "/officer/map", label: "Issue map", icon: <Map className="size-4" /> },
  { to: "/officer/logs", label: "Action logs", icon: <ScrollText className="size-4" /> },
  { to: "/officer/track", label: "Track by ID", icon: <Search className="size-4" /> },
  { to: "/officer/profile", label: "Profile", icon: <UserRound className="size-4" /> },
];

const TITLES: Record<string, [string, string]> = {
  "/officer": ["Complaint inbox", "Citizen submissions awaiting verification"],
  "/officer/issues": [
    "Work items",
    "Real-world issues ranked by safety, severity and repeat reports",
  ],
  "/officer/map": ["Issue map", "Every issue pinned on the live street map"],
  "/officer/logs": ["Action logs", "Every verification, link, email and closure"],
  "/officer/track": ["Track a complaint", "Open any ticket by complaint or issue ID"],
  "/officer/profile": ["Officer profile", "Department, zone and workload"],
};

function OfficerLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const match =
    TITLES[pathname] ??
    (["Validate complaint", "Confirm the agent findings and act"] as [string, string]);
  return (
    <AppShell role="officer" items={items} title={match[0]} subtitle={match[1]}>
      <Outlet />
    </AppShell>
  );
}
