# CivicFlow AI — Setup & Handover

Public Infrastructure Complaint Triage Agent (AIA30).
Stack: **TanStack Start** (React 19 + Vite 8 + Tailwind v4), Leaflet + OpenStreetMap,
5-stage agent pipeline, browser storage for demo data, n8n as the orchestration layer.

---

## 1. What is built today

### Citizen (role: user)
- Landing page + role-based sign up / sign in
- New complaint: description, category, ward, photo upload (auto-compressed), **GPS capture**
- My submissions list, complaint detail with plain-language timeline
- Track by Complaint ID **or** Issue ID
- Linked work item (Issue) visible, after-repair photo, **1–5 star rating**, **reopen issue**
- Profile

### Officer (role: officer, department-scoped: Roads / Water / Electrical)
- Complaint inbox with AI classification, confidence, duplicate candidates
- Verify / Reject / **Request more information**
- Work items (Issues): pending verification, high priority, critical, resolved today
- Issue detail: all linked complaints + photos, "why priority = N" breakdown, map location,
  actions (Assign crew / In progress / Resolved + resolution photo), notify citizens
- **Issue map** — real street map (Leaflet + OSM), severity-coloured pins, repeat counts,
  locked to the Jodimetla service area, filters by ward/category/severity/status
- Action logs, Track by ID, Profile

### Admin (separate login, supervisor access code — demo `civic-admin`)
- Overview, **Analytics** (volume, department/ward load, severity mix, repeat hotspots,
  avg processing time, AI confidence, human overrides)
- Users & officers management (add, role change, suspend/restore)
- All complaints, All issues, **Audit log**, **Triage rules editor**
- **Automation console** (n8n wiring + copy-ready workflow blueprint)

### Agents (5 stages)
1. **Review** — real photo analysis (vision), relevance + damage score; can only escalate
2. **Severity** — text + photo, LOW→CRITICAL
3. **Department routing** — Roads / Water / Electrical
4. **Duplicate detection** — same category + geo radius + text similarity → MATCH / NO_MATCH / REVIEW
5. **Prioritisation** — deterministic: `safety×60 + severity×15 + repeatVolume×25`
   bands CRITICAL 90+ / HIGH 75+ / MEDIUM 50+ / LOW

All thresholds, weights, bands, radius and similarity cut-offs live in **Admin → Triage rules**,
never inside prompts. AI failure never loses a complaint (it is flagged for human review).

### Issue engine
A Complaint ID = one citizen submission. An Issue ID = one real-world problem.
Many complaints collapse into one prioritised work item with a shared location and report count.

---

## 2. Running the ZIP locally

```bash
bun install        # or: npm install
bun run dev        # http://localhost:8080
bun run build      # production build
```

Requirements: Node 20+ (or Bun 1.1+). No database needed to demo — the app seeds
demo complaints and issues into browser storage.

`.env` (create at project root, values are yours):

```
# AI photo analysis (server-side only)
OPENAI_API_KEY=sk-...

# n8n
N8N_WEBHOOK_SECRET=<one strong random string, same value inside n8n>

# Firebase (client-side)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_APP_ID=

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UNSIGNED_PRESET=
```

> Inside Lovable, photo analysis runs through the Lovable AI gateway using
> `LOVABLE_API_KEY`. Locally, point `src/lib/civic/vision.functions.ts` at your own
> OpenAI key/base URL instead (one client construction, ~3 lines).

---

## 3. Integrations — what you still own

| Piece | Where it plugs in | What to do |
| --- | --- | --- |
| **Firebase Auth** | `src/lib/civic/session.ts` / `auth.tsx` | Replace the local session with Firebase Auth; keep the role + suspended checks |
| **Firestore** | `src/lib/civic/store.ts` | Swap the localStorage read/write for Firestore collections `complaints`, `issues`, `logs`, `audit`, `users`; keep the exported function signatures and every screen keeps working |
| **Cloudinary** | `citizen.new.tsx` (`pickPhoto`), officer resolution upload | Upload to an unsigned preset, store the returned secure URL instead of the data URL |
| **Nodemailer** | inside n8n only | The app never sends mail; it POSTs email events to your email webhook |
| **n8n** | Admin → Automation | Paste triage webhook URL, email webhook URL, shared secret; pick engine mode |
| **Vercel** | deploy | Framework preset: Vite; build `bun run build`; add all env vars |
| **GitHub** | source | Push the ZIP as a repo, connect it to Vercel for auto-deploys |

### n8n wiring (3 workflows, blueprint is in Admin → Automation)
1. **Triage** — webhook → verify `x-civictriage-secret` → 5 agents → POST each stage back
   to the app's callback URL (shown on the Automation page)
2. **Verification / work order** — email to citizen + crew via Nodemailer
3. **Resolution & feedback** — before/after email + 48h rating reminder

Error branch: on AI failure, call back with `status: "failed"` — the complaint is kept
and marked for human review.

---

## 4. Pre-production checklist
- [ ] Firebase project created, Auth providers enabled, Firestore rules written
      (citizens read only their own complaints; officers scoped by department; admin full)
- [ ] Cloudinary unsigned upload preset created and restricted
- [ ] n8n instance reachable over **https** (webhooks must be public)
- [ ] Shared secret identical in `.env` and in n8n
- [ ] AI key funded, spend cap set
- [ ] Triage rules reviewed with a real officer (radius, SLA hours, keywords)
- [ ] Ward names + coordinates match your actual service area (`src/lib/civic/types.ts`)
- [ ] Test on a 375px-wide phone

## 5. Post-production checklist
- [ ] Change the admin access code from `civic-admin` (Admin → Triage rules)
- [ ] Seed real officer accounts, remove demo users
- [ ] Clear demo complaints/issues before the first real submission
- [ ] Verify one end-to-end complaint on production: submit → triage → verify → resolve → email
- [ ] Watch Admin → Audit log and AI monitoring for the first day
- [ ] Set up backups / export of Firestore
- [ ] Monitor n8n executions for failures

## 6. Known gaps / roadmap
- SMS notifications (not built — email only)
- Offline complaint queue
- Marker clustering at city scale
- Multi-language citizen UI
- Officer mobile field app / camera-first flow
