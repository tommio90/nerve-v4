# NERVE v4 — Build Mission Brief

## What You Are Building

NERVE v4 is a startup operating system built on top of NERVE v3. You are working in `/Users/giuseppetomasello/.openclaw/workspace/nerve-v4/` which is already scaffolded from the v3 codebase.

**CRITICAL:** Keep all existing v3 features working (docs, projects, tasks, artifacts, council, knowledge, preferences, dashboard). You are ADDING to v3, not replacing it.

## Reference: v3 Source Code
The original v3 is at `/Users/giuseppetomasello/.openclaw/workspace/nerve-v3-src/` — use it as reference for patterns, components, and API structure.

## Full PRD Reference
See `/Users/giuseppetomasello/.openclaw/workspace/nerve-v4-prd.md` for the complete PRD.

---

## Phase 1: Foundation (Build This First)

### 1. Update `package.json`
- Change name from `nerve-v3` to `nerve-v4`
- Keep all existing dependencies

### 2. Update Prisma Schema (`prisma/schema.prisma`)
Add these NEW models to the existing schema. DO NOT remove any existing models.

```prisma
model OKR {
  id          String      @id @default(cuid())
  title       String
  description String?
  quarter     String      // e.g. "Q1-2026"
  status      String      @default("ACTIVE") // ACTIVE|COMPLETED|CANCELLED
  keyResults  KeyResult[]
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt

  @@index([status])
  @@index([quarter])
}

model KeyResult {
  id           String   @id @default(cuid())
  okrId        String
  okr          OKR      @relation(fields: [okrId], references: [id], onDelete: Cascade)
  title        String
  target       Float
  current      Float    @default(0)
  unit         String   @default("") // e.g. "interviews", "users", "%"
  status       String   @default("ON_TRACK") // ON_TRACK|AT_RISK|BEHIND|COMPLETED
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([okrId])
  @@index([status])
}

model Assumption {
  id          String   @id @default(cuid())
  title       String
  description String
  riskLevel   Int      @default(3) // 1=low to 5=critical
  status      String   @default("UNVALIDATED") // UNVALIDATED|VALIDATING|CONFIRMED|INVALIDATED
  confidence  Float    @default(0) // 0-100
  evidence    String   @default("") // freetext, grows over time
  projectId   String?  // optional link to project
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([status])
  @@index([riskLevel])
}

model AgentNode {
  id           String   @id @default(cuid())
  name         String
  role         String   // CEO|PM|GTM|OPS|DEV|PERSONA|RESEARCH|OUTREACH|INTERVIEW|DESIGN|CONTENT|ANALYTICS|CRM|MEMORY|COST|ARCHITECT|BUILDER|QA
  description  String   @default("")
  capabilities String   @default("[]") // JSON array
  tools        String   @default("[]") // JSON array of tool names
  memoryScope  String   @default("[]") // JSON array of memory layer keys
  reportingTo  String?  // id of parent AgentNode or "founder"
  approvalTier String   @default("soft") // auto|soft|hard|escalate
  status       String   @default("idle") // idle|working|blocked|error
  config       String   @default("{}") // JSON
  okrLinks     String   @default("[]") // JSON array of OKR ids
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@index([role])
  @@index([status])
}

model Persona {
  id                   String   @id @default(cuid())
  name                 String
  archetype            String   @default("")
  demographics         String   @default("{}") // JSON
  goals                String   @default("[]") // JSON
  pains                String   @default("[]") // JSON
  behaviors            String   @default("[]") // JSON
  dayInLife            String   @default("")
  aiAdoptionReadiness  Float    @default(0) // 0-100
  notes                String   @default("")
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
}

model CRMContact {
  id            String         @id @default(cuid())
  name          String
  email         String?
  linkedin      String?
  twitter       String?
  organization  String?
  personaId     String?        // linked Persona
  personaScore  Float          @default(0) // 0-100 match score
  pipelineStage String         @default("LEAD") // LEAD|CONTACTED|INTERVIEWED|CUSTOMER|ADVOCATE
  pains         String         @default("[]") // JSON
  objections    String         @default("[]") // JSON
  signals       String         @default("[]") // JSON
  followUps     String         @default("[]") // JSON
  notes         String         @default("")
  interviews    Interview[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([pipelineStage])
  @@index([personaId])
}

model Interview {
  id           String      @id @default(cuid())
  contactId    String
  contact      CRMContact  @relation(fields: [contactId], references: [id], onDelete: Cascade)
  transcript   String      @default("")
  questions    String      @default("[]") // JSON
  insights     String      @default("[]") // JSON array of {type, content}
  assumptions  String      @default("[]") // JSON array of {assumptionId, validated, evidence}
  status       String      @default("SCHEDULED") // SCHEDULED|COMPLETED|CANCELLED
  scheduledAt  DateTime?
  completedAt  DateTime?
  followUpSent Boolean     @default(false)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  @@index([contactId])
  @@index([status])
}
```

### 3. Create Migration Script
Create `prisma/migrations/20260227_nerve_v4_phase1/migration.sql` with appropriate CREATE TABLE statements for the new models.

### 4. Update Sidebar
Edit `components/shared/sidebar.tsx` to add v4 navigation items:
- OKRs (target: /okrs) — icon: Target
- Assumptions (target: /assumptions) — icon: FlaskConical
- Agents (target: /agents) — icon: Bot
- Personas (target: /personas) — icon: Users
- CRM (target: /crm) — icon: Contact
- Interviews (target: /interviews) — icon: MessageSquare

Keep ALL existing v3 items (dashboard, docs, projects, tasks, artifacts, council, knowledge, etc.)

Add a visual separator/section header "Startup OS" before the new items.

### 5. Build OKRs Feature (`/okrs`)

**API Routes:**
- `app/api/okrs/route.ts` — GET (list all), POST (create)
- `app/api/okrs/[id]/route.ts` — GET, PATCH, DELETE
- `app/api/okrs/[id]/key-results/route.ts` — GET, POST
- `app/api/okrs/[id]/key-results/[krId]/route.ts` — PATCH (update progress)

**Pages:**
- `app/okrs/page.tsx` — OKR dashboard: cards per quarter, progress bars, KR completion %
- `app/okrs/[id]/page.tsx` — OKR detail: title, quarter, all key results with progress, edit inline

**UI Pattern:** Copy the v3 projects list style. Each OKR = card with colored progress bar (green/yellow/red based on completion %). KRs listed inline with input fields to update current value.

**Dashboard Integration:** Add OKR Health Bar to the main dashboard (`app/(dashboard)/page.tsx`) — 4 colored bars showing current quarter OKRs. Add below the existing dashboard sections.

### 6. Build Assumptions Log (`/assumptions`)

**API Routes:**
- `app/api/assumptions/route.ts` — GET (list, filterable by status/riskLevel), POST
- `app/api/assumptions/[id]/route.ts` — GET, PATCH, DELETE

**Pages:**
- `app/assumptions/page.tsx` — Grid of assumption cards. Color-coded by risk (red=5, orange=4, yellow=3, green=2, blue=1). Sortable by risk level. Filter tabs: All / Unvalidated / Validating / Confirmed / Invalidated.
- Each card shows: title, description (truncated), risk badge, status badge, confidence bar, evidence preview.
- Click to expand/edit inline.

**Features:**
- Create assumption modal (same pattern as v3 task form)
- Quick-update status with one-click buttons
- Evidence text area that appends (not replaces) on each update

---

## Phase 2: Agent Org Chart, Personas, CRM, Interviews

### 7. Build Agent Org Chart (`/agents`)

**API Routes:**
- `app/api/agents/route.ts` — GET (list), POST (create)
- `app/api/agents/[id]/route.ts` — GET, PATCH, DELETE

**Pages:**
- `app/agents/page.tsx` — Two views: List view (table with role, status, reporting_to) + Org chart view (tree visualization using nested divs/cards, NOT a graph library).
- Each agent card shows: name, role badge (color-coded), status indicator (idle=gray, working=green, blocked=yellow, error=red), approval tier badge.
- Click agent → detail panel slides in from right (same pattern as v3 task detail).
- Detail panel: edit name, role, description, tools (comma-separated list), memory scope, approval tier, reporting to (dropdown of other agents), OKR links.

**Default Agents Seeded (create on first load if no agents exist):**
Create a seed function that populates the 12 agents from the PRD org chart (CEO, PM, GTM, Ops, Dev + sub-agents). Add a "Seed default org chart" button on the empty state.

### 8. Build Personas (`/personas`)

**API Routes:**
- `app/api/personas/route.ts` — GET, POST
- `app/api/personas/[id]/route.ts` — GET, PATCH, DELETE

**Pages:**
- `app/personas/page.tsx` — Cards grid. Each persona card has: name, archetype badge, AI adoption readiness gauge (circular or bar), top 3 goals, top 3 pains.
- Create persona: form with fields for name, archetype, demographics (JSON fields as labeled inputs: age range, location, job title, income), goals (multi-line, one per line), pains (multi-line), behaviors, day-in-life (textarea), AI adoption readiness (slider 0-100).
- AI Generate button: POST to `/api/personas/generate` which calls OpenAI to fill in the persona based on a free-text description.

**API: `/api/personas/generate`** — POST with `{ description: string }`, calls OpenAI to return a structured persona object, saves and returns it.

### 9. Build CRM (`/crm`)

**API Routes:**
- `app/api/crm/route.ts` — GET (list contacts, filterable by stage/personaId), POST
- `app/api/crm/[id]/route.ts` — GET, PATCH, DELETE

**Pages:**
- `app/crm/page.tsx` — Kanban board view with columns for each pipeline stage (LEAD → CONTACTED → INTERVIEWED → CUSTOMER → ADVOCATE). Each contact = card with name, org, persona match score badge, latest interaction note.
- Can drag between stages (or use click-to-move buttons for simplicity — no drag library needed).
- Filter bar: filter by persona, sort by persona score.
- Create contact: modal form with name, email, linkedin, twitter, org, notes, persona selector (dropdown from Personas).
- Contact detail: click card → full detail panel with all AI profile fields (pains, objections, signals, follow-ups), editable notes, list of linked interviews.

**Persona Match Score:** Display as colored badge (green ≥70, yellow 40-69, red <40).

### 10. Build Interviews (`/interviews`)

**API Routes:**
- `app/api/interviews/route.ts` — GET (list), POST (create/schedule)
- `app/api/interviews/[id]/route.ts` — GET, PATCH, DELETE
- `app/api/interviews/[id]/process/route.ts` — POST (process transcript via AI → extract insights + update assumptions)

**Pages:**
- `app/interviews/page.tsx` — List view showing: contact name, status badge, scheduled date, number of insights extracted, follow-up sent indicator.
- Filter by status (SCHEDULED / COMPLETED / CANCELLED).
- Click interview → detail page.

- `app/interviews/[id]/page.tsx` — Detail page:
  - Header: contact info, status, dates
  - Transcript section: large textarea to paste transcript
  - "Process Transcript" button → calls `/api/interviews/[id]/process` → shows extracted insights
  - Insights section: list of extracted insights (type + content), each linked to an assumption
  - Assumptions updated section: shows which assumptions were updated with confidence delta
  - Questions section: the questions asked during this interview

**API: `/api/interviews/[id]/process`** — POST, reads the transcript, calls OpenAI to:
1. Extract insights: array of `{ type: "pain"|"desire"|"behavior"|"objection"|"feature_request", content: string }`
2. Update matched assumptions confidence and evidence
3. Return `{ insights, assumptionsUpdated, summary }`

---

## Dashboard Updates

Update `app/(dashboard)/page.tsx` to add v4 sections:

1. **OKR Health Strip** (top, below the existing header): Horizontal bar with current quarter OKRs and their progress. Each OKR = name + colored progress bar.

2. **Startup OS Stats** (new card row): 
   - Open Assumptions (count of UNVALIDATED + VALIDATING)
   - Interviews This Week (count)
   - Active Agents (count of non-idle)
   - Personas (count)

3. Keep ALL existing v3 dashboard sections below.

---

## Navigation & App Shell Updates

Update `components/shared/app-shell.tsx` and `components/shared/sidebar.tsx`:
- Rename app title from "NERVE v3" to "NERVE v4" everywhere
- Add the new Startup OS navigation section with separator
- Keep all v3 navigation items intact

---

## Styling Rules

- Use EXACTLY the same component patterns as v3: `Card`, `Badge`, `Button`, `Input`, `Textarea` from `components/ui/`
- Same color scheme (dark theme, same CSS variables)
- Same card-based layout with `SectionShell` wrapper
- Status badges: same pattern as v3 task status badges
- Forms: same modal/dialog pattern as v3
- No new UI libraries — only what's already in package.json

---

## Database Migration

After updating the schema, run:
```bash
npx prisma generate
```

For local dev, the SQLite dev.db will auto-update. Do NOT run migrations against the Turso DB — leave that for production deployment.

---

## Build & Deploy

After building all features:

1. **Test build:**
```bash
npm run build
```
Fix any TypeScript errors.

2. **Create Vercel project and deploy:**
```bash
# Install vercel CLI if needed
npm install -g vercel

# Link and deploy
VERCEL_TOKEN="VERCEL_TOKEN_REDACTED"
vercel link --yes --token=$VERCEL_TOKEN
vercel env add TURSO_DATABASE_URL production <<< "libsql://nerve-v3-gtomasello90.aws-ap-northeast-1.turso.io"
vercel env add TURSO_AUTH_TOKEN production <<< "TURSO_TOKEN_REDACTED"
vercel env add OPENAI_API_KEY production <<< "OPENAI_KEY_REDACTED"
vercel env add OPENROUTER_API_KEY production <<< "OPENROUTER_KEY_REDACTED"
vercel env add GEMINI_API_KEY production <<< "AIzaSyBj27KQ_hvjI7-IjkG9CWeqpw6m3XUwtMQ"
vercel env add ELEVENLABS_API_KEY production <<< "sk_0b94adccb9b062d9bcc4bf619e5e99a9fd5ac882028e4a10"
vercel env add AUTH_SECRET production <<< "nerve-v4-secret-2026-startup-os"
vercel env add NEXT_PUBLIC_APP_URL production <<< "https://nerve-v4.vercel.app"
vercel --prod --yes --token=$VERCEL_TOKEN
```

3. **After deploy, run migration against production DB** using the migrate.mjs script (already in the repo).

---

## What SUCCESS Looks Like

✅ `npm run build` passes with no TypeScript errors
✅ All v3 features still work (docs, projects, tasks, etc.)
✅ New sidebar section "Startup OS" with 6 new items
✅ /okrs page: OKR cards with progress, KR management
✅ /assumptions page: color-coded assumption log
✅ /agents page: agent org chart with list + org view
✅ /personas page: persona cards with AI generation
✅ /crm page: kanban board with pipeline stages
✅ /interviews page: interview list + transcript processing
✅ Dashboard updated with OKR strip + startup OS stats
✅ Deployed to Vercel (nerve-v4.vercel.app or similar)

When completely finished, run:
openclaw system event --text "Done: NERVE v4 Phase 1+2 built and deployed. OKRs, Assumptions, Agents, Personas, CRM, Interviews all working. URL: check Vercel output for deployment URL." --mode now
