import { useState, useMemo, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { LoginPrompt } from '../components/LoginPrompt';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Users, Lock, Volume2, Heart, MessageCircle, X, Check } from 'lucide-react';
import { Shield, MoreVertical } from 'lucide-react';
import { CATEGORY_COLORS } from '../data/mockData';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { getCategoriesFromActivities, getActivitiesInCategory, getCategoryForActivity, Category } from '../data/activityHelpers';
import { useMatches } from '../context/MatchContext';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { supabase } from '../lib/supabase';
import { projectId, publicAnonKey } from '/utils/supabase/info';
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

export function ActivityHub() {
  const { user, supabaseUserId, updateUser } = useAuth();
  const navigate = useNavigate();
  const { matches, addMatch } = useMatches();

  // Redirect unauthenticated users to browse hub
  useEffect(() => {
    if (!user) {
      navigate('/browse-hub');
    }
  }, [user, navigate]);

  const [statusMessage, setStatusMessage] = useState(user?.statusMessage || '');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [expandedRequests, setExpandedRequests] = useState<Set<string>>(new Set());
  const [matchRequests, setMatchRequests] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [chats, setChats] = useState<ChatItem[]>([]);

  const serverBase = `https://${projectId}.supabase.co/functions/v1/make-server-5eb2b086`;

  // Fetch match requests from Supabase
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

    // Fetch sender profiles from profiles table
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

    // Initial load only
    fetchMatchRequests();

    // Single realtime channel for all match request events
    const channel = supabase
      .channel('match-requests-' + supabaseUserId)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'match_requests',
          filter: `receiver_id=eq.${supabaseUserId}`,
        },
        (payload) => {
          console.log('New match request received:', payload);
          fetchMatchRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'match_requests',
          filter: `receiver_id=eq.${supabaseUserId}`,
        },
        (payload) => {
          console.log('Match request updated:', payload);
          fetchMatchRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'match_requests',
          filter: `receiver_id=eq.${supabaseUserId}`,
        },
        (payload) => {
          console.log('Match request deleted:', payload);
          fetchMatchRequests();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'match_requests',
          filter: `sender_id=eq.${supabaseUserId}`,
        },
        async (payload: any) => {
          console.log('Sent request updated:', payload);
          if (payload.new.status === 'accepted') {
            const { data: chat } = await supabase
              .from('chats')
              .select('id')
              .or(
                `and(user1_id.eq.${supabaseUserId},user2_id.eq.${payload.new.receiver_id}),and(user1_id.eq.${payload.new.receiver_id},user2_id.eq.${supabaseUserId})`
              )
              .maybeSingle();
            if (chat) {
              toast.success('Your request was accepted! Starting chat...');
              navigate('/chat/' + chat.id);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Match requests subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseUserId, navigate]);

  // Fetch chats from Supabase
  const fetchChats = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .or(`user1_id.eq.${authUser.id},user2_id.eq.${authUser.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.log('Error fetching chats:', error);
      return;
    }

    if (!data || data.length === 0) {
      setChats([]);
      return;
    }

    // For each chat, get partner profile from profiles table
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
    
    // Sync matches with MatchContext - add all chat partners to matches
    enriched.forEach(chat => {
      addMatch(chat.partner_id, chat.activity);
    });
  };

  useEffect(() => {
    fetchChats();
  }, [supabaseUserId]);

  // Fetch sent match requests from Supabase
  const fetchSentRequests = async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const { data, error } = await supabase
      .from('match_requests')
      .select('receiver_id')
      .eq('sender_id', authUser.id)
      .eq('status', 'pending');

    if (error) {
      console.log('Error fetching sent requests:', error);
      return;
    }

    if (data && data.length > 0) {
      const receiverIds = new Set(data.map((req: any) => req.receiver_id));
      setSentRequests(receiverIds);
    } else {
      setSentRequests(new Set());
    }
  };

  // Load sent requests on mount and subscribe to changes
  useEffect(() => {
    if (!supabaseUserId) return;

    fetchSentRequests();

    // Subscribe to changes in sent requests
    const channel = supabase
      .channel('sent-requests-' + supabaseUserId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_requests',
          filter: `sender_id=eq.${supabaseUserId}`,
        },
        () => {
          console.log('Sent requests changed');
          fetchSentRequests();
        }
      )
      .subscribe((status) => {
        console.log('Sent requests subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseUserId]);

  // Listen for new chats via Supabase Realtime
  useEffect(() => {
    if (!supabaseUserId) return;

    const channel = supabase
      .channel('chats-panel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chats',
        },
        () => {
          fetchChats();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'chats',
        },
        (payload) => {
          // Remove deleted chat from list instantly
          setChats(prev => prev.filter(c => c.id !== payload.old.id));
          toast.info('A chat has been removed');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabaseUserId]);

  // All available categories for browsing
  const allCategories: Category[] = ['sports', 'gaming', 'studying', 'campusEvents'];
  
  // Get only categories that have enabled activities (for authenticated users)
  const enabledCategories = useMemo(() => {
    if (!user?.enabledActivities.length) return [];
    return getCategoriesFromActivities(user.enabledActivities);
  }, [user?.enabledActivities]);

  // Use all categories if not authenticated, in vibing mode, or use enabled categories
  const displayCategories = (!user || user.vibingMode) ? allCategories : enabledCategories;

  const [activeCategory, setActiveCategory] = useState<Category>(
    displayCategories[0] || 'sports'
  );
  const [activeActivity, setActiveActivity] = useState<string | 'all'>('all');

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, supabaseUserId]); // Only recreate if user ID changes, not on every user update

  // Track presence when user or user data changes
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
        username: user.username, // This is display_name from profiles table
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

    return () => {
      channel.untrack();
    };
  }, [user, supabaseUserId]); // Re-track whenever user data changes

  // Helper function to check if activity is enabled
  const isActivityEnabled = (activity: string) => {
    if (!user || user.vibingMode) return true;
    return user?.enabledActivities.includes(activity);
  };

  // Get all activities in the current category (flattened)
  const currentCategoryActivities = getActivitiesInCategory(activeCategory);
  const enabledActivitiesInCategory = (user && !user.vibingMode)
    ? currentCategoryActivities.filter(isActivityEnabled)
    : currentCategoryActivities;

  // Filter real online users (exclude self, filter by category and activity)
  const filteredUsers = useMemo(() => {
    const others = onlineUsers.filter((u) => u.user_id !== supabaseUserId);
    return others.filter((u) => {
      // Vibing users show in all categories
      const inCategory = u.vibingMode || (u.categories || []).includes(activeCategory);
      if (!inCategory) return false;

      if (activeActivity === 'all') return true;
      return (u.activities || []).includes(activeActivity);
    });
  }, [onlineUsers, supabaseUserId, activeCategory, activeActivity]);

  const handleSaveStatusMessage = () => {
    updateUser({ statusMessage });
    setIsDialogOpen(false);
  };

  const handleAcceptMatch = async (requestId: string) => {
    if (!user) {
      setIsLoginPromptOpen(true);
      return;
    }
    
    const request = matchRequests.find(req => req.id === requestId);
    if (!request) return;

    // Update request status to accepted
    const { error } = await supabase
      .from('match_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) {
      console.log('Error accepting match request:', error);
      toast.error(error.message);
      return;
    }

    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return;

    const senderId = request.sender_id;
    const activity = request.activities?.[0] || request.activity || '';

    // Check if chat already exists between these two users
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
        .insert({
          user1_id: authUser.id,
          user2_id: senderId,
          activity,
        })
        .select()
        .single();

      if (chatError || !newChat) {
        console.log('Error creating chat:', chatError);
        toast.error('Failed to create chat room');
        return;
      }
      chatId = newChat.id;
    }

    addMatch(senderId, activity);
    setMatchRequests(prev => prev.filter(req => req.id !== requestId));
    toast.success('Match accepted! Opening chat...');
    navigate(`/chat/${chatId}`);
  };

  const handleDeclineMatch = async (requestId: string) => {
    if (!user) {
      setIsLoginPromptOpen(true);
      return;
    }
    
    const { error } = await supabase
      .from('match_requests')
      .update({ status: 'declined' })
      .eq('id', requestId);

    if (error) {
      console.log('Error declining match request:', error);
      alert(error.message);
      return;
    }

    setMatchRequests(prev => prev.filter(req => req.id !== requestId));
  };

  const toggleRequestDetails = (requestId: string) => {
    setExpandedRequests(prev => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };

  const handleUnauthenticatedAction = () => {
    setIsLoginPromptOpen(true);
  };

  // Handle authenticated user with no activities
  if (user && enabledCategories.length === 0 && !user.vibingMode) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="container mx-auto px-4 py-12 max-w-2xl text-center">
          <Lock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="mb-4">No Activities Enabled</h1>
          <p className="text-muted-foreground mb-6">
            You need to select and set up activities before you can access the Activity Hub
          </p>
          <Button onClick={() => navigate('/activity-selection')} size="lg">
            Select Activities
          </Button>
        </div>
      </div>
    );
  }

  // AUTHENTICATED VIEW
  return (
    <div className="min-h-screen">
      <Navbar />
      <LoginPrompt open={isLoginPromptOpen} onOpenChange={setIsLoginPromptOpen} />

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div>
            <h1 className="mb-2">Activity Hub</h1>
            <p className="text-muted-foreground">
              Find USC students available right now for your favorite activities
            </p>
          </div>
        </div>

        {/* Main Layout with Sidebar */}
        <div className="flex gap-6">
          {/* Left Sidebar */}
          <div className="w-64 flex-shrink-0 space-y-6">
            {/* Match Requests Section */}
            <Card className="p-4 border-2 border-border">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="h-5 w-5 text-pink-500" />
                <h3 className="text-lg">Match Requests</h3>
                {matchRequests.length > 0 && (
                  <Badge variant="destructive" className="ml-auto">
                    {matchRequests.length}
                  </Badge>
                )}
              </div>

              <div className="space-y-3">
                {matchRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No match requests yet
                  </p>
                ) : (
                  matchRequests.map(request => {
                    const categoryColor = CATEGORY_COLORS[request.category as keyof typeof CATEGORY_COLORS] || '#6B7280';
                    const isExpanded = expandedRequests.has(request.id);
                    
                    return (
                      <Card 
                        key={request.id} 
                        className="p-3 bg-secondary/30 border-2"
                        style={{ borderColor: categoryColor }}
                      >
                        <div className="flex items-start gap-3 mb-2">
                          <Avatar 
                            className="w-12 h-12 border-2" 
                            style={{ borderColor: categoryColor }}
                          >
                            <AvatarFallback 
                              className="text-2xl"
                              style={{ backgroundColor: categoryColor + '20' }}
                            >
                              {request.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <h4 className="text-sm font-medium truncate">{request.username}</h4>
                              {request.genderSymbol && (
                                <span 
                                  className="text-sm flex-shrink-0" 
                                  style={{ 
                                    color: request.genderSymbol === '♂' ? '#3B82F6' : 
                                           request.genderSymbol === '♀' ? '#EC4899' : categoryColor 
                                  }}
                                >
                                  {request.genderSymbol}
                                </span>
                              )}
                              <Shield className="h-3 w-3 text-[#990000] flex-shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground">{request.activities?.[0]}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 flex-shrink-0"
                            onClick={() => toggleRequestDetails(request.id)}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>

                        {isExpanded && (
                          <>
                            {request.activities?.length > 1 && (
                              <div className="mb-2">
                                <div className="flex flex-wrap gap-1 items-center">
                                  {request.activities.map((activity: string, index: number) => (
                                    <span key={index}>
                                      <span className="font-medium text-xs" style={{ color: categoryColor }}>
                                        {activity}
                                      </span>
                                      {index < request.activities.length - 1 && (
                                        <span className="text-muted-foreground mx-1 text-xs">•</span>
                                      )}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {request.statusMessage && (
                              <p className="text-xs text-muted-foreground mb-2 italic">
                                "{request.statusMessage}"
                              </p>
                            )}
                          </>
                        )}

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-500 hover:bg-green-600 h-8"
                            onClick={() => handleAcceptMatch(request.id)}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-8"
                            onClick={() => handleDeclineMatch(request.id)}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Decline
                          </Button>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Chats Section */}
            <Card className="p-4 border-2 border-border">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="h-5 w-5 text-blue-500" />
                <h3 className="text-lg">Chats</h3>
              </div>

              <div className="space-y-2">
                {chats.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No active chats
                  </p>
                ) : (
                  chats.map(chat => {
                    const categoryColor = CATEGORY_COLORS[getCategoryForActivity(chat.activity) as keyof typeof CATEGORY_COLORS] || '#6B7280';
                    
                    return (
                      <Card 
                        key={chat.id} 
                        className="p-3 bg-secondary/30 border-2 cursor-pointer hover:bg-secondary/50 transition-colors"
                        style={{ borderColor: categoryColor }}
                        onClick={() => navigate(`/chat/${chat.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar 
                            className="w-10 h-10 border-2" 
                            style={{ borderColor: categoryColor }}
                          >
                            <AvatarFallback 
                              className="text-xl"
                              style={{ backgroundColor: categoryColor + '20' }}
                            >
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
            <Tabs value={activeCategory} onValueChange={(v) => {
              setActiveCategory(v as Category);
              setActiveActivity('all');
            }}>
              <TabsList className="w-full justify-start mb-6 bg-gradient-to-r from-purple-100 to-pink-100 p-2 h-auto rounded-2xl border-2 border-purple-200">
                {displayCategories.map((categoryKey) => {
                  const color = CATEGORY_COLORS[categoryKey];
                  const categoryName = categoryKey === 'campusEvents' ? 'Campus Events' : 
                                       categoryKey === 'social' ? 'Social & Hangouts' :
                                       categoryKey.charAt(0).toUpperCase() + categoryKey.slice(1);
                  
                  return (
                    <TabsTrigger
                      key={categoryKey}
                      value={categoryKey}
                      className="data-[state=active]:bg-white data-[state=active]:shadow-md transition-all text-base px-6 py-3 rounded-xl font-semibold"
                      style={{
                        color: activeCategory === categoryKey ? color : '#6B7280',
                        borderColor: activeCategory === categoryKey ? color : 'transparent'
                      }}
                    >
                      {categoryName}
                    </TabsTrigger>
                  );
                })}
              </TabsList>

              {displayCategories.map(categoryKey => {
                const categoryColor = CATEGORY_COLORS[categoryKey];

                return (
                  <TabsContent key={categoryKey} value={categoryKey} className="mt-0">
                    {/* Activity Sub-tabs */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <h3>Select Activity</h3>
                          <Badge variant="outline" style={{ borderColor: categoryColor, color: categoryColor }}>
                            {enabledActivitiesInCategory.length} enabled
                          </Badge>
                        </div>
                        
                        {/* Status Message Button */}
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="icon"
                              className="flex-shrink-0 h-12 w-12"
                              title="Set status message"
                            >
                              <Volume2 className="h-7 w-7" style={{ color: categoryColor }} />
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
                              <p className="text-xs text-muted-foreground mt-2">
                                {statusMessage.length}/150 characters
                              </p>
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                                Cancel
                              </Button>
                              <Button onClick={handleSaveStatusMessage}>
                                Save Status
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant={activeActivity === 'all' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setActiveActivity('all')}
                          style={activeActivity === 'all' ? { backgroundColor: categoryColor } : {}}
                        >
                          All Activities
                        </Button>
                        {enabledActivitiesInCategory.map(activity => {
                          return (
                            <Button
                              key={activity}
                              variant={activeActivity === activity ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setActiveActivity(activity)}
                              style={activeActivity === activity ? { backgroundColor: categoryColor } : {}}
                            >
                              {activity}
                            </Button>
                          );
                        })}
                      </div>

                      {enabledActivitiesInCategory.length < currentCategoryActivities.length && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Want more activities? Add them in Settings.
                        </p>
                      )}
                    </div>

                    {/* User Count */}
                    <div className="flex items-center gap-2 mb-4">
                      <Users className="h-5 w-5" style={{ color: categoryColor }} />
                      <span className="font-medium">
                        {filteredUsers.length} {filteredUsers.length === 1 ? 'person' : 'people'} available now
                      </span>
                    </div>

                    {/* User Cards Grid */}
                    {filteredUsers.length > 0 ? (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredUsers.map(presenceUser => {
                          const categoryActivities = (presenceUser.activities || []).filter(
                            (a) => getCategoryForActivity(a) === activeCategory
                          );
                          const displayActivities = presenceUser.vibingMode
                            ? []
                            : categoryActivities.length > 0
                            ? categoryActivities
                            : presenceUser.activities || [];

                          return (
                            <Card
                              key={presenceUser.user_id}
                              className="p-4 bg-gradient-to-br from-white to-purple-50 border-2 hover:scale-[1.02] transition-all hover:shadow-xl"
                              style={{
                                borderColor: categoryColor,
                                boxShadow: `0 4px 20px ${categoryColor}20`,
                              }}
                            >
                              <div className="flex items-start gap-4">
                                <div className="relative">
                                  <Avatar className="w-16 h-16 border-2" style={{ borderColor: categoryColor }}>
                                    <AvatarFallback className="text-3xl" style={{ backgroundColor: categoryColor + '20' }}>
                                      {presenceUser.avatar || '👤'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-card" />
                                </div>

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="truncate">{presenceUser.username}</h3>
                                    {presenceUser.genderSymbol && (
                                      <span
                                        className="text-lg flex-shrink-0"
                                        style={{
                                          color: presenceUser.genderSymbol === '♂' ? '#3B82F6'
                                            : presenceUser.genderSymbol === '♀' ? '#EC4899'
                                            : categoryColor,
                                        }}
                                      >
                                        {presenceUser.genderSymbol}
                                      </span>
                                    )}
                                    <Shield className="h-4 w-4 text-[#990000] flex-shrink-0" />
                                  </div>

                                  <div className="mb-2">
                                    <div className="flex flex-wrap gap-1 items-center">
                                      {presenceUser.vibingMode ? (
                                        <span className="flex items-center gap-1.5">
                                          <span className="text-sm font-medium" style={{ color: categoryColor }}>
                                            🎵 Vibing
                                          </span>
                                          <span className="text-xs text-muted-foreground italic">
                                            (looking for something to do)
                                          </span>
                                        </span>
                                      ) : (
                                        displayActivities.slice(0, 2).map((activity, i) => (
                                          <span key={i}>
                                            <span className="font-medium text-sm" style={{ color: categoryColor }}>
                                              {activity}
                                            </span>
                                            {i < Math.min(displayActivities.length - 1, 1) && (
                                              <span className="text-muted-foreground mx-1">•</span>
                                            )}
                                          </span>
                                        ))
                                      )}
                                      {!presenceUser.vibingMode && displayActivities.length > 2 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{displayActivities.length - 2}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {presenceUser.statusMessage && (
                                    <p className="text-sm text-muted-foreground mb-3 italic line-clamp-2">
                                      "{presenceUser.statusMessage}"
                                    </p>
                                  )}

                                  <Button
                                    onClick={async () => {
                                      const { data: { user: authUser } } = await supabase.auth.getUser();
                                      if (!authUser) return;

                                      // Check if request already exists
                                      const { data: existing } = await supabase
                                        .from('match_requests')
                                        .select('id, status')
                                        .eq('sender_id', authUser.id)
                                        .eq('receiver_id', presenceUser.user_id)
                                        .maybeSingle();

                                      if (existing) {
                                        if (existing.status === 'pending') {
                                          toast.info('Request already sent!');
                                        } else if (existing.status === 'accepted') {
                                          toast.success('You are already connected!');
                                        }
                                        setSentRequests(prev => new Set(prev).add(presenceUser.user_id));
                                        return;
                                      }

                                      const { error } = await supabase
                                        .from('match_requests')
                                        .insert({
                                          sender_id: authUser.id,
                                          receiver_id: presenceUser.user_id,
                                          activity: presenceUser.activities?.[0] || activeCategory,
                                          status: 'pending',
                                          sender_email: authUser.email
                                        });
                                      if (error) {
                                        toast.error('Error: ' + error.message);
                                      } else {
                                        setSentRequests(prev => new Set(prev).add(presenceUser.user_id));
                                        toast.success('Request sent! ✓');
                                      }
                                    }}
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    style={{ borderColor: categoryColor, color: categoryColor }}
                                    disabled={sentRequests.has(presenceUser.user_id)}
                                  >
                                    <MessageCircle className="h-4 w-4 mr-1" />
                                    {sentRequests.has(presenceUser.user_id) ? 'Request Sent ✓' : 'Connect'}
                                  </Button>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-card rounded-lg border border-border">
                        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="mb-2">No one available right now</h3>
                        <p className="text-muted-foreground">
                          Check back soon or try a different activity
                        </p>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>

            {/* Explore Button */}
            <div className="mt-8 text-center">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/discovery')}
              >
                Explore Other Activities
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}