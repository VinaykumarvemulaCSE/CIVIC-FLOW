import { useSyncExternalStore } from "react";
import { CATEGORY_DEPARTMENT, type Category, type Department, type Severity } from "./types";

/**
 * Triage rules — editable by supervisors in Admin → Triage rules.
 * Both the built-in rule engine (triage.ts) and the photo analysis agent read these,
 * so tuning them changes how every new complaint is scored.
 */
export interface TriageRules {
  criticalWords: string[];
  highWords: string[];
  severityWeights: Record<Severity, number>;
  slaHours: Record<Severity, number>;
  /** Points added per duplicate report of the same issue. */
  reportWeight: number;
  /** Maximum points duplicate reports can add. */
  reportCap: number;
  /** Extra points for categories that put people in traffic danger. */
  safetyBoost: number;
  safetyCategories: Category[];
  baseBoost: number;
  /** How long an open complaint stays eligible for duplicate matching. */
  duplicateWindowHours: number;
  /** Send uploaded photos to the image-analysis agent. */
  useVision: boolean;
  /** Let the photo raise (never lower) the severity read from the text. */
  visionCanEscalate: boolean;
  /** Photo damage score (0–100) at or above which severity jumps to critical. */
  visionCriticalScore: number;
  routing: Record<Category, Department>;
  /** Access code required on the admin login screen. */
  adminAccessCode: string;

  /* ---- issue clustering (duplicate detection) ---- */
  /** Complaints within this radius of an issue can be clustered into it. */
  duplicateRadiusMeters: number;
  /** Combined confidence at or above which a complaint is linked automatically. */
  duplicateMatchThreshold: number;
  /** Combined confidence at or above which it is parked for officer review. */
  duplicateReviewThreshold: number;

  /* ---- deterministic priority formula ---- */
  priorityWeights: { safety: number; severity: number; repeat: number };
  /** Report count at which the repeat-volume component saturates. */
  repeatSaturation: number;
  /** Score bands: CRITICAL / HIGH / MEDIUM cut-offs. */
  priorityBands: { critical: number; high: number; medium: number };
  /** Words that raise the safety-risk read. */
  safetyWords: string[];
}

export const DEFAULT_RULES: TriageRules = {
  criticalWords: [
    "accident",
    "injury",
    "school",
    "hospital",
    "live wire",
    "electric",
    "sinkhole",
    "collapse",
    "flood",
    "overflow",
    "burst",
    "highway",
    "child",
  ],
  highWords: [
    "deep",
    "large",
    "dark",
    "night",
    "blocked",
    "leak",
    "sewage",
    "junction",
    "bus stop",
  ],
  severityWeights: { critical: 55, high: 38, medium: 22, low: 10 },
  slaHours: { critical: 6, high: 24, medium: 72, low: 120 },
  reportWeight: 7,
  reportCap: 28,
  safetyBoost: 12,
  safetyCategories: ["pothole", "traffic_signal"],
  baseBoost: 6,
  duplicateWindowHours: 336,
  useVision: true,
  visionCanEscalate: true,
  visionCriticalScore: 80,
  routing: { ...CATEGORY_DEPARTMENT },
  adminAccessCode: "civic-admin",

  duplicateRadiusMeters: 120,
  duplicateMatchThreshold: 0.62,
  duplicateReviewThreshold: 0.42,

  priorityWeights: { safety: 60, severity: 15, repeat: 25 },
  repeatSaturation: 8,
  priorityBands: { critical: 90, high: 75, medium: 50 },
  safetyWords: [
    "accident",
    "injury",
    "child",
    "school",
    "hospital",
    "live wire",
    "electric",
    "shock",
    "collapse",
    "sinkhole",
    "traffic",
    "highway",
    "fell",
    "falling",
    "dangerous",
    "hazard",
    "sewage",
    "flood",
  ],
};

const KEY = "civictriage.rules.v1";

let cache: TriageRules | null = null;
const listeners = new Set<() => void>();

export function getRules(): TriageRules {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULT_RULES;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw
      ? { ...DEFAULT_RULES, ...(JSON.parse(raw) as Partial<TriageRules>) }
      : DEFAULT_RULES;
  } catch {
    cache = DEFAULT_RULES;
  }
  return cache;
}

export function saveRules(partial: Partial<TriageRules>) {
  const next = { ...getRules(), ...partial };
  cache = next;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function resetRules() {
  cache = DEFAULT_RULES;
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

export function useRules(): TriageRules {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getRules,
    () => DEFAULT_RULES,
  );
}
