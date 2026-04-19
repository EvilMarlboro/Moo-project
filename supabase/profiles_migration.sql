-- Migration: Add profiles table and RLS policies
-- Run this in your Supabase SQL Editor

-- =============================================
-- 1. CREATE PROFILES TABLE
-- =============================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '👤',
  gender TEXT,
  enabled_activities TEXT[] DEFAULT '{}',
  activity_profiles JSONB DEFAULT '{}',
  status_message TEXT,
  vibing_mode BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_profiles_display_name ON profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_profiles_created ON profiles(created_at DESC);

-- =============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. DROP EXISTING POLICIES (if any)
-- =============================================

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can delete their own profile" ON profiles;

-- =============================================
-- 5. CREATE RLS POLICIES - PROFILES
-- =============================================

-- Users can view ALL profiles (needed for chat partner info)
CREATE POLICY "Users can view all profiles"
  ON profiles
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete their own profile"
  ON profiles
  FOR DELETE
  USING (auth.uid() = id);

-- =============================================
-- 6. CREATE TRIGGER FOR UPDATED_AT
-- =============================================

-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 7. ADD sender_email TO match_requests (if not exists)
-- =============================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'match_requests' AND column_name = 'sender_email'
  ) THEN
    ALTER TABLE match_requests ADD COLUMN sender_email TEXT;
  END IF;
END $$;

-- =============================================
-- MIGRATION COMPLETE!
-- =============================================