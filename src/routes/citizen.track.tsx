import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ComplaintDetail } from "@/components/civic/complaint-detail";
import {
  complaintsForIssue,
  findByTicket,
  findIssue,
  useComplaints,
  useIssues,
} from "@/lib/civic/store";
import { SeverityBadge, StatusBadge } from "@/components/civic/badges";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/citizen/track")({
  head: () => ({
    meta: [
      { title: "Track a report — CivicFlow AI" },
      {
        name: "description",
        content: "Look up any complaint or issue ID and follow it end to end.",
      },
      { property: "og:title", content: "Track a report — CivicFlow AI" },
      {
        property: "og:description",
        content: "Look up any complaint or issue ID and follow it end to end.",
      },
    ],
  }),
  component: TrackPage,
});

function TrackPage() {
  const complaints = useComplaints();
  useIssues();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const found = submitted ? findByTicket(complaints, submitted) : undefined;
  const issue = submitted ? findIssue(submitted) : undefined;
  const issueReports = issue ? complaintsForIssue(issue.issueId) : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5">
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(query);
            }}
          >
            <Input
              placeholder="Complaint ID (CT-9F2K1) or issue ID (ISSUE-00123)"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
              className="font-mono"
            />
            <Button type="submit">
              <Search className="size-4" /> Track
            </Button>
          </form>
          <p className="mt-2 text-xs text-muted-foreground">
            Any citizen can track any ticket — transparency is intentional. Personal contact details
            stay hidden.
          </p>
        </CardContent>
      </Card>

      {issue && (
        <Card>
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm font-bold tracking-widest text-muted-foreground">
                {issue.issueId}
              </span>
              <StatusBadge status={issue.status} />
              <SeverityBadge severity={issue.severity} />
            </div>
            <h2 className="font-display text-2xl font-bold">{issue.title}</h2>
            <p className="text-sm text-muted-foreground">
              {issue.address} · {issue.zone} · {issue.department} · {issue.reportCount} report(s)
            </p>
            <div className="space-y-2">
              {issueReports.map((r) => (
                <Link
                  key={r.ticket}
                  to="/citizen/complaint/$ticket"
                  params={{ ticket: r.ticket }}
                  className="flex items-center gap-2 rounded-md border p-2 text-sm hover:border-accent"
                >
                  <span className="font-mono text-xs">{r.ticket}</span>
                  <span className="min-w-0 flex-1 truncate">{r.title}</span>
                  <StatusBadge status={r.status} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {submitted && !found && !issue && (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No complaint found for <span className="font-semibold">{submitted}</span>. Check the ID
            and try again.
          </CardContent>
        </Card>
      )}
      {found && <ComplaintDetail complaint={found} citizenView />}
    </div>
  );
}
