import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IssueMap } from "@/components/civic/issue-map";
import { PriorityMeter, SeverityBadge, StatusBadge } from "@/components/civic/badges";
import { useIssues, useLiveTick, useSession } from "@/lib/civic/store";
import {
  CATEGORY_LABEL,
  OPEN_STATUSES,
  ZONES,
  type Category,
  type Severity,
} from "@/lib/civic/types";

export const Route = createFileRoute("/officer/map")({
  head: () => ({
    meta: [
      { title: "Issue map — CivicFlow officer" },
      {
        name: "description",
        content: "Live street map of every open infrastructure issue, coloured by severity.",
      },
      { property: "og:title", content: "Issue map — CivicFlow officer" },
      {
        property: "og:description",
        content: "Filter issues by ward, category, severity and status on a real street map.",
      },
    ],
  }),
  component: OfficerMap,
});

const CATEGORIES: Category[] = [
  "pothole",
  "streetlight",
  "water_leakage",
  "garbage",
  "drainage",
  "traffic_signal",
  "other",
];
const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

function OfficerMap() {
  useLiveTick();
  const session = useSession();
  const all = useIssues();
  const [zone, setZone] = useState("all");
  const [category, setCategory] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("open");
  const [selected, setSelected] = useState<string | undefined>();

  const pinned = all
    .filter((i) => (session?.department ? i.department === session.department : true))
    .filter((i) => (zone === "all" ? true : i.zone === zone))
    .filter((i) => (category === "all" ? true : i.category === category))
    .filter((i) => (severity === "all" ? true : i.severity === severity))
    .filter((i) =>
      status === "all"
        ? true
        : status === "open"
          ? OPEN_STATUSES.includes(i.status)
          : i.status === status,
    );

  const active = pinned.find((i) => i.issueId === selected);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div>
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">
              Live issue map
            </h2>
            <p className="text-xs text-muted-foreground">
              {pinned.length} issue(s) pinned · colour follows severity, the number shows repeat
              reports
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <Select value={zone} onValueChange={setZone}>
              <SelectTrigger>
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
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open work</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <IssueMap issues={pinned} selected={selected} onSelect={setSelected} />
        </CardContent>
      </Card>

      <Card className="self-start">
        <CardContent className="space-y-3 p-5">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">Pin details</h2>
          {active ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-xs font-bold tracking-widest text-muted-foreground">
                  {active.issueId}
                </span>
                <SeverityBadge severity={active.severity} />
                <StatusBadge status={active.status} />
              </div>
              <p className="font-medium">{active.title}</p>
              <p className="text-sm text-muted-foreground">{active.address}</p>
              <PriorityMeter score={active.priorityScore} />
              <p className="text-xs text-muted-foreground">
                {active.department} · {active.zone} · {active.reportCount} report(s) · safety{" "}
                {active.safetyRisk.toUpperCase()}
              </p>
              <Button asChild size="sm" className="w-full">
                <Link to="/officer/issue/$issueId" params={{ issueId: active.issueId }}>
                  Open issue
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a pin to see the issue. Red is critical, amber high, yellow medium, green
              resolved.
            </p>
          )}

          <div className="mt-4 space-y-2 border-t pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Pinned issues
            </p>
            {pinned.map((i) => (
              <button
                key={i.issueId}
                onClick={() => setSelected(i.issueId)}
                className="flex w-full items-center gap-2 rounded-md border p-2 text-left text-sm hover:border-accent"
              >
                <SeverityBadge severity={i.severity} />
                <span className="min-w-0 flex-1 truncate">{i.title}</span>
                <span className="text-xs text-muted-foreground">×{i.reportCount}</span>
              </button>
            ))}
            {pinned.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Nothing pinned with these filters yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
