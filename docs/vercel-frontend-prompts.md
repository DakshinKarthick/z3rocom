# Z3roCom - Vercel Frontend Prompt Pack

Use these prompts directly in v0/Lovable or as guidance for scaffolding a Next.js + shadcn/ui frontend on Vercel. They reflect the locked UX spec and 14-day MVP plan.

---

## App Shell & Theme

Prompt:
- Generate a Next.js app UI using shadcn/ui + Tailwind with a dark-first theme.
- Layout regions:
  - Fixed Header at 48px height (top, never collapses)
  - Persistent scrollable Widget Zone (middle column)
  - Disposable Chat Stream (secondary column)
  - Fixed Message Input at 56px (bottom)
- 4px grid spacing throughout.
- Color palette:
  - Backgrounds: App #0D0D0D, Widget Zone #1A1A1A, Active Widget #262626
  - Controls: Primary #3B82F6, Danger #EF4444, Success #10B981, Warning #F59E0B
  - Text: Primary #FFFFFF, Secondary #A1A1AA, Tertiary #52525B
- Typography: Inter for UI; JetBrains Mono for timers/data.
- Use Radix primitives to ensure accessibility.

## Header: Agenda + Timer + Distraction

Prompt:
- Build a fixed 48px header with three zones: left Agenda (16px semibold, immutable style), center Timer (24px JetBrains Mono, live countdown), right Distraction Meter (thin progress bar).
- No animation for timer updates; only instantaneous changes.
- Provide preset timer actions (25/45/90 min) and an agenda input that pins text on submit.
- Always show a clear 2px focus ring #3B82F6 on interactive elements.

## Widget Zone: Collapsible + Stackable

Prompt:
- Create a persistent, scrollable column for widgets with 8px vertical gaps and 12px internal padding.
- Default collapsed height 40px showing icon, title, and status badge.
- On expand: elevate background to #262626 and show a blue active ring.
- Use shadcn/ui Collapsible or Accordion with 200ms ease-out on height/opacity and no layout shift.
- Allow stacking multiple expanded widgets.

## Chat Stream: Dense & Disposable

Prompt:
- Implement a dense message list with 4px vertical gaps and max width 680px.
- Style message text as tertiary to visually recede versus widgets and header.
- Include timestamps and author names.
- Auto-scroll smoothly (400ms); instantly interrupt on user scroll.
- Show a participants list.

## Message Input + Command Palette

Prompt:
- Build a fixed 56px input as the command center.
- When the user types "/", open a shadcn/ui Command menu listing /timer, /agenda, /tasks.
- Arrow keys navigate; Enter deploys.
- After command execution, post a confirmation in chat and materialize the widget in the Widget Zone (collapsed -> auto-expand).

## Commands (Frontend Behaviors)

Prompt:
- /timer <duration>: Render a shared countdown in the header; expose handlers for future Socket.IO sync (no backend wiring yet).
- /agenda <text>: Pin agenda text to header with immutable styling.
- /tasks: Insert a "Task Slice Board" widget in the Widget Zone; use ephemeral state for MVP.

## Locks UI: Soft vs Hard

Prompt:
- Soft Lock (pre-lock): Turn distraction meter amber #F59E0B, add amber glow to input border, show a chat warning; temporarily disable deep-work commands (/code, /progress).
- Hard Lock: Disable chat input with a red border #EF4444, show a lock icon by the timer; widget interaction remains possible.
- Provide unlock cues (complete agenda or end session).

## Outcome Summary (Session End)

Prompt:
- On session end (timer hits 00:00 or /end): collapse all widgets and expand a Summary Widget.
- Sections: Completed Items, Incomplete Items, Decisions, Blockers, AI Recommendations.
- Actions: Copy Markdown, Start Next Session (prefilled), Close/Archive.

## Accessibility & Responsive

Prompt:
- Enforce tab order: Header -> Widgets -> Chat -> Input; "/" focuses input, Esc collapses all widgets.
- Screen reader announcements for widget state changes, per-minute timer updates, and lock status.
- Maintain WCAG AA contrast for all text.
- Responsive:
  - Desktop (>=1024px): Full 3-column layout.
  - Tablet (768-1023px): Widgets collapse to icons; expansion overlays content.
  - Mobile (<768px): Single-column focus; widgets via bottom sheet.

## Vercel-Ready Scaffolding

Prompt:
- Create a Next.js 14+ app with app/ router and TypeScript.
- Add Tailwind and shadcn/ui setup (npx shadcn@latest init with Radix).
- Add fonts (Inter, JetBrains Mono) via next/font and apply globally.
- Provide vercel.json (optional) with basic headers and Edge runtime for command palette route if needed.
- Ensure output: standalone or default Next.js Vercel build compatibility (no custom server needed for MVP).
- Add environment placeholders (.env.local) for future Socket.IO/URL configs.

## Vercel Deploy Prompts (Actions)

Prompt:
- Generate a short deployment checklist:
  1. Push repo to GitHub.
  2. Import to Vercel, Framework: Next.js.
  3. Set environment variables (none required for MVP; add NEXT_PUBLIC_APP_NAME=Z3roCom).
  4. Run Build: pnpm install && pnpm build.
  5. Verify pages and layout regions render correctly.
- Suggest optional optimizations: Edge runtime for command palette API, image optimization defaults, and analytics disabled for MVP.

## MVP Acceptance (Frontend)

Prompt:
- Day 7 goal: A user can log in (placeholder UI), start a session with another user (stub UI), and chat in real time (frontend-only mock for now). Header and Widget Zone present; /tasks adds the Task Board widget.
- Day 14 goal: Timer, Agenda, basic soft-lock warning, Summary Widget on end.

---

## Notes
- These prompts implement the locked UX spec (Empowered Control) and the 14-day chat-first MVP plan.
- Keep motion minimal and functional; no playful physics.
- Treat chat as disposable, widgets and header as persistent authority.