-- =====================================================
-- FIX JOURNAL FREQUENCY COLUMN ERROR
-- =====================================================
-- This fixes the "Could not find the 'frequency' column" error
-- Run this SQL in your Supabase SQL Editor NOW
-- =====================================================

-- Step 1: Check if journals table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'journals'
  ) THEN
    RAISE NOTICE '⚠️  journals table does not exist - will create it';
  ELSE
    RAISE NOTICE '✅ journals table exists - checking for missing columns';
  END IF;
END $$;

-- Step 2: Drop all existing policies first (to avoid column reference errors)
DROP POLICY IF EXISTS "Users can view their own journals" ON public.journals;
DROP POLICY IF EXISTS "Users can view journals shared with them" ON public.journals;
DROP POLICY IF EXISTS "Users can create their own journals" ON public.journals;
DROP POLICY IF EXISTS "Users can update their own journals" ON public.journals;
DROP POLICY IF EXISTS "Users can delete their own journals" ON public.journals;

-- Step 3: Create journals table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  family_id UUID NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  
  -- Core journal data
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  frequency VARCHAR(20) NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
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

-- Step 4: Add missing columns to existing table (if table already exists)
DO $$
BEGIN
  -- Add frequency column if it doesn't exist (THIS IS THE KEY FIX)
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journals' 
    AND column_name = 'frequency'
  ) THEN
    ALTER TABLE public.journals 
    ADD COLUMN frequency VARCHAR(20) NOT NULL DEFAULT 'daily' 
    CHECK (frequency IN ('daily', 'weekly', 'monthly'));
    RAISE NOTICE '✅ Added frequency column';
  ELSE
    RAISE NOTICE '✅ frequency column already exists';
  END IF;

  -- Add entry_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journals' 
    AND column_name = 'entry_date'
  ) THEN
    ALTER TABLE public.journals 
    ADD COLUMN entry_date DATE NOT NULL DEFAULT CURRENT_DATE;
    RAISE NOTICE '✅ Added entry_date column';
  ELSE
    RAISE NOTICE '✅ entry_date column already exists';
  END IF;

  -- Add is_private column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journals' 
    AND column_name = 'is_private'
  ) THEN
    ALTER TABLE public.journals 
    ADD COLUMN is_private BOOLEAN DEFAULT true;
    RAISE NOTICE '✅ Added is_private column';
  ELSE
    RAISE NOTICE '✅ is_private column already exists';
  END IF;
  
  -- Add shared_with column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journals' 
    AND column_name = 'shared_with'
  ) THEN
    ALTER TABLE public.journals 
    ADD COLUMN shared_with UUID[];
    RAISE NOTICE '✅ Added shared_with column';
  ELSE
    RAISE NOTICE '✅ shared_with column already exists';
  END IF;
  
  -- Add moods column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journals' 
    AND column_name = 'moods'
  ) THEN
    ALTER TABLE public.journals 
    ADD COLUMN moods TEXT[];
    RAISE NOTICE '✅ Added moods column';
  ELSE
    RAISE NOTICE '✅ moods column already exists';
  END IF;
  
  -- Add tags column if it doesn't exist
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'journals' 
    AND column_name = 'tags'
  ) THEN
    ALTER TABLE public.journals 
    ADD COLUMN tags TEXT[];
    RAISE NOTICE '✅ Added tags column';
  ELSE
    RAISE NOTICE '✅ tags column already exists';
  END IF;
END $$;

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_journals_user_id ON public.journals(user_id);
CREATE INDEX IF NOT EXISTS idx_journals_family_id ON public.journals(family_id);
CREATE INDEX IF NOT EXISTS idx_journals_entry_date ON public.journals(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_journals_created_at ON public.journals(created_at DESC);

-- Step 6: Enable Row Level Security
ALTER TABLE public.journals ENABLE ROW LEVEL SECURITY;

-- Step 7: Create RLS Policies
CREATE POLICY "Users can view their own journals"
  ON public.journals
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view journals shared with them"
  ON public.journals
  FOR SELECT
  USING (
    auth.uid() = ANY(shared_with) AND is_private = false
  );

CREATE POLICY "Users can create their own journals"
  ON public.journals
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own journals"
  ON public.journals
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own journals"
  ON public.journals
  FOR DELETE
  USING (auth.uid() = user_id);

-- Step 8: Create trigger to auto-update updated_at timestamp
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
-- VERIFICATION
-- =====================================================

-- Verify the table structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'journals'
ORDER BY ordinal_position;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '✅ Journal frequency column fix COMPLETE!';
  RAISE NOTICE '✅ All missing columns added';
  RAISE NOTICE '✅ RLS policies created';
  RAISE NOTICE '✅ Indexes created for performance';
  RAISE NOTICE '🎉 ========================================';
  RAISE NOTICE '';
  RAISE NOTICE '📝 You can now create journal entries!';
  RAISE NOTICE '';
END $$;
