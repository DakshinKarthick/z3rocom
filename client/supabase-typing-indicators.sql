-- Typing Indicators Table for Presence
CREATE TABLE IF NOT EXISTS public.typing_indicators (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  is_typing BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS typing_indicators_session_idx ON public.typing_indicators(session_id, is_typing, updated_at DESC);

ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "typing_indicators_select" ON public.typing_indicators;
DROP POLICY IF EXISTS "typing_indicators_upsert" ON public.typing_indicators;
DROP POLICY IF EXISTS "typing_indicators_delete" ON public.typing_indicators;

CREATE POLICY "typing_indicators_select" ON public.typing_indicators 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "typing_indicators_upsert" ON public.typing_indicators 
  FOR INSERT TO authenticated 
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "typing_indicators_delete" ON public.typing_indicators 
  FOR DELETE TO authenticated 
  USING (user_id = auth.uid());

-- Add to realtime
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_indicators;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

SELECT 'Typing indicators table created!' as status;
