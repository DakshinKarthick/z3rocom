-- Remove redundant widget_index table
-- The widgets.widget_instances table in the widgets schema is the single source of truth

-- Remove from realtime publication first (PostgreSQL doesn't support IF EXISTS here)
DO $$ 
BEGIN
  ALTER PUBLICATION supabase_realtime DROP TABLE public.widget_index;
EXCEPTION
  WHEN undefined_table THEN NULL;
END $$;

-- Drop policies
DROP POLICY IF EXISTS "widget_index_select" ON public.widget_index;
DROP POLICY IF EXISTS "widget_index_insert" ON public.widget_index;
DROP POLICY IF EXISTS "widget_index_update" ON public.widget_index;
DROP POLICY IF EXISTS "widget_index_delete" ON public.widget_index;

-- Drop the table
DROP TABLE IF EXISTS public.widget_index;

-- Verification: List all widget tables (should only show widgets.widget_instances)
SELECT schemaname, tablename 
FROM pg_tables 
WHERE tablename LIKE '%widget%' 
ORDER BY schemaname, tablename;
