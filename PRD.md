# NERVE v2 — Product Requirements Document

**Version:** 2.0.0
**Author:** Lobster 🦞 (AI Agent) for Giuseppe Tomasello
**Date:** 2026-02-11
**Status:** Draft — Awaiting Review

---

## 1. Executive Summary

NERVE v2 is the refactoring of an organically grown AI task engine into a structured **decision intelligence and execution platform**. It transforms scattered AI capabilities into a coherent pipeline: **scan context → generate projects → decompose tasks → approve → execute → capture artifacts → learn**.

The platform serves one user (Giuseppe) and one AI agent (Lobster), but is architected as if it will serve many — because clean architecture is non-negotiable. Every feature passes through a single thesis filter: **"Does this amplify human curiosity, or reduce humans to optimizers?"** If the answer is the latter, the feature doesn't ship.

NERVE v2 is not a to-do app with AI bolted on. It's an opinionated system where AI proposes strategic work grounded in real context, a human exercises judgment, and the system learns from that judgment over time.

---

## 2. Problem Statement

### What Exists Today
NERVE v1 grew feature-by-feature without a unifying architecture:
- Task proposals work but lack project-level context
- Preference memory exists but doesn't deeply inform generation
- Phone call system (Twilio + ElevenLabs) operates as a silo
- No artifact persistence — execution outputs vanish
- No project hierarchy — everything is a flat task
- UI is functional but unstructured

### Core Problems
1. **No context substrate.** AI generates proposals without scanning available knowledge, memory, or contacts. Proposals feel generic.
2. **No project layer.** Tasks float without strategic framing. There's no way to say "this task serves this larger goal."
3. **No artifact trail.** When a task produces research, documents, or analysis, there's nowhere to store it. Institutional memory leaks.
4. **Flat approval UX.** Approve/reject without seeing the reasoning chain, dependencies, or project context leads to shallow decisions.
5. **Weak feedback loop.** Preference data is collected but underutilized. The system doesn't visibly get smarter over time.

### What Success Looks Like
Giuseppe opens NERVE, sees a dashboard of active projects and pending proposals grounded in real context. He approves work with confidence because the AI's reasoning is transparent. Executed tasks produce artifacts he can reference later. Over weeks, the system's proposals become sharper because it learns what he values.

---

## 3. User Personas

### Giuseppe (Human Operator)
- **Role:** Solo founder, creative technologist, strategic thinker
- **Needs:** A system that does the cognitive heavy-lifting of project planning while preserving his agency over decisions
- **Behavior:** Reviews proposals in bursts; values density over verbosity; rejects anything that feels like busywork; trusts systems that show their reasoning
- **Anti-needs:** Does NOT want to micromanage AI agents, configure workflows, or read walls of status updates

### Lobster 🦞 (AI Agent)
- **Role:** Context scanner, project proposer, task decomposer, executor
- **Capabilities:** Access to memory files, knowledge base, contacts; can invoke different AI models for different cognitive loads
- **Constraints:** Cannot execute without approval; must show reasoning; must learn from rejection patterns
- **Integration:** Operates via OpenClaw as the orchestration layer

---

## 4. Core User Journeys

### Journey 1: Context Scan → Project Proposal

```
Trigger: Scheduled scan or manual "Scan Now"
    │
    ├─ Lobster scans: memory files, contacts, uploaded docs, calendar, prior artifacts
    ├─ Aggregates into a Context Snapshot (stored, versioned)
    ├─ Runs strategic analysis (o3): identifies opportunities, gaps, patterns
    ├─ Generates 1-3 Project Proposals with:
    │   ├─ Title + one-line thesis
    │   ├─ Strategic rationale (why now, why this)
    │   ├─ Thesis alignment score (curiosity amplification rating)
    │   ├─ Estimated scope (S/M/L)
    │   └─ Source context references
    │
    └─ Proposals appear in Giuseppe's dashboard under "Proposed Projects"
```

### Journey 2: Project Approval → Task Decomposition

```
Giuseppe reviews a Project Proposal
    │
    ├─ APPROVE → Project moves to "Active"
    │   ├─ Lobster decomposes into tasks (3-7 typically)
    │   ├─ Each task has: scope, deliverable, model tier, dependencies, estimated effort
    │   ├─ Tasks appear under the project as "Proposed Tasks"
    │   └─ Giuseppe can approve individually or batch-approve
    │
    ├─ REJECT (with optional feedback)
    │   ├─ Feedback stored in preference memory
    │   ├─ Project archived with rejection reason
    │   └─ Pattern extracted: "Giuseppe rejects X-type projects because Y"
    │
    └─ DEFER → Project moves to "Backlog" for future consideration
```

### Journey 3: Task Execution → Artifact Capture

```
Approved task enters execution queue
    │
    ├─ Lobster selects appropriate model tier:
    │   ├─ Research/analysis → o3 (deep thinking)
    │   ├─ Content generation → GPT-4o (balanced)
    │   └─ Formatting/summarization → GPT-4o-mini (fast)
    │
    ├─ Execution begins, status updates in real-time:
    │   ├─ QUEUED → IN_PROGRESS → REVIEW → COMPLETE | FAILED
    │   └─ Progress notes appended as execution log
    │
    ├─ Artifacts generated during execution:
    │   ├─ Documents (markdown, structured data)
    │   ├─ Research outputs (summaries, analyses)
    │   └─ Generated content (drafts, outlines)
    │
    └─ Artifacts stored and linked to task + parent project
```

### Journey 4: Phone Call Execution

```
Task type = "phone_call"
    │
    ├─ Lobster prepares call brief:
    │   ├─ Contact info (from contacts database)
    │   ├─ Call objective and talking points
    │   ├─ Context from parent project
    │   └─ Preferred voice profile (ElevenLabs)
    │
    ├─ Giuseppe approves call brief
    ├─ Call placed via Twilio + ElevenLabs
    ├─ Call transcript captured as artifact
    └─ Outcome logged, next steps generated as follow-up tasks
```

### Journey 5: Preference Learning Loop

```
Over time, approval/rejection data accumulates
    │
    ├─ Weekly preference digest generated:
    │   ├─ Approval rate by project type
    │   ├─ Common rejection reasons
    │   ├─ Emerging patterns ("prefers research over outreach")
    │   └─ Thesis alignment correlation
    │
    ├─ Preference model updated:
    │   ├─ Stored as structured preference vectors
    │   ├─ Fed into project/task generation prompts
    │   └─ Visible to Giuseppe ("Here's what I've learned about your preferences")
    │
    └─ Proposals get measurably better over time
```

---

## 5. Functional Requirements

### FR-1: Context Engine

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-1.1 | System scans memory files (markdown, text) from configured directories | P0 |
| FR-1.2 | System ingests uploaded documents (PDF, markdown, text) into knowledge base | P0 |
| FR-1.3 | System maintains a contacts database with structured metadata | P1 |
| FR-1.4 | Context scans produce a versioned Context Snapshot stored in the database | P0 |
| FR-1.5 | Context Snapshots are diffable — system can identify what changed since last scan | P1 |
| FR-1.6 | Manual "Scan Now" trigger available from dashboard | P0 |
| FR-1.7 | Scheduled scans run at configurable intervals (default: daily) | P2 |

### FR-2: Project Management

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-2.1 | AI generates Project Proposals based on latest Context Snapshot | P0 |
| FR-2.2 | Each project has: title, description, thesis alignment score, scope estimate, status | P0 |
| FR-2.3 | Project statuses: PROPOSED → ACTIVE → COMPLETED / ARCHIVED | P0 |
| FR-2.4 | Projects can be DEFERRED to backlog | P1 |
| FR-2.5 | Each project tracks its source context references | P1 |
| FR-2.6 | Projects display a progress summary (tasks completed / total) | P0 |
| FR-2.7 | Manual project creation supported (not only AI-generated) | P1 |

### FR-3: Task System

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-3.1 | Tasks are children of projects; no orphan tasks | P0 |
| FR-3.2 | AI decomposes approved projects into 3-7 tasks automatically | P0 |
| FR-3.3 | Each task has: title, description, deliverable, model tier, status, dependencies | P0 |
| FR-3.4 | Task statuses: PROPOSED → APPROVED → QUEUED → IN_PROGRESS → REVIEW → COMPLETE / FAILED | P0 |
| FR-3.5 | Tasks track execution logs (timestamped progress notes) | P0 |
| FR-3.6 | Task dependencies enforced — dependent tasks don't execute until prerequisites complete | P1 |
| FR-3.7 | Task types: research, content, analysis, outreach, phone_call, custom | P1 |
| FR-3.8 | Batch approve/reject for multiple tasks | P1 |
| FR-3.9 | Manual task creation under any active project | P1 |

### FR-4: Approval Flow

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-4.1 | Pending approvals displayed prominently on dashboard | P0 |
| FR-4.2 | Approval UI shows: task/project details, AI reasoning, source context, thesis alignment | P0 |
| FR-4.3 | Three actions: APPROVE, REJECT (with optional feedback text), DEFER | P0 |
| FR-4.4 | Rejection feedback stored and linked to preference memory | P0 |
| FR-4.5 | Approval history viewable with filters (date, type, decision) | P1 |
| FR-4.6 | Notification of new pending approvals (in-app badge, optional Telegram push) | P2 |

### FR-5: Execution Engine

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-5.1 | Approved tasks enter execution queue ordered by priority and dependencies | P0 |
| FR-5.2 | Execution engine selects model tier based on task type and complexity | P0 |
| FR-5.3 | Execution produces real-time status updates visible in task detail view | P0 |
| FR-5.4 | Failed tasks can be retried or manually marked as resolved | P1 |
| FR-5.5 | Concurrent execution limit configurable (default: 2 tasks) | P1 |
| FR-5.6 | Phone call execution via Twilio + ElevenLabs pipeline | P1 |
| FR-5.7 | Execution can be paused/cancelled by user | P1 |

### FR-6: Artifact Store

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-6.1 | Artifacts are files/documents produced during task execution | P0 |
| FR-6.2 | Each artifact linked to its source task and parent project | P0 |
| FR-6.3 | Artifact types: document, research, analysis, transcript, media, data | P0 |
| FR-6.4 | Artifacts stored with metadata: title, type, created_at, size, mime_type | P0 |
| FR-6.5 | Artifact content stored in database (for text) or file storage (for binary) | P0 |
| FR-6.6 | Artifacts browsable and searchable from dedicated Artifacts view | P1 |
| FR-6.7 | Artifacts viewable inline (markdown rendered, code highlighted) | P1 |

### FR-7: Preference Memory

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-7.1 | Every approve/reject decision logged with context | P0 |
| FR-7.2 | Preference data fed into project/task generation prompts | P0 |
| FR-7.3 | System generates periodic preference summaries (human-readable) | P1 |
| FR-7.4 | Preference patterns visible in a dedicated "Learning" view | P2 |
| FR-7.5 | User can manually adjust/override learned preferences | P2 |

---

## 6. Data Model

### Entity Relationship Diagram (Textual)

```
ContextSnapshot
  ├── id: string (cuid)
  ├── createdAt: datetime
  ├── sources: json (list of scanned sources)
  ├── summary: text (AI-generated summary)
  └── diffFromPrevious: text (nullable)

Project
  ├── id: string (cuid)
  ├── title: string
  ├── description: text
  ├── status: enum (PROPOSED, ACTIVE, DEFERRED, COMPLETED, ARCHIVED)
  ├── thesisScore: float (0.0 - 1.0)
  ├── scope: enum (S, M, L)
  ├── reasoning: text (AI's strategic rationale)
  ├── contextSnapshotId: FK → ContextSnapshot
  ├── createdAt: datetime
  ├── updatedAt: datetime
  ├── tasks: Task[]
  └── artifacts: Artifact[]

Task
  ├── id: string (cuid)
  ├── projectId: FK → Project
  ├── title: string
  ├── description: text
  ├── deliverable: text
  ├── type: enum (RESEARCH, CONTENT, ANALYSIS, OUTREACH, PHONE_CALL, CUSTOM)
  ├── status: enum (PROPOSED, APPROVED, QUEUED, IN_PROGRESS, REVIEW, COMPLETE, FAILED)
  ├── modelTier: enum (FAST, BALANCED, DEEP)
  ├── priority: int
  ├── dependsOn: Task[] (self-relation, many-to-many)
  ├── executionLog: ExecutionLog[]
  ├── artifacts: Artifact[]
  ├── createdAt: datetime
  └── updatedAt: datetime

ExecutionLog
  ├── id: string (cuid)
  ├── taskId: FK → Task
  ├── timestamp: datetime
  ├── message: text
  └── level: enum (INFO, WARN, ERROR)

Artifact
  ├── id: string (cuid)
  ├── taskId: FK → Task (nullable)
  ├── projectId: FK → Project
  ├── title: string
  ├── type: enum (DOCUMENT, RESEARCH, ANALYSIS, TRANSCRIPT, MEDIA, DATA)
  ├── mimeType: string
  ├── content: text (for text-based artifacts)
  ├── filePath: string (nullable, for binary)
  ├── sizeBytes: int
  ├── createdAt: datetime
  └── updatedAt: datetime

Decision
  ├── id: string (cuid)
  ├── entityType: enum (PROJECT, TASK)
  ├── entityId: string
  ├── action: enum (APPROVE, REJECT, DEFER)
  ├── feedback: text (nullable)
  ├── context: json (snapshot of what was shown at decision time)
  ├── createdAt: datetime
  └── metadata: json (extracted preference signals)

PreferenceVector
  ├── id: string (cuid)
  ├── dimension: string (e.g., "project_type", "scope_preference", "topic_affinity")
  ├── value: float
  ├── confidence: float (0.0 - 1.0)
  ├── sampleSize: int
  ├── updatedAt: datetime
  └── reasoning: text

Contact
  ├── id: string (cuid)
  ├── name: string
  ├── email: string (nullable)
  ├── phone: string (nullable)
  ├── organization: string (nullable)
  ├── notes: text (nullable)
  ├── metadata: json
  ├── createdAt: datetime
  └── updatedAt: datetime

KnowledgeDocument
  ├── id: string (cuid)
  ├── title: string
  ├── content: text
  ├── sourceUrl: string (nullable)
  ├── filePath: string (nullable)
  ├── mimeType: string
  ├── tags: json (string array)
  ├── createdAt: datetime
  └── updatedAt: datetime
```

---

## 7. UX/UI Requirements

### 7.1 Navigation Structure

```
┌─────────────────────────────────────┐
│  NERVE                    [Scan] [?]│
├─────────────────────────────────────┤
│  Dashboard                          │
│  Projects                           │
│  Tasks                              │
│  Artifacts                          │
│  Knowledge                          │
│  Preferences                        │
│  Calls                              │
│  Settings                           │
└─────────────────────────────────────┘
```

**Left sidebar navigation.** Collapsible on mobile. Active section highlighted. Badge counts for pending approvals.

### 7.2 Dashboard

The dashboard is the nerve center. It shows:

1. **Pending Approvals** (top priority, always visible)
   - Cards for each pending project/task with one-line summary
   - Quick approve/reject inline; click to expand for full context
2. **Active Projects** (progress bars, task counts)
3. **Recent Activity** (timeline of completions, approvals, artifacts)
4. **System Health** (context freshness, preference confidence, execution queue depth)

### 7.3 Design Principles

- **Information density over whitespace.** Giuseppe reads fast. Don't waste screen real estate.
- **Progressive disclosure.** Summary first, detail on click. Never dump everything at once.
- **Status is color.** Use consistent color coding: blue=proposed, yellow=in-progress, green=complete, red=failed, gray=deferred.
- **AI reasoning is always one click away.** Every AI-generated element should have a "Why?" affordance showing the reasoning chain.
- **Dark mode default.** Light mode optional.
- **No loading spinners for < 500ms.** Perceived performance matters.

### 7.4 Component Library

Use **shadcn/ui** as the base component system (already Next.js native). Extend with:
- Custom approval cards with swipe gestures (mobile)
- Inline markdown renderer for artifacts
- Collapsible reasoning panels
- Status badges with consistent semantics

---

## 8. Model Intelligence Strategy

### Tiered Model Architecture

| Tier | Model | Use Case | Latency | Cost |
|------|-------|----------|---------|------|
| **DEEP** | o3 | Strategic analysis, project generation, complex research, preference synthesis | 10-60s | High |
| **BALANCED** | GPT-4o | Task decomposition, content generation, call preparation | 3-10s | Medium |
| **FAST** | GPT-4o-mini | Summarization, formatting, status updates, simple classifications | 0.5-3s | Low |

### Model Selection Rules

```
Context Scanning       → DEEP (needs to synthesize across sources)
Project Generation     → DEEP (strategic reasoning)
Task Decomposition     → BALANCED (structured but not trivial)
Task Execution:
  ├── Research         → DEEP
  ├── Content          → BALANCED
  ├── Analysis         → DEEP
  ├── Outreach         → BALANCED
  ├── Summarization    → FAST
  └── Formatting       → FAST
Preference Analysis    → DEEP (pattern recognition over history)
Status Updates         → FAST
Thesis Scoring         → DEEP (philosophical alignment)
```

### Prompt Architecture

All prompts include three layers:
1. **System context:** Role definition, thesis filter, output format
2. **User context:** Latest Context Snapshot, relevant preference vectors, project history
3. **Task context:** Specific instructions, deliverable format, constraints

Preference vectors are injected as structured data, not prose. Example:
```json
{
  "preferences": {
    "favors_research_over_outreach": 0.82,
    "prefers_small_scope": 0.65,
    "values_philosophical_depth": 0.91,
    "rejects_generic_content": 0.88
  }
}
```

---

## 9. Technical Architecture

### 9.1 Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14+ (App Router) |
| Database | Turso (libsql) via Prisma ORM |
| Deployment | Vercel (serverless) |
| AI | OpenAI API (o3, GPT-4o, GPT-4o-mini) |
| Voice | ElevenLabs TTS |
| Telephony | Twilio |
| Agent Layer | OpenClaw (Lobster) |
| UI Components | shadcn/ui + Tailwind CSS |
| Auth | Single-user, API key or simple password gate |

### 9.2 Directory Structure

```
nerve-v2/
├── app/
│   ├── (dashboard)/
│   │   └── page.tsx              # Main dashboard
│   ├── projects/
│   │   ├── page.tsx              # Project list
│   │   └── [id]/page.tsx         # Project detail
│   ├── tasks/
│   │   ├── page.tsx              # Task list (filterable)
│   │   └── [id]/page.tsx         # Task detail + execution log
│   ├── artifacts/
│   │   ├── page.tsx              # Artifact browser
│   │   └── [id]/page.tsx         # Artifact viewer
│   ├── knowledge/
│   │   └── page.tsx              # Knowledge base management
│   ├── preferences/
│   │   └── page.tsx              # Preference dashboard
│   ├── calls/
│   │   └── page.tsx              # Call history + management
│   ├── settings/
│   │   └── page.tsx              # System settings
│   └── api/
│       ├── context/
│       │   └── scan/route.ts     # Trigger context scan
│       ├── projects/
│       │   ├── route.ts          # CRUD
│       │   ├── generate/route.ts # AI project generation
│       │   └── [id]/
│       │       ├── route.ts
│       │       └── decompose/route.ts  # Task decomposition
│       ├── tasks/
│       │   ├── route.ts          # CRUD
│       │   ├── [id]/
│       │   │   ├── route.ts
│       │   │   ├── approve/route.ts
│       │   │   └── execute/route.ts
│       │   └── batch/route.ts    # Batch operations
│       ├── artifacts/
│       │   └── route.ts          # CRUD
│       ├── decisions/
│       │   └── route.ts          # Log decisions
│       ├── preferences/
│       │   ├── route.ts          # Read preferences
│       │   └── analyze/route.ts  # Trigger preference analysis
│       ├── calls/
│       │   ├── route.ts          # Call management
│       │   └── initiate/route.ts # Place a call
│       └── webhooks/
│           └── twilio/route.ts   # Twilio callbacks
├── lib/
│   ├── ai/
│   │   ├── models.ts             # Model tier configuration
│   │   ├── prompts.ts            # Prompt templates
│   │   ├── context-engine.ts     # Context scanning logic
│   │   ├── project-generator.ts  # Project proposal logic
│   │   ├── task-decomposer.ts    # Task decomposition logic
│   │   ├── executor.ts           # Task execution orchestrator
│   │   └── preference-engine.ts  # Preference analysis
│   ├── db.ts                     # Prisma client
│   └── utils.ts
├── prisma/
│   └── schema.prisma
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── dashboard/
│   ├── projects/
│   ├── tasks/
│   ├── artifacts/
│   └── shared/
└── docs/
    └── PRD.md                    # This document
```

### 9.3 API Design Principles

- **REST-ish.** Standard CRUD on resources, action endpoints for AI operations.
- **Streaming for execution.** Task execution endpoints stream progress via Server-Sent Events.
- **Idempotent actions.** Approve/reject are idempotent — calling twice doesn't create duplicate decisions.
- **Consistent error shape.** `{ error: string, code: string, details?: any }`

### 9.4 Execution Queue Architecture

Since Vercel is serverless (no persistent workers), execution uses:

1. **API route triggers execution** → starts AI call
2. **For long tasks:** Use Vercel's `maxDuration` (up to 300s on Pro) or offload to a background function
3. **Progress updates:** Written to DB, polled by client (or SSE within the request duration)
4. **For very long tasks:** Consider Vercel Cron or external queue (Inngest, Trigger.dev) in Phase 3

### 9.5 OpenClaw Integration

Lobster (via OpenClaw) can:
- Trigger context scans via API
- Generate project proposals
- Execute tasks that require tool use (file creation, web research)
- Send notifications to Giuseppe via Telegram
- The NERVE UI is the **command center**; OpenClaw/Lobster is the **execution layer**

---

## 10. Success Metrics

### Quantitative

| Metric | Target (3 months) | Measurement |
|--------|-------------------|-------------|
| Project proposal approval rate | > 50% | Approved / Total proposed |
| Task completion rate | > 80% of approved tasks | Completed / Approved |
| Time from proposal to completion | < 48h for S-scope tasks | Median duration |
| Preference prediction accuracy | > 70% | Would-approve predictions vs actual |
| Artifact generation rate | > 1 artifact per completed task | Total artifacts / Completed tasks |
| Context scan freshness | < 24h stale | Time since last scan |

### Qualitative

- Giuseppe opens NERVE daily (it's genuinely useful, not an obligation)
- Proposals feel increasingly aligned with what he actually wants
- The artifact store becomes a reference library he returns to
- He trusts the system enough to batch-approve routine tasks

---

## 11. Phased Rollout Plan

### Phase 1: Foundation (Weeks 1-3)
**Goal:** Core data model, project/task CRUD, basic approval flow

- [ ] Prisma schema with all entities
- [ ] Project CRUD (API + UI)
- [ ] Task CRUD (API + UI) with project linkage
- [ ] Approval flow (approve/reject/defer with feedback)
- [ ] Decision logging
- [ ] Dashboard with pending approvals and active projects
- [ ] Navigation structure (sidebar, all routes)
- [ ] Dark mode, shadcn/ui setup

**Ship:** Usable platform for manual project/task management with approval flow.

### Phase 2: Intelligence (Weeks 4-6)
**Goal:** AI-powered generation and execution

- [ ] Context Engine: scan memory files and knowledge docs
- [ ] Context Snapshot storage and display
- [ ] AI Project Generation (o3) from context
- [ ] AI Task Decomposition (GPT-4o) from projects
- [ ] Task Execution Engine (model tier selection, progress tracking)
- [ ] Execution logs in task detail view
- [ ] Artifact creation and storage during execution
- [ ] Artifact browser and viewer

**Ship:** Full AI pipeline — scan → propose → decompose → execute → capture.

### Phase 3: Learning & Polish (Weeks 7-9)
**Goal:** Preference learning, phone calls, notifications

- [ ] Preference Engine: analyze decision history, extract patterns
- [ ] Preference vectors injected into generation prompts
- [ ] Preference dashboard (what the system has learned)
- [ ] Phone call pipeline (Twilio + ElevenLabs) integrated as task type
- [ ] Call transcript capture as artifacts
- [ ] Telegram notifications for new proposals
- [ ] Scheduled context scans (Vercel Cron)
- [ ] Task dependency enforcement

**Ship:** Self-improving system with full execution capabilities.

### Phase 4: Scale & Refine (Weeks 10-12)
**Goal:** Performance, reliability, advanced features

- [ ] Background execution queue (Inngest or Trigger.dev)
- [ ] Batch operations UI
- [ ] Context diffing (what changed since last scan)
- [ ] Knowledge base management UI (upload, tag, search)
- [ ] Contact management integrated with call system
- [ ] Preference override/tuning UI
- [ ] Performance optimization (caching, query optimization)
- [ ] Mobile-responsive polish

**Ship:** Production-grade platform ready for daily use indefinitely.

---

## 12. Non-Requirements (Explicitly Out of Scope)

- **Multi-user support.** This is Giuseppe's platform. No auth complexity, no RBAC, no team features.
- **Public API.** No external consumers. API is internal only.
- **Real-time collaboration.** Single user, no need.
- **Plugin system.** Premature abstraction. Build features directly.
- **Custom workflow builder.** The pipeline is opinionated. Scan → Propose → Approve → Execute. That's it.

---

## 13. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Vercel serverless limits for long executions | Tasks may timeout | Use streaming + Vercel Pro limits; Phase 4 adds external queue |
| AI proposals consistently miss the mark | User abandons platform | Aggressive preference learning; manual override always available |
| Turso/libsql performance at scale | Slow queries as data grows | Index early; artifact content in separate table; consider blob storage |
| Scope creep ("just one more feature") | Never ships | Phases are hard boundaries. Ship Phase 1 before writing Phase 2 code |
| Over-reliance on o3 costs | Expensive at scale | Model tier system ensures cheap models handle cheap tasks |

---

## 14. Open Questions

1. **Should context scans include external sources** (email, Twitter, calendar) or start with local files only? *Recommendation: Start local (Phase 2), add external in Phase 4.*
2. **Artifact storage for large files** — database blobs vs Vercel Blob Storage vs S3? *Recommendation: Text in DB, binary in Vercel Blob.*
3. **Should Lobster be able to auto-approve routine tasks** after confidence threshold is met? *Recommendation: Not in MVP. Trust must be earned.*
4. **Call system priority** — is it Phase 3 or can it wait? *Flagged for Giuseppe's input.*

---

## Appendix A: Thesis Filter

Every feature, every proposal, every task generated by NERVE should pass through this filter:

> **"Does this amplify human curiosity, or reduce humans to optimizers?"**

In practice:
- ✅ "Research the history of X" — amplifies curiosity
- ✅ "Draft an essay exploring Y" — amplifies agency
- ✅ "Analyze these contacts for collaboration opportunities" — amplifies connection
- ❌ "Optimize your email response time" — reduces to optimizer
- ❌ "A/B test your social media posts" — reduces to optimizer
- ❌ "Automate all follow-ups" — removes human judgment

The thesis score (0.0 - 1.0) is not a gate but a signal. It's shown alongside every proposal so Giuseppe can calibrate.

---

## Appendix B: Prompt Templates (Examples)

### Project Generation System Prompt

```
You are NERVE's strategic intelligence layer. Your role is to propose projects that amplify human curiosity and agency.

You have access to:
- A context snapshot summarizing the user's current knowledge, contacts, and memory
- Preference vectors reflecting what the user values
- History of previously approved and rejected projects

Generate 1-3 project proposals. Each must include:
1. Title (concise, actionable)
2. One-line thesis (what this achieves)
3. Strategic rationale (why now, why this, what context triggered it)
4. Thesis alignment score (0.0-1.0, how much this amplifies curiosity vs optimizes)
5. Scope estimate (S: <1 week, M: 1-3 weeks, L: >3 weeks)
6. Source references (which context elements informed this)

Filter: If a proposal would reduce the user to an optimizer, discard it.
```

### Task Decomposition System Prompt

```
You are NERVE's task decomposition engine. Given an approved project, break it into 3-7 concrete tasks.

Each task must have:
1. Title
2. Description (2-3 sentences, clear scope)
3. Deliverable (what artifact this produces)
4. Type: RESEARCH | CONTENT | ANALYSIS | OUTREACH | PHONE_CALL | CUSTOM
5. Model tier: FAST | BALANCED | DEEP
6. Dependencies (which other tasks must complete first, by index)
7. Estimated effort: XS (<30min) | S (<2h) | M (<1 day) | L (multi-day)

Order tasks logically. Research before content. Analysis before outreach.
```

---

*This document is living. Update it as NERVE v2 evolves.*
