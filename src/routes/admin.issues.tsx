import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Layers } from "lucide-react";
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
import { useIssues, useLiveTick } from "@/lib/civic/store";
import { CATEGORY_LABEL, DEPARTMENTS, ZONES } from "@/lib/civic/types";

export const Route = createFileRoute("/admin/issues")({
  head: () => ({
    meta: [
      { title: "All issues — CivicFlow admin" },
      {
        name: "description",
        content: "Every real-world infrastructure issue across all departments and wards.",
      },
      { property: "og:title", content: "All issues — CivicFlow admin" },
      {
        property: "og:description",
        content: "Repeat-report hotspots, priority scores and department load in one list.",
      },
    ],
  }),
  component: AdminIssues,
});

function AdminIssues() {
  useLiveTick();
  const issues = useIssues();
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");
  const [zone, setZone] = useState("all");

  const rows = issues
    .filter((i) => (dept === "all" ? true : i.department === dept))
    .filter((i) => (zone === "all" ? true : i.zone === zone))
    .filter((i) =>
      q.trim()
        ? `${i.issueId} ${i.title} ${i.address}`.toLowerCase().includes(q.trim().toLowerCase())
        : true,
    )
    .sort((a, b) => b.priorityScore - a.priorityScore);

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-2 p-5 sm:grid-cols-3">
          <Input
            placeholder="Search issue ID, title or street"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {DEPARTMENTS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
        </CardContent>
      </Card>

      <div className="space-y-2">
        {rows.map((i) => (
          <Link
            key={i.issueId}
            to="/officer/issue/$issueId"
            params={{ issueId: i.issueId }}
            className="block rounded-lg border bg-card p-4 transition hover:border-accent"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-xs font-bold tracking-widest text-muted-foreground">
                {i.issueId}
              </span>
              <StatusBadge status={i.status} />
              <SeverityBadge severity={i.severity} />
              <span className="inline-flex items-center gap-1 rounded-sm border bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                <Layers className="size-3" /> {i.reportCount} report(s)
              </span>
            </div>
            <p className="mt-2 font-medium">{i.title}</p>
            <p className="text-xs text-muted-foreground">
              {CATEGORY_LABEL[i.category]} · {i.department} · {i.zone} · {i.address} · safety{" "}
              {i.safetyRisk.toUpperCase()}
            </p>
            <div className="mt-2 max-w-xs">
              <PriorityMeter score={i.priorityScore} />
            </div>
          </Link>
        ))}
        {rows.length === 0 && (
          <Card>
            <CardContent className="p-10 text-center text-sm text-muted-foreground">
              No issues match these filters.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
