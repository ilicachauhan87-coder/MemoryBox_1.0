-- ✅ PERMANENT FIX: Database Policies + Schema for Bidirectional Profile Sync
-- Run this SQL in Supabase SQL Editor

-- ==================== STEP 1: FIX RLS POLICIES ====================

-- Drop the broken UPDATE policy
DROP POLICY IF EXISTS "users_own_profile_update" ON users;

-- Create a new UPDATE policy with proper WITH CHECK
CREATE POLICY "users_own_profile_update"
ON users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ✅ Now users can update their own profiles

-- ==================== STEP 2: VERIFY DATABASE SCHEMA ====================

-- Check if all required columns exist
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

-- ==================== STEP 3: ADD MISSING COLUMNS (if needed) ====================

-- Add any missing profile fields
DO $$ 
BEGIN
  -- Check and add maiden_name if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'maiden_name'
  ) THEN
    ALTER TABLE users ADD COLUMN maiden_name TEXT;
  END IF;

  -- Check and add phone if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone TEXT;
  END IF;

  -- Check and add location if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'location'
  ) THEN
    ALTER TABLE users ADD COLUMN location TEXT;
  END IF;

  -- Check and add bio if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'bio'
  ) THEN
    ALTER TABLE users ADD COLUMN bio TEXT;
  END IF;

  -- Check and add place_of_birth if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'place_of_birth'
  ) THEN
    ALTER TABLE users ADD COLUMN place_of_birth TEXT;
  END IF;

  -- Check and add death_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'death_date'
  ) THEN
    ALTER TABLE users ADD COLUMN death_date TEXT;
  END IF;

  -- Check and add death_place if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'death_place'
  ) THEN
    ALTER TABLE users ADD COLUMN death_place TEXT;
  END IF;

  -- Check and add photo_storage_path if missing (CRITICAL for private buckets)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'photo_storage_path'
  ) THEN
    ALTER TABLE users ADD COLUMN photo_storage_path TEXT;
  END IF;

  -- Check and add status if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'status'
  ) THEN
    ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'Living';
  END IF;

  -- Check and add spouse_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'spouse_id'
  ) THEN
    ALTER TABLE users ADD COLUMN spouse_id UUID;
  END IF;

  -- Check and add marriage_date if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'marriage_date'
  ) THEN
    ALTER TABLE users ADD COLUMN marriage_date TEXT;
  END IF;

  -- Check and add marriage_anniversary if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'marriage_anniversary'
  ) THEN
    ALTER TABLE users ADD COLUMN marriage_anniversary TEXT;
  END IF;

  -- Check and add activity_count if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'activity_count'
  ) THEN
    ALTER TABLE users ADD COLUMN activity_count INTEGER DEFAULT 0;
  END IF;

END $$;

-- ==================== STEP 4: VERIFY THE FIX ====================

-- Check policies are correct
SELECT 
  policyname, 
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies 
WHERE tablename = 'users';

-- Expected output:
-- users_all_operations: has_using=true, has_with_check=true
-- users_own_profile_insert: has_using=false, has_with_check=true
-- users_own_profile_select: has_using=true, has_with_check=false
-- users_own_profile_update: has_using=true, has_with_check=true ✅ FIXED!

-- ==================== STEP 5: TEST WITH YOUR USER ====================

-- Replace YOUR_USER_ID with your actual user ID (4cbe4278-760f-45f0-b117-fba603ac1142)
-- This should return your profile
SELECT * FROM users WHERE id = '4cbe4278-760f-45f0-b117-fba603ac1142';

-- This should succeed (updates your own profile)
UPDATE users 
SET maiden_name = 'TestMaidenName', 
    phone = '+1234567890',
    location = 'Test Location',
    bio = 'Test bio',
    place_of_birth = 'Test Place'
WHERE id = '4cbe4278-760f-45f0-b117-fba603ac1142';

-- Verify the update worked
SELECT 
  first_name, 
  last_name, 
  maiden_name, 
  phone, 
  location, 
  bio, 
  place_of_birth
FROM users 
WHERE id = '4cbe4278-760f-45f0-b117-fba603ac1142';

-- ✅ If you see your updated data, the fix worked!
