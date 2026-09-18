import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ComplaintDetail } from "@/components/civic/complaint-detail";
import { findByTicket, useComplaints } from "@/lib/civic/store";

export const Route = createFileRoute("/citizen/complaint/$ticket")({
  head: () => ({
    meta: [
      { title: "Report details — CivicFlow AI" },
      {
        name: "description",
        content: "Follow the triage steps, officer actions and the final fix for your report.",
      },
      { property: "og:title", content: "Report details — CivicFlow AI" },
      {
        property: "og:description",
        content: "Follow the triage steps, officer actions and the final fix for your report.",
      },
    ],
  }),
  component: CitizenComplaint,
});

function CitizenComplaint() {
  const { ticket } = Route.useParams();
  const complaints = useComplaints();
  const complaint = findByTicket(complaints, ticket);

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/citizen/history">
          <ArrowLeft className="size-4" /> Back to my submissions
        </Link>
      </Button>
      {complaint ? (
        <ComplaintDetail complaint={complaint} citizenView />
      ) : (
        <Card>
          <CardContent className="p-10 text-center text-sm text-muted-foreground">
            No complaint found for ticket <span className="font-semibold">{ticket}</span>.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
