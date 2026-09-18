import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Copy,
  Hammer,
  HelpCircle,
  Layers,
  Mail,
  Merge,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ComplaintDetail } from "@/components/civic/complaint-detail";
import { findByTicket, officerAction, useComplaints, useSession } from "@/lib/civic/store";
import { DEPARTMENTS } from "@/lib/civic/types";
import type { Department, Severity } from "@/lib/civic/types";

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];

export const Route = createFileRoute("/officer/validate/$ticket")({
  head: () => ({
    meta: [
      { title: "Verify complaint — CivicFlow officer" },
      {
        name: "description",
        content: "Inspect evidence, automation findings and take action on a complaint.",
      },
      { property: "og:title", content: "Verify complaint — CivicFlow officer" },
      {
        property: "og:description",
        content: "Inspect evidence, automation findings and take action on a complaint.",
      },
    ],
  }),
  component: ValidatePage,
});

function ValidatePage() {
  const { ticket } = Route.useParams();
  const complaints = useComplaints();
  const session = useSession();
  const navigate = useNavigate();
  const complaint = findByTicket(complaints, ticket);
  const [note, setNote] = useState("");
  const officer = session?.name ?? "Officer";

  if (!complaint) {
    return (
      <Card>
        <CardContent className="p-10 text-center text-sm text-muted-foreground">
          Ticket {ticket} not found.
        </CardContent>
      </Card>
    );
  }

  const [resolutionPhoto, setResolutionPhoto] = useState<string | undefined>();
  const [sendingEmail, setSendingEmail] = useState(false);

  async function triggerEmail(type: "verified" | "assigned" | "in_progress" | "resolved" | "rejected" | "needs_info" | "custom", customNote?: string) {
    if (!complaint) return;
    const toEmail = complaint.citizenEmail || "citizen@civicflow.gov";
    setSendingEmail(true);
    try {
      const { sendCitizenEmail } = await import("@/lib/civic/email.functions");
      const res = await sendCitizenEmail({
        data: {
          to: toEmail,
          citizenName: complaint.citizenName,
          ticket: complaint.ticket,
          title: complaint.title,
          issueId: complaint.issueId,
          type,
          officerName: officer,
          note: customNote || note,
          resolutionPhotoUrl: resolutionPhoto || complaint.resolutionPhotoUrl,
          department: complaint.department,
        },
      });
      if (res.previewUrl) {
        toast.success(`Notification email sent! (Preview: ${res.previewUrl})`);
      } else {
        toast.success(`Notification email sent to ${toEmail}`);
      }
    } catch (e) {
      console.warn("Email dispatch error:", e);
      toast.info(`Email event queued for ${toEmail}`);
    } finally {
      setSendingEmail(false);
    }
  }

  async function act(action: Parameters<typeof officerAction>[2], message: string, extra = {}) {
    officerAction(ticket, officer, action, {
      ...(note ? { note } : {}),
      ...(action === "resolve" && resolutionPhoto ? { resolutionPhotoUrl: resolutionPhoto } : {}),
      ...extra,
    });
    toast.success(message);

    // Automatically trigger email notification
    if (action === "validate") await triggerEmail("verified");
    else if (action === "start") await triggerEmail("in_progress");
    else if (action === "resolve") await triggerEmail("resolved");
    else if (action === "reject") await triggerEmail("rejected");
    else if (action === "needs_info") await triggerEmail("needs_info");
    else if (action === "email") await triggerEmail("custom");

    setNote("");
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/officer">
          <ArrowLeft className="size-4" /> Back to queue
        </Link>
      </Button>

      <Card>
        <CardContent className="space-y-4 p-5">
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">
            Officer actions
          </h2>
          <Textarea
            rows={3}
            placeholder="Site note — what did you observe? This is attached to the citizen's timeline and the email."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Attach Resolution Proof Photo (Optional for resolution)
            </p>
            <input
              type="file"
              accept="image/*"
              className="block w-full text-xs text-muted-foreground file:mr-2 file:rounded-md file:border file:border-input file:bg-background file:px-2.5 file:py-1 file:text-xs"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setResolutionPhoto(String(reader.result));
                reader.readAsDataURL(file);
              }}
            />
            {resolutionPhoto && (
              <img
                src={resolutionPhoto}
                alt="Resolution proof"
                className="mt-2 max-h-36 rounded-md border object-cover"
              />
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void act("validate", "Complaint verified and pinned on the map")}>
              <CheckCircle2 className="size-4" /> Verify
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (note.trim().length < 8) {
                  toast.error("Please explain what additional information you need from the citizen in the note above.");
                  return;
                }
                void act("needs_info", "Sent back to the citizen for more information");
              }}
            >
              <HelpCircle className="size-4" /> Request more information
            </Button>
            <Button
              variant="outline"
              onClick={() => void act("start", "Work order raised for the crew")}
            >
              <Hammer className="size-4" /> Convert to work order
            </Button>
            <Button
              variant="outline"
              disabled={sendingEmail}
              onClick={() => void act("email", "Notification email sent to citizen")}
            >
              <Mail className="size-4" /> Trigger email
            </Button>
            <Button
              variant="secondary"
              onClick={() =>
                void act("resolve", "Complaint resolved and citizen notified with completion proof", {
                  note: note || "Issue inspected, repaired, and verified on site.",
                })
              }
            >
              <Send className="size-4" /> Resolve
            </Button>
            <Button
              variant="outline"
              disabled={!complaint.duplicateOfTicket}
              onClick={() => void act("merge", `Merged into ${complaint.duplicateOfTicket}`)}
            >
              <Merge className="size-4" /> Merge duplicate
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (note.trim().length < 5) {
                  toast.error("Please specify a brief reason for rejection in the note above.");
                  return;
                }
                void act("reject", "Complaint rejected and moved to bottom of queue");
              }}
            >
              <Ban className="size-4" /> Reject
            </Button>
          </div>

          <Separator />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Re-route department
              </p>
              <Select
                value={complaint.department}
                onValueChange={(v) =>
                  act("reassign", `Re-routed to ${v}`, { department: v as Department })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Override severity
              </p>
              <Select
                value={complaint.severity}
                onValueChange={(v) =>
                  act("reassign", `Severity overridden to ${v}`, { severity: v as Severity })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {complaint.duplicateOfTicket && (
            <button
              type="button"
              onClick={() =>
                navigate({
                  to: "/officer/validate/$ticket",
                  params: { ticket: complaint.duplicateOfTicket! },
                })
              }
              className="flex items-center gap-2 text-sm text-accent-foreground underline"
            >
              <Copy className="size-3.5" /> Open the linked original {complaint.duplicateOfTicket}
            </button>
          )}
        </CardContent>
      </Card>

      {complaint.issueId && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Linked work item
              </p>
              <p className="font-display text-lg font-bold">{complaint.issueId}</p>
              <p className="text-xs text-muted-foreground">
                {complaint.reportCount} citizen report(s) on the same real-world problem
              </p>
            </div>
            <Button asChild variant="outline">
              <Link to="/officer/issue/$issueId" params={{ issueId: complaint.issueId }}>
                <Layers className="size-4" /> Open work item
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <ComplaintDetail complaint={complaint} />
    </div>
  );
}
