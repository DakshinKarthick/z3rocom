-- Allow any session member to update focus_level on sessions
-- Run this in Supabase SQL editor to enable focus level updates from all participants

-- Option 1: Create a new policy for session members to update focus_level only
-- This is more restrictive - only allows updating focus_level field

-- First, we need to modify the existing policy or add a new one
-- Since Postgres RLS doesn't support column-level policies directly,
-- we'll create a policy that allows members to update the session

-- Drop existing update policy if you want to replace it
-- DROP POLICY IF EXISTS "sessions_update_creator" ON public.sessions;

-- Add policy allowing session members to update (for focus_level sync)
CREATE POLICY "sessions_update_member" ON public.sessions
FOR UPDATE
TO authenticated
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

-- Note: This allows any session member to update any field on the session.
-- If you want to restrict to only focus_level, you'd need to use a trigger or RPC function.

-- Alternative: Create an RPC function for updating focus level (more secure)
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
