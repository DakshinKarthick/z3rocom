# Z3roCom Project Documentation Index

Generated: 2025-12-22 (Updated for Session-Based, Widget-First MVP)

## Project Summary
- Project: Z3roCom — Focus-first Session Collaboration
- Model: Session-centric, widget-first, AI facilitator
- Stack: Next.js + React (frontend); Fastify + Socket.IO (backend); Prisma + SQLite/PostgreSQL
- Status: MVP planning complete; architecture decisions locked

## Core Documentation
- **PRD**: [docs/PRD.md](PRD.md) — Product vision, scope, success criteria
- **Architecture**: [docs/Architecture.md](Architecture.md) — System design, components, events, APIs
- **Tech Spec**: [docs/Tech-Spec.md](Tech-Spec.md) — Technical blueprint; data model, enforcement rules, presets
- **UX Design**: [docs/UX-Design.md](UX-Design.md) — User interaction, widget layouts, enforcement behaviors
- **Epics & Stories**: [docs/Epic-Story-Breakdown.md](Epic-Story-Breakdown.md) — Implementation sequencing and acceptance criteria
- **Sprint Change Proposal**: [docs/sprint-change-proposal-2025-12-22.md](sprint-change-proposal-2025-12-22.md) — Replan summary and locked decisions

## Key Decisions (Locked)
- Agenda/timer enforcement: soft at 6 msgs AND 3 min; hard at 10 msgs OR 6 min
- Session durations: presets (25, 45, 90 min); min 15, max 120; no free-form in MVP
- Authoritative widgets: `/start`, `/agenda`, `/tasks`, `/decision`, `/blocker`, `/code`, `/progress`, `/next`
- Agenda edits: admin-only; participants can suggest
- Max 10 participants; sessions auto-end on timer; outcome summary mandatory

## Removed from MVP
- Concept Clarifier (`/clarify`)
- Free-form session durations
- Persistent community spaces

## Project Structure
- client/ — Next.js + React frontend
- server/ — Fastify + Socket.IO backend
- docs/ — Project documentation

## Reference
- Brainstorming: [docs/bmm-brainstorming-session-2025-11-10.md](bmm-brainstorming-session-2025-11-10.md) — Original session content (preserved)
- Developer Setup: [docs/developer-setup.md](developer-setup.md)

---
For implementation roadmap, see Epics & Stories. For technical details, see Tech-Spec and Architecture.
