# Z3roCom 14-Day MVP Plan: Chat-First

**Project:** Z3roCom — Focus-first Session Collaboration
**Date:** 2025-12-22
**Version:** 3.0 (14-Day Chat-First Plan)

## Guiding Principle
Deliver a functional, core real-time chat application in the first 7 days. Layer the foundational "Z3roCom" session control features (Timer, Agenda, Widgets) in the second week. This ensures a usable product is always available, with features being added on top.

---

## Week 1: Core Chat Application (Days 1-7)

### **Epic 1: Project Setup & Backend Foundation (Days 1-2)**
**Goal:** Establish a working backend capable of handling users, sessions, and real-time messages.

- **Story 1.1: Project Scaffolding**
    - Initialize a Next.js project with TypeScript and Tailwind CSS.
    - Set up a Fastify server with Socket.IO for real-time communication.
    - Configure `shadcn/ui` for frontend components.
- **Story 1.2: Data Schema**
    - Define Prisma schemas for `User`, `Session`, and `Message`.
    - A `Session` is equivalent to a chat room.
- **Story 1.3: Backend Session & Message Logic**
    - Create API endpoints for user registration/login (simple email/password).
    - Implement Socket.IO logic for joining a session (room).
    - Implement backend logic to receive a message, save it to the database, and broadcast it to other users in the same session.

### **Epic 2: Real-Time Chat Frontend (Days 3-7)**
**Goal:** Create a usable frontend where users can log in, join a session, and chat in real-time.

- **Story 2.1: User Authentication UI**
    - Build basic login and registration pages.
    - Upon login, present the user with a simple "Create or Join Session" UI.
- **Story 2.2: Core Chat Interface**
    - Build the main chat view using `shadcn/ui` components.
    - This includes the message display area, a list of participants, and the message input box.
- **Story 2.3: Real-Time Message Handling**
    - Connect the frontend to the Socket.IO backend.
    - Implement logic to send a message from the input box.
    - Implement logic to receive broadcasted messages and display them in the message stream.
- **Story 2.4: UI Polish (End of Week 1)**
    - Add timestamps and author names to messages.
    - Ensure the message stream auto-scrolls.
    - **Goal for Day 7:** A user can log in, start a session with another user, and have a real-time conversation.

---

## Week 2: Foundational Z3roCom Features (Days 8-14)

### **Epic 3: Essential Session Control (Days 8-10)**
**Goal:** Introduce the core features that differentiate Z3roCom from a standard chat app.

- **Story 3.1: The Header Bar**
    - Implement the fixed header component that will hold the Agenda and Timer.
- **Story 3.2: Session Timer**
    - Implement a `/timer <duration>` command.
    - When used, a shared, synced countdown timer appears in the header.
    - When the timer hits zero, the session auto-ends (see Story 4.3).
- **Story 3.3: Session Agenda**
    - Implement an `/agenda <text>` command.
    - When used, the text is pinned to the header. This is the session's goal.

### **Epic 4: The Widget System & Enforcement (Days 11-14)**
**Goal:** Build the widget architecture and the first enforcement rule.

- **Story 4.1: The Widget Zone**
    - Implement the "Widget Zone" layout area between the header and the chat stream.
    - Implement the expand/collapse functionality for this zone.
- **Story 4.2: First Widget - Task Board**
    - Implement the `/tasks` command.
    - When used, a basic `Task Slice Board` widget appears in the Widget Zone.
    - For the MVP, this widget's state is ephemeral and not saved after the session.
- **Story 4.3: Session Closure & Basic Enforcement**
    - When the session timer ends, disable the chat input.
    - Implement a *basic* soft-lock: after 10 messages, display a system message in chat suggesting an `/agenda` be set. No features are disabled yet.
    - On session end, generate a simple text-only summary in the chat, stating the agenda and how long the session ran.
- **Story 4.4: Review & Deploy (Day 14)**
    - Final integration testing.
    - Prepare for a Vercel/Netlify deployment.
    - **Goal for Day 14:** A functional chat app with a timer, agenda, and one basic widget.

---

## Post-14-Day Epics (Future Sprints)

- **Epic 5: Full Widget Suite**
    - Implement the remaining 9 widgets: Decision Log, Blocker Flag, Code Snippet, etc.
    - Implement persistence for widget data.
- **Epic 6: Advanced UX Rules & AI**
    - Implement the full soft and hard lock enforcement rules from the UX specification.
    - Integrate the AI-powered Distraction Meter and Outcome Summary generator.
- **Epic 7: Polishing and Scaling**
    - OAuth integration, user profiles, session history, and other enterprise-grade features.

