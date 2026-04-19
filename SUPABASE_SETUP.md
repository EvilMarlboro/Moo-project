# Supabase Database Setup

## Quick Fix for Profile Errors

The error `record "new" has no field "updated_at"` means the trigger function is missing from your Supabase database.

### Steps to Fix:

1. **Open your Supabase Dashboard**
2. **Go to SQL Editor** (left sidebar)
3. **Click "New Query"**
4. **Copy and paste this SQL:**

```sql
-- Create the trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to profiles table
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

5. **Click "Run"** (or press Cmd/Ctrl + Enter)
6. **Verify** you see "Success. No rows returned"

### If You Haven't Set Up the Database Yet:

Run the complete migration from `/supabase/profiles_migration.sql` in your SQL Editor instead.

---

**After running this SQL, refresh your app and try setting up your profile again!**
