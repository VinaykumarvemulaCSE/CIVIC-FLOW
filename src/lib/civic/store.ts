import { useEffect, useState, useSyncExternalStore } from "react";
import { pinFor, runAgents, hashString } from "./triage";
import { coordsForZone } from "./geo";
import { issueFromComplaint, nextIssueId, recomputeIssue } from "./issues";
import { registerUser } from "./users";
import {
  ZONES,
  type AuditEntry,
  type Category,
  type Complaint,
  type ComplaintStatus,
  type Issue,
  type OfficerLog,
  type Role,
  type SafetyRisk,
  type Session,
  type Severity,
} from "./types";

const KEY = "civictriage.state.v3";
const SESSION_KEY = "civictriage.session.v1";

interface State {
  complaints: Complaint[];
  issues: Issue[];
  logs: OfficerLog[];
  audit: AuditEntry[];
}

let state: State | null = null;
const listeners = new Set<() => void>();

function now() {
  return Date.now();
}

function ticketFor(seed: string) {
  const h = hashString(seed).toString(36).toUpperCase().slice(0, 5);
  return `CT-${h.padEnd(5, "X")}`;
}

interface SeedRow {
  title: string;
  description: string;
  category: Category;
  zone: string;
  address: string;
  citizen: string;
  ago: number;
  status: ComplaintStatus;
  severity: Severity;
  safetyRisk: SafetyRisk;
  officer?: string;
  /** Rows sharing a cluster key become one real-world issue. */
  cluster: string;
}

function seed(): State {
  const t = now();
  const hour = 3600_000;
  const raw: SeedRow[] = [
    {
      title: "Deep pothole near school gate",
      description:
        "Large deep pothole right outside the school gate, a child on a scooter fell yesterday. Water collects in it at night.",
      category: "pothole",
      zone: ZONES[0]!,
      address: "12 Market Road, near St. Anne's School",
      citizen: "Meera Rao",
      ago: 30 * hour,
      status: "validated",
      severity: "critical",
      safetyRisk: "critical",
      officer: "Insp. A. Khan",
      cluster: "market-road-pothole",
    },
    {
      title: "Pothole outside school still open",
      description:
        "Same crater on Market Road near the school gate. Two bikes skidded this morning, children walk here.",
      category: "pothole",
      zone: ZONES[0]!,
      address: "Market Road, St. Anne's School gate",
      citizen: "Anita Joseph",
      ago: 21 * hour,
      status: "duplicate",
      severity: "critical",
      safetyRisk: "critical",
      cluster: "market-road-pothole",
    },
    {
      title: "Road broken near school, dangerous",
      description:
        "Broken road surface outside the school on Market Road, auto drivers swerve into oncoming traffic.",
      category: "pothole",
      zone: ZONES[0]!,
      address: "Market Road near school gate",
      citizen: "Ravi Teja",
      ago: 12 * hour,
      status: "duplicate",
      severity: "high",
      safetyRisk: "critical",
      cluster: "market-road-pothole",
    },
    {
      title: "Crater on Market Road filling with water",
      description:
        "Big crater near the school gate on Market Road fills with water and hides the depth at night.",
      category: "pothole",
      zone: ZONES[0]!,
      address: "Market Road, opposite school gate",
      citizen: "Faizan Ali",
      ago: 4 * hour,
      status: "duplicate",
      severity: "high",
      safetyRisk: "high",
      cluster: "market-road-pothole",
    },
    {
      title: "Streetlight out for a week",
      description:
        "Whole stretch is dark at night near the bus stop, unsafe for women returning late.",
      category: "streetlight",
      zone: ZONES[1]!,
      address: "Station Layout, 4th Cross bus stop",
      citizen: "Faizan Ali",
      ago: 26 * hour,
      status: "in_progress",
      severity: "high",
      safetyRisk: "high",
      officer: "Insp. A. Khan",
      cluster: "station-streetlight",
    },
    {
      title: "Water pipe burst flooding lane",
      description:
        "Pipe burst since morning, drinking water flooding the lane and entering ground floor homes.",
      category: "water_leakage",
      zone: ZONES[2]!,
      address: "Lake View Road, opposite park gate",
      citizen: "Divya Menon",
      ago: 5 * hour,
      status: "awaiting_validation",
      severity: "critical",
      safetyRisk: "high",
      cluster: "lakeview-water",
    },
    {
      title: "Garbage bins overflowing",
      description: "Bins not cleared for four days, stray dogs scattering waste on the footpath.",
      category: "garbage",
      zone: ZONES[3]!,
      address: "Industrial Belt, Gate 2 service road",
      citizen: "Ravi Teja",
      ago: 40 * hour,
      status: "awaiting_validation",
      severity: "medium",
      safetyRisk: "low",
      cluster: "industrial-garbage",
    },
    {
      title: "Traffic signal blinking at junction",
      description:
        "Signal at the main junction is stuck blinking amber, vehicles crossing dangerously.",
      category: "traffic_signal",
      zone: ZONES[0]!,
      address: "Market Road / Temple Street junction",
      citizen: "Anita Joseph",
      ago: 9 * hour,
      status: "awaiting_validation",
      severity: "high",
      safetyRisk: "high",
      cluster: "market-signal",
    },
    {
      title: "Open manhole on footpath",
      description:
        "Manhole cover missing on the footpath, sewage smell and risk of someone falling in.",
      category: "drainage",
      zone: ZONES[1]!,
      address: "Station Layout, 2nd Main",
      citizen: "Meera Rao",
      ago: 70 * hour,
      status: "resolved",
      severity: "high",
      safetyRisk: "high",
      officer: "Insp. R. Nair",
      cluster: "station-manhole",
    },
  ];

  const complaints: Complaint[] = [];
  const clusterCoords = new Map<string, { lat: number; lng: number }>();

  raw.forEach((r, i) => {
    const id = `seed-${i}`;
    const created = t - r.ago;
    if (!clusterCoords.has(r.cluster)) {
      clusterCoords.set(r.cluster, coordsForZone(r.cluster, r.zone));
    }
    const base = clusterCoords.get(r.cluster)!;
    // Reports of the same issue land within a few metres of each other.
    const jitter = ((hashString(id) % 20) - 10) / 100_000;
    const coords = { lat: base.lat + jitter, lng: base.lng - jitter };
    const triage = runAgents(
      {
        title: r.title,
        description: r.description,
        category: r.category,
        zone: r.zone,
        address: r.address,
        lat: coords.lat,
        lng: coords.lng,
      },
      [],
      [],
    );
    const timeline = [
      { at: created, actor: r.citizen, label: "Complaint submitted" },
      {
        at: created + 60_000,
        actor: "Agent chain",
        label: "Triage completed",
        note: `Priority ${triage.priorityScore}/100`,
      },
    ];
    if (r.officer) {
      timeline.push({ at: created + 2 * hour, actor: r.officer, label: "Verified on site" });
    }
    if (r.status === "in_progress") {
      timeline.push({
        at: created + 3 * hour,
        actor: r.officer ?? "Crew",
        label: "Work order raised",
      });
    }
    if (r.status === "resolved") {
      timeline.push({
        at: created + 20 * hour,
        actor: r.officer ?? "Crew",
        label: "Resolved and closed",
      });
    }
    complaints.push({
      id,
      ticket: ticketFor(id + r.title),
      title: r.title,
      description: r.description,
      category: r.category,
      address: r.address,
      zone: r.zone,
      lat: coords.lat,
      lng: coords.lng,
      pin: pinFor(id, r.zone),
      citizenId: r.citizen,
      citizenName: r.citizen,
      citizenEmail: `${r.citizen.toLowerCase().replace(/[^a-z0-9]/g, "")}@example.com`,
      createdAt: created,
      updatedAt: created + hour,
      status: r.status,
      severity: r.severity,
      safetyRisk: r.safetyRisk,
      department: triage.department,
      priorityScore: triage.priorityScore,
      priorityReasons: triage.priorityReasons,
      reportCount: 1,
      slaHours: triage.slaHours,
      aiConfidence: triage.aiConfidence,
      aiSummary: triage.aiSummary,
      agents: triage.agents,
      timeline,
      emailsSent: r.officer ? 2 : 0,
      ...(r.officer ? { officerName: r.officer } : {}),
      ...(r.status === "resolved"
        ? { resolutionNote: "Cover replaced and lane cleaned by crew 4." }
        : {}),
    });
  });

  /* Collapse the seeded complaints into real-world issues. */
  const issues: Issue[] = [];
  const byCluster = new Map<string, string>();
  raw.forEach((r, i) => {
    const complaint = complaints[i]!;
    const existingId = byCluster.get(r.cluster);
    if (existingId) {
      complaint.issueId = existingId;
      return;
    }
    const issueId = nextIssueId(issues);
    byCluster.set(r.cluster, issueId);
    complaint.issueId = issueId;
    issues.push(issueFromComplaint(complaint, issueId));
  });
  const synced = issues.map((issue) => recomputeIssue(issue, complaints));
  // Keep each complaint's headline numbers in step with its issue.
  synced.forEach((issue) => {
    complaints
      .filter((c) => c.issueId === issue.issueId)
      .forEach((c) => {
        c.reportCount = issue.reportCount;
        c.priorityScore = issue.priorityScore;
        c.priorityReasons = issue.priorityReasons;
      });
  });

  const logs: OfficerLog[] = complaints
    .filter((c) => c.officerName)
    .map((c) => ({
      at: c.updatedAt,
      officer: c.officerName ?? "Officer",
      action: c.status === "resolved" ? "Closed complaint" : "Verified complaint",
      ticket: c.ticket,
      detail: `${c.department} · ${c.zone}`,
    }));

  const audit: AuditEntry[] = complaints.slice(0, 6).map((c) => ({
    at: c.createdAt + 60_000,
    actor: "Agent chain",
    actorRole: "agent" as const,
    action: "Triage completed",
    targetType: "complaint" as const,
    targetId: c.ticket,
    metadata: `Priority ${c.priorityScore}/100 · ${c.department}`,
  }));

  return { complaints, issues: synced, logs, audit };
}

function load(): State {
  if (state) return state;
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(KEY);
      if (stored) {
        state = JSON.parse(stored) as State;
        return state;
      }
    } catch {
      /* ignore */
    }
  }
  state = seed();
  persist();
  return state;
}

function persist() {
  if (typeof window === "undefined" || !state) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function emit() {
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

/* ---------------- reads ---------------- */

export function useComplaints(): Complaint[] {
  const snap = useSyncExternalStore(
    subscribe,
    () => load().complaints,
    () => [] as Complaint[],
  );
  return snap;
}

export function useOfficerLogs(): OfficerLog[] {
  return useSyncExternalStore(
    subscribe,
    () => load().logs,
    () => [] as OfficerLog[],
  );
}

/** Poll marker so live-looking counters refresh every 5s, mirroring the planned websocket. */
export function useLiveTick(ms = 5000) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), ms);
    return () => window.clearInterval(id);
  }, [ms]);
  return tick;
}

export function useIssues(): Issue[] {
  return useSyncExternalStore(
    subscribe,
    () => load().issues,
    () => [] as Issue[],
  );
}

export function useAudit(): AuditEntry[] {
  return useSyncExternalStore(
    subscribe,
    () => load().audit,
    () => [] as AuditEntry[],
  );
}

export function getComplaints(): Complaint[] {
  return load().complaints;
}

export function getIssues(): Issue[] {
  return load().issues;
}

export function findIssue(issueId: string): Issue | undefined {
  return load().issues.find((i) => i.issueId.toUpperCase() === issueId.trim().toUpperCase());
}

export function complaintsForIssue(issueId: string): Complaint[] {
  return load().complaints.filter((c) => c.issueId === issueId);
}

export function appendAudit(entry: Omit<AuditEntry, "at"> & { at?: number }) {
  const s = load();
  s.audit = [{ ...entry, at: entry.at ?? now() }, ...s.audit].slice(0, 500);
  emit();
}

/** Re-derive an issue's severity, safety, priority and report count from its complaints. */
export function refreshIssue(issueId: string) {
  const s = load();
  const issue = s.issues.find((i) => i.issueId === issueId);
  if (!issue) return;
  const updated = recomputeIssue(issue, s.complaints);
  s.issues = s.issues.map((i) => (i.issueId === issueId ? updated : i));
  s.complaints = s.complaints.map((c) =>
    c.issueId === issueId
      ? {
          ...c,
          reportCount: updated.reportCount,
          priorityScore: updated.priorityScore,
          priorityReasons: updated.priorityReasons,
        }
      : c,
  );
  emit();
}

export function updateIssue(issueId: string, fn: (i: Issue) => Partial<Issue>) {
  const s = load();
  s.issues = s.issues.map((i) =>
    i.issueId === issueId ? { ...i, ...fn(i), updatedAt: now() } : i,
  );
  emit();
}

/**
 * Attach a complaint to the real-world issue it belongs to.
 * MATCH links it to the existing issue, NO_MATCH opens a new one, REVIEW opens
 * a new issue but keeps the candidate on record for the officer to confirm.
 */
export function linkComplaintToIssue(ticket: string) {
  const s = load();
  const complaint = s.complaints.find((c) => c.ticket === ticket);
  if (!complaint || complaint.issueId) return;
  const finding = complaint.duplicate;
  const target =
    finding?.decision === "MATCH" && finding.candidateIssueId
      ? s.issues.find((i) => i.issueId === finding.candidateIssueId)
      : undefined;

  if (target) {
    complaint.issueId = target.issueId;
    complaint.status = "duplicate";
    complaint.timeline = [
      ...complaint.timeline,
      {
        at: now(),
        actor: "Duplicate Detection Agent",
        label: `Linked to ${target.issueId}`,
        note: `Report ${target.reportCount + 1} of the same problem — ${finding?.distanceMeters ?? 0} m away.`,
      },
    ];
    emit();
    refreshIssue(target.issueId);
    appendAudit({
      actor: "Duplicate Detection Agent",
      actorRole: "agent",
      action: `Linked ${ticket} to ${target.issueId}`,
      targetType: "issue",
      targetId: target.issueId,
    });
    return;
  }

  const issueId = nextIssueId(s.issues);
  complaint.issueId = issueId;
  s.issues = [issueFromComplaint(complaint, issueId), ...s.issues];
  complaint.timeline = [
    ...complaint.timeline,
    { at: now(), actor: "Duplicate Detection Agent", label: `New issue opened — ${issueId}` },
  ];
  emit();
  appendAudit({
    actor: "Duplicate Detection Agent",
    actorRole: "agent",
    action: `Opened ${issueId}`,
    targetType: "issue",
    targetId: issueId,
    ...(finding?.decision === "REVIEW"
      ? { metadata: `Possible match with ${finding.candidateIssueId} — sent for officer review` }
      : {}),
  });
}

export function findByTicket(complaints: Complaint[], ticket: string) {
  const q = ticket.trim().toUpperCase();
  return complaints.find((c) => c.ticket.toUpperCase() === q);
}

/* ---------------- writes ---------------- */

export interface NewComplaintInput {
  title: string;
  description: string;
  category: Category;
  address: string;
  zone: string;
  photoUrl?: string | undefined;
  citizenName: string;
  citizenEmail?: string | undefined;
  lat?: number | undefined;
  lng?: number | undefined;
}

export function createComplaint(input: NewComplaintInput): Complaint {
  const s = load();
  const id = `c-${now()}`;
  const coords =
    typeof input.lat === "number" && typeof input.lng === "number"
      ? { lat: input.lat, lng: input.lng }
      : coordsForZone(id, input.zone);
  const triage = runAgents(
    {
      title: input.title,
      description: input.description,
      category: input.category,
      zone: input.zone,
      address: input.address,
      lat: coords.lat,
      lng: coords.lng,
      ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
    },
    s.complaints,
    s.issues,
  );
  const complaint: Complaint = {
    id,
    ticket: ticketFor(id),
    title: input.title,
    description: input.description,
    category: triage.category,
    address: input.address,
    zone: input.zone,
    lat: coords.lat,
    lng: coords.lng,
    pin: pinFor(id, input.zone),
    citizenId: input.citizenName,
    citizenName: input.citizenName,
    createdAt: now(),
    updatedAt: now(),
    status: "triaging",
    severity: triage.severity,
    safetyRisk: triage.safetyRisk,
    department: triage.department,
    priorityScore: triage.priorityScore,
    priorityReasons: triage.priorityReasons,
    reportCount: triage.reportCount,
    slaHours: triage.slaHours,
    aiConfidence: triage.aiConfidence,
    aiSummary: triage.aiSummary,
    agents: triage.agents.map((a) => ({ ...a, status: "pending" as const })),
    timeline: [{ at: now(), actor: input.citizenName, label: "Complaint submitted" }],
    emailsSent: 0,
    ...(input.citizenEmail ? { citizenEmail: input.citizenEmail } : {}),
    ...(input.photoUrl ? { photoUrl: input.photoUrl } : {}),
    ...(triage.duplicateOfTicket ? { duplicateOfTicket: triage.duplicateOfTicket } : {}),
  };
  s.complaints = [complaint, ...s.complaints];
  emit();

  // Hand off to the agent bus: n8n workflow when wired, local rule engine otherwise.
  void import("./agent-bus").then((m) => m.dispatchTriage(complaint));

  return complaint;
}

export function patchComplaint(ticket: string, fn: (c: Complaint) => Partial<Complaint>) {
  const s = load();
  s.complaints = s.complaints.map((c) =>
    c.ticket === ticket ? { ...c, ...fn(c), updatedAt: now() } : c,
  );
  emit();
}

const patch = patchComplaint;

export function appendTimeline(ticket: string, event: Complaint["timeline"][number]) {
  patchComplaint(ticket, (c) => ({ timeline: [...c.timeline, event] }));
}

function log(entry: OfficerLog) {
  const s = load();
  s.logs = [entry, ...s.logs];
}

export type OfficerActionKind =
  | "validate"
  | "reject"
  | "needs_info"
  | "merge"
  | "assign"
  | "start"
  | "resolve"
  | "email"
  | "reassign";

const ACTION_STATUS: Record<string, ComplaintStatus | undefined> = {
  validate: "validated",
  reject: "rejected",
  needs_info: "needs_info",
  merge: "duplicate",
  assign: "assigned",
  start: "in_progress",
  resolve: "resolved",
};

const ACTION_TIMELINE: Record<OfficerActionKind, string> = {
  validate: "Verified on site",
  reject: "Rejected",
  needs_info: "More information requested",
  merge: "Linked as duplicate",
  assign: "Assigned to crew",
  start: "Work started",
  resolve: "Resolved and closed",
  email: "Notification email triggered",
  reassign: "Re-routed to another department",
};

const ACTION_LOG: Record<OfficerActionKind, string> = {
  validate: "Verified complaint",
  reject: "Rejected complaint",
  needs_info: "Requested more information",
  merge: "Linked duplicate",
  assign: "Assigned issue",
  start: "Started work",
  resolve: "Closed issue",
  email: "Triggered email",
  reassign: "Re-routed department",
};

export function officerAction(
  ticket: string,
  officer: string,
  action: OfficerActionKind,
  options: {
    note?: string;
    department?: Complaint["department"];
    severity?: Severity;
    safetyRisk?: SafetyRisk;
    issueId?: string;
    resolutionPhotoUrl?: string;
  } = {},
) {
  patch(ticket, (c) => {
    const next: Partial<Complaint> = {};
    const status = ACTION_STATUS[action];
    if (status) next.status = status;
    if (options.department) next.department = options.department;
    if (options.severity) next.severity = options.severity;
    if (options.safetyRisk) next.safetyRisk = options.safetyRisk;
    if (options.issueId) next.issueId = options.issueId;
    if (action === "email") next.emailsSent = c.emailsSent + 1;
    if (action === "needs_info" && options.note) next.infoRequest = options.note;
    if (action === "resolve") {
      if (options.note) next.resolutionNote = options.note;
      if (options.resolutionPhotoUrl) next.resolutionPhotoUrl = options.resolutionPhotoUrl;
    }
    next.officerName = officer;
    next.timeline = [
      ...c.timeline,
      {
        at: now(),
        actor: officer,
        label: ACTION_TIMELINE[action],
        ...(options.note ? { note: options.note } : {}),
      },
    ];
    return next;
  });

  const complaint = load().complaints.find((c) => c.ticket === ticket);

  // The issue is the work item: keep its status and aggregates in step.
  if (complaint?.issueId) {
    const status = ACTION_STATUS[action];
    updateIssue(complaint.issueId, () => ({
      ...(status && action !== "merge" ? { status } : {}),
      ...(options.department ? { department: options.department } : {}),
      officerName: officer,
    }));
    refreshIssue(complaint.issueId);
  }

  log({
    at: now(),
    officer,
    action: ACTION_LOG[action],
    ticket,
    ...(options.note ? { detail: options.note } : {}),
  });
  appendAudit({
    actor: officer,
    actorRole: "officer",
    action: ACTION_LOG[action],
    targetType: "complaint",
    targetId: ticket,
    ...(options.note ? { metadata: options.note } : {}),
  });
  emit();

  // Outbound notification: posted to the configured Nodemailer / n8n email webhook.
  if (action === "email" || action === "start" || action === "resolve") {
    const c = load().complaints.find((x) => x.ticket === ticket);
    if (c) {
      void import("./agent-bus").then((m) =>
        m.sendEmail({
          event: "complaint.email",
          ticket,
          kind:
            action === "start"
              ? "crew_assignment"
              : action === "resolve"
                ? "resolution"
                : "citizen_update",
          to: c.citizenName,
          subject: `[${c.ticket}] ${c.title}`,
          body:
            options.note ??
            `Your complaint is now "${c.status}" with ${c.department} in ${c.zone}.`,
          complaint: {
            title: c.title,
            status: c.status,
            department: c.department,
            zone: c.zone,
            address: c.address,
          },
        }),
      );
    }
  }
}

/** Citizen feedback on a resolved complaint (1–5). */
export function rateComplaint(ticket: string, rating: number, note?: string) {
  patchComplaint(ticket, (c) => ({
    citizenRating: Math.max(1, Math.min(5, Math.round(rating))),
    timeline: [
      ...c.timeline,
      {
        at: now(),
        actor: c.citizenName,
        label: `Citizen rated the fix ${Math.round(rating)}/5`,
        ...(note ? { note } : {}),
      },
    ],
  }));
  appendAudit({
    actor: "Citizen",
    actorRole: "citizen",
    action: `Rated ${ticket} ${Math.round(rating)}/5`,
    targetType: "complaint",
    targetId: ticket,
  });
}

/** Citizen reopens a resolved complaint — it goes back to the officer inbox. */
export function reopenComplaint(ticket: string, note: string) {
  patchComplaint(ticket, (c) => ({
    status: "awaiting_validation",
    timeline: [
      ...c.timeline,
      { at: now(), actor: c.citizenName, label: "Reopened by the citizen", note },
    ],
  }));
  const c = load().complaints.find((x) => x.ticket === ticket);
  if (c?.issueId) {
    updateIssue(c.issueId, () => ({ status: "awaiting_validation" }));
    refreshIssue(c.issueId);
  }
  appendAudit({
    actor: "Citizen",
    actorRole: "citizen",
    action: `Reopened ${ticket}`,
    targetType: "complaint",
    targetId: ticket,
    metadata: note,
  });
}

export function resetDemoData() {
  state = seed();
  emit();
}

/* ---------------- session ---------------- */

let session: Session | null | undefined;
const sessionListeners = new Set<() => void>();

function loadSession(): Session | null {
  if (session !== undefined) return session;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    session = raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    session = null;
  }
  return session;
}

export function signIn(next: Session) {
  session = next;
  if (typeof window !== "undefined") window.localStorage.setItem(SESSION_KEY, JSON.stringify(next));
  registerUser(next);
  sessionListeners.forEach((l) => l());
}

export function signOut() {
  session = null;
  if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
  sessionListeners.forEach((l) => l());
}

export function updateProfile(partial: Partial<Session>) {
  const current = loadSession();
  if (!current) return;
  signIn({ ...current, ...partial });
}

export function useSession() {
  return useSyncExternalStore(
    (l) => {
      sessionListeners.add(l);
      return () => sessionListeners.delete(l);
    },
    () => loadSession(),
    () => null,
  );
}
