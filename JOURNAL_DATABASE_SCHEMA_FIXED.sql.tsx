-- =====================================================
-- JOURNAL FEATURE - DATABASE SCHEMA (FIXED)
-- =====================================================
-- This creates the journals table for "My Journal" feature
-- Run this SQL in your Supabase SQL Editor

-- 1. Drop existing table if you need to start fresh (optional)
-- DROP TABLE IF EXISTS public.journals CASCADE;

-- 2. Create journals table
CREATE TABLE IF NOT EXISTS public.journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  
  -- Core journal data
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  entry_date DATE NOT NULL,
  
  -- Metadata
  moods TEXT[], -- Array of mood strings
  tags TEXT[], -- Array of tag strings
  
  -- Sharing settings
  is_private BOOLEAN DEFAULT true,
  shared_with UUID[], -- Array of user IDs this journal is shared with
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_journals_user_id ON public.journals(user_id);
CREATE INDEX IF NOT EXISTS idx_journals_family_id ON public.journals(family_id);
CREATE INDEX IF NOT EXISTS idx_journals_entry_date ON public.journals(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journals_created_at ON public.journals(created_at DESC);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own journals" ON public.journals;
DROP POLICY IF EXISTS "Users can view journals shared with them" ON public.journals;
DROP POLICY IF EXISTS "Users can create their own journals" ON public.journals;
DROP POLICY IF EXISTS "Users can update their own journals" ON public.journals;
DROP POLICY IF EXISTS "Users can delete their own journals" ON public.journals;

-- 6. RLS Policies for journals

-- Policy: Users can view their own journals
CREATE POLICY "Users can view their own journals"
  ON public.journals
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can view journals shared with them
CREATE POLICY "Users can view journals shared with them"
  ON public.journals
  FOR SELECT
  USING (
    auth.uid() = ANY(shared_with) AND is_private = false
  );

-- Policy: Users can create their own journals
CREATE POLICY "Users can create their own journals"
  ON public.journals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own journals
CREATE POLICY "Users can update their own journals"
  ON public.journals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own journals
CREATE POLICY "Users can delete their own journals"
  ON public.journals
  FOR DELETE
  USING (auth.uid() = user_id);

-- 7. Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_journals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS journals_updated_at_trigger ON public.journals;

CREATE TRIGGER journals_updated_at_trigger
  BEFORE UPDATE ON public.journals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_journals_updated_at();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if table was created successfully
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'journals'
) AS table_exists;

-- Check table columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'journals'
ORDER BY ordinal_position;

-- Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'journals';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'journals';

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'journals'
ORDER BY indexname;

-- Check triggers
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'journals';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Journals table created successfully!';
  RAISE NOTICE '✅ All indexes created';
  RAISE NOTICE '✅ RLS enabled with 5 policies';
  RAISE NOTICE '✅ Auto-update trigger configured';
  RAISE NOTICE '';
  RAISE NOTICE '🎉 Database schema is ready for Journal feature!';
END $$;
