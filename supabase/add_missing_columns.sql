-- Migration: Add missing columns to profiles table
-- Run this in your Supabase SQL Editor

-- =============================================
-- ADD MISSING COLUMNS TO PROFILES TABLE
-- =============================================

-- Add enabled_activities column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'enabled_activities'
  ) THEN
    ALTER TABLE profiles ADD COLUMN enabled_activities TEXT[] DEFAULT '{}';
  END IF;
END $$;

-- Add activity_profiles column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'activity_profiles'
  ) THEN
    ALTER TABLE profiles ADD COLUMN activity_profiles JSONB DEFAULT '{}';
  END IF;
END $$;

-- Add status_message column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status_message'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status_message TEXT;
  END IF;
END $$;

-- Add vibing_mode column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'vibing_mode'
  ) THEN
    ALTER TABLE profiles ADD COLUMN vibing_mode BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- =============================================
-- CREATE TRIGGER FOR UPDATED_AT
-- =============================================

-- Create the trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

-- Create trigger for profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- RELOAD SCHEMA CACHE
-- =============================================

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- =============================================
-- MIGRATION COMPLETE!
-- =============================================