-- Diagnostic: Check profiles table structure
-- Run this in your Supabase SQL Editor first

-- =============================================
-- 1. CHECK WHAT COLUMNS EXIST IN PROFILES TABLE
-- =============================================

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- =============================================
-- 2. CHECK WHAT TRIGGERS EXIST ON PROFILES TABLE
-- =============================================

SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
  AND event_object_table = 'profiles';

-- =============================================
-- 3. CHECK IF THE TRIGGER FUNCTION EXISTS
-- =============================================

SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'update_updated_at_column';
