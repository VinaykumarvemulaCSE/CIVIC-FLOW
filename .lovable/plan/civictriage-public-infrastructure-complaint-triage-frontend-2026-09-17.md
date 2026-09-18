# CivicTriage — Public Infrastructure Complaint Triage (Frontend)

A 3-role web app where citizens report infrastructure issues and officers validate, route, and resolve them, with AI triage steps shown as agent activity.

## One important note on the stack

You asked for Next.js. This project runs on TanStack Start (React 19 + Vite) with Tailwind CSS — Lovable does not support Next.js. Everything in this plan works the same way: file-based routing, server-side code, Vercel-style deployment, and later Firebase / Cloudinary / Nodemailer / n8n integration. Only the framework name differs.

For the 10-hour window this plan builds a complete, clickable frontend with mock data and clearly marked hook-up points for your backend and n8n workflows.

## Pages

Public

- Landing page: hero, how triage works (5 agents), problem categories, live-stats strip, CTA.
- Sign up / Sign in: single auth screen with a role toggle (Citizen / Officer). Officer sign-up asks for employee ID, department, and assigned zone. Admin login is a separate discreet link, deferred.

Citizen dashboard

- Overview: my open complaints, status chips, quick "New complaint" action.
- New complaint: description, category (auto-suggested), photo upload with preview, location via GPS or address, submit.
- Submission progress: live agent timeline after submit — Received → Review → Severity → Duplicate check → Department routing → Priority → Assigned, with ticket ID.
- History: all past submissions, filter by status/category.
- Track by complaint ID: search field plus full timeline, assigned officer, resolution photo.
- Profile: name, contact, address, notification preferences.

Officer dashboard

- Queue: incoming complaints sorted by priority score, with severity and duplicate-cluster badges.
- Validation view: photo, citizen text, agent findings; actions — validate, reject, merge as duplicate, reassign department, convert to work order, trigger email to citizen/crew.
- Zone map: stylised town map (road outlines only, not a real India map) with colour-coded pins — red critical, orange high, yellow medium, green resolved; pins appear once a complaint is validated; click a pin to open the complaint.
- History logs: every action the officer took, timestamped.
- Track by complaint ID.
- Profile: officer details, zone, department.

Admin (structure only, low priority)

- Placeholder dashboard with department load, SLA breaches, officer performance, agent accuracy — laid out but not wired.

## Agent layer (frontend representation)

Five named stages rendered as a shared timeline component: Review, Severity, Department Routing, Duplicate Detection, Prioritisation. Each stage has a status (pending / running / done), a short output line, and a confidence value. Driven by mock data now; one swap point later points at your n8n webhook responses.

## Real-time

A single polling hook (5s) over a mock data layer, so citizen status and officer queue both update without reloads. Swapping the mock for Firebase listeners later touches one file.

## Design direction

Civic-utility look: deep navy and signal-amber, high-contrast status colours, condensed headings, dense data tables on desktop that collapse into cards on mobile. Mobile-first at 375px, tablet at 768px, desktop at 1024px+.

## Technical notes

- Routes: `/`, `/auth`, `/citizen/*`, `/officer/*`, `/admin`.
- Mock role-based guards now; drop-in point for Firebase Auth later.
- Mock store in one module: complaints, agent runs, officers, zones, map pins.
- Map is inline SVG road geometry with absolutely positioned pins — no map library, no API key.
- Photo upload keeps a local object URL; Cloudinary upload call is a stubbed function.
- Email triggering and n8n calls are stubbed server functions with the payload shape documented in-code.

## Build order for the 10 hours

1. Design system + landing page
2. Auth screen with role routing
3. Citizen: submit + progress timeline + history + track
4. Officer: queue + validation + zone map
5. Profiles, polling, mobile polish
6. Admin placeholder if time remains  
go everything in one go  
add aditional features eevn if you like them   
suggest improvements and make changes at each stage
7. &nbsp;