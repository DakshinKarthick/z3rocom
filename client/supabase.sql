-- Z3roCom minimal schema for Supabase (Postgres + Realtime)
-- Run in Supabase SQL editor.

-- Extensions
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
