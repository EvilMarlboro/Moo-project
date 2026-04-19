import { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { LoginPrompt } from '../components/LoginPrompt';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Users, Volume2, Heart, MessageCircle, X, Check } from 'lucide-react';
import { Shield, MoreVertical } from 'lucide-react';
import { CATEGORY_COLORS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { getCategoryForActivity, getRequiredFieldsForActivity } from '../data/activityHelpers';
import { useMatches } from '../context/MatchContext';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { supabase } from '../lib/supabase';
import { publicAnonKey } from '/utils/supabase/info';
import { toast } from 'sonner';

interface OnlineUser {
  user_id: string;
  email: string;
  username: string;
  avatar: string;
  genderSymbol?: string;
  activities: string[];
  statusMessage?: string;
  vibingMode?: boolean;
  categories: string[];
  online_at: string;
}

interface ChatItem {
  id: string;
  partner_id: string;
  partner_username: string;
  partner_avatar: string;
  activity: string;
  updated_at: string;
}

function formatFieldName(field: string): string {
  return field.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

export function ActivityHub() {
  const { user, supabaseUserId, updateUser } = useAuth();
  const navigate = useNavigate();
  const { matches, addMatch } = useMatches();

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) navigate('/');
  }, [user, navigate]);

  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [matchRequests, setMatchRequests] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [acceptedConnections, setAcceptedConnections] = useState<Set<string>>(new Set());
  const [chats, setChats] = useState<ChatItem[]>([]);

  // Modal state
  const [selectedUser, setSelectedUser] = useState<OnlineUser | null>(null);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchAcceptedConnections = async () => {
    if (!supabaseUserId) return;
    const { data } = await supabase
      .from('match_requests')
      .select('sender_id, receiver_id')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${supabaseUserId},receiver_id.eq.${supabaseUserId}`);
    if (data) {
      setAcceptedConnections(new Set(
        data.map(r => r.sender_id === supabaseUserId ? r.receiver_id : r.sender_id)
      ));
    }
  };

  const fetchMatchRequests = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data, error } = await supabase
      .from('match_requests')
      .select('*')
      .eq('receiver_id', authUser.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error fetching match requests:', error);
      return;
    }

    if (!data || data.length === 0) {
      setMatchRequests([]);
      return;
    }

    const enriched = await Promise.all(
      data.map(async (req: any) => {
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('display_name, avatar, gender')
            .eq('id', req.sender_id)
            .single();

          const category = getCategoryForActivity(req.activity || '') || 'sports';
          if (profile && !profileError) {
            return {
              ...req,
              username: profile.display_name || 'User',
              avatar: profile.avatar || '👤',
              genderSymbol: profile.gender || '',
              activities: [req.activity].filter(Boolean),
              statusMessage: '',
              category,
            };
          }
          return {
            ...req,
            username: 'User',
            avatar: '👤',
            genderSymbol: '',
            activities: [req.activity].filter(Boolean),
            statusMessage: '',
            category,
          };
        } catch {
          return {
            ...req,
            username: 'User',
            avatar: '👤',
            genderSymbol: '',
            activities: [req.activity].filter(Boolean),
            statusMessage: '',
            category: getCategoryForActivity(req.activity || '') || 'sports',
          };
        }
      })
    );

    setMatchRequests(enriched);
  };

  useEffect(() => {
    if (!supabaseUserId) return;

    fetchMatchRequests();
    fetchAcceptedConnections();

    const channel = supabase
      .channel('match-requests-' + supabaseUserId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'match_requests', filter: `receiver_id=eq.${supabaseUserId}` },
        () => fetchMatchRequests())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'match_requests', filter: `receiver_id=eq.${supabaseUserId}` },
        () => fetchMatchRequests())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'match_requests', filter: `receiver_id=eq.${supabaseUserId}` },
        () => fetchMatchRequests())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'match_requests', filter: `sender_id=eq.${supabaseUserId}` },
        async (payload: any) => {
          if (payload.new.status === 'accepted') {
            fetchAcceptedConnections();
            const { data: chat } = await supabase
              .from('chats')
              .select('id')
              .or(`and(user1_id.eq.${supabaseUserId},user2_id.eq.${payload.new.receiver_id}),and(user1_id.eq.${payload.new.receiver_id},user2_id.eq.${supabaseUserId})`)
              .maybeSingle();
            if (chat) {
              toast.success('Your request was accepted! Starting chat...');
              navigate('/chat/' + chat.id);
            }
          }
        })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabaseUserId, navigate]);

  const fetchChats = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .or(`user1_id.eq.${authUser.id},user2_id.eq.${authUser.id}`)
      .order('created_at', { ascending: false });

    if (error) { console.log('Error fetching chats:', error); return; }
    if (!data || data.length === 0) { setChats([]); return; }

    const enriched = await Promise.all(
      data.map(async (chat: any) => {
        const partnerId = chat.user1_id === authUser.id ? chat.user2_id : chat.user1_id;
        let partnerName = 'USC Student';
        let partnerAvatar = '👤';
        try {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('display_name, avatar')
            .eq('id', partnerId)
            .single();
          if (profile && !profileError) {
            partnerName = profile.display_name || 'USC Student';
            partnerAvatar = profile.avatar || '👤';
          }
        } catch (err) {
          console.log('Error fetching partner profile:', err);
        }
        return {
          id: chat.id,
          partner_id: partnerId,
          partner_username: partnerName,
          partner_avatar: partnerAvatar,
          activity: chat.activity || '',
          updated_at: chat.updated_at || chat.created_at,
        };
      })
    );

    setChats(enriched);
    enriched.forEach(chat => addMatch(chat.partner_id, chat.activity));
  };

  useEffect(() => { fetchChats(); }, [supabaseUserId]);

  const fetchSentRequests = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;
    const { data, error } = await supabase
      .from('match_requests')
      .select('receiver_id')
      .eq('sender_id', authUser.id)
      .eq('status', 'pending');
    if (error) { console.log('Error fetching sent requests:', error); return; }
    setSentRequests(data && data.length > 0
      ? new Set(data.map((req: any) => req.receiver_id))
      : new Set());
  };

  useEffect(() => {
    if (!supabaseUserId) return;
    fetchSentRequests();
    const channel = supabase
      .channel('sent-requests-' + supabaseUserId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_requests', filter: `sender_id=eq.${supabaseUserId}` },
        () => fetchSentRequests())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabaseUserId]);

  useEffect(() => {
    if (!supabaseUserId) return;
    const channel = supabase
      .channel('chats-panel')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chats' }, () => fetchChats())
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chats' },
        (payload) => {
          setChats(prev => prev.filter(c => c.id !== payload.old.id));
          toast.info('A chat has been removed');
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [supabaseUserId]);

  // Subscribe to Supabase Realtime Presence
  useEffect(() => {
    if (!user || !supabaseUserId) return;
    const channel = supabase.channel('online-users');
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as unknown as OnlineUser[];
        setOnlineUsers(users);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, supabaseUserId]);

  // Track presence when user data changes
  useEffect(() => {
    if (!user || !supabaseUserId) return;
    const channel = supabase.channel('online-users');
    const trackPresence = async () => {
      const categories = Array.from(
        new Set(
          (user.enabledActivities || [])
            .map((a) => getCategoryForActivity(a))
            .filter(Boolean)
        )
      );
      await channel.track({
        user_id: supabaseUserId,
        email: user.email,
        username: user.username,
        avatar: user.avatar || '👤',
        genderSymbol: user.genderSymbol || '',
        activities: user.enabledActivities || [],
        statusMessage: user.statusMessage || '',
        vibingMode: user.vibingMode || false,
        categories,
        online_at: new Date().toISOString(),
      });
    };
    trackPresence();
    return () => { channel.untrack(); };
  }, [user, supabaseUserId]);

  const allOtherUsers = onlineUsers.filter(u => u.user_id !== supabaseUserId);

  const openUserModal = async (presenceUser: OnlineUser) => {
    setSelectedUser(presenceUser);
    setSelectedUserProfile(null);
    setProfileLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('activity_profiles')
      .eq('id', presenceUser.user_id)
      .single();
    setSelectedUserProfile(data?.activity_profiles || {});
    setProfileLoading(false);
  };

  const handleConnect = async (presenceUser: OnlineUser) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data: existing } = await supabase
      .from('match_requests')
      .select('id, status')
      .eq('sender_id', authUser.id)
      .eq('receiver_id', presenceUser.user_id)
      .maybeSingle();

    if (existing) {
      if (existing.status === 'pending') toast.info('Request already sent!');
      else if (existing.status === 'accepted') toast.success('You are already connected!');
      setSentRequests(prev => new Set(prev).add(presenceUser.user_id));
      return;
    }

    const { error } = await supabase
      .from('match_requests')
      .insert({
        sender_id: authUser.id,
        receiver_id: presenceUser.user_id,
        activity: presenceUser.activities?.[0] || 'General',
        status: 'pending',
        sender_email: authUser.email,
      });
    if (error) {
      toast.error('Error: ' + error.message);
    } else {
      setSentRequests(prev => new Set(prev).add(presenceUser.user_id));
      toast.success('Request sent! ✓');
    }
  };

  const handleSaveStatusMessage = () => {
    updateUser({ statusMessage });
    setIsDialogOpen(false);
  };

  const handleAcceptMatch = async (requestId: string) => {
    if (!user) { setIsLoginPromptOpen(true); return; }
    const request = matchRequests.find(req => req.id === requestId);
    if (!request) return;

    const { error } = await supabase
      .from('match_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) { toast.error(error.message); return; }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const senderId = request.sender_id;
    const activity = request.activities?.[0] || request.activity || '';

    const { data: existingChat } = await supabase
      .from('chats')
      .select('id')
      .or(`and(user1_id.eq.${authUser.id},user2_id.eq.${senderId}),and(user1_id.eq.${senderId},user2_id.eq.${authUser.id})`)
      .maybeSingle();

    let chatId: string;
    if (existingChat) {
      chatId = existingChat.id;
    } else {
      const { data: newChat, error: chatError } = await supabase
        .from('chats')
        .insert({ user1_id: authUser.id, user2_id: senderId, activity })
        .select()
        .single();
      if (chatError || !newChat) { toast.error('Failed to create chat room'); return; }
      chatId = newChat.id;
    }

    addMatch(senderId, activity);
    setMatchRequests(prev => prev.filter(req => req.id !== requestId));
    toast.success('Match accepted! Opening chat...');
    navigate(`/chat/${chatId}`);
  };

  const handleDeclineMatch = async (requestId: string) => {
    if (!user) { setIsLoginPromptOpen(true); return; }
    const { error } = await supabase
      .from('match_requests')
      .update({ status: 'declined' })
      .eq('id', requestId);
    if (error) { toast.error(error.message); return; }
    setMatchRequests(prev => prev.filter(req => req.id !== requestId));
  };

  const toggleRequestDetails = (requestId: string) => {
    setExpandedRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) newSet.delete(requestId);
      else newSet.add(requestId);
      return newSet;
    });
  };

  if (user === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Group activities by category for modal display
  const groupActivitiesByCategory = (activities: string[]) => {
    const groups: Record<string, string[]> = {};
    for (const activity of activities) {
      const cat = getCategoryForActivity(activity) || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(activity);
    }
    return groups;
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <LoginPrompt open={isLoginPromptOpen} onOpenChange={setIsLoginPromptOpen} />

      {/* User profile modal */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) { setSelectedUser(null); setSelectedUserProfile(null); } }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedUser && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-4 mb-2">
                  <div className="relative">
                    <Avatar className="w-20 h-20 border-2 border-purple-300">
                      <AvatarFallback className="text-4xl bg-purple-50">
                        {selectedUser.avatar || '👤'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-xl">{selectedUser.username}</DialogTitle>
                      {selectedUser.genderSymbol && (
                        <span
                          className="text-xl"
                          style={{
                            color: selectedUser.genderSymbol === '♂' ? '#3B82F6'
                              : selectedUser.genderSymbol === '♀' ? '#EC4899'
                              : '#9333EA',
                          }}
                        >
                          {selectedUser.genderSymbol}
                        </span>
                      )}
                      <Shield className="h-4 w-4 text-[#990000]" />
                    </div>
                    <p className="text-sm text-muted-foreground">USC Student</p>
                  </div>
                </div>
                {selectedUser.statusMessage && (
                  <DialogDescription className="italic text-left">
                    "{selectedUser.statusMessage}"
                  </DialogDescription>
                )}
              </DialogHeader>

              <div className="py-2">
                {selectedUser.vibingMode ? (
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-200 mb-4">
                    <p className="text-sm font-medium text-purple-700">🎵 Vibing — open to anything!</p>
                  </div>
                ) : (
                  <>
                    {profileLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-purple-300 border-t-transparent" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {Object.entries(groupActivitiesByCategory(selectedUser.activities || [])).map(([category, activities]) => {
                          const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS] || '#9333EA';
                          const categoryLabel = category === 'campusEvents' ? 'Campus Events'
                            : category.charAt(0).toUpperCase() + category.slice(1);
                          return (
                            <div key={category}>
                              <h4 className="text-sm font-semibold mb-2 uppercase tracking-wide" style={{ color }}>
                                {categoryLabel}
                              </h4>
                              <div className="space-y-3">
                                {activities.map(activity => {
                                  const profile = selectedUserProfile?.[activity];
                                  const fields = getRequiredFieldsForActivity(activity);
                                  return (
                                    <div key={activity} className="p-3 rounded-lg border" style={{ borderColor: color + '40', backgroundColor: color + '08' }}>
                                      <p className="font-medium text-sm mb-1" style={{ color }}>{activity}</p>
                                      {fields.length > 0 && profile ? (
                                        <div className="grid grid-cols-2 gap-1">
                                          {fields.map(field => profile[field] ? (
                                            <div key={field}>
                                              <span className="text-xs text-muted-foreground">{formatFieldName(field)}: </span>
                                              <span className="text-xs font-medium">{profile[field]}</span>
                                            </div>
                                          ) : null)}
                                        </div>
                                      ) : fields.length > 0 ? (
                                        <p className="text-xs text-muted-foreground">No profile details yet</p>
                                      ) : null}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              <DialogFooter>
                <Button
                  className="w-full"
                  style={
                    acceptedConnections.has(selectedUser.user_id)
                      ? {}
                      : { backgroundColor: '#9333EA', color: 'white' }
                  }
                  disabled={sentRequests.has(selectedUser.user_id) || acceptedConnections.has(selectedUser.user_id)}
                  onClick={() => handleConnect(selectedUser)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {acceptedConnections.has(selectedUser.user_id)
                    ? 'Already Connected'
                    : sentRequests.has(selectedUser.user_id)
                    ? 'Request Sent ✓'
                    : 'Connect'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="mb-2">Activity Hub</h1>
          <p className="text-muted-foreground">
            Find USC students available right now for your favorite activities
          </p>
        </div>

        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-64 flex-shrink-0 space-y-6">
            {/* Match Requests */}
            <Card className="p-4 border-2 border-border">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-pink-500" />
                <h3 className="text-lg">Match Requests</h3>
                {matchRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-auto">{matchRequests.length}</Badge>
                )}
              </div>
              <div className="space-y-3">
                {matchRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No match requests yet</p>
                ) : (
                  matchRequests.map(request => {
                    const categoryColor = CATEGORY_COLORS[request.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
                    const isExpanded = expandedRequests.has(request.id);
                    return (
                      <Card key={request.id} className="p-3 bg-secondary/30 border-2" style={{ borderColor: categoryColor }}>
                        <div className="flex items-start gap-3 mb-2">
                          <Avatar className="w-12 h-12 border-2" style={{ borderColor: categoryColor }}>
                            <AvatarFallback className="text-2xl" style={{ backgroundColor: categoryColor + '20' }}>
                              {request.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <h4 className="text-sm font-medium truncate">{request.username}</h4>
                              {request.genderSymbol && (
                                <span className="text-sm flex-shrink-0" style={{ color: request.genderSymbol === '♂' ? '#3B82F6' : request.genderSymbol === '♀' ? '#EC4899' : categoryColor }}>
                                  {request.genderSymbol}
                                </span>
                              )}
                              <Shield className="h-3 w-3 text-[#990000] flex-shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground">{request.activities?.[0]}</p>
                          </div>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={() => toggleRequestDetails(request.id)}>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                        {isExpanded && (
                          <>
                            {request.activities?.length > 1 && (
                              <div className="mb-2 flex flex-wrap gap-1">
                                {request.activities.map((activity: string, index: number) => (
                                  <span key={index}>
                                    <span className="font-medium text-xs" style={{ color: categoryColor }}>{activity}</span>
                                    {index < request.activities.length - 1 && <span className="text-muted-foreground mx-1 text-xs">•</span>}
                                  </span>
                                ))}
                              </div>
                            )}
                            {request.statusMessage && (
                              <p className="text-xs text-muted-foreground mb-2 italic">"{request.statusMessage}"</p>
                            )}
                          </>
                        )}
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 bg-green-500 hover:bg-green-600 h-8" onClick={() => handleAcceptMatch(request.id)}>
                            <Check className="h-3 w-3 mr-1" />Accept
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => handleDeclineMatch(request.id)}>
                            <X className="h-3 w-3 mr-1" />Decline
                          </Button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Chats */}
            <Card className="p-4 border-2 border-border">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg">Chats</h3>
              </div>
              <div className="space-y-2">
                {chats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No active chats</p>
                ) : (
                  chats.map(chat => {
                    const categoryColor = CATEGORY_COLORS[getCategoryForActivity(chat.activity) as keyof typeof CATEGORY_COLORS] || '#6B7280';
                    return (
                      <Card key={chat.id} className="p-3 bg-secondary/30 border-2 cursor-pointer hover:bg-secondary/50 transition-colors" style={{ borderColor: categoryColor }} onClick={() => navigate(`/chat/${chat.id}`)}>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10 border-2" style={{ borderColor: categoryColor }}>
                            <AvatarFallback className="text-xl" style={{ backgroundColor: categoryColor + '20' }}>
                              {chat.partner_avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <h4 className="text-sm font-medium truncate">{chat.partner_username}</h4>
                              <Shield className="h-3 w-3 text-[#990000] flex-shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground truncate">{chat.activity}</p>
                          </div>
                          <MessageCircle className="h-4 w-4 flex-shrink-0" style={{ color: categoryColor }} />
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span className="font-medium">
                  {allOtherUsers.length} {allOtherUsers.length === 1 ? 'person' : 'people'} online now
                </span>
              </div>

              {/* Status message dialog */}
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Volume2 className="h-4 w-4" />
                    {user?.statusMessage ? 'Edit Status' : 'Set Status'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Set Your Status Message</DialogTitle>
                    <DialogDescription>
                      This message will be visible to other users on your profile card.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Textarea
                      value={statusMessage}
                      onChange={(e) => setStatusMessage(e.target.value)}
                      placeholder="e.g., Looking for a study buddy for CSCI 104!"
                      maxLength={150}
                      rows={3}
                      className="resize-none"
                    />
                    <p className="text-xs text-muted-foreground mt-2">{statusMessage.length}/150 characters</p>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveStatusMessage}>Save Status</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Users Grid */}
            {allOtherUsers.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allOtherUsers.map(presenceUser => {
                  const primaryCategory = presenceUser.categories?.[0];
                  const cardColor = CATEGORY_COLORS[primaryCategory as keyof typeof CATEGORY_COLORS] || '#9333EA';
                  const categoryLabels = (presenceUser.categories || []).map(c =>
                    c === 'campusEvents' ? 'Campus Events' : c.charAt(0).toUpperCase() + c.slice(1)
                  );

                  return (
                    <Card
                      key={presenceUser.user_id}
                      className="p-4 bg-gradient-to-br from-white to-purple-50 border-2 hover:scale-[1.02] transition-all hover:shadow-xl cursor-pointer"
                      style={{ borderColor: cardColor, boxShadow: `0 4px 20px ${cardColor}20` }}
                      onClick={() => openUserModal(presenceUser)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex-shrink-0">
                          <Avatar className="w-14 h-14 border-2" style={{ borderColor: cardColor }}>
                            <AvatarFallback className="text-2xl" style={{ backgroundColor: cardColor + '20' }}>
                              {presenceUser.avatar || '👤'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-card" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <h3 className="text-sm font-semibold truncate">{presenceUser.username}</h3>
                            {presenceUser.genderSymbol && (
                              <span
                                className="text-sm flex-shrink-0"
                                style={{
                                  color: presenceUser.genderSymbol === '♂' ? '#3B82F6'
                                    : presenceUser.genderSymbol === '♀' ? '#EC4899'
                                    : cardColor,
                                }}
                              >
                                {presenceUser.genderSymbol}
                              </span>
                            )}
                            <Shield className="h-3 w-3 text-[#990000] flex-shrink-0" />
                          </div>

                          {/* Category summary */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {presenceUser.vibingMode ? (
                              <span className="text-xs font-medium text-purple-600">🎵 Vibing</span>
                            ) : categoryLabels.length > 0 ? (
                              <span className="text-xs text-muted-foreground">
                                {categoryLabels.join(' • ')}
                              </span>
                            ) : null}
                          </div>

                          {/* Status message */}
                          {presenceUser.statusMessage && (
                            <p className="text-xs text-muted-foreground italic line-clamp-1 mb-2">
                              "{presenceUser.statusMessage}"
                            </p>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full h-7 text-xs"
                            style={
                              acceptedConnections.has(presenceUser.user_id)
                                ? {}
                                : { borderColor: cardColor, color: cardColor }
                            }
                            disabled={sentRequests.has(presenceUser.user_id) || acceptedConnections.has(presenceUser.user_id)}
                            onClick={(e) => { e.stopPropagation(); handleConnect(presenceUser); }}
                          >
                            <MessageCircle className="h-3 w-3 mr-1" />
                            {acceptedConnections.has(presenceUser.user_id)
                              ? 'Already Connected'
                              : sentRequests.has(presenceUser.user_id)
                              ? 'Request Sent ✓'
                              : 'Connect'}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 bg-card rounded-lg border border-border">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="mb-2">No one else online right now</h3>
                <p className="text-muted-foreground">Check back soon or invite a friend!</p>
              </div>
            )}

            <div className="mt-8 text-center">
              <Button variant="outline" size="lg" onClick={() => navigate('/discovery')}>
                Explore Other Activities
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
