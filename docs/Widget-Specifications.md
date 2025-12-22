# Z3roCom Widget Specifications

**Project:** Z3roCom � Focus-first Session Collaboration  
**Date:** 2025-12-22  
**Version:** 2.0

## Widget Overview

Z3roCom uses 10 specialized widgets that are shared, stateful, and real-time synchronized across all session participants. Each widget serves a specific purpose in maintaining focus and productivity.

---

## 1. Session Timer (`/start`)
**Purpose:** Shared countdown that creates urgency and auto-ends sessions.

**Key Features:**
- Pinned in header, always visible
- Color changes: Green (>50% left)  Yellow (20-50%)  Red (<20%, pulsing)
- Admin-only pause/resume controls
- Auto-triggers session end and summary generation at zero

**State:** Duration, elapsed time, paused timestamp, status (running/paused/ended)

---

## 2. Agenda Lock (`/agenda`)
**Purpose:** Defines session goal; serves as focus anchor for AI drift detection.

**Key Features:**
- Pinned header card with goal text
- Admin-only edits; participants can suggest changes
- Edit history tracked with timestamps
- AI compares chat messages to agenda for drift calculation

**State:** Goal text, locked timestamp, editor ID, edit history

---

## 3. Distraction Meter (Auto)
**Purpose:** Visual-only focus indicator; no user interaction.

**Key Features:**
- Right rail display with gauge/bar chart
- AI-driven: compares recent messages to agenda using semantic similarity
- Color coding: Green (on-track)  Yellow (drifting)  Red (off-topic, pulsing)
- Updates automatically when drift threshold crossed

**State:** Drift level (0-100), last update timestamp, trend (improving/stable/worsening)

**AI Integration:** Uses embeddings to calculate semantic similarity between chat and agenda goal.

---

## 4. Task Slice Board (`/tasks`)
**Purpose:** Session-scoped kanban for tracking work; ephemeral by design.

**Key Features:**
- Three columns: Todo  In Progress  Done
- Drag-and-drop with real-time sync
- Any participant can add/move tasks
- Not carried to next session (intentionally temporary)

**State:** Task columns with arrays, each task has ID, text, creator, timestamp

---

## 5. Decision Log (`/decision`)
**Purpose:** Immutable record of decisions made during session.

**Key Features:**
- Timeline format, newest at top
- Cannot edit or delete once created
- Read-only display with timestamps
- AI extracts all decisions for outcome summary

**State:** Array of decision entries (ID, text, creator, timestamp, immutable flag)

---

## 6. Blocker Flag (`/blocker`)
**Purpose:** Highlights unresolved issues; AI reminds before session ends.

**Key Features:**
- Header badge shows unresolved count
- Right rail list with open/resolved status
- Toggle to mark resolved (keeps history)
- AI checks at 80% elapsed time and nudges about open blockers

**State:** Blocker array (ID, issue text, status, timestamps), unresolved count

**AI Integration:** Monitors unresolved blockers and triggers reminders near session end.

---

## 7. Code Focus Snippet (`/code`)
**Purpose:** Single shared code snippet; prevents chat spam from multiple snippets.

**Key Features:**
- Syntax highlighting with language detection
- Two modes: Locked (admin-only edits) or Collaborative (all can edit)
- Monaco Editor integration
- Copy-to-clipboard button
- Only one active snippet per session

**State:** Code text, language, last editor, edit mode (locked/collaborative)

---

## 8. Progress Check (`/progress`)
**Purpose:** Collects accountability responses from all participants.

**Key Features:**
- Modal with prompt: \"What did you complete?\"
- Each participant submits once (form disappears after)
- Aggregated rollup shows all responses
- Can auto-trigger at 50% elapsed time
- AI reads for outcome summary

**State:** Prompt text, response array (user ID, text, timestamp), status (collecting/completed)

**AI Integration:** Aggregates all responses into summary highlights.

---

## 9. Outcome Summary (Auto)
**Purpose:** Mandatory AI-generated session recap; cannot be skipped.

**Key Features:**
- Full-screen modal at session end
- Structured sections: Agenda, Tasks Completed, Decisions, Blockers, Progress, Next Steps
- Loading spinner while AI generates
- Export as markdown or copy to clipboard
- Blocks UI until explicitly closed

**State:** Summary text (markdown), structured recap object, generation status (pending/completed)

**AI Integration:** Core AI feature - reads all widget states (agenda, tasks, decisions, blockers, progress) and synthesizes comprehensive summary with neutral tone.

---

## 10. Next Session Seeder (`/next`)
**Purpose:** Drafts next session agenda and carries forward unresolved blockers.

**Key Features:**
- Form with proposed goal and duration (25/45/90 presets)
- Checkbox list of current unresolved blockers
- Creates linkable seed artifact
- Starting new session with seed auto-populates agenda and recreates blockers
- AI suggests goal based on unresolved items

**State:** Proposed goal, duration, carried blocker array, creator, timestamp, status (draft/used)

**AI Integration:** Analyzes unresolved blockers and progress to suggest next agenda.

---

## Widget Architecture Pattern

All widgets follow a consistent structure:

**Data Storage:**
- Backend: Prisma model with session_id, type enum, state_json, creator, timestamp
- State synced via Socket.IO to all session participants

**Communication:**
- Frontend emits: `widget:create`, `widget:update`, `widget:delete`
- Backend broadcasts: Same events to all clients in session room
- Optimistic updates: UI updates immediately, backend validates and broadcasts canonical state

**UI Pattern:**
- SessionProvider manages all widgets via React Context
- WidgetRenderer dynamically loads component based on type enum
- Each widget component manages internal UI state
- Persistent changes emit Socket events

---

## AI Integration Summary

**Where AI is Used:**
1. **Distraction Meter (Widget 3):** Semantic similarity analysis between chat and agenda
2. **Blocker Reminders (Widget 6):** Checks unresolved blockers at 80% elapsed time
3. **Progress Aggregation (Widget 8):** Synthesizes participant responses
4. **Outcome Summary (Widget 9):** Core AI feature - generates structured recap
5. **Next Session Suggestions (Widget 10):** Recommends agenda based on context

**AI Principles:**
- Event-driven: Triggered by session lifecycle, not chat spam
- Visual outputs: Distraction meter, summaries, nudges
- Never posts chat messages
- Neutral, professional tone
- Reads widget states + transcript, writes to specific widgets only

---

## Implementation Phases (14-Day MVP)

**Week 1 (Days 1-7): Core Chat Application**
- A functional chat application is the priority. No widgets are built this week.

**Week 2 (Days 8-14): Foundational Z3roCom Features**
- **Days 8-10:** Session Timer & Agenda Lock (Header UI).
- **Days 11-14:** Task Slice Board (as the first widget in the new Widget Zone).

**Post-MVP:**
- The remaining widgets (Decision Log, Blocker Flag, Code Snippet, etc.) and the full AI suite (Distraction Meter, Outcome Summary) will be implemented in subsequent sprints.
---

**Reference:** For full architecture and backend services, see [Architecture.md](Architecture.md)
