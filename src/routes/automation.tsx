import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Copy, Gauge, PlugZap, Send, Workflow } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/civic/app-shell";
import { ADMIN_NAV } from "@/components/civic/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  callbackUrl,
  isN8nWired,
  saveAutomationConfig,
  useAutomationConfig,
  type EngineMode,
} from "@/lib/civic/integration";
import { useRules } from "@/lib/civic/rules";
import { triageEnvelope } from "@/lib/civic/agent-bus";
import { getComplaints } from "@/lib/civic/store";

export const Route = createFileRoute("/automation")({
  head: () => ({
    meta: [
      { title: "Automation console — CIVIC-FLOW" },
      {
        name: "description",
        content:
          "Wire the n8n triage workflow, agent callbacks and email webhook that power CIVIC-FLOW.",
      },
      { property: "og:title", content: "Automation console — CIVIC-FLOW" },
      {
        property: "og:description",
        content: "Connect n8n webhooks and the five triage agents to CIVIC-FLOW.",
      },
    ],
  }),
  component: AutomationPage,
});

const items = ADMIN_NAV;

const AGENT_CONTRACT: Array<[string, string, string]> = [
  ["review", "Reads text + photo, confirms the category", "category, output, confidence"],
  ["severity", "Scores danger to people and property", "severity, output, confidence"],
  ["routing", "Picks the owning department and SLA", "department, slaHours, output"],
  ["duplicate", "Compares against open tickets in the zone", "duplicateOfTicket, status: flagged"],
  ["priority", "Final queue score out of 100", "priorityScore, output"],
];

function CopyRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input readOnly value={value} className="font-mono text-xs" />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            void navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

function AutomationPage() {
  const cfg = useAutomationConfig();
  const rules = useRules();
  const [testing, setTesting] = useState(false);
  const wired = isN8nWired(cfg);

  async function testDispatch() {
    if (!wired) {
      toast.error("Paste the n8n triage webhook URL first.");
      return;
    }
    setTesting(true);
    const sample = getComplaints()[0];
    try {
      const res = await fetch("/api/public/n8n/dispatch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: cfg.triageWebhookUrl,
          ...(cfg.sharedSecret ? { secret: cfg.sharedSecret } : {}),
          payload: sample
            ? { ...triageEnvelope(sample), event: "connection.test" }
            : { event: "connection.test", ticket: "CT-TEST0" },
        }),
      });
      const json = (await res.json()) as { ok?: boolean; status?: number; error?: string };
      if (json.ok) toast.success(`n8n replied ${json.status ?? 200} — workflow reachable`);
      else toast.error(json.error ?? `n8n replied ${json.status ?? "error"}`);
    } catch {
      toast.error("Could not reach the workflow.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <AppShell
      role="admin"
      items={items}
      title="Automation console"
      subtitle="Connect the n8n agent workflow, callbacks and email sender"
    >
      <div className="space-y-5">
        <div
          className={`rounded-md border p-3 text-sm ${
            wired ? "border-resolved/40 bg-resolved/10" : "border-accent/40 bg-accent/10"
          }`}
        >
          {wired
            ? "Wired. New complaints trigger the n8n workflow and wait for agent callbacks."
            : "Not wired yet. Complaints run on the built-in rule engine until you paste a webhook URL."}
        </div>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">
              n8n connection
            </h2>
            <div className="space-y-1.5">
              <Label htmlFor="hook">Triage webhook URL (Production URL from n8n)</Label>
              <Input
                id="hook"
                placeholder="https://your-n8n-host/webhook/civic-triage"
                value={cfg.triageWebhookUrl}
                onChange={(e) => saveAutomationConfig({ triageWebhookUrl: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="mail">Email webhook URL (your Nodemailer / Gmail SMTP flow)</Label>
              <Input
                id="mail"
                placeholder="https://your-n8n-host/webhook/civic-email"
                value={cfg.emailWebhookUrl}
                onChange={(e) => saveAutomationConfig({ emailWebhookUrl: e.target.value })}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="secret">Shared secret (sent as x-civictriage-secret)</Label>
                <Input
                  id="secret"
                  value={cfg.sharedSecret}
                  onChange={(e) => saveAutomationConfig({ sharedSecret: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="window">Callback wait (seconds)</Label>
                <Input
                  id="window"
                  type="number"
                  min={10}
                  max={600}
                  value={cfg.callbackWindowSec}
                  onChange={(e) =>
                    saveAutomationConfig({ callbackWindowSec: Number(e.target.value) || 90 })
                  }
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Who scores complaints</Label>
              <Select
                value={cfg.engineMode}
                onValueChange={(v) => saveAutomationConfig({ engineMode: v as EngineMode })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">
                    Your n8n workflow, with local rules as backup
                  </SelectItem>
                  <SelectItem value="n8n_only">Your n8n workflow only</SelectItem>
                  <SelectItem value="local">Built-in rules only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <p className="text-sm font-medium">Fall back to local rules</p>
                <p className="text-xs text-muted-foreground">
                  If the workflow is unreachable or slow, finish triage locally so nothing stalls.
                </p>
              </div>
              <Switch
                checked={cfg.localFallback}
                disabled={cfg.engineMode === "n8n_only"}
                onCheckedChange={(v) => saveAutomationConfig({ localFallback: v })}
              />
            </div>
            {cfg.lastRun && (
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium">
                  Last run — {cfg.lastRun.ticket} ·{" "}
                  {cfg.lastRun.source === "n8n" ? "your workflow" : "built-in rules"} ·{" "}
                  <span className={cfg.lastRun.ok ? "text-resolved" : "text-critical"}>
                    {cfg.lastRun.ok ? "OK" : "failed"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {cfg.lastRun.detail} · {new Date(cfg.lastRun.at).toLocaleString()}
                </p>
              </div>
            )}
            <div className="rounded-md border p-3 text-sm">
              <p className="font-medium">Photo analysis</p>
              <p className="text-xs text-muted-foreground">
                {rules.useVision
                  ? `On — uploaded photos are read for visible damage, and a damage score of ${rules.visionCriticalScore} or more forces critical. The findings are included in the envelope sent to your workflow as "imageAnalysis".`
                  : "Off — turn it on in Admin → Triage rules."}
              </p>
            </div>
            <Button onClick={testDispatch} disabled={testing}>
              <PlugZap className="size-4" /> {testing ? "Testing…" : "Send test complaint to n8n"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">
              Paste these into n8n
            </h2>
            <CopyRow label="Agent callback URL (POST or PATCH per stage)" value={callbackUrl()} />
            <Separator />
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Callback body — one call per agent
              </p>
              <pre className="overflow-x-auto rounded-md bg-ink/95 p-3 text-xs text-white">
                {`{
  "ticket": "CT-9F2K1",
  "stage": "severity",
  "status": "done",
  "output": "Severity CRITICAL — school zone, standing water",
  "confidence": 0.88,
  "severity": "critical",
  "department": "Roads",
  "priorityScore": 88,
  "duplicateOfTicket": null,
  "slaHours": 6
}`}
              </pre>
              <p className="text-xs text-muted-foreground">
                A workflow that ends in “Respond to Webhook” can instead return everything at once
                as <code className="font-mono">{`{ "stages": [ ... ] }`}</code>.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">
              Agent contract
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Five nodes, run in order. Each one calls the callback URL with the fields it owns.
            </p>
            <ul className="mt-3 divide-y">
              {AGENT_CONTRACT.map(([stage, job, fields]) => (
                <li key={stage} className="py-3">
                  <p className="font-mono text-xs uppercase text-accent-foreground">{stage}</p>
                  <p className="text-sm">{job}</p>
                  <p className="font-mono text-xs text-muted-foreground">{fields}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-5">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">
              Complaint envelope n8n receives
            </h2>
            <pre className="overflow-x-auto rounded-md bg-ink/95 p-3 text-xs text-white">
              {JSON.stringify(
                getComplaints()[0]
                  ? triageEnvelope(getComplaints()[0]!)
                  : { event: "complaint.created" },
                null,
                2,
              ).slice(0, 1600)}
            </pre>
            <p className="text-xs text-muted-foreground">
              <Send className="mr-1 inline size-3" />
              Emails use the same bridge: the app posts a{" "}
              <code className="font-mono">complaint.email</code> payload with ticket, kind, subject
              and body to your email webhook.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="space-y-3 p-5">
            <h2 className="font-display text-lg font-bold uppercase tracking-wide">
              n8n workflow blueprint
            </h2>
            <p className="text-xs text-muted-foreground">
              Three workflows cover the whole lifecycle. Build them in this order; each ends by
              calling back into the app.
            </p>
            <pre className="overflow-x-auto rounded-md bg-ink/95 p-4 text-[11px] leading-relaxed text-white">
              {BLUEPRINT}
            </pre>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

const BLUEPRINT = `WORKFLOW 1 — TRIAGE  (trigger: Webhook  POST /webhook/civic-triage)
  [Webhook]  body = { event:"complaint.created", ticket, complaint, imageAnalysis, rules, openIssues, callbackUrl }
       |
  [IF] header x-civictriage-secret == shared secret ? -> continue : Respond 401
       |
  [Set] normalise text = title + " " + description
       |
  +----> [AI Agent: REVIEW]      -> { category, isRelevant, observed, confidence }
  |          |
  |      [AI Agent: SEVERITY]    -> { severity, safetyRisk, reasons }
  |          |
  |      [Code: DEPARTMENT]      -> rules.routing[category] -> department, slaHours
  |          |
  |      [Code: DUPLICATE]       -> for each openIssue: sameCategory
  |                                  && distance <= rules.duplicateRadiusMeters
  |                                  && similarity >= rules.duplicateMatchThreshold
  |                                -> MATCH | REVIEW | NO_MATCH  (+ candidateIssueId)
  |          |
  |      [Code: PRIORITY]        -> safety*60 + severity*15 + repeatVolume*25  (weights from rules)
  |                                bands: 90+ CRITICAL, 75+ HIGH, 50+ MEDIUM, else LOW
  |
  +----> [HTTP Request] POST {{callbackUrl}}  (one call per stage, or all five in sequence)
             body = { ticket, stage, status:"done", output, confidence,
                      severity, safetyRisk, department, priorityScore,
                      duplicate, duplicateOfTicket, slaHours }
       |
  [HTTP Request] Nodemailer / email node -> "Complaint received + triaged" to citizen
       |
  [Respond to Webhook] { stages: [...] }        <- optional synchronous shortcut

  ERROR BRANCH (any AI node fails): callback with status:"failed" + reason.
  The complaint is never lost — the app keeps it in AI processing and flags human review.

WORKFLOW 2 — VERIFICATION / WORK ORDER  (trigger: Webhook  POST /webhook/civic-verify)
  [Webhook] { event:"issue.verified" | "issue.assigned", issueId, department, officer, priority }
       |
  [Switch] on event
    - verified  -> [Email] citizen: "Your report was verified" (all linked complaints)
    - assigned  -> [Email] crew inbox for the department + [Email] citizens: "Work assigned"
    - rejected  -> [Email] citizen with the officer's reason
       |
  [HTTP Request] POST callback -> app timeline entry + audit log

WORKFLOW 3 — RESOLUTION & FEEDBACK  (trigger: Webhook  POST /webhook/civic-resolve)
  [Webhook] { event:"issue.resolved", issueId, resolutionNote, resolutionPhotoUrl, citizens[] }
       |
  [Email] each citizen: before/after photos + "Rate this fix" link to /citizen/complaint/{ticket}
       |
  [Wait 48h] -> [IF] no rating recorded -> [Email] gentle reminder
       |
  [HTTP Request] POST callback -> mark notified, close the audit trail`;
