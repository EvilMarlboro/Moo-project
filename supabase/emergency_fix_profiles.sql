-- Emergency Fix: Remove trigger, add column, recreate trigger
-- Run this in your Supabase SQL Editor

-- =============================================
-- STEP 1: DROP THE PROBLEMATIC TRIGGER FIRST
-- =============================================

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;

RAISE NOTICE '✓ Dropped existing trigger';

-- =============================================
-- STEP 2: ADD MISSING COLUMNS
-- =============================================

-- Add updated_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE '✓ Added updated_at column';
  ELSE
    RAISE NOTICE 'ℹ updated_at column already exists';
  END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'created_at'
  ) THEN
    ALTER TABLE profiles ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE '✓ Added created_at column';
  ELSE
    RAISE NOTICE 'ℹ created_at column already exists';
  END IF;
END $$;

-- =============================================
-- STEP 3: CREATE OR REPLACE THE TRIGGER FUNCTION
-- =============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

RAISE NOTICE '✓ Created trigger function';

-- =============================================
-- STEP 4: RECREATE THE TRIGGER
-- =============================================

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

RAISE NOTICE '✓ Created trigger';

-- =============================================
-- STEP 5: UPDATE ALL EXISTING ROWS
-- =============================================

-- Set updated_at and created_at for existing rows if they're NULL
UPDATE profiles
SET
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW())
WHERE created_at IS NULL OR updated_at IS NULL;

RAISE NOTICE '✓ Updated existing rows';

-- =============================================
-- STEP 6: VERIFY THE FIX
-- =============================================

DO $$
DECLARE
  col_count INTEGER;
  trig_count INTEGER;
BEGIN
  -- Count columns
  SELECT COUNT(*) INTO col_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name IN ('updated_at', 'created_at');

  -- Count triggers
  SELECT COUNT(*) INTO trig_count
  FROM information_schema.triggers
  WHERE event_object_schema = 'public'
    AND event_object_table = 'profiles'
    AND trigger_name = 'update_profiles_updated_at';

  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION ===';
  RAISE NOTICE 'Timestamp columns (should be 2): %', col_count;
  RAISE NOTICE 'Triggers (should be 1): %', trig_count;

  IF col_count = 2 AND trig_count = 1 THEN
    RAISE NOTICE '✅ Fix completed successfully!';
  ELSE
    RAISE NOTICE '⚠️  Something may be wrong - check the counts above';
  END IF;
END $$;

-- =============================================
-- FIX COMPLETE!
-- =============================================
