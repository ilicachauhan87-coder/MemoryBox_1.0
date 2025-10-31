-- =====================================================
-- 📚 BOOK OF LIFE - Supabase Database Setup
-- =====================================================
-- Run this SQL in Supabase SQL Editor to set up the database
-- for the Book of Life feature
-- =====================================================

-- 1️⃣ CREATE TABLE: user_book_preferences
-- Stores custom book titles and preferences for each user
CREATE TABLE IF NOT EXISTS user_book_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_type VARCHAR(20) NOT NULL CHECK (journey_type IN ('couple', 'pregnancy')),
  custom_title VARCHAR(50), -- Max 50 characters for titles
  cover_color VARCHAR(7) DEFAULT NULL, -- Hex color (future feature)
  last_opened_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure one preference row per user per journey type
  UNIQUE(user_id, journey_type)
);

-- 2️⃣ CREATE INDEX: Fast lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_book_prefs_user 
ON user_book_preferences(user_id);

-- 3️⃣ CREATE INDEX: Fast lookups by journey_type
CREATE INDEX IF NOT EXISTS idx_user_book_prefs_journey 
ON user_book_preferences(journey_type);

-- 4️⃣ ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE user_book_preferences ENABLE ROW LEVEL SECURITY;

-- 5️⃣ CREATE RLS POLICIES

-- Policy: Users can view their own book preferences
CREATE POLICY "Users can view own book preferences" 
ON user_book_preferences 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy: Users can insert their own book preferences
CREATE POLICY "Users can insert own book preferences" 
ON user_book_preferences 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own book preferences
CREATE POLICY "Users can update own book preferences" 
ON user_book_preferences 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Policy: Users can delete their own book preferences
CREATE POLICY "Users can delete own book preferences" 
ON user_book_preferences 
FOR DELETE 
USING (auth.uid() = user_id);

-- 6️⃣ CREATE TRIGGER: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_book_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_book_preferences_updated_at
BEFORE UPDATE ON user_book_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_book_preferences_updated_at();

-- =====================================================
-- ✅ SETUP COMPLETE!
-- =====================================================
-- You can now use the Book of Life feature in MemoryBox
-- 
-- To verify the setup, run:
-- SELECT * FROM user_book_preferences;
-- =====================================================
