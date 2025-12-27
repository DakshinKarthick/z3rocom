-- Z3roCom Widget Schema Migration
-- This script safely creates/updates the widget tables and policies
-- Run in Supabase SQL Editor

-- =================================================================
-- STEP 1: Create the widgets schema
-- =================================================================
CREATE SCHEMA IF NOT EXISTS widgets;

-- =================================================================
-- STEP 2: Create widget_index table in public schema
-- =================================================================
CREATE TABLE IF NOT EXISTS public.widget_index (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  widget_type TEXT NOT NULL CHECK (widget_type IN ('tasks','decision','issues','code','progress','next')),
  widget_instance_id UUID NOT NULL,
  title TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, widget_type)
);
CREATE INDEX IF NOT EXISTS widget_index_session_idx ON public.widget_index (session_id, created_at);

-- Enable RLS on widget_index
ALTER TABLE public.widget_index ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate
DROP POLICY IF EXISTS "widget_index_select" ON public.widget_index;
DROP POLICY IF EXISTS "widget_index_insert" ON public.widget_index;
DROP POLICY IF EXISTS "widget_index_update" ON public.widget_index;
DROP POLICY IF EXISTS "widget_index_delete" ON public.widget_index;

CREATE POLICY "widget_index_select" ON public.widget_index FOR SELECT TO authenticated USING (true);
CREATE POLICY "widget_index_insert" ON public.widget_index FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "widget_index_update" ON public.widget_index FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "widget_index_delete" ON public.widget_index FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Add to realtime (ignore error if already added)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.widget_index;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- =================================================================
-- STEP 3: Create widget_instances table
-- =================================================================
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

ALTER TABLE widgets.widget_instances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "widget_instances_select" ON widgets.widget_instances;
DROP POLICY IF EXISTS "widget_instances_insert" ON widgets.widget_instances;
DROP POLICY IF EXISTS "widget_instances_update" ON widgets.widget_instances;

CREATE POLICY "widget_instances_select" ON widgets.widget_instances FOR SELECT TO authenticated USING (true);
CREATE POLICY "widget_instances_insert" ON widgets.widget_instances FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "widget_instances_update" ON widgets.widget_instances FOR UPDATE TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());

-- =================================================================
-- STEP 4: Create task_items table
-- =================================================================
CREATE TABLE IF NOT EXISTS widgets.task_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets.widget_instances(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS task_items_widget_idx ON widgets.task_items (widget_id, position);

ALTER TABLE widgets.task_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "task_items_select" ON widgets.task_items;
DROP POLICY IF EXISTS "task_items_insert" ON widgets.task_items;
DROP POLICY IF EXISTS "task_items_update" ON widgets.task_items;
DROP POLICY IF EXISTS "task_items_delete" ON widgets.task_items;

CREATE POLICY "task_items_select" ON widgets.task_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_items_insert" ON widgets.task_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "task_items_update" ON widgets.task_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "task_items_delete" ON widgets.task_items FOR DELETE TO authenticated USING (true);

-- =================================================================
-- STEP 5: Create decisions table
-- =================================================================
CREATE TABLE IF NOT EXISTS widgets.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  widget_id UUID NOT NULL REFERENCES widgets.widget_instances(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS decisions_widget_idx ON widgets.decisions (widget_id, created_at DESC);

ALTER TABLE widgets.decisions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "decisions_select" ON widgets.decisions;
DROP POLICY IF EXISTS "decisions_insert" ON widgets.decisions;
DROP POLICY IF EXISTS "decisions_update_none" ON widgets.decisions;

CREATE POLICY "decisions_select" ON widgets.decisions FOR SELECT TO authenticated USING (true);
CREATE POLICY "decisions_insert" ON widgets.decisions FOR INSERT TO authenticated WITH CHECK (creator_id = auth.uid());

-- =================================================================
-- STEP 6: Create issues table
-- =================================================================
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

ALTER TABLE widgets.issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "issues_select" ON widgets.issues;
DROP POLICY IF EXISTS "issues_insert" ON widgets.issues;
DROP POLICY IF EXISTS "issues_update" ON widgets.issues;
DROP POLICY IF EXISTS "issues_delete" ON widgets.issues;

CREATE POLICY "issues_select" ON widgets.issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "issues_insert" ON widgets.issues FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "issues_update" ON widgets.issues FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "issues_delete" ON widgets.issues FOR DELETE TO authenticated USING (true);

-- =================================================================
-- STEP 7: Create code_snippet table
-- =================================================================
CREATE TABLE IF NOT EXISTS widgets.code_snippet (
  widget_id UUID PRIMARY KEY REFERENCES widgets.widget_instances(id) ON DELETE CASCADE,
  language TEXT NULL,
  content TEXT NOT NULL DEFAULT '',
  locked BOOLEAN NOT NULL DEFAULT false,
  last_editor_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE widgets.code_snippet ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "code_snippet_select" ON widgets.code_snippet;
DROP POLICY IF EXISTS "code_snippet_insert" ON widgets.code_snippet;
DROP POLICY IF EXISTS "code_snippet_update" ON widgets.code_snippet;

CREATE POLICY "code_snippet_select" ON widgets.code_snippet FOR SELECT TO authenticated USING (true);
CREATE POLICY "code_snippet_insert" ON widgets.code_snippet FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "code_snippet_update" ON widgets.code_snippet FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- =================================================================
-- STEP 8: Create progress tables
-- =================================================================
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

ALTER TABLE widgets.progress_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.progress_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "progress_prompts_select" ON widgets.progress_prompts;
DROP POLICY IF EXISTS "progress_prompts_insert" ON widgets.progress_prompts;
DROP POLICY IF EXISTS "progress_responses_select" ON widgets.progress_responses;
DROP POLICY IF EXISTS "progress_responses_insert" ON widgets.progress_responses;
DROP POLICY IF EXISTS "progress_responses_update_self" ON widgets.progress_responses;

CREATE POLICY "progress_prompts_select" ON widgets.progress_prompts FOR SELECT TO authenticated USING (true);
CREATE POLICY "progress_prompts_insert" ON widgets.progress_prompts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "progress_responses_select" ON widgets.progress_responses FOR SELECT TO authenticated USING (true);
CREATE POLICY "progress_responses_insert" ON widgets.progress_responses FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "progress_responses_update_self" ON widgets.progress_responses FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =================================================================
-- STEP 9: Create next_session_seed tables
-- =================================================================
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

ALTER TABLE widgets.next_session_seed ENABLE ROW LEVEL SECURITY;
ALTER TABLE widgets.next_seed_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "next_session_seed_select" ON widgets.next_session_seed;
DROP POLICY IF EXISTS "next_session_seed_insert" ON widgets.next_session_seed;
DROP POLICY IF EXISTS "next_session_seed_update" ON widgets.next_session_seed;
DROP POLICY IF EXISTS "next_seed_issues_select" ON widgets.next_seed_issues;
DROP POLICY IF EXISTS "next_seed_issues_insert" ON widgets.next_seed_issues;
DROP POLICY IF EXISTS "next_seed_issues_update" ON widgets.next_seed_issues;
DROP POLICY IF EXISTS "next_seed_issues_delete" ON widgets.next_seed_issues;

CREATE POLICY "next_session_seed_select" ON widgets.next_session_seed FOR SELECT TO authenticated USING (true);
CREATE POLICY "next_session_seed_insert" ON widgets.next_session_seed FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "next_session_seed_update" ON widgets.next_session_seed FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "next_seed_issues_select" ON widgets.next_seed_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "next_seed_issues_insert" ON widgets.next_seed_issues FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "next_seed_issues_update" ON widgets.next_seed_issues FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "next_seed_issues_delete" ON widgets.next_seed_issues FOR DELETE TO authenticated USING (true);

-- =================================================================
-- STEP 10: Add tables to realtime publication
-- =================================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE widgets.widget_instances;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE widgets.task_items;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE widgets.decisions;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE widgets.issues;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE widgets.code_snippet;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =================================================================
-- DONE! Widget schema is ready.
-- =================================================================
SELECT 'Widget schema migration completed successfully!' as status;
