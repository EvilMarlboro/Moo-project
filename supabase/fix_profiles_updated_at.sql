-- Fix: Add updated_at column to profiles table and ensure trigger works
-- Run this in your Supabase SQL Editor

-- =============================================
-- 1. ADD UPDATED_AT COLUMN IF MISSING
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to profiles table';
  ELSE
    RAISE NOTICE 'updated_at column already exists';
  END IF;
END $$;

-- =============================================
-- 2. ENSURE CREATED_AT COLUMN EXISTS TOO
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added created_at column to profiles table';
  ELSE
    RAISE NOTICE 'created_at column already exists';
  END IF;
END $$;

-- =============================================
-- 3. CREATE OR REPLACE TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 4. DROP AND RECREATE TRIGGER
-- =============================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 5. VERIFY SETUP
-- =============================================

-- Check if column exists
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'updated_at'
    ) THEN 'updated_at column: ✓ EXISTS'
    ELSE 'updated_at column: ✗ MISSING'
  END as updated_at_status,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      AND event_object_table = 'profiles'
      AND trigger_name = 'update_profiles_updated_at'
    ) THEN 'Trigger: ✓ EXISTS'
    ELSE 'Trigger: ✗ MISSING'
  END as trigger_status;

-- =============================================
-- FIX COMPLETE!
-- =============================================
