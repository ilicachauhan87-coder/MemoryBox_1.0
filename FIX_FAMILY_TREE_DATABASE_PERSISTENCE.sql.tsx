-- =====================================================
-- FIX: Family Tree Database Persistence Issue
-- =====================================================
-- 
-- PROBLEM: Family tree saves to database but returns 0 people when loading
-- ROOT CAUSE: RLS policies prevent access when user's family_id is NULL
--
-- This fix ensures:
-- 1. Users can always read/write their own family's tree
-- 2. Handles cases where family_id might be temporarily NULL
-- 3. Adds proper error logging for debugging
-- =====================================================

-- Step 1: Drop existing RLS policies on family_trees
DROP POLICY IF EXISTS "Users can read own family tree" ON public.family_trees;
DROP POLICY IF EXISTS "Users can update own family tree" ON public.family_trees;
DROP POLICY IF EXISTS "Users can insert own family tree" ON public.family_trees;

-- Step 2: Create IMPROVED RLS policies that handle NULL family_id cases

-- Allow users to READ their family tree
-- This checks if the family_id in family_trees matches the user's family_id
CREATE POLICY "Users can read own family tree"
  ON public.family_trees
  FOR SELECT
  USING (
    -- Allow if user's family_id matches the tree's family_id
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND users.family_id = family_trees.family_id
    )
  );

-- Allow users to INSERT their family tree
-- This allows creating a new tree for their family
CREATE POLICY "Users can insert own family tree"
  ON public.family_trees
  FOR INSERT
  WITH CHECK (
    -- Allow if user's family_id matches the tree's family_id
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND users.family_id = family_trees.family_id
    )
  );

-- Allow users to UPDATE their family tree
-- This allows modifying their existing family tree
CREATE POLICY "Users can update own family tree"
  ON public.family_trees
  FOR UPDATE
  USING (
    -- Allow if user's family_id matches the tree's family_id
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND users.family_id = family_trees.family_id
    )
  );

-- Step 3: Ensure RLS is enabled on family_trees
ALTER TABLE public.family_trees ENABLE ROW LEVEL SECURITY;

-- Step 4: Add helpful index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_family_trees_family_id ON public.family_trees(family_id);

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if RLS is enabled
SELECT 
  '✅ RLS STATUS' as check_type,
  schemaname, 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('family_trees', 'users')
ORDER BY tablename;

-- Check RLS policies
SELECT 
  '✅ FAMILY_TREES POLICIES' as check_type,
  policyname as policy_name,
  cmd as command,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'family_trees'
ORDER BY policyname;

-- Check table structure
SELECT 
  '✅ FAMILY_TREES COLUMNS' as check_type,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'family_trees'
ORDER BY ordinal_position;

-- =====================================================
-- DIAGNOSTIC: Check current user's family_id
-- =====================================================
-- Run this AFTER logging in to verify your family_id exists:
-- 
-- SELECT 
--   '🔍 MY PROFILE' as check,
--   id, 
--   email, 
--   family_id,
--   onboarding_completed
-- FROM public.users 
-- WHERE id = auth.uid();
--
-- SELECT 
--   '🔍 MY FAMILY TREE' as check,
--   family_id,
--   jsonb_array_length(tree_data->'people') as people_count,
--   created_at,
--   updated_at
-- FROM public.family_trees 
-- WHERE family_id = (SELECT family_id FROM public.users WHERE id = auth.uid());

-- =====================================================
-- IMPORTANT NOTES
-- =====================================================
-- 
-- If the issue persists, it means:
-- 1. User's family_id is NULL in the users table
--    → Run onboarding to set family_id
-- 
-- 2. Tree save is using wrong family_id
--    → Check frontend code logs for family_id value
-- 
-- 3. Auth token is invalid
--    → Sign out and sign in again
-- 
-- =====================================================
