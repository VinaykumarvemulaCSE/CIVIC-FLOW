import { computePriority, decideDuplicate, rankCandidates } from "./issues";
import { getRules } from "./rules";
import type { PhotoAnalysis } from "./vision.functions";
import {
  CATEGORY_LABEL,
  type AgentStage,
  type Category,
  type Complaint,
  type Department,
  type DuplicateFinding,
  type Issue,
  type SafetyRisk,
  type Severity,
} from "./types";

/**
 * Built-in rule engine. Runs when the n8n workflow is not wired (or as the
 * fallback when it is unreachable). Every threshold, keyword list, SLA, weight
 * and routing rule comes from Admin → Triage rules (see rules.ts) — never from
 * inside a prompt.
 */

export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function detectCategory(text: string): Category {
  const t = text.toLowerCase();
  if (/(pothole|road|crater|asphalt|tar)/.test(t)) return "pothole";
  if (/(street ?light|lamp|light pole|dark street)/.test(t)) return "streetlight";
  if (/(water|pipe|leak|tap|burst)/.test(t)) return "water_leakage";
  if (/(garbage|trash|waste|dump|bin)/.test(t)) return "garbage";
  if (/(drain|sewage|manhole|gutter)/.test(t)) return "drainage";
  if (/(signal|traffic light|junction)/.test(t)) return "traffic_signal";
  return "other";
}

const SEVERITY_RANK: Record<Severity, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export function highestSeverity(a: Severity, b: Severity): Severity {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

export function scoreSeverity(
  text: string,
  reportCount: number,
): { severity: Severity; hits: string[] } {
  const rules = getRules();
  const t = text.toLowerCase();
  const hits = rules.criticalWords.filter((w) => w && t.includes(w.toLowerCase()));
  const highHits = rules.highWords.filter((w) => w && t.includes(w.toLowerCase()));
  if (hits.length >= 2 || (hits.length >= 1 && reportCount >= 3))
    return { severity: "critical", hits };
  if (hits.length >= 1 || highHits.length >= 2 || reportCount >= 4)
    return { severity: "high", hits: [...hits, ...highHits] };
  if (highHits.length >= 1 || reportCount >= 2) return { severity: "medium", hits: highHits };
  return { severity: "low", hits: [] };
}

/** Safety risk is scored separately from severity, as the blueprint requires. */
export function scoreSafetyRisk(
  text: string,
  category: Category,
  vision?: PhotoAnalysis | undefined,
): { safetyRisk: SafetyRisk; hits: string[] } {
  const rules = getRules();
  const t = text.toLowerCase();
  const hits = rules.safetyWords.filter((w) => w && t.includes(w.toLowerCase()));
  const inTraffic = rules.safetyCategories.includes(category);
  let risk: SafetyRisk =
    hits.length >= 3
      ? "critical"
      : hits.length === 2
        ? "high"
        : hits.length === 1
          ? "medium"
          : "low";
  if (inTraffic) risk = highestSeverity(risk, "medium");
  if (vision?.isRelevant && vision.hazards.length >= 2) risk = highestSeverity(risk, "high");
  if (vision?.isRelevant && vision.damageScore >= rules.visionCriticalScore)
    risk = highestSeverity(risk, "critical");
  return { safetyRisk: risk, hits };
}

export function slaFor(severity: Severity): number {
  return getRules().slaHours[severity];
}

export function departmentFor(category: Category): Department {
  return getRules().routing[category];
}

export function pinFor(id: string, zone: string): { x: number; y: number } {
  const h = hashString(id + zone);
  const zoneIndex = hashString(zone) % 4;
  const boxes = [
    { x: 14, y: 18 },
    { x: 56, y: 16 },
    { x: 16, y: 58 },
    { x: 58, y: 58 },
  ];
  const box = boxes[zoneIndex] ?? boxes[0]!;
  return {
    x: box.x + (h % 26),
    y: box.y + ((h >> 5) % 24),
  };
}

export interface TriageResult {
  category: Category;
  severity: Severity;
  safetyRisk: SafetyRisk;
  department: Department;
  priorityScore: number;
  priorityReasons: string[];
  slaHours: number;
  duplicate: DuplicateFinding;
  duplicateOfTicket?: string | undefined;
  reportCount: number;
  aiSummary: string;
  aiConfidence: number;
  agents: AgentStage[];
}

export function runAgents(
  input: {
    description: string;
    title: string;
    category?: Category;
    zone: string;
    address: string;
    lat: number;
    lng: number;
    photoUrl?: string;
    /** Result from the image analysis agent, when a photo was attached. */
    vision?: PhotoAnalysis | undefined;
    /** Set when a photo was attached but analysis could not run. */
    visionError?: string | undefined;
  },
  existing: Complaint[],
  issues: Issue[] = [],
): TriageResult {
  const rules = getRules();
  const text = `${input.title} ${input.description}`;
  const vision = input.vision;

  /* --- Agent 1: complaint review --- */
  let category =
    input.category && input.category !== "other" ? input.category : detectCategory(text);
  if (
    vision?.isRelevant &&
    vision.category !== "other" &&
    (category === "other" || (!input.category && vision.confidence >= 0.6))
  ) {
    category = vision.category;
  }

  /* --- Agent 4 signals first: report volume feeds severity + priority --- */
  const candidates = rankCandidates(
    {
      category,
      title: input.title,
      description: input.description,
      lat: input.lat,
      lng: input.lng,
    },
    issues,
    rules,
  );
  const duplicate = decideDuplicate(candidates[0], rules);
  const matched = duplicate.decision === "MATCH" ? candidates[0]?.issue : undefined;
  const reportCount = (matched?.reportCount ?? 0) + 1;

  const legacyNear = existing.find(
    (c) =>
      c.category === category &&
      c.zone === input.zone &&
      c.createdAt >= Date.now() - rules.duplicateWindowHours * 3600_000 &&
      !["resolved", "rejected", "duplicate"].includes(c.status),
  );

  /* --- Agent 2: severity + safety --- */
  const textRead = scoreSeverity(text, reportCount);
  let severity = textRead.severity;
  let severityNote = textRead.hits.length
    ? `risk words: ${textRead.hits.slice(0, 3).join(", ")}`
    : "no acute safety signals in the text";

  if (vision?.isRelevant && rules.visionCanEscalate) {
    const photoSeverity: Severity =
      vision.damageScore >= rules.visionCriticalScore ? "critical" : vision.severity;
    const merged = highestSeverity(severity, photoSeverity);
    if (merged !== severity) {
      severityNote = `raised to ${merged.toUpperCase()} by the photo (damage ${vision.damageScore}/100${
        vision.hazards.length ? `, ${vision.hazards.slice(0, 2).join(", ")}` : ""
      })`;
      severity = merged;
    } else {
      severityNote = `${severityNote}; photo agrees (damage ${vision.damageScore}/100)`;
    }
  }

  const safety = scoreSafetyRisk(text, category, vision);

  /* --- Agent 3: routing (validated by config, not the model) --- */
  const department = rules.routing[category];

  /* --- Agent 5: deterministic prioritisation --- */
  const priority = computePriority({ safetyRisk: safety.safetyRisk, severity, reportCount }, rules);

  const aiSummary = vision?.isRelevant
    ? `${CATEGORY_LABEL[category]} — ${vision.observed}`
    : `${CATEGORY_LABEL[category]} reported at ${input.address}. ${severityNote}.`;

  const reviewOutput = vision
    ? vision.isRelevant
      ? `Photo read: ${vision.observed} Category ${CATEGORY_LABEL[category]}.`
      : `Photo does not appear to show infrastructure damage — flagged for the officer. Category read from text as ${CATEGORY_LABEL[category]}.`
    : input.photoUrl
      ? `Photo attached but analysis unavailable${input.visionError ? ` (${input.visionError})` : ""}. Category read from text as ${CATEGORY_LABEL[category]}.`
      : `Text accepted. Category read as ${CATEGORY_LABEL[category]}. No photo attached.`;

  const duplicateOutput =
    duplicate.decision === "MATCH"
      ? `Same real-world issue as ${duplicate.candidateIssueId} — ${duplicate.distanceMeters} m away, similarity ${duplicate.semanticSimilarity}. Linked as report ${reportCount}.`
      : duplicate.decision === "REVIEW"
        ? `Possible match with ${duplicate.candidateIssueId} (${duplicate.distanceMeters} m, similarity ${duplicate.semanticSimilarity}) — below the auto-link threshold, sent for officer review.`
        : "No nearby issue of this type. A new issue will be opened.";

  const agents: AgentStage[] = [
    {
      key: "review",
      label: "Complaint Review Agent",
      status: vision && !vision.isRelevant ? "flagged" : "done",
      output: reviewOutput,
      confidence: vision ? vision.confidence : input.photoUrl ? 0.8 : 0.81,
    },
    {
      key: "severity",
      label: "Severity & Safety Agent",
      status: "done",
      output: `Severity ${severity.toUpperCase()}, safety risk ${safety.safetyRisk.toUpperCase()} — ${severityNote}${
        safety.hits.length ? `; safety signals: ${safety.hits.slice(0, 3).join(", ")}` : ""
      }.`,
      confidence: vision?.isRelevant ? 0.93 : 0.88,
    },
    {
      key: "routing",
      label: "Department Routing Agent",
      status: "done",
      output: `Routed to ${department} · ${input.zone}. Response window ${slaFor(severity)}h.`,
      confidence: 0.92,
    },
    {
      key: "duplicate",
      label: "Duplicate Detection Agent",
      status: duplicate.decision === "REVIEW" ? "flagged" : "done",
      output: duplicateOutput,
      confidence: duplicate.decision === "NO_MATCH" ? 0.9 : 0.86,
    },
    {
      key: "priority",
      label: "Prioritisation Stage",
      status: "done",
      output: `Priority ${priority.score}/100 — ${priority.reasons.join("; ")}.`,
      confidence: 1,
    },
  ];

  const aiConfidence = Number(
    (agents.reduce((sum, a) => sum + a.confidence, 0) / agents.length).toFixed(2),
  );

  return {
    category,
    severity,
    safetyRisk: safety.safetyRisk,
    department,
    priorityScore: priority.score,
    priorityReasons: priority.reasons,
    slaHours: slaFor(severity),
    duplicate,
    duplicateOfTicket: matched ? legacyNear?.ticket : undefined,
    reportCount,
    aiSummary,
    aiConfidence,
    agents,
  };
}

/** Legacy helper kept for callers that only need the score. */
export function priorityScore(severity: Severity, reportCount: number, category: Category): number {
  const rules = getRules();
  const safety = rules.safetyCategories.includes(category) ? "high" : "medium";
  return computePriority({ safetyRisk: safety as Severity, severity, reportCount }, rules).score;
}
