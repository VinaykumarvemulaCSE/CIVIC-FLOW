import { createFileRoute, Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { PriorityMeter, SeverityBadge, StatusBadge } from "@/components/civic/badges";
import { useAudit, useComplaints, useIssues, useLiveTick } from "@/lib/civic/store";
import {
  CATEGORY_LABEL,
  CLOSED_STATUSES,
  DEPARTMENTS,
  OPEN_STATUSES,
  STATUS_LABEL,
  ZONES,
  type Category,
  type Complaint,
  type Severity,
} from "@/lib/civic/types";

export const Route = createFileRoute("/admin/analytics")({
  head: () => ({
    meta: [
      { title: "Analytics & AI monitoring — CivicFlow admin" },
      {
        name: "description",
        content:
          "Complaint volume, department load, severity mix, repeat hotspots and automation confidence.",
      },
      { property: "og:title", content: "Analytics & AI monitoring — CivicFlow admin" },
      {
        property: "og:description",
        content: "Track automation accuracy, human overrides and resolution speed city-wide.",
      },
    ],
  }),
  component: AdminAnalytics,
});

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div className="h-2 rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-bold">{value}</p>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function avgProcessingHours(complaints: Complaint[]) {
  const done = complaints.filter((c) => c.status === "resolved");
  if (done.length === 0) return 0;
  const total = done.reduce((sum, c) => {
    const last = c.timeline.at(-1)?.at ?? c.createdAt;
    return sum + (last - c.createdAt);
  }, 0);
  return Math.round(total / done.length / 3600_000);
}

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

function AdminAnalytics() {
  useLiveTick();
  const complaints = useComplaints();
  const issues = useIssues();
  const audit = useAudit();

  const open = complaints.filter((c) => OPEN_STATUSES.includes(c.status));
  const closed = complaints.filter((c) => CLOSED_STATUSES.includes(c.status));
  const critical = issues.filter((i) => i.severity === "critical");
  const analysed = complaints.filter((c) => c.vision);
  const overrides = audit.filter((a) => /overrid|Re-routed|Rejected/i.test(a.action));
  const confidences = complaints.map((c) => c.aiConfidence ?? 0).filter((n) => n > 0);
  const avgConfidence =
    confidences.length > 0
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
      : 0;

  const byCategory = (Object.keys(CATEGORY_LABEL) as Category[]).map((c) => ({
    label: CATEGORY_LABEL[c],
    value: complaints.filter((x) => x.category === c).length,
  }));
  const byDepartment = DEPARTMENTS.map((d) => ({
    label: d,
    value: issues.filter((i) => i.department === d).length,
  }));
  const byZone = ZONES.map((z) => ({
    label: z,
    value: issues.filter((i) => i.zone === z).length,
  }));
  const bySeverity = SEVERITIES.map((s) => ({
    label: s,
    value: complaints.filter((c) => c.severity === s).length,
  }));
  const byStatus = [...OPEN_STATUSES, ...CLOSED_STATUSES].map((s) => ({
    label: STATUS_LABEL[s],
    value: complaints.filter((c) => c.status === s).length,
  }));
  const max = (rows: { value: number }[]) => Math.max(1, ...rows.map((r) => r.value));

  const hotspots = [...issues].sort((a, b) => b.reportCount - a.reportCount).slice(0, 5);
  const duplicateClusters = issues.filter((i) => i.reportCount > 1);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Complaints" value={complaints.length} hint={`${issues.length} real issues`} />
        <Stat label="Open work" value={open.length} hint={`${closed.length} closed`} />
        <Stat label="Critical issues" value={critical.length} hint="Safety-led escalations" />
        <Stat
          label="Avg. processing"
          value={`${avgProcessingHours(complaints)} h`}
          hint="Submission to resolution"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-display text-base font-bold uppercase tracking-wide">
              Complaints by category
            </h2>
            {byCategory.map((r) => (
              <Bar key={r.label} {...r} max={max(byCategory)} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-display text-base font-bold uppercase tracking-wide">
              Issues by department
            </h2>
            {byDepartment.map((r) => (
              <Bar key={r.label} {...r} max={max(byDepartment)} />
            ))}
            <h2 className="pt-3 font-display text-base font-bold uppercase tracking-wide">
              Issues by ward
            </h2>
            {byZone.map((r) => (
              <Bar key={r.label} {...r} max={max(byZone)} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-display text-base font-bold uppercase tracking-wide">
              Severity distribution
            </h2>
            {bySeverity.map((r) => (
              <Bar key={r.label} {...r} max={max(bySeverity)} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-display text-base font-bold uppercase tracking-wide">
              Status distribution
            </h2>
            {byStatus.map((r) => (
              <Bar key={r.label} {...r} max={max(byStatus)} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-display text-base font-bold uppercase tracking-wide">
            Repeat-report hotspots
          </h2>
          <p className="text-xs text-muted-foreground">
            {duplicateClusters.length} issue(s) carry more than one citizen report — duplicates the
            automation collapsed.
          </p>
          <div className="space-y-2">
            {hotspots.map((i) => (
              <Link
                key={i.issueId}
                to="/officer/issue/$issueId"
                params={{ issueId: i.issueId }}
                className="block rounded-md border p-3 text-sm hover:border-accent"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs">{i.issueId}</span>
                  <SeverityBadge severity={i.severity} />
                  <StatusBadge status={i.status} />
                  <span className="text-xs text-muted-foreground">×{i.reportCount} reports</span>
                </div>
                <p className="mt-1 font-medium">{i.title}</p>
                <div className="mt-1 max-w-xs">
                  <PriorityMeter score={i.priorityScore} />
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-display text-base font-bold uppercase tracking-wide">
            AI monitoring
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Avg. confidence"
              value={`${avgConfidence}%`}
              hint="Across all triage runs"
            />
            <Stat label="Photos analysed" value={analysed.length} hint="Image analysis completed" />
            <Stat
              label="Human overrides"
              value={overrides.length}
              hint="Officers changed the call"
            />
          </div>
          <div className="divide-y rounded-md border">
            {complaints.slice(0, 12).map((c) => (
              <Link
                key={c.ticket}
                to="/officer/validate/$ticket"
                params={{ ticket: c.ticket }}
                className="flex flex-wrap items-center gap-2 p-3 text-sm hover:bg-muted/40"
              >
                <span className="font-mono text-xs">{c.ticket}</span>
                <SeverityBadge severity={c.severity} />
                <span className="min-w-0 flex-1 truncate">{c.aiSummary ?? c.title}</span>
                <span className="text-xs text-muted-foreground">
                  {c.department} · {Math.round((c.aiConfidence ?? 0) * 100)}% ·{" "}
                  {c.duplicate?.decision ?? "NO_MATCH"}
                </span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
