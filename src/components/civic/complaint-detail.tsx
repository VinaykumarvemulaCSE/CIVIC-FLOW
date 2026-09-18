import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Mail, MapPin, Clock, UserCheck, Layers, Star, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { AgentTimeline } from "@/components/civic/agent-timeline";
import { PriorityMeter, SeverityBadge, StatusBadge } from "@/components/civic/badges";
import { rateComplaint, reopenComplaint } from "@/lib/civic/store";
import { CATEGORY_LABEL, type Complaint } from "@/lib/civic/types";

export function timeAgo(at: number) {
  const mins = Math.round((Date.now() - at) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

/** Time left against the response window, or how long it is overdue. */
export function slaText(c: Complaint) {
  const deadline = c.createdAt + c.slaHours * 3600_000;
  const diff = deadline - Date.now();
  const hours = Math.round(Math.abs(diff) / 3600_000);
  if (diff > 0) return { text: `${hours} h left of ${c.slaHours} h`, breached: false };
  return { text: `${hours} h past the ${c.slaHours} h window`, breached: true };
}

function CitizenFeedback({ complaint }: { complaint: Complaint }) {
  const [note, setNote] = useState("");
  const [stars, setStars] = useState(complaint.citizenRating ?? 0);

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h3 className="font-display text-base font-bold uppercase tracking-wide">Your feedback</h3>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Rate ${n} out of 5`}
              onClick={() => {
                setStars(n);
                rateComplaint(complaint.ticket, n, note || undefined);
                toast.success("Thanks — your rating was recorded.");
              }}
            >
              <Star
                className={
                  n <= stars ? "size-6 fill-accent text-accent" : "size-6 text-muted-foreground"
                }
              />
            </button>
          ))}
        </div>
        <Textarea
          rows={3}
          placeholder="Is the problem actually fixed? Anything still pending?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button
          variant="outline"
          className="w-full"
          onClick={() => {
            if (note.trim().length < 10) {
              toast.error("Tell us briefly what is still wrong.");
              return;
            }
            reopenComplaint(complaint.ticket, note.trim());
            setNote("");
            toast.success("Reopened — an officer will look at it again.");
          }}
        >
          Reopen this issue
        </Button>
      </CardContent>
    </Card>
  );
}

export function ComplaintDetail({
  complaint,
  citizenView = false,
}: {
  complaint: Complaint;
  citizenView?: boolean;
}) {
  const c = complaint;
  const sla = slaText(c);
  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm font-bold tracking-widest text-muted-foreground">
                {c.ticket}
              </span>
              <StatusBadge status={c.status} />
              <SeverityBadge severity={c.severity} />
              {c.issueId && (
                <span className="inline-flex items-center gap-1 rounded-sm border bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                  <Layers className="size-3" /> {c.issueId}
                </span>
              )}
              {c.duplicateOfTicket && (
                <span className="inline-flex items-center gap-1 rounded-sm border bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                  <Copy className="size-3" /> linked to {c.duplicateOfTicket}
                </span>
              )}
            </div>
            <h2 className="mt-3 font-display text-2xl font-bold">{c.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{c.description}</p>

            {c.photoUrl && (
              <img
                src={c.photoUrl}
                alt="Reported issue"
                className="mt-4 max-h-72 w-full rounded-md border object-cover"
              />
            )}

            {c.infoRequest && (
              <div className="mt-4 flex items-start gap-2 rounded-md border border-medium/40 bg-medium/10 p-3 text-sm">
                <Info className="mt-0.5 size-4 text-medium" />
                <div>
                  <p className="font-semibold">More information requested</p>
                  <p className="text-muted-foreground">{c.infoRequest}</p>
                </div>
              </div>
            )}

            <Separator className="my-4" />
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Category</dt>
                <dd className="font-medium">{CATEGORY_LABEL[c.category]}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Department
                </dt>
                <dd className="font-medium">{c.department}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Location</dt>
                <dd className="flex items-start gap-1 font-medium">
                  <MapPin className="mt-0.5 size-3.5 text-accent" /> {c.address}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Zone</dt>
                <dd className="font-medium">{c.zone}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Safety risk
                </dt>
                <dd className="font-medium uppercase">{c.safetyRisk}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Priority</dt>
                <dd>
                  <PriorityMeter score={c.priorityScore} />
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Response window
                </dt>
                <dd
                  className={`flex items-center gap-1 font-medium ${sla.breached && c.status !== "resolved" ? "text-destructive" : ""}`}
                >
                  <Clock className="size-3.5 text-accent" />{" "}
                  {c.status === "resolved" ? `${c.slaHours} h target` : sla.text}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Reports on this issue
                </dt>
                <dd className="font-medium">{c.reportCount}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Assigned officer
                </dt>
                <dd className="flex items-center gap-1 font-medium">
                  <UserCheck className="size-3.5 text-accent" />{" "}
                  {c.officerName ?? "Pending assignment"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                  Emails triggered
                </dt>
                <dd className="flex items-center gap-1 font-medium">
                  <Mail className="size-3.5 text-accent" /> {c.emailsSent}
                </dd>
              </div>
            </dl>

            {!citizenView && c.priorityReasons.length > 0 && (
              <div className="mt-4 rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Why priority = {c.priorityScore}?
                </p>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {c.priorityReasons.map((r) => (
                    <li key={r}>· {r}</li>
                  ))}
                </ul>
              </div>
            )}

            {(c.resolutionNote || c.resolutionPhotoUrl) && (
              <div className="mt-4 rounded-md border border-resolved/40 bg-resolved/10 p-3 text-sm">
                <p className="font-semibold text-resolved">Resolution</p>
                {c.resolutionNote && <p className="text-muted-foreground">{c.resolutionNote}</p>}
                {c.resolutionPhotoUrl && (
                  <img
                    src={c.resolutionPhotoUrl}
                    alt="After the repair"
                    className="mt-3 max-h-60 w-full rounded-md border object-cover"
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h3 className="font-display text-base font-bold uppercase tracking-wide">
              Activity timeline
            </h3>
            <ol className="mt-4 space-y-3 border-l border-dashed pl-5">
              {[...c.timeline].reverse().map((e, i) => (
                <li key={`${e.at}-${i}`} className="relative">
                  <span className="absolute -left-[23px] mt-1.5 size-2 rounded-full bg-accent" />
                  <p className="text-sm font-medium">{e.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.actor} · {timeAgo(e.at)}
                    {e.note ? ` · ${e.note}` : ""}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="self-start">
          <CardContent className="p-5">
            <h3 className="font-display text-base font-bold uppercase tracking-wide">
              Agent chain
            </h3>
            <p className="mb-4 text-xs text-muted-foreground">
              Automated triage findings on this complaint.
            </p>
            <AgentTimeline agents={c.agents} />
            {c.issueId && !citizenView && (
              <Button asChild variant="outline" size="sm" className="mt-4 w-full">
                <Link to="/officer/issue/$issueId" params={{ issueId: c.issueId }}>
                  Open work item {c.issueId}
                </Link>
              </Button>
            )}
            {citizenView && (
              <p className="mt-5 text-xs text-muted-foreground">
                Others reported this too? Every report on the same problem is counted together.{" "}
                <Link to="/citizen/track" className="underline">
                  Track another ticket
                </Link>
              </p>
            )}
          </CardContent>
        </Card>

        {citizenView && c.status === "resolved" && <CitizenFeedback complaint={c} />}
      </div>
    </div>
  );
}
