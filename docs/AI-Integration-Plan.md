# Z3roCom AI Integration Plan

**Purpose:** Define which widgets require AI, the NLP/pgvector approach, and a DB-first pipeline using Supabase (Postgres, RLS, Edge Functions, Realtime) so all AI features operate from durable data.

**References:** See [docs/Architecture.md](docs/Architecture.md) and [docs/Widget-Specifications.md](docs/Widget-Specifications.md).

## Scope & Principles
- **DB-first:** All inputs come from Postgres tables; all outputs are written back to tables. The UI updates via Socket.IO fan-out or Supabase Realtime subscriptions.
- **Minimal writes per action:** Persist once, then broadcast deltas; avoid re-computing on the client.
- **Auditable runs:** Track inputs/outputs, model, and cost per AI run.
- **RLS preserved:** All user-facing reads respect RLS; Edge Functions use service role for compute.

## Widgets That Use AI
- **Distraction Meter (Widget 3):** Uses embeddings to measure semantic drift between recent chat and the session agenda.
- **Blocker Flag (Widget 6):** Reminds near session end if unresolved blockers exist; can score priority via simple NLP.
- **Progress Check (Widget 8):** Aggregates responses into structured bullets; optional summarization for the session summary.
- **Outcome Summary (Widget 9):** Synthesizes a session recap from agenda, tasks, decisions, blockers, progress, and selected chat context.
- **Next Session Seeder (Widget 10):** Suggests next agenda + duration based on unresolved blockers and progress.

Note: The Decision Log (Widget 5) itself is user-authored and immutable, but AI reads it to populate the Outcome Summary. It does not write to the Decision Log.

## Data Model Additions (Supabase / Postgres)
Enable pgvector and add AI tables. These are examples you can add to your existing schema.

```sql
-- Enable pgvector if not already
create extension if not exists vector;

-- Store per-message embeddings (for drift + retrieval)
create table if not exists public.message_embeddings (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  content_hash text not null,
  embedding vector(1536) not null, -- adjust dims per model
  created_at timestamptz not null default now(),
  unique (message_id)
);
alter table public.message_embeddings enable row level security;
create policy "me_select_authenticated" on public.message_embeddings for select to authenticated using (true);

-- Session-level focus metrics (drift)
create table if not exists public.session_focus (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  drift_score integer not null default 0, -- 0-100
  trend text not null default 'stable', -- improving|stable|worsening
  last_calc_at timestamptz not null default now()
);
alter table public.session_focus enable row level security;
create policy "sf_select_authenticated" on public.session_focus for select to authenticated using (true);

-- Outcome summaries
create table if not exists public.session_summaries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  summary_md text not null,
  summary_json jsonb not null,
  model text not null,
  status text not null default 'completed', -- pending|completed|error
  created_at timestamptz not null default now()
);
alter table public.session_summaries enable row level security;
create policy "ss_select_authenticated" on public.session_summaries for select to authenticated using (true);

-- Next session suggestions
create table if not exists public.next_session_suggestions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  goal text not null,
  duration_minutes integer not null,
  blockers jsonb not null, -- carried unresolved blockers
  model text not null,
  confidence numeric not null default 0.7,
  status text not null default 'draft', -- draft|used
  created_at timestamptz not null default now()
);
alter table public.next_session_suggestions enable row level security;
create policy "nss_select_authenticated" on public.next_session_suggestions for select to authenticated using (true);

-- AI jobs + runs for auditability
create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null, -- embed|drift|summary|next|progress_nlp|blocker_nudge
  session_id uuid references public.sessions(id) on delete cascade,
  message_id uuid references public.messages(id) on delete cascade,
  payload_json jsonb not null default '{}',
  status text not null default 'pending', -- pending|processing|done|error
  error_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_jobs_status_idx on public.ai_jobs(status);
create index if not exists ai_jobs_session_idx on public.ai_jobs(session_id);

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.ai_jobs(id) on delete cascade,
  inputs_ref jsonb not null,
  outputs_ref jsonb not null,
  model text not null,
  tokens_prompt integer,
  tokens_completion integer,
  duration_ms integer,
  cost_usd numeric,
  created_at timestamptz not null default now()
);
```

Publish relevant tables to Realtime if you prefer Supabase Realtime updates:
```sql
alter publication supabase_realtime add table public.session_focus;
alter publication supabase_realtime add table public.session_summaries;
alter publication supabase_realtime add table public.next_session_suggestions;
```

## Pipelines (Event → Job → Output)
- **On Message Insert (chat intent):**
  - Insert into `public.messages` (existing).
  - Create `ai_jobs(type='embed', message_id)`.
  - Edge Function `compute-embeddings` processes pending jobs: computes `content_hash`, writes `message_embeddings`.
  - Edge Function `update-drift` pulls recent embeddings + agenda; computes drift score and trend; upserts `session_focus`.
  - If drift threshold crosses (e.g., >60), also enqueue `ai_jobs(type='drift')` with payload `{ crossed: true }` to drive Distraction Meter UI.

- **At 50% Elapsed (Progress Check):**
  - Use `pg_cron` to enqueue `ai_jobs(type='progress_nlp', session_id)`.
  - Edge Function aggregates responses into summary bullets; either write to `session_summaries` (as a section) or a small `progress_rollup` table.

- **At 80% Elapsed (Blocker Nudge):**
  - `pg_cron` job checks unresolved blockers in `public.blockers`.
  - If count > 0, enqueue `ai_jobs(type='blocker_nudge', session_id)`; Edge Function posts a UI nudge via Socket.IO or writes a `widget_event` row that clients render.

- **On Session End (Outcome Summary):**
  - Enqueue `ai_jobs(type='summary', session_id)`.
  - Edge Function fetches agenda, tasks, decisions, blockers, progress, and last N chat messages (plus summaries) and generates structured markdown.
  - Write to `session_summaries`; optionally fire `summary:generated` webhook (see [docs/Architecture.md](docs/Architecture.md)).

- **Next Session Seeder:**
  - Enqueue `ai_jobs(type='next', session_id)` on session end or user request.
  - Edge Function proposes goal + duration and unresolved blockers carry-forward; write `next_session_suggestions`.

## Edge Functions (Supabase)
Create lightweight HTTP Edge Functions that process `ai_jobs` using the service role:
- **compute-embeddings:** Reads pending `embed` jobs → writes `message_embeddings`.
- **update-drift:** Computes drift vs agenda using embeddings → upserts `session_focus`.
- **generate-summary:** Builds `session_summaries` from DB context.
- **suggest-next-session:** Writes `next_session_suggestions` for the UI.
- **emit-events (bridge):** Optionally calls your Socket.IO server or webhook to fan-out `enforce:*`/`ai:*` updates.

Workers can be driven by:
- A small scheduler (cron) and polling of `ai_jobs(status='pending')`.
- Supabase Realtime subscription (server-side) to `ai_jobs` where status = pending.

## Client Update Strategy
- **Preferred:** Socket.IO server subscribes/bridges DB changes and emits to `room(session:{id})` for low-latency UX.
- **Fallback:** Subscribe to Realtime on `session_focus`, `session_summaries`, `next_session_suggestions` for serverless-only setups.
- **Dedup:** Always dedup by stable IDs (`message_id`, `session_id`) when mixing sockets and Realtime.

## NLP & Embeddings Details
- **Embedding Model:** Use a 1536-dim model (or similar) and store in `message_embeddings`.
- **Agenda Vector:** Maintain a cached agenda embedding alongside the agenda row for fast drift computation.
- **Drift Calculation:** Cosine similarity between recent message vectors and agenda; map to 0–100 drift score. Track trend by comparing moving windows.
- **Summarization:** Deterministic template for Outcome Summary sections; constrain tokens using rolling `session_summaries` and last N messages.
- **Progress Aggregation:** Simple clustering or rule-based grouping of responses into bullets; low-complexity NLP is sufficient.
- **Next Session Suggestion:** Use unresolved blockers + progress to propose a concise goal and select duration preset (25/45/90) with confidence.

## Security & Compliance
- **RLS:** Keep all user reads under RLS; Edge Functions use service role exclusively.
- **Idempotency:** Use `content_hash` to avoid double-processing embeddings.
- **Audit:** Record `ai_runs` with model, tokens, duration, and cost.
- **Retention:** Apply per-session retention policies; summaries can persist longer than raw chat if needed.

## Implementation Steps (2 Sprints)
- **Sprint 1:**
  - Enable pgvector; add `message_embeddings`, `session_focus`, `ai_jobs`, `ai_runs`.
  - Implement `compute-embeddings`, `update-drift`; wire Distraction Meter UI from `session_focus`.
  - Add `pg_cron` task for 50%/80% markers (or timer-driven via server).
- **Sprint 2:**
  - Add `session_summaries`, `next_session_suggestions`; implement `generate-summary`, `suggest-next-session`.
  - Bridge to Socket.IO or Realtime; add webhook on `summary:generated`.
  - QA: idempotency, drift thresholds, summary token limits, and RLS.

## Notes
- If hosting Socket.IO separately, Edge Functions can call a private webhook on the socket server to broadcast `ai:*`/`enforce:*` events based on DB outputs.
- Keep all AI reads/writes centralized to the DB to ensure deterministic UI, auditability, and agent-ready clarity.