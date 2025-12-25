-- Complete RLS policy fix for Z3RO
-- Run this entire script in Supabase SQL Editor

-- Drop ALL existing policies (including any variations)
DROP POLICY IF EXISTS "sessions_select_for_members" ON public.sessions;
DROP POLICY IF EXISTS "sessions_select_if_member" ON public.sessions;
DROP POLICY IF EXISTS "sessions_select_authenticated" ON public.sessions;
DROP POLICY IF EXISTS "sessions_insert_authenticated" ON public.sessions;
DROP POLICY IF EXISTS "sessions_update_creator" ON public.sessions;
DROP POLICY IF EXISTS "members_insert_self" ON public.session_members;
DROP POLICY IF EXISTS "members_upsert_self" ON public.session_members;
DROP POLICY IF EXISTS "members_update_self" ON public.session_members;
DROP POLICY IF EXISTS "members_select_same_session" ON public.session_members;
DROP POLICY IF EXISTS "members_select_authenticated" ON public.session_members;
DROP POLICY IF EXISTS "messages_select_for_members" ON public.messages;
DROP POLICY IF EXISTS "messages_select_authenticated" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_for_members" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_authenticated" ON public.messages;

-- SESSIONS POLICIES (no circular references)
CREATE POLICY "sessions_select_authenticated" ON public.sessions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "sessions_insert_authenticated" ON public.sessions
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "sessions_update_creator" ON public.sessions
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- SESSION_MEMBERS POLICIES (no circular references)
CREATE POLICY "members_insert_self" ON public.session_members
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_update_self" ON public.session_members
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "members_select_authenticated" ON public.session_members
FOR SELECT
TO authenticated
USING (true);

-- MESSAGES POLICIES (simplified - no circular references)
CREATE POLICY "messages_select_authenticated" ON public.messages
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "messages_insert_authenticated" ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (author_id = auth.uid());
