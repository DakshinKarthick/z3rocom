# Z3roCom – Vercel Frontend Prompt Pack (Part 2: Widgets First, Then Style & Pages)

This pack builds on the existing site and complements docs/vercel-frontend-prompts.md. It starts with prompts for the remaining widgets, then applies global design corrections, followed by pages, navigation, and scaffolding notes.

---

## Remaining Widgets — Prompt Pack

Implement these to complete the widget suite beyond `/timer`, `/agenda`, and `/tasks` from Part 1. All widgets are session-scoped and should integrate with the existing `SessionProvider`, event contracts, and UI patterns.

### Decision Log (`/decision <text>`)
Prompt:
- Add a read-only, immutable timeline. New entries append at top; no edits or deletes.
- Input via command executes immediately; show echo in system line and a confirmation.
- Each entry: id, text, creator, timestamp, immutable flag.
Acceptance:
- Command adds an entry; timeline updates optimistically and locks.
- Screen reader announces “Decision recorded”.

### Blocker Flag (`/blocker <issue>`)
Prompt:
- Add a right-rail list with unresolved count badge in header.
- Toggle items open/resolved; preserve history with timestamps.
- At ~80% elapsed time, show a gentle reminder if unresolved > 0.
Acceptance:
- Header badge reflects unresolved count.
- Reminder triggers at the threshold (stub logic in MVP).

### Code Focus Snippet (`/code`)
Prompt:
- Single shared Monaco editor panel; only one active snippet per session.
- Modes: Locked (admin-only writes) or Collaborative (all can write).
- Include language detection, copy-to-clipboard, and explicit lock indicator.
Acceptance:
- Second `/code` command replaces the snippet (with confirmation).
- Lock mode visibly prevents edits for non-admin.

### Progress Check (`/progress`)
Prompt:
- Modal prompts each participant once: “What did you complete?” and hides after submit.
- Aggregate responses into a summary view; mark status collecting/completed.
Acceptance:
- One submit per participant; aggregate displays chronologically.
- Close returns focus to widgets.

### Outcome Summary (auto on end)
Prompt:
- Full-screen modal at session end; renders structured markdown: Agenda, Tasks Completed, Decisions, Blockers, Progress, Next Steps.
- Actions: Copy Markdown, Start Next Session (prefilled), Close/Archive.
Acceptance:
- Blocks UI until explicitly closed; “Copy” copies entire markdown.
- “Start Next Session” opens Setup with prefilled goal/duration.

### Next Session Seeder (`/next`)
Prompt:
- Form proposing goal and duration presets (25/45/90). List unresolved blockers with checkboxes to carry forward.
- Produces a seed artifact linkable for the next session.
Acceptance:
- Checked blockers carry into the new Setup state.
- “Use seed” navigates to Setup with prefilled values.

### Distraction Meter (auto)
Prompt:
- Right-rail gauge behaves like CPU load: thicker bar, reactive updates; colors: Green (on-track), Amber (drifting), Red (off-topic, pulsing).
- Driven by agenda-vs-chat similarity (stub in MVP); screen reader announces threshold crossings.
Acceptance:
- Thickness ≥ 8px; transitions use minimal, functional easing.
- Meter updates on message or agenda changes.

---

## Global UI Feedback — Make It Feel “Dev”

Prompt:
- Apply constraints across all screens:
  - Distraction Meter: thicker/reactive; treat as system load.
  - Neon Usage: reserve neon highlights for state (timer, focus locks, active widgets).
  - Chat Prominence: visually recede chat (tertiary text, narrower column).
  - Agenda Input: mandatory terminal-style; block session start until set.
  - System Feedback: visible session state indicator and command echo (monospace).
  - Typography: Inter for UI; JetBrains Mono for timers/system/commands.
  - Feeling: Empowered control, command console — not social.

Acceptance:
- Meter thickness ≥ 8px; green→amber→red with smooth, non-playful easing.
- Only system state uses neon; chat/messages never glow.
- Agenda required before starting/joining.
- System status line present and distinct from chat.

---

## Pages

Minimal screens with clear entry/exit — build on current app router and components.

### 1) Session Setup / Create Session
Prompt:
- Optional Session Name; Duration presets (25/45/90; default 45); Creator Role tag.
- Require Agenda: terminal-style `/agenda <goal>`; disable Start until set.
- Actions: Start (primary), Cancel (secondary). Inline rule tips for 15–120 min.
- Accessibility: Name → Duration → Agenda → Start; Enter submits.
State & Navigation:
- On Start: ephemeral client state {id, name, agenda, duration, creator} → navigate to Active.
Acceptance:
- Start disabled until agenda; default duration 45; keyboard-only ≤ 10s.

### 2) Active Session (reference)
- Apply deltas: thicker/reactive meter; limited neon; monospace command echoes; chat tertiary/narrower.

### 3) Session End / Outcome Screen
Prompt:
- Full-screen closure; no chat. Sections: Agenda, Duration, Participants, Outcome markdown, Recommendations, Next Steps.
- Actions: Copy Markdown, Start Next Session, Close/Archive.
Acceptance:
- Shows 5+ sections; Copy works; enforced “no chat”.

### 4) Session Archive (read-only)
Prompt:
- Calm list of past sessions: filters/search left; summary viewer right.
- Decisions list linkable; read-only.
Acceptance:
- Search filters by agenda/decision; markdown renders accessibly.

### 5) Join Session Screen
Prompt:
- Fields: Session Code, name (optional); preview Goal + Duration.
- Join disabled until code valid.
Acceptance:
- Preview shows goal/duration; Enter joins when valid.

### 6) User Preferences (small)
Prompt:
- Three settings only: Theme (dark/neon accent), Keybindings, Time format (12h/24h).
- Persist to localStorage.
Acceptance:
- Immediate reflection in UI; no advanced customization.

---

## Pages to Explicitly Skip (for now)

Prompt:
- Do not build: community spaces, infinite chat history, social profiles, notification center, metric dashboards, mobile-first layouts.

---

## Navigation & Transitions

Prompt:
- Setup → Active: Start; carry agenda/duration state.
- Active → Outcome: auto on timer end or `/end`.
- Outcome → Setup: “Start Next Session” with proposed goal/duration.
- Active → Archive: header menu; read-only.
- Join → Active: on valid code.
- System Status Line: show Active/Paused/Ended, remaining time, last command echo.
- Keyboard: `/` focuses command; Esc collapses widgets; tab order Header → Widgets → Chat → Input.
Acceptance:
- Transitions preserve necessary state and feel purposeful.

---

## Vercel-Ready Scaffolding Notes

Prompt:
- App Router routes: `/setup`, `/session`, `/outcome`, `/archive`, `/join`, `/preferences`.
- SSR not required for MVP; client state is acceptable.
- Fonts via next/font (Inter, JetBrains Mono) applied globally.
- Tailwind v4 + shadcn/ui + Radix; neon constrained by theme tokens.
- Optional vercel.json; no custom server.
Acceptance:
- Happy-path navigation works locally and on Vercel; integrates with existing components and layout.

---

## Final Mental Model

Page → Emotional Role
- Session Setup → Intent
- Active Session → Control
- Widgets → Progress
- Chat → Support
- Session End → Closure
- Archive → Trust

One-line Takeaway
- Z3roCom is a single powerful screen with clean entry and exit; other pages exist only to enable that flow.
