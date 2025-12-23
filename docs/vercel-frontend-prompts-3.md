# Z3roCom � Vercel Frontend Prompt Pack (Part 3: Chat + Widget Integration & Polishing)

Purpose: Close all remaining UI gaps from the MVP plan and Part 2 by fully specifying Chat, Header, Widgets, Enforcement, Accessibility, and Page flows. Implement within the existing Next.js app router and component structure without changing backend assumptions.

---

## Project UI Status vs Epic (Quick Read)

What looks present in `client/`:
- Pages: Setup, Session, Outcome, Archive, Join, Preferences folders exist (app router).
- Components: `app-header`, `chat-stream`, `message-input`, `widget-zone`, `system-status-bar`, `theme-provider`, shadcn `ui/*` primitives.

Likely missing or incomplete (must implement):
- Chat specifics: message types (user/system/command), tertiary styling, narrower column, skeletons, grouping, copy affordances.
- Header completeness: pinned `/agenda`, synced `/timer`, visible Distraction Meter with thicker reactive bar.
- System status line: distinct from chat; last command echo in monospace; Active/Paused/Ended.
- Widget suite beyond `/tasks`: Decision Log, Blocker Flag, Code Snippet, Progress Check, Outcome Summary modal, Next Session Seeder, Distraction Meter logic.
- Enforcement: soft lock (6 messages AND 3 min) and hard lock (10 messages OR 6 min) behaviors and UI.
- Accessibility & keybindings: `/` focus input, `Esc` collapse widgets, tab order, focus rings.
- Navigation/state handoff: Setup  Active, Active  Outcome, Outcome  Setup, Active  Archive, Join  Active.
- Preferences persistence and immediate reflection (theme/keybindings/time format).

---

## Chat � Make It Dev-Centric and Obedient

Prompt:
- Message Types: Implement `user`, `system`, and `command-echo` lines. `command-echo` uses JetBrains Mono and never glows.
- Styling: Chat column narrower than Widget Zone; tertiary text color (`#52525B`); dense 4px vertical spacing; max width 680px.
- Behavior: Smooth auto-scroll (400ms) on new messages unless user scrolls; skeletons for loading; group consecutive messages from same author with compact headers.
- Copy: Hover affordance on each message to copy; system lines copy without formatting.
- Commands: Echo `/agenda`, `/timer`, `/tasks`, `/decision`, `/blocker`, `/code`, `/progress`, `/next`, `/end` as `command-echo` immediately.

Acceptance:
- Distinct visual treatment for `system` vs `command-echo` vs `user`.
- Auto-scroll pauses when user interacts; resumes on new bottom message.
- Copy affordance visible on hover; copies clean text.
- No neon in chat content; only state lines use accents.

---

## Header � Agenda, Timer, Distraction Meter

Prompt:
- Agenda: `/agenda <text>` pins immutable text in the left of a fixed 48px header.
- Timer: `/timer <duration>` adds center countdown in JetBrains Mono; updates instantly; no animation.
- Distraction Meter: Right-rail thin bar is upgraded to  8px thickness, reacts to agenda-vs-chat similarity (stub acceptable), colors Green  Amber  Red with smooth functional easing.

Acceptance:
- Header height fixed at 48px; no layout shift.
- Agenda cannot be edited; re-issued `/agenda` replaces with confirmation.
- Meter announces threshold crossings to screen readers; color transitions smooth.

---

## System Status Line � Authority Without Noise

Prompt:
- Display session state (Active/Paused/Ended), remaining time, and last command echo in a distinct monospace line separate from chat.
- Lives under the header or at the top of the chat column; does not scroll with messages.

Acceptance:
- Always visible during Active/Paused; replaced by Outcome summary on End.
- Uses JetBrains Mono; no glow; concise phrasing.

---

## Widget Zone � Persistent, Stackable, Controlled

Prompt:
- Deploy via `/` command palette: lists available widgets with arrow-key navigation; Enter deploys.
- Collapsed State: 40px height; shows icon, title, status badge; hover shows blue accent border.
- Expanded State: Elevated background `#262626` with blue active ring; multiple widgets can be expanded simultaneously; 8px vertical gaps; 12px internal padding.
- Reorder: Drag to reorder within the zone without layout shift; heights animate (200ms ease-out) only on expand/collapse.

Acceptance:
- Widgets persist for the session; chat is disposable.
- No playful physics; motion is minimal and functional.

---

## Remaining Widgets � Full Specifications

### Decision Log (`/decision <text>`)
Prompt:a
- Immutable timeline; new entries append at top; echo in system line with confirmation.
- Each entry: id, text, creator, timestamp, immutable flag.
Acceptance:
- Command adds entry; timeline updates optimistically and locks; screen reader announces Decision recorded.

### Blocker Flag (`/blocker <issue>`) � Right Rail
Prompt:
- Right-rail list with unresolved count badge in header; toggle open/resolved; preserve history with timestamps.
- At ~80% elapsed time, show gentle reminder if unresolved > 0.
Acceptance:
- Header badge reflects unresolved count; reminder triggers at threshold (stub logic).

### Code Focus Snippet (`/code`)
Prompt:
- Single shared Monaco editor pane; only one active snippet per session; modes: Locked (admin-only writes) or Collaborative (all can write).
- Language detection, copy-to-clipboard, explicit lock indicator.
Acceptance:
- Second `/code` replaces snippet with confirmation; lock mode prevents edits for non-admin.

### Progress Check (`/progress`)
Prompt:
- Modal prompts each participant once: What did you complete? hides after submit; aggregate responses into summary view; status collecting/completed.
Acceptance:
- One submit per participant; aggregate displays chronologically; close returns focus to widgets.

### Outcome Summary (auto on end)
Prompt:
- Full-screen modal on session end; renders structured markdown: Agenda, Tasks Completed, Decisions, Blockers, Progress, Next Steps.
- Actions: Copy Markdown, Start Next Session (prefilled), Close/Archive.
Acceptance:
- Blocks UI until closed; Copy copies entire markdown; Start Next Session navigates to Setup with prefilled goal/duration.

### Next Session Seeder (`/next`)
Prompt:
- Form proposing goal and duration presets (25/45/90, default 45); list unresolved blockers with checkboxes to carry forward.
- Produces a seed artifact linkable for the next session.
Acceptance:
- Checked blockers carry into new Setup state; Use seed navigates to Setup with prefilled values.

### Distraction Meter (auto)
Prompt:
- Gauge behaves like CPU load: thicker bar, reactive updates; colors Green/Amber/Red; driven by agenda-vs-chat similarity (stub acceptable); screen reader announces threshold crossings.
Acceptance:
- Thickness  8px; transitions use minimal, functional easing; meter updates on message or agenda changes.

---

## Enforcement � Soft and Hard Locks

Prompt:
- Soft Lock (6 messages AND 3 minutes):
  - Disables deployment of deep work widgets (`/code`, `/progress`).
  - UI: Meter turns amber, input border glows amber, chat shows warning.
  - Unlock: Mark a task complete or update agenda; positive feedback.
- Hard Lock (10 messages OR 6 minutes):
  - Disables all chat input; widgets remain interactive.
  - UI: Input disabled with red border; lock icon appears by the timer; meter pulses red.
  - Unlock: Complete all agenda items or end session.

Acceptance:
- Locks change available commands/contextually disable inputs and palette items.
- Screen reader announces lock state changes immediately.

---

## Pages � Minimal, Purposeful Screens

### 1) Session Setup / Create Session
Prompt:
- Optional Session Name; Duration presets (25/45/90; default 45); Creator Role tag.
- Require Agenda: terminal-style `/agenda <goal>`; disable Start until set.
- Actions: Start (primary), Cancel (secondary). Inline rule tips for 15�120 min.
- Accessibility: Name  Duration  Agenda  Start; Enter submits.
State & Navigation:
- On Start: ephemeral client state `{id, name, agenda, duration, creator}`  navigate to Active.
Acceptance:
- Start disabled until agenda; default duration 45; keyboard-only  10s.

### 2) Active Session (reference)
- Apply all deltas: thicker/reactive meter; limited neon; monospace command echoes; chat tertiary/narrower; Header pinned.

### 3) Session End / Outcome Screen
Prompt:
- Full-screen closure; no chat. Sections: Agenda, Duration, Participants, Outcome markdown, Recommendations, Next Steps.
- Actions: Copy Markdown, Start Next Session, Close/Archive.
Acceptance:
- Shows 5+ sections; Copy works; enforced no chat.

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
- Settings: Theme (dark + neon accent toggle), Keybindings, Time format (12h/24h).
- Persist to localStorage.
Acceptance:
- Immediate reflection in UI; no advanced customization.

---

## Accessibility & Keybindings

Prompt:
- Keyboard: `/` focuses input; `Esc` collapses all widgets; tab order Header  Widgets  Chat  Input.
- Focus Indicators: `2px solid #3B82F6` visible on focus.
- Screen Readers: Announce widget state changes, timer updates (per minute), and lock status immediately.
- Contrast: All text meets WCAG AA ( 4.5:1).

Acceptance:
- Axe/ARIA checks pass for critical paths; announcements verified.

---

## Navigation & State Preservation

Prompt:
- Setup  Active: Start; carry agenda/duration state.
- Active  Outcome: auto on timer end or `/end`.
- Outcome  Setup: Start Next Session with proposed goal/duration.
- Active  Archive: header menu; read-only.
- Join  Active: on valid code.

Acceptance:
- Transitions preserve necessary state and feel purposeful.

---

## Theme, Fonts, and Performance Notes

Prompt:
- Fonts: next/font load Inter (UI) + JetBrains Mono (timers/system/commands) globally.
- Theme: Tailwind + shadcn; neon constrained to state (timer, focus locks, active widgets); never in chat content.
- SSR: Not required for MVP; client state acceptable.
- Performance: Avoid expensive animations; keep motion minimal; cache static assets.

Acceptance:
- Happy-path navigation works locally and on Vercel; integrates with existing components and layout.

---

## Implementation Constraints (Important)

- Do not change existing code structure; implement features within current components and pages.
- Use existing `SessionProvider` and event contracts; stub logic where backend is absent.
- Prefer shadcn/Radix primitives; follow the dark, control-focused visual language.

---

## Final Mental Model (Reaffirmed)

Page  Emotional Role
- Session Setup  Intent
- Active Session  Control
- Widgets  Progress
- Chat  Support
- Session End  Closure
- Archive  Trust

One-line Takeaway
- Z3roCom is one powerful screen with clean entry and exit; all other pages exist to enable that flow.