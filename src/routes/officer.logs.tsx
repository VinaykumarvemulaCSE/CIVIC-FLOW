import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { timeAgo } from "@/components/civic/complaint-detail";
import { useOfficerLogs } from "@/lib/civic/store";

export const Route = createFileRoute("/officer/logs")({
  head: () => ({
    meta: [
      { title: "Action logs — CivicFlow officer" },
      {
        name: "description",
        content: "Every verification, link, email and closure with a timestamp.",
      },
      { property: "og:title", content: "Action logs — CivicFlow officer" },
      {
        property: "og:description",
        content: "Every verification, link, email and closure with a timestamp.",
      },
    ],
  }),
  component: OfficerLogs,
});

function OfficerLogs() {
  const logs = useOfficerLogs();
  return (
    <Card>
      <CardContent className="p-5">
        <h2 className="font-display text-lg font-bold uppercase tracking-wide">
          Submission & action log
        </h2>
        <p className="text-xs text-muted-foreground">
          Immutable audit trail — every action is stamped with the officer, ticket and time.
        </p>
        {logs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No actions recorded yet.
          </p>
        ) : (
          <ul className="mt-4 divide-y">
            {logs.map((l, i) => (
              <li key={`${l.at}-${i}`} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="font-display text-xs font-bold tracking-widest text-muted-foreground">
                  {l.ticket}
                </span>
                <span className="min-w-0 flex-1 font-medium">{l.action}</span>
                <span className="text-xs text-muted-foreground">
                  {l.officer} · {timeAgo(l.at)}
                </span>
                {l.detail && (
                  <span className="w-full text-xs text-muted-foreground">{l.detail}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
