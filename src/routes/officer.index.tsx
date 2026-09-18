import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ArrowRight, Copy, Camera } from "lucide-react";
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
import { useComplaints, useSession } from "@/lib/civic/store";
import { ZONES } from "@/lib/civic/types";

export const Route = createFileRoute("/officer/")({
  head: () => ({
    meta: [
      { title: "Complaint inbox — CivicFlow officer" },
      {
        name: "description",
        content: "Citizen submissions awaiting verification, ranked by priority.",
      },
      { property: "og:title", content: "Complaint inbox — CivicFlow officer" },
      {
        property: "og:description",
        content: "Citizen submissions awaiting verification, ranked by priority.",
      },
    ],
  }),
  component: OfficerQueue,
});

function OfficerQueue() {
  const session = useSession();
  const all = useComplaints();
  const [zone, setZone] = useState<string>("all");
  const [q, setQ] = useState("");

  const queue = all
    .filter((c) => (zone === "all" ? true : c.zone === zone))
    .filter((c) =>
      q ? `${c.title} ${c.ticket} ${c.address}`.toLowerCase().includes(q.toLowerCase()) : true,
    )
    .sort((a, b) => b.priorityScore - a.priorityScore);

  const pending = queue.filter(
    (c) => c.status === "awaiting_validation" || c.status === "triaging",
  );
  const critical = queue.filter((c) => c.severity === "critical" && c.status !== "resolved");
  const breaching = queue.filter(
    (c) => c.status !== "resolved" && Date.now() - c.createdAt > c.slaHours * 3600_000,
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["Awaiting validation", pending.length, "text-high"],
          ["Critical open", critical.length, "text-critical"],
          ["SLA breached", breaching.length, "text-destructive"],
          [
            "Resolved this week",
            all.filter((c) => c.status === "resolved").length,
            "text-resolved",
          ],
        ].map(([label, value, tone]) => (
          <Card key={String(label)}>
            <CardContent className="p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className={`font-display text-3xl font-bold tabular-nums ${tone}`}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
        <Input
          placeholder="Search ticket, title or street"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={zone} onValueChange={setZone}>
          <SelectTrigger className="sm:w-60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All zones</SelectItem>
            {ZONES.map((z) => (
              <SelectItem key={z} value={z}>
                {z}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {queue.map((c) => {
          const overdue =
            c.status !== "resolved" && Date.now() - c.createdAt > c.slaHours * 3600_000;
          return (
            <Link key={c.ticket} to="/officer/validate/$ticket" params={{ ticket: c.ticket }}>
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
                        {c.ticket}
                      </span>
                      <SeverityBadge severity={c.severity} />
                      <StatusBadge status={c.status} />
                      {c.duplicateOfTicket && (
                        <span className="inline-flex items-center gap-1 rounded-sm border bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
                          <Copy className="size-3" /> dup {c.duplicateOfTicket}
                        </span>
                      )}
                      {c.photoUrl && <Camera className="size-3.5 text-muted-foreground" />}
                      {overdue && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase text-destructive">
                          <AlertTriangle className="size-3" /> SLA breached
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate font-medium">{c.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {c.department} · {c.zone} · {c.reportCount} report(s) · {timeAgo(c.createdAt)}
                    </p>
                  </div>
                  <PriorityMeter score={c.priorityScore} />
                  <ArrowRight className="size-4 text-muted-foreground" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Signed in as {session?.name} · {session?.department ?? "Roads"} ·{" "}
        {session?.zone ?? "all zones"}
      </p>
    </div>
  );
}
