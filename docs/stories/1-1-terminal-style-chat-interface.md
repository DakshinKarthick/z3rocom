# 1-1 Terminal-style Chat Interface

- Story ID: 1.1
- Story Key: 1-1-terminal-style-chat-interface
- Epic: Terminal Interface Foundation (epic-1)
- Status: ready-for-dev

## Story
As a developer
I want a neon-styled chat interface with monospace fonts
So that the chat feels authentic to my terminal environment

## Acceptance Criteria
- Chat interface uses neon green (#00ff41) on black (#000000) color scheme
- All text displays in JetBrains Mono or Fira Code fonts
- Message input has terminal-style cursor with blinking animation
- Message timestamps show in terminal format (HH:MM:SS)
- Interface maintains accessibility standards despite neon colors

## Tasks & Subtasks
1. Implement `TerminalInputComponent`
   - Detect `/` trigger and open `WidgetMenu` overlay
   - Ensure input focus management and prevent default browser behavior
2. Implement `WidgetMenu` component
   - Render widget list from configuration
   - Implement keyboard navigation and mouse handlers
   - Emit selected widget event to input component
3. Integrate with Widget System surface/API
   - Provide a lightweight adapter that inserts widget payload into input
   - If backend integration unavailable, mock API for UI tests
4. Implement `StickmanGuide` hook
   - Show contextual suggestion when menu opens
5. Styling and responsive layout
   - Terminal aesthetic tokens: monospace, neon accents, subtle glow
6. Tests
   - Unit tests for `TerminalInputComponent` and `WidgetMenu`
   - Integration/e2e scenario: open menu, navigate, select widget

## Dev Notes & Citations
- Derived from PRD: Terminal Command System and Core Commands (docs/PRD.md) — use `/` trigger, core commands list, and stickman behavior as specified.
- Align UI placement and real-time behavior with architecture guidance (docs/architecture.md).
- Follow implementation details from Epic-Story-Breakdown.md for Terminal Theme, fonts, cursor, and timestamps.
- Keep implementation lightweight; prefer feature-flagging the Widget API until integration is stable.

## Learnings from Previous Story
First story in epic - no predecessor context.

## Dev Agent Record

- Context Reference: stories/1-1-terminal-style-chat-interface.context.xml

## Change Log
- created: 2025-11-11 by Scrum Master agent
- sprint-status updated: development_status[1-1-terminal-style-chat-interface] = drafted
- story-context added: stories/1-1-terminal-style-chat-interface.context.xml
- sprint-status updated: development_status[1-1-terminal-style-chat-interface] = ready-for-dev
- story updated: content aligned with Epic-Story-Breakdown.md (2025-11-11)
- sprint-status confirmed: development_status[1-1-terminal-style-chat-interface] = ready-for-dev

[Sources]
- docs/PRD.md
- docs/architecture.md
- docs/Epic-Story-Breakdown.md
