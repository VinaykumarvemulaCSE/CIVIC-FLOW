import { useSyncExternalStore } from "react";

/**
 * Automation settings, kept in the browser so the app stays frontend-only.
 * Paste the n8n Production Webhook URL in the Automation console (/automation).
 */
export type EngineMode = "auto" | "n8n_only" | "local";

export interface AutomationConfig {
  /** n8n webhook that starts the triage workflow (POST, JSON body). */
  triageWebhookUrl: string;
  /** Shared secret echoed as `x-civictriage-secret` so n8n can verify the caller. */
  sharedSecret: string;
  /** n8n / Nodemailer webhook that sends citizen + crew emails (POST, JSON body). */
  emailWebhookUrl: string;
  /** How long to keep polling for agent callbacks after dispatch (seconds). */
  callbackWindowSec: number;
  /** Fall back to the built-in rule engine when n8n is unreachable. */
  localFallback: boolean;
  /**
   * auto     — use n8n when a URL is set, otherwise local rules
   * n8n_only — always n8n; never let local rules write findings
   * local    — ignore n8n and always use the built-in rules
   */
  engineMode: EngineMode;
  /** Last dispatch outcome, shown in the Automation console. */
  lastRun?: {
    at: number;
    ticket: string;
    source: "n8n" | "local";
    ok: boolean;
    detail: string;
  };
}

const KEY = "civictriage.automation.v1";

const DEFAULTS: AutomationConfig = {
  triageWebhookUrl: "",
  sharedSecret: "",
  emailWebhookUrl: "",
  callbackWindowSec: 90,
  localFallback: true,
  engineMode: "auto",
};

let cache: AutomationConfig | null = null;
const listeners = new Set<() => void>();

export function getAutomationConfig(): AutomationConfig {
  if (cache) return cache;
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AutomationConfig>) } : DEFAULTS;
  } catch {
    cache = DEFAULTS;
  }
  return cache;
}

export function saveAutomationConfig(partial: Partial<AutomationConfig>) {
  const next = { ...getAutomationConfig(), ...partial };
  cache = next;
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function useAutomationConfig(): AutomationConfig {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getAutomationConfig,
    () => DEFAULTS,
  );
}

export function isN8nWired(cfg = getAutomationConfig()) {
  return cfg.engineMode !== "local" && cfg.triageWebhookUrl.trim().startsWith("http");
}

/** True when the workflow must handle triage on its own (no local rules). */
export function isN8nOnly(cfg = getAutomationConfig()) {
  return cfg.engineMode === "n8n_only";
}

export function recordRun(run: NonNullable<AutomationConfig["lastRun"]>) {
  saveAutomationConfig({ lastRun: run });
}

/** Absolute callback URL to paste into the n8n HTTP Request nodes. */
export function callbackUrl() {
  if (typeof window === "undefined") return "/api/public/n8n/triage";
  return `${window.location.origin}/api/public/n8n/triage`;
}
