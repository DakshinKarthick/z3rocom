-- Focus Worker Support Functions
-- Run this in Supabase SQL editor after supabase.sql

-- Efficient lookup for sessions with recent activity
CREATE OR REPLACE FUNCTION get_active_sessions_for_focus_update(cutoff_time timestamptz)
RETURNS TABLE (id uuid) 
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT s.id
  FROM public.sessions s
  JOIN public.messages m ON m.session_id = s.id
  WHERE m.created_at > cutoff_time;
$$;

GRANT EXECUTE ON FUNCTION get_active_sessions_for_focus_update(timestamptz) TO service_role;

-- Allow service_role to update focus_level
-- (This is already possible with service_role key, but documenting intent)
COMMENT ON COLUMN public.sessions.focus_level IS 
  'ML-computed focus score (0-100). Updated by worker based on message content analysis. Higher = more work-focused.';
