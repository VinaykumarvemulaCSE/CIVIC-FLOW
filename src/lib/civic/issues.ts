import { distanceMeters } from "./geo";
import { getRules, type TriageRules } from "./rules";
import {
  CLOSED_STATUSES,
  type Complaint,
  type DuplicateFinding,
  type Issue,
  type Severity,
} from "./types";

/**
 * Issue Engine.
 *
 * A complaint is one citizen submission. An issue is one real-world problem.
 * Many complaints about the same pothole collapse into a single issue, which is
 * the work item an officer verifies, assigns and resolves.
 *
 * Clustering is deliberately deterministic: same category + geographic
 * proximity + text similarity, all with thresholds from Admin → Triage rules.
 * The AI supplies the reading; this code owns the decision and the score.
 */

const STOP = new Set([
  "the",
  "a",
  "an",
  "is",
  "are",
  "in",
  "on",
  "at",
  "of",
  "and",
  "to",
  "for",
  "near",
  "this",
  "that",
  "it",
  "with",
  "there",
  "has",
  "have",
  "been",
  "was",
  "were",
  "very",
  "big",
  "from",
  "by",
  "my",
  "our",
  "we",
  "i",
  "also",
]);

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOP.has(w)),
  );
}

/** Jaccard token overlap — a stand-in for the embedding similarity n8n computes. */
export function textSimilarity(a: string, b: string): number {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  ta.forEach((t) => {
    if (tb.has(t)) shared += 1;
  });
  return Number((shared / (ta.size + tb.size - shared)).toFixed(3));
}

const LEVEL_VALUE: Record<Severity, number> = { low: 0.25, medium: 0.5, high: 0.75, critical: 1 };

export function levelFromValue(value: number): Severity {
  if (value >= 0.9) return "critical";
  if (value >= 0.7) return "high";
  if (value >= 0.45) return "medium";
  return "low";
}

/** Deterministic, explainable priority score. Never produced by the model. */
export function computePriority(
  input: { safetyRisk: Severity; severity: Severity; reportCount: number },
  rules: TriageRules = getRules(),
): { score: number; reasons: string[] } {
  const w = rules.priorityWeights;
  const safety = LEVEL_VALUE[input.safetyRisk];
  const severity = LEVEL_VALUE[input.severity];
  const repeat = Math.min(input.reportCount / Math.max(rules.repeatSaturation, 1), 1);
  const score = Math.round(
    Math.min(100, safety * w.safety + severity * w.severity + repeat * w.repeat),
  );
  const reasons = [
    `Safety risk ${input.safetyRisk.toUpperCase()} → ${Math.round(safety * w.safety)} of ${w.safety}`,
    `Severity ${input.severity.toUpperCase()} → ${Math.round(severity * w.severity)} of ${w.severity}`,
    `${input.reportCount} citizen report(s) → ${Math.round(repeat * w.repeat)} of ${w.repeat}`,
  ];
  return { score, reasons };
}

export interface IssueCandidate {
  issue: Issue;
  similarity: number;
  distanceMeters: number;
  score: number;
}

/** Rank open issues that could be the same real-world problem. */
export function rankCandidates(
  complaint: Pick<Complaint, "category" | "title" | "description" | "lat" | "lng">,
  issues: Issue[],
  rules: TriageRules = getRules(),
): IssueCandidate[] {
  const text = `${complaint.title} ${complaint.description}`;
  return issues
    .filter((i) => !CLOSED_STATUSES.includes(i.status) || i.status === "duplicate")
    .filter((i) => i.category === complaint.category)
    .map((issue) => {
      const dist = distanceMeters(complaint, issue);
      const similarity = textSimilarity(text, `${issue.title} ${issue.address}`);
      const proximity = Math.max(0, 1 - dist / Math.max(rules.duplicateRadiusMeters, 1));
      // Distance carries most of the weight; text similarity confirms it.
      const score = Number((proximity * 0.6 + similarity * 0.4).toFixed(3));
      return { issue, similarity, distanceMeters: dist, score };
    })
    .filter((c) => c.distanceMeters <= rules.duplicateRadiusMeters * 2)
    .sort((a, b) => b.score - a.score);
}

export function decideDuplicate(
  candidate: IssueCandidate | undefined,
  rules: TriageRules = getRules(),
): DuplicateFinding {
  if (!candidate) {
    return {
      semanticSimilarity: 0,
      distanceMeters: 0,
      sameCategory: false,
      decision: "NO_MATCH",
    };
  }
  const decision =
    candidate.score >= rules.duplicateMatchThreshold
      ? "MATCH"
      : candidate.score >= rules.duplicateReviewThreshold
        ? "REVIEW"
        : "NO_MATCH";
  return {
    candidateIssueId: candidate.issue.issueId,
    semanticSimilarity: candidate.similarity,
    distanceMeters: candidate.distanceMeters,
    sameCategory: true,
    decision,
  };
}

export function nextIssueId(issues: Issue[]): string {
  const highest = issues.reduce((max, i) => {
    const n = Number(i.issueId.replace(/[^0-9]/g, ""));
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return `ISSUE-${String(highest + 1).padStart(3, "0")}`;
}

/** Rebuild an issue's aggregates from the complaints linked to it. */
export function recomputeIssue(issue: Issue, complaints: Complaint[]): Issue {
  const linked = complaints.filter((c) => c.issueId === issue.issueId && c.status !== "rejected");
  if (!linked.length) return issue;
  const worst = (pick: (c: Complaint) => Severity): Severity =>
    linked
      .map(pick)
      .reduce((a, b) => (LEVEL_VALUE[a] >= LEVEL_VALUE[b] ? a : b), "low" as Severity);
  const severity = worst((c) => c.severity);
  const safetyRisk = worst((c) => c.safetyRisk);
  const reportCount = linked.length;
  const { score, reasons } = computePriority({ safetyRisk, severity, reportCount });
  const primary = linked.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
  const latest = linked.reduce((a, b) => (a.createdAt >= b.createdAt ? a : b));
  return {
    ...issue,
    category: primary.category,
    title: primary.title,
    zone: primary.zone,
    address: primary.address,
    lat: primary.lat,
    lng: primary.lng,
    department: primary.department,
    severity,
    safetyRisk,
    priorityScore: score,
    priorityReasons: reasons,
    reportCount,
    complaintTickets: linked.map((c) => c.ticket),
    aiSummary: primary.aiSummary ?? issue.aiSummary,
    firstReportedAt: primary.createdAt,
    lastReportedAt: latest.createdAt,
    updatedAt: Date.now(),
  };
}

export function issueFromComplaint(complaint: Complaint, issueId: string): Issue {
  const { score, reasons } = computePriority({
    safetyRisk: complaint.safetyRisk,
    severity: complaint.severity,
    reportCount: 1,
  });
  return {
    issueId,
    category: complaint.category,
    title: complaint.title,
    zone: complaint.zone,
    address: complaint.address,
    lat: complaint.lat,
    lng: complaint.lng,
    department: complaint.department,
    severity: complaint.severity,
    safetyRisk: complaint.safetyRisk,
    priorityScore: score,
    priorityReasons: reasons,
    reportCount: 1,
    complaintTickets: [complaint.ticket],
    status: complaint.status,
    ...(complaint.aiSummary ? { aiSummary: complaint.aiSummary } : {}),
    firstReportedAt: complaint.createdAt,
    lastReportedAt: complaint.createdAt,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
