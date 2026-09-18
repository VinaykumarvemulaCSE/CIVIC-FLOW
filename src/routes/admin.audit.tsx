import { createFileRoute } from "@tanstack/react-router";
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
import { useAudit, useLiveTick } from "@/lib/civic/store";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit log — CivicFlow admin" },
      {
        name: "description",
        content: "Every triage decision, verification, rejection, assignment and admin action.",
      },
      { property: "og:title", content: "Audit log — CivicFlow admin" },
      {
        property: "og:description",
        content: "A full accountability trail of automated and human decisions.",
      },
    ],
  }),
  component: AdminAudit,
});

function AdminAudit() {
  useLiveTick();
  const audit = useAudit();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");

  const rows = audit
    .filter((a) => (role === "all" ? true : a.actorRole === role))
    .filter((a) =>
      q.trim()
        ? `${a.actor} ${a.action} ${a.targetId} ${a.metadata ?? ""}`
            .toLowerCase()
            .includes(q.trim().toLowerCase())
        : true,
    );

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="grid gap-2 p-5 sm:grid-cols-[2fr_1fr]">
          <Input
            placeholder="Search actor, action or ID"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actors</SelectItem>
              <SelectItem value="agent">Automation agents</SelectItem>
              <SelectItem value="officer">Officers</SelectItem>
              <SelectItem value="citizen">Citizens</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {rows.map((a, idx) => (
              <div key={`${a.at}-${idx}`} className="flex flex-wrap gap-2 p-4 text-sm">
                <span className="w-40 shrink-0 text-xs text-muted-foreground">
                  {new Date(a.at).toLocaleString()}
                </span>
                <span className="rounded-sm border bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                  {a.actorRole}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{a.action}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {a.actor} · {a.targetType} {a.targetId}
                  </span>
                  {a.metadata && (
                    <span className="block text-xs text-muted-foreground">{a.metadata}</span>
                  )}
                </span>
              </div>
            ))}
            {rows.length === 0 && (
              <p className="p-10 text-center text-sm text-muted-foreground">
                No audit entries match this filter yet.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
