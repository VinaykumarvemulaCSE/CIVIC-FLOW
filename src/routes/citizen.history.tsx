import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
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
import {
  CATEGORY_LABEL,
  STATUS_LABEL,
  type Category,
  type ComplaintStatus,
} from "@/lib/civic/types";

export const Route = createFileRoute("/citizen/history")({
  head: () => ({
    meta: [
      { title: "My reports — CivicFlow AI" },
      {
        name: "description",
        content: "Every complaint you have submitted and where each one stands.",
      },
      { property: "og:title", content: "My reports — CivicFlow AI" },
      {
        property: "og:description",
        content: "Every complaint you have submitted and where each one stands.",
      },
    ],
  }),
  component: CitizenHistory,
});

function CitizenHistory() {
  const session = useSession();
  const all = useComplaints();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [category, setCategory] = useState<string>("all");

  const rows = all
    .filter((c) => c.citizenName === session?.name)
    .filter((c) => (status === "all" ? true : c.status === status))
    .filter((c) => (category === "all" ? true : c.category === category))
    .filter((c) =>
      q ? `${c.title} ${c.ticket} ${c.address}`.toLowerCase().includes(q.toLowerCase()) : true,
    );

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input
          placeholder="Search title, ticket or address"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(STATUS_LABEL) as ComplaintStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-52">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Nothing matches those filters yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
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
                      {CATEGORY_LABEL[c.category]} · {c.department} · {timeAgo(c.createdAt)}
                    </p>
                  </div>
                  <PriorityMeter score={c.priorityScore} />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
