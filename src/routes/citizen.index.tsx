import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PriorityMeter, SeverityBadge, StatusBadge } from "@/components/civic/badges";
import { timeAgo } from "@/components/civic/complaint-detail";
import { useComplaints, useSession } from "@/lib/civic/store";

export const Route = createFileRoute("/citizen/")({
  head: () => ({
    meta: [
      { title: "My dashboard — CivicFlow AI" },
      {
        name: "description",
        content: "See your reports, their status and the issues your city is fixing.",
      },
      { property: "og:title", content: "My dashboard — CivicFlow AI" },
      {
        property: "og:description",
        content: "See your reports, their status and the issues your city is fixing.",
      },
    ],
  }),
  component: CitizenOverview,
});

function CitizenOverview() {
  const session = useSession();
  const all = useComplaints();
  const mine = all.filter((c) => c.citizenName === session?.name);
  const open = mine.filter((c) => c.status !== "resolved" && c.status !== "rejected");
  const resolved = mine.filter((c) => c.status === "resolved");

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Open reports", open.length],
          ["Resolved", resolved.length],
          ["Total filed", mine.length],
          ["Community reports", all.length],
        ].map(([label, value]) => (
          <Card key={String(label)}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {mine.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
            <FilePlus2 className="size-8 text-accent" />
            <p className="font-display text-xl font-bold uppercase">No reports yet</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              Spotted a pothole, dark street or leaking pipe? File it and watch the agent chain
              triage it live.
            </p>
            <Button asChild>
              <Link to="/citizen/new">File your first complaint</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">
            Your active reports
          </h2>
          {mine.slice(0, 6).map((c) => (
            <Link key={c.ticket} to="/citizen/complaint/$ticket" params={{ ticket: c.ticket }}>
              <Card className="transition-colors hover:border-accent">
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-xs font-bold tracking-widest text-muted-foreground">
                        {c.ticket}
                      </span>
                      <StatusBadge status={c.status} />
                      <SeverityBadge severity={c.severity} />
                    </div>
                    <p className="mt-1 truncate font-medium">{c.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.department} · {c.zone} · {timeAgo(c.createdAt)}
                    </p>
                  </div>
                  <PriorityMeter score={c.priorityScore} />
                  <ArrowRight className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-5">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">
            Nearby in your ward
          </h2>
          <p className="text-xs text-muted-foreground">
            Reports from other citizens — if yours matches one of these, the duplicate agent will
            merge them.
          </p>
          <ul className="mt-3 divide-y">
            {all.slice(0, 5).map((c) => (
              <li key={c.ticket} className="flex items-center gap-3 py-2.5 text-sm">
                <SeverityBadge severity={c.severity} />
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
                <span className="hidden text-xs text-muted-foreground sm:block">
                  {c.reportCount} reports
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
