import type { PhotoAnalysis } from "./vision.functions";

export type Role = "citizen" | "officer" | "admin";

/** Used for both severity and safety risk (LOW / MEDIUM / HIGH / CRITICAL). */
export type Severity = "critical" | "high" | "medium" | "low";
export type SafetyRisk = Severity;

export type ComplaintStatus =
  | "submitted"
  | "triaging"
  | "awaiting_validation"
  | "needs_info"
  | "validated"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "rejected"
  | "duplicate";

export type Category =
  "pothole" | "streetlight" | "water_leakage" | "garbage" | "drainage" | "traffic_signal" | "other";

/** MVP departments per the blueprint. */
export type Department = "Roads" | "Water" | "Electrical";

export const DEPARTMENTS: Department[] = ["Roads", "Water", "Electrical"];

export type AgentKey = "review" | "severity" | "routing" | "duplicate" | "priority";

export type AgentStatus = "pending" | "running" | "done" | "flagged";

export interface AgentStage {
  key: AgentKey;
  label: string;
  status: AgentStatus;
  output: string;
  confidence: number;
  finishedAt?: number | undefined;
}

export interface TimelineEvent {
  at: number;
  actor: string;
  label: string;
  note?: string | undefined;
}

export interface Coords {
  lat: number;
  lng: number;
}

/** Duplicate-detection finding for one complaint. */
export interface DuplicateFinding {
  candidateIssueId?: string | undefined;
  semanticSimilarity: number;
  distanceMeters: number;
  sameCategory: boolean;
  decision: "MATCH" | "NO_MATCH" | "REVIEW";
}

export interface Complaint {
  id: string;
  ticket: string;
  title: string;
  description: string;
  category: Category;
  photoUrl?: string | undefined;
  address: string;
  zone: string;
  lat: number;
  lng: number;
  /** Legacy stylised-map coordinate, kept for the compact zone sketch. */
  pin: { x: number; y: number };
  citizenId: string;
  citizenName: string;
  citizenEmail?: string | undefined;
  createdAt: number;
  updatedAt: number;
  status: ComplaintStatus;
  severity: Severity;
  safetyRisk: SafetyRisk;
  department: Department;
  priorityScore: number;
  priorityReasons: string[];
  reportCount: number;
  /** Real-world issue this complaint belongs to. */
  issueId?: string | undefined;
  duplicateOfTicket?: string | undefined;
  duplicate?: DuplicateFinding | undefined;
  officerName?: string | undefined;
  slaHours: number;
  aiConfidence: number;
  aiSummary?: string | undefined;
  agents: AgentStage[];
  timeline: TimelineEvent[];
  resolutionNote?: string | undefined;
  resolutionPhotoUrl?: string | undefined;
  citizenRating?: number | undefined;
  infoRequest?: string | undefined;
  emailsSent: number;
  /** Output of the image analysis agent, when a photo was analysed. */
  vision?: PhotoAnalysis | undefined;
}

/** One real-world infrastructure problem, clustered from one or more complaints. */
export interface Issue {
  issueId: string;
  category: Category;
  title: string;
  zone: string;
  address: string;
  lat: number;
  lng: number;
  department: Department;
  severity: Severity;
  safetyRisk: SafetyRisk;
  priorityScore: number;
  priorityReasons: string[];
  reportCount: number;
  complaintTickets: string[];
  status: ComplaintStatus;
  officerName?: string | undefined;
  aiSummary?: string | undefined;
  firstReportedAt: number;
  lastReportedAt: number;
  createdAt: number;
  updatedAt: number;
}

export interface OfficerLog {
  at: number;
  officer: string;
  action: string;
  ticket: string;
  detail?: string;
}

/** Audit trail entry for any important AI, officer or admin action. */
export interface AuditEntry {
  at: number;
  actor: string;
  actorRole: Role | "agent";
  action: string;
  targetType: "complaint" | "issue" | "user" | "rules" | "system";
  targetId: string;
  metadata?: string | undefined;
}

export interface Session {
  role: Role;
  name: string;
  email: string;
  phone?: string | undefined;
  employeeId?: string | undefined;
  department?: Department | undefined;
  zone?: string | undefined;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  pothole: "Pothole / road damage",
  streetlight: "Streetlight outage",
  water_leakage: "Water leakage",
  garbage: "Garbage overflow",
  drainage: "Drainage / sewage",
  traffic_signal: "Traffic signal fault",
  other: "Other",
};

export const CATEGORY_DEPARTMENT: Record<Category, Department> = {
  pothole: "Roads",
  streetlight: "Electrical",
  water_leakage: "Water",
  garbage: "Roads",
  drainage: "Water",
  traffic_signal: "Electrical",
  other: "Roads",
};

export const ZONES = [
  "Ward 1 — Jodimetla Main Road",
  "Ward 2 — Athvelly Cross",
  "Ward 3 — Dandumailaram",
  "Ward 4 — Jodimetla Industrial Belt",
] as const;

/** Approximate ward centres for the operational map (Jodimetla, Medchal–Malkajgiri). */
export const ZONE_CENTER: Record<string, Coords> = {
  "Ward 1 — Jodimetla Main Road": { lat: 17.4262, lng: 78.644 },
  "Ward 2 — Athvelly Cross": { lat: 17.4335, lng: 78.6512 },
  "Ward 3 — Dandumailaram": { lat: 17.4198, lng: 78.6361 },
  "Ward 4 — Jodimetla Industrial Belt": { lat: 17.4301, lng: 78.6558 },
};

export const TOWN_CENTER: Coords = { lat: 17.4262, lng: 78.644 };

/** The service area shown on the operational map — panning is locked to this box. */
export const TOWN_BOUNDS = {
  south: 17.4055,
  west: 78.6205,
  north: 17.4475,
  east: 78.6685,
} as const;

export const STATUS_LABEL: Record<ComplaintStatus, string> = {
  submitted: "Submitted",
  triaging: "AI processing",
  awaiting_validation: "Under review",
  needs_info: "More information requested",
  validated: "Verified",
  assigned: "Assigned",
  in_progress: "In progress",
  resolved: "Resolved",
  rejected: "Rejected",
  duplicate: "Duplicate linked",
};

/** Formal lifecycle codes from the blueprint, shown alongside the friendly label. */
export const STATUS_CODE: Record<ComplaintStatus, string> = {
  submitted: "SUBMITTED",
  triaging: "AI_PROCESSING",
  awaiting_validation: "UNDER_REVIEW",
  needs_info: "NEEDS_INFO",
  validated: "VERIFIED",
  assigned: "ASSIGNED",
  in_progress: "IN_PROGRESS",
  resolved: "RESOLVED",
  rejected: "REJECTED",
  duplicate: "DUPLICATE_LINKED",
};

export const OPEN_STATUSES: ComplaintStatus[] = [
  "submitted",
  "triaging",
  "awaiting_validation",
  "needs_info",
  "validated",
  "assigned",
  "in_progress",
];

export const CLOSED_STATUSES: ComplaintStatus[] = ["resolved", "rejected", "duplicate"];

export function priorityBand(score: number): Severity {
  if (score >= 90) return "critical";
  if (score >= 75) return "high";
  if (score >= 50) return "medium";
  return "low";
}
