# Z3roCom

**Focus-first Session Collaboration** — Timeboxed work sessions with shared widgets, mandatory outcomes, and minimal AI.

## Overview

Z3roCom helps small groups (≤10) run focused, timeboxed sessions that produce measurable outcomes. Each session has a goal, a timer, shared execution tools (widgets), and an auto-generated summary.

## Key Features (MVP)

- **Session Core**: Required timer and agenda; auto-end on countdown
- **Widgets**: Shared, real-time, session-scoped tools:
  - Focus: Timer, Agenda, Distraction Meter
  - Execute: Tasks, Decisions, Blockers, Code Snippet, Progress
  - Close: Mandatory Summary, Next Session Seeder
- **AI Facilitator**: Event-driven enforcement (no chat spam); generates summaries and suggestions
- **Enforcement**: Soft banner at 6 msgs AND 3 min; hard lock at 10 msgs OR 6 min; admin-only agenda edits

## Stack

- **Frontend**: Next.js, React, TypeScript
- **Backend**: Fastify, Socket.IO, TypeScript
- **Database**: SQLite (dev) / PostgreSQL (prod) via Prisma

## Quick Start

See [docs/developer-setup.md](docs/developer-setup.md) for installation and development instructions.

## Documentation

- [PRD](docs/PRD.md) — Product vision and scope
- [Architecture](docs/Architecture.md) — System design
- [Tech Spec](docs/Tech-Spec.md) — Technical blueprint
- [UX Design](docs/UX-Design.md) — User interaction guide
- [Epics & Stories](docs/Epic-Story-Breakdown.md) — Implementation sequencing
- [Sprint Change Proposal](docs/sprint-change-proposal-2025-12-22.md) — Replan summary and decisions

## Project Structure

```
├── client/              # Next.js + React frontend
├── server/              # Fastify + Socket.IO backend
└── docs/                # Project documentation
```

## Status

MVP planning complete; architecture decisions locked. Ready for implementation.

---

For detailed design and implementation guidance, see [docs/index.md](docs/index.md).
