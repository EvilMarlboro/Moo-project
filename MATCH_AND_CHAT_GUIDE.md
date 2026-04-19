# MOO Match & Chat System - Complete Guide

## Overview

This guide covers the complete match request and chat functionality implementation for the MOO app, including:

- ✅ Match request system with real-time updates
- ✅ Accept/Reject functionality for match requests
- ✅ Automatic chat room creation upon accepting matches
- ✅ Real-time chat with Supabase Realtime
- ✅ Sidebar panels for match requests and active chats
- ✅ Automatic match clearing on logout

## Database Setup

### Step 1: Run SQL Setup Script

1. Open your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file `/supabase/setup.sql` in your project
4. Copy the entire SQL script
5. Paste it into the Supabase SQL Editor
6. Click **Run** to execute

The script will create:
- `match_requests` table - Stores connection requests between users
- `chats` table - Stores chat rooms between matched users
- `messages` table - Stores individual chat messages
- Indexes for performance optimization
- Row Level Security (RLS) policies for data protection
- Realtime subscriptions for live updates

### What the Tables Look Like

#### match_requests
```sql
id              UUID (primary key)
sender_id       UUID (references auth.users)
receiver_id     UUID (references auth.users)
activity        TEXT
status          TEXT ('pending' | 'accepted' | 'declined')
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

#### chats
```sql
id              UUID (primary key)
user1_id        UUID (references auth.users)
user2_id        UUID (references auth.users)
activity        TEXT
created_at      TIMESTAMP
updated_at      TIMESTAMP
```

#### messages
```sql
id              UUID (primary key)
chat_id         UUID (references chats)
sender_id       UUID (references auth.users)
content         TEXT
created_at      TIMESTAMP
```

## How It Works

### 1. Sending a Match Request

When a user clicks **"Connect"** on another user's card:

```typescript
// 1. Check if request already exists
const { data: existing } = await supabase
  .from('match_requests')
  .select('id, status')
  .eq('sender_id', authUser.id)
  .eq('receiver_id', targetUser.id)
  .maybeSingle();

// 2. If no existing request, create one
if (!existing) {
  await supabase.from('match_requests').insert({
    sender_id: authUser.id,
    receiver_id: targetUser.id,
    activity: targetUser.activities[0],
    status: 'pending'
  });
}
```

**Features:**
- Duplicate request prevention
- Toast notifications for user feedback
- Button state changes to "Request Sent ✓"

### 2. Receiving Match Requests

The **Match Requests** sidebar panel shows pending requests:

```typescript
// Fetches every 5 seconds
const { data } = await supabase
  .from('match_requests')
  .select('*')
  .eq('receiver_id', authUser.id)
  .eq('status', 'pending')
  .order('created_at', { ascending: false });
```

**Display Features:**
- User avatar with activity-based color
- Username and gender symbol
- Primary activity shown
- Accept/Decline buttons
- Expandable details (all activities, status message)

### 3. Accepting a Match Request

When a user clicks **Accept**:

```typescript
// 1. Update request status
await supabase
  .from('match_requests')
  .update({ status: 'accepted' })
  .eq('id', requestId);

// 2. Check for existing chat
const { data: existingChat } = await supabase
  .from('chats')
  .select('id')
  .or(`and(user1_id.eq.${userId},user2_id.eq.${partnerId}),...`)
  .maybeSingle();

// 3. Create new chat if none exists
if (!existingChat) {
  const { data: newChat } = await supabase
    .from('chats')
    .insert({
      user1_id: userId,
      user2_id: partnerId,
      activity: activity
    })
    .select()
    .single();
}

// 4. Navigate to chat page
navigate(`/chat/${chatId}`);
```

### 4. Real-time Updates (Sender Side)

The sender is notified in real-time when their request is accepted:

```typescript
// Supabase Realtime subscription
supabase
  .channel('my-sent-requests')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'match_requests',
    filter: `sender_id=eq.${supabaseUserId}`
  }, async (payload) => {
    if (payload.new.status === 'accepted') {
      toast.success('Your request was accepted! Starting chat...');
      navigate(`/chat/${chatId}`);
    }
  })
  .subscribe();
```

### 5. Chat Interface

The `/chat/:chatId` page provides:

- **Header**: Partner's avatar, username, activity, USC verification badge
- **Safety Notice**: Reminders about meeting in public places
- **Messages Area**: Real-time message updates with sender avatars
- **Game ID Sharing**: For gaming activities, users can share their in-game IDs
- **Send Button**: Styled with category-specific colors

**Real-time Messages:**
```typescript
// Subscribe to new messages
supabase
  .channel(`messages:${chatId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `chat_id=eq.${chatId}`
  }, (payload) => {
    setMessages(prev => [...prev, payload.new]);
  })
  .subscribe();
```

### 6. Chats Sidebar

The **Chats** sidebar panel shows all active chats:

```typescript
// Fetches every 5 seconds + real-time updates
const { data } = await supabase
  .from('chats')
  .select('*')
  .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
  .order('updated_at', { ascending: false });
```

**Features:**
- Click to open chat
- Shows partner avatar and username
- Displays activity
- Color-coded by activity category
- USC verification badge

### 7. Logout - Match Reset

When a user logs out, their matches are automatically cleared:

```typescript
// In Layout.tsx
useEffect(() => {
  if (!user) {
    clearMatches(); // Clear all local matches
  }
}, [user]);
```

**What happens:**
- Local match state is cleared
- User is redirected to browse hub
- Match requests remain in database (not deleted)
- Chats remain accessible upon re-login

## User Flows

### Complete Match & Chat Flow

```
User A                          System                          User B
------                          ------                          ------
1. Clicks "Connect"     →   Creates match_request
                            (status: pending)
                                    ↓
                            Real-time notification    →   2. Sees request in sidebar
                                                          
                                                          3. Clicks "Accept"
                            
                            Updates request          ←
                            (status: accepted)
                                    ↓
                            Creates chat room
                                    ↓
4. Gets notification    ←   Real-time update
   "Request accepted!"
                                    ↓
5. Auto-navigates       →   Chat page loads          ←   6. Auto-navigates
   to chat                                                  to chat
                                    ↓
7. Sends message        →   Message stored           →   8. Receives message
                            Real-time sync           ←      in real-time
```

### Decline Flow

```
User A                          System                          User B
------                          ------                          ------
1. Clicks "Connect"     →   Creates match_request
                            (status: pending)
                                    ↓
                                                          2. Sees request
                                                          
                                                          3. Clicks "Decline"
                            
                            Updates request          ←
                            (status: declined)
                                    ↓
                            Request removed
                            from sidebar
                                    ↓
No notification         ←   (Silent decline)
```

## Security Features

### Row Level Security (RLS)

All tables have RLS policies that ensure:

1. **Match Requests**
   - Users can only see requests they sent or received
   - Users can only create requests as themselves
   - Users can only update requests sent to them
   - Users can only delete requests they sent

2. **Chats**
   - Users can only see chats they're part of
   - Users can only create chats for themselves
   - Users can delete their own chats

3. **Messages**
   - Users can only see messages in their chats
   - Users can only send messages as themselves
   - Users can only delete their own messages

### Data Validation

- Email verification required (@usc.edu)
- Status field constrained to valid values
- Foreign key constraints prevent orphaned records
- Indexes optimize query performance

## Testing the System

### Step-by-Step Test

1. **Login as User A**
   - Navigate to Activity Hub
   - See online users
   - Click "Connect" on User B's card
   - Verify toast: "Request sent! ✓"

2. **Login as User B** (different browser/incognito)
   - Navigate to Activity Hub
   - Check "Match Requests" sidebar
   - Verify User A's request appears
   - Click "Accept"
   - Verify navigation to chat page

3. **Verify User A** (back to first browser)
   - Should see toast: "Your request was accepted!"
   - Should auto-navigate to chat page
   - Verify both users in same chat

4. **Test Chat**
   - User A sends message
   - User B sees it in real-time
   - User B responds
   - User A sees response in real-time

5. **Check Chats Sidebar**
   - Both users should see chat in sidebar
   - Click to re-open chat
   - Previous messages should be preserved

6. **Test Logout**
   - User A logs out
   - Match state cleared
   - User A logs back in
   - Chat still accessible from sidebar

## Troubleshooting

### Match requests not showing up

**Issue**: Requests aren't appearing in the sidebar

**Solutions**:
1. Check Supabase tables - is the request actually created?
2. Verify RLS policies are set correctly
3. Check browser console for errors
4. Ensure user is authenticated
5. Verify `receiver_id` matches current user

### Chat not creating

**Issue**: Accept button works but chat doesn't open

**Solutions**:
1. Check Supabase `chats` table - is chat created?
2. Verify foreign key constraints (user IDs must exist in auth.users)
3. Check for duplicate chat prevention logic
4. Verify `chatId` is valid UUID

### Real-time updates not working

**Issue**: Messages/requests don't update live

**Solutions**:
1. Verify Realtime is enabled in Supabase project settings
2. Check that tables are added to `supabase_realtime` publication
3. Ensure WebSocket connection is active (check network tab)
4. Verify channel subscriptions are properly set up
5. Check for any console errors from Supabase client

### Messages not persisting

**Issue**: Messages disappear or don't save

**Solutions**:
1. Check RLS policies on `messages` table
2. Verify `sender_id` matches authenticated user
3. Ensure `chat_id` is valid
4. Check for network errors during insert

## Performance Optimization

### Current Polling Strategy

The app uses **5-second polling** for:
- Match requests
- Chats list

This balances real-time feel with API usage.

### Real-time Subscriptions

The app uses **Supabase Realtime** for:
- New messages in active chat
- Match request status updates
- New chat creation

### Future Optimizations

Consider implementing:
1. **Pagination** for chat history (currently loads all messages)
2. **Debouncing** for typing indicators
3. **Caching** partner profiles
4. **Virtual scrolling** for large message lists
5. **Websocket-only** updates (remove polling)

## Feature Extensions

### Suggested Enhancements

1. **Typing Indicators**
   ```typescript
   // Broadcast typing status
   channel.track({ typing: true });
   ```

2. **Read Receipts**
   ```sql
   ALTER TABLE messages ADD COLUMN read_at TIMESTAMP;
   ```

3. **Message Reactions**
   ```sql
   CREATE TABLE message_reactions (
     message_id UUID REFERENCES messages(id),
     user_id UUID REFERENCES auth.users(id),
     emoji TEXT
   );
   ```

4. **Block Users**
   ```sql
   CREATE TABLE blocked_users (
     user_id UUID REFERENCES auth.users(id),
     blocked_user_id UUID REFERENCES auth.users(id)
   );
   ```

5. **Report System**
   ```sql
   CREATE TABLE reports (
     reporter_id UUID REFERENCES auth.users(id),
     reported_user_id UUID REFERENCES auth.users(id),
     reason TEXT,
     created_at TIMESTAMP
   );
   ```

## API Reference

### Match Requests

#### Create Request
```typescript
const { data, error } = await supabase
  .from('match_requests')
  .insert({
    sender_id: string,
    receiver_id: string,
    activity: string,
    status: 'pending'
  });
```

#### Get Pending Requests
```typescript
const { data, error } = await supabase
  .from('match_requests')
  .select('*')
  .eq('receiver_id', userId)
  .eq('status', 'pending');
```

#### Update Request Status
```typescript
const { error } = await supabase
  .from('match_requests')
  .update({ status: 'accepted' | 'declined' })
  .eq('id', requestId);
```

### Chats

#### Create Chat
```typescript
const { data, error } = await supabase
  .from('chats')
  .insert({
    user1_id: string,
    user2_id: string,
    activity: string
  })
  .select()
  .single();
```

#### Get User's Chats
```typescript
const { data, error } = await supabase
  .from('chats')
  .select('*')
  .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
  .order('updated_at', { ascending: false });
```

### Messages

#### Send Message
```typescript
const { error } = await supabase
  .from('messages')
  .insert({
    chat_id: string,
    sender_id: string,
    content: string
  });
```

#### Get Chat Messages
```typescript
const { data, error } = await supabase
  .from('messages')
  .select('*')
  .eq('chat_id', chatId)
  .order('created_at', { ascending: true });
```

## Summary

The MOO match and chat system provides a complete, real-time communication solution with:

✅ **Persistent Storage** - All data stored in Supabase PostgreSQL
✅ **Real-time Updates** - Instant notifications via Supabase Realtime  
✅ **Security** - Row Level Security protecting user data
✅ **Performance** - Indexed queries and optimized polling
✅ **User Experience** - Smooth flows with toast notifications
✅ **Scalability** - Ready for production use

Run the SQL setup script, and you're ready to match and chat! 🎉
