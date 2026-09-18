import { AlertTriangle, Check, Loader2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentStage } from "@/lib/civic/types";

export function AgentTimeline({ agents, compact }: { agents: AgentStage[]; compact?: boolean }) {
  return (
    <ol className="relative space-y-3 border-l border-dashed border-border pl-6">
      {agents.map((a) => (
        <li key={a.key} className="relative">
          <span
            className={cn(
              "absolute -left-[31px] flex size-5 items-center justify-center rounded-full border bg-card",
              a.status === "done" && "border-resolved text-resolved",
              a.status === "flagged" && "border-high text-high",
              a.status === "running" && "border-accent text-accent",
              a.status === "pending" && "border-border text-muted-foreground",
            )}
          >
            {a.status === "done" ? (
              <Check className="size-3" />
            ) : a.status === "flagged" ? (
              <AlertTriangle className="size-3" />
            ) : a.status === "running" ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <Circle className="size-2" />
            )}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-display text-sm font-semibold uppercase tracking-wide">{a.label}</p>
            {a.status !== "pending" && (
              <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {Math.round(a.confidence * 100)}% confidence
              </span>
            )}
          </div>
          <p className={cn("text-sm text-muted-foreground", compact && "line-clamp-2")}>
            {a.status === "pending" ? "Queued — waiting for the agent chain." : a.output}
          </p>
        </li>
      ))}
    </ol>
  );
}
