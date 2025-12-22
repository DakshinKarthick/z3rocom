# Z3roCom Technical Specification (Session-Based, Widget-First)

**Project:** Z3roCom — Focus-first Session Collaboration  
**Date:** 2025-12-22  
**Version:** 1.1 (MVP Tech Spec, decisions locked)

## Overview
Z3roCom runs timeboxed sessions with a required agenda and timer, shared stateful widgets, and an AI facilitator that produces a mandatory outcome summary. Widgets are session-scoped and real-time synchronized; AI is event-driven and non-chatty.

## Architecture Summary
- Frontend: Next.js, React, TypeScript
- Backend: Fastify, Socket.IO, TypeScript
- Persistence: Prisma ORM; SQLite (dev), PostgreSQL (prod)

## Data Model
- Sessions(id, goal, duration_minutes, started_at, ended_at, max_participants=10)
- Participants(id, session_id, user_id, role, joined_at)
- Widgets(id, session_id, type, state_json, created_by, created_at)
- Decisions(id, session_id, text, created_at)
- Blockers(id, session_id, issue, status='open'|'resolved', created_at)
- ProgressEntries(id, session_id, user_id, text, created_at)
- Summaries(id, session_id, text, created_at)

Notes:
- `Widgets.type` enum: timer|agenda|tasks|decision|blocker|code|progress|distraction|next|summary
- `Widgets.state_json` stores minimal typed payloads per widget kind

## Commands → Actions
- `/start <duration>` → create timer widget; start session; tick via Socket; auto-end.
- `/agenda <goal>` → create agenda widget; pin UI focus; edits admin-only.
- `/tasks` → init task board widget with columns; support drag/drop updates.
- `/decision <text>` → append immutable decision entry.
- `/blocker <issue>` → create blocker entry; unresolved flag.
- `/code` → set single shared snippet; highlight; optional controlled edits.
- `/progress` → collect per-participant responses; aggregate.
- `/next` → propose next agenda + duration; carry blockers; store seed.

## Authoritative Widget Specification

| # | Widget Name | Command | Purpose | Why Unique | AI Involvement | Priority |
|---|---|---|---|---|---|---|
| 1 | Session Timer | `/start 60m` | Time-box work with shared urgency | Timers are global + visual, not personal | Reads for reminders & closure | ⭐⭐⭐⭐⭐ |
| 2 | Agenda Lock | `/agenda <goal>` | Define & enforce session objective | Enforces focus; changes UI state | Drift detection & enforcement | ⭐⭐⭐⭐⭐ |
| 3 | Distraction Meter | Auto | Visual focus feedback | No chat app measures focus | Analyzes topic drift | ⭐⭐⭐⭐ |
| 4 | Task Slice Board | `/tasks` | Track session-only tasks | Temporary by design, no backlog | Summarizes completed tasks | ⭐⭐⭐⭐⭐ |
| 5 | Decision Log | `/decision <text>` | Capture irreversible decisions | Decisions don't get buried | Extracts & summarizes | ⭐⭐⭐⭐ |
| 6 | Blocker Flag | `/blocker <issue>` | Highlight unresolved blockers | Forces acknowledgment | Reminds near session end | ⭐⭐⭐⭐ |
| 7 | Code Focus Snippet | `/code` | Share single reference snippet | Prevents snippet spam | Optional explanation | ⭐⭐⭐⭐ |
| 8 | Progress Check | `/progress` | Mid/end-session accountability | Structured updates, no noise | Aggregates responses | ⭐⭐⭐⭐ |
| 9 | Outcome Summary | Auto (end) | Capture session results | Slack cannot do natively | Full session synthesis | ⭐⭐⭐⭐⭐ |
| 10 | Next Session Seeder | `/next` | Prepare next work session | Creates habit loops | Suggests agenda & duration | ⭐⭐⭐⭐ |

### Widget Details

1. **Session Timer** (`/start <duration>`)
   - State: `{duration_minutes, elapsed_seconds, paused_at}`
   - Visibility: Pinned header, shared countdown
   - Constraints: admin pause/resume; auto-end at zero; enforced before any work
   - AI reads: triggers reminders at midpoint; closes session at end

2. **Agenda Lock** (`/agenda <goal>`)
   - State: `{goal_text, locked_at, edited_by}`
   - Visibility: Pinned header, focused mode UI
   - Constraints: edits admin-only; used as drift anchor by AI
   - AI reads: compares messages to goal for relevance

3. **Distraction Meter** (Auto)
   - State: `{drift_level (0-100), last_triggered_at}`
   - Visibility: Right rail, visual-only
   - Updates: on AI drift detection; no chat messages
   - Constraints: visual indicator only; no user input

4. **Task Slice Board** (`/tasks`)
   - State: `{columns: {todo: [], in-progress: [], done: []}, last_updated_at}`
   - Visibility: Modal or sidebar; drag/drop support
   - Constraints: session-scoped only; ephemeral; no backlog carryover
   - AI reads: extracts completed tasks for summary

5. **Decision Log** (`/decision <text>`)
   - State: `{text, decided_at, created_by}` (immutable)
   - Visibility: Timeline or card list; read-only
   - Constraints: no edit/delete after creation; timestamped
   - AI reads: extracts all decisions for outcome summary

6. **Blocker Flag** (`/blocker <issue>`)
   - State: `{issue_text, status (open|resolved), flagged_at, resolved_at}`
   - Visibility: Badge or separate list; highlights unresolved
   - Constraints: toggle status; appears in reminders near session end
   - AI reads: reminds about unresolved blockers before end

7. **Code Focus Snippet** (`/code`)
   - State: `{code_text, language, last_edited_by, created_at}`
   - Visibility: Embedded card with syntax highlight
   - Constraints: single active snippet per session; controlled edits only
   - AI reads: optional; can explain or suggest improvements

8. **Progress Check** (`/progress`)
   - State: `{prompt: "What did you complete?", responses: [{user_id, response_text, timestamp}]}`
   - Visibility: Form + aggregated rollup
   - Constraints: one response per participant; collected at mid/end
   - AI reads: aggregates and synthesizes for summary

9. **Outcome Summary** (Auto at end)
   - State: `{summary_text, session_recap, created_at, session_id}`
   - Visibility: Modal/page at session end; cannot be dismissed
   - Constraints: non-skippable; generated by AI; persisted per session
   - Contents: agenda, tasks completed, decisions made, blockers unresolved, next steps

10. **Next Session Seeder** (`/next`)
    - State: `{proposed_goal, proposed_duration, carried_blockers: [], created_by, timestamp}`
    - Visibility: Form + proposal artifact
    - Constraints: linkable for starting new session; carries blockers forward
    - AI reads: suggests agenda + duration based on prior progress

## Enforcement Rules (Final)
- Soft enforcement triggers when BOTH are true: N=6 messages AND T=3 minutes since first message.
  - Soft banner: “Set an agenda to continue effectively”.
  - Disable advanced widgets: `/tasks`, `/decision`, `/blocker`, `/progress`.
  - Chat still allowed (no hard lock yet).
- Hard enforcement: at 10 messages OR 6 minutes, block new messages until `/agenda` is set.
- Timer required to proceed; pause/resume admin-only.
- Sessions auto-end on timer; summary must render; no further messages allowed.
- Max 10 participants; deny joins beyond limit.
- Agenda edits: admin-only; participants can only suggest changes (non-blocking hint to admin).

## Default Session Durations (Presets)
- ⚡ Quick: 25 min — Pomodoro, quick decisions
- 🔧 Standard: 45 min — Coding, planning (default for first session)
- 🧠 Deep: 90 min — Hackathons, exam prep

Rules:
- Minimum: 15 min; Maximum: 120 min; no free-form durations in MVP.
- Auto-suggestions:
  - First session → default 45 min
  - If user ran ≥2 sessions today → suggest 25 min
  - If session includes `/code` or `/tasks` → suggest 45 min

## Real-Time Events (Socket.IO)
- `session:start` {sessionId, duration}
- `session:tick` {remainingSeconds}
- `session:end` {sessionId}
- `widget:create|update|delete` {id,type,state}
- `ai:drift` {level}
- `ai:summary` {summaryId}
- `ai:next` {seed}

## HTTP APIs (Minimal)
- POST `/api/session/start` {duration}
- POST `/api/session/agenda` {goal}
- POST `/api/widget` {type,state}
- GET `/api/session/:id/summary`
- GET `/api/session/:id/widgets`

## AI Orchestrator
- Inputs: chat transcript (read-only), widget states, timer events.
- Triggers: session start, timer midpoint, focus drift threshold, session end.
- Outputs: distraction meter updates (visual only), outcome summary (mandatory), next-session seed (optional).
- Constraints: no chat messages; minimal, non-intrusive UI; neutral tone.

## Security & Roles
- Roles: admin (creator), participant.
- Auth: JWT; Socket.IO auth handshake.
- Rate limits: command endpoints; widget operations.

## Performance
- Use debounced widget updates; batch socket emissions.
- Lazy-load heavy widgets; minimal JSON payloads.

## Migration
- Brownfield: integrate services incrementally; start with session core, then widgets, then AI.

## Milestones
1) Session Core (timer, agenda, size limit, auto-end)
2) Widgets: focus/control + execution/tracking
3) Closure widgets (progress, summary, next)
4) AI orchestrator (drift, summary, next)
5) UX rules enforcement and polish

Reference: Brainstorming preserved in docs/bmm-brainstorming-session-2025-11-10.md.