-- Z3roCom minimal schema for Supabase (Postgres + Realtime)
-- Run in Supabase SQL editor.

-- Extensions (PostgreSQL-specific)
-- @ts-ignore
create extension if not exists pgcrypto;

-- Sessions (chat rooms)
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  agenda text not null,
  duration_minutes integer not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  timer_ends_at timestamptz null
);

-- Membership (participants)
create table if not exists public.session_members (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  unique (session_id, user_id)
);

-- Messages
DO $$ BEGIN
  CREATE TYPE public.message_kind AS ENUM ('user','system','command-echo');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

create table if not exists public.messages (
  id uuid primary key,
  session_id uuid not null references public.sessions(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null,
  kind public.message_kind not null,
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists messages_session_created_idx on public.messages (session_id, created_at);

-- RLS
alter table public.sessions enable row level security;
alter table public.session_members enable row level security;
alter table public.messages enable row level security;

-- SESSIONS POLICIES (simplified - no circular references)
create policy "sessions_select_authenticated" on public.sessions
for select
to authenticated
using (true);

create policy "sessions_insert_authenticated" on public.sessions
for insert
to authenticated
with check (created_by = auth.uid());

create policy "sessions_update_creator" on public.sessions
for update
to authenticated
using (created_by = auth.uid())
with check (created_by = auth.uid());

-- SESSION_MEMBERS POLICIES (simplified - no circular references)
create policy "members_insert_self" on public.session_members
for insert
to authenticated
with check (user_id = auth.uid());

create policy "members_update_self" on public.session_members
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "members_select_authenticated" on public.session_members
for select
to authenticated
using (true);

-- MESSAGES POLICIES (simplified - no circular references)
create policy "messages_select_authenticated" on public.messages
for select
to authenticated
using (true);

create policy "messages_insert_authenticated" on public.messages
for insert
to authenticated
with check (author_id = auth.uid());

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.sessions;

-- Widget Index (public schema pointer to widgets schema)
CREATE TABLE IF NOT EXISTS public.widget_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL CHECK (widget_type IN ('tasks','decision','issues','code','progress','next')),
  widget_instance_id UUID NOT NULL, -- References widgets.widget_instances(id)
  title TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, widget_type)
);
CREATE INDEX IF NOT EXISTS widget_index_session_idx ON public.widget_index (session_id, created_at);

ALTER TABLE public.widget_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY "widget_index_select" ON public.widget_index FOR SELECT TO authenticated USING (true);
CREATE POLICY "widget_index_insert" ON public.widget_index FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "widget_index_update" ON public.widget_index FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "widget_index_delete" ON public.widget_index FOR DELETE TO authenticated USING (created_by = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE public.widget_index;

-- RPC helpers (for join preview before membership exists)
create or replace function public.session_preview(p_code text)
returns table (
  id uuid,
  code text,
  name text,
  agenda text,
  duration_minutes integer,
  created_at timestamptz,
  created_by uuid,
  timer_ends_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select s.id, s.code, s.name, s.agenda, s.duration_minutes, s.created_at, s.created_by, s.timer_ends_at
  from public.sessions s
  where s.code = p_code
  limit 1;
$$;

grant execute on function public.session_preview(text) to authenticated;

create or replace function public.session_member_count(p_session_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int from public.session_members sm where sm.session_id = p_session_id;
$$;

grant execute on function public.session_member_count(uuid) to authenticated;

-- =====================================================
-- WIDGETS SCHEMA - Z3roCom Widget Storage
-- =====================================================
CREATE SCHEMA IF NOT EXISTS widgets;

-- Core widget registry (polymorphic base)
CREATE TABLE IF NOT EXISTS widgets.widget_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL CHECK (widget_type IN ('tasks','decision','issues','code','progress','next')),
  title TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS widget_instances_session_idx ON widgets.widget_instances (session_id, widget_type);

-- Task Board Items
CREATE TABLE IF NOT EXISTS widgets.task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets.widget_instances(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_items_widget_idx ON widgets.task_items (widget_id, position);

-- Decision Log Entries (immutable)
CREATE TABLE IF NOT EXISTS widgets.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets.widget_instances(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS decisions_widget_idx ON widgets.decisions (widget_id, created_at DESC);

-- Issue Tracker
CREATE TABLE IF NOT EXISTS widgets.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets.widget_instances(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ NULL
);
CREATE INDEX IF NOT EXISTS issues_widget_idx ON widgets.issues (widget_id, resolved, created_at);

-- Code Snippet (one per widget instance)
CREATE TABLE IF NOT EXISTS widgets.code_snippet (
  widget_id UUID PRIMARY KEY REFERENCES widgets.widget_instances(id) ON DELETE CASCADE,
  language TEXT NULL,
  content TEXT NOT NULL DEFAULT '',
  locked BOOLEAN NOT NULL DEFAULT false,
  last_editor_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Progress Check Prompts & Responses
CREATE TABLE IF NOT EXISTS widgets.progress_prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets.widget_instances(id) ON DELETE CASCADE,
  prompt_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS widgets.progress_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id UUID NOT NULL REFERENCES widgets.progress_prompts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (prompt_id, user_id)
);

-- Next Session Seed
CREATE TABLE IF NOT EXISTS widgets.next_session_seed (
  widget_id UUID PRIMARY KEY REFERENCES widgets.widget_instances(id) ON DELETE CASCADE,
  proposed_goal TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (25,45,90)),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','used')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS widgets.next_seed_issues (
  seed_widget_id UUID NOT NULL REFERENCES widgets.next_session_seed(widget_id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES widgets.issues(id) ON DELETE CASCADE,
  selected BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (seed_widget_id, issue_id)
);

-- RLS Policies
ALTER TABLE widgets.widget_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.task_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.code_snippet ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.progress_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.progress_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.next_session_seed ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.next_seed_issues ENABLE ROW LEVEL SECURITY;

-- Select: all authenticated users can read
CREATE POLICY "widget_instances_select" ON widgets.widget_instances FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_items_select" ON widgets.task_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "decisions_select" ON widgets.decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "issues_select" ON widgets.issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "code_snippet_select" ON widgets.code_snippet FOR SELECT TO authenticated USING (true);
CREATE POLICY "progress_prompts_select" ON widgets.progress_prompts FOR SELECT TO authenticated USING (true);
CREATE POLICY "progress_responses_select" ON widgets.progress_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "next_session_seed_select" ON widgets.next_session_seed FOR SELECT TO authenticated USING (true);
CREATE POLICY "next_seed_issues_select" ON widgets.next_seed_issues FOR SELECT TO authenticated USING (true);

-- Insert: creator-bound or any authenticated
CREATE POLICY "widget_instances_insert" ON widgets.widget_instances FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "task_items_insert" ON widgets.task_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "decisions_insert" ON widgets.decisions FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());
CREATE POLICY "issues_insert" ON widgets.issues FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "code_snippet_insert" ON widgets.code_snippet FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "progress_prompts_insert" ON widgets.progress_prompts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "progress_responses_insert" ON widgets.progress_responses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "next_session_seed_insert" ON widgets.next_session_seed FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "next_seed_issues_insert" ON widgets.next_seed_issues FOR INSERT TO authenticated WITH CHECK (true);

-- Update: widget creator or any (for collaborative widgets)
CREATE POLICY "widget_instances_update" ON widgets.widget_instances FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "task_items_update" ON widgets.task_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "decisions_update_none" ON widgets.decisions FOR UPDATE TO authenticated USING (false) WITH CHECK (false); -- immutable
CREATE POLICY "issues_update" ON widgets.issues FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "code_snippet_update" ON widgets.code_snippet FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "progress_prompts_update" ON widgets.progress_prompts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "progress_responses_update_self" ON widgets.progress_responses FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "next_session_seed_update" ON widgets.next_session_seed FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "next_seed_issues_update" ON widgets.next_seed_issues FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Delete: generally restricted (tasks/issues allow cleanup)
CREATE POLICY "task_items_delete" ON widgets.task_items FOR DELETE TO authenticated USING (true);
CREATE POLICY "issues_delete" ON widgets.issues FOR DELETE TO authenticated USING (true);
CREATE POLICY "next_seed_issues_delete" ON widgets.next_seed_issues FOR DELETE TO authenticated USING (true);

-- Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE widgets.widget_instances;
ALTER PUBLICATION supabase_realtime ADD TABLE widgets.task_items;
ALTER PUBLICATION supabase_realtime ADD TABLE widgets.decisions;
ALTER PUBLICATION supabase_realtime ADD TABLE widgets.issues;
ALTER PUBLICATION supabase_realtime ADD TABLE widgets.code_snippet;
ALTER PUBLICATION supabase_realtime ADD TABLE widgets.progress_prompts;
ALTER PUBLICATION supabase_realtime ADD TABLE widgets.progress_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE widgets.next_session_seed;
ALTER PUBLICATION supabase_realtime ADD TABLE widgets.next_seed_issues;

-- Add distraction_level column to existing sessions table
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS focus_level integer NOT NULL DEFAULT 100;