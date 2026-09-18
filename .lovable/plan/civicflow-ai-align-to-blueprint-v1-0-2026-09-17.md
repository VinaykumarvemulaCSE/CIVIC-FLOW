# CivicFlow AI — Align to Blueprint v1.0

Your blueprint changes the shape of the product in one big way: **many complaints → one real-world Issue → one prioritised work item**. Today the app treats each complaint as its own work item. That's the main thing to build, plus the pieces around it.

Note on stack: this workspace runs TanStack Start (React + TypeScript + Tailwind + shadcn/ui), not Next.js. Same routes, same components, same Vercel-style deploy; Firebase/Cloudinary/Nodemailer/n8n stay yours to wire.

## Agents: 5 today, matching your five stages

Review (reads photo + text), Severity & Safety, Department Routing, Duplicate Detection, Prioritisation. Code owns the final priority number; the agents supply the evidence.

## What changes

### 1. Issue Engine (the core differentiator)
- New Issue entity: `ISSUE-027` style ID, category, shared location, department, severity, safetyRisk, priorityScore, reportCount, status, first/last reported.
- Duplicate agent decides MATCH / NO_MATCH / REVIEW using same-category + distance + text similarity, with thresholds from the rules editor (never inside prompts).
- MATCH links the complaint to the existing issue and bumps reportCount; NO_MATCH mints a new issue; REVIEW parks it as a candidate for the officer to confirm.
- Deterministic priority: `safety×60 + severity×15 + repeatVolume×25`, bands CRITICAL 90+, HIGH 75+, MEDIUM 50+, LOW below — all weights and bands editable in Admin → Triage rules.
- "Why priority = 94?" panel listing the contributing reasons and report count.

### 2. Separate safetyRisk from severity
Both LOW/MEDIUM/HIGH/CRITICAL, both surfaced everywhere, both feeding priority separately.

### 3. Lifecycle statuses per blueprint
SUBMITTED → AI_PROCESSING → UNDER_REVIEW → VERIFIED → ASSIGNED → IN_PROGRESS → RESOLVED, with REJECTED and DUPLICATE_LINKED branches, shown as a timeline on both citizen and officer sides.

### 4. Officer: department-scoped, issue-centric
- Departments narrowed to Roads, Water, Electrical; an officer only ever sees their own department's work.
- Dashboard widgets: Pending verification, High priority, Critical issues, Resolved today; recent-issues table (Issue ID, category, severity, priority, reports, status).
- Complaint inspection: evidence, AI classification, confidence, duplicate candidates, linked issue — with Verify / Reject / Request more information.
- Issue detail page: map location, all linked complaints and photos, AI summary, timeline, actions (Assign, In progress, Resolved).
- Real map: Leaflet + OpenStreetMap replacing the drawn town outline, markers per issue with clustering, filters by department, category, severity, priority, status and date range.

### 5. Citizen: complaint + linked issue
- GPS capture ("use my location") on the complaint form.
- Complaint page shows the Complaint ID, the linked Issue ID, and a plain-language timeline; a separate issue tracking page shows shared progress. No internal-only data exposed.

### 6. Admin
- Users, Officers, Departments management.
- Complaints and Issues overviews.
- Analytics: totals, active/critical/resolved, by category, by department, severity distribution, repeat hotspots, status distribution, over time, average processing time, AI confidence, duplicate clusters.
- AI monitoring: per-complaint AI decision, confidence, routing, duplicate decision, and any human override.
- Audit log of every triage, verification, rejection, assignment, status change and admin action.

### 7. Notifications (Nodemailer)
Events — complaint received, triage complete, verified, rejected, assigned, status changed, resolved — each posted to your email webhook with a ready template; you point it at Nodemailer in n8n.

### 8. Graceful failure
AI failure keeps the complaint and marks it AI_PROCESSING / needs review; low confidence flags for human review; duplicate uncertainty becomes a REVIEW candidate; missing photo or location never blocks submission.

### 9. n8n blueprint page
A copy-ready flowchart in Admin → Automation matching your §45 pseudo-workflow, mapped to the endpoints the app already exposes (dispatch bridge + per-stage callback URL), including the embedding + proximity + similarity branch and the duplicate IF split.

## Technical notes
- Issue store added alongside complaints in browser storage, with issue IDs, report counts and complaint back-links; seeded demo data includes one hotspot issue with many reports so the demo moment (§36) lands.
- All AI output validated against the JSON contracts in §22 before it is written.
- Leaflet + OSM tiles, no API key needed; marker clustering for nearby reports.
- Thresholds, weights, bands, radius and similarity cutoffs live in the rules editor, not in prompts.
- Firebase/Firestore, Cloudinary and Nodemailer stay yours; the app keeps clean seams where those calls slot in.

## Build order (time-boxed)
1. Issue engine + safetyRisk + statuses (the differentiator)
2. Officer issue pages + Leaflet map + department scoping
3. Citizen GPS + linked-issue tracking
4. Admin analytics, AI monitoring, audit log
5. n8n blueprint page + email events

## Still needed from you
Your n8n triage and email webhook URLs plus shared secret — paste them into Admin → Automation, or send them here and I'll fill them in.
