# Sprint Change Proposal — Z3roCom Replan (2025-12-22)

Author: PM/Architect  
Status: Proposed (Decisions Locked)

## Summary
This proposal formalizes the pivot to a session-based, widget-first model with minimal, event-driven AI. It locks enforcement thresholds, session duration presets, and admin-only agenda control. All core docs are updated to reflect the MVP plan.

## Decisions (Locked)
- Agenda/timer enforcement:
  - Soft: after 6 messages AND 3 minutes → show banner “Set an agenda to continue effectively”; disable advanced widgets (`/tasks`, `/decision`, `/blocker`, `/progress`).
  - Hard: at 10 messages OR 6 minutes → block new messages until `/agenda` is set.
- Session duration presets: 25 (Quick), 45 (Standard, default for first session), 90 (Deep); min 15, max 120; no free-form durations in MVP.
- Suggestions: if user ran ≥2 sessions today → suggest 25; if using `/code` or `/tasks` → suggest 45.
- Agenda edits: admin-only; participants can suggest (non-blocking hints).
- Authoritative widget list: remove `/clarify`; outcome summary is auto-only (no `/summary` command).
- Capacity: max 10 participants; sessions auto-end on timer expiry.

## Docs Updated
- PRD: Updated enforcement thresholds, presets, admin-only agenda; removed `/clarify`. See [docs/PRD.md](PRD.md).
- UX Design: Added soft/hard enforcement behaviors; disabled advanced widgets pre-agenda; added presets UI; removed Clarifier. See [docs/UX-Design.md](UX-Design.md).
- Epics & Stories: Removed Clarifier story; added presets story; specified enforcement acceptance criteria. See [docs/Epic-Story-Breakdown.md](Epic-Story-Breakdown.md).
- Tech Spec: Locked decisions; updated widget enum; enforcement; presets; admin-only agenda. See [docs/Tech-Spec.md](Tech-Spec.md).

## Scope Impact
- Removed: Concept Clarifier (`/clarify`).
- Added: Preset durations and suggestion logic; explicit soft/hard enforcement.
- Clarified: Admin-only agenda edits; advanced widgets disabled until agenda.

## Risks & Mitigations
- Risk: Over-enforcement could frustrate users.  
  Mitigation: Soft banner first; clear copy; visible path to set agenda.
- Risk: Presets may not fit all sessions.  
  Mitigation: Three presets cover common cases; expand post-MVP.

## Acceptance / Definition of Done
- All updated docs reflect locked decisions and are consistent.  
- Backend enforces thresholds and presets; frontend surfaces banners and disables widgets appropriately.  
- Summary auto-generates at end; no post-end chat allowed.  
- No references to `/clarify` remain in MVP.

## Next Steps
1. Implement Epic 1 (Session Core) with Story 1.5 (Presets).  
2. Implement Epic 7 enforcement with exact thresholds and UI behaviors.  
3. Wire AI orchestrator for distraction meter + summary only.

Reference: Brainstorming preserved in [docs/bmm-brainstorming-session-2025-11-10.md](bmm-brainstorming-session-2025-11-10.md).
