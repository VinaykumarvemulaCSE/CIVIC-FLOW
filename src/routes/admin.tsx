import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/civic/app-shell";
import { ADMIN_NAV } from "@/components/civic/admin-nav";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

const TITLES: Record<string, [string, string]> = {
  "/admin": ["Supervisor console", "City-wide load, SLA breaches and agent accuracy"],
  "/admin/users": ["Users", "Citizens, officers and supervisors with access to CIVIC-FLOW"],
  "/admin/complaints": ["All complaints", "Every ticket in the city, with override controls"],
  "/admin/rules": ["Triage rules", "Tune how the agents score, route and escalate complaints"],
  "/admin/analytics": [
    "Analytics & AI monitoring",
    "Volume, load, hotspots and automation accuracy",
  ],
  "/admin/issues": ["All issues", "Every real-world problem the city is tracking"],
  "/admin/audit": ["Audit log", "Every automated and human decision, in order"],
};

function AdminLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const match = TITLES[pathname] ?? (["Admin", "Supervisor tools"] as [string, string]);
  return (
    <AppShell role="admin" items={ADMIN_NAV} title={match[0]} subtitle={match[1]}>
      <Outlet />
    </AppShell>
  );
}
