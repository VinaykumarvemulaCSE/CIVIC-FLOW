import { cn } from "@/lib/utils";
import type { Complaint } from "@/lib/civic/types";

const PIN_COLOR: Record<string, string> = {
  critical: "bg-critical",
  high: "bg-high",
  medium: "bg-medium",
  low: "bg-low",
};

/**
 * Stylised town zone map: hand-drawn road outlines only (no real geography,
 * no map library, no API key). Pins appear once a complaint is validated.
 */
export function ZoneMap({
  complaints,
  selected,
  onSelect,
}: {
  complaints: Complaint[];
  selected?: string | undefined;
  onSelect?: (ticket: string) => void;
}) {
  return (
    <div className="relative aspect-4/3 w-full overflow-hidden rounded-lg border bg-card grid-paper">
      <svg viewBox="0 0 100 75" className="absolute inset-0 size-full" aria-hidden>
        <g stroke="var(--color-border)" strokeWidth="3.5" fill="none" strokeLinecap="round">
          <path d="M0 20 H100" />
          <path d="M0 52 H100" />
          <path d="M28 0 V75" />
          <path d="M70 0 V75" />
          <path d="M28 36 H70" />
          <path d="M45 20 L58 52" />
        </g>
        <g
          stroke="var(--color-muted-foreground)"
          strokeWidth="0.4"
          strokeDasharray="2 2"
          fill="none"
          opacity="0.5"
        >
          <path d="M0 20 H100" />
          <path d="M0 52 H100" />
          <path d="M28 0 V75" />
          <path d="M70 0 V75" />
        </g>
        <rect x="74" y="24" width="22" height="24" fill="var(--color-low)" opacity="0.12" />
        <rect x="4" y="56" width="20" height="15" fill="var(--color-resolved)" opacity="0.14" />
        <text x="76" y="23" fontSize="3" fill="var(--color-muted-foreground)">
          Lake
        </text>
        <text x="5" y="55" fontSize="3" fill="var(--color-muted-foreground)">
          Park
        </text>
        <text x="30" y="18" fontSize="3" fill="var(--color-muted-foreground)">
          Market Rd
        </text>
        <text x="30" y="50" fontSize="3" fill="var(--color-muted-foreground)">
          Station Layout
        </text>
      </svg>

      {complaints.map((c) => (
        <button
          key={c.ticket}
          type="button"
          onClick={() => onSelect?.(c.ticket)}
          style={{ left: `${c.pin.x}%`, top: `${c.pin.y}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
          aria-label={`${c.ticket} ${c.severity}`}
        >
          <span className="relative flex items-center justify-center">
            {c.severity === "critical" && c.status !== "resolved" && (
              <span className="absolute size-6 animate-ping rounded-full bg-critical/40" />
            )}
            <span
              className={cn(
                "size-3.5 rounded-full border-2 border-card shadow-sm transition-transform hover:scale-140",
                c.status === "resolved" ? "bg-resolved" : (PIN_COLOR[c.severity] ?? "bg-low"),
                selected === c.ticket && "scale-150 ring-2 ring-accent ring-offset-1",
              )}
            />
          </span>
        </button>
      ))}

      <div className="absolute bottom-2 left-2 flex flex-wrap gap-2 rounded-md border bg-card/90 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
        {[
          ["bg-critical", "Critical"],
          ["bg-high", "High"],
          ["bg-medium", "Medium"],
          ["bg-low", "Low"],
          ["bg-resolved", "Resolved"],
        ].map(([dot, label]) => (
          <span key={label} className="flex items-center gap-1 text-muted-foreground">
            <span className={cn("size-2 rounded-full", dot)} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
