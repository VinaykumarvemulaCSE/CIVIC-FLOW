import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ComplaintDetail } from "@/components/civic/complaint-detail";
import { findByTicket, useComplaints } from "@/lib/civic/store";

export const Route = createFileRoute("/officer/track")({
  head: () => ({
    meta: [
      { title: "Track by ID — CivicFlow officer" },
      { name: "description", content: "Open any complaint or issue by its identifier." },
      { property: "og:title", content: "Track by ID — CivicFlow officer" },
      { property: "og:description", content: "Open any complaint or issue by its identifier." },
    ],
  }),
  component: OfficerTrack,
});

function OfficerTrack() {
  const complaints = useComplaints();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const found = submitted ? findByTicket(complaints, submitted) : undefined;

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
              className="font-mono"
              placeholder="Complaint ID, e.g. CT-9F2K1"
              value={query}
              onChange={(e) => setQuery(e.target.value.toUpperCase())}
            />
            <Button type="submit">
              <Search className="size-4" /> Open
            </Button>
          </form>
        </CardContent>
      </Card>
      {submitted && !found && (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            Nothing found for {submitted}.
          </CardContent>
        </Card>
      )}
      {found && (
        <>
          <Button asChild size="sm">
            <Link to="/officer/validate/$ticket" params={{ ticket: found.ticket }}>
              Take action on this complaint
            </Link>
          </Button>
          <ComplaintDetail complaint={found} />
        </>
      )}
    </div>
  );
}
