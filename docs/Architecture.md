# Z3roCom Scale Adaptive Architecture

**Project:** Z3roCom - Developer-focused Chat Application  
**Date:** 2025-11-10  
**Architect:** Winston  
**Version:** 1.0

## 1. Architectural Context

### System Overview
Z3roCom is a brownfield enhancement of existing Next.js/Fastify/Socket.IO stack, adding revolutionary chat productivity features:
- **Widget system** with individual user responses and chat deployment
- **Real-time state synchronization** for progress tracking and room management  
- **Gaming lobby interface** with live room status updates
- **Agenda management** with multi-user editing conflict resolution

### Existing Foundation (Brownfield)
- **Frontend:** Next.js application with React components
- **Backend:** Fastify/Express server with REST endpoints  
- **Real-time:** Socket.IO for bidirectional communication
- **Database:** Progressive strategy - SQLite for development, PostgreSQL for production (see Decision 3)

### Key Architectural Drivers
1. **Real-time Synchronization:** Progress bars, agenda status, room lobby require live updates
2. **Conflict Resolution:** Multiple users editing agenda simultaneously
3. **Widget Isolation:** Individual widget responses (no real-time collaboration needed)
4. **Gaming Aesthetics:** Lobby interface with server browser feel
5. **Brownfield Integration:** Seamless integration with existing codebase

## 2. Technology Stack & Versions

### Core Technology Versions (Verified 2025-11-11)
```
Frontend Stack:
├── Next.js: 16.0.1 (latest stable)
├── React: 19.x (bundled with Next.js 16)
├── TypeScript: 5.x (latest stable)
└── TailwindCSS: 3.x (for terminal styling)

Backend Stack:
├── Fastify: 5.6.2 (latest stable)  
├── Socket.IO: 4.8.1 (latest stable)
├── Node.js: 20.x LTS (recommended)
└── TypeScript: 5.x (consistent with frontend)

Database & Cache:
├── PostgreSQL: 18.x (latest stable release)
├── Redis: 7.x (latest stable)
├── SQLite: 3.x (development environment)
└── Prisma: 5.x (ORM for database management)

Development Tools:
├── Jest: 29.x (testing framework)
├── ESLint: 9.x (code linting)
├── Prettier: 3.x (code formatting)
└── Playwright: 1.x (E2E testing)
```

### Version Compatibility Matrix
- **Node.js 20.x LTS** supports all chosen packages
- **Next.js 16.x** requires React 19.x (bundled)
- **Fastify 5.x** compatible with Socket.IO 4.x
- **PostgreSQL 18.x** supported by Prisma 5.x
- **Redis 7.x** compatible with Node.js Redis client 5.x

## 3. Project Initialization & Setup

### Development Environment Setup
```bash
# Prerequisites (verify versions)
node --version  # Should be 20.x LTS
npm --version   # Should be 10.x

# Clone existing repository (brownfield)
cd existing-project

# Install frontend dependencies
cd client
npm install next@16.0.1 react@19 typescript@5 tailwindcss@3
npm install @types/react @types/node

# Install backend dependencies  
cd ../server
npm install fastify@5.6.2 socket.io@4.8.1 prisma@5
npm install @types/node typescript ts-node

# Install shared dependencies
cd ../shared
npm install typescript@5

# Database setup
npx prisma init
npx prisma migrate dev --name init

# Start development servers
npm run dev:client   # Next.js on port 3000
npm run dev:server   # Fastify on port 5000
```

### Project Structure Enhancement
```
Z3roCom/ (existing brownfield project)
├── client/ (existing Next.js app)
│   ├── package.json (update with new dependencies)
│   ├── src/
│   │   ├── components/ (enhance with new components)
│   │   │   ├── chat/
│   │   │   ├── widgets/
│   │   │   ├── lobby/
│   │   │   └── progress/
│   │   ├── pages/ (add new pages)
│   │   │   ├── lobby.tsx
│   │   │   └── room/[id].tsx
│   │   └── styles/ (add terminal theme)
│   │       └── terminal.css
├── server/ (existing Fastify app)
│   ├── package.json (update with new dependencies)
│   ├── src/
│   │   ├── routes/ (enhance with new routes)
│   │   ├── services/ (add new services)
│   │   ├── socket/ (add Socket.IO handlers)
│   │   └── database/ (add Prisma models)
│   └── prisma/
│       ├── schema.prisma
│       └── migrations/
└── shared/ (existing shared types)
    ├── types.ts (enhance with new types)
    └── constants.ts
```

## 4. Critical Architectural Decisions

### Decision 1: Real-time Event Architecture
**Problem:** State synchronization vs individual widget responses

**Solution - Hybrid Event Model:**
```
Real-time Events (Socket.IO):
├── Room state (lobby, occupancy, status)
├── Agenda state (current agenda, progress updates)
├── Progress synchronization (individual contributions to team progress)
└── Lobby updates (room availability, participant counts)

Non-real-time Events (HTTP):
├── Widget deployment (individual → chat message)
├── User authentication and room access
├── GitHub integration queries
└── Persistent data operations
```

**Rationale:** Separates collaborative state (needs real-time) from individual actions (HTTP sufficient)

### Decision 2: Agenda Conflict Resolution Strategy
**Problem:** Multiple users editing agenda simultaneously

**Solution - Optimistic Locking with Conflict Detection:**
```
Agenda Edit Flow:
1. User opens agenda editor → Gets current version + timestamp
2. User makes changes locally (not broadcast immediately)
3. User attempts save → Server checks if agenda changed since edit start
4. If conflict detected → Show diff, allow merge or overwrite choice
5. If no conflict → Save and broadcast to all room participants
```

**Rationale:** Prevents agenda corruption while maintaining responsive UX

### Decision 3: Database Strategy for Brownfield
**Problem:** Existing scaffold needs persistent storage for new features

**Solution - Progressive Database Integration:**
```
Phase 1 (MVP): 
├── SQLite/PostgreSQL for local development
├── Room state, agenda persistence, user sessions
└── Simple schema focused on core features

Phase 2 (Growth):
├── Redis for real-time state caching
├── WebSocket session management
└── Enhanced performance for concurrent users
```

**Rationale:** Start simple, scale progressively without over-engineering

## 5. System Architecture Design

### Frontend Architecture (Next.js Enhancement)

**Component Structure:**
```
client/src/
├── components/
│   ├── chat/
│   │   ├── ChatInterface.tsx (main chat container)
│   │   ├── MessageList.tsx (chat message display)
│   │   └── MessageInput.tsx (input with widget triggers)
│   ├── widgets/
│   │   ├── WidgetToolbar.tsx (horizontal icon bar)
│   │   ├── WidgetContainer.tsx (modal form overlay)
│   │   ├── widgets/
│   │   │   ├── MusicWidget.tsx
│   │   │   ├── ProjectWidget.tsx
│   │   │   ├── PollWidget.tsx
│   │   │   └── AgendaWidget.tsx
│   ├── lobby/
│   │   ├── RoomLobby.tsx (gaming-style room browser)
│   │   ├── RoomCard.tsx (individual room display)
│   │   └── RoomCreator.tsx (room creation modal)
│   ├── progress/
│   │   ├── ProgressBar.tsx (bottom progress indicator)
│   │   ├── MetadataPanel.tsx (agenda details overlay)
│   │   └── ProgressSync.tsx (real-time progress updates)
│   └── guides/
│       └── StickmanGuide.tsx (contextual onboarding)
```

**State Management Strategy:**
```
Real-time State (Socket.IO + React Context):
├── Room lobby status
├── Agenda progress synchronization  
├── Participant presence
└── Live room occupancy

Local State (React useState/useReducer):
├── Widget container forms
├── UI interactions (modal open/close)
├── Input validation
└── Theme preferences

Persistent State (HTTP + React Query):
├── User authentication
├── Room configurations
├── Agenda history
└── User preferences
```

### Backend Architecture (Fastify Enhancement)

**Service Layer Structure:**
```
server/src/
├── routes/
│   ├── auth/ (user authentication)
│   ├── rooms/ (room CRUD operations)
│   ├── widgets/ (widget deployment endpoints)
│   └── integrations/ (GitHub, music services)
├── services/
│   ├── RoomService.ts (room management logic)
│   ├── AgendaService.ts (agenda conflict resolution)
│   ├── WidgetService.ts (widget processing)
│   └── ProgressService.ts (progress tracking)
├── socket/
│   ├── SocketManager.ts (Socket.IO event handling)
│   ├── RoomEvents.ts (room state broadcasting)
│   ├── AgendaEvents.ts (agenda synchronization)
│   └── ProgressEvents.ts (progress updates)
└── database/
    ├── models/ (data models)
    ├── migrations/ (schema evolution)
    └── repositories/ (data access layer)
```

## 6. Data Architecture

### Database Schema Design
```sql
-- Core Tables
Users (id, username, email, preferences, created_at)
Rooms (id, name, type, status, created_by, scheduled_time, duration_limit)
RoomParticipants (room_id, user_id, role, joined_at)

-- Agenda Management (Conflict Resolution)
Agendas (id, room_id, title, description, created_by, version, created_at)
AgendaProgress (id, agenda_id, user_id, progress_percent, updated_at)

-- Widget System
WidgetDeployments (id, room_id, user_id, widget_type, widget_data, created_at)

-- Real-time State Cache (Redis if needed)
RoomState (room_id, participant_count, current_agenda_id, lobby_status)
```

### Real-time Event Schema
```javascript
// Socket.IO Event Definitions
Room Events:
├── 'room:join' → {roomId, userId, userInfo}
├── 'room:leave' → {roomId, userId}
├── 'room:status_update' → {roomId, status, participantCount}

Agenda Events:
├── 'agenda:created' → {roomId, agenda, createdBy}
├── 'agenda:progress_update' → {roomId, agendaId, userId, progress}
├── 'agenda:conflict_detected' → {roomId, conflictDetails, resolutionOptions}

Lobby Events:
├── 'lobby:room_list_update' → {rooms: [roomData]}
├── 'lobby:room_created' → {newRoom}
├── 'lobby:room_status_changed' → {roomId, newStatus}
```

## 7. Implementation Patterns & Standards

### API Response Formats
```typescript
// Success Response Pattern
interface APIResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

// Error Response Pattern  
interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Widget Deployment Response
interface WidgetDeploymentResponse {
  success: true;
  data: {
    widgetId: string;
    roomId: string;
    messageId: string;
    widgetType: 'music' | 'project' | 'poll' | 'agenda';
    deployedAt: string;
  };
}
```

### Communication Patterns
```typescript
// HTTP API Route Patterns
// GET    /api/rooms              - List available rooms
// POST   /api/rooms              - Create new room
// GET    /api/rooms/:id          - Get room details
// PUT    /api/rooms/:id/agenda   - Update room agenda
// POST   /api/widgets/deploy     - Deploy widget to chat
// GET    /api/integrations/github - GitHub integration status

// Socket.IO Event Patterns
// Client → Server: 'room:join', 'agenda:update', 'widget:trigger'
// Server → Client: 'room:status_changed', 'agenda:progress_update', 'lobby:refresh'
// Broadcast: 'message:new', 'participant:joined', 'progress:updated'
```

### Lifecycle Patterns
```typescript
// Component Loading States
enum LoadingState {
  IDLE = 'idle',
  LOADING = 'loading', 
  SUCCESS = 'success',
  ERROR = 'error'
}

// Error Recovery Pattern
interface ErrorBoundary {
  retry: () => void;
  fallback: ReactNode;
  onError: (error: Error) => void;
}

// Widget Lifecycle
enum WidgetState {
  CONFIGURING = 'configuring',    // User filling form
  VALIDATING = 'validating',      // Input validation
  DEPLOYING = 'deploying',        // Sending to chat
  DEPLOYED = 'deployed',          // Successfully in chat
  FAILED = 'failed'               // Deployment failed
}
```

### Location & Organization Patterns
```typescript
// URL Structure Pattern
/lobby                           - Main room browser
/room/:roomId                    - Individual room chat
/room/:roomId/agenda             - Room agenda management
/room/:roomId/settings           - Room configuration
/auth/github                     - GitHub OAuth callback
/api/v1/rooms                    - API versioning pattern

// File Naming Conventions
ComponentName.tsx                - React components (PascalCase)
ComponentName.test.tsx           - Component tests
ComponentName.stories.tsx        - Storybook stories  
serviceName.service.ts           - Backend services (camelCase)
serviceName.test.ts              - Service tests
route-name.route.ts              - API routes (kebab-case)

// Asset Organization  
public/
├── icons/widgets/               - Widget icon assets
├── sounds/terminal/             - Terminal UI sounds  
├── fonts/monospace/             - Terminal fonts
└── images/stickman/             - Guide character assets
```

### Error Handling Patterns
```typescript
// Frontend Error Handling
interface ErrorHandler {
  // Network errors (offline, timeout)
  handleNetworkError: (error: NetworkError) => void;
  
  // Validation errors (user input)
  handleValidationError: (errors: ValidationError[]) => void;
  
  // Widget deployment failures  
  handleWidgetError: (error: WidgetError) => void;
  
  // Socket disconnection recovery
  handleSocketError: (error: SocketError) => void;
}

// Backend Error Categories
enum ErrorCode {
  ROOM_NOT_FOUND = 'ROOM_NOT_FOUND',
  AGENDA_CONFLICT = 'AGENDA_CONFLICT', 
  WIDGET_VALIDATION = 'WIDGET_VALIDATION',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  RATE_LIMITED = 'RATE_LIMITED'
}
```

### Data Formatting Standards
```typescript
// Date Handling (consistent across app)
const formatTimestamp = (date: Date): string => 
  date.toISOString(); // Always store as ISO strings

const formatDisplayTime = (date: Date): string =>
  Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date); // Display format for terminal UI

// Terminal Styling Constants  
export const TerminalTheme = {
  colors: {
    primary: '#00ff41',      // Neon green
    background: '#000000',   // Pure black
    accent: '#ff0040',       // Neon red for errors
    warning: '#ffff00',      // Neon yellow
    text: '#00ff41'          // Green text
  },
  fonts: {
    mono: 'JetBrains Mono, Fira Code, Monaco, monospace'
  }
} as const;
```

## 8. Integration Architecture

### GitHub Integration Strategy
```
Authentication Flow:
├── OAuth2 GitHub app registration
├── Repository access permissions (read-only for privacy)
├── Webhook integration for real-time project updates
└── API endpoints for project data fetching

Project Widget Integration:
├── /project command → GitHub repo selection
├── Issue/PR status display in chat
├── Commit activity timeline
└── Branch protection and deployment status
```

### Music Service Integration
```
Supported Services:
├── Spotify Web API (primary)
├── YouTube Music API (secondary)
├── Apple Music (future consideration)

Widget Functionality:
├── /music command → service selection
├── Collaborative playlist creation
├── Current playing status broadcast
├── Queue management (voting system)
```

## 9. Security Architecture

### Authentication & Authorization
```
Security Layers:
├── JWT token-based authentication
├── Rate limiting for API endpoints
├── Socket.IO connection authentication
├── Room-level permissions (creator, participant, observer)

Privacy Controls:
├── Private rooms (invite-only)
├── GitHub integration requires explicit consent
├── Widget data isolation per room
└── User data encryption at rest
```

### Input Validation & Sanitization
```
Frontend Validation:
├── Widget input schema validation
├── Command syntax checking
├── File upload restrictions
└── XSS prevention in chat messages

Backend Validation:
├── API request validation (Joi/Zod schemas)
├── Socket.IO event validation
├── Database input sanitization
└── Rate limiting per user/room
```

## 10. Performance Architecture

### Scalability Considerations
```
Horizontal Scaling:
├── Stateless API design
├── Redis for session management
├── Database connection pooling
├── Socket.IO clustering with Redis adapter

Caching Strategy:
├── Room lobby data (5 minute TTL)
├── User preferences (session-based)
├── Widget templates (long-term cache)
└── GitHub API responses (15 minute TTL)
```

### Resource Optimization
```
Frontend Optimization:
├── Component lazy loading
├── Widget modal code splitting
├── Terminal rendering optimization
├── Socket.IO message batching

Backend Optimization:
├── Database query optimization
├── Agenda conflict detection algorithms
├── Widget processing queue
└── Real-time event throttling
```

## 11. Deployment Architecture

### Infrastructure Strategy
```
Development:
├── Local SQLite database
├── Hot reloading (Next.js + Fastify)
├── Mock GitHub/music integrations
└── Terminal-based development tools

Production:
├── PostgreSQL primary database
├── Redis for caching and sessions
├── PM2 for process management
├── Environment-based configuration
```

### Monitoring & Observability
```
Application Monitoring:
├── Real-time Socket.IO connection metrics
├── Room creation/join analytics
├── Widget usage patterns
├── Performance bottleneck identification

Error Handling:
├── Graceful Socket.IO disconnection recovery
├── Widget deployment failure rollback
├── Agenda conflict resolution logging
└── GitHub API failure fallbacks
```

## 12. Migration & Brownfield Integration

### Existing Codebase Enhancement
```
Next.js Integration:
├── Add new pages: /lobby, /room/[id]
├── Enhance existing components with terminal styling
├── Add Socket.IO client configuration
├── Implement widget system routing

Fastify Integration:
├── Add Socket.IO middleware
├── Implement new API routes
├── Add database models and migrations
├── Configure real-time event handlers
```

### Progressive Feature Rollout
```
Phase 1 (Core Chat):
├── Basic room creation and joining
├── Terminal-styled chat interface
├── Simple widget system (music, project)
├── GitHub integration MVP

Phase 2 (Advanced Features):
├── Agenda management with conflict resolution
├── Gaming lobby enhancements
├── Advanced widget system
├── Real-time collaboration features

Phase 3 (Scale & Polish):
├── Performance optimizations
├── Advanced analytics
├── Mobile responsiveness
├── Plugin system for custom widgets
```

## 13. Decision Summary Table

| Category | Decision | Version/Choice | Rationale |
|----------|----------|----------------|-----------|
| **Frontend Framework** | Next.js | 16.0.1 | Existing brownfield foundation, React SSR |
| **Frontend Language** | TypeScript | 5.x | Type safety, developer productivity |
| **UI Framework** | TailwindCSS | 3.x | Terminal styling, rapid development |
| **Backend Framework** | Fastify | 5.6.2 | Existing foundation, high performance |
| **Real-time** | Socket.IO | 4.8.1 | Existing foundation, reliable WebSocket fallback |
| **Database (Prod)** | PostgreSQL | 18.x | ACID compliance, JSON support, mature |
| **Database (Dev)** | SQLite | 3.x | Zero-config development environment |
| **Caching** | Redis | 7.x | Session management, real-time state |
| **ORM** | Prisma | 5.x | Type-safe database access, migrations |
| **Authentication** | JWT + OAuth2 | - | Stateless auth, GitHub integration |
| **Testing** | Jest + Playwright | 29.x + 1.x | Unit tests + E2E coverage |
| **Node.js** | Node.js LTS | 20.x | Long-term support, ecosystem compatibility |
| **Event Model** | Hybrid (Socket.IO + HTTP) | - | Real-time for state sync, HTTP for individual actions |
| **Conflict Resolution** | Optimistic Locking | - | Prevents agenda corruption, responsive UX |
| **State Management** | React Context + React Query | - | Real-time state + persistent data |
| **File Organization** | Feature-based + Shared | - | Scalable component organization |
| **API Pattern** | RESTful + Socket.IO events | - | Standard HTTP + real-time capabilities |
| **Error Handling** | Typed error responses | - | Consistent error management |
| **Deployment** | Progressive enhancement | - | Brownfield integration approach |

---

**Architecture Validation Checklist:**
- [x] Addresses all PRD requirements
- [x] Supports UX design specifications  
- [x] Handles real-time collaboration effectively
- [x] Provides scalable brownfield integration
- [x] Includes comprehensive security measures
- [x] Enables progressive feature development
- [x] Maintains terminal aesthetic integrity
- [x] Supports target user workflows (developers + students)
- [x] All technology versions specified and verified (2025-11-11)
- [x] Complete implementation patterns documented  
- [x] Project initialization instructions provided
- [x] Decision summary table with all required information
