-- ========================================
-- FIX: RLS Policy Blocking Family Tree Reads
-- ========================================
-- Problem: Family tree saves successfully but can't be read back
-- Root Cause: SELECT policy is too restrictive
-- Solution: Allow users to read their own family tree data
-- ========================================

-- 1. Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can read their own family tree" ON family_trees;
DROP POLICY IF EXISTS "Users can insert their own family tree" ON family_trees;
DROP POLICY IF EXISTS "Users can update their own family tree" ON family_trees;
DROP POLICY IF EXISTS "Users can delete their own family tree" ON family_trees;

-- 2. Create proper RLS policies that work with auth.uid()

-- Allow SELECT: Users can read family trees for their family_id
CREATE POLICY "Users can read their family tree data"
ON family_trees
FOR SELECT
TO authenticated
USING (
  family_id IN (
    SELECT family_id 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- Allow INSERT: Users can create family tree for their family_id
CREATE POLICY "Users can insert their family tree data"
ON family_trees
FOR INSERT
TO authenticated
WITH CHECK (
  family_id IN (
    SELECT family_id 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- Allow UPDATE: Users can update family tree for their family_id
CREATE POLICY "Users can update their family tree data"
ON family_trees
FOR UPDATE
TO authenticated
USING (
  family_id IN (
    SELECT family_id 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
)
WITH CHECK (
  family_id IN (
    SELECT family_id 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- Allow DELETE: Users can delete family tree for their family_id
CREATE POLICY "Users can delete their family tree data"
ON family_trees
FOR DELETE
TO authenticated
USING (
  family_id IN (
    SELECT family_id 
    FROM user_profiles 
    WHERE id = auth.uid()
  )
);

-- ========================================
-- Verification Query
-- ========================================
-- Run this after applying the policies to verify:
-- SELECT * FROM family_trees WHERE family_id = '16d5f93c-65b7-49d3-af1e-a04c5950cbe4';
-- 
-- You should see the family tree data if logged in as ilicachauhan87@gmail.com
-- ========================================

-- ========================================
-- IMPORTANT: Make sure user_profiles table also has correct RLS
-- ========================================
-- Verify user_profiles RLS policies allow SELECT for authenticated users:

-- Check existing policies
-- SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- If user_profiles SELECT policy is missing, add it:
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can read their own profile'
  ) THEN
    CREATE POLICY "Users can read their own profile"
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());
  END IF;
END $$;
