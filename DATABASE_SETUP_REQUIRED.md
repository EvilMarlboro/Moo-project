# 🔧 Database Setup Required

## Error: `record "new" has no field "updated_at"`

This error means your Supabase database is missing a trigger function. Follow these steps to fix it:

---

## ✅ Quick Fix (2 minutes)

### Step 1: Open Supabase SQL Editor
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **"SQL Editor"** in the left sidebar
4. Click **"New Query"**

### Step 2: Run This SQL

Copy and paste this into the SQL Editor:

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

### Step 3: Execute
- Click **"Run"** (or press `Cmd/Ctrl + Enter`)
- You should see: ✅ **"Success. No rows returned"**

### Step 4: Test Your App
- Refresh your MOO app
- Try creating your profile again
- It should now work! 🎉

---

## 📋 Alternative: Run Complete Migration

If you haven't set up your database tables yet, run the complete migration instead:

1. Open `/supabase/profiles_migration.sql` in this project
2. Copy the entire file contents
3. Paste into Supabase SQL Editor
4. Run it

This will create all tables, policies, and triggers needed for MOO.

---

## 🆘 Still Having Issues?

Check the browser console for specific error messages and verify:
- ✅ The `profiles` table exists in Supabase
- ✅ Row Level Security (RLS) policies are enabled
- ✅ You're signed in with a @usc.edu email

---

**Once you run the SQL, you're all set!** 🚀
