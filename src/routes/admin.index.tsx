import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, Building2, ShieldAlert, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SeverityBadge } from "@/components/civic/badges";
import { useComplaints, useOfficerLogs } from "@/lib/civic/store";
import { useUsers } from "@/lib/civic/users";
import { useAutomationConfig, isN8nWired } from "@/lib/civic/integration";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Supervisor console — CIVIC-FLOW" },
      {
        name: "description",
        content: "Department load, SLA breaches and agent accuracy for CIVIC-FLOW supervisors.",
      },
      { property: "og:title", content: "Supervisor console — CIVIC-FLOW" },
      {
        property: "og:description",
        content: "Oversight view for department load, SLA breaches and agent accuracy.",
      },
    ],
  }),
  component: AdminOverview,
});

function AdminOverview() {
  const complaints = useComplaints();
  const logs = useOfficerLogs();
  const users = useUsers();
  const cfg = useAutomationConfig();

  const byDept = complaints.reduce<Record<string, number>>((acc, c) => {
    acc[c.department] = (acc[c.department] ?? 0) + 1;
    return acc;
  }, {});
  const breaching = complaints.filter(
    (c) => c.status !== "resolved" && Date.now() - c.createdAt > c.slaHours * 3600_000,
  );
  const analysed = complaints.filter((c) => c.vision).length;

  return (
    <div className="space-y-5">
      <div
        className={`rounded-md border p-3 text-sm ${
          isN8nWired(cfg) ? "border-resolved/40 bg-resolved/10" : "border-accent/40 bg-accent/10"
        }`}
      >
        {isN8nWired(cfg) ? (
          <>
            Triage runs on your n8n workflow.{" "}
            {cfg.lastRun
              ? `Last run: ${cfg.lastRun.ticket} — ${cfg.lastRun.detail}.`
              : "No complaint has been dispatched yet."}
          </>
        ) : (
          <>
            Triage is running on the built-in rules.{" "}
            <Link to="/automation" className="underline">
              Connect your n8n workflow
            </Link>{" "}
            to take over scoring.
          </>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          ["Total complaints", complaints.length, Building2],
          ["SLA breached", breaching.length, ShieldAlert],
          ["Registered users", users.length, Users],
          ["Officer actions", logs.length, Users],
          ["Photos analysed", analysed, BarChart3],
        ].map(([label, value, Icon]) => {
          const I = Icon as typeof Building2;
          return (
            <Card key={String(label)}>
              <CardContent className="p-4">
                <I className="size-5 text-accent" />
                <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                  {String(label)}
                </p>
                <p className="font-display text-3xl font-bold tabular-nums">{String(value)}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-5">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">
              Department load
            </h2>
            <ul className="mt-3 space-y-3">
              {Object.entries(byDept).map(([dept, count]) => (
                <li key={dept}>
                  <div className="flex justify-between text-sm">
                    <span>{dept}</span>
                    <span className="font-semibold tabular-nums">{count}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-accent"
                      style={{ width: `${(count / Math.max(complaints.length, 1)) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">
              SLA watchlist
            </h2>
            {breaching.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No breaches right now.
              </p>
            ) : (
              <ul className="mt-3 divide-y">
                {breaching.map((c) => (
                  <li key={c.ticket} className="flex items-center gap-2 py-2.5 text-sm">
                    <SeverityBadge severity={c.severity} />
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                    <span className="text-xs text-muted-foreground">{c.department}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
