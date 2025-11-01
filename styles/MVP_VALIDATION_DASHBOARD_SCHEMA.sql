-- MemoryBox MVP Validation Dashboard Schema
-- Run this in Supabase SQL Editor to create tracking tables

-- 1. USER ACTIVITY TRACKING TABLE
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  email TEXT,
  batch_no INTEGER DEFAULT 1,
  
  -- Activity Metrics
  memories_count INTEGER DEFAULT 0,
  family_members_count INTEGER DEFAULT 0,
  journal_entries_count INTEGER DEFAULT 0,
  time_capsules_count INTEGER DEFAULT 0,
  
  -- Storage Metrics
  total_storage_mb FLOAT DEFAULT 0,
  
  -- Engagement Metrics
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  first_login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  login_count INTEGER DEFAULT 1,
  days_since_signup INTEGER DEFAULT 0,
  is_activated BOOLEAN DEFAULT FALSE, -- Has uploaded at least 1 memory
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own activity
CREATE POLICY "Users can read own activity"
  ON user_activity
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Policy: Users can update their own activity
CREATE POLICY "Users can update own activity"
  ON user_activity
  FOR UPDATE
  USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own activity
CREATE POLICY "Users can insert own activity"
  ON user_activity
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_batch ON user_activity(batch_no);
CREATE INDEX idx_user_activity_activated ON user_activity(is_activated);

-- 2. ENHANCED FEEDBACK TABLE
DROP TABLE IF EXISTS feedback CASCADE;

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  
  -- Emotional Questions
  would_recommend BOOLEAN, -- Yes/No
  liked_most TEXT, -- Open-ended
  frustrating TEXT, -- Open-ended
  improvements TEXT, -- Open-ended
  feel_connected INTEGER CHECK (feel_connected >= 1 AND feel_connected <= 5), -- 1-5 rating
  invite_family TEXT, -- 'yes' | 'maybe' | 'no'
  moment_to_preserve TEXT, -- Open-ended
  
  -- Context
  user_name TEXT,
  user_email TEXT,
  page_url TEXT,
  user_agent TEXT,
  batch_no INTEGER DEFAULT 1,
  
  -- Timestamps
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own feedback
CREATE POLICY "Users can read own feedback"
  ON feedback
  FOR SELECT
  USING (auth.uid()::text = user_id);

-- Policy: Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON feedback
  FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Create indexes
CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_batch ON feedback(batch_no);
CREATE INDEX idx_feedback_recommend ON feedback(would_recommend);

-- 3. FUNCTION: Update user activity automatically
CREATE OR REPLACE FUNCTION update_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user_activity table
  INSERT INTO user_activity (user_id, email, updated_at)
  VALUES (NEW.user_id, NEW.user_email, NOW())
  ON CONFLICT (user_id) DO UPDATE
  SET 
    updated_at = NOW(),
    last_active_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCTION: Increment memories count
CREATE OR REPLACE FUNCTION increment_memories_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_activity
  SET 
    memories_count = memories_count + 1,
    is_activated = TRUE,
    last_active_at = NOW(),
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCTION: Increment family members count
CREATE OR REPLACE FUNCTION increment_family_members_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_activity
  SET 
    family_members_count = family_members_count + 1,
    last_active_at = NOW(),
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNCTION: Increment journal entries count
CREATE OR REPLACE FUNCTION increment_journal_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_activity
  SET 
    journal_entries_count = journal_entries_count + 1,
    last_active_at = NOW(),
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNCTION: Increment time capsules count
CREATE OR REPLACE FUNCTION increment_time_capsules_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE user_activity
  SET 
    time_capsules_count = time_capsules_count + 1,
    last_active_at = NOW(),
    updated_at = NOW()
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. CREATE TRIGGERS
-- Note: You'll need to adjust table names based on your actual schema

-- Trigger for memories (adjust table name as needed)
-- DROP TRIGGER IF EXISTS trigger_increment_memories ON memories;
-- CREATE TRIGGER trigger_increment_memories
--   AFTER INSERT ON memories
--   FOR EACH ROW
--   EXECUTE FUNCTION increment_memories_count();

-- Trigger for family members (adjust table name as needed)
-- DROP TRIGGER IF EXISTS trigger_increment_family_members ON family_members;
-- CREATE TRIGGER trigger_increment_family_members
--   AFTER INSERT ON family_members
--   FOR EACH ROW
--   EXECUTE FUNCTION increment_family_members_count();

-- Trigger for journal entries (adjust table name as needed)
-- DROP TRIGGER IF EXISTS trigger_increment_journal ON journal_entries;
-- CREATE TRIGGER trigger_increment_journal
--   AFTER INSERT ON journal_entries
--   FOR EACH ROW
--   EXECUTE FUNCTION increment_journal_count();

-- Trigger for time capsules (adjust table name as needed)
-- DROP TRIGGER IF EXISTS trigger_increment_time_capsules ON time_capsules;
-- CREATE TRIGGER trigger_increment_time_capsules
--   AFTER INSERT ON time_capsules
--   FOR EACH ROW
--   EXECUTE FUNCTION increment_time_capsules_count();

-- 9. ADMIN HELPER FUNCTIONS

-- Get all user activity metrics
CREATE OR REPLACE FUNCTION get_all_user_metrics()
RETURNS TABLE (
  user_id TEXT,
  email TEXT,
  batch_no INTEGER,
  memories_count INTEGER,
  family_members_count INTEGER,
  journal_entries_count INTEGER,
  time_capsules_count INTEGER,
  is_activated BOOLEAN,
  days_since_signup INTEGER,
  last_active_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ua.user_id,
    ua.email,
    ua.batch_no,
    ua.memories_count,
    ua.family_members_count,
    ua.journal_entries_count,
    ua.time_capsules_count,
    ua.is_activated,
    EXTRACT(DAY FROM (NOW() - ua.created_at))::INTEGER as days_since_signup,
    ua.last_active_at
  FROM user_activity ua
  ORDER BY ua.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get aggregated metrics
CREATE OR REPLACE FUNCTION get_aggregated_metrics()
RETURNS TABLE (
  total_users BIGINT,
  activated_users BIGINT,
  activation_rate NUMERIC,
  avg_memories_per_user NUMERIC,
  total_memories BIGINT,
  recommend_yes BIGINT,
  total_feedback BIGINT,
  recommend_percentage NUMERIC,
  avg_emotional_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT ua.user_id)::BIGINT as total_users,
    COUNT(DISTINCT CASE WHEN ua.is_activated THEN ua.user_id END)::BIGINT as activated_users,
    ROUND(
      (COUNT(DISTINCT CASE WHEN ua.is_activated THEN ua.user_id END)::NUMERIC / 
       NULLIF(COUNT(DISTINCT ua.user_id)::NUMERIC, 0)) * 100, 
      2
    ) as activation_rate,
    ROUND(
      AVG(ua.memories_count)::NUMERIC,
      2
    ) as avg_memories_per_user,
    SUM(ua.memories_count)::BIGINT as total_memories,
    COUNT(CASE WHEN f.would_recommend = TRUE THEN 1 END)::BIGINT as recommend_yes,
    COUNT(f.id)::BIGINT as total_feedback,
    ROUND(
      (COUNT(CASE WHEN f.would_recommend = TRUE THEN 1 END)::NUMERIC / 
       NULLIF(COUNT(f.id)::NUMERIC, 0)) * 100,
      2
    ) as recommend_percentage,
    ROUND(
      AVG(f.feel_connected)::NUMERIC,
      2
    ) as avg_emotional_score
  FROM user_activity ua
  LEFT JOIN feedback f ON ua.user_id = f.user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ✅ SCHEMA CREATION COMPLETE
-- Next: Run this SQL in Supabase, then update your app code
