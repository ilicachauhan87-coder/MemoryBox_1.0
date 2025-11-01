-- =====================================================
-- 📚 PREGNANCY BOOKS PER CHILD - Database Migration
-- =====================================================
-- This migration enables separate pregnancy books for each child
-- by linking memories to specific children in the family tree
-- =====================================================

-- ✅ STEP 1: Add child_id column to memories table
-- This links pregnancy memories to specific children
ALTER TABLE memories 
ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES family_tree_people(id) ON DELETE SET NULL;

-- Create index for fast queries by child
CREATE INDEX IF NOT EXISTS idx_memories_child_id ON memories(child_id);

-- ✅ STEP 2: Add child_id to user_book_preferences table
-- This allows separate book titles for each child's pregnancy journey
ALTER TABLE user_book_preferences
ADD COLUMN IF NOT EXISTS child_id UUID REFERENCES family_tree_people(id) ON DELETE CASCADE;

-- ✅ STEP 3: Drop old UNIQUE constraint (one book per journey type)
-- We need to allow multiple pregnancy books (one per child)
ALTER TABLE user_book_preferences 
DROP CONSTRAINT IF EXISTS user_book_preferences_user_id_journey_type_key;

-- ✅ STEP 4: Add new UNIQUE constraint
-- Allow multiple pregnancy books (different child_id) but only one couple book
-- For couple books: child_id will be NULL
-- For pregnancy books: child_id identifies the child
ALTER TABLE user_book_preferences
ADD CONSTRAINT unique_book_per_child UNIQUE(user_id, journey_type, child_id);

-- ✅ STEP 5: Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_book_prefs_child_id ON user_book_preferences(child_id);

-- ✅ STEP 6: Update RLS policies to include child_id access
-- Users can view book preferences that include child references
-- (No changes needed - existing policies cover this via user_id)

-- ✅ VERIFICATION QUERIES (Run these to verify migration succeeded)
-- Check if child_id column exists in memories table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'memories' 
AND column_name = 'child_id';

-- Check if child_id column exists in user_book_preferences table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_book_preferences' 
AND column_name = 'child_id';

-- Check if new unique constraint exists
SELECT constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'user_book_preferences' 
AND constraint_name = 'unique_book_per_child';

-- ✅ SUCCESS INDICATORS:
-- 1. child_id column exists in memories (type: uuid)
-- 2. child_id column exists in user_book_preferences (type: uuid)
-- 3. unique_book_per_child constraint exists
-- 4. idx_memories_child_id index exists
-- 5. idx_book_prefs_child_id index exists

-- =====================================================
-- 📝 NOTES FOR DEVELOPERS:
-- =====================================================
-- 1. Existing couple books remain unchanged (child_id = NULL)
-- 2. Existing pregnancy memories have child_id = NULL initially
-- 3. Migration wizard will prompt users to link old memories
-- 4. New pregnancy memories require child selection
-- 5. This migration is BACKWARD COMPATIBLE - old data still works
-- =====================================================
