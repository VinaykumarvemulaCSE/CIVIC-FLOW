import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

/**
 * Outbound bridge: the browser cannot POST to an n8n webhook directly (CORS),
 * so it posts here and this handler forwards the payload server-side.
 *
 *   POST /api/public/n8n/dispatch
 *   { "url": "https://<n8n-host>/webhook/civic-triage",
 *     "secret": "optional shared secret",
 *     "payload": { ...complaint envelope... } }
 *
 * The response passes n8n's own JSON straight back, so a workflow that ends in
 * "Respond to Webhook" can return finished stages synchronously:
 *   { "stages": [ { "stage": "review", "status": "done", "output": "...", "confidence": 0.9 } ] }
 * Long-running workflows instead POST each stage to /api/public/n8n/triage.
 */
const bodySchema = z.object({
  url: z.string().url().max(500),
  secret: z.string().max(200).optional(),
  payload: z.record(z.string(), z.unknown()),
});

const BLOCKED_HOST =
  /^(localhost$|127\.|0\.0\.0\.0$|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|\[?::1\]?$)/i;

export const Route = createFileRoute("/api/public/n8n/dispatch")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = bodySchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) {
          return Response.json({ ok: false, error: "Invalid dispatch body" }, { status: 400 });
        }
        const target = new URL(parsed.data.url);
        if (target.protocol !== "https:" && target.hostname !== "localhost") {
          return Response.json({ ok: false, error: "Webhook must use https" }, { status: 400 });
        }
        if (BLOCKED_HOST.test(target.hostname) && target.hostname !== "localhost") {
          return Response.json({ ok: false, error: "Private hosts are blocked" }, { status: 400 });
        }

        try {
          const upstream = await fetch(target.toString(), {
            method: "POST",
            headers: {
              "content-type": "application/json",
              ...(parsed.data.secret ? { "x-civictriage-secret": parsed.data.secret } : {}),
            },
            body: JSON.stringify(parsed.data.payload),
          });
          const text = await upstream.text();
          let data: unknown = null;
          try {
            data = text ? JSON.parse(text) : null;
          } catch {
            data = { raw: text.slice(0, 800) };
          }
          return Response.json(
            { ok: upstream.ok, status: upstream.status, data },
            { status: upstream.ok ? 200 : 502 },
          );
        } catch (error) {
          return Response.json(
            { ok: false, error: error instanceof Error ? error.message : "Webhook unreachable" },
            { status: 502 },
          );
        }
      },
    },
  },
});
