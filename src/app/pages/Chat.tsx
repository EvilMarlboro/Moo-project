import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Navbar } from '../components/Navbar';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { Send, ArrowLeft, Flag, AlertCircle, Shield, Gamepad2, UserX, MoreVertical } from 'lucide-react';
import { CATEGORY_COLORS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { getCategoryForActivity } from '../data/activityHelpers';
import { GAME_ID_SYSTEMS } from '../data/gameRanks';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface ChatData {
  id: string;
  user1_id: string;
  user2_id: string;
  activity: string;
  created_at: string;
}

interface PartnerProfile {
  username: string;
  avatar: string;
  genderSymbol?: string;
  enabledActivities?: string[];
  activityProfiles?: Record<string, any>;
}

export function Chat() {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { user, supabaseUserId } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [chat, setChat] = useState<ChatData | null>(null);
  const [partner, setPartner] = useState<PartnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUnmatchDialog, setShowUnmatchDialog] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    if (!chatId) return;
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (msgs) setMessages(msgs);
  };

  // Load chat and partner profile
  useEffect(() => {
    if (!chatId || !supabaseUserId) return;

    const loadChat = async () => {
      // Fetch chat
      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();

      if (chatError || !chatData) {
        console.log('Error loading chat:', chatError);
        setLoading(false);
        return;
      }

      setChat(chatData);

      // Determine partner
      const partnerId = chatData.user1_id === supabaseUserId
        ? chatData.user2_id
        : chatData.user1_id;

      // Get partner profile from profiles table
      let partnerName = 'USC Student';
      let partnerAvatar = '👤';
      let partnerGender = undefined;
      let partnerActivities = undefined;
      let partnerActivityProfiles = undefined;

      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('display_name, avatar, gender, enabled_activities, activity_profiles')
          .eq('id', partnerId)
          .single();

        if (profile && !profileError && profile.display_name) {
          partnerName = profile.display_name;
          partnerAvatar = profile.avatar || '👤';
          partnerGender = profile.gender;
          partnerActivities = profile.enabled_activities;
          partnerActivityProfiles = profile.activity_profiles;
        }
      } catch (err) {
        console.error('Error fetching partner profile:', err);
      }

      setPartner({
        username: partnerName,
        avatar: partnerAvatar,
        genderSymbol: partnerGender,
        enabledActivities: partnerActivities,
        activityProfiles: partnerActivityProfiles,
      });

      // Fetch messages
      await fetchMessages();
      setLoading(false);
    };

    loadChat();
  }, [chatId, supabaseUserId]);

  // Subscribe to realtime messages
  useEffect(() => {
    if (!chatId) return;

    fetchMessages();

    const channel = supabase
      .channel('chat-messages-' + chatId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  // Subscribe to chat deletions (for unmatch detection)
  useEffect(() => {
    if (!chatId) return;

    const channel = supabase
      .channel('chat-deletion-' + chatId)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'chats',
        filter: `id=eq.${chatId}`,
      }, () => {
        // Chat was deleted (unmatched by other user)
        toast.error('You have been unmatched');
        navigate('/activity-hub');
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, navigate]);

  const handleSend = async () => {
    if (!inputText.trim() || !chatId || !supabaseUserId) return;

    const content = inputText.trim();
    setInputText('');

    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: supabaseUserId,
      content,
    });

    if (error) {
      console.log('Error sending message:', error);
      setInputText(content); // Restore on error
    }
  };

  const handleShareGameId = async (game: string, gameId: string, idLabel: string) => {
    const content = `My ${idLabel}: ${gameId}`;
    await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: supabaseUserId,
      content,
    });
  };

  const handleUnmatch = async () => {
    if (!chatId || !supabaseUserId || !chat) return;

    try {
      // Get partner ID
      const partnerId = chat.user1_id === supabaseUserId ? chat.user2_id : chat.user1_id;

      // Delete the chat (cascades to messages with ON DELETE CASCADE)
      const { error: chatError } = await supabase
        .from('chats')
        .delete()
        .eq('id', chatId);

      if (chatError) throw chatError;

      // Update match_request status to 'unmatched'
      await supabase
        .from('match_requests')
        .update({ status: 'unmatched' })
        .or(`and(sender_id.eq.${supabaseUserId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${supabaseUserId})`);

      toast.success('Unmatched successfully');
      navigate('/activity-hub');
    } catch (error) {
      console.error('Error unmatching:', error);
      toast.error('Failed to unmatch. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading chat...</p>
        </div>
      </div>
    );
  }

  if (!chat || !partner || !user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-12 text-center">
          <h2 className="mb-4">Chat not found</h2>
          <Button onClick={() => navigate('/activity-hub')}>Back to Activity Hub</Button>
        </div>
      </div>
    );
  }

  const activity = chat.activity || '';
  const category = getCategoryForActivity(activity) || 'sports';
  const categoryColor = CATEGORY_COLORS[category] || '#6B7280';

  // Find shared gaming activities for game ID sharing
  const sharedGamingActivities = (partner.enabledActivities || []).filter((a) => {
    const cat = getCategoryForActivity(a);
    return cat === 'gaming' && user.enabledActivities?.includes(a);
  });

  const userGameIds = sharedGamingActivities
    .map((game) => ({
      game,
      gameId: user.activityProfiles?.[game]?.inGameId || null,
      idSystem: GAME_ID_SYSTEMS[game],
    }))
    .filter((item) => item.gameId && item.idSystem);

  const hasSharedGaming = sharedGamingActivities.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/activity-hub')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Chat Header */}
        <Card className="p-4 mb-4 border-2" style={{ borderColor: categoryColor }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="w-14 h-14 border-2" style={{ borderColor: categoryColor }}>
                  <AvatarFallback className="text-2xl" style={{ backgroundColor: categoryColor + '20' }}>
                    {partner.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3>{partner.username}</h3>
                  {partner.genderSymbol && (
                    <span className="text-lg" style={{ color: categoryColor }}>
                      {partner.genderSymbol}
                    </span>
                  )}
                  <Shield className="h-4 w-4 text-[#990000]" />
                </div>
                <p className="font-medium text-sm" style={{ color: categoryColor }}>
                  {activity}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                <Flag className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setShowUnmatchDialog(true)}
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <UserX className="h-4 w-4 mr-2" />
                    Unmatch
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Card>

        {/* Safety Notice */}
        <Card className="p-4 mb-4 bg-secondary/30 border-border">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">Safety Reminder</p>
              <p className="text-muted-foreground">
                Meet in public campus locations. Share your plans with a friend. Trust your instincts.
              </p>
            </div>
          </div>
        </Card>

        {/* Messages */}
        <Card className="p-4 mb-4 min-h-[400px] max-h-[500px] overflow-y-auto bg-card">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => {
                const isOwnMessage = message.sender_id === supabaseUserId;
                const senderAvatar = isOwnMessage ? user.avatar : partner.avatar;
                const senderName = isOwnMessage ? user.username : partner.username;

                return (
                  <div key={message.id} className={`flex gap-3 ${isOwnMessage ? 'flex-row-reverse' : ''}`}>
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-lg flex-shrink-0">
                      {senderAvatar}
                    </div>
                    <div className={`flex-1 ${isOwnMessage ? 'text-right' : ''}`}>
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={`text-sm font-medium ${isOwnMessage ? 'order-2' : ''}`}>
                          {senderName}
                        </span>
                        <span className={`text-xs text-muted-foreground ${isOwnMessage ? 'order-1' : ''}`}>
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div
                        className={`inline-block p-3 rounded-lg ${
                          isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                        }`}
                      >
                        {message.content}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </Card>

        {/* Message Input */}
        <div className="flex gap-2">
          {hasSharedGaming && userGameIds.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="flex-shrink-0" title="Share Game ID">
                  <Gamepad2 className="h-4 w-4" style={{ color: CATEGORY_COLORS.gaming }} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                <DropdownMenuLabel>Share Game ID</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {userGameIds.map(({ game, gameId, idSystem }) => (
                  <DropdownMenuItem
                    key={game}
                    onClick={() => handleShareGameId(game, gameId!, idSystem!.label)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col gap-1 w-full">
                      <span className="font-medium text-sm">{game}</span>
                      <span className="text-xs text-muted-foreground">
                        {idSystem!.label}: {gameId}
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Input
            type="text"
            placeholder="Type your message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!inputText.trim()} style={{ backgroundColor: categoryColor }}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Unmatch Confirmation Dialog */}
      <AlertDialog open={showUnmatchDialog} onOpenChange={setShowUnmatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unmatch with {partner.username}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete all messages and end your connection with this user. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUnmatch}
              className="bg-destructive hover:bg-destructive/90"
            >
              Unmatch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}