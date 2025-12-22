# Z3roCom Product Requirements Document (Simplified, Session-Based)

**Project:** Z3roCom — Focus-first Session Collaboration  
**Date:** 2025-12-22  
**Document Version:** 2.0 (Replan)  
**Author:** Product Manager (PM)

## 1. Executive Summary

### Vision
Z3roCom helps small groups run timeboxed work sessions that end with measurable outcomes. It is not a social chat app — sessions start, run, and end with clear goals, shared widgets, and an AI-generated outcome summary.

### Core Premise
- Rooms represent a single work session (temporary, not persistent).
- Widgets are first-class, shared state inside the session (not messages).
- AI acts as a facilitator (not a chatbot) to enforce clarity and produce outcomes.

### Non-Goals
- Not a Slack/Discord replacement, not a persistent community, not task management, not an AI playground.

## 2. Success Definition

- Every session has a goal, a timer, shared execution tools, and a non-skippable outcome summary.
- Post-session, participants can answer: “Did this session move the work forward?”
- Agenda/timer enforcement: soft at 6 msgs AND 3 min; hard lock at 10 msgs OR 6 min; sessions auto-end.

## 3. MVP Scope (Must)

### Session Core
- `/start <duration>`: required session timer; shared countdown; auto-end.
- `/agenda <goal>`: required goal pinned at top; “focused mode” UI; edits admin-only.
- Max room size: 10 participants.

#### Default Session Durations (Presets)
- 25 min (Quick), 45 min (Standard, default for first session), 90 min (Deep)
- Rules: minimum 15 min; maximum 120 min; no free-form durations in MVP.
- Suggestions: if user ran ≥2 sessions today → suggest 25; if session includes `/code` or `/tasks` → suggest 45.

### Widget-First System (Session-scoped)
- Focus/Control: Session Timer, Agenda Lock, Distraction Meter (AI-only, no chat spam).
- Execution/Tracking: Task Slice Board (`/tasks`), Decision Log (`/decision <text>`), Blocker Flag (`/blocker <issue>`).
- Dev/Student Support: Code Focus Snippet (`/code`).
- Closure/Accountability: Progress Check (`/progress`), Outcome Summary (auto), Next Session Seeder (`/next`).

### AI Facilitator (Event-driven)
- Reads transcript + widget state; monitors agenda relevance + session timing.
- Triggers at: session start, timer midpoint, focus drift threshold, session end.
- Outputs: distraction meter visual, gentle nudges, mandatory outcome summary, optional next-session suggestion.
- Constraints: no casual conversation, no message spam, minimal personality.

## 4. Users & Constraints

- Small teams of developers and students (≤10 per session).
- Sessions are ephemeral; state is session-scoped unless explicitly carried forward by “Next Session Seeder”.
- Opinionated UX rules enforced: agenda/timer required; sessions auto-end; outcome summary cannot be skipped.

## 5. Core Feature Specs

### Commands
- `/start <duration>`: start timer; shared countdown; auto-end.
- `/agenda <goal>`: set goal; pin; focused UI.
- `/tasks`: session-only todo → in-progress → done.
- `/decision <text>`: immutable decision record.
- `/blocker <issue>`: unresolved blocker flag.
- `/code`: one shared syntax-highlighted snippet.
- `/progress`: participant prompt “What did you complete?”; aggregated.
- `/next`: draft next agenda; suggest duration; carry blockers.

### Synchronization & Visibility
- All widgets are real-time synchronized; visible to all participants and readable by AI.
- Widgets are session-scoped; default is no carryover.

## 6. Technical Requirements

### Platform
- Frontend: Next.js + React + TypeScript.
- Backend: Fastify + Socket.IO + TypeScript.
- DB: SQLite (dev) / PostgreSQL (prod) via Prisma.

### Data
- Core tables: Sessions, Participants, Widgets (type, state JSON), Decisions, Blockers.
- Outcome summary persisted per session; next-session seed references previous.

### Real-time
- Socket rooms per session; widget events for create/update/delete.
- AI triggers consume transcript + widget events; produce non-spam outputs.

## 7. Success Criteria & Metrics

- 100% of sessions have goal, timer, and summary.
- ≥70% sessions include at least one execution widget.
- Focus drift warnings occur only when needed; nudges remain minimal.
- Post-session survey: ≥60% report “moved work forward”.

## 8. Out-of-Scope (MVP)

- Persistent community spaces; full backlog/task management; social feeds.
- Personality-rich AI; long-lived multi-project rooms; widget marketplace.

## 9. Dependencies

- Socket.IO for real-time; Prisma for persistence; simple rule engine for AI triggers.

## 10. Next Steps

- Implement the 14-Day MVP plan as defined in the `Epic-Story-Breakdown.md`.
- **Week 1:** Focus exclusively on building the core real-time chat application.
- **Week 2:** Layer on the foundational Z3roCom features: Timer, Agenda, and the first widget (Task Board).
- Post-MVP, resume implementation of the full widget suite and AI facilitator.

Reference: Brainstorming preserved — see session notes in docs/bmm-brainstorming-session-2025-11-10.md.
