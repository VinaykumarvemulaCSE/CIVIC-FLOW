import { cn } from "@/lib/utils";
import { STATUS_LABEL, type ComplaintStatus, type Severity } from "@/lib/civic/types";

const SEVERITY_STYLE: Record<Severity, string> = {
  critical: "bg-critical/12 text-critical border-critical/35",
  high: "bg-high/12 text-high border-high/35",
  medium: "bg-medium/18 text-medium border-medium/40",
  low: "bg-low/12 text-low border-low/35",
};

export function SeverityBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        SEVERITY_STYLE[severity],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {severity}
    </span>
  );
}

const STATUS_STYLE: Record<ComplaintStatus, string> = {
  submitted: "bg-muted text-muted-foreground border-border",
  triaging: "bg-accent/20 text-accent-foreground border-accent/40",
  awaiting_validation: "bg-high/12 text-high border-high/30",
  needs_info: "bg-medium/18 text-medium border-medium/40",
  validated: "bg-low/12 text-low border-low/30",
  assigned: "bg-low/12 text-low border-low/30",
  in_progress: "bg-low/14 text-low border-low/35",
  resolved: "bg-resolved/12 text-resolved border-resolved/35",
  rejected: "bg-muted text-muted-foreground border-border line-through",
  duplicate: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ComplaintStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        STATUS_STYLE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PriorityMeter({ score }: { score: number }) {
  // Bands match the blueprint: 90+ critical, 75+ high, 50+ medium.
  const tone =
    score >= 90 ? "bg-critical" : score >= 75 ? "bg-high" : score >= 50 ? "bg-medium" : "bg-low";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className={cn("h-full rounded-full", tone)} style={{ width: `${score}%` }} />
      </div>
      <span className="font-display text-sm font-semibold tabular-nums">{score}</span>
    </div>
  );
}
