-- Fix RLS policies AND schema permissions for widgets schema
-- CRITICAL: Grant schema-level permissions first

-- Grant USAGE on widgets schema to authenticated role
GRANT USAGE ON SCHEMA widgets TO authenticated;

-- Grant ALL privileges on all tables in widgets schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA widgets TO authenticated;

-- Grant privileges on sequences (for auto-increment IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA widgets TO authenticated;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA widgets GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA widgets GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Now fix RLS policies to be more permissive

-- widget_instances
DROP POLICY IF EXISTS "widget_instances_select" ON widgets.widget_instances;
DROP POLICY IF EXISTS "widget_instances_insert" ON widgets.widget_instances;
DROP POLICY IF EXISTS "widget_instances_update" ON widgets.widget_instances;

CREATE POLICY "widget_instances_select" ON widgets.widget_instances 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "widget_instances_insert" ON widgets.widget_instances 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "widget_instances_update" ON widgets.widget_instances 
  FOR UPDATE TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- task_items
DROP POLICY IF EXISTS "task_items_select" ON widgets.task_items;
DROP POLICY IF EXISTS "task_items_insert" ON widgets.task_items;
DROP POLICY IF EXISTS "task_items_update" ON widgets.task_items;
DROP POLICY IF EXISTS "task_items_delete" ON widgets.task_items;

CREATE POLICY "task_items_select" ON widgets.task_items 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "task_items_insert" ON widgets.task_items 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "task_items_update" ON widgets.task_items 
  FOR UPDATE TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "task_items_delete" ON widgets.task_items 
  FOR DELETE TO authenticated 
  USING (true);

-- decisions
DROP POLICY IF EXISTS "decisions_select" ON widgets.decisions;
DROP POLICY IF EXISTS "decisions_insert" ON widgets.decisions;

CREATE POLICY "decisions_select" ON widgets.decisions 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "decisions_insert" ON widgets.decisions 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- issues
DROP POLICY IF EXISTS "issues_select" ON widgets.issues;
DROP POLICY IF EXISTS "issues_insert" ON widgets.issues;
DROP POLICY IF EXISTS "issues_update" ON widgets.issues;
DROP POLICY IF EXISTS "issues_delete" ON widgets.issues;

CREATE POLICY "issues_select" ON widgets.issues 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "issues_insert" ON widgets.issues 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "issues_update" ON widgets.issues 
  FOR UPDATE TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "issues_delete" ON widgets.issues 
  FOR DELETE TO authenticated 
  USING (true);

-- code_snippet
DROP POLICY IF EXISTS "code_snippet_select" ON widgets.code_snippet;
DROP POLICY IF EXISTS "code_snippet_insert" ON widgets.code_snippet;
DROP POLICY IF EXISTS "code_snippet_update" ON widgets.code_snippet;

CREATE POLICY "code_snippet_select" ON widgets.code_snippet 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "code_snippet_insert" ON widgets.code_snippet 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "code_snippet_update" ON widgets.code_snippet 
  FOR UPDATE TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- progress_prompts
DROP POLICY IF EXISTS "progress_prompts_select" ON widgets.progress_prompts;
DROP POLICY IF EXISTS "progress_prompts_insert" ON widgets.progress_prompts;

CREATE POLICY "progress_prompts_select" ON widgets.progress_prompts 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "progress_prompts_insert" ON widgets.progress_prompts 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- progress_responses
DROP POLICY IF EXISTS "progress_responses_select" ON widgets.progress_responses;
DROP POLICY IF EXISTS "progress_responses_insert" ON widgets.progress_responses;
DROP POLICY IF EXISTS "progress_responses_update_self" ON widgets.progress_responses;

CREATE POLICY "progress_responses_select" ON widgets.progress_responses 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "progress_responses_insert" ON widgets.progress_responses 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "progress_responses_update_self" ON widgets.progress_responses 
  FOR UPDATE TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- next_session_seed
DROP POLICY IF EXISTS "next_session_seed_select" ON widgets.next_session_seed;
DROP POLICY IF EXISTS "next_session_seed_insert" ON widgets.next_session_seed;
DROP POLICY IF EXISTS "next_session_seed_update" ON widgets.next_session_seed;

CREATE POLICY "next_session_seed_select" ON widgets.next_session_seed 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "next_session_seed_insert" ON widgets.next_session_seed 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "next_session_seed_update" ON widgets.next_session_seed 
  FOR UPDATE TO authenticated 
  USING (true) 
  WITH CHECK (true);

-- next_seed_issues
DROP POLICY IF EXISTS "next_seed_issues_select" ON widgets.next_seed_issues;
DROP POLICY IF EXISTS "next_seed_issues_insert" ON widgets.next_seed_issues;
DROP POLICY IF EXISTS "next_seed_issues_update" ON widgets.next_seed_issues;
DROP POLICY IF EXISTS "next_seed_issues_delete" ON widgets.next_seed_issues;

CREATE POLICY "next_seed_issues_select" ON widgets.next_seed_issues 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "next_seed_issues_insert" ON widgets.next_seed_issues 
  FOR INSERT TO authenticated 
  WITH CHECK (true);

CREATE POLICY "next_seed_issues_update" ON widgets.next_seed_issues 
  FOR UPDATE TO authenticated 
  USING (true) 
  WITH CHECK (true);

CREATE POLICY "next_seed_issues_delete" ON widgets.next_seed_issues 
  FOR DELETE TO authenticated 
  USING (true);

SELECT 'Widget RLS policies updated - all authenticated users can now access widgets!' as status;
