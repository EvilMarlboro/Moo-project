-- MOO App Database Setup
-- Run these SQL statements in the Supabase SQL Editor

-- =============================================
-- 1. CREATE TABLES
-- =============================================

-- Match Requests Table
CREATE TABLE IF NOT EXISTS match_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chats Table
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_match_requests_receiver ON match_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_match_requests_sender ON match_requests(sender_id, status);
CREATE INDEX IF NOT EXISTS idx_match_requests_created ON match_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chats_user1 ON chats(user1_id);
CREATE INDEX IF NOT EXISTS idx_chats_user2 ON chats(user2_id);
CREATE INDEX IF NOT EXISTS idx_chats_created ON chats(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_chat ON messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- =============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. DROP EXISTING POLICIES (if any)
-- =============================================

DROP POLICY IF EXISTS "Users can view match requests sent to them" ON match_requests;
DROP POLICY IF EXISTS "Users can view match requests they sent" ON match_requests;
DROP POLICY IF EXISTS "Users can create match requests" ON match_requests;
DROP POLICY IF EXISTS "Users can update their received match requests" ON match_requests;
DROP POLICY IF EXISTS "Users can delete their sent match requests" ON match_requests;

DROP POLICY IF EXISTS "Users can view their own chats" ON chats;
DROP POLICY IF EXISTS "Users can create chats" ON chats;
DROP POLICY IF EXISTS "Users can delete their own chats" ON chats;

DROP POLICY IF EXISTS "Users can view messages in their chats" ON messages;
DROP POLICY IF EXISTS "Users can create messages in their chats" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

-- =============================================
-- 5. CREATE RLS POLICIES - MATCH REQUESTS
-- =============================================

-- Users can view match requests sent to them
CREATE POLICY "Users can view match requests sent to them"
  ON match_requests
  FOR SELECT
  USING (auth.uid() = receiver_id);

-- Users can view match requests they sent
CREATE POLICY "Users can view match requests they sent"
  ON match_requests
  FOR SELECT
  USING (auth.uid() = sender_id);

-- Users can create match requests
CREATE POLICY "Users can create match requests"
  ON match_requests
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

-- Users can update their received match requests (accept/decline)
CREATE POLICY "Users can update their received match requests"
  ON match_requests
  FOR UPDATE
  USING (auth.uid() = receiver_id);

-- Users can delete their sent match requests
CREATE POLICY "Users can delete their sent match requests"
  ON match_requests
  FOR DELETE
  USING (auth.uid() = sender_id);

-- =============================================
-- 6. CREATE RLS POLICIES - CHATS
-- =============================================

-- Users can view chats they're part of
CREATE POLICY "Users can view their own chats"
  ON chats
  FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can create chats
CREATE POLICY "Users can create chats"
  ON chats
  FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can delete chats they're part of
CREATE POLICY "Users can delete their own chats"
  ON chats
  FOR DELETE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- =============================================
-- 7. CREATE RLS POLICIES - MESSAGES
-- =============================================

-- Users can view messages in chats they're part of
CREATE POLICY "Users can view messages in their chats"
  ON messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

-- Users can create messages in their chats
CREATE POLICY "Users can create messages in their chats"
  ON messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

-- Users can delete their own messages
CREATE POLICY "Users can delete their own messages"
  ON messages
  FOR DELETE
  USING (auth.uid() = sender_id);

-- =============================================
-- 8. CREATE TRIGGERS FOR UPDATED_AT
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for match_requests
DROP TRIGGER IF EXISTS update_match_requests_updated_at ON match_requests;
CREATE TRIGGER update_match_requests_updated_at
  BEFORE UPDATE ON match_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for chats
DROP TRIGGER IF EXISTS update_chats_updated_at ON chats;
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- 9. ENABLE REALTIME
-- =============================================

-- Enable realtime for match_requests (for live updates)
ALTER PUBLICATION supabase_realtime ADD TABLE match_requests;

-- Enable realtime for messages (for live chat)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime for chats (for new chat notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE chats;

-- =============================================
-- SETUP COMPLETE!
-- =============================================
-- Next steps:
-- 1. Copy and run this entire SQL script in your Supabase SQL Editor
-- 2. Verify tables were created successfully
-- 3. Test the application to ensure everything works
