-- =====================================================
-- JOURNAL CLEANUP - Remove Duplicate Triggers (FIXED)
-- =====================================================
-- This script safely removes duplicate triggers if they exist
-- Run this ONLY IF you see duplicate triggers in your database
-- 
-- HOW TO CHECK IF YOU NEED THIS:
-- Run this query first:
--
-- SELECT tgname 
-- FROM pg_trigger 
-- WHERE tgrelid = 'public.journals'::regclass
-- AND tgname LIKE 'journals_updated_at_trigger%';
--
-- If you see multiple results (e.g., journals_updated_at_trigger, 
-- journals_updated_at_trigger_1, etc.), run this script.

-- Step 1: Check for duplicates
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgrelid = 'public.journals'::regclass
  AND tgname LIKE 'journals_updated_at_trigger%';
  
  RAISE NOTICE 'Found % trigger(s) on journals table', trigger_count;
  
  IF trigger_count > 1 THEN
    RAISE NOTICE '⚠️ Multiple triggers detected - cleanup recommended';
  ELSIF trigger_count = 1 THEN
    RAISE NOTICE '✅ Only one trigger found - no cleanup needed';
  ELSE
    RAISE NOTICE '❌ No triggers found - you may need to run JOURNAL_DATABASE_SCHEMA.sql';
  END IF;
END $$;

-- Step 2: Drop duplicate triggers (keeps the original)
-- These commands are safe - they won't error if triggers don't exist
DROP TRIGGER IF EXISTS journals_updated_at_trigger_1 ON public.journals;
DROP TRIGGER IF EXISTS journals_updated_at_trigger_2 ON public.journals;
DROP TRIGGER IF EXISTS journals_updated_at_trigger_3 ON public.journals;
DROP TRIGGER IF EXISTS journals_updated_at_trigger_4 ON public.journals;
DROP TRIGGER IF EXISTS journals_updated_at_trigger_5 ON public.journals;

-- Step 3: Verify only one trigger remains
DO $$
DECLARE
  final_count INTEGER;
  trigger_name TEXT;
BEGIN
  SELECT COUNT(*), string_agg(tgname, ', ') INTO final_count, trigger_name
  FROM pg_trigger
  WHERE tgrelid = 'public.journals'::regclass
  AND tgname LIKE 'journals_updated_at_trigger%';
  
  IF final_count = 1 THEN
    RAISE NOTICE '✅ Cleanup successful! One trigger remains: %', trigger_name;
  ELSIF final_count > 1 THEN
    RAISE NOTICE '⚠️ Multiple triggers still exist: %', trigger_name;
    RAISE NOTICE 'You may need to manually drop duplicates';
  ELSE
    RAISE NOTICE '❌ No trigger found after cleanup - this should not happen!';
  END IF;
END $$;

-- Step 4: Verify the trigger function still exists
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'update_journals_updated_at'
    ) 
    THEN '✅ Trigger function exists'
    ELSE '❌ Trigger function missing - run JOURNAL_DATABASE_SCHEMA.sql'
  END AS function_status;

-- Step 5: Test the trigger works
DO $$
DECLARE
  test_journal_id UUID;
  old_updated_at TIMESTAMPTZ;
  new_updated_at TIMESTAMPTZ;
BEGIN
  -- Find a test journal (use your own journal)
  SELECT id, updated_at INTO test_journal_id, old_updated_at
  FROM journals
  LIMIT 1;
  
  IF test_journal_id IS NOT NULL THEN
    -- Wait 1 second
    PERFORM pg_sleep(1);
    
    -- Update the journal (just change updated_at)
    UPDATE journals
    SET title = title -- No-op update to trigger the update trigger
    WHERE id = test_journal_id;
    
    -- Check if updated_at changed
    SELECT updated_at INTO new_updated_at
    FROM journals
    WHERE id = test_journal_id;
    
    IF new_updated_at > old_updated_at THEN
      RAISE NOTICE '✅ Trigger is working! updated_at changed from % to %', old_updated_at, new_updated_at;
    ELSE
      RAISE NOTICE '⚠️ Trigger may not be working - updated_at did not change';
    END IF;
  ELSE
    RAISE NOTICE 'ℹ️ No journals found to test trigger - create a journal first';
  END IF;
END $$;

-- =====================================================
-- FINAL STATUS CHECK
-- =====================================================

SELECT 
  '✅ CLEANUP COMPLETE' AS status,
  COUNT(*) AS trigger_count,
  string_agg(tgname, ', ') AS remaining_triggers
FROM pg_trigger
WHERE tgrelid = 'public.journals'::regclass
AND tgname LIKE 'journals_updated_at_trigger%';

-- Expected result:
-- status: ✅ CLEANUP COMPLETE
-- trigger_count: 1
-- remaining_triggers: journals_updated_at_trigger
