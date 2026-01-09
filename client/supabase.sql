-- Z3roCom Complete Schema for Supabase (Postgres + Realtime)
-- Run in Supabase SQL editor
-- Last updated: 2026-01-07

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- ENUMS
-- =====================================================
DO $$ BEGIN
  CREATE TYPE public.message_kind AS ENUM ('user','system','command-echo');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- CORE TABLES - PUBLIC SCHEMA
-- =====================================================

-- Sessions (chat rooms)
CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9]{6}$'),
  name TEXT NOT NULL,
  agenda TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  focus_level INTEGER NOT NULL DEFAULT 100
);

-- Session Members (participants)
CREATE TABLE IF NOT EXISTS public.session_members (
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT,
  kind public.message_kind NOT NULL DEFAULT 'user',
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Typing Indicators (for real-time presence)
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES - PUBLIC SCHEMA
-- =====================================================
CREATE INDEX IF NOT EXISTS messages_session_created_idx ON public.messages (session_id, created_at);
CREATE INDEX IF NOT EXISTS typing_indicators_session_idx ON public.typing_indicators(session_id, is_typing, updated_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY - PUBLIC SCHEMA
-- =====================================================
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- Sessions Policies
DROP POLICY IF EXISTS "sessions_select_authenticated" ON public.sessions;
DROP POLICY IF EXISTS "sessions_insert_authenticated" ON public.sessions;
DROP POLICY IF EXISTS "sessions_update_creator" ON public.sessions;
DROP POLICY IF EXISTS "sessions_update_member" ON public.sessions;

CREATE POLICY "sessions_select_authenticated" ON public.sessions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "sessions_insert_authenticated" ON public.sessions
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "sessions_update_creator" ON public.sessions
  FOR UPDATE TO authenticated 
  USING (created_by = auth.uid()) 
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "sessions_update_member" ON public.sessions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.session_members sm 
      WHERE sm.session_id = id AND sm.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_members sm 
      WHERE sm.session_id = id AND sm.user_id = auth.uid()
    )
  );

-- Session Members Policies
DROP POLICY IF EXISTS "members_insert_self" ON public.session_members;
DROP POLICY IF EXISTS "members_update_self" ON public.session_members;
DROP POLICY IF EXISTS "members_select_authenticated" ON public.session_members;

CREATE POLICY "members_insert_self" ON public.session_members
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_update_self" ON public.session_members
  FOR UPDATE TO authenticated 
  USING (user_id = auth.uid()) 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_select_authenticated" ON public.session_members
  FOR SELECT TO authenticated USING (true);

-- Messages Policies
DROP POLICY IF EXISTS "messages_select_authenticated" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_authenticated" ON public.messages;

CREATE POLICY "messages_select_authenticated" ON public.messages
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "messages_insert_authenticated" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

-- Typing Indicators Policies
DROP POLICY IF EXISTS "typing_indicators_select" ON public.typing_indicators;
DROP POLICY IF EXISTS "typing_indicators_upsert" ON public.typing_indicators;
DROP POLICY IF EXISTS "typing_indicators_delete" ON public.typing_indicators;

CREATE POLICY "typing_indicators_select" ON public.typing_indicators 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "typing_indicators_upsert" ON public.typing_indicators 
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "typing_indicators_delete" ON public.typing_indicators 
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- =====================================================
-- RPC FUNCTIONS - PUBLIC SCHEMA
-- =====================================================

-- Session preview (for join page before membership)
CREATE OR REPLACE FUNCTION public.session_preview(p_code TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  agenda TEXT,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ,
  member_count BIGINT
)
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    s.id, s.name, s.agenda, s.duration_minutes, s.created_at,
    COUNT(sm.user_id) as member_count
  FROM public.sessions s
  LEFT JOIN public.session_members sm ON sm.session_id = s.id
  WHERE s.code = p_code
  GROUP BY s.id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.session_preview(TEXT) TO authenticated;

-- Session member count
CREATE OR REPLACE FUNCTION public.session_member_count(p_session_id UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT FROM public.session_members sm WHERE sm.session_id = p_session_id;
$$;

GRANT EXECUTE ON FUNCTION public.session_member_count(UUID) TO authenticated;

-- Update session focus level (restricted to session members)
CREATE OR REPLACE FUNCTION public.update_session_focus_level(
  p_session_id UUID,
  p_focus_level INTEGER
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify user is a member of the session
  IF NOT EXISTS (
    SELECT 1 FROM public.session_members 
    WHERE session_id = p_session_id AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not a member of this session';
  END IF;
  
  -- Update only the focus_level field
  UPDATE public.sessions 
  SET focus_level = p_focus_level
  WHERE id = p_session_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_session_focus_level(UUID, INTEGER) TO authenticated;

-- Get active sessions for focus worker
CREATE OR REPLACE FUNCTION get_active_sessions_for_focus_update(cutoff_time TIMESTAMPTZ)
RETURNS TABLE (id UUID) 
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT s.id
  FROM public.sessions s
  JOIN public.messages m ON m.session_id = s.id
  WHERE m.created_at > cutoff_time;
$$;

GRANT EXECUTE ON FUNCTION get_active_sessions_for_focus_update(TIMESTAMPTZ) TO service_role;

-- =====================================================
-- WIDGETS SCHEMA
-- =====================================================
CREATE SCHEMA IF NOT EXISTS widgets;

-- Grant permissions to authenticated users
GRANT USAGE ON SCHEMA widgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA widgets TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA widgets TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA widgets GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA widgets GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- =====================================================
-- WIDGET TABLES
-- =====================================================

-- Widget Instances (polymorphic base)
CREATE TABLE IF NOT EXISTS widgets.widget_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Task Board Items
CREATE TABLE IF NOT EXISTS widgets.task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets.widget_instances(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  checked BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Decision Log Entries (immutable)
CREATE TABLE IF NOT EXISTS widgets.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets.widget_instances(id) ON DELETE CASCADE,
  decision TEXT NOT NULL,
  creator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Issue Tracker
CREATE TABLE IF NOT EXISTS widgets.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets.widget_instances(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ai_priority TEXT CHECK (ai_priority IN ('high', 'medium', 'low')),
  ai_confidence REAL CHECK (ai_confidence >= 0 AND ai_confidence <= 1),
  ai_tags TEXT[]
);

-- Code Snippet (one per widget instance)
CREATE TABLE IF NOT EXISTS widgets.code_snippet (
  widget_id UUID PRIMARY KEY REFERENCES widgets.widget_instances(id) ON DELETE CASCADE,
  code TEXT NOT NULL DEFAULT '',
  language TEXT NOT NULL DEFAULT 'javascript',
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
  responder_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  response_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Next Session Seed
CREATE TABLE IF NOT EXISTS widgets.next_session_seed (
  widget_id UUID PRIMARY KEY REFERENCES widgets.widget_instances(id) ON DELETE CASCADE,
  seed_text TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS widgets.next_seed_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seed_widget_id UUID NOT NULL REFERENCES widgets.next_session_seed(widget_id) ON DELETE CASCADE,
  issue_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =====================================================
-- INDEXES - WIDGETS SCHEMA
-- =====================================================
CREATE INDEX IF NOT EXISTS widget_instances_session_idx ON widgets.widget_instances (session_id, widget_type);
CREATE INDEX IF NOT EXISTS task_items_widget_idx ON widgets.task_items (widget_id, position);
CREATE INDEX IF NOT EXISTS decisions_widget_idx ON widgets.decisions (widget_id, created_at DESC);
CREATE INDEX IF NOT EXISTS issues_widget_idx ON widgets.issues (widget_id, resolved, created_at);

-- =====================================================
-- ROW LEVEL SECURITY - WIDGETS SCHEMA
-- =====================================================
ALTER TABLE widgets.widget_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.task_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.code_snippet ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.progress_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.progress_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.next_session_seed ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.next_seed_issues ENABLE ROW LEVEL SECURITY;

-- Widget Instances Policies
DROP POLICY IF EXISTS "widget_instances_select" ON widgets.widget_instances;
DROP POLICY IF EXISTS "widget_instances_insert" ON widgets.widget_instances;
DROP POLICY IF EXISTS "widget_instances_update" ON widgets.widget_instances;

CREATE POLICY "widget_instances_select" ON widgets.widget_instances 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "widget_instances_insert" ON widgets.widget_instances 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "widget_instances_update" ON widgets.widget_instances 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Task Items Policies
DROP POLICY IF EXISTS "task_items_select" ON widgets.task_items;
DROP POLICY IF EXISTS "task_items_insert" ON widgets.task_items;
DROP POLICY IF EXISTS "task_items_update" ON widgets.task_items;
DROP POLICY IF EXISTS "task_items_delete" ON widgets.task_items;

CREATE POLICY "task_items_select" ON widgets.task_items 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "task_items_insert" ON widgets.task_items 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "task_items_update" ON widgets.task_items 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "task_items_delete" ON widgets.task_items 
  FOR DELETE TO authenticated USING (true);

-- Decisions Policies
DROP POLICY IF EXISTS "decisions_select" ON widgets.decisions;
DROP POLICY IF EXISTS "decisions_insert" ON widgets.decisions;

CREATE POLICY "decisions_select" ON widgets.decisions 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "decisions_insert" ON widgets.decisions 
  FOR INSERT TO authenticated WITH CHECK (true);

-- Issues Policies
DROP POLICY IF EXISTS "issues_select" ON widgets.issues;
DROP POLICY IF EXISTS "issues_insert" ON widgets.issues;
DROP POLICY IF EXISTS "issues_update" ON widgets.issues;
DROP POLICY IF EXISTS "issues_delete" ON widgets.issues;

CREATE POLICY "issues_select" ON widgets.issues 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "issues_insert" ON widgets.issues 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "issues_update" ON widgets.issues 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "issues_delete" ON widgets.issues 
  FOR DELETE TO authenticated USING (true);

-- Code Snippet Policies
DROP POLICY IF EXISTS "code_snippet_select" ON widgets.code_snippet;
DROP POLICY IF EXISTS "code_snippet_insert" ON widgets.code_snippet;
DROP POLICY IF EXISTS "code_snippet_update" ON widgets.code_snippet;

CREATE POLICY "code_snippet_select" ON widgets.code_snippet 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "code_snippet_insert" ON widgets.code_snippet 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "code_snippet_update" ON widgets.code_snippet 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Progress Prompts Policies
DROP POLICY IF EXISTS "progress_prompts_select" ON widgets.progress_prompts;
DROP POLICY IF EXISTS "progress_prompts_insert" ON widgets.progress_prompts;

CREATE POLICY "progress_prompts_select" ON widgets.progress_prompts 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "progress_prompts_insert" ON widgets.progress_prompts 
  FOR INSERT TO authenticated WITH CHECK (true);

-- Progress Responses Policies
DROP POLICY IF EXISTS "progress_responses_select" ON widgets.progress_responses;
DROP POLICY IF EXISTS "progress_responses_insert" ON widgets.progress_responses;
DROP POLICY IF EXISTS "progress_responses_update_self" ON widgets.progress_responses;

CREATE POLICY "progress_responses_select" ON widgets.progress_responses 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "progress_responses_insert" ON widgets.progress_responses 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "progress_responses_update_self" ON widgets.progress_responses 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Next Session Seed Policies
DROP POLICY IF EXISTS "next_session_seed_select" ON widgets.next_session_seed;
DROP POLICY IF EXISTS "next_session_seed_insert" ON widgets.next_session_seed;
DROP POLICY IF EXISTS "next_session_seed_update" ON widgets.next_session_seed;

CREATE POLICY "next_session_seed_select" ON widgets.next_session_seed 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "next_session_seed_insert" ON widgets.next_session_seed 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "next_session_seed_update" ON widgets.next_session_seed 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Next Seed Issues Policies
DROP POLICY IF EXISTS "next_seed_issues_select" ON widgets.next_seed_issues;
DROP POLICY IF EXISTS "next_seed_issues_insert" ON widgets.next_seed_issues;
DROP POLICY IF EXISTS "next_seed_issues_update" ON widgets.next_seed_issues;
DROP POLICY IF EXISTS "next_seed_issues_delete" ON widgets.next_seed_issues;

CREATE POLICY "next_seed_issues_select" ON widgets.next_seed_issues 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "next_seed_issues_insert" ON widgets.next_seed_issues 
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "next_seed_issues_update" ON widgets.next_seed_issues 
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "next_seed_issues_delete" ON widgets.next_seed_issues 
  FOR DELETE TO authenticated USING (true);

-- =====================================================
-- REALTIME PUBLICATION
-- =====================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.sessions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- COMMENTS (Documentation)
-- =====================================================
COMMENT ON COLUMN public.sessions.focus_level IS 
  'ML-computed focus score (0-100). Updated by worker based on message content analysis. Higher = more work-focused.';

COMMENT ON COLUMN widgets.issues.ai_priority IS 
  'ML-predicted priority (high/medium/low). Set by issue classifier model.';

COMMENT ON COLUMN widgets.issues.ai_confidence IS 
  'ML prediction confidence (0-1). Higher = more confident prediction.';

COMMENT ON COLUMN widgets.issues.ai_tags IS 
  'ML-predicted tags (e.g., ["database", "backend", "bug"]). Set by issue classifier model.';

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'Z3roCom schema initialized successfully!' AS status;
