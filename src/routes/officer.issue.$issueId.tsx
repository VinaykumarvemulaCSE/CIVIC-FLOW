import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Layers, MapPin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { IssueMap } from "@/components/civic/issue-map";
import { PriorityMeter, SeverityBadge, StatusBadge } from "@/components/civic/badges";
import { AgentTimeline } from "@/components/civic/agent-timeline";
import { timeAgo } from "@/components/civic/complaint-detail";
import {
  complaintsForIssue,
  findIssue,
  officerAction,
  useIssues,
  useLiveTick,
  useSession,
} from "@/lib/civic/store";
import { CATEGORY_LABEL, STATUS_LABEL } from "@/lib/civic/types";

export const Route = createFileRoute("/officer/issue/$issueId")({
  head: () => ({
    meta: [
      { title: "Issue detail — CivicFlow officer" },
      {
        name: "description",
        content: "One real-world issue, every citizen report behind it, and the work actions.",
      },
      { property: "og:title", content: "Issue detail — CivicFlow officer" },
      {
        property: "og:description",
        content: "Assign, progress and resolve a clustered infrastructure issue.",
      },
    ],
  }),
  component: IssuePage,
});

function IssuePage() {
  const { issueId } = Route.useParams();
  useIssues();
  useLiveTick();
  const session = useSession();
  const navigate = useNavigate();
  const issue = findIssue(issueId);
  const [note, setNote] = useState("");
  const [resolutionPhoto, setResolutionPhoto] = useState<string | undefined>();

  if (!issue) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Issue {issueId} not found.
        </CardContent>
      </Card>
    );
  }

  const linked = complaintsForIssue(issue.issueId);
  const officer = session?.name ?? "Officer";

  function act(action: "assign" | "start" | "resolve" | "email", message: string) {
    // The issue is the work item, so every linked complaint moves with it.
    linked.forEach((c) =>
      officerAction(c.ticket, officer, action, {
        ...(note ? { note } : {}),
        ...(action === "resolve" && resolutionPhoto ? { resolutionPhotoUrl: resolutionPhoto } : {}),
      }),
    );
    toast.success(message);
    setNote("");
  }

  async function pickResolutionPhoto(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setResolutionPhoto(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm font-bold tracking-widest text-muted-foreground">
                {issue.issueId}
              </span>
              <StatusBadge status={issue.status} />
              <SeverityBadge severity={issue.severity} />
              <span className="inline-flex items-center gap-1 rounded-sm border bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                <Layers className="size-3" /> {issue.reportCount} report(s)
              </span>
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold">{issue.title}</h2>
            {issue.aiSummary && (
              <p className="mt-2 text-sm text-muted-foreground">{issue.aiSummary}</p>
            )}

            <Separator className="my-4" />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Category</dt>
                <dd className="font-medium">{CATEGORY_LABEL[issue.category]}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Department
                </dt>
                <dd className="font-medium">
                  {issue.department} · {issue.zone}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Location</dt>
                <dd className="flex items-start gap-1 font-medium">
                  <MapPin className="mt-0.5 size-3.5 text-accent" /> {issue.address}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Safety risk
                </dt>
                <dd className="font-medium uppercase">{issue.safetyRisk}</dd>
              </div>
            </dl>

            <div className="mt-4 rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Why priority = {issue.priorityScore}?
                </p>
                <PriorityMeter score={issue.priorityScore} />
              </div>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {issue.priorityReasons.map((r) => (
                  <li key={r}>· {r}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <h3 className="font-display text-base font-bold uppercase tracking-wide">
              Location on map
            </h3>
            <IssueMap issues={[issue]} height={280} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-display text-base font-bold uppercase tracking-wide">
              Citizen reports ({linked.length})
            </h3>
            <div className="mt-3 space-y-2">
              {linked.map((c) => (
                <Link key={c.ticket} to="/officer/validate/$ticket" params={{ ticket: c.ticket }}>
                  <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm hover:border-accent">
                    <span className="font-display text-xs font-bold tracking-widest text-muted-foreground">
                      {c.ticket}
                    </span>
                    <StatusBadge status={c.status} />
                    <span className="min-w-0 flex-1 truncate">{c.title}</span>
                    <span className="text-xs text-muted-foreground">{timeAgo(c.createdAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {linked
                .filter((c) => c.photoUrl)
                .map((c) => (
                  <img
                    key={c.ticket}
                    src={c.photoUrl}
                    alt={`Evidence from ${c.ticket}`}
                    className="size-24 rounded-md border object-cover"
                  />
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="self-start">
          <CardContent className="space-y-3 p-5">
            <h3 className="font-display text-base font-bold uppercase tracking-wide">
              Work actions
            </h3>
            <p className="text-xs text-muted-foreground">
              Current state: {STATUS_LABEL[issue.status]}
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="note">Note (added to the citizen timeline)</Label>
              <Textarea
                id="note"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Crew 4 dispatched, patching scheduled tonight."
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rphoto">Resolution photo (on completion)</Label>
              <input
                id="rphoto"
                type="file"
                accept="image/*"
                className="block w-full text-xs"
                onChange={(e) => void pickResolutionPhoto(e.target.files?.[0])}
              />
              {resolutionPhoto && (
                <img
                  src={resolutionPhoto}
                  alt="Resolution"
                  className="mt-2 max-h-40 w-full rounded-md border object-cover"
                />
              )}
            </div>
            <div className="grid gap-2">
              <Button onClick={() => act("assign", "Issue assigned")}>Assign to crew</Button>
              <Button variant="secondary" onClick={() => act("start", "Work started")}>
                Mark in progress
              </Button>
              <Button variant="secondary" onClick={() => act("resolve", "Issue resolved")}>
                Mark resolved
              </Button>
              <Button variant="outline" onClick={() => act("email", "Update email triggered")}>
                <Mail className="mr-1 size-4" /> Notify citizens
              </Button>
              <Button variant="ghost" onClick={() => void navigate({ to: "/officer/issues" })}>
                Back to work items
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="self-start">
          <CardContent className="p-5">
            <h3 className="font-display text-base font-bold uppercase tracking-wide">
              Agent findings
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              From the first report on this issue.
            </p>
            <AgentTimeline agents={linked[0]?.agents ?? []} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
