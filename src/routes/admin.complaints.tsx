import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SeverityBadge, StatusBadge } from "@/components/civic/badges";
import { useComplaints, useLiveTick } from "@/lib/civic/store";
import { STATUS_LABEL, ZONES, type ComplaintStatus } from "@/lib/civic/types";

export const Route = createFileRoute("/admin/complaints")({
  head: () => ({
    meta: [
      { title: "All complaints — CIVIC-FLOW admin" },
      {
        name: "description",
        content: "City-wide complaint register with severity, department and SLA status.",
      },
      { property: "og:title", content: "All complaints — CIVIC-FLOW admin" },
      {
        property: "og:description",
        content: "Every CIVIC-FLOW ticket across zones and departments in one register.",
      },
    ],
  }),
  component: AdminComplaints,
});

const STATUSES: ComplaintStatus[] = [
  "submitted",
  "triaging",
  "awaiting_validation",
  "validated",
  "in_progress",
  "resolved",
  "rejected",
  "duplicate",
];

function AdminComplaints() {
  useLiveTick();
  const complaints = useComplaints();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [zone, setZone] = useState("all");

  const rows = complaints
    .filter((c) => (status === "all" ? true : c.status === status))
    .filter((c) => (zone === "all" ? true : c.zone === zone))
    .filter((c) =>
      `${c.ticket} ${c.title} ${c.citizenName} ${c.address}`
        .toLowerCase()
        .includes(q.toLowerCase()),
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            placeholder="Search ticket, title, citizen…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="lg:col-span-2"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={zone} onValueChange={setZone}>
            <SelectTrigger>
              <SelectValue placeholder="Zone" />
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

        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Complaint</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Department</TableHead>
                <TableHead className="hidden lg:table-cell">Priority</TableHead>
                <TableHead className="text-right">Open</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((c) => {
                const breached =
                  c.status !== "resolved" && Date.now() - c.createdAt > c.slaHours * 3600_000;
                return (
                  <TableRow key={c.ticket}>
                    <TableCell className="font-mono text-xs">{c.ticket}</TableCell>
                    <TableCell>
                      <p className="flex items-center gap-1.5 font-medium">
                        {c.title}
                        {c.vision && <Camera className="size-3.5 text-accent" />}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.zone} · {c.citizenName}
                        {breached && <span className="ml-1 text-critical">· SLA breached</span>}
                      </p>
                    </TableCell>
                    <TableCell>
                      <SeverityBadge severity={c.severity} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="hidden text-sm md:table-cell">{c.department}</TableCell>
                    <TableCell className="hidden font-semibold tabular-nums lg:table-cell">
                      {c.priorityScore}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/officer/validate/$ticket" params={{ ticket: c.ticket }}>
                          <ExternalLink className="size-4" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {rows.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No complaints match these filters.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
