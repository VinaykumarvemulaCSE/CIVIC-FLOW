import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ArrowRight, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PriorityMeter, SeverityBadge, StatusBadge } from "@/components/civic/badges";
import { timeAgo } from "@/components/civic/complaint-detail";
import { useIssues, useLiveTick, useSession } from "@/lib/civic/store";
import { CATEGORY_LABEL, OPEN_STATUSES, ZONES, type Issue } from "@/lib/civic/types";

export const Route = createFileRoute("/officer/issues")({
  head: () => ({
    meta: [
      { title: "Work items — CivicFlow officer" },
      {
        name: "description",
        content: "Real-world issues clustered from citizen complaints, ranked by priority.",
      },
      { property: "og:title", content: "Work items — CivicFlow officer" },
      {
        property: "og:description",
        content: "Every issue in your department, ranked by safety, severity and repeat reports.",
      },
    ],
  }),
  component: OfficerIssues,
});

export function isBreached(issue: Issue, slaHours: number) {
  return (
    OPEN_STATUSES.includes(issue.status) && Date.now() - issue.firstReportedAt > slaHours * 3600_000
  );
}

function OfficerIssues() {
  useLiveTick();
  const session = useSession();
  const all = useIssues();
  const [zone, setZone] = useState("all");
  const [status, setStatus] = useState("open");
  const [q, setQ] = useState("");

  // An officer only ever sees their own department's work.
  const mine = all.filter((i) =>
    session?.department ? i.department === session.department : true,
  );

  const list = mine
    .filter((i) => (zone === "all" ? true : i.zone === zone))
    .filter((i) =>
      status === "all"
        ? true
        : status === "open"
          ? OPEN_STATUSES.includes(i.status)
          : i.status === status,
    )
    .filter((i) =>
      q ? `${i.title} ${i.issueId} ${i.address}`.toLowerCase().includes(q.toLowerCase()) : true,
    )
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const stats = [
    [
      "Pending verification",
      mine.filter((i) => i.status === "awaiting_validation").length,
      "text-high",
    ],
    [
      "High priority",
      mine.filter((i) => i.priorityScore >= 75 && OPEN_STATUSES.includes(i.status)).length,
      "text-critical",
    ],
    [
      "Critical issues",
      mine.filter((i) => i.severity === "critical" && OPEN_STATUSES.includes(i.status)).length,
      "text-critical",
    ],
    [
      "Resolved today",
      mine.filter((i) => i.status === "resolved" && Date.now() - i.updatedAt < 24 * 3600_000)
        .length,
      "text-resolved",
    ],
  ] as const;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {stats.map(([label, value, tone]) => (
          <Card key={label}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className={`font-display text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input
          placeholder="Search issue ID, title or street"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open work</SelectItem>
            <SelectItem value="awaiting_validation">Pending verification</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Select value={zone} onValueChange={setZone}>
          <SelectTrigger className="sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All wards</SelectItem>
            {ZONES.map((z) => (
              <SelectItem key={z} value={z}>
                {z}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {list.map((issue) => {
          const overdue = isBreached(issue, issue.severity === "critical" ? 4 : 24);
          return (
            <Link
              key={issue.issueId}
              to="/officer/issue/$issueId"
              params={{ issueId: issue.issueId }}
            >
              <Card
                className={
                  overdue
                    ? "border-destructive/40 transition-colors hover:border-accent"
                    : "transition-colors hover:border-accent"
                }
              >
                <CardContent className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-xs font-bold tracking-widest text-muted-foreground">
                        {issue.issueId}
                      </span>
                      <SeverityBadge severity={issue.severity} />
                      <StatusBadge status={issue.status} />
                      {issue.reportCount > 1 && (
                        <span className="inline-flex items-center gap-1 rounded-sm border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                          <Layers className="size-3" /> {issue.reportCount} reports
                        </span>
                      )}
                      {overdue && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-destructive">
                          <AlertTriangle className="size-3" /> overdue
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate font-medium">{issue.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {CATEGORY_LABEL[issue.category]} · {issue.zone} · safety{" "}
                      {issue.safetyRisk.toUpperCase()} · first reported{" "}
                      {timeAgo(issue.firstReportedAt)}
                    </p>
                  </div>
                  <PriorityMeter score={issue.priorityScore} />
                  <ArrowRight className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
        {list.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              No issues match these filters.
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {session?.department ?? "all"} department work · {mine.length} issue(s) on record.
      </p>
    </div>
  );
}
