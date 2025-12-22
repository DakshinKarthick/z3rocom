# Z3roCom UX Design Specification

**Version:** 1.0
**Date:** 2025-12-22
**Status:** Locked

---

## 1. Core Emotional Target

The primary emotion Z3roCom must deliver is **Empowered Control**.

This is not calm, zen, or mere efficiency. It is the feeling a user gets when they know, "Nothing can hijack this session unless I allow it." It is command-center control, not micromanagement.

The sentence users should feel, not say, is: **“I don’t have to keep everything in my head — the system is holding it.”**

### 1.1. Emotional Mix

- **Primary:** Empowered Control
- **Secondary (in order):**
    1.  **Momentum:** "We’re moving forward."
    2.  **Clarity:** "I know what matters."
    3.  **Relief:** "Nothing is getting lost."
    4.  **Confidence:** "This session will end well."

### 1.2. Design Philosophy

> "Every pixel reinforces control. Dark backgrounds recede. Blue borders command. Mono fonts measure. Widgets persist. Chat flows away. Nothing bounces. Everything obeys."

If a user doesn’t subconsciously feel, “This behaves like my editor, not a chat app,” the design has drifted.

---

## 2. Inspiration & UX Patterns

Our UX is a synthesis of three trusted applications:

| App        | Core Feeling | Pattern to Steal                               | Z3roCom Implementation                               |
| :--------- | :----------- | :--------------------------------------------- | :--------------------------------------------------- |
| **VS Code**  | **Control**    | Command Palette authority, persistent panels   | `/` commands, non-disposable Widget Zone, disposable Chat |
| **Linear**   | **Momentum**   | Opinionated flows, no clutter, clear states    | Task Slice Board, immutable Decision Log, auto-ending sessions |
| **Obsidian** | **Safety**     | Local-first feel, explicit structure, permanence | Immutable Outcome Summary, session archives, no data loss |

**North Star:** Z3roCom should feel like **VS Code running a Linear-style work session that ends with an Obsidian-grade artifact.**

---

## 3. Design System & Technical Foundation

- **Framework:** Next.js, React, TypeScript
- **UI Library:** **shadcn/ui**
- **Rationale:** Matches the developer-centric, "own your code" philosophy of VS Code. Radix primitives provide accessible, unstyled building blocks, and Tailwind CSS allows for the rapid, precise styling required to implement the specified design language.

---

## 4. Visual Design Language

### 4.1. Color System

**Primary Palette (Authority + Control)**

- **Background Hierarchy:**
    - App Shell: `#0D0D0D` (Deep black, VS Code)
    - Widget Zone: `#1A1A1A` (Elevated)
    - Chat Stream: `#0D0D0D` (Recessed, disposable)
    - Active Widget: `#262626` (Command focus)
- **Control States:**
    - Primary Action: `#3B82F6` (Authority blue)
    - Danger/Lock: `#EF4444` (Hard stop red)
    - Success/Done: `#10B981` (Momentum green)
    - Warning/Soft Lock: `#F59E0B` (Pre-lock amber)
- **Text Hierarchy:**
    - Primary: `#FFFFFF` (Commands, agenda, widget content)
    - Secondary: `#A1A1AA` (Metadata, timestamps)
    - Tertiary: `#52525B` (Disposable chat text)

### 4.2. Typography

- **Font Stack:**
    - **UI:** `Inter` (Clean, neutral, Linear-like)
    - **Code/Data:** `JetBrains Mono` (For timers, code widgets, data points)
- **Scale & Weight (Reinforces Permanence):**
    - **Agenda (Header):** 16px `semibold` (Immutable)
    - **Timer (Header):** 24px `JetBrains Mono` (Constant)
    - **Widget Headers:** 14px `semibold` (Persistent)
    - **Chat Messages:** 14px `regular` (Transient)
    - **Metadata:** 12px `regular` (Contextual)

### 4.3. Spacing & Density (4px Grid)

- **Header (Agenda/Timer/Distraction):** 48px height, fixed, never collapses.
- **Widget Zone:**
    - 8px vertical gap between widgets.
    - 12px internal padding.
    - Collapsed Height: 40px.
- **Chat Stream:**
    - 4px vertical gap between messages (dense, disposable).
    - Max width: 680px.
- **Message Input:** 56px height, fixed, always visible.

### 4.4. Motion Principles

**Core Rule:** Motion reinforces control and obedience. No playful physics.

- **Widget Expand/Collapse:** 200ms `ease-out` on height and opacity. No layout shift.
- **Timer Updates:** Instant. No animation.
- **Chat Auto-Scroll:** Smooth (400ms). User scroll instantly interrupts.
- **Loading States:** Skeleton screens, not spinners.
- **Anti-Patterns:** ❌ Bounce effects, ❌ fade-ins on every action, ❌ confetti.

---

## 5. User Journey Flows

### 5.1. Flow 1: Starting a Session

1.  **Create:** User clicks "New Session", enters a one-line agenda, and selects a preset timer (25/45/90 min).
2.  **Initialize:** The UI appears with the Agenda and Timer locked in the header. The Widget Zone is empty, and the Chat shows a "Session Started" message.
3.  **First Action:** User types `/tasks`, the Task Board widget materializes in the Widget Zone, and focus shifts to it.

### 5.2. Flow 2: Deploying Widgets

1.  **Trigger:** User types `/` in the message input.
2.  **Command:** A dropdown of available widgets appears. Arrow keys navigate, Enter deploys.
3.  **Materialize:** The widget appears in the zone, first collapsed (40px height), then auto-expands. A confirmation appears in the disposable chat.
4.  **Stacking:** New widgets stack vertically at the bottom of the Widget Zone. Multiple widgets can be expanded simultaneously.

### 5.3. Flow 3: Handling Locks

-   **Soft Lock (6 messages AND 3 minutes):**
    - **Effect:** Disables deployment of "deep work" widgets (`/code`, `/progress`).
    - **UI:** Distraction meter turns amber (`#F59E0B`), input border glows amber, chat shows a warning.
    - **Unlock:** Mark a task complete or update the agenda. The system provides positive feedback.
-   **Hard Lock (10 messages OR 6 minutes):**
    - **Effect:** Disables all chat input. Widget interaction remains possible.
    - **UI:** Input is disabled with a red border (`#EF4444`), a lock icon appears by the timer, and the distraction meter pulses red.
    - **Unlock:** Complete all agenda items or end the session.

### 5.4. Flow 4: Ending with Outcome Summary

1.  **Trigger:** Timer hits 00:00, user clicks "End Session", or `/end` is typed.
2.  **Generation:** The system freezes the UI and uses AI to analyze all session data (tasks, decisions, blockers, chat context).
3.  **Display:** All other widgets collapse. A new **Summary Widget** expands, showing:
    - **Completed Items**
    - **Incomplete Items**
    - **Decisions Made**
    - **Blockers Raised**
    - **AI Recommendations** for the next session.
4.  **Actions:** The summary provides three actions:
    - **[Copy to Clipboard]:** Exports a clean Markdown summary.
    - **[Start Next Session]:** Pre-fills a new session with AI recommendations.
    - **[Close]:** Archives the session and returns to the dashboard.

---

## 6. Component-Specific Design

### 6.1. Layout Components

- **Header:** 48px tall, fixed. Contains Agenda (left), Timer (center), and Distraction Meter (right, as a thin progress bar).
- **Widget Zone:** A persistent, scrollable column where widgets live.
- **Chat Stream:** A disposable, secondary column for transient conversation.
- **Message Input:** 56px tall, fixed. The command center for the application.

### 6.2. Widget States

- **Collapsed (Default):** 40px height, shows icon, title, and a status badge. Hovering shows a blue accent border.
- **Expanded (Active):** Background is elevated (`#262626`), and a blue "active ring" appears. Full widget content is visible.

### 6.3. Accessibility

- **Keyboard Navigation:** A logical tab order is enforced (Header -> Widgets -> Chat -> Input). `/` focuses the input, `Esc` collapses all widgets.
- **Focus Indicators:** A clear `2px solid #3B82F6` ring is always visible on focus.
- **Contrast:** All text meets WCAG AA standards (4.5:1).
- **Screen Readers:** Announce widget state changes, timer updates (per minute), and lock status immediately.

### 6.4. Responsive Design

- **Desktop (1024px+):** Full 3-column layout.
- **Tablet (768-1023px):** Widget zone collapses to icons; expansion overlays content.
- **Mobile (<768px):** Single-column focus. Chat is primary, widgets are accessed via a bottom sheet.

---
