import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowRight,
  Camera,
  Copy,
  Gauge,
  MapPin,
  Route as RouteIcon,
  ScanEye,
  ShieldCheck,
  Siren,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/civic/app-shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CIVIC-FLOW — AI complaint triage for public infrastructure" },
      {
        name: "description",
        content:
          "Citizens report potholes, streetlight outages and water leaks. An agent chain scores severity, routes the right department, merges duplicates and prioritises by safety risk.",
      },
      {
        property: "og:title",
        content: "CIVIC-FLOW — AI complaint triage for public infrastructure",
      },
      {
        property: "og:description",
        content:
          "From citizen photo to assigned officer in seconds: severity, routing, duplicate detection and priority, automated.",
      },
    ],
  }),
  component: Landing,
});

const AGENTS = [
  {
    icon: ScanEye,
    name: "Review Agent",
    text: "Reads the text and photo, cleans the report and detects the category.",
  },
  {
    icon: Siren,
    name: "Severity Agent",
    text: "Scores safety risk — schools, live wires, flooding, injuries escalate fast.",
  },
  {
    icon: RouteIcon,
    name: "Routing Agent",
    text: "Picks the owning department and zone, and sets the response window.",
  },
  {
    icon: Copy,
    name: "Duplicate Agent",
    text: "Clusters nearby reports of the same issue instead of opening new tickets.",
  },
  {
    icon: Gauge,
    name: "Prioritisation Agent",
    text: "Ranks the queue from severity, repeat-report volume and exposure.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Logo />
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth" search={{ role: "officer" }}>
                Officer login
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth" search={{ role: "citizen" }}>
                Report an issue
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b grid-paper">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1.1fr_0.9fr] lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-sm border border-accent/40 bg-accent/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest text-accent-foreground">
              <AlertTriangle className="size-3.5" /> AIA30 · Infrastructure complaint triage agent
            </span>
            <h1 className="mt-5 font-display text-5xl font-bold uppercase leading-[0.95] tracking-tight sm:text-6xl">
              Every pothole report,
              <br />
              triaged in <span className="text-accent">seconds</span>.
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              Citizens send a photo and a line of text. The agent chain scores severity, routes it
              to the right department, merges duplicate reports of the same issue and pushes it into
              the officer queue ranked by safety risk.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ role: "citizen" }}>
                  File a complaint <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth" search={{ role: "officer" }}>
                  Officer workspace
                </Link>
              </Button>
            </div>
            <dl className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[
                ["1,284", "Complaints triaged"],
                ["37%", "Merged as duplicates"],
                ["4.2 h", "Median assignment"],
                ["5", "Agents in the chain"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-md border bg-card p-3">
                  <dt className="font-display text-2xl font-bold">{v}</dt>
                  <dd className="text-xs text-muted-foreground">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <Card className="self-start border-2 shadow-sm">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <p className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Live triage feed
                </p>
                <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-resolved">
                  <span className="size-1.5 animate-pulse rounded-full bg-resolved" /> streaming
                </span>
              </div>
              {[
                ["CT-9F2K1", "Deep pothole near school gate", "critical", "Roads"],
                ["CT-3H7QA", "Streetlight out for a week", "high", "Electrical"],
                ["CT-B41XZ", "Water pipe burst flooding lane", "critical", "Water"],
                ["CT-77LMD", "Garbage bins overflowing", "medium", "Roads"],
              ].map(([ticket, title, sev, dept]) => (
                <div
                  key={ticket}
                  className="flex items-start gap-3 rounded-md border bg-background p-3"
                >
                  <span
                    className={`mt-1 size-2.5 shrink-0 rounded-full ${
                      sev === "critical" ? "bg-critical" : sev === "high" ? "bg-high" : "bg-medium"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">
                      {ticket} · {dept} · {sev}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Agents */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
          How the triage agent works
        </h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Five specialised steps run as an n8n workflow on every submission, and each one writes its
          finding back onto the complaint so citizens and officers see the same reasoning.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {AGENTS.map((a, i) => (
            <Card key={a.name} className="h-full">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <a.icon className="size-6 text-accent" />
                  <span className="font-display text-2xl font-bold text-muted-foreground/30">
                    0{i + 1}
                  </span>
                </div>
                <p className="mt-3 font-display text-base font-bold uppercase tracking-wide">
                  {a.name}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{a.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Roles */}
      <section className="border-y bg-ink text-ink-foreground">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
            Three roles, one pipeline
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Camera,
                role: "Citizen",
                points: [
                  "Submit text + photo with GPS",
                  "Watch agents triage live",
                  "Track by complaint ID",
                  "History and profile",
                ],
              },
              {
                icon: MapPin,
                role: "Officer",
                points: [
                  "Priority-ranked queue",
                  "Validate, merge, reassign",
                  "Zone map with colour pins",
                  "Email triggers + action logs",
                ],
              },
              {
                icon: Users,
                role: "Admin",
                points: [
                  "Department load",
                  "SLA breach watch",
                  "Officer performance",
                  "Agent accuracy audit",
                ],
              },
            ].map((r) => (
              <div key={r.role} className="rounded-lg border border-white/10 bg-white/5 p-5">
                <r.icon className="size-6 text-accent" />
                <p className="mt-3 font-display text-xl font-bold uppercase tracking-wide">
                  {r.role}
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-ink-foreground/70">
                  {r.points.map((p) => (
                    <li key={p} className="flex gap-2">
                      <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h2 className="font-display text-3xl font-bold uppercase tracking-tight">
          Report it once. We do the routing.
        </h2>
        <p className="mt-3 text-muted-foreground">
          Pick a role to enter the demo — data is stored on this device so you can run the full
          citizen → officer flow.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/auth" search={{ role: "citizen" }}>
              Enter as citizen
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/auth" search={{ role: "officer" }}>
              Enter as officer
            </Link>
          </Button>
          <Button asChild size="lg" variant="ghost">
            <Link to="/auth" search={{ role: "admin" }}>
              Admin (preview)
            </Link>
          </Button>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-sm text-muted-foreground sm:flex-row">
          <Logo />
          <p>Hackathon prototype · frontend with mock triage, ready for n8n + Firebase.</p>
        </div>
      </footer>
    </div>
  );
}
