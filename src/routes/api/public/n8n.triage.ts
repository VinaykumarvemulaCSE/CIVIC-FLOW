import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Callback endpoint for the n8n triage workflow.
 *
 * Each agent node POSTs (or PATCHes) its finding here as it completes:
 *
 *   POST /api/public/n8n/triage
 *   x-civictriage-secret: <the shared secret set in the Automation console>
 *   {
 *     "ticket": "CT-9F2K1",
 *     "stage": "severity",              // review | severity | routing | duplicate | priority
 *     "status": "done",                 // running | done | flagged
 *     "output": "Severity CRITICAL — school zone, standing water",
 *     "confidence": 0.88,
 *     "severity": "critical",           // optional field updates
 *     "department": "Roads",
 *     "category": "pothole",
 *     "priorityScore": 88,
 *     "duplicateOfTicket": "CT-4A1BQ",
 *     "slaHours": 6
 *   }
 *
 * The browser drains queued events with:
 *   GET /api/public/n8n/triage?ticket=CT-9F2K1
 * and writes them onto the complaint's agent timeline.
 *
 * Set N8N_WEBHOOK_SECRET as a project secret to require the header; while it is
 * unset the endpoint accepts unsigned calls so the hackathon demo works instantly.
 */
const payloadSchema = z.object({
  ticket: z.string().min(3).max(40),
  stage: z.enum(["review", "severity", "routing", "duplicate", "priority"]),
  status: z.enum(["running", "done", "flagged"]).default("done"),
  output: z.string().max(600),
  confidence: z.number().min(0).max(1).default(0.9),
  severity: z.enum(["critical", "high", "medium", "low"]).optional(),
  category: z.string().max(40).optional(),
  department: z.string().max(60).optional(),
  priorityScore: z.number().min(0).max(100).optional(),
  duplicateOfTicket: z.string().max(40).optional(),
  slaHours: z.number().min(1).max(720).optional(),
});

export type TriageCallback = z.infer<typeof payloadSchema> & { at: number };

/**
 * Short-lived in-memory relay. Frontend-only build: nothing is persisted, the
 * browser owns the complaint record. Events are dropped after 10 minutes or
 * once the browser has drained them.
 */
const queue = new Map<string, TriageCallback[]>();
const TTL = 10 * 60_000;

function prune() {
  const cutoff = Date.now() - TTL;
  for (const [ticket, events] of queue) {
    const kept = events.filter((e) => e.at > cutoff);
    if (kept.length) queue.set(ticket, kept);
    else queue.delete(ticket);
  }
}

async function receive(request: Request) {
  const secret = process.env["N8N_WEBHOOK_SECRET"];
  if (secret && request.headers.get("x-civictriage-secret") !== secret) {
    return new Response("Invalid signature", { status: 401 });
  }
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }
  prune();
  const key = parsed.data.ticket.toUpperCase();
  queue.set(key, [...(queue.get(key) ?? []), { ...parsed.data, at: Date.now() }]);
  return Response.json({ ok: true, stage: parsed.data.stage, queued: queue.get(key)?.length ?? 0 });
}

export const Route = createFileRoute("/api/public/n8n/triage")({
  server: {
    handlers: {
      POST: ({ request }) => receive(request),
      PATCH: ({ request }) => receive(request),
      GET: ({ request }) => {
        prune();
        const ticket = new URL(request.url).searchParams.get("ticket");
        if (!ticket) return Response.json({ ok: false, error: "ticket required" }, { status: 400 });
        const key = ticket.toUpperCase();
        const events = queue.get(key) ?? [];
        queue.delete(key);
        return Response.json({ ok: true, events });
      },
    },
  },
});
