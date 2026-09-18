import { getAutomationConfig, isN8nWired, isN8nOnly, recordRun, callbackUrl } from "./integration";
import { getRules } from "./rules";
import {
  getComplaints,
  getIssues,
  patchComplaint,
  appendTimeline,
  linkComplaintToIssue,
} from "./store";
import { runAgents } from "./triage";
import {
  CATEGORY_DEPARTMENT,
  OPEN_STATUSES,
  type AgentKey,
  type AgentStage,
  type Category,
  type Complaint,
  type Department,
  type DuplicateFinding,
  type SafetyRisk,
  type Severity,
} from "./types";

/**
 * Agent orchestration bridge.
 *
 * Wired mode (n8n):
 *   1. POST the complaint envelope to the n8n webhook (via /api/public/n8n/dispatch).
 *   2. n8n runs the five agent nodes and POSTs each finding back to
 *      /api/public/n8n/triage — or returns them inline as { stages: [...] }.
 *   3. This module polls the callback queue and writes each finding onto the
 *      complaint, so the citizen's timeline fills in live.
 *
 * Unwired mode: the built-in rule engine (triage.ts) plays the same five stages
 * locally so the demo never stalls.
 */

const STAGE_ORDER: AgentKey[] = ["review", "severity", "routing", "duplicate", "priority"];
const STAGE_LABEL: Record<AgentKey, string> = {
  review: "Review Agent",
  severity: "Severity Agent",
  routing: "Department Routing Agent",
  duplicate: "Duplicate Detection Agent",
  priority: "Prioritisation Agent",
};

export interface StageUpdate {
  stage: AgentKey;
  status?: AgentStage["status"];
  output: string;
  confidence?: number;
  severity?: Severity;
  safetyRisk?: SafetyRisk;
  category?: Category;
  department?: Department;
  priorityScore?: number;
  priorityReasons?: string[];
  duplicateOfTicket?: string;
  duplicate?: DuplicateFinding;
  slaHours?: number;
}

/** Envelope posted to n8n. Keep this shape stable — the workflow reads it. */
export function triageEnvelope(complaint: Complaint) {
  const rules = getRules();
  return {
    event: "complaint.created",
    ticket: complaint.ticket,
    callbackUrl: callbackUrl(),
    complaint: {
      title: complaint.title,
      description: complaint.description,
      category: complaint.category,
      zone: complaint.zone,
      address: complaint.address,
      location: { lat: complaint.lat, lng: complaint.lng },
      photoUrl: complaint.photoUrl ?? null,
      citizenName: complaint.citizenName,
      citizenEmail: complaint.citizenEmail ?? null,
      createdAt: new Date(complaint.createdAt).toISOString(),
    },
    /** Findings from the image analysis agent, already computed for you. */
    imageAnalysis: complaint.vision ?? null,
    /** Current supervisor rules, so the workflow can score the same way. */
    rules: {
      criticalWords: rules.criticalWords,
      highWords: rules.highWords,
      safetyWords: rules.safetyWords,
      severityWeights: rules.severityWeights,
      slaHours: rules.slaHours,
      routing: rules.routing,
      visionCriticalScore: rules.visionCriticalScore,
      priorityWeights: rules.priorityWeights,
      priorityBands: rules.priorityBands,
      repeatSaturation: rules.repeatSaturation,
      duplicateRadiusMeters: rules.duplicateRadiusMeters,
      duplicateMatchThreshold: rules.duplicateMatchThreshold,
      duplicateReviewThreshold: rules.duplicateReviewThreshold,
    },
    /** Open real-world issues the duplicate agent can match against. */
    openIssues: getIssues()
      .filter((i) => OPEN_STATUSES.includes(i.status))
      .map((i) => ({
        issueId: i.issueId,
        category: i.category,
        title: i.title,
        address: i.address,
        zone: i.zone,
        location: { lat: i.lat, lng: i.lng },
        severity: i.severity,
        safetyRisk: i.safetyRisk,
        reportCount: i.reportCount,
      })),
    openTicketsInZone: getComplaints()
      .filter(
        (c) =>
          c.ticket !== complaint.ticket &&
          c.zone === complaint.zone &&
          OPEN_STATUSES.includes(c.status),
      )
      .map((c) => ({
        ticket: c.ticket,
        category: c.category,
        title: c.title,
        address: c.address,
        severity: c.severity,
      })),
    agents: STAGE_ORDER,
  };
}

export function applyStage(ticket: string, update: StageUpdate) {
  patchComplaint(ticket, (c) => {
    const next: Partial<Complaint> = {
      agents: c.agents.map((a) =>
        a.key === update.stage
          ? {
              ...a,
              label: STAGE_LABEL[update.stage],
              status: update.status ?? "done",
              output: update.output,
              confidence: update.confidence ?? a.confidence,
              finishedAt: Date.now(),
            }
          : a,
      ),
    };
    if (update.severity) next.severity = update.severity;
    if (update.safetyRisk) next.safetyRisk = update.safetyRisk;
    if (update.category) next.category = update.category;
    if (update.department) next.department = update.department;
    else if (update.category) next.department = CATEGORY_DEPARTMENT[update.category];
    if (typeof update.priorityScore === "number") next.priorityScore = update.priorityScore;
    if (update.priorityReasons) next.priorityReasons = update.priorityReasons;
    if (typeof update.slaHours === "number") next.slaHours = update.slaHours;
    if (update.duplicate) next.duplicate = update.duplicate;
    if (update.duplicateOfTicket) next.duplicateOfTicket = update.duplicateOfTicket;

    const done = (next.agents ?? c.agents).every(
      (a) => a.status === "done" || a.status === "flagged",
    );
    if (done && c.status === "triaging") next.status = "awaiting_validation";
    return next;
  });
}

function markRunning(ticket: string, stage: AgentKey, note: string) {
  applyStage(ticket, { stage, status: "running", output: note, confidence: 0.5 });
}

function finish(ticket: string, source: string) {
  patchComplaint(ticket, (c) => ({
    status: c.status === "triaging" ? "awaiting_validation" : c.status,
  }));
  // Clustering step: link this complaint to an existing issue, or open a new one.
  linkComplaintToIssue(ticket);
  const c = getComplaints().find((x) => x.ticket === ticket);
  appendTimeline(ticket, {
    at: Date.now(),
    actor: source,
    label: "Triage completed",
    note: c
      ? `${c.severity.toUpperCase()} · safety ${c.safetyRisk.toUpperCase()} · ${c.department} · priority ${c.priorityScore}/100${
          c.issueId ? ` · ${c.issueId}` : ""
        }`
      : undefined,
  });
}

/* ---------------- image analysis agent ---------------- */

async function analysePhoto(complaint: Complaint) {
  const rules = getRules();
  if (!complaint.photoUrl || !rules.useVision || !complaint.photoUrl.startsWith("data:")) {
    return { vision: undefined, error: undefined as string | undefined };
  }
  markRunning(complaint.ticket, "review", "Reading the photo…");
  try {
    const { analyzeComplaintPhoto } = await import("./vision.functions");
    const vision = await analyzeComplaintPhoto({
      data: {
        image: complaint.photoUrl,
        title: complaint.title,
        description: complaint.description,
      },
    });
    patchComplaint(complaint.ticket, () => ({ vision }));
    return { vision, error: undefined };
  } catch (error) {
    console.error("photo analysis failed", error);
    return {
      vision: undefined,
      error: error instanceof Error ? error.message.slice(0, 120) : "analysis failed",
    };
  }
}

/* ---------------- local rule engine ---------------- */

async function runLocal(complaint: Complaint) {
  const { vision, error } = await analysePhoto(complaint);
  const current = getComplaints().find((c) => c.ticket === complaint.ticket) ?? complaint;

  const result = runAgents(
    {
      title: current.title,
      description: current.description,
      category: current.category,
      zone: current.zone,
      address: current.address,
      lat: current.lat,
      lng: current.lng,
      ...(current.photoUrl ? { photoUrl: current.photoUrl } : {}),
      vision,
      visionError: error,
    },
    getComplaints().filter((c) => c.ticket !== complaint.ticket),
    getIssues(),
  );

  result.agents.forEach((stage, i) => {
    window.setTimeout(
      () => {
        applyStage(complaint.ticket, {
          stage: stage.key,
          status: stage.status,
          output: stage.output,
          confidence: stage.confidence,
          ...(stage.key === "review" ? { category: result.category } : {}),
          ...(stage.key === "severity"
            ? { severity: result.severity, safetyRisk: result.safetyRisk }
            : {}),
          ...(stage.key === "routing"
            ? { department: result.department, slaHours: result.slaHours }
            : {}),
          ...(stage.key === "duplicate"
            ? {
                duplicate: result.duplicate,
                ...(result.duplicateOfTicket
                  ? { duplicateOfTicket: result.duplicateOfTicket }
                  : {}),
              }
            : {}),
          ...(stage.key === "priority"
            ? { priorityScore: result.priorityScore, priorityReasons: result.priorityReasons }
            : {}),
        });
        if (i === result.agents.length - 1) finish(complaint.ticket, "Local rule engine");
      },
      700 * (i + 1),
    );
  });
}

/* ---------------- n8n mode ---------------- */

async function pollCallbacks(ticket: string, windowSec: number) {
  const deadline = Date.now() + windowSec * 1000;
  let seen = 0;
  while (Date.now() < deadline) {
    await new Promise((r) => window.setTimeout(r, 2500));
    try {
      const res = await fetch(`/api/public/n8n/triage?ticket=${encodeURIComponent(ticket)}`);
      const json = (await res.json()) as { events?: Array<StageUpdate & { stage: AgentKey }> };
      for (const event of json.events ?? []) {
        applyStage(ticket, event);
        seen += 1;
      }
    } catch {
      /* keep polling — the workflow may still be running */
    }
    const current = getComplaints().find((c) => c.ticket === ticket);
    if (current && current.agents.every((a) => a.status === "done" || a.status === "flagged")) {
      finish(ticket, "n8n agent chain");
      return seen;
    }
  }
  return seen;
}

export async function dispatchTriage(complaint: Complaint) {
  const cfg = getAutomationConfig();
  if (!isN8nWired(cfg)) {
    await runLocal(complaint);
    recordRun({
      at: Date.now(),
      ticket: complaint.ticket,
      source: "local",
      ok: true,
      detail: "Built-in rules scored this complaint (no workflow URL set)",
    });
    return;
  }

  // Analyse the photo first so the workflow receives the image findings too.
  const { vision, error: visionError } = await analysePhoto(complaint);

  STAGE_ORDER.forEach((stage) => markRunning(complaint.ticket, stage, "Queued in n8n workflow…"));
  appendTimeline(complaint.ticket, {
    at: Date.now(),
    actor: "n8n",
    label: "Triage workflow triggered",
    note: "Complaint envelope posted to your webhook",
  });

  let ok = false;
  let detail = "";
  try {
    const res = await fetch("/api/public/n8n/dispatch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: cfg.triageWebhookUrl,
        ...(cfg.sharedSecret ? { secret: cfg.sharedSecret } : {}),
        payload: triageEnvelope(
          getComplaints().find((c) => c.ticket === complaint.ticket) ?? complaint,
        ),
      }),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      status?: number;
      error?: string;
      data?: { stages?: Array<StageUpdate & { stage: AgentKey }> };
    };
    ok = Boolean(json.ok);
    detail = ok
      ? `Workflow accepted the complaint (HTTP ${json.status ?? 200})`
      : (json.error ?? `Workflow replied ${json.status ?? "error"}`);
    for (const stage of json.data?.stages ?? []) applyStage(complaint.ticket, stage);
  } catch {
    ok = false;
    detail = "Could not reach the workflow";
  }

  const allowFallback = cfg.localFallback && !isN8nOnly(cfg);

  if (!ok) {
    appendTimeline(complaint.ticket, {
      at: Date.now(),
      actor: "n8n",
      label: "Workflow unreachable",
      note: allowFallback
        ? "Fell back to the built-in rule engine"
        : "Complaint is waiting for the workflow",
    });
    recordRun({ at: Date.now(), ticket: complaint.ticket, source: "n8n", ok: false, detail });
    if (allowFallback) await runLocal(complaint);
    return;
  }

  const received = await pollCallbacks(complaint.ticket, cfg.callbackWindowSec);
  const current = getComplaints().find((c) => c.ticket === complaint.ticket);
  const stalled = current?.agents.some((a) => a.status === "running" || a.status === "pending");

  recordRun({
    at: Date.now(),
    ticket: complaint.ticket,
    source: "n8n",
    ok: !stalled,
    detail: stalled
      ? `${received} of 5 findings arrived before the callback window closed`
      : `All findings returned by your workflow${vision ? " (photo analysed by the image agent)" : ""}${
          visionError ? ` — photo analysis failed: ${visionError}` : ""
        }`,
  });

  if (stalled && allowFallback) {
    appendTimeline(complaint.ticket, {
      at: Date.now(),
      actor: "n8n",
      label: "Callbacks timed out",
      note: `${received} finding(s) received — local rules completed the rest`,
    });
    await runLocal(complaint);
  }
}

/* ---------------- outbound email (your Nodemailer / SMTP flow) ---------------- */

export interface EmailPayload {
  event: "complaint.email";
  ticket: string;
  kind: "citizen_update" | "crew_assignment" | "resolution";
  to: string;
  subject: string;
  body: string;
  complaint: { title: string; status: string; department: string; zone: string; address: string };
}

export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const cfg = getAutomationConfig();
  if (!cfg.emailWebhookUrl.trim().startsWith("http")) return false;
  try {
    const res = await fetch("/api/public/n8n/dispatch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url: cfg.emailWebhookUrl,
        ...(cfg.sharedSecret ? { secret: cfg.sharedSecret } : {}),
        payload,
      }),
    });
    const json = (await res.json()) as { ok?: boolean };
    return Boolean(json.ok);
  } catch {
    return false;
  }
}
