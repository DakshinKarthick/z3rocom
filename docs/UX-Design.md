# Z3roCom UX Design Specification

**Project:** Z3roCom - Developer-focused Chat Application  
**Date:** 2025-11-10  
**UX Designer:** Sally  
**Version:** 1.0

## 1. Project Understanding Confirmed

### Core Experience Definition
**Primary Activity:** Chat-focused collaboration with occasional widget enhancement  
**Critical Success Factor:** Setting and maintaining agenda focus to keep teams on track  
**Key Interaction:** Visual widget menu appears when users type `/` for manual selection  
**User Balance:** Accessible to both developers and college students through visual interfaces

### Target Users Validated
- **Primary:** Developers (hackathon teams, work sprints, open source collaboration)
- **Secondary:** College students (study groups, coding bootcamps, group assignments)
- **Shared Need:** Productive project planning and collaboration without productivity loss

### Platform Context
- **Web Application:** Next.js + Fastify + Socket.IO
- **Brownfield Approach:** Building on existing scaffold
- **Aesthetic:** Terminal/hacker theme with neon colors and monospace fonts
- **Personality:** Stickman guide for friendly assistance

## 2. Core Experience Priorities

### Most Important User Actions (In Order)
1. **Agenda Setting & Maintenance** - Keeps teams focused and productive
2. **Visual Widget Selection** - `/` triggers accessible menu for all skill levels  
3. **Seamless Chat Flow** - Natural conversation with productivity enhancements
4. **Stickman Guidance** - Contextual help without being intrusive

### Design Success Criteria
- **Agenda focus** prevents conversation drift
- **Widget deployment** feels effortless, not technical
- **Terminal aesthetic** appeals to developers but doesn't intimidate students
- **Interface balance** between personality (fun) and productivity (focus)

## 3. Visual Design Language

### Aesthetic Direction
**Overall Vibe:** Playful gaming interface with sci-fi exclusivity - "unreal" feeling that makes users feel special
**Color Foundation:** Classic green terminal on black for authentic hacker aesthetic
**Personality Balance:** Underground exclusive feel while remaining welcoming to students

### Character Design
**Stickman Guide:**
- **Style:** Simple pixel art (8-bit style) for retro gaming charm
- **Behavior:** Appears/disappears contextually (not always visible)
- **Animation:** Static poses, no animated behaviors (clean and minimal)
- **Purpose:** Contextual assistance without visual distraction

### Widget Menu Systems
**Multiple Interaction Options** (user preference or context-dependent):
1. **Terminal Autocomplete Dropdown** - VS Code IntelliSense style for developers
2. **Command Palette Overlay** - Figma-style quick actions for power users  
3. **Gaming Radial Menu** - Cursor-centered radial selection for immersive feel

### Color Palette Foundation
**Primary:** Classic green (#00FF00) on pure black (#000000)
**Accent Colors:** Needed for different interface states and widget categories
**Accessibility:** Ensure contrast ratios work for extended use

## 4. Core Interface Design

### Main Chat Layout
**Agenda System:**
- **Setting:** Users can set agenda but it's stored in metadata (not always visible)
- **Visual Indicator:** Only progress toggle visible in main interface
- **Access:** Users navigate to metadata view to see full agenda details
- **Focus:** Progress indicator keeps teams aware without cluttering interface

### Room Booking System
**Lobby Picking Concept:**
- **Game-style lobby interface** for room selection and creation
- **Time-based system:** Scheduled time slots + instant room creation
- **Purpose-driven templates:** Pre-configured room types (Study Session, Sprint Planning, Hackathon, Code Review)
- **Visual Style:** Gaming lobby aesthetic with available/occupied room status

### Stickman Guide Assistance
**Template Suggestions:** Contextual help with room/agenda templates
- **Room Creation:** "Hey! Looks like you're planning a hackathon - want the Hackathon template?"
- **Agenda Setting:** "Need help structuring your sprint planning agenda?"
- **Widget Recommendations:** "This conversation seems like debugging - want error tracking widgets?"
- **New User Onboarding:** Guide through first room creation and widget usage

### Widget Menu Interaction
**Hybrid Visual + Command System:**
- **Primary:** Visual icons for widgets (🎵 music, 📋 project, 📊 poll, etc.)
- **Secondary:** Same widgets accessible via commands (`/music`, `/project`)
- **Discovery:** New users see visual icons, power users learn commands naturally
- **Stickman Role:** Helps locate widgets during onboarding only (not permanent feature)

## 5. Detailed User Flows

### Agenda Management Flow
**Setup:** Manual agenda creation by users (not automatic)
**Interface Elements:**
- **Bottom Progress Bar:** Persistent, minimalist progress indicator
- **Metadata Panel:** Accessible overlay for full agenda details and editing
- **Gentle Nudges:** Subtle progress reminders without overwhelming chat flow

### Room Creation & Access
**Quick Rooms:**
- **Instant Creation:** Immediate access for spontaneous collaboration
- **Limited Duration:** Time-boxed sessions with clear end times
- **Template Options:** Available but not required for quick rooms

**Scheduled Rooms:**
- **Waiting Time System:** Users can book future time slots
- **Template Integration:** Purpose-driven room setups with agenda templates
- **Gaming Lobby Feel:** Visual server browser showing available/scheduled rooms

### Widget Discovery & Usage
**Visual Menu System:**
- **Icon-Based Interface:** Clear visual representation of each widget type
- **Categories:** Organized by function (Communication, Project Tools, Planning, etc.)
- **Quick Access:** Icons remain visible/accessible without remembering commands
- **Command Backup:** Power users can type commands for faster deployment

### Onboarding Experience
**Stickman Guide Role:**
- **Widget Location:** "The music widget is here!" with pointer to icon
- **Template Suggestions:** "Try the Hackathon room template for your project"
- **One-time Help:** Appears during first few sessions, then contextual only
- **Progressive Disclosure:** Introduces features gradually, not all at once

## 6. Final Interface Specifications

### Widget Interface Design
**Horizontal Icon Bar:**
- **Location:** Persistent toolbar above chat input field
- **Icons:** 🎵 Music, 📋 Project, 📊 Poll, ⏰ Agenda, 🎯 Focus, 💡 Ideas
- **Access Methods:** Click icon OR type `/music` - both trigger same raw widget container
- **Visual Style:** Green neon icons on dark background with subtle glow on hover

**Raw Widget Container System:**
- **Activation:** Clicking icon or typing command opens editable widget form
- **Interface:** Modal overlay with form fields specific to widget type
- **Example:** `/music` opens container with fields for track, artist, platform, status
- **Deployment:** After filling data, widget becomes chat message with rich preview
- **Editing:** Users can edit widget data before sending, or edit existing widgets

### Bottom Progress Bar Details
**Visual Design:** Classic terminal loading bar with green ASCII blocks (████░░░░) 
**Interaction:** Click to open metadata panel overlay
**Display:** Shows percentage + brief agenda phase ("Sprint Planning - 60%")
**Behavior:** Pulses gently when agenda milestones are reached

### Metadata Panel Design
**Access:** Click progress bar or keyboard shortcut (Ctrl+M)
**Style:** Slide-out overlay from bottom, terminal-themed with green text
**Content Organization:**
- **Agenda Details:** Full agenda text, objectives, milestones
- **Progress Tracking:** Individual task completion, team member contributions  
- **Timeline View:** Time spent on each agenda item, estimated completion

### Room Lobby Interface
**Quick Rooms Section:**
- **Visual:** Green "⚡ INSTANT" badges, countdown timers for duration limits
- **Access:** One-click join, 2-hour default time limit
- **Templates:** Simplified 3-option quick select (Focus, Brainstorm, Debug)

**Scheduled Rooms Section:**
- **Visual:** Blue "📅 SCHEDULED" badges, calendar icons showing start times
- **Creation:** Full template library available, calendar picker for booking
- **Status Indicators:** Available (green), Full (red), Starting Soon (blinking yellow)

### Color Palette Expansion
**Primary:** Classic green (#00FF00) on pure black (#000000)
**Secondary Accents:**
- **Blue (#00BBFF):** Scheduled rooms, info states, metadata
- **Yellow (#FFFF00):** Warnings, notifications, time alerts  
- **Red (#FF3333):** Errors, full rooms, urgent items
- **Cyan (#00FFFF):** Active states, focus modes, progress completion

### Typography System
**Primary Font:** 'Fira Code' or 'JetBrains Mono' (monospace with programming ligatures)
**Fallback:** 'Courier New', monospace
**Sizes:** 
- **Chat Text:** 14px
- **Widget Headers:** 16px bold
- **Progress Text:** 12px
- **Metadata Panel:** 13px

## 7. Responsive & Accessibility
**Mobile Adaptation:** 
- **Horizontal icons** stack vertically on mobile
- **Widget containers** become full-screen modals
- **Progress bar** moves to top for thumb accessibility

**Accessibility Standards:**
- **Color contrast** meets WCAG AA standards (green on black = 15.3:1 ratio)
- **Keyboard navigation** for all widget interactions
- **Screen reader** support for stickman guidance and progress updates
- **Focus indicators** with enhanced green glow for keyboard users

## 8. Implementation Notes
**Technical Considerations:**
- **Widget State Management:** Each widget container maintains local state until deployed
- **Real-time Sync:** Progress updates broadcast to all room participants via Socket.IO
- **Performance:** Icon bar renders as SVG sprites for fast loading
- **Browser Support:** Progressive enhancement for older browsers (fallback to text commands)

---

**Design Status:** Complete - Ready for Architecture Phase  
**Next Phase:** Technical architecture for widget system and real-time functionality  
**Dependencies:** None - all design decisions finalized
