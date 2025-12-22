# Z3roCom System Architecture

**Project:** Z3roCom — Focus-first Session Collaboration  
**Version:** 2.0 | **Date:** 2025-12-22

## Overview
Z3roCom is a session-based collaboration platform enforcing focus through timeboxed sessions, mandatory agendas, and 10 specialized widgets. Sessions auto-end with AI-generated summaries. Built for developers, students, and remote teams requiring structured, outcome-driven collaboration.

**Core Philosophy:** Widget-first (shared state), session-scoped (ephemeral), AI-facilitated (event-driven, non-intrusive).

## Technology Stack
**Frontend:** Next.js, React, TypeScript | **Backend:** Fastify, Socket.IO, TypeScript | **Database:** Prisma ORM with SQLite (dev) and PostgreSQL (prod) | **Real-Time:** Socket.IO rooms per session

## System Components

### 1. Session Service
Manages session lifecycle: creation, timer (25/45/90 min presets, min 15, max 120), participant limits (max 10), auto-end. Owns agenda enforcement and role-based permissions (admin = creator).

### 2. Widget Service  
Registry and CRUD for 10 widget types: `timer|agenda|tasks|decision|blocker|code|progress|distraction|next|summary`. Handles state sync via Socket.IO; persists to Prisma `Widgets(id, session_id, type, state_json, created_by, created_at)`.

### 3. Enforcement Service
Tracks message count and elapsed time. **Soft lock** (6 msgs AND 3 min): disables `/tasks`, `/decision`, `/blocker`, `/progress`; shows banner. **Hard lock** (10 msgs OR 6 min): blocks new messages until agenda set. Enforces admin-only agenda edits and capacity limits.

### 4. AI Orchestrator
**Event-driven triggers:** Session start, timer midpoint, drift threshold, session end. **Inputs:** Chat transcript + widget states (read-only). **Outputs:** Distraction meter updates (visual only), outcome summary (mandatory, structured), next-session seed (optional). **Never posts chat messages.**

### 5. Persistence Layer
Prisma models: `Sessions, Participants, Widgets, Decisions, Blockers, ProgressEntries, Summaries`. SQLite dev, PostgreSQL prod.

## Data Flow

**Session Creation:** `/start 45m` → Backend creates Session + Timer widget → Emits `session:start` → Frontend renders SessionProvider with Socket connection.

**Widget Interaction:** User interacts → Frontend emits `widget:update` (optimistic) → Backend validates → Broadcasts to all clients in room → SessionProvider updates state → UI re-renders.

**AI Analysis:** Enforcement Service detects drift → AI Orchestrator compares messages to agenda (embeddings) → Updates Distraction Meter widget → Frontend displays visual indicator.

**Session End:** Timer hits zero OR admin ends → Backend emits `session:end` → AI collects all widget states → Generates Outcome Summary → Modal blocks UI (non-dismissable) → User closes → Chat locked.

**Chat Message Flow:** User types message → Frontend emits `chat:message` → Backend validates and stores → Broadcasts `chat:message` to all clients → UI appends message to stream.

## UI Architecture

**Component Hierarchy:**
```
SessionPage
├─ SessionProvider (Context: state, Socket.IO)
│  ├─ Header (Agenda + Timer, sticky)
│  ├─ MainContent (MessageStream + WidgetRenderer + EnforcementBanner)
│  ├─ RightRail (DistractionMeter + DecisionsAndBlockers + ProgressRollup)
│  └─ Footer (Input + CommandPalette)
```

**State Management:** `useReducer` in SessionProvider centralizes Socket events. Widgets use local state for UI; emit events for persistence. Custom `useSocket(event, callback)` hook for subscriptions.

**Widget Rendering:** WidgetRenderer maps `type` enum → React component (`timer` → `<TimerWidget />`) → Passes `state_json` as props.

## AI Integration Points

1. **Distraction Meter (Widget 3):** Semantic similarity analysis (embeddings: agenda vs. messages). Threshold >60 triggers update. Visual-only, no chat.
2. **Blocker Reminders (Widget 6):** At 80% elapsed time, checks unresolved blockers → Emits subtle nudge.
3. **Progress Aggregation (Widget 8):** Synthesizes per-participant responses for summary.
4. **Outcome Summary (Widget 9):** Core AI feature. Reads all widgets (agenda, tasks, decisions, blockers, progress) → Generates structured markdown with sections (Agenda, Tasks Completed, Decisions, Blockers, Next Steps). Neutral tone, deterministic structure.
5. **Next Session Seeder (Widget 10):** Analyzes unresolved blockers and progress → Suggests agenda and duration for next session.

## Enforcement Rules

**Soft Enforcement (6 msgs AND 3 min):** Banner "Set an agenda to continue effectively" (non-dismissable). Disables `/tasks`, `/decision`, `/blocker`, `/progress`. Chat still allowed.

**Hard Enforcement (10 msgs OR 6 min):** Blocks new messages until `/agenda` set. Input disabled; banner persists.

**Timer Enforcement:** Required to start work. Pause/resume admin-only. Auto-end triggers summary (mandatory, non-skippable).

**Capacity Enforcement:** Max 10 participants. Join denied beyond limit.

## APIs (REST Minimal)
- `POST /api/session/start {duration}` → Creates session + timer
- `POST /api/session/agenda {goal}` → Sets/updates agenda
- `POST /api/widget {type, state}` → Creates widget
- `GET /api/session/:id/summary` → Retrieves AI summary

**Socket Events:** `session:start|tick|end`, `widget:create|update|delete`, `ai:drift|summary|next`, `enforce:soft|hard|capacity`

## Webhooks
Z3roCom supports webhooks to allow external systems to be notified of important events. Webhooks can be configured per session or globally.

**Webhook Events:**

- `session:started`: Fired when a new session begins.
- `session:ended`: Fired when a session ends.
- `agenda:set`: Fired when a session agenda is set or updated.
- `widget:updated`: Fired when any widget state changes.
- `summary:generated`: Fired when an AI-generated session summary is available.

**Webhook Payload:**

Each webhook event includes a standard payload structure:

```json
{
  "event": "session:started",
  "timestamp": "2025-12-22T17:12:45.016Z",
  "session_id": "sess_12345",
  "data": {
    // Event-specific data
  }
}
```

**Configuring Webhooks:**

To configure a webhook, you can use the following API endpoint:

- `POST /api/webhooks` → Registers a new webhook URL

## UI Integration

The Z3roCom UI is a single-page application (SPA) built with Next.js. It communicates with the backend via a combination of REST APIs and Socket.IO for real-time updates.

**Socket.IO Integration:**

Socket.IO is used for real-time communication between the frontend and backend. The frontend establishes a Socket.IO connection to the backend server when a session starts. The connection is scoped to the specific session ID, ensuring that users only receive updates relevant to their active session.

**REST API Integration:**

For non-real-time operations, such as fetching historical data or creating new sessions, the frontend uses REST APIs. These APIs are built using the Fastify framework.

**State Management:**

The frontend uses React's `useReducer` hook for state management. The `SessionProvider` component acts as the context provider, centralizing the state and Socket.IO event handling. Widgets manage their own local state but emit events to the backend for persistence and synchronization.

## Implementation Phases (14-Day MVP Plan)
**Week 1 (Days 1-7): Core Chat Application**
- Goal: A functional, real-time chat application.
- Deliverables: Backend foundation (Fastify, Socket.IO), Prisma schemas (`User`, `Session`, `Message`), and a working Next.js frontend for authentication and messaging.

**Week 2 (Days 8-14): Foundational Z3roCom Features**
- Goal: Layer core session control features onto the chat application.
- Deliverables: Header bar for Agenda/Timer, `/timer` and `/agenda` commands, the Widget Zone layout, and the first widget (`/tasks`).

**Post-MVP:** Subsequent sprints will focus on implementing the full widget suite, advanced enforcement rules, and the AI facilitator features as originally planned.

## References
- **Detailed Widget Specs:** [Widget-Specifications.md](Widget-Specifications.md) (all 10 widgets with state schemas, UI behaviors, AI integration)
- **Product Requirements:** [PRD.md](PRD.md)
- **Technical Spec:** [Tech-Spec.md](Tech-Spec.md)
- **UX Design:** [UX-Design.md](UX-Design.md)
- **Epic Breakdown:** [Epic-Story-Breakdown.md](Epic-Story-Breakdown.md)
